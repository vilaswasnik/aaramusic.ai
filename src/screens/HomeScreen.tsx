import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SongCard } from '../components/SongCard';
import { colors, spacing, typography } from '../constants/theme';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { fetchTopSongs, fetchCuratedPlaylists } from '../services/musicService';
import { getSmartRecommendations } from '../services/aiService';
import { Song } from '../types';

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export const HomeScreen: React.FC = () => {
  const { playSong, listeningHistory } = useMusicPlayer();
  const [topSongs, setTopSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<{ name: string; description: string; songs: Song[] }[]>([]);
  const [aiRecs, setAiRecs] = useState<{ title: string; songs: Song[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // Load AI recommendations when listening history changes
  useEffect(() => {
    if (!loading) {
      getSmartRecommendations(listeningHistory).then(setAiRecs);
    }
  }, [listeningHistory.length, loading]);

  const loadData = async () => {
    setLoading(true);
    const [songs, curatedPlaylists] = await Promise.all([
      fetchTopSongs(50),
      fetchCuratedPlaylists(),
    ]);
    setTopSongs(songs);
    setPlaylists(curatedPlaylists);
    setLoading(false);
  };

  const topHits = topSongs.slice(0, 10);
  const trending = topSongs.slice(10, 20);
  const newReleases = topSongs.slice(20, 30);
  const forYou = topSongs.slice(30, 40);
  const moreToExplore = topSongs.slice(40, 50);

  const handlePlaylist = (playlistSongs: any[]) => {
    if (playlistSongs.length > 0) {
      playSong(playlistSongs[0], playlistSongs);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[colors.gradient1, colors.background]}
        style={styles.header}
      >
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Aara Music</Text>
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={12} color="#FFD700" />
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading real songs...</Text>
          </View>
        ) : (
          <>
            {/* Top Chart Hits */}
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

            {/* Trending Now */}
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
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Featured Playlists</Text>
                {playlists.map((playlist, index) => (
                  <TouchableOpacity
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
                  </TouchableOpacity>
                ))}
              </View>
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
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
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: spacing.md,
  },
});
