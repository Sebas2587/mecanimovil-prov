import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { SPACING, BORDERS } from '@/app/design-system/tokens';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import {
  institutionalStatusColors,
  type InstitutionalStatusTone,
} from '@/app/design-system/styles/institutionalSemantic';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';

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

const bannerToneMap: Record<BannerType, InstitutionalStatusTone> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
};

const defaultIcons: Record<BannerType, string> = {
  success: 'check-circle',
  warning: 'warning',
  error: 'error',
  info: 'info',
};

export const EstadoBanner: React.FC<EstadoBannerProps> = ({
  type,
  title,
  message,
  icon,
  action,
}) => {
  const status = institutionalStatusColors(bannerToneMap[type]);
  const displayIcon = icon || defaultIcons[type];
  const titleColor = type === 'warning' ? 'body' : status.text;

  return (
    <View style={[styles.container, { backgroundColor: status.bg, borderColor: status.border }]}>
      <InstitutionalIcon
        name={displayIcon}
        size={ICON_SIZE.lg}
        color={status.icon}
        strokeWidth={ICON_STROKE_WIDTH}
      />
      <View style={styles.content}>
        <InstitutionalText role="bodyBold" color={titleColor}>
          {title}
        </InstitutionalText>
        <InstitutionalText role="caption" color="body" style={styles.message}>
          {message}
        </InstitutionalText>
        {action ? (
          <Pressable
            style={[styles.actionButton, { borderColor: status.text }]}
            onPress={action.onPress}
            accessibilityRole="button"
          >
            <InstitutionalText role="captionBold" color={status.text}>
              {action.text}
            </InstitutionalText>
            <ArrowRight size={ICON_SIZE.sm} color={status.text} strokeWidth={ICON_STROKE_WIDTH} />
          </Pressable>
        ) : null}
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
  },
  content: {
    flex: 1,
  },
  message: {
    marginTop: SPACING.fixed.xxs,
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
});
