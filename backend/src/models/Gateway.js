const { q } = require('../config/db');
const { isUuid, insertSql, updateSql, badRequest, checkEnum } = require('../utils/sql');

const PROTOCOLS = ['modbus_tcp', 'modbus_rtu', 'mqtt', 'ethernet'];
const STATUSES = ['online', 'offline', 'degraded'];

const FIELDS = {
  name:              ['name'],
  model:             ['model'],
  ipAddress:         ['ip_address'],
  port:              ['port'],
  protocol:          ['protocol'],
  heartbeatInterval: ['heartbeat_interval'],
  site:              ['site'],
  location:          ['location'],
  status:            ['status'],
  lastSeen:          ['last_seen'],
  firmwareVersion:   ['firmware_version'],
  createdBy:         ['created_by', 'uuid'],
};

function toGateway(r) {
  if (!r) return null;
  return {
    _id:               r.id,
    name:              r.name,
    model:             r.model,
    ipAddress:         r.ip_address,
    port:              r.port,
    protocol:          r.protocol,
    heartbeatInterval: r.heartbeat_interval,
    site:              r.site,
    location:          r.location,
    status:            r.status,
    lastSeen:          r.last_seen,
    firmwareVersion:   r.firmware_version,
    createdBy:         r.created_by,
    createdAt:         r.created_at,
    updatedAt:         r.updated_at,
  };
}

function validate(body, isNew) {
  checkEnum(body.protocol, PROTOCOLS, 'protocol');
  checkEnum(body.status, STATUSES, 'status');
  for (const key of ['name', 'ipAddress', 'site']) {
    if ((isNew && !body[key]) || body[key] === '') throw badRequest(`${key} is required`);
  }
}

async function findById(id) {
  if (!isUuid(id)) return null;
  const rows = await q('SELECT * FROM gateways WHERE id = $1', [id]);
  return toGateway(rows[0]);
}

// sites: array of site names, or null for all sites
async function list(sites) {
  const rows = sites
    ? await q('SELECT * FROM gateways WHERE site = ANY($1) ORDER BY created_at DESC', [sites])
    : await q('SELECT * FROM gateways ORDER BY created_at DESC');
  return rows.map(toGateway);
}

async function create(body) {
  validate(body, true);
  const { text, params } = insertSql('gateways', FIELDS, body);
  const rows = await q(text, params);
  return findById(rows[0].id);
}

async function update(id, body) {
  if (!isUuid(id)) return null;
  validate(body, false);
  const stmt = updateSql('gateways', FIELDS, id, body);
  if (stmt) {
    const rows = await q(stmt.text, stmt.params);
    if (!rows.length) return null;
  }
  return findById(id);
}

async function remove(id) {
  if (!isUuid(id)) return;
  await q('DELETE FROM gateways WHERE id = $1', [id]);
}

module.exports = { findById, list, create, update, remove };
