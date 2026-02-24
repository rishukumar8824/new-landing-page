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

## Android APK (Bitegit)

This project is now configured with Capacitor for Android.

Important files:

- `capacitor.config.json` -> App ID, app name, live site URL
- `android/` -> Native Android project
- `resources/README.md` -> Icon setup instructions

### App details

- App Name: `Bitegit`
- Package ID: `com.bitegit.app`
- Live URL loaded in app: `https://new-landing-page-1hz9.onrender.com`

### Build APK (step-by-step)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Put logo file:
   - Save your logo as `resources/icon.png` (square PNG, 1024x1024 preferred).
3. Generate Android icons:
   ```bash
   npm run mobile:icons
   ```
4. Sync web + native:
   ```bash
   npm run mobile:sync
   ```
5. Open Android Studio project:
   ```bash
   npm run mobile:open
   ```
6. In Android Studio:
   - Wait for Gradle sync.
   - Go to `Build > Build Bundle(s) / APK(s) > Build APK(s)`.
7. Final APK path:
   - `android/app/build/outputs/apk/debug/app-debug.apk`
