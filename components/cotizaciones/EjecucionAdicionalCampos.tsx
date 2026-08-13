import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CatalogoFechaHoraPickers,
  resolveInitialPickerValue,
  type CatalogoFechaHoraValue,
} from '@/components/solicitudes/CatalogoFechaHoraPickers';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY, withOpacity } from '@/app/design-system/tokens';
import { fechasProximosDias, formatDateApi, formatFechaHoraPropuesta } from '@/utils/fechaLocal';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

export type EjecucionAdicional = 'misma_visita' | 'nueva_fecha';

type Props = {
  ejecucion: EjecucionAdicional;
  onEjecucionChange: (next: EjecucionAdicional) => void;
  fechaHora: CatalogoFechaHoraValue;
  onFechaHoraChange: (next: CatalogoFechaHoraValue) => void;
  editable?: boolean;
  fechaPropuesta?: string | null;
  horaPropuesta?: string | null;
};

export function pickerDesdePropuesta(
  fecha?: string | null,
  hora?: string | null,
): CatalogoFechaHoraValue {
  return resolveInitialPickerValue(fecha || undefined, hora || null);
}

export function EjecucionAdicionalCampos({
  ejecucion,
  onEjecucionChange,
  fechaHora,
  onFechaHoraChange,
  editable = true,
  fechaPropuesta,
  horaPropuesta,
}: Props) {
  const fechasDisponibles = useMemo(() => fechasProximosDias(21), []);
  const slotTxt = formatFechaHoraPropuesta(fechaPropuesta, horaPropuesta);

  if (!editable) {
    return (
      <View style={styles.readonly}>
        <InstitutionalText role="caption" color="muted">
          {ejecucion === 'nueva_fecha'
            ? (slotTxt ? `Fecha propuesta: ${slotTxt}` : 'Nueva fecha (sin horario aún)')
            : 'Se ejecuta en esta misma visita'}
        </InstitutionalText>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeChip, ejecucion === 'misma_visita' && styles.modeChipActive]}
          onPress={() => onEjecucionChange('misma_visita')}
        >
          <Text
            style={[
              styles.modeChipText,
              ejecucion === 'misma_visita' && styles.modeChipTextActive,
            ]}
          >
            Misma visita
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeChip, ejecucion === 'nueva_fecha' && styles.modeChipActive]}
          onPress={() => onEjecucionChange('nueva_fecha')}
        >
          <Text
            style={[
              styles.modeChipText,
              ejecucion === 'nueva_fecha' && styles.modeChipTextActive,
            ]}
          >
            Nueva fecha
          </Text>
        </Pressable>
      </View>
      {ejecucion === 'nueva_fecha' ? (
        <View style={styles.pickerWrap}>
          <InstitutionalText role="caption" color="muted">
            Día y hora acordados con el cliente
          </InstitutionalText>
          <CatalogoFechaHoraPickers
            value={fechaHora}
            onChange={onFechaHoraChange}
            modo="simple"
            fechasDisponibles={fechasDisponibles}
          />
        </View>
      ) : (
        <InstitutionalText role="caption" color="muted">
          El extra se hace ahora, en esta misma visita.
        </InstitutionalText>
      )}
    </View>
  );
}

export function slotDesdePicker(value: CatalogoFechaHoraValue): {
  fecha_propuesta: string;
  hora_propuesta: string | null;
} {
  return {
    fecha_propuesta: formatDateApi(value.fecha),
    hora_propuesta: value.hora,
  };
}

const styles = StyleSheet.create({
  root: {
    gap: SPACING.fixed.md,
  },
  readonly: {
    marginTop: SPACING.fixed.xs,
  },
  modeRow: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
  },
  modeChip: {
    flex: 1,
    minHeight: 48,
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: COLORS.background.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChipActive: {
    borderColor: withOpacity(I.primary, 0.35),
    backgroundColor: withOpacity(I.primary, 0.08),
  },
  modeChipText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.body,
  },
  modeChipTextActive: {
    color: I.primary,
    fontFamily: FF.sansSemiBold,
  },
  pickerWrap: {
    gap: SPACING.fixed.sm,
  },
});
