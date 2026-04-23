import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Song } from '../types';
import { colors, spacing } from '../constants/theme';
import { useMusicPlayer } from '../context/MusicPlayerContext';

interface SongListItemProps {
  song: Song;
  onPress?: () => void;
  showMore?: boolean;
}

export const SongListItem: React.FC<SongListItemProps> = ({ song, onPress, showMore = true }) => {
  const { playSong, playerState } = useMusicPlayer();
  const isPlaying = playerState.currentSong?.id === song.id && playerState.isPlaying;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      playSong(song);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Image source={{ uri: song.coverArt }} style={styles.image} />
      <View style={styles.info}>
        <Text style={[styles.title, isPlaying && styles.activeText]} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {song.artist}
        </Text>
      </View>
      <Text style={styles.duration}>{formatDuration(song.duration)}</Text>
      {showMore && (
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  image: {
    width: 45,
    height: 45,
    borderRadius: 4,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  activeText: {
    color: colors.primary,
  },
  artist: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  duration: {
    color: colors.textSecondary,
    fontSize: 13,
    marginRight: spacing.sm,
  },
  moreButton: {
    padding: spacing.xs,
  },
});
