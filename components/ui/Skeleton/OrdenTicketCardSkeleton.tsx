import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonPulse } from '@/components/ui/Skeleton/SkeletonPulse';
import { dashboardMirrorStyles } from '@/components/ui/Skeleton/dashboardMirrorStyles';
import { SKELETON_BASE, SKELETON_MUTED } from '@/components/ui/Skeleton/skeletonTokens';

/**
 * Espejo estructural del ticket de orden en curso (`ticketCard` + secciones internas).
 */
export const OrdenTicketCardSkeleton = React.memo(function OrdenTicketCardSkeleton() {
  return (
    <View style={dashboardMirrorStyles.ticketCard}>
      <View style={dashboardMirrorStyles.ticketTop}>
        <View style={dashboardMirrorStyles.ticketBadgeRow}>
          <SkeletonPulse>
            <View style={styles.badgeChunk}>
              <View style={[styles.dot, { backgroundColor: SKELETON_MUTED }]} />
              <View style={[styles.badgeText, { backgroundColor: SKELETON_BASE }]} />
            </View>
          </SkeletonPulse>
          <SkeletonPulse>
            <View style={[styles.timePill, { backgroundColor: SKELETON_BASE }]} />
          </SkeletonPulse>
        </View>
      </View>

      <View style={dashboardMirrorStyles.ticketDash} />

      <View style={dashboardMirrorStyles.ticketBody}>
        <SkeletonPulse>
          <View style={[styles.titleLine, { backgroundColor: SKELETON_MUTED }]} />
        </SkeletonPulse>
        <SkeletonPulse>
          <View style={[styles.titleLineShort, { backgroundColor: SKELETON_BASE }]} />
        </SkeletonPulse>

        <View style={styles.clientRow}>
          <SkeletonPulse>
            <View style={[styles.avatar, { backgroundColor: SKELETON_BASE }]} />
          </SkeletonPulse>
          <SkeletonPulse style={{ flex: 1 }}>
            <View style={[styles.nameLine, { backgroundColor: SKELETON_MUTED }]} />
          </SkeletonPulse>
        </View>

        <View style={dashboardMirrorStyles.ticketFooter}>
          <SkeletonPulse style={{ flex: 1, marginRight: 8 }}>
            <View style={[styles.metaLine, { backgroundColor: SKELETON_BASE }]} />
          </SkeletonPulse>
          <SkeletonPulse>
            <View style={[styles.priceBlock, { backgroundColor: SKELETON_BASE }]} />
          </SkeletonPulse>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  badgeChunk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    height: 13,
    width: 120,
    borderRadius: 4,
  },
  timePill: {
    height: 16,
    width: 52,
    borderRadius: 4,
  },
  titleLine: {
    height: 16,
    borderRadius: 4,
    width: '100%',
  },
  titleLineShort: {
    height: 16,
    borderRadius: 4,
    width: '72%',
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  nameLine: {
    height: 14,
    borderRadius: 4,
    width: '65%',
  },
  metaLine: {
    height: 13,
    borderRadius: 4,
    width: '70%',
  },
  priceBlock: {
    width: 72,
    height: 40,
    borderRadius: 8,
  },
});
