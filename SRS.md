SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
TakeLow Auction Platform — "Take It. Low."
Version: 4.0 (Enhanced)
Tech Stack: NestJS, React, React Native (Expo), PostgreSQL, Redis, BullMQ, Socket.io

SECTION 1: INTRODUCTION & SCOPE
1.1 Purpose
The TakeLow platform is a mobile-first (Android/iOS) and web-based auction system using a Lowest Unique Bid (LUB) mechanism. The winner is the user who submits the lowest unique bid amount (up to 2 decimal places) before the timer expires.

1.2 Core Business Rule (The Algorithm)
If ETB 1.00 is submitted twice, ETB 2.50 once, ETB 3.00 twice, and ETB 4.00 once, the lowest unique bid is ETB 2.50 — that user wins.
RULE: Bid amounts support exactly 2 decimal places (e.g., 10.50, 23.45, 1000.00, 92047.23). Minimum bid is 1.00 ETB. There is no fixed upper ceiling other than the storage limit of the `bids.amount` column (`DECIMAL(12,2)`, max 9,999,999,999.99 ETB). All bid inputs accept the full range and normalize input to 2 decimal places on blur.

1.3 Scope
The system includes:
1. Cross-platform Web (React) and Native Mobile (React Native/Expo) apps.
2. 3-microservice distributed backend (Identity, Engine, Query).
3. User authentication via phone + password, wallet management, real-time bidding, and automated winner determination via Redis ZSET.
4. Mock fintech wallet (no live payment integration).
5. **OWASP Top 10 security controls** including internal API key auth, rate limiting, SSRF protection, and audit logging.

SECTION 2: FUNCTIONAL REQUIREMENTS (FR)
FR-01: User Authentication & Profile
  FR-01.1: Register and login using phone number + password (bcrypt-hashed, cost 12).
  FR-01.2: JWT-based authentication with 15-minute access tokens and 7-day refresh tokens. Automatic token refresh on 401 responses.
  FR-01.3: Wallet PIN (separate from auth PIN) required to approve bid fee payments. PIN has 5-attempt lockout (30 min).
  FR-01.4: Users can view their bid history and won items. Profile update endpoint (PATCH /auth/profile) for name/email changes.
  FR-01.5: 30 seed users created on startup for testing (all login with password 0000). Admin users use password 1234.
  FR-01.6: **Rate limiting**: Login limited to 5 attempts per minute per identifier (email/phone) via Redis. Brute-force protection on all auth endpoints.
  FR-01.7: **Failed login auditing**: All failed login attempts are logged to the audit trail with identifier, reason, and timestamp.

FR-02: Auction Bidding Engine (Core Business Logic)
  FR-02.1 (Bid Placement): Users enter a bid amount (2-decimal precision, min 1.00; any value above 1.00 is accepted, e.g. 1000.00, 92047.23) and pay a non-refundable "Bid Service Fee" (minimum 1.00 ETB, configurable via BID_FEE) from their wallet.
  FR-02.2 (Bid Service Fee): Fee deducted atomically via wallet service call on bid submission. Supports both SikinaPay and wallet payment methods. Bid fee must be at least 1.00 and is configured via the BID_FEE environment variable.
  FR-02.3 (Real-time Updates): Socket.io pushes bid updates (total_bids, new bid amount) to all subscribed users in real-time. WebSocket CORS restricted to configured origins.
  FR-02.4 (LUB Calculation): Redis ZSET tracks bid frequencies and unique bids in real-time (ZINCRBY / ZREM). On auction close, ZRANGEBYSCORE finds the lowest unique bid in O(log N). **Batch winner calculation** uses a single DB query for all winning amounts instead of N individual queries.
  FR-02.5 (Ticket Number): Each successful bid generates a unique ticket number (BID_ + 12 hex chars) stored in the bid record and returned to the client.
  FR-02.6 (Outbid Notifications): When a bid makes a previously unique amount non-unique, all previous bidders at that amount receive an outbid alert via the notification service.
  FR-02.7 (Bid Validation): Bid amount validated server-side with class-validator (@IsNumber, maxDecimalPlaces: 2, @Min(1.00), @Max(9999999999.99) matching DECIMAL(12,2)). Frontend inputs allow the full 1.00–9,999,999,999.99 range and normalize display to 2 decimal places (e.g., 1000.00, 23.45, 92047.23). Nonce+timestamp headers prevent replay attacks.

