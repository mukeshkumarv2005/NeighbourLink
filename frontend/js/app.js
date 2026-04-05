/* NeighborLink - Shared JS Utilities */

const API_BASE = 'https://neighborlink-ibol.onrender.com/api';

// ── TOKEN / AUTH HELPERS ──────────────────────
const Auth = {
  getToken: () => localStorage.getItem('nl_token'),
  getUser: () => {
    const u = localStorage.getItem('nl_user');
    return u ? JSON.parse(u) : null;
  },
  setSession: (token, user) => {
    localStorage.setItem('nl_token', token);
    localStorage.setItem('nl_user', JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem('nl_token');
    localStorage.removeItem('nl_user');
  },
  isLoggedIn: () => !!localStorage.getItem('nl_token'),
  isProvider: () => {
    const u = Auth.getUser();
    return u && u.role === 'provider';
  },
  requireLogin: () => {
    if (!Auth.isLoggedIn()) {
      window.location.href = '/pages/login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return false;
    }
    return true;
  }
};

// ── API HELPER ────────────────────────────────
async function apiRequest(method, endpoint, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(API_BASE + endpoint, opts);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const api = {
  get: (ep) => apiRequest('GET', ep),
  post: (ep, body) => apiRequest('POST', ep, body),
  put: (ep, body) => apiRequest('PUT', ep, body),
};

// ── TOAST NOTIFICATIONS ───────────────────────
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── RENDER HELPERS ────────────────────────────
function renderStars(rating) {
  const full = Math.round(rating || 0);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function getTrustClass(score) {
  if (score >= 7) return 'trust-high';
  if (score >= 4) return 'trust-mid';
  return 'trust-low';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function formatCurrency(amount) {
  return '₹' + parseFloat(amount || 0).toFixed(0);
}

function getBadgeClass(status) {
  const map = {
    pending: 'badge-pending', accepted: 'badge-accepted',
    rejected: 'badge-rejected', completed: 'badge-completed', cancelled: 'badge-cancelled'
  };
  return map[status] || 'badge-ghost';
}

function getStatusIcon(status) {
  const map = { pending: '⏳', accepted: '✅', rejected: '❌', completed: '🎉', cancelled: '🚫' };
  return map[status] || '•';
}

// ── NAVBAR RENDER ─────────────────────────────
function renderNavbar(activePage = '') {
  const user = Auth.getUser();
  const isLoggedIn = Auth.isLoggedIn();

  const navHtml = `
  <nav class="navbar">
    <a href="/" class="navbar-brand">Neighbor<span class="brand-dot">Link</span></a>
    <ul class="navbar-links">
      <li><a href="/" ${activePage === 'home' ? 'class="active"' : ''}>Home</a></li>
      <li><a href="/pages/services.html" ${activePage === 'services' ? 'class="active"' : ''}>Services</a></li>
      ${isLoggedIn ? `<li><a href="${Auth.isProvider() ? '/pages/provider-dashboard.html' : '/pages/dashboard.html'}" ${activePage === 'dashboard' ? 'class="active"' : ''}>Dashboard</a></li>` : ''}
    </ul>
    <div class="navbar-actions">
      ${isLoggedIn
        ? `<span style="font-size:0.88rem;color:var(--ink-2);">Hi, ${user.name.split(' ')[0]} 👋</span>
           <button class="btn btn-ghost btn-sm" onclick="logout()">Logout</button>`
        : `<a href="/pages/login.html" class="btn btn-ghost btn-sm" ${activePage === 'login' ? 'style="border-color:var(--primary);color:var(--primary)"' : ''}>Login</a>
           <a href="/pages/register.html" class="btn btn-primary btn-sm">Register</a>`
      }
    </div>
    <button class="navbar-toggle" onclick="toggleMobileMenu()">☰</button>
  </nav>
  <div id="mobile-menu" style="display:none;background:var(--card);border-bottom:1px solid var(--border);padding:1rem 5vw;">
    <div style="display:flex;flex-direction:column;gap:0.75rem;">
      <a href="/" style="font-size:0.95rem;font-weight:500;">Home</a>
      <a href="/pages/services.html" style="font-size:0.95rem;font-weight:500;">Services</a>
      ${isLoggedIn
        ? `<a href="${Auth.isProvider() ? '/pages/provider-dashboard.html' : '/pages/dashboard.html'}" style="font-size:0.95rem;font-weight:500;">Dashboard</a>
           <button class="btn btn-ghost btn-sm" onclick="logout()">Logout</button>`
        : `<a href="/pages/login.html" class="btn btn-ghost btn-sm" style="width:fit-content;">Login</a>
           <a href="/pages/register.html" class="btn btn-primary btn-sm" style="width:fit-content;">Register</a>`
      }
    </div>
  </div>
  `;
  document.getElementById('navbar-root').innerHTML = navHtml;
}

function toggleMobileMenu() {
  const m = document.getElementById('mobile-menu');
  m.style.display = m.style.display === 'none' ? 'block' : 'none';
}

function logout() {
  Auth.clear();
  showToast('Logged out successfully', 'success');
  setTimeout(() => window.location.href = '/', 600);
}

// ── FOOTER RENDER ─────────────────────────────
function renderFooter() {
  const el = document.getElementById('footer-root');
  if (el) el.innerHTML = `
    <footer class="footer">
      <div class="footer-brand">Neighbor<span>Link</span></div>
      <div>Smart Local Service Discovery & Trust-Based Booking · 2025</div>
      <div style="display:flex;gap:1.5rem;">
        <a href="/" style="color:rgba(255,255,255,0.55);font-size:0.82rem;">Home</a>
        <a href="/pages/services.html" style="color:rgba(255,255,255,0.55);font-size:0.82rem;">Services</a>
        <a href="/pages/register.html" style="color:rgba(255,255,255,0.55);font-size:0.82rem;">Join</a>
      </div>
    </footer>`;
}

// ── LOADING STATE ─────────────────────────────
function setLoading(btnEl, loading, text = 'Loading...') {
  if (loading) {
    btnEl.disabled = true;
    btnEl._origText = btnEl.innerHTML;
    btnEl.innerHTML = `<span class="loading-spinner"></span> ${text}`;
  } else {
    btnEl.disabled = false;
    btnEl.innerHTML = btnEl._origText || 'Submit';
  }
}

// ── CATEGORY ICONS MAP ────────────────────────
const CATEGORY_COLORS = {
  'Electrician': { bg: '#fef3c7', icon: '⚡' },
  'Plumber': { bg: '#dbeafe', icon: '🔧' },
  'Carpenter': { bg: '#d1fae5', icon: '🪛' },
  'Cleaner': { bg: '#ede9fe', icon: '🧹' },
  'AC Repair': { bg: '#e0f2fe', icon: '❄️' },
  'Painter': { bg: '#fce7f3', icon: '🎨' },
  'Mechanic': { bg: '#fef9c3', icon: '🔩' },
  'Gardener': { bg: '#dcfce7', icon: '🌿' },
  'Security': { bg: '#fee2e2', icon: '🔒' },
  'IT Support': { bg: '#dbeafe', icon: '💻' },
};

function getCategoryStyle(name) {
  return CATEGORY_COLORS[name] || { bg: '#f1f5f9', icon: '🛠️' };
}

// init on every page
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('navbar-root')) renderNavbar(document.body.dataset.page || '');
  if (document.getElementById('footer-root')) renderFooter();
});
