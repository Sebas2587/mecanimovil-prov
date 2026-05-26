/**
 * Blank glass + UI chrome compartido con `app/(tabs)/index.tsx` y pantallas derivadas.
 * Primario de acción: azul UI (#2563EB), no el primary[500] del token de marca.
 */
export const BLANK_GLASS = {
  gradient: ['#F3F5F8', '#FAFBFC', '#FFFFFF'] as const,
  gradientLocations: [0, 0.35, 1] as const,
  glassBorder: 'rgba(255,255,255,0.6)',
  blur: 60,
  primary: '#2563EB',
  primaryBorder: '#DBEAFE',
  primarySoft: '#EFF6FF',
  text: '#111827',
  textMuted: '#6B7280',
  borderLight: '#E5E7EB',
  cardBorder: '#F3F4F6',
  white: '#FFFFFF',
  /** Éxito / dinero positivo (alineado a index — emerald) */
  success: '#059669',
  successSoft: '#D1FAE5',
} as const;

export const GLASS_INSET = 20;
