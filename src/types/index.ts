// TypeScript types for the Aara Music app

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  coverArt: string;
  audioUrl: string;
  genre?: string;
  releaseYear?: number;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  coverArt: string;
  year: number;
  songs: Song[];
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverArt: string;
  songs: Song[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Artist {
  id: string;
  name: string;
  image: string;
  bio?: string;
  genres: string[];
}

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  queue: Song[];
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
}
