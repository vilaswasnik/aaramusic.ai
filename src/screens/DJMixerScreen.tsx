import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  FlatList,
  Modal,
  TextInput,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography } from '../constants/theme';
import { searchSongs } from '../services/musicService';
import { Song } from '../types';

const { width } = Dimensions.get('window');
const ACCENT = '#00E5FF';
const DECK_A_COLOR = '#FF1744';
const DECK_B_COLOR = '#00E5FF';
const VINYL_SIZE = Math.min((width - 48) / 2 - 16, 150);

const haptic = () => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};
const hapticMed = () => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

// ============================================================
// Types
// ============================================================
interface HotCue {
  id: number;
  position: number; // seconds
  color: string;
  label: string;
}

interface EQState {
  low: number;   // -1 to 1 (kill to boost)
  mid: number;
  high: number;
}

interface DeckState {
  song: Song | null;
  sound: Audio.Sound | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  speed: number;
  loop: boolean;
  hotCues: HotCue[];
  eq: EQState;
  pitchBend: number; // momentary pitch offset
}

const defaultEQ: EQState = { low: 0, mid: 0, high: 0 };

const defaultDeck: DeckState = {
  song: null,
  sound: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  volume: 1,
  speed: 1,
  loop: false,
  hotCues: [],
  eq: { ...defaultEQ },
  pitchBend: 0,
};

const HOT_CUE_COLORS = ['#FF1744', '#FF9100', '#FFEA00', '#00E676', '#00B0FF', '#D500F9', '#FF6D00', '#76FF03'];

// ============================================================
// Waveform component (simulated from position/duration)
// ============================================================
const Waveform: React.FC<{
  progress: number;
  color: string;
  hotCues: HotCue[];
  duration: number;
  isPlaying: boolean;
}> = ({ progress, color, hotCues, duration, isPlaying }) => {
  // Generate a static pseudo-random waveform
  const bars = 60;
  const heights = useRef(
    Array.from({ length: bars }, (_, i) => {
      const x = i / bars;
      return 0.2 + 0.8 * Math.abs(Math.sin(x * 17.3 + 2.7) * Math.cos(x * 11.1 + 1.3));
    })
  ).current;

  const currentBar = Math.floor(progress * bars);

  return (
    <View style={wfStyles.container}>
      <View style={wfStyles.barsRow}>
        {heights.map((h, i) => (
          <View
            key={i}
            style={[
              wfStyles.bar,
              {
                height: h * 28,
                backgroundColor: i <= currentBar ? color : 'rgba(255,255,255,0.12)',
                opacity: i === currentBar && isPlaying ? 1 : i <= currentBar ? 0.7 : 0.4,
              },
            ]}
          />
        ))}
      </View>
      {/* Hot cue markers */}
      {hotCues.map((cue) => {
        const pct = duration > 0 ? (cue.position / duration) * 100 : 0;
        return (
          <View key={cue.id} style={[wfStyles.cueMarker, { left: `${pct}%`, backgroundColor: cue.color }]} />
        );
      })}
    </View>
  );
};

