import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card } from '@/app/design-system/components';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { SPACING } from '@/app/design-system/tokens';
import { ClpMoneyInput } from '@/components/forms/ClpMoneyInput';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import type { CotizacionCanal } from '@/services/cotizacionCanalService';
import cotizacionCanalService from '@/services/cotizacionCanalService';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { showAlert } from '@/utils/platformAlert';
import { MIS_PRECIOS_REPUESTOS_KEY } from '@/hooks/useProveedoresRepuestosQuery';
import { useQueryClient } from '@tanstack/react-query';

type Props = {
  cotizacion: CotizacionCanal;
};

export function RegistrarCompraCard({ cotizacion }: Props) {
  const qc = useQueryClient();
  const reps = useMemo(
    () => (cotizacion.repuestos ?? []).filter((r) => (r.nombre || '').trim()),
    [cotizacion.repuestos],
  );
  const [montos, setMontos] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const r of reps) {
      if (r.id) init[String(r.id)] = r.precio_unitario_clp || 0;
    }
    return init;
  });
  const [proveedorNombre, setProveedorNombre] = useState('');
  const [busy, setBusy] = useState(false);

  const setMonto = useCallback((id: string, value: number) => {
    setMontos((prev) => ({ ...prev, [id]: value }));
  }, []);

  const guardar = useCallback(async () => {
    if (!cotizacion.id) return;
    const items = reps
      .filter((r) => r.id && (montos[String(r.id)] || 0) > 0)
      .map((r) => ({
        repuesto_id: String(r.id),
        precio_clp: montos[String(r.id)],
        proveedor_nombre: proveedorNombre.trim() || undefined,
      }));
    if (!items.length) {
      showAlert('Falta el monto', 'Ingresa al menos un precio pagado.');
      return;
    }
    setBusy(true);
    try {
      const res = await cotizacionCanalService.registrarCompraRepuestos(cotizacion.id, items);
      qc.invalidateQueries({ queryKey: [MIS_PRECIOS_REPUESTOS_KEY] });
      showAlert('Compra registrada', `Se guardaron ${res.creados} precios propios.`);
    } catch {
      showAlert('No se pudo registrar', 'Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }, [cotizacion.id, montos, proveedorNombre, qc, reps]);

  if (!reps.length) return null;

  return (
    <Card elevated padding="host" style={styles.card}>
      <InstitutionalText role="h5">Registrar compra</InstitutionalText>
      <InstitutionalText role="caption" color="muted">
        El precio que pagaste queda para la próxima cotización de esta pieza.
      </InstitutionalText>
      {reps.map((rep) => {
        const id = String(rep.id || '');
        if (!id) return null;
        return (
          <View key={id} style={styles.row}>
            <InstitutionalText role="body">{rep.nombre}</InstitutionalText>
            {rep.especificacion ? (
              <InstitutionalText role="caption" color="muted">{rep.especificacion}</InstitutionalText>
            ) : null}
            <InstitutionalText role="caption" color="muted">
              Cotizado {formatearMontoCLP(rep.precio_unitario_clp || 0)}
            </InstitutionalText>
            <ClpMoneyInput
              value={montos[id] || 0}
              onChangeValue={(next) => setMonto(id, next)}
              editable
            />
          </View>
        );
      })}
      <InstitutionalField
        label="Casa de repuestos"
        value={proveedorNombre}
        onChangeText={setProveedorNombre}
        placeholder="Refax Maipú"
      />
      <InstitutionalButton
        label="Guardar precios pagados"
        onPress={() => void guardar()}
        loading={busy}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: SPACING.fixed.sm },
  row: { gap: SPACING.fixed.xs, paddingBottom: SPACING.fixed.sm },
});
