# Production Deployment Guide

This guide covers Docker, Docker Compose, Render.com, Nginx, and Let's Encrypt for this app.

## 1) Prepare `.env`

Create and edit:

```bash
cp .env.example .env
```

Set required values:

- `MONGODB_URI` (Atlas URI)
- `MONGODB_DB_NAME`
- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_EMAIL`
- `ADMIN_ROLE`
- `PORT=3000`

## 2) Local Production Run (Docker)

Build and start:

```bash
docker compose up -d --build
```

Check logs:

```bash
docker compose logs -f app
```

Health check:

```bash
curl -i http://localhost/healthz
```

## 3) Enable SSL (Let's Encrypt)

1. Ensure DNS points your domain to server IP.
2. Start stack with HTTP config first:

```bash
docker compose up -d
```

3. Issue certificate:

```bash
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d bitegit.com -d www.bitegit.com \
  --email admin@bitegit.com --agree-tos --no-eff-email
```

4. Enable SSL Nginx config:

```bash
cp deploy/nginx/conf.d/bitegit-ssl.conf.example deploy/nginx/conf.d/bitegit-ssl.conf
```

5. Remove or rename the HTTP-only config (`deploy/nginx/conf.d/bitegit.conf`) if needed.
6. Reload Nginx:

```bash
docker compose restart nginx
```

## 4) Render.com Deployment

1. Push repo to GitHub.
2. In Render create **Web Service**.
3. Use:
   - Environment: `Docker`
   - Dockerfile path: `./Dockerfile`
4. Add env vars in Render dashboard:
   - `MONGODB_URI`
   - `MONGODB_DB_NAME`
   - `JWT_SECRET`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `ADMIN_EMAIL`
   - `ADMIN_ROLE`
   - `NODE_ENV=production`
5. Deploy.
6. Verify:
   - `/healthz` returns DB connected
   - `/admin/login` opens

## 5) PM2

The production process manager is configured using:

- `ecosystem.config.js`
- `npm run start:prod` (`pm2-runtime`)

Inside container, app is started through PM2 automatically.

## 6) Notes

- App already uses `process.env.PORT` in `server.js`.
- Atlas is required in production.
- Local Mongo is disabled unless `ALLOW_LOCAL_MONGO=true`.
