import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { router } from 'expo-router';
import { Calendar, Car, Clock, User, Wrench } from 'lucide-react-native';
import { ASIGNACIONES_MECANICO_QUERY_KEY } from '@/utils/invalidateAsignacionesMecanico';
import { useAsignacionesMecanicoRealtime } from '@/hooks/useAsignacionesMecanicoRealtime';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import {
  Card,
  HostSectionKicker,
  hostScreenStyles,
} from '@/app/design-system/components';
import { OrdenCard } from '@/components/ordenes/OrdenCard';
import { OrigenOrdenBadge } from '@/components/ordenes/OrigenOrdenBadge';
import {
  dedupeOrdenesPorIdYOferta,
  ordenesProveedorService,
  type Orden,
} from '@/services/ordenesProveedor';
import {
  agendaProveedorService,
  nombreServicioCita,
  type CitaAgendaPersonal,
} from '@/services/agendaProveedorService';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { openCitaPersonalDetalle } from '@/utils/navigateProveedorDetalle';
import { labelEstadoPersonal } from '@/utils/ordenProveedorUnificada';

const I = COLORS.institutional;

type AsignacionMecanico =
  | { kind: 'orden'; key: string; orden: Orden; sortKey: number }
  | { kind: 'cita'; key: string; cita: CitaAgendaPersonal; sortKey: number };

function timestampServicio(
  fecha: string | null | undefined,
  hora: string | null | undefined,
): number {
  if (!fecha) return Number.MAX_SAFE_INTEGER;
  const horaNorm = hora ? String(hora).substring(0, 8) : '00:00:00';
  const iso = `${String(fecha).split('T')[0]}T${horaNorm}`;
  const ts = new Date(iso).getTime();
  return Number.isNaN(ts) ? Number.MAX_SAFE_INTEGER : ts;
}

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

async function fetchAsignacionesMecanico(): Promise<AsignacionMecanico[]> {
  const [activasRes, completadasRes, citasRes] = await Promise.all([
    ordenesProveedorService.obtenerActivas(),
    ordenesProveedorService.obtenerCompletadas(),
    agendaProveedorService.obtenerCitasActivas(),
  ]);

  const items: AsignacionMecanico[] = [];

  const ordenes: Orden[] = [];
  if (activasRes.success && Array.isArray(activasRes.data)) ordenes.push(...activasRes.data);
  if (completadasRes.success && Array.isArray(completadasRes.data)) {
    ordenes.push(...completadasRes.data.slice(0, 10));
  }

  for (const orden of dedupeOrdenesPorIdYOferta(ordenes)) {
    items.push({
      kind: 'orden',
      key: `orden-${orden.id}`,
      orden,
      sortKey: timestampServicio(orden.fecha_servicio, orden.hora_servicio),
    });
  }

  if (citasRes.success && Array.isArray(citasRes.data)) {
    for (const cita of citasRes.data) {
      items.push({
        kind: 'cita',
        key: `cita-${cita.id}`,
        cita,
        sortKey: timestampServicio(cita.fecha_servicio, cita.hora_servicio),
      });
    }
  }

  items.sort((a, b) => a.sortKey - b.sortKey);
  return items;
}

type CitaPersonalCardProps = {
  cita: CitaAgendaPersonal;
  onPress: () => void;
};

