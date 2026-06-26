import { COLORS, withOpacity } from '@/app/design-system/tokens';

const I = COLORS.institutional;

/**
 * Blank glass + UI chrome compartido con `app/(tabs)/index.tsx` y pantallas derivadas.
 * Colores alineados a tokens institucionales.
 */
export const BLANK_GLASS = {
  gradient: [I.surfaceStrong, I.surfaceSoft, I.canvas] as const,
  gradientLocations: [0, 0.35, 1] as const,
  glassBorder: withOpacity(I.canvas, 0.6),
  blur: 60,
  primary: I.primary,
  primaryBorder: COLORS.primary[100],
  primarySoft: COLORS.primary[50],
  text: I.ink,
  textMuted: I.body,
  borderLight: I.hairline,
  cardBorder: I.hairlineSoft,
  white: I.canvas,
  /** Éxito / dinero positivo */
  success: COLORS.success.main,
  successSoft: COLORS.success.light,
} as const;

export const GLASS_INSET = 20;
