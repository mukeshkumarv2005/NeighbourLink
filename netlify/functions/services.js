const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 🔐 Helper: Auth
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
  const base = event.path.includes('/api/services')
    ? '/api/services'
    : '/.netlify/functions/services';

  const path = event.path.replace(base, '');
  const method = event.httpMethod;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // ================= CATEGORIES =================
    if (method === 'GET' && path === '/categories') {
      const { rows } = await pool.query(
        'SELECT * FROM categories ORDER BY name'
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, categories: rows })
      };
    }

    // ================= PROVIDERS LIST =================
    if (method === 'GET' && path === '/providers') {
      const params = new URLSearchParams(event.queryStringParameters || {});
      const category_id = params.get('category_id');
      const search = params.get('search');
      const min_rating = params.get('min_rating');
      const available_only = params.get('available_only');

      let query = `
        SELECT p.*, u.name, u.email, u.phone, u.avatar,
               c.name as category_name, c.icon as category_icon,
               (SELECT COUNT(*) FROM reviews r WHERE r.provider_id = p.id) as review_count
        FROM providers p
        JOIN users u ON p.user_id = u.id
        JOIN categories c ON p.category_id = c.id
        WHERE 1=1
      `;

      const values = [];
      let i = 1;

      if (category_id) {
        query += ` AND p.category_id = $${i++}`;
        values.push(category_id);
      }

      if (available_only === 'true') {
        query += ` AND p.is_available = true`;
      }

      if (min_rating) {
        query += ` AND p.avg_rating >= $${i++}`;
        values.push(parseFloat(min_rating));
      }

      if (search) {
        query += ` AND (u.name ILIKE $${i} OR c.name ILIKE $${i} OR p.bio ILIKE $${i})`;
        values.push(`%${search}%`);
        i++;
      }

      query += ` ORDER BY p.trust_score DESC, p.avg_rating DESC`;

      const { rows } = await pool.query(query, values);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, providers: rows })
      };
    }

    // ================= SINGLE PROVIDER =================
    if (method === 'GET' && path.startsWith('/providers/')) {
      const id = path.split('/')[2];

      const { rows } = await pool.query(
        `SELECT p.*, u.name, u.email, u.phone, u.avatar,
                u.created_at as member_since,
                c.name as category_name, c.icon as category_icon
         FROM providers p
         JOIN users u ON p.user_id = u.id
         JOIN categories c ON p.category_id = c.id
         WHERE p.id = $1`,
        [id]
      );

      if (rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, message: 'Provider not found' })
        };
      }

      const reviews = await pool.query(
        `SELECT r.*, u.name as reviewer_name
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         WHERE r.provider_id = $1
         ORDER BY r.created_at DESC LIMIT 10`,
        [id]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          provider: rows[0],
          reviews: reviews.rows
        })
      };
    }

    // ================= UPDATE AVAILABILITY =================
    if (method === 'PATCH' && path === '/providers/availability') {
      const user = getUser(event);
      if (!user) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'Unauthorized' })
        };
      }

      const { is_available } = JSON.parse(event.body);

      await pool.query(
        `UPDATE providers SET is_available = $1 WHERE user_id = $2`,
        [is_available, user.id]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Availability updated' })
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
