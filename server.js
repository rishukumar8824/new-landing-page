const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || 'change-this-password').trim();
const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const sessions = new Map();

const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'leads.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, '[]', 'utf8');
}

if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
  console.warn('WARNING: Set ADMIN_USERNAME and ADMIN_PASSWORD in environment for secure admin access.');
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readLeads() {
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function parseCookies(req) {
  const rawCookie = req.headers.cookie || '';
  const parsed = {};

  for (const item of rawCookie.split(';')) {
    const [rawKey, ...rawValueParts] = item.trim().split('=');
    if (!rawKey) {
      continue;
    }
    parsed[rawKey] = decodeURIComponent(rawValueParts.join('='));
  }

  return parsed;
}

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

function removeExpiredSessions() {
  const now = Date.now();
  for (const [token, expiry] of sessions.entries()) {
    if (expiry < now) {
      sessions.delete(token);
    }
  }
}

function isSessionValid(token) {
  if (!token || !sessions.has(token)) {
    return false;
  }

  const expiry = sessions.get(token);
  if (expiry < Date.now()) {
    sessions.delete(token);
    return false;
  }

  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return true;
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
}

function setSessionCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${SESSION_TTL_MS / 1000}; SameSite=Lax`
  );
}

function requiresAdminSession(req, res, next) {
  removeExpiredSessions();
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];

  if (!isSessionValid(token)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  return next();
}

app.post('/api/admin/login', (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '').trim();

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = createSession();
    setSessionCookie(res, token);
    return res.json({ message: 'Login successful' });
  }

  clearSessionCookie(res);
  return res.status(401).json({ message: 'Invalid username or password' });
});

app.post('/api/admin/logout', (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  if (token) {
    sessions.delete(token);
  }

  clearSessionCookie(res);
  return res.json({ message: 'Logged out' });
});

app.post('/api/leads', (req, res) => {
  const { name, mobile } = req.body;

  if (!name || !mobile) {
    return res.status(400).json({ message: 'Name and mobile are required.' });
  }

  const cleanedName = String(name).trim();
  const cleanedMobile = String(mobile).replace(/\D/g, '');

  if (cleanedName.length < 2) {
    return res.status(400).json({ message: 'Name must be at least 2 characters.' });
  }

  if (!/^\d{10}$/.test(cleanedMobile)) {
    return res.status(400).json({ message: 'Mobile must be a valid 10-digit number.' });
  }

  const newLead = {
    id: Date.now(),
    name: cleanedName,
    mobile: cleanedMobile,
    createdAt: new Date().toISOString()
  };

  try {
    const leads = readLeads();
    leads.push(newLead);
    fs.writeFileSync(dataFile, JSON.stringify(leads, null, 2), 'utf8');
    return res.status(201).json({ message: 'Lead saved successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while saving lead.' });
  }
});

app.get('/api/leads', requiresAdminSession, (req, res) => {
  try {
    const leads = readLeads();
    const sortedLeads = [...leads].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json(sortedLeads);
  } catch (error) {
    return res.status(500).json({ message: 'Server error while fetching leads.' });
  }
});

app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
