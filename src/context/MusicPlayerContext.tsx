import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { Audio } from 'expo-av';
import { Song, PlayerState } from '../types';

interface MusicPlayerContextType {
  playerState: PlayerState;
  listeningHistory: Song[];
  likedSongs: Song[];
  toggleLike: (song: Song) => void;
  isLiked: (songId: string) => boolean;
  playSong: (song: Song, queue?: Song[]) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seek: (position: number) => Promise<void>;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  updatePosition: (position: number) => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within MusicPlayerProvider');
  }
  return context;
};

interface MusicPlayerProviderProps {
  children: ReactNode;
}

export const MusicPlayerProvider: React.FC<MusicPlayerProviderProps> = ({ children }) => {
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentSong: null,
    isPlaying: false,
    position: 0,
    duration: 0,
    queue: [],
    shuffle: false,
    repeat: 'off',
  });

  const soundRef = useRef<Audio.Sound | null>(null);
  const currentIndexRef = useRef<number>(0);
  const [listeningHistory, setListeningHistory] = useState<Song[]>([]);
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);

  const toggleLike = (song: Song) => {
    setLikedSongs((prev) => {
      const exists = prev.some((s) => s.id === song.id);
      if (exists) return prev.filter((s) => s.id !== song.id);
      return [song, ...prev];
    });
  };

  const isLiked = (songId: string) => likedSongs.some((s) => s.id === songId);

  const playSong = async (song: Song, queue: Song[] = [song]) => {
    try {
      // Stop current song if playing
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      // Load and play new song
      const { sound, status } = await Audio.Sound.createAsync(
        { uri: song.audioUrl },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setPlayerState((prev) => ({
              ...prev,
              position: status.positionMillis / 1000,
              duration: (status.durationMillis || 0) / 1000,
              isPlaying: status.isPlaying,
            }));
          }
        }
      );

      soundRef.current = sound;
      const index = queue.findIndex((s) => s.id === song.id);
      currentIndexRef.current = index >= 0 ? index : 0;

      // Track listening history (keep last 100)
      setListeningHistory((prev) => {
        const filtered = prev.filter((s) => s.id !== song.id);
        return [song, ...filtered].slice(0, 100);
      });

      setPlayerState({
        currentSong: song,
        isPlaying: true,
        position: 0,
        duration: song.duration,
        queue,
        shuffle: playerState.shuffle,
        repeat: playerState.repeat,
      });
    } catch (error) {
      console.error('Error playing song:', error);
    }
  };

  const pause = async () => {
    if (soundRef.current) {
      await soundRef.current.pauseAsync();
      setPlayerState((prev) => ({ ...prev, isPlaying: false }));
    }
  };

  const resume = async () => {
    if (soundRef.current) {
      await soundRef.current.playAsync();
      setPlayerState((prev) => ({ ...prev, isPlaying: true }));
    }
  };

  const next = async () => {
    const { queue, repeat } = playerState;
    if (queue.length === 0) return;

    let nextIndex = currentIndexRef.current + 1;
    if (nextIndex >= queue.length) {
      nextIndex = repeat === 'all' ? 0 : queue.length - 1;
    }

    currentIndexRef.current = nextIndex;
    await playSong(queue[nextIndex], queue);
  };

  const previous = async () => {
    const { queue } = playerState;
    if (queue.length === 0) return;

    let prevIndex = currentIndexRef.current - 1;
    if (prevIndex < 0) {
      prevIndex = queue.length - 1;
    }

    currentIndexRef.current = prevIndex;
    await playSong(queue[prevIndex], queue);
  };

  const seek = async (position: number) => {
    if (soundRef.current) {
      await soundRef.current.setPositionAsync(position * 1000);
      setPlayerState((prev) => ({ ...prev, position }));
    }
  };

  const toggleShuffle = () => {
    setPlayerState((prev) => ({ ...prev, shuffle: !prev.shuffle }));
  };

  const toggleRepeat = () => {
    setPlayerState((prev) => ({
      ...prev,
      repeat: prev.repeat === 'off' ? 'all' : prev.repeat === 'all' ? 'one' : 'off',
    }));
  };

  const updatePosition = (position: number) => {
    setPlayerState((prev) => ({ ...prev, position }));
  };

  return (
    <MusicPlayerContext.Provider
      value={{
        playerState,
        listeningHistory,
        likedSongs,
        toggleLike,
        isLiked,
        playSong,
        pause,
        resume,
        next,
        previous,
        seek,
        toggleShuffle,
        toggleRepeat,
        updatePosition,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
};
