import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Bot, ChevronRight, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
import {
  HostPaperSection,
  HostSectionKicker,
  InstitutionalTag,
  InstitutionalText,
  hostIconPlateStyle,
} from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { AgenteIaActividadTaller } from '@/services/agenteIaService';
import { omnichannelChatHref } from '@/utils/chatRoutes';

const I = COLORS.institutional;

interface IaActivityStripProps {
  actividad?: AgenteIaActividadTaller | null;
  loading?: boolean;
}

export function IaActivityStrip({ actividad, loading = false }: IaActivityStripProps) {
  const sesionesActivas = actividad?.sesiones_activas_count ?? 0;
  const procesando = actividad?.procesando_count ?? 0;
  const esperandoRevision = actividad?.esperando_revision_count ?? 0;
  const eventos = actividad?.eventos_recientes ?? [];

  const handleVerCotizaciones = useCallback(() => {
    router.push('/cotizar-ia');
  }, []);

  const handleOpenChat = useCallback((conversationId: number) => {
    router.push(omnichannelChatHref(conversationId));
  }, []);

  if (loading && !actividad) {
    return (
      <View style={styles.container}>
        <HostSectionKicker label="Agente IA" />
        <HostPaperSection style={styles.loadingBox}>
          <ActivityIndicator size="small" color={I.primary} />
        </HostPaperSection>
      </View>
    );
  }

  const iaInactiva = sesionesActivas === 0 && esperandoRevision === 0;

  return (
    <View style={styles.container}>
      <HostSectionKicker label="Agente IA" />
      <HostPaperSection style={styles.paper}>
        <View style={styles.headerRow}>
          <View style={hostIconPlateStyle}>
            <Bot size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
          <View style={styles.headerCopy}>
            <InstitutionalText role="bodyBold">
              {procesando > 0
                ? `IA respondiendo en ${procesando} conversación${procesando === 1 ? '' : 'es'}`
                : sesionesActivas > 0
                  ? `IA activa en ${sesionesActivas} conversación${sesionesActivas === 1 ? '' : 'es'}`
                  : 'IA en espera de clientes'}
            </InstitutionalText>
            <InstitutionalText role="caption" color="body">
              {esperandoRevision > 0
                ? `${esperandoRevision} borrador${esperandoRevision === 1 ? '' : 'es'} listo${esperandoRevision === 1 ? '' : 's'} para revisar`
                : iaInactiva
                  ? 'Tus canales omnicanal siguen monitoreados'
                  : 'El asistente gestiona captura y seguimiento'}
            </InstitutionalText>
          </View>
          {procesando > 0 ? (
            <InstitutionalTag label="En curso" variant="primary" size="sm" />
          ) : esperandoRevision > 0 ? (
            <InstitutionalTag label="Revisar" variant="warning" size="sm" />
          ) : null}
        </View>

        {eventos.length > 0 ? (
          <View style={styles.eventList}>
            {eventos.slice(0, 3).map((ev) => (
              <TouchableOpacity
                key={ev.conversation_id}
                style={styles.eventRow}
                onPress={() => handleOpenChat(ev.conversation_id)}
                activeOpacity={0.75}
              >
                <Sparkles
                  size={14}
                  color={ev.procesando ? I.primary : I.muted}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
                <View style={styles.eventCopy}>
                  <InstitutionalText role="caption" numberOfLines={1}>
                    {ev.cliente_nombre}
                  </InstitutionalText>
                  <InstitutionalText role="caption" color="body" numberOfLines={1}>
                    {ev.estado_label}
                  </InstitutionalText>
                </View>
                <ChevronRight size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {esperandoRevision > 0 ? (
          <TouchableOpacity style={styles.ctaRow} onPress={handleVerCotizaciones} activeOpacity={0.8}>
            <InstitutionalText role="caption" color="primary">
              Revisar borradores IA
            </InstitutionalText>
            <ChevronRight size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        ) : null}
      </HostPaperSection>
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
    minHeight: 56,
  },
  paper: {
    gap: SPACING.fixed.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  eventList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    paddingTop: SPACING.fixed.sm,
    gap: 4,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    paddingVertical: 4,
  },
  eventCopy: {
    flex: 1,
    minWidth: 0,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.fixed.xs,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceSoft,
  },
});
