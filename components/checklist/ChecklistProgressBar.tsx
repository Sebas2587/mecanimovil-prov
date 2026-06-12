import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChecklistItemTemplate } from '@/services/checklistService';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

interface ChecklistProgressBarProps {
  currentStep: number;
  totalSteps: number;
  progreso: number;
  items: ChecklistItemTemplate[];
  completedItemIds?: number[];
}

export const ChecklistProgressBar: React.FC<ChecklistProgressBarProps> = ({
  currentStep,
  totalSteps,
  progreso,
  items,
  completedItemIds = [],
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.progressInfo}>
        <Text style={styles.progressText}>{Math.round(progreso)}% completado</Text>
        <Text style={styles.stepText}>
          {currentStep}/{totalSteps} ítems
        </Text>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${Math.min(100, Math.max(0, progreso))}%` }]} />
        </View>
      </View>

      <View style={styles.stepsContainer}>
        {items.map((item, index) => {
          const isCompleted = completedItemIds.includes(item.id) || progreso === 100;

          return (
            <View key={item.id} style={styles.stepIndicator}>
              <View
                style={[
                  styles.stepCircle,
                  isCompleted && styles.stepCircleCompleted,
                  !isCompleted && styles.stepCircleNext,
                ]}
              >
                {isCompleted ? (
                  <InstitutionalIcon name="check" size={12} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                ) : (
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                )}
              </View>

              {item.es_obligatorio ? (
                <View style={styles.requiredIndicator}>
                  <InstitutionalIcon name="star" size={8} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.sm,
    backgroundColor: I.surfaceStrong,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: I.hairline,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.fixed.xs,
  },
  progressText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  stepText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.muted,
  },
  progressBarContainer: {
    marginBottom: SPACING.fixed.sm,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: I.hairlineSoft,
    borderRadius: BORDERS.radius.pill,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: I.primary,
    borderRadius: BORDERS.radius.pill,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepIndicator: {
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: I.canvas,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  stepCircleCompleted: {
    backgroundColor: I.semanticUp,
    borderColor: I.semanticUp,
  },
  stepCircleNext: {
    backgroundColor: I.canvas,
    borderColor: I.hairline,
  },
  stepNumber: {
    fontSize: 10,
    fontFamily: FF.sansSemiBold,
    color: I.muted,
  },
  requiredIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: I.canvas,
    borderRadius: 6,
    padding: 1,
  },
});
