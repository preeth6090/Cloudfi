import { Bell, LogOut, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useIoT } from '@/context/IoTContext';

export default function TopBar({ title }) {
  const { user, logout } = useAuth();
  const { alerts }       = useIoT();
  const [showMenu, setShowMenu] = useState(false);
  const unread = alerts.filter(a => !a.acknowledged).length;

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-surface border-b border-border h-14 shrink-0">
      <h1 className="text-text font-semibold text-base">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Alerts bell */}
        <button className="relative p-2 rounded-lg text-muted hover:text-text hover:bg-white/5 transition-colors">
          <Bell size={16} />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full animate-pulse" />
          )}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(v => !v)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            {user?.avatar
              ? <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
              : <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                  {user?.name?.[0] || 'U'}
                </div>
            }
            <div className="text-left hidden sm:block">
              <div className="text-text text-xs font-medium leading-none">{user?.name}</div>
              <div className="text-muted text-[10px] mt-0.5 capitalize">{user?.role?.replace('_', ' ')}</div>
            </div>
            <ChevronDown size={12} className="text-muted" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-xl shadow-xl z-50 py-1 animate-fade-in">
              <div className="px-3 py-2 border-b border-border">
                <div className="text-text text-xs font-medium">{user?.email}</div>
                <div className="text-muted text-[10px] capitalize">{user?.role?.replace('_', ' ')}</div>
              </div>
              <button
                onClick={() => { logout(); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted hover:text-danger hover:bg-danger/10 transition-colors"
              >
                <LogOut size={13} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
