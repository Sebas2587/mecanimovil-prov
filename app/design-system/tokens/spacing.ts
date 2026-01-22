/**
 * Sistema de Espaciado MecaniMóvil - App Proveedores
 * Espaciado consistente y responsivo
 */

import { Dimensions } from 'react-native';

// Obtener dimensiones de la pantalla para responsividad
// Validar que Dimensions esté disponible antes de usarlo
let SCREEN_WIDTH = 375; // Valor por defecto

try {
  const dimensions = Dimensions.get('window');
  if (dimensions && typeof dimensions.width === 'number') {
    SCREEN_WIDTH = dimensions.width;
  }
} catch (e) {
  console.warn('⚠️ Error obteniendo dimensiones de pantalla, usando valor por defecto:', e);
}

export const SPACING = {
  // ============================================
  // ESPACIADO BASE (Responsivo)
  // ============================================
  xs: SCREEN_WIDTH < 375 ? 3 : SCREEN_WIDTH >= 414 ? 5 : 4,
  sm: SCREEN_WIDTH < 375 ? 6 : SCREEN_WIDTH >= 414 ? 10 : 8,
  md: SCREEN_WIDTH < 375 ? 12 : SCREEN_WIDTH >= 414 ? 20 : 16,
  lg: SCREEN_WIDTH < 375 ? 18 : SCREEN_WIDTH >= 414 ? 30 : 24,
  xl: SCREEN_WIDTH < 375 ? 24 : SCREEN_WIDTH >= 414 ? 40 : 32,
  '2xl': SCREEN_WIDTH < 375 ? 36 : SCREEN_WIDTH >= 414 ? 60 : 48,
  '3xl': SCREEN_WIDTH < 375 ? 48 : SCREEN_WIDTH >= 414 ? 80 : 64,

  // ============================================
  // ESPACIADO FIJO (No responsivo)
  // ============================================
  fixed: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },

  // ============================================
  // ESPACIADO ESPECÍFICO
  // ============================================
  container: {
    // Padding horizontal optimizado para aprovechar mejor el espacio del dispositivo
    horizontal: SCREEN_WIDTH < 375 ? 16 : SCREEN_WIDTH >= 414 ? 20 : 18,
    vertical: SCREEN_WIDTH < 375 ? 12 : SCREEN_WIDTH >= 414 ? 20 : 16,
  },

  // Espaciado para contenido principal (mejor aprovechamiento del espacio)
  content: {
    horizontal: SCREEN_WIDTH < 375 ? 16 : SCREEN_WIDTH >= 414 ? 20 : 18,
    vertical: SCREEN_WIDTH < 375 ? 12 : SCREEN_WIDTH >= 414 ? 24 : 20,
  },

  section: SCREEN_WIDTH < 375 ? 18 : SCREEN_WIDTH >= 414 ? 30 : 24,
  listItem: SCREEN_WIDTH < 375 ? 8 : SCREEN_WIDTH >= 414 ? 12 : 10,
  
  // Card spacing mejorado
  cardPadding: SCREEN_WIDTH < 375 ? 14 : SCREEN_WIDTH >= 414 ? 20 : 16,
  cardGap: SCREEN_WIDTH < 375 ? 10 : SCREEN_WIDTH >= 414 ? 14 : 12,
  cardMargin: SCREEN_WIDTH < 375 ? 8 : SCREEN_WIDTH >= 414 ? 12 : 10,
  
  inputPadding: SCREEN_WIDTH < 375 ? 12 : SCREEN_WIDTH >= 414 ? 16 : 14,
  inputGap: 8,
  buttonPadding: {
    horizontal: SCREEN_WIDTH < 375 ? 16 : SCREEN_WIDTH >= 414 ? 24 : 20,
    vertical: SCREEN_WIDTH < 375 ? 12 : SCREEN_WIDTH >= 414 ? 16 : 14,
  },
  buttonGap: 8,
  headerPadding: {
    horizontal: SCREEN_WIDTH < 375 ? 16 : SCREEN_WIDTH >= 414 ? 20 : 18,
    vertical: SCREEN_WIDTH < 375 ? 12 : SCREEN_WIDTH >= 414 ? 16 : 14,
  },
} as const;

export default SPACING;

