import { useIoT } from '@/context/IoTContext';
import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const TT = { background: '#16161f', border: '1px solid #2a2a3a', borderRadius: 8, fontSize: 11 };
const COLORS = ['#7c3aed', '#ec4899', '#22c55e'];

export default function ESGCarbon() {
  const { telemetry } = useIoT();
  const [period] = useState('month');

  const { co2Hr, scope, monthly } = useMemo(() => {
    const kw = Object.values(telemetry).reduce((s, d) => s + (d.power || 0), 0);
    const co2Hr = kw * 0.82 / 1000;
    return {
      co2Hr,
      scope: [
        { name: 'Scope 1 (Direct)', value: +(co2Hr * 0.4 * 720).toFixed(1) },
        { name: 'Scope 2 (Indirect)', value: +(co2Hr * 0.45 * 720).toFixed(1) },
        { name: 'Scope 3 (Value Chain)', value: +(co2Hr * 0.15 * 720).toFixed(1) },
      ],
      monthly: Array.from({ length: 6 }, (_, i) => ({
        month: ['Nov','Dec','Jan','Feb','Mar','Apr'][i],
        co2: +(co2Hr * 720 * (0.9 + Math.random() * 0.2)).toFixed(1),
        target: +(co2Hr * 720 * 0.85).toFixed(1),
      })),
    };
  }, [telemetry]);

  const totalMonthly = scope.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="CO₂ Live"      value={`${co2Hr.toFixed(3)} t/hr`}  color="text-text" />
        <KPI label="Monthly Total" value={`${totalMonthly.toFixed(0)} t`} color="text-warning" />
        <KPI label="vs Target"     value="-4.2%"                         color="text-success" />
        <KPI label="Carbon Credits" value="12 tCO₂e"                     color="text-primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-text font-medium text-sm mb-1">Emission Breakdown</h3>
          <p className="text-muted text-xs mb-3">Monthly by scope (tonnes CO₂e)</p>
          <div className="flex items-center gap-6">
            <div className="w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={scope} cx="50%" cy="50%" innerRadius="55%" outerRadius="90%" dataKey="value" paddingAngle={3}>
                    {scope.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={TT} formatter={v => [`${v} t`, '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 text-xs">
              {scope.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: COLORS[i] }} />
                  <span className="text-muted">{d.name}</span>
                  <span className="text-text font-medium ml-auto pl-4">{d.value}t</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-text font-medium text-sm mb-1">Monthly Trend</h3>
          <p className="text-muted text-xs mb-3">Actual vs target (tCO₂e)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthly} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={TT} />
              <Bar dataKey="co2"    name="Actual" fill="#7c3aed" radius={[3,3,0,0]} />
              <Bar dataKey="target" name="Target" fill="#22c55e" radius={[3,3,0,0]} opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-text font-medium text-sm mb-3">ESG Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { label: 'Energy Intensity', value: '63.5 kWh/TC', trend: '↓ 2.1%', good: true },
            { label: 'Renewable Mix',    value: '18%',          trend: '↑ 3%',  good: true },
            { label: 'Water Usage',      value: '2.4 m³/ton',   trend: '↓ 1.2%', good: true },
            { label: 'Waste to Landfill', value: '0.8%',        trend: '↓ 0.3%', good: true },
          ].map(item => (
            <div key={item.label} className="bg-surface border border-border rounded-xl p-3">
              <div className="text-text font-bold text-base">{item.value}</div>
              <div className="text-muted">{item.label}</div>
              <div className={`mt-1 font-medium ${item.good ? 'text-success' : 'text-danger'}`}>{item.trend}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, color }) {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
