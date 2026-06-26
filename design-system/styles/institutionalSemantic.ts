/**
 * Colores semánticos y superficies compartidas para cards, badges y estados.
 * Única fuente para reemplazar hex legacy en UI de proveedores.
 */
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS, withOpacity } from '../tokens';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;

export const INSTITUTIONAL_SEMANTIC = {
  ink: I.ink,
  body: I.body,
  muted: I.muted,
  mutedSoft: I.mutedSoft,
  canvas: I.canvas,
  surfaceSoft: I.surfaceSoft,
  surfaceStrong: I.surfaceStrong,
  hairline: I.hairline,
  primary: I.primary,
  primaryActive: I.primaryActive,
  onPrimary: I.onPrimary,
  success: I.semanticUp,
  error: I.semanticDown,
  warning: I.accentYellow,
} as const;

export type InstitutionalStatusTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

export function institutionalStatusColors(tone: InstitutionalStatusTone) {
  switch (tone) {
    case 'primary':
      return {
        bg: withOpacity(I.primary, 0.12),
        border: withOpacity(I.primary, 0.22),
        text: I.primaryActive,
        icon: I.primary,
      };
    case 'success':
      return {
        bg: withOpacity(I.semanticUp, 0.12),
        border: withOpacity(I.semanticUp, 0.28),
        text: I.semanticUp,
        icon: I.semanticUp,
      };
    case 'warning':
      return {
        bg: withOpacity(I.accentYellow, 0.14),
        border: withOpacity(I.accentYellow, 0.32),
        text: I.accentYellow,
        icon: I.accentYellow,
      };
    case 'error':
      return {
        bg: withOpacity(I.semanticDown, 0.1),
        border: withOpacity(I.semanticDown, 0.28),
        text: I.semanticDown,
        icon: I.semanticDown,
      };
    case 'info':
      return {
        bg: withOpacity(I.primary, 0.08),
        border: withOpacity(I.primary, 0.18),
        text: I.primaryActive,
        icon: I.primary,
      };
    default:
      return {
        bg: I.surfaceStrong,
        border: I.hairline,
        text: I.body,
        icon: I.muted,
      };
  }
}

const lh = (fontSize: number, mult: number) => Math.round(fontSize * mult);

export const institutionalCardStyles = StyleSheet.create({
  surface: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    ...SHADOWS.editorial,
  } satisfies ViewStyle,
  surfacePadding: {
    padding: SPACING.fixed.md,
  } satisfies ViewStyle,
  title: {
    fontSize: TS.h4.fontSize,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  } satisfies TextStyle,
  subtitle: {
    fontSize: TS.caption.fontSize,
    lineHeight: lh(TS.caption.fontSize, TS.caption.lineHeight),
    fontFamily: FF.sansRegular,
    color: I.body,
  } satisfies TextStyle,
  meta: {
    fontSize: TS.small.fontSize,
    lineHeight: lh(TS.small.fontSize, TS.small.lineHeight),
    fontFamily: FF.sansRegular,
    color: I.muted,
  } satisfies TextStyle,
  divider: {
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
  } satisfies ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
  } satisfies ViewStyle,
});
