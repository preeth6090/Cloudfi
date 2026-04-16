import { useIoT } from '@/context/IoTContext';
import { Wrench, AlertTriangle, TrendingDown } from 'lucide-react';

const TYPE_ICON = { predictive: AlertTriangle, preventive: Wrench, generative: TrendingDown };
const TYPE_COLOR = { predictive: 'text-warning', preventive: 'text-primary', generative: 'text-success' };

export default function PredictiveWidget() {
  const { alerts } = useIoT();
  const unresolved = alerts.filter(a => !a.resolvedAt).slice(0, 5);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 text-xs">
        <span className="text-muted">Active Alerts</span>
        <span className={`font-bold ${unresolved.length > 0 ? 'text-warning' : 'text-success'}`}>
          {unresolved.length} open
        </span>
      </div>
      <div className="flex-1 overflow-auto flex flex-col gap-1.5">
        {unresolved.length === 0 ? (
          <div className="text-center text-muted text-xs mt-4">No active alerts</div>
        ) : unresolved.map((a, i) => {
          const Icon = TYPE_ICON[a.type] || AlertTriangle;
          const color = TYPE_COLOR[a.type] || 'text-warning';
          return (
            <div key={a._id || i} className="flex gap-2 p-2 bg-surface rounded-lg border border-border text-xs">
              <Icon size={12} className={`${color} mt-0.5 shrink-0`} />
              <div className="min-w-0">
                <div className="text-text font-medium truncate">{a.device?.name || a.site}</div>
                <div className="text-muted truncate">{a.message}</div>
                {a.estimatedWastage && (
                  <div className="text-danger text-[10px]">₹{a.estimatedWastage.toLocaleString()}/hr loss</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
