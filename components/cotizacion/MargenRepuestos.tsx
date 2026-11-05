import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SPACING } from '@/app/design-system/tokens';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import {
  margenLineaRepuesto,
  resumenMargenRepuestos,
  textoMargenClp,
  textoMargenPct,
  type LineaMargenInput,
} from '@/utils/margenRepuestos';

type ColorMargen = 'semanticUp' | 'semanticDown' | 'muted';

function colorDe(valor: number | null): ColorMargen {
  if (valor == null || valor === 0) return 'muted';
  return valor > 0 ? 'semanticUp' : 'semanticDown';
}

/** Costo, cobrado y margen de una línea. Usa el precio que el taller está editando. */
export const MargenRepuestoLinea = React.memo(function MargenRepuestoLinea({
  rep,
}: {
  rep: LineaMargenInput;
}) {
  const m = margenLineaRepuesto(rep);
  const pct = textoMargenPct(m.margenPct);
  return (
    <View style={styles.row} accessibilityLabel="Costo, cobrado y margen">
      <InstitutionalText role="caption" color="muted">
        Costo {m.costoLinea == null ? 'sin costo' : textoMargenClp(m.costoLinea)}
      </InstitutionalText>
      <InstitutionalText role="caption" color="muted">
        Cobrado {textoMargenClp(m.cobradoLinea)}
      </InstitutionalText>
      <InstitutionalText role="caption" color={colorDe(m.margenClp)}>
        Margen {m.margenClp == null ? 'sin costo' : textoMargenClp(m.margenClp)}
        {pct ? ` ${pct}` : ''}
      </InstitutionalText>
    </View>
  );
});

/** Totales de repuestos. Se recalcula con las líneas actuales del editor. */
export function ResumenMargenRepuestos({ repuestos }: { repuestos: LineaMargenInput[] }) {
  if (!repuestos.length) return null;
  const r = resumenMargenRepuestos(repuestos);
  const pct = textoMargenPct(r.margenPct);
  return (
    <View style={styles.resumen} accessibilityLabel="Margen de repuestos">
      <Fila label="Costo repuestos" valor={r.costoTotal == null ? 'sin costo' : textoMargenClp(r.costoTotal)} />
      <Fila label="Cobrado repuestos" valor={textoMargenClp(r.cobradoTotal)} />
      <Fila
        label="Ganancia repuestos"
        valor={r.ganancia == null ? 'sin costo' : `${textoMargenClp(r.ganancia)}${pct ? ` ${pct}` : ''}`}
        color={colorDe(r.ganancia)}
      />
      {r.haySinCosto && r.ganancia != null ? (
        <InstitutionalText role="caption" color="muted">
          Hay repuestos sin costo. La ganancia no los incluye.
        </InstitutionalText>
      ) : null}
    </View>
  );
}

function Fila({
  label,
  valor,
  color = 'ink',
}: {
  label: string;
  valor: string;
  color?: ColorMargen | 'ink';
}) {
  return (
    <View style={styles.fila}>
      <InstitutionalText role="caption" color="muted">
        {label}
      </InstitutionalText>
      <InstitutionalText role="captionBold" color={color}>
        {valor}
      </InstitutionalText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
  },
  resumen: {
    gap: SPACING.fixed.xxs,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
});
