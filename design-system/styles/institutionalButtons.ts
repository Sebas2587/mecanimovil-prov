/**
 * Botones Airbnb Hosts + Tinder — 60-30-10:
 * primary (10% brand gradient Tinder) · secondary (negro Host) · outline/tertiary (quiet).
 *
 * Roles:
 * - primary: CTA de compromiso / dinero (Suscribirme, Pagar, Continuar)
 * - secondary: CTA fuerte alternativo estilo Airbnb “Next” (negro)
 * - outline: acción quieta con borde (Cancelar modal, Ver, Copiar)
 * - tertiary: link de texto
 * - destructiveOutline: cancelar/eliminar destructivo
 * - success: aceptar / completar positivo
 */
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS, withOpacity } from '../tokens';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;

export type InstitutionalButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'outlineAccent'
  | 'destructiveOutline'
  | 'success'
  | 'tertiary';
export type InstitutionalButtonSize = 'default' | 'compact';

const sizeStyles: Record<
  InstitutionalButtonSize,
  { button: ViewStyle; text: TextStyle }
> = {
  default: {
    button: {
      minHeight: 52,
      paddingVertical: SPACING.fixed.md,
      paddingHorizontal: SPACING.fixed.lg,
    },
    text: {
      fontSize: TS.button.fontSize,
      lineHeight: Math.round(TS.button.fontSize * TS.button.lineHeight),
    },
  },
  compact: {
    button: {
      minHeight: 48,
      paddingVertical: SPACING.fixed.sm,
      paddingHorizontal: SPACING.fixed.lg,
    },
    text: {
      fontSize: TS.button.fontSize,
      lineHeight: Math.round(TS.button.fontSize * TS.button.lineHeight),
    },
  },
};

const variantStyles: Record<
  InstitutionalButtonVariant,
  { button: ViewStyle; text: TextStyle; pressedOpacity: number }
> = {
  primary: {
    button: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderColor: 'transparent',
      overflow: 'hidden',
    },
    text: {
      color: I.onPrimary,
    },
    pressedOpacity: 0.92,
  },
  secondary: {
    button: {
      backgroundColor: COLORS.buttonSecondary.background,
      borderWidth: BORDERS.width.thin,
      borderColor: COLORS.buttonSecondary.border,
    },
    text: {
      color: COLORS.buttonSecondary.text,
    },
    pressedOpacity: 0.92,
  },
  outline: {
    button: {
      backgroundColor: COLORS.background.paper,
      borderWidth: BORDERS.width.thin,
      borderColor: I.hairline,
    },
    text: {
      color: I.ink,
    },
    pressedOpacity: 0.92,
  },
  outlineAccent: {
    button: {
      backgroundColor: COLORS.background.paper,
      borderWidth: BORDERS.width.thin,
      borderColor: COLORS.buttonSecondary.outline,
    },
    text: {
      color: COLORS.buttonSecondary.outlineText,
    },
    pressedOpacity: 0.92,
  },
  destructiveOutline: {
    button: {
      backgroundColor: COLORS.background.paper,
      borderWidth: BORDERS.width.thin,
      borderColor: withOpacity(I.semanticDown, 0.35),
    },
    text: {
      color: I.semanticDown,
    },
    pressedOpacity: 0.85,
  },
  success: {
    button: {
      backgroundColor: I.semanticUp,
      borderWidth: BORDERS.width.thin,
      borderColor: I.semanticUp,
      ...SHADOWS.editorial,
    },
    text: {
      color: I.onPrimary,
    },
    pressedOpacity: 0.9,
  },
  /** Link de header / acciones quietas — sin fill (Airbnb text button). */
  tertiary: {
    button: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderColor: 'transparent',
      minHeight: 44,
      paddingVertical: 10,
      paddingHorizontal: SPACING.fixed.xs,
    },
    text: {
      color: I.primary,
      fontSize: TS.button.fontSize,
      lineHeight: Math.round(TS.button.fontSize * TS.button.lineHeight),
    },
    pressedOpacity: 0.65,
  },
};

export function institutionalButtonStyles(
  variant: InstitutionalButtonVariant = 'primary',
  size: InstitutionalButtonSize = 'default',
  disabled = false,
) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const isTertiary = variant === 'tertiary';

  return StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: isTertiary ? 0 : BORDERS.radius.md,
      gap: SPACING.fixed.xs,
      ...(isTertiary ? {} : s.button),
      ...v.button,
      ...(disabled && (variant === 'primary' || variant === 'success')
        ? {
            ...(variant === 'primary'
              ? { backgroundColor: I.primaryDisabled, borderColor: I.primaryDisabled }
              : {}),
            opacity: 0.65,
          }
        : {}),
      ...(disabled && variant !== 'primary' && variant !== 'success' ? { opacity: 0.65 } : {}),
    },
    text: {
      fontFamily: FF.sansSemiBold,
      letterSpacing: TYPOGRAPHY.letterSpacing.normal,
      ...s.text,
      ...v.text,
    },
    pressed: {
      opacity: v.pressedOpacity,
    },
  });
}
