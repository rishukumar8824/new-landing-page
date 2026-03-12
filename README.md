# Bitegit Exchange Backend

This repository is prepared for direct deployment on Render Web Service from GitHub.

## Runtime

- Node.js 18+
- Start command: `node index.js`
- NPM script: `npm start`
- Server bind: `0.0.0.0`
- Port: `process.env.PORT || 5000`

## Required Environment Variables

- `MONGO_URI`
- `JWT_SECRET`
- `PORT`

Optional compatibility variable:

- `MONGODB_URI`

## Local Run

```bash
npm install
npm start
```

## Render Deploy

Use `render.yaml` or configure manually:

- Build command: `npm install`
- Start command: `node index.js`
- Health check path: `/api/health`

Set these env vars on Render:

- `MONGO_URI`
- `JWT_SECRET`
- `PORT`
- `NODE_ENV=production`
