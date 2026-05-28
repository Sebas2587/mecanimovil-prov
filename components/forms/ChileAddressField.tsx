import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS } from '@/app/design-system/tokens';
import { onboardingStyles } from '@/app/design-system/styles/onboarding';
import {
  CHILE_ADDRESS_MIN_QUERY,
  formatChileAddressFromHit,
  formatHitForSuggestion,
  isPlausibleChileAddressQuery,
  isStructuredChileAddressComplete,
  searchChileAddressesDetailed,
  type ChileAddressHitDetailed,
  type ChileFormattedAddress,
} from '@/utils/chileAddressSearch';

const I = COLORS.institutional;
const DEBOUNCE_MS = 480;

export type ChileAddressValidationStatus =
  | 'idle'
  | 'too_short'
  | 'searching'
  | 'pick_suggestion'
  | 'valid'
  | 'invalid'
  | 'error';

type Props = {
  label: string;
  hint?: string;
  value: string;
  validated: ChileFormattedAddress | null;
  onChangeText: (text: string) => void;
  onValidatedChange: (address: ChileFormattedAddress | null) => void;
  inputStyle?: TextStyle | TextStyle[];
  placeholder?: string;
  editable?: boolean;
  textInputProps?: Omit<TextInputProps, 'value' | 'onChangeText' | 'style' | 'placeholder'>;
};

