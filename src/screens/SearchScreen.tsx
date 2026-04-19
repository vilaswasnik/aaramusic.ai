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
import { Song } from '../types';

export const SearchScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setSearchResults([]);
    } else {
      setLoading(true);
      const results = await searchSongs(query);
      setSearchResults(results);
      setLoading(false);
    }
  };

  const genres = ['Pop', 'Rock', 'Hip Hop', 'Jazz', 'Classical', 'Electronic'];

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
            <Text style={styles.sectionTitle}>Browse Genres</Text>
            <View style={styles.genresGrid}>
              {genres.map((genre) => (
                <TouchableOpacity 
                  key={genre} 
                  style={styles.genreCard}
                  onPress={() => handleSearch(genre)}
                >
                  <Text style={styles.genreText}>{genre}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.searchHint}>
              Try searching for artists like "Dua Lipa", "The Weeknd", or "Drake"
            </Text>
          </>
        ) : (
          <>
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
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    margin: '1.5%',
  },
  genreText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
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
  searchHint: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
    fontStyle: 'italic',
  },
});
