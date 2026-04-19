import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SongListItem } from '../components/SongListItem';
import { colors, spacing, typography, borderRadius } from '../constants/theme';
import { searchSongs } from '../services/musicService';
import { parseIntent, fetchMoodSongs } from '../services/aiService';
import { Song } from '../types';

export const SearchScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiHint, setAiHint] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setSearchResults([]);
      setAiHint('');
    } else {
      setLoading(true);
      // Track recent searches
      if (query.trim().length > 2) {
        setRecentSearches((prev) => {
          const filtered = prev.filter((s) => s !== query.trim());
          return [query.trim(), ...filtered].slice(0, 8);
        });
      }
      // AI-powered search: detect intent
      const intent = parseIntent(query);
      let results: Song[] = [];
      if (intent.type === 'mood' && intent.mood) {
        results = await fetchMoodSongs(intent.mood);
        setAiHint(`🤖 AI detected "${intent.mood}" mood`);
      } else {
        results = await searchSongs(query);
        setAiHint('');
      }
      setSearchResults(results);
      setLoading(false);
    }
  };

  const genres = [
    { name: 'Pop', color: '#E91E63' },
    { name: 'Rock', color: '#FF5722' },
    { name: 'Hip Hop', color: '#9C27B0' },
    { name: 'Jazz', color: '#2196F3' },
    { name: 'Classical', color: '#795548' },
    { name: 'Electronic', color: '#00BCD4' },
    { name: 'Bollywood', color: '#FF6B00' },
    { name: 'Romantic', color: '#E91E63' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Songs, artists, or albums"
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : searchQuery.length === 0 ? (
          <>
            {recentSearches.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>Recent Searches</Text>
                  <TouchableOpacity onPress={() => setRecentSearches([])}>
                    <Text style={styles.clearText}>Clear</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.recentList}>
                  {recentSearches.map((term, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.recentChip}
                      onPress={() => handleSearch(term)}
                    >
                      <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.recentChipText}>{term}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.sectionTitle}>Trending Searches</Text>
            <View style={styles.trendingList}>
              {['Arijit Singh', 'happy vibes', 'workout energy', 'chill lofi', 'Dua Lipa', 'romantic bollywood'].map((term, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.trendingChip}
                  onPress={() => handleSearch(term)}
                >
                  <Ionicons name="trending-up" size={14} color="#FFD700" />
                  <Text style={styles.trendingChipText}>{term}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Browse Genres</Text>
            <View style={styles.genresGrid}>
              {genres.map((genre) => (
                <TouchableOpacity 
                  key={genre.name} 
                  style={[styles.genreCard, { backgroundColor: genre.color }]}
                  onPress={() => handleSearch(genre.name)}
                >
                  <Text style={styles.genreText}>{genre.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.aiSearchBadge}>
              <Ionicons name="sparkles" size={14} color="#FFD700" />
              <Text style={styles.aiSearchBadgeText}>AI-Powered Search: understands moods & intent</Text>
            </View>
          </>
        ) : (
          <>
            {aiHint ? (
              <View style={styles.aiHintContainer}>
                <Ionicons name="sparkles" size={14} color="#FFD700" />
                <Text style={styles.aiHintText}>{aiHint}</Text>
              </View>
            ) : null}
            <Text style={styles.resultsCount}>
              {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
            </Text>
            {searchResults.map((song) => (
              <SongListItem key={song.id} song={song} />
            ))}
          </>
        )}
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
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    marginLeft: spacing.sm,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  genresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
  },
  genreCard: {
    width: '47%',
    aspectRatio: 2,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    margin: '1.5%',
  },
  genreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  clearText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  recentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: 8,
    marginBottom: spacing.lg,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recentChipText: {
    color: colors.text,
    fontSize: 13,
  },
  trendingList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: 8,
    marginBottom: spacing.lg,
  },
  trendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  trendingChipText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '500',
  },
  resultsCount: {
    color: colors.textSecondary,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: spacing.md,
  },
  aiSearchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderRadius: 20,
    alignSelf: 'center',
  },
  aiSearchBadgeText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  aiHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(255,215,0,0.1)',
    marginHorizontal: spacing.md,
    borderRadius: 8,
  },
  aiHintText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '500',
  },
});
