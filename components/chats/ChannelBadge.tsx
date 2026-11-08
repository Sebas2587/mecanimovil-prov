import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
      <Text style={[styles.text, compact && styles.textCompact, { color: visual.color }]}>
        {visual.label}
      </Text>
    </View>
  );
}

export const ChannelBadge = memo(ChannelBadgeComponent);

export { channelRespondLabel } from '@/utils/channelVisuals';

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
  text: withWebLineHeight({
    ...TYPOGRAPHY.styles.caption,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: '600' as const,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    textTransform: 'uppercase' as const,
  }),
  textCompact: withWebLineHeight({
    ...TYPOGRAPHY.styles.caption,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: '600',
  }),
});
