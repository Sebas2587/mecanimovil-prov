import React, { memo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { FileText, Sparkles } from 'lucide-react-native';
import { InstitutionalTag } from '@/app/design-system/components';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { CotizacionPlantilla } from '@/services/cotizacionCanalService';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import {
  repuestosCountPlantilla,
  tituloServicioPlantilla,
  totalPlantilla,
} from '@/utils/plantillaCotizacionPreview';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

export type PlantillaCotizacionCardProps = {
  plantilla: CotizacionPlantilla;
  onPress: (p: CotizacionPlantilla) => void;
  width: number;
  disabled?: boolean;
};

/** Card compacta para el carrusel de cotizaciones previas del mismo vehículo. */
function PlantillaCotizacionCardInner({
  plantilla,
  onPress,
  width,
  disabled = false,
}: PlantillaCotizacionCardProps) {
  const handlePress = useCallback(() => {
    if (!disabled) onPress(plantilla);
  }, [disabled, plantilla, onPress]);

  const servicio = tituloServicioPlantilla(plantilla);
  const total = totalPlantilla(plantilla);
  const nReps = repuestosCountPlantilla(plantilla);
  const snap = plantilla.snapshot ?? {};
  const modalidad = String(snap.modalidad || 'taller') === 'domicilio' ? 'Domicilio' : 'Taller';

  const meta = [
    nReps > 0 ? `${nReps} repuesto${nReps === 1 ? '' : 's'}` : null,
    modalidad,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <TouchableOpacity
      style={[styles.card, { width }, disabled && styles.cardDisabled]}
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Usar ${servicio}`}
      accessibilityState={{ disabled }}
    >
      <View style={styles.head}>
        {plantilla.aprendizaje_auto ? (
          <Sparkles size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
        ) : (
          <FileText size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
        )}
        <Text style={styles.headLabel} numberOfLines={1}>
          {plantilla.aprendizaje_auto ? 'Del agente' : 'Manual'}
        </Text>
      </View>

      <Text style={styles.servicio} numberOfLines={2}>
        {servicio}
      </Text>

      {total > 0 ? (
        <Text style={styles.precio}>{formatearMontoCLP(total)}</Text>
      ) : (
        <InstitutionalTag label="Sin precio" variant="warning" size="sm" />
      )}

      {meta ? (
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

export const PlantillaCotizacionCard = memo(PlantillaCotizacionCardInner);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.fixed.md,
    gap: SPACING.fixed.xs,
    minHeight: 132,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xxs,
  },
  headLabel: {
    flex: 1,
    minWidth: 0,
    fontFamily: FF.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
  },
  servicio: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.sm * 1.35),
  },
  precio: {
    fontFamily: FF.monoMedium,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
    marginTop: 'auto',
  },
  meta: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.body,
  },
});

export default PlantillaCotizacionCard;
