import React, { useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, type TextStyle } from 'react-native';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { onboardingInputPlaceholder, onboardingStyles } from '@/app/design-system/styles/onboarding';
import {
  mergeNineMobileDigits,
  telefonoCompletoDesdeNacional,
  telefonoMovilChileValido,
  extraerNueveDigitosDesdeGuardado,
} from '@/utils/chilePhone';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

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
  if (!telefonoMovilChileValido(nueveDigitos)) {
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
  const isValid = nueveDigitos.length > 0 && telefonoMovilChileValido(nueveDigitos);

  const rowStyle = useMemo(() => {
    if (!nueveDigitos) return styles.phoneRow;
    if (error) return [styles.phoneRow, styles.phoneRowErr];
    if (isValid) return [styles.phoneRow, styles.phoneRowOk];
    return styles.phoneRow;
  }, [nueveDigitos, error, isValid]);

  const handleChange = (text: string) => {
    const digits = mergeNineMobileDigits(text);
    onChangeValue(digits ? telefonoCompletoDesdeNacional(digits) : '');
  };

  return (
    <View style={styles.wrap}>
      <Text style={onboardingStyles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={rowStyle}>
        <Text style={styles.phonePrefix}>+56</Text>
        <TextInput
          style={styles.phoneInput}
          value={nueveDigitos}
          onChangeText={handleChange}
          placeholder="912345678"
          placeholderTextColor={onboardingInputPlaceholder}
          keyboardType="number-pad"
          maxLength={9}
        />
        {isValid ? (
          <InstitutionalIcon name="checkmark-circle" size={18} color={I.semanticUp} strokeWidth={ICON_STROKE_WIDTH} />
        ) : null}
      </View>
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
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.canvas,
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.sm + 2,
    minHeight: 52,
  },
  phoneRowErr: {
    borderColor: I.semanticDown,
    borderWidth: BORDERS.width.medium,
  },
  phoneRowOk: {
    borderColor: I.semanticUp,
    borderWidth: BORDERS.width.medium,
  },
  phonePrefix: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.monoMedium,
    color: I.ink,
  },
  phoneInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.sansRegular,
    color: I.ink,
    paddingVertical: SPACING.fixed.xxs,
  } as TextStyle,
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.semanticDown,
    marginTop: SPACING.fixed.xxs,
  },
});
