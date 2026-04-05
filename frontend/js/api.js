// API Client for NeighborLink
const API_BASE = '/api';

const Api = {
  getToken: () => localStorage.getItem('nl_token'),
  getUser: () => JSON.parse(localStorage.getItem('nl_user') || 'null'),
  
  setAuth: (token, user) => {
    localStorage.setItem('nl_token', token);
    localStorage.setItem('nl_user', JSON.stringify(user));
  },
  
  clearAuth: () => {
    localStorage.removeItem('nl_token');
    localStorage.removeItem('nl_user');
  },
  
  isLoggedIn: () => !!localStorage.getItem('nl_token'),
  
  headers: () => {
    const h = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('nl_token');
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  },
  
  request: async (method, path, body = null) => {
    const opts = { method, headers: Api.headers() };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json();
    if (res.status === 401 || res.status === 403) {
      Api.clearAuth();
      if (window.location.pathname !== '/pages/login.html' && window.location.pathname !== '/index.html') {
        window.location.href = '/pages/login.html';
      }
    }
    return { ok: res.ok, status: res.status, ...data };
  },
  
  get: (path) => Api.request('GET', path),
  post: (path, body) => Api.request('POST', path, body),
  patch: (path, body) => Api.request('PATCH', path, body),
  delete: (path) => Api.request('DELETE', path),

  // Auth
  register: (data) => Api.post('/auth/register', data),
  login: (data) => Api.post('/auth/login', data),
  profile: () => Api.get('/auth/profile'),
  
  // Services
  categories: () => Api.get('/services/categories'),
  providers: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return Api.get(`/services/providers${q ? '?' + q : ''}`);
  },
  provider: (id) => Api.get(`/services/providers/${id}`),
  updateAvailability: (is_available) => Api.patch('/services/providers/availability', { is_available }),
  
  // Bookings
  createBooking: (data) => Api.post('/bookings', data),
  myBookings: () => Api.get('/bookings/my'),
  booking: (id) => Api.get(`/bookings/${id}`),
  updateBookingStatus: (id, status) => Api.patch(`/bookings/${id}/status`, { status }),
  submitReview: (id, data) => Api.post(`/bookings/${id}/review`, data),
  notifications: () => Api.get('/bookings/notifications/all'),
};

// Toast notifications
const Toast = {
  container: null,
  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  show(message, type = 'default', duration = 3500) {
    this.init();
    const toast = document.createElement('div');
    const icons = { success: '✅', error: '❌', warning: '⚠️', default: 'ℹ️' };
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || icons.default}</span><span>${message}</span>`;
    this.container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  success: (msg) => Toast.show(msg, 'success'),
  error: (msg) => Toast.show(msg, 'error'),
  warning: (msg) => Toast.show(msg, 'warning'),
};

// Auth guard - call on protected pages
function requireAuth(role = null) {
  if (!Api.isLoggedIn()) {
    window.location.href = '/pages/login.html';
    return false;
  }
  const user = Api.getUser();
  if (role && user.role !== role) {
    window.location.href = user.role === 'provider' ? '/pages/provider-dashboard.html' : '/pages/dashboard.html';
    return false;
  }
  return true;
}

// Format helpers
const Format = {
  date: (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
  time: (t) => t ? t.substring(0, 5) : '',
  currency: (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN')}`,
  stars: (r) => {
    const rating = Math.round(parseFloat(r || 0));
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  },
  trustColor: (score) => {
    if (score >= 9) return '#16a34a';
    if (score >= 7) return '#1a56db';
    if (score >= 5) return '#d97706';
    return '#dc2626';
  },
  statusBadge: (status) => {
    const map = {
      pending: '<span class="badge status-pending">⏳ Pending</span>',
      accepted: '<span class="badge status-accepted">✅ Accepted</span>',
      rejected: '<span class="badge status-rejected">❌ Rejected</span>',
      completed: '<span class="badge status-completed">🎉 Completed</span>',
      cancelled: '<span class="badge status-cancelled">🚫 Cancelled</span>',
    };
    return map[status] || status;
  }
};

// Render navbar user state
function renderNavUser() {
  const user = Api.getUser();
  const actionsEl = document.getElementById('nav-actions');
  if (!actionsEl) return;
  
  if (user) {
    actionsEl.innerHTML = `
      <a href="${user.role === 'provider' ? '/pages/provider-dashboard.html' : '/pages/dashboard.html'}" class="btn btn-ghost btn-sm">Dashboard</a>
      <div class="nav-avatar" title="${user.name}">${user.name[0].toUpperCase()}</div>
      <button class="btn btn-outline btn-sm" onclick="logout()">Logout</button>
    `;
  } else {
    actionsEl.innerHTML = `
      <a href="/pages/login.html" class="btn btn-ghost btn-sm">Login</a>
      <a href="/pages/register.html" class="btn btn-primary btn-sm">Register</a>
    `;
  }
}

function logout() {
  Api.clearAuth();
  Toast.success('Logged out successfully!');
  setTimeout(() => window.location.href = '/', 800);
}
