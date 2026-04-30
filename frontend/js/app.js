/* NeighborLink - Shared JS Utilities (FIXED FOR NETLIFY) */

const API_BASE = '/api';

// ── TOKEN / AUTH HELPERS ──────────────────────
const Auth = {
  getToken: () => localStorage.getItem('nl_token'),

  getUser: () => {
    try {
      const u = localStorage.getItem('nl_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
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
      window.location.href =
        '/pages/login.html?redirect=' +
        encodeURIComponent(window.location.pathname);
      return false;
    }
    return true;
  }
};

// ── API HELPER (FIXED) ────────────────────────
async function apiRequest(method, endpoint, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(API_BASE + endpoint, opts);

    let data = {};
    try {
      data = await res.json();
    } catch {
      data = { message: 'Invalid response from server' };
    }

    if (!res.ok) {
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data;
  } catch (err) {
    console.error('API Error:', err.message);

    // REMOVE old "backend not connected" behavior
    return {
      success: false,
      error: err.message || 'Network error'
    };
  }
}

// ── API METHODS ───────────────────────────────
const api = {
  get: (ep) => apiRequest('GET', ep),
  post: (ep, body) => apiRequest('POST', ep, body),
  put: (ep, body) => apiRequest('PUT', ep, body),
  patch: (ep, body) => apiRequest('PATCH', ep, body),
  delete: (ep) => apiRequest('DELETE', ep),
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
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
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
    pending: 'badge-pending',
    accepted: 'badge-accepted',
    rejected: 'badge-rejected',
    completed: 'badge-completed',
    cancelled: 'badge-cancelled'
  };
  return map[status] || 'badge-ghost';
}

function getStatusIcon(status) {
  const map = {
    pending: '⏳',
    accepted: '✅',
    rejected: '❌',
    completed: '🎉',
    cancelled: '🚫'
  };
  return map[status] || '•';
}

// ── NAVBAR ────────────────────────────────────
function renderNavbar(activePage = '') {
  const user = Auth.getUser();
  const isLoggedIn = Auth.isLoggedIn();

  const navHtml = `
  <nav class="navbar">
    <a href="/" class="navbar-brand">Neighbor<span class="brand-dot">Link</span></a>
    <ul class="navbar-links">
      <li><a href="/" ${activePage === 'home' ? 'class="active"' : ''}>Home</a></li>
      <li><a href="/pages/services.html" ${activePage === 'services' ? 'class="active"' : ''}>Services</a></li>
      ${isLoggedIn ? `<li><a href="${Auth.isProvider() ? '/pages/provider-dashboard.html' : '/pages/dashboard.html'}">Dashboard</a></li>` : ''}
    </ul>
    <div class="navbar-actions">
      ${isLoggedIn
      ? `<span>Hi, ${user.name.split(' ')[0]} 👋</span>
           <button onclick="logout()">Logout</button>`
      : `<a href="/pages/login.html">Login</a>
           <a href="/pages/register.html">Register</a>`
    }
    </div>
  </nav>
  `;

  document.getElementById('navbar-root').innerHTML = navHtml;
}

function logout() {
  Auth.clear();
  showToast('Logged out successfully', 'success');
  setTimeout(() => (window.location.href = '/'), 600);
}

// ── FOOTER ────────────────────────────────────
function renderFooter() {
  const el = document.getElementById('footer-root');
  if (el) {
    el.innerHTML = `
      <footer class="footer">
        <div>NeighborLink · 2025</div>
      </footer>
    `;
  }
}

// ── INIT ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('navbar-root')) {
    renderNavbar(document.body.dataset.page || '');
  }
  if (document.getElementById('footer-root')) {
    renderFooter();
  }
});