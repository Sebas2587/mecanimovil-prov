import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  HostMetricRow,
  HostPaperSection,
  HostSectionKicker,
  InstitutionalTag,
  InstitutionalText,
} from '@/app/design-system/components';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import type { CitaResumenEconomico } from '@/services/agendaProveedorService';

const I = COLORS.institutional;

export type CitaResumenEconomicoCardProps = {
  resumen: CitaResumenEconomico;
  /** Fallback si el API aún no trae resumen_economico */
  servicioNombre?: string;
  descripcion?: string;
  precioReferencia?: string | number | null;
};

function fuenteLabel(fuente: CitaResumenEconomico['fuente']): string | null {
  switch (fuente) {
    case 'cotizacion':
      return 'Desde cotización aceptada';
    case 'oferta':
      return 'Desde catálogo del taller';
    case 'referencia':
      return 'Precio de referencia';
    default:
      return null;
  }
}

/** Desglose completo de servicio agendado: ítems, valores e IVA. */
export function CitaResumenEconomicoCard({
  resumen,
  servicioNombre,
  descripcion,
  precioReferencia,
}: CitaResumenEconomicoCardProps) {
  const titulo = resumen.servicio_nombre || servicioNombre || 'Servicio';
  const notas = resumen.descripcion_problema || descripcion || '';
  const tagFuente = fuenteLabel(resumen.fuente);
  const tieneRepuestos = (resumen.repuestos?.length ?? 0) > 0;
  const tieneLineas = (resumen.servicios_lineas?.length ?? 0) > 0;
  const total =
    resumen.total_clp > 0
      ? resumen.total_clp
      : precioReferencia
        ? Number(precioReferencia) || 0
        : 0;

  return (
    <>
      <HostSectionKicker label="Servicios solicitados" />
      <HostPaperSection style={styles.paper}>
        <View style={styles.titleRow}>
          <InstitutionalText role="h5" numberOfLines={3} style={styles.titulo}>
            {titulo}
          </InstitutionalText>
          {total > 0 ? (
            <InstitutionalText role="numberDisplay" color="ink">
              {formatearMontoCLP(total)}
            </InstitutionalText>
          ) : null}
        </View>

        {tagFuente ? (
          <InstitutionalTag label={tagFuente} variant="neutral" size="sm" />
        ) : null}

        {tieneLineas ? (
          <View style={styles.block}>
            <InstitutionalText role="label" color="muted">
              DESGLOSE POR SERVICIO
            </InstitutionalText>
            {resumen.servicios_lineas!.map((line, idx) => (
              <HostMetricRow
                key={`${line.nombre}-${idx}`}
                label={line.nombre}
                value={line.monto_clp > 0 ? formatearMontoCLP(line.monto_clp) : '—'}
                last={idx === resumen.servicios_lineas!.length - 1 && !tieneRepuestos}
              />
            ))}
          </View>
        ) : null}

        {tieneRepuestos ? (
          <View style={styles.block}>
            <InstitutionalText role="label" color="muted">
              REPUESTOS
            </InstitutionalText>
            {resumen.repuestos!.map((rep, idx) => (
              <View key={`${rep.nombre}-${idx}`} style={styles.repRow}>
                <View style={styles.repTextCol}>
                  <InstitutionalText role="bodyBold" numberOfLines={2}>
                    {rep.nombre}
                  </InstitutionalText>
                  {(rep.marca_repuesto || rep.proveedor_nombre) ? (
                    <InstitutionalText role="caption" color="muted" numberOfLines={2}>
                      {[rep.marca_repuesto, rep.proveedor_nombre].filter(Boolean).join(' · ')}
                    </InstitutionalText>
                  ) : null}
                  <InstitutionalText role="small" color="muted">
                    x{rep.cantidad} · {formatearMontoCLP(rep.precio_unitario_clp)} c/u
                  </InstitutionalText>
                </View>
                <InstitutionalText role="captionBold" color="ink">
                  {formatearMontoCLP(rep.subtotal_clp)}
                </InstitutionalText>
              </View>
            ))}
          </View>
        ) : null}

        {(resumen.mano_obra_clp > 0 || resumen.costo_repuestos_clp > 0 || total > 0) ? (
          <View style={styles.block}>
            <InstitutionalText role="label" color="muted">
              VALORES
            </InstitutionalText>
            {resumen.mano_obra_clp > 0 ? (
              <HostMetricRow
                label="Mano de obra"
                value={formatearMontoCLP(resumen.mano_obra_clp)}
              />
            ) : null}
            {resumen.costo_repuestos_clp > 0 ? (
              <HostMetricRow
                label="Repuestos"
                value={formatearMontoCLP(resumen.costo_repuestos_clp)}
              />
            ) : null}
            {resumen.neto_clp > 0 ? (
              <HostMetricRow label="Neto" value={formatearMontoCLP(resumen.neto_clp)} />
            ) : null}
            {resumen.iva_clp > 0 ? (
              <HostMetricRow label="IVA 19%" value={formatearMontoCLP(resumen.iva_clp)} />
            ) : null}
            {total > 0 ? (
              <HostMetricRow
                label="Total a pagar"
                value={formatearMontoCLP(total)}
                last
              />
            ) : null}
            {resumen.precios_iva_incluido ? (
              <InstitutionalText role="small" color="muted" style={styles.ivaHint}>
                Los precios de línea incluyen IVA. El desglose neto/IVA es informativo.
              </InstitutionalText>
            ) : null}
          </View>
        ) : null}

        {notas ? (
          <View style={styles.block}>
            <InstitutionalText role="label" color="muted">
              NOTAS DEL SERVICIO
            </InstitutionalText>
            <InstitutionalText role="caption" color="body">
              {notas}
            </InstitutionalText>
          </View>
        ) : null}

        {resumen.notas_internas ? (
          <View style={styles.block}>
            <InstitutionalText role="label" color="muted">
              NOTAS DE COTIZACIÓN
            </InstitutionalText>
            <InstitutionalText role="caption" color="body">
              {resumen.notas_internas}
            </InstitutionalText>
          </View>
        ) : null}
      </HostPaperSection>
    </>
  );
}

const styles = StyleSheet.create({
  paper: {
    gap: SPACING.fixed.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
  titulo: {
    flex: 1,
    minWidth: 0,
  },
  block: {
    gap: SPACING.fixed.xs,
    paddingTop: SPACING.fixed.xxs,
  },
  repRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xxs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  repTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  ivaHint: {
    marginTop: SPACING.fixed.xxs,
    lineHeight: 16,
  },
});

export default CitaResumenEconomicoCard;
