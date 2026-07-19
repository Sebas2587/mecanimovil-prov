/**
 * Header Component - MecaniMóvil Proveedores
 * Componente de header consistente usando el sistema de diseño institucional
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  COLORS,
  SPACING,
  BORDERS,
  SHADOWS,
  pointerEventsNone,
} from '@/app/design-system/tokens';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';

const I = COLORS.institutional;

interface HeaderProps {
  title: string;
  leftComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
  showBack?: boolean;
  onBackPress?: () => void;
  backgroundColor?: string;
  titleColor?: string;
  badge?: number | string;
  style?: object;
}

export default function Header({
  title,
  leftComponent,
  rightComponent,
  showBack = false,
  onBackPress,
  backgroundColor,
  titleColor,
  badge,
  style,
}: HeaderProps) {
  const insets = useSafeAreaInsets();

  const bgColor = backgroundColor ?? COLORS.background.default;
  const textColor = titleColor ?? I.ink;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, SPACING.fixed.xs),
          backgroundColor: bgColor,
          borderBottomColor: COLORS.border.light,
          borderBottomWidth: BORDERS.width.thin,
        },
        style,
      ]}
    >
      <View style={[styles.content, { paddingHorizontal: SPACING.container.horizontal }]}>
        <View style={[styles.titleAbsoluteLayer, pointerEventsNone]}>
          <InstitutionalText
            role="h3"
            color={textColor}
            style={styles.title}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </InstitutionalText>
        </View>

        <View style={styles.headerRow}>
          <View style={styles.leftContainer}>
            {leftComponent ||
              (showBack ? (
                <TouchableOpacity
                  onPress={onBackPress}
                  style={[styles.iconButton, Platform.OS === 'web' && styles.iconButtonWeb]}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Volver"
                >
                  <ArrowLeft size={24} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                </TouchableOpacity>
              ) : null)}
          </View>

          <View style={styles.headerRowSpacer} />

          <View style={styles.rightContainer}>
            {rightComponent}
            {badge !== undefined && badge !== null && badge !== 0 ? (
              <View style={styles.badgeContainer}>
                <InstitutionalText role="small" color="onPrimary" style={styles.badgeText}>
                  {typeof badge === 'number' && badge > 99 ? '99+' : String(badge)}
                </InstitutionalText>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  content: {
    position: 'relative',
    height: 56,
    justifyContent: 'center',
  },
  titleAbsoluteLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.fixed.md + 40,
    zIndex: 0,
  },
  headerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  leftContainer: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonWeb: {
    cursor: 'pointer',
    zIndex: 2,
  } as object,
  headerRowSpacer: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    textAlign: 'center',
    maxWidth: '72%',
  },
  rightContainer: {
    minWidth: 40,
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: BORDERS.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: I.canvas,
    backgroundColor: I.semanticDown,
    zIndex: 10,
  },
  badgeText: {
    fontWeight: '700',
  },
});
