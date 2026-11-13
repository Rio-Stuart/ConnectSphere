// db/index.js — Netlify Database (PostgreSQL) Manager for ConnectSphere
const { getDatabase, getConnectionString } = require('@netlify/database');
const { Pool } = require('pg');

let pool = null;

function getDbPool() {
  if (pool) return pool;

  // 1. Try getDatabase() from @netlify/database
  try {
    const db = getDatabase();
    if (db && db.pool) {
      pool = db.pool;
      return pool;
    }
  } catch (err) {
    // Continue to connection string resolution
  }

  // 2. Try NETLIFY_DB_URL or getConnectionString()
  let connStr = process.env.NETLIFY_DB_URL;
  if (!connStr) {
    try {
      connStr = getConnectionString();
    } catch (e) {
      connStr = null;
    }
  }

  if (connStr) {
    pool = new Pool({
      connectionString: connStr,
      ssl: connStr.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 10
    });
    return pool;
  }

  return null;
}

/**
 * Execute a query on Netlify Database, converting '?' to '$1, $2...' for Postgres
 * and returning { rows, fields, rowCount, query, params, insertId }
 */
async function executeQuery(rawSql, params = []) {
  const activePool = getDbPool();
  if (!activePool) {
    throw new Error('Netlify Database connection not initialized. Please ensure NETLIFY_DB_URL is set or Netlify CLI is active.');
  }

  // Auto-append RETURNING * to INSERT queries so generated primary keys are returned
  let sqlToRun = rawSql.trim();
  const isInsert = /^\s*INSERT\s+INTO/i.test(sqlToRun);
  if (isInsert && !/RETURNING/i.test(sqlToRun)) {
    sqlToRun = sqlToRun.replace(/;?\s*$/, ' RETURNING *;');
  }

  // Convert '?' placeholders to PostgreSQL '$1, $2, $3...'
  let paramIndex = 1;
  const pgSql = sqlToRun.replace(/\?/g, () => `$${paramIndex++}`);

  const res = await activePool.query(pgSql, params);
  const rows = res.rows || [];
  
  // Extract generated primary key if this was an INSERT
  let insertId = null;
  if (isInsert && rows.length > 0) {
    const firstRow = rows[0];
    insertId = firstRow.user_id || firstRow.post_id || firstRow.comment_id || firstRow.like_id || firstRow.id || null;
  }

  return {
    rows,
    fields: res.fields || [],
    rowCount: res.rowCount,
    insertId,
    query: pgSql,
    params: params || []
  };
}

module.exports = {
  getDbPool,
  executeQuery
};
