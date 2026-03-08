# USDT Buy/Sell Landing Page (Fresh Deployment)

This repository is structured for a fresh full-stack deployment:

- `frontend/` -> Next.js + TailwindCSS landing page (deploy to Vercel)
- `backend/` -> Node.js + Express + MongoDB API (deploy to Render)

## Features

- Landing form fields: Name, Mobile Number, Preference (Buy USDT / Sell USDT)
- Form flow:
  1. Submit to backend API (`POST /api/lead`)
  2. Save lead in MongoDB Atlas
  3. Redirect to WhatsApp with pre-filled message
- Backend health endpoint: `GET /api/health`

## Environment Variables

### Backend (`backend/.env`)

- `MONGO_URI`
- `WHATSAPP_NUMBER`
- `FRONTEND_URL`
- `NODE_ENV=production`
- `PORT=5001` (optional locally)

### Frontend (`frontend/.env.local`)

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`

## Local Run

```bash
cd backend && npm install && npm run dev
cd ../frontend && npm install && npm run dev
```

Frontend: `http://localhost:3000`
Backend: `http://localhost:5001`

## Deploy

### Backend on Render

- Service root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health`
- Add env vars: `MONGO_URI`, `WHATSAPP_NUMBER`, `FRONTEND_URL`, `NODE_ENV=production`

### Frontend on Vercel

- Project root directory: `frontend`
- Add env vars:
  - `NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com`
  - `NEXT_PUBLIC_WHATSAPP_NUMBER=<your_whatsapp_number>`
