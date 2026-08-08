import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import { Card } from '@/app/design-system/components';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { consultarPatente } from '@/services/vehiculoService';
import { cilindrajeEfectivo } from '@/utils/extraerCilindrajeDesdeTexto';
import { esErrorCuota, mensajeCuotaError } from '@/utils/cuotaError';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { withWebLineHeight } from '@/utils/webTypography';

const I = COLORS.institutional;
const SPEC_LABEL = withWebLineHeight(TYPOGRAPHY.styles.caption);
const SPEC_VALUE = withWebLineHeight(TYPOGRAPHY.styles.body);

export type VehiculoPatenteState = {
  patente: string;
  marca: string;
  modelo: string;
  anio: string;
  color: string;
  vin: string;
  cilindraje: string;
  desdePatente: boolean;
};

export const VEHICULO_PATENTE_VACIO: VehiculoPatenteState = {
  patente: '',
  marca: '',
  modelo: '',
  anio: '',
  color: '',
  vin: '',
  cilindraje: '',
  desdePatente: false,
};

function valorSpec(text: string): string {
  return text.trim() || 'N/A';
}

function VehiculoSpecItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.vehiculoGridItem}>
      <Text style={styles.vehiculoGridItemLabel}>{label}</Text>
      <Text style={styles.vehiculoGridItemValue} numberOfLines={2}>
        {valorSpec(value)}
      </Text>
    </View>
  );
}

type Props = {
  value: VehiculoPatenteState;
  onChange: (next: VehiculoPatenteState) => void;
  buscandoPatente: boolean;
  onBuscandoPatenteChange: (v: boolean) => void;
  patenteHint: string | null;
  onPatenteHintChange: (hint: string | null) => void;
  onCuotaError?: (mensaje: string) => void;
  /** compact = cotizar; grid = agendar (incluye color). */
  resumenVariant?: 'compact' | 'grid';
  stripNonAlphanumeric?: boolean;
};

