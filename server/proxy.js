const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
// Dev: 8081 is the single public port. Expo runs internally on 8082.
// Prod: use PORT env var (Render sets this) or fallback to 3001.
const PORT = IS_PRODUCTION ? (process.env.PORT || 3001) : 8082;
const EXPO_PORT = process.env.EXPO_PORT || 8083;

// ── Auth helpers ──────────────────────────────────────────────
const DEFAULT_DATA_DIR = IS_PRODUCTION ? '/var/data/aaramusic' : path.join(__dirname, '..', '.data');
const REQUESTED_DATA_DIR = process.env.DATA_DIR || DEFAULT_DATA_DIR;
const LOCAL_FALLBACK_DATA_DIR = path.join(__dirname, '..', '.data');

function selectDataDir() {
  const candidates = [REQUESTED_DATA_DIR];
  if (!candidates.includes(LOCAL_FALLBACK_DATA_DIR)) {
    candidates.push(LOCAL_FALLBACK_DATA_DIR);
  }

  for (const dir of candidates) {
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
      if (dir !== REQUESTED_DATA_DIR) {
        console.warn(`[auth] Data dir not writable at ${REQUESTED_DATA_DIR}. Falling back to ${dir}`);
      }
      return dir;
    } catch {
      // Try next candidate path.
    }
  }

  throw new Error(`No writable data directory available. Tried: ${candidates.join(', ')}`);
}

const DATA_DIR = selectDataDir();
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const DEFAULT_ADMIN_NAME = process.env.DEFAULT_ADMIN_NAME || 'Aara Admin';
const DEFAULT_ADMIN_EMAIL = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@aaramusic.ai').toLowerCase().trim();
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'AaraVero%&12345';

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}
function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}
function writeJSON(file, data) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'aaramusic_salt').digest('hex');
}
function ensureDefaultAdminUser() {
  const users = readJSON(USERS_FILE);
  if (users[DEFAULT_ADMIN_EMAIL]) return;

  users[DEFAULT_ADMIN_EMAIL] = {
    id: 'admin',
    name: DEFAULT_ADMIN_NAME,
    email: DEFAULT_ADMIN_EMAIL,
    role: 'admin',
    password: hashPassword(DEFAULT_ADMIN_PASSWORD),
  };
  writeJSON(USERS_FILE, users);
}

ensureDefaultAdminUser();

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Health check (used by start.sh readiness probe) ──────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: IS_PRODUCTION ? 'production' : 'development' });
});

// ── Auth endpoints ────────────────────────────────────────────
app.post('/auth/signup', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields.' });
  const users = readJSON(USERS_FILE);
  const key = email.toLowerCase().trim();
  if (users[key]) return res.status(409).json({ error: 'An account with this email already exists.' });
  const user = { id: Date.now().toString(), name: name.trim(), email: key };
  users[key] = { ...user, password: hashPassword(password) };
  writeJSON(USERS_FILE, users);
  const token = crypto.randomBytes(32).toString('hex');
  const sessions = readJSON(SESSIONS_FILE);
  sessions[token] = user;
  writeJSON(SESSIONS_FILE, sessions);
  res.json({ token, user });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing fields.' });
  const users = readJSON(USERS_FILE);
  const key = email.toLowerCase().trim();
  const stored = users[key];
  if (!stored || stored.password !== hashPassword(password))
    return res.status(401).json({ error: 'Invalid email or password.' });
  const { password: _, ...user } = stored;
  const token = crypto.randomBytes(32).toString('hex');
  const sessions = readJSON(SESSIONS_FILE);
  sessions[token] = user;
  writeJSON(SESSIONS_FILE, sessions);
  res.json({ token, user });
});

app.get('/auth/me', (req, res) => {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token.' });
  const sessions = readJSON(SESSIONS_FILE);
  const user = sessions[token];
  if (!user) return res.status(401).json({ error: 'Invalid session.' });
  res.json({ user });
});

app.post('/auth/logout', (req, res) => {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '');
  if (token) {
    const sessions = readJSON(SESSIONS_FILE);
    delete sessions[token];
    writeJSON(SESSIONS_FILE, sessions);
  }
  res.json({ ok: true });
});

