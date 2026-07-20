import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CalendarPlus, Sparkles } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  hostIconPlateColor,
  hostIconPlateStyle,
} from '@/app/design-system/styles/institutionalSemantic';

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
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Crear</Text>
        <Text style={styles.sectionSub}>Agendamientos y cotizaciones del día</Text>
      </View>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.card}
          onPress={onAgendar}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="Agendar cita"
        >
          <View style={[hostIconPlateStyle, styles.iconPlateLg]}>
            <CalendarPlus size={22} color={hostIconPlateColor} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
          <Text style={styles.title}>Agendar</Text>
          <Text style={styles.sub} numberOfLines={2}>
            Cita para cliente propio
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
            <View style={[hostIconPlateStyle, styles.iconPlateLg]}>
              <Sparkles size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <Text style={styles.title}>Cotizar con IA</Text>
            <Text style={styles.sub} numberOfLines={2}>
              Por WhatsApp u otro canal
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export const HomeTodayActions = memo(HomeTodayActionsInner);

const styles = StyleSheet.create({
  section: {
    gap: SPACING.sm,
  },
  sectionHeader: {
    gap: 2,
  },
  sectionTitle: {
    fontSize: T.h4.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: '600',
    color: I.ink,
  },
  sectionSub: {
    fontSize: T.caption.fontSize,
    lineHeight: Math.round(T.caption.fontSize * T.caption.lineHeight),
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.muted,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    padding: SPACING.md,
    gap: SPACING.xs,
    minHeight: 132,
    ...SHADOWS.editorial,
  },
  iconPlateLg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: SPACING.xs,
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
