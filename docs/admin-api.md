# Admin API Documentation

Base URL: `/api/admin`

## Authentication

- Auth type: JWT access token (15 min) + refresh token (7 days)
- Cookies used:
  - `admin_access_token`
  - `admin_refresh_token`
- Role model:
  - `SUPER_ADMIN`
  - `FINANCE_ADMIN`
  - `SUPPORT_ADMIN`
  - `COMPLIANCE_ADMIN`

## Security Controls

- Admin login rate limit: 5 attempts / 10 min / IP
- IP allow-list supported:
  - env: `ADMIN_IP_WHITELIST=ip1,ip2`
  - per-admin document: `ipWhitelist[]`
- Admin session timeout:
  - env: `ADMIN_SESSION_TTL_MINUTES` (default: `120`)
- Full API logs + audit logs for admin routes

---

## Auth Routes

### `POST /auth/login`
Login with admin email/username + password.

Request:
```json
{
  "email": "admin@admin.local",
  "password": "admin123"
}
```
or
```json
{
  "username": "admin",
  "password": "admin123"
}
```

Response:
```json
{
  "message": "Admin login successful.",
  "admin": {
    "id": "adm_...",
    "email": "admin@admin.local",
    "role": "SUPER_ADMIN",
    "status": "ACTIVE"
  },
  "accessToken": "...",
  "refreshToken": "...",
  "sessionExpiresAt": "2026-02-26T...Z"
}
```

### `POST /auth/refresh`
Rotate refresh token and issue new token pair.

### `POST /auth/logout`
Revoke admin session and refresh token.

### `GET /auth/me`
Get currently authenticated admin profile.

---

## Dashboard

### `GET /dashboard/overview`
Returns merged dashboard payload:
- revenue summary
- wallet overview
- monitoring overview

---

## User Management

### `GET /users`
Query params:
- `page`
- `limit`
- `email`

### `GET /users/:userId`

### `PATCH /users/:userId/status`
Request:
```json
{
  "status": "ACTIVE | FROZEN | BANNED",
  "reason": "..."
}
```

### `POST /users/:userId/reset-password`
```json
{
  "newPassword": "newStrongPass123"
}
```

### `POST /users/:userId/adjust-balance`
```json
{
  "amount": 100,
  "coin": "USDT",
  "reason": "Manual correction"
}
```

### `GET /users/:userId/kyc`

### `POST /users/:userId/kyc/review`
```json
{
  "decision": "APPROVED | REJECTED | PENDING",
  "remarks": "..."
}
```

---

## Wallet Management

### `GET /wallet/overview`

### `GET /wallet/deposits`

### `GET /wallet/withdrawals`
Query params:
- `page`
- `limit`
- `status=PENDING|APPROVED|REJECTED`

### `POST /wallet/withdrawals/:withdrawalId/review`
```json
{
  "decision": "APPROVED | REJECTED",
  "reason": "..."
}
```

### `PUT /wallet/config/:coin`
```json
{
  "withdrawalsEnabled": true,
  "networkFee": 1,
  "minWithdrawal": 10,
  "maxWithdrawal": 100000
}
```

### `GET /wallet/hot-balances`

---

## Spot Trading Control

### `GET /spot/pairs`

### `PUT /spot/pairs/:symbol`
```json
{
  "enabled": true,
  "makerFee": 0.001,
  "takerFee": 0.001,
  "pricePrecision": 2
}
```

### `GET /spot/orderbook/:symbol`

### `POST /spot/orders/:orderId/force-cancel`

### `GET /spot/trades`

---

## P2P Control Panel

### `GET /p2p/ads`

### `POST /p2p/ads/:offerId/review`
```json
{
  "decision": "APPROVED | REJECTED | SUSPENDED",
  "reason": "..."
}
```

### `GET /p2p/disputes`

### `POST /p2p/orders/:orderId/release`

### `POST /p2p/orders/:orderId/freeze`

### `GET /p2p/settings`

### `PUT /p2p/settings`
```json
{
  "p2pFeePercent": 0.1,
  "minOrderLimit": 100,
  "maxOrderLimit": 200000,
  "autoExpiryMinutes": 15
}
```

---

## Revenue

### `GET /revenue/summary`
Returns:
- revenue today/week/month
- spot fee earnings
- p2p earnings
- withdrawal fee earnings
- trend array
- active users
- total trading volume

---

## Platform Settings

### `GET /settings/platform`

### `PUT /settings/platform`
Supports site config, features, SMTP, compliance toggle, and fee settings.

---

## Compliance Module

### `GET /compliance/flags`

### `POST /compliance/flags`
```json
{
  "userId": "usr_...",
  "type": "SUSPICIOUS_ACTIVITY",
  "severity": "HIGH",
  "reason": "..."
}
```

### `GET /compliance/export/transactions.csv`
Exports P2P + spot transaction logs as CSV.

---

## Support System

### `GET /support/tickets`

### `POST /support/tickets/:ticketId/reply`
```json
{
  "message": "Please provide TX hash"
}
```

### `PATCH /support/tickets/:ticketId/status`
```json
{
  "status": "OPEN | IN_PROGRESS | CLOSED"
}
```

### `PATCH /support/tickets/:ticketId/assign`
```json
{
  "assignedTo": "adm_..."
}
```

---

## Monitoring

### `GET /monitoring/overview`

### `GET /monitoring/api-logs`

### `GET /monitoring/health`

---

## Audit Logs

### `GET /audit/logs`

---

## HTTP Status Guide

- `200` Success
- `201` Resource created
- `400` Validation error
- `401` Unauthorized / token invalid
- `403` Role not allowed / IP blocked
- `404` Resource not found
- `429` Rate limit exceeded
- `500` Internal server error
