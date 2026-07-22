/**
 * Avatar Host (Airbnb Anfitriones): foto circular o iniciales en superficie soft.
 * Sin fill de marca ni icono genérico.
 */
import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { COLORS, TYPOGRAPHY } from '@/app/design-system/tokens';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

export type HostAvatarSize = 'sm' | 'md' | 'lg';

const SIZE_PX: Record<HostAvatarSize, number> = {
  sm: 32,
  md: 36,
  lg: 48,
};

function hostInitials(name?: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export type HostAvatarProps = {
  name?: string | null;
  uri?: string | null;
  size?: HostAvatarSize | number;
  style?: StyleProp<ViewStyle>;
};

export function HostAvatar({ name, uri, size = 'md', style }: HostAvatarProps) {
  const px = typeof size === 'number' ? size : SIZE_PX[size];
  const radius = px / 2;
  const initials = useMemo(() => hostInitials(name), [name]);
  const fontSize = px <= 32 ? TYPOGRAPHY.fontSize.xs : TYPOGRAPHY.fontSize.sm;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        accessibilityIgnoresInvertColors
        style={[
          styles.image,
          { width: px, height: px, borderRadius: radius },
          style as object,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: px, height: px, borderRadius: radius },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={name ? `Avatar de ${name}` : 'Avatar'}
    >
      <Text style={[styles.initials, { fontSize, lineHeight: Math.round(fontSize * 1.2) }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    backgroundColor: I.surfaceStrong,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.surfaceStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    flexShrink: 0,
  },
  initials: {
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
});
