import { useState, useEffect } from 'react';
import api from '@/api/client';
import toast from 'react-hot-toast';
import { CheckCircle2, AlertTriangle, Wrench } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useIoT } from '@/context/IoTContext';

const SEV_COLOR = { warning: 'border-warning/30 bg-warning/5', critical: 'border-danger/30 bg-danger/5', info: 'border-border bg-surface' };
const SEV_ICON  = { warning: <AlertTriangle size={14} className="text-warning" />, critical: <AlertTriangle size={14} className="text-danger" />, info: <Wrench size={14} className="text-muted" /> };

export default function Maintenance() {
  const [alerts, setAlerts] = useState([]);
  const { alerts: liveAlerts } = useIoT();

  useEffect(() => {
    api.get('/alerts?unacked=false').then(r => setAlerts(r.data)).catch(() => {});
  }, []);

  // Merge live alerts
  const all = [...liveAlerts, ...alerts].filter((a, i, arr) => arr.findIndex(b => b._id === a._id) === i);

  async function ack(id) {
    await api.patch(`/alerts/${id}/ack`);
    setAlerts(prev => prev.map(a => a._id === id ? { ...a, acknowledged: true } : a));
    toast.success('Alert acknowledged');
  }

  async function resolve(id) {
    await api.patch(`/alerts/${id}/resolve`);
    setAlerts(prev => prev.map(a => a._id === id ? { ...a, resolvedAt: new Date() } : a));
    toast.success('Resolved');
  }

  const open    = all.filter(a => !a.resolvedAt);
  const resolved = all.filter(a => a.resolvedAt);

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="grid grid-cols-3 gap-3">
        <KPICard label="Active Alerts"   value={open.length}              color="text-danger"  />
        <KPICard label="Unacknowledged"  value={open.filter(a=>!a.acknowledged).length} color="text-warning" />
        <KPICard label="Resolved Today"  value={resolved.length}          color="text-success" />
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-text font-medium text-sm mb-3">Active Maintenance Alerts</h3>
        <div className="space-y-2">
          {open.length === 0 && <div className="text-center text-muted text-sm py-8">No active alerts — all systems normal</div>}
          {open.map((a, i) => (
            <div key={a._id || i} className={`flex items-start gap-3 p-3 rounded-xl border ${SEV_COLOR[a.severity] || SEV_COLOR.info}`}>
              <div className="mt-0.5 shrink-0">{SEV_ICON[a.severity] || SEV_ICON.info}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-text text-sm font-medium">{a.device?.name || a.site}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${a.type === 'predictive' ? 'bg-warning/15 text-warning' : 'bg-primary/15 text-primary'}`}>{a.type}</span>
                  {a.acknowledged && <span className="text-[10px] text-muted">· ack'd</span>}
                </div>
                <p className="text-muted text-xs mt-0.5">{a.message}</p>
                {a.recommendation && <p className="text-primary text-[10px] mt-1">→ {a.recommendation}</p>}
                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted">
                  {a.createdAt && <span>{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>}
                  {a.estimatedWastage && <span className="text-danger">₹{a.estimatedWastage.toLocaleString()}/hr loss</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {!a.acknowledged && (
                  <button onClick={() => ack(a._id)} className="px-2 py-1 text-[10px] bg-surface border border-border rounded-lg text-muted hover:text-text transition-colors">Ack</button>
                )}
                <button onClick={() => resolve(a._id)} className="px-2 py-1 text-[10px] bg-success/10 border border-success/20 rounded-lg text-success hover:bg-success/20 transition-colors">
                  <CheckCircle2 size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, color }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
    </div>
  );
}
