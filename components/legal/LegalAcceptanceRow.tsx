import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
import { institutionalTextStyle } from '@/app/design-system/styles/institutionalTypography';
import LegalFooterLinks from './LegalFooterLinks';
import { webKeyboardProps } from '@/utils/webKeyboard';

type Props = {
  checked: boolean;
  onToggle: () => void;
  error?: string;
};

export const LEGAL_CONSENT_LABEL =
  'Acepto los términos de uso y la política de privacidad';

export default function LegalAcceptanceRow({ checked, onToggle, error }: Props) {
  const [focused, setFocused] = useState(false);
  const webA11y =
    Platform.OS === 'web'
      ? {
          role: 'checkbox' as const,
          'aria-checked': checked ? ('true' as const) : ('false' as const),
          'aria-label': LEGAL_CONSENT_LABEL,
        }
      : {};

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          testID="legal-consent-checkbox"
          onPress={onToggle}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.checkboxTouch, focused && styles.checkboxTouchFocused]}
          accessibilityRole="checkbox"
          accessibilityLabel={LEGAL_CONSENT_LABEL}
          accessibilityState={{ checked }}
          {...webA11y}
          {...webKeyboardProps(false, onToggle)}
        >
          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
            {checked ? (
              <Check size={14} color={COLORS.institutional.onPrimary} strokeWidth={2.5} />
            ) : null}
          </View>
        </Pressable>
        <LegalFooterLinks variant="register" textStyle={styles.text} linkStyle={styles.link} />
      </View>
      {error ? (
        <InstitutionalText role="small" color="semanticDown" style={styles.error}>
          {error}
        </InstitutionalText>
      ) : null}
    </View>
  );
}

const I = COLORS.institutional;

const styles = StyleSheet.create({
  wrap: { marginBottom: SPACING.fixed.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  checkboxTouch: {
    paddingTop: 2,
    marginRight: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.sm,
  },
  checkboxTouchFocused: Platform.select({
    web: {
      outlineWidth: 2,
      outlineStyle: 'solid',
      outlineColor: COLORS.border.focus,
      outlineOffset: 2,
    },
    default: {
      borderWidth: 2,
      borderColor: COLORS.border.focus,
    },
  }) as object,
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BORDERS.radius.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.surfaceSoft,
  },
  checkboxChecked: {
    backgroundColor: I.primary,
    borderColor: I.primary,
  },
  text: {
    flex: 1,
    ...institutionalTextStyle('caption', I.body),
  },
  link: institutionalTextStyle('navLink', COLORS.primary[700]),
  error: {
    marginTop: SPACING.fixed.xs,
  },
});
