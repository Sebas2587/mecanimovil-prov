import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

type Props = {
  label: string;
  score: number | null | undefined;
};

export function KpiProgressRow({ label, score }: Props) {
  const value = score != null ? Math.max(0, Math.min(100, score)) : null;

  return (
    <View style={styles.row}>
      <View style={styles.top}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.value}>{value != null ? value : '—'}</Text>
      </View>
      <View style={styles.track}>
        {value != null ? (
          <View style={[styles.fill, { width: `${value}%` }]} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 10,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.ink,
    marginRight: 8,
  },
  value: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.monoMedium,
    color: I.muted,
  },
  track: {
    height: 6,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.hairlineSoft,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.primary,
  },
});
