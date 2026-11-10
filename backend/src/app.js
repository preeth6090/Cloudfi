// Express app, shared by the Vercel function (api/index.js) and local dev (server.js).
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const { connectDB } = require('./config/db');
const { cacheGet, cacheGetMany } = require('./config/cache');
const { generateInsights, getDigitalTwinScore } = require('./services/aiInsightService');
const { protect } = require('./middleware/auth');
const Device = require('./models/Device');

const app = express();

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean);

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // allow all vercel.app preview URLs for this project
  if (/^https:\/\/cloudfi[^.]*\.vercel\.app$/.test(origin)) return true;
  return false;
}

app.use(cors({ origin: (origin, cb) => cb(null, isOriginAllowed(origin)), credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(passport.initialize());

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// Make sure tables exist before any database route runs.
app.use('/api', async (_req, _res, next) => {
  await connectDB();
  next();
});

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/gateways',       require('./routes/gateways'));
app.use('/api/devices',        require('./routes/devices'));
app.use('/api/telemetry',      require('./routes/telemetry'));
app.use('/api/alerts',         require('./routes/alerts'));
app.use('/api/users',          require('./routes/users'));
app.use('/api/gateway-config', require('./routes/gatewayConfig'));
app.use('/api/live',           require('./routes/live'));

// AI insight endpoint
app.get('/api/insights', protect, async (_req, res) => {
  const devices = await Device.list(null, { limit: 20 });
  const cached = await cacheGetMany(devices.map((d) => `telemetry:latest:${d._id}`));
  const readings = devices.map((d) => {
    const reading = cached[`telemetry:latest:${d._id}`];
    return reading ? { ...reading, assetType: d.assetType } : { deviceId: d._id, name: d.name, assetType: d.assetType };
  });
  res.json(generateInsights(readings.filter((r) => r.power)));
});

app.get('/api/digital-twin/:deviceId', protect, async (req, res) => {
  const reading = await cacheGet(`telemetry:latest:${req.params.deviceId}`);
  res.json(getDigitalTwinScore(reading));
});

app.use('/api', (_req, res) => res.status(404).json({ message: 'Not found' }));

// Errors from any route (Express 5 forwards async errors here)
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: status >= 500 ? 'Server error' : err.message });
});

module.exports = app;
