import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { CalendarClock, ChevronRight, MessageCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
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
import { openCitaPersonalDetalle } from '@/utils/navigateProveedorDetalle';
import { omnichannelChatHref } from '@/utils/chatRoutes';
import { leadCategoriaOf, leadOperativoTag } from '@/utils/leadBandejaPresentation';

const I = COLORS.institutional;
const MAX_ITEMS = 5;

interface NeedsAttentionListProps {
  pipelineItems?: PipelineComercialItem[];
}

function copyAtencion(row: PipelineComercialItem): string {
  const cliente = row.cliente_nombre?.trim() || 'El cliente';
  const servicio = row.servicio_resumen?.trim() || 'el servicio';
  if (row.horario_por_confirmar) {
    return `${cliente} aceptó ${servicio}. Elige día y hora.`;
  }
  const alta = ['interesado_calificado', 'listo_agendar'].includes(leadCategoriaOf(row));
  if (alta) {
    return `${cliente} no respondió ${servicio}. Ya mostró interés: escribe o cierra el caso.`;
  }
  return `${cliente} no respondió ${servicio}. Pregunta qué pasó o cierra el caso.`;
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
  const titulo = row.cliente_nombre || 'Cliente';
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
        <InstitutionalText role="bodyBold" numberOfLines={1}>
          {titulo}
        </InstitutionalText>
        <InstitutionalText role="caption" color="body" numberOfLines={2}>
          {copyAtencion(row)}
        </InstitutionalText>
      </View>
      <InstitutionalTag label={tag.label} variant="warning" size="sm" />
      <ChevronRight size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
    </TouchableOpacity>
  );
});

export function NeedsAttentionList({ pipelineItems = [] }: NeedsAttentionListProps) {
  const queryClient = useQueryClient();

  const items = useMemo(() => {
    const horario = pipelineItems.filter((row) => row.horario_por_confirmar);
    const sinRespuesta = pipelineItems.filter(
      (row) =>
        !row.horario_por_confirmar
        && (row.esperando_respuesta_24h || row.demorado_48h),
    );
    return [...horario, ...sinRespuesta].slice(0, MAX_ITEMS);
  }, [pipelineItems]);

  const handlePress = useCallback(
    (row: PipelineComercialItem) => {
      if (row.horario_por_confirmar && row.cita_id) {
        openCitaPersonalDetalle(router, queryClient, row.cita_id);
        return;
      }
      if (row.conversation_id) {
        router.push(omnichannelChatHref(row.conversation_id));
        return;
      }
      if (row.cotizacion_id) {
        router.push(`/cotizacion-canal/${row.cotizacion_id}`);
        return;
      }
      router.push('/(tabs)/bandeja?filtro=esperando_24h');
    },
    [queryClient],
  );

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
    alignItems: 'center',
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
    gap: 2,
  },
});
