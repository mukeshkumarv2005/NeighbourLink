const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/services', require('./routes/services'));
app.use('/api/bookings', require('./routes/bookings'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', service: 'NeighborLink API', timestamp: new Date() }));

// Support extension-less frontend page URLs like /pages/services or /pages/login
app.get('/pages/:page', (req, res, next) => {
  const pageFile = path.join(__dirname, '../frontend/pages', `${req.params.page}.html`);
  if (fs.existsSync(pageFile)) return res.sendFile(pageFile);
  next();
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 NeighborLink Server running on http://localhost:${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
  console.log(`\n📋 Setup: Import backend/config/schema.sql into MySQL first`);
  console.log(`📝 Demo login: arjun@demo.com / password123 (user)`);
  console.log(`📝 Demo login: ramesh@demo.com / password123 (provider)\n`);
});

module.exports = app;
