import React from 'react';
import { View, Text } from 'react-native';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS } from '@/app/design-system/tokens';
import { onboardingStyles } from '@/app/design-system/styles/onboarding';

const I = COLORS.institutional;

type Props = {
  children: React.ReactNode;
};

export default function OnboardingNotice({ children }: Props) {
  return (
    <View style={onboardingStyles.notice}>
      <InstitutionalIcon
        name="information-circle"
        size={20}
        color={I.primary}
        strokeWidth={ICON_STROKE_WIDTH}
      />
      <Text style={onboardingStyles.noticeText}>{children}</Text>
    </View>
  );
}
