/**
 * Botones institucionales — primario filled, secundario surface, outline canvas.
 * Alineado a onboarding, SolicitudDetalleFooter y configuracion-perfil.
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
  | 'success';
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
      /** Airbnb Hosts / design.md: CTAs 48–52; compact floor 48 */
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
      backgroundColor: I.canvas,
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
      backgroundColor: I.canvas,
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
};

export function institutionalButtonStyles(
  variant: InstitutionalButtonVariant = 'primary',
  size: InstitutionalButtonSize = 'default',
  disabled = false,
) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BORDERS.radius.md,
      gap: SPACING.fixed.xs,
      ...s.button,
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
      letterSpacing: TYPOGRAPHY.letterSpacing.wide,
      ...s.text,
      ...v.text,
    },
    pressed: {
      opacity: v.pressedOpacity,
    },
  });
}
