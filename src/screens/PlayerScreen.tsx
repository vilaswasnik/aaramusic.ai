import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { colors, spacing, typography } from '../constants/theme';
import { EqualizerBars } from '../components/EqualizerBars';
import { fetchSimilarSongs } from '../services/aiService';

const { width, height } = Dimensions.get('window');

const hapticTap = () => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

export const PlayerScreen: React.FC = () => {
  const navigation = useNavigation();
  const {
    playerState,
    playSong,
    pause,
    resume,
    next,
    previous,
    seek,
    toggleShuffle,
    toggleRepeat,
    toggleLike,
    isLiked,
  } = useMusicPlayer();

  const { currentSong, isPlaying, position, duration, shuffle, repeat } = playerState;

  const [radioLoading, setRadioLoading] = useState(false);

  // Animated artwork scale
  const artScale = useRef(new Animated.Value(0.9)).current;
  const artOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reset and animate on song change
    artScale.setValue(0.9);
    artOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(artScale, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 6 }),
      Animated.timing(artOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [currentSong?.id]);

  // Pulse animation while playing
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isPlaying) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.02, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulse.setValue(1);
    }
  }, [isPlaying]);

  if (!currentSong) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No song playing</Text>
      </View>
    );
  }

  const handlePlayPause = () => {
    hapticTap();
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const handleAIRadio = async () => {
    if (!currentSong || radioLoading) return;
    setRadioLoading(true);
    try {
      const similar = await fetchSimilarSongs(currentSong);
      if (similar.length > 0) {
        const radioQueue = [currentSong, ...similar];
        await playSong(radioQueue[1], radioQueue);
      }
    } catch (error) {
      console.error('AI Radio error:', error);
    }
    setRadioLoading(false);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <LinearGradient
      colors={['#1a1a1a', colors.background, colors.background]}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Now Playing</Text>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Album Art */}
      <View style={styles.artworkContainer}>
        <Animated.View style={{ transform: [{ scale: Animated.multiply(artScale, pulse) }], opacity: artOpacity }}>
          <View style={styles.artworkShadow}>
            <Image source={{ uri: currentSong.coverArt }} style={styles.artwork} />
          </View>
        </Animated.View>
        {isPlaying && (
          <View style={styles.equalizerRow}>
            <EqualizerBars isPlaying={isPlaying} barCount={5} color={colors.primary} size="medium" />
          </View>
        )}
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {currentSong.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {currentSong.artist}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${(position / duration) * 100}%` },
              ]}
            />
          </View>
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity onPress={toggleShuffle}>
          <Ionicons
            name="shuffle"
            size={24}
            color={shuffle ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={previous} style={styles.controlButton}>
          <Ionicons name="play-skip-back" size={36} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
          <Ionicons
            name={isPlaying ? 'pause-circle' : 'play-circle'}
            size={80}
            color={colors.text}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={next} style={styles.controlButton}>
          <Ionicons name="play-skip-forward" size={36} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleRepeat}>
          <Ionicons
            name={repeat === 'one' ? 'repeat-outline' : 'repeat'}
            size={24}
            color={repeat !== 'off' ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity onPress={() => currentSong && toggleLike(currentSong)}>
          <Ionicons
            name={currentSong && isLiked(currentSong.id) ? 'heart' : 'heart-outline'}
            size={28}
            color={currentSong && isLiked(currentSong.id) ? colors.primary : colors.text}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.aiRadioButton}
          onPress={handleAIRadio}
          disabled={radioLoading}
        >
          {radioLoading ? (
            <ActivityIndicator size="small" color="#FFD700" />
          ) : (
            <Ionicons name="sparkles" size={20} color="#FFD700" />
          )}
          <Text style={styles.aiRadioText}>AI Radio</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="share-outline" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  moreButton: {
    width: 40,
    alignItems: 'flex-end',
  },
  artworkContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  artwork: {
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: 16,
  },
  artworkShadow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
    borderRadius: 16,
  },
  equalizerRow: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  infoContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  artist: {
    color: colors.textSecondary,
    fontSize: 18,
    textAlign: 'center',
  },
  progressContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  progressBar: {
    marginBottom: spacing.md,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  controlButton: {
    padding: spacing.sm,
  },
  playButton: {
    padding: 0,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing.xl * 2,
    marginBottom: spacing.xl,
  },
  aiRadioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    gap: 6,
  },
  aiRadioText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 18,
  },
});
