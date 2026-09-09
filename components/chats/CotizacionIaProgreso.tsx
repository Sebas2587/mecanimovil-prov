import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HostMetricRow, HostPaperSection, HostSectionKicker } from '@/app/design-system/components';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import type { ProgresoBusquedaWeb } from '@/services/cotizacionCanalService';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

const I = COLORS.institutional;

export type FaseCotizacionIa = 'generando' | 'precios' | 'listo';

const PASOS = [
  {
    id: 'vehiculo',
    titulo: 'Vehículo y servicio',
    detalle: 'Cruza marca, modelo y el trabajo pedido',
  },
  {
    id: 'estructura',
    titulo: 'Mano de obra y piezas',
    detalle: 'Arma las líneas que se van a cotizar',
  },
  {
    id: 'casas',
    titulo: 'Casas de repuestos',
    detalle: 'Catálogo del taller, historial y tiendas de Chile',
  },
  {
    id: 'cierre',
    titulo: 'Precios y tiendas',
    detalle: 'Asigna casa y monto a cada pieza',
  },
] as const;

function pasoDesdeFase(
  fase: FaseCotizacionIa,
  elapsedMs: number,
  progreso?: ProgresoBusquedaWeb | null,
): number {
  if (fase === 'listo') return PASOS.length;
  if (fase === 'generando') {
    return elapsedMs < 700 ? 0 : 1;
  }
  const paso = String(progreso?.paso || '');
  if (paso === 'listo' || paso === 'asignar') return 3;
  if (paso === 'web' || paso === 'casas') return 2;
  if (elapsedMs < 4_000) return 2;
  return 3;
}

function detallePaso(
  index: number,
  current: boolean,
  progreso?: ProgresoBusquedaWeb | null,
): string {
  if (!current) return '';
  if ((index === 2 || index === 3) && progreso?.detalle) {
    return progreso.detalle;
  }
  return PASOS[index].detalle;
}

function valorLinea(linea: NonNullable<ProgresoBusquedaWeb['lineas']>[number]): string {
  if (linea.estado === 'ok' && linea.precio_clp) {
    return formatearMontoCLP(linea.precio_clp);
  }
  if (linea.estado === 'sin_precio') return 'Sin ficha';
  return 'Buscando…';
}

type Props = {
  fase: FaseCotizacionIa;
  progreso?: ProgresoBusquedaWeb | null;
};

/** Línea de tiempo Host (riel negro) mientras la IA arma la cotización. */
export function CotizacionIaProgreso({ fase, progreso }: Props) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const started = Date.now();
    setElapsedMs(0);
    const t = setInterval(() => {
      setElapsedMs(Date.now() - started);
    }, 350);
    return () => clearInterval(t);
  }, [fase]);

  const activo = useMemo(
    () => pasoDesdeFase(fase, elapsedMs, progreso),
    [elapsedMs, fase, progreso],
  );
  const completo = fase === 'listo' || activo >= PASOS.length;
  const fuentes = (progreso?.fuentes || []).filter(Boolean);
  const lineas = (progreso?.lineas || []).filter((l) => l?.nombre);
  const mostrarLineas = !completo && (fase === 'precios' || Boolean(lineas.length));

  return (
    <View style={styles.wrap}>
      <HostSectionKicker
        label={completo ? 'Cotización lista' : 'Armando la cotización'}
        style={styles.kicker}
      />
      <InstitutionalText role="caption" color="muted" style={styles.lead}>
        {completo
          ? 'Los cuatro pasos quedaron listos: vehículo, líneas, casas y precios.'
          : (progreso?.detalle
            || 'La cotización se abre cuando el riel termina. Vas a ver de qué casa sale cada precio.')}
      </InstitutionalText>
      <HostPaperSection>
        {PASOS.map((paso, index) => {
          const done = completo || index < activo;
          const current = !completo && index === activo;
          const last = index === PASOS.length - 1;
          return (
            <View key={paso.id} style={styles.row}>
              <View style={styles.rail}>
                <View
                  style={[
                    styles.dot,
                    (done || current) ? styles.dotInk : styles.dotMuted,
                    current && styles.dotCurrent,
                  ]}
                />
                {last ? null : (
                  <View style={[styles.stem, done ? styles.stemInk : styles.stemMuted]} />
                )}
              </View>
              <View style={[styles.body, !last && styles.bodyGap]}>
                <InstitutionalText
                  role="captionBold"
                  color={done || current ? 'ink' : 'muted'}
                >
                  {paso.titulo}
                </InstitutionalText>
                <InstitutionalText role="caption" color="muted">
                  {current ? detallePaso(index, current, progreso) : done ? 'Listo' : 'En espera'}
                </InstitutionalText>
                {current && fuentes.length ? (
                  <InstitutionalText role="caption" color="muted">
                    Fuentes: {fuentes.join(' · ')}
                  </InstitutionalText>
                ) : null}
              </View>
            </View>
          );
        })}
      </HostPaperSection>
      {mostrarLineas && lineas.length ? (
        <HostPaperSection>
          {lineas.slice(0, 8).map((linea, index) => (
            <HostMetricRow
              key={`${linea.nombre}-${index}`}
              label={linea.nombre}
              meta={linea.fuente || (linea.estado === 'buscando' ? 'Consultando tiendas .cl' : undefined)}
              value={valorLinea(linea)}
              last={index === Math.min(lineas.length, 8) - 1 && lineas.length <= 8}
            />
          ))}
          {lineas.length > 8 ? (
            <InstitutionalText role="caption" color="muted">
              +{lineas.length - 8} piezas más
            </InstitutionalText>
          ) : null}
        </HostPaperSection>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.sm,
  },
  kicker: {
    marginTop: 0,
    marginBottom: 0,
  },
  lead: {
    maxWidth: 420,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.fixed.sm,
  },
  rail: {
    width: 12,
    alignItems: 'center',
    paddingTop: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotInk: {
    backgroundColor: I.ink,
  },
  dotMuted: {
    backgroundColor: I.hairline,
  },
  dotCurrent: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stem: {
    flex: 1,
    width: 1.5,
    marginTop: 4,
    minHeight: 18,
  },
  stemInk: {
    backgroundColor: I.ink,
  },
  stemMuted: {
    backgroundColor: I.hairline,
  },
  body: {
    flex: 1,
    minWidth: 0,
    paddingBottom: SPACING.fixed.md,
    gap: 2,
  },
  bodyGap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    marginBottom: SPACING.fixed.sm,
  },
});

export default CotizacionIaProgreso;
