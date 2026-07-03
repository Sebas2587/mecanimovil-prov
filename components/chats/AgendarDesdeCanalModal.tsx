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
import { router } from 'expo-router';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import { ChilePhoneField, getChilePhoneError } from '@/components/forms/ChilePhoneField';
import ChileAddressField from '@/components/forms/ChileAddressField';
import type { ChileFormattedAddress } from '@/utils/chileAddressSearch';
import {
  CatalogoFechaHoraPickers,
  formatDateApi,
  resolveInitialPickerValue,
  type CatalogoFechaHoraValue,
} from '@/components/solicitudes/CatalogoFechaHoraPickers';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { InstitutionalScreenTabs } from '@/app/design-system/components/InstitutionalScreenTabs';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  agendaProveedorService,
  type CitaAgendaPersonalCreatePayload,
} from '@/services/agendaProveedorService';
import { consultarPatente } from '@/services/vehiculoService';
import {
  extraerNueveDigitosDesdeGuardado,
  normalizarTelefonoChileParaGuardar,
} from '@/utils/chilePhone';
import { esRangoHorarioValido, calcularDuracionMinutos } from '@/utils/citaPersonalHorario';
import { useAuth } from '@/context/AuthContext';
import type { ChannelSlug } from '@/utils/channelVisuals';
import { channelRespondLabel } from '@/components/chats/ChannelBadge';
import { showAlert } from '@/utils/platformAlert';
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
} from '@/services/disponibilidadProveedorService';
import { resolveProveedorAgendaIds, type ProveedorAgendaIds } from '@/utils/resolveProveedorAgenda';
import equipoTallerService, {
  type MiembroTaller,
  etiquetaModalidadMecanico,
} from '@/services/equipoTallerService';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { CotizacionIaEditor } from '@/components/chats/CotizacionIaEditor';
import cotizacionCanalService, {
  type CotizacionCanal,
  type CotizacionPlantilla,
} from '@/services/cotizacionCanalService';
import { etiquetaVehiculoActual } from '@/utils/plantillasCotizacionVehiculo';

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

type ModoServicio = 'catalogo' | 'manual';

function SegmentButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.segmentBtn, selected && styles.segmentBtnSelected]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.segmentBtnText, selected && styles.segmentBtnTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

function VehiculoSpecItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.vehiculoGridItem}>
      <Text style={styles.vehiculoGridItemLabel}>{label}</Text>
      <Text style={styles.vehiculoGridItemValue} numberOfLines={2}>
        {valorSpec(value)}
      </Text>
    </View>
  );
}

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
  /** Motivo de desconexión del canal (WhatsApp/Messenger/IG) */
  channelDisconnectedReason?: string | null;
  /** Tras enviar cotización al chat (refrescar mensajes) */
  onCotizacionEnviada?: () => void;
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

function limpiarVehiculo(): {
  marca: string;
  modelo: string;
  anio: string;
  color: string;
  vin: string;
  cilindraje: string;
} {
  return {
    marca: '',
    modelo: '',
    anio: '',
    color: '',
    vin: '',
    cilindraje: '',
  };
}

function valorSpec(text: string): string {
  return text.trim() || 'N/A';
}

