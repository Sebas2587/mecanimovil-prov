import React from 'react';
import { StyleSheet, View } from 'react-native';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { BORDERS, COLORS, SPACING, withOpacity } from '@/app/design-system/tokens';
import { TallerPildora } from '@/components/taller/TallerPildora';
import {
  dudaEstaPendiente,
  dudaTexto,
  type DudaCotizador,
} from '@/utils/decisionCotizador';

const I = COLORS.institutional;

type Props = {
  dudas: DudaCotizador[];
  editable?: boolean;
  onConfirmar?: (id: string) => void;
};

function DudaFila({
  duda,
  editable,
  onConfirmar,
}: {
  duda: DudaCotizador;
  editable: boolean;
  onConfirmar?: (id: string) => void;
}) {
  const pendiente = dudaEstaPendiente(duda);
  return (
    <View
      style={[styles.fila, pendiente && styles.filaPendiente]}
      testID={`duda-cotizador-${duda.id}`}
      accessibilityLabel={`Duda del cotizador: ${dudaTexto(duda)}`}
    >
      <InstitutionalTag
        label={pendiente ? 'Pendiente' : 'Confirmada'}
        variant={pendiente ? 'warning' : 'success'}
        size="sm"
        uppercase={false}
      />
      <InstitutionalText role="bodyBold">{dudaTexto(duda)}</InstitutionalText>
      {editable && pendiente ? (
        <TallerPildora
          label="Confirmar"
          tono="coral"
          onPress={() => onConfirmar?.(String(duda.id))}
        />
      ) : null}
    </View>
  );
}

export function DudasCotizador({
  dudas,
  editable = false,
  onConfirmar,
}: Props) {
  if (!dudas.length) return null;
  const pendientes = dudas.filter(dudaEstaPendiente).length;
  return (
    <View style={styles.bloque} testID="dudas-cotizador" accessibilityLabel="Dudas del cotizador">
      <InstitutionalText role="bodyBold">
        {pendientes > 0 ? 'El cotizador necesita tu opinión' : 'Dudas del cotizador'}
      </InstitutionalText>
      <InstitutionalText role="caption" color="muted">
        {pendientes > 0
          ? 'Confirma cada aviso antes de enviar al cliente.'
          : 'Ya no quedan dudas pendientes.'}
      </InstitutionalText>
      {dudas.map((duda) => (
        <DudaFila
          key={String(duda.id)}
          duda={duda}
          editable={editable}
          onConfirmar={onConfirmar}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bloque: {
    gap: SPACING.fixed.sm,
  },
  fila: {
    gap: SPACING.fixed.xs,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceSoft,
    padding: SPACING.fixed.sm,
  },
  filaPendiente: {
    backgroundColor: withOpacity(I.accentYellow, 0.12),
  },
});
