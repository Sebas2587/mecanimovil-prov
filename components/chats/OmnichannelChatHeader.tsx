import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, Bot } from 'lucide-react-native';
import { ChannelBadge } from '@/components/chats/ChannelBadge';
import { HostAvatar, InstitutionalButton, HOST_GUTTER } from '@/app/design-system/components';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { ChannelSlug } from '@/utils/channelVisuals';
import { useAgenteSesionQuery } from '@/hooks/useAgenteIaQueries';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

type HeaderProps = {
  channel: ChannelSlug;
  displayName: string;
  hasKnownChannel: boolean;
  isMetaPending: boolean;
  paddingTop: number;
  onBack: () => void;
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
}: HeaderProps) {
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
            <ChannelBadge channel={channel} compact />
          ) : null}
        </View>
      </View>
    </View>
  );
}

type ActionBarProps = {
  onPress: () => void;
  onPressAgenteIa?: () => void;
  conversationId?: string | number | null;
  cotizacionAceptada?: boolean;
};

function OmnichannelChatActionBarComponent({
  onPress,
  onPressAgenteIa,
  conversationId,
  cotizacionAceptada,
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
      <InstitutionalButton
        label={cotizacionAceptada ? 'Agendar cita' : 'Agendar o cotizar'}
        variant="primary"
        size="compact"
        onPress={onPress}
        accessibilityLabel={
          cotizacionAceptada
            ? 'Cotización aceptada, agendar cita'
            : 'Agendar cita y cotizar con IA'
        }
        style={styles.footerPrimary}
      />
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
  footerPrimary: {
    flex: 1,
  },
});
