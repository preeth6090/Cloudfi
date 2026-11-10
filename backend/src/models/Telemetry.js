const { q } = require('../config/db');
const { isUuid } = require('../utils/sql');

// Reading fields: [camelName, column]
const READINGS = [
  ['power', 'power'], ['current', 'current'], ['voltage', 'voltage'],
  ['powerFactor', 'power_factor'], ['temperature', 'temperature'], ['vibration', 'vibration'],
  ['pressure', 'pressure'], ['flow', 'flow'], ['energy', 'energy'], ['rpm', 'rpm'],
  ['torque', 'torque'], ['efficiency', 'efficiency'], ['steamConsumption', 'steam_consumption'],
];

const num = (v) => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

// Same shape the Mongo time-series documents had.
function toDoc(r) {
  const doc = {
    _id: String(r.id),
    timestamp: r.ts,
    metadata: { deviceId: r.device_id, site: r.site, assetType: r.asset_type },
  };
  for (const [key, col] of READINGS) doc[key] = r[col];
  doc.custom = r.custom;
  return doc;
}

// docs: [{ timestamp, deviceId, site, assetType, power, ..., custom }]
async function insertMany(docs) {
  if (!docs.length) return [];
  const cols = ['ts', 'device_id', 'site', 'asset_type', ...READINGS.map((r) => r[1]), 'custom'];
  const params = [];
  const rows = docs.map((d) => {
    const values = [
      d.timestamp ? new Date(d.timestamp) : new Date(),
      isUuid(d.deviceId) ? d.deviceId : null,
      d.site ?? null,
      d.assetType ?? null,
      ...READINGS.map(([key]) => num(d[key])),
      d.custom === undefined ? null : JSON.stringify(d.custom),
    ];
    const placeholders = values.map((v, i) => {
      params.push(v);
      return `$${params.length}${i === values.length - 1 ? '::jsonb' : ''}`;
    });
    return `(${placeholders.join(', ')})`;
  });
  const inserted = await q(
    `INSERT INTO telemetry (${cols.join(', ')}) VALUES ${rows.join(', ')} RETURNING *`,
    params
  );
  return inserted.map(toDoc);
}

async function latest(deviceId) {
  if (!isUuid(deviceId)) return null;
  const rows = await q('SELECT * FROM telemetry WHERE device_id = $1 ORDER BY ts DESC LIMIT 1', [deviceId]);
  return rows.length ? toDoc(rows[0]) : null;
}

// Newest first, like .sort('-timestamp').limit(n)
async function history(deviceId, { from, to, limit = 200 } = {}) {
  if (!isUuid(deviceId)) return [];
  const params = [deviceId];
  let where = 'device_id = $1';
  if (from) { params.push(new Date(from)); where += ` AND ts >= $${params.length}`; }
  if (to) { params.push(new Date(to)); where += ` AND ts <= $${params.length}`; }
  params.push(Math.min(Number(limit) || 200, 2000));
  const rows = await q(
    `SELECT * FROM telemetry WHERE ${where} ORDER BY ts DESC LIMIT $${params.length}`,
    params
  );
  return rows.map(toDoc);
}

// Hourly (or daily) averages for a site, same fields as the old Mongo pipeline.
async function aggregate(site, { from, unit }) {
  const rows = await q(
    `SELECT date_trunc($3, ts) AS bucket,
            avg(power) AS avg_power, max(power) AS max_power,
            avg(efficiency) AS avg_efficiency, avg(steam_consumption) AS avg_steam,
            sum(energy) AS total_energy
     FROM telemetry WHERE site = $1 AND ts >= $2
     GROUP BY bucket ORDER BY bucket`,
    [site, from, unit]
  );
  return rows.map((r) => ({
    _id: r.bucket,
    avgPower: r.avg_power,
    maxPower: r.max_power,
    avgEfficiency: r.avg_efficiency,
    avgSteam: r.avg_steam,
    totalEnergy: r.total_energy,
  }));
}

async function deleteOlderThan(days) {
  await q(`DELETE FROM telemetry WHERE ts < now() - make_interval(days => $1::int)`, [days]);
}

module.exports = { insertMany, latest, history, aggregate, deleteOlderThan };
