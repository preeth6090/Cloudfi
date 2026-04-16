import { useIoT } from '@/context/IoTContext';
import { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

export default function PowerWidget() {
  const { telemetry, history, plantSummary } = useIoT();

  const totalPower = useMemo(() => {
    const all = Object.values(telemetry);
    return all.reduce((s, d) => s + (d.power || 0), 0);
  }, [telemetry]);

  const summary = Object.values(plantSummary)[0];

  const chartData = useMemo(() => {
    const all = Object.values(history);
    if (!all.length) return [];
    const maxLen = Math.max(...all.map(a => a.length));
    return Array.from({ length: Math.min(maxLen, 20) }, (_, i) => ({
      v: all.reduce((s, arr) => s + (arr[arr.length - 20 + i]?.power || 0), 0),
    }));
  }, [history]);

  const prev = chartData[chartData.length - 2]?.v || 0;
  const delta = totalPower - prev;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-end justify-between mb-1">
        <div>
          <div className="text-2xl font-bold text-text">{totalPower.toFixed(1)}<span className="text-sm font-normal text-muted ml-1">kW</span></div>
          <div className="text-xs text-muted">Live Plant Load</div>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${delta >= 0 ? 'bg-danger/15 text-danger' : 'bg-success/15 text-success'}`}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)} kW
        </span>
      </div>
      {summary && (
        <div className="text-[10px] text-muted mb-1">AI Peak Forecast: {(totalPower * 1.08).toFixed(0)} kW (next 24h)</div>
      )}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{ background: '#16161f', border: '1px solid #2a2a3a', borderRadius: 8, fontSize: 11 }}
              formatter={(v) => [`${v.toFixed(1)} kW`, 'Power']}
              labelFormatter={() => ''}
            />
            <Area type="monotone" dataKey="v" stroke="#7c3aed" strokeWidth={2} fill="url(#pg)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
