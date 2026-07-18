SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
TakeLow Auction Platform - "Take It. Low."
Version: 3.0 (Complete Architecture - Unabridged)
Target Users: 10 - 20 Million
Tech Stack: NestJS, React, React Native (Expo), PostgreSQL (Citus), Redis Enterprise, Kubernetes (EKS), Cloudflare CDN.
 
SECTION 1: INTRODUCTION & SCOPE
1.1 Purpose
The TakeLow platform is a mobile-first (Android/iOS) and web-based auction system utilizing a Lowest Unique Bid (LUB) mechanism. Unlike traditional English auctions, the winner is not the highest bidder, but the user who submits the lowest, unique bid amount before the timer expires.
1.2 Core Business Rule (The Algorithm)
If ETB 1.00 is submitted twice, ETB 2.00 once, ETB 3.00 twice, and ETB 4.00 once, the lowest unique bid is ETB 2.00, so it wins.
STRICT RULE: The system does NOT support decimals in bidding. Only integers (e.g., 2, 5, 10) are accepted.
1.3 Scope
The system includes:
1.	Cross-platform Web (React) and Native Mobile (React Native) apps.
2.	Massively scalable distributed backend.
3.	User management, real-time concurrent bidding engine, product cataloging, financial ledgering, and automated winner determination.
4.	Full integrations with a fintech payment solution for payments.
 
SECTION 2: FUNCTIONAL REQUIREMENTS (FR)
FR-01: User Authentication & Profile
•	FR-01.1 (Multi-Protocol Authentication & SSO):
The system must support a comprehensive, multi-layered login and registration ecosystem. Users can register/login using the following methods:
1.	Standard Credentials: Email address + Password, or Phone Number + OTP (One-Time Password via SMS).
2.	Financial & Fintech Integration: Direct authentication via a fintech mobile money platform and Bank Accounts (via secure API integrations or supported third-party banking aggregators), allowing users to verify their identity and link payment sources in one seamless action.
3.	Super App Integration: The backend must implement OAuth 2.0 / OpenID Connect (OIDC) standards to allow effortless Single Sign-On (SSO) from external "Super Apps" (e.g., fintech apps, local banking apps, or major regional digital ecosystems). This allows users to log in and authorize the TakeLow platform without creating a new password.
•	FR-01.2: Users can view their bid history, won items, and favorites list (Image 3 "Add to Favorites").
•	FR-01.3: Users must verify their phone number via OTP for SMS/Push notification delivery and security.
 


FR-02: Auction Bidding Engine (Core Business Logic)
•	FR-02.1 (Bid Placement): Users enter a specific integer amount (e.g., 2.00 ETB) using the - and + controls (Image 2).
•	FR-02.2 (Bid Service Fee): Users must pay a non-refundable "Bid Service Fee" (e.g., 50.00 Br shown in Image 2) to place a bid. The system must ensure the user has sufficient wallet balance before submitting.
•	FR-02.3 (Real-time Updates): As bids occur, the "Total Bids" counter, the specific bid values, and the countdown timer must update live for all active users without page refreshes.
•	FR-02.4 (LUB Calculation): Upon the auction countdown hitting 0, the backend engine must execute the winner algorithm instantly. Declare that user as the winner.
FR-03: Product & Auction Management
•	FR-03.1 (Product Details): Display high-quality images, detailed technical descriptions (e.g., JBL Earbuds ANC specs - Image 4), and current market value (Image 2: "6.8K").
•	FR-03.2 (Countdown Timer): Display a highly visible, real-time countdown (Days, Hours, Minutes, Seconds) for each auction (Image 3) synchronized with the server's UTC time.
•	FR-03.3 (Closed Auction History): Show a separate section for past auctions. Display the winning user, the winning amount, and the final number of total bids (Image 5).
FR-04: Notifications & Social
•	FR-04.1 (Push Notifications): Firebase Cloud Messaging (FCM) for Android and APNS for iOS must alert users: "You have been outbid" (if applicable), "Auction ending soon," and "You Won!".
•	FR-04.2 (Social Sharing): Social sharing buttons (Facebook, Twitter, Telegram, WhatsApp) must be available for active auctions (Image 3).
FR-05: Payments & Wallet (Integration with Fintech Solutions & Banks)
•	FR-05.1: Deep integration with a fintech payment provider (as seen in the header) and major banking APIs for depositing funds into the user's internal app wallet. The system must securely handle callback webhooks from these financial institutions.
•	FR-05.2: Automated, atomic deduction of the Bid Service Fee upon bid submission.
•	FR-05.3: Support for manual refund processing for winning user's service fees or failed delivery.
 
