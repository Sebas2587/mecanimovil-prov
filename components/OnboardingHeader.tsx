import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, withOpacity } from '@/app/design-system/tokens';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

interface OnboardingHeaderProps {
  title: string;
  subtitle?: string;
  currentStep: number;
  totalSteps: number;
  canGoBack?: boolean;
  backPath?: string;
  icon?: string;
}

export default function OnboardingHeader({
  title,
  subtitle,
  currentStep,
  totalSteps,
  canGoBack = true,
  backPath,
  icon,
}: OnboardingHeaderProps) {
  const router = useRouter();
  const progress = Math.min(100, Math.max(0, (currentStep / totalSteps) * 100));

  const handleGoBack = () => {
    if (backPath) {
      router.push(backPath as any);
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {canGoBack ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Paso anterior"
          >
            <InstitutionalIcon name="chevron-back" size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.backLabel}>Anterior</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.topRowSide} />
        )}

        <Text style={styles.progressLabel}>
          Paso {currentStep} de {totalSteps}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <View style={styles.titleBlock}>
        {icon ? (
          <View style={styles.iconPlate}>
            <InstitutionalIcon name={icon as any} size={28} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
        ) : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.fixed.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
    marginBottom: SPACING.fixed.sm,
  },
  topRowSide: {
    minWidth: 1,
  },
  progressTrack: {
    height: 4,
    backgroundColor: I.hairlineSoft,
    borderRadius: BORDERS.radius.full,
    overflow: 'hidden',
    marginBottom: SPACING.fixed.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: I.primary,
    borderRadius: BORDERS.radius.full,
  },
  progressLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.muted,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    textAlign: 'right',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING.fixed.xs,
    marginLeft: -SPACING.fixed.xs,
  },
  backLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.primary,
  },
  titleBlock: {
    alignItems: 'center',
  },
  iconPlate: {
    width: 56,
    height: 56,
    borderRadius: BORDERS.radius.full,
    backgroundColor: withOpacity(I.primary, 0.08),
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.primary, 0.2),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.fixed.md,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontFamily: FF.sansBold,
    color: I.ink,
    textAlign: 'center',
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
    marginBottom: SPACING.fixed.xs,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.muted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.fixed.sm,
  },
});
