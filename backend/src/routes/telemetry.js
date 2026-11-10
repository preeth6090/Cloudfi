const router = require('express').Router();
const Telemetry = require('../models/Telemetry');
const AuditLog  = require('../models/AuditLog');
const { protect } = require('../middleware/auth');
const { cacheGet, cacheSet } = require('../config/cache');
const { buildVirtualParams } = require('../utils/virtualParameters');
const { simulateFFT } = require('../utils/fftSimulator');
const { getPowerQualityTwin } = require('../services/cloudfiAIService');

router.use(protect);

router.get('/latest/:deviceId', async (req, res) => {
  const key = `telemetry:latest:${req.params.deviceId}`;
  const cached = await cacheGet(key);
  if (cached) return res.json(cached);
  const doc = await Telemetry.latest(req.params.deviceId);
  if (doc) await cacheSet(key, doc, 10);
  res.json(doc || {});
});

router.get('/history/:deviceId', async (req, res) => {
  const { from, to, limit = 200 } = req.query;
  const docs = await Telemetry.history(req.params.deviceId, { from, to, limit });
  res.json(docs.reverse());
});

router.post('/manual', async (req, res) => {
  const { deviceId, site, assetType, readings = {} } = req.body || {};
  const [doc] = await Telemetry.insertMany([{ timestamp: new Date(), deviceId, site, assetType, ...readings }]);
  await AuditLog.insertMany([{
    receivedAt: doc.timestamp, deviceId, site, assetType, source: 'manual',
    protocol: readings?.custom?.protocol || 'manual', payload: doc,
  }]).catch(() => {});
  res.status(201).json(doc);
});

// Power Quality Digital Twin endpoint
router.get('/power-quality/:deviceId', async (req, res) => {
  const reading = await cacheGet(`telemetry:latest:${req.params.deviceId}`);
  if (!reading) return res.json(null);
  const vParams = buildVirtualParams(reading);
  const fft     = simulateFFT(reading);
  res.json(getPowerQualityTwin(reading, vParams, fft));
});

// FFT data endpoint
router.get('/fft/:deviceId', async (req, res) => {
  const reading = await cacheGet(`telemetry:latest:${req.params.deviceId}`);
  if (!reading) return res.json(null);
  const vParams = buildVirtualParams(reading);
  res.json({
    deviceId: req.params.deviceId,
    fft:      simulateFFT(reading),
    thd_v:    vParams.THD_V,
    thd_i:    vParams.THD_I,
    kFactor:  vParams.kFactor,
    protocol: vParams.protocolMeta,
  });
});

// Audit log query (system_admin only)
router.get('/audit', async (req, res) => {
  if (req.user?.role !== 'system_admin') return res.status(403).json({ message: 'Forbidden' });
  const { deviceId, limit = 100 } = req.query;
  res.json(await AuditLog.list({ deviceId, limit }));
});

router.post('/bulk', async (req, res) => {
  const { records } = req.body || {};
  if (!Array.isArray(records) || records.length === 0)
    return res.status(400).json({ message: 'records array required' });
  if (records.length > 1000)
    return res.status(400).json({ message: 'at most 1000 records per request' });
  const docs = records.map((r) => ({
    timestamp: new Date(r.timestamp || Date.now()),
    deviceId: r.deviceId, site: r.site, assetType: r.assetType,
    power: r.power, current: r.current, voltage: r.voltage,
    temperature: r.temperature, vibration: r.vibration, pressure: r.pressure,
    flow: r.flow, energy: r.energy, efficiency: r.efficiency,
    steamConsumption: r.steamConsumption, custom: r.custom,
  }));
  await Telemetry.insertMany(docs);
  await AuditLog.insertMany(docs.map((d) => ({
    receivedAt: d.timestamp, deviceId: d.deviceId, site: d.site, assetType: d.assetType,
    source: 'bulk', protocol: d.custom?.protocol || 'bulk', payload: d,
  }))).catch(() => {});
  res.status(201).json({ inserted: docs.length });
});

router.get('/aggregate/:site', async (req, res) => {
  const { period = '24h' } = req.query;
  const hours = period === '7d' ? 168 : period === '30d' ? 720 : 24;
  const from = new Date(Date.now() - hours * 3600000);
  const data = await Telemetry.aggregate(req.params.site, { from, unit: hours <= 24 ? 'hour' : 'day' });
  res.json(data);
});

module.exports = router;
