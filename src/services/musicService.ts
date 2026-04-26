import axios from 'axios';
import { Platform } from 'react-native';
import { Song, Album, Playlist } from '../types';
import { mockSongs, mockPlaylists } from '../data/mockData';

// Render backend for production (GitHub Pages)
const RENDER_BACKEND_URL = 'https://aaramusic-ai.onrender.com';

// Determine the correct API base URL.
// In dev, the proxy runs on the SAME port as the web app (8082), so we use window.location.origin.
// In production (GitHub Pages or Render), use the Render backend.
const getApiBase = (): string => {
  if (Platform.OS !== 'web') return 'https://api.deezer.com';

  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location;
    // Localhost or Codespace dev: proxy is co-located, use same origin
    if (hostname === 'localhost' || hostname === '127.0.0.1' ||
        hostname.endsWith('.app.github.dev') || hostname.endsWith('.preview.app.github.dev')) {
      return `${origin}/api`;
    }
    // Render or GitHub Pages: use Render backend proxy
    return `${RENDER_BACKEND_URL}/api`;
  }
  return 'http://localhost:8082/api';
};

const DEEZER_API = getApiBase();

// Audio proxy base — always the same origin as the app so no cross-port issues.
const getAudioProxyBase = (): string => {
  if (Platform.OS !== 'web') return '';
  if (typeof window === 'undefined') return 'http://localhost:8082';
  const { hostname, origin } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1' ||
      hostname.endsWith('.app.github.dev') || hostname.endsWith('.preview.app.github.dev')) {
    return origin;
  }
  return RENDER_BACKEND_URL;
};

const AUDIO_PROXY_BASE = getAudioProxyBase();

// Wrap a Deezer CDN preview URL so it streams through the proxy on web.
// On native (iOS/Android) the raw CDN URL is used directly.
const proxyAudioUrl = (previewUrl: string): string => {
  if (!previewUrl) return previewUrl;
  if (Platform.OS !== 'web' || !AUDIO_PROXY_BASE) return previewUrl;
  return `${AUDIO_PROXY_BASE}/audio?url=${encodeURIComponent(previewUrl)}`;
};

const getMockSongs = (limit: number = 20): Song[] =>
  mockSongs.slice(0, Math.min(limit, mockSongs.length));

let fallbackDataUsed = false;

const markFallbackDataUsed = (): void => {
  fallbackDataUsed = true;
};

export const resetFallbackDataFlag = (): void => {
  fallbackDataUsed = false;
};

export const isUsingFallbackData = (): boolean => fallbackDataUsed;

// Fetch chart top songs
export const fetchTopSongs = async (limit: number = 20): Promise<Song[]> => {
  try {
    const response = await axios.get(`${DEEZER_API}/chart/0/tracks?limit=${limit}`);
    const tracks = response.data.data;
    
    return tracks
      .filter((track: any) => !!track.preview)
      .map((track: any) => ({
        id: track.id.toString(),
        title: track.title,
        artist: track.artist.name,
        album: track.album.title,
        duration: track.duration,
        coverArt: track.album.cover_big || track.album.cover_medium,
        audioUrl: proxyAudioUrl(track.preview), // 30-second preview
        genre: 'Pop',
        releaseYear: new Date(track.release_date).getFullYear() || 2024,
      }));
  } catch (error) {
    console.error('Error fetching songs from Deezer:', error);
    markFallbackDataUsed();
    return mockSongs;
  }
};

// Search for songs
export const searchSongs = async (query: string): Promise<Song[]> => {
  try {
    const response = await axios.get(`${DEEZER_API}/search?q=${encodeURIComponent(query)}&limit=20`);
    const tracks = response.data.data;
    
    return tracks
      .filter((track: any) => !!track.preview)
      .map((track: any) => ({
        id: track.id.toString(),
        title: track.title,
        artist: track.artist.name,
        album: track.album.title,
        duration: track.duration,
        coverArt: track.album.cover_big || track.album.cover_medium,
        audioUrl: proxyAudioUrl(track.preview),
        genre: 'Various',
        releaseYear: 2024,
      }));
  } catch (error) {
    console.error('Error searching songs:', error);
    markFallbackDataUsed();
    return [];
  }
};

