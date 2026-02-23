# Landing Page (Name + Mobile)

Simple landing page with separate frontend and backend files.

## Project Structure

- `server.js` -> Backend (Express API + static hosting)
- `public/index.html` -> Frontend HTML
- `public/styles.css` -> Frontend CSS
- `public/script.js` -> Frontend JS (form submit logic)
- `data/leads.json` -> Saved leads data (auto-created)
- `package.json` -> Dependencies and start script

## Run Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start server:
   ```bash
   npm start
   ```
3. Open:
   ```
   http://localhost:3000
   ```

## API

### POST `/api/leads`
Request body:
```json
{
  "name": "Rahul",
  "mobile": "9876543210"
}
```

## Deploy (Example: Render/Railway)

1. Push this folder to GitHub.
2. Create a new Web Service.
3. Set:
   - Build command: `npm install`
   - Start command: `npm start`
4. Deploy.

Node version required: `18+`.
