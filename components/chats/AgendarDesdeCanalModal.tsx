import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import { getChilePhoneError } from '@/components/forms/ChilePhoneField';
import ChileAddressField from '@/components/forms/ChileAddressField';
import {
  ClienteCanalPickerSection,
  type ClienteModo,
  type ContactoCanal,
} from '@/components/chats/ClienteCanalPickerSection';
import {
  VehiculoPatenteSection,
  type VehiculoPatenteState,
  VEHICULO_PATENTE_VACIO,
} from '@/components/chats/VehiculoPatenteSection';
import type { ChileFormattedAddress } from '@/utils/chileAddressSearch';
import {
  CatalogoFechaHoraPickers,
  formatDateApi,
  resolveInitialPickerValue,
  type CatalogoFechaHoraValue,
} from '@/components/solicitudes/CatalogoFechaHoraPickers';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { InstitutionalScreenTabs } from '@/app/design-system/components/InstitutionalScreenTabs';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { agendaProveedorService, type CitaAgendaPersonalCreatePayload } from '@/services/agendaProveedorService';
import {
  extraerNueveDigitosDesdeGuardado,
  normalizarTelefonoChileParaGuardar,
} from '@/utils/chilePhone';
import { esRangoHorarioValido, calcularDuracionMinutos } from '@/utils/citaPersonalHorario';
import { useAuth } from '@/context/AuthContext';
import type { ChannelSlug } from '@/utils/channelVisuals';
import { channelRespondLabel } from '@/components/chats/ChannelBadge';
import { showAlert, showAlertButtons } from '@/utils/platformAlert';
import { withWebLineHeight } from '@/utils/webTypography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { nombreContactoAgendable } from '@/utils/nombreContactoAgendable';
import { parseReferenciaDate } from '@/utils/fechaLocal';
import { serviciosProveedorAPI, type ServicioOferta } from '@/services/serviciosApi';
import { agruparOfertasPorCatalogo } from '@/utils/agruparOfertasPorCatalogo';
import { buildCatalogoOpcionesAgenda, filtrarMecanicosParaAgenda } from '@/utils/mecanicosAgenda';
import {
  obtenerDisponibilidadConDuracion,
  obtenerDiasDisponiblesAgenda,
  parseDisponibilidadRangoAgenda,
} from '@/services/disponibilidadProveedorService';
import { resolveProveedorAgendaIds, type ProveedorAgendaIds } from '@/utils/resolveProveedorAgenda';
import equipoTallerService, {
  type MiembroTaller,
  etiquetaModalidadMecanico,
} from '@/services/equipoTallerService';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import cotizacionCanalService from '@/services/cotizacionCanalService';
import { UpsellCuotaModal } from '@/components/suscripciones/UpsellCuotaModal';
import { obtenerMisOfertas } from '@/services/solicitudesService';
import { fetchChatInboxQuery } from '@/hooks/useChatInboxQuery';
import { buscarSolicitudActivaPorTelefono } from '@/utils/buscarSolicitudActivaPorTelefono';
import { openSolicitudDetalle } from '@/utils/navigateProveedorDetalle';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const SHEET_TITLE = withWebLineHeight(TYPOGRAPHY.styles.h3);
const SHEET_SUBTITLE = withWebLineHeight(TYPOGRAPHY.styles.caption);
const SPEC_LABEL = withWebLineHeight(TYPOGRAPHY.styles.caption);
const SPEC_VALUE = withWebLineHeight(TYPOGRAPHY.styles.body);

const TIPO_SERVICIO_TABS = [
  { key: 'taller' as const, label: 'En taller' },
  { key: 'domicilio' as const, label: 'A domicilio' },
];

const MODO_SERVICIO_TABS = [
  { key: 'catalogo' as const, label: 'Mi catálogo' },
  { key: 'manual' as const, label: 'Servicio libre' },
];

type ModoServicio = 'catalogo' | 'manual';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Omnicanal: prefill y subtítulo del canal */
  channel?: ChannelSlug;
  contactName?: string;
  contactPhone?: string | null;
  /** Agenda: fecha preseleccionada (YYYY-MM-DD) */
  initialFecha?: string;
  /** Subtítulo del sheet; si no se indica, se infiere del canal o la fecha */
  subtitle?: string;
  /** Conversación omnicanal para cotización IA */
  conversationId?: string;
  /** Pre-cargar cotización aceptada para agendar */
  cotizacionAceptadaId?: number;
};

function suggestTelefono(channel: ChannelSlug | undefined, phone: string | null | undefined): string {
  if (!phone?.trim()) return '';
  if (channel === 'whatsapp') {
    return extraerNueveDigitosDesdeGuardado(phone);
  }
  return '';
}

function subtitleDesdeFecha(fechaApi?: string): string | null {
  if (!fechaApi?.trim()) return null;
  const fecha = parseReferenciaDate(fechaApi);
  if (!fecha) return null;
  const label = fecha.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `Cita para ${label}`;
}

function limpiarVehiculo(): VehiculoPatenteState {
  return { ...VEHICULO_PATENTE_VACIO };
}

