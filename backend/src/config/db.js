// Postgres (Neon) connection + schema.
// Uses Neon's HTTP driver, which works well in serverless functions.
const { neon } = require('@neondatabase/serverless');

let client = null;

function sql() {
  if (!client) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
    client = neon(process.env.DATABASE_URL);
  }
  return client;
}

// Run a parameterised query and return the rows.
async function q(text, params = []) {
  return sql().query(text, params);
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id   text UNIQUE,
    email       text NOT NULL UNIQUE,
    name        text,
    avatar      text,
    role        text NOT NULL DEFAULT 'viewer',
    site_access text[] NOT NULL DEFAULT '{}',
    is_active   boolean NOT NULL DEFAULT true,
    last_login  timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS gateways (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name               text NOT NULL,
    model              text NOT NULL DEFAULT 'GF100',
    ip_address         text NOT NULL,
    port               integer NOT NULL DEFAULT 502,
    protocol           text NOT NULL DEFAULT 'modbus_tcp',
    heartbeat_interval integer NOT NULL DEFAULT 30,
    site               text NOT NULL,
    location           text,
    status             text NOT NULL DEFAULT 'offline',
    last_seen          timestamptz,
    firmware_version   text NOT NULL DEFAULT '4.0.1',
    created_by         uuid,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS devices (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name             text NOT NULL,
    asset_type       text NOT NULL DEFAULT 'motor',
    gateway_id       uuid REFERENCES gateways(id) ON DELETE SET NULL,
    site             text NOT NULL,
    unit_id          integer NOT NULL DEFAULT 1,
    poll_interval    integer NOT NULL DEFAULT 5,
    register_map     jsonb NOT NULL DEFAULT '[]',
    status           text NOT NULL DEFAULT 'offline',
    health_index     double precision NOT NULL DEFAULT 100,
    run_hours        double precision NOT NULL DEFAULT 0,
    last_maintenance timestamptz,
    tags             text[] NOT NULL DEFAULT '{}',
    created_by       uuid,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS alerts (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id         uuid REFERENCES devices(id) ON DELETE SET NULL,
    site              text,
    type              text NOT NULL DEFAULT 'predictive',
    severity          text NOT NULL DEFAULT 'warning',
    parameter         text,
    message           text,
    recommendation    text,
    estimated_wastage double precision,
    acknowledged      boolean NOT NULL DEFAULT false,
    acknowledged_by   uuid,
    resolved_at       timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS alerts_created_idx ON alerts (created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS telemetry (
    id                bigserial PRIMARY KEY,
    ts                timestamptz NOT NULL,
    device_id         uuid,
    site              text,
    asset_type        text,
    power             double precision,
    current           double precision,
    voltage           double precision,
    power_factor      double precision,
    temperature       double precision,
    vibration         double precision,
    pressure          double precision,
    flow              double precision,
    energy            double precision,
    rpm               double precision,
    torque            double precision,
    efficiency        double precision,
    steam_consumption double precision,
    custom            jsonb
  )`,
  `CREATE INDEX IF NOT EXISTS telemetry_device_ts_idx ON telemetry (device_id, ts DESC)`,
  `CREATE INDEX IF NOT EXISTS telemetry_site_ts_idx ON telemetry (site, ts)`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id           bigserial PRIMARY KEY,
    received_at  timestamptz NOT NULL DEFAULT now(),
    device_id    uuid,
    site         text,
    asset_type   text,
    protocol     text,
    source       text NOT NULL DEFAULT 'api',
    payload_hash text,
    payload      jsonb
  )`,
  `CREATE INDEX IF NOT EXISTS audit_device_idx ON audit_logs (device_id, received_at DESC)`,
  `CREATE INDEX IF NOT EXISTS audit_received_idx ON audit_logs (received_at DESC)`,
  // Small key/value store used as the cache (latest readings, gateway config, simulator state)
  `CREATE TABLE IF NOT EXISTS kv (
    key        text PRIMARY KEY,
    value      jsonb,
    expires_at timestamptz
  )`,
];

let ready = null;

// Create tables once per server/function instance.
function connectDB() {
  if (!ready) {
    ready = (async () => {
      for (const stmt of SCHEMA) await q(stmt);
      const { seedDemoDevices } = require('../services/dataSimulator');
      await seedDemoDevices();
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

module.exports = { q, connectDB };
