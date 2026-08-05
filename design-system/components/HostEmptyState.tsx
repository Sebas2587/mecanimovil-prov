import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { SPACING } from '@/app/design-system/tokens';
import { HostPaperSection } from './HostSurfaces';
import { InstitutionalButton } from './InstitutionalButton';
import { InstitutionalText } from './InstitutionalText';
import {
  hostIconPlateColor,
  hostIconPlateStyle,
} from '@/app/design-system/styles/institutionalSemantic';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

export type HostEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction?: { label: string; onPress: () => void };
  secondaryAction?: { label: string; onPress: () => void };
  style?: ViewStyle;
};

/** Empty state unificado — plato icono + título h4 + body + CTAs opcionales. */
export function HostEmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  style,
}: HostEmptyStateProps) {
  return (
    <HostPaperSection style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={hostIconPlateStyle}>
          <Icon size={22} color={hostIconPlateColor} strokeWidth={ICON_STROKE_WIDTH} />
        </View>
        <View style={styles.textCol}>
          <InstitutionalText role="h4">{title}</InstitutionalText>
          <InstitutionalText role="caption" color="body" style={styles.desc}>
            {description}
          </InstitutionalText>
        </View>
      </View>
      {primaryAction || secondaryAction ? (
        <View style={styles.actions}>
          {primaryAction ? (
            <InstitutionalButton
              variant="primary"
              size="compact"
              label={primaryAction.label}
              onPress={primaryAction.onPress}
              style={styles.actionBtn}
            />
          ) : null}
          {secondaryAction ? (
            <InstitutionalButton
              variant="outline"
              size="compact"
              label={secondaryAction.label}
              onPress={secondaryAction.onPress}
              style={styles.actionBtn}
            />
          ) : null}
        </View>
      ) : null}
    </HostPaperSection>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'stretch',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.md,
  },
  textCol: {
    flex: 1,
    gap: SPACING.fixed.xs,
  },
  desc: {
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
    marginTop: SPACING.fixed.lg,
  },
  actionBtn: {
    flexGrow: 1,
    minWidth: 120,
  },
});

export default HostEmptyState;
