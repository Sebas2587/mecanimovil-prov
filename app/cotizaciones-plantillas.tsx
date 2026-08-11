import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { FileText } from 'lucide-react-native';
import Header from '@/components/Header';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import {
  Card,
  HostEmptyState,
  HostSectionKicker,
  InstitutionalText,
  hostScreenStyles,
} from '@/app/design-system/components';
import { institutionalInputPlaceholder, institutionalInputStyles } from '@/app/design-system/styles/institutionalInputs';
import { showAlert, showConfirm } from '@/utils/platformAlert';
import cotizacionCanalService, { type CotizacionPlantilla } from '@/services/cotizacionCanalService';
import { etiquetaVehiculoActual } from '@/utils/plantillasCotizacionVehiculo';
import {
  tituloServicioPlantilla,
  vehiculoLineaPlantilla,
} from '@/utils/plantillaCotizacionPreview';
import { PlantillaCotizacionDetalleModal } from '@/components/chats/PlantillaCotizacionDetalleModal';
import { PlantillaCotizacionRow } from '@/components/chats/PlantillaCotizacionRow';
import { useQueryClient } from '@tanstack/react-query';
import {
  invalidateCotizacionPlantillasQueries,
  useCotizacionPlantillasQuery,
} from '@/hooks/useCotizacionPlantillasQuery';

const I = COLORS.institutional;

function normalizarBusqueda(s: string): string {
  return s.trim().toLowerCase();
}

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
  const [busqueda, setBusqueda] = useState('');

  const plantillasFiltradas = useMemo(() => {
    const q = normalizarBusqueda(busqueda);
    if (!q) return plantillas;
    return plantillas.filter((p) => {
      const snap = p.snapshot ?? {};
      const haystack = [
        p.titulo,
        tituloServicioPlantilla(p),
        vehiculoLineaPlantilla(p),
        String(snap.vehiculo_patente || ''),
        String(snap.descripcion_problema || ''),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [plantillas, busqueda]);

  const eliminar = useCallback((plantilla: CotizacionPlantilla) => {
    showConfirm('Eliminar plantilla', `¿Eliminar "${tituloServicioPlantilla(plantilla)}"?`, {
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
  }, [detallePlantilla?.id, queryClient, refresh]);

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
              <Card elevated padding="host" style={styles.blockGap}>
                <InstitutionalText role="bodyBold" color="primary">
                  {etiquetaVehiculoActual(filtroVehiculo)}
                </InstitutionalText>
                <InstitutionalText role="caption" color="muted">
                  Solo se muestran plantillas guardadas para este vehículo.
                </InstitutionalText>
              </Card>
            </>
          ) : null}

          <HostSectionKicker label="Plantillas guardadas" />

          {plantillas.length > 0 ? (
            <View style={styles.searchWrap}>
              <TextInput
                style={styles.searchInput}
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Buscar servicio, vehículo o patente"
                placeholderTextColor={institutionalInputPlaceholder}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>
          ) : null}

          {plantillas.length === 0 ? (
            <HostEmptyState
              icon={FileText}
              title="Sin plantillas"
              description={
                filtrandoPorVehiculo
                  ? `No hay plantillas para ${etiquetaVehiculoActual(filtroVehiculo)}. Al enviar una cotización para este modelo, el sistema puede guardar una automáticamente.`
                  : 'Guarda una cotización como plantilla o envía cotizaciones: el agente aprende y crea plantillas reutilizables.'
              }
            />
          ) : plantillasFiltradas.length === 0 ? (
            <InstitutionalText role="caption" color="muted" style={styles.emptySearch}>
              Sin resultados para «{busqueda.trim()}».
            </InstitutionalText>
          ) : (
            <View style={styles.paperList}>
              {plantillasFiltradas.map((p, idx) => (
                <View
                  key={p.id}
                  style={[
                    styles.paperListItem,
                    idx === 0 && styles.paperListFirst,
                    idx === plantillasFiltradas.length - 1 && styles.paperListLast,
                  ]}
                >
                  <PlantillaCotizacionRow
                    plantilla={p}
                    onPress={setDetallePlantilla}
                    last={idx === plantillasFiltradas.length - 1}
                  />
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <PlantillaCotizacionDetalleModal
        visible={Boolean(detallePlantilla)}
        plantilla={detallePlantilla}
        onClose={() => setDetallePlantilla(null)}
        onEliminar={eliminar}
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
  blockGap: {
    gap: SPACING.xs,
  },
  searchWrap: {
    marginBottom: SPACING.xs,
  },
  searchInput: {
    ...institutionalInputStyles.input,
    backgroundColor: COLORS.background.paper,
    minHeight: 48,
  },
  emptySearch: {
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  paperList: {
    marginBottom: SPACING.sm,
  },
  paperListItem: {
    backgroundColor: COLORS.background.paper,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    paddingHorizontal: SPACING.fixed.md,
  },
  paperListFirst: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: BORDERS.radius.lg,
    borderTopRightRadius: BORDERS.radius.lg,
    overflow: 'hidden',
  },
  paperListLast: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: BORDERS.radius.lg,
    borderBottomRightRadius: BORDERS.radius.lg,
    overflow: 'hidden',
    ...SHADOWS.editorial,
  },
});
