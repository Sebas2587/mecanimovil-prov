import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { AlertTriangle, FileDown, MapPin, MessageCircle, Phone } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, withOpacity } from '@/app/design-system/tokens';
import {
  HINT_CLIENTE_SIN_CANAL_CON_TELEFONO,
  HINT_CLIENTE_SIN_CANAL_SIN_TELEFONO,
} from '@/utils/entregaCotizacionCopy';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { TallerPildora } from '@/components/taller/TallerPildora';
import { InstitutionalScreenTabs } from '@/app/design-system/components/InstitutionalScreenTabs';
import { Card } from '@/app/design-system/components';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import { ClpMoneyInput } from '@/components/forms/ClpMoneyInput';
import { CotizacionEditorEncabezado } from '@/components/cotizacion/editor/CotizacionEditorEncabezado';
import { CotizacionEditorManoObra } from '@/components/cotizacion/editor/CotizacionEditorManoObra';
import { CotizacionEditorRepuestos, subtotalRepuesto } from '@/components/cotizacion/editor/CotizacionEditorRepuestos';
import { CotizacionEditorResumen } from '@/components/cotizacion/editor/CotizacionEditorResumen';
import { AvisoSinSenal } from '@/components/ui/AvisoSinSenal';
import { ConfirmarPreciosSheet } from '@/components/cotizacion/ConfirmarPreciosSheet';
import { CotizacionBorradorAcciones } from '@/components/cotizacion/CotizacionBorradorAcciones';
import { SeccionOpcional } from '@/components/cotizacion/SeccionOpcional';
import { RepuestoPrecioSheet } from '@/components/cotizacion/RepuestoPrecioSheet';
import { RevisionCotizador } from '@/components/cotizacion/ValidacionCotizacion';
import { DudasCotizador } from '@/components/cotizacion/DudasCotizador';
import { RevisionTallerBanner } from '@/components/cotizacion/RevisionTallerBanner';
import {
  lineaPendientePrecio,
  COPY_PRECIO_TALLER,
  formatRangoClp,
  montosFichaYTecho,
} from '@/components/cotizacion/repuestoCerteza';
import { useProveedoresRepuestosQuery } from '@/hooks/useProveedoresRepuestosQuery';
import { VerHistorialPatenteLink } from '@/components/vehiculos/VerHistorialPatenteLink';
import { router } from 'expo-router';
import { redondearCLP } from '@/utils/formatearMontoCLP';
import type { CotizacionCanal, ManoObraLinea, RepuestoCotizacion } from '@/services/cotizacionCanalService';
import cotizacionCanalService, {
  MAX_MANO_OBRA_LINEAS,
  calcularDescuentoCotizacion,
  clampDiasValidez,
  cotizacionPermiteEdicionCompleta,
  mergeRepuestosPreservandoEdicion,
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
import { extraerMensajeErrorApi } from '@/utils/extraerMensajeErrorApi';
import { dudasDe } from '@/utils/decisionCotizador';
import {
  envioTotalBloqueado,
  formatearTotalConocido,
  totalesDesdeLineas,
} from '@/utils/totalesCotizacion';
import { abrirOrdenCompraPdf } from '@/utils/abrirOrdenCompraPdf';
import { cotizacionTieneOrdenCompraPdf } from '@/utils/ordenCompraPdf';
import {
  busquedaWebPendiente,
  esBorradorGeneradoPorAgente,
  lineaNecesitaBusquedaPrecio,
  resumenPreciosRepuestos,
} from '@/utils/cotizacionPreciosWeb';
import type { CatalogoFechaHoraValue } from '@/components/solicitudes/CatalogoFechaHoraPickers';

const I = COLORS.institutional;
const T = TYPOGRAPHY.styles;

function desgloseIvaDesdeTotal(totalIvaIncl: number): { neto: number; iva: number; total: number } {
  const total = redondearCLP(totalIvaIncl);
  const neto = Math.round(total / 1.19);
  const iva = total - neto;
  return { neto, iva, total };
}

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
  /** Aire a la derecha para que el FAB no tape avisos ni el total. */
  gutterEnd?: number;
}

