import { COLORS } from '@/app/design-system/tokens';

const C = COLORS;

/**
 * Canvas Hosts — reemplaza blank glass institucional.
 * Superficie sólida Airbnb; sin gradientes decorativos.
 */
export const BLANK_GLASS = {
  gradient: [C.background.default, C.background.default, C.background.paper] as const,
  gradientLocations: [0, 0.5, 1] as const,
  glassBorder: C.border.light,
  blur: 0,
  primary: C.primary[500],
  primaryBorder: C.selection.border,
  primarySoft: C.selection.background,
  text: C.text.primary,
  textMuted: C.text.secondary,
  borderLight: C.border.light,
  cardBorder: C.border.light,
  white: C.background.paper,
  success: C.success.main,
  successSoft: C.success.light,
  canvas: C.background.default,
} as const;

export const GLASS_INSET = 16;