function CitaPersonalCard({ cita, onPress }: CitaPersonalCardProps) {
  const nombreServicio = nombreServicioCita(cita);
  const precioFormateado = cita.detalle.precio_referencia
    ? formatearMontoCLP(cita.detalle.precio_referencia)
    : '';

  return (
    <Card elevated padding="host" style={styles.citaCard} onPress={onPress}>
      <View style={styles.citaCardTop}>
        <View style={styles.citaEstadoBadge}>
          <View style={styles.citaEstadoDot} />
          <Text style={styles.citaEstadoText}>{labelEstadoPersonal(cita.estado)}</Text>
        </View>
        <OrigenOrdenBadge origen="personal" />
        <View style={{ flex: 1 }} />
        {precioFormateado ? <Text style={styles.citaPrecio}>{precioFormateado}</Text> : null}
      </View>

      <Text style={styles.citaTitulo} numberOfLines={2}>{nombreServicio}</Text>

      <View style={styles.citaMeta}>
        <Clock size={13} color={I.muted} />
        <Text style={styles.citaMetaText}>
          {formatearFecha(cita.fecha_servicio)}
          {cita.hora_servicio ? ` · ${cita.hora_servicio.substring(0, 5)}` : ''}
        </Text>
        <View style={styles.citaTipoPill}>
          <Text style={styles.citaTipoText}>
            {cita.tipo_servicio === 'domicilio' ? 'Domicilio' : 'Taller'}
          </Text>
        </View>
      </View>

      <View style={styles.citaDivider} />

      <View style={styles.citaCliente}>
        <View style={styles.citaAvatar}>
          <User size={14} color={I.onPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.citaClienteNombre} numberOfLines={1}>
            {cita.detalle.cliente_nombre}
          </Text>
          <View style={styles.citaVehiculoRow}>
            <Car size={12} color={I.muted} />
            <Text style={styles.citaVehiculoText} numberOfLines={1}>
              {cita.detalle.vehiculo_marca} {cita.detalle.vehiculo_modelo}
              {cita.detalle.vehiculo_anio ? ` (${cita.detalle.vehiculo_anio})` : ''}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

export function MecanicoHomeView() {
  const { miembroId } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  useAsignacionesMecanicoRealtime(miembroId);

  const {
    data: asignaciones = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [ASIGNACIONES_MECANICO_QUERY_KEY, miembroId],
    queryFn: fetchAsignacionesMecanico,
    enabled: Boolean(miembroId),
    staleTime: 30_000,
  });

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const abrirOrden = useCallback((orden: Orden) => {
    if (orden.oferta_proveedor_id) {
      router.push(`/solicitud-detalle/${orden.oferta_proveedor_id}` as never);
      return;
    }
    router.push(`/orden-detalle/${orden.id}` as never);
  }, []);

  const abrirCita = useCallback((cita: CitaAgendaPersonal) => {
    openCitaPersonalDetalle(router, queryClient, cita.id, cita);
  }, [queryClient]);

  return (
    <ScrollView
      style={hostScreenStyles.scroll}
      contentContainerStyle={[hostScreenStyles.scrollInner, styles.content]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={I.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.greeting}>Tus servicios asignados</Text>
        <Text style={styles.subtitle}>
          Completa el checklist cuando corresponda y revisa tu calendario.
        </Text>
      </View>

      <Card
        elevated
        padding="host"
        style={styles.calendarCard}
        onPress={() => router.push('/(tabs)/calendario' as never)}
      >
        <View style={styles.calendarCardRow}>
          <View style={styles.calendarIconWrap}>
            <Calendar size={22} color={I.primary} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.calendarTitle}>Mi calendario</Text>
            <Text style={styles.calendarSubtitle}>Ver citas y servicios asignados</Text>
          </View>
        </View>
      </Card>

      <HostSectionKicker label="Mis órdenes asignadas" />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={I.primary} />
        </View>
      ) : asignaciones.length === 0 ? (
        <Card elevated padding="host" style={styles.emptyCard}>
          <Wrench size={28} color={I.muted} strokeWidth={1.8} />
          <Text style={styles.emptyTitle}>Sin servicios asignados</Text>
          <Text style={styles.emptyText}>
            Cuando el taller te asigne un servicio o una cita personal, aparecerá aquí.
          </Text>
        </Card>
      ) : (
        asignaciones.map((item) => {
          if (item.kind === 'cita') {
            return (
              <CitaPersonalCard
                key={item.key}
                cita={item.cita}
                onPress={() => abrirCita(item.cita)}
              />
            );
          }
          return (
            <OrdenCard
              key={item.key}
              orden={item.orden}
              onPress={() => abrirOrden(item.orden)}
              onUpdate={() => void refetch()}
              showChecklistButtons
              permitirAceptarRechazar={false}
            />
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: SPACING['3xl'],
    gap: SPACING.md,
  },
  hero: {
    gap: SPACING.xs,
  },
  greeting: {
    fontFamily: TYPOGRAPHY.fontFamily.sansBold,
    fontSize: TYPOGRAPHY.fontSize.xl,
    color: I.ink,
  },
  subtitle: {
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.body,
    lineHeight: 20,
  },
  calendarCard: {},
  calendarCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  calendarIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: I.ink,
  },
  calendarSubtitle: {
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
    marginTop: 2,
  },
  centered: {
    paddingVertical: SPACING['2xl'],
    alignItems: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emptyTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: I.ink,
  },
  emptyText: {
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
    textAlign: 'center',
  },
  citaCard: {},
  citaCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  citaEstadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: I.surfaceSoft,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.full,
  },
  citaEstadoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: I.primary,
  },
  citaEstadoText: {
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.primaryActive,
  },
  citaPrecio: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  citaTitulo: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: I.ink,
    marginBottom: SPACING.sm,
  },
  citaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  citaMetaText: {
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
  },
  citaTipoPill: {
    backgroundColor: I.surfaceSoft,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.full,
  },
  citaTipoText: {
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.body,
  },
  citaDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: I.hairline,
    marginVertical: SPACING.md,
  },
  citaCliente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  citaAvatar: {
    width: 32,
    height: 32,
    borderRadius: BORDERS.radius.full,
    backgroundColor: I.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  citaClienteNombre: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  citaVehiculoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  citaVehiculoText: {
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
    flex: 1,
  },
});
