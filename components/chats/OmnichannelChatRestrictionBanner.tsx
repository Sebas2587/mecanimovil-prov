import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';

const I = COLORS.institutional;

type Props = {
  message: string;
  actionLabel?: string;
  onActionPress?: () => void;
  variant?: 'strip' | 'card';
};

function OmnichannelChatRestrictionBannerComponent({
  message,
  actionLabel,
  onActionPress,
  variant = 'strip',
}: Props) {
  if (variant === 'card') {
    return (
      <View style={styles.card}>
        <Text style={styles.cardMessage} numberOfLines={2}>
          {message}
        </Text>
        {actionLabel && onActionPress ? (
          <TouchableOpacity onPress={onActionPress} accessibilityRole="button">
            <Text style={styles.cardAction}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.strip}>
      <Text style={styles.stripMessage} numberOfLines={1}>
        {message}
      </Text>
      {actionLabel && onActionPress ? (
        <>
          <Text style={styles.stripDot}>·</Text>
          <TouchableOpacity
            onPress={onActionPress}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Text style={styles.stripAction}>{actionLabel}</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}

export const OmnichannelChatRestrictionBanner = memo(OmnichannelChatRestrictionBannerComponent);

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    backgroundColor: I.canvas,
    gap: 4,
  },
  stripMessage: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontWeight: TYPOGRAPHY.fontWeight.regular as '400',
    lineHeight: 14,
    color: I.mutedSoft,
  },
  stripDot: {
    fontSize: 11,
    lineHeight: 14,
    color: I.mutedSoft,
  },
  stripAction: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    lineHeight: 14,
    color: I.primary,
  },
  card: {
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm + 2,
    borderRadius: 8,
    backgroundColor: I.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    gap: 2,
  },
  cardMessage: {
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.muted,
  },
  cardAction: {
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    color: I.primary,
  },
});
