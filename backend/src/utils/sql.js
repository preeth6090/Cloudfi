// Helpers for building INSERT / UPDATE statements from request bodies.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

// fields: { camelName: [column, type?] }, type is 'json' | 'uuid' | undefined.
function toParam(value, type) {
  if (type === 'json') return JSON.stringify(value ?? null);
  if (type === 'uuid') return isUuid(value) ? value : null;
  return value;
}

const cast = (type) => (type === 'json' ? '::jsonb' : '');

// Columns and values for the fields present in body.
function pick(fields, body) {
  const cols = [];
  const params = [];
  const types = [];
  for (const [key, [col, type]] of Object.entries(fields)) {
    if (body[key] === undefined) continue;
    cols.push(col);
    params.push(toParam(body[key], type));
    types.push(type);
  }
  return { cols, params, types };
}

// INSERT INTO table (...) VALUES (...) RETURNING id
function insertSql(table, fields, body) {
  const { cols, params, types } = pick(fields, body);
  const values = cols.map((_, i) => `$${i + 1}${cast(types[i])}`);
  const text = cols.length
    ? `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${values.join(', ')}) RETURNING id`
    : `INSERT INTO ${table} DEFAULT VALUES RETURNING id`;
  return { text, params };
}

// UPDATE table SET ... WHERE id = $1 RETURNING id  (null when nothing to update)
function updateSql(table, fields, id, body) {
  const { cols, params, types } = pick(fields, body);
  if (!cols.length) return null;
  const sets = cols.map((c, i) => `${c} = $${i + 2}${cast(types[i])}`);
  sets.push('updated_at = now()');
  return {
    text: `UPDATE ${table} SET ${sets.join(', ')} WHERE id = $1 RETURNING id`,
    params: [id, ...params],
  };
}

// Throw a 400 error that the Express error handler turns into a JSON response.
function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function checkEnum(value, allowed, name) {
  if (value !== undefined && !allowed.includes(value)) {
    throw badRequest(`${name} must be one of: ${allowed.join(', ')}`);
  }
}

module.exports = { isUuid, insertSql, updateSql, badRequest, checkEnum };
