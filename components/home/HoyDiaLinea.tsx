import React, { memo, useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { HostPaperSection } from '@/design-system/components/HostSurfaces';
import { InstitutionalText } from '@/design-system/components/InstitutionalText';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { useAgendaCalendarioQuery } from '@/hooks/useAgendaCalendarioQuery';
import type { EventoAgendaUnificado } from '@/services/agendaProveedorService';
import { openCitaPersonalDetalle, openOfertaDetalle } from '@/utils/navigateProveedorDetalle';
import { resumenDia } from '@/utils/hoyDia';

const I = COLORS.institutional;

type Props = {
  enabled?: boolean;
};

function abrirEvento(
  evento: EventoAgendaUnificado,
  queryClient: ReturnType<typeof useQueryClient>,
) {
  if (evento.origen === 'personal') {
    openCitaPersonalDetalle(router, queryClient, Number(evento.id));
    return;
  }
  if (evento.oferta_proveedor_id) {
    openOfertaDetalle(router, queryClient, evento.oferta_proveedor_id);
    return;
  }
  if (evento.orden_id) {
    router.push(`/servicio-detalle/${evento.orden_id}`);
    return;
  }
  router.push('/(tabs)/calendario');
}

function HoyDiaLineaInner({ enabled = true }: Props) {
  const queryClient = useQueryClient();
  const hoy = useMemo(() => new Date(), []);
  const { eventos, loading } = useAgendaCalendarioQuery({
    mesActual: hoy,
    miembroFiltro: null,
    enabled,
  });
  const resumen = useMemo(() => resumenDia(eventos, new Date()), [eventos]);

  const onPress = useCallback(() => {
    if (resumen.siguiente) {
      abrirEvento(resumen.siguiente, queryClient);
      return;
    }
    router.push('/(tabs)/calendario');
  }, [queryClient, resumen.siguiente]);

  return (
    <HostPaperSection style={styles.paper}>
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={loading ? 'Revisando la agenda' : resumen.frase}
      >
        <View style={styles.copy}>
          <InstitutionalText role="caption" color="muted">
            El día
          </InstitutionalText>
          <InstitutionalText role="bodyBold" numberOfLines={2}>
            {loading ? 'Revisando la agenda…' : resumen.frase}
          </InstitutionalText>
        </View>
        <ChevronRight size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
      </TouchableOpacity>
    </HostPaperSection>
  );
}

export const HoyDiaLinea = memo(HoyDiaLineaInner);

const styles = StyleSheet.create({
  paper: {
    paddingVertical: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.sm,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
