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
  const base = event.path.includes('/api/bookings')
    ? '/api/bookings'
    : '/.netlify/functions/bookings';

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

    // ================= MY BOOKINGS (for customers) =================
    if (method === 'GET' && path === '/my') {
      if (!user) {
        return { statusCode: 401, headers, body: JSON.stringify({ message: 'Unauthorized' }) };
      }

      const { rows } = await pool.query(
        `SELECT b.*,
                c.name as service_name, c.icon as service_icon,
                pu.name as provider_name, pu.phone as provider_phone,
                cu.name as customer_name, cu.phone as customer_phone
         FROM bookings b
         JOIN categories c ON b.category_id = c.id
         JOIN providers p ON b.provider_id = p.id
         JOIN users pu ON p.user_id = pu.id
         JOIN users cu ON b.user_id = cu.id
         WHERE b.user_id = $1
         ORDER BY b.created_at DESC`,
        [user.id]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, bookings: rows })
      };
    }

    // ================= PROVIDER BOOKINGS =================
    if (method === 'GET' && path === '/provider') {
      if (!user) {
        return { statusCode: 401, headers, body: JSON.stringify({ message: 'Unauthorized' }) };
      }

      // Find the provider record for this user
      const providerResult = await pool.query(
        'SELECT id FROM providers WHERE user_id = $1',
        [user.id]
      );

      if (providerResult.rows.length === 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, bookings: [] })
        };
      }

      const providerId = providerResult.rows[0].id;

      const { rows } = await pool.query(
        `SELECT b.*,
                c.name as service_name, c.icon as service_icon,
                pu.name as provider_name, pu.phone as provider_phone,
                cu.name as customer_name, cu.phone as customer_phone
         FROM bookings b
         JOIN categories c ON b.category_id = c.id
         JOIN providers p ON b.provider_id = p.id
         JOIN users pu ON p.user_id = pu.id
         JOIN users cu ON b.user_id = cu.id
         WHERE b.provider_id = $1
         ORDER BY b.created_at DESC`,
        [providerId]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, bookings: rows })
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

    // ================= UPDATE STATUS =================
    if (method === 'PATCH' && path.includes('/status')) {
      if (!user) {
        return { statusCode: 401, headers, body: JSON.stringify({ message: 'Unauthorized' }) };
      }

      const id = path.split('/')[1];
      const { status } = JSON.parse(event.body);

      await pool.query(
        `UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2`,
        [status, id]
      );

      // Recalculate provider's job counts from bookings
      const bookingResult = await pool.query('SELECT provider_id FROM bookings WHERE id = $1', [id]);
      if (bookingResult.rows.length > 0) {
        const providerId = bookingResult.rows[0].provider_id;
        await pool.query(
          `UPDATE providers SET
            total_jobs = (SELECT COUNT(*) FROM bookings WHERE provider_id = $1 AND status IN ('accepted', 'completed')),
            completed_jobs = (SELECT COUNT(*) FROM bookings WHERE provider_id = $1 AND status = 'completed')
          WHERE id = $1`,
          [providerId]
        );
      }

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
      const { rating, quality_rating, punctuality_rating, communication_rating, review_text } = JSON.parse(event.body);

      // Get the provider_id from the booking
      const bookingResult = await pool.query('SELECT provider_id FROM bookings WHERE id = $1', [parseInt(id)]);
      if (bookingResult.rows.length === 0) {
        return { statusCode: 404, headers, body: JSON.stringify({ success: false, message: 'Booking not found' }) };
      }
      const providerId = bookingResult.rows[0].provider_id;

      // Insert the review
      await pool.query(
        `INSERT INTO reviews (booking_id, user_id, provider_id, rating, quality_rating, punctuality_rating, communication_rating, review_text)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          parseInt(id),
          user.id,
          providerId,
          rating,
          quality_rating || rating,
          punctuality_rating || rating,
          communication_rating || rating,
          review_text || ''
        ]
      );

      // Recalculate provider's avg_rating and trust_score from all reviews
      const statsResult = await pool.query(
        `SELECT 
          COALESCE(AVG(rating), 0) as avg_rating,
          COALESCE(AVG(quality_rating), 0) as avg_quality,
          COALESCE(AVG(punctuality_rating), 0) as avg_punctuality,
          COALESCE(AVG(communication_rating), 0) as avg_communication,
          COUNT(*) as review_count
        FROM reviews WHERE provider_id = $1`,
        [providerId]
      );

      const stats = statsResult.rows[0];
      const avgRating = parseFloat(stats.avg_rating);

      // Get job completion stats
      const jobStats = await pool.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status IN ('accepted', 'completed')) as total_jobs,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs
        FROM bookings WHERE provider_id = $1`,
        [providerId]
      );

      const totalJobs = parseInt(jobStats.rows[0].total_jobs) || 0;
      const completedJobs = parseInt(jobStats.rows[0].completed_jobs) || 0;
      const completionRate = totalJobs > 0 ? completedJobs / totalJobs : 0;

      // Trust Score = 40% rating + 30% completion rate + 20% responsiveness + 10% review count
      const trustScore = Math.min(10,
        (avgRating / 5 * 10 * 0.4) +          // 40% from rating (scaled to 10)
        (completionRate * 10 * 0.3) +           // 30% from completion rate
        (3.0) +                                 // 20% default responsiveness (decent)
        (Math.min(stats.review_count, 10) / 10 * 10 * 0.1)  // 10% from review count (cap at 10)
      );

      await pool.query(
        `UPDATE providers SET 
          avg_rating = $1, 
          trust_score = $2,
          total_jobs = $3,
          completed_jobs = $4
        WHERE id = $5`,
        [
          avgRating.toFixed(2),
          trustScore.toFixed(2),
          totalJobs,
          completedJobs,
          providerId
        ]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Review added' })
      };
    }

    // ================= SINGLE BOOKING =================
    if (method === 'GET' && path.startsWith('/')) {
      const id = path.split('/')[1];
      if (!id || id === '') {
        return { statusCode: 404, headers, body: JSON.stringify({ message: 'Not found' }) };
      }

      const { rows } = await pool.query(
        `SELECT b.*,
                c.name as service_name, c.icon as service_icon,
                pu.name as provider_name, pu.phone as provider_phone,
                cu.name as customer_name, cu.phone as customer_phone
         FROM bookings b
         JOIN categories c ON b.category_id = c.id
         JOIN providers p ON b.provider_id = p.id
         JOIN users pu ON p.user_id = pu.id
         JOIN users cu ON b.user_id = cu.id
         WHERE b.id = $1`,
        [id]
      );

      if (rows.length === 0) {
        return { statusCode: 404, headers, body: JSON.stringify({ success: false, message: 'Not found' }) };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, booking: rows[0] })
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
