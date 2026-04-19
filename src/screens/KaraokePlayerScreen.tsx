import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography } from '../constants/theme';
import { Song } from '../types';
import {
  fetchLyrics,
  generateTimedLyrics,
  searchKaraokeVersion,
  TimedLine,
} from '../services/lyricsService';

const { width, height } = Dimensions.get('window');
const KARAOKE_PURPLE = '#9C27B0';
const KARAOKE_PINK = '#E91E63';
const LINE_HEIGHT = 52;

type KaraokeMode = 'vocal' | 'instrumental';

const hapticTap = () => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

export const KaraokePlayerScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ KaraokePlayer: { song: Song } }, 'KaraokePlayer'>>();
  const song = route.params.song;

  // Audio state
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(song.duration);
  const positionRef = useRef(0);

  // Lyrics state
  const [rawLyrics, setRawLyrics] = useState('');
  const [timedLines, setTimedLines] = useState<TimedLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [lyricsLoading, setLyricsLoading] = useState(true);
  const [lyricsError, setLyricsError] = useState(false);

  // Mode
  const [mode, setMode] = useState<KaraokeMode>('vocal');
  const [instrumentalUrl, setInstrumentalUrl] = useState<string | null>(null);
  const [instrumentalSearching, setInstrumentalSearching] = useState(false);

  // Animations
  const scrollRef = useRef<ScrollView>(null);
  const lineAnims = useRef<Animated.Value[]>([]).current;
  const bgPulse = useRef(new Animated.Value(0)).current;

  // Load lyrics on mount
  useEffect(() => {
    loadLyrics();
    searchInstrumental();
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  // Background color pulse
  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bgPulse, { toValue: 1, duration: 3000, useNativeDriver: false }),
          Animated.timing(bgPulse, { toValue: 0, duration: 3000, useNativeDriver: false }),
        ])
      ).start();
    }
  }, [isPlaying]);

  const loadLyrics = async () => {
    setLyricsLoading(true);
    setLyricsError(false);
    const lyrics = await fetchLyrics(song.artist, song.title);
    if (lyrics) {
      setRawLyrics(lyrics);
      const timed = generateTimedLyrics(lyrics, song.duration);
      setTimedLines(timed);
      // Initialize animation values
      timed.forEach((_, i) => {
        if (!lineAnims[i]) lineAnims.push(new Animated.Value(0));
      });
    } else {
      setLyricsError(true);
    }
    setLyricsLoading(false);
  };

  const searchInstrumental = async () => {
    setInstrumentalSearching(true);
    const url = await searchKaraokeVersion(song.artist, song.title);
    setInstrumentalUrl(url);
    setInstrumentalSearching(false);
  };

  // Load and play audio
  const loadAudio = async (audioUrl: string) => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
    }

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUrl },
      { shouldPlay: true },
      onPlaybackStatusUpdate
    );

    soundRef.current = sound;
    setIsPlaying(true);
  };

  const onPlaybackStatusUpdate = useCallback((status: any) => {
    if (status.isLoaded) {
      const posSec = status.positionMillis / 1000;
      setPosition(posSec);
      positionRef.current = posSec;
      if (status.durationMillis) {
        setDuration(status.durationMillis / 1000);
      }
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        positionRef.current = 0;
        setCurrentLineIndex(-1);
      }
    }
  }, []);

  // Track current lyric line based on position
  useEffect(() => {
    if (timedLines.length === 0) return;

    const idx = timedLines.findIndex(
      (line) => position >= line.startTime && position < line.endTime
    );

    if (idx !== currentLineIndex && idx >= 0) {
      setCurrentLineIndex(idx);

      // Animate the active line
      if (lineAnims[idx]) {
        lineAnims[idx].setValue(0);
        Animated.spring(lineAnims[idx], {
          toValue: 1,
          speed: 20,
          bounciness: 8,
          useNativeDriver: true,
        }).start();
      }

      // Auto-scroll to keep current line centered
      scrollRef.current?.scrollTo({
        y: Math.max(0, idx * LINE_HEIGHT - height * 0.3),
        animated: true,
      });
    }
  }, [position, timedLines, currentLineIndex]);

  // Play / Pause
  const handlePlayPause = async () => {
    hapticTap();
    if (!soundRef.current) {
      const url = mode === 'instrumental' && instrumentalUrl ? instrumentalUrl : song.audioUrl;
      await loadAudio(url);
      return;
    }
    if (isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  };

  // Restart
  const handleRestart = async () => {
    hapticTap();
    if (soundRef.current) {
      await soundRef.current.setPositionAsync(0);
      await soundRef.current.playAsync();
    }
  };

  // Switch mode
  const handleModeSwitch = async (newMode: KaraokeMode) => {
    if (newMode === mode) return;
    hapticTap();
    setMode(newMode);

    const wasPlaying = isPlaying;
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    setIsPlaying(false);
    setPosition(0);
    setCurrentLineIndex(-1);

    if (wasPlaying) {
      const url = newMode === 'instrumental' && instrumentalUrl ? instrumentalUrl : song.audioUrl;
      await loadAudio(url);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  const bgColor = bgPulse.interpolate({
    inputRange: [0, 1],
    outputRange: ['#1a0a2e', '#2a0a1e'],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="mic" size={18} color={KARAOKE_PINK} />
          <Text style={styles.headerTitle}>Karaoke</Text>
        </View>
        <TouchableOpacity onPress={handleRestart} style={styles.headerBtn}>
          <Ionicons name="refresh" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Song Info Row */}
      <View style={styles.songRow}>
        <Image source={{ uri: song.coverArt }} style={styles.songThumb} />
        <View style={styles.songMeta}>
          <Text style={styles.songTitle} numberOfLines={1}>{song.title}</Text>
          <Text style={styles.songArtist} numberOfLines={1}>{song.artist}</Text>
        </View>
      </View>

      {/* Mode Toggle */}
      <View style={styles.modeContainer}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'vocal' && styles.modeBtnActive]}
          onPress={() => handleModeSwitch('vocal')}
        >
          <Ionicons name="person" size={16} color={mode === 'vocal' ? '#fff' : colors.textSecondary} />
          <Text style={[styles.modeBtnText, mode === 'vocal' && styles.modeBtnTextActive]}>
            Song + Lyrics
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeBtn,
            mode === 'instrumental' && styles.modeBtnActive,
            !instrumentalUrl && styles.modeBtnDisabled,
          ]}
          onPress={() => instrumentalUrl && handleModeSwitch('instrumental')}
        >
          <Ionicons name="musical-notes" size={16} color={mode === 'instrumental' ? '#fff' : colors.textSecondary} />
          <Text style={[styles.modeBtnText, mode === 'instrumental' && styles.modeBtnTextActive]}>
            {instrumentalSearching ? 'Finding...' : instrumentalUrl ? 'Music Only + Lyrics' : 'Music Only (N/A)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lyrics Display */}
      <View style={styles.lyricsContainer}>
        {lyricsLoading ? (
          <View style={styles.lyricsCenter}>
            <ActivityIndicator size="large" color={KARAOKE_PINK} />
            <Text style={styles.loadingText}>Loading lyrics...</Text>
          </View>
        ) : lyricsError ? (
          <View style={styles.lyricsCenter}>
            <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.noLyricsTitle}>Lyrics not available</Text>
            <Text style={styles.noLyricsText}>You can still enjoy the music!</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.lyricsScroll}
          >
            {/* Spacer so first line starts in the middle */}
            <View style={{ height: height * 0.15 }} />
            {timedLines.map((line, i) => {
              const isActive = i === currentLineIndex;
              const isPast = i < currentLineIndex;
              const scale = lineAnims[i]
                ? lineAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] })
                : 1;

              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.lyricLine,
                    { transform: [{ scale: typeof scale === 'number' ? scale : scale }] },
                  ]}
                >
                  <Text
                    style={[
                      styles.lyricText,
                      isActive && styles.lyricTextActive,
                      isPast && styles.lyricTextPast,
                    ]}
                  >
                    {line.text}
                  </Text>
                  {isActive && (
                    <LinearGradient
                      colors={[KARAOKE_PURPLE + '40', KARAOKE_PINK + '40']}
                      style={styles.activeHighlight}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                  )}
                </Animated.View>
              );
            })}
            {/* Bottom spacer */}
            <View style={{ height: height * 0.3 }} />
          </ScrollView>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <LinearGradient
            colors={[KARAOKE_PURPLE, KARAOKE_PINK]}
            style={[styles.progressFill, { width: `${progress}%` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={handleRestart} style={styles.controlBtn}>
          <Ionicons name="play-skip-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePlayPause} style={styles.playBtn}>
          <LinearGradient
            colors={[KARAOKE_PURPLE, KARAOKE_PINK]}
            style={styles.playBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            hapticTap();
            soundRef.current?.setPositionAsync(Math.min((position + 5) * 1000, duration * 1000));
          }}
          style={styles.controlBtn}
        >
          <Ionicons name="play-skip-forward" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerBtn: {
    padding: 4,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: 12,
    marginBottom: spacing.sm,
  },
  songThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(156,39,176,0.3)',
  },
  songMeta: {
    flex: 1,
  },
  songTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  songArtist: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },

  // Mode toggle
  modeContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 4,
    marginBottom: spacing.sm,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
  },
  modeBtnActive: {
    backgroundColor: KARAOKE_PURPLE,
  },
  modeBtnDisabled: {
    opacity: 0.4,
  },
  modeBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: '#fff',
  },

  // Lyrics
  lyricsContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  lyricsScroll: {
    paddingHorizontal: spacing.lg,
  },
  lyricsCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  noLyricsTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  noLyricsText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  lyricLine: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
    overflow: 'hidden',
    position: 'relative',
    minHeight: LINE_HEIGHT - 4,
    justifyContent: 'center',
  },
  lyricText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
  },
  lyricTextActive: {
    color: '#fff',
    fontSize: 24,
    textShadowColor: KARAOKE_PINK,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  lyricTextPast: {
    color: 'rgba(255,255,255,0.55)',
  },
  activeHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
  },

  // Progress
  progressContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },

  // Controls
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingBottom: 40,
    paddingTop: 8,
  },
  controlBtn: {
    padding: 8,
  },
  playBtn: {},
  playBtnGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
