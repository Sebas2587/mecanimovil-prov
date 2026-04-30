import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, FlatList, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { SkeletonPulse } from '@/components/ui/Skeleton/SkeletonPulse';
import { RadarOfferCardSkeleton } from '@/components/ui/Skeleton/RadarOfferCardSkeleton';
import { OrdenTicketCardSkeleton } from '@/components/ui/Skeleton/OrdenTicketCardSkeleton';
import { useDashboardCarouselMetrics } from '@/app/components/dashboard/useDashboardCarouselMetrics';
import { SKELETON_BASE, SKELETON_MUTED, SKELETON_STRIP } from '@/components/ui/Skeleton/skeletonTokens';

const PLACEHOLDER_KEYS = [0, 1, 2] as const;

type DashboardScreenSkeletonProps = {
  subtitle: string;
};

/**
 * Esqueleto de pantalla completa (auth / perfil cargando) alineado al layout del home.
 */
export const DashboardScreenSkeleton = React.memo(function DashboardScreenSkeleton({
  subtitle,
}: DashboardScreenSkeletonProps) {
  const insets = useSafeAreaInsets();
  const { itemWidth, itemGap, snapInterval, contentHorizontalPad } =
    useDashboardCarouselMetrics();

  const keyExtractor = useCallback((item: number) => String(item), []);

  const renderRadarSlot = useCallback(
    (_: { item: number }) => (
      <View style={{ width: itemWidth, marginRight: itemGap }}>
        <RadarOfferCardSkeleton />
      </View>
    ),
    [itemGap, itemWidth]
  );

  const renderOrderSlot = useCallback(
    (_: { item: number }) => (
      <View style={{ width: itemWidth, marginRight: itemGap }}>
        <OrdenTicketCardSkeleton />
      </View>
    ),
    [itemGap, itemWidth]
  );

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <SkeletonPulse>
              <View style={[styles.avatar, { backgroundColor: SKELETON_BASE }]} />
            </SkeletonPulse>
            <View style={styles.headerTextCol}>
              <SkeletonPulse>
                <View style={[styles.welcomeLine, { backgroundColor: SKELETON_BASE }]} />
              </SkeletonPulse>
              <SkeletonPulse>
                <View style={[styles.nameLine, { backgroundColor: SKELETON_MUTED }]} />
              </SkeletonPulse>
            </View>
          </View>
          <SkeletonPulse>
            <View style={[styles.bell, { backgroundColor: SKELETON_STRIP }]} />
          </SkeletonPulse>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={Platform.OS === 'android'}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <View style={styles.sectionWrap}>
          <View style={styles.glassOuter}>
            <BlurView intensity={60} tint="light" style={styles.glassInner}>
              <View style={styles.finHeader}>
                <SkeletonPulse>
                  <View style={[styles.finTitle, { backgroundColor: SKELETON_BASE }]} />
                </SkeletonPulse>
                <SkeletonPulse>
                  <View style={[styles.finBadge, { backgroundColor: SKELETON_STRIP }]} />
                </SkeletonPulse>
              </View>
              <View style={styles.finBody}>
                <View style={styles.finCol}>
                  <SkeletonPulse>
                    <View style={[styles.finIcon, { backgroundColor: SKELETON_BASE }]} />
                  </SkeletonPulse>
                  <SkeletonPulse>
                    <View style={[styles.finLabel, { backgroundColor: SKELETON_BASE }]} />
                  </SkeletonPulse>
                  <SkeletonPulse>
                    <View style={[styles.finVal, { backgroundColor: SKELETON_MUTED }]} />
                  </SkeletonPulse>
                </View>
                <View style={styles.finDivider} />
                <View style={styles.finCol}>
                  <SkeletonPulse>
                    <View style={[styles.finIcon, { backgroundColor: SKELETON_BASE }]} />
                  </SkeletonPulse>
                  <SkeletonPulse>
                    <View style={[styles.finLabel, { backgroundColor: SKELETON_BASE }]} />
                  </SkeletonPulse>
                  <SkeletonPulse>
                    <View style={[styles.finValSm, { backgroundColor: SKELETON_MUTED }]} />
                  </SkeletonPulse>
                  <SkeletonPulse>
                    <View style={[styles.finGrowth, { backgroundColor: SKELETON_BASE }]} />
                  </SkeletonPulse>
                </View>
              </View>
            </BlurView>
          </View>
        </View>

        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <SkeletonPulse>
              <View style={[styles.iconBox, { backgroundColor: SKELETON_BASE }]} />
            </SkeletonPulse>
            <SkeletonPulse>
              <View style={[styles.sectionTitleBar, { backgroundColor: SKELETON_MUTED }]} />
            </SkeletonPulse>
            <View style={{ flex: 1 }} />
            <SkeletonPulse>
              <View style={[styles.switchBar, { backgroundColor: SKELETON_BASE }]} />
            </SkeletonPulse>
          </View>
          <View style={styles.glassOuter}>
            <BlurView intensity={60} tint="light" style={styles.glassInner}>
              <View style={styles.radarBody}>
                <FlatList
                  horizontal
                  data={[...PLACEHOLDER_KEYS]}
                  keyExtractor={keyExtractor}
                  renderItem={renderRadarSlot}
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={snapInterval}
                  snapToAlignment="center"
                  decelerationRate="fast"
                  scrollEnabled={false}
                  contentContainerStyle={[
                    styles.hListContent,
                    {
                      paddingHorizontal: contentHorizontalPad,
                      paddingRight: contentHorizontalPad + itemGap,
                    },
                  ]}
                />
              </View>
            </BlurView>
          </View>
        </View>

        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <SkeletonPulse>
              <View style={[styles.iconBox, { backgroundColor: SKELETON_BASE }]} />
            </SkeletonPulse>
            <SkeletonPulse>
              <View style={[styles.sectionTitleBarMd, { backgroundColor: SKELETON_MUTED }]} />
            </SkeletonPulse>
            <View style={{ flex: 1 }} />
            <SkeletonPulse>
              <View style={[styles.linkBar, { backgroundColor: SKELETON_BASE }]} />
            </SkeletonPulse>
          </View>
          <FlatList
            horizontal
            data={[...PLACEHOLDER_KEYS]}
            keyExtractor={keyExtractor}
            renderItem={renderOrderSlot}
            showsHorizontalScrollIndicator={false}
            snapToInterval={snapInterval}
            snapToAlignment="center"
            decelerationRate="fast"
            scrollEnabled={false}
            style={styles.orderList}
            contentContainerStyle={[
              styles.hListContent,
              {
                paddingHorizontal: contentHorizontalPad,
                paddingRight: contentHorizontalPad + itemGap,
              },
            ]}
          />
        </View>

        <Text style={styles.subtitle}>{subtitle}</Text>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeTop: {
    backgroundColor: 'transparent',
  },
  scroll: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerTextCol: {
    flex: 1,
    gap: 6,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  welcomeLine: {
    height: 10,
    width: 72,
    borderRadius: 3,
  },
  nameLine: {
    height: 18,
    width: '70%',
    maxWidth: 200,
    borderRadius: 4,
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  sectionWrap: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  iconBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  sectionTitleBar: {
    height: 20,
    width: 200,
    borderRadius: 4,
  },
  sectionTitleBarMd: {
    height: 20,
    width: 160,
    borderRadius: 4,
  },
  switchBar: {
    width: 48,
    height: 28,
    borderRadius: 16,
  },
  linkBar: {
    width: 64,
    height: 14,
    borderRadius: 4,
  },
  glassOuter: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  glassInner: {
    padding: 20,
  },
  finHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  finTitle: {
    height: 12,
    width: 140,
    borderRadius: 4,
  },
  finBadge: {
    height: 28,
    width: 100,
    borderRadius: 20,
  },
  finBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  finCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  finDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    alignSelf: 'stretch',
    marginHorizontal: 12,
  },
  finIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginBottom: 4,
  },
  finLabel: {
    height: 12,
    width: 56,
    borderRadius: 4,
  },
  finVal: {
    height: 28,
    width: 48,
    borderRadius: 4,
  },
  finValSm: {
    height: 22,
    width: 72,
    borderRadius: 4,
  },
  finGrowth: {
    height: 20,
    width: 88,
    borderRadius: 10,
    marginTop: 2,
  },
  hListContent: {
    flexGrow: 0,
  },
  orderList: {
    flexGrow: 0,
  },
  radarBody: {
    marginTop: 16,
    gap: 12,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    paddingHorizontal: 24,
  },
});
