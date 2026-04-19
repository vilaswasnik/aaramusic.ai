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
import { StatusBar } from 'expo-status-bar';
import { SongCard } from '../components/SongCard';
import { SongListItem } from '../components/SongListItem';
import { colors, spacing, typography } from '../constants/theme';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { fetchHollywoodTopSongs, fetchHollywoodPlaylists } from '../services/musicService';
import { Song } from '../types';

const ACCENT = '#1DB954';

export const HollywoodScreen: React.FC = () => {
  const { playSong } = useMusicPlayer();
  const [topSongs, setTopSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<{ name: string; description: string; songs: Song[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlaylist, setExpandedPlaylist] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [songs, hollywoodPlaylists] = await Promise.all([
      fetchHollywoodTopSongs(30),
      fetchHollywoodPlaylists(),
    ]);
    setTopSongs(songs);
    setPlaylists(hollywoodPlaylists);
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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#1DB954', '#1A237E', colors.background]}
        style={styles.header}
      >
        <Text style={styles.greeting}>Discover</Text>
        <Text style={styles.headerTitle}>Hollywood</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.loadingText}>Loading Hollywood hits...</Text>
          </View>
        ) : (
          <>
            {/* Top Hits */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top English Hits</Text>
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

            {/* Trending */}
            {trending.length > 0 && (
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
            )}

            {/* Playlists */}
            {playlists.map((playlist, index) => (
              <View key={index} style={styles.section}>
                <TouchableOpacity
                  style={styles.playlistCard}
                  onPress={() => togglePlaylist(index)}
                >
                  <LinearGradient
                    colors={['rgba(29, 185, 84, 0.25)', colors.card]}
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

            {/* More Hits */}
            {moreHits.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>More Hits</Text>
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
    color: '#fff',
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
});
