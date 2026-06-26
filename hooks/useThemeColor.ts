import { COLORS } from '@/app/design-system/tokens';
import { useColorScheme } from '@/hooks/useColorScheme';

const I = COLORS.institutional;

const palette = {
  light: {
    text: I.ink,
    background: I.canvas,
    tint: I.primary,
    icon: I.muted,
    tabIconDefault: I.muted,
    tabIconSelected: I.primary,
  },
  dark: {
    text: I.onDark,
    background: I.surfaceDark,
    tint: I.primary,
    icon: I.onDarkSoft,
    tabIconDefault: I.onDarkSoft,
    tabIconSelected: I.primary,
  },
} as const;

export type ThemeColorName = keyof typeof palette.light;

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: ThemeColorName,
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }

  return palette[theme][colorName];
}
