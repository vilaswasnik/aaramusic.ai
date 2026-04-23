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
import { FadeInView } from '../components/FadeInView';
import { ApiFallbackBanner } from '../components/ApiFallbackBanner';
import { colors, spacing, typography } from '../constants/theme';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import {
  searchSongs,
  resetFallbackDataFlag,
  isUsingFallbackData,
} from '../services/musicService';
import { Song } from '../types';

const MOODS = [
  { label: '❤️ Romantic', query: 'marathi romantic songs' },
  { label: '🎉 Folk', query: 'marathi folk lavani' },
  { label: '🙏 Devotional', query: 'marathi bhakti geet' },
  { label: '🎬 Movies', query: 'marathi film songs' },
  { label: '💪 Powada', query: 'marathi powada' },
];

export const MarathiScreen: React.FC = () => {
  const { playSong } = useMusicPlayer();
  const [topSongs, setTopSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
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
    
    // Fetch Marathi songs
    const songs = await searchSongs('marathi songs hits');
    setTopSongs(songs.slice(0, 30));
    setShowFallbackBanner(isUsingFallbackData());
    setLoading(false);
  };

  const topHits = topSongs.slice(0, 10);
  const trending = topSongs.slice(10, 20);
  const classics = topSongs.slice(20, 30);

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
        colors={['#FF9933', '#FFA500', colors.background]}
        style={styles.header}
      >
        <Text style={styles.greeting}>नमस्कार</Text>
        <Text style={styles.headerTitle}>Marathi</Text>
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

            {/* AI Mood Quick Play */}
            <View style={styles.section}>
              <View style={styles.aiSectionHeader}>
                <Ionicons name="sparkles" size={18} color="#FFD700" />
                <Text style={styles.sectionTitle}>AI Mood Mix</Text>
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

            {/* Marathi Top Hits */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Marathi Top Hits</Text>
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

            {/* Trending Marathi */}
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

            {/* Marathi Classics */}
            {classics.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Marathi Classics</Text>
                <View style={styles.listSection}>
                  {classics.map((song, index) => (
                    <FadeInView key={song.id} delay={index * 30}>
                      <SongListItem song={song} />
                    </FadeInView>
                  ))}
                </View>
              </View>
            )}
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
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    padding: spacing.lg,
  },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  aiSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  horizontalScroll: {
    paddingRight: spacing.lg,
  },
  moodScroll: {
    gap: 8,
    paddingRight: spacing.lg,
  },
  moodChip: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 153, 51, 0.3)',
  },
  moodChipActive: {
    backgroundColor: 'rgba(255, 153, 51, 0.3)',
    borderColor: '#FF9933',
  },
  moodChipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  moodChipTextActive: {
    color: '#FF9933',
  },
  listSection: {
    gap: spacing.sm,
  },
});
