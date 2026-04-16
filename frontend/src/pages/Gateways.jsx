import { useState, useEffect } from 'react';
import api from '@/api/client';
import toast from 'react-hot-toast';
import { Plus, Radio, Trash2, Edit2, X, Check } from 'lucide-react';

const PROTOCOLS = ['modbus_tcp', 'modbus_rtu', 'mqtt', 'ethernet'];
const EMPTY = { name: '', model: 'GF100', ipAddress: '', port: 502, protocol: 'modbus_tcp', heartbeatInterval: 30, site: 'Site A', location: '' };
const STATUS_COLOR = { online: 'text-success bg-success/10', offline: 'text-muted bg-muted/10', degraded: 'text-warning bg-warning/10' };

export default function Gateways() {
  const [gateways, setGateways] = useState([]);
  const [form, setForm]         = useState(EMPTY);
  const [editing, setEditing]   = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading]   = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try { const { data } = await api.get('/gateways'); setGateways(data); } catch { toast.error('Failed to load gateways'); }
  }

  async function submit(e) {
    e.preventDefault(); setLoading(true);
    try {
      if (editing) { await api.put(`/gateways/${editing}`, form); toast.success('Gateway updated'); }
      else         { await api.post('/gateways', form); toast.success('Gateway created'); }
      setForm(EMPTY); setEditing(null); setShowForm(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  }

  function startEdit(gw) { setForm({ ...gw }); setEditing(gw._id); setShowForm(true); }

  async function del(id) {
    if (!confirm('Delete this gateway?')) return;
    await api.delete(`/gateways/${id}`);
    toast.success('Deleted'); load();
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-text font-semibold">GF100 Edge Gateways</h2>
          <p className="text-muted text-xs mt-0.5">Configure hardware gateways that connect field devices to the platform</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setEditing(null); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-sm rounded-xl font-medium hover:bg-primary-dark transition-colors">
          <Plus size={14} /> New Gateway
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted text-xs">
              {['Name', 'IP Address', 'Protocol', 'Site', 'Heartbeat', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {gateways.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-muted py-8 text-xs">No gateways configured yet</td></tr>
            ) : gateways.map(gw => (
              <tr key={gw._id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                      <Radio size={12} className="text-primary" />
                    </div>
                    <div>
                      <div className="text-text font-medium">{gw.name}</div>
                      <div className="text-muted text-[10px]">{gw.model} · v{gw.firmwareVersion}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-text font-mono text-xs">{gw.ipAddress}:{gw.port}</td>
                <td className="px-4 py-3"><span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{gw.protocol}</span></td>
                <td className="px-4 py-3 text-muted text-xs">{gw.site}</td>
                <td className="px-4 py-3 text-muted text-xs">{gw.heartbeatInterval}s</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[gw.status] || STATUS_COLOR.offline}`}>
                    {gw.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(gw)} className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary/10 transition-colors"><Edit2 size={12} /></button>
                    <button onClick={() => del(gw._id)}   className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors"><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-text font-semibold">{editing ? 'Edit Gateway' : 'Add Gateway'}</h3>
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-text"><X size={16} /></button>
            </div>
            <form onSubmit={submit} className="p-5 grid grid-cols-2 gap-4">
              {[
                { label: 'Gateway Name', key: 'name', required: true },
                { label: 'Model',        key: 'model' },
                { label: 'IP Address',   key: 'ipAddress', required: true, placeholder: '192.168.1.100' },
                { label: 'Port',         key: 'port', type: 'number' },
                { label: 'Site',         key: 'site' },
                { label: 'Location',     key: 'location', placeholder: 'e.g. Boiler House' },
                { label: 'Heartbeat (s)',key: 'heartbeatInterval', type: 'number' },
              ].map(f => (
                <div key={f.key} className={f.key === 'name' ? 'col-span-2' : ''}>
                  <label className="text-muted text-xs mb-1 block">{f.label}</label>
                  <input
                    required={f.required} type={f.type || 'text'} placeholder={f.placeholder}
                    value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              ))}
              <div>
                <label className="text-muted text-xs mb-1 block">Protocol</label>
                <select value={form.protocol} onChange={e => setForm(p => ({ ...p, protocol: e.target.value }))}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-primary">
                  {PROTOCOLS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="col-span-2 flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-muted hover:text-text border border-border rounded-xl">Cancel</button>
                <button type="submit" disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm rounded-xl font-medium hover:bg-primary-dark disabled:opacity-50">
                  <Check size={13} /> {loading ? 'Saving…' : 'Save Gateway'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
