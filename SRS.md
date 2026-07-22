SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
TakeLow Auction Platform — "Take It. Low."
Version: 3.1 (Current Implementation)
Tech Stack: NestJS, React, React Native (Expo), PostgreSQL, Redis, BullMQ, Socket.io

SECTION 1: INTRODUCTION & SCOPE
1.1 Purpose
The TakeLow platform is a mobile-first (Android/iOS) and web-based auction system using a Lowest Unique Bid (LUB) mechanism. The winner is the user who submits the lowest unique integer bid amount before the timer expires.

1.2 Core Business Rule (The Algorithm)
If ETB 1 is submitted twice, ETB 2 once, ETB 3 twice, and ETB 4 once, the lowest unique bid is ETB 2 — that user wins.
STRICT RULE: Only integer bid amounts. No decimals.

1.3 Scope
The system includes:
1. Cross-platform Web (React) and Native Mobile (React Native/Expo) apps.
2. 3-microservice distributed backend (Identity, Engine, Query).
3. User authentication via phone + PIN (password), wallet management, real-time bidding, and automated winner determination via Redis ZSET.
4. Mock fintech wallet (no live payment integration).

SECTION 2: FUNCTIONAL REQUIREMENTS (FR)
FR-01: User Authentication & Profile
  FR-01.1: Register and login using phone number + PIN (bcrypt-hashed). PIN is used as the primary credential.
  FR-01.2: JWT-based authentication with 15-minute access tokens and refresh tokens. Automatic token refresh on 401 responses.
  FR-01.3: Wallet PIN (separate from auth PIN) required to approve bid fee payments. PIN has 5-attempt lockout (30 min).
  FR-01.4: Users can view their bid history and won items.
  FR-01.5: 30 seed users created on startup for testing (all login with PIN 0000). Admin users use PIN 1234.

FR-02: Auction Bidding Engine (Core Business Logic)
  FR-02.1 (Bid Placement): Users enter an integer bid amount and pay a non-refundable "Bid Service Fee" (50 ETB) from their wallet.
  FR-02.2 (Bid Service Fee): Wallet PIN must be verified before fee is deducted. Fee deducted atomically on bid submission.
  FR-02.3 (Real-time Updates): Socket.io pushes bid updates (total_bids, new bid amount) to all subscribed users in real-time. A 30-second polling fallback refreshes auction data.
  FR-02.4 (LUB Calculation): Redis ZSET tracks bid frequencies and unique bids in real-time (ZINCRBY / ZREM). On auction close, ZRANGEBYSCORE finds the lowest unique bid in O(log N).
  FR-02.5 (Ticket Number): Each successful bid generates a unique ticket number (BID_ + 12 hex chars) stored in the bid record and returned to the client.

FR-03: Product & Auction Management
  FR-03.1 (Product Details): Display images, descriptions, and current market value per product.
  FR-03.2 (Countdown Timer): Real-time countdown (HH:MM:SS) synced to server time. "Ending Soon" state and orange styling when <1 hour remaining.
  FR-03.3 (Closed Auction History): Past auctions shown separately with winner info and final bid count.
  FR-03.4 (Auction Cards): Compact display with bid count ("X bids") and timer. Deduplicated at render and data layers.

FR-04: Notifications
  FR-04.1 (Mock SMS): Console-logged SMS notification with ticket number after each successful bid.
  FR-04.2 (No real push notifications): FCM/APNS not implemented. Placeholder for future.

FR-05: Payments & Wallet
  FR-05.1: Internal wallet with deposit, balance check, and PIN-protected withdrawals.
  FR-05.2: Bid fee deduction (50 ETB) happens on bid placement via the auction engine calling the identity service.
  FR-05.3: Wallet balance refreshes after every bid and on login.
  FR-05.4: No real fintech/fintech payment integration — fully mock.

SECTION 3: NON-FUNCTIONAL REQUIREMENTS (NFR)
  NFR-01 (Performance): Redis-based bid tracking handles high concurrency. BullMQ batch worker (batch size 50) persists bids asynchronously.
  NFR-02 (Real-time): Socket.io WebSocket connections for live bid updates.
  NFR-03 (Security): JWT auth with 15-min expiry + auto-refresh. Bid nonce/timestamp headers prevent replay attacks. Wallet PIN with lockout.
  NFR-04 (Platform):
    Web: React with Tailwind CSS.
    Mobile: React Native (Expo) for Android/iOS.
  NFR-05 (State Management): React Context API with AsyncStorage persistence for offline state survival.
  NFR-06 (Data Integrity): Wallet deductions use repository.update() (not save()) to prevent partial-entity overwrites.

