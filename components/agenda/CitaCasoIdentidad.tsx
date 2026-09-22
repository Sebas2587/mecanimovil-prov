import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Car, MapPin, Phone, UserRound } from 'lucide-react-native';
import { Card, InstitutionalTag, InstitutionalText } from '@/app/design-system/components';
import { hostIconPlateStyle } from '@/app/design-system/styles/institutionalSemantic';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { VerHistorialPatenteLink } from '@/components/vehiculos/VerHistorialPatenteLink';
import type { EstadoOperativoUnificado } from '@/utils/estadoOperativo';
import { ESTADO_OPERATIVO_LABELS, ESTADO_OPERATIVO_VARIANT } from '@/utils/estadoOperativo';
import { cilindrajeEfectivo } from '@/utils/extraerCilindrajeDesdeTexto';

const I = COLORS.institutional;

export type CitaCasoIdentidadProps = {
  servicioNombre: string;
  folioLabel: string;
  estadoOperativo: EstadoOperativoUnificado;
  modalidadLabel: string;
  fechaHoraLabel: string;
  horarioPorConfirmar: boolean;
  clienteNombre: string;
  clienteTelefono?: string | null;
  direccion?: string | null;
  esDomicilio: boolean;
  vehiculoMarca?: string | null;
  vehiculoModelo?: string | null;
  vehiculoAnio?: number | null;
  vehiculoPatente?: string | null;
  vehiculoVin?: string | null;
  vehiculoCilindraje?: string | null;
  onLlamar?: () => void;
};

export function CitaCasoIdentidad({
  servicioNombre,
  folioLabel,
  estadoOperativo,
  modalidadLabel,
  fechaHoraLabel,
  horarioPorConfirmar,
  clienteNombre,
  clienteTelefono,
  direccion,
  esDomicilio,
  vehiculoMarca,
  vehiculoModelo,
  vehiculoAnio,
  vehiculoPatente,
  vehiculoVin,
  vehiculoCilindraje,
  onLlamar,
}: CitaCasoIdentidadProps) {
  const { width } = useWindowDimensions();
  const stacked = width < 520;
  const vehiculoTitulo = [vehiculoMarca, vehiculoModelo, vehiculoAnio]
    .filter(Boolean)
    .join(' ')
    .trim();
  const cilindraje = cilindrajeEfectivo(vehiculoCilindraje, vehiculoMarca, vehiculoModelo);

  return (
    <View style={styles.root}>
      <View style={styles.headerTagsCol}>
        <InstitutionalText role="h4">
          {servicioNombre}
        </InstitutionalText>
        <View style={styles.headerTags}>
          {folioLabel ? (
            <InstitutionalTag label={folioLabel} variant="neutral" size="sm" />
          ) : null}
          <InstitutionalTag
            label={ESTADO_OPERATIVO_LABELS[estadoOperativo]}
            variant={ESTADO_OPERATIVO_VARIANT[estadoOperativo]}
            size="sm"
            uppercase
          />
          <InstitutionalTag label={modalidadLabel} variant="neutral" size="sm" />
        </View>
        {fechaHoraLabel ? (
          <InstitutionalText role="caption" color={horarioPorConfirmar ? 'muted' : 'ink'}>
            {fechaHoraLabel}
          </InstitutionalText>
        ) : null}
      </View>

      <View style={[styles.factsColumns, stacked && styles.factsColumnsStacked]}>
        <Card elevated padding="host" style={[styles.factsColCard, !stacked && styles.factsColHalf]}>
          <View style={styles.factsHeader}>
            <View style={hostIconPlateStyle}>
              <Car size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <View style={styles.motorCopy}>
              <InstitutionalText role="label" color="muted">
                VEHÍCULO
              </InstitutionalText>
              <InstitutionalText role="h5" numberOfLines={2}>
                {vehiculoTitulo || vehiculoPatente?.toUpperCase() || 'Sin datos'}
              </InstitutionalText>
            </View>
          </View>
          <View style={styles.factsGrid}>
            {vehiculoPatente ? (
              <FactRow label="Patente" value={vehiculoPatente.toUpperCase()} />
            ) : null}
            {cilindraje ? <FactRow label="Cilindraje" value={cilindraje} /> : null}
            {vehiculoVin ? <FactRow label="VIN" value={vehiculoVin} /> : null}
          </View>
          {vehiculoPatente ? (
            <View style={styles.factsCardAction}>
              <VerHistorialPatenteLink patente={vehiculoPatente} />
            </View>
          ) : null}
        </Card>

        <Card elevated padding="host" style={[styles.factsColCard, !stacked && styles.factsColHalf]}>
          <View style={styles.factsHeader}>
            <View style={hostIconPlateStyle}>
              <UserRound size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <View style={styles.motorCopy}>
              <InstitutionalText role="label" color="muted">
                CLIENTE
              </InstitutionalText>
              <InstitutionalText role="h5" numberOfLines={1}>
                {clienteNombre || 'Sin nombre'}
              </InstitutionalText>
            </View>
          </View>
          <View style={styles.factsGrid}>
            {clienteTelefono ? (
              <View style={styles.factRow}>
                <InstitutionalText role="small" color="muted">
                  Teléfono
                </InstitutionalText>
                <Pressable onPress={onLlamar} style={styles.factValueRow}>
                  <Phone size={14} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                  <InstitutionalText role="captionBold" color="ink" numberOfLines={1}>
                    {clienteTelefono}
                  </InstitutionalText>
                </Pressable>
              </View>
            ) : null}
            {esDomicilio && direccion ? (
              <View style={styles.factRow}>
                <InstitutionalText role="small" color="muted">
                  Dirección
                </InstitutionalText>
                <View style={styles.factValueRow}>
                  <MapPin size={14} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                  <InstitutionalText role="captionBold" color="ink" numberOfLines={2} style={styles.factValue}>
                    {direccion}
                  </InstitutionalText>
                </View>
              </View>
            ) : null}
          </View>
        </Card>
      </View>
    </View>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.factRow}>
      <InstitutionalText role="small" color="muted">
        {label}
      </InstitutionalText>
      <InstitutionalText role="captionBold" color="ink" numberOfLines={2} style={styles.factValue}>
        {value}
      </InstitutionalText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: SPACING.fixed.md,
    marginBottom: SPACING.fixed.md,
  },
  headerTagsCol: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.xs,
  },
  headerTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    alignItems: 'center',
  },
  factsColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
  },
  factsColumnsStacked: {
    flexDirection: 'column',
  },
  factsColCard: {
    gap: SPACING.fixed.sm,
  },
  factsColHalf: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'flex-start',
  },
  factsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  motorCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  factsGrid: {
    gap: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  factsCardAction: {
    paddingTop: SPACING.fixed.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.fixed.md,
  },
  factValue: {
    flex: 1,
    textAlign: 'right',
  },
  factValueRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    gap: 6,
    minWidth: 0,
  },
});

export default CitaCasoIdentidad;
