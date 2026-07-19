import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import type { StyleProp, ViewStyle } from 'react-native';
import { GRADIENTS } from '@/app/design-system/tokens/gradients';

type PrimaryGradientFillProps = {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  colors?: readonly [string, string, ...string[]];
};

/** Gradiente brand Tinder — solo CTAs primarios. */
export function PrimaryGradientFill({
  style,
  children,
  colors = GRADIENTS.hostCta,
}: PrimaryGradientFillProps) {
  return (
    <LinearGradient
      colors={colors}
      locations={[...GRADIENTS.hostCtaLocations]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}

export default PrimaryGradientFill;
