# 🏟️ Prost Arena

> **Eat. Play. Win.** — A gamified food-ordering platform where every order earns XP, unlocks rewards, and puts you on the leaderboard.

---

## ✨ Features

### For Users
- 🛒 **Food ordering** — Browse menu, build cart, place orders with real-time status tracking
- ⚡ **XP & Levelling** — Earn XP on every order; level up to unlock secret menu items
- 🎡 **Spin Wheel** — Daily spin for XP, points, or discount rewards (24-hour cooldown)
- 🧠 **Daily Challenges** — Quiz-based trivia with category selection; perfect score = discount reward
- ⚔️ **PvP Challenges** — Real-time 1v1 quiz battles via Socket.io
- 🏆 **Leaderboard** — Global rankings by XP, PvP wins, or total orders
- 🎁 **Rewards & Coupons** — Apply earned rewards or coupon codes at checkout
- 🔗 **Referral System** — Share your referral code; both parties earn XP on first order
- 📱 **Phone OTP Auth** — Sign in / register via SMS OTP or email + password

### For Admins
- 📊 **Dashboard** — Revenue charts, order volume, new user stats (7-day view)
- 🍔 **Menu Management** — Full CRUD for menu items and categories
- ❓ **Challenge Questions** — Add/edit questions per category; configure attempt limits
- 🎰 **Spin Wheel Editor** — Configure segments, probabilities, and rewards
- 🎯 **Missions** — Create missions with XP/points/discount rewards
- 👥 **User Management** — View users, manage roles and bans
- 🎟️ **Rewards/Coupons** — Create discount codes, XP boosts, free delivery rewards

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend API** | Node.js, Express 4, MongoDB (Mongoose), Redis (ioredis) |
| **Real-time** | Socket.io 4 |
| **Web Frontend** | Next.js 14 (App Router), TypeScript, TailwindCSS |
| **Mobile** | React Native, Expo |
| **State Management** | Zustand (persist middleware) |
| **Animations** | Framer Motion |
| **Auth** | JWT (access + refresh tokens), bcryptjs, Phone OTP (Twilio-ready) |
| **Validation** | Joi (backend), Zod (frontend) |
| **Logging** | Winston |

---

## 📁 Project Structure

```
prost-arena/
├── backend/          # Express API (port 5000)
│   └── src/
│       ├── modules/  # Feature modules (auth, orders, menu, challenges, …)
│       ├── config/   # DB, Redis, env validation
│       ├── middlewares/
│       ├── sockets/  # Socket.io namespaces
│       └── utils/    # Gamification, JWT, logger, response helpers
│
├── web/              # Next.js 14 web app (port 3000)
│   └── app/
│       ├── (auth)/   # Login, Register
│       ├── (main)/   # Menu, Cart, Profile, Challenges, Leaderboard, Spin
│       └── admin/    # Admin dashboard
│
└── mobile/           # React Native + Expo
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Redis (optional — app degrades gracefully without it)

### 1. Clone & install

```bash
git clone https://github.com/your-org/prost-arena.git
cd prost-arena

# Backend
cd backend && npm install

# Web
cd ../web && npm install
```

### 2. Configure environment

**`backend/.env`**
```env
MONGO_URI=mongodb://localhost:27017/prost-arena
JWT_SECRET=your-super-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Optional
REDIS_URL=redis://localhost:6379
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_FROM_NUMBER=+1xxxxxxxxxx
```

**`web/.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Seed the database

```bash
cd backend && npm run seed
```

This creates sample menu items, categories, a default spin wheel, and an admin user.

### 4. Run

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Web
cd web && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔐 Authentication

Two auth methods are supported:

| Method | Flow |
|--------|------|
| **Email + Password** | `POST /api/auth/register` → `POST /api/auth/login` |
| **Phone OTP** | `POST /api/auth/otp/send` → `POST /api/auth/otp/verify` |

Access tokens are short-lived JWTs. The web client auto-refreshes via `POST /api/auth/refresh` on 401 responses.

> **Dev OTP:** Without Twilio configured, OTPs are printed to the backend console output.

---

## 🎮 Gamification System

### XP & Levels
- XP required for level N = `N² × 100`
- Level 1 → 2: 400 XP | Level 9 → 10: 10,000 XP
- Levels unlock secret menu items and affect leaderboard rank

### Points
- Earned at 5 points per $1 spent
- Separate from XP; shown on profile and leaderboard

### Level Titles
`Newcomer → Regular → Food Lover → Challenger → Arena Fighter → Champion → Elite → Legend → Myth → God of Prost`

---

## 🛠️ API Overview

| Prefix | Description |
|--------|-------------|
| `POST /api/auth/*` | Auth: register, login, OTP, refresh |
| `GET /api/menu/items` | Public menu (level-filtered secret items) |
| `POST /api/orders` | Place an order |
| `POST /api/orders/validate-coupon` | Preview discount |
| `GET /api/leaderboard` | Rankings (xp / wins / orders) |
| `POST /api/spin` | Spin the wheel |
| `GET /api/challenges/daily` | Fetch daily quiz |
| `POST /api/challenges/daily/:id/submit` | Submit answers |
| `GET /api/missions` | Active missions with user progress |
| `GET /api/users/rewards` | User's active rewards |
| `GET /api/admin/*` | Admin endpoints (role-gated) |

---

## 🧩 Socket.io Events

**Namespace `/challenges`**
| Event | Direction | Payload |
|-------|-----------|---------|
| `challenge:join` | client → server | `{ challengeId }` |
| `challenge:answer` | client → server | `{ questionId, answerIndex }` |
| `challenge:result` | server → client | `{ winner, scores }` |

**Namespace `/orders`**
| Event | Direction | Payload |
|-------|-----------|---------|
| `order:status` | server → client | `{ orderId, status }` |

---

## 🤝 Contributing

1. Branch from `main`
2. Follow the existing module structure for new features
3. All intentional HTTP errors should use `isOperational: true`:
   ```js
   throw Object.assign(new Error('Clear message'), { statusCode: 400, isOperational: true });
   ```
4. Frontend pages behind auth must check `isHydrated` before rendering

---

## 📄 License

MIT © Prost Arena
