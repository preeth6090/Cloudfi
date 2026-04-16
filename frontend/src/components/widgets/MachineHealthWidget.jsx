import { useIoT } from '@/context/IoTContext';
import { useMemo } from 'react';

function HealthBar({ name, health, status }) {
  const color = health > 80 ? '#22c55e' : health > 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-[10px] mb-0.5">
          <span className="text-muted truncate">{name}</span>
          <span style={{ color }} className="font-medium shrink-0">{health.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${health}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}

export default function MachineHealthWidget() {
  const { telemetry } = useIoT();

  const devices = useMemo(() => {
    return Object.values(telemetry)
      .map(d => ({ id: d.deviceId, name: d.name || d.assetType, health: d.healthIndex || 95, status: d.status }))
      .sort((a, b) => a.health - b.health)
      .slice(0, 6);
  }, [telemetry]);

  const avg = devices.length ? devices.reduce((s, d) => s + d.health, 0) / devices.length : 95;
  const critical = devices.filter(d => d.health < 50).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-2xl font-bold text-text">{avg.toFixed(1)}<span className="text-sm font-normal text-muted">%</span></span>
          <div className="text-xs text-muted">Avg Machine Health</div>
        </div>
        <div className="text-right">
          {critical > 0
            ? <span className="text-xs bg-danger/15 text-danger px-2 py-0.5 rounded-full font-medium">{critical} critical</span>
            : <span className="text-xs bg-success/15 text-success px-2 py-0.5 rounded-full font-medium">All healthy</span>
          }
          <div className="text-[10px] text-muted mt-0.5">AI: 0 failures in 7d</div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
        {devices.length > 0
          ? devices.map(d => <HealthBar key={d.id} name={d.name} health={d.health} />)
          : <div className="text-muted text-xs text-center mt-4">No live devices — add devices to start monitoring</div>
        }
      </div>
    </div>
  );
}
