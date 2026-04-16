import WidgetGrid from '@/components/widgets/WidgetGrid';
import { useIoT } from '@/context/IoTContext';
import { useMemo } from 'react';

function KPI({ label, value, sub, color = 'text-text' }) {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
      {sub && <div className="text-[10px] text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { telemetry, plantSummary, alerts, connected } = useIoT();

  const kpis = useMemo(() => {
    const all = Object.values(telemetry);
    const totalKw = all.reduce((s, d) => s + (d.power || 0), 0);
    const avgHealth = all.length ? all.reduce((s, d) => s + (d.healthIndex || 95), 0) / all.length : 95;
    const unacked = alerts.filter(a => !a.acknowledged).length;
    const co2 = totalKw * 0.82 / 1000;
    return { totalKw, avgHealth, unacked, co2 };
  }, [telemetry, alerts]);

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Top KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="Live Plant Load"     value={`${kpis.totalKw.toFixed(0)} kW`} sub={connected ? '● Live' : '○ Offline'} color="text-primary" />
        <KPI label="Avg Machine Health"  value={`${kpis.avgHealth.toFixed(1)}%`}  sub={`${Object.keys(telemetry).length} devices`} color={kpis.avgHealth > 80 ? 'text-success' : 'text-warning'} />
        <KPI label="Active Alerts"       value={kpis.unacked}                     sub="unacknowledged" color={kpis.unacked > 0 ? 'text-danger' : 'text-success'} />
        <KPI label="CO₂ Emission"        value={`${kpis.co2.toFixed(2)} t/hr`}    sub="Scope 1+2" color="text-muted" />
      </div>

      {/* Widget grid */}
      <WidgetGrid />
    </div>
  );
}
