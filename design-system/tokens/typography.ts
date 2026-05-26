/**
 * Tipografía — App Proveedores (DESIGN_PROVEEDORES_INSTITUCIONAL.md)
 * Inter sustituto sans; JetBrains Mono para tabular.
 * Carga real en app/_layout.tsx (@expo-google-fonts).
 *
 * IMPORTANTE: Sin lógica condicional (Hermes).
 */

export const TYPOGRAPHY = {
  fontFamily: {
    sansRegular: 'Inter_400Regular',
    sansMedium: 'Inter_500Medium',
    sansSemiBold: 'Inter_600SemiBold',
    sansBold: 'Inter_700Bold',
    monoMedium: 'JetBrainsMono_500Medium',
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    bold: 'Inter_700Bold',
  },
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 36,
  },
  fontWeight: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },
  letterSpacing: {
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.25,
    wider: 0.5,
  },
  styles: {
    display: {
      fontSize: 28,
      fontWeight: '400',
      lineHeight: 1.13,
      letterSpacing: -0.35,
    },
    h1: {
      fontSize: 28,
      fontWeight: '400',
      lineHeight: 1.13,
      letterSpacing: -0.35,
    },
    h2: {
      fontSize: 24,
      fontWeight: '400',
      lineHeight: 1.15,
      letterSpacing: -0.3,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 1.33,
      letterSpacing: 0,
    },
    h4: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 1.33,
      letterSpacing: 0,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 1.5,
      letterSpacing: 0,
    },
    bodyBold: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 1.5,
      letterSpacing: 0,
    },
    caption: {
      fontSize: 13,
      fontWeight: '400',
      lineHeight: 1.5,
      letterSpacing: 0,
    },
    captionBold: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 1.5,
      letterSpacing: 0,
    },
    small: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 1.5,
      letterSpacing: 0,
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 1.15,
      letterSpacing: 0,
    },
    navLink: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 1.4,
      letterSpacing: 0,
    },
    numberDisplay: {
      fontSize: 18,
      fontWeight: '500',
      lineHeight: 1.4,
      letterSpacing: 0,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 1.4,
      letterSpacing: 0,
    },
  },
} as const;

export default TYPOGRAPHY;

