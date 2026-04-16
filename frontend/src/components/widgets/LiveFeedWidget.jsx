import { useIoT } from '@/context/IoTContext';
import { useMemo } from 'react';

const STATUS_DOT = { online: 'bg-success', warning: 'bg-warning', critical: 'bg-danger animate-pulse', offline: 'bg-muted' };

export default function LiveFeedWidget() {
  const { telemetry } = useIoT();
  const rows = useMemo(() => Object.values(telemetry).slice(0, 8), [telemetry]);

  if (!rows.length) {
    return <div className="flex items-center justify-center h-full text-muted text-xs">No live devices. Add devices to see feed.</div>;
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted border-b border-border">
            <th className="text-left pb-1.5 font-medium">Device</th>
            <th className="text-right pb-1.5 font-medium">kW</th>
            <th className="text-right pb-1.5 font-medium">Temp</th>
            <th className="text-right pb-1.5 font-medium">Vib</th>
            <th className="text-right pb-1.5 font-medium">PF</th>
            <th className="text-right pb-1.5 font-medium">Health</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map(d => {
            const health = d.healthIndex || 95;
            const healthColor = health > 80 ? 'text-success' : health > 60 ? 'text-warning' : 'text-danger';
            const status = health > 80 ? 'online' : health > 60 ? 'warning' : 'critical';
            return (
              <tr key={d.deviceId} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[status]}`} />
                    <span className="text-text truncate max-w-[100px]">{d.name || d.assetType}</span>
                  </div>
                </td>
                <td className="text-right text-text font-medium">{(d.power || 0).toFixed(0)}</td>
                <td className="text-right text-muted">{(d.temperature || 0).toFixed(0)}°</td>
                <td className={`text-right ${(d.vibration || 0) > 4 ? 'text-warning' : 'text-muted'}`}>{(d.vibration || 0).toFixed(1)}</td>
                <td className="text-right text-muted">{(d.powerFactor || 0).toFixed(2)}</td>
                <td className={`text-right font-medium ${healthColor}`}>{health.toFixed(0)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
