import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
import { institutionalTextStyle } from '@/app/design-system/styles/institutionalTypography';
import LegalFooterLinks from './LegalFooterLinks';

type Props = {
  checked: boolean;
  onToggle: () => void;
  error?: string;
};

export default function LegalAcceptanceRow({ checked, onToggle, error }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={onToggle}
          style={styles.checkboxTouch}
          activeOpacity={0.7}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
        >
          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
            {checked ? (
              <Check size={14} color={COLORS.institutional.onPrimary} strokeWidth={2.5} />
            ) : null}
          </View>
        </TouchableOpacity>
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
  checkboxTouch: { paddingTop: 2, marginRight: SPACING.fixed.sm },
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
  link: institutionalTextStyle('navLink', I.primary),
  error: {
    marginTop: SPACING.fixed.xs,
  },
});
