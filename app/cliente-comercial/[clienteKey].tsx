import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, FileText, MessageCircle } from 'lucide-react-native';
import Header from '@/components/Header';
import {
  HostEmptyState,
  HostPaperSection,
  HOST_GUTTER,
  hostScreenStyles,
} from '@/app/design-system/components';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalButton } from '@/design-system/components/InstitutionalButton';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { usePipelineClienteDetalleQuery } from '@/hooks/usePipelineClientesQuery';
import {
  ESTADO_PIPELINE_LABELS,
  ORIGEN_PIPELINE_LABELS,
  type EstadoPipelineNormalizado,
  type PipelineClienteCaso,
  type PipelineClienteVehiculoFicha,
} from '@/services/pipelineComercialService';
import {
  ESTADO_OPERATIVO_LABELS,
  ESTADO_OPERATIVO_VARIANT,
  mapPipelineEstadoToOperativo,
} from '@/utils/estadoOperativo';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { omnichannelChatHref } from '@/utils/chatRoutes';
import { navegarCasoPipeline } from '@/utils/navegarCasoPipeline';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const T = TYPOGRAPHY.styles;
const GRID_GAP = SPACING.fixed.sm;
const TWO_COL_MIN = 560;

type FiltroCaso = 'todos' | 'en_edicion' | 'por_agendar' | EstadoPipelineNormalizado;

function casoPasaFiltro(caso: PipelineClienteCaso, filtro: FiltroCaso): boolean {
  if (filtro === 'todos') return true;
  if (filtro === 'en_edicion') return Boolean(caso.en_edicion);
  if (filtro === 'por_agendar') return Boolean(caso.horario_por_confirmar);
  return caso.estado_normalizado === filtro;
}

function tagCaso(caso: PipelineClienteCaso): {
  label: string;
  variant: 'warning' | 'info' | 'neutral' | 'primary' | 'success' | 'error';
} {
  if (caso.tipo_entidad === 'cotizacion_canal' && caso.estado_raw === 'borrador' && caso.en_edicion) {
    return { label: 'En edición', variant: 'primary' };
  }
  if (caso.horario_por_confirmar) {
    return { label: 'Confirmar horario', variant: 'warning' };
  }
  const estadoOperativo = mapPipelineEstadoToOperativo(caso.estado_normalizado, {
    horarioPorConfirmar: caso.horario_por_confirmar,
  });
  return {
    label: ESTADO_OPERATIVO_LABELS[estadoOperativo],
    variant: ESTADO_OPERATIVO_VARIANT[estadoOperativo],
  };
}

