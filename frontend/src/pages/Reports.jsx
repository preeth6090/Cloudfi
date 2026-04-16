import { useState } from 'react';
import api from '@/api/client';
import toast from 'react-hot-toast';
import { Download, Plus, Trash2 } from 'lucide-react';

const REPORT_TYPES = ['Cogen Shift Report (6am-6am)', 'Daily Energy Summary', 'Meter Reading Report', 'Predictive Maintenance Report', 'ESG Carbon Report', 'Custom Parameter Report'];

export default function Reports() {
  const [type, setType]       = useState(REPORT_TYPES[0]);
  const [deviceId, setDeviceId] = useState('');
  const [rows, setRows]       = useState([]);
  const [form, setForm]       = useState({ timestamp: '', power: '', temperature: '', vibration: '', efficiency: '' });

  function addRow() {
    if (!form.timestamp) return toast.error('Timestamp required');
    setRows(prev => [...prev, { ...form }]);
    setForm({ timestamp: '', power: '', temperature: '', vibration: '', efficiency: '' });
  }

  async function submit() {
    if (!rows.length) return toast.error('Add at least one record');
    try {
      await api.post('/telemetry/bulk', {
        records: rows.map(r => ({ ...r, deviceId: deviceId || undefined, site: 'Site A' }))
      });
      toast.success(`${rows.length} records saved`);
      setRows([]);
    } catch { toast.error('Upload failed'); }
  }

  function exportCSV() {
    if (!rows.length) return;
    const header = Object.keys(rows[0]).join(',');
    const body = rows.map(r => Object.values(r).join(',')).join('\n');
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'cloudfi_report.csv'; a.click();
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-text font-medium text-sm mb-3">AI-Driven Report Builder</h3>
        <div className="flex gap-3 flex-wrap mb-4">
          <select value={type} onChange={e=>setType(e.target.value)} className="flex-1 min-w-48 bg-surface border border-border rounded-xl px-3 py-2 text-text text-sm focus:outline-none focus:border-primary">
            {REPORT_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
          <input placeholder="Device ID (optional)" value={deviceId} onChange={e=>setDeviceId(e.target.value)} className="flex-1 min-w-36 bg-surface border border-border rounded-xl px-3 py-2 text-text text-sm focus:outline-none focus:border-primary" />
        </div>

        {/* Manual entry */}
        <div className="border border-dashed border-border rounded-xl p-3 mb-3">
          <div className="text-muted text-xs mb-2">Add Manual Reading</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { key: 'timestamp', placeholder: 'Timestamp (ISO)', type: 'text' },
              { key: 'power',       placeholder: 'Power (kW)',     type: 'number' },
              { key: 'temperature', placeholder: 'Temp (°C)',      type: 'number' },
              { key: 'vibration',   placeholder: 'Vib (mm/s)',     type: 'number' },
              { key: 'efficiency',  placeholder: 'Efficiency (%)', type: 'number' },
            ].map(f => (
              <input key={f.key} type={f.type} placeholder={f.placeholder} value={form[f.key]}
                onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                className="bg-bg border border-border rounded-lg px-2 py-1.5 text-text text-xs focus:outline-none focus:border-primary" />
            ))}
            <button onClick={addRow} className="flex items-center justify-center gap-1 px-3 py-1.5 bg-primary text-white text-xs rounded-lg hover:bg-primary-dark transition-colors font-medium">
              <Plus size={10} /> Add
            </button>
          </div>
        </div>

        {/* Preview table */}
        {rows.length > 0 && (
          <div className="overflow-auto mb-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted">
                  {Object.keys(rows[0]).map(k => <th key={k} className="text-left px-2 py-1.5 font-medium capitalize">{k}</th>)}
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    {Object.values(r).map((v, j) => <td key={j} className="px-2 py-1.5 text-text">{v || '—'}</td>)}
                    <td className="px-2 py-1.5"><button onClick={()=>setRows(p=>p.filter((_,j)=>j!==i))} className="text-muted hover:text-danger"><Trash2 size={11}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={submit} disabled={!rows.length} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm rounded-xl font-medium hover:bg-primary-dark disabled:opacity-40 transition-colors">
            Save to Database ({rows.length})
          </button>
          <button onClick={exportCSV} disabled={!rows.length} className="flex items-center gap-1.5 px-4 py-2 bg-card border border-border text-sm text-muted hover:text-text rounded-xl disabled:opacity-40 transition-colors">
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* AI Insight summary */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-text font-medium text-sm mb-2">AI/ML Report Summary</h3>
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-xs text-muted leading-relaxed">
          <span className="text-primary font-medium">AI Insight:</span> Based on the selected report type "{type}", the Load Forecasting Model
          projects a 3% cost increase over the next three months, primarily due to observed seasonal demand patterns
          and anticipated tariff adjustments. <span className="text-primary font-medium">Recommended Action:</span> Review Target Management and optimize power factor.
        </div>
      </div>
    </div>
  );
}
