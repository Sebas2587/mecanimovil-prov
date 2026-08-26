import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { FileText, Search, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '@/components/Header';
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
import {
  HostEmptyState,
  HOST_GUTTER,
  HostPaperSection,
  HostSectionKicker,
  hostScreenStyles,
} from '@/app/design-system/components';
import { BORDERS, COLORS, SPACING, SHADOWS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  institutionalInputPlaceholder,
  institutionalInputStyles,
} from '@/app/design-system/styles/institutionalInputs';
import { useQueryClient } from '@tanstack/react-query';

const I = COLORS.institutional;

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
  onBack: () => void;
};

/**
 * Listing Host (`/cotizar-ia`): borradores por revisar/enviar + crear.
 * Detalle en `/cotizacion-canal/[id]`. Enviadas en Bandeja; agendadas en Agenda.
 * Un solo CTA a la vez: empty state, o Sparkles en el header si hay lista.
 */
export function CotizacionesIaList({ enabled = true, onBack }: Props) {
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { data = [], isPending, isFetching, refetch } = useCotizacionesCanalTallerQuery(enabled);
  const { data: borradoresAgente } = useAgenteBorradoresPendientesQuery(enabled);
  const invalidate = useInvalidateCotizacionesCanalTaller();
  const [crearVisible, setCrearVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const abrirCrear = useCallback(() => setCrearVisible(true), []);
  const cerrarCrear = useCallback(() => setCrearVisible(false), []);

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
      const folio = (item.numero_publico || '').toLowerCase();
      return (
        cliente.includes(q)
        || servicio.includes(q)
        || patente.includes(q)
        || marca.includes(q)
        || modelo.includes(q)
        || folio.includes(q)
      );
    });
  }, [borradoresPorRevisar, searchQuery]);

  const abrirDetalle = useCallback((item: CotizacionCanal) => {
    if (item.id) router.push(`/cotizacion-canal/${item.id}`);
  }, []);

  const irABandeja = useCallback(() => {
    router.push('/(tabs)/bandeja');
  }, []);

  const onRefresh = useCallback(() => {
    void refetch();
    qc.invalidateQueries({ queryKey: AGENTE_IA_BORRADORES_KEY });
  }, [qc, refetch]);

  const onEnviada = useCallback(() => {
    void invalidate();
    void refetch();
  }, [invalidate, refetch]);

  const borradoresCount = borradoresAgente?.count ?? borradoresPorRevisar.length;

  const header = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <View style={institutionalInputStyles.inputRow}>
          <Search size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          <TextInput
            style={institutionalInputStyles.inputRowField}
            placeholder="Cliente, servicio, patente o folio"
            placeholderTextColor={institutionalInputPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>
        {borradoresFiltrados.length > 0 ? (
          <HostSectionKicker
            label={`Por revisar${borradoresCount > 0 ? ` (${borradoresFiltrados.length})` : ''}`}
            style={styles.kicker}
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

  const hayLista = borradoresPorRevisar.length > 0;
  const crearEnHeader = isPending || hayLista || Boolean(searchQuery.trim());
  const headerCrear = crearEnHeader ? (
    <TouchableOpacity
      onPress={abrirCrear}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      accessibilityRole="button"
      accessibilityLabel="Nueva cotización"
    >
      <Sparkles size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
    </TouchableOpacity>
  ) : null;

  const screenHeader = (
    <Header
      title="Cotizar"
      showBack
      onBackPress={onBack}
      backgroundColor={I.canvas}
      titleColor={I.ink}
      rightComponent={headerCrear}
    />
  );

  if (isPending && borradoresPorRevisar.length === 0) {
    return (
      <View style={styles.root}>
        {screenHeader}
        <View style={[hostScreenStyles.gutterX, styles.loadingPad]}>
          <HostPaperSection>
            <View style={styles.loadingBox}>
              <ActivityIndicator color={I.primary} />
              <InstitutionalText role="caption" color="muted">
                Cargando borradores…
              </InstitutionalText>
            </View>
          </HostPaperSection>
        </View>
        <CotizacionLibreModal
          visible={crearVisible}
          onClose={cerrarCrear}
          onEnviada={onEnviada}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {screenHeader}
      <FlatList
        data={borradoresFiltrados}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: HOST_GUTTER,
            paddingBottom: Math.max(insets.bottom, SPACING.fixed.lg),
          },
          borradoresFiltrados.length === 0 && styles.listEmpty,
        ]}
        style={hostScreenStyles.scroll}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews
        maxToRenderPerBatch={12}
        windowSize={8}
        initialNumToRender={10}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isPending}
            onRefresh={onRefresh}
            tintColor={I.primary}
            colors={[I.primary]}
          />
        }
        ListEmptyComponent={
          <HostEmptyState
            icon={FileText}
            title={searchQuery.trim() ? 'Sin coincidencias' : 'Sin borradores por revisar'}
            description={
              searchQuery.trim()
                ? `Nada coincide con «${searchQuery.trim()}».`
                : 'Crea una cotización en blanco o con IA. Lo ya enviado está en Bandeja.'
            }
            primaryAction={
              searchQuery.trim()
                ? undefined
                : { label: 'Nueva cotización', onPress: abrirCrear }
            }
            secondaryAction={{ label: 'Ir a Bandeja', onPress: irABandeja }}
          />
        }
      />

      <CotizacionLibreModal
        visible={crearVisible}
        onClose={cerrarCrear}
        onEnviada={onEnviada}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: I.canvas },
  list: {
    paddingTop: SPACING.fixed.sm,
    gap: 0,
  },
  listEmpty: {
    flexGrow: 1,
  },
  headerBlock: {
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.xs,
  },
  kicker: {
    marginTop: 0,
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
    marginBottom: SPACING.fixed.sm,
    ...SHADOWS.editorial,
  },
  loadingPad: {
    paddingTop: SPACING.fixed.lg,
  },
  loadingBox: {
    paddingVertical: SPACING.fixed.lg,
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
});

export default CotizacionesIaList;
