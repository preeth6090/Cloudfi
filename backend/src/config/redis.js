const Redis = require('ioredis');

let client = null;
let redisChecked = false;
const cache = new Map(); // in-memory fallback

async function getRedis() {
  if (redisChecked) return client;
  redisChecked = true;
  try {
    const r = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      lazyConnect: true,
      connectTimeout: 3000,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null, // no retries
    });
    r.on('error', () => {}); // silence all ioredis error events
    await r.connect();
    client = r;
    console.log('Redis connected');
  } catch {
    console.warn('Redis unavailable – using in-memory cache');
    client = null;
  }
  return client;
}

async function cacheSet(key, value, ttlSeconds = 30) {
  const r = await getRedis();
  const str = JSON.stringify(value);
  if (r) return r.setex(key, ttlSeconds, str);
  cache.set(key, { v: str, exp: Date.now() + ttlSeconds * 1000 });
}

async function cacheGet(key) {
  const r = await getRedis();
  if (r) {
    const v = await r.get(key);
    return v ? JSON.parse(v) : null;
  }
  const entry = cache.get(key);
  if (!entry || entry.exp < Date.now()) { cache.delete(key); return null; }
  return JSON.parse(entry.v);
}

async function cacheDel(key) {
  const r = await getRedis();
  if (r) return r.del(key);
  cache.delete(key);
}

module.exports = { cacheSet, cacheGet, cacheDel };
