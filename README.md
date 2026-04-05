# 🏘️ NeighborLink – Smart Local Service Discovery & Trust-Based Booking System

A full-stack web application for discovering and booking trusted local service providers.

---

## 📁 Project Structure

```
neighborlink/
├── backend/
│   ├── config/
│   │   ├── database.js          # MySQL connection pool
│   │   └── schema.sql           # DB schema + seed data
│   ├── middleware/
│   │   └── auth.js              # JWT auth middleware
│   ├── routes/
│   │   ├── auth.js              # Register, Login, Profile APIs
│   │   ├── services.js          # Categories & Providers APIs
│   │   └── bookings.js          # Bookings, Reviews, Notifications
│   ├── .env.example             # Environment variables template
│   ├── package.json
│   └── server.js                # Express server entry point
│
└── frontend/
    ├── css/
    │   └── main.css             # Complete design system CSS
    ├── js/
    │   └── api.js               # API client, Toast, Format helpers
    ├── pages/
    │   ├── login.html           # Login page
    │   ├── register.html        # Registration with role selector
    │   ├── services.html        # Browse + filter providers
    │   ├── provider-detail.html # Provider profile + booking modal
    │   ├── dashboard.html       # User dashboard
    │   ├── provider-dashboard.html # Provider dashboard
    │   └── booking-confirmation.html # Booking status & timeline
    └── index.html               # Landing page
```

---

## 🚀 Setup Instructions

### 1. Database Setup
```sql
-- Import the schema into MySQL:
mysql -u root -p < backend/config/schema.sql
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials and JWT secret

npm install
npm start
# Server runs on http://localhost:3000
```

### 3. Frontend
The frontend is served statically by the Express server.
Open http://localhost:3000 in your browser.

---

## 🔑 Demo Accounts (after seeding)

| Role     | Email              | Password    |
|----------|--------------------|-------------|
| User     | arjun@demo.com     | password123 |
| Provider | ramesh@demo.com    | password123 |
| Provider | priya@demo.com     | password123 |
| Provider | suresh@demo.com    | password123 |

---

## 🗺️ Google Maps Integration

1. Get a Google Maps API key from https://console.cloud.google.com
2. Add `GOOGLE_MAPS_API_KEY=your_key` to `.env`
3. In `frontend/pages/services.html`, add the Maps script:
```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_KEY"></script>
```

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint          | Description        |
|--------|-------------------|--------------------|
| POST   | /api/auth/register | Register user      |
| POST   | /api/auth/login    | Login              |
| GET    | /api/auth/profile  | Get profile (auth) |

### Services
| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| GET    | /api/services/categories          | All categories           |
| GET    | /api/services/providers           | Providers (with filters) |
| GET    | /api/services/providers/:id       | Single provider          |
| PATCH  | /api/services/providers/availability | Update availability   |

### Bookings
| Method | Endpoint                      | Description           |
|--------|-------------------------------|-----------------------|
| POST   | /api/bookings                 | Create booking        |
| GET    | /api/bookings/my              | My bookings           |
| GET    | /api/bookings/:id             | Single booking        |
| PATCH  | /api/bookings/:id/status      | Update status         |
| POST   | /api/bookings/:id/review      | Submit review         |
| GET    | /api/bookings/notifications/all | Notifications       |

---

## 🛡️ Trust Score Formula

```
TrustScore = (AvgRating × 2 × 0.40) + (CompletionRate × 10 × 0.30) + (ResponseScore × 0.20) + (ReviewBonus × 10 × 0.10)
```

- **Service Quality (40%)** — Average user rating (out of 5, scaled to 10)
- **Completion Rate (30%)** — completed_jobs / total_jobs × 10
- **Response Time (20%)** — 10 − (response_time_minutes / 6)
- **Review Authenticity (10%)** — Bonus for verified review count

---

## ✨ Features

- ✅ User & Provider Registration/Login with JWT
- ✅ Role-based dashboards (User / Provider)
- ✅ Location-aware provider search with distance calculation
- ✅ Trust Score ranking system
- ✅ Real-time availability toggling (Provider)
- ✅ Full booking lifecycle (Create → Accept/Reject → Complete)
- ✅ Multi-dimensional ratings & review system
- ✅ Booking history with status filtering
- ✅ In-app notifications
- ✅ Google Maps ready (plug in API key)
- ✅ Responsive design for desktop & mobile
