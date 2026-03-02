# Bitegit Phase 4 Wallet Engine

## 1) Install

```bash
npm install
```

## 2) Configure env

```bash
cp .env.example .env
```

Update `.env`:

```env
NODE_ENV=development
PORT=3001

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=bitegit_phase4
DB_USER=root
DB_PASSWORD=your_mysql_password

JWT_SECRET=replace_with_strong_secret
JWT_EXPIRES_IN=7d
```

## 3) Initialize database

```bash
mysql -u root -p < sql/schema.sql
```

## 4) Start server

```bash
npm start
```

## 5) API base

- `POST /api/register`
- `POST /api/login`
- `GET /api/wallet`
- `GET /api/wallet/transactions`
- `POST /api/deposit/request`
- `GET /api/user/deposits`
- `POST /api/withdraw/request`
- `GET /api/user/withdrawals`
- `GET /api/admin/deposits`
- `POST /api/admin/approve-deposit`
- `GET /api/admin/withdrawals`
- `POST /api/admin/approve-withdraw`
