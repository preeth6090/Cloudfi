import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, FlaskConical, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

const DEV_PRESETS = [
  { label: 'System Admin',    role: 'system_admin',    email: 'admin@cloudfi.dev',    name: 'Demo Admin' },
  { label: 'Plant Manager',   role: 'supervisor',      email: 'manager@cloudfi.dev',  name: 'Plant Manager' },
  { label: 'Energy Analyst',  role: 'energy_analyst',  email: 'analyst@cloudfi.dev',  name: 'Energy Analyst' },
  { label: 'Viewer',          role: 'viewer',          email: 'viewer@cloudfi.dev',   name: 'Viewer User' },
];

export default function Login() {
  const { user, loginWithGoogle, devLogin, googleConfigured } = useAuth();
  const navigate    = useNavigate();
  const [params]    = useSearchParams();
  const [showDev, setShowDev]   = useState(false);
  const [loading, setLoading]   = useState(null); // preset index or 'google'

  useEffect(() => { if (user) navigate('/dashboard', { replace: true }); }, [user, navigate]);

  useEffect(() => {
    const err = params.get('error');
    if (err === 'google_not_configured') toast.error('Add Google OAuth credentials to backend/.env');
    else if (err === 'auth_failed')      toast.error('Google sign-in failed — try again');
  }, [params]);

  async function handleDevLogin(preset) {
    setLoading(preset.role);
    try {
      await devLogin(preset.name, preset.email, preset.role);
      navigate('/dashboard', { replace: true });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Dev login failed');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Main card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <div className="text-text font-bold text-lg leading-none">CloudFi</div>
              <div className="text-muted text-xs mt-0.5">Industrial Intelligence Platform</div>
            </div>
          </div>

          <h1 className="text-text text-xl font-semibold mb-1">Welcome back</h1>
          <p className="text-muted text-sm mb-6">Sign in to access your industrial dashboard</p>

          {/* Google Sign-in */}
          <button
            onClick={() => { setLoading('google'); loginWithGoogle(); }}
            disabled={loading === 'google'}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-800 rounded-xl font-medium text-sm hover:bg-gray-100 active:scale-[0.98] transition-all shadow-lg disabled:opacity-60 mb-2"
          >
            <GoogleIcon />
            {loading === 'google' ? 'Redirecting…' : 'Continue with Google'}
          </button>

          {!googleConfigured && (
            <p className="text-[10px] text-center text-warning/80 mb-4">
              Google OAuth not configured yet — use Dev Login below to explore
            </p>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-muted text-[10px] uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Dev Login toggle */}
          <button
            onClick={() => setShowDev(v => !v)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-muted hover:text-text hover:border-primary/50 transition-all font-medium"
          >
            <FlaskConical size={14} className="text-primary" />
            Dev / Demo Login
            {showDev ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showDev && (
            <div className="mt-3 space-y-1.5 animate-fade-in">
              <p className="text-[10px] text-muted text-center mb-2">
                Instant access — no credentials needed (dev only)
              </p>
              {DEV_PRESETS.map(p => (
                <button
                  key={p.role}
                  onClick={() => handleDevLogin(p)}
                  disabled={!!loading}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-surface border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all disabled:opacity-50 group"
                >
                  <div className="text-left">
                    <div className="text-text text-sm font-medium group-hover:text-primary transition-colors">{p.label}</div>
                    <div className="text-muted text-[10px]">{p.email}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    p.role === 'system_admin'   ? 'bg-accent/15 text-accent'   :
                    p.role === 'supervisor'     ? 'bg-primary/15 text-primary' :
                    p.role === 'energy_analyst' ? 'bg-warning/15 text-warning' :
                    'bg-muted/15 text-muted'
                  }`}>
                    {loading === p.role ? '…' : 'Enter'}
                  </span>
                </button>
              ))}
            </div>
          )}

          <p className="text-muted text-[10px] text-center mt-5">
            First Google login auto-assigns System Admin role
          </p>
        </div>

        {/* Feature pills */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {['Real-time IoT', 'AI Insights', 'Digital Twin'].map(f => (
            <div key={f} className="bg-card/60 border border-border rounded-xl px-2 py-2.5">
              <div className="text-text text-[11px] font-medium">{f}</div>
            </div>
          ))}
        </div>

        <p className="text-muted text-[10px] text-center mt-4">
          🇮🇳 Built with love in India by{' '}
          <a href="https://www.timestampindia.com" target="_blank" rel="noopener noreferrer"
            className="text-primary hover:text-primary-light font-medium transition-colors">
            Timestamp India
          </a>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
