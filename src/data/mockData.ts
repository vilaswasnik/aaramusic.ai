import { Song, Album, Playlist } from '../types';

// Mock song data
export const mockSongs: Song[] = [
  {
    id: '1',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    duration: 200,
    coverArt: 'https://picsum.photos/400/400?random=1',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    genre: 'Pop',
    releaseYear: 2020,
  },
  {
    id: '2',
    title: 'Levitating',
    artist: 'Dua Lipa',
    album: 'Future Nostalgia',
    duration: 203,
    coverArt: 'https://picsum.photos/400/400?random=2',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    genre: 'Pop',
    releaseYear: 2020,
  },
  {
    id: '3',
    title: 'Save Your Tears',
    artist: 'The Weeknd',
    album: 'After Hours',
    duration: 215,
    coverArt: 'https://picsum.photos/400/400?random=3',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    genre: 'Pop',
    releaseYear: 2020,
  },
  {
    id: '4',
    title: 'Good 4 U',
    artist: 'Olivia Rodrigo',
    album: 'SOUR',
    duration: 178,
    coverArt: 'https://picsum.photos/400/400?random=4',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    genre: 'Pop Rock',
    releaseYear: 2021,
  },
  {
    id: '5',
    title: 'Peaches',
    artist: 'Justin Bieber',
    album: 'Justice',
    duration: 198,
    coverArt: 'https://picsum.photos/400/400?random=5',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    genre: 'Pop',
    releaseYear: 2021,
  },
  {
    id: '6',
    title: 'Heat Waves',
    artist: 'Glass Animals',
    album: 'Dreamland',
    duration: 238,
    coverArt: 'https://picsum.photos/400/400?random=6',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    genre: 'Indie',
    releaseYear: 2020,
  },
];

// Mock playlists
export const mockPlaylists: Playlist[] = [
  {
    id: 'p1',
    name: 'Today\'s Top Hits',
    description: 'The hottest tracks right now',
    coverArt: 'https://picsum.photos/400/400?random=10',
    songs: mockSongs.slice(0, 4),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'p2',
    name: 'Chill Vibes',
    description: 'Relax and unwind with these chill tracks',
    coverArt: 'https://picsum.photos/400/400?random=11',
    songs: mockSongs.slice(2, 6),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'p3',
    name: 'Workout Mix',
    description: 'High-energy songs to power your workout',
    coverArt: 'https://picsum.photos/400/400?random=12',
    songs: [mockSongs[0], mockSongs[1], mockSongs[4]],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Mock albums
export const mockAlbums: Album[] = [
  {
    id: 'a1',
    title: 'After Hours',
    artist: 'The Weeknd',
    coverArt: 'https://picsum.photos/400/400?random=20',
    year: 2020,
    songs: [mockSongs[0], mockSongs[2]],
  },
  {
    id: 'a2',
    title: 'Future Nostalgia',
    artist: 'Dua Lipa',
    coverArt: 'https://picsum.photos/400/400?random=21',
    year: 2020,
    songs: [mockSongs[1]],
  },
];
