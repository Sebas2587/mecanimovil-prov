/**
 * Safe Helpers - MecaniMóvil App Proveedores
 * Funciones reutilizables para acceder a tokens de forma segura con fallbacks
 * Previene ReferenceError cuando los tokens no están completamente inicializados
 */

import { TYPOGRAPHY } from './typography';

/**
 * Obtiene TYPOGRAPHY de forma segura con validaciones exhaustivas
 * Retorna siempre un objeto válido, nunca undefined
 */
export const getSafeTypography = () => {
  try {
    if (
      TYPOGRAPHY &&
      typeof TYPOGRAPHY === 'object' &&
      TYPOGRAPHY?.fontSize &&
      typeof TYPOGRAPHY.fontSize === 'object' &&
      TYPOGRAPHY?.fontWeight &&
      typeof TYPOGRAPHY.fontWeight === 'object' &&
      typeof TYPOGRAPHY.fontSize?.xs !== 'undefined' &&
      typeof TYPOGRAPHY.fontSize?.sm !== 'undefined' &&
      typeof TYPOGRAPHY.fontSize?.md !== 'undefined' &&
      typeof TYPOGRAPHY.fontSize?.['2xl'] !== 'undefined' &&
      typeof TYPOGRAPHY.fontWeight?.semibold !== 'undefined'
    ) {
      return TYPOGRAPHY;
    }
  } catch (e) {
    console.warn('⚠️ Error accessing TYPOGRAPHY, using fallback:', e);
  }

  // Fallback completo con valores por defecto
  return {
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
  };
};

/**
 * Valida que un objeto de typography sea válido
 */
export const isValidTypography = (typography: any): boolean => {
  try {
    return (
      typography &&
      typeof typography === 'object' &&
      typography?.fontSize &&
      typeof typography.fontSize === 'object' &&
      typography?.fontWeight &&
      typeof typography.fontWeight === 'object' &&
      typeof typography.fontSize?.xs !== 'undefined' &&
      typeof typography.fontSize?.['2xl'] !== 'undefined'
    );
  } catch (e) {
    return false;
  }
};

export default {
  getSafeTypography,
  isValidTypography,
};

