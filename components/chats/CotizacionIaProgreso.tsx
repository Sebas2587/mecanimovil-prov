import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HostPaperSection, HostSectionKicker } from '@/app/design-system/components';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { COLORS, SPACING } from '@/app/design-system/tokens';

const I = COLORS.institutional;

export type FaseCotizacionIa = 'generando' | 'precios';

const PASOS = [
  {
    id: 'vehiculo',
    titulo: 'Vehículo y servicio',
    detalle: 'Lee marca, modelo y el trabajo pedido',
  },
  {
    id: 'estructura',
    titulo: 'Mano de obra y piezas',
    detalle: 'Arma las líneas de la cotización',
  },
  {
    id: 'casas',
    titulo: 'Casas de repuestos',
    detalle: 'Consulta precios reales en Chile',
  },
  {
    id: 'cierre',
    titulo: 'Precios y tiendas',
    detalle: 'Asigna casa y monto a cada pieza',
  },
] as const;

function pasoDesdeFase(fase: FaseCotizacionIa, elapsedMs: number): number {
  if (fase === 'generando') {
    return elapsedMs < 700 ? 0 : 1;
  }
  if (elapsedMs < 4_000) return 2;
  return 3;
}

type Props = {
  fase: FaseCotizacionIa;
};

/** Línea de tiempo Host (riel negro) mientras la IA arma la cotización. */
export function CotizacionIaProgreso({ fase }: Props) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const started = Date.now();
    setElapsedMs(0);
    const t = setInterval(() => {
      setElapsedMs(Date.now() - started);
    }, 350);
    return () => clearInterval(t);
  }, [fase]);

  const activo = useMemo(() => pasoDesdeFase(fase, elapsedMs), [elapsedMs, fase]);

  return (
    <View style={styles.wrap}>
      <HostSectionKicker label="Armando la cotización" style={styles.kicker} />
      <InstitutionalText role="caption" color="muted" style={styles.lead}>
        La cotización se abre cuando hay precios y casa de repuestos. Este riel
        muestra en qué va la IA.
      </InstitutionalText>
      <HostPaperSection>
        {PASOS.map((paso, index) => {
          const done = index < activo;
          const current = index === activo;
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
                  {current ? paso.detalle : done ? 'Listo' : 'En espera'}
                </InstitutionalText>
              </View>
            </View>
          );
        })}
      </HostPaperSection>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.lg,
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
