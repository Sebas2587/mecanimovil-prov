import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { institutionalTagIconColor } from '@/app/design-system/styles/institutionalTags';
import {
  alertasValidacionVisibles,
  vistaValidacionLinea,
  type TonoValidacion,
} from '@/utils/validacionCotizacion';

function BadgeEstado({ etiqueta, tono }: { etiqueta: string; tono: TonoValidacion }) {
  return (
    <InstitutionalTag label={etiqueta} variant={tono} size="sm" uppercase={false} />
  );
}

function DetalleValidacion({
  motivo,
  alertas,
  colapsable,
}: {
  motivo: string;
  alertas: string[];
  colapsable: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  if (!motivo && alertas.length === 0) return null;
  const mostrarTodo = !colapsable || abierto;
  const preview = motivo || alertas[0] || '';
  return (
    <View style={styles.detalle}>
      {mostrarTodo ? (
        <>
          {motivo ? (
            <InstitutionalText role="caption" color="body">
              {motivo}
            </InstitutionalText>
          ) : null}
          {alertas.map((alerta, index) => (
            <InstitutionalText key={`${index}-${alerta}`} role="caption" color="muted">
              {alerta}
            </InstitutionalText>
          ))}
        </>
      ) : (
        <InstitutionalText role="caption" color="body" numberOfLines={2}>
          {preview}
        </InstitutionalText>
      )}
      {colapsable ? (
        <TouchableOpacity
          onPress={() => setAbierto((valor) => !valor)}
          accessibilityRole="button"
          accessibilityLabel={abierto ? 'Ocultar detalle de validación' : 'Ver detalle de validación'}
          hitSlop={8}
          style={styles.toggle}
        >
          {abierto ? (
            <ChevronUp size={14} color={institutionalTagIconColor('neutral')} strokeWidth={ICON_STROKE_WIDTH} />
          ) : (
            <ChevronDown size={14} color={institutionalTagIconColor('neutral')} strokeWidth={ICON_STROKE_WIDTH} />
          )}
          <InstitutionalText role="captionBold" color="primary">
            {abierto ? 'Ocultar' : 'Ver detalle'}
          </InstitutionalText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** Badge, motivo y alertas de una línea. Nada si el estado no viene. */
export const ValidacionRepuestoLinea = React.memo(function ValidacionRepuestoLinea({
  rep,
}: {
  rep: {
    validacion_estado?: string | null;
    validacion_motivo?: string | null;
    alertas?: unknown;
  };
}) {
  const vista = vistaValidacionLinea(rep);
  if (!vista) return null;
  return (
    <View style={styles.linea} accessibilityLabel={`Validación ${vista.etiqueta}`}>
      <BadgeEstado etiqueta={vista.etiqueta} tono={vista.tono} />
      <DetalleValidacion motivo={vista.motivo} alertas={vista.alertas} colapsable={vista.colapsable} />
    </View>
  );
});

/** Lista de alertas de la cotización. Nada si el campo falta o está vacío. */
export function RevisionCotizador({ alertas }: { alertas?: unknown }) {
  const filas = alertasValidacionVisibles(alertas);
  if (!filas.length) return null;
  return (
    <View style={styles.bloque} accessibilityLabel="Revisión del cotizador">
      <InstitutionalText role="captionBold">Revisión del cotizador</InstitutionalText>
      {filas.map((fila, index) => (
        <View key={`${fila.repuesto}-${fila.estado}-${index}`} style={styles.fila}>
          {fila.repuesto ? (
            <InstitutionalText role="captionBold">{fila.repuesto}</InstitutionalText>
          ) : null}
          {fila.tono && fila.etiqueta ? (
            <BadgeEstado etiqueta={fila.etiqueta} tono={fila.tono} />
          ) : null}
          <DetalleValidacion motivo={fila.motivo} alertas={fila.alertas} colapsable={fila.colapsable} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  linea: {
    gap: SPACING.fixed.xxs,
    alignItems: 'flex-start',
  },
  bloque: {
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.md,
  },
  fila: {
    gap: SPACING.fixed.xxs,
    alignItems: 'flex-start',
  },
  detalle: {
    gap: SPACING.fixed.xxs,
    alignSelf: 'stretch',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xxs,
  },
});
