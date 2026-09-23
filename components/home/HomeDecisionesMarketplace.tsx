import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight, ClipboardList } from 'lucide-react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import {
  HostPaperSection,
  HostSectionKicker,
  InstitutionalText,
  hostIconPlateStyle,
} from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  ordenesProveedorService,
  obtenerNombreSeguro,
  type Orden,
} from '@/services/ordenesProveedor';

const I = COLORS.institutional;
const MAX_ITEMS = 5;

async function fetchDecisiones(): Promise<Orden[]> {
  const res = await ordenesProveedorService.obtenerPendientes();
  const data = res.success && Array.isArray(res.data) ? res.data : [];
  return data.filter((orden) => orden.estado === 'pendiente_aceptacion_proveedor');
}

function resumen(orden: Orden): string {
  const nombre = obtenerNombreSeguro(orden.cliente_detail);
  const vehiculo = [orden.vehiculo_detail?.marca, orden.vehiculo_detail?.modelo]
    .filter(Boolean)
    .join(' ');
  const patente = orden.vehiculo_detail?.placa;
  return [nombre, patente, vehiculo].filter(Boolean).join(' · ');
}

function titulo(orden: Orden): string {
  return orden.lineas?.[0]?.servicio_nombre?.trim() || 'Trabajo del marketplace';
}

export function HomeDecisionesMarketplace({ enabled = true }: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: ['ordenes-marketplace-decision'],
    queryFn: fetchDecisiones,
    enabled,
    staleTime: 15_000,
    refetchInterval: enabled ? 45_000 : false,
  });

  const items = (query.data ?? []).slice(0, MAX_ITEMS);

  const abrir = useCallback((orden: Orden) => {
    router.push(`/orden-detalle/${orden.id}`);
  }, []);

  if (!enabled || items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <HostSectionKicker label="Marketplace" style={styles.kicker} />
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/ordenes')}
          hitSlop={8}
          accessibilityRole="button"
        >
          <InstitutionalText role="captionBold" color="primary">
            Ver servicios
          </InstitutionalText>
        </TouchableOpacity>
      </View>
      <HostPaperSection style={styles.paper}>
        {items.map((orden, index) => (
          <TouchableOpacity
            key={orden.id}
            style={[styles.row, index < items.length - 1 && styles.rowBorder]}
            onPress={() => abrir(orden)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Aceptar o rechazar ${titulo(orden)}`}
          >
            <View style={hostIconPlateStyle}>
              <ClipboardList size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <View style={styles.copy}>
              <InstitutionalText role="bodyBold">{titulo(orden)}</InstitutionalText>
              <InstitutionalText role="caption" color="muted">
                {resumen(orden)}
              </InstitutionalText>
              <InstitutionalText role="caption" color="body">
                El cliente te eligió. Acepta o rechaza el trabajo.
              </InstitutionalText>
            </View>
            <ChevronRight size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        ))}
      </HostPaperSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.fixed.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.fixed.xs,
  },
  kicker: {
    marginTop: 0,
    marginBottom: 0,
  },
  paper: {
    paddingVertical: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.sm,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
