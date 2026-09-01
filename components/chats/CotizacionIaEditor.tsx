import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { AlertTriangle, Car, MapPin, Phone, Plus, Sparkles, Trash2, UserRound } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, withOpacity } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalScreenTabs } from '@/app/design-system/components/InstitutionalScreenTabs';
import { Card } from '@/app/design-system/components';
import { hostIconPlateStyle } from '@/app/design-system/styles/institutionalSemantic';
import {
  institutionalInputPlaceholder,
  institutionalInputStyles,
} from '@/app/design-system/styles/institutionalInputs';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import { VerHistorialPatenteLink } from '@/components/vehiculos/VerHistorialPatenteLink';
import { router } from 'expo-router';
import {
  formatearMontoCLP,
  redondearCLP,
} from '@/utils/formatearMontoCLP';
import {
  formatMontoInputLocalized,
  parseMontoDecimal,
} from '@/utils/parseMontoDecimal';
import type { CotizacionCanal, ManoObraLinea, RepuestoCotizacion } from '@/services/cotizacionCanalService';
import cotizacionCanalService, {
  MAX_MANO_OBRA_LINEAS,
  calcularDescuentoCotizacion,
  clampDiasValidez,
  cotizacionPermiteEdicionCompleta,
  resolverManoObraLineas,
  sumaManoObraLineas,
} from '@/services/cotizacionCanalService';
import { CotizarItemsIaModal } from '@/components/chats/CotizarItemsIaModal';
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

