import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, Activity, Brain, Cpu, BarChart3, Shield, Leaf, Users,
  ChevronRight, ArrowRight, Wifi, AlertTriangle, TrendingUp,
  LayoutDashboard, Settings, GitBranch, FlaskConical, ChevronDown, ChevronUp,
  CheckCircle2, Play, Globe, Lock, Gauge
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

const DEV_PRESETS = [
  { label: 'System Admin',   role: 'system_admin',   email: 'admin@cloudfi.dev',   name: 'Demo Admin' },
  { label: 'Plant Manager',  role: 'supervisor',     email: 'manager@cloudfi.dev', name: 'Plant Manager' },
  { label: 'Energy Analyst', role: 'energy_analyst', email: 'analyst@cloudfi.dev', name: 'Energy Analyst' },
  { label: 'Viewer',         role: 'viewer',         email: 'viewer@cloudfi.dev',  name: 'Viewer User' },
];

// Animated counter
function Counter({ target, suffix = '', duration = 2000 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const p = Math.min((Date.now() - start) / duration, 1);
          setVal(Math.floor(p * target));
          if (p < 1) requestAnimationFrame(tick);
          else setVal(target);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.4 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// Floating particle
function Particle({ style }) {
  return <div className="absolute w-1 h-1 rounded-full bg-primary/40 animate-pulse-slow" style={style} />;
}

const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  animationDelay: `${(i * 0.3) % 3}s`,
  animationDuration: `${2.5 + (i % 4) * 0.5}s`,
}));

