# Bitegit Web App

Express-based landing + P2P + trade app with MongoDB Atlas persistence.

## What Is Persisted

All dynamic/business data is stored in MongoDB:

- Leads
- Admin sessions
- Signup OTP codes
- P2P credentials and user sessions
- P2P wallets (`balance`, `lockedBalance`)
- P2P offers
- P2P orders and chat messages
- Trade orders
- Migration/meta flags

In-memory is used only for runtime SSE stream connections.

## Environment Variables

Required:

- `MONGODB_URI` -> MongoDB Atlas connection string
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

Optional:

- `MONGODB_DB_NAME` -> default `bitegit`
- `ALLOW_DEMO_OTP` -> default `true` in non-production
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM_EMAIL`
- `SMTP_SECURE`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `P2P_DEFAULT_USER_BALANCE` (default `10000`, for demo auto-wallet init)
- `P2P_DEFAULT_SEED_WALLET_BALANCE` (default `1000000`)

## Local Run

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set env:
   ```bash
   export MONGODB_URI="mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority"
   export MONGODB_DB_NAME="bitegit"
   export ADMIN_USERNAME="your-admin-user"
   export ADMIN_PASSWORD="your-admin-pass"
   ```
3. Start server:
   ```bash
   npm start
   ```
4. Open:
   - `http://localhost:3000`
   - `http://localhost:3000/p2p`
   - `http://localhost:3000/trade/spot/BTCUSDT`
   - `http://localhost:3000/admin-login`

## Startup Behavior

On startup, server does:

1. Connect to MongoDB (fail-fast if connection/index setup fails)
2. Ensure all indexes
3. Run one-time migration from `data/leads.json` into Mongo (`app_meta` flag: `leads_migrated_v1`)
4. Seed default P2P offers only if `p2p_offers` is empty
5. Ensure wallets for seed advertisers
6. Start HTTP server

## P2P Escrow States

Order status lifecycle:

- `PENDING` -> escrow locked from seller wallet
- `PAID` -> buyer marked payment done
- `RELEASED` -> seller released escrow to buyer wallet
- `CANCELLED` -> escrow unlocked back to seller wallet
- `DISPUTED` -> manual review state
- `EXPIRED` -> auto-expired and escrow unlocked to seller

Escrow safety rules:

- One active order per seller (`PENDING`, `PAID`, `DISPUTED`)
- Seller balance check before escrow lock
- Release/cancel uses MongoDB transaction session
- 15-minute auto-expiry sweep runs in background

## Health Check

`GET /healthz`

- Connected: `{"status":"ok","db":"connected"}`
- Disconnected: HTTP `503` with `{"status":"error","db":"disconnected"}`

## Render Deploy

Set these env vars in Render service:

- `MONGODB_URI`
- `MONGODB_DB_NAME` (optional, default `bitegit`)
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

`render.yaml` already includes these keys.
