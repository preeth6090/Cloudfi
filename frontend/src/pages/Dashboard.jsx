import WidgetGrid from '@/components/widgets/WidgetGrid';
import { useIoT } from '@/context/IoTContext';
import { useMemo } from 'react';

const PROTOCOL_ICONS = {
  'Modbus-TCP':  '🔌',
  'Modbus-RTU':  '🔌',
  'DLMS-COSEM':  '📡',
  'CAN-Bus':     '🚌',
  'IEC-61850':   '⚡',
  'DNP3':        '🛰️',
};

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
  const { telemetry, plantSummary, alerts, connected, powerQuality } = useIoT();

  const kpis = useMemo(() => {
    const all = Object.values(telemetry);
    const totalKw = all.reduce((s, d) => s + (d.power || 0), 0);
    const avgHealth = all.length ? all.reduce((s, d) => s + (d.healthIndex || 95), 0) / all.length : 95;
    const unacked = alerts.filter(a => !a.acknowledged).length;
    const co2 = totalKw * 0.82 / 1000;

    // Connectivity: derive dominant protocol from power quality data
    const pqValues = Object.values(powerQuality);
    const protocols = pqValues.map(p => p.protocol).filter(Boolean);
    const protocolCounts = protocols.reduce((acc, p) => { acc[p] = (acc[p] || 0) + 1; return acc; }, {});
    const dominantProtocol = Object.entries(protocolCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const isCellular = ['DLMS-COSEM', 'DNP3'].includes(dominantProtocol);
    const avgSignalHealth = pqValues.length
      ? pqValues.reduce((s, p) => s + (p.fft?.signalHealth || 0), 0) / pqValues.length
      : null;

    return { totalKw, avgHealth, unacked, co2, dominantProtocol, isCellular, avgSignalHealth };
  }, [telemetry, alerts, powerQuality]);

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Top KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPI label="Live Plant Load"     value={`${kpis.totalKw.toFixed(0)} kW`}  sub={connected ? '● Live' : '○ Offline'} color="text-primary" />
        <KPI label="Avg Machine Health"  value={`${kpis.avgHealth.toFixed(1)}%`}   sub={`${Object.keys(telemetry).length} devices`} color={kpis.avgHealth > 80 ? 'text-success' : 'text-warning'} />
        <KPI label="Active Alerts"       value={kpis.unacked}                      sub="unacknowledged" color={kpis.unacked > 0 ? 'text-danger' : 'text-success'} />
        <KPI label="CO₂ Emission"        value={`${kpis.co2.toFixed(2)} t/hr`}     sub="Scope 1+2" color="text-muted" />
        <KPI
          label="Connectivity Mode"
          value={
            kpis.dominantProtocol
              ? `${PROTOCOL_ICONS[kpis.dominantProtocol] || '🔗'} ${kpis.isCellular ? 'Cellular' : 'Mesh'}`
              : '— Detecting'
          }
          sub={kpis.dominantProtocol ?? 'awaiting data'}
          color={kpis.isCellular ? 'text-accent' : 'text-blue-400'}
        />
      </div>

      {/* Signal Health mini-bar (shows when PQ data available) */}
      {kpis.avgSignalHealth !== null && (
        <div className="bg-card border border-border rounded-xl px-4 py-2 flex items-center gap-4">
          <span className="text-muted text-xs shrink-0">Avg Signal Health</span>
          <div className="flex-1 bg-surface rounded-full h-1.5 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${kpis.avgSignalHealth.toFixed(0)}%`,
                backgroundColor: kpis.avgSignalHealth > 85 ? '#22c55e' : kpis.avgSignalHealth > 65 ? '#f59e0b' : '#ef4444' }} />
          </div>
          <span className={`text-sm font-bold shrink-0 ${kpis.avgSignalHealth > 85 ? 'text-success' : kpis.avgSignalHealth > 65 ? 'text-warning' : 'text-danger'}`}>
            {kpis.avgSignalHealth.toFixed(1)}%
          </span>
        </div>
      )}

      {/* Widget grid */}
      <WidgetGrid />
    </div>
  );
}
