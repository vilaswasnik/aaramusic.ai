import axios from 'axios';
import { Platform } from 'react-native';

const WORKER_URL = 'https://aaramusic-proxy.vilaswasnik.workers.dev';

const getLyricsBase = (): string => {
  if (Platform.OS !== 'web') return 'https://api.lyrics.ovh/v1';

  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location;
    // Localhost, Codespace dev, or Render deployments: use same-origin proxy
    if (hostname === 'localhost' || hostname === '127.0.0.1' ||
        hostname.endsWith('.app.github.dev') || hostname.endsWith('.preview.app.github.dev') ||
        hostname.endsWith('.onrender.com')) {
      return `${origin}/lyrics`;
    }
    // Static hosts (GitHub Pages etc.): use Cloudflare Worker proxy
    return `${WORKER_URL}/lyrics`;
  }
  return 'http://localhost:8082/lyrics';
};

const LYRICS_API = getLyricsBase();

export interface TimedLine {
  text: string;
  startTime: number; // seconds
  endTime: number;   // seconds
}

/**
 * Fetch raw lyrics text for a song
 */
export const fetchLyrics = async (artist: string, title: string): Promise<string> => {
  try {
    // Clean title: remove "(feat. ...)", "[...]", etc.
    const cleanTitle = title
      .replace(/\(feat\..*?\)/gi, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?remix.*?\)/gi, '')
      .replace(/\(.*?version.*?\)/gi, '')
      .trim();
    const cleanArtist = artist.split(/[,&]/)[0].trim();

    const response = await axios.get(
      `${LYRICS_API}/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`,
      { timeout: 8000 }
    );

    if (response.data?.lyrics) {
      return response.data.lyrics.trim();
    }
    return '';
  } catch {
    return '';
  }
};

/**
 * Convert raw lyrics to timed lines based on song duration.
 * Distributes lines evenly across the duration with a brief intro gap.
 */
export const generateTimedLyrics = (
  rawLyrics: string,
  durationSec: number
): TimedLine[] => {
  if (!rawLyrics || durationSec <= 0) return [];

  const lines = rawLyrics
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  // Reserve a small intro (first 5% or 2s) and outro (last 5%)
  const intro = Math.min(2, durationSec * 0.05);
  const outro = durationSec * 0.05;
  const usable = durationSec - intro - outro;
  const perLine = usable / lines.length;

  return lines.map((text, i) => ({
    text,
    startTime: intro + i * perLine,
    endTime: intro + (i + 1) * perLine,
  }));
};

/**
 * Search for karaoke/instrumental version of a song on Deezer
 */
export const searchKaraokeVersion = async (
  artist: string,
  title: string
): Promise<string | null> => {
  try {
    const getApiBase = (): string => {
      if (Platform.OS !== 'web') return 'https://api.deezer.com';
      if (typeof window !== 'undefined') {
        const { hostname, origin } = window.location;
        if (hostname === 'localhost' || hostname === '127.0.0.1' ||
            hostname.endsWith('.app.github.dev') || hostname.endsWith('.preview.app.github.dev') ||
            hostname.endsWith('.onrender.com')) {
          return `${origin}/api`;
        }
        return `${WORKER_URL}/api`;
      }
      return 'http://localhost:8082/api';
    };

    const base = getApiBase();
    const cleanTitle = title.replace(/\(.*?\)/g, '').trim();

    // Try searching for karaoke/instrumental version
    const queries = [
      `${cleanTitle} karaoke`,
      `${cleanTitle} instrumental`,
    ];

    for (const q of queries) {
      const resp = await axios.get(`${base}/search?q=${encodeURIComponent(q)}&limit=5`);
      const tracks = resp.data?.data || [];
      for (const t of tracks) {
        const tTitle = (t.title || '').toLowerCase();
        if (
          tTitle.includes('karaoke') ||
          tTitle.includes('instrumental') ||
          tTitle.includes('backing')
        ) {
          return t.preview || null;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
};
