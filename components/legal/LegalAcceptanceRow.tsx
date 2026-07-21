import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
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
            {checked ? <Check size={14} color={COLORS.institutional.onPrimary} strokeWidth={2.5} /> : null}
          </View>
        </TouchableOpacity>
        <LegalFooterLinks variant="register" textStyle={styles.text} linkStyle={styles.link} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  checkboxTouch: { paddingTop: 2, marginRight: SPACING.sm },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BORDERS.radius.sm,
    borderWidth: 2,
    borderColor: COLORS.institutional.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.institutional.surfaceSoft,
  },
  checkboxChecked: {
    backgroundColor: COLORS.institutional.primary,
    borderColor: COLORS.institutional.primary,
  },
  text: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 20,
    color: COLORS.institutional.body,
  },
  link: {
    color: COLORS.institutional.primary,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    textDecorationLine: 'underline',
  },
  error: {
    marginTop: SPACING.xs,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.institutional.semanticDown,
  },
});
