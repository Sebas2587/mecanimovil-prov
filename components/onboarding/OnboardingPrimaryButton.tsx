import React from 'react';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';

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
  return (
    <InstitutionalButton
      label={loadingLabel ?? label}
      onPress={onPress}
      variant="primary"
      size="default"
      disabled={disabled}
      loading={loading}
      style={{ width: '100%' }}
    />
  );
}
