const { q } = require('../config/db');
const { isUuid, insertSql, updateSql, checkEnum } = require('../utils/sql');

const ROLES = ['system_admin', 'supervisor', 'energy_analyst', 'viewer'];

const FIELDS = {
  googleId:   ['google_id'],
  email:      ['email'],
  name:       ['name'],
  avatar:     ['avatar'],
  role:       ['role'],
  siteAccess: ['site_access'],
  isActive:   ['is_active'],
  lastLogin:  ['last_login'],
};

function toUser(r, { withGoogleId = true } = {}) {
  if (!r) return null;
  const u = {
    _id:        r.id,
    email:      r.email,
    name:       r.name,
    avatar:     r.avatar,
    role:       r.role,
    siteAccess: r.site_access || [],
    isActive:   r.is_active,
    lastLogin:  r.last_login,
    createdAt:  r.created_at,
    updatedAt:  r.updated_at,
  };
  if (withGoogleId) u.googleId = r.google_id;
  return u;
}

function validate(body) {
  checkEnum(body.role, ROLES, 'role');
  if (typeof body.email === 'string') body.email = body.email.toLowerCase();
}

async function findById(id, opts) {
  if (!isUuid(id)) return null;
  const rows = await q('SELECT * FROM users WHERE id = $1', [id]);
  return toUser(rows[0], opts);
}

async function findOne({ email, googleId }) {
  const rows = email !== undefined
    ? await q('SELECT * FROM users WHERE email = $1', [String(email).toLowerCase()])
    : await q('SELECT * FROM users WHERE google_id = $1', [googleId]);
  return toUser(rows[0]);
}

async function count() {
  const rows = await q('SELECT count(*)::int AS n FROM users');
  return rows[0].n;
}

async function create(body) {
  validate(body);
  const { text, params } = insertSql('users', FIELDS, body);
  const rows = await q(text, params);
  return findById(rows[0].id);
}

async function update(id, body, opts) {
  if (!isUuid(id)) return null;
  validate(body);
  const stmt = updateSql('users', FIELDS, id, body);
  if (stmt) {
    const rows = await q(stmt.text, stmt.params);
    if (!rows.length) return null;
  }
  return findById(id, opts);
}

async function list(opts) {
  const rows = await q('SELECT * FROM users ORDER BY created_at DESC');
  return rows.map((r) => toUser(r, opts));
}

async function remove(id) {
  if (!isUuid(id)) return;
  await q('DELETE FROM users WHERE id = $1', [id]);
}

module.exports = { ROLES, findById, findOne, count, create, update, list, remove };
