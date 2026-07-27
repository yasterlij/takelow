# TakeLow

A mobile-first reverse-auction platform using a **Lowest Unique Bid (LUB)** mechanism.
The winner is the user who submits the lowest unique bid amount before the timer expires.

> "Take It. Low."

## Architecture

Three NestJS microservices + React web + React Native (Expo) mobile:

| Service | Port | Responsibility |
|---------|------|----------------|
| `identity-service` | 3001 | JWT auth, user registration, wallet, PIN, OTP, notifications |
| `auction-engine` | 3002 | Real-time bidding, WebSockets, Redis bid tracking, BullMQ workers, winner determination, payments |
| `query-service` | 3003 | Read-optimized auction/product queries, favorites, admin stats (uses Postgres read replica when `READ_REPLICA_URL` is set) |
| `takelow-web` | 5173 (dev) / 80 (docker) | React + Tailwind SPA |
| `takelow-app` | Expo | React Native mobile app |

**Data layer:** PostgreSQL 15 (Citus) + Redis 7 (bid tracking, rate limiting, queues) + BullMQ (batched bid persistence).

## Quick start

```bash
# One-time: install deps + start infra + migrate + seed
npm run setup

# Full stack (Docker -> backends -> web frontend)
npm run dev

# Mobile app (Expo)
npm run app

# Backends only (requires Docker for Postgres/Redis)
npm run services
```

## Common commands

| Command | Description |
|---------|-------------|
| `npm run docker:up` | Start Postgres + Redis containers |
| `npm run docker:down` | Stop containers |
| `npm run db:setup` | Docker -> wait -> migrate -> seed |
| `npm run db:reset` | Wipe volumes -> migrate -> seed |
| `npm run db:migrate` | Apply SQL migrations (tracked in `schema_migrations`) |
| `npm run seed` | Seed 30 users + 2 admins + 10 auctions |

## Seed credentials

- Users: `0913320001`–`0913320028`, password `0000`, wallet 100 ETB
- Admins: `0911111111` / `0912222222`, password `1234`

## Environment

Each service has a `.env.example`. Copy to `.env` and fill in. Critical vars:
- `JWT_SECRET`, `JWT_REFRESH_SECRET` (must NOT be `takelow-jwt-secret` — app refuses to start)
- `INTERNAL_API_KEY` (service-to-service auth)
- `DATABASE_URL`, `REDIS_URL`
- `CORS_ORIGINS` (comma-separated)
- Payment: `SIKINA_*`, `AWASH_*` (optional)

## Testing & verification

```bash
# Backend tests (per service)
cd auction-engine && npm test        # 27 tests
cd identity-service && npm test      # 2 tests
cd query-service && npm test         # 3 tests

# Type checking (per service/project)
npx tsc --noEmit
```

## Project layout

```
auction-engine/      NestJS bidding + winner + payments
identity-service/    NestJS auth + wallet
query-service/       NestJS read APIs
takelow-web/         React + Vite + Tailwind
takelow-app/         React Native (Expo)
database/migrations/ 23 raw SQL migrations (idempotent, tracked)
k8s/                 Kubernetes manifests (config, deployments, hpa, ingress)
scripts/             dev/seed/migrate/wait helpers
load-tests/          k6 bid-flood scenarios
```

See `SRS.md` for the full requirements specification, `SECURITY.md` for the security model, and `br.md` for the business requirements status.
