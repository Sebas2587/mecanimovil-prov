import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { MessageCircle } from 'lucide-react-native';
import { BottomSheet } from '@/app/design-system/components/BottomSheet';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { BORDERS, COLORS, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { ClpMoneyInput } from '@/components/forms/ClpMoneyInput';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import type { ProveedorRepuestos } from '@/services/proveedorRepuestosService';
import type { CotizacionCanal, OpcionRepuesto, RepuestoCotizacion } from '@/services/cotizacionCanalService';
import {
  COPY_PRECIO_TALLER as PRECIO,
  calidadLabel,
  formatRangoClp,
  labelFamilia,
  montosFichaYTecho,
  motivoSinPrecio,
  opcionesDe,
  opcionesFamilia,
  casaOpcionLabel,
} from '@/components/cotizacion/repuestoCerteza';
import { SeccionOpcional } from '@/components/cotizacion/SeccionOpcional';
import { useOpcionesRepuestoQuery } from '@/hooks/useOpcionesRepuestoQuery';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

const I = COLORS.institutional;
const VISIBLES = 5;
/** Barra + CTA primario + fila compacta + link + paddings del sheet. */
const FOOTER_RESERVE = 252;

function maxScrollHeight(winH: number) {
  const ratio = Platform.OS === 'web' ? 0.85 : 0.92;
  return Math.max(160, Math.round(winH * ratio) - FOOTER_RESERVE);
}

type Props = {
  visible: boolean;
  onClose: () => void;
  cotizacion: CotizacionCanal;
  repuesto: RepuestoCotizacion | null;
  proveedores: ProveedorRepuestos[];
  onConfirmar: (payload: {
    repuesto_id: string;
    precio_clp: number;
    proveedor_id?: number | null;
    proveedor_nombre?: string;
    especificacion?: string;
  }) => void;
  onAsumir: (modo?: 'techo' | 'ficha') => void;
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
  const { height: winH } = useWindowDimensions();
  const scrollMaxH = maxScrollHeight(winH);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [monto, setMonto] = useState(0);
  const [proveedorId, setProveedorId] = useState<number | null>(null);
  const [proveedorNombre, setProveedorNombre] = useState('');

  useEffect(() => {
    setMostrarForm(false);
    setMonto(0);
    setProveedorId(null);
    setProveedorNombre('');
  }, [repuesto?.id, visible]);

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
  const { ficha, techo } = montosFichaYTecho(repuesto);
  const hayBanda = ficha > 0 && techo > 0 && ficha !== techo;
  const hayOpcionConPrecio = Boolean(onUsarOpcion) && pool.some(
    (o) => Math.round(Number(o.precio_clp) || 0) > 0,
  );
  const pedirTipo = Boolean(
    repuesto?.especificacion_pendiente
    && opciones.length
    && !hayOpcionConPrecio
    && ficha <= 0,
  );
  const vehiculo = [cotizacion.vehiculo_marca, cotizacion.vehiculo_modelo, cotizacion.vehiculo_anio]
    .filter(Boolean)
    .join(' ');
  const calidadCliente = calidadLabel(repuesto);

  const handleSpec = useCallback((spec: string) => {
    onEspecificacion?.(spec);
  }, [onEspecificacion]);

  const usarFicha = useCallback(() => onAsumir('ficha'), [onAsumir]);
  const usarTecho = useCallback(() => onAsumir('techo'), [onAsumir]);

  const abrirForm = useCallback(() => {
    setMonto((prev) => (prev > 0 ? prev : ficha > 0 ? ficha : techo));
    setMostrarForm(true);
  }, [ficha, techo]);

  const handleConfirmar = useCallback(() => {
    if (monto <= 0) return;
    const rid = String(repuesto?.id || '');
    if (!rid) return;
    const sinCasa = !proveedorId && !proveedorNombre.trim();
    if (sinCasa && ficha > 0 && monto === ficha) {
      onAsumir('ficha');
      return;
    }
    if (sinCasa && techo > 0 && monto === techo && monto !== ficha) {
      onAsumir('techo');
      return;
    }
    const elegido = proveedores.find((p) => p.id === proveedorId);
    onConfirmar({
      repuesto_id: rid,
      precio_clp: monto,
      proveedor_id: proveedorId,
      proveedor_nombre: elegido?.nombre || proveedorNombre,
      especificacion: repuesto?.especificacion,
    });
  }, [
    ficha,
    monto,
    onAsumir,
    onConfirmar,
    proveedorId,
    proveedorNombre,
    proveedores,
    repuesto?.especificacion,
    repuesto?.id,
    techo,
  ]);

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
    const casa = casaOpcionLabel(op, repuesto);
    const calidad = calidadLabel(op);
    return (
      <View key={op.id} style={styles.opcionCard}>
        <View style={styles.opcionHead}>
          <View style={styles.thumbWrap}>
            {op.imagen_url ? (
              <Image source={{ uri: op.imagen_url }} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]} />
            )}
          </View>
          <View style={styles.opcionCuerpo}>
            <InstitutionalText role="body" color="ink" numberOfLines={2}>
              {[op.marca_repuesto, op.nombre].filter(Boolean).join(' — ') || 'Opción'}
            </InstitutionalText>
            <View style={styles.opcionTags}>
              <InstitutionalTag label={casa} variant="neutral" size="sm" uppercase={false} />
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
                <InstitutionalText role="caption" color="primary">Abrir ficha</InstitutionalText>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        {onUsarOpcion && precio > 0 ? (
          <InstitutionalButton
            label={`Usar ${formatearMontoCLP(precio)}`}
            size="compact"
            onPress={() => onUsarOpcion(op)}
            disabled={loading}
          />
        ) : precio > 0 ? (
          <InstitutionalText role="h5" color="ink">{formatearMontoCLP(precio)}</InstitutionalText>
        ) : null}
      </View>
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} stickyFooter>
      <ScrollView
        style={[styles.scroll, { maxHeight: scrollMaxH }]}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
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

        {pedirTipo ? (
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

        {pool.length ? (
          <View style={styles.block}>
            <InstitutionalText role="label">En tienda</InstitutionalText>
            {visibles.map(renderOpcion)}
            {resto.length ? (
              <SeccionOpcional title="Ver más opciones" hint={`${resto.length} más`}>
                {resto.map(renderOpcion)}
              </SeccionOpcional>
            ) : null}
          </View>
        ) : (rango || ficha > 0 || techo > 0) ? (
          <View style={styles.block}>
            <InstitutionalText role="label">{PRECIO.seccionSimple}</InstitutionalText>
            <InstitutionalText role="body" color="ink">
              {rango || formatearMontoCLP(ficha || techo)}
            </InstitutionalText>
            {hayBanda ? (
              <InstitutionalText role="caption" color="muted">{PRECIO.hintBanda}</InstitutionalText>
            ) : (
              <InstitutionalText role="caption" color="muted">
                Es el precio publicado. El botón de abajo lo deja como monto a cobrar.
              </InstitutionalText>
            )}
          </View>
        ) : motivo ? (
          <InstitutionalText role="caption" color="muted">{motivo}</InstitutionalText>
        ) : null}

        {mostrarForm ? (
          <View style={styles.block}>
            <InstitutionalText role="label">Otro monto (IVA incl.)</InstitutionalText>
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
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        {mostrarForm ? (
          <InstitutionalButton
            label="Confirmar"
            onPress={handleConfirmar}
            loading={loading}
            disabled={monto <= 0}
          />
        ) : hayOpcionConPrecio ? null : ficha > 0 ? (
          <InstitutionalButton
            label={`Usar ${formatearMontoCLP(ficha)}`}
            onPress={usarFicha}
            disabled={loading}
          />
        ) : (
          <InstitutionalButton
            label="Tengo el precio"
            onPress={abrirForm}
            disabled={loading}
          />
        )}
        {!mostrarForm && (hayOpcionConPrecio || ficha > 0) ? (
          <View style={styles.footerRow}>
            <InstitutionalButton
              label="Otro monto"
              variant="outline"
              size="compact"
              onPress={abrirForm}
              disabled={loading}
              style={styles.footerHalf}
            />
            {hayBanda ? (
              <InstitutionalButton
                label={`${PRECIO.conMargen} ${formatearMontoCLP(techo)}`}
                accessibilityLabel={`${PRECIO.usarConMargen} (${formatearMontoCLP(techo)})`}
                variant="outline"
                size="compact"
                onPress={usarTecho}
                disabled={loading}
                style={styles.footerHalf}
              />
            ) : (
              <InstitutionalButton
                label="WhatsApp"
                accessibilityLabel="Pedir precio por WhatsApp"
                variant="outline"
                size="compact"
                onPress={abrirWhatsapp}
                disabled={loading}
                leading={<MessageCircle size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
                style={styles.footerHalf}
              />
            )}
          </View>
        ) : null}
        {mostrarForm || hayBanda || (!ficha && !hayOpcionConPrecio) ? (
          <InstitutionalButton
            label="Pedir precio por WhatsApp"
            variant="tertiary"
            onPress={abrirWhatsapp}
            leading={<MessageCircle size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />}
          />
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, flexShrink: 1, minHeight: 0 },
  body: { gap: SPACING.fixed.sm, paddingBottom: SPACING.fixed.sm },
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
  opcionCard: {
    gap: SPACING.fixed.sm,
    padding: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    backgroundColor: I.surfaceSoft,
  },
  opcionHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
  },
  thumbWrap: { width: 56, height: 56 },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: BORDERS.radius.sm,
    backgroundColor: I.surfaceSoft,
  },
  thumbPlaceholder: { backgroundColor: I.hairline },
  opcionCuerpo: { flex: 1, minWidth: 0, gap: 4 },
  opcionTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  footer: {
    flexShrink: 0,
    gap: SPACING.fixed.xs,
    paddingTop: SPACING.fixed.sm,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.fixed.xs,
  },
  footerHalf: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: SPACING.fixed.sm,
  },
});
