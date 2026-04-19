const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

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

// Deezer API proxy
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

// In production, serve the exported Expo web build from the same server
if (IS_PRODUCTION) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Aara Music server running on port ${PORT} (${IS_PRODUCTION ? 'production' : 'development'})`);
});
