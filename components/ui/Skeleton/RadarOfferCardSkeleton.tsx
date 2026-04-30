import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonPulse } from '@/components/ui/Skeleton/SkeletonPulse';
import { dashboardMirrorStyles } from '@/components/ui/Skeleton/dashboardMirrorStyles';
import { SKELETON_BASE, SKELETON_MUTED } from '@/components/ui/Skeleton/skeletonTokens';

/**
 * Espejo estructural de la tarjeta radar (oportunidad) del dashboard.
 */
export const RadarOfferCardSkeleton = React.memo(function RadarOfferCardSkeleton() {
  return (
    <View style={dashboardMirrorStyles.radarOffer}>
      <View style={dashboardMirrorStyles.radarOfferTop}>
        <View style={styles.leftCol}>
          <SkeletonPulse>
            <View style={[styles.lineLg, { backgroundColor: SKELETON_MUTED }]} />
          </SkeletonPulse>
          <SkeletonPulse>
            <View style={[styles.lineSm, { backgroundColor: SKELETON_BASE }]} />
          </SkeletonPulse>
        </View>
        <SkeletonPulse>
          <View style={[styles.timer, { backgroundColor: SKELETON_BASE }]} />
        </SkeletonPulse>
      </View>
      <SkeletonPulse>
        <View style={[dashboardMirrorStyles.radarCTA, styles.ctaFill]}>
          <View style={[styles.ctaBar, { backgroundColor: SKELETON_MUTED }]} />
        </View>
      </SkeletonPulse>
    </View>
  );
});

const styles = StyleSheet.create({
  leftCol: {
    flex: 1,
    marginRight: 8,
    gap: 6,
    justifyContent: 'center',
  },
  lineLg: {
    height: 15,
    borderRadius: 4,
    width: '88%',
    marginBottom: 4,
  },
  lineSm: {
    height: 13,
    borderRadius: 4,
    width: '58%',
  },
  timer: {
    width: 72,
    height: 28,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ctaFill: {
    backgroundColor: '#DBEAFE',
  },
  ctaBar: {
    alignSelf: 'center',
    height: 14,
    width: '42%',
    borderRadius: 4,
  },
});
