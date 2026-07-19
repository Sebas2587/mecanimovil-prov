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

const variantPalette: Record<
  InstitutionalTagVariant,
  { bg: string; border: string; text: string }
> = {
  neutral: {
    bg: I.surfaceStrong,
    border: I.hairline,
    text: I.body,
  },
  primary: {
    bg: withOpacity(I.primary, 0.12),
    border: withOpacity(I.primary, 0.2),
    text: I.primaryActive,
  },
  success: {
    bg: withOpacity(I.semanticUp, 0.12),
    border: withOpacity(I.semanticUp, 0.28),
    text: I.semanticUp,
  },
  warning: {
    bg: withOpacity(I.accentYellow, 0.12),
    border: withOpacity(I.accentYellow, 0.28),
    text: I.accentYellow,
  },
  error: {
    bg: withOpacity(I.semanticDown, 0.08),
    border: withOpacity(I.semanticDown, 0.28),
    text: I.semanticDown,
  },
  info: {
    bg: withOpacity(I.primary, 0.08),
    border: withOpacity(I.primary, 0.18),
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
      paddingVertical: 4,
      borderRadius: BORDERS.radius.pill,
      gap: SPACING.fixed.xxs,
    },
    text: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      lineHeight: lh(TYPOGRAPHY.fontSize.xs, TYPOGRAPHY.lineHeight.tight),
      letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    },
    uppercase: true,
  },
  md: {
    tag: {
      paddingHorizontal: SPACING.fixed.sm + 2,
      paddingVertical: SPACING.fixed.xs,
      borderRadius: BORDERS.radius.pill,
      gap: SPACING.fixed.xs,
    },
    text: {
      fontSize: TS.caption.fontSize,
      lineHeight: lh(TS.caption.fontSize, TS.caption.lineHeight),
      letterSpacing: 0,
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
      fontFamily: FF.sansSemiBold,
      color: palette.text,
      ...(useUppercase ? { textTransform: 'uppercase' } : {}),
      ...s.text,
    },
  });
}
