import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SongListItem } from '../components/SongListItem';
import { colors, spacing, typography, borderRadius } from '../constants/theme';
import { useMusicPlayer } from '../context/MusicPlayerContext';

type TabType = 'recent' | 'liked' | 'playlists' | 'artists';

export const LibraryScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('recent');
  const { playSong, listeningHistory, likedSongs } = useMusicPlayer();

  const tabs: { key: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'recent', label: 'Recent', icon: 'time-outline' },
    { key: 'liked', label: 'Liked', icon: 'heart' },
    { key: 'playlists', label: 'Playlists', icon: 'list' },
    { key: 'artists', label: 'Artists', icon: 'person-outline' },
  ];

  const handlePlaylist = (playlistSongs: any[]) => {
    if (playlistSongs.length > 0) {
      playSong(playlistSongs[0], playlistSongs);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Library</Text>
        <View style={styles.tabs}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon}
                size={14}
                color={activeTab === tab.key ? '#fff' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Liked Songs Summary Card (always visible at top) */}
        {likedSongs.length > 0 && activeTab !== 'liked' && (
          <TouchableOpacity
            style={styles.likedCard}
            onPress={() => setActiveTab('liked')}
          >
            <LinearGradient
              colors={['#7B1FA2', '#E91E63']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.likedGradient}
            >
              <Ionicons name="heart" size={24} color="#fff" />
              <View style={styles.likedInfo}>
                <Text style={styles.likedTitle}>Liked Songs</Text>
                <Text style={styles.likedCount}>{likedSongs.length} songs</Text>
              </View>
              <Ionicons name="play-circle" size={36} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Recently Played */}
        {activeTab === 'recent' && (
          <View>
            {listeningHistory.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={64} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No recent plays</Text>
                <Text style={styles.emptySubtext}>Songs you play will appear here</Text>
              </View>
            ) : (
              <>
                <Text style={styles.subHeader}>
                  {listeningHistory.length} recently played
                </Text>
                {listeningHistory.map((song) => (
                  <SongListItem
                    key={song.id}
                    song={song}
                    onPress={() => playSong(song, listeningHistory)}
                  />
                ))}
              </>
            )}
          </View>
        )}

        {/* Liked Songs */}
        {activeTab === 'liked' && (
          <View>
            {likedSongs.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="heart-outline" size={64} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No liked songs yet</Text>
                <Text style={styles.emptySubtext}>
                  Tap the heart icon on any song to add it here
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.playAllBar}
                  onPress={() => playSong(likedSongs[0], likedSongs)}
                >
                  <Ionicons name="play" size={18} color="#fff" />
                  <Text style={styles.playAllText}>Play All ({likedSongs.length})</Text>
                </TouchableOpacity>
                {likedSongs.map((song) => (
                  <SongListItem
                    key={song.id}
                    song={song}
                    onPress={() => playSong(song, likedSongs)}
                  />
                ))}
              </>
            )}
          </View>
        )}

        {/* Playlists (AI-generated) */}
        {activeTab === 'playlists' && (
          <View>
            <View style={styles.emptyState}>
              <Ionicons name="sparkles" size={64} color="#FFD700" />
              <Text style={styles.emptyText}>AI Smart Playlists</Text>
              <Text style={styles.emptySubtext}>
                Keep listening and AI will auto-create personalized playlists for you.
                Check the AI tab for your Daily Mixes!
              </Text>
            </View>
          </View>
        )}

        {/* Artists */}
        {activeTab === 'artists' && (
          <View>
            {listeningHistory.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="person-outline" size={64} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No artists yet</Text>
                <Text style={styles.emptySubtext}>Artists you listen to will appear here</Text>
              </View>
            ) : (
              <>
                <Text style={styles.subHeader}>Your Top Artists</Text>
                {(() => {
                  const artistMap: Record<string, { count: number; art: string }> = {};
                  listeningHistory.forEach((s) => {
                    if (!artistMap[s.artist]) artistMap[s.artist] = { count: 0, art: s.coverArt };
                    artistMap[s.artist].count++;
                  });
                  return Object.entries(artistMap)
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 20)
                    .map(([artist, info]) => (
                      <TouchableOpacity key={artist} style={styles.artistItem}>
                        <Image source={{ uri: info.art }} style={styles.artistImage} />
                        <View style={styles.artistInfo}>
                          <Text style={styles.artistName}>{artist}</Text>
                          <Text style={styles.artistCount}>
                            {info.count} {info.count === 1 ? 'play' : 'plays'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ));
                })()}
              </>
            )}
          </View>
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
    marginBottom: spacing.lg,
  },
  tabs: {
    flexDirection: 'row',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    borderRadius: borderRadius.round,
    gap: 4,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.sm,
  },
  subHeader: {
    color: colors.textSecondary,
    fontSize: 13,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  likedCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  likedGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: 12,
  },
  likedInfo: {
    flex: 1,
  },
  likedTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  likedCount: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  playAllBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 8,
    alignSelf: 'flex-start',
  },
  playAllText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  artistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  artistImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  artistInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  artistName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  artistCount: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.lg,
  },
  emptySubtext: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 20,
  },
});
