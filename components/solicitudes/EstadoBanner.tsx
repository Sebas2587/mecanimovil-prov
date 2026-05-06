import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, withOpacity } from '@/app/design-system/tokens';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

export type BannerType = 'success' | 'warning' | 'info' | 'error';

interface EstadoBannerProps {
  type: BannerType;
  title: string;
  message: string;
  icon?: string;
  action?: {
    text: string;
    onPress: () => void;
  };
}

export const EstadoBanner: React.FC<EstadoBannerProps> = ({
  type,
  title,
  message,
  icon,
  action,
}) => {
  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: withOpacity(I.semanticUp, 0.1),
          iconColor: I.semanticUp,
          textColor: I.semanticUp,
          defaultIcon: 'check-circle',
        };
      case 'warning':
        return {
          backgroundColor: withOpacity(I.accentYellow, 0.18),
          iconColor: I.body,
          textColor: I.body,
          defaultIcon: 'warning',
        };
      case 'error':
        return {
          backgroundColor: withOpacity(I.semanticDown, 0.08),
          iconColor: I.semanticDown,
          textColor: I.semanticDown,
          defaultIcon: 'error',
        };
      case 'info':
      default:
        return {
          backgroundColor: withOpacity(I.primary, 0.08),
          iconColor: I.primary,
          textColor: I.primaryActive,
          defaultIcon: 'info',
        };
    }
  };

  const config = getTypeConfig();
  const displayIcon = icon || config.defaultIcon;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
        },
      ]}
    >
      <InstitutionalIcon name={displayIcon} size={ICON_SIZE.lg} color={config.iconColor} strokeWidth={ICON_STROKE_WIDTH} />
      <View style={styles.content}>
        <Text style={[styles.title, { color: config.textColor }]}>{title}</Text>
        <Text style={[styles.message, { color: I.body }]}>{message}</Text>
        {action && (
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: config.textColor }]}
            onPress={action.onPress}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, { color: config.textColor }]}>{action.text}</Text>
            <ArrowRight size={ICON_SIZE.sm} color={config.textColor} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: SPACING.fixed.md,
    borderRadius: BORDERS.radius.lg,
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    marginBottom: SPACING.fixed.xxs,
  },
  message: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.sm * TYPOGRAPHY.lineHeight.normal),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    marginTop: SPACING.fixed.sm,
    gap: SPACING.fixed.xxs,
  },
  actionText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
  },
});
