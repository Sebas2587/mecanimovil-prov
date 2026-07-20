import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import liquidacionProveedorService, {
  type LiquidacionProveedor,
  type LiquidacionResumen,
} from '@/services/liquidacionProveedorService';
import { Card } from '@/design-system/components/Card';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

const I = COLORS.institutional;

function estadoVariant(estado: LiquidacionProveedor['estado']) {
  switch (estado) {
    case 'pagada':
      return 'success' as const;
    case 'pendiente':
      return 'warning' as const;
    case 'procesada':
      return 'primary' as const;
    default:
      return 'neutral' as const;
  }
}

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

  return (
    <View style={styles.section}>
      <InstitutionalText role="h5" style={styles.title}>
        Finanzas del taller
      </InstitutionalText>
      <Card elevated style={styles.resumenCard}>
        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <InstitutionalText role="caption" color="muted">
              Por cobrar
            </InstitutionalText>
            <InstitutionalText role="h4">
              {formatearMontoCLP(resumen.saldo_pendiente_clp)}
            </InstitutionalText>
          </View>
          <View style={styles.metric}>
            <InstitutionalText role="caption" color="muted">
              Liquidado
            </InstitutionalText>
            <InstitutionalText role="h4">
              {formatearMontoCLP(resumen.total_liquidado_clp)}
            </InstitutionalText>
          </View>
        </View>
        <InstitutionalText role="small" color="muted">
          {resumen.cantidad_pendiente} liquidación{resumen.cantidad_pendiente === 1 ? '' : 'es'} pendiente
          {resumen.cantidad_pendiente === 1 ? '' : 's'}
        </InstitutionalText>
      </Card>

      {items.map((item) => (
        <Card key={item.id} style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <InstitutionalText role="body">
              {formatearMontoCLP(item.monto_neto_proveedor)}
            </InstitutionalText>
            <InstitutionalTag variant={estadoVariant(item.estado)} label={item.estado_display} />
          </View>
          <InstitutionalText role="caption" color="muted">
            Cobrado al cliente: {formatearMontoCLP(item.monto_cobrado_cliente)} · Comisión:{' '}
            {formatearMontoCLP(item.comision_plataforma)}
          </InstitutionalText>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: SPACING.fixed.sm },
  title: { marginBottom: SPACING.fixed.xxs },
  loading: { paddingVertical: SPACING.fixed.lg, alignItems: 'center' },
  resumenCard: { gap: SPACING.fixed.sm },
  metricRow: { flexDirection: 'row', gap: SPACING.fixed.lg },
  metric: { flex: 1, gap: SPACING.fixed.xxs },
  itemCard: { gap: SPACING.fixed.xs },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
});

export default FinanzasLiquidacionSection;
