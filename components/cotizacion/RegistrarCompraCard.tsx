import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { BORDERS, COLORS, SPACING } from '@/app/design-system/tokens';
import { institutionalInputStyles } from '@/app/design-system/styles/institutionalInputs';
import { ClpMoneyInput } from '@/components/forms/ClpMoneyInput';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import { TallerPildora } from '@/components/taller/TallerPildora';
import {
  MIS_PRECIOS_REPUESTOS_KEY,
  useProveedoresRepuestosQuery,
} from '@/hooks/useProveedoresRepuestosQuery';
import { COTIZACION_CANAL_DETALLE_QUERY_KEY } from '@/hooks/useCotizacionCanalDetalleQuery';
import type { CotizacionCanal } from '@/services/cotizacionCanalService';
import cotizacionCanalService from '@/services/cotizacionCanalService';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { showAlert } from '@/utils/platformAlert';
import { useQueryClient } from '@tanstack/react-query';

const I = COLORS.institutional;

type Props = {
  cotizacion: CotizacionCanal;
};

function mensajeError(err: unknown): string {
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
  const detail = data?.detail ?? data?.error ?? data?.non_field_errors;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail) && typeof detail[0] === 'string') return detail[0];
  return 'Revisa los montos e inténtalo de nuevo.';
}

export function RegistrarCompraCard({ cotizacion }: Props) {
  const qc = useQueryClient();
  const casas = useProveedoresRepuestosQuery();
  const reps = useMemo(
    () => (cotizacion.repuestos ?? []).filter((r) => (r.nombre || '').trim() && r.id),
    [cotizacion.repuestos],
  );
  const [montos, setMontos] = useState<Record<string, number>>({});
  const [casaId, setCasaId] = useState<number | null>(null);
  const [proveedorNombre, setProveedorNombre] = useState('');
  const [busy, setBusy] = useState(false);
  const [guardado, setGuardado] = useState(Boolean(cotizacion.metadata?.compra_repuestos_registrada));

  const setMonto = useCallback((id: string, value: number) => {
    setMontos((prev) => ({ ...prev, [id]: value }));
  }, []);

  const guardar = useCallback(async () => {
    if (!cotizacion.id) return;
    const items = reps
      .filter((r) => (montos[String(r.id)] || 0) > 0)
      .map((r) => ({
        repuesto_id: String(r.id),
        precio_clp: montos[String(r.id)],
        proveedor_id: casaId,
        proveedor_nombre: casaId ? undefined : proveedorNombre.trim() || undefined,
      }));
    if (!items.length) {
      showAlert('Falta el monto', 'Escribe lo que pagaste en al menos una pieza.');
      return;
    }
    setBusy(true);
    try {
      const res = await cotizacionCanalService.registrarCompraRepuestos(cotizacion.id, items);
      await Promise.all([
        qc.invalidateQueries({ queryKey: [MIS_PRECIOS_REPUESTOS_KEY] }),
        qc.invalidateQueries({ queryKey: [COTIZACION_CANAL_DETALLE_QUERY_KEY, cotizacion.id] }),
      ]);
      setGuardado(true);
      setMontos({});
      showAlert(
        'Compra registrada',
        res.creados === 1
          ? 'Ese precio queda para la próxima cotización de la pieza.'
          : `Quedaron ${res.creados} precios para las próximas cotizaciones.`,
      );
    } catch (err) {
      showAlert('No se pudo registrar', mensajeError(err));
    } finally {
      setBusy(false);
    }
  }, [casaId, cotizacion.id, montos, proveedorNombre, qc, reps]);

  if (!reps.length) return null;

  const casasActivas = (casas.data ?? []).filter((casa) => casa.activo !== false);

  return (
    <View style={styles.card}>
      <InstitutionalText role="h5">Registrar compra</InstitutionalText>
      <InstitutionalText role="caption" color="muted">
        Anota lo que pagaste. No cambia el precio que ya vio el cliente; sirve para la próxima cotización de la misma pieza.
      </InstitutionalText>
      {guardado ? (
        <InstitutionalText role="caption" color="body">
          Ya hay una compra guardada en este caso. Puedes registrar otro monto si compraste de nuevo.
        </InstitutionalText>
      ) : null}
      {reps.map((rep) => {
        const id = String(rep.id);
        return (
          <View key={id} style={styles.fila}>
            <InstitutionalText role="bodyBold">{rep.nombre}</InstitutionalText>
            {rep.especificacion ? (
              <InstitutionalText role="caption" color="muted">{rep.especificacion}</InstitutionalText>
            ) : null}
            <InstitutionalText role="caption" color="muted">
              Cotizado al cliente {formatearMontoCLP(rep.precio_unitario_clp || 0)}
            </InstitutionalText>
            <ClpMoneyInput
              value={montos[id] || 0}
              onChangeValue={(next) => setMonto(id, next)}
              editable={!busy}
              live
              placeholder="Lo que pagaste"
            />
          </View>
        );
      })}
      {casasActivas.length > 0 ? (
        <View style={styles.casas}>
          <InstitutionalText role="captionBold" color="muted">Casa de repuestos</InstitutionalText>
          <View style={styles.chips}>
            {casasActivas.map((casa) => {
              const activa = casaId === casa.id;
              return (
                <TouchableOpacity
                  key={casa.id}
                  style={[styles.chip, activa && styles.chipOn]}
                  onPress={() => {
                    setCasaId(activa ? null : casa.id);
                    if (!activa) setProveedorNombre('');
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activa }}
                >
                  <InstitutionalText role="captionBold" color={activa ? I.onDark : I.ink}>
                    {casa.nombre}
                  </InstitutionalText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}
      {casaId == null ? (
        <InstitutionalField
          label={casasActivas.length > 0 ? 'Otra casa' : 'Casa de repuestos'}
          value={proveedorNombre}
          onChangeText={setProveedorNombre}
          placeholder="Nombre del local"
          inputStyle={institutionalInputStyles.inputSheet}
        />
      ) : null}
      <TallerPildora
        label={busy ? 'Guardando…' : 'Guardar precios pagados'}
        tono="coral"
        forma="hoja"
        onPress={() => void guardar()}
        disabled={busy}
        loading={busy}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: SPACING.fixed.sm,
    padding: SPACING.fixed.md,
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.xl,
    backgroundColor: I.paper,
  },
  fila: {
    gap: SPACING.fixed.xxs,
    paddingTop: SPACING.fixed.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  casas: {
    gap: SPACING.fixed.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: I.paper,
  },
  chipOn: {
    backgroundColor: I.ink,
    borderColor: I.ink,
  },
});