SECTION 3: NON-FUNCTIONAL REQUIREMENTS (NFR)
•	NFR-01 (Performance & Concurrency): The engine must handle 1000+ concurrent bids per second (especially in the last 10 seconds of an auction) with millisecond latency to prevent race conditions.
•	NFR-02 (Real-time Connectivity): The system must use a distributed WebSocket broker capable of holding 10 million open connections simultaneously.
•	NFR-03 (Security): The API must be secured using JWT (JSON Web Tokens) with short expiry times and a sliding refresh window. Bid placement endpoints must be protected against CSRF and replay attacks.
•	NFR-04 (Platform Support):
o	Web: Responsive, mobile-first design (React).
o	Mobile: Native performance on Android and iOS via React Native.
•	NFR-05 (Availability): The platform must guarantee 99.9% uptime during peak bidding hours.
•	NFR-06 (Offline Capability): The React Native app must cache state locally and queue bids if the network drops, syncing automatically upon reconnection.
•	NFR-07 (Data Integrity): All financial transactions must be strictly ACID compliant (Atomic, Consistent, Isolated, Durable).
 
SECTION 4: SYSTEM ARCHITECTURE & TECH STACK
4.1 Frontend (Client-Side)
•	Web Application: React.js with TypeScript and Tailwind CSS.
•	Mobile Application: React Native (Expo CLI) for Android/iOS.
•	State Management: Zustand with persist middleware (using MMKV/AsyncStorage for offline support).
•	Real-time Client: Socket.io-client or Ably SDK.
•	Image Optimization: react-native-fast-image and Cloudinary URLs.
4.2 Backend (Server-Side - CQRS & Microservices)
•	Framework: NestJS (Node.js).
•	Architecture: CQRS Pattern split into 3 isolated, independently scalable microservices:
1.	Identity & Wallet Service: Handles JWT authentication, user registration, and fintech payment webhooks. Why separate? Login surges create heavy CPU load; this must not crash the bidding engine.
2.	Auction Engine Service: Handles only real-time bidding, WebSockets, Redis writes, and the time-keeping cron jobs.
3.	Read/Query Service: Handles all GET API requests (fetching product details, past auction histories). Why separate? Reading from the main database locks up writes. This service reads from the PostgreSQL Read Replica.
4.3 Data Layer
•	Primary Database: PostgreSQL 15 with the Citus extension (enables horizontal sharding based on user_id and auction_id).
•	Read Replica: Secondary PostgreSQL database (replicated via Streaming Replication) for read-only queries to offload the primary.
•	In-Memory Database: Redis Enterprise (Cluster). Used for real-time bid frequency tracking, distributed locks, and worker queues.
•	Streaming/Async: Redis Streams to decouple high-volume bid writes from the primary database (batch inserts).
•	ORM: TypeORM to interface between NestJS and PostgreSQL.
•	File Storage: AWS S3 or Cloudinary for storing product images.
4.4 Infrastructure & DevOps
•	Orchestration: Kubernetes (AWS EKS) with Horizontal Pod Autoscaling (HPA) based on CPU, Memory, and custom Redis queue metrics.
•	CDN: Cloudflare or AWS CloudFront to cache images, static assets, and GET API responses at the edge network (Ethiopian nodes).
•	CI/CD: GitHub Actions automating Docker builds, testing, and rolling updates on the EKS cluster.
•	Containerization: Docker and Docker Compose (for local development).
•	Cost Efficiency: Auto-scaling ensures you don't pay for 50 servers when you only have 1,000 users. Scales up during peak times and scales down overnight.
 
