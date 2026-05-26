/**
 * Design System Theme Provider - MecaniMóvil App Proveedores
 * Provee todos los tokens del sistema de diseño globalmente
 * 
 * IMPORTANTE: Nombre diferente (DesignSystemThemeProvider) para evitar
 * conflicto con ThemeProvider de @react-navigation/native
 */

import React, { createContext, useMemo, ReactNode } from 'react';
import { TOKENS } from '../tokens';

// Fallback completo para TOKENS si no está disponible
const FALLBACK_TOKENS = {
  colors: {
    base: {
      white: '#FFFFFF',
      inkBlack: '#000000',
      neutralGray: '#EEEEEE',
    },
    primary: {
      500: '#4E4FEB',
    },
    secondary: {
      500: '#068FFF',
    },
    accent: {
      500: '#FF6B00',
    },
    text: {
      primary: '#000000',
      secondary: '#666666',
    },
    background: {
      default: '#EEEEEE',
      paper: '#FFFFFF',
    },
    border: {
      light: '#EEEEEE',
      main: '#D0D0D0',
    },
  },
  typography: {
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
    fontFamily: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
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
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
    fixed: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
  },
  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  },
  animations: {
    duration: {
      instant: 0,
      fast: 100,
      short: 150,
      medium: 300,
      long: 500,
    },
    easing: {
      easeInOut: 'ease-in-out',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      linear: 'linear',
    },
  },
  borders: {
    radius: {
      none: 0,
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
      '2xl': 20,
      '3xl': 24,
      full: 9999,
      button: {
        sm: 8,
        md: 12,
        lg: 16,
        full: 9999,
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
        xl: 20,
      },
    },
    width: {
      none: 0,
      thin: 1,
      medium: 2,
      thick: 4,
    },
  },
};

/**
 * Valida que TOKENS esté completo y sea válido
 */
const validateTokens = (tokens: any) => {
  // Protección contra tokens undefined/null
  if (!tokens || typeof tokens !== 'object') {
    console.error('❌ TOKENS is not a valid object, using fallback');
    return TOKENS && typeof TOKENS === 'object' ? TOKENS : FALLBACK_TOKENS;
  }

  // Validar borders
  const hasValidBorders =
    tokens?.borders &&
    tokens?.borders?.radius &&
    typeof tokens.borders.radius === 'object' &&
    typeof tokens.borders.radius?.full !== 'undefined';

  // Validar typography
  const hasValidTypography =
    tokens?.typography &&
    typeof tokens.typography === 'object' &&
    tokens.typography?.fontSize &&
    typeof tokens.typography.fontSize === 'object' &&
    tokens.typography?.fontWeight &&
    typeof tokens.typography.fontWeight === 'object' &&
    typeof tokens.typography.fontSize?.xs !== 'undefined' &&
    typeof tokens.typography.fontSize?.['2xl'] !== 'undefined';

  // Validar colors
  const hasValidColors = tokens?.colors && typeof tokens.colors === 'object' && Object.keys(tokens.colors).length > 0;

  // Validar spacing
  const hasValidSpacing = tokens?.spacing && typeof tokens.spacing === 'object' && typeof tokens.spacing?.md !== 'undefined';

  if (!hasValidBorders || !hasValidTypography || !hasValidColors || !hasValidSpacing) {
    console.error('❌ TOKENS validation failed in DesignSystemThemeProvider:', {
      hasTokens: !!tokens,
      hasValidBorders,
      hasValidTypography,
      hasValidColors,
      hasValidSpacing,
      hasTypography: !!(tokens && tokens?.typography),
      hasTypographyFontSize: !!(tokens && tokens?.typography && tokens?.typography?.fontSize),
      typographyType: tokens?.typography ? typeof tokens.typography : 'undefined',
    });
    // Retornar TOKENS si está disponible, si no usar fallback
    return TOKENS && typeof TOKENS === 'object' ? TOKENS : FALLBACK_TOKENS;
  }

  return tokens;
};

// Obtener TOKENS de forma segura
let safeTOKENS: any;
try {
  safeTOKENS = TOKENS || FALLBACK_TOKENS;
} catch (e) {
  console.error('❌ Error accessing TOKENS in DesignSystemThemeProvider:', e);
  safeTOKENS = FALLBACK_TOKENS;
}

// Crear el contexto del tema con TOKENS validado
export const DesignSystemThemeContext = createContext(validateTokens(safeTOKENS));

interface DesignSystemThemeProviderProps {
  children: ReactNode;
}

/**
 * DesignSystemThemeProvider Component
 * Envuelve la aplicación para proveer acceso a los tokens del tema
 * 
 * @param children - Componentes hijos
 */
export const DesignSystemThemeProvider: React.FC<DesignSystemThemeProviderProps> = ({ children }) => {
  // Obtener TOKENS de forma segura dentro del componente
  let tokensToValidate: any;
  try {
    tokensToValidate = TOKENS || safeTOKENS || FALLBACK_TOKENS;
  } catch (e) {
    console.error('❌ Error accessing TOKENS in DesignSystemThemeProvider component:', e);
    tokensToValidate = FALLBACK_TOKENS;
  }

  // Memorizar los tokens validados para optimización
  const validatedTokens = useMemo(() => validateTokens(tokensToValidate), []);

  return (
    <DesignSystemThemeContext.Provider value={validatedTokens}>
      {children}
    </DesignSystemThemeContext.Provider>
  );
};

export default DesignSystemThemeProvider;

