import axios from 'axios';
import { Platform } from 'react-native';
import { Song, Album, Playlist } from '../types';

// Cloudflare Worker proxy for production (GitHub Pages)
const WORKER_URL = 'https://aaramusic-proxy.vilaswasnik.workers.dev';

// Determine the correct API base URL
const getApiBase = (): string => {
  if (Platform.OS !== 'web') return 'https://api.deezer.com';

  if (typeof window !== 'undefined') {
    const { protocol, hostname, origin } = window.location;
    // Localhost dev: proxy on port 3001
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:3001/api`;
    }
    // Codespace: replace the 8081 port in the hostname with 3001
    if (hostname.includes('-8081.')) {
      return `${origin.replace('-8081.', '-3001.')}/api`;
    }
    // Production: use Cloudflare Worker proxy
    return `${WORKER_URL}/api`;
  }
  return 'http://localhost:3001/api';
};

const DEEZER_API = getApiBase();

// Fetch chart top songs
export const fetchTopSongs = async (limit: number = 20): Promise<Song[]> => {
  try {
    const response = await axios.get(`${DEEZER_API}/chart/0/tracks?limit=${limit}`);
    const tracks = response.data.data;
    
    return tracks.map((track: any) => ({
      id: track.id.toString(),
      title: track.title,
      artist: track.artist.name,
      album: track.album.title,
      duration: track.duration,
      coverArt: track.album.cover_big || track.album.cover_medium,
      audioUrl: track.preview, // 30-second preview
      genre: 'Pop',
      releaseYear: new Date(track.release_date).getFullYear() || 2024,
    }));
  } catch (error) {
    console.error('Error fetching songs from Deezer:', error);
    return [];
  }
};

// Search for songs
export const searchSongs = async (query: string): Promise<Song[]> => {
  try {
    const response = await axios.get(`${DEEZER_API}/search?q=${encodeURIComponent(query)}&limit=20`);
    const tracks = response.data.data;
    
    return tracks.map((track: any) => ({
      id: track.id.toString(),
      title: track.title,
      artist: track.artist.name,
      album: track.album.title,
      duration: track.duration,
      coverArt: track.album.cover_big || track.album.cover_medium,
      audioUrl: track.preview,
      genre: 'Various',
      releaseYear: 2024,
    }));
  } catch (error) {
    console.error('Error searching songs:', error);
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
      
      return tracks.map((track: any) => ({
        id: track.id.toString(),
        title: track.title,
        artist: track.artist.name,
        album: track.album.title,
        duration: track.duration,
        coverArt: track.album.cover_big || track.album.cover_medium,
        audioUrl: track.preview,
        genre: 'Various',
        releaseYear: 2024,
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching genre songs:', error);
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
    return [];
  }
};

// Fetch tracks from a specific Deezer playlist by ID
export const fetchPlaylistTracks = async (playlistId: string, limit: number = 20): Promise<Song[]> => {
  try {
    const response = await axios.get(`${DEEZER_API}/playlist/${playlistId}/tracks?limit=${limit}`);
    const tracks = response.data.data;

    return tracks.map((track: any) => ({
      id: track.id.toString(),
      title: track.title,
      artist: track.artist.name,
      album: track.album?.title || 'Unknown',
      duration: track.duration,
      coverArt: track.album?.cover_big || track.album?.cover_medium || '',
      audioUrl: track.preview,
      genre: 'Various',
      releaseYear: 2024,
    }));
  } catch (error) {
    console.error('Error fetching playlist tracks:', error);
    return [];
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
    return results.filter((p) => p.songs.length > 0);
  } catch (error) {
    console.error('Error fetching curated playlists:', error);
    return [];
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
    return [];
  }
};
