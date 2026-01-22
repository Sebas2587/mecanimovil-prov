/**
 * Sistema de Colores MecaniMóvil
 * Basado en paleta de transparencia, calma, confianza, profesionalismo y claridad
 * 
 * Paleta Base:
 * - White: #FFFFFF
 * - Ink Black: #00171F
 * - Deep Space Blue: #003459
 * - Cerulean: #007EA7
 * - Fresh Sky: #00A8E8
 */

/**
 * Aplica opacidad a un color hexadecimal
 * @param color - Color en formato hexadecimal (#RRGGBB)
 * @param opacity - Opacidad entre 0 y 1
 * @returns Color en formato rgba
 */
export const withOpacity = (color: string, opacity: number): string => {
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
};

/**
 * Obtiene un color de la paleta con opacidad
 * @param path - Ruta al color (ej: 'primary.500')
 * @param opacity - Opacidad entre 0 y 1
 * @returns Color con opacidad
 */
export const getColorWithOpacity = (path: string, opacity: number): string => {
  const keys = path.split('.');
  let color: any = COLORS;
  for (const key of keys) {
    color = color[key];
    if (!color) return '#000000';
  }
  if (typeof color !== 'string') return '#000000';
  return withOpacity(color, opacity);
};

export const COLORS = {
  // ============================================
  // COLORES BASE DE LA PALETA
  // ============================================

  base: {
    white: '#FFFFFF',
    inkBlack: '#00171F',      // Ultra-dark con hint de azul
    deepSpaceBlue: '#003459', // Azul oscuro profundo, cosmos
    cerulean: '#007EA7',      // Azul-verde vibrante, vida y libertad
    freshSky: '#00A8E8',      // Cian brillante, optimismo y frescura
  },

  // ============================================
  // COLORES PRIMARIOS (Deep Space Blue)
  // Inspiración: cosmos, ambición, misterio estrellado
  // ============================================
  primary: {
    50: '#E6F2F7',   // Muy claro, casi blanco con tinte azul
    100: '#CCE5EF',
    200: '#99CBE0',
    300: '#66B1D0',
    400: '#3397C1',
    500: '#003459',  // Color principal - Deep Space Blue
    600: '#002A47',
    700: '#002035',
    800: '#001524',
    900: '#000B12',
  },

  // ============================================
  // COLORES SECUNDARIOS (Cerulean)
  // Inspiración: vida, libertad, conocimiento
  // ============================================
  secondary: {
    50: '#E6F5F9',
    100: '#CCEBF3',
    200: '#99D7E7',
    300: '#66C3DB',
    400: '#33AFCF',
    500: '#007EA7',  // Color secundario principal - Cerulean
    600: '#006586',
    700: '#004C65',
    800: '#003344',
    900: '#001A23',
  },

  // ============================================
  // COLORES DE ACENTO (Fresh Sky)
  // Inspiración: optimismo, frescura, cielos abiertos
  // ============================================
  accent: {
    50: '#E6F7FC',
    100: '#CCEFF9',
    200: '#99DFF3',
    300: '#66CFED',
    400: '#33BFE7',
    500: '#00A8E8',  // Color de acento principal - Fresh Sky
    600: '#0086BA',
    700: '#00648B',
    800: '#00425D',
    900: '#00212E',
  },

  // ============================================
  // COLORES NEUTROS (Ink Black + White)
  // ============================================
  neutral: {
    white: '#FFFFFF',
    inkBlack: '#00171F',
    gray: {
      50: '#F5F7F8',   // Casi blanco con tinte azul muy sutil
      100: '#EBEFF1',
      200: '#D7DFE3',
      300: '#C3CFD5',
      400: '#AFBFC7',
      500: '#9BAFB9',  // Gris medio
      600: '#7C8F97',
      700: '#5D6F75',
      800: '#3E4F53',
      900: '#1F2F31',
      950: '#00171F',  // Ink Black
    },
  },

  // ============================================
  // COLORES SEMÁNTICOS
  // Diseñados para armonizar con la paleta base
  // ============================================

  // SUCCESS - Verde esmeralda/turquesa que complementa los azules
  success: {
    light: '#E6F7F4',      // Fondo muy claro
    main: '#00C9A7',       // Verde turquesa vibrante
    dark: '#00997A',       // Verde más oscuro
    darker: '#006B57',     // Verde muy oscuro
    text: '#003D32',       // Texto sobre success
    // Variaciones completas
    50: '#E6F7F4',
    100: '#CCEFE9',
    200: '#99DFD3',
    300: '#66CFBD',
    400: '#33BFA7',
    500: '#00C9A7',  // Principal
    600: '#00A186',
    700: '#007965',
    800: '#005144',
    900: '#002923',
  },

  // WARNING - Amarillo suave con tinte dorado que no rompe la armonía
  warning: {
    light: '#FFF8E6',      // Fondo muy claro
    main: '#FFB84D',       // Amarillo dorado suave
    dark: '#E6A044',       // Amarillo más oscuro
    darker: '#CC883B',     // Amarillo muy oscuro
    text: '#664422',       // Texto sobre warning
    // Variaciones completas
    50: '#FFF8E6',
    100: '#FFF1CC',
    200: '#FFE399',
    300: '#FFD566',
    400: '#FFC733',
    500: '#FFB84D',  // Principal
    600: '#E6A044',
    700: '#CC883B',
    800: '#B37032',
    900: '#995829',
  },

  // ERROR - Rojo coral suave con toque azulado para armonía
  error: {
    light: '#FFEBEE',      // Fondo muy claro
    main: '#FF6B6B',       // Rojo coral suave
    dark: '#E64A4A',       // Rojo más oscuro
    darker: '#CC3939',     // Rojo muy oscuro
    text: '#8B1A1A',       // Texto sobre error
    // Variaciones completas
    50: '#FFEBEE',
    100: '#FFD7D7',
    200: '#FFAFAF',
    300: '#FF8787',
    400: '#FF5F5F',
    500: '#FF6B6B',  // Principal
    600: '#E64A4A',
    700: '#CC3939',
    800: '#B32828',
    900: '#991717',
  },

  // INFO - Usa directamente Cerulean para consistencia
  info: {
    light: '#E6F5F9',      // Fondo muy claro
    main: '#007EA7',       // Cerulean - mismo que secondary
    dark: '#006586',       // Cerulean oscuro
    darker: '#004C65',     // Cerulean muy oscuro
    text: '#003344',       // Texto sobre info
    // Variaciones completas (igual que secondary)
    50: '#E6F5F9',
    100: '#CCEBF3',
    200: '#99D7E7',
    300: '#66C3DB',
    400: '#33AFCF',
    500: '#007EA7',  // Principal
    600: '#006586',
    700: '#004C65',
    800: '#003344',
    900: '#001A23',
  },

  // ============================================
  // COLORES DE TEXTO
  // ============================================
  text: {
    primary: '#00171F',        // Ink Black - máximo contraste
    secondary: '#3E4F53',      // Gris oscuro - neutral.gray[800]
    tertiary: '#5D6F75',       // Gris medio - neutral.gray[700]
    disabled: '#9BAFB9',      // Gris claro - neutral.gray[500]
    inverse: '#FFFFFF',        // Blanco para fondos oscuros
    hint: '#7C8F97',          // Gris para hints - neutral.gray[600]
    // Colores semánticos de texto
    onPrimary: '#FFFFFF',      // Texto sobre primary
    onSecondary: '#FFFFFF',     // Texto sobre secondary
    onAccent: '#FFFFFF',       // Texto sobre accent
    onSuccess: '#003D32',      // Texto sobre success
    onWarning: '#664422',      // Texto sobre warning
    onError: '#8B1A1A',        // Texto sobre error
    onInfo: '#003344',         // Texto sobre info
  },

  // ============================================
  // COLORES DE FONDO
  // ============================================
  background: {
    default: '#F5F7F8',        // neutral.gray[50] - fondo principal
    paper: '#FFFFFF',          // Blanco para cards y superficies
    elevated: '#FFFFFF',       // Blanco para elementos elevados
    overlay: 'rgba(0, 23, 31, 0.6)',  // Ink Black con opacidad
    glass: 'rgba(255, 255, 255, 0.7)', // Glassmorphism
    glassDark: 'rgba(0, 52, 89, 0.7)', // Glassmorphism oscuro
    // Fondos semánticos
    success: '#E6F7F4',
    warning: '#FFF8E6',
    error: '#FFEBEE',
    info: '#E6F5F9',
  },

  // ============================================
  // COLORES DE BORDE
  // ============================================
  border: {
    light: '#D7DFE3',          // neutral.gray[200] - bordes sutiles
    main: '#C3CFD5',          // neutral.gray[300] - bordes estándar
    dark: '#9BAFB9',          // neutral.gray[500] - bordes destacados
    focus: '#00A8E8',         // accent[500] - borde de foco
    error: '#FF6B6B',         // error[500] - borde de error
    success: '#00C9A7',       // success[500] - borde de éxito
  },

  // ============================================
  // OPACIDADES PREDEFINIDAS
  // Para uso con cualquier color
  // ============================================
  opacity: {
    5: 0.05,
    10: 0.1,
    20: 0.2,
    30: 0.3,
    40: 0.4,
    50: 0.5,
    60: 0.6,
    70: 0.7,
    80: 0.8,
    90: 0.9,
    95: 0.95,
  },

  // ============================================
  // EFECTOS GLASSMÓRFICOS
  // Basados en la paleta para transparencia y calma
  // ============================================
  glass: {
    // Glass claro (sobre fondos oscuros)
    light: {
      background: 'rgba(255, 255, 255, 0.7)',
      border: 'rgba(255, 255, 255, 0.2)',
      shadow: 'rgba(0, 23, 31, 0.1)',
    },
    // Glass oscuro (sobre fondos claros)
    dark: {
      background: 'rgba(0, 52, 89, 0.7)',
      border: 'rgba(0, 168, 232, 0.2)',
      shadow: 'rgba(0, 23, 31, 0.2)',
    },
    // Glass con acento
    accent: {
      background: 'rgba(0, 168, 232, 0.8)',
      border: 'rgba(255, 255, 255, 0.3)',
      shadow: 'rgba(0, 168, 232, 0.3)',
    },
    // Glass primary
    primary: {
      background: 'rgba(0, 52, 89, 0.8)',
      border: 'rgba(0, 168, 232, 0.3)',
      shadow: 'rgba(0, 23, 31, 0.3)',
    },
  },

  // ============================================
  // GRADIENTES
  // Para efectos visuales que mantienen la armonía
  // ============================================
  gradients: {
    primary: ['#003459', '#007EA7'],           // Deep Space Blue → Cerulean
    secondary: ['#007EA7', '#00A8E8'],          // Cerulean → Fresh Sky
    accent: ['#00A8E8', '#00C9A7'],             // Fresh Sky → Success
    ocean: ['#003459', '#007EA7', '#00A8E8'],   // Tríptico azul
    sunset: ['#00A8E8', '#FFB84D'],             // Fresh Sky → Warning
    calm: ['#E6F5F9', '#FFFFFF'],              // Fondo suave
    dark: ['#00171F', '#003459'],               // Ink Black → Deep Space Blue
  },

  // ============================================
  // ESTADOS DE INTERACCIÓN
  // ============================================
  states: {
    hover: {
      primary: '#002A47',      // primary[600]
      secondary: '#006586',    // secondary[600]
      accent: '#0086BA',      // accent[600]
    },
    pressed: {
      primary: '#002035',      // primary[700]
      secondary: '#004C65',    // secondary[700]
      accent: '#00648B',      // accent[700]
    },
    disabled: {
      background: '#EBEFF1',   // neutral.gray[100]
      text: '#9BAFB9',        // neutral.gray[500]
      border: '#D7DFE3',      // neutral.gray[200]
    },
    focus: {
      ring: '#00A8E8',        // accent[500]
      ringOpacity: 0.3,
    },
  },
} as const;

export default COLORS;
