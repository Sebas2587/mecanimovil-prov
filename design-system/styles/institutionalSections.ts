import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '../tokens';
import { institutionalTextStyle } from './institutionalTypography';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;

export type InstitutionalSectionLevel = 'h2' | 'h3' | 'h4';

const lh = (fontSize: number, mult: number) => Math.round(fontSize * mult);

export function institutionalSectionStyles(level: InstitutionalSectionLevel = 'h4') {
  const titleStyle =
    level === 'h2'
      ? institutionalTextStyle('h2', I.ink)
      : level === 'h3'
        ? institutionalTextStyle('h3', I.ink)
        : institutionalTextStyle('h4', I.ink);

  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.fixed.sm,
      marginBottom: SPACING.fixed.sm,
    } satisfies ViewStyle,
    title: {
      ...titleStyle,
      flex: 1,
    } satisfies TextStyle,
    count: {
      fontSize: TS.caption.fontSize,
      fontFamily: FF.sansSemiBold,
      lineHeight: lh(TS.caption.fontSize, TS.caption.lineHeight),
      color: I.muted,
      backgroundColor: I.surfaceStrong,
      paddingHorizontal: SPACING.fixed.sm,
      paddingVertical: 2,
      borderRadius: BORDERS.radius.md,
      overflow: 'hidden',
      borderWidth: BORDERS.width.thin,
      borderColor: I.hairline,
    } satisfies TextStyle,
    action: institutionalTextStyle('navLink', I.primary),
  });
}
