const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const https = require('https');
const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
// Dev: 8081 is the single public port. Expo runs internally on 8082.
// Prod: use PORT env var (Render sets this) or fallback to 3001.
const PORT = IS_PRODUCTION ? (process.env.PORT || 3001) : 8081;
const EXPO_PORT = process.env.EXPO_PORT || 8082;

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Health check (used by start.sh readiness probe) ──────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: IS_PRODUCTION ? 'production' : 'development' });
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
  app.use(express.static(distPath));
  app.get('/{*splat}', (_req, res) => {
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
