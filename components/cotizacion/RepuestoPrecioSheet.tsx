import React, { useCallback, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { BottomSheet } from '@/app/design-system/components/BottomSheet';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { BORDERS, COLORS, SPACING } from '@/app/design-system/tokens';
import { ClpMoneyInput } from '@/components/forms/ClpMoneyInput';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import type { ProveedorRepuestos } from '@/services/proveedorRepuestosService';
import type { CotizacionCanal, OpcionRepuesto, RepuestoCotizacion } from '@/services/cotizacionCanalService';
import {
  calidadLabel,
  formatRangoClp,
  labelFamilia,
  motivoSinPrecio,
  opcionesDe,
  opcionesFamilia,
  origenOpcionLabel,
} from '@/components/cotizacion/repuestoCerteza';
import { SeccionOpcional } from '@/components/cotizacion/SeccionOpcional';
import { useOpcionesRepuestoQuery } from '@/hooks/useOpcionesRepuestoQuery';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

const I = COLORS.institutional;
const VISIBLES = 5;

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
  onUsarOpcion?: (opcion: OpcionRepuesto) => void;
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
  onUsarOpcion,
  loading,
}: Props) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [monto, setMonto] = useState(0);
  const [proveedorId, setProveedorId] = useState<number | null>(null);
  const [proveedorNombre, setProveedorNombre] = useState('');

  const opciones = useMemo(() => (repuesto ? opcionesFamilia(repuesto) : []), [repuesto]);
  const { data: opcionesRemote } = useOpcionesRepuestoQuery(
    cotizacion.id,
    repuesto?.id,
    visible && Boolean(repuesto?.id),
  );
  const pool = useMemo(() => {
    if (opcionesRemote?.opciones?.length) return opcionesRemote.opciones.filter((o) => o?.id);
    return repuesto ? opcionesDe(repuesto) : [];
  }, [opcionesRemote, repuesto]);
  const visibles = pool.slice(0, VISIBLES);
  const resto = pool.slice(VISIBLES);
  const motivo = repuesto ? motivoSinPrecio(repuesto) : null;
  const rango = formatRangoClp(repuesto?.precio_min_clp, repuesto?.precio_max_clp);
  const techo = Math.round(Number(repuesto?.precio_max_clp || repuesto?.precio_unitario_clp || 0));
  const vehiculo = [cotizacion.vehiculo_marca, cotizacion.vehiculo_modelo, cotizacion.vehiculo_anio]
    .filter(Boolean)
    .join(' ');
  const calidadCliente = calidadLabel(repuesto);

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

  const renderOpcion = (op: OpcionRepuesto) => {
    const url = (op.url || '').trim();
    const precio = Math.round(Number(op.precio_clp) || 0);
    const origen = origenOpcionLabel(op);
    const calidad = calidadLabel(op);
    return (
      <View key={op.id} style={styles.opcionRow}>
        <View style={styles.thumbWrap}>
          {op.imagen_url ? (
            <Image source={{ uri: op.imagen_url }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]} />
          )}
        </View>
        <View style={styles.opcionCuerpo}>
          <InstitutionalText role="body" color="ink" numberOfLines={1}>
            {[op.marca_repuesto, op.nombre].filter(Boolean).join(' — ') || 'Opción'}
          </InstitutionalText>
          <View style={styles.opcionTags}>
            <InstitutionalTag label={origen} variant="neutral" size="sm" uppercase={false} />
            {calidad ? (
              <InstitutionalTag label={calidad} variant="neutral" size="sm" uppercase={false} />
            ) : null}
            {repuesto.seleccion_cliente && calidad && calidad === calidadCliente ? (
              <InstitutionalTag label="Elegido por el cliente" variant="success" size="sm" uppercase={false} />
            ) : null}
          </View>
          {url ? (
            <TouchableOpacity
              accessibilityRole="link"
              onPress={() => Linking.openURL(url).catch(() => undefined)}
            >
              <InstitutionalText role="caption" color="muted">Toca para abrir el aviso</InstitutionalText>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.opcionAccion}>
          {precio > 0 ? (
            <InstitutionalText role="body" color="ink">{formatearMontoCLP(precio)}</InstitutionalText>
          ) : null}
          {onUsarOpcion && precio > 0 ? (
            <InstitutionalButton
              label="Usar este precio"
              variant="tertiary"
              size="compact"
              onPress={() => onUsarOpcion(op)}
              disabled={loading}
            />
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} stickyFooter>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        <InstitutionalText role="h3">{repuesto.nombre}</InstitutionalText>
        <InstitutionalText role="caption" color="muted">{vehiculo}</InstitutionalText>
        {repuesto.seleccion_cliente && calidadCliente ? (
          <InstitutionalTag
            label={`Elegido por el cliente · ${calidadCliente}`}
            variant="success"
            size="sm"
            uppercase={false}
          />
        ) : calidadCliente ? (
          <InstitutionalTag label={calidadCliente} variant="neutral" size="sm" uppercase={false} />
        ) : null}

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
                {(repuesto.precio_unitario_clp || 0) > 0
                  ? `Se cobra ${formatearMontoCLP(techo)}`
                  : `Si asumes el techo se cobra ${formatearMontoCLP(techo)}`}
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

        {pool.length ? (
          <View style={styles.block}>
            <InstitutionalText role="label">Opciones para esta pieza</InstitutionalText>
            {visibles.map(renderOpcion)}
            {resto.length ? (
              <SeccionOpcional title="Ver más opciones" hint={`${resto.length} más`}>
                {resto.map(renderOpcion)}
              </SeccionOpcional>
            ) : null}
            <InstitutionalText role="caption" color="muted">
              Son avisos publicados y precios que registraste, no una cotización a tu nombre.
            </InstitutionalText>
          </View>
        ) : motivo ? (
          <InstitutionalText role="caption" color="muted">{motivo}</InstitutionalText>
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
  opcionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xs,
  },
  thumbWrap: { width: 44, height: 44 },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.sm,
    backgroundColor: I.surfaceSoft,
  },
  thumbPlaceholder: { backgroundColor: I.surfaceSoft },
  opcionCuerpo: { flex: 1, minWidth: 0, gap: 4 },
  opcionTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  opcionAccion: { alignItems: 'flex-end', gap: 4 },
  footer: { gap: SPACING.fixed.xs, paddingTop: SPACING.fixed.sm },
});
