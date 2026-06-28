import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS } from '@/app/design-system/tokens';

const I = COLORS.institutional;

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  messenger: 'Messenger',
  instagram: 'Instagram',
  app: 'App',
};

type Props = {
  channel: string;
  compact?: boolean;
};

export function ChannelBadge({ channel, compact = false }: Props) {
  const slug = (channel || 'app').toLowerCase();
  const label = CHANNEL_LABELS[slug] || slug;

  return (
    <View style={[styles.badge, compact && styles.badgeCompact]}>
      <Text style={[styles.text, compact && styles.textCompact]}>{label}</Text>
    </View>
  );
}

export function channelRespondLabel(channel: string): string {
  const slug = (channel || 'app').toLowerCase();
  return CHANNEL_LABELS[slug] || 'Canal';
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: I.hairline,
    marginBottom: SPACING.xs,
  },
  badgeCompact: {
    marginBottom: 0,
    marginRight: SPACING.xs,
  },
  text: {
    ...TYPOGRAPHY.styles.caption,
    color: I.primary,
    fontWeight: '600',
  },
  textCompact: {
    fontSize: 10,
  },
});
