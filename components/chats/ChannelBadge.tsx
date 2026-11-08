import React, { memo } from 'react';
import { View, Text, StyleSheet, type TextStyle } from 'react-native';
import { TYPOGRAPHY, SPACING, BORDERS } from '@/app/design-system/tokens';
import { getChannelVisual, type ChannelSlug } from '@/utils/channelVisuals';
import { ChannelBrandGlyph } from '@/components/chats/ChannelBrandIcon';
import { withWebLineHeight } from '@/utils/webTypography';

type Props = {
  channel: ChannelSlug;
  compact?: boolean;
};

function ChannelBadgeComponent({ channel, compact = false }: Props) {
  const visual = getChannelVisual(channel);

  return (
    <View
      style={[
        styles.badge,
        compact && styles.badgeCompact,
        {
          backgroundColor: visual.backgroundColor,
          borderColor: visual.borderColor,
        },
      ]}
    >
      <ChannelBrandGlyph channel={channel} size={13} color={visual.color} />
      <Text style={[badgeText, compact && badgeTextCompact, { color: visual.color }]}>
        {visual.label}
      </Text>
    </View>
  );
}

export const ChannelBadge = memo(ChannelBadgeComponent);

export { channelRespondLabel } from '@/utils/channelVisuals';

const caption = TYPOGRAPHY.styles.caption;
const badgeText: TextStyle = withWebLineHeight({
  fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
  fontWeight: '600',
  fontSize: caption.fontSize,
  lineHeight: caption.lineHeight,
  letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  textTransform: 'uppercase',
});
const badgeTextCompact: TextStyle = withWebLineHeight({
  fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
  fontWeight: '600',
  fontSize: caption.fontSize,
  lineHeight: caption.lineHeight,
});

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: BORDERS.radius.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderWidth: BORDERS.width.thin,
    marginBottom: SPACING.xs,
  },
  badgeCompact: {
    marginBottom: 0,
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
