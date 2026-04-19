import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface FadeInViewProps {
  delay?: number;
  duration?: number;
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
  direction?: 'up' | 'none';
}

export const FadeInView: React.FC<FadeInViewProps> = ({
  delay = 0,
  duration = 500,
  style,
  children,
  direction = 'up',
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(direction === 'up' ? 20 : 0)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      ...(direction === 'up'
        ? [
            Animated.timing(translateY, {
              toValue: 0,
              duration,
              delay,
              useNativeDriver: true,
            }),
          ]
        : []),
    ]);
    anim.start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
};
