import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { BORDERS, COLORS, SHADOWS, SPACING } from '@/app/design-system/tokens';

const C = COLORS;
const I = COLORS.institutional;

export type CardPadding = keyof typeof SPACING.fixed | 'host' | number;

export type CardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  /**
   * `host` = padding Host asimétrico (H md / V sm).
   * Número o key de `SPACING.fixed` = padding uniforme.
   */
  padding?: CardPadding;
  style?: StyleProp<ViewStyle>;
  /** Sombra editorial Host. Default true (paper + hairline + editorial). */
  elevated?: boolean;
};

function resolvePadding(padding: CardPadding): ViewStyle {
  if (padding === 'host') {
    return {
      paddingHorizontal: SPACING.fixed.md,
      paddingVertical: SPACING.fixed.sm,
    };
  }
  const pad = typeof padding === 'number' ? padding : SPACING.fixed[padding];
  return { padding: pad };
}

/**
 * Superficie paper canónica Host: canvas-sibling, hairline, radius lg, editorial.
 * Brand (magenta/naranja) no se usa como fill de card.
 */
export function Card({
  children,
  onPress,
  padding = 'host',
  style,
  elevated = true,
}: CardProps) {
  const surfaceStyle: ViewStyle = {
    alignSelf: 'stretch',
    width: '100%',
    backgroundColor: C.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    ...resolvePadding(padding),
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
