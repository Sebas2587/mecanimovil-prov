import { StyleSheet, type TextStyle } from 'react-native';
import { COLORS, TYPOGRAPHY } from '../tokens';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;

export type InstitutionalTextRole = keyof typeof TS;

const weightToFamily: Record<string, string> = {
  '400': FF.sansRegular,
  '500': FF.sansMedium,
  '600': FF.sansSemiBold,
  '700': FF.sansBold,
};

export function institutionalTextStyle(
  role: InstitutionalTextRole,
  color: string = I.ink,
): TextStyle {
  const def = TS[role];
  const fontFamily = weightToFamily[String(def.fontWeight)] ?? FF.sansRegular;
  return {
    color,
    fontSize: def.fontSize,
    lineHeight: Math.round(def.fontSize * def.lineHeight),
    letterSpacing: def.letterSpacing,
    fontFamily,
  };
}

export const institutionalTypographyStyles = StyleSheet.create({
  ink: { color: I.ink },
  body: { color: I.body },
  muted: { color: I.muted },
  primary: { color: I.primary },
  onPrimary: { color: I.onPrimary },
  semanticUp: { color: I.semanticUp },
  semanticDown: { color: I.semanticDown },
});
