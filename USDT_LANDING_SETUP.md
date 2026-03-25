# USDT Buy/Sell Landing Page (Next.js + Express + MongoDB)

## Project Structure

- `frontend/` -> Next.js + TailwindCSS landing page
- `backend/` -> Node.js + Express API + MongoDB

## 1) Environment Setup

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and set:

- `PORT=5001`
- `MONGO_URI=<your_mongodb_connection_string>`
- `FRONTEND_URL=<your_frontend_url>`
- `WHATSAPP_NUMBER=919999999999`

### Frontend (`frontend/.env.local`)

Copy `frontend/.env.example` to `frontend/.env.local` and set:

- `NEXT_PUBLIC_API_URL=http://localhost:5001`
- `NEXT_PUBLIC_WHATSAPP_NUMBER=919999999999`

## 2) Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

## 3) Run Locally

### Start backend

```bash
cd backend
npm run dev
```

### Start frontend

```bash
cd frontend
npm run dev
```

Frontend: `http://localhost:3000`
Backend: `http://localhost:5001`

## API Endpoints

### POST `/api/lead`

Request body:

```json
{
  "name": "John Doe",
  "phone": "9876543210",
  "preference": "buy"
}
```

Saves to MongoDB `leads` collection and returns success.

### GET `/api/leads`

Returns all submitted leads sorted by newest first.

## Security Included

- `helmet` for secure headers
- `cors` with configurable frontend origin
- Global and route-specific rate limiting
- `express-validator` input validation
- Honeypot + minimum submit-time checks (basic spam protection)

## Deployment

## Frontend on Vercel

1. Import the `frontend` folder as a Vercel project.
2. Set env vars in Vercel:
   - `NEXT_PUBLIC_API_URL=https://<your-backend-domain>`
   - `NEXT_PUBLIC_WHATSAPP_NUMBER=919999999999`
3. Deploy.

## Backend on Render

1. Create a new Web Service from the `backend` folder.
2. Build Command: `npm install`
3. Start Command: `npm start`
4. Set env vars:
   - `MONGO_URI`
   - `FRONTEND_URL=https://<your-vercel-domain>`
   - `WHATSAPP_NUMBER=919999999999`
5. Deploy.

## Backend on Railway

1. New project -> Deploy from GitHub.
2. Select `backend` folder for service root.
3. Set env vars (`MONGO_URI`, `FRONTEND_URL`, `WHATSAPP_NUMBER`).
4. Railway detects Node app and starts with `npm start`.

## WhatsApp Redirect Message

The frontend creates this message and URL-encodes it:

```js
const message = `Hello, my name is ${name}.\nMy mobile number is ${phone}.\nI want to ${preference} USDT.`;
const encodedMessage = encodeURIComponent(message);
window.location.href = `https://wa.me/${whatsAppNumber}?text=${encodedMessage}`;
```
