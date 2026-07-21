import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { Card } from '@/app/design-system/components';
import { SkeletonPulse } from '@/components/ui/Skeleton/SkeletonPulse';

const I = COLORS.institutional;
const SKELETON_BASE = I.hairlineSoft;
const SKELETON_MUTED = I.surfaceStrong;
const CARD_MIN_HEIGHT = 168;

export function FinanzasTallerCardSkeleton({
  fill = false,
  inset = false,
  style,
}: {
  fill?: boolean;
  inset?: boolean;
  style?: object;
}) {
  const body = (
    <View style={[styles.inner, inset && styles.innerInset, fill && styles.innerFill]}>
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
  );

  if (inset) {
    return <View style={[styles.cardInset, fill && styles.cardFill, style]}>{body}</View>;
  }

  return (
    <Card elevated padding={0} style={[styles.card, fill && styles.cardFill, style]}>
      {body}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: CARD_MIN_HEIGHT,
  },
  cardInset: {
    minHeight: 0,
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
  innerInset: {
    paddingHorizontal: 0,
    paddingVertical: SPACING.sm,
    minHeight: 0,
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