FR-03: Product & Auction Management
  FR-03.1 (Product Details): Display images, descriptions, and current market value per product.
  FR-03.2 (Countdown Timer): Real-time countdown (HH:MM:SS) synced to server time. "Ending Soon" state and orange styling when <1 hour remaining.
  FR-03.3 (Closed Auction History): Past auctions shown separately with winner info and final bid count.
  FR-03.4 (Auction Cards): Compact display with bid count ("X bids") and timer. Deduplicated at render and data layers.

FR-04: Notifications
  FR-04.1 (Mock SMS): Console-logged SMS notification with ticket number after each successful bid.
  FR-04.2 (Outbid Alerts): Console-logged outbid notification when a bidder is displaced (their amount becomes non-unique).
  FR-04.3 (No real push notifications): FCM/APNS not implemented. Placeholder for future.

FR-05: Payments & Wallet
  FR-05.1: Internal wallet with deposit, balance check, and PIN-protected withdrawals.
  FR-05.2: Bid fee (configurable via BID_FEE env var, minimum 1.00) is collected on bid placement via the auction engine calling the identity service.
  FR-05.3: Wallet balance refreshes after every bid and on login.
  FR-05.4: No real fintech/fintech payment integration — fully mock.

SECTION 3: NON-FUNCTIONAL REQUIREMENTS (NFR)
  NFR-01 (Performance): Redis-based bid tracking handles high concurrency. BullMQ batch worker (batch size 50) persists bids asynchronously.
NFR-14 (Query Optimization): N+1 queries eliminated in auction listing (2 batch aggregate queries replace 2N per-auction queries). Composite indexes on auctions(status,end_time), auctions(status,payment_status,winner_user_id), bids(auction_id,amount), bids(auction_id,user_id). Selective .select() minimizes fetched columns.
NFR-15 (Paginated Responses): Wallet transactions and favorites endpoints return { data, total } with offset/limit pagination.
  NFR-02 (Real-time): Socket.io WebSocket connections for live bid updates.
  NFR-03 (Security): JWT auth with 15-min expiry + auto-refresh. JWT secrets validated on startup (reject well-known defaults). Bid nonce/timestamp headers prevent replay attacks. Wallet PIN with lockout.
NFR-07 (Internal Auth): All service-to-service calls use x-internal-api-key header validated by InternalAuthGuard. Admin endpoints require internal key or admin role.
NFR-08 (SSRF Protection): Image upload/download restricted to HTTPS URLs only. Private IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x) blocked. MIME type + extension validation enforced.
NFR-09 (OTP/Log Sanitization): Sensitive fields (phone, OTP codes) masked in logs. Error responses do not leak internal details.
NFR-10 (CSRF): Internal API key header required for mutating admin endpoints (double-submit cookie pattern equivalent via INTERNAL_API_KEY).
NFR-11 (CORS): All services locked to CORS_ORIGINS env var. WebSocket connections validated against whitelist.
NFR-12 (Ban/Blocklist): User ban status checked on every JWT authentication (DB + Redis blocklist). Banned users cannot obtain valid tokens.
NFR-13 (Error Handling): Zero silent .catch() patterns. All promise rejections logged at minimum to warn level.
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
  winning_bid_amount (DECIMAL(12,2), Nullable)
  min_bid (DECIMAL(12,2), Nullable)
  max_bid (DECIMAL(12,2), Nullable)
  num_winners (INTEGER, default 1)
  created_at (TIMESTAMP)
  Indexes: (status, end_time), (status, payment_status, winner_user_id)

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
  amount (DECIMAL(12,2)) — 2-decimal precision; supports 1.00 up to 9,999,999,999.99
  bid_time (TIMESTAMP)
  service_fee_paid (BOOLEAN, default TRUE)
  ticket_number (VARCHAR, nullable) — BID_XXXXXXXXXXXX format
  created_at (TIMESTAMP)
  Indexes: (auction_id, amount), (auction_id, user_id)

Table: Winners
  id (UUID, Primary Key)
  auction_id (UUID, Foreign Key to Auctions)
  user_id (UUID, Foreign Key to Users)
  amount (DECIMAL(12,2))
  payment_status (VARCHAR, default 'pending')
  payment_deadline (TIMESTAMP)
  created_at (TIMESTAMP)

