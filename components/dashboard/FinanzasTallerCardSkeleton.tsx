import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, SPACING, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { SkeletonPulse } from '@/components/ui/Skeleton/SkeletonPulse';

const I = COLORS.institutional;
const SKELETON_BASE = I.hairlineSoft;
const SKELETON_MUTED = I.surfaceStrong;

export function FinanzasTallerCardSkeleton() {
  return (
    <View style={styles.cardOuter}>
      <SkeletonPulse>
        <View style={[styles.headerTitle, { backgroundColor: SKELETON_BASE }]} />
      </SkeletonPulse>

      {[0, 1].map((key) => (
        <View key={key} style={styles.barRow}>
          <View style={styles.barMeta}>
            <SkeletonPulse>
              <View style={[styles.labelBar, { backgroundColor: SKELETON_BASE }]} />
            </SkeletonPulse>
            <SkeletonPulse>
              <View style={[styles.pctBar, { backgroundColor: SKELETON_BASE }]} />
            </SkeletonPulse>
          </View>
          <SkeletonPulse>
            <View style={[styles.amountBar, { backgroundColor: SKELETON_MUTED }]} />
          </SkeletonPulse>
          <SkeletonPulse>
            <View style={[styles.progressBar, { backgroundColor: SKELETON_BASE }]} />
          </SkeletonPulse>
        </View>
      ))}

      <View style={styles.creditsRow}>
        <View style={styles.creditsTextBlock}>
          <SkeletonPulse>
            <View style={[styles.creditsLabelBar, { backgroundColor: SKELETON_BASE }]} />
          </SkeletonPulse>
          <SkeletonPulse>
            <View style={[styles.creditsValBar, { backgroundColor: SKELETON_MUTED }]} />
          </SkeletonPulse>
        </View>
        <SkeletonPulse>
          <View style={[styles.btnBar, { backgroundColor: SKELETON_MUTED }]} />
        </SkeletonPulse>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.canvas,
    padding: SPACING.fixed.md,
    gap: SPACING.fixed.sm,
    ...SHADOWS.editorial,
  },
  headerTitle: {
    width: 148,
    height: 14,
    borderRadius: 4,
  },
  barRow: {
    gap: SPACING.fixed.xs,
  },
  barMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelBar: {
    width: 130,
    height: 14,
    borderRadius: 4,
  },
  pctBar: {
    width: 36,
    height: 14,
    borderRadius: 4,
  },
  amountBar: {
    width: 110,
    height: 24,
    borderRadius: 6,
  },
  progressBar: {
    height: 6,
    borderRadius: BORDERS.radius.pill,
    width: '100%',
  },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
    marginTop: 2,
    paddingTop: SPACING.fixed.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  creditsTextBlock: {
    flex: 1,
    gap: 4,
  },
  creditsLabelBar: {
    width: 140,
    height: 14,
    borderRadius: 4,
  },
  creditsValBar: {
    width: 80,
    height: 28,
    borderRadius: 6,
  },
  btnBar: {
    width: 96,
    height: 40,
    borderRadius: BORDERS.radius.pill,
  },
});
