const mysql = require('mysql2/promise');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });

const pool = mysql.createPool(process.env.MYSQL_URL);

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