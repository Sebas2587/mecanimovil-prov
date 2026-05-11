import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, X, Search, AlertCircle } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;

export type PhoneCountry = {
  code: string;
  name: string;
  flag: string;
  digits?: number;
  minDigits?: number;
  maxDigits?: number;
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: '+56', name: 'Chile', flag: '🇨🇱', digits: 9 },
  { code: '+54', name: 'Argentina', flag: '🇦🇷', minDigits: 10, maxDigits: 11 },
  { code: '+57', name: 'Colombia', flag: '🇨🇴', digits: 10 },
  { code: '+52', name: 'México', flag: '🇲🇽', digits: 10 },
  { code: '+51', name: 'Perú', flag: '🇵🇪', digits: 9 },
  { code: '+58', name: 'Venezuela', flag: '🇻🇪', digits: 10 },
  { code: '+34', name: 'España', flag: '🇪🇸', digits: 9 },
  { code: '+1', name: 'EE.UU. / Canadá', flag: '🇺🇸', digits: 10 },
  { code: '+55', name: 'Brasil', flag: '🇧🇷', minDigits: 10, maxDigits: 11 },
  { code: '+598', name: 'Uruguay', flag: '🇺🇾', digits: 8 },
  { code: '+595', name: 'Paraguay', flag: '🇵🇾', digits: 9 },
  { code: '+591', name: 'Bolivia', flag: '🇧🇴', digits: 8 },
  { code: '+593', name: 'Ecuador', flag: '🇪🇨', digits: 9 },
  { code: '+507', name: 'Panamá', flag: '🇵🇦', digits: 8 },
  { code: '+506', name: 'Costa Rica', flag: '🇨🇷', digits: 8 },
  { code: '+502', name: 'Guatemala', flag: '🇬🇹', digits: 8 },
  { code: '+504', name: 'Honduras', flag: '🇭🇳', digits: 8 },
  { code: '+503', name: 'El Salvador', flag: '🇸🇻', digits: 8 },
  { code: '+505', name: 'Nicaragua', flag: '🇳🇮', digits: 8 },
  { code: '+44', name: 'Reino Unido', flag: '🇬🇧', digits: 10 },
  { code: '+39', name: 'Italia', flag: '🇮🇹', digits: 10 },
  { code: '+49', name: 'Alemania', flag: '🇩🇪', digits: 11 },
];

/**
 * Interpreta un teléfono guardado (p. ej. "+56912345678") en país + número local.
 * Por defecto Chile si no coincide ningún prefijo.
 */
export function parsePhoneValue(value: string | undefined | null): {
  country: PhoneCountry;
  number: string;
} {
  if (!value) return { country: PHONE_COUNTRIES[0], number: '' };
  const str = String(value).trim();
  if (str.startsWith('+')) {
    const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.code.length - a.code.length);
    for (const c of sorted) {
      if (str.startsWith(c.code)) {
        return { country: c, number: str.slice(c.code.length).replace(/\D/g, '') };
      }
    }
  }
  return { country: PHONE_COUNTRIES[0], number: str.replace(/\D/g, '') };
}

/**
 * Valida solo los dígitos locales para el país. Vacío = válido (teléfono opcional).
 */
export function validatePhoneDigits(country: PhoneCountry, number: string): string | null {
  const digits = number.replace(/\D/g, '');
  if (!digits) return null;
  const min = country.minDigits ?? country.digits;
  const max = country.maxDigits ?? country.digits;
  if (min === undefined || max === undefined) return null;
  if (digits.length < min || digits.length > max) {
    const expected = min === max ? `${min}` : `${min}–${max}`;
    return `El número debe tener ${expected} dígitos para ${country.name}`;
  }
  return null;
}

/** Valida el valor completo E.164 parcial almacenado en estado (opcional si está vacío). */
export function validateFullPhone(value: string | undefined | null): string | null {
  const { country, number } = parsePhoneValue(value);
  return validatePhoneDigits(country, number);
}

export type PhoneInputProps = {
  value?: string;
  onChangeText?: (fullPhone: string) => void;
  error?: string | null;
  label?: string;
  editable?: boolean;
};

