const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const WEB_PORT = 8081;

app.use(cors());

// Lyrics proxy — fetches from lyrics.ovh
app.get('/lyrics/:artist/:title', async (req, res) => {
  try {
    const { artist, title } = req.params;
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
    const response = await axios.get(url, { timeout: 8000 });
    res.json(response.data);
  } catch (error) {
    res.json({ lyrics: '' });
  }
});

app.use('/api', async (req, res) => {
  try {
    const deezerUrl = `https://api.deezer.com${req.url}`;
    const response = await axios.get(deezerUrl, { params: req.query });
    res.json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: 'Proxy request failed' });
  }
});

// API-only proxy on port 3001
app.listen(PORT, () => {
  console.log(`CORS Proxy running on http://localhost:${PORT}`);
  console.log('Proxying requests to https://api.deezer.com');
});

// Serve static web build on port 8081
const webApp = express();
webApp.use(cors());

// Also mount the API/lyrics routes on the web server so same-origin works
webApp.get('/lyrics/:artist/:title', async (req, res) => {
  try {
    const { artist, title } = req.params;
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
    const response = await axios.get(url, { timeout: 8000 });
    res.json(response.data);
  } catch (error) {
    res.json({ lyrics: '' });
  }
});

webApp.use('/api', async (req, res) => {
  try {
    const deezerUrl = `https://api.deezer.com${req.url}`;
    const response = await axios.get(deezerUrl, { params: req.query });
    res.json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: 'Proxy request failed' });
  }
});

// Serve the exported Expo web build
const distPath = path.join(__dirname, '..', 'dist');
webApp.use(express.static(distPath));
webApp.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

webApp.listen(WEB_PORT, () => {
  console.log(`Web app serving on http://localhost:${WEB_PORT}`);
});
