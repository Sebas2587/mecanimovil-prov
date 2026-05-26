/**
 * Sistema de Bordes y Radios MecaniMóvil - App Proveedores
 * Bordes y radios consistentes
 */

// Definir valores de radio base primero para evitar problemas de inicialización
/** Radios alineados a DESIGN_PROVEEDORES_INSTITUCIONAL.md (card xl 24, inputs md 12, pill CTAs) */
const RADIUS_BASE = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 24,
  '3xl': 28,
  pill: 9999,
  full: 9999,
};

const WIDTH_BASE = {
  none: 0,
  thin: 1,
  medium: 2,
  thick: 4,
};

// Crear objeto radius con todas las propiedades
const radius = {
  ...RADIUS_BASE,
  button: {
    sm: 8,
    md: 12,
    lg: 16,
    full: 9999,
    pill: 9999,
  },
  input: {
    sm: 8,
    md: 12,
    lg: 16,
  },
  card: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  modal: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
  },
  avatar: {
    sm: 16,
    md: 24,
    lg: 32,
    full: 9999,
  },
  badge: {
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999,
  },
};

export const BORDERS = {
  // ============================================
  // RADIOS DE BORDE
  // ============================================
  radius: radius,

  // ============================================
  // ANCHOS DE BORDE
  // ============================================
  width: {
    ...WIDTH_BASE,
  },
} as const;

export default BORDERS;

