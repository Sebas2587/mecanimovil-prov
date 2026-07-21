import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, TYPOGRAPHY } from '@/app/design-system/tokens';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

type Props = {
  score: number | null | undefined;
  size?: number;
  label?: string;
};

function scoreColor(score: number): string {
  if (score >= 70) return I.semanticUp;
  if (score >= 40) return I.accentYellow;
  return I.semanticDown;
}

export function ScoreCircle({ score, size = 96, label = 'Score' }: Props) {
  const value = score != null ? Math.max(0, Math.min(100, score)) : null;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = value != null ? circumference - (value / 100) * circumference : circumference;
  const color = value != null ? scoreColor(value) : I.muted;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={I.hairlineSoft}
          strokeWidth={stroke}
          fill="none"
        />
        {value != null ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        ) : null}
      </Svg>
      <View style={styles.center}>
        <Text style={styles.value}>{value != null ? value : '—'}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontFamily: FF.monoMedium,
    color: I.ink,
    lineHeight: 28,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.muted,
    letterSpacing: TYPOGRAPHY.letterSpacing.normal,
  },
});