SECTION 5: COMPLETE DATABASE SCHEMA DESIGN (POSTGRESQL)
Table: Users
•	id (UUID, Primary Key)
•	phone_number (VARCHAR, Unique Index, required)
•	wallet_balance (DECIMAL, default 0.00)
•	full_name (VARCHAR)
•	avatar_url (VARCHAR)
•	hashed_refresh_token (VARCHAR)
•	created_at (TIMESTAMP)
Table: Auctions
•	id (UUID, Primary Key)
•	product_id (UUID, Foreign Key to Products)
•	start_time (TIMESTAMP)
•	end_time (TIMESTAMP)
•	status (ENUM: 'ACTIVE', 'CLOSED', 'EXPIRED')
•	winner_user_id (UUID, Foreign Key to Users, Nullable)
•	winning_bid_amount (INTEGER, Nullable) // No decimals
•	created_at (TIMESTAMP)
Table: Products
•	id (UUID, Primary Key)
•	name (VARCHAR)
•	description (TEXT)
•	image_urls (JSONB array)
•	current_market_price (DECIMAL)
•	brand (VARCHAR)
Table: Bids
•	id (UUID, Primary Key)
•	user_id (UUID, Foreign Key to Users)
•	auction_id (UUID, Foreign Key to Auctions)
•	amount (INTEGER) // Strict integers enforced
•	bid_time (TIMESTAMP)
•	service_fee_paid (BOOLEAN, default TRUE)
Table: Transactions
•	id (UUID, Primary Key)
•	user_id (UUID, Foreign Key to Users)
•	amount (DECIMAL)
•	type (ENUM: 'DEPOSIT', 'BID_FEE', 'REFUND')
•	reference_id (VARCHAR, for fintech webhook ID)
•	created_at (TIMESTAMP)
Table: Favorites
•	user_id (UUID, Foreign Key to Users)
•	auction_id (UUID, Foreign Key to Auctions)
•	Primary Key: (user_id, auction_id)
 
SECTION 6: CRITICAL ALGORITHMS & LOGIC
6.1 The "Incremental Winner" Algorithm (Redis ZSET Method)
To handle millions of bids, we do NOT query the database for the winner at the last second. We use Redis memory to calculate it in real-time.
1.	Bid Placement: When a bid is placed, use ZINCRBY in Redis on a key named takelow:auction:{id}:frequencies.
o	Command: ZINCRBY takelow:auction:123:frequencies 1 <Bid_Amount>
2.	Track Uniqueness:
o	If count returns 1 (first time seen), add to unique set: ZADD takelow:auction:{id}:unique_bids 0 <Bid_Amount>.
o	If count returns >1 (duplicate detected), remove immediately: ZREM takelow:auction:{id}:unique_bids <Bid_Amount>.
3.	Determine Winner (At Time=0):
o	Execute: ZRANGEBYSCORE takelow:auction:{id}:unique_bids 0 0 WITHSCORES LIMIT 1.
o	This executes in O(log N) time, taking less than 1 millisecond, regardless of whether there were 100 or 1 million bids.
4.	Fallback: If ZRANGE returns empty, mark the auction as EXPIRED with no winner.
6.2 Database Migration & Optimization Scripts (PostgreSQL)
sql
-- Partitioning the Bids table by date to keep indexes tiny
CREATE TABLE bids_partitioned (LIKE bids INCLUDING ALL) PARTITION BY RANGE (bid_time);
CREATE TABLE bids_2026_q3 PARTITION OF bids_partitioned FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');

-- Partial Index to ensure looking up active auctions is blindingly fast
CREATE INDEX CONCURRENTLY idx_bids_auction_active ON bids (auction_id, amount) WHERE status = 'ACTIVE';

-- Sharding configuration for Citus
SELECT create_distributed_table('users', 'id');
SELECT create_distributed_table('bids', 'auction_id');
 
