/**
 * Sistema de Colores MecaniMóvil — App Proveedores
 * Alineado a DESIGN_PROVEEDORES_INSTITUCIONAL.md (adaptación RN).
 * Roles semánticos: COLORS.institutional + escalas primary / semantic legacy.
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
  // TOKENS INSTITUCIONALES (referencia única de marca RN)
  // ============================================
  institutional: {
    canvas: '#ffffff',
    surfaceSoft: '#f7f7f7',
    surfaceStrong: '#eef0f3',
    surfaceDark: '#0a0b0d',
    surfaceDarkElevated: '#16181c',
    ink: '#0a0b0d',
    body: '#5b616e',
    muted: '#7c828a',
    mutedSoft: '#a8acb3',
    hairline: '#dee1e6',
    hairlineSoft: '#eef0f3',
    primary: '#0052ff',
    primaryActive: '#003ecc',
    primaryDisabled: '#a8b8cc',
    onPrimary: '#ffffff',
    onDark: '#ffffff',
    onDarkSoft: '#a8acb3',
    semanticUp: '#05b169',
    semanticDown: '#cf202f',
    accentYellow: '#f4b000',
  },

  // ============================================
  // COLORES BASE (compat / referencia histórica)
  // ============================================

  base: {
    white: '#FFFFFF',
    inkBlack: '#0a0b0d',
    deepSpaceBlue: '#003459',
    cerulean: '#007EA7',
    freshSky: '#00A8E8',
  },

  // ============================================
  // PRIMARIOS — azul institucional (#0052ff)
  // ============================================
  primary: {
    50: '#EEF3FF',
    100: '#DDE8FF',
    200: '#B8CFFF',
    300: '#7AA8FF',
    400: '#3D7FFF',
    500: '#0052ff',
    600: '#003ecc',
    700: '#0030a3',
    800: '#002080',
    900: '#001866',
  },

  // ============================================
  // SECUNDARIOS — apoyo neutro frío (sin competir con primario)
  // ============================================
  secondary: {
    50: '#F4F5F7',
    100: '#E8EAEE',
    200: '#D2D6DD',
    300: '#AEB4BF',
    400: '#8E96A3',
    500: '#5b616e',
    600: '#494e59',
    700: '#383c44',
    800: '#26292e',
    900: '#141619',
  },

  // ============================================
  // ACENTO — mismo voltaje que primario (enlaces / highlights)
  // ============================================
  accent: {
    50: '#EEF3FF',
    100: '#DDE8FF',
    200: '#B8CFFF',
    300: '#7AA8FF',
    400: '#3D7FFF',
    500: '#0052ff',
    600: '#003ecc',
    700: '#0030a3',
    800: '#002080',
    900: '#001866',
  },

  // ============================================
  // COLORES NEUTROS (Ink Black + White)
  // ============================================
  neutral: {
    white: '#FFFFFF',
    inkBlack: '#0a0b0d',
    gray: {
      50: '#f7f7f7',
      100: '#eef0f3',
      200: '#dee1e6',
      300: '#c8ccd4',
      400: '#a8acb3',
      500: '#7c828a',
      600: '#5b616e',
      700: '#454951',
      800: '#2f3238',
      900: '#0a0b0d',
      950: '#0a0b0d',
    },
  },

  // ============================================
  // COLORES SEMÁNTICOS
  // Diseñados para armonizar con la paleta base
  // ============================================

  // SUCCESS — alineado a semantic-up institucional (#05b169)
  success: {
    light: '#E8F8F0',
    main: '#05b169',
    dark: '#048f56',
    darker: '#036b41',
    text: '#02422a',
    50: '#E8F8F0',
    100: '#D1F0E1',
    200: '#A3E1C3',
    300: '#75D2A5',
    400: '#47C387',
    500: '#05b169',
    600: '#048f56',
    700: '#036b41',
    800: '#02482c',
    900: '#012418',
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

  // ERROR — alineado a semantic-down institucional (#cf202f)
  error: {
    light: '#FDECEC',
    main: '#cf202f',
    dark: '#a61a26',
    darker: '#7d141d',
    text: '#4a0b10',
    50: '#FDECEC',
    100: '#FBD5D8',
    200: '#F7ABB1',
    300: '#F3818A',
    400: '#EF5763',
    500: '#cf202f',
    600: '#a61a26',
    700: '#7d141d',
    800: '#530e14',
    900: '#2a070a',
  },

  info: {
    light: '#EEF3FF',
    main: '#0052ff',
    dark: '#003ecc',
    darker: '#0030a3',
    text: '#001866',
    50: '#EEF3FF',
    100: '#DDE8FF',
    200: '#B8CFFF',
    300: '#7AA8FF',
    400: '#3D7FFF',
    500: '#0052ff',
    600: '#003ecc',
    700: '#0030a3',
    800: '#002080',
    900: '#001866',
  },

  // ============================================
  // COLORES DE TEXTO
  // ============================================
  text: {
    primary: '#0a0b0d',
    secondary: '#5b616e',
    tertiary: '#7c828a',
    disabled: '#a8acb3',
    inverse: '#FFFFFF',
    hint: '#7c828a',
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
    default: '#f7f7f7',
    paper: '#FFFFFF',
    elevated: '#FFFFFF',
    overlay: 'rgba(10, 11, 13, 0.58)',
    glass: 'rgba(255, 255, 255, 0.7)', // Glassmorphism
    glassDark: 'rgba(10, 11, 13, 0.72)',
    // Fondos semánticos
    success: '#E6F7F4',
    warning: '#FFF8E6',
    error: '#FFEBEE',
    info: '#EEF3FF',
  },

  // ============================================
  // COLORES DE BORDE
  // ============================================
  border: {
    light: '#eef0f3',
    main: '#dee1e6',
    dark: '#c8ccd4',
    focus: '#0052ff',
    error: '#cf202f',
    success: '#05b169',
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
      background: 'rgba(10, 11, 13, 0.72)',
      border: 'rgba(255, 255, 255, 0.12)',
      shadow: 'rgba(10, 11, 13, 0.25)',
    },
    accent: {
      background: 'rgba(0, 82, 255, 0.78)',
      border: 'rgba(255, 255, 255, 0.28)',
      shadow: 'rgba(0, 82, 255, 0.22)',
    },
    primary: {
      background: 'rgba(0, 62, 204, 0.82)',
      border: 'rgba(255, 255, 255, 0.28)',
      shadow: 'rgba(10, 11, 13, 0.28)',
    },
  },

  // ============================================
  // GRADIENTES
  // Para efectos visuales que mantienen la armonía
  // ============================================
  gradients: {
    primary: ['#0052ff', '#003ecc'],
    secondary: ['#eef0f3', '#ffffff'],
    accent: ['#0052ff', '#05b169'],
    ocean: ['#003ecc', '#0052ff', '#7AA8FF'],
    sunset: ['#0052ff', '#f4b000'],
    calm: ['#f7f7f7', '#ffffff'],
    dark: ['#0a0b0d', '#16181c'],
  },

  // ============================================
  // ESTADOS DE INTERACCIÓN
  // ============================================
  states: {
    hover: {
      primary: '#003ecc',
      secondary: '#494e59',
      accent: '#003ecc',
    },
    pressed: {
      primary: '#0030a3',
      secondary: '#383c44',
      accent: '#0030a3',
    },
    disabled: {
      background: '#eef0f3',
      text: '#a8acb3',
      border: '#dee1e6',
    },
    focus: {
      ring: '#0052ff',
      ringOpacity: 0.28,
    },
  },
} as const;

export default COLORS;
