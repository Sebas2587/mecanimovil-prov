import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, CalendarClock, ChevronRight, MessageCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
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

const I = COLORS.institutional;

interface NeedsAttentionListProps {
  pipelineItems?: PipelineComercialItem[];
}

export function NeedsAttentionList({ pipelineItems = [] }: NeedsAttentionListProps) {
  const queryClient = useQueryClient();

  const items = useMemo(() => {
    return pipelineItems.filter(
      (row) =>
        row.horario_por_confirmar
        || (row.estado_normalizado === 'nuevo' && row.listo_para_enviar)
        || (row.pendientes_revision && row.pendientes_revision.length > 0),
    ).slice(0, 5);
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
        router.push('/cotizar-ia');
        return;
      }
      router.push('/(tabs)/bandeja');
    },
    [queryClient],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <HostSectionKicker label="Requiere tu atención" />
      <HostPaperSection style={styles.paper}>
        {items.map((row, index) => {
          const esUltimo = index === items.length - 1;
          const titulo = row.cliente_nombre || 'Cliente';
          const subtitulo = row.servicio_resumen || row.vehiculo_resumen || 'Caso comercial';
          const esHorario = Boolean(row.horario_por_confirmar);
          const esEscalamiento = Boolean(row.pendientes_revision?.length);

          return (
            <TouchableOpacity
              key={`${row.tipo_entidad}-${row.entidad_id}`}
              style={[styles.row, !esUltimo && styles.rowBorder]}
              onPress={() => handlePress(row)}
              activeOpacity={0.75}
            >
              <View style={hostIconPlateStyle}>
                {esHorario ? (
                  <CalendarClock size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                ) : esEscalamiento ? (
                  <AlertTriangle size={16} color={I.accentYellow} strokeWidth={ICON_STROKE_WIDTH} />
                ) : (
                  <MessageCircle size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                )}
              </View>
              <View style={styles.copy}>
                <InstitutionalText role="bodyBold" numberOfLines={1}>
                  {titulo}
                </InstitutionalText>
                <InstitutionalText role="caption" color="body" numberOfLines={1}>
                  {subtitulo}
                </InstitutionalText>
              </View>
              <InstitutionalTag
                label={
                  esHorario
                    ? 'Confirmar horario'
                    : esEscalamiento
                      ? 'Revisar'
                      : 'Acción'
                }
                variant={esHorario ? 'warning' : 'primary'}
                size="sm"
              />
              <ChevronRight size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
          );
        })}
      </HostPaperSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.fixed.lg,
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
