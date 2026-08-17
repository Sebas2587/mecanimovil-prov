import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { EstadoBanner } from '@/components/solicitudes/EstadoBanner';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  SHADOWS,
  BORDERS,
  withOpacity,
  platformShadow,
  noShadow,
} from '@/app/design-system/tokens';
import {
  HostSectionKicker,
  HostPaperSection,
  HostMetricRow,
  HostAvatar,
  hostScreenStyles,
  HOST_GUTTER,
} from '@/app/design-system/components';
import {
  agendaProveedorService,
  nombreServicioCita,
  type CitaAgendaPersonal,
  type CitaAgendaPersonalCreatePayload,
} from '@/services/agendaProveedorService';
import {
  CatalogoFechaHoraPickers,
  formatDateApi,
  resolveInitialPickerValue,
  type CatalogoFechaHoraValue,
} from '@/components/solicitudes/CatalogoFechaHoraPickers';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import { MontoCLPField, parsePrecioReferencia, formatMontoInputLocalized } from '@/components/forms/MontoCLPField';
import { ChilePhoneField, getChilePhoneError } from '@/components/forms/ChilePhoneField';
import ChileAddressField from '@/components/forms/ChileAddressField';
import type { ChileFormattedAddress } from '@/utils/chileAddressSearch';
import { extraerNueveDigitosDesdeGuardado, normalizarTelefonoChileParaGuardar } from '@/utils/chilePhone';
import { calcularDuracionMinutos, esRangoHorarioValido, sumarMinutosAHora } from '@/utils/citaPersonalHorario';
import { parseFechaLocal, formatFechaHoraPropuesta } from '@/utils/fechaLocal';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { consultarPatente } from '@/services/vehiculoService';
import { showAlert, showConfirm } from '@/utils/platformAlert';
import { etiquetaModalidadMecanico } from '@/services/equipoTallerService';
import { invalidateProveedorMarketplaceQueries } from '@/utils/invalidateProveedorMarketplace';
import { useCitaPersonalQuery } from '@/hooks/useCitaPersonalQuery';
import { useAuth } from '@/context/AuthContext';
import { puedeUsarAsistenteIaEnCita } from '@/utils/asistenteIaPermisos';
import { AsistenteDiagnosticoCard } from '@/components/orden-detalle/AsistenteDiagnosticoCard';
import { ChecklistContainer } from '@/components/checklist/ChecklistContainer';
import { ChecklistCompletedView } from '@/components/checklist/ChecklistCompletedView';
import { ChecklistSignatureModal } from '@/components/checklist/ChecklistSignatureModal';
import { AsignarTecnicoBottomSheet } from '@/components/equipo/AsignarTecnicoBottomSheet';
import { ConfirmarHorarioCitaSheet } from '@/components/agenda/ConfirmarHorarioCitaSheet';
import { CitaResumenEconomicoCard } from '@/components/agenda/CitaResumenEconomicoCard';
import { InstitutionalButton } from '@/design-system/components/InstitutionalButton';
import { InstitutionalTag } from '@/design-system/components/InstitutionalTag';
import { cilindrajeEfectivo } from '@/utils/extraerCilindrajeDesdeTexto';
import { checklistService } from '@/services/checklistService';
import {
  ESTADO_OPERATIVO_LABELS,
  ESTADO_OPERATIVO_VARIANT,
  mapCitaEstadoOperativo,
} from '@/utils/estadoOperativo';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;
const lh = (fontSize: number, lineHeightMult: number) => Math.round(fontSize * lineHeightMult);

const shadowFooter = platformShadow({
  shadowColor: COLORS.base.inkBlack,
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 8,
});

type FeedbackAccion = {
  tipo: 'success' | 'error' | 'warning';
  titulo: string;
  mensaje: string;
};

