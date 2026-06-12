import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

interface FuelGaugeComponentProps {
  item: { pregunta_texto: string; descripcion_ayuda?: string };
  respuesta: { respuesta_seleccion?: string } | null;
  onResponseChange: (response: Record<string, unknown>) => void;
  disabled?: boolean;
}

const FUEL_LEVELS = [
  { key: 'E', label: 'E (Vacío)', value: 0, color: I.semanticDown, icon: 'battery-0-bar' },
  { key: '1/4', label: '1/4', value: 25, color: I.accentYellow, icon: 'battery-1-bar' },
  { key: '1/2', label: '1/2', value: 50, color: I.accentYellow, icon: 'battery-3-bar' },
  { key: '3/4', label: '3/4', value: 75, color: I.semanticUp, icon: 'battery-5-bar' },
  { key: 'F', label: 'F (Lleno)', value: 100, color: I.primary, icon: 'battery-full' },
];

export const FuelGaugeComponent: React.FC<FuelGaugeComponentProps> = ({
  respuesta,
  onResponseChange,
  disabled = false,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<string>('');

  useEffect(() => {
    if (respuesta?.respuesta_seleccion) {
      setSelectedLevel(respuesta.respuesta_seleccion);
    }
  }, [respuesta]);

  const handleLevelSelect = (level: string) => {
    if (disabled) return;

    setSelectedLevel(level);

    const fuelLevel = FUEL_LEVELS.find((f) => f.key === level);

    onResponseChange({
      respuesta_seleccion: level,
      respuesta_texto: fuelLevel?.label || level,
      respuesta_numero: fuelLevel?.value || 0,
      completado: true,
    });
  };

  const selectedFuelLevel = FUEL_LEVELS.find((f) => f.key === selectedLevel);

  return (
    <View style={styles.container}>
      <View style={styles.gaugeContainer}>
        <View style={styles.gaugeHeader}>
          <InstitutionalIcon name="local-gas-station" size={20} color={I.body} strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={styles.gaugeTitle}>Nivel de combustible</Text>
        </View>

        <View style={styles.gaugeBar}>
          {FUEL_LEVELS.map((level, index) => (
            <View
              key={level.key}
              style={[
                styles.gaugeSegment,
                index === 0 && styles.gaugeSegmentFirst,
                index === FUEL_LEVELS.length - 1 && styles.gaugeSegmentLast,
                {
                  backgroundColor:
                    selectedLevel === level.key
                      ? level.color
                      : selectedFuelLevel &&
                          FUEL_LEVELS.findIndex((f) => f.key === selectedFuelLevel.key) >= index
                        ? level.color
                        : I.hairlineSoft,
                },
              ]}
            >
              <Text
                style={[
                  styles.gaugeSegmentText,
                  {
                    color:
                      selectedLevel === level.key ||
                      (selectedFuelLevel &&
                        FUEL_LEVELS.findIndex((f) => f.key === selectedFuelLevel.key) >= index)
                        ? I.onPrimary
                        : I.muted,
                  },
                ]}
              >
                {level.key}
              </Text>
            </View>
          ))}
        </View>

        {selectedLevel && selectedFuelLevel ? (
          <View style={styles.gaugeIndicator}>
            <InstitutionalIcon
              name={selectedFuelLevel.icon as 'battery-full'}
              size={18}
              color={selectedFuelLevel.color}
              strokeWidth={ICON_STROKE_WIDTH}
            />
            <Text style={[styles.gaugeIndicatorText, { color: selectedFuelLevel.color }]}>
              {selectedFuelLevel.value}%
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.buttonsContainer}>
        {FUEL_LEVELS.map((level) => (
          <TouchableOpacity
            key={level.key}
            style={[
              styles.levelButton,
              selectedLevel === level.key && styles.levelButtonSelected,
              selectedLevel === level.key && { backgroundColor: level.color, borderColor: level.color },
              disabled && styles.levelButtonDisabled,
            ]}
            onPress={() => handleLevelSelect(level.key)}
            disabled={disabled}
          >
            <InstitutionalIcon
              name={level.icon as 'battery-full'}
              size={18}
              color={selectedLevel === level.key ? I.onPrimary : level.color}
              strokeWidth={ICON_STROKE_WIDTH}
            />
            <Text
              style={[
                styles.levelButtonText,
                selectedLevel === level.key && styles.levelButtonTextSelected,
                disabled && styles.levelButtonTextDisabled,
              ]}
            >
              {level.label}
            </Text>
            <Text
              style={[
                styles.levelButtonValue,
                selectedLevel === level.key && styles.levelButtonValueSelected,
                disabled && styles.levelButtonTextDisabled,
              ]}
            >
              {level.value}%
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoContainer}>
        <InstitutionalIcon name="info" size={14} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
        <Text style={styles.infoText}>
          Selecciona el nivel según el medidor del tablero del vehículo
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.fixed.sm,
  },
  gaugeContainer: {
    padding: SPACING.fixed.sm,
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  gaugeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.fixed.sm,
    gap: SPACING.fixed.xs,
  },
  gaugeTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  gaugeBar: {
    flexDirection: 'row',
    height: 32,
    borderRadius: BORDERS.radius.pill,
    overflow: 'hidden',
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  gaugeSegment: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: I.canvas,
  },
  gaugeSegmentFirst: {
    borderTopLeftRadius: BORDERS.radius.pill,
    borderBottomLeftRadius: BORDERS.radius.pill,
  },
  gaugeSegmentLast: {
    borderTopRightRadius: BORDERS.radius.pill,
    borderBottomRightRadius: BORDERS.radius.pill,
    borderRightWidth: 0,
  },
  gaugeSegmentText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
  },
  gaugeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.fixed.xs,
    gap: SPACING.fixed.xxs,
  },
  gaugeIndicatorText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
  },
  buttonsContainer: {
    gap: SPACING.fixed.xs,
  },
  levelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.canvas,
    gap: SPACING.fixed.sm,
    minHeight: 44,
  },
  levelButtonSelected: {
    borderColor: 'transparent',
  },
  levelButtonDisabled: {
    opacity: 0.5,
  },
  levelButtonText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.ink,
  },
  levelButtonTextSelected: {
    color: I.onPrimary,
    fontFamily: FF.sansSemiBold,
  },
  levelButtonValue: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    color: I.muted,
  },
  levelButtonValueSelected: {
    color: I.onPrimary,
  },
  levelButtonTextDisabled: {
    opacity: 0.5,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.xs,
    paddingTop: SPACING.fixed.xs,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairlineSoft,
  },
  infoText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansRegular,
    color: I.muted,
    lineHeight: 16,
  },
});
