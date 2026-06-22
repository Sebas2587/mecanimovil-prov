import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { withOpacity } from '@/app/design-system/tokens/colors';

export type HomeInlineAlertVariant = 'warning' | 'danger' | 'info';

export type HomeInlineAlertProps = {
  variant?: HomeInlineAlertVariant;
  Icon: LucideIcon;
  title: string;
  message?: string;
  onPress?: () => void;
};

const VARIANT_STYLES: Record<
  HomeInlineAlertVariant,
  { bg: string; border: string; icon: string; title: string }
> = {
  warning: {
    bg: withOpacity(COLORS.institutional.accentYellow, 0.1),
    border: withOpacity(COLORS.institutional.accentYellow, 0.35),
    icon: COLORS.warning.text,
    title: COLORS.warning.text,
  },
  danger: {
    bg: withOpacity(COLORS.institutional.semanticDown, 0.06),
    border: withOpacity(COLORS.institutional.semanticDown, 0.22),
    icon: COLORS.institutional.semanticDown,
    title: COLORS.institutional.semanticDown,
  },
  info: {
    bg: withOpacity(COLORS.institutional.primary, 0.06),
    border: withOpacity(COLORS.institutional.primary, 0.18),
    icon: COLORS.institutional.primary,
    title: COLORS.institutional.ink,
  },
};

function HomeInlineAlertInner({
  variant = 'info',
  Icon,
  title,
  message,
  onPress,
}: HomeInlineAlertProps) {
  const tone = VARIANT_STYLES[variant];
  const content = (
    <>
      <Icon size={15} color={tone.icon} strokeWidth={2} />
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: tone.title }]} numberOfLines={1}>
          {title}
        </Text>
        {message ? (
          <Text style={styles.message} numberOfLines={1}>
            {message}
          </Text>
        ) : null}
      </View>
      {onPress ? <ChevronRight size={14} color={COLORS.institutional.mutedSoft} /> : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.root, { backgroundColor: tone.bg, borderColor: tone.border }]}
        onPress={onPress}
        activeOpacity={0.75}
        accessibilityRole="button"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      {content}
    </View>
  );
}

export const HomeInlineAlert = memo(HomeInlineAlertInner);

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.xs,
    paddingHorizontal: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.md,
    borderWidth: 1,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: TYPOGRAPHY.fontSize.sm * TYPOGRAPHY.lineHeight.tight,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
  },
  message: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    lineHeight: TYPOGRAPHY.fontSize.xs * TYPOGRAPHY.lineHeight.normal,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: COLORS.institutional.body,
  },
});
