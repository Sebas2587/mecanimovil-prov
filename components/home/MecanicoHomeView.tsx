import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { router } from 'expo-router';
import { Calendar, Wrench } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { OrdenCard } from '@/components/ordenes/OrdenCard';
import {
  dedupeOrdenesPorIdYOferta,
  ordenesProveedorService,
  type Orden,
} from '@/services/ordenesProveedor';

const I = COLORS.institutional;

async function fetchOrdenesMecanico(): Promise<Orden[]> {
  const [activasRes, completadasRes] = await Promise.all([
    ordenesProveedorService.obtenerActivas(),
    ordenesProveedorService.obtenerCompletadas(),
  ]);

  const todas: Orden[] = [];
  if (activasRes.success && Array.isArray(activasRes.data)) todas.push(...activasRes.data);
  if (completadasRes.success && Array.isArray(completadasRes.data)) {
    todas.push(...completadasRes.data.slice(0, 10));
  }

  const unicas = dedupeOrdenesPorIdYOferta(todas);
  unicas.sort((a, b) => {
    const fechaA = `${a.fecha_servicio}T${a.hora_servicio || '00:00'}`;
    const fechaB = `${b.fecha_servicio}T${b.hora_servicio || '00:00'}`;
    return new Date(fechaB).getTime() - new Date(fechaA).getTime();
  });
  return unicas;
}

export function MecanicoHomeView() {
  const { estadoProveedor, miembroId } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: ordenes = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['ordenes-mecanico', miembroId],
    queryFn: fetchOrdenesMecanico,
    enabled: Boolean(miembroId),
    staleTime: 30_000,
  });

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const nombreMecanico = useMemo(
    () => estadoProveedor?.miembro_nombre || 'Mecánico',
    [estadoProveedor?.miembro_nombre],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const abrirOrden = (orden: Orden) => {
    if (orden.oferta_proveedor_id) {
      router.push(`/solicitud-detalle/${orden.oferta_proveedor_id}` as never);
      return;
    }
    router.push(`/orden-detalle/${orden.id}` as never);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={I.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.greeting}>Hola, {nombreMecanico}</Text>
        <Text style={styles.subtitle}>
          Aquí verás los servicios que te asignó el taller. Completa el checklist cuando corresponda.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.calendarCard}
        onPress={() => router.push('/(tabs)/calendario' as never)}
        activeOpacity={0.85}
      >
        <View style={styles.calendarIconWrap}>
          <Calendar size={22} color={I.primary} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.calendarTitle}>Mi calendario</Text>
          <Text style={styles.calendarSubtitle}>Ver citas y servicios asignados</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Mis órdenes asignadas</Text>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={I.primary} />
        </View>
      ) : ordenes.length === 0 ? (
        <View style={styles.emptyCard}>
          <Wrench size={28} color={I.muted} strokeWidth={1.8} />
          <Text style={styles.emptyTitle}>Sin órdenes asignadas</Text>
          <Text style={styles.emptyText}>
            Cuando el taller te asigne un servicio, aparecerá aquí.
          </Text>
        </View>
      ) : (
        ordenes.map((orden) => (
          <OrdenCard
            key={orden.id}
            orden={orden}
            onPress={() => abrirOrden(orden)}
            onUpdate={() => void refetch()}
            showChecklistButtons
            permitirAceptarRechazar={false}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
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
  calendarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    padding: SPACING.lg,
    ...SHADOWS.editorial,
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
  sectionTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: I.ink,
    marginTop: SPACING.sm,
  },
  centered: {
    paddingVertical: SPACING['2xl'],
    alignItems: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    padding: SPACING.xl,
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
});
