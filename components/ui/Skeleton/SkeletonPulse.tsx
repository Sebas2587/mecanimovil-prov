import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

type SkeletonPulseProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Pulso de opacidad (0.3 ↔ 0.7) para esqueletos; usa native driver.
 */
export const SkeletonPulse = React.memo(function SkeletonPulse({
  children,
  style,
}: SkeletonPulseProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [opacity]);

  return (
    <Animated.View style={[styles.wrap, style, { opacity }]}>{children}</Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
});
