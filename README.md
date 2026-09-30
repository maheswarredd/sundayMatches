# SundayMatches 🏏
> **"Fast, Simple & Live Cricket Scoring"**

SundayMatches is a complete, production-ready MERN live cricket scoring and match management platform built with React, Vite, Node.js, Express, MongoDB (Mongoose), and Socket.IO.

Designed with a modern cricket branding aesthetic (crisp light cards, forest-emerald accents, responsive layouts), SundayMatches provides real-time ball-by-ball scoring, authoritative strike rotation, extras handling, dismissals (including stumping with wicketkeeper validation and no-ball run-outs), bulletproof full-state Undo, and full scorecard generation.

---

## 🌟 Key Features

### ⚡ Authoritative Cricket Scoring Engine
- **Backend as Single Source of Truth**: All state (`activeStrikerId`, `activeNonStrikerId`, `activeBowlerId`, `legalBallsInOver`, `oversCompleted`, `bowlerChangeRequired`) is maintained authoritatively on the backend. Refreshing never causes players to randomly reset.
- **Permanent Player IDs**: Strict entity identity using MongoDB ObjectIds.
- **Accurate Strike Rotation**: Odd runs (1, 3, 5) rotate strike; even runs (0, 2, 4, 6) keep striker; end of over rotates strike to the facing non-striker.
- **Wides**: Adds extras, does **not** consume a legal delivery, retains bowler and strikers.
- **No-Balls**: Adds extras, does **not** consume a legal delivery, allows bat runs or bye extras, free continue.
- **No-Ball + Run Out**: Specific dedicated action that processes run-out dismissals on illegal no-balls without consuming a legal ball.
- **Wicket Dismissals**:
  - Bowled, Caught (with fielder credit), LBW, Hit Wicket, Timed Out
  - Stumped (strictly enforces responsible fielder as **Wicketkeeper**)
  - Run Out (with dismissed player selection and runs completed)
  - Retired Out / Retired Hurt
- **Over Completion Enforcement**: Blocks the next ball when an over finishes until a valid new bowler is chosen. Enforces standard rule (no bowler bowls consecutive overs) and bowler max overs.
- **100% Exact State Undo**: Every ball creates an immutable delivery record with an exact pre-ball state snapshot. "Undo Last Ball" restores the complete score, balls, wickets, strikers, bowler, and commentary.
- **Cricket Rule Modes**: Option 1: Standard Cricket Rules vs Option 2: Custom/Flexible Rules.
- **Super Over**: Optional 1-over, 2-wicket tie-breaker.
- **Automatic Commentary Generator**: Dynamic ball-by-ball cricket commentary for all deliveries.

### 🌐 Real-Time Live Sync
- **Socket.IO Room-Based Broadcasting**: Live scoreboard, recent over bubbles, commentary, and fall-of-wickets update instantly across multiple devices and windows without manual page refreshing.

### 🔒 Security & Admin Authentication
- Admin authentication via password and secure JWT tokens (`Bearer`).
- Protected admin routes for match creation, toss, squad selection, and scoring controls.
- Public access for match spectators, live scores, scorecards, and commentary.
- Helmet security headers, CORS origin management, and Express rate limiting on auth endpoints.

---

## 📁 Folder Structure

