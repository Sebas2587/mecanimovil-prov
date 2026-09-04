import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import {
  institutionalInputPlaceholder,
  institutionalInputStyles,
} from '@/app/design-system/styles/institutionalInputs';
import { redondearCLP } from '@/utils/formatearMontoCLP';
import {
  formatMontoInputLocalized,
  parseMontoDecimal,
} from '@/utils/parseMontoDecimal';

export interface ClpMoneyInputProps {
  value: number;
  onChangeValue: (next: number) => void;
  editable: boolean;
  placeholder?: string;
  compact?: boolean;
}

export function ClpMoneyInput({
  value,
  onChangeValue,
  editable,
  placeholder = '0',
  compact = false,
}: ClpMoneyInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() =>
    value > 0 ? formatMontoInputLocalized(value) : '',
  );

  useEffect(() => {
    if (focused) return;
    setDraft(value > 0 ? formatMontoInputLocalized(value) : '');
  }, [value, focused]);

  return (
    <View
      style={[
        institutionalInputStyles.inputRow,
        compact && styles.moneyRowCompact,
      ]}
    >
      <InstitutionalText role="body" color="muted" style={institutionalInputStyles.inputRowPrefix}>
        $
      </InstitutionalText>
      <TextInput
        style={[
          institutionalInputStyles.inputRowField,
          institutionalInputStyles.inputMono,
          compact && institutionalInputStyles.inputCompact,
        ]}
        keyboardType="number-pad"
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={institutionalInputPlaceholder}
        value={draft}
        onFocus={() => {
          setFocused(true);
          setDraft(value > 0 ? String(Math.round(value)) : '');
        }}
        onBlur={() => {
          const next = redondearCLP(parseMontoDecimal(draft));
          onChangeValue(next);
          setDraft(next > 0 ? formatMontoInputLocalized(next) : '');
          setFocused(false);
        }}
        onChangeText={(t) => {
          const cleaned = t.replace(/[^\d]/g, '');
          setDraft(cleaned);
          onChangeValue(redondearCLP(parseMontoDecimal(cleaned)));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  moneyRowCompact: {
    minHeight: 44,
    paddingVertical: 0,
  },
});