function extractApiError(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: Record<string, unknown> } }).response?.data;
    if (data) {
      const partes: string[] = [];
      for (const value of Object.values(data)) {
        if (Array.isArray(value)) {
          partes.push(value.map(String).join(', '));
        } else if (typeof value === 'string' && value.trim()) {
          partes.push(value.trim());
        }
      }
      if (partes.length) return partes.join(' ');
    }
  }
  return fallback;
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
  channelDisconnectedReason = null,
  onCotizacionEnviada,
}: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { puede, esSupervisor, estadoProveedor } = useAuth();
  const puedeAgendar = !esSupervisor || puede('agenda');
  const esMecanico = estadoProveedor?.tipo_proveedor === 'mecanico';

  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [vehiculoMarca, setVehiculoMarca] = useState('');
  const [vehiculoModelo, setVehiculoModelo] = useState('');
  const [vehiculoPatente, setVehiculoPatente] = useState('');
  const [vehiculoAnio, setVehiculoAnio] = useState('');
  const [vehiculoColor, setVehiculoColor] = useState('');
  const [vehiculoVin, setVehiculoVin] = useState('');
  const [vehiculoCilindraje, setVehiculoCilindraje] = useState('');
  const [vehiculoDesdePatente, setVehiculoDesdePatente] = useState(false);
  const [servicioManual, setServicioManual] = useState('');
  const [modoServicio, setModoServicio] = useState<ModoServicio>('catalogo');
  const [serviciosCatalogo, setServiciosCatalogo] = useState<ServicioOferta[]>([]);
  const [catalogoOpcionKey, setCatalogoOpcionKey] = useState<string | null>(null);
  const [loadingServicios, setLoadingServicios] = useState(false);
  const [proveedorAgenda, setProveedorAgenda] = useState<ProveedorAgendaIds | null>(null);
  const [fechasDisponibles, setFechasDisponibles] = useState<string[] | null>(null);
  const [cargandoFechas, setCargandoFechas] = useState(false);
  const [mensajeSinFechas, setMensajeSinFechas] = useState<string | undefined>();
  const [horasDisponibles, setHorasDisponibles] = useState<string[] | null>(null);
  const [cargandoHoras, setCargandoHoras] = useState(false);
  const [mensajeSinHoras, setMensajeSinHoras] = useState<string | undefined>();
  const [mecanicosAptos, setMecanicosAptos] = useState<MiembroTaller[]>([]);
  const [cargandoMecanicos, setCargandoMecanicos] = useState(false);
  const [miembroSeleccionado, setMiembroSeleccionado] = useState<number | null>(null);
  const [slotsFinPorHora, setSlotsFinPorHora] = useState<Record<string, string>>({});
  const [descripcion, setDescripcion] = useState('');
  const [tipoServicio, setTipoServicio] = useState<'taller' | 'domicilio'>('taller');
  const [direccion, setDireccion] = useState('');
  const [direccionValidada, setDireccionValidada] = useState<ChileFormattedAddress | null>(null);
  const [fechaHora, setFechaHora] = useState<CatalogoFechaHoraValue>(() => resolveInitialPickerValue());
  const [buscandoPatente, setBuscandoPatente] = useState(false);
  const [patenteHint, setPatenteHint] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [cotizacion, setCotizacion] = useState<CotizacionCanal | null>(null);
  const [generandoIa, setGenerandoIa] = useState(false);
  const [enviandoCotizacion, setEnviandoCotizacion] = useState(false);
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false);
  const [errorIa, setErrorIa] = useState<string | null>(null);
  const [plantillas, setPlantillas] = useState<CotizacionPlantilla[]>([]);
  const [cargandoPlantillas, setCargandoPlantillas] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [descripcionAltura, setDescripcionAltura] = useState(88);

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
    setClienteNombre(nombreContactoAgendable(contactName));
    setClienteTelefono(suggestTelefono(channel, contactPhone));
    setVehiculoMarca('');
    setVehiculoModelo('');
    setVehiculoPatente('');
    setVehiculoAnio('');
    setVehiculoColor('');
    setVehiculoVin('');
    setVehiculoCilindraje('');
    setVehiculoDesdePatente(false);
    setServicioManual('');
    setModoServicio('catalogo');
    setCatalogoOpcionKey(null);
    setFechasDisponibles(null);
    setMensajeSinFechas(undefined);
    setHorasDisponibles(null);
    setMensajeSinHoras(undefined);
    setMecanicosAptos([]);
    setMiembroSeleccionado(null);
    setSlotsFinPorHora({});
    setDescripcion('');
    setTipoServicio(esMecanico ? 'domicilio' : 'taller');
    setDireccion('');
    setDireccionValidada(null);
    setFechaHora(resolveInitialPickerValue(initialFecha));
    setPatenteHint(null);
    setErrorForm(null);
    setGuardando(false);
    setDescripcionAltura(88);
    setCotizacion(null);
    setGenerandoIa(false);
    setEnviandoCotizacion(false);
    setGuardandoPlantilla(false);
    setErrorIa(null);
  }, [visible, contactName, contactPhone, channel, initialFecha, esMecanico]);

  useEffect(() => {
    if (!visible || !cotizacionAceptadaId) return;
    let mounted = true;
    void cotizacionCanalService.obtener(cotizacionAceptadaId).then((cot) => {
      if (!mounted || cot.estado !== 'aceptada') return;
      setCotizacion(cot);
      setModoServicio('manual');
      setServicioManual(cot.servicio_nombre || '');
      setDescripcion(cot.descripcion_problema || '');
      setTipoServicio(cot.modalidad === 'domicilio' ? 'domicilio' : 'taller');
      if (cot.vehiculo_marca) setVehiculoMarca(cot.vehiculo_marca);
      if (cot.vehiculo_modelo) setVehiculoModelo(cot.vehiculo_modelo);
      if (cot.vehiculo_patente) setVehiculoPatente(cot.vehiculo_patente);
      if (cot.vehiculo_anio) setVehiculoAnio(String(cot.vehiculo_anio));
      if (cot.vehiculo_cilindraje) setVehiculoCilindraje(cot.vehiculo_cilindraje);
      if (cot.vehiculo_vin) setVehiculoVin(cot.vehiculo_vin);
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, [visible, cotizacionAceptadaId]);

  const vehiculoFiltroPlantillas = useMemo(
    () => ({
      marca: vehiculoMarca.trim(),
      modelo: vehiculoModelo.trim(),
      cilindraje: vehiculoCilindraje.trim(),
    }),
    [vehiculoMarca, vehiculoModelo, vehiculoCilindraje],
  );

  const vehiculoListoParaPlantillas =
    vehiculoFiltroPlantillas.marca.length > 0 && vehiculoFiltroPlantillas.modelo.length > 0;

  useEffect(() => {
    if (!visible || !conversationId) return;
    if (!vehiculoListoParaPlantillas) {
      setPlantillas([]);
      setCargandoPlantillas(false);
      return;
    }
    let mounted = true;
    setCargandoPlantillas(true);
    void cotizacionCanalService
      .listarPlantillas(vehiculoFiltroPlantillas)
      .then((rows) => {
        if (mounted) setPlantillas(rows);
      })
      .catch(() => {
        if (mounted) setPlantillas([]);
      })
      .finally(() => {
        if (mounted) setCargandoPlantillas(false);
      });
    return () => {
      mounted = false;
    };
  }, [visible, conversationId, vehiculoMarca, vehiculoModelo, vehiculoCilindraje, vehiculoListoParaPlantillas]);

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
    setHorasDisponibles([]);
    setFechasDisponibles(null);
    setMensajeSinHoras(undefined);
    setMensajeSinFechas(undefined);
    setMiembroSeleccionado(null);
    setSlotsFinPorHora({});
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
    setHorasDisponibles([]);
    setSlotsFinPorHora({});
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
      setHorasDisponibles(null);
      setCargandoHoras(false);
      return;
    }

    if (cargandoFechas || fechasDisponibles === null) {
      setHorasDisponibles(null);
      setCargandoHoras(false);
      return;
    }

    if (fechasDisponibles.length === 0) {
      setHorasDisponibles([]);
      setMensajeSinHoras('No hay horarios disponibles para esta fecha.');
      setCargandoHoras(false);
      return;
    }

    const fechaKey = formatDateApi(fechaHora.fecha);
    if (!fechasDisponibles.includes(fechaKey)) {
        setHorasDisponibles([]);
        setMensajeSinHoras('Selecciona una fecha disponible.');
      setCargandoHoras(false);
      return;
    }

    let cancelled = false;
    const fecha = formatDateApi(fechaHora.fecha);

    setHorasDisponibles([]);
    setMensajeSinHoras(undefined);
    setCargandoHoras(true);
    obtenerDisponibilidadConDuracion({
      fecha,
      ofertaServicioId: ofertaAgendaId,
      modalidad: modalidadApi,
      miembroTallerId: miembroSeleccionado ?? undefined,
    })
      .then((data) => {
        if (cancelled) return;
        const finPorHora: Record<string, string> = {};
        const horas = (data.slots_disponibles ?? [])
          .map((slot) => {
            if (slot.hora && slot.hora_fin_estimada) {
              finPorHora[slot.hora] = slot.hora_fin_estimada;
            }
            return slot.hora;
          })
          .filter((h): h is string => Boolean(h));
        setSlotsFinPorHora(finPorHora);
        setHorasDisponibles(horas);
        setMensajeSinHoras(
          horas.length > 0 ? undefined : (data.mensaje || 'No hay horarios disponibles para esta fecha.'),
        );
        setFechaHora((prev) => {
          if (!prev.hora || horas.includes(prev.hora)) {
            const finEstimada = prev.hora ? finPorHora[prev.hora] : null;
            if (prev.hora && finEstimada && prev.horaFin !== finEstimada) {
              return { ...prev, horaFin: finEstimada };
            }
            return prev;
          }
          const nextHora = horas[0] ?? null;
          const nextFin = nextHora ? finPorHora[nextHora] ?? null : null;
          return { ...prev, hora: nextHora, horaFin: nextFin };
        });
      })
      .catch(() => {
        if (cancelled) return;
        setHorasDisponibles([]);
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

  useEffect(() => {
    if (!fechaHora.hora) return;
    const finEstimada = slotsFinPorHora[fechaHora.hora];
    if (finEstimada && fechaHora.horaFin !== finEstimada) {
      setFechaHora((prev) => ({ ...prev, horaFin: finEstimada }));
    }
  }, [fechaHora.hora, fechaHora.horaFin, slotsFinPorHora]);

  const resetVehiculoManual = useCallback(() => {
    const vacio = limpiarVehiculo();
    setVehiculoMarca(vacio.marca);
    setVehiculoModelo(vacio.modelo);
    setVehiculoAnio(vacio.anio);
    setVehiculoColor(vacio.color);
    setVehiculoVin(vacio.vin);
    setVehiculoCilindraje(vacio.cilindraje);
    setVehiculoDesdePatente(false);
    setPatenteHint(null);
  }, []);

  const handlePatenteChange = useCallback(
    (text: string) => {
      setVehiculoPatente(text.toUpperCase());
      if (vehiculoDesdePatente) {
        resetVehiculoManual();
      } else {
        setPatenteHint(null);
      }
    },
    [vehiculoDesdePatente, resetVehiculoManual],
  );

  const handlePatenteBlur = useCallback(async () => {
    const patente = vehiculoPatente.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (patente.length < 5) {
      setPatenteHint(null);
      return;
    }
    setBuscandoPatente(true);
    setPatenteHint(null);
    try {
      const data = await consultarPatente(patente);
      setVehiculoPatente(data.patente || patente);
      setVehiculoMarca(data.marca_nombre?.trim() || '');
      setVehiculoModelo(data.modelo_nombre?.trim() || '');
      setVehiculoAnio(data.year ? String(data.year) : '');
      setVehiculoColor(data.color?.trim() || '');
      setVehiculoVin(data.vin?.trim() || '');
      setVehiculoCilindraje(data.cilindraje?.trim() || '');
      setVehiculoDesdePatente(true);
      setPatenteHint('Datos del vehículo cargados desde la patente.');
    } catch {
      resetVehiculoManual();
      setPatenteHint('No se encontró la patente. Completa marca y modelo manualmente.');
    } finally {
      setBuscandoPatente(false);
    }
  }, [vehiculoPatente, resetVehiculoManual]);

  const validarFormulario = useCallback((): string | null => {
    if (!puedeAgendar) {
      return 'No tienes permiso para agendar citas.';
    }
    if (!clienteNombre.trim()) return 'Ingresa el nombre del cliente.';
    const telError = getChilePhoneError(extraerNueveDigitosDesdeGuardado(clienteTelefono), false);
    if (telError) return telError;
    if (!vehiculoMarca.trim()) return 'Ingresa la marca del vehículo.';
    if (!vehiculoModelo.trim()) return 'Ingresa el modelo del vehículo.';
    if (vehiculoAnio.trim()) {
      const anio = parseInt(vehiculoAnio.trim(), 10);
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
    clienteNombre,
    clienteTelefono,
    vehiculoMarca,
    vehiculoModelo,
    vehiculoAnio,
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
      cliente_nombre: clienteNombre.trim(),
      cliente_telefono: normalizarTelefonoChileParaGuardar(clienteTelefono),
      vehiculo_marca: vehiculoMarca.trim(),
      vehiculo_modelo: vehiculoModelo.trim(),
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

    if (vehiculoPatente.trim()) {
      detalle.vehiculo_patente = vehiculoPatente.trim().toUpperCase();
    }
    if (vehiculoAnio.trim()) {
      const anio = parseInt(vehiculoAnio.trim(), 10);
      if (!Number.isNaN(anio)) detalle.vehiculo_anio = anio;
    }
    if (vehiculoColor.trim()) detalle.vehiculo_color = vehiculoColor.trim();
    if (vehiculoCilindraje.trim()) detalle.vehiculo_cilindraje = vehiculoCilindraje.trim();
    if (vehiculoVin.trim()) detalle.vehiculo_vin = vehiculoVin.trim().toUpperCase();
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
      detalle,
    };
  }, [
    clienteNombre,
    clienteTelefono,
    vehiculoMarca,
    vehiculoModelo,
    vehiculoPatente,
    vehiculoAnio,
    vehiculoColor,
    vehiculoVin,
    vehiculoCilindraje,
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
  ]);

  const vehiculoPayload = useMemo(
    () => ({
      marca: vehiculoMarca.trim(),
      modelo: vehiculoModelo.trim(),
      patente: vehiculoPatente.trim().toUpperCase(),
      anio: vehiculoAnio.trim() ? parseInt(vehiculoAnio.trim(), 10) : undefined,
      cilindraje: vehiculoCilindraje.trim(),
      vin: vehiculoVin.trim().toUpperCase(),
    }),
    [vehiculoMarca, vehiculoModelo, vehiculoPatente, vehiculoAnio, vehiculoCilindraje, vehiculoVin],
  );

  const handleGenerarCotizacionIa = useCallback(async () => {
    if (!conversationId) return;
    if (!vehiculoMarca.trim() || !vehiculoModelo.trim()) {
      setErrorIa('Completa los datos del vehículo (patente o marca y modelo) antes de generar la cotización.');
      return;
    }
    if (!servicioManual.trim()) {
      setErrorIa('Ingresa el nombre del servicio antes de generar la cotización.');
      return;
    }
    setErrorIa(null);
    setGenerandoIa(true);
    try {
      const res = await cotizacionCanalService.generarIa({
        conversation_id: parseInt(conversationId, 10),
        servicio_nombre: servicioManual.trim(),
        descripcion_problema: descripcion.trim(),
        modalidad: tipoServicio === 'domicilio' ? 'domicilio' : 'taller',
        vehiculo: vehiculoPayload,
      });
      if (!res.disponible || !res.cotizacion) {
        setErrorIa(res.error || 'No se pudo generar la cotización con IA.');
        return;
      }
      setCotizacion(res.cotizacion);
    } catch {
      setErrorIa('Error al generar cotización. Intenta de nuevo.');
    } finally {
      setGenerandoIa(false);
    }
  }, [conversationId, vehiculoMarca, vehiculoModelo, servicioManual, descripcion, tipoServicio, vehiculoPayload]);

  const handleAplicarPlantilla = useCallback(
    async (plantillaId: number) => {
      if (!conversationId) return;
      setGenerandoIa(true);
      setErrorIa(null);
      try {
        const res = await cotizacionCanalService.generarIa({
          conversation_id: parseInt(conversationId, 10),
          servicio_nombre: servicioManual.trim(),
          descripcion_problema: descripcion.trim(),
          modalidad: tipoServicio === 'domicilio' ? 'domicilio' : 'taller',
          vehiculo: vehiculoPayload,
          plantilla_id: plantillaId,
        });
        if (res.cotizacion) {
          setCotizacion(res.cotizacion);
          if (!servicioManual.trim() && res.cotizacion.servicio_nombre) {
            setServicioManual(res.cotizacion.servicio_nombre);
          }
          if (res.cotizacion.descripcion_problema && !descripcion.trim()) {
            setDescripcion(res.cotizacion.descripcion_problema);
          }
        } else setErrorIa(res.error || 'No se pudo aplicar la plantilla.');
      } catch (err) {
        setErrorIa(extractApiError(err, 'Error al aplicar plantilla.'));
      } finally {
        setGenerandoIa(false);
      }
    },
    [conversationId, servicioManual, descripcion, tipoServicio, vehiculoPayload],
  );

  const persistirCotizacion = useCallback(async (next: CotizacionCanal) => {
    setCotizacion(next);
    if (next.estado !== 'borrador' || !next.id) return next;
    try {
      const saved = await cotizacionCanalService.actualizar(next.id, {
        repuestos: next.repuestos,
        mano_obra_clp: next.mano_obra_clp,
        servicio_nombre: next.servicio_nombre,
        descripcion_problema: next.descripcion_problema,
        duracion_minutos_estimada: next.duracion_minutos_estimada,
      });
      setCotizacion(saved);
      return saved;
    } catch {
      return next;
    }
  }, []);

  const handleEnviarCotizacion = useCallback(async () => {
    if (!cotizacion?.id) return;
    setEnviandoCotizacion(true);
    setErrorIa(null);
    try {
      const saved = await persistirCotizacion(cotizacion);
      const res = await cotizacionCanalService.enviar(saved.id);
      setCotizacion(res.cotizacion);
      onCotizacionEnviada?.();

      const canalExterno = channel && channel !== 'app';
      if (canalExterno && channelDisconnectedReason) {
        showAlert(
          'Cotización en el chat',
          'La cotización ya aparece en esta conversación. Para que el cliente la reciba por WhatsApp, Messenger o Instagram, conecta el canal en Configuración de canales.',
        );
      } else if (canalExterno) {
        showAlert(
          'Cotización enviada',
          'Apareció en el chat y se enviará al cliente por el canal conectado.',
        );
      } else {
        showAlert('Cotización enviada', 'La cotización apareció en el chat de la conversación.');
      }
    } catch (err) {
      setErrorIa(extractApiError(err, 'No se pudo enviar la cotización.'));
    } finally {
      setEnviandoCotizacion(false);
    }
  }, [cotizacion, persistirCotizacion, channel, channelDisconnectedReason, onCotizacionEnviada]);

  const handleGuardarPlantilla = useCallback(async () => {
    if (!cotizacion?.id) return;
    setGuardandoPlantilla(true);
    try {
      await persistirCotizacion(cotizacion);
      await cotizacionCanalService.guardarPlantilla({
        titulo: cotizacion.servicio_nombre || 'Plantilla cotización',
        cotizacion_id: cotizacion.id,
      });
      showAlert('Plantilla guardada', 'Podrás reutilizarla en futuras cotizaciones.');
    } catch {
      setErrorIa('No se pudo guardar la plantilla.');
    } finally {
      setGuardandoPlantilla(false);
    }
  }, [cotizacion, persistirCotizacion]);

  const handleMarcarAceptada = useCallback(async () => {
    if (!cotizacion?.id) return;
    try {
      const updated = await cotizacionCanalService.marcarAceptada(cotizacion.id);
      setCotizacion(updated);
      showAlert('Cotización aceptada', 'Puedes continuar con el agendamiento.');
    } catch {
      setErrorIa('No se pudo marcar como aceptada.');
    }
  }, [cotizacion]);

  const handleAgendar = useCallback(async () => {
    setErrorForm(null);
    const validationError = validarFormulario();
    if (validationError) {
      setErrorForm(validationError);
      return;
    }

    const payload = construirPayload();
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
  }, [validarFormulario, construirPayload, queryClient, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
        >
          <View style={styles.sheet}>
            <View style={styles.handleBar} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderText}>
                <Text style={styles.sheetTitle}>Agendar cita</Text>
                <Text style={styles.sheetSubtitle}>{sheetSubtitle}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Cerrar">
                <X size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <InstitutionalSectionHeader title="Cliente" />
            <View style={styles.section}>
              <InstitutionalField
                label="Nombre *"
                value={clienteNombre}
                onChangeText={setClienteNombre}
                placeholder="Nombre del cliente"
              />
              <ChilePhoneField
                label="Teléfono"
                hint={
                  channel === 'whatsapp'
                    ? 'Pre-rellenado desde WhatsApp. Puedes editarlo si es necesario.'
                    : channel
                      ? 'Opcional. Ingresa 9 dígitos comenzando en 9.'
                      : 'Opcional. Ingresa 9 dígitos comenzando en 9.'
                }
                value={clienteTelefono}
                onChangeValue={setClienteTelefono}
                required={false}
              />
            </View>

            <InstitutionalSectionHeader title="Vehículo" />
            <View style={styles.section}>
              <View>
                <InstitutionalField
                  label="Patente"
                  hint="Consulta el registro al salir del campo. Si existe, autocompleta y bloquea los datos del vehículo."
                  value={vehiculoPatente}
                  onChangeText={handlePatenteChange}
                  placeholder="ABCD12"
                  autoCapitalize="characters"
                  onBlur={handlePatenteBlur}
                  editable={!buscandoPatente}
                />
                {buscandoPatente ? (
                  <View style={styles.patenteLoading}>
                    <ActivityIndicator size="small" color={I.primary} />
                    <Text style={styles.patenteHint}>Consultando patente…</Text>
                  </View>
                ) : patenteHint ? (
                  <Text style={styles.patenteHint}>{patenteHint}</Text>
                ) : null}
              </View>
              {vehiculoDesdePatente ? (
                <View style={styles.vehiculoResumen}>
                  <View style={styles.vehiculoGrid}>
                    <VehiculoSpecItem label="Marca" value={vehiculoMarca} />
                    <VehiculoSpecItem label="Modelo" value={vehiculoModelo} />
                  </View>
                  <View style={styles.vehiculoGrid}>
                    <VehiculoSpecItem label="Año" value={vehiculoAnio} />
                    <VehiculoSpecItem label="Color" value={vehiculoColor} />
                  </View>
                  <View style={styles.vehiculoGrid}>
                    <VehiculoSpecItem label="VIN" value={vehiculoVin} />
                    <VehiculoSpecItem label="Cilindraje" value={vehiculoCilindraje} />
                  </View>
                </View>
              ) : (
                <View style={styles.vehiculoManual}>
                  <View style={styles.fieldRow}>
                    <View style={styles.fieldHalf}>
                      <InstitutionalField
                        label="Marca *"
                        value={vehiculoMarca}
                        onChangeText={setVehiculoMarca}
                        placeholder="Ej. Toyota"
                      />
                    </View>
                    <View style={styles.fieldHalf}>
                      <InstitutionalField
                        label="Modelo *"
                        value={vehiculoModelo}
                        onChangeText={setVehiculoModelo}
                        placeholder="Ej. Corolla"
                      />
                    </View>
                  </View>
                  <View style={styles.fieldRow}>
                    <View style={styles.fieldHalf}>
                      <InstitutionalField
                        label="Año"
                        value={vehiculoAnio}
                        onChangeText={(text) => setVehiculoAnio(text.replace(/\D/g, '').slice(0, 4))}
                        placeholder="2020"
                        keyboardType="number-pad"
                        maxLength={4}
                      />
                    </View>
                    <View style={styles.fieldHalf} />
                  </View>
                </View>
              )}
            </View>

            <InstitutionalSectionHeader title="Servicio" />
            <View style={styles.section}>
              {!esMecanico ? (
                <InstitutionalScreenTabs
                  tabs={TIPO_SERVICIO_TABS}
                  activeKey={tipoServicio}
                  onChange={setTipoServicio}
                />
              ) : null}

              {tipoServicio === 'domicilio' ? (
                <ChileAddressField
                  label="Dirección *"
                  hint="Busca una dirección real en Chile y elige un resultado."
                  value={direccion}
                  validated={direccionValidada}
                  onChangeText={setDireccion}
                  onValidatedChange={setDireccionValidada}
                  placeholder="Ej: Av. Providencia 1200, Providencia"
                />
              ) : null}

              <View style={styles.segmentRow}>
                <SegmentButton
                  label="Catálogo"
                  selected={modoServicio === 'catalogo'}
                  onPress={() => setModoServicio('catalogo')}
                />
                <SegmentButton
                  label="Manual"
                  selected={modoServicio === 'manual'}
                  onPress={() => setModoServicio('manual')}
                />
              </View>

              {modoServicio === 'catalogo' ? (
                loadingServicios ? (
                  <ActivityIndicator color={I.primary} style={styles.loader} />
                ) : serviciosCatalogoGrupos.length === 0 ? (
                  <Text style={styles.helperText}>
                    No tienes servicios disponibles en catálogo. Usa modo manual o créalos en Mis servicios.
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
                            <InstitutionalIcon name="check-circle" size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )
              ) : (
                <InstitutionalField
                  label="Servicio *"
                  value={servicioManual}
                  onChangeText={setServicioManual}
                  placeholder="Ej. Cambio de aceite"
                />
              )}

              <InstitutionalField
                label="Descripción"
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Detalle adicional (opcional)"
                multiline
                inputStyle={{ minHeight: descripcionAltura }}
                textInputProps={{
                  scrollEnabled: false,
                  onContentSizeChange: (event) => {
                    const next = Math.max(88, Math.ceil(event.nativeEvent.contentSize.height) + 12);
                    setDescripcionAltura((prev) => (prev === next ? prev : next));
                  },
                }}
              />

              {modoServicio === 'manual' && conversationId && !esMecanico ? (
                <View style={styles.cotizacionIaBlock}>
                  {vehiculoListoParaPlantillas ? (
                    <View style={styles.plantillasVehiculoBox}>
                      <Text style={styles.plantillasVehiculoTitle}>Plantillas para este vehículo</Text>
                      <View style={styles.vehiculoGrid}>
                        <VehiculoSpecItem label="Marca" value={vehiculoMarca} />
                        <VehiculoSpecItem label="Modelo" value={vehiculoModelo} />
                      </View>
                      {vehiculoCilindraje.trim() ? (
                        <View style={styles.vehiculoGrid}>
                          <VehiculoSpecItem label="Cilindraje" value={vehiculoCilindraje} />
                          <View style={styles.vehiculoGridItem} />
                        </View>
                      ) : null}

                      {cargandoPlantillas ? (
                        <ActivityIndicator color={I.primary} style={styles.loader} />
                      ) : plantillas.length > 0 && !cotizacion ? (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.plantillasScroll}
                        >
                          {plantillas.map((p) => (
                            <TouchableOpacity
                              key={p.id}
                              style={styles.plantillaChip}
                              onPress={() => void handleAplicarPlantilla(p.id)}
                              disabled={generandoIa}
                            >
                              <Text style={styles.plantillaChipText} numberOfLines={2}>
                                {p.titulo}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      ) : !cotizacion ? (
                        <Text style={styles.plantillasEmptyHint}>
                          No hay plantillas guardadas para{' '}
                          {etiquetaVehiculoActual(vehiculoFiltroPlantillas)}.
                        </Text>
                      ) : null}

                      <TouchableOpacity
                        style={styles.plantillasLink}
                        onPress={() =>
                          router.push({
                            pathname: '/cotizaciones-plantillas',
                            params: {
                              marca: vehiculoFiltroPlantillas.marca,
                              modelo: vehiculoFiltroPlantillas.modelo,
                              cilindraje: vehiculoFiltroPlantillas.cilindraje,
                            },
                          })
                        }
                      >
                        <Text style={styles.plantillasLinkText}>Ver plantillas de este vehículo</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.plantillasEmptyHint}>
                      Completa patente o marca y modelo del vehículo para ver plantillas asociadas.
                    </Text>
                  )}
                  {!cotizacion ? (
                    <>
                      <TouchableOpacity
                        style={[styles.iaBtn, generandoIa && styles.confirmBtnDisabled]}
                        onPress={() => void handleGenerarCotizacionIa()}
                        disabled={generandoIa}
                        activeOpacity={0.85}
                      >
                        {generandoIa ? (
                          <ActivityIndicator color={I.primary} />
                        ) : (
                          <>
                            <Sparkles size={18} color={I.primary} strokeWidth={2} />
                            <Text style={styles.iaBtnText}>Generar cotización con IA</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      {errorIa ? <Text style={styles.errorIaText}>{errorIa}</Text> : null}
                    </>
                  ) : (
                    <CotizacionIaEditor
                      cotizacion={cotizacion}
                      onChange={(next) => {
                        void persistirCotizacion(next);
                      }}
                      onEnviar={() => void handleEnviarCotizacion()}
                      onGuardarPlantilla={() => void handleGuardarPlantilla()}
                      onMarcarAceptada={() => void handleMarcarAceptada()}
                      enviando={enviandoCotizacion}
                      guardandoPlantilla={guardandoPlantilla}
                    />
                  )}
                </View>
              ) : null}
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
                              color={I.onPrimary}
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
                                  color={I.onPrimary}
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
                horasDisponibles={agendaParamsListos ? (horasDisponibles ?? []) : null}
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
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={guardando}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, guardando && styles.confirmBtnDisabled]}
              onPress={handleAgendar}
              disabled={guardando}
            >
              {guardando ? (
                <ActivityIndicator color={I.onPrimary} size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>Agendar cita</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    width: '100%',
    maxHeight: Platform.OS === 'web' ? '92vh' : '92%',
    ...(Platform.OS === 'web' ? { height: '92vh' } : { flexShrink: 1 }),
  },
  sheet: {
    backgroundColor: I.canvas,
    borderTopLeftRadius: BORDERS.radius.xl,
    borderTopRightRadius: BORDERS.radius.xl,
    width: '100%',
    flex: 1,
    maxHeight: Platform.OS === 'web' ? '92vh' : '92%',
    ...(Platform.OS === 'web' ? { height: '92vh' } : null),
    ...SHADOWS.editorial,
    overflow: 'hidden',
  },
  handleBar: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: BORDERS.radius.full,
    backgroundColor: I.hairline,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    gap: SPACING.sm,
  },
  sheetHeaderText: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.xs,
    ...(Platform.OS === 'web' ? ({ display: 'flex', flexDirection: 'column' } as object) : null),
  },
  sheetTitle: {
    ...SHEET_TITLE,
    color: I.ink,
    fontWeight: '600',
  },
  sheetSubtitle: {
    ...SHEET_SUBTITLE,
    color: I.muted,
  },
  closeBtn: {
    width: 40,
    height: 40,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flexGrow: 1, flexShrink: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.sm,
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
  segmentRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.canvas,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    alignItems: 'center',
  },
  segmentBtnSelected: {
    backgroundColor: I.primary,
    borderColor: I.primary,
  },
  segmentBtnText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.body,
  },
  segmentBtnTextOn: {
    color: I.onPrimary,
  },
  catalogoList: {
    gap: SPACING.xs,
  },
  catalogoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm + 4,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.canvas,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  catalogoItemSelected: {
    backgroundColor: I.primary,
    borderColor: I.primary,
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
    color: I.onPrimary,
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
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  modalidadBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.muted,
  },
  modalidadBadgeTextOn: {
    color: I.onPrimary,
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
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.35)',
  },
  especialidadBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.body,
  },
  especialidadBadgeTextOn: {
    color: I.onPrimary,
  },
  loader: {
    paddingVertical: SPACING.md,
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
    gap: SPACING.md,
    padding: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: I.hairline,
  },
  cancelBtnText: {
    ...TYPOGRAPHY.styles.button,
    color: I.muted,
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.primary,
    minHeight: 48,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  cotizacionIaBlock: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  iaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.primary,
    backgroundColor: I.surfaceSoft,
  },
  iaBtnText: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.primary,
  },
  errorIaText: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#C62828',
  },
  plantillasLink: { alignSelf: 'flex-start', marginTop: SPACING.xs },
  plantillasLinkText: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.primary,
    textDecorationLine: 'underline',
  },
  plantillasVehiculoBox: {
    gap: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    marginBottom: SPACING.sm,
  },
  plantillasVehiculoTitle: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  plantillasEmptyHint: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
    lineHeight: 20,
  },
  plantillasScroll: { maxHeight: 56 },
  plantillaChip: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginRight: SPACING.xs,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    maxWidth: 200,
    minHeight: 44,
    justifyContent: 'center',
  },
  plantillaChipText: {
    fontFamily: FF.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.ink,
  },
  confirmBtnText: {
    ...TYPOGRAPHY.styles.button,
    color: I.onPrimary,
    fontWeight: '600',
  },
});
