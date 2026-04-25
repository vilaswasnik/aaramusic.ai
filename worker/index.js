export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Range',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Health check
    if (path === '/') {
      return new Response('Aara Music API Proxy', { status: 200 });
    }

    // Audio stream proxy: /audio?url=<encoded_cdn_url>
    // Pipes Deezer CDN mp3 preview through the worker with CORS headers.
    if (path === '/audio') {
      const cdnUrl = url.searchParams.get('url');
      if (!cdnUrl) {
        return new Response(JSON.stringify({ error: 'Missing url param' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      // Only allow Deezer CDN domains to prevent SSRF attacks
      let parsedCdnUrl;
      try {
        parsedCdnUrl = new URL(cdnUrl);
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid url param' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      if (!parsedCdnUrl.hostname.endsWith('.dzcdn.net')) {
        return new Response(JSON.stringify({ error: 'URL not allowed' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      const upstreamHeaders = {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'audio/mpeg,audio/*',
      };
      const rangeHeader = request.headers.get('Range');
      if (rangeHeader) upstreamHeaders['Range'] = rangeHeader;

      try {
        const upstream = await fetch(cdnUrl, { headers: upstreamHeaders });
        const outHeaders = {
          'Content-Type': upstream.headers.get('Content-Type') || 'audio/mpeg',
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Range',
          'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
        };
        if (upstream.headers.get('Content-Length')) {
          outHeaders['Content-Length'] = upstream.headers.get('Content-Length');
        }
        if (upstream.headers.get('Content-Range')) {
          outHeaders['Content-Range'] = upstream.headers.get('Content-Range');
        }
        return new Response(upstream.body, {
          status: upstream.status,
          headers: outHeaders,
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Audio proxy failed' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
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
