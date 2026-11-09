import React from 'react';
import { StyleSheet, View } from 'react-native';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { BORDERS, COLORS, SPACING, withOpacity } from '@/app/design-system/tokens';
import { TallerPildora } from '@/components/taller/TallerPildora';
import {
  esLineaSugerida,
  etiquetaOrigenLinea,
  motivoSugerencia,
  sugerenciaEstado,
  type LineaDecision,
  type SugerenciaEstado,
} from '@/utils/decisionCotizador';

const I = COLORS.institutional;

type Props = {
  rep: LineaDecision;
  editable?: boolean;
  compact?: boolean;
  onDecidir?: (estado: SugerenciaEstado) => void;
};

export function SugerenciaLinea({
  rep,
  editable = false,
  compact = false,
  onDecidir,
}: Props) {
  if (!esLineaSugerida(rep)) {
    return (
      <InstitutionalTag label="Pedido" variant="neutral" size="sm" uppercase={false} />
    );
  }
  const estado = sugerenciaEstado(rep);
  const motivo = motivoSugerencia(rep);
  const pendiente = estado === 'pendiente';
  return (
    <View
      style={[styles.caja, pendiente && styles.cajaPendiente, compact && styles.cajaCompacta]}
      testID="sugerencia-linea"
      accessibilityLabel={etiquetaOrigenLinea(rep)}
    >
      <InstitutionalTag
        label={etiquetaOrigenLinea(rep)}
        variant={estado === 'aceptada' ? 'success' : estado === 'descartada' ? 'neutral' : 'warning'}
        size="sm"
        uppercase={false}
      />
      {motivo ? (
        <InstitutionalText role="caption" color="body" style={styles.motivo}>
          {motivo}
        </InstitutionalText>
      ) : (
        <InstitutionalText role="caption" color="muted">
          El cotizador lo propone como complemento. No se cobra hasta que lo aceptes.
        </InstitutionalText>
      )}
      {pendiente ? (
        <InstitutionalText role="caption" color="muted">
          Mientras esté pendiente, no se suma al total ni lo ve el cliente.
        </InstitutionalText>
      ) : null}
      {editable && onDecidir ? (
        <View style={styles.acciones}>
          {estado !== 'aceptada' ? (
            <TallerPildora
              label="Aceptar"
              tono="coral"
              onPress={() => onDecidir('aceptada')}
            />
          ) : null}
          {estado !== 'descartada' ? (
            <TallerPildora
              label="Descartar"
              tono="suave"
              onPress={() => onDecidir('descartada')}
            />
          ) : (
            <TallerPildora
              label="Restaurar"
              tono="suave"
              onPress={() => onDecidir('pendiente')}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    gap: SPACING.fixed.xs,
    alignSelf: 'stretch',
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceSoft,
    padding: SPACING.fixed.sm,
  },
  cajaPendiente: {
    backgroundColor: withOpacity(I.accentYellow, 0.12),
  },
  cajaCompacta: {
    padding: SPACING.fixed.xs,
  },
  motivo: {
    flexShrink: 1,
  },
  acciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
  },
});
