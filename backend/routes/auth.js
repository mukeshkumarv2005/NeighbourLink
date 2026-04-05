const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'neighborlink_secret_key';

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, address, category_id, bio, experience_years, hourly_rate } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }
    
    // Check existing user
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role === 'provider' ? 'provider' : 'user';
    
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, userRole, phone || null, address || null]
    );
    
    const userId = result.insertId;
    
    // If provider, create provider profile
    if (userRole === 'provider' && category_id) {
      await db.query(
        'INSERT INTO providers (user_id, category_id, bio, experience_years, hourly_rate) VALUES (?, ?, ?, ?, ?)',
        [userId, category_id, bio || '', experience_years || 0, hourly_rate || 0]
      );
    }
    
    const token = jwt.sign({ id: userId, email, role: userRole, name }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      token,
      user: { id: userId, name, email, role: userRole }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required.' });
    
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    
    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET, { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// Get profile
router.get('/profile', require('../middleware/auth').auth, async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, name, email, role, phone, address, latitude, longitude, avatar, created_at FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    
    let profile = users[0];
    
    if (profile.role === 'provider') {
      const [providers] = await db.query(
        `SELECT p.*, c.name as category_name, c.icon as category_icon 
         FROM providers p JOIN categories c ON p.category_id = c.id 
         WHERE p.user_id = ?`, [profile.id]
      );
      if (providers.length > 0) profile.provider = providers[0];
    }
    
    res.json({ success: true, user: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
