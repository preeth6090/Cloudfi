import { useState, useEffect } from 'react';
import api from '@/api/client';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { format } from 'date-fns';
import { useIoT } from '@/context/IoTContext';
import SignalHealthSparkline from '@/components/widgets/SignalHealthSparkline';

const TT_STYLE = { background: '#16161f', border: '1px solid #2a2a3a', borderRadius: 8, fontSize: 11 };

export default function Analytics() {
  const [period, setPeriod] = useState('24h');
  const [site, setSite]     = useState('Site A');
  const [data, setData]     = useState([]);
  const { telemetry, powerQuality } = useIoT();

  const deviceIds = Object.keys(powerQuality).filter(id => powerQuality[id]?.fft);

  useEffect(() => {
    api.get(`/telemetry/aggregate/${site}?period=${period}`)
      .then(r => setData(r.data))
      .catch(() => setData(generateDemo(period)));
  }, [period, site]);

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={site} onChange={e=>setSite(e.target.value)}
          className="bg-card border border-border rounded-xl px-3 py-2 text-text text-sm focus:outline-none focus:border-primary">
          {['Site A','Site B','Site C'].map(s=><option key={s}>{s}</option>)}
        </select>
        <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
          {['24h','7d','30d'].map(p=>(
            <button key={p} onClick={()=>setPeriod(p)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium ${period===p ? 'bg-primary text-white' : 'text-muted hover:text-text'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Avg Power (kW)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{top:5,right:10,bottom:5,left:-10}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis dataKey="_id" tick={{fontSize:9,fill:'#94a3b8'}} tickFormatter={v=>v?format(new Date(v),'HH:mm'):''}/>
              <YAxis tick={{fontSize:9,fill:'#94a3b8'}}/>
              <Tooltip contentStyle={TT_STYLE}/>
              <Line type="monotone" dataKey="avgPower" name="Avg kW" stroke="#7c3aed" strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="maxPower" name="Peak kW" stroke="#ec4899" strokeWidth={1.5} dot={false} strokeDasharray="4 2"/>
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Avg Efficiency (%)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{top:5,right:10,bottom:5,left:-10}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a"/>
              <XAxis dataKey="_id" tick={{fontSize:9,fill:'#94a3b8'}} tickFormatter={v=>v?format(new Date(v),'HH:mm'):''}/>
              <YAxis domain={[60,100]} tick={{fontSize:9,fill:'#94a3b8'}}/>
              <Tooltip contentStyle={TT_STYLE}/>
              <Line type="monotone" dataKey="avgEfficiency" name="Efficiency %" stroke="#22c55e" strokeWidth={2} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Steam Consumption (kg/ton)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{top:5,right:10,bottom:5,left:-10}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a"/>
              <XAxis dataKey="_id" tick={{fontSize:9,fill:'#94a3b8'}} tickFormatter={v=>v?format(new Date(v),'HH:mm'):''}/>
              <YAxis tick={{fontSize:9,fill:'#94a3b8'}}/>
              <Tooltip contentStyle={TT_STYLE}/>
              <Bar dataKey="avgSteam" name="Steam kg/ton" fill="#f59e0b" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Total Energy (kWh)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{top:5,right:10,bottom:5,left:-10}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a"/>
              <XAxis dataKey="_id" tick={{fontSize:9,fill:'#94a3b8'}} tickFormatter={v=>v?format(new Date(v),'HH:mm'):''}/>
              <YAxis tick={{fontSize:9,fill:'#94a3b8'}}/>
              <Tooltip contentStyle={TT_STYLE}/>
              <Bar dataKey="totalEnergy" name="kWh" fill="#7c3aed" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Signal Health — CloudFi FFT Analysis */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-text font-medium text-sm">Signal Health — CloudFi FFT Analysis</h3>
            <p className="text-muted text-xs mt-0.5">Harmonic spectrum · THD · Signal integrity per device</p>
          </div>
          <div className="text-[10px] text-muted">{deviceIds.length} device{deviceIds.length !== 1 ? 's' : ''} reporting</div>
        </div>
        {deviceIds.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-muted text-sm">Awaiting FFT data from simulator…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {deviceIds.map(id => {
              const name = telemetry[id]?.name || id;
              return (
                <div key={id} className="bg-surface border border-border rounded-xl p-3">
                  <div className="text-text text-xs font-semibold mb-2 truncate">{name}</div>
                  <SignalHealthSparkline deviceId={id} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-text font-medium text-sm mb-3">{title}</h3>
      {children}
    </div>
  );
}

function generateDemo(period) {
  const points = period === '24h' ? 24 : period === '7d' ? 7*24 : 30;
  return Array.from({ length: Math.min(points, 40) }, (_, i) => ({
    _id: new Date(Date.now() - (points - i) * 3600000).toISOString(),
    avgPower:     1200 + Math.sin(i * 0.5) * 300 + Math.random() * 100,
    maxPower:     1800 + Math.sin(i * 0.5) * 200,
    avgEfficiency:85 + Math.sin(i * 0.3) * 4,
    avgSteam:     375 + Math.sin(i * 0.4) * 20,
    totalEnergy:  1200 + Math.random() * 400,
  }));
}