SECTION 7: API CONTRACT DEFINITIONS
7.1 Get Active Auction Details (Read Service)
•	GET /api/v1/auctions/:id
•	Headers: Authorization: Bearer <JWT>
•	Response (Cached at CDN edge for 60 seconds):
json
{
  "id": "123",
  "product": {
    "name": "Samsung Galaxy A17",
    "images": ["https://cdn.takelow.com/image.jpg"],
    "market_price": 6800,
    "description": "128GB Storage, 6GB RAM"
  },
  "time_remaining": { "days": 8, "hours": 6, "minutes": 44, "seconds": 19 },
  "stats": { "total_bids": 548, "unique_bidders": 340, "viewers": 4402 },
  "min_bid_increment": 1.00,
  "service_fee": 50.00,
  "status": "ACTIVE",
  "user_is_favorite": false
}
7.2 Submit Bid (Auction Engine Service)
•	POST /api/v1/auctions/:id/bid
•	Request Body: { "amount": 2 } (Note: Must be integer)
•	Business Logic Flow (Strict Order):
1.	Apply Distributed Redis Lock (SETNX takelow:auction:123:lock).
2.	Validate Date.now() > auction.end_time. If true, throw 403 Forbidden.
3.	Validate user.wallet >= 50.00. If false, throw 400 Insufficient Funds.
4.	Push to Redis Stream: XADD incoming_bids * auction_id 123 amount 2 user_id X.
5.	Respond 202 Accepted immediately (acknowledge receipt). Database insert happens asynchronously via a BullMQ consumer worker.
•	Success Response: { "message": "Bid placed successfully", "new_total_bids": 549 }
•	Error Response: { "statusCode": 400, "message": "Insufficient wallet balance", "error": "Bad Request" }
7.3 WebSocket Real-time Payload (Socket.io / Ably)
•	Event: auction:update (Server pushes to broker)
•	Payload:
json
{
  "auction_id": "123",
  "new_bid_amount": 2,
  "total_bids": 549,
  "timestamp": "2026-07-17T01:46:00Z"
}
 
SECTION 8: FRONTEND IMPLEMENTATION (REACT & REACT NATIVE)
8.1 State Management (Zustand Store with Offline Persistence)
javascript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useAuctionStore = create(
  persist(
    (set, get) => ({
      currentAuction: null,
      pendingOfflineBids: [],
      timerServerOffset: 0,
      
      setAuction: (auction) => set({ currentAuction: auction }),
      
      queueOfflineBid: (amount) => {
        set((state) => ({ pendingOfflineBids: [...state.pendingOfflineBids, amount] }));
      },
      
      flushOfflineBids: async () => {
        const { pendingOfflineBids } = get();
        if (pendingOfflineBids.length === 0) return;
        
        // Attempt to sync to backend via Axios
        try {
           // ... batch send logic
           set({ pendingOfflineBids: [] });
        } catch (error) {
           console.log("Sync failed, retry later");
        }
      }
    }),
    { 
      name: 'takelow-storage', 
      storage: createJSONStorage(() => AsyncStorage) 
    }
  )
);
8.2 WebSocket Custom Hook (useAuctionSocket)
The app must use a custom hook to manage the WebSocket lifecycle.
•	Logic:
1.	Connects to Centrifugo/Ably on component mount.
2.	Subscribes to channel auction:{id}.
3.	On receiving event: 'server_time', update local timer and calculate diff.
4.	On receiving event: 'auction_update', update Zustand store and total bids counter.
5.	If network drops (NetInfo triggers offline), pause setInterval. Resume when NetInfo is online.
8.3 UI Layout & Components
•	AuctionDetailScreen: Must feature the Countdown Timer in red, the Bid Input Stepper (with - and + buttons), and the Submit button.
•	ClosedAuctionCard: Must dynamically show a gold WINNER badge if state.userId === winner_user_id.
•	Image Loading: Do not serve raw images. Use Cloudinary dynamic resizing: https://res.cloudinary.com/takelow/image/upload/w_300,h_300/product.jpg.
 
SECTION 9: INFRASTRUCTURE & DEVOPS
9.1 Kubernetes Horizontal Pod Autoscaler (HPA) YAML
This file tells Kubernetes to auto-scale the Auction Engine based on CPU load and Redis Queue length.
yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auction-engine-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auction-engine
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: redis_queue_length
      target:
        type: AverageValue
        averageValue: 10000
9.2 Docker Compose (Local Development / Staging Environment)
yaml
version: '3.8'
services:
  postgres-primary:
    image: citusdata/citus:12.1
    environment:
      POSTGRES_DB: takelow_db
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes

  identity-service:
    build: ./identity-service
    depends_on: [postgres-primary, redis]
    environment:
      DATABASE_URL: postgresql://admin:secret@postgres-primary:5432/takelow_db
      REDIS_URL: redis://redis:6379
    ports:
      - "3001:3000"

  auction-engine:
    build: ./auction-engine
    depends_on: [postgres-primary, redis]
    environment:
      DATABASE_URL: postgresql://admin:secret@postgres-primary:5432/takelow_db
      REDIS_URL: redis://redis:6379
    ports:
      - "3002:3000"

  query-service:
    build: ./query-service
    depends_on: [postgres-primary]
    environment:
      DATABASE_URL: postgresql://admin:secret@postgres-primary:5432/takelow_db
    ports:
      - "3003:3000"
      
