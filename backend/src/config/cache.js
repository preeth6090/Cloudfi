// Key/value cache stored in Postgres, so every serverless instance sees the same data.
// ttlSeconds = null keeps the value until it is overwritten.
const { q } = require('./db');

async function cacheGet(key) {
  const rows = await q(
    'SELECT value FROM kv WHERE key = $1 AND (expires_at IS NULL OR expires_at > now())',
    [key]
  );
  return rows.length ? rows[0].value : null;
}

// Returns { [key]: value } for the keys that exist and have not expired.
async function cacheGetMany(keys) {
  if (!keys.length) return {};
  const rows = await q(
    'SELECT key, value FROM kv WHERE key = ANY($1) AND (expires_at IS NULL OR expires_at > now())',
    [keys]
  );
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

async function cacheSet(key, value, ttlSeconds = 30) {
  return cacheSetMany([[key, value]], ttlSeconds);
}

// entries: [[key, value], ...] — written in one statement.
async function cacheSetMany(entries, ttlSeconds = 30) {
  if (!entries.length) return;
  await q(
    `INSERT INTO kv (key, value, expires_at)
     SELECT k, v, CASE WHEN $3::int IS NULL THEN NULL ELSE now() + make_interval(secs => $3::int) END
     FROM unnest($1::text[], $2::jsonb[]) AS t(k, v)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at`,
    [entries.map((e) => e[0]), entries.map((e) => JSON.stringify(e[1])), ttlSeconds]
  );
}

async function cacheDel(key) {
  await q('DELETE FROM kv WHERE key = $1', [key]);
}

module.exports = { cacheGet, cacheGetMany, cacheSet, cacheSetMany, cacheDel };
