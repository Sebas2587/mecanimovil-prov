import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { onboardingInputPlaceholder, onboardingStyles } from '@/app/design-system/styles/onboarding';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

type Props = {
  label: string;
  hint?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  maxLength?: number;
  editable?: boolean;
  error?: string | null;
  inputStyle?: TextStyle | TextStyle[];
  onFocus?: TextInputProps['onFocus'];
  onBlur?: TextInputProps['onBlur'];
};

export function InstitutionalField({
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize,
  maxLength,
  editable = true,
  error,
  inputStyle,
  onFocus,
  onBlur,
}: Props) {
  const borderStyle = error ? styles.inputBorderErr : null;

  return (
    <View style={styles.wrap}>
      <Text style={onboardingStyles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <TextInput
        style={[
          onboardingStyles.input,
          multiline && styles.inputMultiline,
          borderStyle,
          ...(Array.isArray(inputStyle) ? inputStyle : inputStyle ? [inputStyle] : []),
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={onboardingInputPlaceholder}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        maxLength={maxLength}
        editable={editable}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: SPACING.fixed.xxs,
  },
  hint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansRegular,
    color: I.muted,
    marginBottom: SPACING.fixed.xxs,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  inputBorderErr: {
    borderColor: I.semanticDown,
    borderWidth: BORDERS.width.medium,
  } as TextStyle,
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.semanticDown,
    marginTop: SPACING.fixed.xxs,
  },
});
