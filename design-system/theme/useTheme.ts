/**
 * Hook useTheme - MecaniMóvil App Proveedores
 * Hook para acceder fácilmente a los tokens del tema
 * Retorna siempre un objeto válido, nunca undefined
 */

import { useContext } from 'react';
import { DesignSystemThemeContext } from './DesignSystemThemeProvider';
import { TOKENS } from '../tokens';

/**
 * Hook para acceder a los tokens del tema
 * Si no hay DesignSystemThemeProvider, retorna los tokens por defecto
 * 
 * @returns Objeto con todos los tokens del sistema de diseño
 * 
 * @example
 * const theme = useTheme();
 * const primaryColor = theme.colors.primary[500];
 * const spacing = theme.spacing.md;
 */
export const useTheme = () => {
  // Intentar obtener el contexto
  let context: any;
  try {
    context = useContext(DesignSystemThemeContext);
  } catch (e) {
    console.warn('⚠️ Error accessing DesignSystemThemeContext:', e);
    context = null;
  }

  // Si no hay contexto, intentar usar TOKENS directamente
  let theme: any;
  try {
    theme = context || TOKENS;
    // Si theme sigue siendo undefined, usar fallback
    if (!theme || typeof theme !== 'object') {
      console.warn('⚠️ Theme is not an object, using fallback');
      theme = TOKENS || {};
    }
  } catch (e) {
    console.error('❌ Error accessing theme context or TOKENS:', e);
    theme = {};
  }

  // Validación de seguridad: asegurar que todos los tokens estén presentes y completos
  const hasValidBorders =
    theme?.borders &&
    theme?.borders?.radius &&
    typeof theme.borders.radius === 'object' &&
    typeof theme.borders.radius?.full !== 'undefined';

  const hasValidTypography =
    theme?.typography &&
    typeof theme.typography === 'object' &&
    theme.typography?.fontSize &&
    typeof theme.typography.fontSize === 'object' &&
    theme.typography?.fontWeight &&
    typeof theme.typography.fontWeight === 'object' &&
    typeof theme.typography.fontSize?.xs !== 'undefined' &&
    typeof theme.typography.fontSize?.['2xl'] !== 'undefined';

  const hasValidColors = theme?.colors && typeof theme.colors === 'object' && Object.keys(theme.colors).length > 0;
  const hasValidSpacing = theme?.spacing && typeof theme.spacing === 'object' && typeof theme.spacing?.md !== 'undefined';

  if (!hasValidBorders || !hasValidTypography || !hasValidColors || !hasValidSpacing) {
    console.warn('⚠️ Theme tokens not ready, using fallback values', {
      hasValidBorders,
      hasValidTypography,
      hasValidColors,
      hasValidSpacing,
      hasTheme: !!theme,
      hasTypography: !!theme?.typography,
      hasTypographyFontSize: !!(theme?.typography && theme?.typography?.fontSize),
      typographyType: theme?.typography ? typeof theme.typography : 'undefined',
      hasTOKENS: !!TOKENS,
      hasTOKENSTypography: !!TOKENS?.typography,
    });

    // Crear fallback completo si hay problema
    const fallbackTheme = {
      colors: hasValidColors ? theme?.colors || {} : TOKENS?.colors || {},
      typography: hasValidTypography
        ? theme?.typography || {}
        : TOKENS?.typography || {
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
      spacing: hasValidSpacing ? theme?.spacing || {} : TOKENS?.spacing || {},
      shadows: theme?.shadows || TOKENS?.shadows || {},
      animations: theme?.animations || TOKENS?.animations || {},
      borders: hasValidBorders
        ? theme?.borders || {}
        : {
            radius: {
              none: 0,
              sm: 4,
              md: 8,
              lg: 12,
              xl: 16,
              '2xl': 20,
              '3xl': 24,
              full: 9999,
              button: { sm: 8, md: 12, lg: 16, full: 9999 },
              input: { sm: 8, md: 12, lg: 16 },
              card: { sm: 8, md: 12, lg: 16, xl: 20 },
              modal: { sm: 12, md: 16, lg: 20, xl: 24 },
              avatar: { sm: 16, md: 24, lg: 32, full: 9999 },
              badge: { sm: 4, md: 8, lg: 12, full: 9999 },
            },
            width: { none: 0, thin: 1, medium: 2, thick: 4 },
          },
    };
    return fallbackTheme;
  }

  // Asegurar que theme siempre tenga todas las propiedades necesarias
  return (
    theme || {
      colors: TOKENS?.colors || {},
      typography: TOKENS?.typography || {
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
      spacing: TOKENS?.spacing || {},
      shadows: TOKENS?.shadows || {},
      animations: TOKENS?.animations || {},
      borders: TOKENS?.borders || {
        radius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
        width: { none: 0, thin: 1, medium: 2, thick: 4 },
      },
    }
  );
};

export default useTheme;

