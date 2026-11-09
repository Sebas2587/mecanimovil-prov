import React from 'react';
import { View } from 'react-native';
import { Card } from '@/app/design-system/components';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { ResumenMargenRepuestos } from '@/components/cotizacion/MargenRepuestos';
import { formatRangoClp } from '@/components/cotizacion/repuestoCerteza';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import type { TotalesMargenServidor } from '@/utils/margenRepuestos';
import { formatearTotalConocido } from '@/utils/totalesCotizacion';
import type { RepuestoCotizacion } from '@/services/cotizacionCanalService';
import { estilosPartes as styles } from '@/components/cotizacion/editor/estilosPartesEditor';
import { SeccionOpcional } from '@/components/cotizacion/SeccionOpcional';
import { cobraAlCliente } from '@/utils/decisionCotizador';

export function CotizacionEditorResumen({
  canon,
  repuestos,
  manoObra,
  descuentoLive,
  esEstimacionEmitida,
  bandaCliente,
  desgloseCanon,
  totalCanonTexto,
  servidor,
}: {
  canon: {
    costo_repuestos_clp: number | null;
    total_conocido_parcial_clp: number;
  };
  repuestos: RepuestoCotizacion[];
  manoObra: number;
  descuentoLive: { descuentoClp: number; etiqueta: string };
  esEstimacionEmitida: boolean;
  bandaCliente: { hayRango: boolean; min: number; max: number };
  desgloseCanon: { neto: number; iva: number } | null;
  totalCanonTexto: string;
  servidor?: TotalesMargenServidor | null;
}) {
  const cobrados = repuestos.filter(cobraAlCliente);
  return (
      <Card elevated padding="host" style={styles.summaryBox}>
        <View style={styles.summaryRow}>
          <InstitutionalText role="caption" color="muted">
            Repuestos cobrados
          </InstitutionalText>
          <InstitutionalText role="captionBold" color="ink">
            {canon.costo_repuestos_clp == null ? 'Incompleto' : formatearMontoCLP(canon.costo_repuestos_clp)}
          </InstitutionalText>
        </View>
        <SeccionOpcional title="Costo y ganancia" hint="Solo lo ve el taller">
          <ResumenMargenRepuestos repuestos={cobrados} servidor={servidor} />
        </SeccionOpcional>
        <View style={styles.summaryRow}>
          <InstitutionalText role="caption" color="muted">
            Mano de obra
          </InstitutionalText>
          <InstitutionalText role="captionBold" color="ink">
            {formatearMontoCLP(manoObra)}
          </InstitutionalText>
        </View>
        {descuentoLive.descuentoClp > 0 ? (
          <View style={styles.summaryRow}>
            <InstitutionalText role="caption" color="muted" style={styles.descuentoLabel}>
              {descuentoLive.etiqueta}
            </InstitutionalText>
            <InstitutionalText role="captionBold" color="primary">
              −{formatearMontoCLP(descuentoLive.descuentoClp)}
            </InstitutionalText>
          </View>
        ) : null}
        {esEstimacionEmitida && bandaCliente.hayRango ? null : desgloseCanon ? (
          <>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <InstitutionalText role="caption" color="muted">
                Neto
              </InstitutionalText>
              <InstitutionalText role="captionBold" color="ink">
                {formatearMontoCLP(desgloseCanon.neto)}
              </InstitutionalText>
            </View>
            <View style={styles.summaryRow}>
              <InstitutionalText role="caption" color="muted">
                IVA 19%
              </InstitutionalText>
              <InstitutionalText role="captionBold" color="ink">
                {formatearMontoCLP(desgloseCanon.iva)}
              </InstitutionalText>
            </View>
          </>
        ) : (
          <InstitutionalText role="caption" color="muted">
            Suma parcial {formatearTotalConocido(canon.total_conocido_parcial_clp)}. No es el total.
          </InstitutionalText>
        )}
        <View style={styles.summaryDivider} />
        {esEstimacionEmitida && bandaCliente.hayRango ? (
          <>
            <View style={styles.summaryRow}>
              <InstitutionalText role="h5" color="ink">
                Total estimado
              </InstitutionalText>
              <InstitutionalText
                role="numberDisplay"
                color="ink"
                style={styles.totalValue}
                accessibilityLabel={`Total estimado ${formatRangoClp(bandaCliente.min, bandaCliente.max)}`}
              >
                {formatRangoClp(bandaCliente.min, bandaCliente.max)}
              </InstitutionalText>
            </View>
            <View style={styles.summaryRow}>
              <InstitutionalText role="caption" color="muted">
                Total de trabajo (taller)
              </InstitutionalText>
              <InstitutionalText role="captionBold" color="ink">
                {totalCanonTexto}
              </InstitutionalText>
            </View>
            <InstitutionalText role="caption" color="muted">
              El cliente ve el rango. Los montos de línea no cambian.
            </InstitutionalText>
          </>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <InstitutionalText role="h5" color="ink">
                Total a pagar
              </InstitutionalText>
              <InstitutionalText
                role="numberDisplay"
                color="ink"
                style={styles.totalValue}
                accessibilityLabel={`Total a pagar ${totalCanonTexto}`}
              >
                {totalCanonTexto}
              </InstitutionalText>
            </View>
            {bandaCliente.hayRango ? (
              <InstitutionalText role="caption" color="muted">
                Si envías estimación, el cliente verá{' '}
                {formatRangoClp(bandaCliente.min, bandaCliente.max)}.
              </InstitutionalText>
            ) : (
              <InstitutionalText role="caption" color="muted">
                Los precios de línea ya incluyen IVA. El desglose neto/IVA es informativo.
              </InstitutionalText>
            )}
          </>
        )}
      </Card>
  );
}
