const { q } = require('../config/db');
const { isUuid } = require('../utils/sql');

// Alerts with their device's summary, like Mongoose populate('device', 'name assetType').
const SELECT = `
  SELECT a.*, d.name AS device_name, d.asset_type AS device_asset_type
  FROM alerts a LEFT JOIN devices d ON d.id = a.device_id`;

function toAlert(r) {
  if (!r) return null;
  return {
    _id:              r.id,
    device:           r.device_id
      ? { _id: r.device_id, name: r.device_name, assetType: r.device_asset_type }
      : null,
    site:             r.site,
    type:             r.type,
    severity:         r.severity,
    parameter:        r.parameter,
    message:          r.message,
    recommendation:   r.recommendation,
    estimatedWastage: r.estimated_wastage,
    acknowledged:     r.acknowledged,
    acknowledgedBy:   r.acknowledged_by,
    resolvedAt:       r.resolved_at,
    createdAt:        r.created_at,
    updatedAt:        r.updated_at,
  };
}

// sites: array or null for all; unacked: only unacknowledged; since: Date for new alerts only
async function list({ sites = null, unacked = false, since = null, limit = 100 } = {}) {
  const where = [];
  const params = [];
  if (sites) { params.push(sites); where.push(`a.site = ANY($${params.length})`); }
  if (unacked) where.push('a.acknowledged = false');
  if (since) { params.push(since); where.push(`a.created_at > $${params.length}`); }
  params.push(Number(limit) || 100);
  const rows = await q(
    `${SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY a.created_at DESC LIMIT $${params.length}`,
    params
  );
  return rows.map(toAlert);
}

async function findById(id) {
  if (!isUuid(id)) return null;
  const rows = await q(`${SELECT} WHERE a.id = $1`, [id]);
  return toAlert(rows[0]);
}

async function create(a) {
  const rows = await q(
    `INSERT INTO alerts (device_id, site, type, severity, parameter, message, recommendation, estimated_wastage)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [a.device, a.site, a.type || 'predictive', a.severity || 'warning', a.parameter,
      a.message, a.recommendation, a.estimatedWastage]
  );
  return findById(rows[0].id);
}

async function acknowledge(id, userId, { resolve = false } = {}) {
  if (!isUuid(id)) return null;
  const rows = await q(
    `UPDATE alerts SET acknowledged = true, acknowledged_by = $2,
       resolved_at = CASE WHEN $3 THEN now() ELSE resolved_at END, updated_at = now()
     WHERE id = $1 RETURNING id`,
    [id, userId, resolve]
  );
  return rows.length ? findById(id) : null;
}

module.exports = { list, findById, create, acknowledge };