SECTION 6: CRITICAL ALGORITHMS & LOGIC
6.1 The "Incremental Winner" Algorithm (Redis ZSET Method)
   Winner calculation uses Redis exclusively — no DB query at close time.
   All amount keys are normalized to 2 decimals (e.g., 10.5 is stored as "10.50") so integer and decimal bids of the same value share one frequency entry.
   1. Bid Placement: ZINCRBY takelow:auction:{id}:frequencies 1 <amount> (member normalized to 2 decimals)
   2. Track Uniqueness:
      If frequency returns 1: ZADD takelow:auction:{id}:unique_bids <amount> "<amount>" (score + normalized member)
      If frequency returns >1: ZREM takelow:auction:{id}:unique_bids "<amount>"
  3. Determine Winner (At auction close):
     ZRANGEBYSCORE takelow:auction:{id}:unique_bids 0 0 WITHSCORES LIMIT 1
     Returns the lowest unique bid in O(log N).
  4. Fallback: If ZRANGE returns empty, mark auction EXPIRED (no winner).

6.2 Bid Persistence (BullMQ Batch Worker)
  Bids are buffered in-memory and flushed to PostgreSQL in batches of 50 to reduce DB write pressure.
  On auction closure, flushAuction() persists all remaining buffered bids before closeAuction() runs.

6.3 Batch Winner Bidder Resolution
  Instead of N individual findOne queries for each unique bid amount (O(N) DB round trips),
  a single findEarliestBidders() query fetches the earliest bidder per amount in one round trip.
  Combined with batch aggregate statistics for bid counts and frequency, this eliminates N+1 query
  patterns across winner calculation and auction listing.

6.4 Wallet PIN Lockout
  5 consecutive failed PIN attempts lock the wallet for 30 minutes (pin_locked_until).
  Successful PIN verification resets pin_attempts to 0.
  Lock expiry resets attempts automatically on next attempt.

6.5 Token Refresh Flow
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
  PATCH /api/v1/auth/profile — { full_name?, email? } → { id, phone_number, full_name, email, role }

7.2 Wallet
  GET /api/v1/wallet/balance → { balance }
  POST /api/v1/wallet/deposit — { amount } → { balance }
  POST /api/v1/wallet/set-pin — { pin } → { set: true }
  POST /api/v1/wallet/verify-pin — { pin } → { valid, attemptsRemaining, locked, lockedUntil }
  GET /api/v1/wallet/pin-status → { hasPin, attemptsRemaining, locked, lockedUntil }
  POST /api/v1/wallet/deduct-fee — { user_id, amount } (InternalAuthGuard) → { deducted: true }
  GET /api/v1/wallet/transactions?offset=0&limit=20 → { data: Transaction[], total: number }

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

10.8 N+1 Query on Auction Listing
  Problem: Per-auction aggregate queries cause O(N) DB round trips.
  Solution: Two batch queries (total bids + unique bidders per auction) replace 2N individual queries.

10.9 Silent Error Swallowing
  Problem: .catch(()=>{}) hides errors and makes debugging impossible.
  Solution: All rejected promises logged at minimum to warn level. Zero silent .catch() in the codebase.

10.10 JWT Secret Leak via Default Config
  Problem: CI/test environments using well-known default JWT secrets allow token forgery.
  Solution: Config module validates JWT_SECRET !== 'default-secret-change-me' on startup and throws otherwise.

SECTION 11: TESTING STRATEGY
11.1 Backend Tests (Jest)
  Identity Service: 2 unit tests (wallet PIN verification, user registration).
  Overall: 13 passing tests across all services.

11.2 TypeScript Compilation
  All 5 projects (identity-service, auction-engine, query-service, takelow-app, takelow-web) must compile with npx tsc --noEmit producing zero errors.

11.3 Security Verification
  JWT secrets validated on startup (ConfigService throws if default).
  Internal API key required for all service-to-service and admin endpoints.
  SSRF protection verified via MIME header + private IP range checks.

SECTION 12: SEED DATA
  Script: scripts/seed.js
  Creates 30 users (phone numbers 0911000001–0911000030, PIN 0000, wallet 100 ETB).
  Creates 2 admin users (0911000099 with PIN 1234).
  Creates 10 products + 10 auctions (some active, some closed, some ending soon).
  Resets pin_attempts and pin_locked_until on conflict to recover corrupted user records.
  Can run via API (seedViaApi) or direct DB (seedViaDb).
