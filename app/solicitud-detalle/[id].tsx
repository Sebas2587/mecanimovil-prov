import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  Pressable,
  AppState,
  Platform,
} from 'react-native';
import { showAlert, showAlertButtons } from '@/utils/platformAlert';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateProveedorMarketplaceQueries } from '@/utils/invalidateProveedorMarketplace';
import {
  patchSolicitudDetalleCache,
  useSolicitudDetalleQuery,
} from '@/hooks/useSolicitudDetalleQuery';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, withOpacity, SPACING, TYPOGRAPHY, SHADOWS, BORDERS, platformShadow, noShadow } from '@/app/design-system/tokens';
import solicitudesService, {
  type SolicitudPublica,
  type OfertaProveedor,
  type MotivoRechazo,
  type DetalleServicioOferta,
  type MiembroTallerResumen,
} from '@/services/solicitudesService';
import equipoTallerService, { mecanicoCompatibleConTipoServicio } from '@/services/equipoTallerService';
import { RechazarSolicitudModal } from '@/components/solicitudes/RechazarSolicitudModal';
import { ProponerFechaCatalogoModal, type MecanicoPropuestaOption } from '@/components/solicitudes/ProponerFechaCatalogoModal';
import { Sparkles } from 'lucide-react-native';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { institutionalTagIconColor } from '@/app/design-system/styles/institutionalTags';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { obtenerMecanicosAptosAgenda } from '@/services/disponibilidadProveedorService';
import {
  modalidadFiltroMecanico,
  resolveModalidadServicio,
  tipoServicioAgenda,
} from '@/utils/modalidadServicioSolicitud';
import { useOfertaEjecucion } from '@/components/solicitud-detalle/useOfertaEjecucion';
import { SolicitudDetalleFooter } from '@/components/solicitud-detalle/SolicitudDetalleFooter';
import { SolicitudDetalleEjecucion } from '@/components/solicitud-detalle/SolicitudDetalleEjecucion';
import {
  SolicitudDetalleChecklistOverlay,
  SolicitudDetalleChecklistCompletedModal,
} from '@/components/solicitud-detalle/SolicitudDetalleChecklistOverlay';
import { calcularAlturaFooterEjecucion } from '@/utils/calcularAlturaFooterEjecucion';
import { AsistenteDiagnosticoCard } from '@/components/orden-detalle/AsistenteDiagnosticoCard';
import { useAuth } from '@/context/AuthContext';
import { useAlerts } from '@/context/AlertsContext';
import { puedeUsarAsistenteIaEnOrden } from '@/utils/asistenteIaPermisos';
import { ModalCreditosInsuficientes } from '@/components/creditos';
import type { VerificacionCreditosOferta } from '@/services/creditosService';

const ESTADOS_EJECUCION_UI = new Set([
  'pendiente_creditos',
  'aceptada',
  'pendiente_pago',
  'pagada',
  'pagada_parcialmente',
  'en_ejecucion',
  'completada',
]);

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

function textoEstadoOferta(estado: string): string {
  switch (estado) {
    case 'pendiente_confirmacion':
      return 'Pendiente tu confirmación';
    case 'enviada':
      return 'Enviada';
    case 'vista':
      return 'Vista por cliente';
    case 'en_chat':
      return 'En conversación';
    case 'pendiente_creditos':
      return 'Pendiente créditos';
    case 'aceptada':
      return 'Aceptada';
    case 'pendiente_pago':
      return 'Cliente pagando…';
    case 'pagada':
      return 'Pagada';
    case 'en_ejecucion':
      return 'En ejecución';
    case 'completada':
      return 'Completada';
    case 'rechazada':
      return 'Rechazada';
    case 'retirada':
      return 'Retirada';
    case 'expirada':
      return 'Expirada';
    case 'pagada_parcialmente':
      return 'Pago parcial';
    default:
      return estado;
  }
}

