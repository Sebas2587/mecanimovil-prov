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
import { obtenerMisOfertas, type OfertaProveedor } from '@/services/solicitudesService';

const I = COLORS.institutional;
const MAX_ITEMS = 5;

type Decision =
  | { kind: 'orden'; orden: Orden }
  | { kind: 'oferta'; oferta: OfertaProveedor };

async function fetchDecisiones(): Promise<Decision[]> {
  const [ordenesRes, ofertasRes] = await Promise.all([
    ordenesProveedorService.obtenerPendientes(),
    obtenerMisOfertas(),
  ]);
  const ordenes = ordenesRes.success && Array.isArray(ordenesRes.data) ? ordenesRes.data : [];
  const ofertas = ofertasRes.success && Array.isArray(ofertasRes.data) ? ofertasRes.data : [];
  const decisiones: Decision[] = [
    ...ordenes
      .filter((orden) => orden.estado === 'pendiente_aceptacion_proveedor')
      .map((orden) => ({ kind: 'orden' as const, orden })),
    ...ofertas
      .filter((oferta) => oferta.estado === 'pendiente_confirmacion')
      .map((oferta) => ({ kind: 'oferta' as const, oferta })),
  ];
  return decisiones;
}

function tituloDecision(item: Decision): string {
  if (item.kind === 'orden') {
    return item.orden.lineas?.[0]?.servicio_nombre?.trim() || 'Trabajo del marketplace';
  }
  const nombres = (item.oferta.solicitud_detail?.servicios_solicitados ?? [])
    .map((servicio) => servicio.nombre)
    .filter(Boolean);
  return nombres.join(', ') || 'Trabajo del marketplace';
}

function resumenDecision(item: Decision): string {
  if (item.kind === 'orden') {
    const nombre = obtenerNombreSeguro(item.orden.cliente_detail);
    const vehiculo = [item.orden.vehiculo_detail?.marca, item.orden.vehiculo_detail?.modelo]
      .filter(Boolean)
      .join(' ');
    return [nombre, item.orden.vehiculo_detail?.placa, vehiculo].filter(Boolean).join(' · ');
  }
  const detail = item.oferta.solicitud_detail;
  const vehiculo = [detail?.vehiculo?.marca, detail?.vehiculo?.modelo].filter(Boolean).join(' ');
  return [detail?.cliente_nombre, detail?.vehiculo?.patente, vehiculo].filter(Boolean).join(' · ');
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

  const abrir = useCallback((item: Decision) => {
    if (item.kind === 'orden') {
      router.push(`/orden-detalle/${item.orden.id}`);
      return;
    }
    router.push(`/solicitud-detalle/${item.oferta.solicitud}`);
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
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.kind === 'orden' ? `orden-${item.orden.id}` : `oferta-${item.oferta.id}`}
            style={[styles.row, index < items.length - 1 && styles.rowBorder]}
            onPress={() => abrir(item)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Aceptar o rechazar ${tituloDecision(item)}`}
          >
            <View style={hostIconPlateStyle}>
              <ClipboardList size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <View style={styles.copy}>
              <InstitutionalText role="bodyBold">{tituloDecision(item)}</InstitutionalText>
              <InstitutionalText role="caption" color="muted">
                {resumenDecision(item)}
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
