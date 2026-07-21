import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import liquidacionProveedorService, {
  type LiquidacionProveedor,
  type LiquidacionResumen,
} from '@/services/liquidacionProveedorService';
import {
  HostMetricRow,
  HostPaperSection,
  HostSectionKicker,
  hostScreenStyles,
} from '@/app/design-system/components';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

const I = COLORS.institutional;

export function FinanzasLiquidacionSection() {
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState<LiquidacionResumen | null>(null);
  const [items, setItems] = useState<LiquidacionProveedor[]>([]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [resumenData, listado] = await Promise.all([
        liquidacionProveedorService.resumen(),
        liquidacionProveedorService.listar(),
      ]);
      setResumen(resumenData);
      setItems(listado.slice(0, 5));
    } catch {
      setResumen(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={I.primary} />
      </View>
    );
  }

  if (!resumen) return null;

  const pendientesLabel =
    resumen.cantidad_pendiente === 1
      ? '1 liquidación pendiente'
      : `${resumen.cantidad_pendiente} liquidaciones pendientes`;

  return (
    <View style={[hostScreenStyles.stretch, styles.section]}>
      <HostSectionKicker label="Finanzas del taller" />
      <HostPaperSection>
        <HostMetricRow
          label="Por cobrar"
          value={formatearMontoCLP(resumen.saldo_pendiente_clp)}
        />
        <HostMetricRow
          label="Liquidado"
          value={formatearMontoCLP(resumen.total_liquidado_clp)}
        />
        <HostMetricRow label="Estado" value={pendientesLabel} last />
      </HostPaperSection>

      {items.length > 0 ? (
        <>
          <HostSectionKicker label="Últimas liquidaciones" />
          <HostPaperSection>
            {items.map((item, index) => (
              <HostMetricRow
                key={item.id}
                label={item.estado_display}
                value={formatearMontoCLP(item.monto_neto_proveedor)}
                meta={`Cliente ${formatearMontoCLP(item.monto_cobrado_cliente)} · Comisión ${formatearMontoCLP(item.comision_plataforma)}`}
                last={index === items.length - 1}
              />
            ))}
          </HostPaperSection>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    alignSelf: 'stretch',
    width: '100%',
    marginBottom: SPACING.md,
  },
  loading: {
    paddingVertical: SPACING.fixed.lg,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
});

export default FinanzasLiquidacionSection;