```
sundaymatches/
├── package.json               # Root monorepo scripts
├── render.yaml                # Render 1-click Blueprint definition
├── .gitignore
├── README.md
├── server/                    # Backend Node.js / Express / Socket.IO
│   ├── package.json
│   ├── .env.example
│   ├── index.js               # Server entry, MongoDB connect, /health, seeds
│   ├── socket.js              # Socket.IO room manager & broadcast helpers
│   ├── test-engine.js         # Automated test suite for scoring engine
│   ├── test-server-integration.js # End-to-end API & health integration tests
│   ├── middleware/
│   │   └── auth.js            # JWT verification middleware
│   ├── models/
│   │   ├── User.js            # Admin user schema
│   │   ├── Team.js            # Team schema with branding & color
│   │   ├── Player.js          # Player schema with role & stats
│   │   ├── Match.js           # Match schema with authoritative active IDs
│   │   ├── Innings.js         # Innings scorecard & extras breakdown
│   │   ├── Delivery.js        # Immutable ball delivery record & snapshot
│   │   └── AuditLog.js        # Audit trail for admin corrections & undos
│   ├── routes/
│   │   ├── authRoutes.js      # /api/auth/login, /api/auth/verify
│   │   ├── teamRoutes.js      # /api/teams CRUD
│   │   ├── playerRoutes.js    # /api/players CRUD
│   │   ├── matchRoutes.js     # /api/matches, toss, playing-xi, start, pause
│   │   ├── scoringRoutes.js   # /api/scoring/:matchId/ball, undo, next-bowler
│   │   └── auditRoutes.js     # /api/audit/:matchId
│   └── services/
│       └── scoringEngine.js   # Authoritative cricket scoring engine
└── client/                    # Frontend React + Vite SPA
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── .env.example
    ├── public/
    │   └── _redirects         # SPA rewrite rule for Render Static Sites
    └── src/
        ├── main.jsx           # App entry with BrowserRouter & AuthProvider
        ├── App.jsx            # 15 page routes & protected admin routes
        ├── context/
        │   └── AuthContext.jsx
        ├── services/
        │   ├── api.js         # Fetch wrapper with JWT headers
        │   └── socket.js      # Socket.IO client singleton
        ├── styles/
        │   └── index.css      # Custom bright cricket design & utilities
        ├── components/
        │   ├── Navbar.jsx     # Navigation bar with branding & live indicator
        │   ├── Footer.jsx     # Footer component
        │   ├── ScorecardView.jsx # Comprehensive batting, bowling, extras tables
        │   └── CommentaryView.jsx # Live ball-by-ball commentary stream
        └── pages/
            ├── HomePage.jsx   # Featured live match, live, upcoming, results
            ├── LiveMatchesPage.jsx # Filterable live matches directory
            ├── MatchDetailsPage.jsx # Live match center with overview & tabs
            ├── MatchResultPage.jsx  # Final result and complete scorecard
            ├── TeamsPage.jsx  # Club teams list and creation modal
            ├── PlayersPage.jsx # Players directory and registration modal
            ├── AdminLoginPage.jsx # Admin password sign-in
            ├── AdminDashboardPage.jsx # Match management & status triggers
            ├── TossPage.jsx   # Coin toss and automatic team role resolver
            ├── PlayingXIPage.jsx # Squad XI selection with 11-player validator
            └── AdminScoringConsolePage.jsx # Ultra-fast scoring keypad & controls
```

---

## 🛠️ Requirements

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **MongoDB**: MongoDB Atlas cluster URI or local MongoDB daemon (`mongodb://127.0.0.1:27017/sundaymatches`). In local development without MongoDB installed, an embedded `mongodb-memory-server` spins up automatically for testing.

---

## ⚙️ Environment Variables

### Server (`server/.env`):
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/sundaymatches?retryWrites=true&w=majority
JWT_SECRET=sundaymatches_super_secret_jwt_key_2026
ADMIN_PASSWORD=admin123
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

> **Note:** Never commit production `.env` files to git.

### Client (`client/.env`):
```env
# Leave blank during local development to use Vite proxy
# On Render production, set to your backend service URL:
VITE_API_URL=https://sundaymatches-backend.onrender.com
```

---

## 🚀 Local Installation & Quickstart

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone <repo-url>
cd sundaymatches

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Run the Backend Server
```bash
cd server
npm start
```
The server will boot up at `http://localhost:5000`. If `MONGODB_URI` is not set, it will start an in-memory MongoDB instance automatically and seed default teams ("Royal Strikers", "Thunderbolts XI") and players.

You can verify the health check:
```bash
curl http://localhost:5000/health
```
Response:
```json
{
  "status": "ok",
  "timestamp": "2026-09-30T15:42:30.725Z",
  "uptime": 44.39,
  "service": "SundayMatches Backend",
  "database": "connected"
}
```

