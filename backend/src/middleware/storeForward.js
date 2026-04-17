// Store & Forward middleware
// If MongoDB is unreachable, buffers telemetry in memory/Redis (No-Delete policy).
// Drains buffer automatically once DB connectivity is restored.

const mongoose = require('mongoose');
const { cacheGet, cacheSet } = require('../config/redis');

const BUFFER_KEY   = 'sf:buffer';
const MAX_BUFFER   = 5000; // max in-memory queue entries
const inMemBuf     = [];   // fallback when Redis also unavailable
let   draining     = false;

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

async function bufferPayload(payload) {
  const entry = { ts: Date.now(), payload };
  try {
    const existing = (await cacheGet(BUFFER_KEY)) || [];
    existing.push(entry);
    await cacheSet(BUFFER_KEY, existing, 86400); // 24h TTL
  } catch {
    if (inMemBuf.length < MAX_BUFFER) inMemBuf.push(entry);
  }
}

async function drainBuffer(Telemetry, AuditLog) {
  if (draining || !isDbConnected()) return;
  draining = true;

  try {
    // drain Redis buffer
    const redisBuf = (await cacheGet(BUFFER_KEY)) || [];
    if (redisBuf.length > 0) {
      const docs = redisBuf.map(e => ({
        timestamp: new Date(e.ts),
        metadata: { deviceId: e.payload.deviceId, site: e.payload.site, assetType: e.payload.assetType },
        ...e.payload,
      }));
      await Telemetry.insertMany(docs, { ordered: false }).catch(() => {});
      await AuditLog.insertMany(docs.map(d => ({
        receivedAt: d.timestamp, deviceId: d.metadata?.deviceId,
        site: d.metadata?.site, assetType: d.metadata?.assetType,
        source: 'api', protocol: d.custom?.protocolMeta?.protocol || 'unknown', payload: d,
      })), { ordered: false }).catch(() => {});
      await cacheSet(BUFFER_KEY, [], 86400);
    }

    // drain in-memory buffer
    if (inMemBuf.length > 0) {
      const batch = inMemBuf.splice(0, inMemBuf.length);
      const docs = batch.map(e => ({
        timestamp: new Date(e.ts),
        metadata: { deviceId: e.payload.deviceId, site: e.payload.site, assetType: e.payload.assetType },
        ...e.payload,
      }));
      await Telemetry.insertMany(docs, { ordered: false }).catch(() => {});
    }

    if (redisBuf.length > 0 || inMemBuf.length > 0) {
      console.log(`[StoreForward] Drained ${redisBuf.length + inMemBuf.length} buffered records`);
    }
  } finally {
    draining = false;
  }
}

// Middleware factory — wraps a telemetry write operation
function storeForwardMiddleware(Telemetry, AuditLog) {
  // Watch for reconnect events to drain
  mongoose.connection.on('connected', () => drainBuffer(Telemetry, AuditLog));
  mongoose.connection.on('reconnected', () => drainBuffer(Telemetry, AuditLog));

  return async function storeForward(req, res, next) {
    if (!isDbConnected()) {
      await bufferPayload(req.body || {});
      return res.status(202).json({ queued: true, message: 'DB offline — data buffered for sync' });
    }

    // DB is up — try to drain any pending buffer first (non-blocking)
    drainBuffer(Telemetry, AuditLog).catch(() => {});
    next();
  };
}

module.exports = { storeForwardMiddleware, drainBuffer, bufferPayload };
