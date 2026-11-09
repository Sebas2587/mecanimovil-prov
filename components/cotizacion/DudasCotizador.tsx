import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { BORDERS, COLORS, SPACING, withOpacity } from '@/app/design-system/tokens';
import { TallerPildora } from '@/components/taller/TallerPildora';
import {
  dudaEstaPendiente,
  type DudaCotizador,
} from '@/utils/decisionCotizador';

const I = COLORS.institutional;

type Props = {
  dudas: DudaCotizador[];
  editable?: boolean;
  onResponder?: (id: string, respuesta: string) => void;
  onConfirmar?: (id: string) => void;
};

function DudaFila({
  duda,
  editable,
  onResponder,
  onConfirmar,
}: {
  duda: DudaCotizador;
  editable: boolean;
  onResponder?: (id: string, respuesta: string) => void;
  onConfirmar?: (id: string) => void;
}) {
  const pendiente = dudaEstaPendiente(duda);
  const [draft, setDraft] = useState(duda.respuesta || '');
  useEffect(() => {
    setDraft(duda.respuesta || '');
  }, [duda.respuesta]);
  const etiqueta = pendiente
    ? 'Pendiente'
    : String(duda.estado) === 'confirmada'
      ? 'Confirmada'
      : 'Respondida';
  return (
    <View
      style={[styles.fila, pendiente && styles.filaPendiente]}
      testID={`duda-cotizador-${duda.id}`}
      accessibilityLabel={`Duda del cotizador: ${duda.pregunta}`}
    >
      <InstitutionalTag
        label={etiqueta}
        variant={pendiente ? 'warning' : 'success'}
        size="sm"
        uppercase={false}
      />
      <InstitutionalText role="bodyBold">{duda.pregunta}</InstitutionalText>
      {duda.contexto ? (
        <InstitutionalText role="caption" color="muted">{duda.contexto}</InstitutionalText>
      ) : null}
      {editable && pendiente ? (
        <>
          <InstitutionalField
            label="Tu respuesta"
            value={draft}
            onChangeText={setDraft}
            placeholder="Ej. El kit no incluye el rodamiento"
            multiline
          />
          <View style={styles.acciones}>
            <TallerPildora
              label="Responder"
              tono="coral"
              onPress={() => onResponder?.(String(duda.id), draft)}
              disabled={!draft.trim()}
            />
            <TallerPildora
              label="Confirmar"
              tono="suave"
              onPress={() => onConfirmar?.(String(duda.id))}
            />
          </View>
        </>
      ) : duda.respuesta ? (
        <InstitutionalText role="caption" color="body">
          {duda.respuesta}
        </InstitutionalText>
      ) : null}
    </View>
  );
}

export function DudasCotizador({
  dudas,
  editable = false,
  onResponder,
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
          ? 'Responde o confirma cada aviso antes de enviar al cliente.'
          : 'Ya no quedan dudas pendientes.'}
      </InstitutionalText>
      {dudas.map((duda) => (
        <DudaFila
          key={String(duda.id)}
          duda={duda}
          editable={editable}
          onResponder={onResponder}
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
  acciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
  },
});
