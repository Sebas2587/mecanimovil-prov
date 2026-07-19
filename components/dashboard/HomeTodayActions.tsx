import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CalendarPlus, Sparkles } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;
const T = TYPOGRAPHY.styles;

export type HomeTodayActionsProps = {
  onAgendar: () => void;
  onCotizarIa: () => void;
  showCotizarIa?: boolean;
};

/**
 * Acciones primarias del día — cards Airbnb / Klarna (superficie blanca, CTA clara).
 */
function HomeTodayActionsInner({
  onAgendar,
  onCotizarIa,
  showCotizarIa = true,
}: HomeTodayActionsProps) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.card}
        onPress={onAgendar}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel="Agendar cita"
      >
        <View style={styles.iconPlate}>
          <CalendarPlus size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
        </View>
        <Text style={styles.title}>Agendar</Text>
        <Text style={styles.sub} numberOfLines={2}>
          Crear cita personal
        </Text>
      </TouchableOpacity>

      {showCotizarIa ? (
        <TouchableOpacity
          style={styles.card}
          onPress={onCotizarIa}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="Cotizar con IA"
        >
          <View style={[styles.iconPlate, styles.iconPlateAccent]}>
            <Sparkles size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
          <Text style={styles.title}>Cotizar con IA</Text>
          <Text style={styles.sub} numberOfLines={2}>
            Por canal de mensajes
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export const HomeTodayActions = memo(HomeTodayActionsInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  card: {
    flex: 1,
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    padding: SPACING.md,
    gap: SPACING.xs,
    minHeight: 132,
    ...SHADOWS.editorial,
  },
  iconPlate: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: I.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  iconPlateAccent: {
    backgroundColor: I.surfaceStrong,
  },
  title: {
    fontSize: T.h4.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: '600',
    color: I.ink,
  },
  sub: {
    fontSize: T.caption.fontSize,
    lineHeight: Math.round(T.caption.fontSize * T.caption.lineHeight),
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.muted,
  },
});