export default function Landing() {
  const { user, loginWithGoogle, devLogin, googleConfigured } = useAuth();
  const navigate = useNavigate();
  const [showDev, setShowDev]   = useState(false);
  const [loading, setLoading]   = useState(null);

  useEffect(() => { if (user) navigate('/dashboard', { replace: true }); }, [user, navigate]);

  async function handleDevLogin(preset) {
    setLoading(preset.role);
    try {
      await devLogin(preset.name, preset.email, preset.role);
      navigate('/dashboard', { replace: true });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Login failed');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text font-sans overflow-x-hidden">

      {/* ── NAV ────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 backdrop-blur-xl bg-bg/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/30">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">CloudFi</span>
            <span className="hidden sm:block text-[10px] text-muted bg-surface border border-border px-2 py-0.5 rounded-full ml-1">Industrial AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted">
            <a href="#features" className="hover:text-text transition-colors">Features</a>
            <a href="#metrics"  className="hover:text-text transition-colors">Metrics</a>
            <a href="#modules"  className="hover:text-text transition-colors">Modules</a>
            <a href="#login"    className="hover:text-text transition-colors">Login</a>
          </div>
          <a href="#login"
            className="flex items-center gap-1.5 text-sm bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-xl font-medium transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30">
            Get Access <ArrowRight size={14} />
          </a>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        {/* Ambient glows */}
        <div className="absolute top-20 left-1/3 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[300px] h-[300px] bg-accent/6 rounded-full blur-[100px] pointer-events-none" />
        {/* Particles */}
        <div className="absolute inset-0 pointer-events-none">
          {PARTICLES.map((p, i) => <Particle key={i} style={p} />)}
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-medium px-4 py-2 rounded-full mb-6 animate-fade-in">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            Live on Render · Real-time industrial data streaming
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-none mb-6">
            Industrial Intelligence
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradientShift_4s_ease_infinite]">
              at Cloud Scale
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            CloudFi transforms raw IoT sensor data into actionable intelligence — real-time monitoring, AI-driven predictive maintenance, Digital Twin simulation, and ESG carbon tracking for heavy industry.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a href="#login"
              className="flex items-center gap-2 bg-primary hover:bg-primary-light text-white px-8 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5">
              <Play size={16} fill="white" />
              Launch Dashboard
            </a>
            <a href="#features"
              className="flex items-center gap-2 bg-surface border border-border hover:border-primary/40 text-text px-8 py-3.5 rounded-xl font-semibold text-sm transition-all hover:-translate-y-0.5">
              Explore Features <ChevronRight size={16} />
            </a>
          </div>

          {/* Live stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {[
              { icon: Wifi,          label: 'Live tick rate', value: '2s',    color: 'text-success' },
              { icon: Cpu,           label: 'Asset types',    value: '13+',   color: 'text-primary' },
              { icon: Brain,         label: 'AI rules',       value: '5',     color: 'text-accent'  },
              { icon: BarChart3,     label: 'Dashboard widgets', value: '10', color: 'text-warning' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-card/60 border border-border rounded-xl px-4 py-3 text-left backdrop-blur">
                <Icon size={14} className={`${color} mb-1.5`} />
                <div className={`text-lg font-bold ${color}`}>{value}</div>
                <div className="text-[11px] text-muted">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── METRICS ────────────────────────────────────────────── */}
      <section id="metrics" className="py-20 px-6 border-t border-border/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Platform at a Glance</h2>
            <p className="text-muted">Industrial-grade data processing, purpose-built for energy-intensive operations</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { target: 95,    suffix: '%',   label: 'Uptime SLA',           sub: 'resilient architecture'    },
              { target: 2,     suffix: 's',   label: 'Telemetry latency',    sub: 'socket.io streaming'       },
              { target: 8,     suffix: '',    label: 'Demo devices seeded',  sub: 'on first boot'             },
              { target: 15000, suffix: '₹',  label: 'Daily savings/device', sub: 'via bearing alert'         },
            ].map(({ target, suffix, label, sub }) => (
              <div key={label} className="bg-card border border-border rounded-2xl p-6 text-center hover:border-primary/30 transition-colors">
                <div className="text-4xl font-extrabold text-primary mb-1">
                  <Counter target={target} suffix={suffix} />
                </div>
                <div className="text-text font-semibold text-sm mb-0.5">{label}</div>
                <div className="text-muted text-[11px]">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-surface/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-primary text-xs font-semibold uppercase tracking-widest">Core Capabilities</span>
            <h2 className="text-4xl font-bold mt-2 mb-4">Everything you need to run a smarter plant</h2>
            <p className="text-muted max-w-xl mx-auto">From live sensor ingestion to AI-generated savings recommendations — one platform, end to end.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, color, title, body, tags }) => (
              <div key={title}
                className="group bg-card border border-border rounded-2xl p-6 hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 cursor-default">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                  <Icon size={20} className="text-white" />
                </div>
                <h3 className="font-semibold text-text mb-2">{title}</h3>
                <p className="text-muted text-sm leading-relaxed mb-4">{body}</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(t => (
                    <span key={t} className="text-[10px] bg-surface border border-border px-2 py-0.5 rounded-full text-muted">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODULES / HOW IT WORKS ─────────────────────────────── */}
      <section id="modules" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-accent text-xs font-semibold uppercase tracking-widest">Platform Modules</span>
            <h2 className="text-4xl font-bold mt-2 mb-4">One platform. Ten modules.</h2>
            <p className="text-muted max-w-xl mx-auto">Each module is purpose-built for industrial operations and accessible from a single, role-based interface.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MODULES.map(({ icon: Icon, name, desc, badge, badgeColor }) => (
              <div key={name} className="flex items-start gap-4 bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center flex-shrink-0">
                  <Icon size={17} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{name}</span>
                    <span className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
                  </div>
                  <p className="text-muted text-xs leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECH STACK STRIP ───────────────────────────────────── */}
      <section className="py-14 px-6 border-y border-border/40 bg-surface/20">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-muted text-xs uppercase tracking-widest mb-8 font-medium">Built on battle-tested open-source</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['MongoDB Atlas', 'Express.js', 'React 18', 'Node.js', 'Socket.io', 'Redis', 'Tailwind CSS', 'Recharts', 'Vite', 'JWT / OAuth 2.0', 'Passport.js', 'Mongoose'].map(t => (
              <span key={t} className="bg-card border border-border text-muted text-[11px] font-medium px-3 py-1.5 rounded-lg hover:border-primary/30 hover:text-text transition-colors">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── RBAC / ROLES ───────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-warning text-xs font-semibold uppercase tracking-widest">Role-Based Access Control</span>
              <h2 className="text-3xl font-bold mt-2 mb-4">The right data for the right person</h2>
              <p className="text-muted leading-relaxed mb-6">
                Four distinct access levels ensure operators see live telemetry, analysts drill into efficiency data, managers oversee plant-wide KPIs, and admins control the full platform — all from a single login.
              </p>
              <div className="space-y-3">
                {[
                  { role: 'System Admin',   color: 'bg-accent/15 text-accent',   can: 'Full platform access, user management, all sites' },
                  { role: 'Plant Manager',  color: 'bg-primary/15 text-primary', can: 'KPIs, maintenance, alerts, device config' },
                  { role: 'Energy Analyst', color: 'bg-warning/15 text-warning', can: 'Analytics, Digital Twin, AI insights, reports' },
                  { role: 'Viewer',         color: 'bg-muted/15 text-muted',     can: 'Read-only dashboard access' },
                ].map(({ role, color, can }) => (
                  <div key={role} className="flex items-start gap-3 bg-card border border-border rounded-xl px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${color}`}>{role}</span>
                    <span className="text-muted text-xs mt-0.5">{can}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Globe size={14} className="text-success" />
                  <span className="text-xs font-medium text-success">Connected · 8 devices live</span>
                </div>
                <div className="space-y-2.5">
                  {[
                    { name: 'Turbine A',      pwr: '11.8 kW',  health: 97, color: 'bg-success' },
                    { name: 'Ball Mill 1',    pwr: '1.2 kW',   health: 88, color: 'bg-primary' },
                    { name: 'Cogen Boiler',   pwr: '792 kW',   health: 91, color: 'bg-warning' },
                    { name: 'Compressor C1',  pwr: '449 kW',   health: 83, color: 'bg-accent'  },
                  ].map(({ name, pwr, health, color }) => (
                    <div key={name} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${color} shrink-0`} />
                      <span className="text-xs text-text flex-1">{name}</span>
                      <span className="text-[11px] text-muted w-16 text-right">{pwr}</span>
                      <div className="w-20 h-1.5 bg-surface rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${health}%` }} />
                      </div>
                      <span className="text-[11px] text-muted w-8 text-right">{health}%</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-[11px] text-muted">
                  <span>Plant load: 14.2 MW</span>
                  <span className="text-success">Avg health 89.8%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card border border-border rounded-xl p-4">
                  <AlertTriangle size={13} className="text-warning mb-2" />
                  <div className="text-warning font-bold text-lg">3</div>
                  <div className="text-muted text-[11px]">Active alerts</div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <Leaf size={13} className="text-success mb-2" />
                  <div className="text-success font-bold text-lg">12.4t</div>
                  <div className="text-muted text-[11px]">CO₂ today</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI INSIGHTS CALLOUT ────────────────────────────────── */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary/5 via-bg to-accent/5 border-y border-border/40">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-12 h-12 bg-primary/15 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Brain size={22} className="text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-4">AI Insight Engine</h2>
          <p className="text-muted max-w-xl mx-auto mb-10 leading-relaxed">
            Five rule-based industrial intelligence rules run on every telemetry tick, surfacing savings opportunities and anomalies before they become failures.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
            {[
              { title: 'VFD Speed Optimization',    type: 'optimization', saving: '₹9,360/day',  body: 'Detects high-load inefficiency and recommends VFD frequency reductions of 5–8%.' },
              { title: 'Soot Blowing Alert',         type: 'maintenance',  saving: '₹8,500/day',  body: 'Triggers when boiler efficiency drops below 88% — fouling on heat transfer surfaces.' },
              { title: 'Bearing Wear Detection',     type: 'predictive',   saving: '₹15,000/day', body: 'Flags vibration above ISO 10816 limits. Bearing fatigue likely in 7–14 days.' },
              { title: 'Steam Overconsumption',      type: 'energy',       saving: '₹6,200/day',  body: 'Alerts when specific steam consumption exceeds 380 kg/ton target.' },
              { title: 'Power Factor Penalty Risk',  type: 'optimization', saving: '₹3,200/day',  body: 'Warns before utility penalty at PF < 0.85. Prompts capacitor bank check.' },
            ].map(({ title, type, saving, body }) => (
              <div key={title} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                    type === 'predictive'   ? 'bg-danger/15 text-danger'   :
                    type === 'maintenance'  ? 'bg-warning/15 text-warning' :
                    type === 'energy'       ? 'bg-success/15 text-success' :
                    'bg-primary/15 text-primary'
                  }`}>{type}</span>
                  <span className="text-success text-xs font-semibold">{saving}</span>
                </div>
                <h4 className="font-semibold text-sm mb-1">{title}</h4>
                <p className="text-muted text-[11px] leading-relaxed">{body}</p>
              </div>
            ))}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <TrendingUp size={20} className="text-primary mb-2" />
              <div className="text-primary font-bold text-lg">₹42,260</div>
              <div className="text-muted text-[11px]">max daily savings<br />across all 5 rules</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LOGIN / CTA ────────────────────────────────────────── */}
      <section id="login" className="py-24 px-6">
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Start exploring</h2>
            <p className="text-muted text-sm">No setup required. Dev login gives instant access with demo data already streaming.</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-7 shadow-2xl">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-7">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                <Zap size={17} className="text-white" />
              </div>
              <div>
                <div className="text-text font-bold leading-none">CloudFi</div>
                <div className="text-muted text-[10px] mt-0.5">Industrial Intelligence Platform</div>
              </div>
            </div>

            {/* Google */}
            <button
              onClick={() => loginWithGoogle()}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-800 rounded-xl font-medium text-sm hover:bg-gray-100 active:scale-[0.98] transition-all shadow-lg mb-2"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {!googleConfigured && (
              <p className="text-[10px] text-center text-warning/80 mb-3">
                Google OAuth not configured — use Dev Login below
              </p>
            )}

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-muted text-[10px] uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Dev login */}
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
                <p className="text-[10px] text-muted text-center mb-2">Instant access — no credentials needed</p>
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
                      {loading === p.role ? '…' : 'Enter →'}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5 flex items-center gap-2 text-[10px] text-muted justify-center">
              <Lock size={10} />
              JWT-authenticated · RBAC-enforced · TLS in transit
            </div>
          </div>

          {/* Checklist */}
          <div className="mt-6 space-y-2">
            {[
              'Real-time sensor data every 2 seconds',
              '8 demo industrial assets pre-seeded',
              'AI insights and savings estimates live',
              'No account or credit card required',
            ].map(t => (
              <div key={t} className="flex items-center gap-2 text-xs text-muted">
                <CheckCircle2 size={13} className="text-success shrink-0" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer className="border-t border-border/40 py-10 px-6 bg-surface/20">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <span className="font-semibold text-sm">CloudFi</span>
            <span className="text-muted text-xs">Industrial Intelligence Platform</span>
          </div>
          <div className="text-muted text-[11px] text-center">
            Built with MongoDB · Express · React · Node.js · Socket.io
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span>🇮🇳</span>
            Built with love in India by{' '}
            <a href="https://www.timestampindia.com" target="_blank" rel="noopener noreferrer"
              className="text-primary hover:text-primary-light font-medium transition-colors">
              Timestamp India
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

const FEATURES = [
  {
    icon: Activity,
    color: 'bg-primary',
    title: 'Real-Time IoT Streaming',
    body: 'Live telemetry from turbines, boilers, compressors and pumps pushed to every connected browser via Socket.io — 2-second tick, no polling.',
    tags: ['Socket.io', 'WebSocket', 'MongoDB Time-Series'],
  },
  {
    icon: Brain,
    color: 'bg-accent',
    title: 'AI Insight Engine',
    body: 'Five industrial intelligence rules detect VFD inefficiency, soot fouling, bearing wear, steam overconsumption, and power-factor drift — with rupee-denominated savings estimates.',
    tags: ['Rule Engine', 'Predictive', '₹ Savings'],
  },
  {
    icon: GitBranch,
    color: 'bg-blue-600',
    title: 'Digital Twin Scoring',
    body: '8-axis radar chart maps live asset readings against an ideal twin across Efficiency, Health, Stability, Energy, Output, Safety, Sustainability, and Maintenance.',
    tags: ['Radar Chart', '8 KPIs', 'Recharts'],
  },
  {
    icon: AlertTriangle,
    color: 'bg-warning',
    title: 'Predictive Maintenance',
    body: 'Anomaly detection on vibration and temperature with 5-minute cooldown alerts, severity classification, and one-click acknowledge/resolve workflow.',
    tags: ['Vibration', 'Temperature', 'ISO 10816'],
  },
  {
    icon: Leaf,
    color: 'bg-success',
    title: 'ESG & Carbon Tracking',
    body: 'Scope 1, 2 and 3 emission breakdown by site. Monthly trend charts, intensity metrics, renewable targets, and energy intensity scoring.',
    tags: ['Scope 1/2/3', 'GHG Protocol', 'ESG KPIs'],
  },
  {
    icon: LayoutDashboard,
    color: 'bg-pink-600',
    title: 'Drag-and-Drop Dashboard',
    body: 'Ten modular widgets (Power, Steam, Health, AI Anomaly, Energy, Cogen, Boiler, Live Feed, Carbon, Predictive) on a resizable grid that saves layout to localStorage.',
    tags: ['react-grid-layout', '10 widgets', 'Responsive'],
  },
  {
    icon: Settings,
    color: 'bg-orange-600',
    title: 'Device & Gateway Config',
    body: '4-step device wizard: asset type → protocol/Modbus config → register map → AI optimal targets. Full CRUD for gateways with protocol and heartbeat settings.',
    tags: ['Modbus', 'Register Map', 'CRUD'],
  },
  {
    icon: BarChart3,
    color: 'bg-cyan-600',
    title: 'Multi-Period Analytics',
    body: 'Site-level power, efficiency, steam and energy charts with 24h / 7-day / 30-day time windows. MongoDB aggregation pipeline with $dateTrunc.',
    tags: ['24h / 7d / 30d', 'Aggregation', 'Recharts'],
  },
  {
    icon: Shield,
    color: 'bg-indigo-600',
    title: 'RBAC & Google OAuth',
    body: 'Four roles (System Admin, Plant Manager, Energy Analyst, Viewer) enforced at both API and UI layers. Google OAuth 2.0 via Passport.js with JWT session tokens.',
    tags: ['JWT', 'OAuth 2.0', '4 Roles'],
  },
];

const MODULES = [
  { icon: LayoutDashboard, name: 'Live Dashboard',    desc: 'Plant-wide KPIs, real-time widget grid with drag-and-drop layout persistence.',                          badge: 'live',      badgeColor: 'bg-success/15 text-success'  },
  { icon: Activity,        name: 'Analytics',          desc: 'Multi-period trend charts for power, efficiency, steam consumption and total energy by site.',           badge: 'charts',    badgeColor: 'bg-primary/15 text-primary'  },
  { icon: GitBranch,       name: 'Digital Twin',       desc: '8-axis radar scoring against an optimal twin. Device selector with live readings panel.',                badge: 'AI',        badgeColor: 'bg-accent/15 text-accent'    },
  { icon: AlertTriangle,   name: 'Maintenance',        desc: 'Unacknowledged alert queue with severity, parameter, recommendation and estimated wastage.',             badge: 'predictive',badgeColor: 'bg-warning/15 text-warning'  },
  { icon: Cpu,             name: 'Devices',            desc: '4-step device wizard with Modbus register mapping, scaleFactor, unit and AI target thresholds.',         badge: 'config',    badgeColor: 'bg-blue-600/15 text-blue-400'},
  { icon: Gauge,           name: 'Gateways',           desc: 'Gateway management with IP, port, protocol (Modbus TCP/RTU/DNP3/MQTT/OPC-UA) and heartbeat interval.',  badge: 'network',   badgeColor: 'bg-cyan-600/15 text-cyan-400'},
  { icon: Leaf,            name: 'ESG / Carbon',       desc: 'Scope 1/2/3 pie breakdown, monthly bar chart, energy intensity, renewable ratio and waste reduction.',  badge: 'ESG',       badgeColor: 'bg-success/15 text-success'  },
  { icon: BarChart3,       name: 'Reports',            desc: 'Manual telemetry entry, preview table, bulk upload, and CSV export for offline analysis.',               badge: 'export',    badgeColor: 'bg-orange-600/15 text-orange-400'},
  { icon: Users,           name: 'User Management',    desc: 'Admin-only user table with inline role, site-access and active-status editing. Soft delete.',            badge: 'admin',     badgeColor: 'bg-danger/15 text-danger'    },
  { icon: Brain,           name: 'AI Insights',        desc: 'Five rule-based insights surface VFD, boiler, bearing, steam and power-factor savings on each API call.',badge: 'AI',        badgeColor: 'bg-accent/15 text-accent'    },
];
