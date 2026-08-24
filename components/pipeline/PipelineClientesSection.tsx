import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Check, ChevronDown, ChevronRight, Inbox, SlidersHorizontal, Users } from 'lucide-react-native';
import {
  ORIGEN_PIPELINE_LABELS,
  type OrigenPipeline,
  type PipelineClienteItem,
  type PrioridadClientePipeline,
} from '@/services/pipelineComercialService';
import { usePipelineClientesQuery } from '@/hooks/usePipelineClientesQuery';
import { BottomSheet } from '@/app/design-system/components/BottomSheet';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalScreenTabs } from '@/app/design-system/components/InstitutionalScreenTabs';
import { HostEmptyState, HOST_GUTTER, hostScreenStyles } from '@/app/design-system/components';
import { hostIconPlateStyle } from '@/app/design-system/styles/institutionalSemantic';
import {
  institutionalInputPlaceholder,
  institutionalInputStyles,
} from '@/app/design-system/styles/institutionalInputs';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY, SHADOWS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;
const T = TYPOGRAPHY.styles;
const FF = TYPOGRAPHY.fontFamily;

type PrioridadVista = PrioridadClientePipeline;

const PRIORIDAD_TABS: Array<{ key: PrioridadVista; label: string }> = [
  { key: 'todos', label: 'Todos' },
  { key: 'con_accion', label: 'Con acción' },
  { key: 'cerrados', label: 'Cerrados' },
];

const ORIGENES: Array<{ key: OrigenPipeline | 'todos'; label: string }> = [
  { key: 'todos', label: 'Todos' },
  { key: 'marketplace', label: 'Mecanimovil' },
  { key: 'catalogo', label: 'Catálogo' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'messenger', label: 'Messenger' },
  { key: 'directo', label: 'Link libre' },
  { key: 'manual', label: 'Personal' },
];

function tiempoRelativo(fechaIso: string | null): string {
  if (!fechaIso) return '';
  const t = new Date(fechaIso).getTime();
  if (Number.isNaN(t)) return '';
  const mins = Math.max(0, Math.round((Date.now() - t) / 60_000));
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const horas = Math.round(mins / 60);
  if (horas < 48) return `${horas}h`;
  const dias = Math.round(horas / 24);
  return `${dias}d`;
}

function etiquetaCasos(n: number): string {
  return n === 1 ? '1 cotización' : `${n} cotizaciones`;
}

function chipsVehiculo(item: PipelineClienteItem): string[] {
  const labels = item.vehiculos
    .map((v) => (v.patente || v.resumen || '').trim())
    .filter(Boolean);
  if (labels.length <= 2) return labels;
  return [...labels.slice(0, 2), `+${labels.length - 2}`];
}

type Props = {
  limite?: number;
  filtroOrigen?: OrigenPipeline;
  busquedaInicial?: string;
  prioridadInicial?: PrioridadVista;
  hintConAccion?: string;
};

