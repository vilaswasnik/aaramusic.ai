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
  ScrollView,
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
  const [likePress, setLikePress] = useState(false);

  // Animated artwork scale
  const artScale = useRef(new Animated.Value(0.9)).current;
  const artOpacity = useRef(new Animated.Value(0)).current;
  const likeScale = useRef(new Animated.Value(1)).current;

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

  const handleLike = () => {
    if (!currentSong) return;
    hapticTap();
    toggleLike(currentSong);
    
    // Animate like button
    Animated.sequence([
      Animated.timing(likeScale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
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
      colors={['#1a1a2e', '#16213e', colors.background]}
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-down" size={32} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerSubtitle}>PLAYING FROM</Text>
            <Text style={styles.headerTitle}>Your Library</Text>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Album Art with Glow Effect */}
        <View style={styles.artworkContainer}>
          <Animated.View style={{ transform: [{ scale: Animated.multiply(artScale, pulse) }], opacity: artOpacity }}>
            <View style={styles.artworkWrapper}>
              {/* Glow effect */}
              <View style={[styles.artworkGlow, { backgroundColor: colors.primary + '40' }]} />
              <Image source={{ uri: currentSong.coverArt }} style={styles.artwork} />
              {/* Vinyl record effect when playing */}
              {isPlaying && (
                <View style={styles.vinylOverlay}>
                  <View style={styles.vinylCenter} />
                </View>
              )}
            </View>
          </Animated.View>
          {isPlaying && (
            <View style={styles.equalizerRow}>
              <EqualizerBars isPlaying={isPlaying} barCount={7} color={colors.primary} size="medium" />
            </View>
          )}
        </View>

        {/* Song Info */}
        <View style={styles.infoContainer}>
          <View style={styles.infoHeader}>
            <View style={styles.infoText}>
              <Text style={styles.title} numberOfLines={2}>
                {currentSong.title}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>
                {currentSong.artist}
              </Text>
            </View>
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
              <TouchableOpacity onPress={handleLike} style={styles.likeBubble}>
                <Ionicons
                  name={currentSong && isLiked(currentSong.id) ? 'heart' : 'heart-outline'}
                  size={32}
                  color={currentSong && isLiked(currentSong.id) ? '#ff0066' : colors.text}
                />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={[colors.primary, '#ff0066']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${(position / duration) * 100}%` }]}
              />
              <View style={[styles.progressThumb, { left: `${(position / duration) * 100}%` }]} />
            </View>
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        {/* Main Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity onPress={previous} style={styles.controlButton}>
            <View style={styles.controlButtonInner}>
              <Ionicons name="play-skip-back" size={32} color={colors.text} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handlePlayPause} style={styles.playButtonWrapper}>
            <LinearGradient
              colors={[colors.primary, '#ff0066']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.playButton}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={40}
                color="#fff"
              />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={next} style={styles.controlButton}>
            <View style={styles.controlButtonInner}>
              <Ionicons name="play-skip-forward" size={32} color={colors.text} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Secondary Controls */}
        <View style={styles.secondaryControls}>
          <TouchableOpacity onPress={toggleShuffle} style={styles.secondaryButton}>
            <Ionicons
              name="shuffle"
              size={24}
              color={shuffle ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.aiRadioButton, radioLoading && styles.aiRadioButtonLoading]}
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

          <TouchableOpacity onPress={toggleRepeat} style={styles.secondaryButton}>
            <Ionicons
              name={repeat === 'one' ? 'repeat-outline' : 'repeat'}
              size={24}
              color={repeat !== 'off' ? colors.primary : colors.textSecondary}
            />
            {repeat === 'one' && (
              <View style={styles.repeatBadge}>
                <Text style={styles.repeatBadgeText}>1</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="list-outline" size={26} color={colors.text} />
            <Text style={styles.actionButtonText}>Queue</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="add-circle-outline" size={26} color={colors.text} />
            <Text style={styles.actionButtonText}>Add to Playlist</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-outline" size={26} color={colors.text} />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Queue Preview */}
        {playerState.queue && playerState.queue.length > 1 && (
          <View style={styles.queuePreview}>
            <Text style={styles.queueTitle}>Up Next</Text>
            <View style={styles.queueItem}>
              <Image 
                source={{ uri: playerState.queue[1]?.coverArt }} 
                style={styles.queueItemImage} 
              />
              <View style={styles.queueItemInfo}>
                <Text style={styles.queueItemTitle} numberOfLines={1}>
                  {playerState.queue[1]?.title}
                </Text>
                <Text style={styles.queueItemArtist} numberOfLines={1}>
                  {playerState.queue[1]?.artist}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  moreButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  
  // Artwork Section
  artworkContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  artworkWrapper: {
    position: 'relative',
  },
  artwork: {
    width: width * 0.82,
    height: width * 0.82,
    borderRadius: 20,
  },
  artworkGlow: {
    position: 'absolute',
    width: width * 0.82,
    height: width * 0.82,
    borderRadius: 20,
    opacity: 0.4,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.6,
        shadowRadius: 30,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  vinylOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vinylCenter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  equalizerRow: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  
  // Song Info
  infoContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoText: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: 32,
  },
  artist: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '500',
  },
  likeBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  
  // Progress Bar
  progressContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  progressBarWrapper: {
    marginBottom: spacing.md,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'visible',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressThumb: {
    position: 'absolute',
    top: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    marginLeft: -7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  
  // Controls
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    gap: spacing.lg,
  },
  controlButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonWrapper: {
    width: 80,
    height: 80,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  
  // Secondary Controls
  secondaryControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    gap: spacing.lg,
  },
  secondaryButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  aiRadioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    gap: 8,
  },
  aiRadioButtonLoading: {
    opacity: 0.7,
  },
  aiRadioText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '700',
  },
  repeatBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repeatBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  
  // Bottom Actions
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  actionButton: {
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  
  // Queue Preview
  queuePreview: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  queueTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  queueItemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  queueItemInfo: {
    flex: 1,
  },
  queueItemTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  queueItemArtist: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  
  // Empty State
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
