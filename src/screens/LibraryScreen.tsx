import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SongListItem } from '../components/SongListItem';
import { mockSongs, mockPlaylists } from '../data/mockData';
import { colors, spacing, typography, borderRadius } from '../constants/theme';
import { useMusicPlayer } from '../context/MusicPlayerContext';

type TabType = 'playlists' | 'songs' | 'albums' | 'artists';

export const LibraryScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('playlists');
  const { playSong } = useMusicPlayer();

  const tabs: { key: TabType; label: string }[] = [
    { key: 'playlists', label: 'Playlists' },
    { key: 'songs', label: 'Songs' },
    { key: 'albums', label: 'Albums' },
    { key: 'artists', label: 'Artists' },
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
        {activeTab === 'playlists' && (
          <View>
            {mockPlaylists.map((playlist) => (
              <TouchableOpacity
                key={playlist.id}
                style={styles.playlistItem}
                onPress={() => handlePlaylist(playlist.songs)}
              >
                <View style={styles.playlistIcon}>
                  <Ionicons name="musical-notes" size={24} color={colors.text} />
                </View>
                <View style={styles.playlistInfo}>
                  <Text style={styles.playlistName}>{playlist.name}</Text>
                  <Text style={styles.playlistDetails}>
                    {playlist.songs.length} songs
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'songs' && (
          <View>
            {mockSongs.map((song) => (
              <SongListItem key={song.id} song={song} />
            ))}
          </View>
        )}

        {activeTab === 'albums' && (
          <View style={styles.emptyState}>
            <Ionicons name="disc-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No albums yet</Text>
            <Text style={styles.emptySubtext}>Albums you add will appear here</Text>
          </View>
        )}

        {activeTab === 'artists' && (
          <View style={styles.emptyState}>
            <Ionicons name="person-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No artists yet</Text>
            <Text style={styles.emptySubtext}>Artists you follow will appear here</Text>
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
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    borderRadius: borderRadius.round,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  playlistIcon: {
    width: 56,
    height: 56,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  playlistName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  playlistDetails: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
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
    marginTop: spacing.xs,
  },
});
