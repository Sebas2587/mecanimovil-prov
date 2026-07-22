import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, ScrollView } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';

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
 * Tabs segmentados institucionales.
 * El label siempre se muestra completo (no se comprime/oculta en mobile);
 * si el ancho no alcanza, la pista scrollea en horizontal.
 */
export function InstitutionalScreenTabs<K extends string>({
  tabs,
  activeKey,
  onChange,
  style,
}: InstitutionalScreenTabsProps<K>) {
  return (
    <View style={[styles.shell, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={styles.track}
      >
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
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={
                showBadge ? `${t.label}, ${String(t.badge)}` : t.label
              }
            >
              {t.leading ? <View style={styles.lead}>{t.leading}</View> : null}
              <Text style={[styles.label, active && styles.labelActive]}>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: COLORS.tab.unselectedBg,
    borderRadius: BORDERS.radius.lg,
    overflow: 'hidden',
  },
  track: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flexGrow: 1,
    padding: SPACING.fixed.xxs + 2,
    gap: SPACING.fixed.xxs + 2,
    minWidth: '100%',
  },
  cell: {
    flexGrow: 1,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.fixed.xs + 2,
    paddingHorizontal: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.md,
    gap: SPACING.fixed.xxs + 2,
  },
  cellActive: {
    backgroundColor: COLORS.tab.selectedBg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.tab.selectedBorder,
  },
  lead: {
    flexShrink: 0,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.muted,
    flexShrink: 0,
  },
  labelActive: {
    fontFamily: FF.sansSemiBold,
    color: COLORS.tab.selectedText,
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
    backgroundColor: COLORS.selection.background,
    borderColor: COLORS.selection.border,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.monoMedium,
    color: I.ink,
  },
  badgeTextActive: {
    color: COLORS.tab.selectedText,
  },
});