export default function ChileAddressField({
  label,
  hint,
  value,
  validated,
  onChangeText,
  onValidatedChange,
  inputStyle,
  placeholder = 'Ej: Los Leones 1200, Providencia',
  editable = true,
  textInputProps,
}: Props) {
  const [suggestions, setSuggestions] = useState<ChileAddressHitDetailed[]>([]);
  const [status, setStatus] = useState<ChileAddressValidationStatus>('idle');
  /** Invalida respuestas obsoletas sin depender solo de AbortSignal (evita uncaught en web). */
  const searchGenerationRef = useRef(0);
  const skipSearchRef = useRef(false);

  const borderStyle = (() => {
    if (status === 'valid') return styles.inputBorderOk;
    if (status === 'invalid' || status === 'too_short') return styles.inputBorderErr;
    if (status === 'pick_suggestion') return styles.inputBorderWarn;
    return null;
  })();

  const onSelectHit = useCallback(
    (hit: ChileAddressHitDetailed) => {
      if (!isStructuredChileAddressComplete(hit.address)) {
        setStatus('invalid');
        onValidatedChange(null);
        return;
      }
      const formatted = formatChileAddressFromHit(hit, value);
      skipSearchRef.current = true;
      onChangeText(formatted.line);
      onValidatedChange(formatted);
      setSuggestions([]);
      setStatus('valid');
    },
    [onChangeText, onValidatedChange, value]
  );

  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }

    if (validated && value.trim() === validated.line.trim()) {
      setStatus('valid');
      setSuggestions([]);
      return;
    }

    onValidatedChange(null);
    const q = value.trim();

    if (!q) {
      setSuggestions([]);
      setStatus('idle');
      searchGenerationRef.current += 1;
      return;
    }

    if (!isPlausibleChileAddressQuery(q)) {
      setSuggestions([]);
      setStatus(q.length > 0 ? 'too_short' : 'idle');
      searchGenerationRef.current += 1;
      return;
    }

    const generation = ++searchGenerationRef.current;

    const timer = setTimeout(async () => {
      if (generation !== searchGenerationRef.current) return;

      setStatus('searching');
      const ac = new AbortController();

      try {
        const hits = await searchChileAddressesDetailed(q, { limit: 8, signal: ac.signal });
        if (generation !== searchGenerationRef.current) return;
        setSuggestions(hits);
        if (hits.length === 0) {
          setStatus('invalid');
        } else {
          setStatus('pick_suggestion');
        }
      } catch (error) {
        if (generation !== searchGenerationRef.current) return;
        const aborted =
          (error instanceof Error &&
            (error.name === 'AbortError' || error.message.includes('aborted'))) ||
          ac.signal.aborted;
        if (aborted) return;
        setSuggestions([]);
        setStatus('error');
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      searchGenerationRef.current += 1;
    };
  }, [value, validated, onValidatedChange]);

  const feedback = (() => {
    switch (status) {
      case 'too_short':
        return `Escribe al menos ${CHILE_ADDRESS_MIN_QUERY} caracteres e incluye el número de calle.`;
      case 'searching':
        return 'Buscando direcciones en Chile…';
      case 'pick_suggestion':
        return 'Elige una dirección de la lista (comuna y región verificadas).';
      case 'valid':
        return validated
          ? `Ubicación confirmada: ${validated.comuna}${validated.region ? `, ${validated.region}` : ''}`
          : 'Dirección confirmada.';
      case 'invalid':
        return 'No encontramos esa dirección en Chile. Revisa calle, número, comuna y región.';
      case 'error':
        return 'No pudimos consultar el mapa. Revisa tu conexión.';
      default:
        return hint ?? 'Usa calle con número, comuna y región (ej. Av. Providencia 1200, Providencia).';
    }
  })();

  return (
    <View style={styles.wrap}>
      <Text style={onboardingStyles.label}>{label}</Text>
      <TextInput
        style={[
          onboardingStyles.input,
          styles.inputMinHeight,
          borderStyle ?? undefined,
          ...(Array.isArray(inputStyle) ? inputStyle : inputStyle ? [inputStyle] : []),
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={I.mutedSoft}
        editable={editable}
        autoCorrect={false}
        autoCapitalize="words"
        multiline
        numberOfLines={2}
        {...textInputProps}
      />

      <View style={styles.feedbackRow}>
        {status === 'searching' ? (
          <ActivityIndicator size="small" color={I.primary} />
        ) : status === 'valid' ? (
          <InstitutionalIcon name="checkmark-circle" size={16} color={I.semanticUp} strokeWidth={ICON_STROKE_WIDTH} />
        ) : status === 'invalid' || status === 'too_short' ? (
          <InstitutionalIcon name="alert-circle-outline" size={16} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
        ) : (
          <InstitutionalIcon name="information-circle-outline" size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
        )}
        <Text
          style={[
            styles.feedbackText,
            status === 'valid' && styles.feedbackOk,
            (status === 'invalid' || status === 'too_short') && styles.feedbackErr,
            status === 'pick_suggestion' && styles.feedbackWarn,
          ]}
        >
          {feedback}
        </Text>
      </View>

      {suggestions.length > 0 && status === 'pick_suggestion' ? (
        <View style={styles.suggestionsBox}>
          {suggestions.map((hit, idx) => {
            const { mainText, secondaryText } = formatHitForSuggestion(hit);
            return (
              <TouchableOpacity
                key={`${hit.lat}-${hit.lon}-${idx}`}
                style={styles.suggestionRow}
                onPress={() => onSelectHit(hit)}
                activeOpacity={0.75}
              >
                <InstitutionalIcon name="location-outline" size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <View style={styles.suggestionTexts}>
                  <Text style={styles.suggestionMain} numberOfLines={2}>
                    {mainText}
                  </Text>
                  <Text style={styles.suggestionSecondary} numberOfLines={1}>
                    {secondaryText}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  inputMinHeight: {
    minHeight: 52,
    textAlignVertical: 'top',
  },
  inputBorderOk: {
    borderColor: I.semanticUp,
    borderWidth: 1.5,
  } as TextStyle,
  inputBorderErr: {
    borderColor: I.semanticDown,
    borderWidth: 1.5,
  } as TextStyle,
  inputBorderWarn: {
    borderColor: I.accentYellow,
    borderWidth: 1.5,
  } as TextStyle,
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
  },
  feedbackText: {
    flex: 1,
    fontSize: 13,
    color: I.muted,
    lineHeight: 18,
  },
  feedbackOk: {
    color: I.semanticUp,
  },
  feedbackErr: {
    color: I.semanticDown,
  },
  feedbackWarn: {
    color: I.body,
  },
  suggestionsBox: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: I.hairline,
    backgroundColor: I.canvas,
    overflow: 'hidden',
    maxHeight: 280,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  suggestionTexts: {
    flex: 1,
  },
  suggestionMain: {
    fontSize: 14,
    color: I.ink,
    fontWeight: '500',
  },
  suggestionSecondary: {
    fontSize: 12,
    color: I.muted,
    marginTop: 2,
  },
});
