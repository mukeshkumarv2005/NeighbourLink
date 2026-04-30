// API Client for NeighborLink (Netlify Compatible)

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
    const headers = { 'Content-Type': 'application/json' };
    const token = Api.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  },

  request: async (method, path, body = null) => {
    const options = {
      method,
      headers: Api.headers()
    };

    if (body) options.body = JSON.stringify(body);

    try {
      const res = await fetch(`${API_BASE}${path}`, options);

      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        data = { message: 'Invalid server response' };
      }

      // Handle auth errors
      if (res.status === 401 || res.status === 403) {
        Api.clearAuth();
        if (!window.location.pathname.includes('login')) {
          window.location.href = '/pages/login.html';
        }
      }

      return { ok: res.ok, status: res.status, ...data };

    } catch (error) {
      return {
        ok: false,
        status: 500,
        message: 'Network error. Please try again.'
      };
    }
  },

  get: (path) => Api.request('GET', path),
  post: (path, body) => Api.request('POST', path, body),
  patch: (path, body) => Api.request('PATCH', path, body),
  delete: (path) => Api.request('DELETE', path),

  // ================= AUTH =================

  register: (data) => Api.post('/auth/register', data),
  login: async (data) => {
    const res = await Api.post('/auth/login', data);
    if (res.ok && res.token && res.user) {
      Api.setAuth(res.token, res.user);
    }
    return res;
  },
  profile: () => Api.get('/auth/profile'),
  logout: () => {
    Api.clearAuth();
    window.location.href = '/';
  },

  // ================= SERVICES =================

  categories: () => Api.get('/services/categories'),

  providers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return Api.get(`/services/providers${query ? '?' + query : ''}`);
  },

  provider: (id) => Api.get(`/services/providers/${id}`),

  updateAvailability: (is_available) =>
    Api.patch('/services/providers/availability', { is_available }),

  // ================= BOOKINGS =================

  createBooking: (data) => Api.post('/bookings', data),
  myBookings: () => Api.get('/bookings/my'),
  booking: (id) => Api.get(`/bookings/${id}`),

  updateBookingStatus: (id, status) =>
    Api.patch(`/bookings/${id}/status`, { status }),

  submitReview: (id, data) =>
    Api.post(`/bookings/${id}/review`, data),

  notifications: () => Api.get('/bookings/notifications/all'),
};

// ================= HELPERS =================

function getCategoryIcon(categoryName) {
  const map = {
    Electrician: '⚡',
    Plumber: '🔧',
    Carpenter: '🪛',
    Cleaner: '🧹',
    Painter: '🎨',
    'AC Repair': '❄️',
    Mechanic: '🔩',
    Gardener: '🌿',
    Security: '🔒',
    'IT Support': '💻',
    'Appliance Repair': '🛠️'
  };
  return map[categoryName] || '•';
}

// ================= TOAST =================

const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'default', duration = 3000) {
    this.init();

    const toast = document.createElement('div');
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      default: 'ℹ️'
    };

    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;

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

// ================= AUTH GUARD =================

function requireAuth(role = null) {
  if (!Api.isLoggedIn()) {
    window.location.href = '/pages/login.html';
    return false;
  }

  const user = Api.getUser();

  if (role && user.role !== role) {
    window.location.href =
      user.role === 'provider'
        ? '/pages/provider-dashboard.html'
        : '/pages/dashboard.html';
    return false;
  }

  return true;
}

// ================= NAV =================

function renderNavUser() {
  const user = Api.getUser();
  const el = document.getElementById('nav-actions');
  if (!el) return;

  if (user) {
    el.innerHTML = `
      <a href="${user.role === 'provider'
        ? '/pages/provider-dashboard.html'
        : '/pages/dashboard.html'}" class="btn btn-ghost btn-sm">Dashboard</a>
      <div class="nav-avatar">${user.name[0].toUpperCase()}</div>
      <button class="btn btn-outline btn-sm" onclick="logout()">Logout</button>
    `;
  } else {
    el.innerHTML = `
      <a href="/pages/login.html" class="btn btn-ghost btn-sm">Login</a>
      <a href="/pages/register.html" class="btn btn-primary btn-sm">Register</a>
    `;
  }
}

function logout() {
  Api.logout();
  Toast.success('Logged out successfully!');
}
