import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  View,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { COLORS, BORDERS, SPACING, GRADIENTS } from '@/app/design-system/tokens';
import {
  institutionalButtonStyles,
  type InstitutionalButtonSize,
  type InstitutionalButtonVariant,
} from '@/app/design-system/styles/institutionalButtons';
import { PrimaryGradientFill } from '@/app/design-system/components/PrimaryGradientFill';
import { webKeyboardProps } from '@/utils/webKeyboard';

const I = COLORS.institutional;

const spinnerColor: Record<InstitutionalButtonVariant, string> = {
  primary: I.onPrimary,
  success: I.onPrimary,
  secondary: COLORS.buttonSecondary.text,
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
  testID?: string;
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
  testID,
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
      <Text style={styles.text as TextStyle} numberOfLines={size === 'compact' ? 2 : 1}>
        {label}
      </Text>
    </View>
  );

  if (variant === 'primary' && !isDisabled) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        {...webKeyboardProps(isDisabled, onPress)}
        style={({ pressed }) => [
          primaryShell,
          { minHeight: fill.minHeight },
          pressed && (styles.pressed as ViewStyle),
          style,
          primaryShellLock,
        ]}
      >
        <PrimaryGradientFill
          colors={GRADIENTS.hostCtaOnText}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          pointerEvents="none"
          style={[
            rowCenter,
            {
              minHeight: fill.minHeight,
              paddingVertical: fill.paddingVertical,
              paddingHorizontal: fill.paddingHorizontal,
              width: '100%',
              zIndex: 1,
            },
          ]}
        >
          {content}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...webKeyboardProps(isDisabled, onPress)}
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
  position: 'relative',
  backgroundColor: COLORS.primary[700],
  borderWidth: 0,
  borderColor: 'transparent',
};

/** El style del caller no puede recortar el relleno (padding/alignItems:center dejaba MAGENTA alrededor). */
const primaryShellLock: ViewStyle = {
  padding: 0,
  paddingVertical: 0,
  paddingHorizontal: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  alignItems: 'stretch',
  justifyContent: 'center',
  overflow: 'hidden',
};
