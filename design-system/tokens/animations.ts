/**
 * Sistema de Animaciones MecaniMóvil - App Proveedores
 * Duraciones y funciones de easing consistentes
 */

export const ANIMATIONS = {
  // ============================================
  // DURACIONES
  // ============================================
  duration: {
    instant: 0,
    fast: 100,
    short: 150,
    medium: 300,
    long: 500,
    veryLong: 800,
  },

  // ============================================
  // FUNCIONES DE EASING
  // ============================================
  easing: {
    easeInOut: 'ease-in-out',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    linear: 'linear',
    standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
  },

  // ============================================
  // CONFIGURACIONES PREDEFINIDAS
  // ============================================
  presets: {
    quick: {
      duration: 150,
      easing: 'ease-out',
    },
    standard: {
      duration: 300,
      easing: 'ease-in-out',
    },
    slow: {
      duration: 500,
      easing: 'ease-in-out',
    },
    modal: {
      duration: 300,
      easing: 'ease-out',
    },
    tooltip: {
      duration: 200,
      easing: 'ease-out',
    },
    button: {
      duration: 150,
      easing: 'ease-out',
    },
    card: {
      duration: 300,
      easing: 'ease-in-out',
    },
  },
} as const;

export default ANIMATIONS;

