const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth } = require('../middleware/auth');

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM categories ORDER BY name');
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Get providers with filters
router.get('/providers', async (req, res) => {
  try {
    const { category_id, search, min_rating, available_only, lat, lng, radius = 50 } = req.query;
    
    let query = `
      SELECT p.*, u.name, u.email, u.phone, u.avatar,
             c.name as category_name, c.icon as category_icon,
             (SELECT COUNT(*) FROM reviews r WHERE r.provider_id = p.id) as review_count
      FROM providers p
      JOIN users u ON p.user_id = u.id
      JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];
    
    if (category_id) { query += ' AND p.category_id = ?'; params.push(category_id); }
    if (available_only === 'true') { query += ' AND p.is_available = TRUE'; }
    if (min_rating) { query += ' AND p.avg_rating >= ?'; params.push(parseFloat(min_rating)); }
    if (search) {
      query += ' AND (u.name LIKE ? OR c.name LIKE ? OR p.bio LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY p.trust_score DESC, p.avg_rating DESC';
    
    const [providers] = await db.query(query, params);
    
    // Calculate distance if lat/lng provided
    if (lat && lng) {
      providers.forEach(p => {
        if (p.latitude && p.longitude) {
          const R = 6371;
          const dLat = (p.latitude - parseFloat(lat)) * Math.PI / 180;
          const dLon = (p.longitude - parseFloat(lng)) * Math.PI / 180;
          const a = Math.sin(dLat/2)*Math.sin(dLat/2) +
            Math.cos(parseFloat(lat)*Math.PI/180) * Math.cos(p.latitude*Math.PI/180) *
            Math.sin(dLon/2)*Math.sin(dLon/2);
          p.distance_km = (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
        } else {
          p.distance_km = null;
        }
      });
      providers.sort((a, b) => (parseFloat(a.distance_km) || 999) - (parseFloat(b.distance_km) || 999));
    }
    
    res.json({ success: true, providers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Get single provider
router.get('/providers/:id', async (req, res) => {
  try {
    const [providers] = await db.query(
      `SELECT p.*, u.name, u.email, u.phone, u.avatar, u.created_at as member_since,
              c.name as category_name, c.icon as category_icon
       FROM providers p JOIN users u ON p.user_id = u.id JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`, [req.params.id]
    );
    if (providers.length === 0) return res.status(404).json({ success: false, message: 'Provider not found.' });
    
    const [reviews] = await db.query(
      `SELECT r.*, u.name as reviewer_name FROM reviews r 
       JOIN users u ON r.user_id = u.id WHERE r.provider_id = ? ORDER BY r.created_at DESC LIMIT 10`,
      [req.params.id]
    );
    
    res.json({ success: true, provider: providers[0], reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Update provider availability (provider only)
router.patch('/providers/availability', auth, async (req, res) => {
  try {
    const { is_available } = req.body;
    await db.query('UPDATE providers SET is_available = ? WHERE user_id = ?', [is_available, req.user.id]);
    res.json({ success: true, message: 'Availability updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
