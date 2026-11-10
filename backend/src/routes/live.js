// Live data for the dashboard. Replaces the old socket.io stream: the frontend polls
// this every 2 seconds. Each poll may advance the simulator by one tick.
const router = require('express').Router();
const { q } = require('../config/db');
const { cacheGetMany } = require('../config/cache');
const Alert = require('../models/Alert');
const { protect, siteFilter } = require('../middleware/auth');
const { runTickIfDue } = require('../services/dataSimulator');

router.use(protect);

router.get('/', async (req, res) => {
  await runTickIfDue();

  const sites = siteFilter(req.user);
  const devices = sites
    ? await q('SELECT id, site FROM devices WHERE site = ANY($1)', [sites])
    : await q('SELECT id, site FROM devices');
  const siteNames = [...new Set(devices.map((d) => d.site))];

  const cached = await cacheGetMany([
    ...devices.map((d) => `telemetry:latest:${d.id}`),
    ...siteNames.map((s) => `plant:${s}`),
  ]);

  // New alerts since the previous poll (first poll: the last 10 seconds)
  const sinceParam = req.query.since ? new Date(req.query.since) : null;
  const since = sinceParam && !Number.isNaN(sinceParam.getTime()) ? sinceParam : new Date(Date.now() - 10000);
  const alerts = await Alert.list({ sites, since, limit: 50 });

  res.json({
    serverTime: new Date().toISOString(),
    telemetry: devices.map((d) => cached[`telemetry:latest:${d.id}`]).filter(Boolean),
    plantSummary: siteNames.map((s) => cached[`plant:${s}`]).filter(Boolean),
    alerts,
  });
});

module.exports = router;
