import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, MessageCircle } from 'lucide-react-native';
import Header from '@/components/Header';
import {
  HostMetricRow,
  HostPaperSection,
  HostSectionKicker,
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
  type EstadoPipelineNormalizado,
  type PipelineClienteCaso,
} from '@/services/pipelineComercialService';
import {
  ESTADO_OPERATIVO_LABELS,
  ESTADO_OPERATIVO_VARIANT,
  mapPipelineEstadoToOperativo,
} from '@/utils/estadoOperativo';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { extraerNueveDigitosDesdeGuardado } from '@/utils/chilePhone';
import { navegarCasoPipeline } from '@/utils/navegarCasoPipeline';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const T = TYPOGRAPHY.styles;

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

const CasoRow = React.memo(function CasoRow({
  caso,
  last,
  onPress,
}: {
  caso: PipelineClienteCaso;
  last?: boolean;
  onPress: (caso: PipelineClienteCaso) => void;
}) {
  const handlePress = useCallback(() => onPress(caso), [caso, onPress]);
  const folio = caso.numero_publico?.trim();
  const monto = caso.monto_clp != null ? formatearMontoCLP(caso.monto_clp) : null;
  const operativo = tagCaso(caso);

  return (
    <TouchableOpacity
      style={[styles.casoRow, !last && styles.casoRowBorder]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <View style={styles.casoBody}>
        <View style={styles.casoLine1}>
          <Text style={styles.casoServicio} numberOfLines={2}>
            {caso.servicio_resumen || ESTADO_PIPELINE_LABELS[caso.estado_normalizado]}
          </Text>
          <ChevronRight size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
        </View>
        <View style={styles.casoTags}>
          {folio ? <InstitutionalTag label={folio} variant="neutral" size="sm" /> : null}
          <InstitutionalTag label={operativo.label} variant={operativo.variant} size="sm" />
        </View>
        {monto ? (
          <View style={styles.casoFooter}>
            <View style={styles.flex} />
            <Text style={styles.casoPrecio}>{monto}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

export default function ClienteComercialScreen() {
  const rawKey = useLocalSearchParams<{ clienteKey?: string | string[] }>().clienteKey;
  const clienteKey = decodeURIComponent(Array.isArray(rawKey) ? rawKey[0] : rawKey || '');
  const insets = useSafeAreaInsets();
  const { data, isPending, isError, refetch } = usePipelineClienteDetalleQuery(
    clienteKey || undefined,
  );
  const [filtro, setFiltro] = useState<FiltroCaso>('todos');

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

  const abrirWhatsApp = useCallback(() => {
    const nacional = extraerNueveDigitosDesdeGuardado(data?.cliente_telefono);
    if (!nacional) return;
    void Linking.openURL(`https://wa.me/56${nacional}`);
  }, [data?.cliente_telefono]);

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

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header
        title={data?.cliente_nombre || 'Cliente'}
        backgroundColor={I.canvas}
        titleColor={I.ink}
        showBack
        onBackPress={() => router.back()}
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
          {data.cliente_telefono ? (
            <InstitutionalText role="caption" color="muted" style={styles.telefono}>
              {data.cliente_telefono}
            </InstitutionalText>
          ) : null}

          <HostPaperSection>
            <HostMetricRow label="Enviadas" value={String(data.enviadas)} />
            <HostMetricRow label="Aceptadas" value={String(data.aceptadas)} />
            <HostMetricRow label="Rechazadas" value={String(data.rechazadas)} last />
          </HostPaperSection>

          {extraerNueveDigitosDesdeGuardado(data.cliente_telefono) ? (
            <InstitutionalButton
              label="WhatsApp"
              variant="outline"
              size="compact"
              leading={
                <MessageCircle size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
              }
              onPress={abrirWhatsApp}
            />
          ) : null}

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

          {vehiculosFiltrados.map((veh) => (
            <View key={veh.key} style={styles.vehiculoBlock}>
              <HostSectionKicker label={veh.resumen || 'Sin vehículo'} />
              <HostPaperSection>
                {veh.casos.map((caso, index) => (
                  <CasoRow
                    key={`${caso.tipo_entidad}-${caso.entidad_id}`}
                    caso={caso}
                    last={index === veh.casos.length - 1}
                    onPress={handleCaso}
                  />
                ))}
              </HostPaperSection>
            </View>
          ))}
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
  telefono: { marginTop: -SPACING.fixed.xs },
  filtrosTrack: {
    gap: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.xxs,
  },
  filtroChip: {
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xs,
    borderRadius: BORDERS.radius.pill,
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
  vehiculoBlock: { gap: SPACING.fixed.xs },
  casoRow: {
    paddingVertical: SPACING.fixed.sm,
  },
  casoRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  casoBody: { gap: 6 },
  casoLine1: {
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
  },
  casoFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  flex: { flex: 1 },
  casoPrecio: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
});