const ClienteRow = React.memo(function ClienteRow({
  item,
  onPress,
  last,
}: {
  item: PipelineClienteItem;
  onPress: (item: PipelineClienteItem) => void;
  last?: boolean;
}) {
  const handlePress = useCallback(() => onPress(item), [onPress, item]);
  const tiempo = tiempoRelativo(item.ultima_actividad);
  const vehiculos = chipsVehiculo(item);

  return (
    <TouchableOpacity
      style={[styles.leadRow, !last && styles.leadRowBorder]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={item.cliente_nombre}
    >
      <View style={hostIconPlateStyle}>
        <Inbox size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
      </View>
      <View style={styles.leadBody}>
        <View style={styles.leadLine1}>
          <Text style={styles.leadNombre} numberOfLines={1}>
            {item.cliente_nombre || 'Cliente'}
          </Text>
          <View style={styles.leadPriceChevron}>
            {tiempo ? <Text style={styles.leadTime}>{tiempo}</Text> : null}
            <ChevronRight size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
        </View>
        <Text style={styles.leadMeta}>{etiquetaCasos(item.casos_count)}</Text>
        <View style={styles.leadTags}>
          {item.aceptadas > 0 ? (
            <InstitutionalTag label={`Aceptadas ${item.aceptadas}`} variant="success" size="sm" />
          ) : null}
          {item.rechazadas > 0 ? (
            <InstitutionalTag label={`Rechazadas ${item.rechazadas}`} variant="error" size="sm" />
          ) : null}
          {vehiculos.map((label) => (
            <InstitutionalTag key={label} label={label} variant="neutral" size="sm" />
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
});

export function PipelineClientesSection({
  limite = 100,
  filtroOrigen,
  busquedaInicial = '',
  prioridadInicial = 'todos',
  hintConAccion,
}: Props) {
  const [prioridad, setPrioridad] = useState<PrioridadVista>(prioridadInicial);
  const [origen, setOrigen] = useState<OrigenPipeline | 'todos'>(filtroOrigen ?? 'todos');
  const [origenSheetVisible, setOrigenSheetVisible] = useState(false);
  const [busqueda, setBusqueda] = useState(busquedaInicial);
  const [qDebounced, setQDebounced] = useState(busquedaInicial.trim());

  useEffect(() => {
    if (filtroOrigen) setOrigen(filtroOrigen);
  }, [filtroOrigen]);

  useEffect(() => {
    setPrioridad(prioridadInicial);
  }, [prioridadInicial]);

  useEffect(() => {
    const next = busquedaInicial.trim();
    setBusqueda(next);
    setQDebounced(next);
  }, [busquedaInicial]);

  useEffect(() => {
    const handle = setTimeout(() => setQDebounced(busqueda.trim()), 300);
    return () => clearTimeout(handle);
  }, [busqueda]);

  const queryParams = useMemo(
    () => ({
      limite,
      origen: origen === 'todos' ? undefined : origen,
      prioridad,
      q: qDebounced || undefined,
    }),
    [limite, origen, prioridad, qDebounced],
  );

  const { data, isPending, isFetching, refetch } = usePipelineClientesQuery(queryParams);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const items = data?.results ?? [];
  const resumen = data?.resumen;
  const loading = isPending && items.length === 0;

  const handlePress = useCallback((item: PipelineClienteItem) => {
    router.push(`/cliente-comercial/${encodeURIComponent(item.cliente_key)}`);
  }, []);

  const handlePrioridad = useCallback((key: PrioridadVista) => {
    setPrioridad(key);
  }, []);

  const keyExtractor = useCallback((item: PipelineClienteItem) => item.cliente_key, []);

  const renderItem = useCallback(
    ({ item, index }: { item: PipelineClienteItem; index: number }) => {
      const last = index === items.length - 1;
      return (
        <View
          style={[
            styles.paperListItem,
            index === 0 && styles.paperListFirst,
            last && styles.paperListLast,
          ]}
        >
          <ClienteRow item={item} onPress={handlePress} last={last} />
        </View>
      );
    },
    [handlePress, items.length],
  );

  const origenActivoLabel = origen === 'todos' ? null : ORIGEN_PIPELINE_LABELS[origen] || origen;

  const tabs = useMemo(
    () =>
      PRIORIDAD_TABS.map((tab) => ({
        ...tab,
        badge: resumen ? resumen[tab.key] : undefined,
      })),
    [resumen],
  );

  const openOrigenSheet = useCallback(() => setOrigenSheetVisible(true), []);
  const closeOrigenSheet = useCallback(() => setOrigenSheetVisible(false), []);
  const handleSelectOrigen = useCallback((key: OrigenPipeline | 'todos') => {
    setOrigen(key);
    setOrigenSheetVisible(false);
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={I.primary} />
      </View>
    );
  }

  return (
    <View style={styles.sectionFill}>
      <View style={hostScreenStyles.gutterX}>
        {hintConAccion ? (
          <View style={styles.filterHint}>
            <InstitutionalText role="caption" color="muted">
              {hintConAccion}
            </InstitutionalText>
          </View>
        ) : null}
        <View style={styles.filterBar}>
          <View style={styles.tabsGrow}>
            <InstitutionalScreenTabs
              tabs={tabs}
              activeKey={prioridad}
              onChange={handlePrioridad}
            />
          </View>
          <TouchableOpacity
            style={styles.origenTrigger}
            onPress={openOrigenSheet}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={
              origenActivoLabel ? `Filtrar origen: ${origenActivoLabel}` : 'Filtrar por origen'
            }
          >
            <SlidersHorizontal size={15} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.origenTriggerText} numberOfLines={1}>
              {origenActivoLabel ?? 'Origen'}
            </Text>
            <ChevronDown size={14} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        </View>
        <View style={styles.searchWrap}>
          <TextInput
            style={institutionalInputStyles.input}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Cliente, teléfono, patente o MM-000098"
            placeholderTextColor={institutionalInputPlaceholder}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        style={hostScreenStyles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isPending}
            onRefresh={() => void refetch()}
            tintColor={I.primary}
            colors={[I.primary]}
          />
        }
        contentContainerStyle={[
          styles.listContentPad,
          { paddingHorizontal: HOST_GUTTER },
          items.length === 0 && styles.listContentEmpty,
        ]}
        removeClippedSubviews
        maxToRenderPerBatch={12}
        windowSize={8}
        initialNumToRender={10}
        ListEmptyComponent={
          <HostEmptyState
            icon={Users}
            title={qDebounced ? 'Sin coincidencias' : 'Sin clientes'}
            description={
              qDebounced
                ? `Nadie coincide con «${qDebounced}».`
                : 'Cuando envíes una cotización, el cliente aparece aquí con todas sus visitas.'
            }
          />
        }
      />

      <BottomSheet visible={origenSheetVisible} onClose={closeOrigenSheet}>
        <InstitutionalText role="h4" style={styles.sheetTitle}>
          Origen
        </InstitutionalText>
        <InstitutionalText role="caption" color="muted" style={styles.sheetSubtitle}>
          Filtra por canal
        </InstitutionalText>
        <View style={styles.sheetList}>
          {ORIGENES.map((o) => (
            <OrigenRow
              key={o.key}
              origenKey={o.key}
              label={o.label}
              active={origen === o.key}
              onSelect={handleSelectOrigen}
            />
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}

const OrigenRow = React.memo(function OrigenRow({
  origenKey,
  label,
  active,
  onSelect,
}: {
  origenKey: OrigenPipeline | 'todos';
  label: string;
  active: boolean;
  onSelect: (key: OrigenPipeline | 'todos') => void;
}) {
  const handlePress = useCallback(() => onSelect(origenKey), [onSelect, origenKey]);
  return (
    <TouchableOpacity
      style={[styles.sheetRow, active && styles.sheetRowActive]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      <InstitutionalText role="body">{label}</InstitutionalText>
      {active ? <Check size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} /> : null}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  sectionFill: { flex: 1 },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    marginBottom: SPACING.fixed.sm,
  },
  tabsGrow: { flex: 1, minWidth: 0 },
  origenTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 4,
    maxWidth: 118,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xs + 2,
    borderRadius: BORDERS.radius.sm,
    backgroundColor: I.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
  },
  origenTriggerText: {
    flexShrink: 1,
    fontFamily: FF.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.ink,
  },
  searchWrap: { marginBottom: SPACING.fixed.sm },
  filterHint: {
    marginBottom: SPACING.fixed.sm,
  },
  listContentPad: {
    paddingBottom: SPACING.fixed['2xl'],
    gap: 0,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
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
  leadRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
    paddingVertical: 14,
    backgroundColor: 'transparent',
  },
  leadRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  leadBody: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  leadLine1: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
  },
  leadNombre: {
    flex: 1,
    minWidth: 0,
    fontFamily: FF.sansSemiBold,
    fontSize: T.h4.fontSize,
    color: I.ink,
    lineHeight: Math.round(T.h4.fontSize * 1.25),
  },
  leadPriceChevron: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
    paddingTop: 2,
  },
  leadTime: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
  },
  leadTags: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
  },
  leadMeta: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
  },
  loadingWrap: { paddingVertical: SPACING.fixed.lg, alignItems: 'center' },
  sheetTitle: { marginBottom: 0 },
  sheetSubtitle: { marginBottom: SPACING.fixed.sm },
  sheetList: {
    gap: SPACING.fixed.xxs,
    paddingBottom: SPACING.fixed.sm,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.fixed.md,
    paddingHorizontal: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.md,
  },
  sheetRowActive: {
    backgroundColor: I.surfaceSoft,
  },
});

export default PipelineClientesSection;