export type CotizacionIaEditorHandle = {
  abrirConfirmarPrecios: () => void;
  agregarRepuesto: () => void;
  agregarManoObra: () => void;
};

export const CotizacionIaEditor = React.forwardRef<
  CotizacionIaEditorHandle,
  CotizacionIaEditorProps,
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
  gutterEnd = 0,
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
  const [cancelandoBusqueda, setCancelandoBusqueda] = useState(false);
  const cancelarBusquedaIa = useCallback(async () => {
    if (!cotizacion.id || cancelandoBusqueda) return;
    setCancelandoBusqueda(true);
    try {
      const saved = await cotizacionCanalService.cancelarBusqueda(cotizacion.id);
      onChange(saved);
      setBusquedaIaVisible(false);
    } catch {
      showAlert('No se pudo cancelar', 'La búsqueda sigue en curso.');
    } finally {
      setCancelandoBusqueda(false);
    }
  }, [cancelandoBusqueda, cotizacion.id, onChange]);
  const [cotizandoItems, setCotizandoItems] = useState(false);
  const [repuestoSheet, setRepuestoSheet] = useState<RepuestoCotizacion | null>(null);
  const repuestoSheetRef = useRef<RepuestoCotizacion | null>(null);
  repuestoSheetRef.current = repuestoSheet;
  const [confirmarPreciosVisible, setConfirmarPreciosVisible] = useState(false);
  const [precioBusy, setPrecioBusy] = useState(false);
  const [consultandoRepuestoId, setConsultandoRepuestoId] = useState<string | null>(null);
  const [descargandoOrdenCompra, setDescargandoOrdenCompra] = useState(false);
  const puedePdfOrdenCompra = cotizacionTieneOrdenCompraPdf(cotizacion.id);

  const confirmarDudaCotizador = useCallback(async (id: string) => {
    const current = cotizacionRef.current;
    if (!current.id) return;
    try {
      const next = await cotizacionCanalService.confirmarDuda(current.id, id);
      onChange(next);
    } catch (error) {
      showAlert(
        'No se pudo confirmar',
        extraerMensajeErrorApi(error as { message?: string; response?: { data?: unknown } }, 'Revisa la duda e inténtalo de nuevo.'),
      );
    }
  }, [onChange]);

  const decidirSugerenciaLinea = useCallback(async (rep: RepuestoCotizacion, estado: 'pendiente' | 'aceptada' | 'descartada') => {
    const current = cotizacionRef.current;
    if (!current.id || rep.id == null) return;
    if (estado === 'pendiente') {
      onChange({
        ...current,
        repuestos: (current.repuestos ?? []).map((linea) => (
          linea.id === rep.id ? { ...linea, estado_sugerencia: 'pendiente' } : linea
        )),
      });
      return;
    }
    try {
      const next = await cotizacionCanalService.decidirSugerencia(
        current.id,
        String(rep.id),
        estado === 'aceptada' ? 'aceptar' : 'descartar',
      );
      onChange({
        ...current,
        ...next,
        dudas: next.dudas ?? current.dudas,
        revision_sugerencias: next.revision_sugerencias ?? current.revision_sugerencias,
        repuestos: mergeRepuestosPreservandoEdicion(current.repuestos ?? [], next.repuestos ?? []),
      });
    } catch (error) {
      showAlert(
        'No se pudo decidir',
        extraerMensajeErrorApi(error as { message?: string; response?: { data?: unknown } }, 'Esa línea no es una sugerencia o ya no está.'),
      );
    }
  }, [onChange]);

  const descargarPdfOrdenCompra = useCallback(async () => {
    if (!puedePdfOrdenCompra || descargandoOrdenCompra) return;
    setDescargandoOrdenCompra(true);
    try {
      const { bytes, filename } = await cotizacionCanalService.descargarOrdenCompraPdf(cotizacion.id);
      await abrirOrdenCompraPdf(bytes, filename);
    } catch {
      showAlert('No se pudo obtener el PDF', 'Intenta de nuevo en un momento.');
    } finally {
      setDescargandoOrdenCompra(false);
    }
  }, [cotizacion.id, descargandoOrdenCompra, puedePdfOrdenCompra]);

  const consultarCasasLinea = useCallback(async (rep: RepuestoCotizacion, soloRestantes = false) => {
    const repuestoId = String(rep.id || '');
    if (!cotizacion.id || !repuestoId) return;
    setConsultandoRepuestoId(repuestoId);
    try {
      const res = await cotizacionCanalService.consultarCasas(cotizacion.id, {
        repuesto_id: repuestoId,
        solo_restantes: soloRestantes,
      });
      onChange(res.cotizacion);
      const enviadas = Number(res.resultado?.enviadas || 0);
      if (enviadas <= 0) {
        const motivo = res.resultado?.motivo;
        showAlert(
          'No se consultó',
          motivo === 'sin_casas'
            ? 'Agrega una casa con teléfono en Casas de repuestos.'
            : 'WhatsApp no dejó el mensaje. La casa tiene que haber escrito en las últimas 24 horas, o el hilo está pausado.',
        );
      }
    } catch {
      showAlert('No se pudo consultar', 'Intenta de nuevo.');
    } finally {
      setConsultandoRepuestoId(null);
    }
  }, [cotizacion.id, onChange]);

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

  const canon = totalesDesdeLineas({
    repuestos,
    manoObraLineas: lineasMo,
    descuentoTipo: cotizacion.descuento_tipo,
    descuentoAlcance: cotizacion.descuento_alcance,
    descuentoValor: cotizacion.descuento_valor,
    totalPersistido: cotizacion.total_persistido_clp ?? cotizacion.total_clp,
  });
  const totalCanonTexto = canon.totales_completos && canon.total_clp != null
    ? formatearTotalConocido(canon.total_clp)
    : 'Incompleto';
  const desgloseCanon = canon.totales_completos && canon.total_clp != null
    ? desgloseIvaDesdeTotal(canon.total_clp)
    : null;

  const descuentoActivo = cotizacion.descuento_tipo === 'porcentaje'
    || cotizacion.descuento_tipo === 'monto';

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
      const latest = cotizacionRef.current;
      const fresh = (res.cotizacion.repuestos || []).find((r) => String(r.id) === rid);
      const reps = (latest.repuestos ?? []).map((r) => (
        String(r.id) === rid && fresh ? { ...r, ...fresh } : r
      ));
      onChange({
        ...latest,
        ...res.cotizacion,
        repuestos: reps,
        mano_obra_lineas: latest.mano_obra_lineas ?? res.cotizacion.mano_obra_lineas,
        metadata: {
          ...(latest.metadata || {}),
          ...(res.cotizacion.metadata || {}),
        },
      });
      setRepuestoSheet(null);
    } catch {
      showAlert('No se pudo confirmar', 'Revisa el monto e inténtalo de nuevo.');
    } finally {
      setPrecioBusy(false);
    }
  }, [onChange]);

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
          origen: 'pedido',
          estado_sugerencia: 'aceptada',
        },
        ...reps,
      ],
    });
  }, [onChange]);

  const pedirEnvio = useCallback((tipo: 'estimacion' | 'cotizacion') => {
    const current = cotizacionRef.current;
    if (!onEnviar) return;
    const bloqueo = envioTotalBloqueado(current);
    if (bloqueo) {
      showAlert(bloqueo.includes('duda') ? 'Falta tu opinión' : 'Total incompleto', bloqueo);
      return;
    }
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
    const bloqueo = envioTotalBloqueado(cotizacionRef.current);
    if (bloqueo) {
      showAlert('Total incompleto', bloqueo);
      return;
    }
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
    <View style={[styles.root, gutterEnd ? { paddingRight: gutterEnd } : null]}>
      <AvisoSinSenal ambito="cotizacion" />
      {!sinHeader ? (
        <CotizacionEditorEncabezado
          cotizacion={cotizacion}
          compactHeader={compactHeader}
          vehiculoTitulo={vehiculoTitulo}
        />
      ) : null}

      <RevisionTallerBanner cotizacion={cotizacion} />

      {editable && cotizacion.estado === 'borrador' && cotizacion.metadata?.reabierta_por_taller ? (
        <InstitutionalText role="caption" color="muted">
          Corriges esta cotización en borrador. Confirma precios y vuelve a enviarla. El cliente sigue viendo la versión anterior hasta ese envío.
        </InstitutionalText>
      ) : null}

      {cotizacion.es_cotizacion_adicional && (cotizacion.cita_origen_id || cotizacion.cita_personal_id) ? (
        <TallerPildora
          label={
            cotizacion.servicio_principal_nombre
              ? 'Ver trabajo principal'
              : 'Ver trabajo en curso'
          }
          tono="suave"
          forma="hoja"
          onPress={() => {
            const citaId = cotizacion.cita_origen_id || cotizacion.cita_personal_id;
            if (citaId) router.push(`/cita-agenda-personal/${citaId}`);
          }}
          style={styles.accionSuelta}
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
                <View style={styles.motorCopy}>
                  <InstitutionalText role="captionBold" color="muted">
                    Vehículo
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
            <View style={[styles.factsColCard, !stackedFacts && styles.factsColHalf]}>
              <SeccionOpcional
                title={cotizacion.cliente_nombre?.trim() || 'Cliente'}
                hint={cotizacion.cliente_telefono?.trim() || 'Nombre, teléfono y dirección'}
              >
                <Card elevated padding="host">
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
                      <View style={styles.clienteAcciones}>
                        {cotizacion.cliente_telefono ? (
                          <TouchableOpacity
                            style={styles.iconoCircular}
                            onPress={() => {
                              const tel = (cotizacion.cliente_telefono || '').replace(/[^\d+]/g, '');
                              if (tel) void Linking.openURL(`tel:${tel}`);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Llamar al cliente"
                          >
                            <Phone size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                          </TouchableOpacity>
                        ) : null}
                        {cotizacion.cliente_telefono ? (
                          <TouchableOpacity
                            style={styles.iconoCircular}
                            onPress={() => {
                              const tel = (cotizacion.cliente_telefono || '').replace(/\D/g, '');
                              if (tel) void Linking.openURL(`https://wa.me/${tel}`);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Escribir por WhatsApp"
                          >
                            <MessageCircle size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
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
              </SeccionOpcional>
            </View>
          ) : null}
        </View>
      ) : null}

      {editable || cotizacion.descripcion_problema || cotizacion.aviso_motor ? (
      <SeccionOpcional
        title="Servicio"
        hint={cotizacion.servicio_nombre?.trim() || 'Nombre y detalle del trabajo'}
      >
      <Card elevated={editable} padding="host" style={styles.sectionCard}>
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
        ) : cotizacion.descripcion_problema ? (
          <View style={styles.problemaBox}>
            <InstitutionalText role="caption" color="body">
              {cotizacion.descripcion_problema}
            </InstitutionalText>
          </View>
        ) : null}
        {cotizacion.aviso_motor ? (
          <View style={[styles.warningBox, styles.warningAfterProblema]}>
            <AlertTriangle size={16} color={I.accentYellow} strokeWidth={ICON_STROKE_WIDTH} />
            <InstitutionalText role="caption" color="body" style={styles.warningText}>
              {cotizacion.aviso_motor}
            </InstitutionalText>
          </View>
        ) : null}
      </Card>
      </SeccionOpcional>
      ) : null}

      {(cotizacion.alertas_validacion?.length ?? 0) > 0 ? (
        <SeccionOpcional
          title="Validación del cotizador"
          hint="Compatibilidad, pack vs unidad y enlace"
          defaultOpen
        >
          <RevisionCotizador alertas={cotizacion.alertas_validacion} />
        </SeccionOpcional>
      ) : null}

      <CotizacionEditorManoObra
        lineasMo={lineasMo}
        editable={editable}
        valoresEstimados={Boolean(cotizacion.metadata?.valores_estimativos || cotizacion.metadata?.precio_parcial_catalogo)}
        onUpdate={actualizarManoObraLinea}
        onDelete={eliminarManoObraLinea}
        onAgregar={editable ? agregarManoObraLinea : undefined}
      />

      <CotizacionEditorRepuestos
        repuestos={repuestos}
        editable={editable}
        vehiculoAnio={cotizacion.vehiculo_anio}
        busquedaPendiente={busquedaPendiente}
        resumenPrecios={resumenPrecios}
        cotizandoItems={cotizandoItems}
        onBuscar={editable ? () => { void cotizarItemsConIa(); } : undefined}
        respaldoSinGemini={Boolean(cotizacion.metadata?.respaldo_sin_gemini)}
        avisoMargen={COPY_PRECIO_TALLER.clienteVeMargen}
        onUpdate={actualizarRepuesto}
        onDelete={eliminarRepuesto}
        onConfirmar={abrirConfirmarRepuesto}
        onEspecificacion={definirEspecificacionLinea}
        onBuscarIa={cotizarItemsConIa}
        lineaEnBusquedaWeb={lineaEnBusquedaWeb}
        lineaNecesitaBusquedaPrecio={lineaNecesitaBusquedaPrecio}
        captionRango={(rep) => captionRangoCliente(rep, esEstimacionEmitida, editable)}
        onConsultarCasas={cotizacion.estado === 'borrador' ? consultarCasasLinea : undefined}
        consultandoRepuestoId={consultandoRepuestoId}
        onDecidirSugerencia={editable ? decidirSugerenciaLinea : undefined}
        onAgregar={editable ? agregarRepuesto : undefined}
      />

      <DudasCotizador
        dudas={dudasDe(cotizacion)}
        editable={editable}
        onConfirmar={confirmarDudaCotizador}
      />

      <CotizacionEditorResumen
        canon={canon}
        repuestos={repuestos}
        manoObra={manoObra}
        descuentoLive={descuentoLive}
        esEstimacionEmitida={esEstimacionEmitida}
        bandaCliente={bandaCliente}
        desgloseCanon={desgloseCanon}
        totalCanonTexto={totalCanonTexto}
        servidor={cotizacion}
      />

      {puedePdfOrdenCompra ? (
        <TallerPildora
          label="PDF para casa de repuestos"
          tono="suave"
          forma="hoja"
          loading={descargandoOrdenCompra}
          disabled={descargandoOrdenCompra}
          onPress={() => {
            void descargarPdfOrdenCompra();
          }}
          leading={<FileDown size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
          style={styles.accionSuelta}
        />
      ) : null}

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
            <TallerPildora
              label="Guardar como plantilla"
              tono="suave"
              forma="hoja"
              onPress={onGuardarPlantilla}
              loading={guardandoPlantilla}
              disabled={guardandoPlantilla}
            />
          ) : null}
          {cotizacion.estado === 'enviada' && onMarcarAceptada ? (
            <TallerPildora
              label="Cliente aceptó (manual)"
              tono="coral"
              forma="hoja"
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
          onCancel={() => { void cancelarBusquedaIa(); }}
          cancelando={cancelandoBusqueda}
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
  motivoSeleccionRow: {
    marginTop: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.xs,
    paddingHorizontal: SPACING.fixed.sm,
    backgroundColor: withOpacity(I.accentBlue, 0.05),
    borderRadius: BORDERS.radius.sm,
  },
  motivoSeleccionTexto: {
    fontSize: 13,
    lineHeight: 18,
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
  estadoQuieto: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  estadoPunto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: I.ink,
  },
  estadoPuntoBaja: {
    backgroundColor: I.semanticDown,
  },
  estadoPuntoAlta: {
    backgroundColor: I.semanticUp,
  },
  clienteAcciones: {
    flexDirection: 'row',
    gap: SPACING.fixed.xs,
  },
  iconoCircular: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: I.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.paper,
  },
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
  accionSuelta: {
    alignSelf: 'flex-start',
  },
  actionsFooter: {
    gap: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
});

export default CotizacionIaEditor;
