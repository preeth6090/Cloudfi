import { useState, useEffect } from 'react';
import api from '@/api/client';
import toast from 'react-hot-toast';
import { Plus, Cpu, Trash2, Edit2, X, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { useIoT } from '@/context/IoTContext';

const ASSET_TYPES = ['ball_mill','boiler','compressor','pump','fan','centrifugal','spray_dryer','hydraulic_press','gearbox','turbine','heat_exchanger','motor','other'];
const EMPTY_DEVICE = { name:'', assetType:'motor', site:'Site A', unitId:1, pollInterval:5, tags:[] };
const EMPTY_REG = { parameterId:'', label:'', register:0, dataType:'float32', scaleFactor:1, unit:'', alertMin:'', alertMax:'', aiOptimalTarget:'' };
const STATUS_COLOR = { online:'text-success', offline:'text-muted', warning:'text-warning', critical:'text-danger' };

export default function Devices() {
  const [devices, setDevices]     = useState([]);
  const [gateways, setGateways]   = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [step, setStep]           = useState(1);
  const [form, setForm]           = useState(EMPTY_DEVICE);
  const [regs, setRegs]           = useState([]);
  const [editing, setEditing]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const { telemetry }             = useIoT();

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [d, g] = await Promise.all([api.get('/devices'), api.get('/gateways')]);
      setDevices(d.data); setGateways(g.data);
    } catch { toast.error('Load failed'); }
  }

  function startAdd() { setForm(EMPTY_DEVICE); setRegs([]); setEditing(null); setStep(1); setShowForm(true); }
  function startEdit(dev) {
    setForm({ name:dev.name, assetType:dev.assetType, site:dev.site, unitId:dev.unitId, pollInterval:dev.pollInterval, gateway:dev.gateway?._id||dev.gateway, tags:dev.tags||[] });
    setRegs(dev.registerMap || []);
    setEditing(dev._id); setStep(1); setShowForm(true);
  }

  async function save() {
    setLoading(true);
    try {
      const payload = { ...form, registerMap: regs };
      if (editing) await api.put(`/devices/${editing}`, payload);
      else         await api.post('/devices', payload);
      toast.success(editing ? 'Device updated' : 'Device added');
      setShowForm(false); loadAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  }

  async function del(id) {
    if (!confirm('Delete device?')) return;
    await api.delete(`/devices/${id}`);
    toast.success('Deleted'); loadAll();
  }

  function addReg() { setRegs(r => [...r, { ...EMPTY_REG }]); }
  function updateReg(i, k, v) { setRegs(r => r.map((x, j) => j === i ? { ...x, [k]: v } : x)); }
  function removeReg(i) { setRegs(r => r.filter((_, j) => j !== i)); }

  const live = (id) => telemetry[id];

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-text font-semibold">Device Manager</h2>
          <p className="text-muted text-xs mt-0.5">Register assets and map their Modbus parameters to the platform</p>
        </div>
        <button onClick={startAdd} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-sm rounded-xl font-medium hover:bg-primary-dark transition-colors">
          <Plus size={14} /> Add Device
        </button>
      </div>

      {/* Device cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {devices.length === 0 && (
          <div className="col-span-3 text-center text-muted text-sm py-12 bg-card border border-border rounded-xl">
            No devices yet — click "Add Device" to register your first asset
          </div>
        )}
        {devices.map(dev => {
          const t = live(dev._id);
          const health = t?.healthIndex ?? dev.healthIndex ?? 95;
          const hColor = health > 80 ? 'text-success' : health > 60 ? 'text-warning' : 'text-danger';
          return (
            <div key={dev._id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Cpu size={14} className="text-primary" />
                  </div>
                  <div>
                    <div className="text-text font-medium text-sm">{dev.name}</div>
                    <div className="text-muted text-[10px]">{dev.assetType.replace('_',' ')} · {dev.site}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(dev)} className="p-1 text-muted hover:text-primary transition-colors"><Edit2 size={12} /></button>
                  <button onClick={() => del(dev._id)}   className="p-1 text-muted hover:text-danger transition-colors"><Trash2 size={12} /></button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <Stat label="Power" value={t ? `${t.power.toFixed(0)} kW` : '--'} />
                <Stat label="Health" value={`${health.toFixed(0)}%`} color={hColor} />
                <Stat label="Temp" value={t ? `${t.temperature.toFixed(0)}°C` : '--'} />
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className={`font-medium ${STATUS_COLOR[t ? 'online' : 'offline']}`}>
                  {t ? '● Online' : '○ Offline'}
                </span>
                <span className="text-muted">{dev.registerMap?.length || 0} registers mapped</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Multi-step modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
              <div>
                <h3 className="text-text font-semibold">{editing ? 'Edit Device' : 'Add Device'}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  {['Basic Info','Protocol','Register Map','AI Targets'].map((s, i) => (
                    <span key={s} className={`text-[10px] px-2 py-0.5 rounded-full ${step === i+1 ? 'bg-primary text-white' : 'bg-surface text-muted'}`}>{i+1}. {s}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-text"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* Step 1 */}
              {step === 1 && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Device Name" req><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} /></Field>
                  <Field label="Asset Type">
                    <select value={form.assetType} onChange={e=>setForm(p=>({...p,assetType:e.target.value}))}>
                      {ASSET_TYPES.map(t=><option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                    </select>
                  </Field>
                  <Field label="Site"><input value={form.site} onChange={e=>setForm(p=>({...p,site:e.target.value}))} /></Field>
                  <Field label="Tags (comma-separated)">
                    <input value={(form.tags||[]).join(',')} onChange={e=>setForm(p=>({...p,tags:e.target.value.split(',').map(t=>t.trim())}))} />
                  </Field>
                </div>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Gateway">
                    <select value={form.gateway||''} onChange={e=>setForm(p=>({...p,gateway:e.target.value}))}>
                      <option value="">— No gateway —</option>
                      {gateways.map(g=><option key={g._id} value={g._id}>{g.name} ({g.ipAddress})</option>)}
                    </select>
                  </Field>
                  <Field label="Modbus Unit ID"><input type="number" value={form.unitId} onChange={e=>setForm(p=>({...p,unitId:+e.target.value}))} /></Field>
                  <Field label="Poll Interval (s)"><input type="number" value={form.pollInterval} onChange={e=>setForm(p=>({...p,pollInterval:+e.target.value}))} /></Field>
                </div>
              )}

              {/* Step 3 – Register mapping */}
              {step === 3 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-muted text-xs">Map Modbus registers to human-readable parameters</span>
                    <button onClick={addReg} className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/15 text-primary rounded-lg hover:bg-primary/25">
                      <Plus size={10} /> Add Row
                    </button>
                  </div>
                  <div className="space-y-2">
                    {regs.map((r, i) => (
                      <div key={i} className="grid grid-cols-6 gap-1.5 items-center bg-surface p-2 rounded-lg border border-border text-xs">
                        <input placeholder="ID (e.g. vibration)" value={r.parameterId} onChange={e=>updateReg(i,'parameterId',e.target.value)} className="col-span-2 bg-transparent border border-border rounded px-2 py-1 text-text focus:outline-none focus:border-primary" />
                        <input placeholder="Label" value={r.label} onChange={e=>updateReg(i,'label',e.target.value)} className="col-span-2 bg-transparent border border-border rounded px-2 py-1 text-text focus:outline-none focus:border-primary" />
                        <input placeholder="Reg #" type="number" value={r.register} onChange={e=>updateReg(i,'register',+e.target.value)} className="bg-transparent border border-border rounded px-2 py-1 text-text focus:outline-none focus:border-primary" />
                        <button onClick={()=>removeReg(i)} className="text-muted hover:text-danger"><X size={12} /></button>
                        <input placeholder="Unit" value={r.unit} onChange={e=>updateReg(i,'unit',e.target.value)} className="col-span-2 bg-transparent border border-border rounded px-2 py-1 text-text focus:outline-none focus:border-primary" />
                        <select value={r.dataType} onChange={e=>updateReg(i,'dataType',e.target.value)} className="col-span-2 bg-surface border border-border rounded px-2 py-1 text-text focus:outline-none focus:border-primary">
                          {['float32','int16','uint16','coil'].map(t=><option key={t}>{t}</option>)}
                        </select>
                        <input placeholder="Scale" type="number" value={r.scaleFactor} onChange={e=>updateReg(i,'scaleFactor',+e.target.value)} className="bg-transparent border border-border rounded px-2 py-1 text-text focus:outline-none focus:border-primary" />
                      </div>
                    ))}
                    {regs.length === 0 && <div className="text-center text-muted text-xs py-6">No registers mapped yet — click "Add Row"</div>}
                  </div>
                </div>
              )}

              {/* Step 4 – AI targets */}
              {step === 4 && (
                <div className="space-y-3">
                  <p className="text-muted text-xs">Set AI optimal targets for each mapped parameter. The AI will alert when readings deviate.</p>
                  {regs.length === 0 && <div className="text-center text-muted text-xs py-6">Add registers in Step 3 first</div>}
                  {regs.map((r, i) => r.parameterId && (
                    <div key={i} className="flex items-center gap-3 bg-surface p-3 rounded-lg border border-border text-xs">
                      <span className="text-text font-medium w-28 shrink-0">{r.label || r.parameterId}</span>
                      <input placeholder="Min alert" type="number" value={r.alertMin} onChange={e=>updateReg(i,'alertMin',e.target.value)} className="flex-1 bg-transparent border border-border rounded px-2 py-1 text-text focus:outline-none focus:border-primary" />
                      <input placeholder="AI target" type="number" value={r.aiOptimalTarget} onChange={e=>updateReg(i,'aiOptimalTarget',e.target.value)} className="flex-1 bg-transparent border border-primary/50 rounded px-2 py-1 text-primary focus:outline-none focus:border-primary" />
                      <input placeholder="Max alert" type="number" value={r.alertMax} onChange={e=>updateReg(i,'alertMax',e.target.value)} className="flex-1 bg-transparent border border-border rounded px-2 py-1 text-text focus:outline-none focus:border-primary" />
                      <span className="text-muted w-8">{r.unit}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center p-4 border-t border-border shrink-0">
              <button onClick={()=>setStep(s=>Math.max(1,s-1))} disabled={step===1}
                className="flex items-center gap-1 px-3 py-2 text-sm text-muted hover:text-text border border-border rounded-xl disabled:opacity-30">
                <ChevronLeft size={14} /> Back
              </button>
              {step < 4
                ? <button onClick={()=>setStep(s=>s+1)} className="flex items-center gap-1 px-4 py-2 bg-primary text-white text-sm rounded-xl font-medium hover:bg-primary-dark">
                    Next <ChevronRight size={14} />
                  </button>
                : <button onClick={save} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm rounded-xl font-medium hover:bg-primary-dark disabled:opacity-50">
                    <Check size={13} /> {loading ? 'Saving…' : 'Save Device'}
                  </button>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color = 'text-text' }) {
  return <div><div className={`text-sm font-bold ${color}`}>{value}</div><div className="text-[10px] text-muted">{label}</div></div>;
}

function Field({ label, req, children }) {
  return (
    <div>
      <label className="text-muted text-xs mb-1 block">{label}{req && <span className="text-danger ml-0.5">*</span>}</label>
      {children && (
        <div className="[&>input]:w-full [&>select]:w-full [&>input]:bg-surface [&>select]:bg-surface [&>input]:border [&>select]:border [&>input]:border-border [&>select]:border-border [&>input]:rounded-lg [&>select]:rounded-lg [&>input]:px-3 [&>input]:py-2 [&>select]:px-3 [&>select]:py-2 [&>input]:text-text [&>select]:text-text [&>input]:text-sm [&>select]:text-sm [&>input]:focus:outline-none [&>select]:focus:outline-none [&>input]:focus:border-primary [&>select]:focus:border-primary [&>input]:transition-colors [&>select]:transition-colors">
          {children}
        </div>
      )}
    </div>
  );
}
