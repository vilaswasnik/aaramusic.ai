import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { colors, borderRadius, spacing } from '../constants/theme';

const { width } = Dimensions.get('window');

const ShimmerBlock: React.FC<{ w: number | string; h: number; radius?: number; style?: any }> = ({
  w, h, radius = borderRadius.md, style,
}) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Animated.View
      style={[
        { width: w as any, height: h, borderRadius: radius, backgroundColor: colors.card, opacity },
        style,
      ]}
    />
  );
};

// Skeleton for a horizontal song card section
export const SongCardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  const cardW = width * 0.45;
  return (
    <View style={styles.horizontalRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.cardSkeleton, { width: cardW }]}>
          <ShimmerBlock w={cardW} h={cardW} />
          <ShimmerBlock w={cardW * 0.8} h={12} style={{ marginTop: 8 }} />
          <ShimmerBlock w={cardW * 0.5} h={10} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
};

// Skeleton for a list of songs
export const SongListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <View>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={styles.listItem}>
        <ShimmerBlock w={50} h={50} radius={4} />
        <View style={styles.listInfo}>
          <ShimmerBlock w="80%" h={14} />
          <ShimmerBlock w="50%" h={11} style={{ marginTop: 6 }} />
        </View>
        <ShimmerBlock w={32} h={12} />
      </View>
    ))}
  </View>
);

// Skeleton for the full home screen
export const HomeScreenSkeleton: React.FC = () => (
  <View style={styles.homeSkeleton}>
    {/* Header skeleton */}
    <View style={styles.headerSkel}>
      <ShimmerBlock w={180} h={20} />
      <ShimmerBlock w={120} h={36} style={{ marginTop: 8 }} />
    </View>
    {/* Section 1 */}
    <ShimmerBlock w={160} h={22} style={{ marginLeft: spacing.md, marginBottom: 12 }} />
    <SongCardSkeleton />
    {/* Section 2 */}
    <ShimmerBlock w={140} h={22} style={{ marginLeft: spacing.md, marginTop: 24, marginBottom: 12 }} />
    <SongCardSkeleton />
    {/* Section 3 */}
    <ShimmerBlock w={120} h={22} style={{ marginLeft: spacing.md, marginTop: 24, marginBottom: 12 }} />
    <SongCardSkeleton count={3} />
  </View>
);

// Skeleton for genre screens
export const GenreScreenSkeleton: React.FC = () => (
  <View style={styles.homeSkeleton}>
    <ShimmerBlock w={180} h={24} style={{ marginLeft: spacing.md, marginBottom: 12 }} />
    <SongCardSkeleton />
    <ShimmerBlock w={150} h={24} style={{ marginLeft: spacing.md, marginTop: 24, marginBottom: 12 }} />
    <SongCardSkeleton />
    <ShimmerBlock w="90%" h={72} radius={12} style={{ marginHorizontal: spacing.md, marginTop: 24 }} />
    <ShimmerBlock w="90%" h={72} radius={12} style={{ marginHorizontal: spacing.md, marginTop: 12 }} />
  </View>
);

const styles = StyleSheet.create({
  horizontalRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
  },
  cardSkeleton: {
    marginRight: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  listInfo: {
    flex: 1,
  },
  homeSkeleton: {
    paddingTop: spacing.lg,
  },
  headerSkel: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
});
