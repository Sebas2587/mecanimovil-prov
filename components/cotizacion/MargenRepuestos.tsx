import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SPACING } from '@/app/design-system/tokens';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import {
  margenLineaRepuesto,
  resumenMargenRepuestos,
  TEXTO_SIN_COSTO,
  textoCobradoClp,
  textoMargenClp,
  textoMargenPct,
  type LineaMargenInput,
  type TotalesMargenServidor,
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
    <View style={styles.row} testID="economia-repuesto-linea" accessibilityLabel="Costo final, cobrado y ganancia">
      <InstitutionalText role="caption" color="muted">
        Costo final {m.costoLinea == null ? TEXTO_SIN_COSTO : textoMargenClp(m.costoLinea)}
      </InstitutionalText>
      <InstitutionalText role="caption" color="muted">
        Cobrado {textoCobradoClp(m.cobradoLinea)}
      </InstitutionalText>
      <InstitutionalText role="caption" color={colorDe(m.margenClp)}>
        Ganancia {m.margenClp == null ? (m.cobradoLinea == null ? textoCobradoClp(null) : TEXTO_SIN_COSTO) : textoMargenClp(m.margenClp)}
        {pct ? ` ${pct}` : ''}
      </InstitutionalText>
    </View>
  );
});

/** Totales de repuestos. Se recalcula con las líneas actuales del editor. */
export function ResumenMargenRepuestos({
  repuestos,
  servidor,
}: {
  repuestos: LineaMargenInput[];
  servidor?: TotalesMargenServidor | null;
}) {
  if (!repuestos.length) return null;
  const r = resumenMargenRepuestos(repuestos);
  const usarServidor = !r.haySinCosto && r.cobradoTotal != null && r.ganancia == null && servidor?.ganancia_repuestos_clp != null;
  const costoTotal = usarServidor ? servidor?.costo_total_repuestos_clp ?? null : r.costoTotal;
  const cobradoTotal = usarServidor && servidor?.cobrado_total_repuestos_clp != null
    ? servidor.cobrado_total_repuestos_clp
    : r.cobradoTotal;
  const ganancia = usarServidor ? servidor?.ganancia_repuestos_clp ?? null : r.ganancia;
  const pct = textoMargenPct(usarServidor ? servidor?.margen_repuestos_pct ?? null : r.margenPct);
  return (
    <View style={styles.resumen} testID="economia-repuestos-totales" accessibilityLabel="Costo final, cobrado y ganancia de repuestos">
      <Fila label="Costo final repuestos" valor={costoTotal == null ? TEXTO_SIN_COSTO : textoMargenClp(costoTotal)} />
      <Fila label="Cobrado repuestos" valor={textoCobradoClp(cobradoTotal)} />
      <Fila
        label="Ganancia repuestos"
        valor={ganancia == null
          ? (cobradoTotal == null ? textoCobradoClp(null) : TEXTO_SIN_COSTO)
          : `${textoMargenClp(ganancia)}${pct ? ` ${pct}` : ''}`}
        color={colorDe(ganancia)}
      />
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
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
});