SECTION 4: SYSTEM ARCHITECTURE & TECH STACK
4.1 Frontend (Client-Side)
  Web Application: React with TypeScript and Tailwind CSS.
  Mobile Application: React Native (Expo CLI) for Android/iOS.
  State Management: React Context API + useReducer pattern with AsyncStorage persistence.
  Real-time Client: Socket.io-client.
  All apps share similar AppContext pattern with useApp() hook.

4.2 Backend (Server-Side — 3 Microservices)
  Framework: NestJS (Node.js).
  Architecture: CQRS-inspired split into 3 services:
  1. Identity & Wallet Service (port 3001): JWT auth, user registration, wallet management, PIN verification.
  2. Auction Engine Service (port 3002): Real-time bidding, WebSockets, Redis bid tracking, BullMQ workers, winner determination.
  3. Query/Read Service (port 3003): Read-optimized auction/product queries with bid statistics.

4.3 Data Layer
  Primary Database: PostgreSQL 15.
  In-Memory Database: Redis. Tracks bid frequencies (ZSET), unique bids (ZSET), total_bids counter, auction locks.
  Async Queue: BullMQ (backed by Redis) for batched bid persistence and auction closure.
  ORM: TypeORM.
  File Storage: Local/URL-based images (no CDN).

4.4 Infrastructure & DevOps
  Containerization: Docker Compose for local development (postgres, redis, 3 services).
  Orchestration: None (not yet deployed to Kubernetes).
  CI/CD: None (manual build/test).

SECTION 5: COMPLETE DATABASE SCHEMA DESIGN (POSTGRESQL)
Table: Users
  id (UUID, Primary Key)
  phone_number (VARCHAR, Unique)
  password_hash (VARCHAR) — bcrypt hash of auth PIN
  wallet_pin_hash (VARCHAR) — bcrypt hash of wallet PIN
  wallet_balance (DECIMAL, default 0.00)
  full_name (VARCHAR)
  avatar_url (VARCHAR)
  role (VARCHAR, default 'user') — 'user' or 'admin'
  pin_attempts (INTEGER, default 0)
  pin_locked_until (TIMESTAMP, nullable)
  hashed_refresh_token (VARCHAR, nullable)
  created_at (TIMESTAMP)

Table: Auctions
  id (UUID, Primary Key)
  product_id (UUID, Foreign Key to Products)
  start_time (TIMESTAMP)
  end_time (TIMESTAMP)
  status (ENUM: 'ACTIVE', 'CLOSED', 'EXPIRED')
  winner_user_id (UUID, Foreign Key to Users, Nullable)
  winning_bid_amount (INTEGER, Nullable)
  min_bid (INTEGER, Nullable)
  max_bid (INTEGER, Nullable)
  num_winners (INTEGER, default 1)
  created_at (TIMESTAMP)

Table: Products
  id (UUID, Primary Key)
  name (VARCHAR)
  description (TEXT)
  image_urls (JSONB)
  current_market_price (DECIMAL)
  brand (VARCHAR)
  created_at (TIMESTAMP)

Table: Bids
  id (UUID, Primary Key)
  user_id (UUID, Foreign Key to Users)
  auction_id (UUID, Foreign Key to Auctions)
  amount (INTEGER)
  bid_time (TIMESTAMP)
  service_fee_paid (BOOLEAN, default TRUE)
  ticket_number (VARCHAR, nullable) — BID_XXXXXXXXXXXX format
  created_at (TIMESTAMP)

Table: Winners
  id (UUID, Primary Key)
  auction_id (UUID, Foreign Key to Auctions)
  user_id (UUID, Foreign Key to Users)
  amount (INTEGER)
  payment_status (VARCHAR, default 'pending')
  payment_deadline (TIMESTAMP)
  created_at (TIMESTAMP)