const wfStyles = StyleSheet.create({
  container: { width: '100%', height: 32, position: 'relative', marginVertical: 4 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', height: 28, gap: 1, paddingHorizontal: 1 },
  bar: { flex: 1, borderRadius: 1, minWidth: 2 },
  cueMarker: {
    position: 'absolute', bottom: 0, width: 3, height: '100%', borderRadius: 1,
  },
});

// ============================================================
// EQ Knob component
// ============================================================
const EQKnob: React.FC<{
  label: string;
  value: number;
  color: string;
  onChange: (v: number) => void;
}> = ({ label, value, color, onChange }) => {
  const rotation = value * 135; // -135 to +135 degrees

  return (
    <View style={eqStyles.knobContainer}>
      <Text style={eqStyles.knobLabel}>{label}</Text>
      <View style={eqStyles.knobOuter}>
        <View style={[eqStyles.knobInner, { transform: [{ rotate: `${rotation}deg` }] }]}>
          <View style={[eqStyles.knobDot, { backgroundColor: color }]} />
        </View>
      </View>
      <View style={eqStyles.knobButtons}>
        <TouchableOpacity onPress={() => { haptic(); onChange(Math.max(-1, value - 0.25)); }}>
          <Ionicons name="remove" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { haptic(); onChange(0); }}>
          <Text style={[eqStyles.resetText, { color }]}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { haptic(); onChange(Math.min(1, value + 0.25)); }}>
          <Ionicons name="add" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const eqStyles = StyleSheet.create({
  knobContainer: { alignItems: 'center', width: 54 },
  knobLabel: { fontSize: 9, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1, marginBottom: 4 },
  knobOuter: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  knobInner: { width: 32, height: 32, borderRadius: 16, alignItems: 'center' },
  knobDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  knobButtons: { flexDirection: 'row', gap: 6, marginTop: 4, alignItems: 'center' },
  resetText: { fontSize: 10, fontWeight: '800' },
});

// ============================================================
// Main DJMixerScreen
// ============================================================
export const DJMixerScreen: React.FC = () => {
  const navigation = useNavigation();

  // Dual decks
  const [deckA, setDeckA] = useState<DeckState>({ ...defaultDeck });
  const [deckB, setDeckB] = useState<DeckState>({ ...defaultDeck });
  const soundRefA = useRef<Audio.Sound | null>(null);
  const soundRefB = useRef<Audio.Sound | null>(null);

  // Crossfader
  const [crossfade, setCrossfade] = useState(0);

  // Active FX
  const [activeFX, setActiveFX] = useState<Record<string, boolean>>({});

  // Auto-DJ
  const [autoDJ, setAutoDJ] = useState(false);
  const autoDJRef = useRef(false);

  // Scratch state per deck
  const [scratchingA, setScratchingA] = useState(false);
  const [scratchingB, setScratchingB] = useState(false);

  // Song browser modal
  const [showBrowser, setShowBrowser] = useState(false);
  const [browserTarget, setBrowserTarget] = useState<'A' | 'B' | 'playlist'>('A');
  const [browserQuery, setBrowserQuery] = useState('');
  const [browserResults, setBrowserResults] = useState<Song[]>([]);
  const [browserLoading, setBrowserLoading] = useState(false);

  // DJ Playlist
  const [djPlaylist, setDjPlaylist] = useState<Song[]>([]);

  // Vinyl spin animation
  const spinA = useRef(new Animated.Value(0)).current;
  const spinB = useRef(new Animated.Value(0)).current;
  const spinAnimA = useRef<Animated.CompositeAnimation | null>(null);
  const spinAnimB = useRef<Animated.CompositeAnimation | null>(null);

  // Scratch rotation offset
  const scratchOffsetA = useRef(new Animated.Value(0)).current;
  const scratchOffsetB = useRef(new Animated.Value(0)).current;

  // Cleanup
  useEffect(() => {
    return () => {
      soundRefA.current?.unloadAsync();
      soundRefB.current?.unloadAsync();
    };
  }, []);

  // Crossfade volumes
  useEffect(() => {
    const volA = deckA.volume * Math.max(0, 1 - crossfade);
    const volB = deckB.volume * Math.max(0, 1 + crossfade);
    soundRefA.current?.setVolumeAsync(Math.min(1, volA));
    soundRefB.current?.setVolumeAsync(Math.min(1, volB));
  }, [crossfade, deckA.volume, deckB.volume]);

  // Vinyl spin
  useEffect(() => {
    if (deckA.isPlaying && !scratchingA) {
      spinAnimA.current = Animated.loop(
        Animated.timing(spinA, { toValue: 1, duration: 2000 / deckA.speed, useNativeDriver: true })
      );
      spinAnimA.current.start();
    } else {
      spinAnimA.current?.stop();
    }
  }, [deckA.isPlaying, deckA.speed, scratchingA]);

  useEffect(() => {
    if (deckB.isPlaying && !scratchingB) {
      spinAnimB.current = Animated.loop(
        Animated.timing(spinB, { toValue: 1, duration: 2000 / deckB.speed, useNativeDriver: true })
      );
      spinAnimB.current.start();
    } else {
      spinAnimB.current?.stop();
    }
  }, [deckB.isPlaying, deckB.speed, scratchingB]);

  // Auto-DJ: crossfade towards B when A nears end
  useEffect(() => {
    autoDJRef.current = autoDJ;
  }, [autoDJ]);

  useEffect(() => {
    if (!autoDJRef.current) return;
    if (deckA.duration > 0 && deckA.position > deckA.duration * 0.85 && deckB.song) {
      // Fade towards B
      setCrossfade((prev) => Math.min(1, prev + 0.02));
    }
  }, [deckA.position]);

  const spinInterpolateA = Animated.add(
    spinA.interpolate({ inputRange: [0, 1], outputRange: [0, 360] }),
    scratchOffsetA
  ).interpolate({ inputRange: [-360, 0, 360], outputRange: ['-360deg', '0deg', '360deg'] });

  const spinInterpolateB = Animated.add(
    spinB.interpolate({ inputRange: [0, 1], outputRange: [0, 360] }),
    scratchOffsetB
  ).interpolate({ inputRange: [-360, 0, 360], outputRange: ['-360deg', '0deg', '360deg'] });

  // ---- Scratch Pan Responder ----
  const createScratchPan = (side: 'A' | 'B') => {
    const scratchOffset = side === 'A' ? scratchOffsetA : scratchOffsetB;
    const setScratch = side === 'A' ? setScratchingA : setScratchingB;
    const ref = side === 'A' ? soundRefA : soundRefB;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setScratch(true);
        hapticMed();
      },
      onPanResponderMove: (_, gesture) => {
        // Rotate vinyl based on dx
        const deg = gesture.dx * 0.5;
        scratchOffset.setValue(deg);

        // Seek audio
        const state = side === 'A' ? deckA : deckB;
        if (ref.current && state.duration > 0) {
          const seekDelta = (gesture.dx / width) * state.duration * 0.3;
          const newPos = Math.max(0, Math.min(state.duration, state.position + seekDelta));
          ref.current.setPositionAsync(newPos * 1000);
        }
      },
      onPanResponderRelease: () => {
        setScratch(false);
        Animated.spring(scratchOffset, { toValue: 0, useNativeDriver: true }).start();
      },
    });
  };

  const scratchPanA = useRef(createScratchPan('A')).current;
  const scratchPanB = useRef(createScratchPan('B')).current;

  // ---- Deck controls ----
  const loadToDeck = async (song: Song, deck: 'A' | 'B') => {
    const ref = deck === 'A' ? soundRefA : soundRefB;
    const setDeck = deck === 'A' ? setDeckA : setDeckB;

    if (ref.current) await ref.current.unloadAsync();

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: song.audioUrl },
      { shouldPlay: false, volume: deck === 'A' ? Math.max(0, 1 - crossfade) : Math.max(0, 1 + crossfade) },
      (status) => {
        if (status.isLoaded) {
          setDeck((prev) => ({
            ...prev,
            position: status.positionMillis / 1000,
            duration: (status.durationMillis || 0) / 1000,
            isPlaying: status.isPlaying,
          }));
        }
      }
    );

    ref.current = sound;
    setDeck((prev) => ({ ...prev, song, sound, isPlaying: false, position: 0, duration: song.duration, hotCues: [], eq: { ...defaultEQ } }));
  };

  const togglePlay = async (deck: 'A' | 'B') => {
    const ref = deck === 'A' ? soundRefA : soundRefB;
    const state = deck === 'A' ? deckA : deckB;
    const setDeck = deck === 'A' ? setDeckA : setDeckB;
    if (!ref.current) return;
    hapticMed();

    if (state.isPlaying) {
      await ref.current.pauseAsync();
      setDeck((prev) => ({ ...prev, isPlaying: false }));
    } else {
      await ref.current.playAsync();
      setDeck((prev) => ({ ...prev, isPlaying: true }));
    }
  };

  const changeSpeed = async (deck: 'A' | 'B', delta: number) => {
    const ref = deck === 'A' ? soundRefA : soundRefB;
    const state = deck === 'A' ? deckA : deckB;
    const setDeck = deck === 'A' ? setDeckA : setDeckB;
    const newSpeed = Math.max(0.5, Math.min(2.0, state.speed + delta));
    if (ref.current) await ref.current.setRateAsync(newSpeed, true);
    setDeck((prev) => ({ ...prev, speed: newSpeed }));
  };

  const pitchBend = async (deck: 'A' | 'B', direction: 1 | -1) => {
    const ref = deck === 'A' ? soundRefA : soundRefB;
    const state = deck === 'A' ? deckA : deckB;
    if (!ref.current) return;
    haptic();
    const bent = Math.max(0.5, Math.min(2.0, state.speed + direction * 0.08));
    await ref.current.setRateAsync(bent, true);
    // Reset after 300ms
    setTimeout(async () => {
      try { await ref.current?.setRateAsync(state.speed, true); } catch {}
    }, 300);
  };

  const changeVolume = (deck: 'A' | 'B', delta: number) => {
    const setDeck = deck === 'A' ? setDeckA : setDeckB;
    setDeck((prev) => ({ ...prev, volume: Math.max(0, Math.min(1, prev.volume + delta)) }));
  };

  const toggleLoop = async (deck: 'A' | 'B') => {
    const ref = deck === 'A' ? soundRefA : soundRefB;
    const state = deck === 'A' ? deckA : deckB;
    const setDeck = deck === 'A' ? setDeckA : setDeckB;
    const newLoop = !state.loop;
    if (ref.current) await ref.current.setIsLoopingAsync(newLoop);
    setDeck((prev) => ({ ...prev, loop: newLoop }));
    haptic();
  };

  const seekDeck = async (deck: 'A' | 'B', positionSec: number) => {
    const ref = deck === 'A' ? soundRefA : soundRefB;
    if (ref.current) await ref.current.setPositionAsync(positionSec * 1000);
  };

  // ---- Hot Cues ----
  const addHotCue = (deck: 'A' | 'B') => {
    const state = deck === 'A' ? deckA : deckB;
    const setDeck = deck === 'A' ? setDeckA : setDeckB;
    if (state.hotCues.length >= 8) return;
    hapticMed();
    const cue: HotCue = {
      id: Date.now(),
      position: state.position,
      color: HOT_CUE_COLORS[state.hotCues.length % HOT_CUE_COLORS.length],
      label: `${state.hotCues.length + 1}`,
    };
    setDeck((prev) => ({ ...prev, hotCues: [...prev.hotCues, cue] }));
  };

  const jumpToHotCue = async (deck: 'A' | 'B', cue: HotCue) => {
    haptic();
    await seekDeck(deck, cue.position);
  };

  const clearHotCues = (deck: 'A' | 'B') => {
    const setDeck = deck === 'A' ? setDeckA : setDeckB;
    setDeck((prev) => ({ ...prev, hotCues: [] }));
  };

  // ---- EQ ----
  const updateEQ = (deck: 'A' | 'B', band: keyof EQState, value: number) => {
    const setDeck = deck === 'A' ? setDeckA : setDeckB;
    setDeck((prev) => ({ ...prev, eq: { ...prev.eq, [band]: value } }));
    // Note: Expo AV doesn't support EQ natively. This is a visual control
    // that would integrate with a native audio processing module in production.
  };

  // ---- Song browser ----
  const openBrowser = (target: 'A' | 'B' | 'playlist') => {
    setBrowserTarget(target);
    setBrowserQuery('');
    setBrowserResults([]);
    setShowBrowser(true);
  };

  const handleBrowserSearch = async () => {
    if (!browserQuery.trim()) return;
    setBrowserLoading(true);
    const results = await searchSongs(browserQuery);
    setBrowserResults(results);
    setBrowserLoading(false);
  };

  const selectSong = async (song: Song) => {
    if (browserTarget === 'playlist') {
      setDjPlaylist((prev) => [...prev, song]);
    } else {
      await loadToDeck(song, browserTarget);
    }
    setShowBrowser(false);
  };

  // ---- Effects ----
  const toggleFX = (name: string) => {
    haptic();
    setActiveFX((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // ---- Helpers ----
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const estimatedBPM = (speed: number) => Math.round(128 * speed);

  // ============================================================
  // Render Deck
  // ============================================================
  const renderDeck = (deck: DeckState, side: 'A' | 'B') => {
    const accentColor = side === 'A' ? DECK_A_COLOR : DECK_B_COLOR;
    const spinInterp = side === 'A' ? spinInterpolateA : spinInterpolateB;
    const scratchPan = side === 'A' ? scratchPanA : scratchPanB;
    const progress = deck.duration > 0 ? deck.position / deck.duration : 0;

    return (
      <View style={[styles.deck, { borderColor: accentColor }]}>
        {/* Deck label */}
        <View style={[styles.deckLabel, { backgroundColor: accentColor }]}>
          <Text style={styles.deckLabelText}>DECK {side}</Text>
          <Text style={styles.deckBPM}>{estimatedBPM(deck.speed)} BPM</Text>
        </View>

        {/* Waveform */}
        <Waveform
          progress={progress}
          color={accentColor}
          hotCues={deck.hotCues}
          duration={deck.duration}
          isPlaying={deck.isPlaying}
        />

        {/* Vinyl / Album art — SCRATCH ENABLED */}
        <View {...scratchPan.panHandlers} style={styles.vinylContainer}>
          {deck.song ? (
            <View style={styles.vinylWrapper}>
              <Animated.Image
                source={{ uri: deck.song.coverArt }}
                style={[styles.vinyl, { transform: [{ rotate: spinInterp as any }] }]}
              />
              {/* Center spindle */}
              <View style={[styles.spindle, { borderColor: accentColor }]} />
              {/* Scratch overlay indicator */}
              {(side === 'A' ? scratchingA : scratchingB) && (
                <View style={[styles.scratchOverlay, { borderColor: accentColor }]}>
                  <Ionicons name="disc" size={20} color={accentColor} />
                  <Text style={[styles.scratchText, { color: accentColor }]}>SCRATCH</Text>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity onPress={() => openBrowser(side)} style={[styles.vinylEmpty, { borderColor: accentColor }]}>
              <Ionicons name="add" size={24} color={accentColor} />
              <Text style={[styles.loadText, { color: accentColor }]}>Load Track</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Song info */}
        {deck.song && (
          <>
            <Text style={styles.deckSongTitle} numberOfLines={1}>{deck.song.title}</Text>
            <Text style={styles.deckSongArtist} numberOfLines={1}>{deck.song.artist}</Text>
          </>
        )}

        {/* Time */}
        <View style={styles.timeRow}>
          <Text style={[styles.timeDisplay, { color: accentColor }]}>{formatTime(deck.position)}</Text>
          <Text style={styles.timeSep}>/</Text>
          <Text style={styles.timeDisplay}>{formatTime(deck.duration)}</Text>
        </View>

        {/* Transport */}
        <View style={styles.deckControls}>
          <TouchableOpacity onPress={() => seekDeck(side, 0)} style={styles.deckBtn}>
            <Ionicons name="play-skip-back" size={16} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => togglePlay(side)} style={[styles.deckPlayBtn, { backgroundColor: accentColor }]}>
            <Ionicons name={deck.isPlaying ? 'pause' : 'play'} size={22} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => toggleLoop(side)} style={styles.deckBtn}>
            <Ionicons name="repeat" size={16} color={deck.loop ? accentColor : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openBrowser(side)} style={styles.deckBtn}>
            <Ionicons name="folder-open" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Pitch Bend */}
        <View style={styles.pitchRow}>
          <TouchableOpacity
            onPressIn={() => pitchBend(side, -1)}
            style={[styles.pitchBtn, { borderColor: accentColor }]}
          >
            <Ionicons name="remove" size={14} color={accentColor} />
            <Text style={[styles.pitchLabel, { color: accentColor }]}>BEND</Text>
          </TouchableOpacity>

          {/* Speed */}
          <View style={styles.speedRow}>
            <TouchableOpacity onPress={() => changeSpeed(side, -0.05)} style={styles.miniBtn}>
              <Text style={styles.miniBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={[styles.speedDisplay, { color: accentColor }]}>{deck.speed.toFixed(2)}x</Text>
            <TouchableOpacity onPress={() => changeSpeed(side, 0.05)} style={styles.miniBtn}>
              <Text style={styles.miniBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPressIn={() => pitchBend(side, 1)}
            style={[styles.pitchBtn, { borderColor: accentColor }]}
          >
            <Ionicons name="add" size={14} color={accentColor} />
            <Text style={[styles.pitchLabel, { color: accentColor }]}>BEND</Text>
          </TouchableOpacity>
        </View>

        {/* Hot Cues */}
        <View style={styles.hotCueSection}>
          <View style={styles.hotCueHeader}>
            <Text style={styles.hotCueTitle}>HOT CUES</Text>
            <TouchableOpacity onPress={() => addHotCue(side)} style={[styles.hotCueAdd, { borderColor: accentColor }]}>
              <Ionicons name="add" size={12} color={accentColor} />
            </TouchableOpacity>
            {deck.hotCues.length > 0 && (
              <TouchableOpacity onPress={() => clearHotCues(side)}>
                <Ionicons name="trash-outline" size={12} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.hotCueRow}>
            {deck.hotCues.map((cue) => (
              <TouchableOpacity
                key={cue.id}
                onPress={() => jumpToHotCue(side, cue)}
                style={[styles.hotCueBtn, { backgroundColor: cue.color + '30', borderColor: cue.color }]}
              >
                <Text style={[styles.hotCueBtnText, { color: cue.color }]}>{cue.label}</Text>
              </TouchableOpacity>
            ))}
            {deck.hotCues.length === 0 && (
              <Text style={styles.hotCueEmpty}>Tap + to set cue point</Text>
            )}
          </View>
        </View>

        {/* EQ */}
        <View style={styles.eqSection}>
          <Text style={styles.eqTitle}>EQ</Text>
          <View style={styles.eqRow}>
            <EQKnob label="HI" value={deck.eq.high} color={accentColor} onChange={(v) => updateEQ(side, 'high', v)} />
            <EQKnob label="MID" value={deck.eq.mid} color={accentColor} onChange={(v) => updateEQ(side, 'mid', v)} />
            <EQKnob label="LO" value={deck.eq.low} color={accentColor} onChange={(v) => updateEQ(side, 'low', v)} />
          </View>
        </View>

        {/* Volume */}
        <View style={styles.volumeRow}>
          <Ionicons name="volume-low" size={12} color={colors.textSecondary} />
          <View style={styles.volumeTrack}>
            <View style={[styles.volumeFill, { width: `${deck.volume * 100}%`, backgroundColor: accentColor }]} />
          </View>
          <View style={styles.volBtns}>
            <TouchableOpacity onPress={() => changeVolume(side, -0.1)}>
              <Ionicons name="remove-circle-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeVolume(side, 0.1)}>
              <Ionicons name="add-circle-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // ============================================================
  // Main Layout
  // ============================================================
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0d0d1a', '#0a0a0a']} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Ionicons name="headset" size={18} color={ACCENT} />
            <Text style={styles.headerTitle}>DJ Mixer Pro</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => { setAutoDJ(!autoDJ); hapticMed(); }}
              style={[styles.autoDJBtn, autoDJ && styles.autoDJBtnActive]}
            >
              <Text style={[styles.autoDJText, autoDJ && styles.autoDJTextActive]}>AUTO</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openBrowser('playlist')}>
              <Ionicons name="add-circle-outline" size={22} color={ACCENT} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Dual Decks */}
          <View style={styles.decksRow}>
            {renderDeck(deckA, 'A')}
            {renderDeck(deckB, 'B')}
          </View>

          {/* Crossfader */}
          <View style={styles.crossfaderSection}>
            <View style={styles.cfHeaderRow}>
              <Text style={styles.crossfaderLabel}>CROSSFADER</Text>
              {autoDJ && <Text style={styles.autoDJIndicator}>● AUTO-DJ</Text>}
            </View>
            <View style={styles.crossfaderTrack}>
              <Text style={[styles.cfDeckLabel, { color: DECK_A_COLOR }]}>A</Text>
              <View style={styles.cfBar}>
                <View style={styles.cfBarBg}>
                  <LinearGradient
                    colors={[DECK_A_COLOR + '60', DECK_B_COLOR + '60']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.cfGradientTrack}
                  />
                  <View style={[styles.cfThumb, { left: `${((crossfade + 1) / 2) * 100}%` }]} />
                </View>
              </View>
              <Text style={[styles.cfDeckLabel, { color: DECK_B_COLOR }]}>B</Text>
            </View>
            <View style={styles.cfButtons}>
              <TouchableOpacity onPress={() => { setCrossfade(Math.max(-1, crossfade - 0.2)); haptic(); }} style={[styles.cfBtn, { borderColor: DECK_A_COLOR }]}>
                <Ionicons name="arrow-back" size={14} color={DECK_A_COLOR} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setCrossfade(0); haptic(); }} style={styles.cfCenterBtn}>
                <Text style={styles.cfCenterText}>CENTER</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setCrossfade(Math.min(1, crossfade + 0.2)); haptic(); }} style={[styles.cfBtn, { borderColor: DECK_B_COLOR }]}>
                <Ionicons name="arrow-forward" size={14} color={DECK_B_COLOR} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Effects Rack */}
          <View style={styles.effectsSection}>
            <Text style={styles.sectionLabel}>EFFECTS RACK</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.effectsScroll}>
              {[
                { name: 'Sync BPM', icon: 'sync' as const, action: async () => {
                  hapticMed();
                  const avg = (deckA.speed + deckB.speed) / 2;
                  await soundRefA.current?.setRateAsync(avg, true);
                  await soundRefB.current?.setRateAsync(avg, true);
                  setDeckA((p) => ({ ...p, speed: avg }));
                  setDeckB((p) => ({ ...p, speed: avg }));
                }},
                { name: 'Echo', icon: 'pulse' as const, action: () => toggleFX('echo') },
                { name: 'Filter', icon: 'funnel' as const, action: () => toggleFX('filter') },
                { name: 'Reverb', icon: 'water' as const, action: () => toggleFX('reverb') },
                { name: 'Flanger', icon: 'flash' as const, action: () => toggleFX('flanger') },
                { name: 'Brake', icon: 'hand-left' as const, action: async () => {
                  hapticMed();
                  // Simulate brake: slow down then stop
                  const ref = soundRefA.current || soundRefB.current;
                  const setDeck = soundRefA.current ? setDeckA : setDeckB;
                  if (ref) {
                    for (let s = 1.0; s > 0.3; s -= 0.1) {
                      await ref.setRateAsync(s, true);
                      await new Promise((r) => setTimeout(r, 80));
                    }
                    await ref.pauseAsync();
                    await ref.setRateAsync(1.0, true);
                    setDeck((p) => ({ ...p, isPlaying: false, speed: 1.0 }));
                  }
                }},
                { name: 'Fade A→B', icon: 'arrow-forward-circle' as const, action: () => { haptic(); setCrossfade(1); }},
                { name: 'Fade B→A', icon: 'arrow-back-circle' as const, action: () => { haptic(); setCrossfade(-1); }},
                { name: 'Both Play', icon: 'play-circle' as const, action: async () => {
                  hapticMed();
                  if (soundRefA.current) { await soundRefA.current.playAsync(); setDeckA((p) => ({ ...p, isPlaying: true })); }
                  if (soundRefB.current) { await soundRefB.current.playAsync(); setDeckB((p) => ({ ...p, isPlaying: true })); }
                }},
                { name: 'Both Stop', icon: 'stop-circle' as const, action: async () => {
                  hapticMed();
                  if (soundRefA.current) { await soundRefA.current.pauseAsync(); setDeckA((p) => ({ ...p, isPlaying: false })); }
                  if (soundRefB.current) { await soundRefB.current.pauseAsync(); setDeckB((p) => ({ ...p, isPlaying: false })); }
                }},
              ].map((fx) => (
                <TouchableOpacity
                  key={fx.name}
                  style={[styles.fxButton, activeFX[fx.name.toLowerCase()] && styles.fxButtonActive]}
                  onPress={fx.action}
                >
                  <Ionicons name={fx.icon} size={20} color={activeFX[fx.name.toLowerCase()] ? '#000' : ACCENT} />
                  <Text style={[styles.fxText, activeFX[fx.name.toLowerCase()] && styles.fxTextActive]}>{fx.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* DJ Playlist */}
          <View style={styles.playlistSection}>
            <View style={styles.playlistHeader}>
              <Ionicons name="list" size={16} color={ACCENT} />
              <Text style={styles.playlistTitle}>DJ PLAYLIST</Text>
              <TouchableOpacity onPress={() => openBrowser('playlist')} style={styles.addToPlaylistBtn}>
                <Ionicons name="add" size={18} color="#000" />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {djPlaylist.length === 0 ? (
              <View style={styles.emptyPlaylist}>
                <Ionicons name="musical-notes-outline" size={36} color={colors.textSecondary} />
                <Text style={styles.emptyPlaylistText}>Build your DJ set</Text>
                <TouchableOpacity onPress={() => openBrowser('playlist')} style={styles.browseBtn}>
                  <Text style={styles.browseBtnText}>Browse Songs</Text>
                </TouchableOpacity>
              </View>
            ) : (
              djPlaylist.map((song, index) => (
                <View key={`${song.id}-${index}`} style={styles.playlistItem}>
                  <Text style={styles.playlistIdx}>{index + 1}</Text>
                  <Image source={{ uri: song.coverArt }} style={styles.playlistThumb} />
                  <View style={styles.playlistInfo}>
                    <Text style={styles.playlistSongTitle} numberOfLines={1}>{song.title}</Text>
                    <Text style={styles.playlistSongArtist} numberOfLines={1}>{song.artist}</Text>
                  </View>
                  <TouchableOpacity onPress={() => loadToDeck(song, 'A')} style={[styles.loadDeckBtn, { borderColor: DECK_A_COLOR }]}>
                    <Text style={[styles.loadDeckText, { color: DECK_A_COLOR }]}>A</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => loadToDeck(song, 'B')} style={[styles.loadDeckBtn, { borderColor: DECK_B_COLOR }]}>
                    <Text style={[styles.loadDeckText, { color: DECK_B_COLOR }]}>B</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setDjPlaylist((prev) => prev.filter((_, i) => i !== index))}>
                    <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </LinearGradient>

      {/* Song Browser Modal */}
      <Modal visible={showBrowser} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {browserTarget === 'playlist' ? 'Add to Playlist' : `Load to Deck ${browserTarget}`}
              </Text>
              <TouchableOpacity onPress={() => setShowBrowser(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearch}>
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search songs..."
                placeholderTextColor={colors.textSecondary}
                value={browserQuery}
                onChangeText={setBrowserQuery}
                onSubmitEditing={handleBrowserSearch}
                returnKeyType="search"
              />
              <TouchableOpacity onPress={handleBrowserSearch} style={styles.modalSearchBtn}>
                <Text style={styles.modalSearchBtnText}>Go</Text>
              </TouchableOpacity>
            </View>
            {browserLoading ? (
              <View style={styles.modalLoading}>
                <Text style={styles.modalLoadingText}>Searching...</Text>
              </View>
            ) : (
              <FlatList
                data={browserResults}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.browserItem} onPress={() => selectSong(item)}>
                    <Image source={{ uri: item.coverArt }} style={styles.browserThumb} />
                    <View style={styles.browserInfo}>
                      <Text style={styles.browserTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.browserArtist} numberOfLines={1}>{item.artist}</Text>
                    </View>
                    <Ionicons name="add-circle" size={24} color={ACCENT} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.modalEmpty}>
                    <Text style={styles.modalEmptyText}>Search for songs to add</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ============================================================
// Styles
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: spacing.md, paddingBottom: spacing.xs,
  },
  backBtn: { padding: 4 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { ...typography.h3, color: colors.text, fontSize: 18 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  autoDJBtn: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    borderWidth: 1, borderColor: ACCENT,
  },
  autoDJBtnActive: { backgroundColor: ACCENT },
  autoDJText: { fontSize: 10, fontWeight: '800', color: ACCENT, letterSpacing: 1 },
  autoDJTextActive: { color: '#000' },

  scrollContent: { paddingHorizontal: 6 },

  // Decks
  decksRow: { flexDirection: 'row', gap: 6 },
  deck: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14,
    borderWidth: 1, padding: 8, alignItems: 'center',
  },
  deckLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginBottom: 4,
  },
  deckLabelText: { color: '#000', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  deckBPM: { color: '#000', fontSize: 9, fontWeight: '700' },

  vinylContainer: {
    width: VINYL_SIZE, height: VINYL_SIZE,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  vinylWrapper: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  vinyl: {
    width: '100%', height: '100%', borderRadius: 999,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.15)',
  },
  spindle: {
    position: 'absolute', width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#111', borderWidth: 2,
  },
  scratchOverlay: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
    width: '100%', height: '100%', borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 2,
  },
  scratchText: { fontSize: 8, fontWeight: '800', letterSpacing: 2, marginTop: 2 },
  vinylEmpty: {
    width: '100%', height: '100%', borderRadius: 999,
    borderWidth: 2, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  loadText: { fontSize: 9, marginTop: 3, fontWeight: '600' },
  deckSongTitle: { color: colors.text, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  deckSongArtist: { color: colors.textSecondary, fontSize: 9, textAlign: 'center', marginBottom: 2 },

  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 2 },
  timeDisplay: { color: colors.text, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  timeSep: { color: colors.textSecondary, fontSize: 11 },

  deckControls: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  deckBtn: { padding: 4 },
  deckPlayBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },

  // Pitch Bend
  pitchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, width: '100%', justifyContent: 'center' },
  pitchBtn: {
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36, borderRadius: 8, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  pitchLabel: { fontSize: 6, fontWeight: '800', letterSpacing: 0.5 },
  speedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniBtn: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  miniBtnText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  speedDisplay: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'], minWidth: 40, textAlign: 'center' },

  // Hot Cues
  hotCueSection: { width: '100%', marginBottom: 4 },
  hotCueHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  hotCueTitle: { fontSize: 8, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1, flex: 1 },
  hotCueAdd: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hotCueRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  hotCueBtn: {
    width: 24, height: 24, borderRadius: 4, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  hotCueBtnText: { fontSize: 10, fontWeight: '800' },
  hotCueEmpty: { fontSize: 8, color: colors.textSecondary, fontStyle: 'italic' },

  // EQ
  eqSection: { width: '100%', marginBottom: 4 },
  eqTitle: { fontSize: 8, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1, marginBottom: 2, textAlign: 'center' },
  eqRow: { flexDirection: 'row', justifyContent: 'space-around' },

  // Volume
  volumeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, width: '100%' },
  volumeTrack: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' },
  volumeFill: { height: '100%', borderRadius: 2 },
  volBtns: { flexDirection: 'row', gap: 2 },

  // Crossfader
  crossfaderSection: {
    marginTop: spacing.sm, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, padding: spacing.sm, alignItems: 'center',
  },
  cfHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  crossfaderLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  autoDJIndicator: { color: '#00E676', fontSize: 9, fontWeight: '700' },
  crossfaderTrack: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 8 },
  cfDeckLabel: { fontSize: 14, fontWeight: '800' },
  cfBar: { flex: 1, height: 24 },
  cfBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, marginTop: 9, position: 'relative', overflow: 'hidden' },
  cfGradientTrack: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 3 },
  cfThumb: {
    position: 'absolute', width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#fff', top: -8, marginLeft: -11,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 4,
  },
  cfButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cfBtn: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  cfCenterBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 6 },
  cfCenterText: { color: colors.text, fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  // Effects
  effectsSection: { marginTop: spacing.sm },
  sectionLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 8, paddingHorizontal: spacing.xs },
  effectsScroll: { gap: 6, paddingHorizontal: spacing.xs },
  fxButton: {
    backgroundColor: 'rgba(0,229,255,0.06)', borderWidth: 1, borderColor: 'rgba(0,229,255,0.15)',
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', minWidth: 72,
  },
  fxButtonActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  fxText: { color: ACCENT, fontSize: 9, fontWeight: '600', marginTop: 3 },
  fxTextActive: { color: '#000' },

  // Playlist
  playlistSection: { marginTop: spacing.md, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: spacing.sm },
  playlistHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  playlistTitle: { flex: 1, color: colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  addToPlaylistBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: ACCENT, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
  },
  addBtnText: { color: '#000', fontSize: 11, fontWeight: '700' },
  emptyPlaylist: { alignItems: 'center', paddingVertical: spacing.lg },
  emptyPlaylistText: { color: colors.textSecondary, fontSize: 13, marginTop: spacing.sm, marginBottom: spacing.md },
  browseBtn: { backgroundColor: ACCENT, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18 },
  browseBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  playlistItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 6 },
  playlistIdx: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', width: 16, textAlign: 'center' },
  playlistThumb: { width: 36, height: 36, borderRadius: 5 },
  playlistInfo: { flex: 1 },
  playlistSongTitle: { color: colors.text, fontSize: 12, fontWeight: '600' },
  playlistSongArtist: { color: colors.textSecondary, fontSize: 10 },
  loadDeckBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  loadDeckText: { fontSize: 11, fontWeight: '800' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  modalSearch: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', margin: spacing.md, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  modalSearchInput: { flex: 1, color: colors.text, fontSize: 15 },
  modalSearchBtn: { backgroundColor: ACCENT, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  modalSearchBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  modalLoading: { padding: spacing.xl, alignItems: 'center' },
  modalLoadingText: { color: colors.textSecondary, fontSize: 14 },
  modalEmpty: { padding: spacing.xl, alignItems: 'center' },
  modalEmptyText: { color: colors.textSecondary, fontSize: 14 },
  browserItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: spacing.md, gap: 12 },
  browserThumb: { width: 48, height: 48, borderRadius: 8 },
  browserInfo: { flex: 1 },
  browserTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  browserArtist: { color: colors.textSecondary, fontSize: 12 },
});
