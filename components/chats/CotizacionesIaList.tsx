import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { CotizacionLibreModal } from '@/components/chats/CotizacionLibreModal';
import { CotizacionPendienteRow } from '@/components/home/CotizacionPendienteRow';
import {
  useCotizacionesCanalTallerQuery,
  useInvalidateCotizacionesCanalTaller,
} from '@/hooks/useCotizacionesCanalTallerQuery';
import {
  AGENTE_IA_BORRADORES_KEY,
  useAgenteBorradoresPendientesQuery,
} from '@/hooks/useAgenteIaQueries';
import { type CotizacionCanal } from '@/services/cotizacionCanalService';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import {
  HostSectionKicker,
  hostScreenStyles,
} from '@/app/design-system/components';
import { BORDERS, COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { institutionalInputStyles, institutionalInputPlaceholder } from '@/app/design-system/styles/institutionalInputs';
import { useQueryClient } from '@tanstack/react-query';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

function esBorradorPorRevisar(cot: CotizacionCanal): boolean {
  return cot.estado === 'borrador';
}

function clienteLabel(cot: CotizacionCanal): string {
  return (
    cot.cliente_display
    || cot.cliente_nombre
    || [cot.vehiculo_marca, cot.vehiculo_modelo].filter(Boolean).join(' ')
    || 'Cliente'
  );
}

type Props = {
  enabled?: boolean;
};

/**
 * Cotizar con IA (`/cotizar-ia`): solo borradores por revisar/enviar + crear.
 * El detalle se abre en pantalla full-screen `/cotizacion-canal/[id]`.
 * Enviadas, vistas y aceptadas viven en Bandeja; agendadas en Agenda.
 */
export function CotizacionesIaList({ enabled = true }: Props) {
  const qc = useQueryClient();
  const { data = [], isPending, isFetching, refetch } = useCotizacionesCanalTallerQuery(enabled);
  const { data: borradoresAgente } = useAgenteBorradoresPendientesQuery(enabled);
  const invalidate = useInvalidateCotizacionesCanalTaller();
  const [libreVisible, setLibreVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const borradoresPorRevisar = useMemo(
    () =>
      [...data]
        .filter(esBorradorPorRevisar)
        .sort((a, b) => {
          const ta = new Date(a.creado_en || 0).getTime();
          const tb = new Date(b.creado_en || 0).getTime();
          return tb - ta;
        }),
    [data],
  );

  const borradoresFiltrados = useMemo(() => {
    if (!searchQuery.trim()) return borradoresPorRevisar;
    const q = searchQuery.trim().toLowerCase();
    return borradoresPorRevisar.filter((item) => {
      const cliente = clienteLabel(item).toLowerCase();
      const servicio = (item.servicio_nombre || '').toLowerCase();
      const patente = (item.vehiculo_patente || '').toLowerCase();
      const marca = (item.vehiculo_marca || '').toLowerCase();
      const modelo = (item.vehiculo_modelo || '').toLowerCase();
      return (
        cliente.includes(q)
        || servicio.includes(q)
        || patente.includes(q)
        || marca.includes(q)
        || modelo.includes(q)
      );
    });
  }, [borradoresPorRevisar, searchQuery]);

  const abrirDetalle = useCallback((item: CotizacionCanal) => {
    if (item.id) router.push(`/cotizacion-canal/${item.id}`);
  }, []);

  const irABandeja = useCallback(() => {
    router.push('/(tabs)/bandeja');
  }, []);

  const borradoresCount = borradoresAgente?.count ?? borradoresPorRevisar.length;

  const header = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por cliente, servicio, patente o vehículo…"
            placeholderTextColor={institutionalInputPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        {borradoresFiltrados.length > 0 ? (
          <HostSectionKicker
            label={`Por revisar${borradoresCount > 0 ? ` (${borradoresFiltrados.length})` : ''}`}
          />
        ) : null}
      </View>
    ),
    [borradoresCount, borradoresFiltrados.length, searchQuery],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: CotizacionCanal; index: number }) => {
      const last = index === borradoresFiltrados.length - 1;
      return (
        <View
          style={[
            styles.paperListItem,
            index === 0 && styles.paperListFirst,
            last && styles.paperListLast,
          ]}
        >
          <CotizacionPendienteRow item={item} onPress={abrirDetalle} last={last} />
        </View>
      );
    },
    [abrirDetalle, borradoresFiltrados.length],
  );

  if (isPending && borradoresPorRevisar.length === 0) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={I.primary} />
        <Text style={styles.loadingText}>Cargando borradores…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={borradoresFiltrados}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        style={styles.listFlex}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isPending}
            onRefresh={() => {
              void refetch();
              qc.invalidateQueries({ queryKey: AGENTE_IA_BORRADORES_KEY });
            }}
            tintColor={I.primary}
            colors={[I.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <InstitutionalText role="bodyBold">Sin borradores por revisar</InstitutionalText>
            <InstitutionalText role="caption" color="muted" style={styles.emptySub}>
              Crea una cotización o espera un borrador de la IA. Lo ya enviado o aceptado está en Bandeja.
            </InstitutionalText>
            <InstitutionalButton
              label="Ir a Bandeja"
              variant="outline"
              onPress={irABandeja}
            />
          </View>
        }
      />

      <View style={styles.stickyCrear}>
        <InstitutionalButton
          label="Nueva cotización"
          variant="primary"
          leading={<Sparkles size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />}
          onPress={() => setLibreVisible(true)}
        />
        <InstitutionalText role="caption" color="body" style={styles.stickyHint}>
          Cliente de Mensajes o link público
        </InstitutionalText>
      </View>

      <CotizacionLibreModal
        visible={libreVisible}
        onClose={() => setLibreVisible(false)}
        onEnviada={() => {
          void invalidate();
          void refetch();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: I.canvas },
  listFlex: { flex: 1 },
  list: {
    ...hostScreenStyles.scrollInner,
    paddingBottom: SPACING.sm,
    gap: 0,
  },
  headerBlock: {
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  searchWrap: {
    backgroundColor: I.surface,
    borderRadius: BORDERS.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.border,
    ...SHADOWS.sm,
  },
  searchInput: {
    ...institutionalInputStyles.input,
    borderWidth: 0,
    backgroundColor: 'transparent',
    fontFamily: FF.regular,
  },
  paperListItem: {
    backgroundColor: I.surface,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: I.border,
  },
  paperListFirst: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: BORDERS.radius.md,
    borderTopRightRadius: BORDERS.radius.md,
    overflow: 'hidden',
  },
  paperListLast: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: BORDERS.radius.md,
    borderBottomRightRadius: BORDERS.radius.md,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  empty: {
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  emptySub: { marginBottom: SPACING.sm },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: I.canvas,
  },
  loadingText: {
    fontFamily: FF.regular,
    color: I.muted,
  },
  stickyCrear: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.border,
    backgroundColor: I.surface,
    gap: SPACING.xs,
  },
  stickyHint: { textAlign: 'center' },
});

export default CotizacionesIaList;
