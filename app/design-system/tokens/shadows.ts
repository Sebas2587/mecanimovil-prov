/**
 * Sistema de Sombras y Elevaciones MecaniMóvil - App Proveedores
 * Sombras consistentes basadas en Ink Black
 */

export const SHADOWS = {
  // ============================================
  // SIN SOMBRA
  // ============================================
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  // ============================================
  // SOMBRA PEQUEÑA
  // ============================================
  sm: {
    shadowColor: '#00171F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  // ============================================
  // SOMBRA MEDIANA
  // ============================================
  md: {
    shadowColor: '#00171F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // ============================================
  // SOMBRA GRANDE
  // ============================================
  lg: {
    shadowColor: '#00171F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  // ============================================
  // SOMBRA EXTRA GRANDE
  // ============================================
  xl: {
    shadowColor: '#00171F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },

  // ============================================
  // SOMBRAS ESPECIALES
  // ============================================
  inputFocus: {
    shadowColor: '#00A8E8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },

  button: {
    shadowColor: '#00171F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  cardElevated: {
    shadowColor: '#00171F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },

  modal: {
    shadowColor: '#00171F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },

  tooltip: {
    shadowColor: '#00171F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
} as const;

export default SHADOWS;

