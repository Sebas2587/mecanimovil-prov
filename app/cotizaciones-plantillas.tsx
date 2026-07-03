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
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { FileText, Trash2 } from 'lucide-react-native';
import Header from '@/components/Header';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { showAlert, showConfirm } from '@/utils/platformAlert';
import cotizacionCanalService, { type CotizacionPlantilla } from '@/services/cotizacionCanalService';
import { etiquetaVehiculoActual, resumenVehiculoPlantilla } from '@/utils/plantillasCotizacionVehiculo';

const I = COLORS.institutional;

export default function CotizacionesPlantillasScreen() {
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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [plantillas, setPlantillas] = useState<CotizacionPlantilla[]>([]);

  const cargar = useCallback(async () => {
    try {
      const rows = filtrandoPorVehiculo
        ? await cotizacionCanalService.listarPlantillas(filtroVehiculo)
        : await cotizacionCanalService.listarPlantillas();
      setPlantillas(rows);
    } catch {
      showAlert('Error', 'No se pudieron cargar las plantillas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filtrandoPorVehiculo, filtroVehiculo]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void cargar();
    }, [cargar]),
  );

  const eliminar = (plantilla: CotizacionPlantilla) => {
    showConfirm('Eliminar plantilla', `¿Eliminar "${plantilla.titulo}"?`, {
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await cotizacionCanalService.eliminarPlantilla(plantilla.id);
          setPlantillas((prev) => prev.filter((p) => p.id !== plantilla.id));
        } catch {
          showAlert('Error', 'No se pudo eliminar.');
        }
      },
    });
  };

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
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void cargar();
              }}
            />
          }
        >
          {filtrandoPorVehiculo ? (
            <View style={styles.vehiculoBox}>
              <Text style={styles.vehiculoBoxTitle}>Vehículo seleccionado</Text>
              <Text style={styles.vehiculoBoxValue}>{etiquetaVehiculoActual(filtroVehiculo)}</Text>
              <Text style={styles.vehiculoBoxHint}>
                Solo se muestran plantillas guardadas para este vehículo.
              </Text>
            </View>
          ) : null}

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
                <View key={p.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <FileText size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {p.titulo}
                    </Text>
                    <TouchableOpacity onPress={() => eliminar(p)} accessibilityLabel="Eliminar">
                      <Trash2 size={18} color="#C62828" strokeWidth={ICON_STROKE_WIDTH} />
                    </TouchableOpacity>
                  </View>
                  {vehiculoResumen ? (
                    <Text style={styles.cardVehiculo} numberOfLines={2}>
                      {vehiculoResumen}
                    </Text>
                  ) : null}
                  <Text style={styles.cardMeta}>
                    Usada {p.uso_count} veces ·{' '}
                    {new Date(p.actualizado_en).toLocaleDateString('es-CL')}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: I.canvas },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: SPACING.md, gap: SPACING.sm },
  vehiculoBox: {
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.md,
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  vehiculoBoxTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
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
  card: {
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.md,
    gap: SPACING.xs,
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
  cardMeta: {
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
  },
});
