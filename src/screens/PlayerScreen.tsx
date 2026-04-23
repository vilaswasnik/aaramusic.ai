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
    <View style={styles.container}>
      {/* Animated Background Gradient */}
      <LinearGradient
        colors={['#0a0a0a', '#1a0a2e', '#16213e', '#0f3460']}
        style={styles.backgroundGradient}
      />
      
      {/* Floating Circular Artwork */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Minimal Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <View style={styles.backButtonCircle}>
              <Ionicons name="chevron-down" size={20} color={colors.text} />
            </View>
          </TouchableOpacity>
          <View style={styles.headerDots}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <View style={styles.moreButtonCircle}>
              <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Floating Circular Album Art */}
        <View style={styles.artworkSection}>
          <Animated.View style={{ transform: [{ scale: Animated.multiply(artScale, pulse) }], opacity: artOpacity }}>
            <View style={styles.artworkFloat}>
              {/* Outer glow rings */}
              <View style={[styles.glowRing, styles.glowRing1]} />
              <View style={[styles.glowRing, styles.glowRing2]} />
              <View style={[styles.glowRing, styles.glowRing3]} />
              
              {/* Album art */}
              <Image source={{ uri: currentSong.coverArt }} style={styles.artwork} />
              
              {/* Central play indicator */}
              {isPlaying && (
                <View style={styles.playingIndicator}>
                  <View style={styles.waveContainer}>
                    <View style={[styles.wave, styles.wave1]} />
                    <View style={[styles.wave, styles.wave2]} />
                    <View style={[styles.wave, styles.wave3]} />
                  </View>
                </View>
              )}
            </View>
          </Animated.View>
        </View>

        {/* Song Info with Artistic Layout */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <View style={styles.infoTextArea}>
              <Text style={styles.title} numberOfLines={2}>
                {currentSong.title}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>
                {currentSong.artist}
              </Text>
            </View>
            
            {/* Floating Like Button */}
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
              <TouchableOpacity 
                onPress={handleLike} 
                style={[
                  styles.floatingLike,
                  currentSong && isLiked(currentSong.id) && styles.floatingLikeActive
                ]}
              >
                <LinearGradient
                  colors={currentSong && isLiked(currentSong.id) 
                    ? ['#ff0066', '#ff6b9d'] 
                    : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                  style={styles.floatingLikeGradient}
                >
                  <Ionicons
                    name={currentSong && isLiked(currentSong.id) ? 'heart' : 'heart-outline'}
                    size={20}
                    color={currentSong && isLiked(currentSong.id) ? '#fff' : colors.text}
                  />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        {/* Unique Radial Progress */}
        <View style={styles.progressSection}>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBackground}>
                <LinearGradient
                  colors={['#d500f9', '#ff0066', '#ff6b35']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressActive, { width: `${(position / duration) * 100}%` }]}
                />
                <View style={[styles.progressDot, { left: `${(position / duration) * 100}%` }]} />
              </View>
            </View>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        {/* Unique Control Layout - Horizontal Cards */}
        <View style={styles.controlsSection}>
          {/* Previous Button */}
          <TouchableOpacity onPress={previous} style={styles.sideControl}>
            <View style={styles.sideControlInner}>
              <Ionicons name="play-back" size={20} color={colors.text} />
            </View>
          </TouchableOpacity>

          {/* Center Play Button - Large Gradient Orb */}
          <TouchableOpacity onPress={handlePlayPause} style={styles.centerControlWrapper}>
            <LinearGradient
              colors={['#d500f9', '#ff0066', '#ff6b35']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.centerControl}
            >
              <View style={styles.centerControlInner}>
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={30}
                  color="#fff"
                  style={!isPlaying && { marginLeft: 4 }}
                />
              </View>
            </LinearGradient>
            {/* Outer ring animation */}
            {isPlaying && (
              <View style={styles.centerControlRing} />
            )}
          </TouchableOpacity>

          {/* Next Button */}
          <TouchableOpacity onPress={next} style={styles.sideControl}>
            <View style={styles.sideControlInner}>
              <Ionicons name="play-forward" size={20} color={colors.text} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Feature Cards Grid */}
        <View style={styles.featuresGrid}>
          <TouchableOpacity onPress={toggleShuffle} style={styles.featureCard}>
            <LinearGradient
              colors={shuffle 
                ? ['rgba(213,0,249,0.2)', 'rgba(213,0,249,0.1)']
                : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
              style={styles.featureCardGradient}
            >
              <Ionicons 
                name="shuffle" 
                size={18} 
                color={shuffle ? '#d500f9' : colors.textSecondary} 
              />
              <Text style={[styles.featureText, shuffle && styles.featureTextActive]}>
                Shuffle
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.featureCard}
            onPress={handleAIRadio}
            disabled={radioLoading}
          >
            <LinearGradient
              colors={['rgba(255,215,0,0.2)', 'rgba(255,215,0,0.1)']}
              style={styles.featureCardGradient}
            >
              {radioLoading ? (
                <ActivityIndicator size="small" color="#FFD700" />
              ) : (
                <Ionicons name="sparkles" size={18} color="#FFD700" />
              )}
              <Text style={[styles.featureText, { color: '#FFD700' }]}>
                AI Radio
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleRepeat} style={styles.featureCard}>
            <LinearGradient
              colors={repeat !== 'off'
                ? ['rgba(255,0,102,0.2)', 'rgba(255,0,102,0.1)']
                : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
              style={styles.featureCardGradient}
            >
              <Ionicons 
                name={repeat === 'one' ? 'repeat-outline' : 'repeat'} 
                size={18} 
                color={repeat !== 'off' ? '#ff0066' : colors.textSecondary} 
              />
              {repeat === 'one' && (
                <View style={styles.repeatOneBadge}>
                  <Text style={styles.repeatOneText}>1</Text>
                </View>
              )}
              <Text style={[styles.featureText, repeat !== 'off' && { color: '#ff0066' }]}>
                Repeat
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Action Buttons - Artistic Layout */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionIcon}>
              <Ionicons name="list" size={16} color={colors.text} />
            </View>
            <Text style={styles.actionLabel}>Queue</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionIcon}>
              <Ionicons name="add" size={16} color={colors.text} />
            </View>
            <Text style={styles.actionLabel}>Playlist</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionIcon}>
              <Ionicons name="share-social" size={16} color={colors.text} />
            </View>
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionIcon}>
              <Ionicons name="download-outline" size={16} color={colors.text} />
            </View>
            <Text style={styles.actionLabel}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Up Next Card */}
        {playerState.queue && playerState.queue.length > 1 && (
          <View style={styles.upNextCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
              style={styles.upNextGradient}
            >
              <View style={styles.upNextHeader}>
                <Ionicons name="musical-notes" size={16} color={colors.primary} />
                <Text style={styles.upNextTitle}>Up Next</Text>
              </View>
              <View style={styles.upNextItem}>
                <Image 
                  source={{ uri: playerState.queue[1]?.coverArt }} 
                  style={styles.upNextImage} 
                />
                <View style={styles.upNextInfo}>
                  <Text style={styles.upNextSongTitle} numberOfLines={1}>
                    {playerState.queue[1]?.title}
                  </Text>
                  <Text style={styles.upNextArtist} numberOfLines={1}>
                    {playerState.queue[1]?.artist}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </View>
            </LinearGradient>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xs,
  },
  
  // Minimal Header with Dots
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 24,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  backButton: {
    width: 44,
  },
  backButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.primary,
  },
  moreButton: {
    width: 44,
    alignItems: 'flex-end',
  },
  moreButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  
  // Floating Circular Artwork
  artworkSection: {
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  artworkFloat: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    borderRadius: 1000,
    borderWidth: 2,
  },
  glowRing1: {
    width: width * 0.45,
    height: width * 0.45,
    borderColor: 'rgba(213,0,249,0.3)',
  },
  glowRing2: {
    width: width * 0.48,
    height: width * 0.48,
    borderColor: 'rgba(255,0,102,0.2)',
  },
  glowRing3: {
    width: width * 0.50,
    height: width * 0.50,
    borderColor: 'rgba(255,107,53,0.1)',
  },
  artwork: {
    width: width * 0.40,
    height: width * 0.40,
    borderRadius: 1000,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  playingIndicator: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wave: {
    width: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  wave1: {
    height: 12,
  },
  wave2: {
    height: 18,
  },
  wave3: {
    height: 14,
  },
  
  // Info Card
  infoSection: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  infoTextArea: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
    lineHeight: 20,
  },
  artist: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  floatingLike: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  floatingLikeActive: {
    shadowColor: '#ff0066',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingLikeGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  
  // Radial Progress
  progressSection: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    width: 40,
  },
  progressBarContainer: {
    flex: 1,
  },
  progressBackground: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'visible',
    position: 'relative',
  },
  progressActive: {
    height: '100%',
    borderRadius: 3,
  },
  progressDot: {
    position: 'absolute',
    top: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    marginLeft: -7,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 6,
  },
  
  // Unique Horizontal Controls
  controlsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  sideControl: {
    width: 48,
    height: 48,
  },
  sideControlInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  centerControlWrapper: {
    position: 'relative',
    width: 64,
    height: 64,
  },
  centerControl: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#d500f9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  centerControlInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  centerControlRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'rgba(213,0,249,0.4)',
  },
  
  // Feature Cards Grid
  featuresGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  featureCard: {
    flex: 1,
    height: 55,
  },
  featureCardGradient: {
    flex: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  featureText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  featureTextActive: {
    color: '#d500f9',
  },
  repeatOneBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ff0066',
    justifyContent: 'center',
    alignItems: 'center',
  },
  repeatOneText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  
  // Actions Row
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  actionItem: {
    alignItems: 'center',
    gap: 6,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  
  // Up Next Card
  upNextCard: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  upNextGradient: {
    borderRadius: 12,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  upNextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  upNextTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  upNextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  upNextImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  upNextInfo: {
    flex: 1,
  },
  upNextSongTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  upNextArtist: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 18,
  },
});
