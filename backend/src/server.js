require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const passport = require('passport');
const connectDB = require('./config/db');
const { generateInsights, getDigitalTwinScore } = require('./services/aiInsightService');
const { cacheGet } = require('./config/redis');
const { startSimulator } = require('./services/dataSimulator');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true },
});

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(passport.initialize());

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/gateways',  require('./routes/gateways'));
app.use('/api/devices',   require('./routes/devices'));
app.use('/api/telemetry', require('./routes/telemetry'));
app.use('/api/alerts',    require('./routes/alerts'));
app.use('/api/users',     require('./routes/users'));

// AI insight endpoint
const { protect } = require('./middleware/auth');
app.get('/api/insights', protect, async (req, res) => {
  const Device = require('./models/Device');
  const devices = await Device.find({}).lean().limit(20);
  const readings = await Promise.all(devices.map(async (d) => {
    const cached = await cacheGet(`telemetry:latest:${d._id}`);
    return cached ? { ...cached, assetType: d.assetType } : { deviceId: d._id, name: d.name, assetType: d.assetType };
  }));
  res.json(generateInsights(readings.filter(r => r.power)));
});

app.get('/api/digital-twin/:deviceId', protect, async (req, res) => {
  const reading = await cacheGet(`telemetry:latest:${req.params.deviceId}`);
  res.json(getDigitalTwinScore(reading));
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── Socket.io ───────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join_site', (site) => {
    socket.join(`site:${site}`);
  });
  socket.on('leave_site', (site) => {
    socket.leave(`site:${site}`);
  });
  socket.on('disconnect', () => {});
});

// ── Boot ────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  await startSimulator(io);
  server.listen(PORT, () => console.log(`CloudFi backend running on :${PORT}`));
}).catch(err => {
  console.error('Boot error:', err);
  process.exit(1);
});
