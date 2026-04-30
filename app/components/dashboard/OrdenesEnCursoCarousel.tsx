import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Briefcase } from 'lucide-react-native';
import type { Orden } from '@/services/ordenesProveedor';
import type { ChecklistInstance } from '@/services/checklistService';
import { useDashboardCarouselMetrics } from '@/app/components/dashboard/useDashboardCarouselMetrics';
import { OrdenTicketCardSkeleton } from '@/components/ui/Skeleton';

const SKELETON_PLACEHOLDERS = [0, 1, 2] as const;

type OrderStylesSubset = {
  loadingRow: object;
  loadingRowText: object;
  emptyBox: object;
  emptyTitle: object;
  emptySub: object;
};

export type OrdenConChecklistCarousel = Orden & {
  checklist_instance?: ChecklistInstance;
  requiere_checklist?: boolean;
};

export type OrdenesEnCursoCarouselProps = {
  loading: boolean;
  ordenes: OrdenConChecklistCarousel[];
  styles: OrderStylesSubset;
  renderOrder: (orden: OrdenConChecklistCarousel) => React.ReactElement;
};

function OrdenesEnCursoCarouselInner({
  loading,
  ordenes,
  styles,
  renderOrder,
}: OrdenesEnCursoCarouselProps) {
  const { itemWidth, itemGap, snapInterval, contentHorizontalPad } =
    useDashboardCarouselMetrics();

  const keyExtractor = useCallback(
    (item: OrdenConChecklistCarousel) => String(item.id),
    []
  );

  const skeletonKeyExtractor = useCallback((item: number) => `sk-orden-${item}`, []);

  const renderSkeletonItem = useCallback(
    (_: { item: number }) => (
      <View style={{ width: itemWidth, marginRight: itemGap }}>
        <OrdenTicketCardSkeleton />
      </View>
    ),
    [itemGap, itemWidth]
  );

  const renderItem = useCallback(
    ({ item }: { item: OrdenConChecklistCarousel }) => (
      <View style={{ width: itemWidth, marginRight: itemGap }}>{renderOrder(item)}</View>
    ),
    [itemGap, itemWidth, renderOrder]
  );

  if (loading) {
    return (
      <FlatList
        horizontal
        data={[...SKELETON_PLACEHOLDERS]}
        keyExtractor={skeletonKeyExtractor}
        renderItem={renderSkeletonItem}
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        snapToAlignment="center"
        decelerationRate="fast"
        style={localStyles.list}
        contentContainerStyle={[
          localStyles.listContent,
          { paddingHorizontal: contentHorizontalPad, paddingRight: contentHorizontalPad + itemGap },
        ]}
        initialNumToRender={3}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews
      />
    );
  }

  if (ordenes.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Briefcase size={40} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No tienes órdenes en curso</Text>
        <Text style={styles.emptySub}>
          Las órdenes aparecerán aquí cuando tengas trabajos activos
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      horizontal
      data={ordenes}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      showsHorizontalScrollIndicator={false}
      snapToInterval={snapInterval}
      snapToAlignment="center"
      decelerationRate="fast"
      style={localStyles.list}
      contentContainerStyle={[
        localStyles.listContent,
        { paddingHorizontal: contentHorizontalPad, paddingRight: contentHorizontalPad + itemGap },
      ]}
      initialNumToRender={3}
      maxToRenderPerBatch={5}
      windowSize={5}
      removeClippedSubviews
    />
  );
}

const localStyles = StyleSheet.create({
  list: {
    flexGrow: 0,
  },
  listContent: {
    flexGrow: 0,
  },
});

export const OrdenesEnCursoCarousel = React.memo(OrdenesEnCursoCarouselInner);
