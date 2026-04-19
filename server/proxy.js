const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3001;

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

app.listen(PORT, () => {
  console.log(`CORS Proxy running on http://localhost:${PORT}`);
  console.log('Proxying requests to https://api.deezer.com');
});
