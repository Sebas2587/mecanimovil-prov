import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { ArrowLeft, CalendarPlus } from 'lucide-react-native';
import { ChannelBadge } from '@/components/chats/ChannelBadge';
import { ChannelAvatar } from '@/components/chats/ChannelAvatar';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { ChannelSlug } from '@/utils/channelVisuals';
import { withWebLineHeight } from '@/utils/webTypography';

const I = COLORS.institutional;
const GLASS_INSET = SPACING.md;
const TITLE = withWebLineHeight(TYPOGRAPHY.styles.h4);

type Props = {
  channel: ChannelSlug;
  displayName: string;
  hasKnownChannel: boolean;
  isMetaPending: boolean;
  paddingTop: number;
  onBack: () => void;
  onAgendarPress: () => void;
};

function OmnichannelChatHeaderComponent({
  channel,
  displayName,
  hasKnownChannel,
  isMetaPending,
  paddingTop,
  onBack,
  onAgendarPress,
}: Props) {
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

      <TouchableOpacity onPress={onAgendarPress} style={styles.sideBtn} accessibilityLabel="Agendar cita">
        <CalendarPlus size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
      </TouchableOpacity>
    </View>
  );
}

export const OmnichannelChatHeader = memo(OmnichannelChatHeaderComponent);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GLASS_INSET,
    paddingBottom: SPACING.md,
    minHeight: Platform.OS === 'web' ? 64 : 56,
    backgroundColor: I.canvas,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    gap: SPACING.sm,
    ...SHADOWS.editorial,
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
});
