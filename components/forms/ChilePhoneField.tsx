import React, { useMemo } from 'react';
import { View, TextInput } from 'react-native';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import {
  institutionalInputPlaceholder,
  institutionalInputStyles,
} from '@/app/design-system/styles/institutionalInputs';
import {
  mergeNineMobileDigits,
  telefonoMovilChileValido,
  extraerNueveDigitosDesdeGuardado,
} from '@/utils/chilePhone';

type Props = {
  label?: string;
  hint?: string;
  /** Valor guardado (+569...) o 9 dígitos nacionales */
  value: string;
  onChangeValue: (stored: string) => void;
  required?: boolean;
};

export function getChilePhoneError(nueveDigitos: string, required = true): string | null {
  if (!nueveDigitos.trim()) {
    return required ? 'Ingresa el teléfono del cliente.' : null;
  }
  if (nueveDigitos[0] !== '9') {
    return 'Debe comenzar en 9.';
  }
  if (nueveDigitos.length === 9 && !telefonoMovilChileValido(nueveDigitos)) {
    return 'Debe ser un móvil chileno de 9 dígitos que comience en 9.';
  }
  return null;
}

export function ChilePhoneField({
  label = 'Teléfono *',
  hint = 'Ingresa los 9 dígitos del móvil (comienza en 9). El indicativo +56 se agrega automáticamente.',
  value,
  onChangeValue,
  required = true,
}: Props) {
  const nueveDigitos = useMemo(() => extraerNueveDigitosDesdeGuardado(value), [value]);
  const error = getChilePhoneError(nueveDigitos, required);

  const handleChange = (text: string) => {
    onChangeValue(mergeNineMobileDigits(text));
  };

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
      <View
        style={[
          institutionalInputStyles.inputRow,
          nueveDigitos && error ? institutionalInputStyles.inputError : null,
        ]}
      >
        <InstitutionalText role="body" style={institutionalInputStyles.inputRowPrefix}>
          +56
        </InstitutionalText>
        <TextInput
          style={institutionalInputStyles.inputRowField}
          value={nueveDigitos}
          onChangeText={handleChange}
          placeholder="912345678"
          placeholderTextColor={institutionalInputPlaceholder}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={9}
        />
      </View>
      {error ? (
        <InstitutionalText role="caption" color="semanticDown" style={institutionalInputStyles.errorText}>
          {error}
        </InstitutionalText>
      ) : null}
    </View>
  );
}

export default ChilePhoneField;
