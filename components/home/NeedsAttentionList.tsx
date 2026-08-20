import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { CalendarClock, ChevronRight } from 'lucide-react-native';
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

const I = COLORS.institutional;
const MAX_ITEMS = 5;

interface NeedsAttentionListProps {
  pipelineItems?: PipelineComercialItem[];
}

function copyHorarioPendiente(row: PipelineComercialItem): string {
  const cliente = row.cliente_nombre?.trim() || 'El cliente';
  const servicio = row.servicio_resumen?.trim() || 'el servicio';
  if (row.conversation_id) {
    return `${cliente} aceptó ${servicio}. La IA está coordinando el horario.`;
  }
  return `${cliente} aceptó ${servicio}. Confirma día y hora.`;
}

export function NeedsAttentionList({ pipelineItems = [] }: NeedsAttentionListProps) {
  const queryClient = useQueryClient();

  const items = useMemo(
    () => pipelineItems.filter((row) => row.horario_por_confirmar).slice(0, MAX_ITEMS),
    [pipelineItems],
  );

  const handlePress = useCallback(
    (row: PipelineComercialItem) => {
      if (row.cita_id) {
        openCitaPersonalDetalle(router, queryClient, row.cita_id);
        return;
      }
      router.push('/(tabs)/bandeja?filtro=por_agendar');
    },
    [queryClient],
  );

  const goBandejaPorAgendar = useCallback(() => {
    router.push('/(tabs)/bandeja?filtro=por_agendar');
  }, []);

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <HostSectionKicker label="Por agendar" style={styles.kicker} />
        <TouchableOpacity onPress={goBandejaPorAgendar} hitSlop={8} accessibilityRole="button">
          <InstitutionalText role="captionBold" color="primary">
            Ver todas
          </InstitutionalText>
        </TouchableOpacity>
      </View>
      <HostPaperSection style={styles.paper}>
        {items.map((row, index) => {
          const esUltimo = index === items.length - 1;
          const titulo = row.cliente_nombre || 'Cliente';
          const conIa = Boolean(row.conversation_id);

          return (
            <TouchableOpacity
              key={`${row.tipo_entidad}-${row.entidad_id}`}
              style={[styles.row, !esUltimo && styles.rowBorder]}
              onPress={() => handlePress(row)}
              activeOpacity={0.75}
              accessibilityRole="button"
            >
              <View style={hostIconPlateStyle}>
                <CalendarClock size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
              </View>
              <View style={styles.copy}>
                <InstitutionalText role="bodyBold" numberOfLines={1}>
                  {titulo}
                </InstitutionalText>
                <InstitutionalText role="caption" color="body" numberOfLines={2}>
                  {copyHorarioPendiente(row)}
                </InstitutionalText>
              </View>
              <InstitutionalTag
                label={conIa ? 'IA coordinando' : 'Confirmar horario'}
                variant="warning"
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
