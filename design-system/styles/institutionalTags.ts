import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, withOpacity } from '../tokens';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;

export type InstitutionalTagVariant =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

export type InstitutionalTagSize = 'sm' | 'md';

const lh = (fontSize: number, mult: number) => Math.round(fontSize * mult);

/**
 * Tags Airbnb Host: chips soft (30% superficie), sin pills pesados.
 * Brand (10%) solo en variant primary/info — tint suave, no fill sólido.
 * Ver 60-30-10: https://paletacolorpro.com/en/ui-ux-palette-guide
 */
const variantPalette: Record<
  InstitutionalTagVariant,
  { bg: string; border: string; text: string }
> = {
  neutral: {
    bg: I.surfaceSoft,
    border: I.hairline,
    text: I.body,
  },
  primary: {
    bg: COLORS.base.soft,
    border: withOpacity(I.primary, 0.18),
    text: I.primaryActive,
  },
  success: {
    bg: COLORS.background.success,
    border: withOpacity(I.semanticUp, 0.22),
    text: I.semanticUp,
  },
  warning: {
    bg: COLORS.background.warning,
    border: withOpacity(I.accentYellow, 0.28),
    text: COLORS.warning.dark,
  },
  error: {
    bg: COLORS.background.error,
    border: withOpacity(I.semanticDown, 0.22),
    text: I.semanticDown,
  },
  info: {
    bg: COLORS.base.soft,
    border: withOpacity(I.primary, 0.14),
    text: I.primaryActive,
  },
};

const sizeStyles: Record<
  InstitutionalTagSize,
  { tag: ViewStyle; text: TextStyle; uppercase: boolean }
> = {
  sm: {
    tag: {
      paddingHorizontal: SPACING.fixed.sm,
      paddingVertical: 3,
      borderRadius: BORDERS.radius.sm,
      gap: SPACING.fixed.xxs,
    },
    text: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      lineHeight: lh(TYPOGRAPHY.fontSize.xs, TYPOGRAPHY.lineHeight.tight),
      letterSpacing: TYPOGRAPHY.letterSpacing.wider,
      fontFamily: FF.sansMedium,
    },
    uppercase: true,
  },
  md: {
    tag: {
      paddingHorizontal: SPACING.fixed.sm + 2,
      paddingVertical: 5,
      borderRadius: BORDERS.radius.sm,
      gap: SPACING.fixed.xs,
    },
    text: {
      fontSize: TS.caption.fontSize,
      lineHeight: lh(TS.caption.fontSize, TS.caption.lineHeight),
      letterSpacing: 0,
      fontFamily: FF.sansMedium,
    },
    uppercase: false,
  },
};

export function institutionalTagIconColor(
  variant: InstitutionalTagVariant = 'neutral',
): string {
  return variantPalette[variant].text;
}

export function institutionalTagStyles(
  variant: InstitutionalTagVariant = 'neutral',
  size: InstitutionalTagSize = 'md',
  uppercase?: boolean,
) {
  const palette = variantPalette[variant];
  const s = sizeStyles[size];
  const useUppercase = uppercase ?? s.uppercase;

  return StyleSheet.create({
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      borderWidth: BORDERS.width.thin,
      backgroundColor: palette.bg,
      borderColor: palette.border,
      ...s.tag,
    },
    text: {
      color: palette.text,
      fontFamily: s.text.fontFamily ?? FF.sansMedium,
      ...(useUppercase ? { textTransform: 'uppercase' } : {}),
      fontSize: s.text.fontSize,
      lineHeight: s.text.lineHeight,
      letterSpacing: s.text.letterSpacing,
    },
  });
}
