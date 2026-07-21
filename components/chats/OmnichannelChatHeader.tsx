import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { ArrowLeft, Sparkles } from 'lucide-react-native';
import { ChannelBadge } from '@/components/chats/ChannelBadge';
import { ChannelAvatar } from '@/components/chats/ChannelAvatar';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { HOST_GUTTER } from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { ChannelSlug } from '@/utils/channelVisuals';
import { withWebLineHeight } from '@/utils/webTypography';

const I = COLORS.institutional;
const TITLE = withWebLineHeight(TYPOGRAPHY.styles.h4);
const ACTION_LABEL = withWebLineHeight(TYPOGRAPHY.styles.captionBold);

type HeaderProps = {
  channel: ChannelSlug;
  displayName: string;
  hasKnownChannel: boolean;
  isMetaPending: boolean;
  paddingTop: number;
  onBack: () => void;
};

function OmnichannelChatHeaderComponent({
  channel,
  displayName,
  hasKnownChannel,
  isMetaPending,
  paddingTop,
  onBack,
}: HeaderProps) {
  const badge = useMemo(() => {
    if (isMetaPending && !hasKnownChannel) {
      return (
        <View style={styles.badgePlaceholder}>
          <ActivityIndicator size="small" color={I.muted} />
        </View>
      );
    }
    if (!hasKnownChannel) return null;
    return <ChannelBadge channel={channel} compact />;
  }, [channel, hasKnownChannel, isMetaPending]);

  return (
    <View style={[styles.header, { paddingTop }]}>
      <TouchableOpacity onPress={onBack} style={styles.sideBtn} accessibilityLabel="Volver">
        <ArrowLeft size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
      </TouchableOpacity>

      <ChannelAvatar channel={hasKnownChannel ? channel : 'app'} size={36} />

      <View style={styles.metaColumn}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
            {displayName}
          </Text>
          <View style={styles.badgeSlot}>{badge}</View>
        </View>
      </View>

      <View style={styles.sideBtn} />
    </View>
  );
}

type ActionBarProps = {
  onPress: () => void;
  cotizacionAceptada?: boolean;
};

function OmnichannelChatActionBarComponent({ onPress, cotizacionAceptada }: ActionBarProps) {
  return (
    <TouchableOpacity
      style={[styles.actionBar, cotizacionAceptada && styles.actionBarAccepted]}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={
        cotizacionAceptada
          ? 'Cotización aceptada, agendar cita'
          : 'Agendar cita y cotizar con IA'
      }
    >
      <Sparkles size={18} color={cotizacionAceptada ? I.onPrimary : I.primary} strokeWidth={ICON_STROKE_WIDTH} />
      <Text
        style={[styles.actionBarText, cotizacionAceptada && styles.actionBarTextOnPrimary]}
        numberOfLines={2}
      >
        {cotizacionAceptada
          ? 'Cotización aceptada — toca para agendar la cita'
          : 'Agendar cita · Cotizar con IA'}
      </Text>
    </TouchableOpacity>
  );
}

export const OmnichannelChatHeader = memo(OmnichannelChatHeaderComponent);
export const OmnichannelChatActionBar = memo(OmnichannelChatActionBarComponent);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HOST_GUTTER,
    paddingBottom: SPACING.md,
    minHeight: Platform.OS === 'web' ? 64 : 56,
    backgroundColor: I.canvas,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    gap: SPACING.sm,
  },
  sideBtn: {
    width: 40,
    height: 40,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaColumn: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    gap: SPACING.sm,
    ...(Platform.OS === 'web'
      ? ({ width: '100%', flexWrap: 'nowrap' } as object)
      : null),
  },
  headerTitle: {
    ...TITLE,
    color: I.ink,
    fontWeight: '600',
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    ...(Platform.OS === 'web'
      ? ({
          display: 'block',
          width: 0,
          flexBasis: 0,
        } as object)
      : null),
  },
  badgeSlot: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePlaceholder: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: HOST_GUTTER,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: 14,
    backgroundColor: I.surfaceStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.primary,
  },
  actionBarAccepted: {
    backgroundColor: I.primary,
    borderColor: I.primary,
  },
  actionBarText: {
    ...ACTION_LABEL,
    flex: 1,
    color: I.ink,
  },
  actionBarTextOnPrimary: {
    color: I.onPrimary,
  },
});
