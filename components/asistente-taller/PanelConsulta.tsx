import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { X } from 'lucide-react-native';
import { InstitutionalText } from '@/app/design-system/components';
import { COLORS, SHADOWS, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { ResultadoConsulta } from '@/utils/asistenteTaller/agenteConsulta';

const I = COLORS.institutional;

type Props = {
  resultado: ResultadoConsulta;
  onCerrar?: () => void;
};

export const PanelConsulta = React.memo(function PanelConsulta({ resultado, onCerrar }: Props) {
  return (
    <View style={styles.panel}>
      <View style={styles.cabeza}>
        <InstitutionalText role="h4" style={styles.titulo}>
          {resultado.titulo}
        </InstitutionalText>
        {onCerrar ? (
          <Pressable
            onPress={onCerrar}
            accessibilityRole="button"
            accessibilityLabel="Volver a los leads"
            hitSlop={8}
            style={styles.cerrar}
          >
            <X size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
          </Pressable>
        ) : null}
      </View>
      <InstitutionalText role="body">{resultado.resumen}</InstitutionalText>
      {resultado.filas.map((fila, index) => (
        <View key={`${fila.id}-${index}`} style={styles.fila}>
          <View style={styles.texto}>
            <InstitutionalText role="bodyBold">{fila.titulo}</InstitutionalText>
            {fila.detalle ? (
              <InstitutionalText role="caption">{fila.detalle}</InstitutionalText>
            ) : null}
          </View>
          {fila.meta ? (
            <InstitutionalText role="caption" color="muted">
              {fila.meta}
            </InstitutionalText>
          ) : null}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  panel: {
    gap: SPACING.fixed.sm,
  },
  cabeza: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  titulo: {
    flex: 1,
  },
  cerrar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.surfaceStrong,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: I.paper,
    ...SHADOWS.editorial,
  },
  texto: {
    flex: 1,
    gap: 2,
  },
});