SECTION 6: CRITICAL ALGORITHMS & LOGIC
6.1 The "Incremental Winner" Algorithm (Redis ZSET Method)
  Winner calculation uses Redis exclusively — no DB query at close time.
  1. Bid Placement: ZINCRBY takelow:auction:{id}:frequencies 1 <amount>
  2. Track Uniqueness:
     If frequency returns 1: ZADD takelow:auction:{id}:unique_bids 0 <amount>
     If frequency returns >1: ZREM takelow:auction:{id}:unique_bids <amount>
  3. Determine Winner (At auction close):
     ZRANGEBYSCORE takelow:auction:{id}:unique_bids 0 0 WITHSCORES LIMIT 1
     Returns the lowest unique bid in O(log N).
  4. Fallback: If ZRANGE returns empty, mark auction EXPIRED (no winner).

6.2 Bid Persistence (BullMQ Batch Worker)
  Bids are buffered in-memory and flushed to PostgreSQL in batches of 50 to reduce DB write pressure.
  On auction closure, flushAuction() persists all remaining buffered bids before closeAuction() runs.

6.3 Wallet PIN Lockout
  5 consecutive failed PIN attempts lock the wallet for 30 minutes (pin_locked_until).
  Successful PIN verification resets pin_attempts to 0.
  Lock expiry resets attempts automatically on next attempt.

6.4 Token Refresh Flow
  All API requests go through a unified request() function.
  On 401 response, the function automatically calls POST /auth/refresh with the stored refresh token.
  On success, retries the original request with the new access token.
  On failure, clears tokens and forces re-login.

SECTION 7: API CONTRACT DEFINITIONS
7.1 Authentication
  POST /api/v1/auth/register — { phone_number, password, full_name } → { access_token, refresh_token, user }
  POST /api/v1/auth/login/phone — { phone_number, password } → { access_token, refresh_token, user }
  POST /api/v1/auth/refresh — { refresh_token } → { access_token, refresh_token }
  GET /api/v1/auth/profile → { id, phone_number, full_name, role, wallet_balance }

7.2 Wallet
  GET /api/v1/wallet/balance → { balance }
  POST /api/v1/wallet/deposit — { amount } → { balance }
  POST /api/v1/wallet/set-pin — { pin } → { set: true }
  POST /api/v1/wallet/verify-pin — { pin } → { valid, attemptsRemaining, locked, lockedUntil }
  GET /api/v1/wallet/pin-status → { hasPin, attemptsRemaining, locked, lockedUntil }
  POST /api/v1/wallet/deduct-fee — { user_id, amount } → { deducted: true }

7.3 Auctions (Query Service)
  GET /api/v1/auctions/active → Auction[] (with stats: total_bids, unique_bidders)
  GET /api/v1/auctions/closed → Auction[]
  GET /api/v1/auctions/:id → Auction
  GET /api/v1/auctions/:id/result → { winner info, bids, my_bid }

7.4 Bidding (Engine Service)
  POST /api/v1/auctions/:id/bid — { amount } + headers { x-bid-nonce, x-bid-timestamp } → { message, new_total_bids, ticket_number }

7.5 Admin (Engine Service)
  GET /api/v1/admin/auctions — paginated auction list (with stats)
  POST /api/v1/admin/auctions — create auction
  PATCH /api/v1/admin/auctions/:id — update auction
  POST /api/v1/admin/auctions/:id/close — close auction
  GET /api/v1/admin/auctions/:id/winner — draw winner
  GET /api/v1/admin/auctions/:id/bids — list bids
  POST /api/v1/admin/products — create product
  PATCH /api/v1/admin/products/:id — update product
  GET /api/v1/admin/products — list products

7.6 WebSocket
  Connect to ws://host:3002/auctions
  Subscribe: emit 'subscribe:auction' with auction_id
  Event 'auction:update': { auction_id, new_bid_amount, total_bids, timestamp }
  Unsubscribe: emit 'unsubscribe:auction' with auction_id

SECTION 8: FRONTEND IMPLEMENTATION (REACT & REACT NATIVE)
8.1 State Management (React Context + AsyncStorage)
  Both apps use a single AppContext/AppProvider pattern with the useApp() hook.
  State slices: view, user, auctions, myBids, allBids, walletBalance, selectedAuction, feePaid state.
  Persistence: AsyncStorage saves/restores auctions, bids, wallet balance, user, and tokens.
  Hydration: On app start, saved state is loaded, then fresh data is fetched from APIs.