/** Fuentes verificables (catálogo/historial/web/ML); 'estimado' es solo una inferencia por nombre. */
function fuenteEsVerificada(rep: RepuestoCotizacion): boolean {
  const key = (rep.fuente_marketplace || rep.fuente_repuesto || '').trim().toLowerCase();
  return (
    key === 'mercadolibre'
    || key === 'catalogo'
    || key === 'catálogo'
    || key === 'historial'
    || key === 'web'
  );
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

function lineaSinPrecioParaIa(rep: RepuestoCotizacion): boolean {
  const nombre = (rep.nombre || '').trim().toLowerCase();
  if (!nombre || nombre === 'repuesto') return false;
  const key = (rep.fuente_marketplace || '').trim().toLowerCase();
  if (key === 'catalogo' || key === 'catálogo' || key === 'historial') return false;
  return !rep.precio_unitario_clp || rep.precio_unitario_clp <= 0;
}

/** Fusiona repuestos enriquecidos por web sin pisar nombres editados localmente. */
function mergeRepuestosPreservandoEdicion(
  local: RepuestoCotizacion[],
  remoto: RepuestoCotizacion[],
): RepuestoCotizacion[] {
  if (!remoto.length) return local;
  const remoteIds = new Set(remoto.map((r) => r.id).filter(Boolean));
  const merged = remoto.map((rRem, idx) => {
    const rLoc = rRem.id
      ? local.find((l) => l.id === rRem.id)
      : local[idx];
    if (!rLoc) return rRem;
    const nombreLocal = (rLoc.nombre || '').trim();
    const localCero = !rLoc.precio_unitario_clp;
    const remoteMejor = fuenteEsVerificada(rRem)
      || ((rRem.precio_unitario_clp || 0) > 0 && localCero);
    return {
      ...rRem,
      nombre: nombreLocal || rRem.nombre,
      cantidad: rLoc.cantidad ?? rRem.cantidad,
      precio_unitario_clp: remoteMejor
        ? rRem.precio_unitario_clp
        : (rLoc.precio_unitario_clp ?? rRem.precio_unitario_clp),
    };
  });
  const extras = local.filter((l) => {
    const nombre = (l.nombre || '').trim();
    if (!nombre || nombre.toLowerCase() === 'repuesto') return false;
    return Boolean(l.id && !remoteIds.has(l.id));
  });
  return extras.length ? [...merged, ...extras] : merged;
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

interface ClpMoneyInputProps {
  value: number;
  onChangeValue: (next: number) => void;
  editable: boolean;
  placeholder?: string;
  compact?: boolean;
}

function ClpMoneyInput({
  value,
  onChangeValue,
  editable,
  placeholder = '0',
  compact = false,
}: ClpMoneyInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() =>
    value > 0 ? formatMontoInputLocalized(value) : '',
  );

  // Solo sincroniza desde props cuando no se está escribiendo (evita borrar el monto a mitad de tipeo).
  useEffect(() => {
    if (focused) return;
    setDraft(value > 0 ? formatMontoInputLocalized(value) : '');
  }, [value, focused]);

  return (
    <View
      style={[
        institutionalInputStyles.inputRow,
        compact && styles.moneyRowCompact,
      ]}
    >
      <InstitutionalText role="body" color="muted" style={institutionalInputStyles.inputRowPrefix}>
        $
      </InstitutionalText>
      <TextInput
        style={[
          institutionalInputStyles.inputRowField,
          institutionalInputStyles.inputMono,
          compact && institutionalInputStyles.inputCompact,
        ]}
        keyboardType="number-pad"
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={institutionalInputPlaceholder}
        value={draft}
        onFocus={() => {
          setFocused(true);
          // Editar en dígitos crudos evita pelear con puntos de miles (es-CL).
          setDraft(value > 0 ? String(Math.round(value)) : '');
        }}
        onBlur={() => {
          const next = redondearCLP(parseMontoDecimal(draft));
          onChangeValue(next);
          setDraft(next > 0 ? formatMontoInputLocalized(next) : '');
          setFocused(false);
        }}
        onChangeText={(t) => {
          const cleaned = t.replace(/[^\d]/g, '');
          setDraft(cleaned);
          onChangeValue(redondearCLP(parseMontoDecimal(cleaned)));
        }}
      />
    </View>
  );
}

const RepuestoRow = React.memo(function RepuestoRow({
  rep,
  index,
  editable,
  onUpdate,
  onDelete,
}: {
  rep: RepuestoCotizacion;
  index: number;
  editable: boolean;
  onUpdate: (index: number, patch: Partial<RepuestoCotizacion>) => void;
  onDelete: (index: number) => void;
}) {
  const subtotal = subtotalRepuesto(rep);
  const marcaPieza = (rep.marca_repuesto || '').trim();
  const origenLabel = origenTagLabel(rep);
  const urlProducto = (rep.url_producto || '').trim();
  const mostrarEstimado = rep.precio_estimado !== false
    && !fuenteEsVerificada(rep)
    && !rep.precio_referencia_mercado;
  const nombreGuardado = (rep.nombre || '').trim();

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

      {(marcaPieza || origenLabel || mostrarEstimado) ? (
        <View style={styles.fuenteBadgeRow}>
          {marcaPieza ? (
            <InstitutionalTag
              label={`Marca ${marcaPieza}`}
              variant="neutral"
              size="sm"
            />
          ) : null}
          {origenLabel ? (
            urlProducto ? (
              <TouchableOpacity
                onPress={() => {
                  Linking.openURL(urlProducto).catch(() => undefined);
                }}
                accessibilityRole="link"
                accessibilityLabel={`Abrir ${origenLabel}`}
              >
                <InstitutionalTag
                  label={origenLabel}
                  variant="info"
                  size="sm"
                />
              </TouchableOpacity>
            ) : (
              <InstitutionalTag
                label={origenLabel}
                variant="neutral"
                size="sm"
              />
            )
          ) : null}
          {mostrarEstimado ? (
            <InstitutionalTag
              label="Precio estimado — revisar"
              variant="warning"
              size="sm"
            />
          ) : null}
        </View>
      ) : null}

      <View style={styles.repuestoGrid}>
        <View style={styles.gridColCant}>
          <InstitutionalField
            label="Cant."
            compact
            mono
            value={String(redondearCLP(rep.cantidad || 1))}
            onChangeText={(t) =>
              onUpdate(index, {
                cantidad: Math.max(1, parseInt(t.replace(/\D/g, ''), 10) || 1),
              })
            }
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
            compact
            value={redondearCLP(rep.precio_unitario_clp)}
            editable={editable}
            onChangeValue={(next) => onUpdate(index, { precio_unitario_clp: next })}
          />
        </View>

        <View style={styles.gridColSubtotal}>
          <InstitutionalText role="label" color="muted" style={[styles.colLabel, styles.colLabelRight]}>
            Subtotal
          </InstitutionalText>
          <InstitutionalText role="numberDisplay" color="ink" style={styles.subtotalValue} numberOfLines={1}>
            {formatearMontoCLP(subtotal)}
          </InstitutionalText>
        </View>
      </View>
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

const DESCUENTO_ALCANCE_TABS = [
  { key: 'mano_obra' as const, label: 'Mano de obra' },
  { key: 'total' as const, label: 'Total' },
];

interface CotizacionIaEditorProps {
  cotizacion: CotizacionCanal;
  onChange: (next: CotizacionCanal) => void;
  onEnviar?: () => void;
  onGuardarPlantilla?: () => void;
  onMarcarAceptada?: () => void;
  enviarLabel?: string;
  enviando?: boolean;
  guardandoPlantilla?: boolean;
  /** Oculta botones de envío (el host modal usa footer propio). */
  hideSendActions?: boolean;
  readonly?: boolean;
  /** Encabezado compacto (tags + título de servicio) para modal y detalle. */
  compactHeader?: boolean;
  /** Oculta la fila de encabezado (p. ej. plantilla en BottomSheet con header propio). */
  sinHeader?: boolean;
}

export function CotizacionIaEditor({
  cotizacion,
  onChange,
  onEnviar,
  onGuardarPlantilla,
  onMarcarAceptada,
  enviarLabel = 'Enviar cotización al cliente',
  enviando = false,
  guardandoPlantilla = false,
  hideSendActions = false,
  readonly = false,
  compactHeader = false,
  sinHeader = false,
}: CotizacionIaEditorProps) {
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const stackedFacts = width < 520;
  const repuestos = cotizacion.repuestos ?? [];
  const editable = !readonly;
  const lineasMo = useMemo(() => resolverManoObraLineas(cotizacion), [cotizacion]);
  const manoObra = sumaManoObraLineas(lineasMo);
  const busquedaPendiente = cotizacion.metadata?.busqueda_web_estado === 'pendiente';
  const appliedWebRef = useRef<string | null>(null);
  const pendientePrevRef = useRef(false);
  const cotizacionRef = useRef(cotizacion);
  cotizacionRef.current = cotizacion;

  const [modalItemsIa, setModalItemsIa] = useState(false);
  const [cotizandoItems, setCotizandoItems] = useState(false);
  const lineasSinPrecio = useMemo(
    () => repuestos.filter(lineaSinPrecioParaIa).length,
    [repuestos],
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

  useEffect(() => {
    if (!detalleRefrescado || !busquedaPendiente) return;
    const estado = detalleRefrescado.metadata?.busqueda_web_estado;
    if (!estado || estado === 'pendiente') return;
    const remoteCount = (detalleRefrescado.repuestos ?? []).length;
    const localCount = (cotizacion.repuestos ?? []).length;
    const remotoEn = detalleRefrescado.actualizado_en || '';
    const localEn = cotizacion.actualizado_en || '';
    if (remoteCount < localCount) return;
    if (remotoEn && localEn && remotoEn < localEn) return;
    const stamp = `${detalleRefrescado.id}:${detalleRefrescado.actualizado_en || estado}`;
    if (appliedWebRef.current === stamp) return;
    appliedWebRef.current = stamp;
    const repsIn = detalleRefrescado.repuestos ?? cotizacion.repuestos ?? [];
    const reps = mergeRepuestosPreservandoEdicion(cotizacion.repuestos ?? [], repsIn);
    onChange({
      ...cotizacion,
      repuestos: reps,
      mano_obra_clp: detalleRefrescado.mano_obra_clp ?? cotizacion.mano_obra_clp,
      costo_repuestos_clp: detalleRefrescado.costo_repuestos_clp ?? cotizacion.costo_repuestos_clp,
      total_clp: detalleRefrescado.total_clp ?? cotizacion.total_clp,
      metadata: {
        ...(cotizacion.metadata || {}),
        ...(detalleRefrescado.metadata || {}),
      },
      actualizado_en: detalleRefrescado.actualizado_en || cotizacion.actualizado_en,
    });
  }, [busquedaPendiente, cotizacion, detalleRefrescado, onChange]);


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

  const desgloseTotal = useMemo(
    () => desgloseIvaDesdeTotal(totalCalculado),
    [totalCalculado],
  );

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
      ...current,
      {
        id: `mo-${Date.now()}`,
        nombre: '',
        monto_clp: 0,
      },
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

  const agregarRepuesto = useCallback(() => {
    const current = cotizacionRef.current;
    const reps = current.repuestos ?? [];
    onChange({
      ...current,
      repuestos: [
        ...reps,
        {
          id: `rep-${Date.now()}`,
          nombre: 'Repuesto',
          cantidad: 1,
          precio_unitario_clp: 0,
        },
      ],
    });
  }, [onChange]);

  const cotizarItemsConIa = useCallback(async (nombres: string[]) => {
    const current = cotizacionRef.current;
    if (!current.id || !cotizacionPermiteEdicionCompleta(current)) return;
    setCotizandoItems(true);
    try {
      const resultado = await cotizacionCanalService.cotizarItems(current.id, {
        nombres,
        repuestos: current.repuestos ?? [],
      });
      onChange({
        ...current,
        ...resultado.cotizacion,
        metadata: {
          ...(current.metadata || {}),
          ...(resultado.cotizacion.metadata || {}),
        },
      });
      await queryClient.invalidateQueries({
        queryKey: [COTIZACION_CANAL_DETALLE_QUERY_KEY, current.id],
      });
      setModalItemsIa(false);
    } catch (err: unknown) {
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
    }
  }, [onChange, queryClient]);

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
              <VerHistorialPatenteLink patente={cotizacion.vehiculo_patente || ''} />
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
          actionLabel={editable && lineasMo.length < MAX_MANO_OBRA_LINEAS ? 'Agregar' : undefined}
          onActionPress={editable ? agregarManoObraLinea : undefined}
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
          <Card
            elevated
            padding="host"
            style={styles.emptyRepuestos}
            onPress={editable ? agregarManoObraLinea : undefined}
          >
            <InstitutionalText role="caption" color="muted">
              Sin líneas de trabajo
            </InstitutionalText>
            {editable ? (
              <View style={styles.emptyAdd}>
                <Plus size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <InstitutionalText role="captionBold" color="primary">
                  Agregar mano de obra
                </InstitutionalText>
              </View>
            ) : null}
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
          actionLabel={editable ? 'Agregar' : undefined}
          onActionPress={editable ? agregarRepuesto : undefined}
        />
        {busquedaPendiente ? (
          <View style={styles.busquedaWebChip}>
            <ActivityIndicator size="small" color={I.muted} />
            <InstitutionalText role="caption" color="muted" style={styles.busquedaWebChipText}>
              Buscando precios y tiendas reales…
            </InstitutionalText>
          </View>
        ) : null}
        <InstitutionalText role="caption" color="muted" style={styles.repuestosHint}>
          Solo aparecen Marca/Canal/Proveedor si vienen de tus servicios publicados,
          tu historial, una búsqueda web verificada o un listing real. Sin eso, el precio
          es estimado: revísalo antes de enviar al cliente.
        </InstitutionalText>
        {editable ? (
          <View style={styles.iaRepuestosBlock}>
            <InstitutionalButton
              label="Buscar precios de repuestos"
              variant="outline"
              size="compact"
              disabled={busquedaPendiente || cotizandoItems}
              onPress={() => setModalItemsIa(true)}
              leading={<Sparkles size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
            />
            <InstitutionalText role="caption" color="muted">
              La IA completa precios de piezas. No cambia la mano de obra ni las líneas
              que ya tienen precio.
            </InstitutionalText>
          </View>
        ) : null}

        {repuestos.length === 0 ? (
          <Card
            elevated
            padding="host"
            style={styles.emptyRepuestos}
            onPress={editable ? agregarRepuesto : undefined}
          >
            <InstitutionalText role="caption" color="muted">
              Sin repuestos listados
            </InstitutionalText>
            {editable ? (
              <View style={styles.emptyAdd}>
                <Plus size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <InstitutionalText role="captionBold" color="primary">
                  Agregar repuesto
                </InstitutionalText>
              </View>
            ) : null}
          </Card>
        ) : (
          <View style={styles.repuestosList}>
            {repuestos.map((rep, idx) => (
              <RepuestoRow
                key={rep.id ?? `rep-${idx}`}
                rep={rep}
                index={idx}
                editable={editable}
                onUpdate={actualizarRepuesto}
                onDelete={eliminarRepuesto}
              />
            ))}
          </View>
        )}
      </View>

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
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <InstitutionalText role="h5" color="ink">
            Total a pagar
          </InstitutionalText>
          <InstitutionalText role="numberDisplay" color="ink" style={styles.totalValue}>
            {formatearMontoCLP(desgloseTotal.total)}
          </InstitutionalText>
        </View>
        <InstitutionalText role="caption" color="muted">
          Los precios de línea ya incluyen IVA. El desglose neto/IVA es informativo.
        </InstitutionalText>
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
          {editable && onEnviar && cotizacion.estado === 'borrador' ? (
            <InstitutionalButton
              label={enviarLabel}
              onPress={() => {
                if (
                  cotizacion.es_cotizacion_adicional
                  && cotizacion.ejecucion_adicional === 'nueva_fecha'
                  && (!cotizacion.fecha_propuesta || !cotizacion.hora_propuesta)
                ) {
                  showAlert(
                    'Fecha requerida',
                    'Indica día y hora acordados con el cliente antes de enviar.',
                  );
                  return;
                }
                onEnviar();
              }}
              loading={enviando}
              disabled={enviando}
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

      {editable ? (
        <CotizarItemsIaModal
          visible={modalItemsIa}
          onClose={() => {
            if (!cotizandoItems) setModalItemsIa(false);
          }}
          onConfirm={cotizarItemsConIa}
          loading={cotizandoItems}
          lineasSinPrecio={lineasSinPrecio}
        />
      ) : null}
    </View>
  );
}

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
  iaRepuestosBlock: { gap: SPACING.fixed.xs },
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
  emptyRepuestos: {
    gap: SPACING.fixed.sm,
    alignItems: 'flex-start',
  },
  emptyAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
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
  subtotalValue: {
    minHeight: 44,
    textAlign: 'right',
    textAlignVertical: 'center',
    lineHeight: 44,
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
    alignItems: 'stretch',
    gap: SPACING.fixed.sm,
  },
  factsColumnsStacked: {
    flexDirection: 'column',
  },
  factsColCard: {
    gap: SPACING.fixed.sm,
  },
  factsColHalf: {
    flex: 1,
    minWidth: 0,
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
  fuenteBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
    marginBottom: SPACING.fixed.xs,
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
