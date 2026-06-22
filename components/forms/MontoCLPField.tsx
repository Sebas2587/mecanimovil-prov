import React, { useCallback, useEffect, useState } from 'react';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import {
  formatMontoInputLocalized,
  parseMontoDecimal,
} from '@/utils/parseMontoDecimal';

type Props = {
  label?: string;
  hint?: string;
  value: string;
  onChangeValue: (displayValue: string) => void;
  placeholder?: string;
};

export function MontoCLPField({
  label = 'Precio referencia (opcional)',
  hint = 'Usa punto como separador de miles (ej. 170.000).',
  value,
  onChangeValue,
  placeholder = 'Ej. 45.000',
}: Props) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(value);
    }
  }, [value, focused]);

  const handleChange = useCallback(
    (text: string) => {
      const cleaned = text.replace(/[^\d,.]/g, '');
      setDraft(cleaned);
      onChangeValue(cleaned);
    },
    [onChangeValue],
  );

  const handleFocus = useCallback(() => {
    setFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setFocused(false);
    const formatted = draft.trim() ? formatMontoInputLocalized(draft) : '';
    setDraft(formatted);
    onChangeValue(formatted);
  }, [draft, onChangeValue]);

  return (
    <InstitutionalField
      label={label}
      hint={hint}
      value={draft}
      onChangeText={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      keyboardType="numeric"
    />
  );
}

export function parsePrecioReferencia(value: string): number | null {
  const n = parseMontoDecimal(value);
  return n > 0 ? Math.round(n) : null;
}

export { formatMontoInputLocalized };
