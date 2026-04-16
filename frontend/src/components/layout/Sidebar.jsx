import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Cpu, Radio, BarChart2, Zap, GitBranch,
  Bell, Leaf, FileText, Users, Settings, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { useIoT } from '@/context/IoTContext';

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/devices',      icon: Cpu,             label: 'Devices' },
  { to: '/gateways',     icon: Radio,           label: 'Gateways' },
  { to: '/analytics',    icon: BarChart2,        label: 'Analytics' },
  { to: '/digital-twin', icon: GitBranch,        label: 'Digital Twin' },
  { to: '/maintenance',  icon: Zap,             label: 'Maintenance' },
  { to: '/esg',          icon: Leaf,            label: 'ESG & Carbon' },
  { to: '/reports',      icon: FileText,        label: 'Reports' },
  { to: '/users',        icon: Users,           label: 'Users' },
  { to: '/settings',     icon: Settings,        label: 'Settings' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { alerts, connected } = useIoT();
  const unread = alerts.filter(a => !a.acknowledged).length;

  return (
    <aside className={`flex flex-col bg-surface border-r border-border transition-all duration-200 ${collapsed ? 'w-14' : 'w-52'} shrink-0`}>
      {/* Logo */}
      <div className={`flex items-center gap-2 px-3 py-4 border-b border-border ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-text font-bold text-sm leading-none">CloudFi</div>
            <div className="text-muted text-[10px] mt-0.5">Industrial IoT</div>
          </div>
        )}
      </div>

      {/* Connection badge */}
      {!collapsed && (
        <div className="px-3 py-2">
          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${connected ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-success animate-pulse' : 'bg-danger'}`} />
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 mx-1 rounded-lg text-sm transition-colors relative
               ${isActive ? 'bg-primary/20 text-primary font-medium' : 'text-muted hover:bg-white/5 hover:text-text'}`
            }
          >
            <Icon size={16} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
            {label === 'Maintenance' && unread > 0 && (
              <span className="ml-auto bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-center p-3 border-t border-border text-muted hover:text-text hover:bg-white/5 transition-colors"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
