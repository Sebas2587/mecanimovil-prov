import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, SPACING, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { SkeletonPulse } from '@/components/ui/Skeleton/SkeletonPulse';

const I = COLORS.institutional;
const SKELETON_BASE = I.hairlineSoft;
const SKELETON_MUTED = I.surfaceStrong;
const CARD_MIN_HEIGHT = 168;

export function FinanzasTallerCardSkeleton({ fill = false }: { fill?: boolean }) {
  return (
    <View style={[styles.card, fill && styles.cardFill]}>
      <View style={[styles.inner, fill && styles.innerFill]}>
        <SkeletonPulse>
          <View style={[styles.titleBar, { backgroundColor: SKELETON_BASE }]} />
        </SkeletonPulse>
        <SkeletonPulse>
          <View style={[styles.amountBar, { backgroundColor: SKELETON_MUTED }]} />
        </SkeletonPulse>
        <SkeletonPulse>
          <View style={[styles.contextBar, { backgroundColor: SKELETON_BASE }]} />
        </SkeletonPulse>
        <SkeletonPulse>
          <View style={[styles.footerBar, { backgroundColor: SKELETON_BASE }]} />
        </SkeletonPulse>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: COLORS.background.paper,
    minHeight: CARD_MIN_HEIGHT,
    ...SHADOWS.editorial,
  },
  cardFill: {
    flex: 1,
    alignSelf: 'stretch',
  },
  inner: {
    padding: SPACING.md,
    gap: SPACING.sm,
    minHeight: CARD_MIN_HEIGHT,
  },
  innerFill: {
    flex: 1,
    justifyContent: 'space-between',
  },
  titleBar: {
    width: 160,
    height: 18,
    borderRadius: 4,
  },
  amountBar: {
    width: 120,
    height: 28,
    borderRadius: 6,
  },
  contextBar: {
    width: '85%',
    height: 12,
    borderRadius: 4,
  },
  footerBar: {
    width: '100%',
    height: 14,
    borderRadius: 4,
    marginTop: SPACING.sm,
  },
});