8.2 Navigation
  View-based navigation (not stack/router). A ScreenRouter component switches on the 'view' state.
  Bottom tab bar: Home, Auctions, My Bids, Sign Out (visible on main screens).
  AppBar component with optional onBack prop for screen-level back navigation.

8.3 Screens
  LoginScreen / RegisterScreen — Phone + PIN auth.
  HomeScreen — Wallet balance, quick actions, auction promo, admin panel link.
  AuctionsScreen — Filterable auction card grid with category chips. Deduplicated rendering.
  ProductScreen — Auction details, images, place bid CTA.
  PayFeeScreen — Wallet PIN entry modal, remaining attempt count, lockout display.
  PlaceBidScreen — Bid amount stepper + submit.
  BidConfirmedScreen — Success display with ticket number and mock SMS notification.
  MyBidsScreen — List of user's placed bids with ticket numbers.
  AdminDashboard/Monitor/Winner — Admin-only screens for managing auctions and users.

8.4 UI Patterns
  LinearGradient cards, skeleton loaders, pull-to-refresh, modal dropdown menus.
  Error states with remaining attempt counts shown on PIN entry.
  Empty states for no results / no bids.

SECTION 9: INFRASTRUCTURE
9.1 Docker Compose (Local Development)
  services:
    postgres: citusdata/citus:12.1 (port 5432)
    redis: redis:7-alpine (port 6379)
    identity-service (port 3001)
    auction-engine (port 3002)
    query-service (port 3003)

9.2 Ports
  Identity API: 3001
  Engine API: 3002
  Query API: 3003
  WebSocket: 3002 (same as engine, /auctions namespace)

SECTION 10: EDGE CASES & EXCEPTION HANDLING
10.1 Duplicate Auction IDs
  Problem: Active + closed auction lists can overlap, causing React key errors.
  Solution: Deduplication at 4 levels — API response merge, AsyncStorage hydration, fetchAuctionById, and render-level useMemo.

10.2 Stale Bid Counts
  Problem: BullMQ batch worker (size 50) delays PostgreSQL writes, making query-service bid counts stale.
  Solution: Frontend increments bid count locally on submitBid. Socket events update counts from Redis (real-time). refreshAuctions() provides eventual consistency.

10.3 Expired JWT During PIN Verification
  Problem: 15-minute token expiry kills wallet PIN verification mid-flow.
  Solution: Automatic token refresh interceptor retries the request with a fresh token.

10.4 Wallet PIN Lockout
  Problem: 5 failed attempts lock the wallet for 30 minutes.
  Solution: Lockout display with countdown timer. Reset via successful verification or seed script.

10.5 The Last-Second "Sniper" Rush
  Problem: Multiple bids arriving at the exact close time.
  Solution: Server-side timestamp check enforces hard cutoff. WebSocket gateway rejects bids after end_time.

10.6 The No-Winner Scenario
  Problem: Auction ends with 0 bids or all bids duplicated.
  Solution: ZRANGEBYSCORE returns empty → mark expired. UI shows "Expired — No Winner".

10.7 Partial Entity Save Bug
  Problem: repository.save() on a partial entity (loaded with .select()) nullifies unselected columns.
  Solution: Always use repository.update() with explicit column names for partial writes.

SECTION 11: TESTING STRATEGY
11.1 Backend Tests (Jest)
  Identity Service: 2 unit tests (wallet PIN verification, user registration).
  Overall: 13 passing tests across all services.

11.2 TypeScript Compilation
  All 5 projects (identity-service, auction-engine, query-service, takelow-app, takelow-web) must compile with npx tsc --noEmit producing zero errors.

SECTION 12: SEED DATA
  Script: scripts/seed.js
  Creates 30 users (phone numbers 0911000001–0911000030, PIN 0000, wallet 100 ETB).
  Creates 2 admin users (0911000099 with PIN 1234).
  Creates 10 products + 10 auctions (some active, some closed, some ending soon).
  Resets pin_attempts and pin_locked_until on conflict to recover corrupted user records.
  Can run via API (seedViaApi) or direct DB (seedViaDb).
