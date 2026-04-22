import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { Song, PlayerState } from '../types';

const IS_WEB = Platform.OS === 'web';

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

  // --- Native (expo-av) refs ---
  const soundRef = useRef<Audio.Sound | null>(null);

  // --- Web (HTML5 Audio) ref ---
  const webAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- Shared state refs (avoid stale closures) ---
  const currentIndexRef = useRef<number>(0);
  const queueRef = useRef<Song[]>([]);
  const shuffleRef = useRef<boolean>(false);
  const repeatRef = useRef<'off' | 'all' | 'one'>('off');
  const playSongRef = useRef<((song: Song, queue?: Song[]) => Promise<void>) | null>(null);

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

  // ─────────────────────────────────────────────
  // Shared advance logic (used by both engines)
  // ─────────────────────────────────────────────
  const advanceQueue = () => {
    const q = queueRef.current;
    const repeat = repeatRef.current;
    const shuffle = shuffleRef.current;
    const idx = currentIndexRef.current;

    if (q.length === 0) return;

    if (repeat === 'one') {
      playSongRef.current?.(q[idx], q);
    } else if (shuffle) {
      let nextIdx: number;
      do { nextIdx = Math.floor(Math.random() * q.length); }
      while (nextIdx === idx && q.length > 1);
      playSongRef.current?.(q[nextIdx], q);
    } else {
      const nextIdx = idx + 1;
      if (nextIdx < q.length) {
        playSongRef.current?.(q[nextIdx], q);
      } else if (repeat === 'all') {
        playSongRef.current?.(q[0], q);
      } else {
        setPlayerState((prev) => ({ ...prev, isPlaying: false }));
      }
    }
  };

  // ─────────────────────────────────────────────
  // Web engine — HTML5 Audio
  // ─────────────────────────────────────────────
  const playWebAudio = (song: Song, queue: Song[]) => {
    // Tear down previous instance
    if (webAudioRef.current) {
      webAudioRef.current.pause();
      webAudioRef.current.src = '';
      webAudioRef.current.onended = null;
      webAudioRef.current.ontimeupdate = null;
      webAudioRef.current.onerror = null;
      try { document.body.removeChild(webAudioRef.current); } catch {}
      webAudioRef.current = null;
    }

    const audio = document.createElement('audio') as HTMLAudioElement;
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    audio.style.display = 'none';
    // Appending to DOM helps some browsers grant autoplay permission
    document.body.appendChild(audio);
    webAudioRef.current = audio;

    // Position / duration updates
    audio.ontimeupdate = () => {
      setPlayerState((prev) => ({
        ...prev,
        position: audio.currentTime,
        duration: isFinite(audio.duration) ? audio.duration : prev.duration,
      }));
    };

    // Auto-advance when track ends
    audio.onended = () => {
      advanceQueue();
    };

    // Skip broken track
    audio.onerror = () => {
      console.error('Web audio error for:', song.title);
      const q = queueRef.current;
      const nextIdx = currentIndexRef.current + 1;
      if (nextIdx < q.length) {
        currentIndexRef.current = nextIdx;
        playSongRef.current?.(q[nextIdx], q);
      } else {
        setPlayerState((prev) => ({ ...prev, isPlaying: false }));
      }
    };

    audio.src = song.audioUrl;
    audio.load();
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.error('Web audio play() failed:', err);
        // Try once more without crossOrigin restriction
        audio.removeAttribute('crossorigin');
        audio.src = song.audioUrl;
        audio.play().catch((e) => console.error('Retry play() failed:', e));
      });
    }
  };

  // ─────────────────────────────────────────────
  // Native engine — expo-av
  // ─────────────────────────────────────────────
  const playNativeAudio = async (song: Song, queue: Song[]) => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: song.audioUrl },
      { shouldPlay: true },
      (status) => {
        if (!status.isLoaded) return;
        setPlayerState((prev) => ({
          ...prev,
          position: status.positionMillis / 1000,
          duration: (status.durationMillis || 0) / 1000,
          isPlaying: status.isPlaying,
        }));
        if (status.didJustFinish) advanceQueue();
      }
    );

    soundRef.current = sound;
  };

  // ─────────────────────────────────────────────
  // Main playSong
  // ─────────────────────────────────────────────
  const playSong = async (song: Song, queue: Song[] = [song]) => {
    if (!song.audioUrl) {
      const next = queue.find((s) => s.id !== song.id && !!s.audioUrl);
      if (next) await playSong(next, queue);
      return;
    }

    queueRef.current = queue;
    const index = queue.findIndex((s) => s.id === song.id);
    currentIndexRef.current = index >= 0 ? index : 0;

    try {
      if (IS_WEB) {
        playWebAudio(song, queue);
      } else {
        await playNativeAudio(song, queue);
      }

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
        shuffle: shuffleRef.current,
        repeat: repeatRef.current,
      });
    } catch (error) {
      console.error('Error playing song:', error);
      const q = queueRef.current;
      const nextIdx = currentIndexRef.current + 1;
      if (nextIdx < q.length && q[nextIdx].audioUrl) {
        currentIndexRef.current = nextIdx;
        playSongRef.current?.(q[nextIdx], q);
      }
    }
  };

  useEffect(() => {
    playSongRef.current = playSong;
  });

  // ─────────────────────────────────────────────
  // Controls
  // ─────────────────────────────────────────────
  const pause = async () => {
    if (IS_WEB) {
      webAudioRef.current?.pause();
    } else if (soundRef.current) {
      await soundRef.current.pauseAsync();
    }
    setPlayerState((prev) => ({ ...prev, isPlaying: false }));
  };

  const resume = async () => {
    if (IS_WEB) {
      webAudioRef.current?.play().catch((e) => console.error('resume error', e));
    } else if (soundRef.current) {
      await soundRef.current.playAsync();
    }
    setPlayerState((prev) => ({ ...prev, isPlaying: true }));
  };

  const next = async () => {
    const queue = queueRef.current;
    if (queue.length === 0) return;

    let nextIndex: number;
    if (shuffleRef.current) {
      do { nextIndex = Math.floor(Math.random() * queue.length); }
      while (nextIndex === currentIndexRef.current && queue.length > 1);
    } else {
      nextIndex = currentIndexRef.current + 1;
      if (nextIndex >= queue.length) {
        nextIndex = repeatRef.current === 'all' ? 0 : queue.length - 1;
      }
    }
    currentIndexRef.current = nextIndex;
    await playSong(queue[nextIndex], queue);
  };

  const previous = async () => {
    const queue = queueRef.current;
    if (queue.length === 0) return;
    let prevIndex = currentIndexRef.current - 1;
    if (prevIndex < 0) prevIndex = queue.length - 1;
    currentIndexRef.current = prevIndex;
    await playSong(queue[prevIndex], queue);
  };

  const seek = async (position: number) => {
    if (IS_WEB) {
      if (webAudioRef.current) webAudioRef.current.currentTime = position;
    } else if (soundRef.current) {
      await soundRef.current.setPositionAsync(position * 1000);
    }
    setPlayerState((prev) => ({ ...prev, position }));
  };

  const toggleShuffle = () => {
    shuffleRef.current = !shuffleRef.current;
    setPlayerState((prev) => ({ ...prev, shuffle: shuffleRef.current }));
  };

  const toggleRepeat = () => {
    const next: 'off' | 'all' | 'one' =
      repeatRef.current === 'off' ? 'all' : repeatRef.current === 'all' ? 'one' : 'off';
    repeatRef.current = next;
    setPlayerState((prev) => ({ ...prev, repeat: next }));
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
