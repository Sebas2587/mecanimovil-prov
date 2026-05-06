import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, withOpacity } from '@/app/design-system/tokens';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

export type InstitutionalScreenTabDef<K extends string = string> = {
  key: K;
  label: string;
  leading?: React.ReactNode;
  /** Si es 0 o null/undefined, no se muestra badge */
  badge?: number | string | null;
};

export type InstitutionalScreenTabsProps<K extends string> = {
  tabs: readonly InstitutionalScreenTabDef<K>[] | InstitutionalScreenTabDef<K>[];
  activeKey: K;
  onChange: (key: K) => void;
  style?: ViewStyle;
};

/**
 * Tabs segmentados institucionales (pista surfaceStrong, ítem activo primario).
 * Usar en pantallas con secciones por pestaña (órdenes, perfil, especialidades, etc.).
 */
export function InstitutionalScreenTabs<K extends string>({
  tabs,
  activeKey,
  onChange,
  style,
}: InstitutionalScreenTabsProps<K>) {
  return (
    <View style={[styles.track, style]}>
      {tabs.map((t) => {
        const active = t.key === activeKey;
        const showBadge =
          t.badge != null &&
          t.badge !== '' &&
          !(typeof t.badge === 'number' && t.badge <= 0);

        return (
          <TouchableOpacity
            key={String(t.key)}
            style={[styles.cell, active && styles.cellActive]}
            onPress={() => onChange(t.key)}
            activeOpacity={0.88}
          >
            {t.leading ? <View style={styles.lead}>{t.leading}</View> : null}
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {t.label}
            </Text>
            {showBadge ? (
              <View style={[styles.badge, active && styles.badgeActive]}>
                <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
                  {typeof t.badge === 'number' && t.badge > 99 ? '99+' : String(t.badge)}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: I.surfaceStrong,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.fixed.xxs + 2,
    gap: SPACING.fixed.xxs + 2,
  },
  cell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    paddingVertical: SPACING.fixed.xs + 2,
    paddingHorizontal: SPACING.fixed.xxs,
    borderRadius: BORDERS.radius.md,
    gap: SPACING.fixed.xxs,
  },
  cellActive: {
    backgroundColor: I.primary,
  },
  lead: {
    flexShrink: 0,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.muted,
    flexShrink: 1,
  },
  labelActive: {
    fontFamily: FF.sansSemiBold,
    color: I.onPrimary,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: BORDERS.radius.pill,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.canvas,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    flexShrink: 0,
  },
  badgeActive: {
    backgroundColor: withOpacity(I.onPrimary, 0.22),
    borderColor: 'transparent',
  },
  badgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.monoMedium,
    color: I.ink,
  },
  badgeTextActive: {
    color: I.onPrimary,
  },
});
