import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { AlertTriangle, Car, MapPin, Phone, Sparkles, Trash2, UserRound } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, withOpacity } from '@/app/design-system/tokens';
import {
  HINT_CLIENTE_SIN_CANAL_CON_TELEFONO,
  HINT_CLIENTE_SIN_CANAL_SIN_TELEFONO,
} from '@/utils/entregaCotizacionCopy';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalScreenTabs } from '@/app/design-system/components/InstitutionalScreenTabs';
import { Card } from '@/app/design-system/components';
import { hostIconPlateStyle } from '@/app/design-system/styles/institutionalSemantic';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import { ClpMoneyInput } from '@/components/forms/ClpMoneyInput';
import { CotizacionPreciosEstadoBanner } from '@/components/cotizacion/CotizacionPreciosEstadoBanner';
import { ConfirmarPreciosSheet } from '@/components/cotizacion/ConfirmarPreciosSheet';
import { CotizacionBorradorAcciones } from '@/components/cotizacion/CotizacionBorradorAcciones';
import { SeccionOpcional } from '@/components/cotizacion/SeccionOpcional';
import { RepuestoPrecioSheet } from '@/components/cotizacion/RepuestoPrecioSheet';
import { FuenteFichaInterna } from '@/components/cotizacion/FuenteFichaInterna';
import {
  casaRepuestosLabel,
  certezaDe,
  estadoLinea,
  lineaPendientePrecio,
  etiquetaBanda,
  formatRangoClp,
  labelFamilia,
  metaLineaTexto,
  montosFichaYTecho,
  motivoSinPrecio,
  opcionesFamilia,
} from '@/components/cotizacion/repuestoCerteza';
import { useProveedoresRepuestosQuery } from '@/hooks/useProveedoresRepuestosQuery';
import { VerHistorialPatenteLink } from '@/components/vehiculos/VerHistorialPatenteLink';
import { router } from 'expo-router';
import {
  formatearMontoCLP,
  redondearCLP,
} from '@/utils/formatearMontoCLP';
import type { CotizacionCanal, ManoObraLinea, RepuestoCotizacion } from '@/services/cotizacionCanalService';
import cotizacionCanalService, {
  MAX_MANO_OBRA_LINEAS,
  calcularDescuentoCotizacion,
  clampDiasValidez,
  cotizacionPermiteEdicionCompleta,
  mergeRepuestosPreservandoEdicion,
  patchPrecioEscritoPorTaller,
  resolverManoObraLineas,
  sumaManoObraLineas,
  type ProgresoBusquedaWeb,
} from '@/services/cotizacionCanalService';
import { CotizacionIaBusquedaOverlay } from '@/components/chats/CotizacionIaBusquedaOverlay';
import {
  COTIZACION_CANAL_DETALLE_QUERY_KEY,
  useCotizacionCanalDetalleQuery,
} from '@/hooks/useCotizacionCanalDetalleQuery';
import { useQueryClient } from '@tanstack/react-query';
import {
  EjecucionAdicionalCampos,
  pickerDesdePropuesta,
  type EjecucionAdicional,
} from '@/components/cotizaciones/EjecucionAdicionalCampos';
import { formatDateApi } from '@/utils/fechaLocal';
import { showAlert } from '@/utils/platformAlert';
import {
  busquedaWebPendiente,
  esBorradorGeneradoPorAgente,
  lineaNecesitaBusquedaPrecio,
  resumenPreciosRepuestos,
} from '@/utils/cotizacionPreciosWeb';
import type { CatalogoFechaHoraValue } from '@/components/solicitudes/CatalogoFechaHoraPickers';

const I = COLORS.institutional;
const T = TYPOGRAPHY.styles;

function subtotalRepuesto(rep: RepuestoCotizacion): number {
  return redondearCLP(redondearCLP(rep.cantidad || 1) * redondearCLP(rep.precio_unitario_clp));
}

function desgloseIvaDesdeTotal(totalIvaIncl: number): { neto: number; iva: number; total: number } {
  const total = redondearCLP(totalIvaIncl);
  const neto = Math.round(total / 1.19);
  const iva = total - neto;
  return { neto, iva, total };
}

function proveedorLabel(rep: RepuestoCotizacion): string | null {
  const nombre = (rep.proveedor_nombre || '').trim();
  if (nombre) return nombre;
  const tienda = (rep.tienda_ml || '').trim();
  if (tienda) return tienda;
  return null;
}

/** Una sola etiqueta de origen (tienda, proveedor o canal). */
function origenTagLabel(rep: RepuestoCotizacion): string | null {
  const nombre = proveedorLabel(rep);
  if (nombre) return nombre;
  const key = (rep.fuente_marketplace || rep.fuente_repuesto || '').trim().toLowerCase();
  if (key === 'web') return 'Búsqueda web';
  if (key === 'catalogo' || key === 'catálogo') return 'Catálogo del taller';
  if (key === 'historial') return 'Historial del taller';
  if (key === 'mercadolibre') return 'Mercado Libre';
  return null;
}

const ESTADO_VARIANT: Record<
  CotizacionCanal['estado'],
  'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info'
> = {
  borrador: 'neutral',
  enviada: 'info',
  aceptada: 'success',
  rechazada: 'error',
  expirada: 'warning',
  cancelada: 'error',
};