// Fetch songs by genre
export const fetchSongsByGenre = async (genreId: number): Promise<Song[]> => {
  try {
    const response = await axios.get(`${DEEZER_API}/genre/${genreId}/artists?limit=5`);
    const artists = response.data.data;
    
    if (artists.length > 0) {
      const artistResponse = await axios.get(`${DEEZER_API}/artist/${artists[0].id}/top?limit=20`);
      const tracks = artistResponse.data.data;
      
      return tracks
        .filter((track: any) => !!track.preview)
        .map((track: any) => ({
          id: track.id.toString(),
          title: track.title,
          artist: track.artist.name,
          album: track.album.title,
          duration: track.duration,
          coverArt: track.album.cover_big || track.album.cover_medium,
          audioUrl: proxyAudioUrl(track.preview),
          genre: 'Various',
          releaseYear: 2024,
        }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching genre songs:', error);
    markFallbackDataUsed();
    return [];
  }
};

// Fetch playlists
export const fetchPlaylists = async (): Promise<Playlist[]> => {
  try {
    const response = await axios.get(`${DEEZER_API}/chart/0/playlists?limit=10`);
    const playlists = response.data.data;
    
    return playlists.map((playlist: any) => ({
      id: playlist.id.toString(),
      name: playlist.title,
      description: `Curated by ${playlist.user?.name || 'Deezer'}`,
      coverArt: playlist.picture_big || playlist.picture_medium,
      songs: [], // Would need to fetch tracks separately
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  } catch (error) {
    console.error('Error fetching playlists:', error);
    markFallbackDataUsed();
    return [];
  }
};

// Fetch tracks from a specific Deezer playlist by ID
export const fetchPlaylistTracks = async (playlistId: string, limit: number = 20): Promise<Song[]> => {
  try {
    const response = await axios.get(`${DEEZER_API}/playlist/${playlistId}/tracks?limit=${limit}`);
    const tracks = response.data.data;

    if (!Array.isArray(tracks) || tracks.length === 0) {
      markFallbackDataUsed();
      return getMockSongs(limit);
    }

    return tracks
      .filter((track: any) => !!track.preview)
      .map((track: any) => ({
        id: track.id.toString(),
        title: track.title,
        artist: track.artist.name,
        album: track.album?.title || 'Unknown',
        duration: track.duration,
        coverArt: track.album?.cover_big || track.album?.cover_medium || '',
        audioUrl: proxyAudioUrl(track.preview),
        genre: 'Various',
        releaseYear: 2024,
      }));
  } catch (error) {
    console.error('Error fetching playlist tracks:', error);
    markFallbackDataUsed();
    return getMockSongs(limit);
  }
};

// Curated Deezer playlist IDs (real public playlists)
export const CURATED_PLAYLISTS = [
  { id: '3155776842', name: "Today's Top Hits", description: 'The biggest songs right now' },
  { id: '1925105902', name: 'Chill Vibes', description: 'Relax and unwind with chill tracks' },
  { id: '9647710102', name: 'Workout Mix', description: 'High-energy songs for your workout' },
  { id: '1677006641', name: 'Hip Hop Hits', description: 'The hottest hip-hop tracks' },
  { id: '1318937087', name: 'Throwback Hits', description: '2000s hits and throwbacks' },
];

// Fetch all curated playlists with their tracks
export const fetchCuratedPlaylists = async (): Promise<{ name: string; description: string; songs: Song[] }[]> => {
  try {
    const results = await Promise.all(
      CURATED_PLAYLISTS.map(async (playlist) => {
        const songs = await fetchPlaylistTracks(playlist.id, 15);
        return {
          name: playlist.name,
          description: playlist.description,
          songs,
        };
      })
    );
    // Only return playlists that got songs (some IDs may be unavailable)
    const populated = results.filter((p) => p.songs.length > 0);
    if (populated.length > 0) return populated;
    markFallbackDataUsed();
    return mockPlaylists.map((p) => ({ name: p.name, description: p.description, songs: p.songs }));
  } catch (error) {
    console.error('Error fetching curated playlists:', error);
    markFallbackDataUsed();
    return mockPlaylists.map((p) => ({ name: p.name, description: p.description, songs: p.songs }));
  }
};

// Deezer genre IDs
export const GENRES = {
  POP: 132,
  ROCK: 152,
  HIP_HOP: 116,
  ELECTRONIC: 106,
  JAZZ: 129,
  CLASSICAL: 98,
};

// Bollywood curated playlists
export const BOLLYWOOD_PLAYLISTS = [
  { id: '5714603022', name: 'Bollywood Hot 50', description: 'Top trending Bollywood songs' },
  { id: '14922241343', name: 'Bollywood Hits 2026', description: 'Latest Bollywood hits this year' },
  { id: '11971519481', name: 'Bollywood Romance', description: 'Best Hindi romantic songs' },
  { id: '10719125482', name: 'Bollywood Party', description: 'Desi dance hits for every party' },
  { id: '11193162724', name: 'Retro Bollywood', description: 'Classic old Hindi songs' },
  { id: '3731521162', name: 'Arijit Singh Hits', description: 'The voice of Bollywood' },
];

// Fetch Bollywood top songs (from Bollywood Hot 50)
export const fetchBollywoodTopSongs = async (limit: number = 30): Promise<Song[]> => {
  return fetchPlaylistTracks('5714603022', limit);
};

// Fetch all Bollywood playlists with tracks
export const fetchBollywoodPlaylists = async (): Promise<{ name: string; description: string; songs: Song[] }[]> => {
  try {
    const results = await Promise.all(
      BOLLYWOOD_PLAYLISTS.map(async (playlist) => {
        const songs = await fetchPlaylistTracks(playlist.id, 15);
        return {
          name: playlist.name,
          description: playlist.description,
          songs,
        };
      })
    );
    return results.filter((p) => p.songs.length > 0);
  } catch (error) {
    console.error('Error fetching Bollywood playlists:', error);
    markFallbackDataUsed();
    return [];
  }
};

// Hollywood curated playlists
export const HOLLYWOOD_PLAYLISTS = [
  { id: '3155776842', name: 'Top Worldwide', description: 'Biggest global hits right now' },
  { id: '4312138426', name: 'Hollywood Hits', description: 'Best of Hollywood music' },
  { id: '6707920184', name: 'English Mega Hits', description: 'All-time top English songs' },
  { id: '754776991', name: 'Film Classics', description: 'Iconic movie soundtracks' },
  { id: '1306931615', name: 'Rock Essentials', description: '100 rock anthems you need' },
  { id: '1419215845', name: '2000s Rock', description: 'Best rock from the 2000s' },
];

export const fetchHollywoodTopSongs = async (limit: number = 30): Promise<Song[]> => {
  return fetchPlaylistTracks('6707920184', limit);
};

export const fetchHollywoodPlaylists = async (): Promise<{ name: string; description: string; songs: Song[] }[]> => {
  try {
    const results = await Promise.all(
      HOLLYWOOD_PLAYLISTS.map(async (playlist) => {
        const songs = await fetchPlaylistTracks(playlist.id, 15);
        return { name: playlist.name, description: playlist.description, songs };
      })
    );
    return results.filter((p) => p.songs.length > 0);
  } catch (error) {
    console.error('Error fetching Hollywood playlists:', error);
    markFallbackDataUsed();
    return [];
  }
};

// South Indian curated playlists
export const SOUTH_INDIAN_PLAYLISTS = [
  { id: '13523718423', name: 'Tamil Hits 2025', description: 'Top Tamil songs' },
  { id: '12294330991', name: '2000s Tamil Classics', description: 'Best Tamil hits from the 2000s' },
  { id: '13580430301', name: 'Tamil Romantic', description: 'Best romantic Tamil songs' },
  { id: '9808029382', name: 'Tollywood Hits', description: 'Best Telugu songs' },
  { id: '14442216743', name: 'Kannada Romantic', description: 'Kannada romantic hits' },
  { id: '13760081961', name: 'Malayalam Melodies', description: 'Evergreen Malayalam songs' },
  { id: '8873837482', name: 'A.R. Rahman Hits', description: '100% A.R. Rahman' },
];

export const fetchSouthIndianTopSongs = async (limit: number = 30): Promise<Song[]> => {
  return fetchPlaylistTracks('13523718423', limit);
};

export const fetchSouthIndianPlaylists = async (): Promise<{ name: string; description: string; songs: Song[] }[]> => {
  try {
    const results = await Promise.all(
      SOUTH_INDIAN_PLAYLISTS.map(async (playlist) => {
        const songs = await fetchPlaylistTracks(playlist.id, 15);
        return { name: playlist.name, description: playlist.description, songs };
      })
    );
    return results.filter((p) => p.songs.length > 0);
  } catch (error) {
    console.error('Error fetching South Indian playlists:', error);
    markFallbackDataUsed();
    return [];
  }
};

// DJ Mix curated playlists
export const DJ_MIX_PLAYLISTS = [
  { id: '4403076402', name: 'DJ Club Bangers', description: 'The hottest club DJ tracks' },
  { id: '1996494362', name: 'EDM Festival Mix', description: 'Big room festival anthems' },
  { id: '6388656264', name: 'Tech House', description: 'Underground tech house grooves' },
  { id: '1282495565', name: 'Trance Classics', description: 'Euphoric trance essentials' },
  { id: '1925105902', name: 'Deep House Chill', description: 'Deep house & chill beats' },
  { id: '3085146642', name: 'Hip Hop DJ Mix', description: 'DJ-ready hip hop bangers' },
];

export const fetchDJMixTopSongs = async (limit: number = 30): Promise<Song[]> => {
  return fetchPlaylistTracks('4403076402', limit);
};

export const fetchDJMixPlaylists = async (): Promise<{ name: string; description: string; songs: Song[] }[]> => {
  try {
    const results = await Promise.all(
      DJ_MIX_PLAYLISTS.map(async (playlist) => {
        const songs = await fetchPlaylistTracks(playlist.id, 15);
        return { name: playlist.name, description: playlist.description, songs };
      })
    );
    return results.filter((p) => p.songs.length > 0);
  } catch (error) {
    console.error('Error fetching DJ Mix playlists:', error);
    markFallbackDataUsed();
    return [];
  }
};
