import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CalendarPlus, Sparkles } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { Card, HostSectionKicker } from '@/app/design-system/components';
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
 * Acciones primarias del día — Host paper cards + kicker.
 */
function HomeTodayActionsInner({
  onAgendar,
  onCotizarIa,
  showCotizarIa = true,
}: HomeTodayActionsProps) {
  return (
    <View style={styles.section}>
      <HostSectionKicker label="Crear" />
      <Text style={styles.sectionSub}>Agendamientos y cotizaciones del día</Text>
      <View style={styles.row}>
        <Card
          elevated
          padding="host"
          style={styles.card}
          onPress={onAgendar}
        >
          <View style={[hostIconPlateStyle, styles.iconPlateLg]}>
            <CalendarPlus size={22} color={hostIconPlateColor} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
          <Text style={styles.title}>Nueva solicitud</Text>
          <Text style={styles.sub} numberOfLines={2}>
            Cliente propio del taller, no marketplace
          </Text>
        </Card>

        {showCotizarIa ? (
          <Card
            elevated
            padding="host"
            style={styles.card}
            onPress={onCotizarIa}
          >
            <View style={[hostIconPlateStyle, styles.iconPlateLg]}>
              <Sparkles size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <Text style={styles.title}>Cotizar con IA</Text>
            <Text style={styles.sub} numberOfLines={2}>
              Por WhatsApp u otro canal
            </Text>
          </Card>
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
  sectionSub: {
    fontSize: T.caption.fontSize,
    lineHeight: Math.round(T.caption.fontSize * T.caption.lineHeight),
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.muted,
    marginTop: -SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  card: {
    flex: 1,
    gap: SPACING.xs,
    minHeight: 132,
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