const RepuestoRow = React.memo(function RepuestoRow({
  rep,
  index,
  editable,
  buscandoPrecio = false,
  vehiculoAnio,
  onUpdate,
  onDelete,
  onConfirmar,
  onEspecificacion,
  onBuscarIa,
  puedeBuscarIa = false,
  rangoCliente = null,
}: {
  rep: RepuestoCotizacion;
  index: number;
  editable: boolean;
  buscandoPrecio?: boolean;
  vehiculoAnio?: number | string | null;
  onUpdate: (index: number, patch: Partial<RepuestoCotizacion>) => void;
  onDelete: (index: number) => void;
  onConfirmar: (rep: RepuestoCotizacion) => void;
  onEspecificacion: (rep: RepuestoCotizacion, spec: string) => void;
  onBuscarIa?: (rep: RepuestoCotizacion) => void;
  puedeBuscarIa?: boolean;
  rangoCliente?: string | null;
}) {
  const precioUnit = redondearCLP(rep.precio_unitario_clp);
  const subtotal = subtotalRepuesto(rep);
  const precioPendiente = buscandoPrecio && precioUnit <= 0;
  const origenLabel = origenTagLabel(rep);
  const urlProducto = (rep.url_producto || '').trim();
  const certeza = certezaDe(rep);
  const specOps = opcionesFamilia(rep);
  const rango = formatRangoClp(rep.precio_min_clp, rep.precio_max_clp);
  const minP = Math.round(Number(rep.precio_min_clp) || 0);
  const maxP = Math.round(Number(rep.precio_max_clp) || 0);
  const mostrarRango = Boolean(rango) && (
    certeza === 'sin_precio' || (minP > 0 && maxP > 0 && minP !== maxP)
  );
  const fichaClp = Math.round(Number(rep.precio_marketplace_clp) || 0);
  const hayPrecioParaConfirmar = Boolean(
    editable
    && certeza !== 'confirmado'
    && certeza !== 'asumido'
    && (precioUnit > 0 || minP > 0 || maxP > 0 || fichaClp > 0),
  );
  const estado = estadoLinea(rep);
  const metaTexto = metaLineaTexto(rep);
  const casaLabel = casaRepuestosLabel(rep);
  const motivo = motivoSinPrecio(rep);
  const nombreGuardado = (rep.nombre || '').trim();

  const [nombreFocused, setNombreFocused] = useState(false);
  const [nombreDraft, setNombreDraft] = useState(nombreGuardado);
  const cantidadGuardada = Math.max(1, Math.round(Number(rep.cantidad) || 1));
  const [cantFocused, setCantFocused] = useState(false);
  const [cantDraft, setCantDraft] = useState(String(cantidadGuardada));

  useEffect(() => {
    if (nombreFocused) return;
    setNombreDraft(nombreGuardado);
  }, [nombreGuardado, nombreFocused]);

  useEffect(() => {
    if (cantFocused) return;
    setCantDraft(String(cantidadGuardada));
  }, [cantidadGuardada, cantFocused]);

  return (
    <Card elevated padding="host" style={styles.repuestoCard}>
      <View style={styles.repuestoTopRow}>
        <View style={styles.nombreField}>
          <InstitutionalField
            label="Nombre"
            value={nombreDraft}
            onChangeText={(t) => {
              setNombreDraft(t);
              onUpdate(index, { nombre: t });
            }}
            onFocus={() => setNombreFocused(true)}
            onBlur={() => {
              const next = nombreDraft.trim();
              onUpdate(index, { nombre: next });
              setNombreDraft(next);
              setNombreFocused(false);
            }}
            placeholder="Nombre del repuesto"
            editable={editable}
          />
        </View>
        {editable ? (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => onDelete(index)}
            accessibilityRole="button"
            accessibilityLabel="Eliminar repuesto"
            hitSlop={8}
          >
            <Trash2 size={18} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.estadoRow}>
        <InstitutionalTag label={estado.label} variant={estado.variant} size="md" />
        {metaTexto ? (
          <InstitutionalText
            role="caption"
            color="muted"
            numberOfLines={1}
            style={styles.metaTexto}
          >
            {metaTexto}
          </InstitutionalText>
        ) : null}
        {rep.seleccion_cliente ? (
          <InstitutionalTag
            label="Elegido por el cliente"
            variant="success"
            size="sm"
            uppercase={false}
          />
        ) : null}
        {casaLabel ? (
          urlProducto ? (
            <TouchableOpacity
              onPress={() => {
                Linking.openURL(urlProducto).catch(() => undefined);
              }}
              accessibilityRole="link"
              accessibilityLabel={`Abrir fuente en ${origenLabel || casaLabel}`}
              hitSlop={6}
            >
              <InstitutionalTag
                label={casaLabel}
                variant="neutral"
                size="sm"
                uppercase={false}
              />
            </TouchableOpacity>
          ) : (
            <InstitutionalTag
              label={casaLabel}
              variant="neutral"
              size="sm"
              uppercase={false}
            />
          )
        ) : null}
      </View>

      <View style={styles.repuestoGrid}>
        <View style={styles.gridColCant}>
          <InstitutionalField
            label="Cant."
            compact
            mono
            value={cantDraft}
            onChangeText={(t) => {
              const digits = t.replace(/\D/g, '');
              setCantDraft(digits);
              const n = parseInt(digits, 10);
              if (n >= 1) onUpdate(index, { cantidad: n });
            }}
            onFocus={() => setCantFocused(true)}
            onBlur={() => {
              const n = Math.max(1, parseInt(cantDraft, 10) || 1);
              onUpdate(index, { cantidad: n });
              setCantDraft(String(n));
              setCantFocused(false);
            }}
            keyboardType="numeric"
            editable={editable}
            inputStyle={styles.cantidadAlign}
          />
        </View>

        <View style={styles.gridColPrecio}>
          <InstitutionalText role="label" color="muted" style={styles.colLabel}>
            Precio unit.
          </InstitutionalText>
          <ClpMoneyInput
            key={`precio-${rep.id ?? index}`}
            compact
            value={precioUnit}
            editable={editable && !precioPendiente}
            placeholder={
              precioPendiente
                ? 'Buscando'
                : (certeza === 'sin_precio'
                  ? (rango || 'Buscar')
                  : '0')
            }
            onChangeValue={(next) => onUpdate(index, patchPrecioEscritoPorTaller(next))}
          />
        </View>

        <View style={styles.gridColSubtotal}>
          <InstitutionalText role="label" color="muted" style={[styles.colLabel, styles.colLabelRight]}>
            Subtotal
          </InstitutionalText>
          <View
            key={`sub-${rep.id ?? index}-${subtotal}`}
            style={styles.subtotalBox}
          >
            {precioPendiente ? (
              <ActivityIndicator size="small" color={I.muted} />
            ) : (
              <InstitutionalText role="numberDisplay" color="ink" style={styles.subtotalValue}>
                {subtotal > 0 ? formatearMontoCLP(subtotal) : '—'}
              </InstitutionalText>
            )}
          </View>
        </View>
      </View>
      {cantidadGuardada > 1 && precioUnit > 0 && !precioPendiente ? (
        <InstitutionalText role="caption" color="muted">
          {cantidadGuardada} × {formatearMontoCLP(precioUnit)} = {formatearMontoCLP(subtotal)}
        </InstitutionalText>
      ) : null}
      {rangoCliente ? (
        <InstitutionalText role="caption" color="muted">
          {rangoCliente}
        </InstitutionalText>
      ) : null}
      {editable && puedeBuscarIa && onBuscarIa && !precioPendiente ? (
        <InstitutionalButton
          label="Buscar precio"
          variant="outline"
          size="compact"
          onPress={() => onBuscarIa?.(rep)}
          leading={<Sparkles size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
        />
      ) : null}
      {mostrarRango || hayPrecioParaConfirmar ? (
        <View style={styles.precioMetaRow}>
          {mostrarRango ? (
            <InstitutionalText role="caption" color="muted" style={styles.precioMetaTexto}>
              {etiquetaBanda(rep)} {rango}
            </InstitutionalText>
          ) : (
            <View style={styles.precioMetaTexto} />
          )}
          {hayPrecioParaConfirmar ? (
            <InstitutionalButton
              label="Confirmar precio"
              variant="tertiary"
              size="compact"
              onPress={() => onConfirmar(rep)}
            />
          ) : null}
        </View>
      ) : null}
      {motivo ? (
        <InstitutionalText role="caption" color="muted">
          {motivo}
        </InstitutionalText>
      ) : null}
      <FuenteFichaInterna rep={rep} vehiculoAnio={vehiculoAnio} />
      {rep.especificacion_pendiente && specOps.length && editable ? (
        <View style={styles.specBlock}>
          <InstitutionalText role="caption" color="muted">
            {labelFamilia(rep)}
          </InstitutionalText>
          <View style={styles.specChips}>
            {specOps.map((op) => (
              <TouchableOpacity
                key={op}
                style={styles.specChip}
                onPress={() => onEspecificacion(rep, op)}
                accessibilityRole="button"
              >
                <InstitutionalText role="caption" color="ink">{op}</InstitutionalText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}
    </Card>
  );
});

const ManoObraLineaRow = React.memo(function ManoObraLineaRow({
  line,
  index,
  editable,
  onUpdate,
  onDelete,
}: {
  line: ManoObraLinea;
  index: number;
  editable: boolean;
  onUpdate: (index: number, patch: Partial<ManoObraLinea>) => void;
  onDelete: (index: number) => void;
}) {
  const nombreGuardado = (line.nombre || '').trim();
  const [nombreFocused, setNombreFocused] = useState(false);
  const [nombreDraft, setNombreDraft] = useState(nombreGuardado);

  useEffect(() => {
    if (nombreFocused) return;
    setNombreDraft(nombreGuardado);
  }, [nombreGuardado, nombreFocused]);

  return (
    <Card elevated padding="host" style={styles.repuestoCard}>
      <View style={styles.repuestoTopRow}>
        <View style={styles.nombreField}>
          <InstitutionalField
            label="Trabajo"
            value={nombreDraft}
            onChangeText={(t) => {
              setNombreDraft(t);
              onUpdate(index, { nombre: t });
            }}
            onFocus={() => setNombreFocused(true)}
            onBlur={() => {
              const next = nombreDraft.trim();
              onUpdate(index, { nombre: next });
              setNombreDraft(next);
              setNombreFocused(false);
            }}
            placeholder="Ej. Diagnóstico, cambio de pastillas"
            editable={editable}
          />
        </View>
        {editable ? (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => onDelete(index)}
            accessibilityRole="button"
            accessibilityLabel="Eliminar mano de obra"
            hitSlop={8}
          >
            <Trash2 size={18} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        ) : null}
      </View>
      <View>
        <InstitutionalText role="label" color="muted" style={styles.colLabel}>
          Precio
        </InstitutionalText>
        <ClpMoneyInput
          value={redondearCLP(line.monto_clp)}
          editable={editable}
          onChangeValue={(next) => onUpdate(index, { monto_clp: next })}
        />
      </View>
    </Card>
  );
});

const DESCUENTO_TIPO_TABS = [
  { key: 'none' as const, label: 'Ninguno' },
  { key: 'porcentaje' as const, label: '%' },
  { key: 'monto' as const, label: '$' },
];

function captionRangoCliente(
  rep: RepuestoCotizacion,
  emitida: boolean,
  editable: boolean,
): string | null {
  const { ficha, techo } = montosFichaYTecho(rep);
  if (!(ficha > 0 && techo > 0 && ficha !== techo)) return null;
  if (!emitida && !editable) return null;
  const rango = formatRangoClp(Math.min(ficha, techo), Math.max(ficha, techo));
  if (!rango) return null;
  return emitida ? `Cliente ve ${rango}` : `En estimación el cliente vería ${rango}`;
}

const DESCUENTO_ALCANCE_TABS = [
  { key: 'mano_obra' as const, label: 'Mano de obra' },
  { key: 'total' as const, label: 'Total' },
];

interface CotizacionIaEditorProps {
  cotizacion: CotizacionCanal;
  onChange: (next: CotizacionCanal) => void;
  onEnviar?: (tipoDocumento?: 'estimacion' | 'cotizacion') => void;
  onGuardarPlantilla?: () => void;
  onMarcarAceptada?: () => void;
  enviarLabel?: string;
  enviando?: boolean;
  guardandoPlantilla?: boolean;
  /** Oculta botones de envío (el host modal usa footer propio). */
  hideSendActions?: boolean;
  /** Enviar estimación (rangos). Si no hay onEnviar, el host lo resuelve. */
  onEnviarEstimacion?: () => void;
  readonly?: boolean;
  /** Encabezado compacto (tags + título de servicio) para modal y detalle. */
  compactHeader?: boolean;
  /** Oculta la fila de encabezado (p. ej. plantilla en BottomSheet con header propio). */
  sinHeader?: boolean;
}

export type CotizacionIaEditorHandle = {
  abrirConfirmarPrecios: () => void;
  agregarRepuesto: () => void;
  agregarManoObra: () => void;
};

export const CotizacionIaEditor = React.forwardRef<
  CotizacionIaEditorHandle,
  CotizacionIaEditorProps
>(function CotizacionIaEditor({
  cotizacion,
  onChange,
  onEnviar,
  onGuardarPlantilla,
  onMarcarAceptada,
  enviarLabel = 'Enviar cotización al cliente',
  enviando = false,
  guardandoPlantilla = false,
  hideSendActions = false,
  onEnviarEstimacion,
  readonly = false,
  compactHeader = false,
  sinHeader = false,
}, ref) {
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const stackedFacts = width < 520;
  const repuestos = cotizacion.repuestos ?? [];
  const editable = !readonly;
  const lineasMo = useMemo(() => resolverManoObraLineas(cotizacion), [cotizacion]);
  const manoObra = sumaManoObraLineas(lineasMo);
  const busquedaPendiente = !esBorradorGeneradoPorAgente(cotizacion)
    && cotizacion.metadata?.busqueda_web_estado === 'pendiente';
  const appliedWebRef = useRef<string | null>(null);
  const pendientePrevRef = useRef(false);
  const cotizacionRef = useRef(cotizacion);
  cotizacionRef.current = cotizacion;

  const [busquedaIaVisible, setBusquedaIaVisible] = useState(false);
  const [faseBusquedaIa, setFaseBusquedaIa] = useState<'precios' | 'listo'>('precios');
  const [progresoBusquedaIa, setProgresoBusquedaIa] = useState<ProgresoBusquedaWeb | null>(null);
  const [cotizandoItems, setCotizandoItems] = useState(false);
  const [repuestoSheet, setRepuestoSheet] = useState<RepuestoCotizacion | null>(null);
  const repuestoSheetRef = useRef<RepuestoCotizacion | null>(null);
  repuestoSheetRef.current = repuestoSheet;
  const [confirmarPreciosVisible, setConfirmarPreciosVisible] = useState(false);
  const [precioBusy, setPrecioBusy] = useState(false);

  const { data: proveedores = [] } = useProveedoresRepuestosQuery(
    editable && Boolean(cotizacion.id),
  );

  const { data: detalleRefrescado } = useCotizacionCanalDetalleQuery(
    cotizacion.id,
    Boolean(busquedaPendiente && cotizacion.id > 0),
  );

  useEffect(() => {
    if (busquedaPendiente && !pendientePrevRef.current) {
      appliedWebRef.current = null;
    }
    pendientePrevRef.current = busquedaPendiente;
  }, [busquedaPendiente]);

  const resumenPrecios = useMemo(
    () => resumenPreciosRepuestos({ repuestos }),
    [repuestos],
  );

  useEffect(() => {
    if (busquedaPendiente && cotizacion.metadata?.busqueda_web_progreso) {
      setProgresoBusquedaIa(cotizacion.metadata.busqueda_web_progreso);
    }
  }, [busquedaPendiente, cotizacion.metadata?.busqueda_web_progreso]);

  useEffect(() => {
    if (cotizandoItems) return;
    if (busquedaPendiente) {
      setFaseBusquedaIa('precios');
      setBusquedaIaVisible(true);
      return;
    }
    if (!busquedaIaVisible) return;
    setFaseBusquedaIa('listo');
    const t = setTimeout(() => setBusquedaIaVisible(false), 900);
    return () => clearTimeout(t);
  }, [busquedaPendiente, cotizandoItems]);

  const idsBusquedaWeb = useMemo(() => {
    const ids = (cotizacion.metadata?.busqueda_web_ids || []).map(String).filter(Boolean);
    if (ids.length) return { tipo: 'id' as const, valores: new Set(ids) };
    const lineas = cotizacion.metadata?.busqueda_web_progreso?.lineas || [];
    const nombres = lineas
      .filter((l) => l.estado === 'buscando')
      .map((l) => String(l.nombre || '').trim())
      .filter(Boolean);
    return { tipo: 'nombre' as const, valores: new Set(nombres) };
  }, [cotizacion.metadata?.busqueda_web_ids, cotizacion.metadata?.busqueda_web_progreso]);

  const lineaEnBusquedaWeb = useCallback((rep: RepuestoCotizacion) => {
    if (!busquedaPendiente) return false;
    if (!idsBusquedaWeb.valores.size) return lineaNecesitaBusquedaPrecio(rep);
    if (idsBusquedaWeb.tipo === 'id') {
      return idsBusquedaWeb.valores.has(String(rep.id || ''));
    }
    return idsBusquedaWeb.valores.has((rep.nombre || '').trim());
  }, [busquedaPendiente, idsBusquedaWeb]);

  useEffect(() => {
    if (cotizandoItems) return;
    if (!detalleRefrescado || !busquedaPendiente) return;
    const estado = detalleRefrescado.metadata?.busqueda_web_estado;
    if (!estado) return;
    if (estado === 'pendiente') {
      const prog = detalleRefrescado.metadata?.busqueda_web_progreso;
      if (prog) setProgresoBusquedaIa(prog);
      return;
    }
    const current = cotizacionRef.current;
    const remotoEn = detalleRefrescado.actualizado_en || '';
    const localEn = current.actualizado_en || '';
    const localSinPrecio = (current.repuestos ?? []).some((r) => !redondearCLP(r.precio_unitario_clp));
    const remotoConPrecio = (detalleRefrescado.repuestos ?? []).some((r) => redondearCLP(r.precio_unitario_clp) > 0);
    if (remotoEn && localEn && remotoEn < localEn && !(localSinPrecio && remotoConPrecio)) return;
    const stamp = `${detalleRefrescado.id}:${detalleRefrescado.actualizado_en || estado}`;
    if (appliedWebRef.current === stamp) return;
    appliedWebRef.current = stamp;
    const repsIn = detalleRefrescado.repuestos ?? current.repuestos ?? [];
    const reps = mergeRepuestosPreservandoEdicion(current.repuestos ?? [], repsIn);
    onChange({
      ...current,
      repuestos: reps,
      mano_obra_clp: detalleRefrescado.mano_obra_clp ?? current.mano_obra_clp,
      costo_repuestos_clp: detalleRefrescado.costo_repuestos_clp ?? current.costo_repuestos_clp,
      total_clp: detalleRefrescado.total_clp ?? current.total_clp,
      metadata: {
        ...(current.metadata || {}),
        ...(detalleRefrescado.metadata || {}),
      },
      actualizado_en: detalleRefrescado.actualizado_en || current.actualizado_en,
    });
  }, [busquedaPendiente, cotizandoItems, detalleRefrescado, onChange]);


  const totalRepuestos = useMemo(
    () => repuestos.reduce((acc, r) => acc + subtotalRepuesto(r), 0),
    [repuestos],
  );

  const descuentoLive = useMemo(
    () => calcularDescuentoCotizacion({
      costoRepuestos: totalRepuestos,
      manoObra,
      tipo: cotizacion.descuento_tipo,
      alcance: cotizacion.descuento_alcance,
      valor: cotizacion.descuento_valor,
    }),
    [
      totalRepuestos,
      manoObra,
      cotizacion.descuento_tipo,
      cotizacion.descuento_alcance,
      cotizacion.descuento_valor,
    ],
  );

  const totalCalculado = descuentoLive.total;

  const descuentoActivo = cotizacion.descuento_tipo === 'porcentaje'
    || cotizacion.descuento_tipo === 'monto';

  const desgloseTotal = useMemo(
    () => desgloseIvaDesdeTotal(totalCalculado),
    [totalCalculado],
  );

  const esEstimacionEmitida = cotizacion.estado !== 'borrador'
    && (cotizacion.tipo_documento === 'estimacion'
      || cotizacion.tipo_documento_emitido === 'estimacion');

  const bandaCliente = useMemo(() => {
    let min = 0;
    let max = 0;
    for (const rep of repuestos) {
      const qty = Math.max(1, Math.round(Number(rep.cantidad) || 1));
      const { ficha, techo } = montosFichaYTecho(rep);
      const lo = ficha > 0 && techo > 0 ? Math.min(ficha, techo) : (ficha || techo);
      const hi = ficha > 0 && techo > 0 ? Math.max(ficha, techo) : (techo || ficha);
      min += qty * lo;
      max += qty * hi;
    }
    const desc = descuentoLive.descuentoClp;
    min = Math.max(0, min + manoObra - desc);
    max = Math.max(0, max + manoObra - desc);
    return { min, max, hayRango: min > 0 && max > 0 && min !== max };
  }, [repuestos, manoObra, descuentoLive.descuentoClp]);

  const aplicarLineasMo = useCallback((next: ManoObraLinea[]) => {
    const current = cotizacionRef.current;
    onChange({
      ...current,
      mano_obra_lineas: next,
      mano_obra_clp: sumaManoObraLineas(next),
      metadata: {
        ...(current.metadata || {}),
        servicios_lineas: next,
      },
    });
  }, [onChange]);

  const actualizarManoObraLinea = useCallback(
    (index: number, patch: Partial<ManoObraLinea>) => {
      const current = resolverManoObraLineas(cotizacionRef.current);
      aplicarLineasMo(current.map((lin, i) => (i === index ? { ...lin, ...patch } : lin)));
    },
    [aplicarLineasMo],
  );

  const eliminarManoObraLinea = useCallback(
    (index: number) => {
      const current = resolverManoObraLineas(cotizacionRef.current);
      aplicarLineasMo(current.filter((_, i) => i !== index));
    },
    [aplicarLineasMo],
  );

  const agregarManoObraLinea = useCallback(() => {
    const current = resolverManoObraLineas(cotizacionRef.current);
    if (current.length >= MAX_MANO_OBRA_LINEAS) return;
    aplicarLineasMo([
      {
        id: `mo-${Date.now()}`,
        nombre: '',
        monto_clp: 0,
      },
      ...current,
    ]);
  }, [aplicarLineasMo]);

  const actualizarRepuesto = useCallback(
    (index: number, patch: Partial<RepuestoCotizacion>) => {
      const current = cotizacionRef.current;
      const reps = current.repuestos ?? [];
      const next = reps.map((r, i) => (i === index ? { ...r, ...patch } : r));
      onChange({ ...current, repuestos: next });
    },
    [onChange],
  );

  const eliminarRepuesto = useCallback(
    (index: number) => {
      const current = cotizacionRef.current;
      const reps = current.repuestos ?? [];
      onChange({ ...current, repuestos: reps.filter((_, i) => i !== index) });
    },
    [onChange],
  );

  const aplicarCotizacionServidor = useCallback((next: CotizacionCanal) => {
    const current = cotizacionRef.current;
    onChange({
      ...current,
      ...next,
      repuestos: mergeRepuestosPreservandoEdicion(
        current.repuestos ?? [],
        next.repuestos ?? [],
      ),
      mano_obra_lineas: current.mano_obra_lineas ?? next.mano_obra_lineas,
      metadata: {
        ...(current.metadata || {}),
        ...(next.metadata || {}),
      },
    });
  }, [onChange]);

  const aplicarResultadoBusquedaWeb = useCallback(async (cotId: number) => {
    const lista = await cotizacionCanalService.esperarPreciosWeb(cotId, {
      onTick: (cot) => {
        setProgresoBusquedaIa(cot.metadata?.busqueda_web_progreso || null);
      },
    });
    queryClient.setQueryData(
      [COTIZACION_CANAL_DETALLE_QUERY_KEY, cotId],
      lista,
    );
    const latest = cotizacionRef.current;
    onChange({
      ...latest,
      ...lista,
      repuestos: mergeRepuestosPreservandoEdicion(
        latest.repuestos ?? [],
        lista.repuestos ?? [],
      ),
      metadata: {
        ...(latest.metadata || {}),
        ...(lista.metadata || {}),
      },
    });
    return lista;
  }, [onChange, queryClient]);

  const abrirConfirmarRepuesto = useCallback((rep: RepuestoCotizacion) => {
    setRepuestoSheet(rep);
  }, []);

  const definirEspecificacionLinea = useCallback(async (rep: RepuestoCotizacion, spec: string) => {
    const current = cotizacionRef.current;
    if (!current.id || !rep.id) {
      const reps = current.repuestos ?? [];
      onChange({
        ...current,
        repuestos: reps.map((r) =>
          r.id === rep.id || r === rep
            ? { ...r, especificacion: spec, especificacion_pendiente: false }
            : r,
        ),
      });
      return;
    }
    setPrecioBusy(true);
    try {
      const res = await cotizacionCanalService.definirEspecificacion(current.id, {
        repuesto_id: String(rep.id),
        especificacion: spec,
      });
      aplicarCotizacionServidor(res.cotizacion);
      if (busquedaWebPendiente(res.cotizacion)) {
        setCotizandoItems(true);
        setFaseBusquedaIa('precios');
        setProgresoBusquedaIa(res.cotizacion.metadata?.busqueda_web_progreso || null);
        setBusquedaIaVisible(true);
        try {
          const lista = await aplicarResultadoBusquedaWeb(current.id);
          if (busquedaWebPendiente(lista)) {
            setBusquedaIaVisible(false);
          } else {
            setFaseBusquedaIa('listo');
            await new Promise<void>((resolve) => {
              setTimeout(resolve, 800);
            });
            setBusquedaIaVisible(false);
          }
        } finally {
          setCotizandoItems(false);
        }
      }
    } catch {
      setBusquedaIaVisible(false);
      showAlert('No se pudo guardar', 'Intenta de nuevo la especificación.');
    } finally {
      setPrecioBusy(false);
    }
  }, [aplicarCotizacionServidor, aplicarResultadoBusquedaWeb, onChange]);

  const usarOpcionLinea = useCallback(async (rep: RepuestoCotizacion, opcionId: string) => {
    const current = cotizacionRef.current;
    if (!current.id || !rep.id) return;
    setPrecioBusy(true);
    try {
      const res = await cotizacionCanalService.usarOpcionRepuesto(current.id, {
        repuesto_id: String(rep.id),
        opcion_id: opcionId,
      });
      aplicarCotizacionServidor(res.cotizacion);
      setRepuestoSheet(null);
    } catch {
      showAlert('No se pudo usar esa opción', 'Intenta de nuevo o escribe el monto a mano.');
    } finally {
      setPrecioBusy(false);
    }
  }, [aplicarCotizacionServidor]);

  const confirmarPrecioLinea = useCallback(async (payload: {
    repuesto_id?: string;
    precio_clp: number;
    proveedor_id?: number | null;
    proveedor_nombre?: string;
    especificacion?: string;
  }) => {
    const current = cotizacionRef.current;
    const rid = String(payload.repuesto_id || repuestoSheetRef.current?.id || '');
    if (!current.id || !rid) return;
    setPrecioBusy(true);
    try {
      const res = await cotizacionCanalService.confirmarPrecioRepuesto(current.id, {
        repuesto_id: rid,
        precio_clp: payload.precio_clp,
        proveedor_id: payload.proveedor_id,
        proveedor_nombre: payload.proveedor_nombre,
        especificacion: payload.especificacion,
        guardar_en_mis_precios: true,
      });
      aplicarCotizacionServidor(res.cotizacion);
      setRepuestoSheet(null);
    } catch {
      showAlert('No se pudo confirmar', 'Revisa el monto e inténtalo de nuevo.');
    } finally {
      setPrecioBusy(false);
    }
  }, [aplicarCotizacionServidor]);

  const asumirPrecios = useCallback(async (
    ids: string[],
    modo: 'techo' | 'ficha' = 'techo',
  ) => {
    const current = cotizacionRef.current;
    if (!current.id) return;
    setPrecioBusy(true);
    try {
      const res = await cotizacionCanalService.asumirPrecioRepuesto(current.id, ids, modo);
      aplicarCotizacionServidor(res.cotizacion);
      setRepuestoSheet(null);
      setConfirmarPreciosVisible(false);
    } catch {
      showAlert('No se pudo asumir', 'Intenta de nuevo.');
    } finally {
      setPrecioBusy(false);
    }
  }, [aplicarCotizacionServidor]);

  const agregarRepuesto = useCallback(() => {
    const current = cotizacionRef.current;
    const reps = current.repuestos ?? [];
    onChange({
      ...current,
      repuestos: [
        {
          id: `rep-${Date.now()}`,
          nombre: '',
          cantidad: 1,
          precio_unitario_clp: 0,
        },
        ...reps,
      ],
    });
  }, [onChange]);

  const pedirEnvio = useCallback((tipo: 'estimacion' | 'cotizacion') => {
    const current = cotizacionRef.current;
    if (!onEnviar) return;
    if (
      current.es_cotizacion_adicional
      && current.ejecucion_adicional === 'nueva_fecha'
      && (!current.fecha_propuesta || !current.hora_propuesta)
    ) {
      showAlert(
        'Fecha requerida',
        'Indica día y hora acordados con el cliente antes de enviar.',
      );
      return;
    }
    onEnviar(tipo);
  }, [onEnviar]);

  React.useImperativeHandle(ref, () => ({
    abrirConfirmarPrecios: () => setConfirmarPreciosVisible(true),
    agregarRepuesto,
    agregarManoObra: agregarManoObraLinea,
  }), [agregarRepuesto, agregarManoObraLinea]);

  const enviarEstimacion = useCallback(() => {
    if (onEnviarEstimacion) {
      onEnviarEstimacion();
      return;
    }
    pedirEnvio('estimacion');
  }, [onEnviarEstimacion, pedirEnvio]);

  const cotizarItemsConIa = useCallback(async (rep?: RepuestoCotizacion) => {
    const current = cotizacionRef.current;
    if (!current.id || !cotizacionPermiteEdicionCompleta(current)) return;
    const objetivo = rep && (rep.nombre || '').trim() ? rep : null;
    const pendientes = objetivo
      ? [objetivo]
      : (current.repuestos ?? []).filter(lineaNecesitaBusquedaPrecio);
    if (!pendientes.length) {
      showAlert(
        'Nombra la pieza',
        'Agrega el repuesto, escribe su nombre y vuelve a buscar. La IA no cotiza líneas vacías ni el placeholder “Repuesto”.',
      );
      return;
    }
    const ids = pendientes.map((r) => String(r.id || '')).filter(Boolean);
    setCotizandoItems(true);
    setFaseBusquedaIa('precios');
    setProgresoBusquedaIa(null);
    setBusquedaIaVisible(true);
    try {
      const resultado = await cotizacionCanalService.cotizarItems(current.id, {
        nombres: [],
        repuestos: current.repuestos ?? [],
        repuesto_ids: ids,
      });
      queryClient.setQueryData(
        [COTIZACION_CANAL_DETALLE_QUERY_KEY, current.id],
        resultado.cotizacion,
      );
      onChange({
        ...current,
        ...resultado.cotizacion,
        metadata: {
          ...(current.metadata || {}),
          ...(resultado.cotizacion.metadata || {}),
        },
      });
      setProgresoBusquedaIa(resultado.cotizacion.metadata?.busqueda_web_progreso || null);
      let lista = resultado.cotizacion;
      if (resultado.busqueda_web || busquedaWebPendiente(lista)) {
        lista = await aplicarResultadoBusquedaWeb(current.id);
      }
      if (busquedaWebPendiente(lista)) {
        return;
      }
      setFaseBusquedaIa('listo');
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 800);
      });
      setBusquedaIaVisible(false);
    } catch (err: unknown) {
      setBusquedaIaVisible(false);
      const data = (err as {
        response?: { data?: Record<string, string | string[] | undefined> };
      })?.response?.data;
      const first = data?.nombres ?? data?.estado ?? data?.detail ?? data?.non_field_errors;
      const msg = Array.isArray(first) ? first[0] : first;
      showAlert(
        'No se pudo cotizar',
        (typeof msg === 'string' && msg) || 'Revisa los nombres e inténtalo de nuevo.',
      );
    } finally {
      setCotizandoItems(false);
      await queryClient.invalidateQueries({
        queryKey: [COTIZACION_CANAL_DETALLE_QUERY_KEY, current.id],
      });
    }
  }, [aplicarResultadoBusquedaWeb, onChange, queryClient]);

  const kmMeta = cotizacion.metadata?.vehiculo_kilometraje_actual;
  const vehiculoTitulo = [
    cotizacion.vehiculo_marca,
    cotizacion.vehiculo_modelo,
    cotizacion.vehiculo_anio ? String(cotizacion.vehiculo_anio) : '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const factsVehiculo = useMemo(() => {
    const rows: Array<{ label: string; value: string }> = [];
    if (cotizacion.vehiculo_patente) {
      rows.push({ label: 'Patente', value: cotizacion.vehiculo_patente.toUpperCase() });
    }
    if (cotizacion.vehiculo_cilindraje) {
      rows.push({ label: 'Cilindraje', value: cotizacion.vehiculo_cilindraje });
    }
    if (cotizacion.tipo_motor_label || cotizacion.tipo_motor) {
      rows.push({
        label: 'Motor',
        value: cotizacion.tipo_motor_label || cotizacion.tipo_motor,
      });
    }
    if (cotizacion.vehiculo_vin) {
      rows.push({ label: 'VIN', value: cotizacion.vehiculo_vin.toUpperCase() });
    }
    if (kmMeta != null && kmMeta > 0) {
      rows.push({
        label: 'Kilometraje',
        value: `${kmMeta.toLocaleString('es-CL')} km`,
      });
    }
    return rows;
  }, [
    cotizacion.tipo_motor,
    cotizacion.tipo_motor_label,
    cotizacion.vehiculo_cilindraje,
    cotizacion.vehiculo_patente,
    cotizacion.vehiculo_vin,
    kmMeta,
  ]);

  const showVehiculoCard =
    factsVehiculo.length > 0
    || Boolean(vehiculoTitulo)
    || Boolean(cotizacion.modalidad);
  const showClienteCard = Boolean(
    cotizacion.cliente_nombre
    || cotizacion.cliente_telefono
    || cotizacion.direccion_servicio
    || editable,
  );

  return (
    <View style={styles.root}>
      {!sinHeader ? (
      <View style={styles.headerRow}>
        {compactHeader ? (
          <View style={styles.headerTagsCol}>
            <InstitutionalText role="h4" numberOfLines={2}>
              {(cotizacion.servicio_nombre || '').trim()
                || (cotizacion.es_cotizacion_adicional ? 'Trabajo adicional' : 'Cotización')}
            </InstitutionalText>
            <View style={styles.headerTags}>
              {cotizacion.metadata?.origen === 'agente_ia' ? (
                <InstitutionalTag label="IA" variant="warning" size="sm" />
              ) : null}
              {cotizacion.metadata?.respaldo_sin_gemini ? (
                <InstitutionalTag label="Completar" variant="info" size="sm" />
              ) : null}
              {cotizacion.es_cotizacion_adicional ? (
                <InstitutionalTag label="Adicional" variant="info" size="sm" />
              ) : null}
              {cotizacion.numero_publico ? (
                <InstitutionalTag
                  label={`#${cotizacion.numero_publico}`}
                  variant="neutral"
                  size="sm"
                />
              ) : null}
              {cotizacion.estado !== 'borrador'
                && (cotizacion.tipo_documento === 'estimacion'
                  || cotizacion.tipo_documento_emitido === 'estimacion') ? (
                <InstitutionalTag label="Estimación · rangos" variant="warning" size="sm" />
              ) : null}
              <InstitutionalTag
                label={cotizacion.estado}
                variant={ESTADO_VARIANT[cotizacion.estado] || 'neutral'}
                size="sm"
                uppercase
              />
              {cotizacion.modalidad ? (
                <InstitutionalTag
                  label={cotizacion.modalidad === 'domicilio' ? 'Domicilio' : 'Taller'}
                  variant="neutral"
                  size="sm"
                />
              ) : null}
            </View>
            {cotizacion.es_cotizacion_adicional && cotizacion.servicio_principal_nombre ? (
              <InstitutionalText role="caption" color="muted" numberOfLines={2}>
                Desde: {cotizacion.servicio_principal_nombre}
              </InstitutionalText>
            ) : null}
            {cotizacion.es_cotizacion_adicional && cotizacion.motivo_servicio_adicional ? (
              <InstitutionalText role="caption" color="muted" numberOfLines={3}>
                Motivo: {cotizacion.motivo_servicio_adicional}
              </InstitutionalText>
            ) : null}
          </View>
        ) : (
          <>
            <View style={styles.headerText}>
              <InstitutionalText role="h4">
                {(cotizacion.servicio_nombre || '').trim()
                  || (cotizacion.es_cotizacion_adicional ? 'Trabajo adicional' : 'Cotización')}
              </InstitutionalText>
              {cotizacion.es_cotizacion_adicional && cotizacion.servicio_principal_nombre ? (
                <InstitutionalText role="caption" color="muted" numberOfLines={2}>
                  Desde: {cotizacion.servicio_principal_nombre}
                </InstitutionalText>
              ) : cotizacion.numero_publico ? (
                <InstitutionalText role="caption" color="muted" numberOfLines={1}>
                  #{cotizacion.numero_publico}
                </InstitutionalText>
              ) : null}
              {cotizacion.es_cotizacion_adicional && cotizacion.motivo_servicio_adicional ? (
                <InstitutionalText role="caption" color="muted" numberOfLines={3}>
                  Motivo: {cotizacion.motivo_servicio_adicional}
                </InstitutionalText>
              ) : null}
            </View>
            <View style={styles.headerTags}>
              {cotizacion.metadata?.origen === 'agente_ia' ? (
                <InstitutionalTag
                  label="Generada por IA — revisa antes de enviar"
                  variant="warning"
                  size="sm"
                />
              ) : null}
              {cotizacion.metadata?.respaldo_sin_gemini ? (
                <InstitutionalTag label="Completar precios" variant="info" size="sm" />
              ) : null}
              {cotizacion.es_cotizacion_adicional ? (
                <InstitutionalTag label="Adicional" variant="info" size="sm" />
              ) : null}
              <InstitutionalTag
                label={cotizacion.estado}
                variant={ESTADO_VARIANT[cotizacion.estado] || 'neutral'}
                size="sm"
              />
            </View>
          </>
        )}
      </View>
      ) : null}

      {editable && (cotizacion.estado === 'enviada' || cotizacion.estado === 'aceptada') ? (
        <InstitutionalText role="caption" color="muted">
          Puedes agregar ítems con IA o con el valor que definas, y volver a enviar esta misma cotización al cliente.
        </InstitutionalText>
      ) : null}

      {cotizacion.es_cotizacion_adicional && (cotizacion.cita_origen_id || cotizacion.cita_personal_id) ? (
        <InstitutionalButton
          label={
            cotizacion.servicio_principal_nombre
              ? 'Ver trabajo principal'
              : 'Ver trabajo en curso'
          }
          variant="outline"
          onPress={() => {
            const citaId = cotizacion.cita_origen_id || cotizacion.cita_personal_id;
            if (citaId) router.push(`/cita-agenda-personal/${citaId}`);
          }}
        />
      ) : null}

      {cotizacion.es_cotizacion_adicional ? (
        <Card elevated padding="host" style={styles.sectionCard}>
          <InstitutionalSectionHeader title="¿Cuándo se hace?" />
          <EjecucionAdicionalCampos
            ejecucion={(cotizacion.ejecucion_adicional || 'misma_visita') as EjecucionAdicional}
            onEjecucionChange={(next) => {
              if (!editable) return;
              if (next === 'misma_visita') {
                onChange({
                  ...cotizacion,
                  ejecucion_adicional: 'misma_visita',
                  fecha_propuesta: null,
                  hora_propuesta: null,
                });
                return;
              }
              const slot = pickerDesdePropuesta(
                cotizacion.fecha_propuesta,
                cotizacion.hora_propuesta,
              );
              onChange({
                ...cotizacion,
                ejecucion_adicional: 'nueva_fecha',
                fecha_propuesta: formatDateApi(slot.fecha),
                hora_propuesta: slot.hora,
              });
            }}
            fechaHora={pickerDesdePropuesta(
              cotizacion.fecha_propuesta,
              cotizacion.hora_propuesta,
            )}
            onFechaHoraChange={(next: CatalogoFechaHoraValue) => {
              if (!editable) return;
              onChange({
                ...cotizacion,
                ejecucion_adicional: 'nueva_fecha',
                fecha_propuesta: formatDateApi(next.fecha),
                hora_propuesta: next.hora,
              });
            }}
            editable={editable}
            fechaPropuesta={cotizacion.fecha_propuesta}
            horaPropuesta={cotizacion.hora_propuesta}
          />
        </Card>
      ) : null}

      {(showVehiculoCard || showClienteCard) ? (
        <View style={[styles.factsColumns, stackedFacts && styles.factsColumnsStacked]}>
          {showVehiculoCard ? (
            <Card elevated padding="host" style={[styles.factsColCard, !stackedFacts && styles.factsColHalf]}>
              <View style={styles.factsHeader}>
                <View style={hostIconPlateStyle}>
                  <Car size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                </View>
                <View style={styles.motorCopy}>
                  <InstitutionalText role="label" color="muted">
                    VEHÍCULO
                  </InstitutionalText>
                  <InstitutionalText role="h5" numberOfLines={2}>
                    {vehiculoTitulo || cotizacion.vehiculo_patente?.toUpperCase() || 'Sin datos'}
                  </InstitutionalText>
                </View>
              </View>
              {factsVehiculo.length > 0 ? (
                <View style={styles.factsGrid}>
                  {factsVehiculo.map((row) => (
                    <View key={row.label} style={styles.factRow}>
                      <InstitutionalText role="small" color="muted">
                        {row.label}
                      </InstitutionalText>
                      <InstitutionalText role="captionBold" color="ink" numberOfLines={2} style={styles.factValue}>
                        {row.value}
                      </InstitutionalText>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={styles.factsCardAction}>
                <VerHistorialPatenteLink patente={cotizacion.vehiculo_patente || ''} />
              </View>
            </Card>
          ) : null}

          {showClienteCard ? (
            <Card elevated padding="host" style={[styles.factsColCard, !stackedFacts && styles.factsColHalf]}>
              <View style={styles.factsHeader}>
                <View style={hostIconPlateStyle}>
                  <UserRound size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                </View>
                <View style={styles.motorCopy}>
                  <InstitutionalText role="label" color="muted">
                    CLIENTE
                  </InstitutionalText>
                  <InstitutionalText role="h5" numberOfLines={1}>
                    {cotizacion.cliente_nombre || 'Sin nombre'}
                  </InstitutionalText>
                </View>
              </View>
              {editable ? (
                <View style={styles.contactBlock}>
                  <InstitutionalField
                    label="Nombre del cliente"
                    value={cotizacion.cliente_nombre || ''}
                    onChangeText={(t) => onChange({ ...cotizacion, cliente_nombre: t })}
                    placeholder="Nombre"
                    editable={editable}
                  />
                  <InstitutionalField
                    label="Teléfono"
                    value={cotizacion.cliente_telefono || ''}
                    onChangeText={(t) => onChange({ ...cotizacion, cliente_telefono: t })}
                    placeholder="+56 9 ..."
                    keyboardType="phone-pad"
                    editable={editable}
                  />
                  <InstitutionalField
                    label="Dirección de servicio"
                    value={cotizacion.direccion_servicio || ''}
                    onChangeText={(t) => onChange({ ...cotizacion, direccion_servicio: t })}
                    placeholder="Calle, comuna"
                    editable={editable}
                    multiline
                  />
                  {!cotizacion.conversation ? (
                    <InstitutionalText role="caption" color="muted">
                      {cotizacion.cliente_telefono?.trim()
                        ? HINT_CLIENTE_SIN_CANAL_CON_TELEFONO
                        : HINT_CLIENTE_SIN_CANAL_SIN_TELEFONO}
                    </InstitutionalText>
                  ) : null}
                </View>
              ) : (
                <View style={styles.factsGrid}>
                  {cotizacion.cliente_telefono ? (
                    <View style={styles.factRow}>
                      <InstitutionalText role="small" color="muted">
                        Teléfono
                      </InstitutionalText>
                      <View style={styles.factValueRow}>
                        <Phone size={14} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                        <InstitutionalText role="captionBold" color="ink" numberOfLines={1}>
                          {cotizacion.cliente_telefono}
                        </InstitutionalText>
                      </View>
                    </View>
                  ) : null}
                  {cotizacion.direccion_servicio ? (
                    <View style={styles.factRow}>
                      <InstitutionalText role="small" color="muted">
                        Dirección
                      </InstitutionalText>
                      <View style={styles.factValueRow}>
                        <MapPin size={14} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                        <InstitutionalText role="captionBold" color="ink" numberOfLines={2} style={styles.factValue}>
                          {cotizacion.direccion_servicio}
                        </InstitutionalText>
                      </View>
                    </View>
                  ) : null}
                </View>
              )}
            </Card>
          ) : null}
        </View>
      ) : null}

      <Card elevated padding="host" style={styles.sectionCard}>
        <InstitutionalSectionHeader title="Servicio" />
        {editable ? (
          <View style={styles.contactBlock}>
            <InstitutionalField
              label="Nombre del servicio"
              hint="Título del presupuesto. El desglose de trabajos va abajo, en Mano de obra."
              value={cotizacion.servicio_nombre || ''}
              onChangeText={(t) => onChange({ ...cotizacion, servicio_nombre: t })}
              placeholder="Ej. Cambio de aceite y filtros"
              editable={editable}
            />
            <InstitutionalField
              label="Detalle del problema"
              value={cotizacion.descripcion_problema || ''}
              onChangeText={(t) => onChange({ ...cotizacion, descripcion_problema: t })}
              placeholder="Opcional. Lo ve el cliente en el enlace y el PDF."
              editable={editable}
              multiline
            />
          </View>
        ) : (
          <View style={styles.problemaBox}>
            <InstitutionalText role="h5" color="ink">
              {(cotizacion.servicio_nombre || '').trim() || 'Sin servicio'}
            </InstitutionalText>
            {cotizacion.descripcion_problema ? (
              <InstitutionalText role="caption" color="body">
                {cotizacion.descripcion_problema}
              </InstitutionalText>
            ) : null}
          </View>
        )}
        {cotizacion.aviso_motor ? (
          <View style={[styles.warningBox, styles.warningAfterProblema]}>
            <AlertTriangle size={16} color={I.accentYellow} strokeWidth={ICON_STROKE_WIDTH} />
            <InstitutionalText role="caption" color="body" style={styles.warningText}>
              {cotizacion.aviso_motor}
            </InstitutionalText>
          </View>
        ) : null}
      </Card>

      <View style={styles.section}>
        <InstitutionalSectionHeader
          title="Mano de obra"
          count={lineasMo.length > 0 ? lineasMo.length : undefined}
        />
        <InstitutionalText role="caption" color="muted" style={styles.repuestosHint}>
          Precio final al cliente (el IVA se desglosa en el resumen).
          {cotizacion.metadata?.valores_estimativos || cotizacion.metadata?.precio_parcial_catalogo
            ? ' Valores estimados: confirma precios y marcas antes de enviar.'
            : ''}
        </InstitutionalText>
        {lineasMo.length >= MAX_MANO_OBRA_LINEAS ? (
          <InstitutionalText role="small" color="muted">
            Máximo {MAX_MANO_OBRA_LINEAS} líneas de mano de obra.
          </InstitutionalText>
        ) : null}
        {lineasMo.length === 0 ? (
          <Card elevated padding="host" style={styles.emptyRepuestos}>
            <InstitutionalText role="caption" color="muted">
              Sin líneas de trabajo
            </InstitutionalText>
          </Card>
        ) : (
          <View style={styles.repuestosList}>
            {lineasMo.map((line, idx) => (
              <ManoObraLineaRow
                key={line.id ?? `mo-${idx}`}
                line={line}
                index={idx}
                editable={editable}
                onUpdate={actualizarManoObraLinea}
                onDelete={eliminarManoObraLinea}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <InstitutionalSectionHeader
          title="Repuestos"
          count={repuestos.length > 0 ? repuestos.length : undefined}
        />
        <CotizacionPreciosEstadoBanner
          pendiente={busquedaPendiente}
          conTienda={resumenPrecios.conTienda}
          total={resumenPrecios.total}
          sinTienda={resumenPrecios.sinTienda}
          buscando={cotizandoItems}
          onBuscar={editable ? () => void cotizarItemsConIa() : undefined}
          respaldoSinGemini={Boolean(cotizacion.metadata?.respaldo_sin_gemini)}
          fichaExigente={resumenPrecios.fichaExigente}
        />
        <InstitutionalText role="caption" color="muted" style={styles.repuestosHint}>
          El + añade líneas. Buscar precio consulta catálogo, historial y tiendas .cl.
          El cliente ve el de margen hasta que fijas uno.
        </InstitutionalText>
        {repuestos.length === 0 ? (
          <Card elevated padding="host" style={styles.emptyRepuestos}>
            <InstitutionalText role="caption" color="muted">
              Sin repuestos listados
            </InstitutionalText>
          </Card>
        ) : (
          <View style={styles.repuestosList}>
            {repuestos.map((rep, idx) => (
              <RepuestoRow
                key={rep.id ?? `rep-${idx}`}
                rep={rep}
                index={idx}
                editable={editable}
                buscandoPrecio={lineaEnBusquedaWeb(rep)}
                vehiculoAnio={cotizacion.vehiculo_anio}
                onUpdate={actualizarRepuesto}
                onDelete={eliminarRepuesto}
                onConfirmar={abrirConfirmarRepuesto}
                onEspecificacion={definirEspecificacionLinea}
                onBuscarIa={cotizarItemsConIa}
                puedeBuscarIa={lineaNecesitaBusquedaPrecio(rep)}
                rangoCliente={captionRangoCliente(rep, esEstimacionEmitida, editable)}
              />
            ))}
          </View>
        )}
      </View>

      <Card elevated padding="host" style={styles.summaryBox}>
        <View style={styles.summaryRow}>
          <InstitutionalText role="caption" color="muted">
            Repuestos
          </InstitutionalText>
          <InstitutionalText role="captionBold" color="ink">
            {formatearMontoCLP(totalRepuestos)}
          </InstitutionalText>
        </View>
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
        {esEstimacionEmitida && bandaCliente.hayRango ? null : (
          <>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <InstitutionalText role="caption" color="muted">
                Neto
              </InstitutionalText>
              <InstitutionalText role="captionBold" color="ink">
                {formatearMontoCLP(desgloseTotal.neto)}
              </InstitutionalText>
            </View>
            <View style={styles.summaryRow}>
              <InstitutionalText role="caption" color="muted">
                IVA 19%
              </InstitutionalText>
              <InstitutionalText role="captionBold" color="ink">
                {formatearMontoCLP(desgloseTotal.iva)}
              </InstitutionalText>
            </View>
          </>
        )}
        <View style={styles.summaryDivider} />
        {esEstimacionEmitida && bandaCliente.hayRango ? (
          <>
            <View style={styles.summaryRow}>
              <InstitutionalText role="h5" color="ink">
                Total estimado
              </InstitutionalText>
              <InstitutionalText role="numberDisplay" color="ink" style={styles.totalValue}>
                {formatRangoClp(bandaCliente.min, bandaCliente.max)}
              </InstitutionalText>
            </View>
            <View style={styles.summaryRow}>
              <InstitutionalText role="caption" color="muted">
                Total de trabajo (taller)
              </InstitutionalText>
              <InstitutionalText role="captionBold" color="ink">
                {formatearMontoCLP(desgloseTotal.total)}
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
              <InstitutionalText role="numberDisplay" color="ink" style={styles.totalValue}>
                {formatearMontoCLP(desgloseTotal.total)}
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

      <SeccionOpcional
        title="Ajustes opcionales"
        hint="Descuento, notas para el cliente y vigencia"
        defaultOpen={descuentoActivo}
      >
        <Card elevated padding="host" style={styles.sectionCard}>
          <InstitutionalSectionHeader title="Descuento" />
          <InstitutionalText role="caption" color="muted">
            Opcional. Se resta del precio con IVA incluido; Neto/IVA se desglosan después sobre el total a pagar.
          </InstitutionalText>
          <View style={styles.descuentoBlock} pointerEvents={editable ? 'auto' : 'none'}>
            <InstitutionalText role="label" color="muted">
              TIPO
            </InstitutionalText>
            <InstitutionalScreenTabs
              tabs={DESCUENTO_TIPO_TABS}
              activeKey={(cotizacion.descuento_tipo === 'porcentaje' || cotizacion.descuento_tipo === 'monto')
                ? cotizacion.descuento_tipo
                : 'none'}
              onChange={(key) => {
                if (!editable) return;
                if (key === 'none') {
                  onChange({ ...cotizacion, descuento_tipo: '', descuento_valor: 0 });
                  return;
                }
                onChange({
                  ...cotizacion,
                  descuento_tipo: key,
                  descuento_alcance: cotizacion.descuento_alcance || 'mano_obra',
                  descuento_valor: cotizacion.descuento_valor || 0,
                });
              }}
            />
          </View>
          {cotizacion.descuento_tipo === 'porcentaje' || cotizacion.descuento_tipo === 'monto' ? (
            <>
              <View style={styles.descuentoBlock} pointerEvents={editable ? 'auto' : 'none'}>
                <InstitutionalText role="label" color="muted">
                  APLICAR SOBRE
                </InstitutionalText>
                <InstitutionalScreenTabs
                  tabs={DESCUENTO_ALCANCE_TABS}
                  activeKey={cotizacion.descuento_alcance === 'total' ? 'total' : 'mano_obra'}
                  onChange={(key) => {
                    if (!editable) return;
                    onChange({ ...cotizacion, descuento_alcance: key });
                  }}
                />
              </View>
              {cotizacion.descuento_tipo === 'porcentaje' ? (
                <InstitutionalField
                  label="Porcentaje (0–100)"
                  value={
                    cotizacion.descuento_valor
                      ? String(cotizacion.descuento_valor)
                      : ''
                  }
                  onChangeText={(t) => {
                    const digits = t.replace(/[^\d.,]/g, '').replace(',', '.');
                    const n = Math.min(100, Math.max(0, Number(digits) || 0));
                    onChange({ ...cotizacion, descuento_tipo: 'porcentaje', descuento_valor: n });
                  }}
                  placeholder="10"
                  keyboardType="decimal-pad"
                  editable={editable}
                />
              ) : (
                <ClpMoneyInput
                  value={redondearCLP(cotizacion.descuento_valor || 0)}
                  editable={editable}
                  onChangeValue={(next) => onChange({
                    ...cotizacion,
                    descuento_tipo: 'monto',
                    descuento_valor: next,
                  })}
                />
              )}
            </>
          ) : null}
        </Card>

        <Card elevated padding="host" style={styles.sectionCard}>
          <InstitutionalSectionHeader title="Notas de cotización" />
          <InstitutionalField
            label="El cliente verá estas notas en el enlace y en el PDF. El agente las sugiere según el servicio; puedes editarlas"
            value={cotizacion.notas_internas || ''}
            onChangeText={(t) => onChange({ ...cotizacion, notas_internas: t })}
            placeholder={'1. Síntoma…\n2. Servicio propuesto…\n3. Consideraciones…'}
            editable={editable}
            multiline
          />
        </Card>

        <Card elevated padding="host" style={styles.sectionCard}>
          <InstitutionalSectionHeader title="Validez y políticas" />
          <InstitutionalField
            label="Vigencia (días)"
            hint="Default 30. El cliente verá “válida hasta” esa cantidad de días después de enviarla."
            value={String(cotizacion.dias_validez ?? 30)}
            onChangeText={(t) => {
              const digits = t.replace(/\D/g, '');
              onChange({
                ...cotizacion,
                dias_validez: digits ? clampDiasValidez(digits) : 30,
              });
            }}
            placeholder="30"
            keyboardType="number-pad"
            maxLength={2}
            editable={editable}
          />
          <InstitutionalField
            label="El cliente las ve en el recuadro Validez. Se copian de tu perfil; puedes cambiarlas solo en esta cotización"
            value={cotizacion.politicas_cotizacion || ''}
            onChangeText={(t) => onChange({ ...cotizacion, politicas_cotizacion: t })}
            placeholder="Los precios de repuestos pueden variar si cambia disponibilidad o marca."
            editable={editable}
            multiline
          />
        </Card>
      </SeccionOpcional>

      {cotizacion.estado === 'borrador'
        && (cotizacion.listo_para_enviar || (cotizacion.pendientes_revision?.length ?? 0) > 0) ? (
        <Card elevated padding="host" style={styles.readinessCard}>
          {cotizacion.listo_para_enviar ? (
            <InstitutionalText role="captionBold" color="ink">
              Lista para enviar — revisa y envía al cliente con un clic.
            </InstitutionalText>
          ) : (cotizacion.pendientes_revision?.length ?? 0) > 0 ? (
            <View style={styles.advertenciasBox}>
              <InstitutionalText role="captionBold" color="ink">
                Pendiente antes de enviar
              </InstitutionalText>
              {(cotizacion.pendientes_revision || []).map((pend, i) => (
                <InstitutionalText key={`pend-${i}`} role="small" color="muted">
                  • {pend}
                </InstitutionalText>
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}

      {cotizacion.advertencias?.length ? (
        <Card elevated padding="host" style={styles.sectionCard}>
          <InstitutionalSectionHeader title="Alertas del sistema" />
          <View style={styles.advertenciasBox}>
            {cotizacion.advertencias.map((adv, i) => (
              <InstitutionalText key={`adv-${i}`} role="small" color="muted">
                • {adv}
              </InstitutionalText>
            ))}
          </View>
        </Card>
      ) : null}

      {!hideSendActions
        && ((editable && (onEnviar || onGuardarPlantilla))
          || (cotizacion.estado === 'enviada' && onMarcarAceptada)) ? (
        <View style={styles.actionsFooter}>
          {editable && onEnviar && (cotizacion.estado === 'borrador' || cotizacion.emision_pendiente) ? (
            <CotizacionBorradorAcciones
              pendientesPrecio={
                cotizacion.lineas_pendientes_precio?.length
                ?? (cotizacion.repuestos ?? []).filter(lineaPendientePrecio).length
              }
              puedeEnviarFirme={cotizacion.puede_enviar_firme ?? true}
              enviarFirmeLabel={enviarLabel}
              confirmDisabled={enviando}
              sendDisabled={enviando}
              loading={enviando}
              onConfirmarPrecios={() => setConfirmarPreciosVisible(true)}
              onEnviarFirme={() => pedirEnvio('cotizacion')}
            />
          ) : null}
          {editable && onGuardarPlantilla ? (
            <InstitutionalButton
              label="Guardar como plantilla"
              variant="outline"
              onPress={onGuardarPlantilla}
              loading={guardandoPlantilla}
              disabled={guardandoPlantilla}
            />
          ) : null}
          {cotizacion.estado === 'enviada' && onMarcarAceptada ? (
            <InstitutionalButton
              label="Cliente aceptó (manual)"
              variant="success"
              onPress={onMarcarAceptada}
            />
          ) : null}
        </View>
      ) : null}

      {editable && busquedaIaVisible ? (
        <CotizacionIaBusquedaOverlay
          visible
          fase={faseBusquedaIa}
          progreso={progresoBusquedaIa}
        />
      ) : null}

      <RepuestoPrecioSheet
        key={repuestoSheet?.id ?? 'repuesto-sheet'}
        visible={Boolean(repuestoSheet)}
        onClose={() => setRepuestoSheet(null)}
        cotizacion={cotizacion}
        repuesto={repuestoSheet}
        proveedores={proveedores}
        onConfirmar={(payload) => void confirmarPrecioLinea(payload)}
        onAsumir={(modo) => {
          const rid = repuestoSheetRef.current?.id;
          if (rid) void asumirPrecios([String(rid)], modo || 'techo');
        }}
        onEspecificacion={(spec) => {
          const actual = repuestoSheetRef.current;
          if (actual) void definirEspecificacionLinea(actual, spec);
        }}
        onUsarOpcion={(op) => {
          const actual = repuestoSheetRef.current;
          if (actual) void usarOpcionLinea(actual, op.id);
        }}
        loading={precioBusy}
      />

      <ConfirmarPreciosSheet
        visible={confirmarPreciosVisible}
        onClose={() => setConfirmarPreciosVisible(false)}
        cotizacion={cotizacion}
        proveedores={proveedores}
        onAsumir={(ids, modo) => void asumirPrecios(ids, modo || 'techo')}
        onEspecificacion={(repuestoId, spec) => {
          const found = (cotizacion.repuestos ?? []).find((r) => String(r.id) === String(repuestoId));
          if (found) void definirEspecificacionLinea(found, spec);
        }}
        onAbrirDetalle={(rep) => {
          setConfirmarPreciosVisible(false);
          const actual = (cotizacionRef.current.repuestos ?? []).find(
            (r) => String(r.id || '') === String(rep.id || ''),
          );
          setRepuestoSheet(actual || rep);
        }}
        loading={precioBusy}
        onEnviarEstimacion={(onEnviarEstimacion || onEnviar) ? enviarEstimacion : undefined}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    gap: SPACING.fixed.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
  },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  headerTagsCol: { flex: 1, minWidth: 0, gap: SPACING.xs },
  headerTags: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, alignItems: 'center' },
  motorCard: { gap: SPACING.fixed.sm },
  motorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  motorCopy: { flex: 1, minWidth: 0, gap: 2 },
  warningBox: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
    backgroundColor: withOpacity(I.accentYellow, 0.1),
    borderRadius: BORDERS.radius.md,
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
  },
  warningText: { flex: 1 },
  section: { gap: SPACING.fixed.sm },
  repuestosHint: { marginTop: -SPACING.fixed.xs },
  busquedaWebChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xs,
    paddingHorizontal: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.md,
    backgroundColor: withOpacity(I.ink, 0.04),
  },
  busquedaWebChipText: { flex: 1 },
  sectionCard: { gap: SPACING.fixed.sm },
  moneyRowCompact: {
    minHeight: 44,
    paddingVertical: 0,
  },
  specBlock: { gap: SPACING.fixed.xs },
  specChips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.fixed.xs },
  specChip: {
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.surfaceSoft,
  },
  estadoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
  },
  metaTexto: { flexShrink: 1, minWidth: 0 },
  precioMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.xs,
  },
  precioMetaTexto: { flex: 1, minWidth: 0 },
  emptyRepuestos: {
    gap: SPACING.fixed.sm,
    alignItems: 'flex-start',
  },
  repuestosList: {
    gap: SPACING.fixed.sm,
  },
  repuestoCard: {
    gap: SPACING.fixed.sm,
  },
  repuestoTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.xs,
  },
  nombreField: { flex: 1, minWidth: 0, gap: SPACING.fixed.xs },
  repuestoGrid: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
    gap: SPACING.fixed.sm,
  },
  gridColCant: {
    width: 72,
    flexShrink: 0,
  },
  gridColPrecio: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.fixed.xxs,
  },
  gridColSubtotal: {
    width: 104,
    flexShrink: 0,
    alignItems: 'flex-end',
    gap: SPACING.fixed.xxs,
  },
  colLabel: {
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
  },
  colLabelRight: {
    textAlign: 'right',
    width: '100%',
  },
  cantidadAlign: {
    textAlign: 'center',
  },
  subtotalBox: {
    minHeight: 44,
    width: '100%',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  subtotalValue: {
    textAlign: 'right',
  },
  deleteBtn: {
    padding: SPACING.fixed.xs,
    flexShrink: 0,
    marginTop: SPACING.fixed.lg,
  },
  summaryBox: {
    gap: SPACING.fixed.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: I.hairline,
  },
  descuentoBlock: {
    gap: SPACING.fixed.xs,
  },
  descuentoLabel: {
    flex: 1,
    paddingRight: SPACING.fixed.sm,
  },
  totalValue: {
    fontSize: T.h3.fontSize,
  },
  advertenciasBox: { gap: 4 },
  readinessCard: { gap: SPACING.fixed.xs },
  factsColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
  },
  factsColumnsStacked: {
    flexDirection: 'column',
  },
  factsColCard: {
    gap: SPACING.fixed.sm,
  },
  factsCardAction: {
    paddingTop: SPACING.fixed.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  factsColHalf: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'flex-start',
  },
  factsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  factsGrid: {
    gap: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.fixed.md,
  },
  factValue: {
    flex: 1,
    textAlign: 'right',
  },
  factValueRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    gap: 6,
    minWidth: 0,
  },
  contactBlock: {
    gap: SPACING.fixed.xs,
    paddingTop: SPACING.fixed.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  problemaBox: {
    gap: 4,
  },
  warningAfterProblema: {
    marginTop: SPACING.fixed.xs,
  },
  servicioLineaNombre: {
    flex: 1,
    minWidth: 0,
    paddingRight: SPACING.fixed.sm,
  },
  actionsFooter: {
    gap: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
});

export default CotizacionIaEditor;
