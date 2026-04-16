import { useIoT } from '@/context/IoTContext';
import { useMemo } from 'react';
import { BarChart, Bar, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';

export default function SteamWidget() {
  const { telemetry, history } = useIoT();

  const avgSteam = useMemo(() => {
    const vals = Object.values(telemetry).map(d => d.steamConsumption).filter(Boolean);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 385;
  }, [telemetry]);

  const chartData = useMemo(() => {
    const all = Object.values(history).flat().filter(d => d.steamConsumption);
    const last20 = all.slice(-20);
    return last20.map((d, i) => ({ i, v: d.steamConsumption }));
  }, [history]);

  const target = 370;
  const over = avgSteam > target;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-end justify-between mb-1">
        <div>
          <div className="text-2xl font-bold text-text">
            {avgSteam.toFixed(1)}<span className="text-sm font-normal text-muted ml-1">kg/ton</span>
          </div>
          <div className="text-xs text-muted">Specific Steam Consumption</div>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${over ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'}`}>
          Target: {target}
        </span>
      </div>
      <div className="text-[10px] text-muted mb-1">
        {over ? `▲ ${(avgSteam - target).toFixed(1)} above target` : `▼ ${(target - avgSteam).toFixed(1)} below target`}
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <Tooltip
              contentStyle={{ background: '#16161f', border: '1px solid #2a2a3a', borderRadius: 8, fontSize: 11 }}
              formatter={v => [`${v.toFixed(1)} kg/ton`, 'Steam']}
              labelFormatter={() => ''}
            />
            <ReferenceLine y={target} stroke="#22c55e" strokeDasharray="3 3" />
            <Bar dataKey="v" fill="#ec4899" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
