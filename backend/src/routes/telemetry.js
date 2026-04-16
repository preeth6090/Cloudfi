const router = require('express').Router();
const Telemetry = require('../models/Telemetry');
const { protect } = require('../middleware/auth');
const { cacheGet, cacheSet } = require('../config/redis');

router.use(protect);

router.get('/latest/:deviceId', async (req, res) => {
  const key = `telemetry:latest:${req.params.deviceId}`;
  const cached = await cacheGet(key);
  if (cached) return res.json(cached);
  const doc = await Telemetry.findOne({ 'metadata.deviceId': req.params.deviceId }).sort('-timestamp');
  if (doc) await cacheSet(key, doc, 10);
  res.json(doc || {});
});

router.get('/history/:deviceId', async (req, res) => {
  const { from, to, limit = 200 } = req.query;
  const match = { 'metadata.deviceId': req.params.deviceId };
  if (from || to) {
    match.timestamp = {};
    if (from) match.timestamp.$gte = new Date(from);
    if (to) match.timestamp.$lte = new Date(to);
  }
  const docs = await Telemetry.find(match).sort('-timestamp').limit(Number(limit));
  res.json(docs.reverse());
});

router.post('/manual', async (req, res) => {
  const { deviceId, site, assetType, readings } = req.body;
  const doc = await Telemetry.create({
    timestamp: new Date(),
    metadata: { deviceId, site, assetType },
    ...readings,
  });
  res.status(201).json(doc);
});

router.post('/bulk', async (req, res) => {
  const { records } = req.body;
  if (!Array.isArray(records) || records.length === 0)
    return res.status(400).json({ message: 'records array required' });
  const docs = records.map(r => ({
    timestamp: new Date(r.timestamp || Date.now()),
    metadata: { deviceId: r.deviceId, site: r.site, assetType: r.assetType },
    power: r.power, current: r.current, voltage: r.voltage,
    temperature: r.temperature, vibration: r.vibration, pressure: r.pressure,
    flow: r.flow, energy: r.energy, efficiency: r.efficiency,
    steamConsumption: r.steamConsumption, custom: r.custom,
  }));
  await Telemetry.insertMany(docs);
  res.status(201).json({ inserted: docs.length });
});

router.get('/aggregate/:site', async (req, res) => {
  const { period = '24h' } = req.query;
  const hours = period === '7d' ? 168 : period === '30d' ? 720 : 24;
  const from = new Date(Date.now() - hours * 3600000);
  const pipeline = [
    { $match: { 'metadata.site': req.params.site, timestamp: { $gte: from } } },
    { $group: {
      _id: { $dateTrunc: { date: '$timestamp', unit: hours <= 24 ? 'hour' : 'day' } },
      avgPower: { $avg: '$power' },
      maxPower: { $max: '$power' },
      avgEfficiency: { $avg: '$efficiency' },
      avgSteam: { $avg: '$steamConsumption' },
      totalEnergy: { $sum: '$energy' },
    }},
    { $sort: { _id: 1 } },
  ];
  const data = await Telemetry.aggregate(pipeline);
  res.json(data);
});

module.exports = router;
