/**
 * Sistema de Colores MecaniMóvil — App Proveedores
 * Paleta Tinder + superficies Airbnb Hosts.
 * Roles semánticos: https://paletacolorpro.com/en/ui-ux-palette-guide
 *
 * `COLORS.institutional` mantiene aliases para cascada sin rewrite masivo.
 */

export const withOpacity = (color: string, opacity: number): string => {
  if (typeof color !== 'string' || !color.startsWith('#')) return color;
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const getColorWithOpacity = (path: string, opacity: number): string => {
  const keys = path.split('.');
  let color: any = COLORS;
  for (const key of keys) {
    color = color?.[key];
    if (color == null) return '#3B3B3B';
  }
  if (typeof color !== 'string') return '#3B3B3B';
  return withOpacity(color, opacity);
};

const MAGENTA = '#FD2B7B';
const ORANGE = '#FF7158';
const INK = '#3B3B3B';
const CANVAS = '#F9F9F9';
const TONAL = '#F3F3F3';
const TAB_MUTED = '#B8B8B8';
const ICON_DEFAULT = '#757575';
const SOFT = '#FFF0F5';
const HAIRLINE = '#E8E8E8';
const SUCCESS = '#0d9f6e';
const ERROR = '#d93049';
const WARNING = '#e6a817';

export const COLORS = {
  base: {
    white: '#FFFFFF',
    inkBlack: INK,
    deepSpaceBlue: INK,
    canvas: CANVAS,
    soft: SOFT,
  },

  brand: {
    magenta: MAGENTA,
    orange: ORANGE,
  },

  warm: ORANGE,

  /** Aliases legacy — mapeados a paleta Hosts/Tinder */
  institutional: {
    canvas: CANVAS,
    surfaceSoft: TONAL,
    surfaceStrong: '#E8E8E8',
    surfaceDark: INK,
    surfaceDarkElevated: '#2A2A2A',
    ink: INK,
    body: ICON_DEFAULT,
    muted: TAB_MUTED,
    mutedSoft: '#C4C4C4',
    hairline: HAIRLINE,
    hairlineSoft: TONAL,
    primary: MAGENTA,
    primaryActive: '#E01A66',
    primaryDisabled: '#FFB8D4',
    onPrimary: '#FFFFFF',
    onDark: '#FFFFFF',
    onDarkSoft: TAB_MUTED,
    semanticUp: SUCCESS,
    semanticDown: ERROR,
    accentYellow: WARNING,
  },

  primary: {
    50: SOFT,
    100: '#FFE0EC',
    200: '#FFB8D4',
    300: '#FF85B4',
    400: '#FE528F',
    500: MAGENTA,
    600: '#E01A66',
    700: '#C2185B',
    800: '#9C1449',
    900: '#701035',
  },

  secondary: {
    50: '#FFF1F2',
    100: '#FFE2E5',
    200: '#FFC5CB',
    300: '#FF9AA5',
    400: '#FD6F7D',
    500: '#FD5564',
    600: '#E63D4F',
    700: '#C22D3D',
    800: '#9E2432',
    900: '#7A1C27',
  },

  accent: {
    50: '#FFF5F2',
    100: '#FFE8E2',
    200: '#FFD0C4',
    300: '#FFB09A',
    400: '#FF8F72',
    500: ORANGE,
    600: '#E85A40',
    700: '#C44832',
    800: '#9E3928',
    900: '#782B1E',
  },

  neutral: {
    white: '#FFFFFF',
    inkBlack: INK,
    gray: {
      50: CANVAS,
      100: TONAL,
      200: HAIRLINE,
      300: TAB_MUTED,
      400: '#9E9E9E',
      500: ICON_DEFAULT,
      600: '#616161',
      700: INK,
      800: '#2A2A2A',
      900: '#1A1A1A',
      950: INK,
    },
  },

  success: {
    light: '#e6f7ef',
    main: SUCCESS,
    dark: '#0a7f58',
    darker: '#075f42',
    text: INK,
    badge: '#e6f7ef',
    badgeText: SUCCESS,
    50: '#e6f7ef',
    100: '#ccefdf',
    200: '#99dfbf',
    300: '#66cf9f',
    400: '#33bf7f',
    500: SUCCESS,
    600: '#0a7f58',
    700: '#075f42',
    800: '#05402c',
    900: '#032016',
  },

  warning: {
    light: '#fff8e6',
    main: WARNING,
    dark: '#b88612',
    darker: '#8a650d',
    text: INK,
    50: '#fff8e6',
    100: '#fff1cc',
    200: '#ffe399',
    300: '#ffd566',
    400: '#ffc733',
    500: WARNING,
    600: '#b88612',
    700: '#8a650d',
    800: '#5c4309',
    900: '#2e2104',
  },

  error: {
    light: '#fde8ea',
    main: ERROR,
    dark: '#ae263a',
    darker: '#831c2b',
    text: INK,
    50: '#fde8ea',
    100: '#fbd1d5',
    200: '#f7a3ab',
    300: '#f37581',
    400: '#ef4757',
    500: ERROR,
    600: '#ae263a',
    700: '#831c2b',
    800: '#58121c',
    900: '#2d090e',
  },

  info: {
    light: SOFT,
    main: MAGENTA,
    dark: '#C2185B',
    darker: '#9C1449',
    text: INK,
    badge: SOFT,
    badgeText: MAGENTA,
    50: SOFT,
    100: '#FFE0EC',
    200: '#FFB8D4',
    300: '#FF85B4',
    400: '#FE528F',
    500: MAGENTA,
    600: '#E01A66',
    700: '#C2185B',
    800: '#9C1449',
    900: '#701035',
  },

  text: {
    primary: INK,
    secondary: ICON_DEFAULT,
    tertiary: TAB_MUTED,
    disabled: '#C4C4C4',
    inverse: '#FFFFFF',
    hint: TAB_MUTED,
    onPrimary: '#FFFFFF',
    onSecondary: INK,
    onAccent: '#FFFFFF',
    onSuccess: INK,
    onWarning: INK,
    onError: '#FFFFFF',
    onInfo: INK,
  },

  background: {
    default: CANVAS,
    paper: '#FFFFFF',
    elevated: '#FFFFFF',
    secondary: TONAL,
    overlay: withOpacity(INK, 0.45),
    glass: CANVAS,
    glassDark: withOpacity(INK, 0.72),
    success: '#e6f7ef',
    warning: '#fff8e6',
    error: '#fde8ea',
    info: SOFT,
  },

  border: {
    light: HAIRLINE,
    main: '#E0E0E0',
    dark: TAB_MUTED,
    focus: MAGENTA,
    error: ERROR,
    success: SUCCESS,
  },

  icon: {
    default: ICON_DEFAULT,
    /** Activo UI = brand Tinder (magenta), no naranja suelto. */
    active: MAGENTA,
    muted: TAB_MUTED,
  },

  tab: {
    unselected: TAB_MUTED,
    unselectedBg: TONAL,
    selectedBg: '#FFFFFF',
    /** Tab bar Airbnb paper + acento Tinder (10% brand). */
    selectedText: MAGENTA,
    selectedBorder: MAGENTA,
    selectedOnFill: '#FFFFFF',
  },

  buttonSecondary: {
    background: TONAL,
    backgroundPaper: '#FFFFFF',
    text: INK,
    border: HAIRLINE,
    outline: ORANGE,
    outlineText: ORANGE,
  },

  selection: {
    background: SOFT,
    backgroundStrong: '#FFE0EC',
    border: '#FFB8D4',
    text: '#C2185B',
    icon: ORANGE,
    fill: MAGENTA,
    onFill: '#FFFFFF',
  },

  badge: {
    especialista: {
      background: '#FFF5F2',
      border: '#FFD0C4',
      text: '#C44832',
      icon: ORANGE,
    },
    multimarca: {
      background: TONAL,
      border: HAIRLINE,
      text: INK,
      icon: ICON_DEFAULT,
    },
    verified: {
      fill: MAGENTA,
      onFill: '#FFFFFF',
      icon: MAGENTA,
      text: MAGENTA,
      border: '#FFE0EC',
    },
    meta: {
      background: TONAL,
      border: HAIRLINE,
      text: '#616161',
      icon: ICON_DEFAULT,
    },
  },

  payment: {
    completo: {
      background: '#FFF5F2',
      border: '#FFD0C4',
      text: '#C44832',
      icon: ORANGE,
    },
    parcial: {
      background: '#fff8e6',
      border: '#ffe399',
      text: '#5c4309',
      icon: WARNING,
    },
    adicional: {
      background: TONAL,
      border: HAIRLINE,
      text: '#616161',
      icon: ICON_DEFAULT,
    },
    aprobado: {
      background: '#e6f7ef',
      border: '#99dfbf',
      text: '#075f42',
      icon: SUCCESS,
    },
  },

  kpi: {
    elite: {
      background: '#FFF3C4',
      border: '#E8B923',
      text: '#7A5C00',
      icon: '#C9A227',
      highlight: '#FFD700',
    },
    master: {
      background: '#EEF1F5',
      border: '#B8C0CC',
      text: '#3D4A5C',
      icon: '#8A96A8',
    },
    pro: {
      background: '#F6E8DC',
      border: '#C9956C',
      text: '#6B3E1F',
      icon: '#A66B3D',
    },
    ascenso: {
      background: '#FBF1E8',
      border: '#DDB892',
      text: '#8B5E3C',
      icon: '#B8875A',
    },
    enProgreso: {
      background: TONAL,
      border: '#E0E0E0',
      text: '#616161',
      icon: ICON_DEFAULT,
    },
    sinActividad: {
      background: CANVAS,
      border: HAIRLINE,
      text: TAB_MUTED,
      icon: TAB_MUTED,
    },
  },

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

  /** Deprecated — no glass in Hosts UI */
  glass: {
    light: { background: CANVAS, border: HAIRLINE, shadow: withOpacity(INK, 0.06) },
    dark: { background: withOpacity(INK, 0.72), border: HAIRLINE, shadow: withOpacity(INK, 0.25) },
    accent: { background: SOFT, border: '#FFB8D4', shadow: withOpacity(MAGENTA, 0.12) },
    primary: { background: SOFT, border: '#FFB8D4', shadow: withOpacity(MAGENTA, 0.12) },
  },

  gradients: {
    primary: [MAGENTA, ORANGE],
    secondary: [TONAL, '#FFFFFF'],
    accent: [MAGENTA, ORANGE],
    ocean: [MAGENTA, ORANGE, SOFT],
    sunset: [MAGENTA, ORANGE],
    calm: [CANVAS, '#FFFFFF'],
    dark: [INK, '#2A2A2A'],
  },

  states: {
    hover: { primary: '#E01A66', secondary: '#E63D4F', accent: '#E85A40' },
    pressed: { primary: '#C2185B', secondary: '#C22D3D', accent: '#C44832' },
    disabled: {
      background: TONAL,
      text: '#C4C4C4',
      border: HAIRLINE,
    },
    focus: { ring: MAGENTA, ringOpacity: 0.25 },
  },
} as const;

export default COLORS;
