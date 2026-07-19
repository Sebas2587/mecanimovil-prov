import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';

const C = COLORS;

export type AppHeaderProps = {
  title: string;
  leftComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
  showBack?: boolean;
  onBackPress?: () => void;
  backgroundColor?: string;
  badge?: number | string;
  style?: object;
};

/** Header compacto Airbnb Hosts — back + título h5, canvas. */
export function AppHeader({
  title,
  leftComponent,
  rightComponent,
  showBack = false,
  onBackPress,
  backgroundColor,
  badge,
  style,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const bg = backgroundColor ?? C.background.default;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, SPACING.fixed.xs),
          backgroundColor: bg,
          borderBottomColor: C.border.light,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.side}>
          {leftComponent ??
            (showBack ? (
              <TouchableOpacity
                onPress={onBackPress}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Volver"
              >
                <ArrowLeft size={22} color={C.text.primary} strokeWidth={ICON_STROKE_WIDTH} />
              </TouchableOpacity>
            ) : null)}
        </View>

        <View style={styles.center}>
          <InstitutionalText role="h5" numberOfLines={1} style={{ textAlign: 'center' }}>
            {title}
          </InstitutionalText>
          {badge != null && badge !== 0 ? (
            <View style={styles.badge}>
              <InstitutionalText role="small" color="onPrimary">
                {String(badge)}
              </InstitutionalText>
            </View>
          ) : null}
        </View>

        <View style={[styles.side, styles.sideRight]}>{rightComponent}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: BORDERS.width.thin,
    paddingBottom: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  side: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.xs,
  },
  badge: {
    backgroundColor: C.primary[500],
    borderRadius: BORDERS.radius.full,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AppHeader;