function formatDuracion(min?: number): string | null {
  if (!min || min <= 0) return null;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

const stackOptions = {
  title: 'Cita personal',
  headerBackTitle: '',
  headerBackTitleVisible: false as const,
  headerShadowVisible: false,
  headerStyle: {
    backgroundColor: I.canvas,
    borderBottomWidth: 0,
    ...noShadow,
  },
  headerTintColor: I.ink,
};

export default function CitaAgendaPersonalDetalleScreen() {
  const { id, agendar } = useLocalSearchParams<{ id: string; agendar?: string }>();
  const autoAgendarRef = useRef(false);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { esMecanicoEquipo, miembroId, estadoProveedor, esSupervisor, rolTaller, puede } = useAuth();
  const esProveedorDomicilio = estadoProveedor?.tipo_proveedor === 'mecanico';
  const esMandanteTaller = rolTaller === 'mandante';
  const scrollRef = useRef<ScrollView>(null);
  const citaId = Number(id);
  const permitirEditarCita = !esMecanicoEquipo;
  const permitirEliminarCita = !esMecanicoEquipo;

  const {
    data: cita,
    isPending: citaPending,
    isError: citaError,
    refetch: refetchCita,
  } = useCitaPersonalQuery(Number.isNaN(citaId) ? null : citaId);

  const showInitialLoader = !Number.isNaN(citaId) && citaPending && !cita;

  const [procesando, setProcesando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [feedbackAccion, setFeedbackAccion] = useState<FeedbackAccion | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showChecklistResumen, setShowChecklistResumen] = useState(false);
  const [showSupervisorFirmaModal, setShowSupervisorFirmaModal] = useState(false);
  const [firmandoSupervisor, setFirmandoSupervisor] = useState(false);
  const [asignarVisible, setAsignarVisible] = useState(false);
  const [confirmarHorarioVisible, setConfirmarHorarioVisible] = useState(false);
  const [miembroParaHorario, setMiembroParaHorario] = useState<number | null | undefined>(undefined);
  const [iniciandoChecklist, setIniciandoChecklist] = useState(false);

  const mostrarFeedback = useCallback((feedback: FeedbackAccion) => {
    setFeedbackAccion(feedback);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [direccionValidada, setDireccionValidada] = useState<ChileFormattedAddress | null>(null);
  const [vehiculoMarca, setVehiculoMarca] = useState('');
  const [vehiculoModelo, setVehiculoModelo] = useState('');
  const [vehiculoPatente, setVehiculoPatente] = useState('');
  const [vehiculoVin, setVehiculoVin] = useState('');
  const [buscandoPatente, setBuscandoPatente] = useState(false);
  const [servicioNombre, setServicioNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precioReferencia, setPrecioReferencia] = useState('');
  const [tipoServicio, setTipoServicio] = useState<'taller' | 'domicilio'>('taller');
  const [fechaHora, setFechaHora] = useState<CatalogoFechaHoraValue>(() =>
    resolveInitialPickerValue(),
  );

  const recargarCita = useCallback(async () => {
    const result = await refetchCita();
    return result.data ?? null;
  }, [refetchCita]);

  const ubicacionTallerPreferida = useMemo(() => {
    const lat = estadoProveedor?.datos_proveedor?.ubicacion_lat;
    const lng = estadoProveedor?.datos_proveedor?.ubicacion_lng;
    if (lat == null || lng == null) return null;
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!Number.isFinite(latN) || !Number.isFinite(lngN) || (latN === 0 && lngN === 0)) {
      return null;
    }
    return { lat: latN, lng: lngN };
  }, [estadoProveedor?.datos_proveedor?.ubicacion_lat, estadoProveedor?.datos_proveedor?.ubicacion_lng]);

  const handleFirmarSupervisorDesdeCita = useCallback(
    async (firmaSupervisor: string) => {
      if (!cita?.checklist_id) {
        showAlert('Error', 'No hay checklist asociado a esta cita.');
        return;
      }
      setShowSupervisorFirmaModal(false);
      setFirmandoSupervisor(true);
      try {
        const result = await checklistService.firmarSupervisor(cita.checklist_id, firmaSupervisor);
        if (!result.success) {
          showAlert('Error', result.message || 'No se pudo registrar la firma del supervisor');
          return;
        }
        const informeUrl = result.data?.informe?.url;
        const enviado = result.data?.informe?.enviado;
        const via = result.data?.informe?.via;
        await recargarCita();
        if (informeUrl) {
          const viaLabel =
            via === 'whatsapp'
              ? 'WhatsApp'
              : via === 'instagram'
                ? 'Instagram'
                : via === 'messenger'
                  ? 'Messenger'
                  : via === 'app'
                    ? 'Mecanimovil'
                    : null;
          showAlert(
            'Informe generado',
            enviado && viaLabel
              ? `El informe se envió al cliente por ${viaLabel}. También puedes copiar el enlace desde esta pantalla.`
              : 'Comparte el enlace del informe para que el cliente revise y firme el servicio.',
          );
        } else {
          showAlert('Listo', 'Trabajo rectificado. Informe listo para el cliente.');
        }
      } catch {
        showAlert('Error', 'Ocurrió un error al firmar como supervisor');
      } finally {
        setFirmandoSupervisor(false);
      }
    },
    [cita?.checklist_id, recargarCita],
  );

  useEffect(() => {
    if (cita) poblarFormulario(cita);
  }, [cita]);

  useEffect(() => {
    if (!citaError || cita) return;
    showAlert('Error', 'No se pudo cargar la cita.');
    router.back();
  }, [citaError, cita]);

  function poblarFormulario(data: CitaAgendaPersonal) {
    const det = data.detalle;
    setClienteNombre(det.cliente_nombre || '');
    setClienteTelefono(det.cliente_telefono || '');
    setDireccion(det.direccion || '');
    setVehiculoMarca(det.vehiculo_marca || '');
    setVehiculoModelo(det.vehiculo_modelo || '');
    setVehiculoPatente(det.vehiculo_patente || '');
    setVehiculoVin(det.vehiculo_vin || '');
    setServicioNombre(det.servicio_nombre || det.servicio_nombre_resuelto || '');
    setDescripcion(det.descripcion || '');
    setPrecioReferencia(
      det.precio_referencia != null ? formatMontoInputLocalized(det.precio_referencia) : '',
    );
    setTipoServicio(data.tipo_servicio);
    setDireccionValidada(null);
    setFechaHora(
      resolveInitialPickerValue(
        data.fecha_servicio,
        data.hora_servicio,
        data.duracion_minutos ?? 60,
      ),
    );
  }

  const esActiva = cita?.estado === 'activa';
  const esCancelada = cita?.estado === 'cancelada';
  const horarioPorConfirmar = Boolean(cita?.horario_por_confirmar);
  const citaAgendada = esActiva && !horarioPorConfirmar;
  const checklistEstado = cita?.checklist_estado ?? null;
  const checklistIniciado = !!checklistEstado && checklistEstado !== 'PENDIENTE';
  const checklistEnEjecucion =
    checklistEstado === 'EN_PROGRESO' || checklistEstado === 'PAUSADO';
  const adicionalPendienteId = cita?.cotizacion_adicional_pendiente_id ?? null;
  const permitirAgregarHallazgo = Boolean(
    cita?.permite_cotizacion_adicional
    && cita?.cotizacion_canal_origen_id
    && checklistEnEjecucion
    && !adicionalPendienteId,
  );
  const puedeActualizarCotizacion = Boolean(
    esActiva
    && cita?.cotizacion_canal_origen_id
    && !checklistIniciado
    && !horarioPorConfirmar,
  );
  const esDiaServicio = Boolean(
    cita?.puede_iniciar_servicio_hoy
    ?? (cita?.fecha_servicio && (() => {
      const f = parseFechaLocal(cita.fecha_servicio);
      if (!f) return false;
      const hoy = new Date();
      return f.getFullYear() === hoy.getFullYear()
        && f.getMonth() === hoy.getMonth()
        && f.getDate() === hoy.getDate();
    })()),
  );
  const checklistEnCurso =
    checklistEstado === 'EN_PROGRESO'
    || checklistEstado === 'PAUSADO'
    || checklistEstado === 'PENDIENTE_FIRMA_SUPERVISOR'
    || checklistEstado === 'PENDIENTE_FIRMA_CLIENTE';
  const checklistCompletado = checklistEstado === 'COMPLETADO';
  const checklistPendienteSupervisor = checklistEstado === 'PENDIENTE_FIRMA_SUPERVISOR';
  const checklistPendienteFirmaCliente = checklistEstado === 'PENDIENTE_FIRMA_CLIENTE';
  // El backend decide PENDIENTE_FIRMA_SUPERVISOR cuando hay taller_id;
  // no filtrar por tipo_servicio para no ocultar la firma si fue a domicilio del taller.
  const puedeRectificarSupervisor =
    checklistPendienteSupervisor
    && (esMandanteTaller || esSupervisor)
    && !esMecanicoEquipo;
  const puedeCancelarCita = esActiva && (cita?.puede_cancelar !== false) && !checklistIniciado;

  // Flujo: mecánico llena → supervisor/mandante revisa → cliente cierra.
  const esTecnicoAsignado =
    esMecanicoEquipo
    && miembroId != null
    && cita?.miembro_taller != null
    && Number(miembroId) === Number(cita.miembro_taller);
  const enEtapaRevisionOCierre =
    checklistPendienteSupervisor
    || checklistPendienteFirmaCliente
    || checklistCompletado;
  // Llenado de ítems (no revisión ni cierre del cliente).
  const puedeOperarChecklist = (() => {
    if (enEtapaRevisionOCierre) return false;
    if (esMecanicoEquipo) return esTecnicoAsignado;
    // Cita personal: mandante/supervisor pueden ejecutar el servicio si no hay
    // mecánico de app, o hasta enviar a revisión (firma técnico → supervisor).
    if (esMandanteTaller || esSupervisor) return true;
    if (!cita?.miembro_taller) return true;
    return !checklistIniciado;
  })();
  const mostrarProgresoChecklist =
    !!cita?.checklist_id
    && checklistIniciado
    && !puedeOperarChecklist
    && !enEtapaRevisionOCierre;

  const footerBottomPad = Math.max(insets.bottom, Platform.OS === 'web' ? 12 : 0);

  const muestraFooterAcciones = esActiva || (esCancelada && permitirEliminarCita);

  useEffect(() => {
    if (esMecanicoEquipo && editando) {
      setEditando(false);
    }
  }, [esMecanicoEquipo, editando]);

  // Taller/supervisor: refrescar progreso mientras el técnico trabaja el checklist.
  useEffect(() => {
    if (!mostrarProgresoChecklist || !citaId || Number.isNaN(citaId)) return;
    const timer = setInterval(() => {
      void refetchCita();
    }, 15_000);
    return () => clearInterval(timer);
  }, [mostrarProgresoChecklist, citaId, refetchCita]);

  const puedeIniciarServicioSticky = Boolean(
    esActiva
    && cita?.tiene_checklist
    && puedeOperarChecklist
    && !cita.checklist_id
    && citaAgendada
    && esDiaServicio
    && !editando,
  );
  const puedeContinuarChecklistSticky = Boolean(
    esActiva
    && puedeOperarChecklist
    && cita?.checklist_id
    && !checklistCompletado
    && !checklistPendienteSupervisor
    && !checklistPendienteFirmaCliente
    && !editando,
  );
  const mostrarStickyPrimario = Boolean(
    (horarioPorConfirmar && permitirEditarCita)
    || puedeIniciarServicioSticky
    || puedeContinuarChecklistSticky
    || puedeRectificarSupervisor
    || (citaAgendada && !cita?.tiene_checklist && !editando)
    || puedeCancelarCita
    || (esActiva && editando && permitirEditarCita)
    || (esCancelada && permitirEliminarCita),
  );

  const footerReserve = useMemo(() => {
    if (!muestraFooterAcciones || !mostrarStickyPrimario) {
      return SPACING.fixed.lg + footerBottomPad;
    }
    if (esActiva && editando) {
      return 72 + footerBottomPad + SPACING.fixed.md;
    }
    // Una sola fila: cancelar (izq) + CTA primario (der)
    return 64 + footerBottomPad + SPACING.fixed.md;
  }, [
    muestraFooterAcciones,
    mostrarStickyPrimario,
    esActiva,
    editando,
    footerBottomPad,
  ]);

  const handleLlamar = useCallback(() => {
    const tel = cita?.detalle.cliente_telefono;
    if (tel) Linking.openURL(`tel:${tel}`);
  }, [cita]);

  const handlePatenteBlur = useCallback(async () => {
    const patente = vehiculoPatente.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (patente.length < 5) return;
    setBuscandoPatente(true);
    try {
      const data = await consultarPatente(patente);
      setVehiculoPatente(data.patente || patente);
      if (data.marca_nombre?.trim()) setVehiculoMarca(data.marca_nombre.trim());
      if (data.modelo_nombre?.trim()) setVehiculoModelo(data.modelo_nombre.trim());
      if (data.vin?.trim()) setVehiculoVin(data.vin.trim().toUpperCase());
    } catch {
      // Mantener datos manuales si la patente no se encuentra.
    } finally {
      setBuscandoPatente(false);
    }
  }, [vehiculoPatente]);

  const ejecutarCerrar = useCallback(async () => {
    setFeedbackAccion(null);
    setProcesando(true);
    try {
      const res = await agendaProveedorService.cerrarCita(citaId);
      if (res.success) {
        setEditando(false);
        await recargarCita();
        invalidateProveedorMarketplaceQueries(queryClient);
        mostrarFeedback({
          tipo: 'success',
          titulo: 'Cita completada',
          mensaje: 'La cita fue marcada como completada correctamente.',
        });
      } else {
        mostrarFeedback({
          tipo: 'error',
          titulo: 'No se pudo completar',
          mensaje: res.message || 'Ocurrió un error al cerrar la cita.',
        });
      }
    } catch {
      mostrarFeedback({
        tipo: 'error',
        titulo: 'Error',
        mensaje: 'Ocurrió un error inesperado. Intenta nuevamente.',
      });
    } finally {
      setProcesando(false);
    }
  }, [citaId, recargarCita, mostrarFeedback, queryClient]);

  const handleCerrar = useCallback(() => {
    showConfirm('Cerrar cita', '¿Marcar esta cita como completada?', {
      confirmText: 'Completar',
      onConfirm: ejecutarCerrar,
    });
  }, [ejecutarCerrar]);

  const ejecutarCancelar = useCallback(async () => {
    setFeedbackAccion(null);
    setProcesando(true);
    try {
      const res = await agendaProveedorService.cancelarCita(citaId);
      if (res.success) {
        setEditando(false);
        await recargarCita();
        invalidateProveedorMarketplaceQueries(queryClient);
        mostrarFeedback({
          tipo: 'success',
          titulo: 'Cita cancelada',
          mensaje: 'La cita fue cancelada. El horario quedó liberado en tu agenda.',
        });
      } else {
        mostrarFeedback({
          tipo: 'error',
          titulo: 'No se pudo cancelar',
          mensaje: res.message || 'Ocurrió un error al cancelar la cita.',
        });
      }
    } catch {
      mostrarFeedback({
        tipo: 'error',
        titulo: 'Error',
        mensaje: 'Ocurrió un error inesperado. Intenta nuevamente.',
      });
    } finally {
      setProcesando(false);
    }
  }, [citaId, recargarCita, mostrarFeedback, queryClient]);

  const handleCancelar = useCallback(() => {
    showConfirm('Cancelar visita', '¿Confirmas que deseas cancelar esta visita?', {
      confirmText: 'Sí, cancelar',
      onConfirm: ejecutarCancelar,
    });
  }, [ejecutarCancelar]);

  const ejecutarEliminar = useCallback(async () => {
    setFeedbackAccion(null);
    setProcesando(true);
    try {
      const res = await agendaProveedorService.eliminarCita(citaId);
      if (res.success) {
        if (Platform.OS === 'web') {
          showAlert('Cita eliminada', 'La cita fue eliminada correctamente.');
        }
        router.back();
      } else {
        mostrarFeedback({
          tipo: 'error',
          titulo: 'No se pudo eliminar',
          mensaje: res.message || 'Ocurrió un error al eliminar la cita.',
        });
      }
    } catch {
      mostrarFeedback({
        tipo: 'error',
        titulo: 'Error',
        mensaje: 'Ocurrió un error inesperado. Intenta nuevamente.',
      });
    } finally {
      setProcesando(false);
    }
  }, [citaId, mostrarFeedback]);

  const handleEliminar = useCallback(() => {
    showConfirm('Eliminar cita', 'Esta acción no se puede deshacer.', {
      confirmText: 'Eliminar',
      onConfirm: ejecutarEliminar,
    });
  }, [ejecutarEliminar]);

  const handleGuardarEdicion = useCallback(async () => {
    setFeedbackAccion(null);

    const telError = getChilePhoneError(extraerNueveDigitosDesdeGuardado(clienteTelefono), true);
    if (telError) {
      mostrarFeedback({ tipo: 'warning', titulo: 'Datos incompletos', mensaje: telError });
      return;
    }
    if (!fechaHora.hora || !fechaHora.horaFin) {
      mostrarFeedback({
        tipo: 'warning',
        titulo: 'Datos incompletos',
        mensaje: 'Selecciona hora de inicio y término para la cita.',
      });
      return;
    }
    if (!esRangoHorarioValido(fechaHora.hora, fechaHora.horaFin)) {
      mostrarFeedback({
        tipo: 'warning',
        titulo: 'Datos incompletos',
        mensaje: 'La hora de término debe ser al menos 15 minutos después del inicio.',
      });
      return;
    }
    if (tipoServicio === 'domicilio') {
      if (!direccion.trim()) {
        mostrarFeedback({
          tipo: 'warning',
          titulo: 'Datos incompletos',
          mensaje: 'Ingresa la dirección para servicio a domicilio.',
        });
        return;
      }
      const direccionOriginal = cita?.detalle.direccion?.trim();
      const sinCambio = direccionOriginal && direccionOriginal === direccion.trim();
      if (!direccionValidada && !sinCambio) {
        mostrarFeedback({
          tipo: 'warning',
          titulo: 'Dirección no confirmada',
          mensaje: 'Selecciona una dirección válida de la lista de sugerencias.',
        });
        return;
      }
    }

    const detalle: CitaAgendaPersonalCreatePayload['detalle'] = {
      cliente_nombre: clienteNombre.trim(),
      cliente_telefono: normalizarTelefonoChileParaGuardar(clienteTelefono),
      vehiculo_marca: vehiculoMarca.trim(),
      vehiculo_modelo: vehiculoModelo.trim(),
      servicio_nombre: servicioNombre.trim(),
    };

    if (vehiculoPatente.trim()) detalle.vehiculo_patente = vehiculoPatente.trim();
    if (vehiculoVin.trim()) detalle.vehiculo_vin = vehiculoVin.trim().toUpperCase();
    if (descripcion.trim()) detalle.descripcion = descripcion.trim();

    if (tipoServicio === 'domicilio') {
      detalle.direccion = (direccionValidada?.line ?? direccion).trim();
    }

    if (precioReferencia.trim()) {
      const precio = parsePrecioReferencia(precioReferencia);
      if (precio != null) detalle.precio_referencia = precio;
    }

    const payload: CitaAgendaPersonalCreatePayload = {
      fecha_servicio: formatDateApi(fechaHora.fecha),
      hora_servicio: `${fechaHora.hora}:00`,
      duracion_minutos: calcularDuracionMinutos(fechaHora.hora, fechaHora.horaFin),
      tipo_servicio: tipoServicio,
      detalle,
    };

    setProcesando(true);
    try {
      const validacion = await agendaProveedorService.validarSlot({
        ...payload,
        excluir_cita_id: citaId,
      });
      if (!validacion.success || !validacion.data?.valido) {
        mostrarFeedback({
          tipo: 'error',
          titulo: 'Horario no disponible',
          mensaje:
            validacion.data?.error || validacion.message || 'El horario seleccionado no está disponible.',
        });
        return;
      }

      const res = await agendaProveedorService.actualizarCita(citaId, payload);

      if (res.success) {
        setEditando(false);
        await recargarCita();
        mostrarFeedback({
          tipo: 'success',
          titulo: 'Cambios guardados',
          mensaje: 'La cita personal fue actualizada correctamente.',
        });
      } else {
        mostrarFeedback({
          tipo: 'error',
          titulo: 'No se pudo guardar',
          mensaje: res.message || 'No se pudo actualizar la cita.',
        });
      }
    } catch {
      mostrarFeedback({
        tipo: 'error',
        titulo: 'Error',
        mensaje: 'Ocurrió un error inesperado. Intenta nuevamente.',
      });
    } finally {
      setProcesando(false);
    }
  }, [
    citaId,
    clienteNombre,
    clienteTelefono,
    vehiculoMarca,
    vehiculoModelo,
    vehiculoPatente,
    servicioNombre,
    descripcion,
    precioReferencia,
    tipoServicio,
    direccion,
    direccionValidada,
    fechaHora,
    recargarCita,
    cita,
    mostrarFeedback,
  ]);

  const formatearFecha = (fecha: string) => {
    const parsed = parseFechaLocal(fecha);
    if (!parsed) return '—';
    return parsed.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatearRangoHora = (horaInicio: string, duracionMinutos?: number) => {
    const inicio = formatearHora(horaInicio);
    if (!duracionMinutos || duracionMinutos <= 0) return inicio;
    const fin = sumarMinutosAHora(inicio, duracionMinutos);
    return `${inicio} – ${fin}`;
  };

  const formatearHora = (hora: string) => hora.substring(0, 5);

  /**
   * Flujo unificado: primero técnico (o automático), luego calendario de ese técnico.
   * Evita dos CTAs paralelos que hacían lo mismo a medias.
   */
  const abrirConfirmarHorario = useCallback(() => {
    if (!cita) return;
    setAsignarVisible(true);
  }, [cita]);

  useEffect(() => {
    if (agendar !== '1' || !cita || !horarioPorConfirmar || autoAgendarRef.current) return;
    autoAgendarRef.current = true;
    setAsignarVisible(true);
  }, [agendar, cita, horarioPorConfirmar]);

  const handleIniciarServicioChecklist = useCallback(async () => {
    if (Number.isNaN(citaId)) return;
    if (horarioPorConfirmar) {
      showAlert(
        'Horario pendiente',
        'Confirma técnico y horario antes de iniciar el servicio.',
      );
      abrirConfirmarHorario();
      return;
    }
    if (!esDiaServicio) {
      showAlert(
        'Fuera de fecha',
        cita?.fecha_servicio
          ? `Solo puedes iniciar el servicio el día de la cita (${formatearFecha(cita.fecha_servicio)}).`
          : 'Solo puedes iniciar el servicio el día de la cita.',
      );
      return;
    }
    setIniciandoChecklist(true);
    try {
      const res = await agendaProveedorService.iniciarServicio(citaId);
      if (!res.success) {
        showAlert('Error', res.message || 'No se pudo iniciar el servicio');
        return;
      }
      await recargarCita();
      await invalidateProveedorMarketplaceQueries(queryClient);
      // Abrir checklist si se creó, o si la cita ya quedó con checklist_id.
      if (res.data?.checklist_id || res.data?.tiene_checklist || res.data?.cita?.checklist_id) {
        setShowChecklist(true);
      } else if (res.data?.tiene_checklist === false) {
        showAlert(
          'Checklist no disponible',
          'No se pudo generar el checklist para este servicio. Revisa el nombre del servicio e inténtalo de nuevo.',
        );
      } else {
        // Backend puede estar generando con IA; abrir contenedor (reintenta carga).
        setShowChecklist(true);
      }
    } finally {
      setIniciandoChecklist(false);
    }
  }, [
    abrirConfirmarHorario,
    cita?.fecha_servicio,
    citaId,
    esDiaServicio,
    queryClient,
    recargarCita,
    horarioPorConfirmar,
  ]);

  if (showInitialLoader) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={stackOptions} />
        <View style={styles.screenRoot}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={I.primary} />
            <Text style={styles.loadingText}>Cargando…</Text>
          </View>
        </View>
      </View>
    );
  }

  if (!cita) return null;

  const det = cita.detalle;
  const nombreServicio = nombreServicioCita(cita);
  const precio = det.precio_referencia ? formatearMontoCLP(det.precio_referencia) : null;
  const tecnicoModalidad =
    cita.mecanico_modalidad_tecnico != null
      ? etiquetaModalidadMecanico({
          modalidad_tecnico: cita.mecanico_modalidad_tecnico,
          modalidad_tecnico_display: cita.mecanico_modalidad_display ?? '',
        })
      : null;
  const tecnicoEspecialidades =
    cita.mecanico_especialidades && cita.mecanico_especialidades.length > 0
      ? cita.mecanico_especialidades.join(' · ')
      : null;
  const estadoOperativo = mapCitaEstadoOperativo(
    cita.estado_operativo,
    cita.estado,
    Boolean(cita.horario_por_confirmar),
  );

  if (showChecklist) {
    return (
      <ChecklistContainer
        citaPersonalId={cita.id}
        puedeFirmarSupervisor={(esMandanteTaller || esSupervisor) && !esMecanicoEquipo}
        onComplete={() => {
          setShowChecklist(false);
          void recargarCita();
        }}
        onCancel={() => {
          setShowChecklist(false);
          void recargarCita();
        }}
      />
    );
  }

  const copiarEnlaceInformeCita = async (url: string) => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        showAlert('Enlace copiado', 'El enlace del informe quedó en el portapapeles.');
        return;
      }
      await Share.share({ message: url, url });
    } catch {
      showAlert('Enlace del informe', url);
    }
  };

  const duracionLabel = formatDuracion(cita.duracion_minutos);
  const esDomicilio = cita.tipo_servicio === 'domicilio';
  const metaFactsLine = [esDomicilio ? 'A domicilio' : 'En taller', duracionLabel]
    .filter(Boolean)
    .join(' · ');
  const textoUbicacion = esDomicilio
    ? det.direccion?.trim() || 'Dirección no registrada'
    : 'El cliente acudirá al taller';
  const puedeUsarAsistenteIa = puedeUsarAsistenteIaEnCita({
    esMecanicoEquipo,
    esProveedorDomicilio,
    esMandanteTaller,
    esSupervisor,
    miembroId,
    citaMiembroTallerId: cita.miembro_taller,
    puedeServicios: !esSupervisor || puede('servicios'),
  });

  const mostrarEditarHeader =
    esActiva && permitirEditarCita && !editando && !checklistEnCurso;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          ...stackOptions,
          headerRight: () =>
            mostrarEditarHeader ? (
              <Pressable
                onPress={() => {
                  setFeedbackAccion(null);
                  setEditando(true);
                }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Editar cita"
                style={styles.headerEditPressable}
              >
                <Text style={styles.headerEditLabel}>Editar</Text>
              </Pressable>
            ) : null,
        }}
      />

      <KeyboardAvoidingView style={styles.screenRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={hostScreenStyles.scroll}
          contentContainerStyle={[
            hostScreenStyles.scrollInner,
            styles.scrollContent,
            { paddingBottom: footerReserve },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statusBlock}>
            <InstitutionalTag
              label={ESTADO_OPERATIVO_LABELS[estadoOperativo]}
              variant={ESTADO_OPERATIVO_VARIANT[estadoOperativo]}
              size="sm"
            />
            {cita.template_generado_por_ia ? (
              <InstitutionalTag label="Checklist IA" variant="info" size="sm" />
            ) : null}
            {metaFactsLine ? <Text style={styles.metaFacts}>{metaFactsLine}</Text> : null}
          </View>

          {editando && esActiva && permitirEditarCita ? (
            <>
              <EditSection title="Cliente">
                <InstitutionalField label="Nombre" value={clienteNombre} onChangeText={setClienteNombre} />
                <ChilePhoneField value={clienteTelefono} onChangeValue={setClienteTelefono} />
              </EditSection>
              <EditSection title="Vehículo">
                <InstitutionalField label="Marca" value={vehiculoMarca} onChangeText={setVehiculoMarca} />
                <InstitutionalField label="Modelo" value={vehiculoModelo} onChangeText={setVehiculoModelo} />
                <InstitutionalField
                  label="Patente"
                  value={vehiculoPatente}
                  onChangeText={(t) => setVehiculoPatente(t.toUpperCase())}
                  onBlur={() => void handlePatenteBlur()}
                  autoCapitalize="characters"
                />
                {buscandoPatente ? (
                  <ActivityIndicator color={I.primary} style={{ marginVertical: SPACING.xs }} />
                ) : null}
                {vehiculoVin ? (
                  <InstitutionalField label="VIN" value={vehiculoVin} onChangeText={setVehiculoVin} editable={false} />
                ) : null}
              </EditSection>
              {tipoServicio === 'domicilio' && (
                <EditSection title="Dirección">
                  <ChileAddressField
                    label="Dirección del servicio *"
                    hint="Busca una dirección real en Chile. Escribe al menos 4 caracteres y elige un resultado."
                    value={direccion}
                    validated={direccionValidada}
                    onChangeText={setDireccion}
                    onValidatedChange={setDireccionValidada}
                  />
                </EditSection>
              )}
              <EditSection title="Servicio">
                <InstitutionalField label="Nombre servicio" value={servicioNombre} onChangeText={setServicioNombre} />
                <InstitutionalField label="Descripción" value={descripcion} onChangeText={setDescripcion} multiline />
                <MontoCLPField
                  label="Precio referencia"
                  value={precioReferencia}
                  onChangeValue={setPrecioReferencia}
                />
              </EditSection>
              <EditSection title="Fecha y hora">
                <CatalogoFechaHoraPickers value={fechaHora} onChange={setFechaHora} modo="rango" />
              </EditSection>
            </>
          ) : (
            <>
              <HostSectionKicker label="Cliente y vehículo" />
              <HostPaperSection style={styles.section}>
                <View style={styles.clientInfoContainer}>
                  <HostAvatar name={det.cliente_nombre} size={56} />
                  <View style={styles.clientInfoTextos}>
                    <Text style={styles.clientName} numberOfLines={2}>
                      {det.cliente_nombre}
                    </Text>
                    {det.cliente_telefono ? (
                      <TouchableOpacity onPress={handleLlamar} activeOpacity={0.75} style={styles.clientPhoneRow}>
                        <InstitutionalIcon name="call" size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                        <Text style={styles.clientPhoneText}>{det.cliente_telefono}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                <View style={styles.vehicleBlock}>
                  <Text style={styles.vehicleMarcaModelo} numberOfLines={2}>
                    {[det.vehiculo_marca, det.vehiculo_modelo].filter(Boolean).join(' ')}
                  </Text>
                  {det.vehiculo_patente ? (
                    <Text style={styles.vehiclePatente}>{det.vehiculo_patente}</Text>
                  ) : null}
                </View>

                <HostMetricRow label="Año" value={String(det.vehiculo_anio ?? 'N/A')} />
                <HostMetricRow label="Kilometraje" value="N/A" />
                <HostMetricRow label="VIN" value={det.vehiculo_vin || 'N/A'} />
                <HostMetricRow
                  label="Cilindraje"
                  value={
                    cilindrajeEfectivo(det.vehiculo_cilindraje, det.vehiculo_marca, det.vehiculo_modelo) || 'N/A'
                  }
                  last
                />
              </HostPaperSection>

              <HostSectionKicker label="Fecha y hora" />
              <HostPaperSection style={styles.section}>
                {horarioPorConfirmar ? (
                  <>
                    <InstitutionalTag label="Por confirmar" variant="warning" size="sm" />
                    <Text style={styles.horarioPendienteTitle}>Horario pendiente</Text>
                    <Text style={styles.horarioPendienteBody}>
                      El cliente aceptó la cotización. Usa «Confirmar horario» para elegir técnico
                      (o automático) y luego el día y hora en su calendario.
                    </Text>
                  </>
                ) : (
                  <>
                    <HostMetricRow
                      label="Fecha"
                      value={formatearFecha(cita.fecha_servicio)}
                    />
                    <HostMetricRow
                      label="Horario"
                      value={formatearRangoHora(cita.hora_servicio, cita.duracion_minutos)}
                      last
                    />
                  </>
                )}
              </HostPaperSection>

              <HostSectionKicker label="Ubicación del servicio" />
              <HostPaperSection style={styles.section}>
                <Text style={styles.addressText}>{textoUbicacion}</Text>
                {!esDomicilio ? (
                  <Text style={styles.addressDetailsText}>Servicio presencial en el taller</Text>
                ) : null}
              </HostPaperSection>

              {cita.resumen_economico ? (
                <CitaResumenEconomicoCard
                  resumen={cita.resumen_economico}
                  servicioNombre={nombreServicio}
                  descripcion={det.descripcion}
                  precioReferencia={det.precio_referencia}
                />
              ) : (
                <>
                  <HostSectionKicker label="Servicios solicitados" />
                  <HostPaperSection style={styles.section}>
                    <Text style={styles.servicioDetalleNombre} numberOfLines={3}>
                      {nombreServicio}
                    </Text>
                    {precio ? <Text style={styles.ofertaPrecio}>{precio}</Text> : null}

                    {det.descripcion ? (
                      <View style={styles.descripcionBlock}>
                        <Text style={styles.descripcionBlockLabel}>Notas del servicio</Text>
                        <Text style={styles.descriptionText}>{det.descripcion}</Text>
                      </View>
                    ) : null}
                  </HostPaperSection>
                </>
              )}

              {(cita.cotizaciones_adicionales?.length ?? 0) > 0 ? (
                <>
                  <HostSectionKicker label="Trabajos adicionales" />
                  <HostPaperSection style={styles.section}>
                    {(cita.cotizaciones_adicionales ?? []).map((ad, idx, arr) => {
                      const slot = formatFechaHoraPropuesta(ad.fecha_propuesta, ad.hora_propuesta);
                      const motivo = (ad.motivo_servicio_adicional || '').trim();
                      const metaParts = [
                        ad.ejecucion_adicional === 'nueva_fecha'
                          ? (ad.estado === 'aceptada' && slot
                            ? `Agendado para ${slot}`
                            : slot
                              ? `Fecha propuesta: ${slot}`
                              : 'Nueva fecha')
                          : 'Misma visita',
                        motivo || null,
                      ].filter(Boolean);
                      const esPendiente = ad.estado === 'borrador' || ad.estado === 'enviada';
                      const esRechazada = ad.estado === 'rechazada';
                      const valueNode = esRechazada
                        ? 'Rechazada'
                        : ad.estado === 'aceptada'
                          ? formatearMontoCLP(ad.total_clp)
                          : ad.estado === 'enviada'
                            ? (ad.total_clp > 0 ? formatearMontoCLP(ad.total_clp) : 'Enviada')
                            : ad.estado === 'borrador'
                              ? (ad.total_clp > 0 ? formatearMontoCLP(ad.total_clp) : 'Borrador')
                              : ad.estado;
                      const row = (
                        <HostMetricRow
                          label={ad.servicio_nombre || 'Trabajo adicional'}
                          meta={metaParts.join(' · ')}
                          value={valueNode}
                          last={idx === arr.length - 1}
                        />
                      );
                      if (ad.cita_hija_id) {
                        return (
                          <Pressable
                            key={ad.id}
                            onPress={() => router.push(`/cita-agenda-personal/${ad.cita_hija_id}`)}
                          >
                            {row}
                          </Pressable>
                        );
                      }
                      if (esPendiente) {
                        return (
                          <Pressable
                            key={ad.id}
                            onPress={() => router.push(`/cotizacion-canal/${ad.id}`)}
                          >
                            {row}
                          </Pressable>
                        );
                      }
                      return <View key={ad.id}>{row}</View>;
                    })}
                    <Text style={styles.addressDetailsText}>
                      El cliente paga directo al taller. Misma visita suma a este trabajo; nueva fecha queda agendada aparte.
                    </Text>
                  </HostPaperSection>
                </>
              ) : null}

              {esActiva && puedeUsarAsistenteIa ? (
                <HostPaperSection style={styles.section}>
                  <View style={styles.asistenteIaWrap}>
                    <AsistenteDiagnosticoCard origen="cita" entityId={cita.id} habilitado />
                  </View>
                </HostPaperSection>
              ) : null}

              {(puedeActualizarCotizacion || adicionalPendienteId || (citaAgendada && !checklistIniciado && !esDiaServicio && cita.tiene_checklist)) ? (
                <View style={styles.checklistActions}>
                  {citaAgendada && !checklistIniciado && !esDiaServicio && cita.tiene_checklist ? (
                    <Text style={styles.addressDetailsText}>
                      Se inicia el {formatearFecha(cita.fecha_servicio)}. No se puede adelantar el checklist.
                    </Text>
                  ) : null}
                  {puedeActualizarCotizacion ? (
                    <>
                      <InstitutionalButton
                        label="Actualizar cotización"
                        variant="outline"
                        onPress={() => router.push(`/cotizacion-canal/${cita.cotizacion_canal_origen_id}`)}
                        disabled={procesando}
                      />
                      <Text style={styles.addressDetailsText}>
                        Si el cliente pidió cambios antes de iniciar, edita la misma cotización (mismo enlace).
                      </Text>
                    </>
                  ) : null}
                  {adicionalPendienteId && !checklistEnEjecucion ? (
                    <InstitutionalButton
                      label="Esperando al cliente"
                      variant="outline"
                      onPress={() => router.push(`/cotizacion-canal/${adicionalPendienteId}`)}
                    />
                  ) : null}
                </View>
              ) : null}

              <HostSectionKicker label="Técnico asignado" />
              <HostPaperSection style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.tecnicoRow}>
                    <HostAvatar name={cita.mecanico_nombre?.trim() || 'Sin técnico'} size="sm" />
                    <View style={styles.tecnicoInfo}>
                      <Text style={styles.tecnicoNombre}>
                        {cita.mecanico_nombre?.trim() || 'Sin técnico asignado'}
                      </Text>
                      {tecnicoModalidad ? (
                        <Text style={styles.tecnicoSub}>Atiende: {tecnicoModalidad}</Text>
                      ) : null}
                      {tecnicoEspecialidades ? (
                        <Text style={styles.tecnicoSub} numberOfLines={2}>
                          {tecnicoEspecialidades}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {esActiva && permitirEditarCita ? (
                    <InstitutionalButton
                      label={cita.miembro_taller ? 'Reasignar' : 'Asignar'}
                      variant="tertiary"
                      size="compact"
                      onPress={() => setAsignarVisible(true)}
                    />
                  ) : null}
                </View>
              </HostPaperSection>

              {cita.tiene_checklist ? (
                <>
                  <HostSectionKicker label="Ejecución del servicio" />
                  <HostPaperSection style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionHeaderTitleInline} />
                    <InstitutionalTag
                      label={
                        checklistPendienteSupervisor
                          ? 'Esperando supervisor'
                          : checklistPendienteFirmaCliente
                            ? 'Esperando cliente'
                            : ESTADO_OPERATIVO_LABELS[estadoOperativo]
                      }
                      variant={
                        checklistPendienteSupervisor || checklistPendienteFirmaCliente
                          ? 'warning'
                          : ESTADO_OPERATIVO_VARIANT[estadoOperativo]
                      }
                      size="sm"
                    />
                  </View>

                  <View style={styles.checklistStatusBlock}>
                    {cita.checklist_id ? (
                      <>
                        <Text style={styles.checklistProgressTitle}>
                          {checklistCompletado
                            ? 'Servicio cerrado'
                            : checklistPendienteSupervisor
                              ? puedeRectificarSupervisor
                                ? 'Etapa 2 · Revisar y firmar (supervisor/mandante)'
                                : 'Etapa 2 · Esperando revisión del supervisor'
                              : checklistPendienteFirmaCliente
                                ? 'Etapa 3 · El cliente debe cerrar el servicio'
                                : puedeOperarChecklist
                                  ? 'Etapa 1 · Llenar checklist'
                                  : 'Etapa 1 · En ejecución por el técnico'}
                        </Text>
                        <Text style={styles.checklistProgressMeta}>
                          {(cita.checklist_items_completados ?? 0)} de{' '}
                          {(cita.checklist_items_total ?? 0)} ítems
                          {cita.checklist_minutos_transcurridos != null
                            ? ` · ${cita.checklist_minutos_transcurridos} min`
                            : ''}
                        </Text>
                        <View style={styles.checklistProgressTrack}>
                          <View
                            style={[
                              styles.checklistProgressFill,
                              {
                                width: `${Math.max(
                                  0,
                                  Math.min(100, cita.checklist_progreso_porcentaje ?? 0),
                                )}%`,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.checklistStatusCopy}>
                          {checklistPendienteSupervisor
                            ? puedeRectificarSupervisor
                              ? 'El mecánico ya terminó el llenado. Revisa el trabajo y firma para generar el informe; el cliente cerrará el servicio después.'
                              : 'El mecánico ya firmó. Falta la revisión del supervisor o mandante para enviar el informe al cliente.'
                            : checklistPendienteFirmaCliente
                              ? 'Comparte el enlace del informe. El cliente revisa, firma y con eso se cierra el servicio.'
                              : checklistCompletado
                                ? cita.informe_publico_url
                                  ? 'El cliente ya cerró el servicio. Puedes reenviar el enlace del informe si lo necesita.'
                                  : 'El servicio quedó cerrado y firmado por el cliente.'
                                : puedeOperarChecklist
                                  ? 'Completa los pasos del checklist. Al finalizar firmas como técnico; luego supervisor/mandante revisa y el cliente cierra.'
                                  : 'El técnico está llenando el checklist. Cuando termine, te toca revisar y firmar.'}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.checklistStatusCopy}>
                        {puedeOperarChecklist
                          ? horarioPorConfirmar
                            ? 'Confirma el horario arriba antes de iniciar el servicio.'
                            : !esDiaServicio
                              ? `Se inicia el ${formatearFecha(cita.fecha_servicio)}. No se puede adelantar el checklist.`
                              : 'Usa «Iniciar servicio» abajo para generar y completar el checklist.'
                          : 'El técnico asignado debe iniciar el servicio para comenzar el checklist.'}
                      </Text>
                    )}

                    <View style={styles.checklistActions}>
                      {permitirAgregarHallazgo ? (
                        <InstitutionalButton
                          label="Agregar hallazgo"
                          variant="outline"
                          onPress={() => router.push(`/agregar-servicio-adicional/${cita.id}`)}
                          disabled={procesando}
                        />
                      ) : adicionalPendienteId ? (
                        <InstitutionalButton
                          label="Esperando al cliente"
                          variant="outline"
                          onPress={() => router.push(`/cotizacion-canal/${adicionalPendienteId}`)}
                        />
                      ) : null}

                      {cita.checklist_id
                        && (checklistPendienteSupervisor
                          || checklistPendienteFirmaCliente
                          || checklistCompletado) ? (
                        <InstitutionalButton
                          label="Ver resumen del trabajo"
                          variant="outline"
                          onPress={() => setShowChecklistResumen(true)}
                        />
                      ) : null}

                      {cita.informe_publico_url ? (
                        <View style={styles.informeLinkInline}>
                          <Text style={styles.informeLinkHint}>
                            {checklistPendienteFirmaCliente
                              ? 'Enlace para el cliente'
                              : 'Reenviar enlace del informe'}
                          </Text>
                          <Text style={styles.informeLinkUrl} numberOfLines={2}>
                            {cita.informe_publico_url}
                          </Text>
                          <InstitutionalButton
                            label={
                              checklistPendienteFirmaCliente
                                ? 'Copiar enlace'
                                : 'Copiar / compartir enlace'
                            }
                            variant="outline"
                            onPress={() => void copiarEnlaceInformeCita(cita.informe_publico_url!)}
                          />
                        </View>
                      ) : null}
                    </View>
                  </View>
                  </HostPaperSection>
                </>
              ) : null}
            </>
          )}

          {procesando && (
            <View style={styles.processingRow}>
              <ActivityIndicator color={I.primary} />
              <Text style={styles.processingText}>Procesando…</Text>
            </View>
          )}

          {feedbackAccion && (
            <View style={styles.feedbackWrap}>
              <EstadoBanner
                type={feedbackAccion.tipo}
                title={feedbackAccion.titulo}
                message={feedbackAccion.mensaje}
              />
            </View>
          )}
        </ScrollView>

        {muestraFooterAcciones && mostrarStickyPrimario ? (
          <CitaPersonalFooter
            esActiva={esActiva}
            esCancelada={esCancelada}
            editando={editando}
            procesando={procesando || iniciandoChecklist}
            bottomPad={footerBottomPad}
            permitirEliminar={permitirEliminarCita}
            permitirCancelar={puedeCancelarCita}
            permitirCerrarManual={citaAgendada && !cita.tiene_checklist}
            permitirConfirmarHorario={horarioPorConfirmar && permitirEditarCita}
            permitirIniciarServicio={puedeIniciarServicioSticky}
            iniciandoServicio={iniciandoChecklist}
            permitirContinuarChecklist={puedeContinuarChecklistSticky}
            continuarChecklistLabel={checklistEnCurso ? 'Continuar checklist' : 'Completar checklist'}
            permitirFirmarSupervisor={puedeRectificarSupervisor && !editando}
            firmandoSupervisor={firmandoSupervisor}
            onIniciarServicio={() => void handleIniciarServicioChecklist()}
            onContinuarChecklist={() => setShowChecklist(true)}
            onFirmarSupervisor={() => setShowSupervisorFirmaModal(true)}
            onCompletar={handleCerrar}
            onConfirmarHorario={abrirConfirmarHorario}
            onCancelar={handleCancelar}
            onGuardar={handleGuardarEdicion}
            onDescartar={() => {
              poblarFormulario(cita);
              setEditando(false);
              setFeedbackAccion(null);
            }}
            onEliminar={handleEliminar}
          />
        ) : null}
      </KeyboardAvoidingView>

      <AsignarTecnicoBottomSheet
        visible={asignarVisible}
        continuarACalendario={horarioPorConfirmar}
        onClose={() => setAsignarVisible(false)}
        target={
          cita
            ? {
                tipo: 'cita_personal',
                citaId: cita.id,
                miembroActualId: cita.miembro_taller,
              }
            : null
        }
        onAsignado={(miembroId) => {
          void recargarCita();
          void invalidateProveedorMarketplaceQueries(queryClient);
          if (horarioPorConfirmar) {
            setMiembroParaHorario(miembroId);
            setConfirmarHorarioVisible(true);
          }
        }}
      />

      <ConfirmarHorarioCitaSheet
        visible={confirmarHorarioVisible}
        onClose={() => setConfirmarHorarioVisible(false)}
        cita={cita}
        miembroTallerId={miembroParaHorario}
        onConfirmado={() => {
          void recargarCita();
          void invalidateProveedorMarketplaceQueries(queryClient);
          mostrarFeedback({
            tipo: 'success',
            titulo: 'Cita agendada',
            mensaje: 'Día y hora confirmados. Ya puedes iniciar el servicio.',
          });
        }}
      />

      <ChecklistCompletedView
        visible={showChecklistResumen}
        onClose={() => setShowChecklistResumen(false)}
        citaPersonalId={cita.id}
        instanceId={cita.checklist_id ?? null}
      />

      <ChecklistSignatureModal
        visible={showSupervisorFirmaModal}
        onClose={() => setShowSupervisorFirmaModal(false)}
        onComplete={(firmaSupervisor) => {
          void handleFirmarSupervisorDesdeCita(firmaSupervisor);
        }}
        signatureMode="supervisor_only"
        ordenInfo={{
          id: cita.id,
          cliente: cita.detalle.cliente_nombre || 'Cliente',
          vehiculo: [
            cita.detalle.vehiculo_marca,
            cita.detalle.vehiculo_modelo,
            cita.detalle.vehiculo_patente,
          ]
            .filter(Boolean)
            .join(' ')
            .trim() || 'Vehículo',
        }}
        ubicacionPreferida={ubicacionTallerPreferida}
        modoUbicacion="taller"
      />
    </View>
  );
}

function EditSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <HostSectionKicker label={title} />
      <HostPaperSection style={styles.section}>
        <View style={styles.editFields}>{children}</View>
      </HostPaperSection>
    </>
  );
}

type CitaPersonalFooterProps = {
  esActiva: boolean;
  esCancelada: boolean;
  editando: boolean;
  procesando: boolean;
  bottomPad: number;
  permitirEliminar: boolean;
  permitirCancelar: boolean;
  permitirCerrarManual: boolean;
  permitirConfirmarHorario?: boolean;
  permitirIniciarServicio?: boolean;
  iniciandoServicio?: boolean;
  permitirContinuarChecklist?: boolean;
  continuarChecklistLabel?: string;
  permitirFirmarSupervisor?: boolean;
  firmandoSupervisor?: boolean;
  onIniciarServicio?: () => void;
  onContinuarChecklist?: () => void;
  onFirmarSupervisor?: () => void;
  onCompletar: () => void;
  onConfirmarHorario?: () => void;
  onCancelar: () => void;
  onGuardar: () => void;
  onDescartar: () => void;
  onEliminar: () => void;
};

function CitaPersonalFooter({
  esActiva,
  esCancelada,
  editando,
  procesando,
  bottomPad,
  permitirEliminar,
  permitirCancelar,
  permitirCerrarManual,
  permitirConfirmarHorario = false,
  permitirIniciarServicio = false,
  iniciandoServicio = false,
  permitirContinuarChecklist = false,
  continuarChecklistLabel = 'Continuar checklist',
  permitirFirmarSupervisor = false,
  firmandoSupervisor = false,
  onIniciarServicio,
  onContinuarChecklist,
  onFirmarSupervisor,
  onCompletar,
  onConfirmarHorario,
  onCancelar,
  onGuardar,
  onDescartar,
  onEliminar,
}: CitaPersonalFooterProps) {
  const estiloCtaDerecha = permitirCancelar ? styles.footerBtnPrimary : styles.footerBtnGrow;
  const ctaDerecha = (() => {
    if (permitirConfirmarHorario) {
      return (
        <InstitutionalButton
          label="Confirmar horario"
          variant="primary"
          onPress={onConfirmarHorario ?? (() => undefined)}
          disabled={procesando}
          leading={
            <InstitutionalIcon name="calendar-today" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
          }
          style={estiloCtaDerecha}
        />
      );
    }
    if (permitirIniciarServicio) {
      return (
        <InstitutionalButton
          label={iniciandoServicio ? 'Preparando…' : 'Iniciar servicio'}
          variant="primary"
          loading={iniciandoServicio}
          onPress={onIniciarServicio ?? (() => undefined)}
          disabled={procesando}
          style={estiloCtaDerecha}
        />
      );
    }
    if (permitirFirmarSupervisor) {
      return (
        <InstitutionalButton
          label={firmandoSupervisor ? 'Generando…' : 'Revisar y firmar'}
          variant="primary"
          loading={firmandoSupervisor}
          onPress={onFirmarSupervisor ?? (() => undefined)}
          disabled={procesando || firmandoSupervisor}
          style={estiloCtaDerecha}
        />
      );
    }
    if (permitirContinuarChecklist) {
      return (
        <InstitutionalButton
          label={continuarChecklistLabel}
          variant="primary"
          onPress={onContinuarChecklist ?? (() => undefined)}
          disabled={procesando}
          style={estiloCtaDerecha}
        />
      );
    }
    if (permitirCerrarManual) {
      return (
        <InstitutionalButton
          label="Completar"
          variant="success"
          onPress={onCompletar}
          disabled={procesando}
          leading={
            <InstitutionalIcon name="check-circle" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
          }
          style={estiloCtaDerecha}
        />
      );
    }
    return null;
  })();

  return (
    <View style={[styles.footer, { paddingBottom: bottomPad }]}>
      {esActiva && !editando ? (
        <View style={styles.footerRow}>
          {permitirCancelar ? (
            <InstitutionalButton
              label="Cancelar visita"
              variant="destructiveOutline"
              size="compact"
              onPress={onCancelar}
              disabled={procesando}
              style={ctaDerecha ? styles.footerBtnCancel : styles.footerBtnGrow}
            />
          ) : null}
          {ctaDerecha}
        </View>
      ) : null}

      {esActiva && editando ? (
        <View style={styles.footerRow}>
          <InstitutionalButton
            label="Descartar"
            variant="outline"
            onPress={onDescartar}
            disabled={procesando}
            leading={
              <InstitutionalIcon name="close" size={20} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            }
            style={styles.footerBtnGrow}
          />
          <InstitutionalButton
            label="Guardar cambios"
            variant="primary"
            onPress={onGuardar}
            disabled={procesando}
            loading={procesando}
            leading={
              procesando
                ? undefined
                : <InstitutionalIcon name="save" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
            }
            style={styles.footerBtnGrow}
          />
        </View>
      ) : null}

      {esCancelada && permitirEliminar ? (
        <InstitutionalButton
          label="Eliminar cita"
          variant="destructiveOutline"
          onPress={onEliminar}
          disabled={procesando}
          leading={
            <InstitutionalIcon name="delete" size={20} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  screenRoot: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: SPACING.fixed.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.fixed.sm,
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    color: I.ink,
  },

  headerEditPressable: {
    marginRight: Platform.OS === 'web' ? SPACING.fixed.sm : 0,
    paddingVertical: SPACING.fixed.xs,
    paddingHorizontal: SPACING.fixed.xs,
  },
  headerEditLabel: {
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    color: I.primary,
  },
  statusBlock: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  metaFacts: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.tight),
    color: I.muted,
  },
  section: {
    marginBottom: SPACING.fixed.md,
  },
  sectionHeaderTitle: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    letterSpacing: TS.h4.letterSpacing,
    color: I.ink,
    marginBottom: SPACING.fixed.sm,
  },
  checklistStatusBlock: {
    gap: SPACING.fixed.sm,
  },
  checklistStatusCopy: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.body,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
  },
  checklistActions: {
    marginTop: SPACING.fixed.xs,
    gap: SPACING.fixed.sm,
  },
  checklistProgressTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  checklistProgressMeta: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  checklistProgressTrack: {
    marginTop: SPACING.fixed.xs,
    height: 4,
    borderRadius: 2,
    backgroundColor: I.hairline,
    overflow: 'hidden',
  },
  checklistProgressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: I.primary,
  },
  informeLinkInline: {
    marginTop: SPACING.fixed.xs,
    paddingTop: SPACING.fixed.sm,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
    gap: SPACING.fixed.sm,
  },
  informeLinkHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.body,
  },
  informeLinkUrl: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.monoMedium,
    color: I.primary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  sectionHeaderTitleInline: {
    marginBottom: 0,
    flex: 1,
  },
  editFields: {
    gap: SPACING.fixed.md,
  },

  clientInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
    paddingBottom: SPACING.fixed.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  clientInfoTextos: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  clientName: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    color: I.ink,
  },
  clientPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  clientPhoneText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.primary,
  },

  vehicleBlock: {
    gap: 2,
    paddingTop: SPACING.fixed.xs,
    paddingBottom: SPACING.fixed.xs,
  },
  vehicleMarcaModelo: {
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    color: I.ink,
  },
  vehiclePatente: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
    letterSpacing: 0.4,
  },
  servicioDetalleNombre: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.ink,
    marginBottom: SPACING.fixed.xs,
  },
  ofertaPrecio: {
    fontSize: TS.numberDisplay.fontSize,
    fontFamily: FF.monoMedium,
    lineHeight: lh(TS.numberDisplay.fontSize, TS.numberDisplay.lineHeight),
    color: I.primary,
    marginBottom: SPACING.fixed.sm,
  },
  descripcionBlock: {
    marginTop: SPACING.fixed.xs,
    paddingTop: SPACING.fixed.md,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
    gap: SPACING.fixed.xs,
  },
  asistenteIaWrap: {
    marginTop: SPACING.fixed.md,
  },
  descripcionBlockLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  descriptionText: {
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    color: I.ink,
  },

  horarioPendienteTitle: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginTop: SPACING.fixed.sm,
  },
  horarioPendienteBody: {
    fontSize: TS.caption.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.caption.fontSize, 1.45),
    color: I.body,
    marginTop: SPACING.fixed.xs,
  },
  tecnicoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: SPACING.fixed.sm,
  },
  tecnicoInfo: {
    flex: 1,
    gap: 2,
  },
  tecnicoNombre: {
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  tecnicoSub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.body,
  },

  addressText: {
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    color: I.ink,
  },
  addressDetailsText: {
    marginTop: SPACING.fixed.xs,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },

  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xs,
    marginBottom: SPACING.fixed.sm,
  },
  processingText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.muted,
  },
  feedbackWrap: {
    marginTop: SPACING.fixed.xs,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: I.canvas,
    paddingHorizontal: HOST_GUTTER,
    paddingTop: SPACING.fixed.sm,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
    gap: SPACING.fixed.sm,
    ...shadowFooter,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.fixed.sm,
  },
  footerBtnGrow: {
    flex: 1,
  },
  footerBtnCancel: {
    flex: 0.9,
    alignSelf: 'center',
  },
  footerBtnPrimary: {
    flex: 1.85,
  },
});
