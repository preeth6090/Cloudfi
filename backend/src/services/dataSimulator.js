// Demo data simulator.
// Serverless functions can't run a background timer, so the simulator advances one
// step (a "tick") when the dashboard polls /api/live, at most once every 2 seconds.
// Its state lives in the kv table so every function instance continues the same run.
const { q } = require('../config/db');
const { cacheGet, cacheSetMany } = require('../config/cache');
const { buildVirtualParams, filterParams } = require('../utils/virtualParameters');
const { simulateFFT } = require('../utils/fftSimulator');
const { computeAnomalyScore } = require('./cloudfiAIService');

const TICK_MS = 2000;
const PERSIST_EVERY_MS = 30000;      // save readings to the telemetry table every 30 s
const CLEANUP_EVERY_MS = 3600000;    // prune old rows hourly
const TELEMETRY_RETENTION_DAYS = 7;  // keeps the free Neon tier small
const AUDIT_RETENTION_DAYS = 14;
const LATEST_TTL_S = 600;
const ALERT_COOLDOWN_MS = 300000;    // 5 minutes per device + parameter

function initState(assetType) {
  const base = {
    ball_mill:      { power: 1200, temp: 65, vibration: 2.1, rpm: 980, efficiency: 88 },
    boiler:         { power: 800,  temp: 185, pressure: 12, efficiency: 86, steamConsumption: 380 },
    compressor:     { power: 450,  temp: 72, pressure: 8.5, vibration: 1.8, efficiency: 82 },
    pump:           { power: 180,  temp: 55, pressure: 4.2, vibration: 1.2, flow: 120 },
    fan:            { power: 95,   temp: 45, vibration: 0.8, rpm: 1450 },
    centrifugal:    { power: 320,  temp: 58, vibration: 1.5, rpm: 1480 },
    spray_dryer:    { power: 650,  temp: 220, pressure: 2.1, efficiency: 79 },
    hydraulic_press:{ power: 280,  temp: 68, pressure: 18.5, vibration: 2.8 },
    turbine:        { power: 12000, temp: 540, pressure: 85, efficiency: 91, rpm: 3000 },
    motor:          { power: 220,  temp: 62, vibration: 1.4, rpm: 1460, efficiency: 90 },
  }[assetType] || { power: 200, temp: 60, vibration: 1.5 };

  return { ...base, voltage: 415, current: base.power / (1.732 * 415 * 0.9) * 1000,
           powerFactor: 0.9 + Math.random() * 0.05, energy: 0, healthIndex: 95 + Math.random() * 5 };
}

function jitter(val, pct = 0.03) {
  return +(val * (1 + (Math.random() - 0.5) * pct * 2)).toFixed(3);
}

function drift(current, target, rate = 0.002) {
  return current + (target - current) * rate + (Math.random() - 0.5) * 0.001;
}

const DEMO_DEVICES = [
  { name: 'Turbine A',        assetType: 'turbine',       site: 'Site A' },
  { name: 'Ball Mill 1',      assetType: 'ball_mill',     site: 'Site A' },
  { name: 'Cogen Boiler',     assetType: 'boiler',        site: 'Site A' },
  { name: 'Compressor C1',    assetType: 'compressor',    site: 'Site A' },
  { name: 'Distillery Pump',  assetType: 'pump',          site: 'Site A' },
  { name: 'Spray Dryer',      assetType: 'spray_dryer',   site: 'Site B' },
  { name: 'Centrifugal 1',    assetType: 'centrifugal',   site: 'Site B' },
  { name: 'Hydraulic Press',  assetType: 'hydraulic_press', site: 'Site B' },
];

async function seedDemoDevices() {
  // Only seeds an empty table; the advisory lock stops two cold starts seeding twice.
  await q(
    `WITH lock AS (SELECT pg_try_advisory_xact_lock(424242) AS ok)
     INSERT INTO devices (name, asset_type, site, status, health_index)
     SELECT d.name, d.asset_type, d.site, 'online', 90 + random() * 8
     FROM unnest($1::text[], $2::text[], $3::text[]) AS d(name, asset_type, site), lock
     WHERE lock.ok AND NOT EXISTS (SELECT 1 FROM devices)`,
    [DEMO_DEVICES.map((d) => d.name), DEMO_DEVICES.map((d) => d.assetType), DEMO_DEVICES.map((d) => d.site)]
  );
}

// Claim the next tick. Returns true for exactly one caller per 2-second window.
async function claimTick() {
  const rows = await q(
    `INSERT INTO kv (key, value, expires_at)
     VALUES ('sim:lock', 'true', now() + make_interval(secs => $1::double precision))
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at
     WHERE kv.expires_at IS NULL OR kv.expires_at <= now()
     RETURNING key`,
    [(TICK_MS - 100) / 1000]
  );
  return rows.length > 0;
}

async function runTickIfDue() {
  if (!(await claimTick())) return false;
  await tick();
  return true;
}

