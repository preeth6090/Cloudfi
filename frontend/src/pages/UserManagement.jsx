import { useState, useEffect } from 'react';
import api from '@/api/client';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { Edit2, Trash2, Check, X } from 'lucide-react';
import { format } from 'date-fns';

const ROLES = ['system_admin', 'supervisor', 'energy_analyst', 'viewer'];
const ROLE_COLOR = { system_admin: 'bg-accent/15 text-accent', supervisor: 'bg-primary/15 text-primary', energy_analyst: 'bg-warning/15 text-warning', viewer: 'bg-muted/15 text-muted' };

export default function UserManagement() {
  const [users, setUsers]       = useState([]);
  const [editId, setEditId]     = useState(null);
  const [editData, setEditData] = useState({});
  const { user: me }            = useAuth();

  useEffect(() => { api.get('/users').then(r => setUsers(r.data)).catch(() => toast.error('Access denied')); }, []);

  async function save(id) {
    try {
      const { data } = await api.patch(`/users/${id}`, editData);
      setUsers(prev => prev.map(u => u._id === id ? data : u));
      setEditId(null); toast.success('Updated');
    } catch { toast.error('Update failed'); }
  }

  async function del(id) {
    if (!confirm('Delete user?')) return;
    await api.delete(`/users/${id}`);
    setUsers(prev => prev.filter(u => u._id !== id));
    toast.success('Deleted');
  }

  const total   = users.length;
  const active  = users.filter(u => u.isActive).length;
  const admins  = users.filter(u => u.role === 'system_admin').length;

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="grid grid-cols-3 gap-3">
        <KPI label="Total Users"    value={total}  color="text-text" />
        <KPI label="Active"         value={active} color="text-success" />
        <KPI label="System Admins"  value={admins} color="text-accent" />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-text font-medium text-sm">User Access & Roles</h3>
          <span className="text-muted text-xs">First login auto-creates account via Google OAuth</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted text-xs">
              {['User', 'Role', 'Site Access', 'Status', 'Last Login', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {users.map(u => (
              <tr key={u._id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {u.avatar
                      ? <img src={u.avatar} alt="" className="w-7 h-7 rounded-full" />
                      : <div className="w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center text-primary text-xs font-bold">{u.name?.[0]}</div>
                    }
                    <div>
                      <div className="text-text font-medium">{u.name}</div>
                      <div className="text-muted text-[10px]">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {editId === u._id
                    ? <select value={editData.role} onChange={e=>setEditData(p=>({...p,role:e.target.value}))} className="bg-surface border border-border rounded-lg px-2 py-1 text-text text-xs focus:outline-none focus:border-primary">
                        {ROLES.map(r=><option key={r} value={r}>{r.replace('_',' ')}</option>)}
                      </select>
                    : <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ROLE_COLOR[u.role]}`}>{u.role?.replace('_',' ')}</span>
                  }
                </td>
                <td className="px-4 py-3 text-muted text-xs">{(u.siteAccess||[]).join(', ') || 'None'}</td>
                <td className="px-4 py-3">
                  {editId === u._id
                    ? <select value={editData.isActive ? 'true' : 'false'} onChange={e=>setEditData(p=>({...p,isActive:e.target.value==='true'}))} className="bg-surface border border-border rounded-lg px-2 py-1 text-text text-xs focus:outline-none focus:border-primary">
                        <option value="true">Active</option><option value="false">Inactive</option>
                      </select>
                    : <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? 'bg-success/15 text-success' : 'bg-muted/15 text-muted'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                  }
                </td>
                <td className="px-4 py-3 text-muted text-xs">{u.lastLogin ? format(new Date(u.lastLogin), 'dd MMM HH:mm') : 'Never'}</td>
                <td className="px-4 py-3">
                  {u._id === me?._id ? <span className="text-muted text-[10px]">You</span> :
                    editId === u._id
                      ? <div className="flex gap-1">
                          <button onClick={()=>save(u._id)} className="p-1.5 rounded-lg text-success hover:bg-success/10"><Check size={12}/></button>
                          <button onClick={()=>setEditId(null)} className="p-1.5 rounded-lg text-muted hover:text-text"><X size={12}/></button>
                        </div>
                      : <div className="flex gap-1">
                          <button onClick={()=>{ setEditId(u._id); setEditData({ role:u.role, isActive:u.isActive }); }} className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary/10"><Edit2 size={12}/></button>
                          <button onClick={()=>del(u._id)} className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10"><Trash2 size={12}/></button>
                        </div>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPI({ label, value, color }) {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
