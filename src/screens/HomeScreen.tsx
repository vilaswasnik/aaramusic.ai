import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SongCard } from '../components/SongCard';
import { HomeScreenSkeleton } from '../components/SkeletonLoader';
import { FadeInView } from '../components/FadeInView';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { ApiFallbackBanner } from '../components/ApiFallbackBanner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, typography, borderRadius } from '../constants/theme';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import {
  fetchTopSongs,
  fetchCuratedPlaylists,
  searchSongs,
  resetFallbackDataFlag,
  isUsingFallbackData,
  fetchBollywoodTopSongs,
  fetchHollywoodTopSongs,
  fetchSouthIndianTopSongs,
} from '../services/musicService';
import {
  getSmartRecommendations,
  getMoods,
  fetchMoodSongs,
  parseIntent,
  fetchSimilarSongs,
  generateDailyMixes,
  Mood,
  DailyMix,
} from '../services/aiService';
import { Song } from '../types';
import { isVoiceSupported, startListening, stopListening, parseVoiceCommand } from '../services/voiceService';

const { width } = Dimensions.get('window');

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user, signOut, changePassword } = useAuth();

  // Profile modal state
  const [showProfile, setShowProfile] = useState(false);
  const [profileTab, setProfileTab] = useState<'details' | 'password' | 'recovery'>('details');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleChangePassword = async () => {
    setPwError('');
    setPwSuccess('');
    if (!oldPassword) { setPwError('Enter your current password.'); return; }
    if (newPassword.length < 6) { setPwError('New password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setPwError('New passwords do not match.'); return; }
    setPwLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      setPwSuccess('Password changed successfully!');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (e: any) {
      setPwError(e.message || 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Sign out of Aara Music?')) { setShowProfile(false); signOut(); }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => { setShowProfile(false); signOut(); } },
      ]);
    }
  };

  const { playSong, playerState, listeningHistory, likedSongs, pause, resume, next, previous, toggleShuffle, toggleRepeat } = useMusicPlayer();
  const [topSongs, setTopSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<{ name: string; description: string; songs: Song[] }[]>([]);
  const [aiRecs, setAiRecs] = useState<{ title: string; songs: Song[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFallbackBanner, setShowFallbackBanner] = useState(false);

  // Genre songs state
  const [bollywoodSongs, setBollywoodSongs] = useState<Song[]>([]);
  const [hollywoodSongs, setHollywoodSongs] = useState<Song[]>([]);
  const [southIndianSongs, setSouthIndianSongs] = useState<Song[]>([]);
  const [marathiSongs, setMarathiSongs] = useState<Song[]>([]);
  const [activeGenreTab, setActiveGenreTab] = useState<'bollywood' | 'hollywood' | 'south' | 'marathi'>('bollywood');

  // AI Chat state
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ message: string; songs: Song[] } | null>(null);

  // Voice state
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const voiceSupported = isVoiceSupported();

  // Mood state
  const [activeMood, setActiveMood] = useState<Mood | null>(null);
  const [moodSongs, setMoodSongs] = useState<Song[]>([]);
  const [moodLoading, setMoodLoading] = useState(false);

  // Daily mixes
  const [dailyMixes, setDailyMixes] = useState<DailyMix[]>([]);
  const [mixesLoading, setMixesLoading] = useState(false);

  const moods = getMoods();

  const loadData = async () => {
    resetFallbackDataFlag();
    try {
      const [songs, curatedPlaylists, bollywood, hollywood, southIndian, marathi] = await Promise.all([
        fetchTopSongs(50),
        fetchCuratedPlaylists(),
        fetchBollywoodTopSongs(10),
        fetchHollywoodTopSongs(10),
        fetchSouthIndianTopSongs(10),
        searchSongs('marathi songs hits').then(results => results.slice(0, 10)),
      ]);
      console.log('Genre songs loaded:', {
        bollywood: bollywood.length,
        hollywood: hollywood.length, 
        southIndian: southIndian.length,
        marathi: marathi.length
      });
      setTopSongs(songs);
      setPlaylists(curatedPlaylists);
      setBollywoodSongs(bollywood);
      setHollywoodSongs(hollywood);
      setSouthIndianSongs(southIndian);
      setMarathiSongs(marathi);
      // Only show banner when primary top-songs are mock/fallback data
      // (mock songs use soundhelix URLs; real Deezer songs use CDN URLs)
      const primaryFailed = songs.length === 0 || songs.some(s => s.audioUrl.includes('soundhelix'));
      setShowFallbackBanner(primaryFailed);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!loading) {
      getSmartRecommendations(listeningHistory).then(setAiRecs);
      loadDailyMixes();
    }
  }, [loading, listeningHistory]);

  const loadDailyMixes = async () => {
    setMixesLoading(true);
    const history = listeningHistory.length > 0 ? listeningHistory : (playerState.queue || []);
    const mixes = await generateDailyMixes(history);
    setDailyMixes(mixes);
    setMixesLoading(false);
  };

  const handleAiSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText || aiQuery).trim();
    if (!text || aiLoading) return;
    setAiQuery('');
    setAiLoading(true);
    setAiResult(null);

    try {
      const intent = parseIntent(text);
      let songs: Song[] = [];

      switch (intent.type) {
        case 'mood':
          if (intent.mood) songs = await fetchMoodSongs(intent.mood);
          break;
        case 'search':
          if (intent.query === '__trending__') {
            songs = await fetchTopSongs(25);
          } else if (intent.query) {
            songs = await searchSongs(intent.query);
          }
          break;
        case 'radio':
          if (intent.query) {
            const searchResults = await searchSongs(intent.query);
            if (searchResults.length > 0) {
              songs = await fetchSimilarSongs(searchResults[0]);
              songs = [searchResults[0], ...songs];
            }
          }
          break;
        case 'recommendation': {
          const history = listeningHistory.length > 0 ? listeningHistory : (playerState.queue || []);
          if (intent.query) {
            songs = await searchSongs(intent.query);
          } else if (history.length > 0) {
            songs = await fetchSimilarSongs(history[history.length - 1]);
          } else {
            songs = await searchSongs('top hits 2025');
          }
          break;
        }
        case 'greeting':
          break;
        default:
          songs = await searchSongs(text);
          break;
      }

      let message = intent.message;
      if (songs.length > 0) message += `\nFound ${songs.length} tracks for you!`;
      else if (intent.type !== 'greeting') message += "\nCouldn't find matching songs. Try a different description!";

      setAiResult({ message, songs });
    } catch {
      setAiResult({ message: "Oops! Something went wrong. Try again.", songs: [] });
    }
    setAiLoading(false);
  }, [aiQuery, aiLoading, listeningHistory, playerState.queue]);

  const handleVoice = useCallback(() => {
    if (isVoiceListening) {
      stopListening();
      setIsVoiceListening(false);
      return;
    }
    startListening(
      (result) => {
        setAiQuery(result.transcript);
        if (result.isFinal) {
          const cmd = parseVoiceCommand(result.transcript);
          switch (cmd.type) {
            case 'play_likes':
            case 'play_favorites':
              if (likedSongs.length > 0) {
                playSong(likedSongs[0], likedSongs);
                setAiResult({ message: cmd.message + `\n${likedSongs.length} liked songs queued!`, songs: likedSongs.slice(0, 10) });
              } else {
                setAiResult({ message: '❤️ No liked songs yet! Like some songs first.', songs: [] });
              }
              setAiQuery('');
              break;
            case 'pause':
              pause();
              setAiResult({ message: cmd.message, songs: [] });
              setAiQuery('');
              break;
            case 'resume':
              resume();
              setAiResult({ message: cmd.message, songs: [] });
              setAiQuery('');
              break;
            case 'next':
              next();
              setAiResult({ message: cmd.message, songs: [] });
              setAiQuery('');
              break;
            case 'previous':
              previous();
              setAiResult({ message: cmd.message, songs: [] });
              setAiQuery('');
              break;
            case 'shuffle':
              toggleShuffle();
              setAiResult({ message: cmd.message, songs: [] });
              setAiQuery('');
              break;
            case 'repeat':
              toggleRepeat();
              setAiResult({ message: cmd.message, songs: [] });
              setAiQuery('');
              break;
            case 'search':
              handleAiSend(result.transcript);
              setAiQuery('');
              break;
          }
        }
      },
      (error) => {
        setAiResult({ message: error, songs: [] });
      },
      (listening) => {
        setIsVoiceListening(listening);
      },
    );
  }, [isVoiceListening, likedSongs, playSong, pause, resume, next, previous, toggleShuffle, toggleRepeat, handleAiSend]);

  const handleMoodSelect = async (mood: Mood) => {
    if (activeMood === mood) {
      setActiveMood(null);
      setMoodSongs([]);
      return;
    }
    setActiveMood(mood);
    setMoodLoading(true);
    const songs = await fetchMoodSongs(mood);
    setMoodSongs(songs);
    setMoodLoading(false);
  };

  const handlePlayMix = (mix: DailyMix) => {
    if (mix.songs.length > 0) playSong(mix.songs[0], mix.songs);
  };

  const topHits = topSongs.slice(0, 10);
  const trending = topSongs.slice(10, 20);
  const newReleases = topSongs.slice(20, 30);
  const forYou = topSongs.slice(30, 40);
  const moreToExplore = topSongs.slice(40, 50);

  const handlePlaylist = (playlistSongs: any[]) => {
    if (playlistSongs.length > 0) playSong(playlistSongs[0], playlistSongs);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[colors.gradient1, colors.background]}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <View style={styles.headerRow}>
          <View style={styles.logoContainer}>
            {/* Unique "AR" logo from Aara with AI elements */}
            <View style={styles.logoWrapper}>
              {/* Outer glow ring */}
              <LinearGradient
                colors={['rgba(213,0,249,0.3)', 'rgba(255,0,102,0.3)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGlowRing}
              />
              
              {/* Main logo container */}
              <View style={styles.logoMain}>
                {/* Letter "A" */}
                <View style={styles.letterAContainer}>
                  <LinearGradient
                    colors={['#d500f9', '#ff0066']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.letterAShape}
                  >
                    <Text style={styles.letterText}>A</Text>
                  </LinearGradient>
                </View>
                
                {/* Letter "R" with AI spark */}
                <View style={styles.letterRContainer}>
                  <LinearGradient
                    colors={['#ff0066', '#ff6b35']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.letterRShape}
                  >
                    <Text style={styles.letterText}>R</Text>
                  </LinearGradient>
                  {/* AI indicator spark */}
                  <View style={styles.aiSparkDot} />
                </View>
              </View>
              
              {/* Musical note accent */}
              <View style={styles.musicNoteAccent}>
                <Text style={styles.musicNoteText}>♪</Text>
              </View>
            </View>
          </View>
          <Text style={styles.headerTitle}>Aara Music</Text>
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={12} color="#FFD700" />
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => setShowProfile(true)} style={styles.profileAvatar} activeOpacity={0.8}>
            <Text style={styles.profileAvatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <HomeScreenSkeleton />
        ) : (
          <>
            {showFallbackBanner && <ApiFallbackBanner onRetry={loadData} />}

            {/* ===== AI SECTION ===== */}
            <FadeInView delay={0}>
              <View style={styles.aiSection}>
                {/* AI Chat Input */}
                <LinearGradient
                  colors={['rgba(213,0,249,0.15)', 'rgba(255,23,68,0.1)', 'transparent']}
                  style={styles.aiCard}
                >
                  <View style={styles.aiCardHeader}>
                    <Ionicons name="sparkles" size={18} color="#FFD700" />
                    <Text style={styles.aiCardTitle}>Ask Aara AI</Text>
                  </View>
                  <View style={styles.aiInputRow}>
                    <TextInput
                      style={styles.aiInput}
                      placeholder="Play something happy, chill vibes..."
                      placeholderTextColor={colors.textSecondary}
                      value={aiQuery}
                      onChangeText={setAiQuery}
                      onSubmitEditing={() => handleAiSend()}
                      returnKeyType="send"
                    />
                    {voiceSupported && (
                      <TouchableOpacity
                        style={[styles.aiMicBtn, isVoiceListening && styles.aiMicBtnActive]}
                        onPress={handleVoice}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={isVoiceListening ? 'mic' : 'mic-outline'} size={20} color={isVoiceListening ? '#fff' : colors.primary} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.aiSendBtn, (!aiQuery.trim() || aiLoading) && { opacity: 0.5 }]}
                      onPress={() => handleAiSend()}
                      disabled={!aiQuery.trim() || aiLoading}
                    >
                      {aiLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="send" size={18} color="#fff" />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Quick suggestion chips */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                    {['Happy vibes', 'Chill music', 'Workout', 'Bollywood hits', 'Sad songs', 'Party'].map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={styles.suggestionChip}
                        onPress={() => handleAiSend(s)}
                      >
                        <Text style={styles.suggestionText}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </LinearGradient>

                {/* AI Result */}
                {aiLoading && (
                  <View style={styles.aiResultBox}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.aiThinking}>Aara AI is thinking...</Text>
                  </View>
                )}
                {aiResult && !aiLoading && (
                  <View style={styles.aiResultBox}>
                    <Text style={styles.aiResultMsg}>{aiResult.message}</Text>
                    {aiResult.songs.length > 0 && (
                      <View style={styles.aiResultSongs}>
                        <TouchableOpacity
                          style={styles.playAllBtn}
                          onPress={() => playSong(aiResult.songs[0], aiResult.songs)}
                        >
                          <Ionicons name="play" size={14} color="#fff" />
                          <Text style={styles.playAllText}>Play All {aiResult.songs.length}</Text>
                        </TouchableOpacity>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                          {aiResult.songs.slice(0, 10).map((song) => (
                            <TouchableOpacity
                              key={song.id}
                              style={styles.aiSongCard}
                              onPress={() => playSong(song, aiResult.songs)}
                            >
                              <Image source={{ uri: song.coverArt }} style={styles.aiSongArt} />
                              <Text style={styles.aiSongTitle} numberOfLines={1}>{song.title}</Text>
                              <Text style={styles.aiSongArtist} numberOfLines={1}>{song.artist}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                )}

                {/* Mood Chips */}
                <View style={styles.moodSection}>
                  <Text style={styles.moodSectionTitle}>Mood Mix</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {moods.map((mood) => (
                      <TouchableOpacity
                        key={mood.key}
                        style={[
                          styles.moodChip,
                          { borderColor: mood.color },
                          activeMood === mood.key && { backgroundColor: mood.color + '30' },
                        ]}
                        onPress={() => handleMoodSelect(mood.key)}
                      >
                        <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                        <Text style={styles.moodLabel}>{mood.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Mood Results */}
                {moodLoading && (
                  <View style={styles.aiResultBox}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.aiThinking}>Curating your playlist...</Text>
                  </View>
                )}
                {activeMood && moodSongs.length > 0 && !moodLoading && (
                  <View style={styles.moodResults}>
                    <View style={styles.moodResultsHeader}>
                      <Text style={styles.moodResultsTitle}>
                        {moods.find((m) => m.key === activeMood)?.emoji}{' '}
                        {moods.find((m) => m.key === activeMood)?.label}
                      </Text>
                      <TouchableOpacity
                        style={styles.playAllBtn}
                        onPress={() => playSong(moodSongs[0], moodSongs)}
                      >
                        <Ionicons name="play" size={14} color="#fff" />
                        <Text style={styles.playAllText}>Play All</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {moodSongs.slice(0, 10).map((song) => (
                        <TouchableOpacity
                          key={song.id}
                          style={styles.aiSongCard}
                          onPress={() => playSong(song, moodSongs)}
                        >
                          <Image source={{ uri: song.coverArt }} style={styles.aiSongArt} />
                          <Text style={styles.aiSongTitle} numberOfLines={1}>{song.title}</Text>
                          <Text style={styles.aiSongArtist} numberOfLines={1}>{song.artist}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Daily Mixes */}
                {dailyMixes.length > 0 && (
                  <View style={styles.mixSection}>
                    <Text style={styles.moodSectionTitle}>AI Daily Mixes</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {dailyMixes.map((mix) => (
                        <TouchableOpacity
                          key={mix.id}
                          style={styles.mixCard}
                          onPress={() => handlePlayMix(mix)}
                        >
                          <LinearGradient
                            colors={[mix.color, mix.color + '80']}
                            style={styles.mixGradient}
                          >
                            <Ionicons name="sparkles" size={20} color="#fff" />
                            <Text style={styles.mixTitle}>{mix.title}</Text>
                            <Text style={styles.mixSubtitle}>{mix.subtitle}</Text>
                            <Text style={styles.mixCount}>{mix.songs.length} songs</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </FadeInView>

            {/* ===== YOUR MUSIC SECTIONS ===== */}

            {/* Recently Played */}
            {listeningHistory.length > 0 && (
              <FadeInView delay={50}>
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="time" size={20} color={colors.primary} />
                    <Text style={styles.sectionTitle}>Recently Played</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalScroll}
                  >
                    {listeningHistory.slice(0, 15).map((song) => (
                      <SongCard key={song.id + '-history'} song={song} />
                    ))}
                  </ScrollView>
                </View>
              </FadeInView>
            )}

            {/* Liked Songs / Your Favorites */}
            {likedSongs.length > 0 && (
              <FadeInView delay={75}>
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="heart" size={20} color="#FF1744" />
                      <Text style={styles.sectionTitle}>Your Favorites</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.playAllBtn}
                      onPress={() => playSong(likedSongs[0], likedSongs)}
                    >
                      <Ionicons name="play" size={14} color="#fff" />
                      <Text style={styles.playAllText}>Play All {likedSongs.length}</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalScroll}
                  >
                    {likedSongs.slice(0, 15).map((song) => (
                      <SongCard key={song.id + '-liked'} song={song} />
                    ))}
                  </ScrollView>
                </View>
              </FadeInView>
            )}

            {/* ===== MUSIC SECTIONS ===== */}

            {/* Top Chart Hits */}
            <FadeInView delay={100}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Chart Hits</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                {topHits.map((song) => (
                  <SongCard key={song.id} song={song} />
                ))}
              </ScrollView>
            </View>
            </FadeInView>

            {/* Trending Now */}
            <FadeInView delay={200}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trending Now</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                {trending.map((song) => (
                  <SongCard key={song.id} song={song} />
                ))}
              </ScrollView>
            </View>
            </FadeInView>

            {/* Genre Tabs */}
            <FadeInView delay={220}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Explore by Genre</Text>
                
                {/* Tab Buttons */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.tabsContainer}
                  contentContainerStyle={styles.tabsContent}
                >
                  <TouchableOpacity
                    style={[styles.genreTab, activeGenreTab === 'bollywood' && styles.genreTabActive]}
                    onPress={() => setActiveGenreTab('bollywood')}
                  >
                    <Text style={styles.genreTabEmoji}>🎬</Text>
                    <Text style={[styles.genreTabText, activeGenreTab === 'bollywood' && styles.genreTabTextActive]}>
                      Bollywood
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.genreTab, activeGenreTab === 'hollywood' && styles.genreTabActive]}
                    onPress={() => setActiveGenreTab('hollywood')}
                  >
                    <Text style={styles.genreTabEmoji}>🎸</Text>
                    <Text style={[styles.genreTabText, activeGenreTab === 'hollywood' && styles.genreTabTextActive]}>
                      Hollywood
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.genreTab, activeGenreTab === 'south' && styles.genreTabActive]}
                    onPress={() => setActiveGenreTab('south')}
                  >
                    <Text style={styles.genreTabEmoji}>🎵</Text>
                    <Text style={[styles.genreTabText, activeGenreTab === 'south' && styles.genreTabTextActive]}>
                      South Indian
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.genreTab, activeGenreTab === 'marathi' && styles.genreTabActive]}
                    onPress={() => setActiveGenreTab('marathi')}
                  >
                    <Text style={styles.genreTabEmoji}>🌺</Text>
                    <Text style={[styles.genreTabText, activeGenreTab === 'marathi' && styles.genreTabTextActive]}>
                      Marathi
                    </Text>
                  </TouchableOpacity>
                </ScrollView>

                {/* Tab Content */}
                <View style={styles.genreContent}>
                  {activeGenreTab === 'bollywood' && (
                    <>
                      {bollywoodSongs.length > 0 ? (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.horizontalScroll}
                        >
                          {bollywoodSongs.map((song) => (
                            <SongCard key={song.id} song={song} />
                          ))}
                        </ScrollView>
                      ) : (
                        <Text style={styles.emptyGenreText}>Loading Bollywood songs...</Text>
                      )}
                    </>
                  )}

                  {activeGenreTab === 'hollywood' && (
                    <>
                      {hollywoodSongs.length > 0 ? (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.horizontalScroll}
                        >
                          {hollywoodSongs.map((song) => (
                            <SongCard key={song.id} song={song} />
                          ))}
                        </ScrollView>
                      ) : (
                        <Text style={styles.emptyGenreText}>Loading Hollywood songs...</Text>
                      )}
                    </>
                  )}

                  {activeGenreTab === 'south' && (
                    <>
                      {southIndianSongs.length > 0 ? (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.horizontalScroll}
                        >
                          {southIndianSongs.map((song) => (
                            <SongCard key={song.id} song={song} />
                          ))}
                        </ScrollView>
                      ) : (
                        <Text style={styles.emptyGenreText}>Loading South Indian songs...</Text>
                      )}
                    </>
                  )}

                  {activeGenreTab === 'marathi' && (
                    <>
                      {marathiSongs.length > 0 ? (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.horizontalScroll}
                        >
                          {marathiSongs.map((song) => (
                            <SongCard key={song.id} song={song} />
                          ))}
                        </ScrollView>
                      ) : (
                        <Text style={styles.emptyGenreText}>Loading Marathi songs...</Text>
                      )}
                    </>
                  )}
                </View>
              </View>
            </FadeInView>

            {/* New Releases */}
            {newReleases.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>New Releases</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScroll}
                >
                  {newReleases.map((song) => (
                    <SongCard key={song.id} song={song} />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* For You */}
            {forYou.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>For You</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScroll}
                >
                  {forYou.map((song) => (
                    <SongCard key={song.id} song={song} />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Featured Playlists */}
            {playlists.length > 0 && (
              <FadeInView delay={300}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Featured Playlists</Text>
                {playlists.map((playlist, index) => (
                  <AnimatedPressable
                    key={index}
                    style={styles.playlistCard}
                    onPress={() => handlePlaylist(playlist.songs)}
                  >
                    <LinearGradient
                      colors={['rgba(255, 23, 68, 0.2)', colors.card]}
                      style={styles.playlistGradient}
                    >
                      <Text style={styles.playlistName}>{playlist.name}</Text>
                      <Text style={styles.playlistDescription}>
                        {playlist.description} • {playlist.songs.length} songs
                      </Text>
                    </LinearGradient>
                  </AnimatedPressable>
                ))}
              </View>
              </FadeInView>
            )}

            {/* Recently Played */}
            {listeningHistory.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="time-outline" size={18} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Recently Played</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScroll}
                >
                  {listeningHistory.slice(0, 10).map((song) => (
                    <SongCard key={song.id} song={song} />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* AI Recommendations */}
            {aiRecs.map((rec, index) => (
              <View key={index} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="sparkles" size={16} color="#FFD700" />
                  <Text style={styles.sectionTitle}>{rec.title}</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScroll}
                >
                  {rec.songs.map((song) => (
                    <SongCard key={song.id} song={song} />
                  ))}
                </ScrollView>
              </View>
            ))}

            {/* More to Explore */}
            {moreToExplore.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>More to Explore</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScroll}
                >
                  {moreToExplore.map((song) => (
                    <SongCard key={song.id} song={song} />
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={{ height: 140 + insets.bottom }} />
          </>
        )}
      </ScrollView>

      {/* ===== ACCOUNT MODAL ===== */}
      <Modal visible={showProfile} animationType="slide" transparent onRequestClose={() => setShowProfile(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalSheet}>

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalAvatarLarge}>
                <Text style={styles.modalAvatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.modalName}>{user?.name}</Text>
                <Text style={styles.modalEmail}>{user?.email}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowProfile(false)} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.modalTabs}>
              {(['details', 'password', 'recovery'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.modalTab, profileTab === tab && styles.modalTabActive]}
                  onPress={() => { setProfileTab(tab); setPwError(''); setPwSuccess(''); }}
                >
                  <Text style={[styles.modalTabText, profileTab === tab && styles.modalTabTextActive]}>
                    {tab === 'details' ? 'Account' : tab === 'password' ? 'Password' : 'Recovery'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tab: Account Details */}
            {profileTab === 'details' && (
              <View style={styles.modalContent}>
                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={18} color={colors.primary} />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Full Name</Text>
                    <Text style={styles.detailValue}>{user?.name}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="mail-outline" size={18} color={colors.primary} />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Email Address</Text>
                    <Text style={styles.detailValue}>{user?.email}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#4CAF50" />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Account Status</Text>
                    <Text style={[styles.detailValue, { color: '#4CAF50' }]}>Active</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="musical-notes-outline" size={18} color={colors.primary} />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Songs Liked</Text>
                    <Text style={styles.detailValue}>{likedSongs.length}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={18} color={colors.primary} />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Recently Played</Text>
                    <Text style={styles.detailValue}>{listeningHistory.length} tracks</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
                  <Ionicons name="log-out-outline" size={18} color="#FF5252" />
                  <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Tab: Change Password */}
            {profileTab === 'password' && (
              <View style={styles.modalContent}>
                <Text style={styles.sectionHint}>Choose a strong password (min. 6 characters)</Text>
                {pwError ? <View style={styles.alertBox}><Ionicons name="alert-circle" size={15} color="#FF5252" /><Text style={styles.alertText}>{pwError}</Text></View> : null}
                {pwSuccess ? <View style={[styles.alertBox, styles.alertSuccess]}><Ionicons name="checkmark-circle" size={15} color="#4CAF50" /><Text style={[styles.alertText, { color: '#4CAF50' }]}>{pwSuccess}</Text></View> : null}

                <Text style={styles.inputLabel}>Current Password</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter current password"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showOld}
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowOld(v => !v)} style={styles.eyeBtn}>
                    <Ionicons name={showOld ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>New Password</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter new password"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showNew}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowNew(v => !v)} style={styles.eyeBtn}>
                    <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Repeat new password"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    autoCapitalize="none"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, (pwLoading || !oldPassword || !newPassword) && { opacity: 0.5 }]}
                  onPress={handleChangePassword}
                  disabled={pwLoading || !oldPassword || !newPassword}
                  activeOpacity={0.8}
                >
                  {pwLoading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <><Ionicons name="lock-closed-outline" size={16} color="#fff" /><Text style={styles.primaryBtnText}>Update Password</Text></>}
                </TouchableOpacity>
              </View>
            )}

            {/* Tab: Recovery */}
            {profileTab === 'recovery' && (
              <View style={styles.modalContent}>
                <View style={styles.recoveryCard}>
                  <Ionicons name="information-circle-outline" size={28} color={colors.primary} style={{ marginBottom: 10 }} />
                  <Text style={styles.recoveryTitle}>Account Recovery</Text>
                  <Text style={styles.recoveryBody}>
                    If you forget your password, you can recover your account by:
                  </Text>
                  <View style={styles.recoveryStep}>
                    <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
                    <Text style={styles.stepText}>Contact the admin at <Text style={{ color: colors.primary }}>vilas.wasnik@live.com</Text> with your registered email</Text>
                  </View>
                  <View style={styles.recoveryStep}>
                    <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
                    <Text style={styles.stepText}>Your password will be reset and sent back to you</Text>
                  </View>
                  <View style={styles.recoveryStep}>
                    <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
                    <Text style={styles.stepText}>Log in with the new password and change it immediately</Text>
                  </View>
                </View>
                <View style={[styles.recoveryCard, { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                  <Ionicons name="key-outline" size={22} color="#FFD700" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>Your registered email</Text>
                    <Text style={{ color: colors.primary, fontSize: 13, marginTop: 2 }}>{user?.email}</Text>
                  </View>
                </View>
              </View>
            )}

          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: spacing.md,
  },
  greeting: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.text,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoContainer: {
    marginRight: 4,
  },
  logoWrapper: {
    width: 40,
    height: 36,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoGlowRing: {
    position: 'absolute',
    width: 40,
    height: 36,
    borderRadius: 8,
    opacity: 0.5,
  },
  logoMain: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
    zIndex: 1,
  },
  letterAContainer: {
    position: 'relative',
  },
  letterAShape: {
    width: 18,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#d500f9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
  },
  letterRContainer: {
    position: 'relative',
  },
  letterRShape: {
    width: 16,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff0066',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
  },
  letterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  aiSparkDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFD700',
    top: -2,
    right: -2,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    zIndex: 2,
  },
  musicNoteAccent: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,107,53,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  musicNoteText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  aiBadgeText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '700',
  },
  profileAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: spacing.md,
    marginBottom: spacing.sm,
  },
  genreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  genreEmoji: {
    fontSize: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
  },

  // ===== AI Section =====
  aiSection: {
    marginBottom: spacing.lg,
  },
  aiCard: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(213,0,249,0.2)',
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  aiCardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  aiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiInput: {
    flex: 1,
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
  },
  aiSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiMicBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  aiMicBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipRow: {
    marginTop: 10,
    maxHeight: 38,
  },
  suggestionChip: {
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: {
    color: colors.text,
    fontSize: 12,
  },
  aiResultBox: {
    marginHorizontal: spacing.md,
    marginTop: 10,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
  },
  aiThinking: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  aiResultMsg: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  aiResultSongs: {
    marginTop: 8,
  },
  aiSongCard: {
    width: 120,
    marginRight: 12,
  },
  aiSongArt: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
    marginBottom: 6,
  },
  aiSongTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  aiSongArtist: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
  },
  playAllText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Mood
  moodSection: {
    marginTop: 14,
    paddingHorizontal: spacing.md,
  },
  moodSectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  moodChip: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    backgroundColor: colors.card,
    marginRight: 10,
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  moodLabel: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '600',
  },
  moodResults: {
    marginHorizontal: spacing.md,
    marginTop: 10,
  },
  moodResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  moodResultsTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Mixes
  mixSection: {
    marginTop: 14,
    paddingHorizontal: spacing.md,
  },
  mixCard: {
    width: 150,
    height: 160,
    marginRight: 12,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  mixGradient: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'flex-end',
  },
  mixTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 6,
  },
  mixSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 2,
  },
  mixCount: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    marginTop: 3,
  },

  // ===== Original Home Styles =====
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  horizontalScroll: {
    paddingHorizontal: spacing.md,
  },
  playlistCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
  },
  playlistGradient: {
    padding: spacing.lg,
  },
  playlistName: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  playlistDescription: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 3,
  },
  
  // ===== Genre Tabs =====
  tabsContainer: {
    marginBottom: spacing.md,
  },
  tabsContent: {
    paddingHorizontal: spacing.md,
    gap: 10,
  },
  genreTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: colors.card,
    gap: 6,
  },
  genreTabActive: {
    backgroundColor: colors.primary,
  },
  genreTabEmoji: {
    fontSize: 18,
  },
  genreTabText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  genreTabTextActive: {
    color: colors.text,
  },
  genreContent: {
    minHeight: 180,
  },
  emptyGenreText: {
    color: colors.textSecondary,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '88%',
    backgroundColor: '#111111',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalAvatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  modalAvatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  modalName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  modalEmail: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 3,
  },
  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  modalTabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 4,
    marginBottom: spacing.lg,
  },
  modalTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalTabActive: {
    backgroundColor: colors.primary,
  },
  modalTabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  modalTabTextActive: {
    color: '#fff',
  },
  modalContent: {
    paddingBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: 12,
    gap: 12,
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 3,
  },
  detailValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,82,82,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,82,82,0.3)',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: spacing.sm,
  },
  signOutText: {
    color: '#FF5252',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHint: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 12,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,82,82,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,82,82,0.22)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  alertSuccess: {
    backgroundColor: 'rgba(76,175,80,0.08)',
    borderColor: 'rgba(76,175,80,0.22)',
  },
  alertText: {
    color: '#FFB3B3',
    fontSize: 13,
    flex: 1,
  },
  inputLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingLeft: 14,
    paddingRight: 10,
    marginBottom: 12,
  },
  modalInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: 14,
    fontSize: 14,
  },
  eyeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 16,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  recoveryCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: spacing.lg,
  },
  recoveryTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  recoveryBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  recoveryStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
});
