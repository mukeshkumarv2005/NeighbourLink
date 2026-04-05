const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth } = require('../middleware/auth');

// Create booking (user)
router.post('/', auth, async (req, res) => {
  try {
    const { provider_id, category_id, service_description, scheduled_date, scheduled_time, address, latitude, longitude, price_estimate, notes } = req.body;
    
    if (!provider_id || !category_id || !scheduled_date || !scheduled_time || !address) {
      return res.status(400).json({ success: false, message: 'Missing required booking fields.' });
    }
    
    const [result] = await db.query(
      `INSERT INTO bookings (user_id, provider_id, category_id, service_description, scheduled_date, scheduled_time, address, latitude, longitude, price_estimate, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, provider_id, category_id, service_description || '', scheduled_date, scheduled_time, address, latitude || null, longitude || null, price_estimate || null, notes || null]
    );
    
    // Update provider total_jobs
    await db.query('UPDATE providers SET total_jobs = total_jobs + 1 WHERE id = ?', [provider_id]);
    
    // Create notification for provider
    const [providerUser] = await db.query('SELECT user_id FROM providers WHERE id = ?', [provider_id]);
    if (providerUser.length > 0) {
      await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [providerUser[0].user_id, 'New Booking Request', `You have a new booking request for ${scheduled_date}`, 'booking']
      );
    }
    
    res.status(201).json({ success: true, message: 'Booking created successfully!', booking_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Get user's bookings
router.get('/my', auth, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'user') {
      query = `SELECT b.*, u.name as provider_name, u.phone as provider_phone, c.name as service_name, c.icon as service_icon
               FROM bookings b JOIN providers p ON b.provider_id = p.id JOIN users u ON p.user_id = u.id
               JOIN categories c ON b.category_id = c.id WHERE b.user_id = ? ORDER BY b.created_at DESC`;
      params = [req.user.id];
    } else {
      query = `SELECT b.*, u.name as customer_name, u.phone as customer_phone, c.name as service_name, c.icon as service_icon
               FROM bookings b JOIN users u ON b.user_id = u.id JOIN categories c ON b.category_id = c.id
               JOIN providers p ON b.provider_id = p.id WHERE p.user_id = ? ORDER BY b.created_at DESC`;
      params = [req.user.id];
    }
    const [bookings] = await db.query(query, params);
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Get single booking
router.get('/:id', auth, async (req, res) => {
  try {
    const [bookings] = await db.query(
      `SELECT b.*, pu.name as provider_name, pu.phone as provider_phone, cu.name as customer_name,
              c.name as service_name, c.icon as service_icon
       FROM bookings b JOIN providers p ON b.provider_id = p.id JOIN users pu ON p.user_id = pu.id
       JOIN users cu ON b.user_id = cu.id JOIN categories c ON b.category_id = c.id WHERE b.id = ?`,
      [req.params.id]
    );
    if (bookings.length === 0) return res.status(404).json({ success: false, message: 'Booking not found.' });
    res.json({ success: true, booking: bookings[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Update booking status (provider accept/reject)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['accepted', 'rejected', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status.' });
    
    const [bookings] = await db.query(
      `SELECT b.*, p.user_id as provider_user_id FROM bookings b 
       JOIN providers p ON b.provider_id = p.id WHERE b.id = ?`, [req.params.id]
    );
    if (bookings.length === 0) return res.status(404).json({ success: false, message: 'Booking not found.' });
    
    const booking = bookings[0];
    if (req.user.role === 'provider' && booking.provider_user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }
    
    await db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);
    
    if (status === 'completed') {
      await db.query('UPDATE providers SET completed_jobs = completed_jobs + 1 WHERE id = ?', [booking.provider_id]);
    }
    
    // Notify customer
    await db.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [booking.user_id, 'Booking Update', `Your booking has been ${status}`, 'booking']
    );
    
    res.json({ success: true, message: `Booking ${status} successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Submit review
router.post('/:id/review', auth, async (req, res) => {
  try {
    const { rating, quality_rating, punctuality_rating, communication_rating, review_text } = req.body;
    
    const [bookings] = await db.query('SELECT * FROM bookings WHERE id = ? AND user_id = ? AND status = "completed"', [req.params.id, req.user.id]);
    if (bookings.length === 0) return res.status(404).json({ success: false, message: 'Completed booking not found.' });
    
    const booking = bookings[0];
    
    await db.query(
      `INSERT INTO reviews (booking_id, user_id, provider_id, rating, quality_rating, punctuality_rating, communication_rating, review_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [booking.id, req.user.id, booking.provider_id, rating, quality_rating || rating, punctuality_rating || rating, communication_rating || rating, review_text || '']
    );
    
    // Recalculate provider avg_rating and trust_score
    const [ratings] = await db.query('SELECT AVG(rating) as avg_r, COUNT(*) as cnt FROM reviews WHERE provider_id = ?', [booking.provider_id]);
    const avgRating = parseFloat(ratings[0].avg_r).toFixed(2);
    const reviewCount = ratings[0].cnt;
    
    const [provData] = await db.query('SELECT * FROM providers WHERE id = ?', [booking.provider_id]);
    if (provData.length > 0) {
      const p = provData[0];
      const completionRate = p.total_jobs > 0 ? (p.completed_jobs / p.total_jobs) : 0;
      const responseScore = Math.max(0, 10 - (p.response_time_minutes / 6));
      const ratingScore = parseFloat(avgRating) * 2;
      const reviewBonus = Math.min(reviewCount / 10, 1);
      const trustScore = Math.min(10, ((ratingScore * 0.4) + (completionRate * 10 * 0.3) + (responseScore * 0.2) + (reviewBonus * 10 * 0.1))).toFixed(2);
      
      await db.query('UPDATE providers SET avg_rating = ?, trust_score = ? WHERE id = ?', [avgRating, trustScore, booking.provider_id]);
    }
    
    res.json({ success: true, message: 'Review submitted successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Get notifications
router.get('/notifications/all', auth, async (req, res) => {
  try {
    const [notifications] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [req.user.id]
    );
    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
