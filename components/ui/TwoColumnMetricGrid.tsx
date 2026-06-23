import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY } from '@/app/design-system/tokens';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

export type MetricItem = { label: string; value: string };

type Props = {
  rows: [MetricItem, MetricItem][];
};

export function TwoColumnMetricGrid({ rows }: Props) {
  return (
    <View>
      {rows.map((pair, idx) => (
        <View
          key={idx}
          style={[styles.metricGridRow, idx < rows.length - 1 && styles.metricGridRowBorder]}
        >
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel} numberOfLines={2}>
              {pair[0].label}
            </Text>
            <Text style={styles.metricValue}>{pair[0].value}</Text>
          </View>
          <View style={styles.metricColSep} />
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel} numberOfLines={2}>
              {pair[1].label}
            </Text>
            <Text style={styles.metricValue}>{pair[1].value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  metricGridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 10,
  },
  metricGridRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  metricCell: {
    flex: 1,
    paddingHorizontal: 4,
  },
  metricColSep: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: I.hairline,
    marginVertical: 2,
  },
  metricLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.muted,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.monoMedium,
    color: I.ink,
  },
});
