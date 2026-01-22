/**
 * Exportaciones Centralizadas de Tokens
 * Punto único de entrada para todos los tokens del sistema de diseño
 * Sistema de exportación seguro con validaciones y fallbacks
 */

// Exportaciones nombradas directas
export { COLORS, withOpacity, getColorWithOpacity } from './colors';
export { default as COLORS_DEFAULT } from './colors';

export { TYPOGRAPHY } from './typography';
export { default as TYPOGRAPHY_DEFAULT } from './typography';

export { SPACING } from './spacing';
export { default as SPACING_DEFAULT } from './spacing';

export { SHADOWS } from './shadows';
export { default as SHADOWS_DEFAULT } from './shadows';

export { BORDERS } from './borders';
export { default as BORDERS_DEFAULT } from './borders';

export { ANIMATIONS } from './animations';
export { default as ANIMATIONS_DEFAULT } from './animations';

// Exportar helpers seguros
export { getSafeTypography, isValidTypography } from './safeHelpers';

// Importaciones con manejo seguro para el objeto TOKENS consolidado
import { COLORS as COLORS_IMPORT } from './colors';
import { TYPOGRAPHY as TYPOGRAPHY_IMPORT } from './typography';
import { SPACING as SPACING_IMPORT } from './spacing';
import { SHADOWS as SHADOWS_IMPORT } from './shadows';
import { BORDERS as BORDERS_IMPORT } from './borders';
import { ANIMATIONS as ANIMATIONS_IMPORT } from './animations';

// Variables locales con validación
let COLORS_LOCAL: any = {};
let TYPOGRAPHY_LOCAL: any = {};
let SPACING_LOCAL: any = {};
let SHADOWS_LOCAL: any = {};
let BORDERS_LOCAL: any = {};
let ANIMATIONS_LOCAL: any = {};

// Validar e inicializar COLORS
try {
  if (COLORS_IMPORT && typeof COLORS_IMPORT === 'object' && Object.keys(COLORS_IMPORT).length > 0) {
    COLORS_LOCAL = COLORS_IMPORT;
  }
} catch (e) {
  console.error('❌ Error importing COLORS:', e);
  COLORS_LOCAL = {};
}

// Validar e inicializar TYPOGRAPHY
try {
  if (
    TYPOGRAPHY_IMPORT &&
    typeof TYPOGRAPHY_IMPORT === 'object' &&
    TYPOGRAPHY_IMPORT?.fontSize &&
    typeof TYPOGRAPHY_IMPORT.fontSize === 'object' &&
    typeof TYPOGRAPHY_IMPORT.fontSize?.xs !== 'undefined'
  ) {
    TYPOGRAPHY_LOCAL = TYPOGRAPHY_IMPORT;
  }
} catch (e) {
  console.error('❌ Error importing TYPOGRAPHY:', e);
  TYPOGRAPHY_LOCAL = {};
}

// Validar e inicializar SPACING
try {
  if (SPACING_IMPORT && typeof SPACING_IMPORT === 'object' && typeof SPACING_IMPORT.md !== 'undefined') {
    SPACING_LOCAL = SPACING_IMPORT;
  }
} catch (e) {
  console.error('❌ Error importing SPACING:', e);
  SPACING_LOCAL = {};
}

// Validar e inicializar SHADOWS
try {
  if (SHADOWS_IMPORT && typeof SHADOWS_IMPORT === 'object' && SHADOWS_IMPORT?.sm) {
    SHADOWS_LOCAL = SHADOWS_IMPORT;
  }
} catch (e) {
  console.error('❌ Error importing SHADOWS:', e);
  SHADOWS_LOCAL = {};
}

// Validar e inicializar BORDERS
try {
  if (
    BORDERS_IMPORT &&
    typeof BORDERS_IMPORT === 'object' &&
    BORDERS_IMPORT?.radius &&
    typeof BORDERS_IMPORT.radius?.full !== 'undefined'
  ) {
    BORDERS_LOCAL = BORDERS_IMPORT;
  }
} catch (e) {
  console.error('❌ Error importing BORDERS:', e);
  BORDERS_LOCAL = {};
}

// Validar e inicializar ANIMATIONS
try {
  if (ANIMATIONS_IMPORT && typeof ANIMATIONS_IMPORT === 'object' && ANIMATIONS_IMPORT?.duration) {
    ANIMATIONS_LOCAL = ANIMATIONS_IMPORT;
  }
} catch (e) {
  console.error('❌ Error importing ANIMATIONS:', e);
  ANIMATIONS_LOCAL = {};
}

// Objeto TOKENS consolidado con todas las validaciones
export const TOKENS = {
  colors: COLORS_LOCAL || {},
  typography: TYPOGRAPHY_LOCAL || {},
  spacing: SPACING_LOCAL || {},
  shadows: SHADOWS_LOCAL || {},
  borders: BORDERS_LOCAL || {},
  animations: ANIMATIONS_LOCAL || {},
};

// Log de inicialización para depuración
try {
  const hasColors = !!(TOKENS?.colors) && Object.keys(TOKENS?.colors || {}).length > 0;
  const hasTypography = !!(TOKENS?.typography) && Object.keys(TOKENS?.typography || {}).length > 0;
  const hasSpacing = !!(TOKENS?.spacing) && Object.keys(TOKENS?.spacing || {}).length > 0;
  const hasShadows = !!(TOKENS?.shadows) && Object.keys(TOKENS?.shadows || {}).length > 0;
  const hasBorders = !!(TOKENS?.borders) && Object.keys(TOKENS?.borders || {}).length > 0;
  const hasAnimations = !!(TOKENS?.animations) && Object.keys(TOKENS?.animations || {}).length > 0;

  console.log('✅ Design System TOKENS initialized:', {
    hasColors,
    hasTypography,
    hasSpacing,
    hasShadows,
    hasBorders,
    hasAnimations,
  });
} catch (e) {
  // Silently fail if logging causes issues
}

export default TOKENS;