app.post('/auth/change-password', (req, res) => {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not logged in.' });
  const sessions = readJSON(SESSIONS_FILE);
  const sessionUser = sessions[token];
  if (!sessionUser) return res.status(401).json({ error: 'Invalid session.' });

  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Missing fields.' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });

  const users = readJSON(USERS_FILE);
  const stored = users[sessionUser.email];
  if (!stored || stored.password !== hashPassword(oldPassword))
    return res.status(401).json({ error: 'Current password is incorrect.' });

  stored.password = hashPassword(newPassword);
  writeJSON(USERS_FILE, users);
  res.json({ ok: true });
});

// ── Lyrics proxy (lyrics.ovh) ────────────────────────────────
app.get('/lyrics/:artist/:title', async (req, res) => {
  try {
    const { artist, title } = req.params;
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
    const response = await axios.get(url, { timeout: 8000 });
    res.json(response.data);
  } catch {
    res.json({ lyrics: '' });
  }
});

// ── Audio stream proxy (pipes Deezer CDN mp3 through server) ─
// Supports Range requests for seeking.
app.get('/audio', (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Missing or invalid url param' });
  }

  const range = req.headers['range'];
  const reqHeaders = {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'audio/mpeg,audio/*',
  };
  if (range) reqHeaders['Range'] = range;

  const lib = url.startsWith('https') ? https : http;
  lib.get(url, { headers: reqHeaders }, (upstream) => {
    const status = range && upstream.headers['content-range'] ? 206 : (upstream.statusCode || 200);
    const outHeaders = {
      'Content-Type': upstream.headers['content-type'] || 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
    };
    if (upstream.headers['content-length']) {
      outHeaders['Content-Length'] = upstream.headers['content-length'];
    }
    if (upstream.headers['content-range']) {
      outHeaders['Content-Range'] = upstream.headers['content-range'];
    }
    res.writeHead(status, outHeaders);
    upstream.pipe(res);
    req.on('close', () => upstream.destroy());
  }).on('error', (err) => {
    console.error('[audio] proxy error:', err.message);
    if (!res.headersSent) res.status(502).json({ error: 'Audio proxy failed' });
  });
});

// ── Deezer API proxy ─────────────────────────────────────────
app.use('/api', async (req, res) => {
  try {
    // Strip the /api prefix — req.url already contains the rest (e.g. /chart/0/tracks)
    const deezerUrl = `https://api.deezer.com${req.url}`;
    const response = await axios.get(deezerUrl, { timeout: 10000 });
    res.json(response.data);
  } catch (error) {
    console.error('[api] proxy error:', error.message);
    res.status(502).json({ error: 'Deezer API request failed' });
  }
});

// ── Static / Expo forwarding ──────────────────────────────────
if (IS_PRODUCTION) {
  // Serve the exported Expo web build
  const distPath = path.join(__dirname, '..', 'dist');
  
  // Serve static files
  app.use(express.static(distPath));
  
  // Fallback to index.html for client-side routing (SPA)
  // This catches any request that didn't match a static file
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Forward all other requests (and WebSocket) to Expo Metro dev server
  app.use('/', createProxyMiddleware({
    target: `http://localhost:${EXPO_PORT}`,
    changeOrigin: true,
    ws: true,
    logLevel: 'silent',
    on: {
      error: (err, _req, res) => {
        if (!res.headersSent) res.status(502).send('Expo dev server not ready yet — please wait a moment and refresh.');
      },
    },
  }));
}

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  Aara Music proxy running  →  http://localhost:${PORT}`);
  console.log(`  Mode      : ${IS_PRODUCTION ? 'production' : 'development'}`);
  if (!IS_PRODUCTION) {
    console.log(`  Expo fwd  : http://localhost:${EXPO_PORT}`);
    console.log(`  API       : http://localhost:${PORT}/api/...`);
    console.log(`  Audio     : http://localhost:${PORT}/audio?url=<preview_url>`);
    console.log(`  Health    : http://localhost:${PORT}/health\n`);
  }
});