function fechaCorta(iso: string | null): string {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function tituloVehiculo(veh: PipelineClienteVehiculoFicha): { titulo: string; subtitulo: string | null } {
  const patente = (veh.patente || '').trim();
  const resumen = (veh.resumen || '').trim();
  if (patente) {
    const escaped = patente.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const resto = resumen.replace(new RegExp(`^${escaped}\\s*[·•|]\\s*`, 'i'), '').trim();
    return { titulo: patente, subtitulo: resto || null };
  }
  return { titulo: resumen || 'Sin vehículo', subtitulo: null };
}

function referenciaPrincipal(caso: PipelineClienteCaso): string | null {
  if (!caso.es_cotizacion_adicional) return null;
  const folio = (caso.folio_principal || '').trim();
  const servicio = (caso.servicio_principal_nombre || '').trim();
  const desde = [folio, servicio].filter(Boolean).join(' · ');
  if (!desde) return 'Trabajo adicional';
  const extra = caso.ejecucion_adicional === 'nueva_fecha' ? ' · Nueva fecha' : '';
  return `Desde: ${desde}${extra}`;
}

const CasoCard = React.memo(function CasoCard({
  caso,
  width,
  onPress,
}: {
  caso: PipelineClienteCaso;
  width: number;
  onPress: (caso: PipelineClienteCaso) => void;
}) {
  const handlePress = useCallback(() => onPress(caso), [caso, onPress]);
  const folio = caso.numero_publico?.trim();
  const monto = caso.monto_clp != null ? formatearMontoCLP(caso.monto_clp) : null;
  const operativo = tagCaso(caso);
  const origen = ORIGEN_PIPELINE_LABELS[caso.origen] || '';
  const fecha = fechaCorta(caso.fecha_referencia);
  const meta = [origen, fecha].filter(Boolean).join(' · ');
  const adicional = Boolean(caso.es_cotizacion_adicional);
  const desde = referenciaPrincipal(caso);

  return (
    <View style={{ width }}>
      <HostPaperSection onPress={handlePress}>
        <View style={styles.casoTop}>
          <Text style={styles.casoServicio} numberOfLines={2}>
            {caso.servicio_resumen || ESTADO_PIPELINE_LABELS[caso.estado_normalizado]}
          </Text>
          <ChevronRight size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
        </View>
        <View style={styles.casoTags}>
          {adicional ? <InstitutionalTag label="Adicional" variant="info" size="sm" /> : null}
          {folio ? <InstitutionalTag label={folio} variant="neutral" size="sm" /> : null}
          <InstitutionalTag label={operativo.label} variant={operativo.variant} size="sm" />
        </View>
        {desde ? (
          <Text style={styles.casoDesde} numberOfLines={2}>
            {desde}
          </Text>
        ) : null}
        {meta || monto ? (
          <View style={styles.casoFooter}>
            {meta ? (
              <Text style={styles.casoMeta} numberOfLines={1}>
                {meta}
              </Text>
            ) : (
              <View style={styles.flex} />
            )}
            {monto ? <Text style={styles.casoPrecio}>{monto}</Text> : null}
          </View>
        ) : null}
      </HostPaperSection>
    </View>
  );
});

export default function ClienteComercialScreen() {
  const rawKey = useLocalSearchParams<{ clienteKey?: string | string[] }>().clienteKey;
  const clienteKey = decodeURIComponent(Array.isArray(rawKey) ? rawKey[0] : rawKey || '');
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState(() => Math.max(0, windowWidth - HOST_GUTTER * 2));
  const { data, isPending, isError, refetch } = usePipelineClienteDetalleQuery(
    clienteKey || undefined,
  );
  const [filtro, setFiltro] = useState<FiltroCaso>('todos');

  const twoCols = gridWidth >= TWO_COL_MIN;
  const cardWidth = twoCols
    ? Math.floor((gridWidth - GRID_GAP) / 2)
    : gridWidth;

  const filtrosDisponibles = useMemo(() => {
    const keys: FiltroCaso[] = ['todos'];
    if (!data) return keys;
    const casos = data.vehiculos.flatMap((v) => v.casos);
    if (casos.some((c) => c.en_edicion)) keys.push('en_edicion');
    if (casos.some((c) => c.horario_por_confirmar)) keys.push('por_agendar');
    const vistos = new Set<EstadoPipelineNormalizado>();
    for (const caso of casos) {
      if (!vistos.has(caso.estado_normalizado)) {
        vistos.add(caso.estado_normalizado);
        keys.push(caso.estado_normalizado);
      }
    }
    return keys;
  }, [data]);

  const vehiculosFiltrados = useMemo(() => {
    if (!data) return [];
    return data.vehiculos
      .map((veh) => ({
        ...veh,
        casos: veh.casos.filter((c) => casoPasaFiltro(c, filtro)),
      }))
      .filter((veh) => veh.casos.length > 0);
  }, [data, filtro]);

  const handleCaso = useCallback((caso: PipelineClienteCaso) => {
    navegarCasoPipeline(caso);
  }, []);

  const handleFiltro = useCallback((key: FiltroCaso) => {
    setFiltro(key);
  }, []);

  const labelFiltro = useCallback((key: FiltroCaso) => {
    if (key === 'todos') return 'Todos';
    if (key === 'en_edicion') return 'En edición';
    if (key === 'por_agendar') return 'Confirmar horario';
    return ESTADO_PIPELINE_LABELS[key];
  }, []);

  const abrirChat = useCallback(() => {
    if (!data?.conversation_id) return;
    router.push(
      omnichannelChatHref(data.conversation_id, {
        name: data.cliente_nombre,
        phone: data.cliente_telefono,
      }),
    );
  }, [data?.cliente_nombre, data?.cliente_telefono, data?.conversation_id]);

  const onGridLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    setGridWidth((prev) => (prev === next ? prev : next));
  }, []);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header
        title={data?.cliente_nombre || 'Cliente'}
        backgroundColor={I.canvas}
        titleColor={I.ink}
        showBack
        onBackPress={() => router.back()}
        rightComponent={
          data?.conversation_id ? (
            <TouchableOpacity
              onPress={abrirChat}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Abrir chat"
            >
              <MessageCircle size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
          ) : null
        }
      />
      {isPending && !data ? (
        <View style={styles.centered}>
          <ActivityIndicator color={I.primary} />
        </View>
      ) : isError || !data ? (
        <View style={styles.centered}>
          <InstitutionalText role="bodyBold">No encontramos este cliente</InstitutionalText>
          <InstitutionalButton
            label="Reintentar"
            variant="outline"
            size="compact"
            onPress={() => void refetch()}
          />
        </View>
      ) : (
        <ScrollView
          style={hostScreenStyles.scroll}
          contentContainerStyle={[
            hostScreenStyles.scrollInner,
            styles.scrollInner,
            { paddingBottom: insets.bottom + SPACING.fixed['2xl'] },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtrosTrack}
          >
            {filtrosDisponibles.map((key) => (
              <FiltroChip
                key={key}
                filtroKey={key}
                label={labelFiltro(key)}
                active={filtro === key}
                onSelect={handleFiltro}
              />
            ))}
          </ScrollView>

          <View style={styles.measure} onLayout={onGridLayout} />

          {vehiculosFiltrados.length === 0 ? (
            <HostEmptyState
              icon={FileText}
              title="Sin cotizaciones"
              description={
                filtro === 'todos'
                  ? 'Este cliente todavía no tiene cotizaciones en el taller.'
                  : 'Ninguna cotización coincide con este filtro.'
              }
            />
          ) : (
            vehiculosFiltrados.map((veh, index) => {
              const { titulo, subtitulo } = tituloVehiculo(veh);
              return (
                <View
                  key={veh.key}
                  style={[styles.vehiculoBlock, index > 0 && styles.vehiculoBlockNext]}
                >
                  <View style={styles.vehiculoHeader}>
                    <Text style={styles.vehiculoTitulo}>{titulo}</Text>
                    {subtitulo ? (
                      <Text style={styles.vehiculoSub} numberOfLines={2}>
                        {subtitulo}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.grid}>
                    {veh.casos.map((caso) => (
                      <CasoCard
                        key={`${caso.tipo_entidad}-${caso.entidad_id}`}
                        caso={caso}
                        width={cardWidth}
                        onPress={handleCaso}
                      />
                    ))}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const FiltroChip = React.memo(function FiltroChip({
  filtroKey,
  label,
  active,
  onSelect,
}: {
  filtroKey: FiltroCaso;
  label: string;
  active: boolean;
  onSelect: (key: FiltroCaso) => void;
}) {
  const handlePress = useCallback(() => onSelect(filtroKey), [filtroKey, onSelect]);
  return (
    <TouchableOpacity
      style={[styles.filtroChip, active && styles.filtroChipActive]}
      onPress={handlePress}
      activeOpacity={0.75}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.filtroLabel, active && styles.filtroLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: I.canvas },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.sm,
    padding: SPACING.fixed.lg,
  },
  scrollInner: {
    gap: SPACING.fixed.md,
  },
  filtrosTrack: {
    gap: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.xxs,
  },
  filtroChip: {
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xs,
    borderRadius: BORDERS.radius.sm,
    backgroundColor: I.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
  },
  filtroChipActive: {
    backgroundColor: COLORS.background.paper,
    borderColor: I.ink,
  },
  filtroLabel: {
    fontFamily: FF.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
  },
  filtroLabelActive: {
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  measure: {
    alignSelf: 'stretch',
    width: '100%',
    height: 0,
  },
  vehiculoBlock: {
    gap: SPACING.fixed.sm,
  },
  vehiculoBlockNext: {
    marginTop: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  vehiculoHeader: {
    gap: 2,
  },
  vehiculoTitulo: {
    fontFamily: FF.sansSemiBold,
    fontSize: T.h4.fontSize,
    lineHeight: Math.round(T.h4.fontSize * 1.25),
    color: I.ink,
  },
  vehiculoSub: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  casoTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
  },
  casoServicio: {
    flex: 1,
    minWidth: 0,
    fontFamily: FF.sansSemiBold,
    fontSize: T.h4.fontSize,
    color: I.ink,
    lineHeight: Math.round(T.h4.fontSize * 1.25),
  },
  casoTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
    marginTop: SPACING.fixed.xs,
  },
  casoDesde: {
    marginTop: SPACING.fixed.xs,
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
  },
  casoFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.fixed.sm,
    marginTop: SPACING.fixed.xs,
  },
  flex: { flex: 1 },
  casoMeta: {
    flex: 1,
    minWidth: 0,
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
  },
  casoPrecio: {
    fontFamily: FF.monoMedium,
    fontSize: T.body.fontSize,
    color: I.ink,
  },
});