/** Evita desfase por zona horaria con fechas YYYY-MM-DD del API. */
function parseFechaLocal(fecha: string | null | undefined): Date | null {
  if (!fecha) return null;
  const iso = String(fecha).split('T')[0];
  const [y, m, d] = iso.split('-').map((p) => parseInt(p, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function normalizarFechaApi(fecha: string | null | undefined): string {
  if (!fecha) return '';
  return String(fecha).split('T')[0];
}

function resolverFechaHoraPantalla(
  solicitud: SolicitudPublica | null,
  miOferta: OfertaProveedor | null,
): { fecha: string; hora: string | null; propuestaPendiente: boolean } {
  if (!solicitud) {
    return { fecha: '', hora: null, propuestaPendiente: false };
  }
  if (miOferta?.es_fecha_alternativa && miOferta.fecha_disponible) {
    return {
      fecha: normalizarFechaApi(miOferta.fecha_disponible),
      hora: miOferta.hora_disponible ?? null,
      propuestaPendiente: true,
    };
  }
  return {
    fecha: normalizarFechaApi(solicitud.fecha_preferida),
    hora: solicitud.hora_preferida ?? null,
    propuestaPendiente: false,
  };
}

export default function SolicitudDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { esMecanicoEquipo, miembroId, estadoProveedor, esSupervisor, rolTaller, puede } = useAuth();
  const { agregarAlerta } = useAlerts();
  const esProveedorDomicilio = estadoProveedor?.tipo_proveedor === 'mecanico';
  const esMandanteTaller = rolTaller === 'mandante';

  const invalidateOrdenesYOfertas = useCallback(() => {
    invalidateProveedorMarketplaceQueries(queryClient);
  }, [queryClient]);

  const {
    data: detalleBundle,
    isPending: detallePending,
    isError: detalleError,
    refetch: refetchDetalle,
  } = useSolicitudDetalleQuery(id);

  const solicitud = detalleBundle?.solicitud ?? null;
  const miOferta = detalleBundle?.miOferta ?? null;
  const ofertasSecundarias = detalleBundle?.ofertasSecundarias ?? [];
  const showInitialLoader = Boolean(id) && detallePending && !detalleBundle;

  const [mostrarModalRechazo, setMostrarModalRechazo] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [confirmandoCatalogo, setConfirmandoCatalogo] = useState(false);
  const [liberandoReserva, setLiberandoReserva] = useState(false);
  const [mostrarModalFecha, setMostrarModalFecha] = useState(false);
  const [proponiendoFecha, setProponiendoFecha] = useState(false);
  const [fotoAmpliadaUrl, setFotoAmpliadaUrl] = useState<string | null>(null);
  const [mecanicosPropuesta, setMecanicosPropuesta] = useState<MecanicoPropuestaOption[]>([]);
  const [modalCreditosVisible, setModalCreditosVisible] = useState(false);
  const [verificacionCreditosConfirm, setVerificacionCreditosConfirm] =
    useState<VerificacionCreditosOferta | null>(null);

  const recargarDetalle = useCallback(async () => {
    await refetchDetalle();
  }, [refetchDetalle]);

  useEffect(() => {
    if (!detalleError || detalleBundle) return;
    Alert.alert('Error', 'No se pudo cargar la solicitud');
    router.back();
  }, [detalleError, detalleBundle]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && id && detalleBundle) {
        void refetchDetalle();
      }
    });
    return () => sub.remove();
  }, [id, detalleBundle, refetchDetalle]);

  const handleOfertaUpdated = useCallback(
    (oferta: OfertaProveedor) => {
      if (id) patchSolicitudDetalleCache(queryClient, id, { miOferta: oferta });
    },
    [id, queryClient],
  );

  const ejecucion = useOfertaEjecucion({
    miOferta,
    onOfertaUpdated: handleOfertaUpdated,
    onReload: () => void recargarDetalle(),
  });

  const solicitudEstado = useMemo(
    () => miOferta?.solicitud_estado ?? solicitud?.estado,
    [miOferta?.solicitud_estado, solicitud?.estado],
  );

  const fechaHoraPantalla = useMemo(
    () => resolverFechaHoraPantalla(solicitud, miOferta),
    [solicitud, miOferta],
  );

  const tecnicoSolicitud = useMemo((): MiembroTallerResumen | null => {
    if (miOferta?.miembro_taller_detail) return miOferta.miembro_taller_detail;
    if (miOferta?.es_fecha_alternativa && miOferta.miembro_taller_detail) {
      return miOferta.miembro_taller_detail;
    }
    return solicitud?.miembro_taller_preferido_detail ?? null;
  }, [solicitud, miOferta]);

  const miembroInicialPropuesta = useMemo(() => {
    return (
      miOferta?.miembro_taller_asignado
      ?? solicitud?.miembro_taller_preferido
      ?? tecnicoSolicitud?.id
      ?? null
    );
  }, [miOferta, solicitud, tecnicoSolicitud]);

  const modalidadServicio = useMemo(
    () => resolveModalidadServicio(solicitud, miOferta),
    [solicitud, miOferta],
  );

  const agendaPropuestaContext = useMemo(() => {
    const proveedorId = miOferta?.proveedor_id_detail;
    if (!proveedorId) return null;
    return {
      tipoProveedor: miOferta?.tipo_proveedor ?? 'taller',
      proveedorId,
      ofertaServicioId: miOferta?.oferta_servicio ?? null,
      modalidad: modalidadFiltroMecanico(modalidadServicio),
    };
  }, [miOferta, modalidadServicio]);

  async function asegurarMecanicoPreferido(
    lista: MecanicoPropuestaOption[],
    preferidoId: number | null,
    preferidoDetail: MiembroTallerResumen | null,
  ): Promise<MecanicoPropuestaOption[]> {
    if (!preferidoId || lista.some((m) => m.id === preferidoId)) {
      return lista;
    }
    if (preferidoDetail) {
      return [
        {
          id: preferidoDetail.id,
          nombre: preferidoDetail.nombre,
          foto_url: preferidoDetail.foto_url,
          modalidad_display: preferidoDetail.modalidad_display,
        },
        ...lista,
      ];
    }
    try {
      const miembro = await equipoTallerService.obtener(preferidoId);
      return [
        {
          id: miembro.id,
          nombre: miembro.nombre,
          foto_url: miembro.foto_url,
          modalidad_display: miembro.modalidad_tecnico_display,
        },
        ...lista,
      ];
    } catch {
      return lista;
    }
  }

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

  const formatearHora = (hora: string | null) => {
    if (!hora) return 'No especificada';
    return String(hora).substring(0, 5);
  };

  const esServicioDiagnostico = (nombreServicio: string): boolean => {
    const nombreLower = nombreServicio.toLowerCase();
    const palabrasDiagnostico = [
      'diagnostico',
      'diagnóstico',
      'revision',
      'revisión',
      'inspeccion',
      'inspección',
      'evaluacion',
      'evaluación',
      'scanner',
      'computadora',
      'obd',
    ];
    return palabrasDiagnostico.some((palabra) => nombreLower.includes(palabra));
  };

  const determinarRequiereRepuestos = (): boolean => {
    if (!solicitud) return false;
    if (solicitud.requiere_repuestos === false) {
      return false;
    }

    if (solicitud.servicios_solicitados_detail && solicitud.servicios_solicitados_detail.length > 0) {
      const todosSonDiagnostico = solicitud.servicios_solicitados_detail.every((servicio) =>
        esServicioDiagnostico(servicio.nombre)
      );
      if (todosSonDiagnostico) {
        return false;
      }
    }

    if (solicitud.requiere_repuestos === true) {
      return true;
    }

    return false;
  };

  const esAsignacionCatalogo =
    miOferta?.origen === 'catalogo' && solicitud?.estado === 'pendiente_confirmacion';

  const puedeGestionarCatalogo =
    esAsignacionCatalogo && miOferta?.estado === 'pendiente_confirmacion';

  const puedeChatCatalogo =
    esAsignacionCatalogo &&
    (miOferta?.estado === 'pendiente_confirmacion' || miOferta?.estado === 'en_chat');

  const puedeServiciosIa = !esSupervisor || puede('servicios');
  const ofertaEnBorrador = Boolean(
    miOferta && ['enviada', 'vista', 'en_chat'].includes(miOferta.estado),
  );
  const mostrarCtaChatOferta =
    puedeChatCatalogo
    || miOferta?.estado === 'aceptada'
    || miOferta?.estado === 'pagada'
    || miOferta?.estado === 'pendiente_creditos'
    || ofertaEnBorrador;

  useEffect(() => {
    if (!esAsignacionCatalogo) {
      setMecanicosPropuesta([]);
      return;
    }
    let mounted = true;
    const tipoServicio = tipoServicioAgenda(modalidadServicio);
    const preferidoId = miembroInicialPropuesta;
    const preferidoDetail = tecnicoSolicitud;

    async function cargarMecanicos() {
      try {
        let opciones: MecanicoPropuestaOption[] = [];

        if (miOferta?.tipo_proveedor === 'taller' && miOferta.proveedor_id_detail) {
          const miembros = await obtenerMecanicosAptosAgenda({
            tallerId: miOferta.proveedor_id_detail,
            ofertaServicioId: miOferta.oferta_servicio ?? undefined,
            modalidad: modalidadFiltroMecanico(modalidadServicio),
          });
          opciones = miembros.map((m) => ({
            id: m.id,
            nombre: m.nombre,
            foto_url: m.foto_url ?? null,
            modalidad_display: m.modalidad_display,
          }));
        } else {
          const equipo = await equipoTallerService.listar({ rol: 'mecanico', activo: true });
          opciones = equipo
            .filter((m) => mecanicoCompatibleConTipoServicio(m, tipoServicio))
            .map((m) => ({
              id: m.id,
              nombre: m.nombre,
              foto_url: m.foto_url ?? null,
              modalidad_display: m.modalidad_tecnico_display,
            }));
        }

        const merged = await asegurarMecanicoPreferido(opciones, preferidoId, preferidoDetail);
        if (mounted) setMecanicosPropuesta(merged);
      } catch {
        if (!mounted) return;
        if (preferidoDetail) {
          setMecanicosPropuesta([
            {
              id: preferidoDetail.id,
              nombre: preferidoDetail.nombre,
              foto_url: preferidoDetail.foto_url,
              modalidad_display: preferidoDetail.modalidad_display,
            },
          ]);
        } else {
          setMecanicosPropuesta([]);
        }
      }
    }

    void cargarMecanicos();
    return () => {
      mounted = false;
    };
  }, [
    esAsignacionCatalogo,
    miOferta?.tipo_proveedor,
    miOferta?.proveedor_id_detail,
    miOferta?.oferta_servicio,
    modalidadServicio,
    miembroInicialPropuesta,
    tecnicoSolicitud,
  ]);

  const abrirTiendaCreditos = useCallback((minCreditos: number) => {
    router.push(`/creditos?tab=tienda&minCreditos=${Math.max(1, minCreditos)}`);
  }, []);

  const ejecutarConfirmarCatalogo = async () => {
    if (!miOferta?.id) return;
    setConfirmandoCatalogo(true);
    try {
      const result = await solicitudesService.confirmarCatalogo(miOferta.id);
      if (result.success) {
        showAlert(
          'Asignación confirmada',
          'El cliente fue notificado y puede proceder al pago.',
        );
        invalidateOrdenesYOfertas();
        void recargarDetalle();
        return;
      }

      const errData = result.data as {
        codigo?: string;
        mensaje_ux?: string;
        creditos_necesarios?: number;
        saldo_actual?: number;
        creditos_faltantes?: number;
        error?: string;
      } | undefined;

      if (errData?.codigo === 'creditos_insuficientes') {
        const necesarios = Number(errData.creditos_necesarios ?? 0);
        const saldo = Number(errData.saldo_actual ?? 0);
        const faltantes = Number(
          errData.creditos_faltantes ?? Math.max(0, necesarios - saldo),
        );
        const verificacion: VerificacionCreditosOferta = {
          puede_ofertar: false,
          saldo_actual: saldo,
          creditos_necesarios: necesarios,
          creditos_faltantes: faltantes,
          detalle_servicios: [],
          mensaje: errData.mensaje_ux || errData.error || result.error || '',
        };
        setVerificacionCreditosConfirm(verificacion);
        setModalCreditosVisible(true);
        agregarAlerta({
          tipo: 'creditos_para_confirmar',
          titulo: 'Créditos insuficientes para confirmar',
          mensaje:
            errData.mensaje_ux
            || `Te faltan ${faltantes} crédito(s). La asignación sigue pendiente: puedes comprar y reintentar, o rechazar.`,
          accion: {
            texto: 'Comprar créditos',
            ruta: `/creditos?tab=tienda&minCreditos=${Math.max(1, faltantes || necesarios || 1)}`,
          },
          prioridad: 'alta',
        });
        // Hard-gate: no mutó estados; refrescar por si el banner local quedó desfasado.
        void recargarDetalle();
        return;
      }

      showAlert('Error', result.error || 'No se pudo confirmar');
    } finally {
      setConfirmandoCatalogo(false);
    }
  };

  const handleConfirmarCatalogo = () => {
    if (!miOferta?.id || confirmandoCatalogo || rechazando) return;
    showAlertButtons(
      'Confirmar asignación',
      'Al confirmar adjudicarás la orden y se descontarán créditos de tu cuenta. El cliente podrá pagar. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => void ejecutarConfirmarCatalogo() },
      ],
    );
  };

  const handleProponerFechaCatalogo = async (
    fecha: string,
    hora: string,
    motivo: string,
    miembroTallerId?: number | null,
  ) => {
    if (!miOferta?.id) return;
    setProponiendoFecha(true);
    try {
      const result = await solicitudesService.proponerFechaCatalogo(
        miOferta.id,
        fecha,
        hora || undefined,
        motivo,
        miembroTallerId,
      );
      if (result.success) {
        const payload = result.data as {
          fecha_disponible?: string;
          hora_disponible?: string | null;
          es_fecha_alternativa?: boolean;
        } | undefined;
        if (id && miOferta) {
          patchSolicitudDetalleCache(queryClient, id, {
            miOferta: {
              ...miOferta,
              estado: 'en_chat',
              fecha_disponible: payload?.fecha_disponible ?? fecha,
              hora_disponible: payload?.hora_disponible ?? (hora || miOferta.hora_disponible),
              es_fecha_alternativa: true,
              motivo_fecha_alternativa: motivo || miOferta.motivo_fecha_alternativa,
            },
          });
        }
        setMostrarModalFecha(false);
        invalidateOrdenesYOfertas();
        void recargarDetalle();
        Alert.alert(
          'Fecha enviada',
          'El cliente fue notificado. Podrá aceptarla desde su solicitud.',
        );
      } else {
        Alert.alert('Error', result.error || 'No se pudo proponer la fecha');
      }
    } finally {
      setProponiendoFecha(false);
    }
  };

  const ejecutarRechazarCatalogo = async () => {
    if (!miOferta?.id) return;
    setRechazando(true);
    try {
      const result = await solicitudesService.rechazarCatalogo(miOferta.id);
      if (result.success) {
        invalidateOrdenesYOfertas();
        showAlert('Rechazada', 'La solicitud fue cancelada.');
        router.back();
      } else {
        showAlert('Error', result.error || 'No se pudo rechazar');
      }
    } finally {
      setRechazando(false);
    }
  };

  const handleRechazarCatalogo = () => {
    if (!miOferta?.id || rechazando || confirmandoCatalogo) return;
    showAlertButtons(
      'Rechazar asignación',
      'El cliente será notificado. ¿Seguro que no puedes realizar este servicio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Rechazar', style: 'destructive', onPress: () => void ejecutarRechazarCatalogo() },
      ],
    );
  };

  const ejecutarLiberarReservaCreditos = async () => {
    if (!miOferta?.id) return;
    setLiberandoReserva(true);
    try {
      const isCatalogo = miOferta.origen === 'catalogo';
      const result = isCatalogo
        ? await solicitudesService.rechazarCatalogo(miOferta.id, 'Sin créditos para confirmar')
        : await solicitudesService.liberarReservaCreditos(miOferta.id, 'Sin créditos para confirmar');
      if (result.success) {
        invalidateOrdenesYOfertas();
        showAlert(
          'Reserva liberada',
          isCatalogo
            ? 'La asignación se canceló. El cliente fue notificado.'
            : 'Liberaste la reserva. El cliente puede elegir otra oferta.',
        );
        router.back();
      } else {
        showAlert('Error', result.error || 'No se pudo liberar la reserva');
      }
    } finally {
      setLiberandoReserva(false);
    }
  };

  const handleLiberarReservaCreditos = () => {
    if (!miOferta?.id || liberandoReserva) return;
    showAlertButtons(
      'Liberar reserva',
      'No comprarás créditos ahora. El cliente quedará libre para continuar con otro taller. ¿Confirmas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Liberar',
          style: 'destructive',
          onPress: () => void ejecutarLiberarReservaCreditos(),
        },
      ],
    );
  };

  const handleRechazar = async (motivo: MotivoRechazo, detalle: string) => {
    if (!id) return;
    try {
      setRechazando(true);
      const result = await solicitudesService.rechazarSolicitud(id, motivo, detalle);

      if (result.success) {
        invalidateOrdenesYOfertas();
        Alert.alert('Solicitud Rechazada', 'La solicitud ha sido rechazada exitosamente. El cliente será notificado.', [
          {
            text: 'OK',
            onPress: () => {
              setMostrarModalRechazo(false);
              router.back();
            },
          },
        ]);
      } else {
        Alert.alert('Error', result.error || 'No se pudo rechazar la solicitud');
      }
    } catch (error) {
      console.error('Error rechazando solicitud:', error);
      Alert.alert('Error', 'Ocurrió un error al rechazar la solicitud');
    } finally {
      setRechazando(false);
    }
  };

  const detallesOfertaPorServicio = useMemo(() => {
    const map = new Map<number, DetalleServicioOferta>();
    (miOferta?.detalles_servicios_detail ?? []).forEach((detalle) => {
      if (detalle.servicio != null) {
        map.set(Number(detalle.servicio), detalle);
      }
    });
    return map;
  }, [miOferta?.detalles_servicios_detail]);

  const fmtRepuestoLinea = (rep: {
    precio?: number;
    precio_referencia?: number;
    cantidad?: number;
  }) => {
    const unit = Number(rep.precio ?? rep.precio_referencia ?? 0);
    const qty = Number(rep.cantidad ?? 1);
    return (unit * qty).toLocaleString('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    });
  };

  const tienePieDecisionCatalogo = puedeGestionarCatalogo;

  const mostrarEjecucionUi =
    !!miOferta
    && !puedeGestionarCatalogo
    && ESTADOS_EJECUCION_UI.has(miOferta.estado);

  const showEjecucionFooter =
    !!miOferta
    && !puedeGestionarCatalogo
    && (
      ejecucion.mostrarBotonIniciar
      || ejecucion.enEjecucionAbierto
      || ejecucion.servicioCompletadoUi
      || ejecucion.mostrarChatFijo
      || miOferta.estado === 'pendiente_creditos'
    );

  const footerBottomPad = Math.max(insets.bottom, Platform.OS === 'web' ? 12 : 0);

  const footerReserve = useMemo(() => {
    if (tienePieDecisionCatalogo || (!miOferta && solicitud?.estado !== 'pendiente_confirmacion')) {
      /** InstitutionalButton default minHeight 52 + footer padding */
      return 68 + footerBottomPad + SPACING.fixed.md;
    }
    if (showEjecucionFooter && miOferta) {
      return calcularAlturaFooterEjecucion({
        oferta: miOferta,
        checklist: ejecucion.checklistInstance,
        loadingChecklist: ejecucion.loadingChecklist,
        checklistLoadError: ejecucion.checklistLoadError,
        bottomInset: footerBottomPad,
      }) + SPACING.fixed.md;
    }
    return SPACING.fixed.lg + footerBottomPad;
  }, [
    tienePieDecisionCatalogo,
    miOferta,
    solicitud?.estado,
    showEjecucionFooter,
    ejecucion.checklistInstance,
    ejecucion.loadingChecklist,
    ejecucion.checklistLoadError,
    footerBottomPad,
  ]);

  const mostrarDireccionMaps =
    !!miOferta
    && (
      miOferta.estado === 'pagada'
      || miOferta.estado === 'pagada_parcialmente'
      || ejecucion.enEjecucionAbierto
      || ejecucion.servicioCompletadoUi
    );
  const repuestosSegunOferta = (oferta: OfertaProveedor | null): boolean => {
    if (!oferta) return false;
    if (!oferta.incluye_repuestos) return false;
    const costoRep = parseFloat(String(oferta.costo_repuestos ?? '0')) || 0;
    if (costoRep <= 0) return false;
    return true;
  };

  /** Si ya hay oferta del proveedor, la pill refleja su catálogo (no solo la preferencia del cliente). */
  const requiereRepuestos = solicitud
    ? (miOferta != null
      ? repuestosSegunOferta(miOferta)
      : determinarRequiereRepuestos())
    : false;

  const stackOptions = {
    title: 'Detalle de Solicitud',
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

  if (!solicitud) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={stackOptions} />
        <View style={styles.screenRoot}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Solicitud no encontrada</Text>
          </View>
        </View>
      </View>
    );
  }

  if (ejecucion.showChecklistContainer && miOferta?.solicitud_servicio_id) {
    return (
      <SolicitudDetalleChecklistOverlay
        miOferta={miOferta}
        showChecklistContainer
        showCompletedChecklistModal={false}
        onChecklistComplete={ejecucion.handleChecklistComplete}
        onChecklistCancel={ejecucion.handleChecklistCancel}
        onCloseCompletedModal={() => ejecucion.setShowCompletedChecklistModal(false)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={stackOptions} />

      <View style={styles.screenRoot}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: hx, paddingBottom: footerReserve },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.badgesContainer}>
            <InstitutionalTag
              label={solicitud.urgencia === 'urgente' ? 'Urgente' : 'Normal'}
              variant={solicitud.urgencia === 'urgente' ? 'error' : 'neutral'}
              size="md"
              leading={
                <InstitutionalIcon
                  name={solicitud.urgencia === 'urgente' ? 'priority-high' : 'schedule'}
                  size={16}
                  color={institutionalTagIconColor(
                    solicitud.urgencia === 'urgente' ? 'error' : 'neutral',
                  )}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
              }
            />

            <InstitutionalTag
              label={requiereRepuestos ? 'Con repuestos' : 'Sin repuestos'}
              variant={requiereRepuestos ? 'primary' : 'warning'}
              size="md"
              leading={
                <InstitutionalIcon
                  name={requiereRepuestos ? 'build' : 'build-circle'}
                  size={16}
                  color={institutionalTagIconColor(requiereRepuestos ? 'primary' : 'warning')}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
              }
            />

            {solicitud.tiempo_restante ? (
              <InstitutionalTag
                label={solicitud.tiempo_restante}
                variant="neutral"
                size="md"
                leading={
                  <InstitutionalIcon
                    name="access-time"
                    size={16}
                    color={institutionalTagIconColor('neutral')}
                    strokeWidth={ICON_STROKE_WIDTH}
                  />
                }
              />
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeaderTitle}>Cliente y vehículo</Text>
            <View style={styles.clientInfoContainer}>
              <View style={styles.clientAvatarWrap}>
                {solicitud.cliente_info?.foto_perfil ? (
                  <Image source={{ uri: solicitud.cliente_info.foto_perfil }} style={styles.clientAvatar} />
                ) : (
                  <View style={styles.clientAvatarPlaceholder}>
                    <InstitutionalIcon name="person" size={36} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                  </View>
                )}
              </View>
              <Text style={styles.clientName} numberOfLines={2}>
                {solicitud.cliente_info?.nombre || solicitud.cliente_nombre || 'Cliente'}
              </Text>
            </View>

            <View style={styles.vehicleCard}>
              <View style={styles.vehicleCardHeader}>
                <InstitutionalIcon name="directions-car" size={20} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.vehicleCardTitle}>Vehículo</Text>
              </View>
              <View style={styles.vehicleTitleRow}>
                <Text style={styles.vehicleMarcaModelo} numberOfLines={2}>
                  <Text style={styles.vehicleHighlight}>{solicitud.vehiculo_info.marca}</Text>{' '}
                  {solicitud.vehiculo_info.modelo}
                </Text>
                {solicitud.vehiculo_info.patente ? (
                  <View style={styles.patentePill}>
                    <InstitutionalIcon name="badge" size={14} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.patentePillText}>{solicitud.vehiculo_info.patente}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.vehiculoGrid}>
                <View style={styles.vehiculoGridItem}>
                  <View style={styles.vehiculoGridItemHeader}>
                    <InstitutionalIcon name="calendar-today" size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.vehiculoGridItemLabel}>Año</Text>
                  </View>
                  <Text style={styles.vehiculoGridItemValue}>
                    {solicitud.vehiculo_info.año || solicitud.vehiculo_info.anio || 'N/A'}
                  </Text>
                </View>
                <View style={styles.vehiculoGridItem}>
                  <View style={styles.vehiculoGridItemHeader}>
                    <InstitutionalIcon name="speed" size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.vehiculoGridItemLabel}>Kilometraje</Text>
                  </View>
                  <Text style={styles.vehiculoGridItemValue}>
                    {solicitud.vehiculo_info.kilometraje
                      ? `${solicitud.vehiculo_info.kilometraje.toLocaleString('es-CL')} km`
                      : 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.vehiculoGrid}>
                <View style={styles.vehiculoGridItem}>
                  <View style={styles.vehiculoGridItemHeader}>
                    <InstitutionalIcon name="settings" size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.vehiculoGridItemLabel}>Motor</Text>
                  </View>
                  <Text style={styles.vehiculoGridItemValue}>{solicitud.vehiculo_info.tipo_motor || 'N/A'}</Text>
                </View>
                <View style={styles.vehiculoGridItem}>
                  <View style={styles.vehiculoGridItemHeader}>
                    <InstitutionalIcon name="tune" size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.vehiculoGridItemLabel}>Cilindraje</Text>
                  </View>
                  <Text style={styles.vehiculoGridItemValue}>{solicitud.vehiculo_info.cilindraje || 'N/A'}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeaderTitle}>Servicios solicitados</Text>
            {solicitud.servicios_solicitados_detail && solicitud.servicios_solicitados_detail.length > 0 ? (
              <View style={styles.serviciosListaDetalle}>
                {solicitud.servicios_solicitados_detail.map((servicio, index) => {
                  const detalle = detallesOfertaPorServicio.get(Number(servicio.id));
                  const repuestos = detalle?.repuestos_info ?? [];
                  return (
                    <View key={servicio.id || index} style={styles.servicioDetalleCard}>
                      <Text style={styles.servicioDetalleNombre} numberOfLines={3}>
                        {servicio.nombre}
                      </Text>
                      {repuestos.length > 0 ? (
                        <View style={styles.repuestosOfertaBlock}>
                          <Text style={styles.repuestosOfertaLabel}>Repuestos incluidos</Text>
                          {repuestos.map((rep, repIdx) => (
                            <View
                              key={String(rep.id ?? repIdx)}
                              style={styles.repuestoOfertaRow}
                            >
                              <Text style={styles.repuestoOfertaNombre} numberOfLines={2}>
                                {rep.nombre}
                                {(rep.cantidad ?? 1) > 1 ? ` × ${rep.cantidad}` : ''}
                              </Text>
                              <Text style={styles.repuestoOfertaPrecio}>
                                {fmtRepuestoLinea(rep)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.serviciosEmptyText}>No hay servicios especificados</Text>
            )}

            <View style={styles.descripcionBlock}>
              <View style={styles.descripcionBlockHeader}>
                <InstitutionalIcon name="description" size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.descripcionBlockLabel}>Descripción del problema</Text>
              </View>
              <Text style={styles.descriptionText}>{solicitud.descripcion_problema}</Text>
            </View>

            {miOferta?.solicitud_servicio_id
            && puedeUsarAsistenteIaEnOrden({
              esMecanicoEquipo,
              esProveedorDomicilio,
              esMandanteTaller,
              esSupervisor,
              miembroId,
              mecanicoAsignadoId: miOferta.miembro_taller_asignado,
              puedeServicios: puedeServiciosIa,
            }) ? (
              <View style={styles.section}>
                <AsistenteDiagnosticoCard origen="orden" entityId={miOferta.solicitud_servicio_id} habilitado />
              </View>
            ) : null}

            {Array.isArray(solicitud.fotos_necesidad) && solicitud.fotos_necesidad.length > 0 ? (
              <View style={styles.fotosClienteSection}>
                <View style={styles.descripcionBlockHeader}>
                  <InstitutionalIcon name="image" size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                  <Text style={styles.descripcionBlockLabel}>Fotos del cliente</Text>
                </View>
                <Text style={styles.fotosClienteHint}>Toca una imagen para verla en grande.</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.fotosClienteRow}
                >
                  {solicitud.fotos_necesidad.map((foto) => {
                    const url = foto?.imagen_url;
                    if (!url) return null;
                    return (
                      <TouchableOpacity
                        key={foto.id || url}
                        onPress={() => setFotoAmpliadaUrl(url)}
                        activeOpacity={0.85}
                        style={styles.fotosClienteThumbWrap}
                      >
                        <Image source={{ uri: url }} style={styles.fotosClienteThumb} resizeMode="cover" />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}
          </View>

          {tecnicoSolicitud ? (
            <View style={styles.section}>
              <Text style={styles.sectionHeaderTitle}>Técnico preferido</Text>
              <View style={styles.tecnicoCard}>
                {tecnicoSolicitud.foto_url ? (
                  <Image source={{ uri: tecnicoSolicitud.foto_url }} style={styles.tecnicoAvatar} />
                ) : (
                  <View style={styles.tecnicoAvatarPlaceholder}>
                    <InstitutionalIcon name="person" size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                  </View>
                )}
                <View style={styles.tecnicoInfo}>
                  <Text style={styles.tecnicoNombre}>{tecnicoSolicitud.nombre}</Text>
                  {tecnicoSolicitud.modalidad_display ? (
                    <Text style={styles.tecnicoSub}>{tecnicoSolicitud.modalidad_display}</Text>
                  ) : null}
                  {tecnicoSolicitud.especialidades?.length ? (
                    <Text style={styles.tecnicoSub} numberOfLines={2}>
                      {tecnicoSolicitud.especialidades.map((e) => e.nombre).join(' · ')}
                    </Text>
                  ) : null}
                  {miOferta?.es_cambio_tecnico ? (
                    <Text style={styles.tecnicoCambio}>Cambio de técnico propuesto al cliente</Text>
                  ) : null}
                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionHeaderTitle}>Fecha y hora preferida</Text>
            {fechaHoraPantalla.propuestaPendiente ? (
              <View style={styles.fechaPropuestaBanner}>
                <InstitutionalIcon name="schedule" size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.fechaPropuestaBannerText}>
                  Propuesta enviada — el cliente aún no la ha confirmado
                </Text>
              </View>
            ) : null}
            <View style={styles.dateTimeRow}>
              <InstitutionalIcon name="calendar-today" size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
              <View style={styles.dateTimeTextos}>
                <Text style={styles.dateTimeLabel}>Fecha</Text>
                <Text style={styles.dateTimeValue}>{formatearFecha(fechaHoraPantalla.fecha)}</Text>
              </View>
            </View>
            <View style={styles.dateTimeDivider} />
            <View style={styles.dateTimeRow}>
              <InstitutionalIcon name="access-time" size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
              <View style={styles.dateTimeTextos}>
                <Text style={styles.dateTimeLabel}>Hora</Text>
                <Text style={styles.dateTimeValue}>{formatearHora(fechaHoraPantalla.hora)}</Text>
              </View>
            </View>
            {puedeGestionarCatalogo ? (
              <TouchableOpacity
                style={styles.fechaProponerLink}
                onPress={() => setMostrarModalFecha(true)}
                activeOpacity={0.75}
              >
                <InstitutionalIcon name="event" size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.fechaProponerLinkText}>Proponer otra fecha al cliente</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {!mostrarDireccionMaps ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeaderTitle}>Ubicación del servicio</Text>
            <View style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <InstitutionalIcon name="location-on" size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <View style={styles.addressContent}>
                  <Text style={styles.addressText}>{solicitud.direccion_servicio_texto}</Text>
                  {solicitud.detalles_ubicacion ? (
                    <Text style={styles.addressDetailsText}>{solicitud.detalles_ubicacion}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
          ) : null}

          {miOferta && !mostrarEjecucionUi ? (
            <View style={styles.section}>
              <View style={styles.ofertaHighlightCard}>
                <View style={styles.ofertaStatusHeader}>
                  <InstitutionalIcon name="local-offer" size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                  <Text style={styles.ofertaStatusTitle}>
                    {esAsignacionCatalogo ? 'Asignación desde catálogo' : 'Mi oferta'}
                  </Text>
                </View>
                {esAsignacionCatalogo ? (
                  <Text style={styles.catalogoContextHint}>
                    {puedeGestionarCatalogo
                      ? 'El cliente eligió tu servicio publicado. Revisa los datos, conversa si necesitas aclarar algo y luego acepta o rechaza.'
                      : 'Esperando que el cliente confirme la fecha que propusiste.'}
                  </Text>
                ) : null}
                <View style={styles.estadoOfertaRow}>
                  <View style={[styles.estadoOfertaPill, { backgroundColor: withOpacity(I.primary, 0.12) }]}>
                    <Text style={[styles.estadoOfertaPillText, { color: I.primary }]}>
                      {textoEstadoOferta(miOferta.estado)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.ofertaPrecio}>
                  {parseFloat(miOferta.precio_total_ofrecido).toLocaleString('es-CL', {
                    style: 'currency',
                    currency: 'CLP',
                    minimumFractionDigits: 0,
                  })}
                </Text>
                {mostrarCtaChatOferta ? (
                  <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => router.push(`/chat-oferta/${miOferta.id}`)}
                    activeOpacity={0.85}
                  >
                    <InstitutionalIcon name="chat" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                    <View style={styles.chatButtonTextWrap}>
                      <Text style={styles.chatButtonText}>
                        {ofertaEnBorrador && puedeServiciosIa
                          ? 'Abrir chat y cotizar'
                          : 'Ver chat con cliente'}
                      </Text>
                      {ofertaEnBorrador && puedeServiciosIa ? (
                        <View style={styles.cotizaIaHint}>
                          <Sparkles size={12} color={I.accentYellow} strokeWidth={2} />
                          <Text style={styles.cotizaIaHintText}>Cotiza con IA</Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : null}

          {miOferta &&
          (miOferta.estado === 'aceptada' || miOferta.estado === 'pagada') &&
          solicitudEstado === 'pagada' ? (
            <View style={styles.section}>
              <View style={styles.serviciosAdicionalesHeader}>
                <InstitutionalIcon name="add-circle-outline" size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.sectionHeaderTitleInline}>Servicios adicionales</Text>
              </View>
              <Text style={styles.serviciosAdicionalesDescripcion}>
                Si durante el servicio descubres problemas adicionales, puedes crear ofertas para servicios adicionales.
              </Text>

              {ofertasSecundarias.length > 0 ? (
                <View style={styles.ofertasSecundariasList}>
                  {ofertasSecundarias.map((ofertaSec) => {
                    const ok = ofertaSec.estado === 'aceptada' || ofertaSec.estado === 'pagada';
                    return (
                      <View key={ofertaSec.id} style={styles.ofertaSecundariaCard}>
                        <View style={styles.ofertaSecundariaHeader}>
                          <View style={styles.ofertaSecundariaInfo}>
                            <Text style={styles.ofertaSecundariaPrecio}>
                              {parseFloat(ofertaSec.precio_total_ofrecido).toLocaleString('es-CL', {
                                style: 'currency',
                                currency: 'CLP',
                                minimumFractionDigits: 0,
                              })}
                            </Text>
                            <Text style={styles.ofertaSecundariaEstado}>{textoEstadoOferta(ofertaSec.estado)}</Text>
                          </View>
                          <View
                            style={[
                              styles.ofertaSecundariaBadge,
                              {
                                backgroundColor: ok ? I.semanticUp : withOpacity(I.accentYellow, 0.35),
                                borderColor: ok ? withOpacity(I.semanticUp, 0.4) : I.accentYellow,
                              },
                            ]}
                          >
                            <InstitutionalIcon
                              name={ok ? 'check' : 'hourglass-empty'}
                              size={18}
                              color={ok ? I.onPrimary : I.ink}
                              strokeWidth={ICON_STROKE_WIDTH}
                            />
                          </View>
                        </View>
                        {ofertaSec.motivo_servicio_adicional ? (
                          <Text style={styles.ofertaSecundariaMotivo} numberOfLines={3}>
                            {ofertaSec.motivo_servicio_adicional}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.agregarServicioButton}
                onPress={() => {
                  router.push(`/crear-oferta-secundaria/${solicitud.id}/${miOferta.id}`);
                }}
                activeOpacity={0.85}
              >
                <InstitutionalIcon name="add-circle" size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.agregarServicioButtonText}>Agregar servicio adicional</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {mostrarEjecucionUi && miOferta ? (
            <SolicitudDetalleEjecucion
              miOferta={miOferta}
              badgeEstado={ejecucion.badgeEstado}
              bannerPrincipal={ejecucion.bannerPrincipal}
              mostrarPlanPago={ejecucion.mostrarPlanPago}
              mostrarDetallePago={ejecucion.mostrarDetallePago}
              enEjecucionAbierto={ejecucion.enEjecucionAbierto}
              servicioCompletadoUi={ejecucion.servicioCompletadoUi}
              checklistInstance={ejecucion.checklistInstance}
              loadingChecklist={ejecucion.loadingChecklist}
              bannerChecklistAccion={ejecucion.bannerChecklistAccion}
              direccionServicio={solicitud.direccion_servicio_texto}
              detallesUbicacion={solicitud.detalles_ubicacion}
              mostrarDireccionMaps={mostrarDireccionMaps}
              onOpenChecklist={() => ejecucion.setShowChecklistContainer(true)}
              onOpenCompletedChecklist={() => ejecucion.setShowCompletedChecklistModal(true)}
            />
          ) : null}
        </ScrollView>

        <SolicitudDetalleFooter
          solicitud={solicitud}
          miOferta={miOferta}
          puedeGestionarCatalogo={puedeGestionarCatalogo}
          onConfirmCatalogo={handleConfirmarCatalogo}
          onRejectCatalogo={handleRechazarCatalogo}
          confirmandoCatalogo={confirmandoCatalogo}
          rechazando={rechazando}
          onRejectSolicitud={() => setMostrarModalRechazo(true)}
          bottomPad={footerBottomPad}
          showEjecucionFooter={showEjecucionFooter}
          checklistInstance={ejecucion.checklistInstance}
          loadingChecklist={ejecucion.loadingChecklist}
          checklistLoadError={ejecucion.checklistLoadError}
          procesando={ejecucion.procesando}
          enEjecucionAbierto={ejecucion.enEjecucionAbierto}
          servicioCompletadoUi={ejecucion.servicioCompletadoUi}
          esperandoFirmaCliente={ejecucion.esperandoFirmaCliente}
          checklistCerrado={ejecucion.checklistCerrado}
          saldoManoObraPendiente={ejecucion.saldoManoObraPendiente}
          mostrarBotonIniciar={ejecucion.mostrarBotonIniciar}
          mostrarBotonTerminar={ejecucion.mostrarBotonTerminar}
          mostrarChatFijo={ejecucion.mostrarChatFijo}
          onIniciarServicio={ejecucion.handleIniciarServicio}
          onTerminarServicio={ejecucion.handleTerminarServicio}
          onOpenChecklist={() => ejecucion.setShowChecklistContainer(true)}
          onOpenCompletedChecklist={() => ejecucion.setShowCompletedChecklistModal(true)}
          onLiberarReservaCreditos={handleLiberarReservaCreditos}
          liberandoReservaCreditos={liberandoReserva}
        />

        <ModalCreditosInsuficientes
          visible={modalCreditosVisible}
          onClose={() => setModalCreditosVisible(false)}
          onComprarCreditos={() => {
            const min =
              verificacionCreditosConfirm?.creditos_faltantes
              || verificacionCreditosConfirm?.creditos_necesarios
              || 1;
            setModalCreditosVisible(false);
            abrirTiendaCreditos(min);
          }}
          verificacion={verificacionCreditosConfirm}
          title="Créditos insuficientes"
          message={
            verificacionCreditosConfirm?.mensaje
            || 'No tienes créditos suficientes para confirmar. La asignación sigue pendiente: puedes comprar y reintentar, o rechazar.'
          }
        />

        <SolicitudDetalleChecklistCompletedModal
          miOferta={miOferta}
          visible={ejecucion.showCompletedChecklistModal}
          onClose={() => ejecucion.setShowCompletedChecklistModal(false)}
        />

        <RechazarSolicitudModal
          visible={mostrarModalRechazo}
          onClose={() => setMostrarModalRechazo(false)}
          onConfirm={handleRechazar}
          loading={rechazando}
        />

        <ProponerFechaCatalogoModal
          visible={mostrarModalFecha}
          fechaReferencia={fechaHoraPantalla.fecha || solicitud?.fecha_preferida}
          horaReferencia={fechaHoraPantalla.hora ?? solicitud?.hora_preferida}
          loading={proponiendoFecha}
          mecanicos={mecanicosPropuesta}
          miembroInicial={miembroInicialPropuesta}
          agendaContext={agendaPropuestaContext}
          onClose={() => setMostrarModalFecha(false)}
          onConfirm={handleProponerFechaCatalogo}
        />

        <Modal visible={!!fotoAmpliadaUrl} transparent animationType="fade" onRequestClose={() => setFotoAmpliadaUrl(null)}>
          <Pressable style={styles.fotoLightboxBackdrop} onPress={() => setFotoAmpliadaUrl(null)}>
            {fotoAmpliadaUrl ? (
              <Image source={{ uri: fotoAmpliadaUrl }} style={styles.fotoLightboxImage} resizeMode="contain" />
            ) : null}
          </Pressable>
        </Modal>
      </View>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.fixed.xl,
  },
  emptyText: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    color: I.ink,
    textAlign: 'center',
  },

  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.md,
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
  sectionHeaderTitleInline: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    letterSpacing: TS.h4.letterSpacing,
    color: I.ink,
    marginBottom: 0,
    flex: 1,
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
  clientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: I.surfaceStrong,
  },
  clientAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: withOpacity(I.primary, 0.12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientName: {
    flex: 1,
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    color: I.ink,
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
    marginBottom: SPACING.fixed.md,
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
  repuestosOfertaBlock: {
    marginTop: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.sm,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
    gap: 6,
  },
  repuestosOfertaLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.xs, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
  },
  repuestoOfertaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
  repuestoOfertaNombre: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.ink,
  },
  repuestoOfertaPrecio: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.primary,
    fontVariant: ['tabular-nums'],
  },
  serviciosBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.md,
  },
  servicioBadge: {
    backgroundColor: I.surfaceStrong,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    maxWidth: '100%',
  },
  servicioBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.ink,
  },
  serviciosEmptyText: {
    fontSize: TS.small.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.small.fontSize, TS.small.lineHeight),
    color: I.muted,
    fontStyle: 'italic',
    marginBottom: SPACING.fixed.md,
  },
  descripcionBlock: {
    marginTop: SPACING.fixed.xs,
    paddingTop: SPACING.fixed.md,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
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
  fotosClienteSection: {
    marginTop: SPACING.fixed.md,
    paddingTop: SPACING.fixed.md,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
  },
  fotosClienteHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
    marginBottom: SPACING.fixed.sm,
  },
  fotosClienteRow: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
    paddingVertical: 4,
  },
  fotosClienteThumbWrap: {
    borderRadius: BORDERS.radius.md,
    overflow: 'hidden',
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  fotosClienteThumb: {
    width: 96,
    height: 96,
  },
  fotoLightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.fixed.md,
  },
  fotoLightboxImage: {
    width: '100%' as const,
    height: '100%' as const,
    maxHeight: 640,
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
  tecnicoAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
  tecnicoCambio: {
    marginTop: 4,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    color: I.primary,
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
    marginTop: SPACING.fixed.xs,
  },

  ofertaHighlightCard: {
    backgroundColor: withOpacity(I.primary, 0.06),
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.md,
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.primary, 0.2),
  },
  ofertaStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  ofertaStatusTitle: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    color: I.ink,
  },
  estadoOfertaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  estadoOfertaPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
  },
  estadoOfertaPillText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
  },
  ofertaPrecio: {
    fontSize: TS.numberDisplay.fontSize,
    fontFamily: FF.monoMedium,
    lineHeight: lh(TS.numberDisplay.fontSize, TS.numberDisplay.lineHeight),
    color: I.primary,
    marginBottom: SPACING.fixed.md,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.sm,
    backgroundColor: I.primary,
    borderRadius: BORDERS.radius.pill,
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
    ...SHADOWS.editorial,
  },
  chatButtonText: {
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.button.fontSize, TS.button.lineHeight),
    color: I.onPrimary,
  },
  chatButtonTextWrap: {
    alignItems: 'flex-start',
    gap: 2,
  },
  cotizaIaHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cotizaIaHintText: {
    fontSize: TS.caption.fontSize,
    fontFamily: FF.sansMedium,
    lineHeight: lh(TS.caption.fontSize, TS.caption.lineHeight),
    color: I.accentYellow,
  },

  serviciosAdicionalesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.xs,
  },
  serviciosAdicionalesDescripcion: {
    fontSize: TS.small.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.small.fontSize, TS.small.lineHeight),
    color: I.body,
    marginBottom: SPACING.fixed.md,
  },
  ofertasSecundariasList: {
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.md,
  },
  ofertaSecundariaCard: {
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.surfaceSoft,
  },
  ofertaSecundariaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ofertaSecundariaInfo: {
    flex: 1,
    marginRight: SPACING.fixed.sm,
  },
  ofertaSecundariaPrecio: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.monoMedium,
    lineHeight: lh(TYPOGRAPHY.fontSize.lg, TS.numberDisplay.lineHeight),
    color: I.primary,
    marginBottom: 4,
  },
  ofertaSecundariaEstado: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
  },
  ofertaSecundariaBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: BORDERS.width.thin,
  },
  ofertaSecundariaMotivo: {
    fontSize: TS.small.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.small.fontSize, TS.small.lineHeight),
    color: I.body,
    marginTop: SPACING.fixed.sm,
  },
  agregarServicioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.fixed.sm + 2,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderStyle: 'dashed',
    borderColor: I.primary,
    backgroundColor: withOpacity(I.primary, 0.06),
    gap: SPACING.fixed.sm,
  },
  agregarServicioButtonText: {
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.button.fontSize, TS.button.lineHeight),
    color: I.primary,
  },

  catalogoContextHint: {
    fontSize: TS.caption.fontSize,
    fontFamily: FF.sansRegular,
    color: I.body,
    lineHeight: lh(TS.caption.fontSize, TS.caption.lineHeight),
    marginBottom: SPACING.fixed.sm,
  },
  fechaPropuestaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    marginTop: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.xs + 2,
    paddingHorizontal: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.md,
    backgroundColor: withOpacity(I.primary, 0.08),
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.primary, 0.22),
  },
  fechaPropuestaBannerText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.body,
  },
  fechaProponerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    marginTop: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.xs,
    alignSelf: 'flex-start',
  },
  fechaProponerLinkText: {
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.button.fontSize, TS.button.lineHeight),
    color: I.primary,
  },
  fixedActionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: I.canvas,
    paddingHorizontal: hx,
    paddingTop: SPACING.fixed.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    ...(Platform.OS === 'web'
      ? { zIndex: 40 }
      : shadowFooter),
  },
  fixedActionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.fixed.sm,
    maxWidth: Platform.OS === 'web' ? 480 : undefined,
    width: '100%',
    alignSelf: 'center',
  },
  footerBtnOutline: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.xs,
    paddingVertical: 10,
    paddingHorizontal: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.canvas,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  footerBtnOutlineText: {
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.button.fontSize, TS.button.lineHeight),
    color: I.semanticDown,
  },
  footerBtnPrimary: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.xs,
    paddingVertical: 10,
    paddingHorizontal: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.primary,
    borderWidth: BORDERS.width.thin,
    borderColor: I.primary,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  footerBtnPrimaryText: {
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.button.fontSize, TS.button.lineHeight),
    color: I.onPrimary,
  },
  footerBtnPressed: {
    opacity: 0.88,
  },
  footerBtnDisabled: {
    opacity: 0.55,
  },
});
