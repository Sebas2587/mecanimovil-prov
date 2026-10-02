import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { CalendarClock, ChevronRight, MessageCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import {
  HostPaperSection,
  HostSectionKicker,
  InstitutionalText,
  hostIconPlateStyle,
} from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { PipelineComercialItem } from '@/services/pipelineComercialService';
import { navegarAtencionHoy } from '@/utils/navegarCasoPipeline';

const I = COLORS.institutional;
const MAX_ITEMS = 5;

interface NeedsAttentionListProps {
  pipelineItems?: PipelineComercialItem[];
}

function abierto(row: PipelineComercialItem): boolean {
  return row.estado_normalizado !== 'rechazado_perdido'
    && row.estado_normalizado !== 'completado'
    && row.estado_normalizado !== 'aceptado_agendado'
    && row.estado_normalizado !== 'en_ejecucion';
}

const PasoRow = React.memo(function PasoRow({
  row,
  last,
  frase,
  icon,
  onPress,
}: {
  row: PipelineComercialItem;
  last: boolean;
  frase: string;
  icon: 'agenda' | 'espera';
  onPress: (row: PipelineComercialItem) => void;
}) {
  const handlePress = useCallback(() => onPress(row), [onPress, row]);
  const titulo = row.cliente_nombre || 'Cliente';
  const detalle = [row.servicio_resumen?.trim(), row.vehiculo_resumen?.trim()]
    .filter(Boolean)
    .join(' · ');

  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      onPress={handlePress}
      activeOpacity={0.75}
      accessibilityRole="button"
    >
      <View style={hostIconPlateStyle}>
        {icon === 'agenda' ? (
          <CalendarClock size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
        ) : (
          <MessageCircle size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
        )}
      </View>
      <View style={styles.copy}>
        <InstitutionalText role="bodyBold">{titulo}</InstitutionalText>
        {detalle ? (
          <InstitutionalText role="caption" color="muted" numberOfLines={1}>
            {detalle}
          </InstitutionalText>
        ) : null}
        <InstitutionalText role="caption" color="body">
          {frase}
        </InstitutionalText>
      </View>
      <View style={styles.chevron}>
        <ChevronRight size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
      </View>
    </TouchableOpacity>
  );
});

function Bloque({
  titulo,
  verTodas,
  rows,
  frase,
  icon,
  onPress,
}: {
  titulo: string;
  verTodas: () => void;
  rows: PipelineComercialItem[];
  frase: string;
  icon: 'agenda' | 'espera';
  onPress: (row: PipelineComercialItem) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <HostSectionKicker label={titulo} style={styles.kicker} />
        <TouchableOpacity onPress={verTodas} hitSlop={8} accessibilityRole="button">
          <InstitutionalText role="captionBold" color="primary">
            Ver todas
          </InstitutionalText>
        </TouchableOpacity>
      </View>
      <HostPaperSection style={styles.paper}>
        {rows.map((row, index) => (
          <PasoRow
            key={`${row.tipo_entidad}-${row.entidad_id}`}
            row={row}
            last={index === rows.length - 1}
            frase={frase}
            icon={icon}
            onPress={onPress}
          />
        ))}
      </HostPaperSection>
    </View>
  );
}

export function NeedsAttentionList({ pipelineItems = [] }: NeedsAttentionListProps) {
  const porAgendar = useMemo(
    () => pipelineItems.filter(
      (row) => row.horario_por_confirmar && !row.fecha_agendada && abierto(row),
    ).slice(0, MAX_ITEMS),
    [pipelineItems],
  );
  const esperando = useMemo(
    () => pipelineItems.filter(
      (row) =>
        !row.horario_por_confirmar
        && !row.fecha_agendada
        && abierto(row)
        && (row.esperando_respuesta_24h || row.demorado_48h),
    ).slice(0, MAX_ITEMS),
    [pipelineItems],
  );

  const handlePress = useCallback((row: PipelineComercialItem) => {
    navegarAtencionHoy(row);
  }, []);
  const verPorAgendar = useCallback(() => {
    router.push('/(tabs)/bandeja?paso=por_agendar');
  }, []);
  const verEsperando = useCallback(() => {
    router.push('/(tabs)/bandeja?paso=esperando');
  }, []);

  if (porAgendar.length === 0 && esperando.length === 0) return null;

  return (
    <View style={styles.stack}>
      <Bloque
        titulo="Por agendar"
        verTodas={verPorAgendar}
        rows={porAgendar}
        frase="Aceptó. Elige día y hora para empezar el trabajo."
        icon="agenda"
        onPress={handlePress}
      />
      <Bloque
        titulo="Esperando al cliente"
        verTodas={verEsperando}
        rows={esperando}
        frase="Todavía no acepta. Ábrelo si quieres escribirle."
        icon="espera"
        onPress={handlePress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: SPACING.fixed.lg,
  },
  container: {
    marginBottom: 0,
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
    gap: 4,
  },
  chevron: {
    marginTop: 2,
    flexShrink: 0,
  },
});
