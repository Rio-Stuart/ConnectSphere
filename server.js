// server.js — ConnectSphere Express Backend (MySQL 8.0 Version)
// Every endpoint executes queries against MySQL and returns { data, query, params }
// for real-time DBMS academic visualization and demonstration.
// ====================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const netlifyDb = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── MySQL Connection Pool ─────────────────────────────────────
const dbConfig = {
  host:               process.env.DB_HOST || 'localhost',
  port:               Number(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME || 'connectsphere',
  waitForConnections: true,
  connectionLimit:    process.env.NETLIFY ? 5 : 15,
  queueLimit:         0,
  enableKeepAlive:    true,
  keepAliveInitialDelay: 0,
  dateStrings:        true, // Return timestamps as formatted strings matching SQL
  ssl:                process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
};

const pool = mysql.createPool(dbConfig);

// ── In-Memory SQL Query Logger ────────────────────────────────
let queryLog = [];

/**
 * Execute a query against Netlify Database (PostgreSQL) or MySQL,
 * log it, and return { rows, fields, query, params, insertId, affectedRows }
 */
async function runQuery(sql, params = []) {
  const trimmed = sql.trimStart();
  const type = trimmed.split(/\s/)[0].toUpperCase();

  // If Netlify Database is active (Netlify environment or NETLIFY_DB_URL is set)
  const isNetlifyDbActive = Boolean(process.env.NETLIFY || process.env.NETLIFY_DB_URL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (isNetlifyDbActive) {
    try {
      const result = await netlifyDb.executeQuery(sql, params);
      const entry = {
        id:        queryLog.length + 1,
        type,
        query:     result.query,
        params:    result.params,
        timestamp: new Date().toISOString()
      };
      queryLog.push(entry);
      return {
        rows: result.rows,
        fields: result.fields,
        query: result.query,
        params: result.params,
        insertId: result.insertId,
        affectedRows: result.rowCount
      };
    } catch (netErr) {
      console.warn('⚠️ Netlify Database query failed, attempting MySQL fallback:', netErr.message);
    }
  }

  // MySQL Connection Pool fallback
  const entry = {
    id:        queryLog.length + 1,
    type,
    query:     sql,
    params:    params || [],
    timestamp: new Date().toISOString()
  };
  queryLog.push(entry);

  const [rows, fields] = await pool.query(sql, params);
  const insertId = rows && (rows.insertId || (Array.isArray(rows) && rows[0] && rows[0].id));
  const affectedRows = rows && rows.affectedRows;
  return { rows, fields, query: sql, params, insertId, affectedRows };
}

// ── Automatic Database & Schema Verification ──────────────────
async function initDatabase() {
  try {
    const conn = await pool.getConnection();
    conn.release();
    console.log(`✅ Connected to MySQL database "${dbConfig.database}" at ${dbConfig.host}:${dbConfig.port}`);
  } catch (err) {
    if (err.code === 'ER_BAD_DB_ERROR') {
      console.log(`⚡ Database "${dbConfig.database}" does not exist. Initializing schema...`);
      try {
        const rootConn = await mysql.createConnection({
          host:               dbConfig.host,
          port:               dbConfig.port,
          user:               dbConfig.user,
          password:           dbConfig.password,
          multipleStatements: true
        });
        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
        await rootConn.query(schemaSql);
        await rootConn.end();
        console.log(`✅ Database "${dbConfig.database}" created and seeded successfully!`);
      } catch (seedErr) {
        console.error('❌ Failed to auto-initialize schema:', seedErr.message);
      }
    } else {
      console.error('⚠️ MySQL Connection Notice:', err.message);
      console.error('💡 To connect, please provide your MySQL root password in .env:');
      console.error('   DB_HOST=localhost');
      console.error('   DB_PORT=3306');
      console.error('   DB_USER=root');
      console.error('   DB_PASSWORD=<your_mysql_password>');
      console.error('   DB_NAME=connectsphere\n');
    }
  }
}

initDatabase();

// ══════════════════════════════════════════════════════════════
//  API ROUTES
// ══════════════════════════════════════════════════════════════

// ── Users ─────────────────────────────────────────────────────

// GET /api/users — list all users
app.get('/api/users', async (_req, res) => {
  try {
    const sql = `
      SELECT user_id, username, email, bio, avatar, created_at,
             (LOWER(username) = 'admin' OR is_admin = 1) AS is_admin
      FROM Users
      ORDER BY created_at DESC`;
    const { rows, query, params } = await runQuery(sql);
    res.json({ data: rows, query, params });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id — single user profile with relational counts
app.get('/api/users/:id', async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const viewerId = Number(req.query.viewer_id) || 0;

    const sql = `
      SELECT u.user_id, u.username, u.email, u.bio, u.avatar, u.created_at,
             (LOWER(u.username) = 'admin' OR u.is_admin = 1) AS is_admin,
             (SELECT COUNT(*) FROM Followers WHERE following_id = u.user_id) AS follower_count,
             (SELECT COUNT(*) FROM Followers WHERE follower_id  = u.user_id) AS following_count,
             (SELECT COUNT(*) FROM Posts     WHERE user_id      = u.user_id) AS post_count,
             (SELECT COUNT(*) FROM Followers WHERE follower_id = ? AND following_id = u.user_id) > 0 AS is_following
      FROM Users u
      WHERE u.user_id = ?`;
    const { rows, query, params } = await runQuery(sql, [viewerId, targetId]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ data: rows[0], query, params });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users — register new user
app.post('/api/users', async (req, res) => {
  try {
    const { username, email, bio, avatar } = req.body;
    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' });
    }
    const sql = 'INSERT INTO Users (username, email, bio, avatar) VALUES (?, ?, ?, ?)';
    const { rows, query, params, insertId } = await runQuery(sql, [username, email, bio || null, avatar || '👤']);
    const newUserId = insertId || (rows && (rows.insertId || (rows[0] && rows[0].user_id)));
    res.status(201).json({
      data: { user_id: newUserId, username, email, bio, avatar },
      query,
      params
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || err.message.includes('Duplicate entry')) {
      return res.status(409).json({ error: 'Username or email already exists (UNIQUE constraint violation)', sqlError: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/login — user authentication
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required' });
    if (!password) return res.status(400).json({ error: 'Password is required' });

    const trimmedUser = username.trim();
    const isAdminUser = trimmedUser.toLowerCase() === 'admin';

    if (isAdminUser) {
      if (password !== 'admin') {
        return res.status(401).json({ error: 'Incorrect password for admin account.' });
      }
    } else {
      if (password !== 'dbms') {
        return res.status(401).json({ error: 'Incorrect password! All regular accounts use password: dbms' });
      }
    }

    const sql = 'SELECT user_id, username, email, bio, avatar, created_at, is_admin FROM Users WHERE LOWER(username) = LOWER(?)';
    const { rows, query, params } = await runQuery(sql, [trimmedUser]);
    if (rows.length === 0) {
      return res.status(404).json({ error: `User "@${trimmedUser}" not found in Users database table.` });
    }

    const userRecord = {
      ...rows[0],
      is_admin: Boolean(isAdminUser || rows[0].is_admin)
    };

    res.json({
      data: userRecord,
      query,
      params,
      message: isAdminUser ? 'Admin authentication successful — DBA privileges granted' : 'Authentication successful'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── File & Image Uploads ──────────────────────────────────────

// POST /api/upload — upload file attachment
app.post('/api/upload', (req, res) => {
  try {
    const { fileName, fileType, fileData } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ error: 'File name and data are required' });
    }

    // In serverless environments (Netlify), disk writes to public/ are ephemeral.
    const isServerless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
    if (isServerless) {
      return res.json({
        data: {
          media_url: fileData, // Stored as base64 Data URI directly in MySQL
          file_name: fileName,
          file_type: fileType || 'application/octet-stream'
        },
        message: 'File processed for serverless deployment'
      });
    }

    const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
    const ext = path.extname(fileName) || (fileType && fileType.startsWith('image/') ? '.jpg' : '.bin');
    const safeBase = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueName = `${Date.now()}_${safeBase}${ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueName);

    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const media_url = `/uploads/${uniqueName}`;
    res.json({
      data: {
        media_url,
        file_name: fileName,
        file_type: fileType || 'application/octet-stream'
      },
      message: 'File uploaded successfully'
    });
  } catch (err) {
    if (req.body && req.body.fileData) {
      return res.json({
        data: {
          media_url: req.body.fileData,
          file_name: req.body.fileName,
          file_type: req.body.fileType || 'application/octet-stream'
        },
        message: 'File stored as data payload'
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── Posts ─────────────────────────────────────────────────────

// GET /api/posts — filtered feed
app.get('/api/posts', async (req, res) => {
  try {
    const { filter = 'all', user_id, author_id } = req.query;
    const currentUser = user_id ? Number(user_id) : 0;
    const targetAuthor = author_id ? Number(author_id) : null;

    let whereClause = '';
    let params = [currentUser, currentUser, currentUser];

    if (targetAuthor) {
      whereClause = 'WHERE p.user_id = ?';
      params.push(targetAuthor);
    } else if (filter === 'following' && currentUser) {
      whereClause = 'WHERE p.user_id IN (SELECT following_id FROM Followers WHERE follower_id = ?)';
      params.push(currentUser);
    } else if (filter === 'my' && currentUser) {
      whereClause = 'WHERE p.user_id = ?';
      params.push(currentUser);
    }

    const sql = `
      SELECT p.*, u.username, u.avatar,
             (SELECT COUNT(*) FROM Likes    WHERE post_id = p.post_id)                         AS like_count,
             (SELECT COUNT(*) FROM Comments WHERE post_id = p.post_id)                         AS comment_count,
             (SELECT COUNT(*) FROM Likes    WHERE post_id = p.post_id AND user_id = ?) > 0     AS liked_by_user,
             (SELECT COUNT(*) FROM Likes    WHERE post_id = p.post_id AND user_id = ?) > 0     AS user_liked,
             (SELECT COUNT(*) FROM Followers WHERE follower_id = ? AND following_id = p.user_id) > 0 AS is_following
      FROM Posts p
      JOIN Users u ON p.user_id = u.user_id
      ${whereClause}
      ORDER BY p.created_at DESC`;

    const { rows, query } = await runQuery(sql, params);
    res.json({ data: rows, query, params });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts — publish new post
app.post('/api/posts', async (req, res) => {
  try {
    const { user_id, content, media_url, file_name, file_type } = req.body;
    if (!user_id || (!content && !media_url)) {
      return res.status(400).json({ error: 'User ID and post content or attachment are required' });
    }

    const sql = 'INSERT INTO Posts (user_id, content, media_url, file_name, file_type) VALUES (?, ?, ?, ?, ?)';
    const { rows, query, params, insertId } = await runQuery(sql, [
      user_id,
      content || '',
      media_url || null,
      file_name || null,
      file_type || null
    ]);

    const newPostId = insertId || (rows && (rows.insertId || (rows[0] && rows[0].post_id)));
    res.status(201).json({
      data: {
        post_id: newPostId,
        user_id,
        content,
        media_url,
        file_name,
        file_type
      },
      query,
      params
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/posts/:id — delete post (triggers ON DELETE CASCADE in MySQL)
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const sql = 'DELETE FROM Posts WHERE post_id = ?';
    const { rows, query, params } = await runQuery(sql, [postId]);
    if (rows.affectedRows === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ data: { post_id: postId }, query, params, message: 'Post deleted (ON DELETE CASCADE triggered)' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Likes ─────────────────────────────────────────────────────

// POST /api/posts/:id/like — toggle like
app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const checkSql = 'SELECT like_id FROM Likes WHERE post_id = ? AND user_id = ?';
    const { rows: existing } = await runQuery(checkSql, [postId, user_id]);

    if (existing.length > 0) {
      const deleteSql = 'DELETE FROM Likes WHERE post_id = ? AND user_id = ?';
      const { query, params } = await runQuery(deleteSql, [postId, user_id]);
      return res.json({ data: { action: 'unliked', post_id: postId, user_id }, query, params });
    } else {
      const insertSql = 'INSERT INTO Likes (post_id, user_id) VALUES (?, ?)';
      const { rows, query, params, insertId } = await runQuery(insertSql, [postId, user_id]);
      const newLikeId = insertId || (rows && (rows.insertId || (rows[0] && rows[0].like_id)));
      return res.status(201).json({ data: { action: 'liked', like_id: newLikeId, post_id: postId, user_id }, query, params });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Comments ──────────────────────────────────────────────────

// GET /api/posts/:id/comments — list comments on post
app.get('/api/posts/:id/comments', async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const sql = `
      SELECT c.*, u.username, u.avatar
      FROM Comments c
      JOIN Users u ON c.user_id = u.user_id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC`;
    const { rows, query, params } = await runQuery(sql, [postId]);
    res.json({ data: rows, query, params });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts/:id/comments — add comment
app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const { user_id, comment_text } = req.body;
    if (!user_id || !comment_text) {
      return res.status(400).json({ error: 'user_id and comment_text are required' });
    }

    const sql = 'INSERT INTO Comments (post_id, user_id, comment_text) VALUES (?, ?, ?)';
    const { rows, query, params, insertId } = await runQuery(sql, [postId, user_id, comment_text]);
    const newCommentId = insertId || (rows && (rows.insertId || (rows[0] && rows[0].comment_id)));
    res.status(201).json({
      data: { comment_id: newCommentId, post_id: postId, user_id, comment_text },
      query,
      params
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Followers ─────────────────────────────────────────────────

// POST /api/followers — toggle follow / unfollow
app.post('/api/followers', async (req, res) => {
  try {
    const { follower_id, following_id } = req.body;
    if (!follower_id || !following_id) {
      return res.status(400).json({ error: 'follower_id and following_id are required' });
    }
    if (Number(follower_id) === Number(following_id)) {
      return res.status(400).json({ error: "Cannot follow yourself (CHECK constraint violation)" });
    }

    const checkSql = 'SELECT id FROM Followers WHERE follower_id = ? AND following_id = ?';
    const { rows: existing } = await runQuery(checkSql, [follower_id, following_id]);

    if (existing.length > 0) {
      const deleteSql = 'DELETE FROM Followers WHERE follower_id = ? AND following_id = ?';
      const { query, params } = await runQuery(deleteSql, [follower_id, following_id]);
      return res.json({ data: { action: 'unfollowed', follower_id, following_id }, query, params });
    } else {
      const insertSql = 'INSERT INTO Followers (follower_id, following_id) VALUES (?, ?)';
      const { rows, query, params, insertId } = await runQuery(insertSql, [follower_id, following_id]);
      const newFollowId = insertId || (rows && (rows.insertId || (rows[0] && rows[0].id)));
      return res.status(201).json({ data: { action: 'followed', id: newFollowId, follower_id, following_id }, query, params });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Live Database Table Inspector ─────────────────────────────

app.get('/api/tables/:tableName', async (req, res) => {
  try {
    const allowed = ['users', 'posts', 'comments', 'likes', 'followers'];
    const table = req.params.tableName.toLowerCase();
    if (!allowed.includes(table)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    const actualNames = {
      users: 'Users',
      posts: 'Posts',
      comments: 'Comments',
      likes: 'Likes',
      followers: 'Followers'
    };
    const tableName = actualNames[table];
    const sql = `SELECT * FROM ${tableName}`;
    const { rows, query, params } = await runQuery(sql);
    res.json({ data: rows, query, params });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Analytical DBMS Queries ───────────────────────────────────

// Q1: Newsfeed — Multi-table JOIN
app.get('/api/analytics/newsfeed', async (_req, res) => {
  try {
    const sql = `
      SELECT p.post_id, p.content, p.media_url, p.file_name, p.created_at,
             u.username, u.avatar,
             (SELECT COUNT(*) FROM Likes WHERE post_id = p.post_id) AS like_count,
             (SELECT COUNT(*) FROM Comments WHERE post_id = p.post_id) AS comment_count
      FROM Posts p
      JOIN Users u ON p.user_id = u.user_id
      ORDER BY p.created_at DESC
      LIMIT 20`;
    const { rows, query, params } = await runQuery(sql);
    res.json({ data: rows, query, params });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Q2: Top Liked Posts — LEFT JOIN + GROUP BY
app.get('/api/analytics/top-liked', async (_req, res) => {
  try {
    const sql = `
      SELECT p.post_id, p.content, u.username, COUNT(l.like_id) AS total_likes
      FROM Posts p
      JOIN Users u ON p.user_id = u.user_id
      LEFT JOIN Likes l ON p.post_id = l.post_id
      GROUP BY p.post_id, p.content, u.username
      ORDER BY total_likes DESC
      LIMIT 5`;
    const { rows, query, params } = await runQuery(sql);
    res.json({ data: rows, query, params });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Q3: Most Followed Users — Subquery
app.get('/api/analytics/most-followed', async (_req, res) => {
  try {
    const sql = `
      SELECT u.user_id, u.username, u.bio,
             (SELECT COUNT(*) FROM Followers WHERE following_id = u.user_id) AS follower_count
      FROM Users u
      ORDER BY follower_count DESC
      LIMIT 5`;
    const { rows, query, params } = await runQuery(sql);
    res.json({ data: rows, query, params });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Q4: Post Comments — JOIN with Users
app.get('/api/analytics/post-comments/:postId', async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    const sql = `
      SELECT c.comment_id, c.comment_text, c.created_at, u.username, u.avatar
      FROM Comments c
      JOIN Users u ON c.user_id = u.user_id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC`;
    const { rows, query, params } = await runQuery(sql, [postId]);
    res.json({ data: rows, query, params });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Q5: User Engagement — Aggregate View
app.get('/api/analytics/engagement', async (_req, res) => {
  try {
    const sql = `
      SELECT u.user_id, u.username,
             (SELECT COUNT(*) FROM Posts WHERE user_id = u.user_id) AS posts_count,
             (SELECT COUNT(*) FROM Likes WHERE user_id = u.user_id) AS likes_given,
             (SELECT COUNT(*) FROM Comments WHERE user_id = u.user_id) AS comments_made
      FROM Users u
      ORDER BY posts_count DESC`;
    const { rows, query, params } = await runQuery(sql);
    res.json({ data: rows, query, params });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Query Logger Management ───────────────────────────────────

app.get('/api/query-log', (_req, res) => {
  res.json({ data: queryLog });
});

app.delete('/api/query-log', (_req, res) => {
  queryLog = [];
  res.json({ data: null, message: 'Query log cleared' });
});

// ── Reset Database ────────────────────────────────────────────

app.post('/api/reset', async (_req, res) => {
  try {
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');

    const resetConn = await mysql.createConnection({
      host:               dbConfig.host,
      port:               dbConfig.port,
      user:               dbConfig.user,
      password:           dbConfig.password,
      multipleStatements: true
    });
    await resetConn.query(sql);
    await resetConn.end();

    queryLog = [];
    res.json({
      data: null,
      message: 'Database reset to initial MySQL seed state',
      query: '-- Executed full schema.sql in MySQL (DROP + CREATE + INSERT seed data)',
      params: []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Fallback Route ────────────────────────────────────────────
app.get('*', (_req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).json({ message: 'ConnectSphere MySQL API is running.' });
  }
});

// ── Start Server (when run directly) ──────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 ConnectSphere server running on MySQL at http://localhost:${PORT}`);
  });
}

// Export app for Netlify Serverless Functions
module.exports = app;
