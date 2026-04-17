const Device = require('../models/Device');
const Alert = require('../models/Alert');
const Telemetry = require('../models/Telemetry');
const AuditLog = require('../models/AuditLog');
const { cacheSet } = require('../config/redis');
const { buildVirtualParams, filterParams } = require('../utils/virtualParameters');
const { simulateFFT } = require('../utils/fftSimulator');
const { computeAnomalyScore } = require('../services/galanfiAIService');

// Per-device simulation state
const deviceState = new Map();

function initState(deviceId, assetType) {
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
  const count = await Device.countDocuments();
  if (count > 0) return;
  await Device.insertMany(DEMO_DEVICES.map(d => ({ ...d, status: 'online', healthIndex: 90 + Math.random() * 8 })));
  console.log(`Seeded ${DEMO_DEVICES.length} demo devices`);
}

let io = null;
let simulatorInterval = null;

async function startSimulator(socketIo) {
  io = socketIo;
  await seedDemoDevices();
  simulatorInterval = setInterval(tick, 2000);
  console.log('Data simulator started (2 s tick)');
}

async function tick() {
  let devices;
  try {
    // Simulate ALL devices – mark them online so the frontend shows live data
    devices = await Device.find({}).lean();
    if (devices.length === 0) return;
    // Batch-mark all as online each tick (lightweight upsert avoided; just in-memory)
  } catch { return; }

  const siteAgg = {};

  for (const device of devices) {
    const id = device._id.toString();
    if (!deviceState.has(id)) deviceState.set(id, initState(id, device.assetType));
    const s = deviceState.get(id);

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
      assetType: device.assetType,
      name: device.name,
      timestamp: new Date().toISOString(),
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

    // ── Galanfi virtual parameters + FFT ──────────────────────
    const vParams  = buildVirtualParams(payload);
    const fftData  = simulateFFT({ voltage: payload.voltage, powerFactor: payload.powerFactor });
    const anomaly  = computeAnomalyScore(payload, vParams, fftData);

    // attach to payload as custom field (no schema change)
    payload.custom = {
      virtualParams: filterParams(vParams),   // 100+ power params
      fft:           fftData,
      anomalyScore:  anomaly.anomalyScore,
      anomalySeverity: anomaly.severity,
      protocol:      vParams.protocolMeta?.protocol,
      protocolMeta:  vParams.protocolMeta,
    };

    // Cache latest reading
    await cacheSet(`telemetry:latest:${id}`, payload, 15);

    // Emit to site room
    io.to(`site:${device.site}`).emit('telemetry', payload);
    io.to('site:all').emit('telemetry', payload);

    // Aggregate per site
    if (!siteAgg[device.site]) siteAgg[device.site] = { totalPower: 0, count: 0, avgHealth: 0, avgEfficiency: 0 };
    siteAgg[device.site].totalPower += payload.power;
    siteAgg[device.site].avgHealth += payload.healthIndex;
    siteAgg[device.site].avgEfficiency += payload.efficiency;
    siteAgg[device.site].count++;

    // Detect anomalies
    if (payload.vibration > 5.5) maybeCreateAlert(device, payload, 'vibration', payload.vibration);
    if (payload.temperature > 150 && device.assetType !== 'boiler') maybeCreateAlert(device, payload, 'temperature', payload.temperature);

    // Persist every 30 seconds (15 ticks of 2 s)
    if (Math.random() < 0.067) {
      const doc = {
        timestamp: new Date(),
        metadata: { deviceId: device._id, site: device.site, assetType: device.assetType },
        ...payload,
      };
      Telemetry.create(doc).catch(() => {});
      // No-Delete audit trail
      AuditLog.create({
        receivedAt: doc.timestamp, deviceId: device._id,
        site: device.site, assetType: device.assetType,
        source: 'simulator',
        protocol: payload.custom?.protocol || 'simulator',
        payload: doc,
      }).catch(() => {});
    }
  }

  // Emit plant-wide summary per site
  for (const [site, agg] of Object.entries(siteAgg)) {
    const summary = {
      site,
      totalPower: +agg.totalPower.toFixed(1),
      avgHealthIndex: +(agg.avgHealth / agg.count).toFixed(1),
      avgEfficiency: +(agg.avgEfficiency / agg.count).toFixed(1),
      deviceCount: agg.count,
      timestamp: new Date().toISOString(),
    };
    io.to(`site:${site}`).emit('plant_summary', summary);
    io.to('site:all').emit('plant_summary', summary);
    await cacheSet(`plant:${site}`, summary, 10);
  }
}

const alertCooldown = new Map();

async function maybeCreateAlert(device, payload, parameter, value) {
  const key = `${device._id}:${parameter}`;
  const last = alertCooldown.get(key) || 0;
  if (Date.now() - last < 300000) return; // 5-min cooldown
  alertCooldown.set(key, Date.now());

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

  const alert = await Alert.create({
    device: device._id,
    site: device.site,
    type: 'predictive',
    severity: value > 7 ? 'critical' : 'warning',
    parameter,
    message: info.message,
    recommendation: info.recommendation,
    estimatedWastage: info.wastage,
  });

  if (io) {
    io.to(`site:${device.site}`).emit('new_alert', alert);
    io.to('site:all').emit('new_alert', alert);
  }
}

module.exports = { startSimulator };
