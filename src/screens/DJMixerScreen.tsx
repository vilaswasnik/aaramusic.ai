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
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { colors, spacing, typography, borderRadius } from '../constants/theme';
import { searchSongs } from '../services/musicService';
import { Song } from '../types';

const { width } = Dimensions.get('window');
const ACCENT = '#00E5FF';
const DECK_A_COLOR = '#FF1744';
const DECK_B_COLOR = '#00E5FF';

interface DeckState {
  song: Song | null;
  sound: Audio.Sound | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  speed: number;  // playback rate (0.5 - 2.0)
  loop: boolean;
}

const defaultDeck: DeckState = {
  song: null,
  sound: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  volume: 1,
  speed: 1,
  loop: false,
};

export const DJMixerScreen: React.FC = () => {
  const navigation = useNavigation();

  // Dual decks
  const [deckA, setDeckA] = useState<DeckState>({ ...defaultDeck });
  const [deckB, setDeckB] = useState<DeckState>({ ...defaultDeck });
  const soundRefA = useRef<Audio.Sound | null>(null);
  const soundRefB = useRef<Audio.Sound | null>(null);

  // Crossfader: -1 = full A, 0 = center, 1 = full B
  const [crossfade, setCrossfade] = useState(0);

  // DJ Playlist
  const [djPlaylist, setDjPlaylist] = useState<Song[]>([]);
  const [playlistName, setPlaylistName] = useState('My DJ Mix');

  // Song browser modal
  const [showBrowser, setShowBrowser] = useState(false);
  const [browserTarget, setBrowserTarget] = useState<'A' | 'B' | 'playlist'>('A');
  const [browserQuery, setBrowserQuery] = useState('');
  const [browserResults, setBrowserResults] = useState<Song[]>([]);
  const [browserLoading, setBrowserLoading] = useState(false);

  // Vinyl spin animation
  const spinA = useRef(new Animated.Value(0)).current;
  const spinB = useRef(new Animated.Value(0)).current;
  const spinAnimA = useRef<Animated.CompositeAnimation | null>(null);
  const spinAnimB = useRef<Animated.CompositeAnimation | null>(null);

  // Cleanup sounds on unmount
  useEffect(() => {
    return () => {
      soundRefA.current?.unloadAsync();
      soundRefB.current?.unloadAsync();
    };
  }, []);

  // Apply crossfade volumes
  useEffect(() => {
    const volA = deckA.volume * Math.max(0, 1 - crossfade);
    const volB = deckB.volume * Math.max(0, 1 + crossfade);
    soundRefA.current?.setVolumeAsync(Math.min(1, volA));
    soundRefB.current?.setVolumeAsync(Math.min(1, volB));
  }, [crossfade, deckA.volume, deckB.volume]);

  // Vinyl spin effect
  useEffect(() => {
    if (deckA.isPlaying) {
      spinAnimA.current = Animated.loop(
        Animated.timing(spinA, { toValue: 1, duration: 2000 / deckA.speed, useNativeDriver: true })
      );
      spinAnimA.current.start();
    } else {
      spinAnimA.current?.stop();
    }
  }, [deckA.isPlaying, deckA.speed]);

  useEffect(() => {
    if (deckB.isPlaying) {
      spinAnimB.current = Animated.loop(
        Animated.timing(spinB, { toValue: 1, duration: 2000 / deckB.speed, useNativeDriver: true })
      );
      spinAnimB.current.start();
    } else {
      spinAnimB.current?.stop();
    }
  }, [deckB.isPlaying, deckB.speed]);

  const spinInterpolateA = spinA.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const spinInterpolateB = spinB.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // ---- Deck controls ----
  const loadToDeck = async (song: Song, deck: 'A' | 'B') => {
    const ref = deck === 'A' ? soundRefA : soundRefB;
    const setDeck = deck === 'A' ? setDeckA : setDeckB;

    // Unload previous
    if (ref.current) {
      await ref.current.unloadAsync();
    }

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
    setDeck((prev) => ({ ...prev, song, sound, isPlaying: false, position: 0, duration: song.duration }));
  };

  const togglePlay = async (deck: 'A' | 'B') => {
    const ref = deck === 'A' ? soundRefA : soundRefB;
    const state = deck === 'A' ? deckA : deckB;
    const setDeck = deck === 'A' ? setDeckA : setDeckB;

    if (!ref.current) return;

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
    if (ref.current) {
      await ref.current.setRateAsync(newSpeed, true);
    }
    setDeck((prev) => ({ ...prev, speed: newSpeed }));
  };

  const changeVolume = (deck: 'A' | 'B', delta: number) => {
    const setDeck = deck === 'A' ? setDeckA : setDeckB;
    setDeck((prev) => ({
      ...prev,
      volume: Math.max(0, Math.min(1, prev.volume + delta)),
    }));
  };

  const toggleLoop = async (deck: 'A' | 'B') => {
    const ref = deck === 'A' ? soundRefA : soundRefB;
    const state = deck === 'A' ? deckA : deckB;
    const setDeck = deck === 'A' ? setDeckA : setDeckB;

    const newLoop = !state.loop;
    if (ref.current) {
      await ref.current.setIsLoopingAsync(newLoop);
    }
    setDeck((prev) => ({ ...prev, loop: newLoop }));
  };

  const seekDeck = async (deck: 'A' | 'B', positionSec: number) => {
    const ref = deck === 'A' ? soundRefA : soundRefB;
    if (ref.current) {
      await ref.current.setPositionAsync(positionSec * 1000);
    }
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

  // ---- Playlist helpers ----
  const removeSongFromPlaylist = (index: number) => {
    setDjPlaylist((prev) => prev.filter((_, i) => i !== index));
  };

  const loadFromPlaylist = async (song: Song, deck: 'A' | 'B') => {
    await loadToDeck(song, deck);
  };

  // ---- Helpers ----
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const estimatedBPM = (speed: number) => Math.round(128 * speed);

  // ---- Render ----
  const renderDeck = (deck: DeckState, side: 'A' | 'B') => {
    const accentColor = side === 'A' ? DECK_A_COLOR : DECK_B_COLOR;
    const spinInterp = side === 'A' ? spinInterpolateA : spinInterpolateB;

    return (
      <View style={[styles.deck, { borderColor: accentColor }]}>
        {/* Deck label */}
        <View style={[styles.deckLabel, { backgroundColor: accentColor }]}>
          <Text style={styles.deckLabelText}>DECK {side}</Text>
        </View>

        {/* Vinyl / Album art */}
        <TouchableOpacity onPress={() => openBrowser(side)} style={styles.vinylContainer}>
          {deck.song ? (
            <Animated.Image
              source={{ uri: deck.song.coverArt }}
              style={[styles.vinyl, { transform: [{ rotate: spinInterp }] }]}
            />
          ) : (
            <View style={[styles.vinylEmpty, { borderColor: accentColor }]}>
              <Ionicons name="add" size={28} color={accentColor} />
              <Text style={[styles.loadText, { color: accentColor }]}>Load Track</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Song info */}
        {deck.song && (
          <Text style={styles.deckSongTitle} numberOfLines={1}>{deck.song.title}</Text>
        )}
        {deck.song && (
          <Text style={styles.deckSongArtist} numberOfLines={1}>{deck.song.artist}</Text>
        )}

        {/* Time display */}
        <View style={styles.timeRow}>
          <Text style={[styles.timeDisplay, { color: accentColor }]}>{formatTime(deck.position)}</Text>
          <Text style={styles.timeSep}>/</Text>
          <Text style={styles.timeDisplay}>{formatTime(deck.duration)}</Text>
        </View>

        {/* Progress bar */}
        {deck.song && (
          <View style={styles.deckProgress}>
            <View style={[styles.deckProgressFill, { width: `${deck.duration ? (deck.position / deck.duration) * 100 : 0}%`, backgroundColor: accentColor }]} />
          </View>
        )}

        {/* Transport controls */}
        <View style={styles.deckControls}>
          <TouchableOpacity onPress={() => seekDeck(side, 0)} style={styles.deckBtn}>
            <Ionicons name="play-skip-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => togglePlay(side)} style={[styles.deckPlayBtn, { backgroundColor: accentColor }]}>
            <Ionicons name={deck.isPlaying ? 'pause' : 'play'} size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => toggleLoop(side)} style={styles.deckBtn}>
            <Ionicons name="repeat" size={18} color={deck.loop ? accentColor : colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* BPM & Speed */}
        <View style={styles.bpmRow}>
          <TouchableOpacity onPress={() => changeSpeed(side, -0.05)} style={styles.smallBtn}>
            <Text style={styles.smallBtnText}>-</Text>
          </TouchableOpacity>
          <View style={styles.bpmDisplay}>
            <Text style={[styles.bpmValue, { color: accentColor }]}>{estimatedBPM(deck.speed)}</Text>
            <Text style={styles.bpmLabel}>BPM</Text>
          </View>
          <TouchableOpacity onPress={() => changeSpeed(side, 0.05)} style={styles.smallBtn}>
            <Text style={styles.smallBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Volume */}
        <View style={styles.volumeRow}>
          <Ionicons name="volume-low" size={14} color={colors.textSecondary} />
          <View style={styles.volumeTrack}>
            <View style={[styles.volumeFill, { width: `${deck.volume * 100}%`, backgroundColor: accentColor }]} />
          </View>
          <View style={styles.volBtns}>
            <TouchableOpacity onPress={() => changeVolume(side, -0.1)}>
              <Ionicons name="remove-circle-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeVolume(side, 0.1)}>
              <Ionicons name="add-circle-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a2e', '#0a0a0a']} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Ionicons name="headset" size={20} color={ACCENT} />
            <Text style={styles.headerTitle}>DJ Mixer</Text>
          </View>
          <TouchableOpacity onPress={() => openBrowser('playlist')}>
            <Ionicons name="add-circle-outline" size={24} color={ACCENT} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Dual Decks */}
          <View style={styles.decksRow}>
            {renderDeck(deckA, 'A')}
            {renderDeck(deckB, 'B')}
          </View>

          {/* Crossfader */}
          <View style={styles.crossfaderSection}>
            <Text style={styles.crossfaderLabel}>CROSSFADER</Text>
            <View style={styles.crossfaderTrack}>
              <Text style={[styles.cfDeckLabel, { color: DECK_A_COLOR }]}>A</Text>
              <View style={styles.cfBar}>
                <View style={styles.cfBarBg}>
                  <View style={[styles.cfThumb, { left: `${((crossfade + 1) / 2) * 100}%` }]} />
                </View>
              </View>
              <Text style={[styles.cfDeckLabel, { color: DECK_B_COLOR }]}>B</Text>
            </View>
            <View style={styles.cfButtons}>
              <TouchableOpacity
                onPress={() => setCrossfade(Math.max(-1, crossfade - 0.2))}
                style={[styles.cfBtn, { borderColor: DECK_A_COLOR }]}
              >
                <Ionicons name="arrow-back" size={16} color={DECK_A_COLOR} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCrossfade(0)} style={styles.cfCenterBtn}>
                <Text style={styles.cfCenterText}>CENTER</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setCrossfade(Math.min(1, crossfade + 0.2))}
                style={[styles.cfBtn, { borderColor: DECK_B_COLOR }]}
              >
                <Ionicons name="arrow-forward" size={16} color={DECK_B_COLOR} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Effects */}
          <View style={styles.effectsSection}>
            <Text style={styles.sectionLabel}>QUICK EFFECTS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.effectsScroll}>
              {[
                { name: 'Sync BPM', icon: 'sync' as const, action: async () => {
                  const avg = (deckA.speed + deckB.speed) / 2;
                  await soundRefA.current?.setRateAsync(avg, true);
                  await soundRefB.current?.setRateAsync(avg, true);
                  setDeckA((p) => ({ ...p, speed: avg }));
                  setDeckB((p) => ({ ...p, speed: avg }));
                }},
                { name: 'Fade to A', icon: 'arrow-back-circle' as const, action: () => setCrossfade(-1) },
                { name: 'Fade to B', icon: 'arrow-forward-circle' as const, action: () => setCrossfade(1) },
                { name: 'Both Play', icon: 'play-circle' as const, action: async () => {
                  if (soundRefA.current) { await soundRefA.current.playAsync(); setDeckA((p) => ({ ...p, isPlaying: true })); }
                  if (soundRefB.current) { await soundRefB.current.playAsync(); setDeckB((p) => ({ ...p, isPlaying: true })); }
                }},
                { name: 'Both Stop', icon: 'stop-circle' as const, action: async () => {
                  if (soundRefA.current) { await soundRefA.current.pauseAsync(); setDeckA((p) => ({ ...p, isPlaying: false })); }
                  if (soundRefB.current) { await soundRefB.current.pauseAsync(); setDeckB((p) => ({ ...p, isPlaying: false })); }
                }},
                { name: 'Speed +', icon: 'speedometer' as const, action: async () => {
                  await changeSpeed('A', 0.1);
                  await changeSpeed('B', 0.1);
                }},
              ].map((fx) => (
                <TouchableOpacity key={fx.name} style={styles.fxButton} onPress={fx.action}>
                  <Ionicons name={fx.icon} size={22} color={ACCENT} />
                  <Text style={styles.fxText}>{fx.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* DJ Playlist */}
          <View style={styles.playlistSection}>
            <View style={styles.playlistHeader}>
              <Ionicons name="list" size={18} color={ACCENT} />
              <TextInput
                style={styles.playlistNameInput}
                value={playlistName}
                onChangeText={setPlaylistName}
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity onPress={() => openBrowser('playlist')} style={styles.addToPlaylistBtn}>
                <Ionicons name="add" size={20} color="#000" />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {djPlaylist.length === 0 ? (
              <View style={styles.emptyPlaylist}>
                <Ionicons name="musical-notes-outline" size={40} color={colors.textSecondary} />
                <Text style={styles.emptyPlaylistText}>Add songs to build your DJ mix</Text>
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
                  <TouchableOpacity onPress={() => loadFromPlaylist(song, 'A')} style={[styles.loadDeckBtn, { borderColor: DECK_A_COLOR }]}>
                    <Text style={[styles.loadDeckText, { color: DECK_A_COLOR }]}>A</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => loadFromPlaylist(song, 'B')} style={[styles.loadDeckBtn, { borderColor: DECK_B_COLOR }]}>
                    <Text style={[styles.loadDeckText, { color: DECK_B_COLOR }]}>B</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeSongFromPlaylist(index)}>
                    <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 120 }} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    padding: 4,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  scrollContent: {
    paddingHorizontal: spacing.sm,
  },

  // === DECKS ===
  decksRow: {
    flexDirection: 'row',
    gap: 8,
  },
  deck: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
  },
  deckLabel: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 8,
  },
  deckLabelText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  vinylContainer: {
    width: (width - 56) / 2 - 20,
    height: (width - 56) / 2 - 20,
    maxWidth: 140,
    maxHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  vinyl: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  vinylEmpty: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  loadText: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  deckSongTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  deckSongArtist: {
    color: colors.textSecondary,
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  timeDisplay: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timeSep: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  deckProgress: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  deckProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  deckControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  deckBtn: {
    padding: 6,
  },
  deckPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // BPM
  bpmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  smallBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  bpmDisplay: {
    alignItems: 'center',
  },
  bpmValue: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  bpmLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 1,
  },

  // Volume
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  volumeTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  volumeFill: {
    height: '100%',
    borderRadius: 2,
  },
  volBtns: {
    flexDirection: 'row',
    gap: 2,
  },

  // === CROSSFADER ===
  crossfaderSection: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
  },
  crossfaderLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 10,
  },
  crossfaderTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 10,
  },
  cfDeckLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  cfBar: {
    flex: 1,
    height: 24,
  },
  cfBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    marginTop: 9,
    position: 'relative',
  },
  cfThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    top: -9,
    marginLeft: -12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  cfButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cfBtn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cfCenterBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  cfCenterText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // === EFFECTS ===
  effectsSection: {
    marginTop: spacing.md,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 10,
    paddingHorizontal: spacing.sm,
  },
  effectsScroll: {
    gap: 8,
    paddingHorizontal: spacing.sm,
  },
  fxButton: {
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    minWidth: 80,
  },
  fxText: {
    color: ACCENT,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },

  // === DJ PLAYLIST ===
  playlistSection: {
    marginTop: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: spacing.md,
  },
  playlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  playlistNameInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 4,
  },
  addToPlaylistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyPlaylist: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyPlaylistText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  browseBtn: {
    backgroundColor: ACCENT,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  browseBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  playlistIdx: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    width: 18,
    textAlign: 'center',
  },
  playlistThumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistSongTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  playlistSongArtist: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  loadDeckBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadDeckText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // === MODAL ===
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    margin: spacing.md,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  modalSearchBtn: {
    backgroundColor: ACCENT,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  modalSearchBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 13,
  },
  modalLoading: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  modalLoadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  modalEmpty: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  modalEmptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  browserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  browserThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  browserInfo: {
    flex: 1,
  },
  browserTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  browserArtist: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
