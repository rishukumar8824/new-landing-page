# Bitegit Exchange (Node + MongoDB)

Production-ready scaffold for:

- Landing page + lead capture
- P2P module (offers/orders/chat/escrow states)
- Spot module
- Admin Panel (`/admin/login`, `/admin`)

## 1) Prerequisites

- Node.js 18+
- MongoDB Atlas cluster (recommended)

## 2) Environment Setup (.env)

Create `.env` in project root:

```bash
cp .env.example .env
```

Then edit `.env` values:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=bitegit
JWT_SECRET=replace_with_long_random_secret

ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_EMAIL=admin@admin.local
ADMIN_ROLE=SUPER_ADMIN
```

Notes:

- App uses built-in `.env` loader (`/Users/sumitkmina/Documents/New project/lib/env.js`), no manual `export` needed.
- Local MongoDB is disabled by default. To allow local URI (`127.0.0.1`/`localhost`), set:
  - `ALLOW_LOCAL_MONGO=true`

## 3) Atlas Connection Guide

1. Atlas -> Database Access -> create DB user.
2. Atlas -> Network Access -> add your IP (or temporary `0.0.0.0/0` for testing).
3. Atlas -> Clusters -> Connect -> Drivers -> copy connection string.
4. Put that string into `MONGODB_URI` in `.env`.
5. Keep password URL-safe in URI.

## 4) Install and Run

```bash
npm install
npm start
```

Expected startup logs:

- `MongoDB indexes ensured`
- `Admin seed ensured for ...`
- `Server running on port 3000`

## 5) Admin Login

Open:

- `http://localhost:3000/admin/login`

Default from `.env`:

- Username: `admin`
- Password: `admin123`

## 6) Health Check

```bash
curl -i http://localhost:3000/healthz
```

Healthy response:

```json
{"status":"ok","db":"connected"}
```

## 7) Admin Seed (Manual)

If needed, run standalone seed:

```bash
npm run seed:admin
```

Behavior:

- Creates admin if not exists.
- Does not duplicate existing admin.
- Supports controlled sync flags:
  - `ADMIN_FORCE_PASSWORD_SYNC=true`
  - `ADMIN_FORCE_ROLE_SYNC=true`
  - `ADMIN_FORCE_ACTIVATE=true`

## 8) Required Environment Variables

- `MONGODB_URI`
- `JWT_SECRET`

Recommended:

- `MONGODB_DB_NAME` (default: `bitegit`)
- `ADMIN_USERNAME` (default: `admin`)
- `ADMIN_PASSWORD` (default: `admin123`)
- `ADMIN_EMAIL` (default: `${ADMIN_USERNAME}@admin.local`)
- `ADMIN_ROLE` (default: `SUPER_ADMIN`)

## 9) Troubleshooting

- `ECONNREFUSED 127.0.0.1:27017`:
  - You are using local Mongo URI while local mode is disabled.
  - Fix `MONGODB_URI` to Atlas, or set `ALLOW_LOCAL_MONGO=true`.

- `MONGODB_URI is required`:
  - Add `MONGODB_URI` in `.env`.

- `JWT_SECRET is required`:
  - Add strong random `JWT_SECRET` in `.env`.

- Admin login fails:
  - Check `.env` admin credentials.
  - Run `npm run seed:admin` once.
  - Restart server.

## 10) Admin API Reference

See:

- `/Users/sumitkmina/Documents/New project/docs/admin-api.md`
