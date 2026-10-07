import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { CotizacionPendienteRow } from '@/components/home/CotizacionPendienteRow';
import { useCotizacionesCanalTallerQuery } from '@/hooks/useCotizacionesCanalTallerQuery';
import {
  AGENTE_IA_BORRADORES_KEY,
  useAgenteBorradoresPendientesQuery,
} from '@/hooks/useAgenteIaQueries';
import { type CotizacionCanal } from '@/services/cotizacionCanalService';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import {
  HOST_GUTTER,
  HostPaperSection,
  hostScreenStyles,
} from '@/app/design-system/components';
import { BORDERS, COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { institutionalInputPlaceholder } from '@/app/design-system/styles/institutionalInputs';
import { useQueryClient } from '@tanstack/react-query';
import { useWebVisualViewport, webFooterBottom } from '@/hooks/useWebVisualViewport';

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
 * Listing Host (`/cotizar-ia`): borradores por revisar + tarjeta de acciones.
 * El texto vacío solo aparece si no hay borradores. Los botones se mantienen.
 * Detalle en `/cotizacion-canal/[id]`. Enviadas en Bandeja; agendadas en Agenda.
 */
export function CotizacionesIaList({ enabled = true, onBack }: Props) {
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const webViewport = useWebVisualViewport();
  const listBottom = webFooterBottom(webViewport, insets.bottom, SPACING.fixed.lg);
  const { data = [], isPending, isFetching, refetch } = useCotizacionesCanalTallerQuery(enabled);
  const { data: borradoresAgente } = useAgenteBorradoresPendientesQuery(enabled);
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

  const onRefresh = useCallback(() => {
    void refetch();
    qc.invalidateQueries({ queryKey: AGENTE_IA_BORRADORES_KEY });
  }, [qc, refetch]);

  const borradoresCount = borradoresAgente?.count ?? borradoresPorRevisar.length;

  const hayLista = borradoresPorRevisar.length > 0;
  const buscando = Boolean(searchQuery.trim());
  const mostrarTextoVacio = !hayLista && !buscando;

  const header = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <View style={styles.buscador}>
          <Search size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          <TextInput
            style={styles.buscadorInput}
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
        {mostrarTextoVacio ? (
          <InstitutionalText role="caption" color="muted" style={styles.vacioCentro}>
            No hay borradores por revisar. Nueva cotización abre el formulario desde la barra.
          </InstitutionalText>
        ) : null}
        {borradoresFiltrados.length > 0 ? (
          <InstitutionalText role="captionBold" color="muted" style={styles.kicker}>
            {`Por revisar${borradoresCount > 0 ? ` · ${borradoresFiltrados.length}` : ''}`}
          </InstitutionalText>
        ) : null}
      </View>
    ),
    [borradoresCount, borradoresFiltrados.length, mostrarTextoVacio, searchQuery],
  );

  const renderItem = useCallback(
    ({ item }: { item: CotizacionCanal }) => (
      <CotizacionPendienteRow item={item} onPress={abrirDetalle} presentacion="tarjeta" />
    ),
    [abrirDetalle],
  );

  const screenHeader = (
    <Header
      title="Cotizar"
      dense
      showBack
      onBackPress={onBack}
      backgroundColor={I.canvas}
      titleColor={I.ink}
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
            paddingBottom: listBottom,
          },
          borradoresFiltrados.length === 0 && styles.listEmpty,
        ]}
        style={[hostScreenStyles.scroll, styles.listaAncho]}
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
          buscando ? (
            <InstitutionalText role="caption" color="muted" style={styles.vacio}>
              {`Nada coincide con «${searchQuery.trim()}».`}
            </InstitutionalText>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: I.canvas },
  listaAncho: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  list: {
    paddingTop: SPACING.fixed.sm,
    gap: SPACING.fixed.sm,
  },
  listEmpty: {
    flexGrow: 1,
  },
  headerBlock: {
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  buscador: {
    width: '100%',
    maxWidth: 576,
    height: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.paper,
    paddingHorizontal: SPACING.fixed.md,
  },
  buscadorInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: 14,
    color: I.ink,
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderWidth: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as object) : null),
  },
  vacio: {
    paddingVertical: SPACING.fixed.sm,
  },
  vacioCentro: {
    textAlign: 'center',
    paddingVertical: SPACING.fixed.sm,
  },
  kicker: {
    marginTop: 0,
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
