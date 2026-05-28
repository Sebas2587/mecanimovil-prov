import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { onboardingStyles } from '@/app/design-system/styles/onboarding';

type Props = {
  children: React.ReactNode;
  footer?: React.ReactNode;
  keyboardAvoiding?: boolean;
  scrollProps?: ScrollViewProps;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
};

/**
 * Shell institucional para pasos de onboarding: canvas suave, contenido centrado en web,
 * footer fijo tipo Coinbase (CTA anclado abajo).
 */
export default function OnboardingScreenLayout({
  children,
  footer,
  keyboardAvoiding = false,
  scrollProps,
  edges = ['top'],
}: Props) {
  const body = (
    <View style={onboardingStyles.contentWrapper}>
      <ScrollView
        style={onboardingStyles.scrollView}
        contentContainerStyle={onboardingStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        {...scrollProps}
      >
        {children}
      </ScrollView>
      {footer ? (
        <SafeAreaView edges={['bottom']} style={onboardingStyles.footer}>
          {footer}
        </SafeAreaView>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={onboardingStyles.screen} edges={edges}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}
