const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
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
  const base = event.path.includes('/api/auth')
    ? '/api/auth'
    : '/.netlify/functions/auth';

  const path = event.path.replace(base, '');
  const method = event.httpMethod;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // ================= REGISTER =================
    if (method === 'POST' && path === '/register') {
      const { name, email, password, phone, address, role, category_id, experience_years, hourly_rate, bio } = JSON.parse(event.body);

      // Validate required fields
      if (!name || !email || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, message: 'Name, email, and password are required.' })
        };
      }

      if (password.length < 6) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, message: 'Password must be at least 6 characters.' })
        };
      }

      // Check if email already exists
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ success: false, message: 'An account with this email already exists.' })
        };
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Determine the role (default to 'user')
      const userRole = role === 'provider' ? 'provider' : 'user';

      // Insert the user
      const userResult = await pool.query(
        `INSERT INTO users (name, email, password, role, phone, address)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, email, role, phone, address, avatar, is_active, created_at`,
        [name, email, hashedPassword, userRole, phone || null, address || null]
      );

      const user = userResult.rows[0];

      // If provider, also create the providers table entry
      if (userRole === 'provider') {
        if (!category_id) {
          // Rollback: delete the user we just created
          await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, message: 'Service category is required for providers.' })
          };
        }

        await pool.query(
          `INSERT INTO providers (user_id, category_id, bio, experience_years, hourly_rate)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            user.id,
            parseInt(category_id),
            bio || '',
            parseInt(experience_years) || 0,
            parseFloat(hourly_rate) || 0
          ]
        );
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, token, user })
      };
    }

    // ================= LOGIN =================
    if (method === 'POST' && path === '/login') {
      const { email, password } = JSON.parse(event.body);

      const { rows } = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (rows.length === 0) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ success: false, message: 'Invalid credentials' })
        };
      }

      const user = rows[0];
      const valid = await bcrypt.compare(password, user.password);

      if (!valid) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ success: false, message: 'Invalid credentials' })
        };
      }

      // Don't send password hash back to the client
      delete user.password;

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, token, user })
      };
    }

    // ================= PROFILE =================
    if (method === 'GET' && path === '/profile') {
      const user = getUser(event);
      if (!user) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ success: false, message: 'Unauthorized' })
        };
      }

      const { rows } = await pool.query(
        'SELECT id, name, email, role, phone, address, avatar, is_active, created_at FROM users WHERE id = $1',
        [user.id]
      );

      if (rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, message: 'User not found' })
        };
      }

      const userData = rows[0];

      // If provider, also fetch provider profile data
      if (userData.role === 'provider') {
        const providerResult = await pool.query(
          `SELECT p.*, c.name as category_name, c.icon as category_icon
           FROM providers p
           JOIN categories c ON p.category_id = c.id
           WHERE p.user_id = $1`,
          [userData.id]
        );
        if (providerResult.rows.length > 0) {
          userData.provider = providerResult.rows[0];
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, user: userData })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Not found' })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};