import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

interface ChecklistProgressBarProps {
  currentStep: number;
  totalSteps: number;
  progreso: number;
}

export const ChecklistProgressBar: React.FC<ChecklistProgressBarProps> = ({
  currentStep,
  totalSteps,
  progreso,
}) => {
  const pct = Math.min(100, Math.max(0, progreso));

  return (
    <View style={styles.container}>
      <View style={styles.progressInfo}>
        <Text style={styles.progressText}>{Math.round(pct)}%</Text>
        <Text style={styles.stepText}>
          {currentStep}/{totalSteps} ítems
        </Text>
      </View>

      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.xs,
    backgroundColor: I.canvas,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: I.hairline,
    gap: SPACING.fixed.xxs,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  stepText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.muted,
  },
  progressBarBackground: {
    height: 3,
    backgroundColor: I.hairlineSoft,
    borderRadius: BORDERS.radius.pill,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: I.primary,
    borderRadius: BORDERS.radius.pill,
  },
});
