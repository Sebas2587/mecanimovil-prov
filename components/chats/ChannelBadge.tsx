import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TYPOGRAPHY, SPACING, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { getChannelVisual, type ChannelSlug } from '@/utils/channelVisuals';

type Props = {
  channel: ChannelSlug;
  compact?: boolean;
};

export function ChannelBadge({ channel, compact = false }: Props) {
  const visual = getChannelVisual(channel);
  const Icon = visual.Icon;

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
      <Icon size={compact ? 11 : 12} color={visual.color} strokeWidth={ICON_STROKE_WIDTH} />
      <Text style={[styles.text, compact && styles.textCompact, { color: visual.color }]}>
        {visual.label}
      </Text>
    </View>
  );
}

export { channelRespondLabel } from '@/utils/channelVisuals';

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: BORDERS.radius.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderWidth: 1,
    marginBottom: SPACING.xs,
  },
  badgeCompact: {
    marginBottom: 0,
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    ...TYPOGRAPHY.styles.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  textCompact: {
    fontSize: 10,
  },
});
