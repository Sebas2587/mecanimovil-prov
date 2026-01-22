/**
 * Sistema de Tipografía MecaniMóvil - App Proveedores
 * Escala tipográfica consistente
 * 
 * IMPORTANTE: Este archivo NO debe tener ninguna lógica condicional
 * para evitar problemas con el motor Hermes de React Native
 * Todos los valores están definidos como constantes inmutables
 */

export const TYPOGRAPHY = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
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
    h1: {
      fontSize: 28,
      fontWeight: '700',
      lineHeight: 1.2,
      letterSpacing: -0.25,
    },
    h2: {
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 1.2,
      letterSpacing: -0.25,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 1.3,
      letterSpacing: -0.25,
    },
    h4: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 1.4,
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
      fontSize: 14,
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
      lineHeight: 1.2,
      letterSpacing: 0.25,
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

