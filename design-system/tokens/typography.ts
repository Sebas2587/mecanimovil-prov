/**
 * Tipografía — App Proveedores (Airbnb Hosts + Poppins)
 * Una sola familia en toda la UI. Carga en app/_layout.tsx.
 *
 * `monoMedium` es alias de Poppins Medium (legado Coinbase/JetBrains):
 * montos y % usan la misma fuente Host, no monoespaciada.
 */

export const TYPOGRAPHY = {
  fontFamily: {
    sansRegular: 'Poppins_400Regular',
    sansMedium: 'Poppins_500Medium',
    sansSemiBold: 'Poppins_600SemiBold',
    sansBold: 'Poppins_600SemiBold',
    /** @deprecated Alias Host — apunta a Poppins_500Medium (no JetBrains). */
    monoMedium: 'Poppins_500Medium',
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    bold: 'Poppins_600SemiBold',
  },
  fontSize: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
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
      fontSize: 30,
      fontWeight: '600',
      lineHeight: 1.2,
      letterSpacing: -0.3,
    },
    h1: {
      fontSize: 30,
      fontWeight: '600',
      lineHeight: 1.2,
      letterSpacing: -0.3,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 1.25,
      letterSpacing: -0.2,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 1.3,
      letterSpacing: 0,
    },
    h4: {
      fontSize: 17,
      fontWeight: '600',
      lineHeight: 1.35,
      letterSpacing: 0,
    },
    h5: {
      fontSize: 15,
      fontWeight: '500',
      lineHeight: 1.4,
      letterSpacing: 0,
    },
    h6: {
      fontSize: 13,
      fontWeight: '500',
      lineHeight: 1.4,
      letterSpacing: 0.5,
    },
    body: {
      fontSize: 15,
      fontWeight: '400',
      lineHeight: 1.5,
      letterSpacing: 0,
    },
    bodyBold: {
      fontSize: 15,
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
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 1.5,
      letterSpacing: 0,
    },
    small: {
      fontSize: 11,
      fontWeight: '400',
      lineHeight: 1.45,
      letterSpacing: 0,
    },
    button: {
      fontSize: 15,
      fontWeight: '600',
      lineHeight: 1.2,
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
      fontSize: 13,
      fontWeight: '500',
      lineHeight: 1.4,
      letterSpacing: 0.5,
    },
  },
} as const;

export default TYPOGRAPHY;
