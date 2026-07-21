import React from 'react';
import {
  View,
  TextInput,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import {
  institutionalInputPlaceholder,
  institutionalInputStyles,
} from '@/app/design-system/styles/institutionalInputs';

type Props = {
  /** Si se omite, solo se renderiza el input (p. ej. dentro de una card). */
  label?: string;
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
  compact?: boolean;
  mono?: boolean;
  inputStyle?: TextStyle | TextStyle[];
  onFocus?: TextInputProps['onFocus'];
  onBlur?: TextInputProps['onBlur'];
  textInputProps?: Omit<
    TextInputProps,
    'value' | 'onChangeText' | 'style' | 'placeholder' | 'placeholderTextColor' | 'multiline' | 'keyboardType' | 'autoCapitalize' | 'maxLength' | 'editable' | 'onFocus' | 'onBlur'
  >;
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
  compact = false,
  mono = false,
  inputStyle,
  onFocus,
  onBlur,
  textInputProps,
}: Props) {
  return (
    <View style={institutionalInputStyles.field}>
      {label ? (
        <InstitutionalText role="label" color="ink" style={institutionalInputStyles.label}>
          {label}
        </InstitutionalText>
      ) : null}
      {hint ? (
        <InstitutionalText role="caption" color="muted" style={institutionalInputStyles.hint}>
          {hint}
        </InstitutionalText>
      ) : null}
      <TextInput
        style={[
          institutionalInputStyles.input,
          compact && institutionalInputStyles.inputCompact,
          mono && institutionalInputStyles.inputMono,
          multiline && institutionalInputStyles.inputMultiline,
          error ? institutionalInputStyles.inputError : null,
          ...(Array.isArray(inputStyle) ? inputStyle : inputStyle ? [inputStyle] : []),
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={institutionalInputPlaceholder}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        maxLength={maxLength}
        editable={editable}
        onFocus={onFocus}
        onBlur={onBlur}
        {...textInputProps}
      />
      {error ? (
        <InstitutionalText role="caption" color="semanticDown" style={institutionalInputStyles.errorText}>
          {error}
        </InstitutionalText>
      ) : null}
    </View>
  );
}

export default InstitutionalField;
