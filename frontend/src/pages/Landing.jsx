import { useEffect, useRef, useState, useCallback } from 'react';
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

/* ─── 3D IoT Mesh Globe ─────────────────────────────────────────────────── */
function IotGlobe() {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = canvas.offsetWidth  * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    // Fibonacci sphere — evenly spread nodes
    const N = 120;
    const nodes = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y   = 1 - (i / (N - 1)) * 2;
      const r   = Math.sqrt(1 - y * y);
      const phi = golden * i;
      nodes.push({
        ox: Math.cos(phi) * r,
        oy: y,
        oz: Math.sin(phi) * r,
        pulse: Math.random() * Math.PI * 2,
        size: 1.2 + Math.random() * 1.8,
        bright: Math.random() > 0.85,
      });
    }

    // Pre-compute edges (connect pairs within distance threshold on sphere)
    const EDGE_THRESH = 0.55;
    const edges = [];
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = nodes[i].ox - nodes[j].ox;
        const dy = nodes[i].oy - nodes[j].oy;
        const dz = nodes[i].oz - nodes[j].oz;
        if (Math.sqrt(dx*dx + dy*dy + dz*dz) < EDGE_THRESH) edges.push([i, j]);
      }
    }

    let rotX = 0.3, rotY = 0;
    let velX = 0, velY = 0.003;

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
      mouse.current.y = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
    };
    canvas.addEventListener('mousemove', onMouseMove);

    const project = (x, y, z, W, H) => {
      const fov = 2.4;
      const scale = fov / (fov + z);
      return { x: W / 2 + x * scale * Math.min(W, H) * 0.38, y: H / 2 + y * scale * Math.min(W, H) * 0.38, scale };
    };

    const rotateXY = (x, y, z, rx, ry) => {
      // rotate around Y
      const x1 = x * Math.cos(ry) + z * Math.sin(ry);
      const z1 = -x * Math.sin(ry) + z * Math.cos(ry);
      // rotate around X
      const y2 = y * Math.cos(rx) - z1 * Math.sin(rx);
      const z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
      return { x: x1, y: y2, z: z2 };
    };

    let t = 0;
    const draw = () => {
      t += 0.012;
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);

      // drift toward mouse influence
      velY += (mouse.current.x * 0.0015 - velY) * 0.04;
      velX += (mouse.current.y * 0.001  - velX) * 0.04;
      velY = Math.max(-0.012, Math.min(0.012, velY));
      rotY += velY;
      rotX += velX;

      // transform all nodes
      const pts = nodes.map(n => {
        const r = rotateXY(n.ox, n.oy, n.oz, rotX, rotY);
        const p = project(r.x, r.y, r.z, W, H);
        return { ...p, z: r.z, pulse: n.pulse, size: n.size, bright: n.bright };
      });

      // draw edges (back-to-front: low alpha for back)
      for (const [i, j] of edges) {
        const a = pts[i], b = pts[j];
        const avgZ = (a.z + b.z) / 2;
        if (avgZ < -0.5) continue;
        const alpha = ((avgZ + 1) / 2) * 0.18 + 0.02;
        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        grad.addColorStop(0, `rgba(124,58,237,${alpha})`);
        grad.addColorStop(0.5, `rgba(236,72,153,${alpha * 1.4})`);
        grad.addColorStop(1, `rgba(124,58,237,${alpha})`);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.6 * a.scale;
        ctx.stroke();
      }

      // draw nodes
      for (const p of pts) {
        if (p.z < -0.7) continue;
        const alpha = ((p.z + 1) / 2) * 0.9 + 0.1;
        const pulse = (Math.sin(t * 2 + p.pulse) + 1) / 2;
        const r = p.size * p.scale * (p.bright ? 1 + pulse * 0.8 : 1);

        if (p.bright) {
          // glow halo
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5);
          glow.addColorStop(0, `rgba(236,72,153,${alpha * 0.4})`);
          glow.addColorStop(1, 'rgba(236,72,153,0)');
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 5, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();
        }

        const grad = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, 0, p.x, p.y, r);
        grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
        grad.addColorStop(0.4, `rgba(167,92,245,${alpha * 0.9})`);
        grad.addColorStop(1, `rgba(124,58,237,${alpha * 0.3})`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // draw equator ring hint
      const ringPts = 80;
      ctx.beginPath();
      for (let i = 0; i <= ringPts; i++) {
        const angle = (i / ringPts) * Math.PI * 2;
        const rx = Math.cos(angle), rz = Math.sin(angle);
        const r2 = rotateXY(rx, 0, rz, rotX, rotY);
        const p = project(r2.x, r2.y, r2.z, W, H);
        const a = ((r2.z + 1) / 2) * 0.08;
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = 'rgba(124,58,237,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ cursor: 'crosshair' }}
    />
  );
}

