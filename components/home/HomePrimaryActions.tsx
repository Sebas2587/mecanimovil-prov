import React, { memo, useCallback } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Inbox, Sparkles } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { Card, InstitutionalTag, InstitutionalText } from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  hostIconPlateColor,
  hostIconPlateStyle,
} from '@/app/design-system/styles/institutionalSemantic';

const I = COLORS.institutional;

export type HomePrimaryActionsProps = {
  borradoresCount?: number;
  bandejaCount?: number;
};

function HomePrimaryActionsInner({
  borradoresCount = 0,
  bandejaCount = 0,
}: HomePrimaryActionsProps) {
  const { width } = useWindowDimensions();
  const stacked = width < 380;

  const goCotizar = useCallback(() => router.push('/cotizar-ia'), []);
  const goBandeja = useCallback(() => router.push('/(tabs)/bandeja'), []);

  return (
    <View style={[styles.row, stacked && styles.rowStacked]}>
      <Card
        elevated
        padding="host"
        style={[styles.card, stacked && styles.cardStacked]}
        onPress={goCotizar}
      >
        <View style={styles.cardTop}>
          <View style={[hostIconPlateStyle, styles.iconPlate]}>
            <Sparkles size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
          {borradoresCount > 0 ? (
            <InstitutionalTag
              label={`${borradoresCount} por revisar`}
              variant="warning"
              size="sm"
            />
          ) : null}
        </View>
        <InstitutionalText role="h4">Cotizar con IA</InstitutionalText>
        <InstitutionalText role="caption" color="body" numberOfLines={2}>
          Borradores por revisar y enviar al cliente
        </InstitutionalText>
      </Card>

      <Card
        elevated
        padding="host"
        style={[styles.card, stacked && styles.cardStacked]}
        onPress={goBandeja}
      >
        <View style={styles.cardTop}>
          <View style={[hostIconPlateStyle, styles.iconPlate]}>
            <Inbox size={22} color={hostIconPlateColor} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
          {bandejaCount > 0 ? (
            <View style={styles.badge}>
              <InstitutionalText role="caption" style={styles.badgeText}>
                {bandejaCount > 99 ? '99+' : bandejaCount}
              </InstitutionalText>
            </View>
          ) : null}
        </View>
        <InstitutionalText role="h4">Bandeja</InstitutionalText>
        <InstitutionalText role="caption" color="body" numberOfLines={2}>
          {bandejaCount > 0
            ? `${bandejaCount} caso${bandejaCount === 1 ? '' : 's'} en seguimiento`
            : 'Abiertos, enviados, negociación y agendados'}
        </InstitutionalText>
      </Card>
    </View>
  );
}

export const HomePrimaryActions = memo(HomePrimaryActionsInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'stretch',
  },
  rowStacked: {
    flexDirection: 'column',
  },
  card: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.xs,
    minHeight: 128,
  },
  cardStacked: {
    flex: undefined,
    width: '100%',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  iconPlate: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: I.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: I.onPrimary,
    fontSize: 11,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: '600',
  },
});

export default HomePrimaryActions;
