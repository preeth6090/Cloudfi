import { useIoT } from '@/context/IoTContext';
import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function CogenWidget() {
  const { history, telemetry } = useIoT();

  const turbines = useMemo(() =>
    Object.entries(telemetry).filter(([, d]) => d.assetType === 'turbine').map(([, d]) => d),
  [telemetry]);

  const gross = turbines.reduce((s, d) => s + (d.power || 0), 0) / 1000; // MW
  const captive = Object.values(telemetry).reduce((s, d) => s + (d.power || 0), 0) / 1000 * 0.4;
  const netExport = Math.max(0, gross - captive);

  const chartData = useMemo(() => {
    const all = Object.values(history).flat();
    const last30 = all.slice(-30);
    return last30.map((d, i) => ({
      t: i,
      gen: +((d.power || 0) / 1000 * 1.8).toFixed(2),
      cap: +((d.power || 0) / 1000 * 0.7).toFixed(2),
      exp: +((d.power || 0) / 1000 * 1.1).toFixed(2),
    }));
  }, [history]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-4 mb-2">
        <Stat label="Gross Gen" value={`${gross.toFixed(2)} MW`} color="text-primary" />
        <Stat label="Captive" value={`${captive.toFixed(2)} MW`} color="text-warning" />
        <Stat label="Net Export" value={`${netExport.toFixed(2)} MW`} color="text-success" />
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="cg1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} /><stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="cg2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" hide />
            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{ background: '#16161f', border: '1px solid #2a2a3a', borderRadius: 8, fontSize: 10 }}
              formatter={v => [`${v} MW`]}
            />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            <Area type="monotone" dataKey="cap" name="Captive" stroke="#f59e0b" strokeWidth={1.5} fill="none" dot={false} />
            <Area type="monotone" dataKey="gen" name="Gross Gen" stroke="#7c3aed" strokeWidth={2} fill="url(#cg1)" dot={false} />
            <Area type="monotone" dataKey="exp" name="Net Export" stroke="#22c55e" strokeWidth={1.5} fill="url(#cg2)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  );
}
