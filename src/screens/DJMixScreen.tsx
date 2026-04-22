import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SongCard } from '../components/SongCard';
import { SongListItem } from '../components/SongListItem';
import { GenreScreenSkeleton } from '../components/SkeletonLoader';
import { ApiFallbackBanner } from '../components/ApiFallbackBanner';
import { colors, spacing, typography } from '../constants/theme';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import {
  fetchDJMixTopSongs,
  fetchDJMixPlaylists,
  searchSongs,
  resetFallbackDataFlag,
  isUsingFallbackData,
} from '../services/musicService';
import { Song } from '../types';
import { useNavigation } from '@react-navigation/native';

const ACCENT = '#00E5FF';

const MOODS = [
  { label: '🔥 Club', query: 'DJ club mix' },
  { label: '🎧 EDM', query: 'EDM festival drops' },
  { label: '🌊 Deep House', query: 'deep house mix' },
  { label: '⚡ Techno', query: 'techno DJ mix' },
  { label: '🎶 Trance', query: 'trance DJ mix' },
  { label: '🎤 Hip Hop', query: 'hip hop DJ remix' },
];

export const DJMixScreen: React.FC = () => {
  const { playSong } = useMusicPlayer();
  const navigation = useNavigation<any>();
  const [topSongs, setTopSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<{ name: string; description: string; songs: Song[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlaylist, setExpandedPlaylist] = useState<number | null>(null);
  const [moodSongs, setMoodSongs] = useState<Song[]>([]);
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [moodLoading, setMoodLoading] = useState(false);
  const [showFallbackBanner, setShowFallbackBanner] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    resetFallbackDataFlag();
    const [songs, djPlaylists] = await Promise.all([
      fetchDJMixTopSongs(30),
      fetchDJMixPlaylists(),
    ]);
    setTopSongs(songs);
    setPlaylists(djPlaylists);
    setShowFallbackBanner(isUsingFallbackData());
    setLoading(false);
  };

  const topHits = topSongs.slice(0, 10);
  const trending = topSongs.slice(10, 20);
  const moreHits = topSongs.slice(20, 30);

  const handlePlaylist = (songs: Song[]) => {
    if (songs.length > 0) {
      playSong(songs[0], songs);
    }
  };

  const togglePlaylist = (index: number) => {
    setExpandedPlaylist(expandedPlaylist === index ? null : index);
  };

  const handleMood = async (mood: typeof MOODS[0]) => {
    if (activeMood === mood.label) {
      setActiveMood(null);
      setMoodSongs([]);
      return;
    }
    setActiveMood(mood.label);
    setMoodLoading(true);
    resetFallbackDataFlag();
    const results = await searchSongs(mood.query);
    setMoodSongs(results.slice(0, 10));
    setShowFallbackBanner((prev) => prev || isUsingFallbackData());
    setMoodLoading(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#00E5FF', '#6200EA', colors.background]}
        style={styles.header}
      >
        <Text style={styles.greeting}>Let's Drop</Text>
        <Text style={styles.headerTitle}>DJ Mix</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <GenreScreenSkeleton />
          </View>
        ) : (
          <>
            {showFallbackBanner && <ApiFallbackBanner onRetry={loadData} />}

            {/* Open DJ Mixer */}
            <TouchableOpacity
              style={styles.mixerLaunchBtn}
              onPress={() => navigation.navigate('DJMixer')}
            >
              <LinearGradient
                colors={['#00E5FF', '#6200EA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.mixerLaunchGradient}
              >
                <Ionicons name="headset" size={28} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.mixerLaunchTitle}>Open DJ Mixer</Text>
                  <Text style={styles.mixerLaunchSub}>Dual decks, crossfader, BPM sync & effects</Text>
                </View>
                <Ionicons name="arrow-forward" size={22} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>

            {/* AI Mood Quick Play */}
            <View style={styles.section}>
              <View style={styles.aiSectionHeader}>
                <Ionicons name="sparkles" size={18} color="#FFD700" />
                <Text style={styles.sectionTitle}>AI DJ Mood</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodScroll}>
                {MOODS.map((mood) => (
                  <TouchableOpacity
                    key={mood.label}
                    style={[styles.moodChip, activeMood === mood.label && styles.moodChipActive]}
                    onPress={() => handleMood(mood)}
                  >
                    <Text style={[styles.moodChipText, activeMood === mood.label && styles.moodChipTextActive]}>
                      {mood.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {moodLoading && <ActivityIndicator size="small" color="#FFD700" style={{ marginTop: 12 }} />}
              {moodSongs.length > 0 && !moodLoading && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                  {moodSongs.map((song) => (
                    <SongCard key={song.id} song={song} />
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Top DJ Tracks */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top DJ Tracks</Text>
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

            {/* Trending Mixes */}
            {trending.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trending Mixes</Text>
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
            )}

            {/* DJ Playlists */}
            {playlists.map((playlist, index) => (
              <View key={index} style={styles.section}>
                <TouchableOpacity
                  style={styles.playlistCard}
                  onPress={() => togglePlaylist(index)}
                >
                  <LinearGradient
                    colors={['rgba(0, 229, 255, 0.25)', colors.card]}
                    style={styles.playlistGradient}
                  >
                    <View style={styles.playlistHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.playlistName}>{playlist.name}</Text>
                        <Text style={styles.playlistDescription}>
                          {playlist.description} • {playlist.songs.length} songs
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.playButton}
                        onPress={() => handlePlaylist(playlist.songs)}
                      >
                        <Text style={styles.playButtonText}>▶ Play</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
                {expandedPlaylist === index && (
                  <View style={styles.expandedList}>
                    {playlist.songs.map((song) => (
                      <SongListItem key={song.id} song={song} />
                    ))}
                  </View>
                )}
              </View>
            ))}

            {/* More Drops */}
            {moreHits.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>More Drops</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScroll}
                >
                  {moreHits.map((song) => (
                    <SongCard key={song.id} song={song} />
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={{ height: 140 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: spacing.md,
  },
  greeting: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 4,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.lg,
  },
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
    borderRadius: 12,
    overflow: 'hidden',
  },
  playlistGradient: {
    padding: spacing.lg,
  },
  playlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  playButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: spacing.md,
  },
  playButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  expandedList: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 3,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: spacing.md,
  },
  mixerLaunchBtn: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mixerLaunchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: 14,
  },
  mixerLaunchTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  mixerLaunchSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  aiSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  moodScroll: {
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  moodChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  moodChipActive: {
    backgroundColor: 'rgba(0,229,255,0.2)',
    borderColor: ACCENT,
  },
  moodChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  moodChipTextActive: {
    color: ACCENT,
  },
});
