import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, Bot } from 'lucide-react-native';
import { ChannelBadge } from '@/components/chats/ChannelBadge';
import { HostAvatar, InstitutionalButton, HOST_GUTTER } from '@/app/design-system/components';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { ChannelSlug } from '@/utils/channelVisuals';
import { useAgenteSesionQuery } from '@/hooks/useAgenteIaQueries';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function etiquetaAgenda(fecha: string, hora?: string | null): string {
  const partes = fecha.split('-');
  const dia = Number(partes[2]);
  const mes = MESES[Number(partes[1]) - 1] || '';
  const cuando = Number.isFinite(dia) && mes ? `${dia} ${mes}` : fecha;
  return hora ? `Agendado ${cuando} · ${hora}` : `Agendado ${cuando}`;
}

type HeaderProps = {
  channel: ChannelSlug;
  displayName: string;
  hasKnownChannel: boolean;
  isMetaPending: boolean;
  paddingTop: number;
  onBack: () => void;
  contactoRol?: string;
  agendaLabel?: string | null;
};

/**
 * Header chat: back · avatar · nombre + canal (bloque de identidad cohesivo).
 */
function OmnichannelChatHeaderComponent({
  channel,
  displayName,
  hasKnownChannel,
  isMetaPending,
  paddingTop,
  onBack,
  contactoRol = '',
  agendaLabel = '',
}: HeaderProps) {
  const rolLabel = contactoRol === 'casa_repuestos'
    ? 'Casa de repuestos'
    : contactoRol === 'cliente_nuevo'
      ? 'Cliente nuevo'
      : contactoRol === 'cliente_recurrente'
        ? 'Cliente recurrente'
        : contactoRol === 'solo_consulta'
          ? 'Solo consulta'
          : contactoRol === 'otro'
            ? 'Otro'
            : '';
  return (
    <View style={[styles.header, { paddingTop }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} accessibilityLabel="Volver" hitSlop={8}>
        <ArrowLeft size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
      </TouchableOpacity>

      <View style={styles.identity}>
        <HostAvatar name={displayName} size={40} />
        <View style={styles.textCol}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          {isMetaPending && !hasKnownChannel ? (
            <ActivityIndicator size="small" color={I.muted} />
          ) : hasKnownChannel ? (
            <View style={styles.badgeRow}>
              <ChannelBadge channel={channel} compact />
              {rolLabel ? (
                <InstitutionalTag
                  label={rolLabel}
                  variant={contactoRol === 'casa_repuestos' ? 'primary' : 'neutral'}
                  size="sm"
                />
              ) : null}
              {agendaLabel ? (
                <InstitutionalTag label={agendaLabel} variant="success" size="sm" />
              ) : null}
            </View>
          ) : agendaLabel ? (
            <InstitutionalTag label={agendaLabel} variant="success" size="sm" />
          ) : null}
        </View>
      </View>
    </View>
  );
}

type ActionBarProps = {
  onPressCotizar: () => void;
  onPressAgendar: () => void;
  onPressAgenteIa?: () => void;
  conversationId?: string | number | null;
  cotizacionAceptada?: boolean;
  citaAgendada?: boolean;
};

function OmnichannelChatActionBarComponent({
  onPressCotizar,
  onPressAgendar,
  onPressAgenteIa,
  conversationId,
  cotizacionAceptada,
  citaAgendada = false,
}: ActionBarProps) {
  const { data: sesion } = useAgenteSesionQuery(
    conversationId,
    Boolean(onPressAgenteIa && conversationId),
  );
  const habilitado = Boolean(sesion?.habilitado_en_chat);
  const pausado = habilitado && Boolean(sesion?.pausado_por_taller);
  const agenteLabel = !habilitado ? 'Agente IA' : pausado ? 'IA pausada' : 'IA activa';

  return (
    <View style={styles.footerActions}>
      {onPressAgenteIa ? (
        <InstitutionalButton
          label={agenteLabel}
          variant="outline"
          size="compact"
          leading={
            <Bot
              size={16}
              color={habilitado ? I.primary : I.ink}
              strokeWidth={ICON_STROKE_WIDTH}
            />
          }
          onPress={onPressAgenteIa}
          accessibilityLabel="Activar o configurar agente IA en este chat"
          style={styles.footerSecondary}
        />
      ) : null}
      {citaAgendada ? (
        <>
          <InstitutionalButton
            label="Cotizar"
            variant="outline"
            size="compact"
            onPress={onPressCotizar}
            accessibilityLabel="Cotizar un trabajo adicional"
            style={styles.footerSecondaryAction}
          />
          <InstitutionalButton
            label="Ver cita"
            variant="primary"
            size="compact"
            onPress={onPressAgendar}
            accessibilityLabel="Ver la cita ya agendada"
            style={styles.footerPrimary}
          />
        </>
      ) : cotizacionAceptada ? (
        <InstitutionalButton
          label="Agendar cita"
          variant="primary"
          size="compact"
          onPress={onPressAgendar}
          accessibilityLabel="Cotización aceptada, agendar cita"
          style={styles.footerPrimary}
        />
      ) : (
        <>
          <InstitutionalButton
            label="Cotizar"
            variant="outline"
            size="compact"
            onPress={onPressCotizar}
            accessibilityLabel="Cotizar servicio al cliente"
            style={styles.footerSecondaryAction}
          />
          <InstitutionalButton
            label="Agendar"
            variant="primary"
            size="compact"
            onPress={onPressAgendar}
            accessibilityLabel="Agendar cita con el cliente"
            style={styles.footerPrimary}
          />
        </>
      )}
    </View>
  );
}

export const OmnichannelChatHeader = memo(OmnichannelChatHeaderComponent);
export const OmnichannelChatActionBar = memo(OmnichannelChatActionBarComponent);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    backgroundColor: I.canvas,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    paddingBottom: SPACING.fixed.sm,
    paddingHorizontal: HOST_GUTTER,
    minHeight: 56,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  name: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  footerActions: {
    marginTop: SPACING.fixed.sm,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.fixed.sm,
  },
  footerSecondary: {
    flexShrink: 0,
  },
  footerSecondaryAction: {
    flex: 1,
    minWidth: 0,
  },
  footerPrimary: {
    flex: 1,
    minWidth: 0,
  },
});
