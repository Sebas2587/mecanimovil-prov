import React from 'react';
import { Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';
import { COLORS } from '@/app/design-system/tokens';
import {
  institutionalTextStyle,
  type InstitutionalTextRole,
} from '@/app/design-system/styles/institutionalTypography';

const I = COLORS.institutional;

export type InstitutionalTextColor =
  | 'ink'
  | 'body'
  | 'muted'
  | 'primary'
  | 'onPrimary'
  | 'semanticUp'
  | 'semanticDown';

const colorMap: Record<InstitutionalTextColor, string> = {
  ink: I.ink,
  body: I.body,
  muted: I.muted,
  primary: I.primary,
  onPrimary: I.onPrimary,
  semanticUp: I.semanticUp,
  semanticDown: I.semanticDown,
};

export type InstitutionalTextProps = Omit<TextProps, 'role'> & {
  role?: InstitutionalTextRole;
  color?: InstitutionalTextColor | string;
  style?: StyleProp<TextStyle>;
};

export function InstitutionalText({
  role = 'body',
  color = 'ink',
  style,
  children,
  ...rest
}: InstitutionalTextProps) {
  const resolvedColor =
    color in colorMap ? colorMap[color as InstitutionalTextColor] : color;

  return (
    <Text style={[institutionalTextStyle(role, resolvedColor), style]} {...rest}>
      {children}
    </Text>
  );
}
