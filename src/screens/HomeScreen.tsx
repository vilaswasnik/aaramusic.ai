import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SongCard } from '../components/SongCard';
import { mockSongs, mockPlaylists } from '../data/mockData';
import { colors, spacing, typography } from '../constants/theme';
import { useMusicPlayer } from '../context/MusicPlayerContext';

export const HomeScreen: React.FC = () => {
  const { playSong } = useMusicPlayer();
  const recentlyPlayed = mockSongs.slice(0, 4);
  const recommended = mockSongs.slice(2);

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
        <Text style={styles.greeting}>Good Evening</Text>
        <Text style={styles.headerTitle}>Aara Music</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Recently Played */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Played</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {recentlyPlayed.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </ScrollView>
        </View>

        {/* Featured Playlists */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Playlists</Text>
          {mockPlaylists.map((playlist) => (
            <TouchableOpacity
              key={playlist.id}
              style={styles.playlistCard}
              onPress={() => handlePlaylist(playlist.songs)}
            >
              <LinearGradient
                colors={['rgba(255, 23, 68, 0.2)', colors.card]}
                style={styles.playlistGradient}
              >
                <Text style={styles.playlistName}>{playlist.name}</Text>
                <Text style={styles.playlistDescription}>{playlist.description}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recommended */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended for You</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {recommended.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </ScrollView>
        </View>

        <View style={{ height: 140 }} />
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
});
