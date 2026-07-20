import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { BORDERS, COLORS, SHADOWS, SPACING } from '@/app/design-system/tokens';

const C = COLORS;

export type CardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  padding?: keyof typeof SPACING.fixed | number;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
};

export function Card({ children, onPress, padding = 'md', style, elevated = false }: CardProps) {
  const pad = typeof padding === 'number' ? padding : SPACING.fixed[padding];

  const surfaceStyle: ViewStyle = {
    backgroundColor: C.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: C.border.light,
    padding: pad,
    ...(elevated ? SHADOWS.editorial : {}),
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [surfaceStyle, pressed && { opacity: 0.96 }, style]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[surfaceStyle, style]}>{children}</View>;
}

export default Card;

/** Alias semántico para cards de negocio que extienden la superficie base del DS. */
export const BaseCard = Card;
