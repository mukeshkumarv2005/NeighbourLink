const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });

const pool = mysql.createPool(process.env.MYSQL_URL);

module.exports = pool;
