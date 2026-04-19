import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface EqualizerBarsProps {
  isPlaying: boolean;
  barCount?: number;
  color?: string;
  size?: 'small' | 'medium';
}

export const EqualizerBars: React.FC<EqualizerBarsProps> = ({
  isPlaying,
  barCount = 4,
  color = '#FF1744',
  size = 'small',
}) => {
  const bars = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    if (isPlaying) {
      const animations = bars.map((bar, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(bar, {
              toValue: 0.3 + Math.random() * 0.7,
              duration: 300 + Math.random() * 400,
              useNativeDriver: true,
            }),
            Animated.timing(bar, {
              toValue: 0.2 + Math.random() * 0.3,
              duration: 200 + Math.random() * 300,
              useNativeDriver: true,
            }),
            Animated.timing(bar, {
              toValue: 0.5 + Math.random() * 0.5,
              duration: 250 + Math.random() * 350,
              useNativeDriver: true,
            }),
            Animated.timing(bar, {
              toValue: 0.1 + Math.random() * 0.4,
              duration: 300 + Math.random() * 300,
              useNativeDriver: true,
            }),
          ])
        )
      );
      animations.forEach((a) => a.start());
      return () => animations.forEach((a) => a.stop());
    } else {
      bars.forEach((bar) => {
        Animated.timing(bar, { toValue: 0.15, duration: 300, useNativeDriver: true }).start();
      });
    }
  }, [isPlaying]);

  const barHeight = size === 'small' ? 16 : 24;
  const barWidth = size === 'small' ? 3 : 4;
  const gap = size === 'small' ? 2 : 3;

  return (
    <View style={[styles.container, { height: barHeight, gap }]}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              width: barWidth,
              height: barHeight,
              backgroundColor: color,
              transform: [{ scaleY: bar }],
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bar: {
    borderRadius: 1,
  },
});