/* ─── Tilt card wrapper ─────────────────────────────────────────────────── */
function TiltCard({ children, className = '' }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left) / width  - 0.5;
    const y = (e.clientY - top)  / height - 0.5;
    el.style.transform = `perspective(700px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) scale3d(1.03,1.03,1.03)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = 'perspective(700px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)';
  };
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      className={className}
      style={{ transition: 'transform 0.15s ease', willChange: 'transform' }}>
      {children}
    </div>
  );
}

/* ─── Parallax hero layer ───────────────────────────────────────────────── */
function useMouseParallax() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e) => setPos({
      x: (e.clientX / window.innerWidth  - 0.5) * 2,
      y: (e.clientY / window.innerHeight - 0.5) * 2,
    });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);
  return pos;
}

/* ─── Animated counter ──────────────────────────────────────────────────── */
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
          if (p < 1) requestAnimationFrame(tick); else setVal(target);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.4 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ─── Main Landing ──────────────────────────────────────────────────────── */
export default function Landing() {
  const { user, loginWithGoogle, devLogin, googleConfigured } = useAuth();
  const navigate = useNavigate();
  const [showDev, setShowDev] = useState(false);
  const [loading, setLoading] = useState(null);
  const mouse = useMouseParallax();

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

      {/* ── NAV ─────────────────────────────────────────────────── */}
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
            Login <ArrowRight size={14} />
          </a>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
        {/* deep background grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(124,58,237,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,0.05) 1px,transparent 1px)', backgroundSize: '60px 60px',
            transform: `translate(${mouse.x * -8}px, ${mouse.y * -8}px)`, transition: 'transform 0.1s linear' }} />

        {/* ambient blobs — parallax layers */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px]"
            style={{ transform: `translate(${mouse.x * -20}px,${mouse.y * -20}px)`, transition: 'transform 0.2s ease' }} />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/8 rounded-full blur-[120px]"
            style={{ transform: `translate(${mouse.x * 15}px,${mouse.y * 15}px)`, transition: 'transform 0.25s ease' }} />
          <div className="absolute top-1/2 right-1/3 w-[200px] h-[200px] bg-blue-500/6 rounded-full blur-[80px]"
            style={{ transform: `translate(${mouse.x * 30}px,${mouse.y * 30}px)`, transition: 'transform 0.3s ease' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 w-full grid lg:grid-cols-2 gap-8 lg:gap-12 items-center py-12 lg:py-20">

          {/* LEFT — text */}
          <div style={{ transform: `translate(${mouse.x * -6}px,${mouse.y * -6}px)`, transition: 'transform 0.15s ease' }}>
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-medium px-4 py-2 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              Live · Real-time industrial data streaming
            </div>

            <h1 className="text-4xl sm:text-5xl xl:text-7xl font-extrabold tracking-tight leading-none mb-6">
              Industrial
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-blue-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradientShift_4s_ease_infinite]">
                Intelligence
              </span>
              <br />
              at Cloud Scale
            </h1>

            <p className="text-lg text-muted max-w-lg mb-8 leading-relaxed">
              CloudFi transforms raw IoT sensor data into actionable intelligence — real-time monitoring, AI-driven predictive maintenance, Digital Twin simulation, and ESG carbon tracking for heavy industry.
            </p>

            <div className="flex flex-wrap gap-4 mb-10">
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

            {/* live stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Wifi,      label: 'Live tick',     value: '2s',  color: 'text-success' },
                { icon: Cpu,       label: 'Asset types',   value: '13+', color: 'text-primary' },
                { icon: Brain,     label: 'AI rules',      value: '5',   color: 'text-accent'  },
                { icon: BarChart3, label: 'Widgets',       value: '10',  color: 'text-warning' },
              ].map(({ icon: Icon, label, value, color }) => (
                <TiltCard key={label} className="bg-card/80 border border-border rounded-xl px-3 py-2.5 backdrop-blur">
                  <Icon size={13} className={`${color} mb-1`} />
                  <div className={`text-base font-bold ${color}`}>{value}</div>
                  <div className="text-[10px] text-muted">{label}</div>
                </TiltCard>
              ))}
            </div>
          </div>

          {/* RIGHT — 3D Globe */}
          <div
            className="relative h-[320px] sm:h-[400px] lg:h-[540px] order-first lg:order-last"
            style={{ transform: `translate(${mouse.x * 10}px,${mouse.y * 10}px)`, transition: 'transform 0.2s ease' }}
          >
            {/* outer glow ring */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[340px] h-[340px] lg:w-[440px] lg:h-[440px] rounded-full border border-primary/10 animate-[spin_30s_linear_infinite]"
                style={{ boxShadow: '0 0 80px 2px rgba(124,58,237,0.08) inset' }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[280px] h-[280px] lg:w-[360px] lg:h-[360px] rounded-full border border-accent/8 animate-[spin_20s_linear_infinite_reverse]" />
            </div>

            {/* Canvas globe */}
            <div className="absolute inset-0">
              <IotGlobe />
            </div>

            {/* floating HUD cards */}
            <TiltCard className="absolute top-6 right-4 lg:right-0 bg-card/90 backdrop-blur border border-border rounded-xl px-3 py-2.5 shadow-xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                <span className="text-[10px] text-success font-medium">Live Feed</span>
              </div>
              <div className="text-text text-xs font-semibold">Turbine A</div>
              <div className="text-muted text-[10px]">11.8 kW · 97% health</div>
            </TiltCard>

            <TiltCard className="absolute bottom-16 left-0 lg:-left-4 bg-card/90 backdrop-blur border border-border rounded-xl px-3 py-2.5 shadow-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <Brain size={11} className="text-accent" />
                <span className="text-[10px] text-accent font-medium">AI Insight</span>
              </div>
              <div className="text-text text-xs font-semibold">Bearing Wear</div>
              <div className="text-success text-[10px]">₹15,000/day saved</div>
            </TiltCard>

            <TiltCard className="absolute top-1/2 -right-2 lg:-right-6 -translate-y-1/2 bg-card/90 backdrop-blur border border-border rounded-xl px-3 py-2.5 shadow-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <Leaf size={11} className="text-success" />
                <span className="text-[10px] text-success font-medium">ESG</span>
              </div>
              <div className="text-text text-xs font-semibold">12.4 t CO₂</div>
              <div className="text-muted text-[10px]">today · Scope 1</div>
            </TiltCard>

            <TiltCard className="absolute bottom-6 right-6 bg-card/90 backdrop-blur border border-border rounded-xl px-3 py-2.5 shadow-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle size={11} className="text-warning" />
                <span className="text-[10px] text-warning font-medium">Alert</span>
              </div>
              <div className="text-text text-xs font-semibold">High Vibration</div>
              <div className="text-muted text-[10px]">Compressor C1</div>
            </TiltCard>
          </div>
        </div>

        {/* scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-muted text-[10px] uppercase tracking-widest">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-primary/60 to-transparent" />
        </div>
      </section>

      {/* ── METRICS ─────────────────────────────────────────────── */}
      <section id="metrics" className="py-20 px-6 border-t border-border/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Platform at a Glance</h2>
            <p className="text-muted">Industrial-grade data processing, purpose-built for energy-intensive operations</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { target: 95,    suffix: '%',  label: 'Uptime SLA',          sub: 'resilient architecture'  },
              { target: 2,     suffix: 's',  label: 'Telemetry latency',   sub: 'socket.io streaming'     },
              { target: 8,     suffix: '',   label: 'Demo devices seeded', sub: 'on first boot'           },
              { target: 15000, suffix: '₹', label: 'Daily savings/device', sub: 'via bearing alert'       },
            ].map(({ target, suffix, label, sub }) => (
              <TiltCard key={label} className="bg-card border border-border rounded-2xl p-6 text-center hover:border-primary/30 transition-colors">
                <div className="text-4xl font-extrabold text-primary mb-1">
                  <Counter target={target} suffix={suffix} />
                </div>
                <div className="text-text font-semibold text-sm mb-0.5">{label}</div>
                <div className="text-muted text-[11px]">{sub}</div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-surface/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-primary text-xs font-semibold uppercase tracking-widest">Core Capabilities</span>
            <h2 className="text-4xl font-bold mt-2 mb-4">Everything you need to run a smarter plant</h2>
            <p className="text-muted max-w-xl mx-auto">From live sensor ingestion to AI-generated savings recommendations — one platform, end to end.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, color, title, body, tags }) => (
              <TiltCard key={title}
                className="group bg-card border border-border rounded-2xl p-6 hover:border-primary/40 transition-all duration-300 cursor-default">
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
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODULES ─────────────────────────────────────────────── */}
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

      {/* ── TECH STACK ──────────────────────────────────────────── */}
      <section className="py-14 px-6 border-y border-border/40 bg-surface/20">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-muted text-xs uppercase tracking-widest mb-8 font-medium">Built on battle-tested open-source</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['MongoDB Atlas','Express.js','React 18','Node.js','Socket.io','Redis','Tailwind CSS','Recharts','Vite','JWT / OAuth 2.0','Passport.js','Mongoose'].map(t => (
              <span key={t} className="bg-card border border-border text-muted text-[11px] font-medium px-3 py-1.5 rounded-lg hover:border-primary/30 hover:text-text transition-colors">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── RBAC ────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-warning text-xs font-semibold uppercase tracking-widest">Role-Based Access Control</span>
              <h2 className="text-3xl font-bold mt-2 mb-4">The right data for the right person</h2>
              <p className="text-muted leading-relaxed mb-6">Four distinct access levels ensure operators see live telemetry, analysts drill into efficiency data, managers oversee plant-wide KPIs, and admins control the full platform — all from a single login.</p>
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
              <TiltCard className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Globe size={14} className="text-success" />
                  <span className="text-xs font-medium text-success">Connected · 8 devices live</span>
                </div>
                <div className="space-y-2.5">
                  {[
                    { name: 'Turbine A',     pwr: '11.8 kW', health: 97, color: 'bg-success' },
                    { name: 'Ball Mill 1',   pwr: '1.2 kW',  health: 88, color: 'bg-primary' },
                    { name: 'Cogen Boiler',  pwr: '792 kW',  health: 91, color: 'bg-warning' },
                    { name: 'Compressor C1', pwr: '449 kW',  health: 83, color: 'bg-accent'  },
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
              </TiltCard>
              <div className="grid grid-cols-2 gap-3">
                <TiltCard className="bg-card border border-border rounded-xl p-4">
                  <AlertTriangle size={13} className="text-warning mb-2" />
                  <div className="text-warning font-bold text-lg">3</div>
                  <div className="text-muted text-[11px]">Active alerts</div>
                </TiltCard>
                <TiltCard className="bg-card border border-border rounded-xl p-4">
                  <Leaf size={13} className="text-success mb-2" />
                  <div className="text-success font-bold text-lg">12.4t</div>
                  <div className="text-muted text-[11px]">CO₂ today</div>
                </TiltCard>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI INSIGHTS ─────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary/5 via-bg to-accent/5 border-y border-border/40">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-12 h-12 bg-primary/15 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Brain size={22} className="text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-4">AI Insight Engine</h2>
          <p className="text-muted max-w-xl mx-auto mb-10 leading-relaxed">Five rule-based industrial intelligence rules run on every telemetry tick, surfacing savings opportunities and anomalies before they become failures.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
            {[
              { title: 'VFD Speed Optimization',   type: 'optimization', saving: '₹9,360/day',  body: 'Detects high-load inefficiency and recommends VFD frequency reductions of 5–8%.' },
              { title: 'Soot Blowing Alert',        type: 'maintenance',  saving: '₹8,500/day',  body: 'Triggers when boiler efficiency drops below 88% — fouling on heat transfer surfaces.' },
              { title: 'Bearing Wear Detection',    type: 'predictive',   saving: '₹15,000/day', body: 'Flags vibration above ISO 10816 limits. Bearing fatigue likely in 7–14 days.' },
              { title: 'Steam Overconsumption',     type: 'energy',       saving: '₹6,200/day',  body: 'Alerts when specific steam consumption exceeds 380 kg/ton target.' },
              { title: 'Power Factor Penalty Risk', type: 'optimization', saving: '₹3,200/day',  body: 'Warns before utility penalty at PF < 0.85. Prompts capacitor bank check.' },
            ].map(({ title, type, saving, body }) => (
              <TiltCard key={title} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                    type === 'predictive'  ? 'bg-danger/15 text-danger'   :
                    type === 'maintenance' ? 'bg-warning/15 text-warning' :
                    type === 'energy'      ? 'bg-success/15 text-success' :
                    'bg-primary/15 text-primary'}`}>{type}</span>
                  <span className="text-success text-xs font-semibold">{saving}</span>
                </div>
                <h4 className="font-semibold text-sm mb-1">{title}</h4>
                <p className="text-muted text-[11px] leading-relaxed">{body}</p>
              </TiltCard>
            ))}
            <TiltCard className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <TrendingUp size={20} className="text-primary mb-2" />
              <div className="text-primary font-bold text-lg">₹42,260</div>
              <div className="text-muted text-[11px]">max daily savings<br />across all 5 rules</div>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* ── LOGIN ───────────────────────────────────────────────── */}
      <section id="login" className="py-24 px-6">
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Start exploring</h2>
            <p className="text-muted text-sm">No setup required. Dev login gives instant access with demo data already streaming.</p>
          </div>
          <TiltCard className="bg-card border border-border rounded-2xl p-7 shadow-2xl">
            <div className="flex items-center gap-3 mb-7">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                <Zap size={17} className="text-white" />
              </div>
              <div>
                <div className="text-text font-bold leading-none">CloudFi</div>
                <div className="text-muted text-[10px] mt-0.5">Industrial Intelligence Platform</div>
              </div>
            </div>

            <button onClick={() => loginWithGoogle()}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-800 rounded-xl font-medium text-sm hover:bg-gray-100 active:scale-[0.98] transition-all shadow-lg mb-2">
              <GoogleIcon />Continue with Google
            </button>
            {!googleConfigured && (
              <p className="text-[10px] text-center text-warning/80 mb-3">Google OAuth not configured — use Dev Login below</p>
            )}

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-muted text-[10px] uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button onClick={() => setShowDev(v => !v)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-muted hover:text-text hover:border-primary/50 transition-all font-medium">
              <FlaskConical size={14} className="text-primary" />
              Dev / Demo Login
              {showDev ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showDev && (
              <div className="mt-3 space-y-1.5 animate-fade-in">
                <p className="text-[10px] text-muted text-center mb-2">Instant access — no credentials needed</p>
                {DEV_PRESETS.map(p => (
                  <button key={p.role} onClick={() => handleDevLogin(p)} disabled={!!loading}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-surface border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all disabled:opacity-50 group">
                    <div className="text-left">
                      <div className="text-text text-sm font-medium group-hover:text-primary transition-colors">{p.label}</div>
                      <div className="text-muted text-[10px]">{p.email}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      p.role === 'system_admin'   ? 'bg-accent/15 text-accent'   :
                      p.role === 'supervisor'     ? 'bg-primary/15 text-primary' :
                      p.role === 'energy_analyst' ? 'bg-warning/15 text-warning' :
                      'bg-muted/15 text-muted'}`}>
                      {loading === p.role ? '…' : 'Enter →'}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5 flex items-center gap-2 text-[10px] text-muted justify-center">
              <Lock size={10} />JWT-authenticated · RBAC-enforced · TLS in transit
            </div>
          </TiltCard>

          <div className="mt-6 space-y-2">
            {['Real-time sensor data every 2 seconds','8 demo industrial assets pre-seeded','AI insights and savings estimates live','No account or credit card required'].map(t => (
              <div key={t} className="flex items-center gap-2 text-xs text-muted">
                <CheckCircle2 size={13} className="text-success shrink-0" />{t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
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
  { icon: Activity,      color: 'bg-primary',    title: 'Real-Time IoT Streaming',    body: 'Live telemetry from turbines, boilers, compressors and pumps pushed to every connected browser via Socket.io — 2-second tick, no polling.', tags: ['Socket.io','WebSocket','MongoDB Time-Series'] },
  { icon: Brain,         color: 'bg-accent',     title: 'AI Insight Engine',           body: 'Five industrial intelligence rules detect VFD inefficiency, soot fouling, bearing wear, steam overconsumption, and power-factor drift — with rupee-denominated savings estimates.', tags: ['Rule Engine','Predictive','₹ Savings'] },
  { icon: GitBranch,     color: 'bg-blue-600',   title: 'Digital Twin Scoring',        body: '8-axis radar chart maps live asset readings against an ideal twin across Efficiency, Health, Stability, Energy, Output, Safety, Sustainability, and Maintenance.', tags: ['Radar Chart','8 KPIs','Recharts'] },
  { icon: AlertTriangle, color: 'bg-warning',    title: 'Predictive Maintenance',      body: 'Anomaly detection on vibration and temperature with 5-minute cooldown alerts, severity classification, and one-click acknowledge/resolve workflow.', tags: ['Vibration','Temperature','ISO 10816'] },
  { icon: Leaf,          color: 'bg-success',    title: 'ESG & Carbon Tracking',       body: 'Scope 1, 2 and 3 emission breakdown by site. Monthly trend charts, intensity metrics, renewable targets, and energy intensity scoring.', tags: ['Scope 1/2/3','GHG Protocol','ESG KPIs'] },
  { icon: LayoutDashboard,color:'bg-pink-600',   title: 'Drag-and-Drop Dashboard',     body: 'Ten modular widgets on a resizable grid that saves layout to localStorage. Add, remove, resize and rearrange in real time.', tags: ['react-grid-layout','10 widgets','Responsive'] },
  { icon: Settings,      color: 'bg-orange-600', title: 'Device & Gateway Config',     body: '4-step device wizard: asset type → protocol/Modbus config → register map → AI optimal targets. Full CRUD for gateways.', tags: ['Modbus','Register Map','CRUD'] },
  { icon: BarChart3,     color: 'bg-cyan-600',   title: 'Multi-Period Analytics',      body: 'Site-level power, efficiency, steam and energy charts with 24h / 7-day / 30-day time windows. MongoDB aggregation pipeline.', tags: ['24h / 7d / 30d','Aggregation','Recharts'] },
  { icon: Shield,        color: 'bg-indigo-600', title: 'RBAC & Google OAuth',         body: 'Four roles enforced at both API and UI layers. Google OAuth 2.0 via Passport.js with JWT session tokens and dev login for demos.', tags: ['JWT','OAuth 2.0','4 Roles'] },
];

const MODULES = [
  { icon: LayoutDashboard, name: 'Live Dashboard',   desc: 'Plant-wide KPIs, real-time widget grid with drag-and-drop layout persistence.',                          badge: 'live',       badgeColor: 'bg-success/15 text-success'       },
  { icon: Activity,        name: 'Analytics',         desc: 'Multi-period trend charts for power, efficiency, steam consumption and total energy by site.',           badge: 'charts',     badgeColor: 'bg-primary/15 text-primary'       },
  { icon: GitBranch,       name: 'Digital Twin',      desc: '8-axis radar scoring against an optimal twin. Device selector with live readings panel.',                badge: 'AI',         badgeColor: 'bg-accent/15 text-accent'         },
  { icon: AlertTriangle,   name: 'Maintenance',       desc: 'Unacknowledged alert queue with severity, parameter, recommendation and estimated wastage.',             badge: 'predictive', badgeColor: 'bg-warning/15 text-warning'       },
  { icon: Cpu,             name: 'Devices',           desc: '4-step device wizard with Modbus register mapping, scaleFactor, unit and AI target thresholds.',         badge: 'config',     badgeColor: 'bg-blue-600/15 text-blue-400'     },
  { icon: Gauge,           name: 'Gateways',          desc: 'Gateway management with IP, port, protocol (Modbus TCP/RTU/DNP3/MQTT/OPC-UA) and heartbeat interval.',  badge: 'network',    badgeColor: 'bg-cyan-600/15 text-cyan-400'     },
  { icon: Leaf,            name: 'ESG / Carbon',      desc: 'Scope 1/2/3 pie breakdown, monthly bar chart, energy intensity, renewable ratio and waste reduction.',  badge: 'ESG',        badgeColor: 'bg-success/15 text-success'       },
  { icon: BarChart3,       name: 'Reports',           desc: 'Manual telemetry entry, preview table, bulk upload, and CSV export for offline analysis.',               badge: 'export',     badgeColor: 'bg-orange-600/15 text-orange-400' },
  { icon: Users,           name: 'User Management',   desc: 'Admin-only user table with inline role, site-access and active-status editing. Soft delete.',            badge: 'admin',      badgeColor: 'bg-danger/15 text-danger'         },
  { icon: Brain,           name: 'AI Insights',       desc: 'Five rule-based insights surface VFD, boiler, bearing, steam and power-factor savings on each API call.',badge: 'AI',         badgeColor: 'bg-accent/15 text-accent'         },
];
