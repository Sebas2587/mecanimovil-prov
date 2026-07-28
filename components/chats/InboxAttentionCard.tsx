import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';
import {
  Card,
  InstitutionalTag,
  InstitutionalText,
  hostIconPlateStyle,
  HOST_GUTTER,
} from '@/app/design-system/components';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;

export type InboxAttentionCardProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  count?: number;
  tagLabel?: string;
  tagVariant?: 'neutral' | 'primary' | 'warning' | 'success' | 'error' | 'info';
  onPress: () => void;
  accessibilityLabel: string;
};

/**
 * Fila de atención Host (paper + icon plate + tag).
 * Atajo contextual en Mensajes — no banner amarillo full-bleed.
 */
function InboxAttentionCardInner({
  icon: Icon,
  title,
  subtitle,
  count,
  tagLabel,
  tagVariant = 'warning',
  onPress,
  accessibilityLabel,
}: InboxAttentionCardProps) {
  const label =
    tagLabel
    || (count != null && count > 0 ? String(count) : undefined);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.pressWrap, pressed && styles.pressed]}
    >
      <Card elevated padding="host">
        <View style={styles.row}>
          <View style={hostIconPlateStyle}>
            <Icon size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
          <View style={styles.copy}>
            <InstitutionalText role="bodyBold" numberOfLines={1}>
              {title}
            </InstitutionalText>
            {subtitle ? (
              <InstitutionalText role="caption" color="muted" numberOfLines={2}>
                {subtitle}
              </InstitutionalText>
            ) : null}
          </View>
          {label ? (
            <InstitutionalTag label={label} variant={tagVariant} size="sm" />
          ) : null}
          <ChevronRight size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
        </View>
      </Card>
    </Pressable>
  );
}

export const InboxAttentionCard = memo(InboxAttentionCardInner);

const styles = StyleSheet.create({
  pressWrap: {
    marginHorizontal: HOST_GUTTER,
    marginBottom: SPACING.xs,
  },
  pressed: {
    opacity: 0.96,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
