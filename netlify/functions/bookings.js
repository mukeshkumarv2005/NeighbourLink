const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 🔐 Helper: Verify JWT
function getUser(event) {
  const auth = event.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

exports.handler = async (event) => {
  const path = event.path.replace('/.netlify/functions/bookings', '');
  const method = event.httpMethod;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const user = getUser(event);

  try {
    // ================= CREATE BOOKING =================
    if (method === 'POST' && path === '') {
      if (!user) {
        return { statusCode: 401, headers, body: JSON.stringify({ message: 'Unauthorized' }) };
      }

      const {
        provider_id,
        category_id,
        service_description,
        scheduled_date,
        scheduled_time,
        address,
        latitude,
        longitude,
        price_estimate,
        notes
      } = JSON.parse(event.body);

      const { rows } = await pool.query(
        `INSERT INTO bookings 
        (user_id, provider_id, category_id, service_description, scheduled_date, scheduled_time, address, latitude, longitude, price_estimate, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [
          user.id,
          provider_id,
          category_id,
          service_description || '',
          scheduled_date,
          scheduled_time,
          address,
          latitude || null,
          longitude || null,
          price_estimate || null,
          notes || null
        ]
      );

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, booking: rows[0] })
      };
    }

    // ================= MY BOOKINGS =================
    if (method === 'GET' && path === '/my') {
      if (!user) {
        return { statusCode: 401, headers, body: JSON.stringify({ message: 'Unauthorized' }) };
      }

      const { rows } = await pool.query(
        `SELECT * FROM bookings 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [user.id]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, bookings: rows })
      };
    }

    // ================= SINGLE BOOKING =================
    if (method === 'GET' && path.startsWith('/')) {
      const id = path.split('/')[1];

      const { rows } = await pool.query(
        `SELECT * FROM bookings WHERE id = $1`,
        [id]
      );

      if (rows.length === 0) {
        return { statusCode: 404, headers, body: JSON.stringify({ message: 'Not found' }) };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, booking: rows[0] })
      };
    }

    // ================= UPDATE STATUS =================
    if (method === 'PATCH' && path.includes('/status')) {
      if (!user) {
        return { statusCode: 401, headers, body: JSON.stringify({ message: 'Unauthorized' }) };
      }

      const id = path.split('/')[1];
      const { status } = JSON.parse(event.body);

      await pool.query(
        `UPDATE bookings SET status = $1 WHERE id = $2`,
        [status, id]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Status updated' })
      };
    }

    // ================= REVIEW =================
    if (method === 'POST' && path.includes('/review')) {
      if (!user) {
        return { statusCode: 401, headers, body: JSON.stringify({ message: 'Unauthorized' }) };
      }

      const id = path.split('/')[1];
      const { rating, review_text } = JSON.parse(event.body);

      await pool.query(
        `INSERT INTO reviews (booking_id, user_id, provider_id, rating, review_text)
         SELECT id, user_id, provider_id, $1, $2 FROM bookings WHERE id = $3`,
        [rating, review_text || '', id]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Review added' })
      };
    }

    // ================= NOTIFICATIONS =================
    if (method === 'GET' && path === '/notifications/all') {
      if (!user) {
        return { statusCode: 401, headers, body: JSON.stringify({ message: 'Unauthorized' }) };
      }

      const { rows } = await pool.query(
        `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
        [user.id]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, notifications: rows })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Route not found' })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
