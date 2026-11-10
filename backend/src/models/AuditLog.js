const { q } = require('../config/db');
const { isUuid } = require('../utils/sql');

function toLog(r) {
  return {
    _id: String(r.id),
    receivedAt: r.received_at,
    deviceId: r.device_id,
    site: r.site,
    assetType: r.asset_type,
    protocol: r.protocol,
    source: r.source,
    payloadHash: r.payload_hash,
    payload: r.payload,
  };
}

// logs: [{ receivedAt, deviceId, site, assetType, protocol, source, payload }]
async function insertMany(logs) {
  if (!logs.length) return;
  const params = [];
  const rows = logs.map((l) => {
    const values = [
      l.receivedAt ? new Date(l.receivedAt) : new Date(),
      isUuid(l.deviceId) ? l.deviceId : null,
      l.site ?? null,
      l.assetType ?? null,
      l.protocol ?? null,
      l.source || 'api',
      JSON.stringify(l.payload ?? null),
    ];
    const ph = values.map((v, i) => {
      params.push(v);
      return `$${params.length}${i === values.length - 1 ? '::jsonb' : ''}`;
    });
    return `(${ph.join(', ')})`;
  });
  await q(
    `INSERT INTO audit_logs (received_at, device_id, site, asset_type, protocol, source, payload)
     VALUES ${rows.join(', ')}`,
    params
  );
}

async function list({ deviceId, limit = 100 } = {}) {
  const lim = Math.min(Number(limit) || 100, 1000);
  const rows = deviceId
    ? (isUuid(deviceId)
      ? await q('SELECT * FROM audit_logs WHERE device_id = $1 ORDER BY received_at DESC LIMIT $2', [deviceId, lim])
      : [])
    : await q('SELECT * FROM audit_logs ORDER BY received_at DESC LIMIT $1', [lim]);
  return rows.map(toLog);
}

async function deleteOlderThan(days) {
  await q(`DELETE FROM audit_logs WHERE received_at < now() - make_interval(days => $1::int)`, [days]);
}

module.exports = { insertMany, list, deleteOlderThan };
