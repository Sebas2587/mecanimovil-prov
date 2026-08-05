import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, type LucideIcon } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { withOpacity } from '@/app/design-system/tokens/colors';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;

export type HomeDismissibleOpsAlertProps = {
  visible: boolean;
  variant?: 'warning' | 'danger' | 'info';
  Icon: LucideIcon;
  title: string;
  message?: string;
  onPress?: () => void;
  onDismiss: () => void;
  /** Offset extra bajo el header (si hay varias). */
  offsetTop?: number;
};

const TONES = {
  warning: {
    bg: '#FFFFFF',
    border: withOpacity(COLORS.institutional.accentYellow, 0.45),
    icon: COLORS.warning.text,
    title: COLORS.warning.text,
  },
  danger: {
    bg: '#FFFFFF',
    border: withOpacity(COLORS.institutional.semanticDown, 0.3),
    icon: COLORS.institutional.semanticDown,
    title: COLORS.institutional.semanticDown,
  },
  info: {
    bg: '#FFFFFF',
    border: withOpacity(COLORS.institutional.primary, 0.25),
    icon: COLORS.institutional.primary,
    title: COLORS.institutional.ink,
  },
};

function HomeDismissibleOpsAlertInner({
  visible,
  variant = 'warning',
  Icon,
  title,
  message,
  onPress,
  onDismiss,
  offsetTop = 0,
}: HomeDismissibleOpsAlertProps) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  const tone = TONES[variant];

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { top: insets.top + (Platform.OS === 'web' ? 72 : 64) + offsetTop },
      ]}
    >
      <View style={[styles.card, { borderColor: tone.border, backgroundColor: tone.bg }]}>
        <TouchableOpacity
          style={styles.body}
          onPress={onPress}
          disabled={!onPress}
          activeOpacity={onPress ? 0.85 : 1}
        >
          <Icon size={16} color={tone.icon} strokeWidth={ICON_STROKE_WIDTH} />
          <View style={styles.copy}>
            <Text style={[styles.title, { color: tone.title }]} numberOfLines={1}>
              {title}
            </Text>
            {message ? (
              <Text style={styles.message} numberOfLines={2}>
                {message}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={10}
          style={styles.close}
          accessibilityLabel="Cerrar alerta"
        >
          <X size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export const HomeDismissibleOpsAlert = memo(HomeDismissibleOpsAlertInner);

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 60,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    paddingVertical: SPACING.sm,
    paddingLeft: SPACING.sm,
    paddingRight: SPACING.xs,
    ...SHADOWS.editorial,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    minWidth: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: '600',
  },
  message: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.body,
    lineHeight: 16,
  },
  close: {
    padding: SPACING.xs,
  },
});

export default HomeDismissibleOpsAlert;
