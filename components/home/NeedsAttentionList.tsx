import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { CalendarClock, ChevronRight, MessageCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import {
  HostPaperSection,
  HostSectionKicker,
  InstitutionalTag,
  InstitutionalText,
  hostIconPlateStyle,
} from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { PipelineComercialItem } from '@/services/pipelineComercialService';
import { navegarAtencionHoy } from '@/utils/navegarCasoPipeline';
import { leadCategoriaOf, leadOperativoTag } from '@/utils/leadBandejaPresentation';

const I = COLORS.institutional;
const MAX_ITEMS = 5;

interface NeedsAttentionListProps {
  pipelineItems?: PipelineComercialItem[];
}

function copyAtencion(row: PipelineComercialItem): string {
  if (row.horario_por_confirmar) {
    return 'Aceptó el servicio. Elige día y hora.';
  }
  if (row.es_cotizacion_adicional) {
    return 'Trabajo adicional sin respuesta. El servicio ya agendado sigue igual.';
  }
  const alta = ['interesado_calificado', 'listo_agendar'].includes(leadCategoriaOf(row));
  if (alta) {
    return 'No respondió. Ya mostró interés: escribe o cierra el caso.';
  }
  return 'No respondió. Pregunta qué pasó o cierra el caso.';
}

const AttentionRow = React.memo(function AttentionRow({
  row,
  last,
  onPress,
}: {
  row: PipelineComercialItem;
  last: boolean;
  onPress: (row: PipelineComercialItem) => void;
}) {
  const handlePress = useCallback(() => onPress(row), [onPress, row]);
  const esAdicional = Boolean(row.es_cotizacion_adicional);
  const titulo = esAdicional
    ? (row.servicio_resumen?.trim() || 'Trabajo adicional')
    : (row.cliente_nombre || 'Cliente');
  const vehiculo = esAdicional
    ? [row.cliente_nombre, row.vehiculo_resumen?.trim()].filter(Boolean).join(' · ')
    : row.vehiculo_resumen?.trim();
  const tag = leadOperativoTag(row, 'Acción', 'warning');
  const esHorario = Boolean(row.horario_por_confirmar);

  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      onPress={handlePress}
      activeOpacity={0.75}
      accessibilityRole="button"
    >
      <View style={hostIconPlateStyle}>
        {esHorario ? (
          <CalendarClock size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
        ) : (
          <MessageCircle size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
        )}
      </View>
      <View style={styles.copy}>
        <InstitutionalText role="bodyBold">
          {titulo}
        </InstitutionalText>
        {vehiculo ? (
          <InstitutionalText role="caption" color="muted">
            {vehiculo}
          </InstitutionalText>
        ) : null}
        <InstitutionalText role="caption" color="body">
          {copyAtencion(row)}
        </InstitutionalText>
        <View style={styles.tags}>
          {esAdicional ? (
            <InstitutionalTag label="Trabajo adicional" variant="adicional" size="sm" />
          ) : null}
          <InstitutionalTag label={tag.label} variant={tag.variant} size="sm" />
        </View>
      </View>
      <View style={styles.chevron}>
        <ChevronRight size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
      </View>
    </TouchableOpacity>
  );
});

export function NeedsAttentionList({ pipelineItems = [] }: NeedsAttentionListProps) {
  const items = useMemo(() => {
    const abierto = (row: PipelineComercialItem) =>
      row.estado_normalizado !== 'rechazado_perdido'
      && row.estado_normalizado !== 'completado'
      && row.estado_normalizado !== 'aceptado_agendado'
      && row.estado_normalizado !== 'en_ejecucion';
    const horario = pipelineItems.filter(
      (row) => row.horario_por_confirmar && !row.fecha_agendada && abierto(row),
    );
    const sinRespuesta = pipelineItems.filter(
      (row) =>
        !row.horario_por_confirmar
        && !row.fecha_agendada
        && abierto(row)
        && (row.esperando_respuesta_24h || row.demorado_48h),
    );
    return [...horario, ...sinRespuesta].slice(0, MAX_ITEMS);
  }, [pipelineItems]);

  const handlePress = useCallback((row: PipelineComercialItem) => {
    navegarAtencionHoy(row);
  }, []);

  const goVerTodas = useCallback(() => {
    const hayHorario = items.some((row) => row.horario_por_confirmar);
    const haySinRespuesta = items.some((row) => row.esperando_respuesta_24h || row.demorado_48h);
    if (hayHorario && !haySinRespuesta) {
      router.push('/(tabs)/bandeja?filtro=por_agendar');
      return;
    }
    if (haySinRespuesta && !hayHorario) {
      router.push('/(tabs)/bandeja?filtro=esperando_24h');
      return;
    }
    router.push('/(tabs)/bandeja');
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <HostSectionKicker label="Requiere tu atención" style={styles.kicker} />
        <TouchableOpacity onPress={goVerTodas} hitSlop={8} accessibilityRole="button">
          <InstitutionalText role="captionBold" color="primary">
            Ver todas
          </InstitutionalText>
        </TouchableOpacity>
      </View>
      <HostPaperSection style={styles.paper}>
        {items.map((row, index) => (
          <AttentionRow
            key={`${row.tipo_entidad}-${row.entidad_id}`}
            row={row}
            last={index === items.length - 1}
            onPress={handlePress}
          />
        ))}
      </HostPaperSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.fixed.lg,
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
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chevron: {
    marginTop: 2,
    flexShrink: 0,
  },
});
