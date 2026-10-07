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
    backgroundColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexGrow: 1,
    gap: 28,
    minWidth: '100%',
    paddingHorizontal: SPACING.fixed.sm,
  },
  cell: {
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING.fixed.sm,
    paddingBottom: 12,
    paddingHorizontal: SPACING.fixed.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -StyleSheet.hairlineWidth,
    gap: 6,
  },
  cellActive: {
    backgroundColor: 'transparent',
    borderBottomColor: I.ink,
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
    color: I.ink,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: BORDERS.radius.pill,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.surfaceSoft,
    flexShrink: 0,
  },
  badgeActive: {
    backgroundColor: I.primary,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  badgeTextActive: {
    color: I.onPrimary,
  },
});
