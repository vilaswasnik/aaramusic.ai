import axios from 'axios';
import { Platform } from 'react-native';

const getLyricsBase = (): string => {
  if (Platform.OS !== 'web') return 'https://api.lyrics.ovh/v1';

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('.app.github.dev')) {
      const proxyHost = hostname.replace(/-\d+\.app\.github\.dev/, '-3001.app.github.dev');
      return `https://${proxyHost}/lyrics`;
    }
  }
  return 'http://localhost:3001/lyrics';
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
        const hostname = window.location.hostname;
        if (hostname.includes('.app.github.dev')) {
          const proxyHost = hostname.replace(/-\d+\.app\.github\.dev/, '-3001.app.github.dev');
          return `https://${proxyHost}/api`;
        }
      }
      return 'http://localhost:3001/api';
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
