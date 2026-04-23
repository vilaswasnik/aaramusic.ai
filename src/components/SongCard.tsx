import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Song } from '../types';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { AnimatedPressable } from './AnimatedPressable';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.24;

interface SongCardProps {
  song: Song;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export const SongCard: React.FC<SongCardProps> = ({ song, onPress, size = 'medium' }) => {
  const { playSong, playerState } = useMusicPlayer();
  const isPlaying = playerState.currentSong?.id === song.id && playerState.isPlaying;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      playSong(song);
    }
  };

  const cardSize = size === 'small' ? 75 : size === 'large' ? 120 : CARD_WIDTH;

  return (
    <AnimatedPressable onPress={handlePress} style={[styles.container, { width: cardSize }]}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: song.coverArt }} style={[styles.image, { width: cardSize, height: cardSize }]} />
        {isPlaying && (
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
            style={styles.playingOverlay}
          >
            <Ionicons name="pulse" size={32} color={colors.primary} />
          </LinearGradient>
        )}
        {!isPlaying && (
          <View style={styles.playHover}>
            <View style={styles.playCircle}>
              <Ionicons name="play" size={20} color="#fff" />
            </View>
          </View>
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {song.title}
      </Text>
      <Text style={styles.artist} numberOfLines={1}>
        {song.artist}
      </Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: spacing.md,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  image: {
    borderRadius: borderRadius.md,
  },
  playingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playHover: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  playCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  artist: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.xs,
  },
});