async function tick() {
  const devices = await q('SELECT id, name, asset_type, site FROM devices');
  if (!devices.length) return;

  const state = (await cacheGet('sim:state')) || {};
  state.devices = state.devices || {};
  state.cooldown = state.cooldown || {};
  const now = Date.now();

  const payloads = [];
  const siteAgg = {};
  const alertsToCreate = [];

  for (const device of devices) {
    const id = device.id;
    if (!state.devices[id]) state.devices[id] = initState(device.asset_type);
    const s = state.devices[id];

    // Drift all numeric fields slowly
    for (const k of Object.keys(s)) {
      if (typeof s[k] === 'number') s[k] = jitter(s[k], 0.02);
    }

    // Slowly degrade health
    s.healthIndex = Math.max(20, drift(s.healthIndex, 94, 0.001));
    s.energy = +(s.energy + (s.power / 1000) * (2 / 3600)).toFixed(4);

    const payload = {
      deviceId: id,
      site: device.site,
      assetType: device.asset_type,
      name: device.name,
      timestamp: new Date(now).toISOString(),
      power: +s.power.toFixed(2),
      current: +s.current.toFixed(2),
      voltage: +s.voltage.toFixed(1),
      powerFactor: +s.powerFactor.toFixed(3),
      temperature: +(s.temp || 60).toFixed(1),
      vibration: +(s.vibration || 1).toFixed(2),
      pressure: +(s.pressure || 0).toFixed(2),
      flow: +(s.flow || 0).toFixed(1),
      rpm: +(s.rpm || 0).toFixed(0),
      efficiency: +(s.efficiency || 85).toFixed(1),
      steamConsumption: +(s.steamConsumption || 0).toFixed(1),
      energy: s.energy,
      healthIndex: +s.healthIndex.toFixed(1),
    };

    // CloudFi virtual parameters + FFT
    const vParams = buildVirtualParams(payload);
    const fftData = simulateFFT({ voltage: payload.voltage, powerFactor: payload.powerFactor });
    const anomaly = computeAnomalyScore(payload, vParams, fftData);

    payload.custom = {
      virtualParams:   filterParams(vParams),
      fft:             fftData,
      anomalyScore:    anomaly.anomalyScore,
      anomalySeverity: anomaly.severity,
      protocol:        vParams.protocolMeta?.protocol,
      protocolMeta:    vParams.protocolMeta,
    };
    payloads.push(payload);

    const agg = siteAgg[device.site] || (siteAgg[device.site] = { totalPower: 0, count: 0, avgHealth: 0, avgEfficiency: 0 });
    agg.totalPower += payload.power;
    agg.avgHealth += payload.healthIndex;
    agg.avgEfficiency += payload.efficiency;
    agg.count++;

    // Detect anomalies
    if (payload.vibration > 5.5) alertsToCreate.push([device, 'vibration', payload.vibration]);
    if (payload.temperature > 150 && device.asset_type !== 'boiler') alertsToCreate.push([device, 'temperature', payload.temperature]);
  }

  // Latest readings + plant summaries, one write
  const entries = payloads.map((p) => [`telemetry:latest:${p.deviceId}`, p]);
  for (const [site, agg] of Object.entries(siteAgg)) {
    entries.push([`plant:${site}`, {
      site,
      totalPower: +agg.totalPower.toFixed(1),
      avgHealthIndex: +(agg.avgHealth / agg.count).toFixed(1),
      avgEfficiency: +(agg.avgEfficiency / agg.count).toFixed(1),
      deviceCount: agg.count,
      timestamp: new Date(now).toISOString(),
    }]);
  }

  const Telemetry = require('../models/Telemetry');
  const AuditLog = require('../models/AuditLog');

  const persist = now - (state.lastPersist || 0) >= PERSIST_EVERY_MS;
  const cleanup = now - (state.lastCleanup || 0) >= CLEANUP_EVERY_MS;
  if (persist) state.lastPersist = now;
  if (cleanup) state.lastCleanup = now;

  for (const [device, parameter, value] of alertsToCreate) {
    const key = `${device.id}:${parameter}`;
    if (now - (state.cooldown[key] || 0) < ALERT_COOLDOWN_MS) continue;
    state.cooldown[key] = now;
    await createAlert(device, parameter, value);
  }

  await cacheSetMany(entries, LATEST_TTL_S);
  await cacheSetMany([['sim:state', state]], null);

  if (persist) {
    // Store a slim copy: the full virtual-parameter set is only needed live.
    const docs = payloads.map((p) => ({
      ...p,
      custom: { anomalyScore: p.custom.anomalyScore, anomalySeverity: p.custom.anomalySeverity, protocol: p.custom.protocol },
    }));
    await Telemetry.insertMany(docs);
    await AuditLog.insertMany(docs.map((d) => ({
      receivedAt: d.timestamp, deviceId: d.deviceId, site: d.site, assetType: d.assetType,
      source: 'simulator', protocol: d.custom.protocol || 'simulator', payload: d,
    })));
  }

  if (cleanup) {
    await Telemetry.deleteOlderThan(TELEMETRY_RETENTION_DAYS);
    await AuditLog.deleteOlderThan(AUDIT_RETENTION_DAYS);
    await q('DELETE FROM kv WHERE expires_at < now()');
  }
}

async function createAlert(device, parameter, value) {
  const messages = {
    vibration: {
      message: `High vibration detected on ${device.name}: ${value.toFixed(2)} mm/s (threshold: 5.5 mm/s)`,
      recommendation: 'Check bearing lubrication and shaft alignment. Schedule inspection within 24h.',
      wastage: 1250,
    },
    temperature: {
      message: `Elevated temperature on ${device.name}: ${value.toFixed(1)} °C`,
      recommendation: 'Verify cooling system, check for fouling or blockage in heat exchangers.',
      wastage: 850,
    },
  };
  const info = messages[parameter] || { message: `Anomaly on ${device.name}`, recommendation: 'Inspect device.', wastage: 500 };

  const Alert = require('../models/Alert');
  await Alert.create({
    device: device.id,
    site: device.site,
    type: 'predictive',
    severity: value > 7 ? 'critical' : 'warning',
    parameter,
    message: info.message,
    recommendation: info.recommendation,
    estimatedWastage: info.wastage,
  });
}

module.exports = { seedDemoDevices, runTickIfDue };
