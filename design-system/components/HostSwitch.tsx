import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { COLORS } from '@/app/design-system/tokens';

const I = COLORS.institutional;

const TRACK_WIDTH = 64;
const THUMB_SIZE = 24;
const TRACK_PADDING = 4;
const THUMB_TRAVEL = TRACK_WIDTH - TRACK_PADDING * 2 - THUMB_SIZE;
/** Desacelera al llegar: el arranque es inmediato y el final se asienta. */
const DURATION_MS = 220;
const EASING_CURVE = 'cubic-bezier(0.22, 1, 0.36, 1)';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const webTrackMotion = {
  transitionProperty: 'background-color',
  transitionDuration: `${DURATION_MS}ms`,
  transitionTimingFunction: EASING_CURVE,
} as ViewStyle;

const webThumbMotion = {
  transitionProperty: 'transform',
  transitionDuration: `${DURATION_MS}ms`,
  transitionTimingFunction: EASING_CURVE,
} as ViewStyle;

export type HostSwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

/** Interruptor Host: apagado gris, activo negro Airbnb, pastilla blanca. */
export function HostSwitch({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: HostSwitchProps) {
  const isWeb = Platform.OS === 'web';
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isWeb) return;
    if (reduceMotion) {
      progress.setValue(value ? 1 : 0);
      return;
    }
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: DURATION_MS,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start();
  }, [isWeb, progress, reduceMotion, value]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, THUMB_TRAVEL],
  });

  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [I.surfaceStrong, I.ink],
  });

  const sharedProps = {
    accessibilityRole: 'switch' as const,
    accessibilityState: { checked: value, disabled },
    accessibilityLabel,
    disabled,
    onPress: () => onValueChange(!value),
    hitSlop: 8,
  };

  if (isWeb) {
    return (
      <Pressable
        {...sharedProps}
        style={[
          styles.track,
          value ? styles.trackOn : styles.trackOff,
          !reduceMotion && webTrackMotion,
          disabled && styles.disabled,
        ]}
      >
        <View
          style={[
            styles.thumb,
            { transform: [{ translateX: value ? THUMB_TRAVEL : 0 }] },
            !reduceMotion && webThumbMotion,
          ]}
        />
      </Pressable>
    );
  }

  return (
    <AnimatedPressable
      {...sharedProps}
      style={[styles.track, { backgroundColor }, disabled && styles.disabled]}
    >
      <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: 32,
    borderRadius: 16,
    padding: TRACK_PADDING,
    justifyContent: 'center',
  },
  trackOff: {
    backgroundColor: I.surfaceStrong,
  },
  trackOn: {
    backgroundColor: I.ink,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: I.onPrimary,
  },
  disabled: {
    opacity: 0.45,
  },
});
