import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, FileText, Trash2 } from 'lucide-react-native';
import Header from '@/components/Header';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import {
  Card,
  HostSectionKicker,
  hostScreenStyles,
} from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { showAlert, showConfirm } from '@/utils/platformAlert';
import cotizacionCanalService, { type CotizacionPlantilla } from '@/services/cotizacionCanalService';
import { etiquetaVehiculoActual, resumenVehiculoPlantilla } from '@/utils/plantillasCotizacionVehiculo';
import { PlantillaCotizacionDetalleModal } from '@/components/chats/PlantillaCotizacionDetalleModal';
import { useQueryClient } from '@tanstack/react-query';
import {
  invalidateCotizacionPlantillasQueries,
  useCotizacionPlantillasQuery,
} from '@/hooks/useCotizacionPlantillasQuery';

const I = COLORS.institutional;

export default function CotizacionesPlantillasScreen() {
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    marca?: string | string[];
    modelo?: string | string[];
    cilindraje?: string | string[];
  }>();

  const filtroVehiculo = useMemo(() => {
    const pick = (v: string | string[] | undefined) =>
      (Array.isArray(v) ? v[0] : v)?.trim() || '';
    return {
      marca: pick(params.marca),
      modelo: pick(params.modelo),
      cilindraje: pick(params.cilindraje),
    };
  }, [params.marca, params.modelo, params.cilindraje]);

  const filtrandoPorVehiculo = filtroVehiculo.marca.length > 0 && filtroVehiculo.modelo.length > 0;

  const {
    plantillas,
    loading,
    isRefetching,
    refresh,
  } = useCotizacionPlantillasQuery(
    filtrandoPorVehiculo ? filtroVehiculo : null,
    true,
  );

  const [detallePlantilla, setDetallePlantilla] = useState<CotizacionPlantilla | null>(null);

  const eliminar = (plantilla: CotizacionPlantilla) => {
    showConfirm('Eliminar plantilla', `¿Eliminar "${plantilla.titulo}"?`, {
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await cotizacionCanalService.eliminarPlantilla(plantilla.id);
          invalidateCotizacionPlantillasQueries(queryClient);
          await refresh();
          if (detallePlantilla?.id === plantilla.id) setDetallePlantilla(null);
        } catch {
          showAlert('Error', 'No se pudo eliminar.');
        }
      },
    });
  };

  const onRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="Plantillas de cotización" showBack onBackPress={() => router.back()} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={I.primary} />
        </View>
      ) : (
        <ScrollView
          style={hostScreenStyles.scroll}
          contentContainerStyle={[hostScreenStyles.scrollInner, styles.listInner]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
            />
          }
        >
          {filtrandoPorVehiculo ? (
            <>
              <HostSectionKicker label="Vehículo seleccionado" />
              <Card elevated padding="host" style={styles.cardGap}>
                <Text style={styles.vehiculoBoxValue}>{etiquetaVehiculoActual(filtroVehiculo)}</Text>
                <Text style={styles.vehiculoBoxHint}>
                  Solo se muestran plantillas guardadas para este vehículo.
                </Text>
              </Card>
            </>
          ) : null}

          <HostSectionKicker label="Plantillas" />
          {plantillas.length === 0 ? (
            <Text style={styles.empty}>
              {filtrandoPorVehiculo
                ? `No hay plantillas para ${etiquetaVehiculoActual(filtroVehiculo)}.`
                : 'No tienes plantillas guardadas.'}
            </Text>
          ) : (
            plantillas.map((p) => {
              const vehiculoResumen =
                resumenVehiculoPlantilla(p.snapshot) ||
                [p.vehiculo_marca, p.vehiculo_modelo, p.vehiculo_cilindraje]
                  .filter(Boolean)
                  .join(' · ');
              return (
                <Card
                  key={p.id}
                  elevated
                  padding="host"
                  onPress={() => setDetallePlantilla(p)}
                  style={styles.cardGap}
                >
                  <View style={styles.cardHeader}>
                    <FileText size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {p.titulo}
                    </Text>
                    <TouchableOpacity
                      onPress={() => eliminar(p)}
                      accessibilityLabel="Eliminar"
                      hitSlop={8}
                    >
                      <Trash2 size={18} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
                    </TouchableOpacity>
                  </View>
                  {vehiculoResumen ? (
                    <Text style={styles.cardVehiculo} numberOfLines={2}>
                      {vehiculoResumen}
                    </Text>
                  ) : null}
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardMeta}>
                      Usada {p.uso_count} veces ·{' '}
                      {new Date(p.actualizado_en).toLocaleDateString('es-CL')}
                    </Text>
                    <ChevronRight size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                  </View>
                </Card>
              );
            })
          )}
        </ScrollView>
      )}

      <PlantillaCotizacionDetalleModal
        visible={Boolean(detallePlantilla)}
        plantilla={detallePlantilla}
        onClose={() => setDetallePlantilla(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background.default },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listInner: {
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  cardGap: {
    gap: SPACING.xs,
  },
  vehiculoBoxValue: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.primary,
  },
  vehiculoBoxHint: {
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
    lineHeight: 18,
  },
  empty: {
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cardTitle: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  cardVehiculo: {
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.body,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginTop: 2,
  },
  cardMeta: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
  },
});
