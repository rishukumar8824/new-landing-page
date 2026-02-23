# Landing Page (Name + Mobile)

Simple landing page with separate frontend and backend files.

## Project Structure

- `server.js` -> Backend (Express API + static hosting)
- `public/index.html` -> Frontend HTML (lead form)
- `public/admin-login.html` -> Admin login page
- `public/admin.html` -> Admin panel (lead list)
- `public/styles.css` -> Frontend CSS
- `public/script.js` -> Frontend JS (form submit logic)
- `public/admin-login.js` -> Admin login JS
- `public/admin.js` -> Admin JS (fetch + render leads)
- `data/leads.json` -> Saved leads data (auto-created)
- `package.json` -> Dependencies and start script

## Admin Security

Admin panel uses session-based login.

Set environment variables before starting server:

```bash
export ADMIN_USERNAME="your-username"
export ADMIN_PASSWORD="your-strong-password"
```

Then start app:

```bash
npm start
```

Admin login URL:

```
http://localhost:3000/admin-login
```

## Run Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set admin credentials:
   ```bash
   export ADMIN_USERNAME="your-username"
   export ADMIN_PASSWORD="your-strong-password"
   ```
3. Start server:
   ```bash
   npm start
   ```
4. Open landing page:
   ```
   http://localhost:3000
   ```
5. Open admin login:
   ```
   http://localhost:3000/admin-login
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

### GET `/api/leads`
Returns all submitted leads (latest first). Requires admin session.

## Deploy (Render)

1. Push this folder to GitHub.
2. In Render Web Service, set Environment Variables:
   - `ADMIN_USERNAME` = your username
   - `ADMIN_PASSWORD` = your strong password
3. Deploy latest commit.

Node version required: `18+`.
