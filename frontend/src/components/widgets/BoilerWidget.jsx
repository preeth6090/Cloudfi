import { useIoT } from '@/context/IoTContext';
import { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from 'recharts';

export default function BoilerWidget() {
  const { telemetry, history } = useIoT();

  const boiler = useMemo(() =>
    Object.values(telemetry).find(d => d.assetType === 'boiler') || null,
  [telemetry]);

  const chartData = useMemo(() => {
    const src = boiler
      ? (history[boiler.deviceId] || []).slice(-20).map(d => ({ e: d.efficiency || 85, t: d.temperature || 185 }))
      : Array.from({ length: 10 }, (_, i) => ({ e: 85 + Math.sin(i) * 2, t: 185 + i * 0.5 }));
    return src;
  }, [boiler, history]);

  const eff = boiler?.efficiency ?? 86;
  const temp = boiler?.temperature ?? 185;

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-4 mb-1">
        <div>
          <div className={`text-xl font-bold ${eff < 84 ? 'text-warning' : 'text-success'}`}>{eff.toFixed(1)}<span className="text-xs font-normal text-muted">%</span></div>
          <div className="text-[10px] text-muted">Thermal Eff.</div>
        </div>
        <div>
          <div className="text-xl font-bold text-text">{temp.toFixed(0)}<span className="text-xs font-normal text-muted">°C</span></div>
          <div className="text-[10px] text-muted">Flue Gas Temp</div>
        </div>
      </div>
      {eff < 84 && (
        <div className="text-[10px] text-warning bg-warning/10 border border-warning/20 rounded px-2 py-1 mb-1">
          AI: Schedule soot blowing to recover efficiency
        </div>
      )}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: -20 }}>
            <YAxis yAxisId="e" domain={[75, 95]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
            <YAxis yAxisId="t" orientation="right" domain={[150, 250]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{ background: '#16161f', border: '1px solid #2a2a3a', borderRadius: 8, fontSize: 10 }}
            />
            <Line yAxisId="e" type="monotone" dataKey="e" name="Efficiency %" stroke="#22c55e" strokeWidth={2} dot={false} />
            <Line yAxisId="t" type="monotone" dataKey="t" name="Flue Temp °C" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
