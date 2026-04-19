export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Health check
    if (path === '/') {
      return new Response('Aara Music API Proxy', { status: 200 });
    }

    let targetUrl;

    // Deezer API proxy: /api/...
    if (path.startsWith('/api/') || path === '/api') {
      const deezerPath = path.replace(/^\/api/, '');
      targetUrl = `https://api.deezer.com${deezerPath}${url.search}`;
    }
    // Lyrics proxy: /lyrics/artist/title
    else if (path.startsWith('/lyrics/')) {
      const parts = path.replace(/^\/lyrics\//, '');
      targetUrl = `https://api.lyrics.ovh/v1/${parts}`;
    }
    else {
      return new Response('Not Found', { status: 404 });
    }

    try {
      const response = await fetch(targetUrl, {
        headers: { 'User-Agent': 'AaraMusic/1.0' },
      });

      const data = await response.text();

      return new Response(data, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, max-age=300',
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Proxy request failed' }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};
