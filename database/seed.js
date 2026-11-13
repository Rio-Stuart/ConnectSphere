// database/seed.js — Run schema.sql against MySQL to set up the ConnectSphere DB
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs    = require('fs');
const path  = require('path');
const mysql = require('mysql2/promise');

async function seed() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  const config = {
    host:               process.env.DB_HOST || 'localhost',
    port:               Number(process.env.DB_PORT) || 3306,
    user:               process.env.DB_USER || 'root',
    password:           process.env.DB_PASSWORD || '',
    multipleStatements: true
  };

  console.log(`🔌 Connecting to MySQL server at ${config.host}:${config.port} as '${config.user}'...`);

  let connection;
  try {
    connection = await mysql.createConnection(config);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('\n💡 Tip: Make sure your MySQL credentials in .env are correct:');
    console.error('   DB_HOST=localhost');
    console.error('   DB_PORT=3306');
    console.error('   DB_USER=root');
    console.error('   DB_PASSWORD=<your_mysql_password>');
    console.error('   DB_NAME=connectsphere\n');
    process.exit(1);
  }

  console.log('⏳ Executing schema.sql (Database, Tables, Constraints & Seed Data)...');
  await connection.query(sql);

  // Switch to connectsphere and verify counts
  await connection.query('USE connectsphere;');
  const [[users]]     = await connection.query('SELECT COUNT(*) AS count FROM Users');
  const [[posts]]     = await connection.query('SELECT COUNT(*) AS count FROM Posts');
  const [[comments]]  = await connection.query('SELECT COUNT(*) AS count FROM Comments');
  const [[likes]]     = await connection.query('SELECT COUNT(*) AS count FROM Likes');
  const [[followers]] = await connection.query('SELECT COUNT(*) AS count FROM Followers');

  console.log('✅ Database "connectsphere" initialized and seeded successfully in MySQL:');
  console.log(`   - Users:     ${users.count} records`);
  console.log(`   - Posts:     ${posts.count} records (with image attachments)`);
  console.log(`   - Comments:  ${comments.count} records`);
  console.log(`   - Likes:     ${likes.count} records`);
  console.log(`   - Followers: ${followers.count} records`);

  await connection.end();
}

seed().catch(err => {
  console.error('❌ Seed execution failed:', err.message);
  process.exit(1);
});
