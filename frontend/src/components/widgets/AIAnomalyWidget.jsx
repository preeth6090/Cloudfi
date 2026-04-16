import { useIoT } from '@/context/IoTContext';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const TYPE_COLOR = {
  predictive:  'text-warning bg-warning/10 border-warning/20',
  preventive:  'text-primary bg-primary/10 border-primary/20',
  generative:  'text-accent bg-accent/10 border-accent/20',
  quality:     'text-blue-400 bg-blue-400/10 border-blue-400/20',
  critical:    'text-danger bg-danger/10 border-danger/20',
};

export default function AIAnomalyWidget() {
  const { alerts } = useIoT();
  const recent = alerts.slice(0, 5);

  if (!recent.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-success">
        <CheckCircle2 size={28} />
        <span className="text-sm font-medium">No active anomalies</span>
        <span className="text-xs text-muted">AI monitoring all systems</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 h-full overflow-hidden">
      {recent.map((a, i) => (
        <div key={a._id || i} className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${TYPE_COLOR[a.type] || TYPE_COLOR.predictive}`}>
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="font-medium truncate">{a.message || 'Anomaly detected'}</div>
            <div className="opacity-70 text-[10px] mt-0.5">
              {a.site} · {a.createdAt ? formatDistanceToNow(new Date(a.createdAt), { addSuffix: true }) : 'just now'}
              {a.estimatedWastage ? ` · ₹${a.estimatedWastage.toLocaleString()}/hr` : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
