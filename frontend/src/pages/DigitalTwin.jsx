import { useState, useEffect } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import api from '@/api/client';
import { useIoT } from '@/context/IoTContext';

const SEVERITY_COLOR = { normal: 'text-success', warning: 'text-warning', critical: 'text-danger' };

export default function DigitalTwin() {
  const [devices, setDevices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [twin, setTwin] = useState(null);
  const [pqTwin, setPqTwin] = useState(null);
  const [twinMode, setTwinMode] = useState('asset'); // 'asset' | 'pq'
  const [insights, setInsights] = useState([]);
  const { telemetry, powerQuality } = useIoT();

  useEffect(() => {
    api.get('/devices').then(r => { setDevices(r.data); if (r.data.length) setSelected(r.data[0]._id); });
    api.get('/insights').then(r => setInsights(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.get(`/digital-twin/${selected}`).then(r => setTwin(r.data)).catch(() => {});
  }, [selected, telemetry]);

  useEffect(() => {
    if (!selected || twinMode !== 'pq') return;
    api.get(`/telemetry/power-quality/${selected}`).then(r => setPqTwin(r.data)).catch(() => {});
  }, [selected, twinMode, powerQuality]);

  const live = selected ? telemetry[selected] : null;
  const pq   = selected ? powerQuality[selected] : null;

  const assetChartData = twin
    ? twin.labels.map((label, i) => ({ label, actual: twin.actual[i], ideal: twin.ideal[i] }))
    : [];

  const pqChartData = pqTwin?.labels
    ? pqTwin.labels.map((label, i) => ({ label, actual: +(pqTwin.actual[i] || 0).toFixed(1), ideal: pqTwin.ideal[i] }))
    : [];

  const activeData   = twinMode === 'asset' ? assetChartData : pqChartData;
  const anomalyScore = pq?.anomalyScore;
  const severity     = pq?.anomalySeverity || 'normal';

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={selected || ''} onChange={e => setSelected(e.target.value)}
          className="bg-card border border-border rounded-xl px-3 py-2 text-text text-sm focus:outline-none focus:border-primary">
          {devices.map(d => <option key={d._id} value={d._id}>{d.name} ({d.assetType})</option>)}
        </select>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
          {[['asset', 'Asset Twin'], ['pq', 'Power Quality Twin']].map(([m, label]) => (
            <button key={m} onClick={() => setTwinMode(m)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${twinMode === m ? 'bg-primary text-white' : 'text-muted hover:text-text'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="w-3 h-0.5 bg-primary inline-block" /> <span className="text-xs text-muted">Actual</span>
          <span className="w-3 h-0.5 bg-success inline-block ml-2" /> <span className="text-xs text-muted">AI Ideal</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Radar */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="text-text font-medium text-sm">
                {twinMode === 'asset' ? 'Digital Twin vs Actual Performance' : 'Power Quality Twin — 8-Axis CloudFi Radar'}
              </h3>
              <p className="text-muted text-xs mt-0.5">
                {twinMode === 'asset' ? 'Real-time comparison with physics-based model' : 'Harmonics · Power Factor · Signal Integrity · Grid Compliance'}
              </p>
            </div>
            {twinMode === 'pq' && anomalyScore !== undefined && (
              <div className="text-right shrink-0">
                <div className={`text-lg font-bold ${SEVERITY_COLOR[severity]}`}>{anomalyScore?.toFixed(0)}</div>
                <div className="text-muted text-[9px]">Anomaly Score</div>
              </div>
            )}
          </div>

          {activeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={activeData}>
                <PolarGrid stroke="#2a2a3a" />
                <PolarAngleAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: twinMode === 'pq' ? 9 : 10 }} />
                <Tooltip contentStyle={{ background: '#16161f', border: '1px solid #2a2a3a', borderRadius: 8, fontSize: 11 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Radar name="Actual" dataKey="actual" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.25} strokeWidth={2} />
                <Radar name="AI Ideal" dataKey="ideal" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 2" />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted text-sm">
              {devices.length === 0 ? 'Add devices to enable Digital Twin' : 'Loading twin data…'}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-3">
          {/* Live readings (asset mode) */}
          {live && twinMode === 'asset' && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h4 className="text-text font-medium text-sm mb-3">Live Readings</h4>
              <div className="space-y-2">
                {[
                  { label: 'Power',       value: `${live.power?.toFixed(1)} kW` },
                  { label: 'Efficiency',  value: `${live.efficiency?.toFixed(1)}%` },
                  { label: 'Vibration',   value: `${live.vibration?.toFixed(2)} mm/s`, warn: live.vibration > 4 },
                  { label: 'Temperature', value: `${live.temperature?.toFixed(0)} °C` },
                  { label: 'Health',      value: `${live.healthIndex?.toFixed(1)}%` },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-xs">
                    <span className="text-muted">{r.label}</span>
                    <span className={`font-medium ${r.warn ? 'text-warning' : 'text-text'}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Power Quality detail panel */}
          {twinMode === 'pq' && pq && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h4 className="text-text font-medium text-sm mb-3">Power Quality Metrics</h4>
              <div className="space-y-2">
                {[
                  { label: 'THD-V',         value: `${pq.virtualParams?.THD_V?.toFixed(2) ?? '—'}%` },
                  { label: 'THD-I',         value: `${pq.virtualParams?.THD_I?.toFixed(2) ?? '—'}%` },
                  { label: 'K-Factor',      value: pq.virtualParams?.kFactor?.toFixed(2) ?? '—' },
                  { label: 'Signal Health', value: `${pq.fft?.signalHealth?.toFixed(1) ?? '—'}%`, warn: (pq.fft?.signalHealth ?? 100) < 70 },
                  { label: 'Protocol',      value: pq.protocol ?? '—' },
                  { label: 'Severity',      value: pq.anomalySeverity ?? 'normal', warn: pq.anomalySeverity !== 'normal' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-xs">
                    <span className="text-muted">{r.label}</span>
                    <span className={`font-medium capitalize ${r.warn ? 'text-warning' : 'text-text'}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Insights */}
          <div className="bg-card border border-border rounded-xl p-4 flex-1 overflow-auto">
            <h4 className="text-text font-medium text-sm mb-3">GenAI Optimization Simulator</h4>
            <div className="space-y-2">
              {insights.slice(0, 4).map((ins, i) => (
                <div key={i} className="p-2.5 bg-surface border border-border rounded-lg">
                  <div className="text-text text-xs font-medium mb-1">{ins.title}</div>
                  <div className="text-muted text-[10px] leading-relaxed">{ins.body}</div>
                  {ins.savingsPerDay && (
                    <div className="mt-1.5 text-success text-[10px] font-medium">₹{ins.savingsPerDay.toLocaleString()} projected savings/day</div>
                  )}
                </div>
              ))}
              {insights.length === 0 && <div className="text-muted text-xs text-center py-4">No insights yet — add live devices</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
