const { q } = require('../config/db');
const { isUuid, insertSql, updateSql, badRequest, checkEnum } = require('../utils/sql');

const ASSET_TYPES = ['ball_mill', 'boiler', 'compressor', 'pump', 'fan', 'centrifugal', 'spray_dryer',
  'hydraulic_press', 'gearbox', 'turbine', 'heat_exchanger', 'motor', 'other'];
const STATUSES = ['online', 'offline', 'warning', 'critical'];

const FIELDS = {
  name:            ['name'],
  assetType:       ['asset_type'],
  gateway:         ['gateway_id', 'uuid'],
  site:            ['site'],
  unitId:          ['unit_id'],
  pollInterval:    ['poll_interval'],
  registerMap:     ['register_map', 'json'],
  status:          ['status'],
  healthIndex:     ['health_index'],
  runHours:        ['run_hours'],
  lastMaintenance: ['last_maintenance'],
  tags:            ['tags'],
  createdBy:       ['created_by', 'uuid'],
};

// Selects devices with their gateway's summary, like Mongoose populate('gateway').
const SELECT = `
  SELECT d.*, g.name AS gw_name, g.ip_address AS gw_ip, g.status AS gw_status
  FROM devices d LEFT JOIN gateways g ON g.id = d.gateway_id`;

function toDevice(r) {
  if (!r) return null;
  return {
    _id:             r.id,
    name:            r.name,
    assetType:       r.asset_type,
    gateway:         r.gateway_id
      ? { _id: r.gateway_id, name: r.gw_name, ipAddress: r.gw_ip, status: r.gw_status }
      : null,
    site:            r.site,
    unitId:          r.unit_id,
    pollInterval:    r.poll_interval,
    registerMap:     r.register_map || [],
    status:          r.status,
    healthIndex:     r.health_index,
    runHours:        r.run_hours,
    lastMaintenance: r.last_maintenance,
    tags:            r.tags || [],
    createdBy:       r.created_by,
    createdAt:       r.created_at,
    updatedAt:       r.updated_at,
  };
}

function validate(body, isNew) {
  checkEnum(body.assetType, ASSET_TYPES, 'assetType');
  checkEnum(body.status, STATUSES, 'status');
  for (const key of ['name', 'site']) {
    if ((isNew && !body[key]) || body[key] === '') throw badRequest(`${key} is required`);
  }
  if (body.registerMap !== undefined && !Array.isArray(body.registerMap)) {
    throw badRequest('registerMap must be an array');
  }
}

async function findById(id) {
  if (!isUuid(id)) return null;
  const rows = await q(`${SELECT} WHERE d.id = $1`, [id]);
  return toDevice(rows[0]);
}

// sites: array of site names, or null for all sites
async function list(sites, { limit } = {}) {
  const lim = limit ? ` LIMIT ${Number(limit)}` : '';
  const rows = sites
    ? await q(`${SELECT} WHERE d.site = ANY($1) ORDER BY d.created_at DESC${lim}`, [sites])
    : await q(`${SELECT} ORDER BY d.created_at DESC${lim}`);
  return rows.map(toDevice);
}

async function count() {
  const rows = await q('SELECT count(*)::int AS n FROM devices');
  return rows[0].n;
}

async function create(body) {
  validate(body, true);
  const { text, params } = insertSql('devices', FIELDS, body);
  const rows = await q(text, params);
  return findById(rows[0].id);
}

async function update(id, body) {
  if (!isUuid(id)) return null;
  validate(body, false);
  const stmt = updateSql('devices', FIELDS, id, body);
  if (stmt) {
    const rows = await q(stmt.text, stmt.params);
    if (!rows.length) return null;
  }
  return findById(id);
}

async function remove(id) {
  if (!isUuid(id)) return;
  await q('DELETE FROM devices WHERE id = $1', [id]);
}

module.exports = { findById, list, count, create, update, remove };