volumes:
  postgres_data:
 
SECTION 10: EDGE CASES & EXCEPTION HANDLING
10.1 The "Sniper" Rush (Last 1 Second)
Problem: 500 users submit a bid at the exact same millisecond when the timer hits 0.
Backend Solution: The WebSocket gateway must implement a "Bidding Window". The end_time stored in the database is the absolute hard cutoff. If a WebSocket packet arrives at the backend at T+1ms after the end_time, the logic MUST return 403 Forbidden: Auction Closed.
Implementation: NestJS Interceptor checks Date.now() > auction.end_time before the database transaction is opened.
10.2 The No-Winner Scenario
Problem: An auction ends with only 1 total bid (User A bids 1.00). That bid is unique, so User A wins. However, if an auction ends with 0 bids, the ZRANGEBYSCORE in Redis returns empty.
Backend Logic: The Cron Job must explicitly check: IF total_bids == 0 THEN SET status = 'EXPIRED' AND alert_creator = TRUE.
Frontend UI: Show a gray "Expired - No Winner" badge on the closed auction card (Image 5) instead of a gold "WINNER" badge.
10.3 Wallet Insufficiency During Bid
Problem: User has 49.00 Br. Bid fee is 50.00 Br.
Action: The frontend must disable the "Submit a Bid Amount" button before the user clicks it. The React Native/React app must calculate walletBalance >= bidFee.
Action: Backend returns 400 Insufficient Funds. The frontend should catch this and pop up a Modal: "Deposit via fintech provider to continue" with a direct link to the payment gateway.
10.4 Offline Network Drop
Problem: A user loses their 4G connection in the middle of a bid.
Implementation: If navigator.onLine is false, the submitBid action is stored in the Zustand pendingOfflineBids queue. When the internet returns, the app prompts "Sync [X] pending bids?". The user clicks "Sync" and the queue is flushed to the backend via a bulk API endpoint.
10.5 Mobile Background State
Problem: Users switch apps while an auction is live. They need to know if they've been outbid.
Implementation: The backend must trigger a high-priority Firebase/APNS push notification: {"title": "Outbid Alert", "body": "Someone just bid 5.00 ETB on the Samsung A17. Check the app!"}.
 
SECTION 11: COMPLETE TESTING STRATEGY
11.1 Backend Unit Tests (Jest)
•	Test Case 1: Mock Redis. Inject a list of bids [1, 1, 2, 3] into the ZINCRBY mock. Verify the calculateWinner() function returns 2.
•	Test Case 2: Mock Redis. Inject a list [1, 1, 2, 2]. Verify calculateWinner() returns NULL (No unique winners).
•	Test Case 3: Validate integer only DTO. Send { "amount": 2.50 }. Verify API returns 400 Bad Request.
11.2 Backend Integration Tests (Supertest)
•	Spin up a test NestJS container.
•	Create a user wallet with exactly 100.00 Br.
•	Hit POST /bid 3 times.
•	Verify wallet_balance in DB equals 100 - (3 * 50.00).
•	Verify the Redis Stream incoming_bids has exactly 3 items.
11.3 Frontend Unit Tests (Jest / React Native Testing Library)
•	Render the BidInputStepper.
•	Press the + button 3 times. Verify the displayed amount updates from 1 to 4.
•	Simulate a network offline event. Press "Submit Bid". Verify pendingOfflineBids length in Zustand equals 1.
11.4 Massive Scale Load Testing (Grafana k6)
Script: Spin up 100,000 virtual users.
Test 1: Flood the Auction "Submit Bid" endpoint with 5,000 requests/second. Verify the Redis Stream consumer lag doesn't exceed 100ms and does NOT crash PostgreSQL.
Test 2: Monitor Kubernetes. Check CPU. Verify the HPA automatically spins up new auction-engine pods to handle the load.
Test 3: Simulate a network drop on 10,000 virtual React Native instances. Verify the Zustand stores persist the local queue across app restarts.
