import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography } from '../constants/theme';
import { searchSongs, fetchTopSongs } from '../services/musicService';
import { Song } from '../types';

const { width } = Dimensions.get('window');
const KARAOKE_PURPLE = '#9C27B0';
const KARAOKE_PINK = '#E91E63';

const POPULAR_KARAOKE = [
  'Bohemian Rhapsody',
  'Someone Like You',
  'Shape of You',
  'Rolling in the Deep',
  'Closer Chainsmokers',
  'Blinding Lights',
  'Tum Hi Ho',
  'Kal Ho Naa Ho',
  'Despacito',
  'Let It Go',
  'Perfect Ed Sheeran',
  'Shallow Lady Gaga',
];

export const KaraokeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [trending, setTrending] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const micPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadTrending();
    startMicPulse();
  }, []);

  const startMicPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(micPulse, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(micPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  };

  const loadTrending = async () => {
    setTrendingLoading(true);
    const songs = await fetchTopSongs(20);
    setTrending(songs);
    setTrendingLoading(false);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    Keyboard.dismiss();
    setLoading(true);
    const songs = await searchSongs(query);
    setResults(songs);
    setLoading(false);
  };

  const handleQuickSearch = async (term: string) => {
    setQuery(term);
    setLoading(true);
    const songs = await searchSongs(term);
    setResults(songs);
    setLoading(false);
  };

  const openKaraokePlayer = (song: Song) => {
    navigation.navigate('KaraokePlayer', { song });
  };

  const renderSongItem = ({ item }: { item: Song }) => (
    <TouchableOpacity style={styles.songItem} onPress={() => openKaraokePlayer(item)} activeOpacity={0.7}>
      <Image source={{ uri: item.coverArt }} style={styles.songImage} />
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
      </View>
      <LinearGradient colors={[KARAOKE_PURPLE, KARAOKE_PINK]} style={styles.singBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Ionicons name="mic" size={16} color="#fff" />
        <Text style={styles.singBtnText}>Sing</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View>
      {/* Hero */}
      <LinearGradient
        colors={['#4A148C', '#880E4F', '#000']}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View style={[styles.micCircle, { transform: [{ scale: micPulse }] }]}>
          <Ionicons name="mic" size={36} color="#fff" />
        </Animated.View>
        <Text style={styles.heroTitle}>Karaoke</Text>
        <Text style={styles.heroSubtitle}>Search any song and sing along with synced lyrics</Text>
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a song to sing..."
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quick Picks */}
      {results.length === 0 && (
        <View style={styles.quickSection}>
          <Text style={styles.sectionTitle}>Popular Karaoke Songs</Text>
          <View style={styles.chipsRow}>
            {POPULAR_KARAOKE.map((term) => (
              <TouchableOpacity key={term} style={styles.chip} onPress={() => handleQuickSearch(term)}>
                <Ionicons name="musical-note" size={12} color={KARAOKE_PINK} />
                <Text style={styles.chipText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Ionicons name={results.length > 0 ? 'search' : 'trending-up'} size={18} color={KARAOKE_PINK} />
        <Text style={styles.sectionTitle}>
          {results.length > 0 ? `Results for "${query}"` : 'Trending Now'}
        </Text>
      </View>
    </View>
  );

  const data = results.length > 0 ? results : trending;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderSongItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {loading || trendingLoading ? (
              <>
                <Ionicons name="hourglass-outline" size={40} color={colors.textSecondary} />
                <Text style={styles.emptyText}>Searching...</Text>
              </>
            ) : (
              <>
                <Ionicons name="mic-off-outline" size={40} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No songs found. Try another search.</Text>
              </>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingBottom: 100,
  },
  hero: {
    paddingTop: 56,
    paddingBottom: 28,
    alignItems: 'center',
  },
  micCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroTitle: {
    ...typography.h1,
    color: colors.text,
    marginBottom: 4,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    marginTop: -14,
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(156,39,176,0.3)',
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  quickSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(156,39,176,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(156,39,176,0.25)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  songImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  songArtist: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  singBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  singBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
  },
});