export default function PhoneInput({
  value = '',
  onChangeText,
  error,
  label = 'Teléfono',
  editable = true,
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<PhoneCountry>(() => parsePhoneValue(value).country);
  const [number, setNumber] = useState(() => parsePhoneValue(value).number);
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const p = parsePhoneValue(value);
    setSelectedCountry(p.country);
    setNumber(p.number);
  }, [value]);

  const filteredCountries = useMemo(() => {
    if (!search) return PHONE_COUNTRIES;
    const q = search.toLowerCase();
    return PHONE_COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.includes(q),
    );
  }, [search]);

  const handleNumberChange = useCallback(
    (text: string) => {
      const digits = text.replace(/\D/g, '');
      setNumber(digits);
      setTouched(true);
      onChangeText?.(digits ? `${selectedCountry.code}${digits}` : '');
    },
    [selectedCountry, onChangeText],
  );

  const handleCountrySelect = useCallback(
    (country: PhoneCountry) => {
      setSelectedCountry(country);
      setModalVisible(false);
      setSearch('');
      setTouched(true);
      onChangeText?.(number ? `${country.code}${number}` : '');
    },
    [number, onChangeText],
  );

  const validationError = touched ? validatePhoneDigits(selectedCountry, number) : null;
  const displayError = error || validationError;

  const renderCountryItem = useCallback(
    ({ item }: { item: PhoneCountry }) => {
      const selected =
        item.code === selectedCountry.code && item.name === selectedCountry.name;
      return (
        <TouchableOpacity
          style={[styles.countryItem, selected && styles.countryItemSelected]}
          onPress={() => handleCountrySelect(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.countryFlag}>{item.flag}</Text>
          <Text style={styles.countryName}>{item.name}</Text>
          <Text style={styles.countryCode}>{item.code}</Text>
        </TouchableOpacity>
      );
    },
    [selectedCountry, handleCountrySelect],
  );

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={styles.label}>{label}</Text>
      ) : null}

      <View style={[styles.inputRow, displayError ? styles.inputRowError : null]}>
        <TouchableOpacity
          style={styles.countrySelector}
          onPress={() => editable && setModalVisible(true)}
          activeOpacity={editable ? 0.7 : 1}
          accessibilityLabel={`País: ${selectedCountry.name}`}
          disabled={!editable}
        >
          <Text style={styles.flag}>{selectedCountry.flag}</Text>
          <Text style={styles.dialCode}>{selectedCountry.code}</Text>
          {editable ? (
            <ChevronDown size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          ) : null}
        </TouchableOpacity>

        <View style={styles.divider} />

        <TextInput
          style={styles.numberInput}
          value={number}
          onChangeText={handleNumberChange}
          placeholder="912 345 678"
          placeholderTextColor={I.mutedSoft}
          keyboardType="phone-pad"
          editable={editable}
          maxLength={15}
          onBlur={() => setTouched(true)}
          accessibilityLabel={label}
        />
      </View>

      {displayError ? (
        <View style={styles.errorRow}>
          <AlertCircle size={14} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={styles.errorText}>{displayError}</Text>
        </View>
      ) : null}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView edges={['bottom']} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar país</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSearch('');
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <X size={24} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchRow}>
              <Search size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar país o código..."
                placeholderTextColor={I.mutedSoft}
                autoCorrect={false}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')} accessibilityRole="button">
                  <X size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => `${item.code}-${item.name}`}
              renderItem={renderCountryItem}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 0,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    textTransform: 'uppercase',
    color: I.muted,
    marginBottom: SPACING.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.surfaceSoft,
    overflow: 'hidden',
    minHeight: 48,
  },
  inputRowError: {
    borderColor: I.semanticDown,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 10,
    gap: 4,
  },
  flag: {
    fontSize: 20,
    lineHeight: Platform.OS === 'android' ? 24 : 22,
  },
  dialCode: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    color: I.ink,
    minWidth: 40,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: I.hairline,
    marginVertical: 12,
  },
  numberInput: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.ink,
    minHeight: 48,
    paddingVertical: 12,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.xs,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.semanticDown,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: I.canvas,
    borderTopLeftRadius: BORDERS.radius['2xl'],
    borderTopRightRadius: BORDERS.radius['2xl'],
    maxHeight: '80%',
    paddingBottom: SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    color: I.ink,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    margin: SPACING.md,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.sm,
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.ink,
    minHeight: 36,
    paddingVertical: 4,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 13,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  countryItemSelected: {
    backgroundColor: I.surfaceStrong,
  },
  countryFlag: {
    fontSize: 22,
    width: 30,
    textAlign: 'center',
  },
  countryName: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.ink,
  },
  countryCode: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    color: I.muted,
    minWidth: 44,
    textAlign: 'right',
  },
});
