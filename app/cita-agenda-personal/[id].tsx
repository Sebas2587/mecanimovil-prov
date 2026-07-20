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
import { parseFechaLocal } from '@/utils/fechaLocal';
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
import { AsignarTecnicoBottomSheet } from '@/components/equipo/AsignarTecnicoBottomSheet';
import { InstitutionalButton } from '@/design-system/components/InstitutionalButton';
import { InstitutionalTag } from '@/design-system/components/InstitutionalTag';
import {
  ESTADO_OPERATIVO_LABELS,
  ESTADO_OPERATIVO_VARIANT,
  mapCitaEstadoOperativo,
} from '@/utils/estadoOperativo';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;
const hx = SPACING.container.horizontal;
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

function estadoLabel(estado: string): string {
  switch (estado) {
    case 'activa':
      return 'Activa';
    case 'cerrada':
      return 'Completada';
    case 'cancelada':
      return 'Cancelada';
    default:
      return estado;
  }
}

function estadoColors(estado: string) {
  switch (estado) {
    case 'activa':
      return { bg: withOpacity(I.primary, 0.1), text: I.primaryActive, border: withOpacity(I.primary, 0.28) };
    case 'cerrada':
      return { bg: withOpacity(I.semanticUp, 0.12), text: I.semanticUp, border: withOpacity(I.semanticUp, 0.35) };
    case 'cancelada':
      return { bg: withOpacity(I.semanticDown, 0.1), text: I.semanticDown, border: withOpacity(I.semanticDown, 0.35) };
    default:
      return { bg: I.surfaceStrong, text: I.body, border: I.hairline };
  }
}

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
  const { id } = useLocalSearchParams<{ id: string }>();
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
  const [asignarVisible, setAsignarVisible] = useState(false);
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

  const checklistEstado = cita?.checklist_estado ?? null;
  const checklistIniciado = !!checklistEstado && checklistEstado !== 'PENDIENTE';
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

  // Técnico asignado siempre puede operar. Taller/supervisor puede iniciar
  // si aún no arrancó; una vez iniciado por el técnico, solo ven progreso.
  const esTecnicoAsignado =
    esMecanicoEquipo
    && miembroId != null
    && cita?.miembro_taller != null
    && Number(miembroId) === Number(cita.miembro_taller);
  const puedeOperarChecklist = (() => {
    if (esMecanicoEquipo) return esTecnicoAsignado;
    if (!cita?.miembro_taller) return true;
    return !checklistIniciado;
  })();
  const mostrarProgresoChecklist =
    !!cita?.checklist_id
    && checklistIniciado
    && !puedeOperarChecklist;

  const estadoStyle = useMemo(
    () => (cita ? estadoColors(cita.estado) : estadoColors('activa')),
    [cita],
  );

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

  const footerReserve = useMemo(() => {
    if (!muestraFooterAcciones) return SPACING.fixed.lg + footerBottomPad;
    if (esActiva && !editando) {
      if (checklistEnCurso && !puedeOperarChecklist) {
        return 24 + footerBottomPad + SPACING.fixed.md;
      }
      const filasFooter = permitirEditarCita
        ? (puedeCancelarCita ? 132 : 72)
        : (puedeCancelarCita ? 72 : 72);
      return filasFooter + footerBottomPad + SPACING.fixed.md;
    }
    return 72 + footerBottomPad + SPACING.fixed.md;
  }, [
    muestraFooterAcciones,
    esActiva,
    editando,
    footerBottomPad,
    permitirEditarCita,
    puedeCancelarCita,
    checklistEnCurso,
    puedeOperarChecklist,
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
    showConfirm('Cancelar cita', '¿Confirmas que deseas cancelar esta cita?', {
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

  const handleIniciarServicioChecklist = useCallback(async () => {
    if (Number.isNaN(citaId)) return;
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
  }, [citaId, queryClient, recargarCita]);

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
  const estadoOperativo = mapCitaEstadoOperativo(cita.estado_operativo, cita.estado);

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

  return (
    <View style={styles.container}>
      <Stack.Screen options={stackOptions} />

      <KeyboardAvoidingView style={styles.screenRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: hx, paddingBottom: footerReserve },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.badgesContainer}>
            <View
              style={[
                styles.metaBadge,
                {
                  backgroundColor: withOpacity(I.primary, 0.1),
                  borderColor: withOpacity(I.primary, 0.28),
                },
              ]}
            >
              <InstitutionalIcon name="note" size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={[styles.metaBadgeText, { color: I.primary }]}>Personal</Text>
            </View>

            <View
              style={[
                styles.metaBadge,
                { backgroundColor: estadoStyle.bg, borderColor: estadoStyle.border },
              ]}
            >
              <InstitutionalIcon name="ellipse-outline" size={10} color={estadoStyle.text} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={[styles.metaBadgeText, { color: estadoStyle.text }]}>
                {ESTADO_OPERATIVO_LABELS[estadoOperativo]}
              </Text>
            </View>

            {cita.template_generado_por_ia ? (
              <InstitutionalTag label="Checklist generado por IA" variant="info" size="sm" />
            ) : null}

            <View
              style={[
                styles.metaBadge,
                esDomicilio
                  ? {
                      backgroundColor: withOpacity(I.primary, 0.1),
                      borderColor: withOpacity(I.primary, 0.28),
                    }
                  : styles.metaBadgeNeutral,
              ]}
            >
              <InstitutionalIcon
                name={esDomicilio ? 'home' : 'build'}
                size={16}
                color={esDomicilio ? I.primary : I.muted}
                strokeWidth={ICON_STROKE_WIDTH}
              />
              <Text style={[styles.metaBadgeText, { color: esDomicilio ? I.primary : I.muted }]}>
                {esDomicilio ? 'A domicilio' : 'En taller'}
              </Text>
            </View>

            {duracionLabel ? (
              <View style={[styles.metaBadge, styles.metaBadgeNeutral]}>
                <InstitutionalIcon name="access-time" size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={[styles.metaBadgeText, { color: I.muted }]}>{duracionLabel}</Text>
              </View>
            ) : null}
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
              <View style={styles.section}>
                <Text style={styles.sectionHeaderTitle}>Cliente y vehículo</Text>
                <View style={styles.clientInfoContainer}>
                  <View style={styles.clientAvatarWrap}>
                    <View style={styles.clientAvatarPlaceholder}>
                      <InstitutionalIcon name="person" size={36} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                    </View>
                  </View>
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

                <View style={styles.vehicleCard}>
                  <View style={styles.vehicleCardHeader}>
                    <InstitutionalIcon name="directions-car" size={20} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.vehicleCardTitle}>Vehículo</Text>
                  </View>
                  <View style={styles.vehicleTitleRow}>
                    <Text style={styles.vehicleMarcaModelo} numberOfLines={2}>
                      <Text style={styles.vehicleHighlight}>{det.vehiculo_marca}</Text> {det.vehiculo_modelo}
                    </Text>
                    {det.vehiculo_patente ? (
                      <View style={styles.patentePill}>
                        <InstitutionalIcon name="badge" size={14} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                        <Text style={styles.patentePillText}>{det.vehiculo_patente}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.vehiculoGrid}>
                    <View style={styles.vehiculoGridItem}>
                      <View style={styles.vehiculoGridItemHeader}>
                        <InstitutionalIcon name="calendar-today" size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                        <Text style={styles.vehiculoGridItemLabel}>Año</Text>
                      </View>
                      <Text style={styles.vehiculoGridItemValue}>{det.vehiculo_anio ?? 'N/A'}</Text>
                    </View>
                    <View style={styles.vehiculoGridItem}>
                      <View style={styles.vehiculoGridItemHeader}>
                        <InstitutionalIcon name="speed" size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                        <Text style={styles.vehiculoGridItemLabel}>Kilometraje</Text>
                      </View>
                      <Text style={styles.vehiculoGridItemValue}>N/A</Text>
                    </View>
                  </View>

                  <View style={styles.vehiculoGrid}>
                    <View style={styles.vehiculoGridItem}>
                      <View style={styles.vehiculoGridItemHeader}>
                        <InstitutionalIcon name="document" size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                        <Text style={styles.vehiculoGridItemLabel}>VIN</Text>
                      </View>
                      <Text style={styles.vehiculoGridItemValue} numberOfLines={2}>
                        {det.vehiculo_vin || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.vehiculoGridItem}>
                      <View style={styles.vehiculoGridItemHeader}>
                        <InstitutionalIcon name="tune" size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                        <Text style={styles.vehiculoGridItemLabel}>Cilindraje</Text>
                      </View>
                      <Text style={styles.vehiculoGridItemValue}>{det.vehiculo_cilindraje || 'N/A'}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionHeaderTitle}>Servicios solicitados</Text>
                <View style={styles.serviciosListaDetalle}>
                  <View style={styles.servicioDetalleCard}>
                    <Text style={styles.servicioDetalleNombre} numberOfLines={3}>
                      {nombreServicio}
                    </Text>
                  </View>
                </View>

                {precio ? <Text style={styles.ofertaPrecio}>{precio}</Text> : null}

                {det.descripcion ? (
                  <View style={styles.descripcionBlock}>
                    <View style={styles.descripcionBlockHeader}>
                      <InstitutionalIcon name="description" size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                      <Text style={styles.descripcionBlockLabel}>Notas del servicio</Text>
                    </View>
                    <Text style={styles.descriptionText}>{det.descripcion}</Text>
                  </View>
                ) : null}

                {esActiva && puedeUsarAsistenteIa ? (
                  <View style={styles.asistenteIaWrap}>
                    <AsistenteDiagnosticoCard origen="cita" entityId={cita.id} habilitado />
                  </View>
                ) : null}
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>Técnico asignado</Text>
                  {esActiva && permitirEditarCita ? (
                    <InstitutionalButton
                      label={cita.miembro_taller ? 'Reasignar' : 'Asignar'}
                      variant="tertiary"
                      size="compact"
                      onPress={() => setAsignarVisible(true)}
                    />
                  ) : null}
                </View>
                <View style={styles.tecnicoCard}>
                  <View style={styles.tecnicoAvatarPlaceholder}>
                    <InstitutionalIcon name="person" size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                  </View>
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
              </View>

              {cita.tiene_checklist ? (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeaderTitle}>Checklist operativo</Text>
                    <InstitutionalTag
                      label={ESTADO_OPERATIVO_LABELS[estadoOperativo]}
                      variant={ESTADO_OPERATIVO_VARIANT[estadoOperativo]}
                      size="sm"
                    />
                  </View>

                  {mostrarProgresoChecklist ? (
                    <View style={styles.checklistProgressCard}>
                      <Text style={styles.checklistProgressTitle}>
                        {checklistCompletado
                          ? 'Checklist completado por el técnico'
                          : checklistPendienteSupervisor
                            ? 'Pendiente de rectificación del supervisor'
                            : checklistPendienteFirmaCliente
                              ? 'Esperando firma del cliente'
                              : 'En ejecución por el técnico'}
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
                      <Text style={styles.checklistProgressPct}>
                        {cita.checklist_progreso_porcentaje ?? 0}% completado
                      </Text>
                      {checklistPendienteSupervisor && !puedeRectificarSupervisor ? (
                        <Text style={styles.checklistProgressHint}>
                          El técnico ya firmó. El supervisor del taller debe rectificar el trabajo para generar el informe.
                        </Text>
                      ) : null}
                      {!checklistCompletado
                        && !checklistPendienteSupervisor
                        && !checklistPendienteFirmaCliente ? (
                        <Text style={styles.checklistProgressHint}>
                          El progreso se actualiza automáticamente mientras el técnico completa el servicio.
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {puedeRectificarSupervisor ? (
                    <InstitutionalButton
                      label="Rectificar y firmar informe"
                      variant="primary"
                      onPress={() => setShowChecklist(true)}
                      style={{ marginTop: SPACING.sm }}
                    />
                  ) : null}

                  {checklistPendienteSupervisor && !puedeRectificarSupervisor ? (
                    <InstitutionalButton
                      label="Ver resumen del checklist"
                      variant="secondary"
                      onPress={() => setShowChecklist(true)}
                      style={{ marginTop: SPACING.sm }}
                    />
                  ) : null}

                  {checklistPendienteFirmaCliente ? (
                    <View style={{ marginTop: SPACING.sm, gap: SPACING.sm }}>
                      {cita.informe_publico_url ? (
                        <View style={styles.informeLinkCard}>
                          <Text style={styles.informeLinkTitle}>Informe para el cliente</Text>
                          <Text style={styles.informeLinkHint}>
                            Comparte este enlace para que el cliente revise el servicio y firme.
                          </Text>
                          <Text style={styles.informeLinkUrl} numberOfLines={2}>
                            {cita.informe_publico_url}
                          </Text>
                          <InstitutionalButton
                            label="Copiar enlace del informe"
                            variant="primary"
                            onPress={() => void copiarEnlaceInformeCita(cita.informe_publico_url!)}
                          />
                        </View>
                      ) : (
                        <InstitutionalButton
                          label="Abrir checklist / enlace del informe"
                          variant="secondary"
                          onPress={() => setShowChecklist(true)}
                        />
                      )}
                    </View>
                  ) : null}

                  {puedeOperarChecklist && !cita.checklist_id ? (
                    <InstitutionalButton
                      label={iniciandoChecklist ? 'Preparando checklist…' : 'Iniciar servicio'}
                      variant="primary"
                      loading={iniciandoChecklist}
                      onPress={() => void handleIniciarServicioChecklist()}
                      style={{ marginTop: SPACING.sm }}
                    />
                  ) : null}

                  {puedeOperarChecklist
                    && cita.checklist_id
                    && !checklistCompletado
                    && !checklistPendienteSupervisor
                    && !checklistPendienteFirmaCliente ? (
                    <InstitutionalButton
                      label={
                        checklistEnCurso ? 'Continuar checklist' : 'Completar checklist'
                      }
                      variant="primary"
                      onPress={() => setShowChecklist(true)}
                      style={{ marginTop: SPACING.sm }}
                    />
                  ) : null}

                  {puedeOperarChecklist
                    && checklistPendienteSupervisor
                    && !puedeRectificarSupervisor ? (
                    <InstitutionalButton
                      label="Ver resumen (esperando supervisor)"
                      variant="secondary"
                      onPress={() => setShowChecklist(true)}
                      style={{ marginTop: SPACING.sm }}
                    />
                  ) : null}

                  {!puedeOperarChecklist && !cita.checklist_id && esActiva ? (
                    <Text style={styles.checklistProgressHint}>
                      El técnico asignado debe iniciar el servicio para comenzar el checklist.
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.section}>
                <Text style={styles.sectionHeaderTitle}>Fecha y hora</Text>
                <View style={styles.dateTimeRow}>
                  <InstitutionalIcon name="calendar-today" size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                  <View style={styles.dateTimeTextos}>
                    <Text style={styles.dateTimeLabel}>Fecha</Text>
                    <Text style={styles.dateTimeValue}>{formatearFecha(cita.fecha_servicio)}</Text>
                  </View>
                </View>
                <View style={styles.dateTimeDivider} />
                <View style={styles.dateTimeRow}>
                  <InstitutionalIcon name="access-time" size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                  <View style={styles.dateTimeTextos}>
                    <Text style={styles.dateTimeLabel}>Horario</Text>
                    <Text style={styles.dateTimeValue}>
                      {formatearRangoHora(cita.hora_servicio, cita.duracion_minutos)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionHeaderTitle}>Ubicación del servicio</Text>
                <View style={styles.addressCard}>
                  <View style={styles.addressHeader}>
                    <InstitutionalIcon name="location-on" size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                    <View style={styles.addressContent}>
                      <Text style={styles.addressText}>{textoUbicacion}</Text>
                      {!esDomicilio ? (
                        <Text style={styles.addressDetailsText}>Servicio presencial en el taller</Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              </View>
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

        {muestraFooterAcciones ? (
          <CitaPersonalFooter
            esActiva={esActiva}
            esCancelada={esCancelada}
            editando={editando}
            procesando={procesando}
            bottomPad={footerBottomPad}
            permitirEditar={permitirEditarCita && !checklistEnCurso}
            permitirEliminar={permitirEliminarCita}
            permitirCancelar={puedeCancelarCita}
            permitirCerrarManual={esActiva && !checklistEnCurso && !checklistCompletado}
            onEditar={() => {
              setFeedbackAccion(null);
              setEditando(true);
            }}
            onCompletar={handleCerrar}
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
        onAsignado={() => {
          void recargarCita();
          void invalidateProveedorMarketplaceQueries(queryClient);
        }}
      />
    </View>
  );
}

function EditSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      <View style={styles.editFields}>{children}</View>
    </View>
  );
}

type CitaPersonalFooterProps = {
  esActiva: boolean;
  esCancelada: boolean;
  editando: boolean;
  procesando: boolean;
  bottomPad: number;
  permitirEditar: boolean;
  permitirEliminar: boolean;
  permitirCancelar: boolean;
  permitirCerrarManual: boolean;
  onEditar: () => void;
  onCompletar: () => void;
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
  permitirEditar,
  permitirEliminar,
  permitirCancelar,
  permitirCerrarManual,
  onEditar,
  onCompletar,
  onCancelar,
  onGuardar,
  onDescartar,
  onEliminar,
}: CitaPersonalFooterProps) {
  return (
    <View style={[styles.footer, { paddingBottom: bottomPad }]}>
      {esActiva && !editando ? (
        permitirEditar ? (
          <>
            {(permitirEditar || permitirCerrarManual) ? (
              <View style={styles.footerRow}>
                {permitirEditar ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.footerBtnOutline,
                      (pressed || procesando) && styles.footerBtnPressed,
                      procesando && styles.footerBtnDisabled,
                    ]}
                    onPress={onEditar}
                    disabled={procesando}
                  >
                    <InstitutionalIcon name="create" size={20} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.footerBtnOutlineNeutralText} numberOfLines={1}>Editar</Text>
                  </Pressable>
                ) : null}
                {permitirCerrarManual ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.footerBtnSuccess,
                      (pressed || procesando) && styles.footerBtnPressed,
                      procesando && styles.footerBtnDisabled,
                    ]}
                    onPress={onCompletar}
                    disabled={procesando}
                  >
                    <InstitutionalIcon name="check-circle" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.footerBtnPrimaryText} numberOfLines={1}>Completar</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {permitirCancelar ? (
              <Pressable
                style={({ pressed }) => [
                  styles.footerBtnCancel,
                  (pressed || procesando) && styles.footerBtnPressed,
                  procesando && styles.footerBtnDisabled,
                ]}
                onPress={onCancelar}
                disabled={procesando}
              >
                <InstitutionalIcon name="cancel" size={20} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.footerBtnOutlineText} numberOfLines={1}>Cancelar cita</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          (permitirCancelar || permitirCerrarManual) ? (
            <View style={styles.footerRow}>
              {permitirCancelar ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.footerBtnCancel,
                    styles.footerBtnNarrow,
                    (pressed || procesando) && styles.footerBtnPressed,
                    procesando && styles.footerBtnDisabled,
                  ]}
                  onPress={onCancelar}
                  disabled={procesando}
                >
                  <InstitutionalIcon name="cancel" size={20} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
                  <Text style={styles.footerBtnOutlineText} numberOfLines={1}>Cancelar cita</Text>
                </Pressable>
              ) : null}
              {permitirCerrarManual ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.footerBtnSuccess,
                    styles.footerBtnWide,
                    (pressed || procesando) && styles.footerBtnPressed,
                    procesando && styles.footerBtnDisabled,
                  ]}
                  onPress={onCompletar}
                  disabled={procesando}
                >
                  <InstitutionalIcon name="check-circle" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                  <Text style={styles.footerBtnPrimaryText} numberOfLines={1}>Completar</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null
        )
      ) : null}

      {esActiva && editando && permitirEditar ? (
        <View style={styles.footerRow}>
          <Pressable
            style={({ pressed }) => [
              styles.footerBtnOutline,
              (pressed || procesando) && styles.footerBtnPressed,
              procesando && styles.footerBtnDisabled,
            ]}
            onPress={onDescartar}
            disabled={procesando}
          >
            <InstitutionalIcon name="close" size={20} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.footerBtnOutlineNeutralText} numberOfLines={1}>Descartar</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.footerBtnPrimary,
              (pressed || procesando) && styles.footerBtnPressed,
              procesando && styles.footerBtnDisabled,
            ]}
            onPress={onGuardar}
            disabled={procesando}
          >
            {procesando ? (
              <ActivityIndicator color={I.onPrimary} size="small" />
            ) : (
              <>
                <InstitutionalIcon name="save" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.footerBtnPrimaryText} numberOfLines={1}>Guardar cambios</Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}

      {esCancelada && permitirEliminar ? (
        <Pressable
          style={({ pressed }) => [
            styles.footerBtnCancel,
            (pressed || procesando) && styles.footerBtnPressed,
            procesando && styles.footerBtnDisabled,
          ]}
          onPress={onEliminar}
          disabled={procesando}
        >
          <InstitutionalIcon name="delete" size={20} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={styles.footerBtnOutlineText} numberOfLines={1}>Eliminar cita</Text>
        </Pressable>
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

  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.md,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
  },
  metaBadgeNeutral: {
    backgroundColor: I.surfaceStrong,
    borderColor: I.hairline,
  },
  metaBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
  },

  section: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.fixed.md,
    marginBottom: SPACING.fixed.md,
    ...SHADOWS.editorial,
  },
  sectionHeaderTitle: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    letterSpacing: TS.h4.letterSpacing,
    color: I.ink,
    marginBottom: SPACING.fixed.sm,
  },
  checklistProgressCard: {
    marginTop: SPACING.fixed.sm,
    padding: SPACING.fixed.md,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceStrong,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    gap: SPACING.fixed.xs,
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
    height: 8,
    borderRadius: 4,
    backgroundColor: I.hairline,
    overflow: 'hidden',
  },
  checklistProgressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: I.primary,
  },
  checklistProgressPct: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  checklistProgressHint: {
    marginTop: SPACING.fixed.xs,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
  },
  informeLinkCard: {
    padding: SPACING.fixed.md,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.surfaceSoft,
    gap: SPACING.fixed.sm,
  },
  informeLinkTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
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
    gap: SPACING.sm,
    marginBottom: SPACING.fixed.sm,
  },
  editFields: {
    gap: SPACING.fixed.md,
  },

  clientInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.md,
  },
  clientAvatarWrap: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  clientAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: withOpacity(I.primary, 0.12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientInfoTextos: {
    flex: 1,
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

  vehicleCard: {
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.sm + 2,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    gap: SPACING.fixed.sm,
  },
  vehicleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  vehicleCardTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.muted,
  },
  vehicleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
  },
  vehicleMarcaModelo: {
    flex: 1,
    minWidth: 0,
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    color: I.ink,
  },
  vehicleHighlight: {
    fontFamily: FF.sansSemiBold,
    color: I.primary,
  },
  patentePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: withOpacity(I.primary, 0.1),
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.primary, 0.25),
  },
  patentePillText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.primary,
    letterSpacing: 0.4,
  },
  vehiculoGrid: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
  },
  vehiculoGridItem: {
    flex: 1,
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.sm + 2,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  vehiculoGridItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  vehiculoGridItemLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    lineHeight: lh(TYPOGRAPHY.fontSize.xs, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
  },
  vehiculoGridItemValue: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.ink,
  },

  serviciosListaDetalle: {
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  servicioDetalleCard: {
    backgroundColor: I.surfaceStrong,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.sm + 2,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  servicioDetalleNombre: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.ink,
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
  },
  asistenteIaWrap: {
    marginTop: SPACING.fixed.md,
  },
  descripcionBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    marginBottom: SPACING.fixed.sm,
  },
  descripcionBlockLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
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

  tecnicoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.fixed.md,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.canvas,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    gap: SPACING.fixed.sm,
  },
  tecnicoAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: I.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
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

  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
  },
  dateTimeTextos: {
    flex: 1,
    gap: 2,
  },
  dateTimeLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  dateTimeValue: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.ink,
    textTransform: 'capitalize',
  },
  dateTimeDivider: {
    height: BORDERS.width.thin,
    backgroundColor: I.hairline,
    marginVertical: SPACING.fixed.sm,
  },

  addressCard: {
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.fixed.md,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
  },
  addressContent: {
    flex: 1,
  },
  addressText: {
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansMedium,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    color: I.ink,
  },
  addressDetailsText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
    marginTop: SPACING.fixed.xxs,
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
    paddingHorizontal: hx,
    paddingTop: SPACING.fixed.sm,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
    gap: SPACING.fixed.sm,
    ...shadowFooter,
  },
  footerRow: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
  },
  footerBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.sm + 2,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.canvas,
  },
  footerBtnCancel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.sm + 2,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.semanticDown, 0.35),
    backgroundColor: I.canvas,
  },
  footerBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.sm + 2,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.primary,
    ...SHADOWS.editorial,
  },
  footerBtnSuccess: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.sm + 2,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.semanticUp,
    ...SHADOWS.editorial,
  },
  footerBtnWide: {
    flex: 1.65,
  },
  footerBtnNarrow: {
    flex: 1,
  },
  footerBtnOutlineText: {
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    color: I.semanticDown,
  },
  footerBtnOutlineNeutralText: {
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  footerBtnPrimaryText: {
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    color: I.onPrimary,
  },
  footerBtnPressed: { opacity: 0.85 },
  footerBtnDisabled: { opacity: 0.55 },
});
