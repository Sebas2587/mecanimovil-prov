import React, { useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Clock, Calendar, ChevronRight } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import {
  HostPaperSection,
  InstitutionalSectionHeader,
  InstitutionalText,
  InstitutionalTag,
  hostIconPlateStyle,
} from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { useAgendaCalendarioQuery } from '@/hooks/useAgendaCalendarioQuery';
import { openCitaPersonalDetalle, openOfertaDetalle } from '@/utils/navigateProveedorDetalle';
import { isSameDay, parseFechaLocal } from '@/utils/fechaLocal';
import type { EventoAgendaUnificado } from '@/services/agendaProveedorService';

const I = COLORS.institutional;

interface CitasHoySectionProps {
  onVerCalendario?: () => void;
}

export function CitasHoySection({ onVerCalendario }: CitasHoySectionProps) {
  const queryClient = useQueryClient();
  const hoy = useMemo(() => new Date(), []);
  const { eventos = [], loading } = useAgendaCalendarioQuery({
    mesActual: hoy,
    miembroFiltro: null,
    enabled: true,
  });

  const eventosHoy = useMemo(() => {
    return (eventos || [])
      .filter((ev: EventoAgendaUnificado) => {
        const f = parseFechaLocal(ev.fecha_servicio);
        return f ? isSameDay(f, hoy) : false;
      })
      .sort((a: EventoAgendaUnificado, b: EventoAgendaUnificado) => {
        const ha = a.hora_servicio || '00:00';
        const hb = b.hora_servicio || '00:00';
        return ha.localeCompare(hb);
      });
  }, [eventos, hoy]);

  const handlePressItem = useCallback(
    (item: EventoAgendaUnificado) => {
      if (item.origen === 'personal') {
        openCitaPersonalDetalle(router, queryClient, Number(item.id));
      } else if (item.oferta_proveedor_id) {
        openOfertaDetalle(router, queryClient, item.oferta_proveedor_id);
      } else if (item.orden_id) {
        router.push(`/servicio-detalle/${item.orden_id}`);
      }
    },
    [queryClient]
  );

  return (
    <View style={styles.container}>
      <InstitutionalSectionHeader
        title="Entradas Taller Hoy"
        actionLabel="Ver Calendario Completo"
        onActionPress={onVerCalendario}
      />

      {loading ? (
        <HostPaperSection style={styles.loadingBox}>
          <ActivityIndicator color={I.primary} size="small" />
          <InstitutionalText role="caption" color="body" style={styles.loadingText}>
            Cargando agenda de hoy...
          </InstitutionalText>
        </HostPaperSection>
      ) : eventosHoy.length === 0 ? (
        <HostPaperSection style={styles.emptyBox}>
          <View style={styles.emptyHeader}>
            <View style={hostIconPlateStyle}>
              <Calendar size={20} color={I.body} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <View style={{ flex: 1 }}>
              <InstitutionalText role="bodyBold">Sin Citas Programadas para Hoy</InstitutionalText>
              <InstitutionalText role="caption" color="body" style={styles.emptySub}>
                No hay vehículos agendados para ingresar al taller hoy. Las cotizaciones aprobadas por tus clientes aparecerán aquí automáticamente.
              </InstitutionalText>
            </View>
          </View>
        </HostPaperSection>
      ) : (
        <HostPaperSection style={styles.paperGroup}>
          {eventosHoy.map((item: EventoAgendaUnificado, idx: number) => {
            const esUltimo = idx === eventosHoy.length - 1;
            const horaLabel = item.hora_servicio ? item.hora_servicio.substring(0, 5) : 'Por confirmar';
            const titulo = item.cliente_nombre || 'Cliente';
            const vehiculoStr = [item.vehiculo_marca, item.vehiculo_modelo].filter(Boolean).join(' ');
            const subtitulo = vehiculoStr ? `${vehiculoStr} • ${item.servicio_nombre || 'Servicio'}` : (item.servicio_nombre || 'Servicio Mecánico');

            return (
              <TouchableOpacity
                key={item.id || idx}
                style={[styles.itemRow, !esUltimo && styles.hairlineDivider]}
                onPress={() => handlePressItem(item)}
                activeOpacity={0.7}
              >
                <InstitutionalTag
                  label={horaLabel}
                  variant="primary"
                  size="sm"
                  leading={
                    <Clock size={12} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                  }
                />

                <View style={styles.contentWrap}>
                  <InstitutionalText role="bodyBold" numberOfLines={1}>
                    {titulo}
                  </InstitutionalText>
                  <InstitutionalText role="caption" color="body" numberOfLines={1} style={styles.itemSub}>
                    {subtitulo}
                  </InstitutionalText>
                </View>

                <ChevronRight size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              </TouchableOpacity>
            );
          })}
        </HostPaperSection>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.fixed.lg,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.fixed.xs,
  },
  emptyBox: {},
  emptyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.md,
  },
  emptySub: {
    marginTop: 2,
  },
  paperGroup: {
    paddingVertical: SPACING.fixed.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.fixed.md,
    gap: SPACING.fixed.sm,
  },
  hairlineDivider: {
    borderBottomWidth: 1,
    borderBottomColor: I.hairline,
  },
  contentWrap: {
    flex: 1,
  },
  itemSub: {
    marginTop: 2,
  },
});
