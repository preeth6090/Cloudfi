import { useIoT } from '@/context/IoTContext';
import { useMemo } from 'react';
import { IndianRupee } from 'lucide-react';

export default function EnergyWidget() {
  const { telemetry } = useIoT();
  const RATE = 6.5; // ₹/kWh

  const { totalKw, savingsKw, monthlySavings } = useMemo(() => {
    const all = Object.values(telemetry);
    const totalKw = all.reduce((s, d) => s + (d.power || 0), 0);
    const savingsKw = totalKw * 0.08; // 8% AI optimization potential
    const monthlySavings = savingsKw * 24 * 30 * RATE;
    return { totalKw, savingsKw, monthlySavings };
  }, [telemetry]);

  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="flex items-center gap-1.5 text-success mb-0.5">
          <IndianRupee size={18} />
          <span className="text-xl font-bold">{(monthlySavings / 1000).toFixed(1)}K</span>
          <span className="text-sm font-normal text-muted">/month</span>
        </div>
        <div className="text-xs text-muted">AI Energy Cost Savings</div>
      </div>
      <div className="space-y-1.5">
        <Row label="Live Load"      value={`${totalKw.toFixed(0)} kW`} />
        <Row label="Savings Pot."   value={`${savingsKw.toFixed(0)} kW`} color="text-success" />
        <Row label="Daily Savings"  value={`₹${(savingsKw * 24 * RATE).toFixed(0)}`} color="text-success" />
        <Row label="Tariff Rate"    value={`₹${RATE}/kWh`} />
      </div>
      <div className="mt-1 px-2 py-1 bg-success/10 border border-success/20 rounded-lg">
        <p className="text-[10px] text-success">AI: Optimize VFD loads → ₹{(savingsKw * 24 * RATE).toFixed(0)} savings today</p>
      </div>
    </div>
  );
}

function Row({ label, value, color = 'text-text' }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted">{label}</span>
      <span className={`font-medium ${color}`}>{value}</span>
    </div>
  );
}
