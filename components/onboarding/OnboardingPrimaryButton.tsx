import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import { COLORS } from '@/app/design-system/tokens';
import { onboardingStyles } from '@/app/design-system/styles/onboarding';

const I = COLORS.institutional;

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
};

export default function OnboardingPrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  loadingLabel,
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        onboardingStyles.primaryButton,
        isDisabled && onboardingStyles.primaryButtonDisabled,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.88}
      accessibilityRole="button"
    >
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={I.onPrimary} />
          <Text style={onboardingStyles.primaryButtonText}>{loadingLabel ?? label}</Text>
        </View>
      ) : (
        <Text style={onboardingStyles.primaryButtonText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
