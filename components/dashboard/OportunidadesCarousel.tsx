import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Car, ChevronRight, Search } from 'lucide-react-native';
import { router } from 'expo-router';
import type { SolicitudPublica } from '@/services/solicitudesService';
import { CountdownTimer } from '@/components/solicitudes/CountdownTimer';
import { useDashboardCarouselMetrics } from '@/app/components/dashboard/useDashboardCarouselMetrics';
import { RadarOfferCardSkeleton } from '@/components/ui/Skeleton';

const SKELETON_PLACEHOLDERS = [0, 1, 2] as const;

type RadarStylesSubset = {
  radarBody: object;
  radarSearching: object;
  radarOffer: object;
  radarOfferTop: object;
  radarOfferTitle: object;
  radarOfferMeta: object;
  radarOfferMetaText: object;
  radarCTA: object;
  radarCTAText: object;
  radarEmpty: object;
  radarEmptyTitle: object;
  radarEmptySub: object;
  seeAllBtn: object;
  seeAllBtnText: object;
};

export type OportunidadesCarouselProps = {
  loading: boolean;
  solicitudes: SolicitudPublica[];
  styles: RadarStylesSubset;
};

function OportunidadesCarouselInner({
  loading,
  solicitudes,
  styles,
}: OportunidadesCarouselProps) {
  const { itemWidth, itemGap, snapInterval, contentHorizontalPad } =
    useDashboardCarouselMetrics();

  const keyExtractor = useCallback((item: SolicitudPublica) => String(item.id), []);

  const skeletonKeyExtractor = useCallback((item: number) => `sk-${item}`, []);

  const renderSkeletonItem = useCallback(
    (_: { item: number }) => (
      <View style={{ width: itemWidth, marginRight: itemGap }}>
        <RadarOfferCardSkeleton />
      </View>
    ),
    [itemGap, itemWidth]
  );

  const renderItem = useCallback(
    ({ item: solicitud }: { item: SolicitudPublica }) => {
      const servicios = solicitud.servicios_solicitados_detail || [];
      const primerServicio = servicios[0]?.nombre || 'Servicio solicitado';
      const vehiculo = solicitud.vehiculo_info;
      const vehiculoText = vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : '';

      return (
        <View style={{ width: itemWidth, marginRight: itemGap }}>
          <TouchableOpacity
            style={styles.radarOffer}
            onPress={() => router.push(`/solicitud-detalle/${solicitud.id}`)}
            activeOpacity={0.8}
          >
            <View style={styles.radarOfferTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.radarOfferTitle} numberOfLines={1}>
                  {primerServicio}
                </Text>
                {vehiculoText ? (
                  <View style={styles.radarOfferMeta}>
                    <Car size={13} color="#6B7280" />
                    <Text style={styles.radarOfferMetaText}>{vehiculoText}</Text>
                  </View>
                ) : null}
              </View>
              {solicitud.fecha_expiracion ? (
                <CountdownTimer targetDate={solicitud.fecha_expiracion} />
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.radarCTA}
              onPress={() => router.push(`/solicitud-detalle/${solicitud.id}`)}
              activeOpacity={0.8}
            >
              <Text style={styles.radarCTAText}>Cotizar Trabajo</Text>
              <ChevronRight size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      );
    },
    [itemGap, itemWidth, styles]
  );

  if (loading) {
    return (
      <View style={styles.radarBody}>
        <FlatList
          horizontal
          data={[...SKELETON_PLACEHOLDERS]}
          keyExtractor={skeletonKeyExtractor}
          renderItem={renderSkeletonItem}
          showsHorizontalScrollIndicator={false}
          snapToInterval={snapInterval}
          snapToAlignment="center"
          decelerationRate="fast"
          contentContainerStyle={[
            localStyles.listContent,
            { paddingHorizontal: contentHorizontalPad, paddingRight: contentHorizontalPad + itemGap },
          ]}
          initialNumToRender={3}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews
        />
      </View>
    );
  }

  if (solicitudes.length === 0) {
    return (
      <View style={styles.radarBody}>
        <View style={styles.radarEmpty}>
          <Search size={36} color="#D1D5DB" />
          <Text style={styles.radarEmptyTitle}>No hay oportunidades</Text>
          <Text style={styles.radarEmptySub}>
            Revisa más tarde para encontrar nuevas oportunidades
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.radarBody}>
      <FlatList
        horizontal
        data={solicitudes}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={[
          localStyles.listContent,
          { paddingHorizontal: contentHorizontalPad, paddingRight: contentHorizontalPad + itemGap },
        ]}
        initialNumToRender={3}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews
      />
      {solicitudes.length > 3 ? (
        <TouchableOpacity
          style={styles.seeAllBtn}
          onPress={() => router.push('/solicitudes-disponibles')}
        >
          <Text style={styles.seeAllBtnText}>
            Ver todas ({solicitudes.length})
          </Text>
          <ChevronRight size={14} color="#2563EB" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const localStyles = StyleSheet.create({
  listContent: {
    flexGrow: 0,
  },
});

export const OportunidadesCarousel = React.memo(OportunidadesCarouselInner);
