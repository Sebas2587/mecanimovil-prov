import { StyleSheet, Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';
import { COLORS } from '@/app/design-system/tokens';
import {
  institutionalTextStyle,
  type InstitutionalTextRole,
} from '@/app/design-system/styles/institutionalTypography';

const I = COLORS.institutional;

const roleMap: Record<string, InstitutionalTextRole> = {
  default: 'body',
  defaultSemiBold: 'bodyBold',
  title: 'h1',
  subtitle: 'h3',
  link: 'navLink',
};

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

/** @deprecated Usar InstitutionalText. Wrapper de compatibilidad con tokens institucionales. */
export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const role = roleMap[type] ?? 'body';
  const color =
    lightColor ?? darkColor ?? (type === 'link' ? I.primary : I.ink);

  return (
    <Text style={[institutionalTextStyle(role, color), style]} {...rest} />
  );
}

const styles = StyleSheet.create({});