export function AgendarDesdeCanalModal({
  visible,
  onClose,
  channel,
  contactName = '',
  contactPhone = null,
  initialFecha,
  subtitle,
  conversationId,
  cotizacionAceptadaId,
}: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { puede, esSupervisor, estadoProveedor } = useAuth();
  const puedeAgendar = !esSupervisor || puede('agenda');
  const esMecanico = estadoProveedor?.tipo_proveedor === 'mecanico';

  const [clienteModo, setClienteModo] = useState<ClienteModo>('mensajes');
  const [contactoSeleccionado, setContactoSeleccionado] = useState<ContactoCanal | null>(null);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [vehiculo, setVehiculo] = useState<VehiculoPatenteState>(VEHICULO_PATENTE_VACIO);
  const [servicioManual, setServicioManual] = useState('');
  const [modoServicio, setModoServicio] = useState<ModoServicio>('catalogo');
  const [serviciosCatalogo, setServiciosCatalogo] = useState<ServicioOferta[]>([]);
  const [catalogoOpcionKey, setCatalogoOpcionKey] = useState<string | null>(null);
  const [loadingServicios, setLoadingServicios] = useState(false);
  const [proveedorAgenda, setProveedorAgenda] = useState<ProveedorAgendaIds | null>(null);
  const [fechasDisponibles, setFechasDisponibles] = useState<string[] | null>(null);
  const [cargandoFechas, setCargandoFechas] = useState(false);
  const [mensajeSinFechas, setMensajeSinFechas] = useState<string | undefined>();
  const [grillaHoraria, setGrillaHoraria] = useState<string[] | null>(null);
  const [cargandoHoras, setCargandoHoras] = useState(false);
  const [mensajeSinHoras, setMensajeSinHoras] = useState<string | undefined>();
  const [mecanicosAptos, setMecanicosAptos] = useState<MiembroTaller[]>([]);
  const [cargandoMecanicos, setCargandoMecanicos] = useState(false);
  const [miembroSeleccionado, setMiembroSeleccionado] = useState<number | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [tipoServicio, setTipoServicio] = useState<'taller' | 'domicilio'>('taller');
  const [direccion, setDireccion] = useState('');
  const [direccionValidada, setDireccionValidada] = useState<ChileFormattedAddress | null>(null);
  const [fechaHora, setFechaHora] = useState<CatalogoFechaHoraValue>(() => resolveInitialPickerValue());
  const [buscandoPatente, setBuscandoPatente] = useState(false);
  const [patenteHint, setPatenteHint] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [cotizacionOrigenId, setCotizacionOrigenId] = useState<number | null>(null);
  const [cotizacionOrigenLabel, setCotizacionOrigenLabel] = useState<string | null>(null);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [upsellCuota, setUpsellCuota] = useState<{ visible: boolean; mensaje: string }>({
    visible: false,
    mensaje: '',
  });

  const channelLabel = useMemo(
    () => (channel ? channelRespondLabel(channel) : null),
    [channel],
  );

  const sheetSubtitle = useMemo(() => {
    if (subtitle?.trim()) return subtitle.trim();
    if (channelLabel) return `Desde ${channelLabel}`;
    const desdeFecha = subtitleDesdeFecha(initialFecha);
    if (desdeFecha) return desdeFecha;
    return 'Agenda personal';
  }, [subtitle, channelLabel, initialFecha]);

  const serviciosCatalogoGrupos = useMemo(
    () => agruparOfertasPorCatalogo(serviciosCatalogo),
    [serviciosCatalogo],
  );

  const catalogoOpcionesAgenda = useMemo(
    () => buildCatalogoOpcionesAgenda(serviciosCatalogoGrupos),
    [serviciosCatalogoGrupos],
  );

  const catalogoOpcionSeleccionada = useMemo(
    () => catalogoOpcionesAgenda.find((o) => o.key === catalogoOpcionKey) ?? null,
    [catalogoOpcionesAgenda, catalogoOpcionKey],
  );

  const selectedOfertaId = useMemo(() => {
    if (modoServicio !== 'catalogo' || !catalogoOpcionSeleccionada) return undefined;
    return catalogoOpcionSeleccionada.ofertaId;
  }, [modoServicio, catalogoOpcionSeleccionada]);

  const modalidadApi = useMemo((): 'a_domicilio' | 'en_taller' => (
    tipoServicio === 'domicilio' ? 'a_domicilio' : 'en_taller'
  ), [tipoServicio]);

  useEffect(() => {
    if (!visible) return;
    const nombre = nombreContactoAgendable(contactName);
    const telefono = suggestTelefono(channel, contactPhone);
    setClienteNombre(nombre);
    setClienteTelefono(telefono);
    if (conversationId) {
      const id = parseInt(conversationId, 10);
      if (!Number.isNaN(id)) {
        setClienteModo('mensajes');
        setContactoSeleccionado({
          conversationId: id,
          nombre: nombre || 'Cliente',
          telefono: telefono || null,
          canal: (channel || 'whatsapp') as ChannelSlug,
        });
      } else {
        setClienteModo('mensajes');
        setContactoSeleccionado(null);
      }
    } else {
      setClienteModo('manual');
      setContactoSeleccionado(null);
    }
    setVehiculo(limpiarVehiculo());
    setServicioManual('');
    setModoServicio('catalogo');
    setCatalogoOpcionKey(null);
    setFechasDisponibles(null);
    setMensajeSinFechas(undefined);
    setGrillaHoraria(null);
    setMensajeSinHoras(undefined);
    setMecanicosAptos([]);
    setMiembroSeleccionado(null);
    setDescripcion('');
    setTipoServicio(esMecanico ? 'domicilio' : 'taller');
    setDireccion('');
    setDireccionValidada(null);
    setFechaHora(resolveInitialPickerValue(initialFecha));
    setPatenteHint(null);
    setErrorForm(null);
    setGuardando(false);
    setCotizacionOrigenId(null);
    setCotizacionOrigenLabel(null);
  }, [visible, contactName, contactPhone, channel, conversationId, initialFecha, esMecanico]);

  const conversationIdEfectivo = useMemo(() => {
    if (clienteModo === 'mensajes' && contactoSeleccionado) {
      return String(contactoSeleccionado.conversationId);
    }
    return conversationId;
  }, [clienteModo, contactoSeleccionado, conversationId]);

  const nombreClienteEfectivo = useMemo(() => {
    if (clienteModo === 'mensajes' && contactoSeleccionado) {
      return contactoSeleccionado.nombre;
    }
    return clienteNombre.trim();
  }, [clienteModo, contactoSeleccionado, clienteNombre]);

  const telefonoClienteEfectivo = useMemo(() => {
    if (clienteModo === 'mensajes' && contactoSeleccionado) {
      return contactoSeleccionado.telefono || '';
    }
    return clienteTelefono;
  }, [clienteModo, contactoSeleccionado, clienteTelefono]);

  useEffect(() => {
    if (!visible || !cotizacionAceptadaId) return;
    let mounted = true;
    void cotizacionCanalService.obtener(cotizacionAceptadaId).then((cot) => {
      if (!mounted || cot.estado !== 'aceptada') return;
      setCotizacionOrigenId(cot.id);
      setCotizacionOrigenLabel(cot.servicio_nombre || 'Cotización aceptada');
      setModoServicio('manual');
      setServicioManual(cot.servicio_nombre || '');
      setDescripcion(cot.descripcion_problema || '');
      setTipoServicio(cot.modalidad === 'domicilio' ? 'domicilio' : 'taller');
      setVehiculo({
        patente: cot.vehiculo_patente || '',
        marca: cot.vehiculo_marca || '',
        modelo: cot.vehiculo_modelo || '',
        anio: cot.vehiculo_anio ? String(cot.vehiculo_anio) : '',
        color: '',
        vin: cot.vehiculo_vin || '',
        cilindraje: cot.vehiculo_cilindraje || '',
        desdePatente: Boolean(cot.vehiculo_patente && cot.vehiculo_marca),
      });
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, [visible, cotizacionAceptadaId]);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    void resolveProveedorAgendaIds(estadoProveedor?.tipo_proveedor).then((ctx) => {
      if (mounted) setProveedorAgenda(ctx);
    });
    return () => {
      mounted = false;
    };
  }, [visible, estadoProveedor?.tipo_proveedor]);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    setLoadingServicios(true);
    serviciosProveedorAPI
      .obtenerMisServicios()
      .then((lista) => {
        if (mounted) {
          setServiciosCatalogo(lista.filter((s) => s.disponible));
        }
      })
      .catch(() => {
        if (mounted) setServiciosCatalogo([]);
      })
      .finally(() => {
        if (mounted) setLoadingServicios(false);
      });
    return () => {
      mounted = false;
    };
  }, [visible]);

  const ofertaAgendaId = useMemo(
    () => (modoServicio === 'catalogo' ? selectedOfertaId : undefined),
    [modoServicio, selectedOfertaId],
  );

  const agendaParamsListos = useMemo(() => {
    if (modoServicio === 'catalogo') return Boolean(selectedOfertaId);
    return servicioManual.trim().length > 0;
  }, [modoServicio, selectedOfertaId, servicioManual]);

  useEffect(() => {
    setGrillaHoraria([]);
    setFechasDisponibles(null);
    setMensajeSinHoras(undefined);
    setMensajeSinFechas(undefined);
    setMiembroSeleccionado(null);
    setFechaHora((prev) => ({ ...prev, hora: null, horaFin: null }));
  }, [selectedOfertaId, modalidadApi, modoServicio, catalogoOpcionKey, tipoServicio, servicioManual]);

  const categoriasServicioAgenda = useMemo(() => {
    if (modoServicio !== 'catalogo' || !catalogoOpcionSeleccionada) return [];
    return catalogoOpcionSeleccionada.categoriasIds;
  }, [modoServicio, catalogoOpcionSeleccionada]);

  const mecanicosCompatibles = useMemo(
    () =>
      filtrarMecanicosParaAgenda(mecanicosAptos, {
        tipoServicio,
        categoriasIds: categoriasServicioAgenda,
      }),
    [mecanicosAptos, tipoServicio, categoriasServicioAgenda],
  );

  useEffect(() => {
    if (miembroSeleccionado == null) return;
    const sigueCompatible = mecanicosCompatibles.some((m) => m.id === miembroSeleccionado);
    if (!sigueCompatible) setMiembroSeleccionado(null);
  }, [mecanicosCompatibles, miembroSeleccionado]);

  useEffect(() => {
    if (!visible || !proveedorAgenda || proveedorAgenda.tipoProveedor !== 'taller') {
      setMecanicosAptos([]);
      return;
    }

    let cancelled = false;
    setCargandoMecanicos(true);

    equipoTallerService
      .listar({ rol: 'mecanico', activo: true })
      .then((equipo) => {
        if (cancelled) return;
        setMecanicosAptos(equipo);
        setMiembroSeleccionado((prev) => {
          if (prev == null) return null;
          return equipo.some((m) => m.id === prev) ? prev : null;
        });
      })
      .catch(() => {
        if (cancelled) return;
        setMecanicosAptos([]);
      })
      .finally(() => {
        if (!cancelled) setCargandoMecanicos(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, proveedorAgenda]);

  useEffect(() => {
    setGrillaHoraria([]);
    setFechaHora((prev) => ({ ...prev, hora: null, horaFin: null }));
  }, [miembroSeleccionado]);

  useEffect(() => {
    if (esMecanico) setTipoServicio('domicilio');
  }, [esMecanico]);

  useEffect(() => {
    if (!visible || !agendaParamsListos) {
      setFechasDisponibles(null);
      setCargandoFechas(false);
      return;
    }

    let cancelled = false;
    setCargandoFechas(true);
    setMensajeSinFechas(undefined);

    obtenerDiasDisponiblesAgenda({
      ofertaServicioId: ofertaAgendaId,
      modalidad: modalidadApi,
      miembroTallerId: miembroSeleccionado ?? undefined,
      dias: 21,
      contexto: 'agenda_personal',
    })
      .then((data) => {
        if (cancelled) return;
        const fechas = [...(data.fechas_disponibles ?? [])].sort();
        setFechasDisponibles(fechas);
        setMensajeSinFechas(
          fechas.length > 0
            ? undefined
            : miembroSeleccionado
              ? 'Este técnico no tiene fechas disponibles para este servicio. Revisa su agenda en Horarios.'
              : 'No hay fechas disponibles según la agenda configurada del taller.',
        );
        setFechaHora((prev) => {
          const key = formatDateApi(prev.fecha);
          if (fechas.includes(key)) return prev;
          if (fechas.length === 0) {
            return { ...prev, hora: null, horaFin: null };
          }
          return {
            ...prev,
            fecha: parseReferenciaDate(fechas[0]),
            hora: null,
            horaFin: null,
          };
        });
      })
      .catch(() => {
        if (cancelled) return;
        setFechasDisponibles([]);
        setMensajeSinFechas('No se pudieron cargar las fechas disponibles.');
      })
      .finally(() => {
        if (!cancelled) setCargandoFechas(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, agendaParamsListos, modalidadApi, ofertaAgendaId, miembroSeleccionado]);

  useEffect(() => {
    if (!visible || !agendaParamsListos) {
      setGrillaHoraria(null);
      setCargandoHoras(false);
      return;
    }

    if (cargandoFechas || fechasDisponibles === null) {
      setGrillaHoraria(null);
      setCargandoHoras(false);
      return;
    }

    if (fechasDisponibles.length === 0) {
      setGrillaHoraria([]);
      setMensajeSinHoras('No hay horarios disponibles para esta fecha.');
      setCargandoHoras(false);
      return;
    }

    const fechaKey = formatDateApi(fechaHora.fecha);
    if (!fechasDisponibles.includes(fechaKey)) {
      setGrillaHoraria([]);
      setMensajeSinHoras('Selecciona una fecha disponible.');
      setCargandoHoras(false);
      return;
    }

    let cancelled = false;
    const fecha = formatDateApi(fechaHora.fecha);

    setGrillaHoraria(null);
    setMensajeSinHoras(undefined);
    setCargandoHoras(true);
    obtenerDisponibilidadConDuracion({
      fecha,
      ofertaServicioId: ofertaAgendaId,
      modalidad: modalidadApi,
      miembroTallerId: miembroSeleccionado ?? undefined,
      contexto: 'agenda_personal',
    })
      .then((data) => {
        if (cancelled) return;
        const { grillaHoraria: grilla, mensajeSinHoras: msg } = parseDisponibilidadRangoAgenda(data);
        setGrillaHoraria(grilla);
        setMensajeSinHoras(msg);
        setFechaHora((prev) => {
          const horaValida = prev.hora && grilla.includes(prev.hora) ? prev.hora : null;
          const finValido =
            horaValida && prev.horaFin && grilla.includes(prev.horaFin) ? prev.horaFin : null;
          if (horaValida) {
            return { ...prev, hora: horaValida, horaFin: finValido };
          }
          return { ...prev, hora: null, horaFin: null };
        });
      })
      .catch(() => {
        if (cancelled) return;
        setGrillaHoraria([]);
        setMensajeSinHoras('No se pudieron cargar los horarios.');
      })
      .finally(() => {
        if (!cancelled) setCargandoHoras(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    visible,
    agendaParamsListos,
    fechaHora.fecha,
    modalidadApi,
    ofertaAgendaId,
    fechasDisponibles,
    cargandoFechas,
    miembroSeleccionado,
  ]);

  const validarFormulario = useCallback((): string | null => {
    if (!puedeAgendar) {
      return 'No tienes permiso para agendar citas.';
    }
    if (clienteModo === 'mensajes' && !contactoSeleccionado) {
      return 'Elige un cliente de tus mensajes o cambia a “Cliente nuevo”.';
    }
    if (!nombreClienteEfectivo) return 'Ingresa el nombre del cliente.';
    if (clienteModo === 'manual') {
      const telError = getChilePhoneError(extraerNueveDigitosDesdeGuardado(clienteTelefono), false);
      if (telError) return telError;
    }
    if (!vehiculo.marca.trim()) return 'Ingresa la marca del vehículo.';
    if (!vehiculo.modelo.trim()) return 'Ingresa el modelo del vehículo.';
    if (vehiculo.anio.trim()) {
      const anio = parseInt(vehiculo.anio.trim(), 10);
      const maxAnio = new Date().getFullYear() + 1;
      if (Number.isNaN(anio) || anio < 1950 || anio > maxAnio) {
        return `Ingresa un año válido (1950–${maxAnio}).`;
      }
    }
    if (!servicioManual.trim() && modoServicio === 'manual') return 'Ingresa el nombre del servicio.';
    if (modoServicio === 'catalogo' && !catalogoOpcionKey) {
      return 'Selecciona un servicio de tu catálogo.';
    }
    if (tipoServicio === 'domicilio') {
      if (!direccion.trim()) return 'Ingresa la dirección para servicio a domicilio.';
      if (!direccionValidada) return 'Selecciona una dirección válida de la lista de sugerencias.';
    }
    if (!fechaHora.hora || !fechaHora.horaFin) {
      return 'Selecciona hora de inicio y término para la cita.';
    }
    if (!esRangoHorarioValido(fechaHora.hora, fechaHora.horaFin)) {
      return 'La hora de término debe ser al menos 15 minutos después del inicio.';
    }
    return null;
  }, [
    puedeAgendar,
    clienteModo,
    contactoSeleccionado,
    nombreClienteEfectivo,
    clienteTelefono,
    vehiculo,
    modoServicio,
    catalogoOpcionKey,
    servicioManual,
    tipoServicio,
    direccion,
    direccionValidada,
    fechaHora,
  ]);

  const construirPayload = useCallback((): CitaAgendaPersonalCreatePayload => {
    const detalle: CitaAgendaPersonalCreatePayload['detalle'] = {
      cliente_nombre: nombreClienteEfectivo,
      cliente_telefono: telefonoClienteEfectivo
        ? normalizarTelefonoChileParaGuardar(telefonoClienteEfectivo)
        : '',
      vehiculo_marca: vehiculo.marca.trim(),
      vehiculo_modelo: vehiculo.modelo.trim(),
    };

    if (modoServicio === 'catalogo' && catalogoOpcionSeleccionada) {
      detalle.oferta_servicio_id = catalogoOpcionSeleccionada.ofertaId;
      const grupoNombre = serviciosCatalogoGrupos.find((g) =>
        catalogoOpcionSeleccionada.key.startsWith(`${g.key}::`) || g.key === catalogoOpcionSeleccionada.key,
      )?.nombre;
      detalle.servicio_nombre = grupoNombre ?? catalogoOpcionSeleccionada.label;
    } else {
      detalle.servicio_nombre = servicioManual.trim();
    }

    if (vehiculo.patente.trim()) {
      detalle.vehiculo_patente = vehiculo.patente.trim().toUpperCase();
    }
    if (vehiculo.anio.trim()) {
      const anio = parseInt(vehiculo.anio.trim(), 10);
      if (!Number.isNaN(anio)) detalle.vehiculo_anio = anio;
    }
    if (vehiculo.color.trim()) detalle.vehiculo_color = vehiculo.color.trim();
    if (vehiculo.cilindraje.trim()) detalle.vehiculo_cilindraje = vehiculo.cilindraje.trim();
    if (vehiculo.vin.trim()) detalle.vehiculo_vin = vehiculo.vin.trim().toUpperCase();
    if (tipoServicio === 'domicilio') {
      detalle.direccion = (direccionValidada?.line ?? direccion).trim();
    }
    if (descripcion.trim()) detalle.descripcion = descripcion.trim();

    return {
      fecha_servicio: formatDateApi(fechaHora.fecha),
      hora_servicio: `${fechaHora.hora}:00`,
      duracion_minutos: calcularDuracionMinutos(fechaHora.hora!, fechaHora.horaFin!),
      tipo_servicio: tipoServicio,
      miembro_taller: miembroSeleccionado,
      conversation_id: conversationIdEfectivo
        ? parseInt(conversationIdEfectivo, 10)
        : undefined,
      cotizacion_canal_origen_id: cotizacionOrigenId ?? undefined,
      detalle,
    };
  }, [
    nombreClienteEfectivo,
    telefonoClienteEfectivo,
    vehiculo,
    modoServicio,
    catalogoOpcionSeleccionada,
    serviciosCatalogoGrupos,
    servicioManual,
    descripcion,
    tipoServicio,
    direccion,
    direccionValidada,
    fechaHora,
    miembroSeleccionado,
    conversationIdEfectivo,
    cotizacionOrigenId,
  ]);

  const ejecutarCreacionCita = useCallback(
    async (payload: CitaAgendaPersonalCreatePayload) => {
      setGuardando(true);
      try {
        const validacion = await agendaProveedorService.validarSlot(payload);
        if (!validacion.success || !validacion.data?.valido) {
          setErrorForm(
            validacion.data?.error || validacion.message || 'El horario seleccionado no está disponible.',
          );
          return;
        }

        const res = await agendaProveedorService.crearCita(payload);
        if (!res.success || !res.data) {
          setErrorForm(res.message || 'No se pudo crear la cita.');
          return;
        }

        await queryClient.invalidateQueries({ queryKey: ['agenda-calendario'] });
        await queryClient.invalidateQueries({ queryKey: ['citas-agenda-proveedor'] });
        await queryClient.invalidateQueries({ queryKey: ['citas-activas-proveedor'] });

        const mecanico = res.data.mecanico_nombre?.trim();
        const mensaje = mecanico
          ? `Cita creada y asignada a ${mecanico}.`
          : 'La cita fue agendada correctamente.';
        showAlert('Cita agendada', mensaje);
        onClose();
      } catch {
        setErrorForm('Ocurrió un error al agendar. Inténtalo de nuevo.');
      } finally {
        setGuardando(false);
      }
    },
    [queryClient, onClose],
  );

  const handleAgendar = useCallback(async () => {
    setErrorForm(null);
    const validationError = validarFormulario();
    if (validationError) {
      setErrorForm(validationError);
      return;
    }

    const payload = construirPayload();

    try {
      const [ofertasRes, inbox] = await Promise.all([
        obtenerMisOfertas(),
        fetchChatInboxQuery(),
      ]);
      const match = buscarSolicitudActivaPorTelefono(
        payload.detalle.cliente_telefono,
        ofertasRes.success && ofertasRes.data ? ofertasRes.data : [],
        inbox,
      );

      if (match) {
        showAlertButtons(
          'Solicitud Mecanimovil abierta',
          'Este cliente tiene una solicitud abierta en Mecanimovil. ¿Continuar como cita personal o ir a esa solicitud?',
          [
            {
              text: 'Ir a solicitud',
              onPress: () => {
                onClose();
                openSolicitudDetalle(router, queryClient, match.solicitudId);
              },
            },
            {
              text: 'Cita personal',
              onPress: () => {
                void ejecutarCreacionCita(payload);
              },
            },
            { text: 'Cancelar', style: 'cancel' },
          ],
        );
        return;
      }
    } catch {
      // Si falla la búsqueda, continuar con cita personal.
    }

    await ejecutarCreacionCita(payload);
  }, [validarFormulario, construirPayload, ejecutarCreacionCita, onClose, queryClient]);

  return (
    <>
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Agendar cita</Text>
              <Text style={styles.subtitle}>{sheetSubtitle}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <X size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {cotizacionOrigenLabel ? (
              <View style={styles.cotizacionAceptadaBanner}>
                <Text style={styles.cotizacionAceptadaText}>
                  Cotización aceptada — {cotizacionOrigenLabel}. Confirma horario para agendar.
                </Text>
              </View>
            ) : null}

            <InstitutionalSectionHeader title="Cliente" />
            <View style={styles.section}>
              <ClienteCanalPickerSection
                enabled={visible}
                clienteModo={clienteModo}
                onClienteModoChange={setClienteModo}
                contactoSeleccionado={contactoSeleccionado}
                onSeleccionarContacto={(c) => {
                  setContactoSeleccionado(c);
                  setClienteNombre(c.nombre);
                  setClienteTelefono(c.telefono || '');
                }}
                onLimpiarContacto={() => setContactoSeleccionado(null)}
                clienteNombre={clienteNombre}
                onClienteNombreChange={setClienteNombre}
                clienteTelefono={clienteTelefono}
                onClienteTelefonoChange={setClienteTelefono}
                telefonoHint="Opcional. Ingresa 9 dígitos comenzando en 9."
                manualFooterHint="Agenda sin chat vinculado; el cliente queda solo en tu agenda personal."
                contextoChat={Boolean(conversationId)}
              />
            </View>

            <InstitutionalSectionHeader title="Vehículo" />
            <View style={styles.section}>
              <VehiculoPatenteSection
                value={vehiculo}
                onChange={setVehiculo}
                buscandoPatente={buscandoPatente}
                onBuscandoPatenteChange={setBuscandoPatente}
                patenteHint={patenteHint}
                onPatenteHintChange={setPatenteHint}
                onCuotaError={(mensaje) => setUpsellCuota({ visible: true, mensaje })}
                resumenVariant="grid"
              />
            </View>

            <InstitutionalSectionHeader title="Servicio" />
            <View style={styles.section}>
              {!esMecanico ? (
                <View style={styles.choiceBlock}>
                  <Text style={styles.choiceLabel}>1. Lugar del servicio</Text>
                  <Text style={styles.choiceHint}>¿Dónde atiendes al cliente?</Text>
                  <InstitutionalScreenTabs
                    tabs={TIPO_SERVICIO_TABS}
                    activeKey={tipoServicio}
                    onChange={setTipoServicio}
                  />
                  {tipoServicio === 'domicilio' ? (
                    <ChileAddressField
                      label="Dirección del cliente *"
                      hint="Busca una dirección real en Chile y elige un resultado."
                      value={direccion}
                      validated={direccionValidada}
                      onChangeText={setDireccion}
                      onValidatedChange={setDireccionValidada}
                      placeholder="Ej: Av. Providencia 1200, Providencia"
                    />
                  ) : null}
                </View>
              ) : tipoServicio === 'domicilio' ? (
                <View style={styles.choiceBlock}>
                  <Text style={styles.choiceLabel}>Dirección del cliente</Text>
                  <ChileAddressField
                    label="Dirección *"
                    hint="Busca una dirección real en Chile y elige un resultado."
                    value={direccion}
                    validated={direccionValidada}
                    onChangeText={setDireccion}
                    onValidatedChange={setDireccionValidada}
                    placeholder="Ej: Av. Providencia 1200, Providencia"
                  />
                </View>
              ) : null}

              <View style={[styles.choiceBlock, styles.choiceBlockSeparated]}>
                <Text style={styles.choiceLabel}>
                  {esMecanico ? '1. Servicio a agendar' : '2. Servicio a agendar'}
                </Text>
                <Text style={styles.choiceHint}>
                  Elige uno de tu catálogo o describe un servicio libre si no está en la lista.
                </Text>
                <InstitutionalScreenTabs
                  tabs={MODO_SERVICIO_TABS}
                  activeKey={modoServicio}
                  onChange={setModoServicio}
                />

                {modoServicio === 'catalogo' ? (
                  loadingServicios ? (
                    <ActivityIndicator color={I.primary} style={styles.loader} />
                  ) : serviciosCatalogoGrupos.length === 0 ? (
                    <Text style={styles.helperText}>
                      No tienes servicios en catálogo. Usa «Servicio libre» o créalos en Mis servicios.
                    </Text>
                  ) : (
                    <View style={styles.catalogoList}>
                      {catalogoOpcionesAgenda.map((opcion) => {
                        const selected = catalogoOpcionKey === opcion.key;
                        return (
                          <TouchableOpacity
                            key={opcion.key}
                            style={[styles.catalogoItem, selected && styles.catalogoItemSelected]}
                            onPress={() =>
                              setCatalogoOpcionKey((prev) => (prev === opcion.key ? null : opcion.key))
                            }
                            activeOpacity={0.85}
                          >
                            <Text style={[styles.catalogoItemTitle, selected && styles.catalogoItemTitleOn]}>
                              {opcion.label}
                            </Text>
                            {selected ? (
                              <InstitutionalIcon
                                name="check-circle"
                                size={18}
                                color={COLORS.selection.text}
                                strokeWidth={ICON_STROKE_WIDTH}
                              />
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )
                ) : (
                  <InstitutionalField
                    label="Nombre del servicio *"
                    value={servicioManual}
                    onChangeText={setServicioManual}
                    placeholder="Ej. Cambio de aceite"
                  />
                )}
              </View>

              <InstitutionalField
                label="Descripción"
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Detalle adicional (opcional)"
                multiline
                textInputProps={{ scrollEnabled: true }}
              />
            </View>

            {proveedorAgenda?.tipoProveedor === 'taller' ? (
              <>
                <InstitutionalSectionHeader title="Mecánico asignado" />
                <View style={styles.section}>
                  {cargandoMecanicos ? (
                    <ActivityIndicator color={I.primary} style={styles.loader} />
                  ) : mecanicosCompatibles.length === 0 ? (
                    <Text style={styles.helperText}>
                      {mecanicosAptos.length === 0
                        ? 'No hay mecánicos activos en tu taller. Agrégalos en Mis mecánicos.'
                        : modoServicio === 'catalogo' && !catalogoOpcionKey
                          ? 'Selecciona un servicio del catálogo para ver mecánicos compatibles por especialidad y modalidad.'
                          : modoServicio === 'catalogo'
                            ? 'Ningún mecánico tiene la especialidad y modalidad requeridas para este servicio. Revisa Mis mecánicos o elige otro servicio.'
                            : `No hay mecánicos con modalidad compatible para servicio ${
                                tipoServicio === 'domicilio' ? 'a domicilio' : 'en taller'
                              }. Revisa la modalidad en Mis mecánicos.`}
                    </Text>
                  ) : (
                    <>
                      <Text style={styles.helperText}>
                        Solo se listan técnicos con especialidad y modalidad compatibles con el servicio
                        {modoServicio === 'catalogo' && catalogoOpcionSeleccionada
                          ? ` «${catalogoOpcionSeleccionada.label}»`
                          : ''}
                        . Elige uno para ver su agenda o deja Automático.
                      </Text>
                      <View style={styles.catalogoList}>
                        <TouchableOpacity
                          style={[
                            styles.catalogoItem,
                            miembroSeleccionado === null && styles.catalogoItemSelected,
                          ]}
                          onPress={() => setMiembroSeleccionado(null)}
                          activeOpacity={0.85}
                        >
                          <Text
                            style={[
                              styles.catalogoItemTitle,
                              miembroSeleccionado === null && styles.catalogoItemTitleOn,
                            ]}
                          >
                            Automático
                          </Text>
                          {miembroSeleccionado === null ? (
                            <InstitutionalIcon
                              name="check-circle"
                              size={18}
                              color={COLORS.selection.text}
                              strokeWidth={ICON_STROKE_WIDTH}
                            />
                          ) : null}
                        </TouchableOpacity>
                        {mecanicosCompatibles.map((m) => {
                          const selected = miembroSeleccionado === m.id;
                          const modalidadLabel = etiquetaModalidadMecanico(m);
                          return (
                            <TouchableOpacity
                              key={m.id}
                              style={[styles.catalogoItem, selected && styles.catalogoItemSelected]}
                              onPress={() => setMiembroSeleccionado(m.id)}
                              activeOpacity={0.85}
                            >
                              <View style={styles.catalogoItemContent}>
                                <Text
                                  style={[
                                    styles.catalogoItemTitle,
                                    selected && styles.catalogoItemTitleOn,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {m.nombre}
                                </Text>
                                {modalidadLabel ? (
                                  <View style={[styles.modalidadBadge, selected && styles.modalidadBadgeOn]}>
                                    <Text
                                      style={[
                                        styles.modalidadBadgeText,
                                        selected && styles.modalidadBadgeTextOn,
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {modalidadLabel}
                                    </Text>
                                  </View>
                                ) : null}
                                {m.especialidades_detalle.map((esp) => (
                                  <View
                                    key={esp.id}
                                    style={[styles.especialidadBadge, selected && styles.especialidadBadgeOn]}
                                  >
                                    <Text
                                      style={[
                                        styles.especialidadBadgeText,
                                        selected && styles.especialidadBadgeTextOn,
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {esp.nombre}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                              {selected ? (
                                <InstitutionalIcon
                                  name="check-circle"
                                  size={18}
                                  color={COLORS.selection.text}
                                  strokeWidth={ICON_STROKE_WIDTH}
                                />
                              ) : null}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}
                </View>
              </>
            ) : null}

            <InstitutionalSectionHeader title="Fecha y hora" />
            <View style={styles.section}>
              <CatalogoFechaHoraPickers
                value={fechaHora}
                onChange={setFechaHora}
                modo="rango"
                fechasDisponibles={agendaParamsListos ? fechasDisponibles : null}
                cargandoFechas={agendaParamsListos && cargandoFechas}
                mensajeSinFechas={
                  agendaParamsListos
                    ? mensajeSinFechas
                    : 'Selecciona modalidad (En taller / A domicilio) y un servicio para ver fechas disponibles.'
                }
                grillaHoraria={agendaParamsListos ? grillaHoraria : null}
                cargandoHoras={agendaParamsListos && cargandoHoras}
                mensajeSinHoras={mensajeSinHoras}
              />
              {(!fechaHora.hora || !fechaHora.horaFin) ? (
                <Text style={styles.helperTextWarn}>Selecciona hora de inicio y término para confirmar la cita.</Text>
              ) : null}
            </View>

            {errorForm ? <Text style={styles.errorBanner}>{errorForm}</Text> : null}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
            <InstitutionalButton
              label="Cancelar"
              variant="outline"
              size="default"
              onPress={onClose}
              disabled={guardando}
              style={styles.footerBtnSecondary}
            />
            <InstitutionalButton
              label="Agendar cita"
              variant="primary"
              size="default"
              onPress={handleAgendar}
              disabled={guardando}
              loading={guardando}
              style={styles.footerBtnPrimary}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>

    <UpsellCuotaModal
      visible={upsellCuota.visible}
      mensaje={upsellCuota.mensaje}
      onClose={() => setUpsellCuota({ visible: false, mensaje: '' })}
    />
    </>
  );
}

const styles = StyleSheet.create({
  /** Modal a pantalla completa — Airbnb Hosts (hub form, no bottom sheet). */
  screen: {
    flex: 1,
    backgroundColor: COLORS.background.default,
    ...(Platform.OS === 'web' ? { minHeight: '100vh' as unknown as number } : null),
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    backgroundColor: COLORS.background.paper,
    gap: SPACING.sm,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.xs,
  },
  title: {
    ...SHEET_TITLE,
    color: I.ink,
    fontWeight: '600',
  },
  subtitle: {
    ...SHEET_SUBTITLE,
    color: I.muted,
  },
  closeBtn: {
    width: 44,
    height: 44,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceStrong,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  cotizacionAceptadaBanner: {
    backgroundColor: COLORS.selection.background,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.selection.border,
  },
  cotizacionAceptadaText: {
    ...SHEET_SUBTITLE,
    color: COLORS.selection.text,
    fontFamily: FF.sansMedium,
  },
  section: {
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  vehiculoResumen: {
    gap: SPACING.sm,
  },
  vehiculoManual: {
    gap: SPACING.sm,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  fieldHalf: {
    flex: 1,
    minWidth: 0,
  },
  vehiculoGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  vehiculoGridItem: {
    flex: 1,
    minWidth: 0,
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.sm + 2,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    gap: SPACING.xs,
  },
  vehiculoGridItemLabel: {
    ...SPEC_LABEL,
    color: I.muted,
    fontFamily: FF.sansMedium,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
  },
  vehiculoGridItemValue: {
    ...SPEC_VALUE,
    color: I.ink,
    fontFamily: FF.sansSemiBold,
  },
  patenteLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  patenteHint: {
    ...SPEC_LABEL,
    color: I.muted,
    marginTop: SPACING.xs,
  },
  catalogoList: {
    gap: SPACING.xs,
  },
  catalogoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: COLORS.background.paper,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  catalogoItemSelected: {
    backgroundColor: COLORS.selection.background,
    borderColor: COLORS.selection.border,
  },
  catalogoItemDisabled: {
    opacity: 0.45,
  },
  catalogoItemTitle: {
    flexShrink: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansMedium,
    color: I.ink,
  },
  catalogoItemTitleOn: {
    color: COLORS.selection.text,
    fontFamily: FF.sansSemiBold,
  },
  catalogoItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    paddingRight: SPACING.xs,
  },
  modalidadBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
  },
  modalidadBadgeOn: {
    backgroundColor: COLORS.selection.backgroundStrong,
  },
  modalidadBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.muted,
  },
  modalidadBadgeTextOn: {
    color: COLORS.selection.text,
  },
  especialidadBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceSoft,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  especialidadBadgeOn: {
    backgroundColor: COLORS.selection.backgroundStrong,
    borderColor: COLORS.selection.border,
  },
  especialidadBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.body,
  },
  especialidadBadgeTextOn: {
    color: COLORS.selection.text,
  },
  loader: {
    paddingVertical: SPACING.md,
  },
  choiceBlock: {
    gap: SPACING.fixed.sm,
  },
  choiceBlockSeparated: {
    marginTop: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  choiceLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  choiceHint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansRegular,
    color: I.muted,
    marginTop: -SPACING.fixed.xxs,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.xs * 1.4),
  },
  helperText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.sm * 1.45),
  },
  helperTextWarn: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.accentYellow,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.sm * 1.45),
  },
  errorBanner: {
    ...TYPOGRAPHY.styles.caption,
    color: I.semanticDown,
    backgroundColor: I.surfaceSoft,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.md,
    marginTop: SPACING.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    backgroundColor: COLORS.background.paper,
  },
  footerBtnSecondary: {
    flex: 1,
    minWidth: 0,
  },
  footerBtnPrimary: {
    flex: 2,
    minWidth: 0,
  },
});
