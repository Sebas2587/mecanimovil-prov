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
import { COLORS, BORDERS, SPACING } from '@/app/design-system/tokens';
import {
  institutionalButtonStyles,
  type InstitutionalButtonSize,
  type InstitutionalButtonVariant,
} from '@/app/design-system/styles/institutionalButtons';
import { PrimaryGradientFill } from '@/app/design-system/components/PrimaryGradientFill';

const I = COLORS.institutional;

const spinnerColor: Record<InstitutionalButtonVariant, string> = {
  primary: I.onPrimary,
  success: I.onPrimary,
  secondary: I.primary,
  outline: I.ink,
  outlineAccent: COLORS.brand.orange,
  destructiveOutline: I.semanticDown,
  tertiary: I.primary,
};

const sizeFill: Record<
  InstitutionalButtonSize,
  { minHeight: number; paddingVertical: number; paddingHorizontal: number }
> = {
  default: {
    minHeight: 52,
    paddingVertical: SPACING.fixed.md,
    paddingHorizontal: SPACING.fixed.lg,
  },
  compact: {
    minHeight: 48,
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.lg,
  },
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

/**
 * Botón Host. Primario = gradiente brand (10%). Tertiary = link de texto.
 */
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
  const fill = sizeFill[size];

  const content = loading ? (
    <View style={rowCenter}>
      <ActivityIndicator size="small" color={spinnerColor[variant]} />
      <Text style={styles.text as TextStyle}>{label}</Text>
    </View>
  ) : (
    <View style={rowCenter}>
      {leading}
      <Text style={styles.text as TextStyle} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  if (variant === 'primary' && !isDisabled) {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        style={({ pressed }) => [
          primaryShell,
          { minHeight: fill.minHeight },
          pressed && (styles.pressed as ViewStyle),
          style,
        ]}
      >
        <PrimaryGradientFill
          style={[
            primaryFill,
            {
              minHeight: fill.minHeight,
              paddingVertical: fill.paddingVertical,
              paddingHorizontal: fill.paddingHorizontal,
            },
          ]}
        >
          {content}
        </PrimaryGradientFill>
      </Pressable>
    );
  }

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
      {content}
    </Pressable>
  );
}

const rowCenter = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 8,
};

const primaryShell: ViewStyle = {
  borderRadius: BORDERS.radius.md,
  overflow: 'hidden',
  backgroundColor: I.primary,
  borderWidth: 0,
  borderColor: 'transparent',
};

const primaryFill = {
  flex: 1,
  width: '100%' as const,
  alignSelf: 'stretch' as const,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
