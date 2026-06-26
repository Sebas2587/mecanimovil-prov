import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { COLORS } from '@/app/design-system/tokens';
import {
  institutionalButtonStyles,
  type InstitutionalButtonSize,
  type InstitutionalButtonVariant,
} from '@/app/design-system/styles/institutionalButtons';

const I = COLORS.institutional;

const spinnerColor: Record<InstitutionalButtonVariant, string> = {
  primary: I.onPrimary,
  success: I.onPrimary,
  secondary: I.primary,
  outline: I.primary,
  outlineAccent: I.primary,
  destructiveOutline: I.semanticDown,
};

export type InstitutionalButtonProps = {
  label: string;
  onPress: () => void;
  variant?: InstitutionalButtonVariant;
  size?: InstitutionalButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leading?: React.ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function InstitutionalButton({
  label,
  onPress,
  variant = 'primary',
  size = 'default',
  disabled = false,
  loading = false,
  leading,
  accessibilityLabel,
  style,
}: InstitutionalButtonProps) {
  const isDisabled = disabled || loading;
  const styles = institutionalButtonStyles(variant, size, isDisabled);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.button as ViewStyle,
        pressed && !isDisabled && (styles.pressed as ViewStyle),
        style,
      ]}
    >
      {loading ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ActivityIndicator size="small" color={spinnerColor[variant]} />
          <Text style={styles.text as TextStyle}>{label}</Text>
        </View>
      ) : (
        <>
          {leading}
          <Text style={styles.text as TextStyle} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
