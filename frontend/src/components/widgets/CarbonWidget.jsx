import { useIoT } from '@/context/IoTContext';
import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#7c3aed', '#ec4899', '#22c55e'];

export default function CarbonWidget() {
  const { telemetry } = useIoT();

  const { co2, data } = useMemo(() => {
    const totalKw = Object.values(telemetry).reduce((s, d) => s + (d.power || 0), 0);
    const co2 = totalKw * 0.82 / 1000; // tons CO2/h @ 0.82 kg/kWh
    return {
      co2,
      data: [
        { name: 'Scope 1', value: +(co2 * 0.4).toFixed(2) },
        { name: 'Scope 2', value: +(co2 * 0.45).toFixed(2) },
        { name: 'Scope 3', value: +(co2 * 0.15).toFixed(2) },
      ],
    };
  }, [telemetry]);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-1">
        <div className="text-xl font-bold text-text">{co2.toFixed(2)}<span className="text-xs font-normal text-muted ml-1">tCO₂/hr</span></div>
        <div className="text-[10px] text-muted">Carbon Footprint · Live</div>
      </div>
      <div className="flex flex-1 min-h-0 items-center gap-2">
        <div className="w-20 h-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius="55%" outerRadius="90%" dataKey="value" paddingAngle={3}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#16161f', border: '1px solid #2a2a3a', borderRadius: 8, fontSize: 10 }}
                formatter={v => [`${v} t`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-1 text-[10px]">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: COLORS[i] }} />
              <span className="text-muted">{d.name}</span>
              <span className="text-text font-medium ml-auto">{d.value}t</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