export function VehiculoPatenteSection({
  value,
  onChange,
  buscandoPatente,
  onBuscandoPatenteChange,
  patenteHint,
  onPatenteHintChange,
  onCuotaError,
  resumenVariant = 'compact',
  stripNonAlphanumeric = false,
}: Props) {
  const handlePatenteChange = useCallback(
    (text: string) => {
      const nextPatente = stripNonAlphanumeric
        ? text.toUpperCase().replace(/[^A-Z0-9]/g, '')
        : text.toUpperCase();
      if (value.desdePatente) {
        onChange({
          ...VEHICULO_PATENTE_VACIO,
          patente: nextPatente,
        });
        onPatenteHintChange(null);
      } else {
        onChange({ ...value, patente: nextPatente });
        onPatenteHintChange(null);
      }
    },
    [value, onChange, onPatenteHintChange, stripNonAlphanumeric],
  );

  const handlePatenteBlur = useCallback(async () => {
    const patente = value.patente.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (patente.length < 5) {
      onPatenteHintChange(null);
      return;
    }
    onBuscandoPatenteChange(true);
    onPatenteHintChange(null);
    try {
      const data = await consultarPatente(patente);
      onChange({
        patente: data.patente || patente,
        marca: data.marca_nombre?.trim() || '',
        modelo: data.modelo_nombre?.trim() || '',
        anio: data.year ? String(data.year) : '',
        color: data.color?.trim() || '',
        vin: data.vin?.trim() || '',
        cilindraje: cilindrajeEfectivo(data.cilindraje, data.marca_nombre, data.modelo_nombre),
        desdePatente: true,
      });
      onPatenteHintChange('Datos del vehículo cargados desde la patente.');
    } catch (err) {
      onChange({
        ...VEHICULO_PATENTE_VACIO,
        patente: value.patente,
      });
      if (esErrorCuota(err)) {
        const mensaje = mensajeCuotaError(
          err,
          'Necesitás una suscripción activa para consultar patentes.',
        );
        onPatenteHintChange(mensaje);
        onCuotaError?.(mensaje);
      } else {
        onPatenteHintChange('No se encontró la patente. Completa marca y modelo manualmente.');
      }
    } finally {
      onBuscandoPatenteChange(false);
    }
  }, [
    value.patente,
    onChange,
    onBuscandoPatenteChange,
    onPatenteHintChange,
    onCuotaError,
  ]);

  return (
    <>
      <InstitutionalField
        label="Patente"
        hint="Consulta el registro al salir del campo. Si existe, autocompleta y bloquea los datos del vehículo."
        value={value.patente}
        onChangeText={handlePatenteChange}
        placeholder="ABCD12"
        autoCapitalize="characters"
        onBlur={() => void handlePatenteBlur()}
        editable={!buscandoPatente}
      />
      {buscandoPatente ? (
        <View style={styles.patenteLoading}>
          <ActivityIndicator size="small" color={I.primary} />
          <Text style={styles.patenteHint}>Consultando patente…</Text>
        </View>
      ) : patenteHint ? (
        <Text style={styles.patenteHint}>{patenteHint}</Text>
      ) : null}

      {value.desdePatente ? (
        resumenVariant === 'grid' ? (
          <View style={styles.vehiculoResumen}>
            <View style={styles.vehiculoGrid}>
              <VehiculoSpecItem label="Marca" value={value.marca} />
              <VehiculoSpecItem label="Modelo" value={value.modelo} />
            </View>
            <View style={styles.vehiculoGrid}>
              <VehiculoSpecItem label="Año" value={value.anio} />
              <VehiculoSpecItem label="Color" value={value.color} />
            </View>
            <View style={styles.vehiculoGrid}>
              <VehiculoSpecItem label="VIN" value={value.vin} />
              <VehiculoSpecItem label="Cilindraje" value={value.cilindraje} />
            </View>
          </View>
        ) : (
          <Card elevated padding="host" style={styles.vehiculoResumenCard}>
            <InstitutionalSectionHeader title="Vehículo identificado" />
            <View style={styles.vehiculoGrid}>
              <VehiculoSpecItem label="Marca" value={value.marca} />
              <VehiculoSpecItem label="Modelo" value={value.modelo} />
            </View>
            <View style={styles.vehiculoGrid}>
              <VehiculoSpecItem label="Año" value={value.anio} />
              <VehiculoSpecItem label="Cilindraje" value={value.cilindraje} />
            </View>
            {value.vin ? (
              <View style={styles.vehiculoGrid}>
                <VehiculoSpecItem label="VIN" value={value.vin} />
                <View style={styles.vehiculoGridItem} />
              </View>
            ) : null}
          </Card>
        )
      ) : (
        <View style={styles.vehiculoManual}>
          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <InstitutionalField
                label="Marca *"
                value={value.marca}
                onChangeText={(marca) => onChange({ ...value, marca })}
                placeholder="Ej. Toyota"
              />
            </View>
            <View style={styles.fieldHalf}>
              <InstitutionalField
                label="Modelo *"
                value={value.modelo}
                onChangeText={(modelo) => onChange({ ...value, modelo })}
                placeholder="Ej. Corolla"
              />
            </View>
          </View>
          {resumenVariant === 'grid' ? (
            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <InstitutionalField
                  label="Año"
                  value={value.anio}
                  onChangeText={(text) =>
                    onChange({ ...value, anio: text.replace(/\D/g, '').slice(0, 4) })
                  }
                  placeholder="2020"
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
              <View style={styles.fieldHalf} />
            </View>
          ) : null}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  patenteLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
  },
  patenteHint: {
    ...SPEC_LABEL,
    color: I.muted,
  },
  vehiculoResumen: {
    gap: SPACING.sm,
  },
  vehiculoResumenCard: {
    gap: SPACING.sm,
  },
  vehiculoManual: {
    gap: SPACING.sm,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  fieldHalf: {
    flex: 1,
    minWidth: 0,
  },
  vehiculoGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  vehiculoGridItem: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  vehiculoGridItemLabel: {
    ...SPEC_LABEL,
    color: I.muted,
  },
  vehiculoGridItemValue: {
    ...SPEC_VALUE,
    color: I.ink,
  },
});

export default VehiculoPatenteSection;
