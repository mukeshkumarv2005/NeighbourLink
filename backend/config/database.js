const mysql = require('mysql2/promise');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 🔥 ADD THIS TEST
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ DB Connected SUCCESSFULLY");
    conn.release();
  } catch (err) {
    console.error("❌ DB CONNECTION ERROR:", err);
  }
})();

module.exports = pool;