import React, { useCallback, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { BottomSheet } from '@/app/design-system/components/BottomSheet';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { ClpMoneyInput } from '@/components/forms/ClpMoneyInput';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import type { ProveedorRepuestos } from '@/services/proveedorRepuestosService';
import type { CotizacionCanal, RepuestoCotizacion } from '@/services/cotizacionCanalService';
import {
  formatRangoClp,
  labelFamilia,
  opcionesFamilia,
} from '@/components/cotizacion/repuestoCerteza';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

const I = COLORS.institutional;

type Props = {
  visible: boolean;
  onClose: () => void;
  cotizacion: CotizacionCanal;
  repuesto: RepuestoCotizacion | null;
  proveedores: ProveedorRepuestos[];
  onConfirmar: (payload: {
    precio_clp: number;
    proveedor_id?: number | null;
    proveedor_nombre?: string;
    especificacion?: string;
  }) => void;
  onAsumir: () => void;
  onEspecificacion?: (spec: string) => void;
  loading?: boolean;
};

export function RepuestoPrecioSheet({
  visible,
  onClose,
  cotizacion,
  repuesto,
  proveedores,
  onConfirmar,
  onAsumir,
  onEspecificacion,
  loading,
}: Props) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [monto, setMonto] = useState(0);
  const [proveedorId, setProveedorId] = useState<number | null>(null);
  const [proveedorNombre, setProveedorNombre] = useState('');

  const opciones = useMemo(() => (repuesto ? opcionesFamilia(repuesto) : []), [repuesto]);
  const rango = formatRangoClp(repuesto?.precio_min_clp, repuesto?.precio_max_clp);
  const techo = Math.round(Number(repuesto?.precio_max_clp || repuesto?.precio_unitario_clp || 0));
  const vehiculo = [cotizacion.vehiculo_marca, cotizacion.vehiculo_modelo, cotizacion.vehiculo_anio]
    .filter(Boolean)
    .join(' ');

  const handleSpec = useCallback((spec: string) => {
    onEspecificacion?.(spec);
  }, [onEspecificacion]);

  const handleConfirmar = useCallback(() => {
    if (monto <= 0) return;
    const elegido = proveedores.find((p) => p.id === proveedorId);
    onConfirmar({
      precio_clp: monto,
      proveedor_id: proveedorId,
      proveedor_nombre: elegido?.nombre || proveedorNombre,
      especificacion: repuesto?.especificacion,
    });
  }, [monto, onConfirmar, proveedorId, proveedorNombre, proveedores, repuesto?.especificacion]);

  const abrirWhatsapp = useCallback(() => {
    const elegido = proveedores.find((p) => p.id === proveedorId) || proveedores.find((p) => p.es_preferido);
    const tel = (elegido?.telefono || '').replace(/\D/g, '');
    const texto = [
      `Hola, necesito precio para ${vehiculo}${cotizacion.vehiculo_patente ? ` (${cotizacion.vehiculo_patente})` : ''}:`,
      `• ${repuesto?.cantidad || 1} × ${repuesto?.nombre || 'Repuesto'}${repuesto?.especificacion ? ` — ${repuesto.especificacion}` : ''}`,
      '¿Tienen stock y a qué precio con IVA?',
    ].join('\n');
    const url = tel
      ? `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;
    Linking.openURL(url).catch(() => undefined);
  }, [cotizacion.vehiculo_patente, proveedorId, proveedores, repuesto, vehiculo]);

  if (!repuesto) return null;

  return (
    <BottomSheet visible={visible} onClose={onClose} stickyFooter>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        <InstitutionalText role="h3">{repuesto.nombre}</InstitutionalText>
        <InstitutionalText role="caption" color="muted">{vehiculo}</InstitutionalText>

        {opciones.length ? (
          <View style={styles.block}>
            <InstitutionalText role="label">{labelFamilia(repuesto)}</InstitutionalText>
            <View style={styles.chips}>
              {opciones.map((op) => {
                const active = (repuesto.especificacion || '').toLowerCase() === op.toLowerCase();
                return (
                  <TouchableOpacity
                    key={op}
                    onPress={() => handleSpec(op)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <InstitutionalText role="caption" color={active ? 'ink' : 'muted'}>
                      {op}
                    </InstitutionalText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {rango ? (
          <View style={styles.block}>
            <InstitutionalText role="label">Rango de mercado</InstitutionalText>
            <InstitutionalText role="body" color="ink">{rango}</InstitutionalText>
            {techo > 0 ? (
              <InstitutionalText role="caption" color="muted">
                Se cobra {formatearMontoCLP(techo)}
              </InstitutionalText>
            ) : null}
            {(repuesto.factor_mercado || 0) > 1 ? (
              <InstitutionalText role="caption" color="muted">
                Ajuste de mostrador ×{Number(repuesto.factor_mercado).toFixed(1)}.
                {repuesto.precio_marketplace_clp
                  ? ` Sin ajuste: ${formatearMontoCLP(repuesto.precio_marketplace_clp)}.`
                  : ''}
              </InstitutionalText>
            ) : null}
          </View>
        ) : null}

        {repuesto.url_producto ? (
          <TouchableOpacity onPress={() => Linking.openURL(repuesto.url_producto || '').catch(() => undefined)}>
            <InstitutionalText role="caption" color="ink">
              Ver fuente en {repuesto.proveedor_nombre || 'la tienda'}
            </InstitutionalText>
          </TouchableOpacity>
        ) : null}

        {mostrarForm ? (
          <View style={styles.block}>
            <InstitutionalText role="label">Monto pagado (IVA incl.)</InstitutionalText>
            <ClpMoneyInput value={monto} onChangeValue={setMonto} editable />
            <InstitutionalText role="label">Casa de repuestos</InstitutionalText>
            {proveedores.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.provRow, proveedorId === p.id && styles.provRowActive]}
                onPress={() => {
                  setProveedorId(p.id);
                  setProveedorNombre(p.nombre);
                }}
              >
                <InstitutionalText role="body">{p.nombre}</InstitutionalText>
                {p.comuna ? (
                  <InstitutionalText role="caption" color="muted">{p.comuna}</InstitutionalText>
                ) : null}
              </TouchableOpacity>
            ))}
            <InstitutionalField
              label="O escribe el nombre"
              value={proveedorNombre}
              onChangeText={(t) => {
                setProveedorNombre(t);
                setProveedorId(null);
              }}
              placeholder="Refax Maipú"
            />
            <InstitutionalButton
              label="Confirmar"
              onPress={handleConfirmar}
              loading={loading}
              disabled={monto <= 0}
            />
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <InstitutionalButton
          label="Tengo el precio"
          onPress={() => setMostrarForm(true)}
          disabled={loading}
        />
        {techo > 0 ? (
          <InstitutionalButton
            label={`Usar el techo (${formatearMontoCLP(techo)})`}
            variant="outline"
            onPress={onAsumir}
            disabled={loading}
          />
        ) : null}
        <InstitutionalButton
          label="Pedir precio por WhatsApp"
          variant="tertiary"
          onPress={abrirWhatsapp}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 420 },
  body: { gap: SPACING.fixed.sm, paddingBottom: SPACING.fixed.md },
  block: { gap: SPACING.fixed.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.fixed.xs },
  chip: {
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: I.surfaceSoft,
  },
  chipActive: { backgroundColor: I.primaryDisabled },
  provRow: {
    paddingVertical: SPACING.fixed.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  provRowActive: { backgroundColor: I.surfaceSoft },
  footer: { gap: SPACING.fixed.xs, paddingTop: SPACING.fixed.sm },
});
