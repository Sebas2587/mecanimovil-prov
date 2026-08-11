import React, { memo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { ChevronRight, FileText, Sparkles } from 'lucide-react-native';
import { InstitutionalTag } from '@/app/design-system/components';
import { hostIconPlateStyle } from '@/app/design-system/styles/institutionalSemantic';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { CotizacionPlantilla } from '@/services/cotizacionCanalService';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import {
  repuestosCountPlantilla,
  tituloServicioPlantilla,
  totalPlantilla,
  vehiculoLineaPlantilla,
} from '@/utils/plantillaCotizacionPreview';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

function fechaCorta(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

export type PlantillaCotizacionRowProps = {
  plantilla: CotizacionPlantilla;
  onPress: (p: CotizacionPlantilla) => void;
  last?: boolean;
  disabled?: boolean;
};

/** Fila Host dentro de un único paper (mismo patrón que CotizacionPendienteRow). */
function PlantillaCotizacionRowInner({
  plantilla,
  onPress,
  last,
  disabled = false,
}: PlantillaCotizacionRowProps) {
  const handlePress = useCallback(() => {
    if (!disabled) onPress(plantilla);
  }, [disabled, plantilla, onPress]);
  const servicio = tituloServicioPlantilla(plantilla);
  const vehiculo = vehiculoLineaPlantilla(plantilla);
  const total = totalPlantilla(plantilla);
  const nReps = repuestosCountPlantilla(plantilla);
  const snap = plantilla.snapshot ?? {};
  const modalidad = String(snap.modalidad || 'taller') === 'domicilio' ? 'Domicilio' : 'Taller';
  const duracion = Number(snap.duracion_minutos_estimada || 0) || null;
  const fecha = fechaCorta(plantilla.actualizado_en);

  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder, disabled && styles.rowDisabled]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <View style={hostIconPlateStyle}>
        {plantilla.aprendizaje_auto ? (
          <Sparkles size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
        ) : (
          <FileText size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.line1}>
          <Text style={styles.servicio} numberOfLines={2}>
            {servicio}
          </Text>
          <View style={styles.priceChevron}>
            {total > 0 ? (
              <Text style={styles.precio}>{formatearMontoCLP(total)}</Text>
            ) : (
              <InstitutionalTag label="Sin precio" variant="warning" size="sm" />
            )}
            <ChevronRight size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
        </View>

        <View style={styles.line2}>
          <InstitutionalTag
            label={plantilla.aprendizaje_auto ? 'Del agente' : 'Manual'}
            variant={plantilla.aprendizaje_auto ? 'info' : 'neutral'}
            size="sm"
          />
          <InstitutionalTag label={modalidad} variant="neutral" size="sm" />
          {duracion ? (
            <InstitutionalTag label={`${duracion} min`} variant="neutral" size="sm" />
          ) : null}
          {fecha ? <Text style={styles.fecha}>{fecha}</Text> : null}
        </View>

        <Text style={styles.meta} numberOfLines={2}>
          {vehiculo || 'Sin vehículo'}
          {nReps > 0 ? ` · ${nReps} repuesto${nReps === 1 ? '' : 's'}` : ''}
          {plantilla.uso_count > 0
            ? ` · Usada ${plantilla.uso_count} ${plantilla.uso_count === 1 ? 'vez' : 'veces'}`
            : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export const PlantillaCotizacionRow = memo(PlantillaCotizacionRowInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.md,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.fixed.xxs,
  },
  line1: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
  },
  servicio: {
    flex: 1,
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.sm * 1.35),
  },
  priceChevron: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  precio: {
    fontFamily: FF.monoMedium,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  line2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
  },
  fecha: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
    marginLeft: 'auto',
  },
  meta: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.body,
    lineHeight: 16,
  },
});

export default PlantillaCotizacionRow;