### 3. Run the Frontend Client
In a new terminal window:
```bash
cd client
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🔑 Admin Login Setup

1. Click **Admin Login** in the navigation bar or visit `/admin/login`.
2. Enter:
   - **Username**: `admin`
   - **Password**: `admin123` (or the value of `ADMIN_PASSWORD` in your `.env`)
3. Once logged in, you can create matches, conduct coin toss, choose playing XIs, and access the live scoring console.

---

## 🚀 Render Deployment Guide

SundayMatches is pre-configured for seamless deployment to **Render** via `render.yaml` or through manual service configuration.

### Option A: 1-Click Blueprint (`render.yaml`)
1. Push your repository to GitHub.
2. In the Render Dashboard, click **New +** -> **Blueprint**.
3. Select your GitHub repository.
4. Render will detect `render.yaml` and configure both services:
   - `sundaymatches-backend` (Web Service)
   - `sundaymatches-frontend` (Static Site)
5. Set your `MONGODB_URI` and `ADMIN_PASSWORD` in the environment variables prompt.
6. Click **Apply**.

---

### Option B: Manual Setup on Render

#### 1. Backend Service (Web Service)
- **Service Type**: Web Service
- **Environment**: Node
- **Root Directory**: `server`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/health`
- **Environment Variables**:
  - `PORT`: `10000` (Render default)
  - `NODE_ENV`: `production`
  - `MONGODB_URI`: `<Your MongoDB Atlas Connection String>`
  - `JWT_SECRET`: `<A secure random string>`
  - `ADMIN_PASSWORD`: `<Your chosen admin password>`
  - `CLIENT_URL`: `https://<your-frontend-subdomain>.onrender.com`

#### 2. Frontend Service (Static Site)
- **Service Type**: Static Site
- **Root Directory**: `client`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL`: `https://<your-backend-service>.onrender.com`
- **Redirects / Rewrites**:
  - The repository contains `client/public/_redirects` which automatically handles client-side routing on Render:
    ```
    /*    /index.html   200
    ```
  - This ensures that refreshing `/matches/:id` or `/admin/score/:id` loads the React app without 404 errors.

---

## 🧪 Verified Automated Test Scenarios

The engine test suite (`server/test-engine.js` & `server/test-server-integration.js`) rigorously tests and validates all 14 required cricket scenarios:

| Test ID | Scenario | Verified Engine Behavior | Status |
|---|---|---|---|
| **TEST 1** | Normal 0-ball | Striker, non-striker, and bowler remain unchanged; legal ball increments | **PASSED** |
| **TEST 2** | 1 run | Strike rotates correctly between batters; score increases | **PASSED** |
| **TEST 3** | 4 runs | Striker remains on strike according to cricket rules; score increases | **PASSED** |
| **TEST 4** | Wide delivery | Legal balls count unchanged; score increases; bowler and striker retained | **PASSED** |
| **TEST 5** | No-ball | Legal ball count unchanged; score increases; free continue | **PASSED** |
| **TEST 6** | No-ball + bat runs | No-ball extra + bat runs combined; batsman statistics updated correctly | **PASSED** |
| **TEST 7** | No-ball + Run Out | Selected batter dismissed; incoming batter admitted; delivery remains illegal | **PASSED** |
| **TEST 8** | Normal wicket (Bowled) | Striker dismissed; new batter admitted; legal balls advance | **PASSED** |
| **TEST 9** | Stumping | Wicketkeeper credited as fielder; dismissal type STUMPED | **PASSED** |
| **TEST 10** | Over completion (6 balls) | Strike rotates at end of over; active bowler cleared; next ball blocked until new bowler is selected | **PASSED** |
| **TEST 11** | Browser refresh | Backend stores authoritative `activeStrikerId`, `activeNonStrikerId`, `activeBowlerId`; restored seamlessly | **PASSED** |
| **TEST 12** | Multi-window sync | Scoring actions broadcast instantly through Socket.IO rooms | **PASSED** |
| **TEST 13** | Bulletproof Undo | Full state snapshot restored: score, wickets, overs, strikers, bowler, commentary | **PASSED** |
| **TEST 14** | Render readiness | `/health` returns JSON; 0.0.0.0 binding; SPA `_redirects` fallback active | **PASSED** |

To run the engine test suite locally:
```bash
cd server
npm test
```

To run the end-to-end integration test:
```bash
node test-server-integration.js
```

---

## 🛠️ Troubleshooting

- **CORS Errors**: Ensure `CLIENT_URL` on the backend matches the frontend URL or leave `cors({ origin: '*' })` enabled.
- **Socket.IO not connecting**: Check that `VITE_API_URL` is configured in the client environment on Render.
- **Page refresh shows 404 on Render**: Ensure `client/public/_redirects` is deployed with `/* /index.html 200`.
- **Database connection error**: Verify your MongoDB Atlas IP Access List allows `0.0.0.0/0` (All IPs) on Render.

---

&copy; 2026 SundayMatches. Fast, Simple &amp; Live Cricket Scoring.
