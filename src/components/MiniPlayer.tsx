import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { colors, spacing } from '../constants/theme';
import { EqualizerBars } from './EqualizerBars';

const { width } = Dimensions.get('window');

export const MiniPlayer: React.FC = () => {
  const navigation = useNavigation();
  const { playerState, pause, resume, next } = useMusicPlayer();
  const { currentSong, isPlaying, position, duration } = playerState;

  const slideAnim = useRef(new Animated.Value(80)).current;
  const prevSongRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentSong && !prevSongRef.current) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 12, bounciness: 8 }).start();
    }
    prevSongRef.current = currentSong?.id || null;
  }, [currentSong?.id]);

  if (!currentSong) return null;

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  const handlePlayPause = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const Container = Platform.OS === 'web' ? View : BlurView;
  const containerProps = Platform.OS === 'web' ? {} : { intensity: 80, tint: 'dark' as const };

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ translateY: slideAnim }] }]}>
      {/* Progress bar on top edge */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <Container style={styles.container} {...containerProps}>
        <TouchableOpacity
          style={styles.content}
          onPress={() => navigation.navigate('Player' as never)}
          activeOpacity={0.9}
        >
          <Image source={{ uri: currentSong.coverArt }} style={styles.image} />
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {currentSong.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {currentSong.artist}
            </Text>
          </View>
          <View style={styles.controls}>
            {isPlaying && <EqualizerBars isPlaying={isPlaying} barCount={4} color={colors.primary} size="small" />}
            <TouchableOpacity onPress={handlePlayPause} style={styles.controlButton}>
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={28}
                color={colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={next} style={styles.controlButton}>
              <Ionicons name="play-forward" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Container>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
  },
  progressBar: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  container: {
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'web' ? 'rgba(26,26,26,0.95)' : 'transparent',
  },
  content: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: Platform.OS === 'web' ? 'transparent' : 'rgba(0,0,0,0.4)',
  },
  image: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  artist: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    marginLeft: spacing.md,
  },
});
