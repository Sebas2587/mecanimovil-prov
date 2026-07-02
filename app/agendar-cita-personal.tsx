import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Header from '@/components/Header';
import { EstadoBanner } from '@/components/solicitudes/EstadoBanner';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import { MontoCLPField, parsePrecioReferencia } from '@/components/forms/MontoCLPField';
import { ChilePhoneField, getChilePhoneError } from '@/components/forms/ChilePhoneField';
import ChileAddressField from '@/components/forms/ChileAddressField';
import type { ChileFormattedAddress } from '@/utils/chileAddressSearch';
import { extraerNueveDigitosDesdeGuardado, normalizarTelefonoChileParaGuardar } from '@/utils/chilePhone';
import { esRangoHorarioValido, calcularDuracionMinutos } from '@/utils/citaPersonalHorario';
import {
  CatalogoFechaHoraPickers,
  formatDateApi,
  resolveInitialPickerValue,
  type CatalogoFechaHoraValue,
} from '@/components/solicitudes/CatalogoFechaHoraPickers';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS, withOpacity } from '@/app/design-system/tokens';
import { agendaProveedorService, type CitaAgendaPersonalCreatePayload } from '@/services/agendaProveedorService';
import { serviciosProveedorAPI, type ServicioOferta } from '@/services/serviciosApi';
import { agruparOfertasPorCatalogo } from '@/utils/agruparOfertasPorCatalogo';
import {
  categoriasIdsFromGrupo,
  filtrarMecanicosParaAgenda,
} from '@/utils/mecanicosAgenda';
import {
  obtenerDisponibilidadConDuracion,
  obtenerDiasDisponiblesAgenda,
} from '@/services/disponibilidadProveedorService';
import { resolveProveedorAgendaIds, type ProveedorAgendaIds } from '@/utils/resolveProveedorAgenda';
import equipoTallerService, {
  type MiembroTaller,
  etiquetaModalidadMecanico,
} from '@/services/equipoTallerService';
import { parseReferenciaDate } from '@/utils/fechaLocal';
import { useAuth } from '@/context/AuthContext';
import { showAlert } from '@/utils/platformAlert';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const hx = SPACING.container.horizontal;

type ModoServicio = 'catalogo' | 'manual';

type ResultadoEnvio =
  | { tipo: 'success'; citaId: number; mensaje?: string }
  | { tipo: 'error' | 'warning'; titulo: string; mensaje: string };

export default function AgendarCitaPersonalScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { estadoProveedor, puede, esSupervisor } = useAuth();
  const { fecha: fechaParam } = useLocalSearchParams<{ fecha?: string }>();

  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [direccionValidada, setDireccionValidada] = useState<ChileFormattedAddress | null>(null);
  const [vehiculoMarca, setVehiculoMarca] = useState('');
  const [vehiculoModelo, setVehiculoModelo] = useState('');
  const [vehiculoPatente, setVehiculoPatente] = useState('');
  const [vehiculoAnio, setVehiculoAnio] = useState('');
  const [modoServicio, setModoServicio] = useState<ModoServicio>('catalogo');
  const [servicioManual, setServicioManual] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precioReferencia, setPrecioReferencia] = useState('');
  const [tipoServicio, setTipoServicio] = useState<'taller' | 'domicilio'>('taller');
  const [mecanicos, setMecanicos] = useState<MiembroTaller[]>([]);
  const [miembroSeleccionado, setMiembroSeleccionado] = useState<number | null>(null);
  const [fechaHora, setFechaHora] = useState<CatalogoFechaHoraValue>(() =>
    resolveInitialPickerValue(typeof fechaParam === 'string' ? fechaParam : undefined),
  );

  useEffect(() => {
    if (typeof fechaParam === 'string' && fechaParam.trim()) {
      setFechaHora(resolveInitialPickerValue(fechaParam));
    }
  }, [fechaParam]);

  const [serviciosCatalogo, setServiciosCatalogo] = useState<ServicioOferta[]>([]);
  const [catalogoGrupoKey, setCatalogoGrupoKey] = useState<string | null>(null);
  const [loadingServicios, setLoadingServicios] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [resultadoEnvio, setResultadoEnvio] = useState<ResultadoEnvio | null>(null);
  const [proveedorAgenda, setProveedorAgenda] = useState<ProveedorAgendaIds | null>(null);
  const [fechasDisponibles, setFechasDisponibles] = useState<string[] | null>(null);
  const [cargandoFechas, setCargandoFechas] = useState(false);
  const [mensajeSinFechas, setMensajeSinFechas] = useState<string | undefined>();
  const [horasDisponibles, setHorasDisponibles] = useState<string[] | null>(null);
  const [cargandoHoras, setCargandoHoras] = useState(false);
  const [mensajeSinHoras, setMensajeSinHoras] = useState<string | undefined>();
  const [slotsFinPorHora, setSlotsFinPorHora] = useState<Record<string, string>>({});

  const puedeAgendar = !esSupervisor || puede('agenda');

  const esMecanico = useMemo(
    () => estadoProveedor?.tipo_proveedor === 'mecanico',
    [estadoProveedor],
  );

  useEffect(() => {
    if (esMecanico) {
      setTipoServicio('domicilio');
    }
  }, [esMecanico]);

  useEffect(() => {
    let mounted = true;
    equipoTallerService
      .listar({ rol: 'mecanico', activo: true })
      .then((equipo) => {
        if (mounted) setMecanicos(equipo);
      })
      .catch(() => {
        if (mounted) setMecanicos([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingServicios(true);
      try {
        const lista = await serviciosProveedorAPI.obtenerMisServicios();
        if (mounted) {
          setServiciosCatalogo(lista.filter((s: ServicioOferta) => s.disponible));
        }
      } catch {
        if (mounted) setServiciosCatalogo([]);
      } finally {
        if (mounted) setLoadingServicios(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const serviciosCatalogoGrupos = useMemo(
    () => agruparOfertasPorCatalogo(serviciosCatalogo),
    [serviciosCatalogo],
  );

  const categoriasServicioAgenda = useMemo(() => {
    if (modoServicio !== 'catalogo' || !catalogoGrupoKey) return [];
    const grupo = serviciosCatalogoGrupos.find((g) => g.key === catalogoGrupoKey);
    return grupo ? categoriasIdsFromGrupo(grupo) : [];
  }, [modoServicio, catalogoGrupoKey, serviciosCatalogoGrupos]);

  const mecanicosCompatibles = useMemo(
    () =>
      filtrarMecanicosParaAgenda(mecanicos, {
        tipoServicio,
        categoriasIds: categoriasServicioAgenda,
      }),
    [mecanicos, tipoServicio, categoriasServicioAgenda],
  );

  useEffect(() => {
    if (miembroSeleccionado == null) return;
    const sigueCompatible = mecanicosCompatibles.some((m) => m.id === miembroSeleccionado);
    if (!sigueCompatible) setMiembroSeleccionado(null);
  }, [mecanicosCompatibles, miembroSeleccionado]);

  const selectedOfertaId = useMemo(() => {
    if (modoServicio !== 'catalogo' || !catalogoGrupoKey) return undefined;
    const grupo = serviciosCatalogoGrupos.find((g) => g.key === catalogoGrupoKey);
    return grupo?.representante.id;
  }, [modoServicio, catalogoGrupoKey, serviciosCatalogoGrupos]);

  const modalidadApi = useMemo((): 'a_domicilio' | 'en_taller' => (
    tipoServicio === 'domicilio' ? 'a_domicilio' : 'en_taller'
  ), [tipoServicio]);

  const agendaParamsListos = useMemo(() => {
    if (modoServicio === 'catalogo') return Boolean(selectedOfertaId);
    return servicioManual.trim().length > 0;
  }, [modoServicio, selectedOfertaId, servicioManual]);

  useEffect(() => {
    let mounted = true;
    void resolveProveedorAgendaIds(estadoProveedor?.tipo_proveedor).then((ctx) => {
      if (mounted) setProveedorAgenda(ctx);
    });
    return () => {
      mounted = false;
    };
  }, [estadoProveedor?.tipo_proveedor]);

  useEffect(() => {
    setHorasDisponibles([]);
    setFechasDisponibles(null);
    setMensajeSinHoras(undefined);
    setMensajeSinFechas(undefined);
    setSlotsFinPorHora({});
    setFechaHora((prev) => ({ ...prev, hora: null, horaFin: null }));
  }, [selectedOfertaId, modalidadApi, modoServicio, catalogoGrupoKey, tipoServicio, servicioManual]);

  useEffect(() => {
    setHorasDisponibles([]);
    setSlotsFinPorHora({});
    setFechaHora((prev) => ({ ...prev, hora: null, horaFin: null }));
  }, [miembroSeleccionado]);

  useEffect(() => {
    if (!agendaParamsListos) {
      setFechasDisponibles(null);
      setCargandoFechas(false);
      return;
    }

    let cancelled = false;
    setCargandoFechas(true);
    setMensajeSinFechas(undefined);

    obtenerDiasDisponiblesAgenda({
      ofertaServicioId: selectedOfertaId,
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
              : 'No hay fechas disponibles según la agenda configurada.',
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
  }, [agendaParamsListos, modalidadApi, selectedOfertaId, miembroSeleccionado]);

  useEffect(() => {
    if (!agendaParamsListos) {
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
      ofertaServicioId: selectedOfertaId,
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
    agendaParamsListos,
    fechaHora.fecha,
    modalidadApi,
    selectedOfertaId,
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

  const validarFormulario = useCallback((): string | null => {
    if (!clienteNombre.trim()) return 'Ingresa el nombre del cliente.';
    const telError = getChilePhoneError(extraerNueveDigitosDesdeGuardado(clienteTelefono), true);
    if (telError) return telError;
    if (!vehiculoMarca.trim()) return 'Ingresa la marca del vehículo.';
    if (!vehiculoModelo.trim()) return 'Ingresa el modelo del vehículo.';
    if (tipoServicio === 'domicilio') {
      if (!direccion.trim()) return 'Ingresa la dirección para servicio a domicilio.';
      if (!direccionValidada) return 'Selecciona una dirección válida de la lista de sugerencias.';
    }
    if (modoServicio === 'catalogo' && !catalogoGrupoKey) {
      return 'Selecciona un servicio de tu catálogo.';
    }
    if (modoServicio === 'manual' && !servicioManual.trim()) {
      return 'Ingresa el nombre del servicio.';
    }
    if (!fechaHora.hora || !fechaHora.horaFin) {
      return 'Selecciona hora de inicio y término para la cita.';
    }
    if (!esRangoHorarioValido(fechaHora.hora, fechaHora.horaFin)) {
      return 'La hora de término debe ser al menos 15 minutos después del inicio.';
    }
    if (mecanicos.length > 0 && mecanicosCompatibles.length === 0 && agendaParamsListos) {
      return modoServicio === 'catalogo'
        ? 'No hay mecánicos con la especialidad y modalidad requeridas para este servicio.'
        : 'No hay mecánicos compatibles con la modalidad seleccionada.';
    }
    return null;
  }, [
    clienteNombre,
    clienteTelefono,
    vehiculoMarca,
    vehiculoModelo,
    tipoServicio,
    direccion,
    direccionValidada,
    modoServicio,
    catalogoGrupoKey,
    servicioManual,
    fechaHora,
    mecanicos,
    mecanicosCompatibles,
    agendaParamsListos,
    modoServicio,
  ]);

  const construirPayload = useCallback((): CitaAgendaPersonalCreatePayload => {
    const detalle: CitaAgendaPersonalCreatePayload['detalle'] = {
      cliente_nombre: clienteNombre.trim(),
      cliente_telefono: normalizarTelefonoChileParaGuardar(clienteTelefono),
      vehiculo_marca: vehiculoMarca.trim(),
      vehiculo_modelo: vehiculoModelo.trim(),
    };

    if (vehiculoPatente.trim()) detalle.vehiculo_patente = vehiculoPatente.trim();

    if (vehiculoAnio.trim()) {
      const anio = parseInt(vehiculoAnio.trim(), 10);
      if (!Number.isNaN(anio)) detalle.vehiculo_anio = anio;
    }

    if (tipoServicio === 'domicilio') {
      detalle.direccion = (direccionValidada?.line ?? direccion).trim();
    }

    if (modoServicio === 'catalogo' && catalogoGrupoKey) {
      const grupo = serviciosCatalogoGrupos.find((g) => g.key === catalogoGrupoKey);
      if (grupo) detalle.oferta_servicio_id = grupo.representante.id;
    } else {
      detalle.servicio_nombre = servicioManual.trim();
    }

    if (descripcion.trim()) detalle.descripcion = descripcion.trim();

    if (precioReferencia.trim()) {
      const precio = parsePrecioReferencia(precioReferencia);
      if (precio != null) detalle.precio_referencia = precio;
    }

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
    tipoServicio,
    direccion,
    direccionValidada,
    modoServicio,
    catalogoGrupoKey,
    serviciosCatalogoGrupos,
    servicioManual,
    descripcion,
    precioReferencia,
    fechaHora,
    miembroSeleccionado,
  ]);

  const mostrarResultado = useCallback((resultado: ResultadoEnvio) => {
    setResultadoEnvio(resultado);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const handleGuardar = useCallback(async () => {
    setResultadoEnvio(null);

    if (!puedeAgendar) {
      mostrarResultado({
        tipo: 'error',
        titulo: 'Sin permiso',
        mensaje: 'No tienes permiso para agendar citas. Contacta al mandante del taller.',
      });
      return;
    }

    const error = validarFormulario();
    if (error) {
      mostrarResultado({ tipo: 'warning', titulo: 'Datos incompletos', mensaje: error });
      return;
    }

    const payload = construirPayload();
    setGuardando(true);

    try {
      const validacion = await agendaProveedorService.validarSlot(payload);
      if (!validacion.success || !validacion.data?.valido) {
        const mensaje =
          validacion.data?.error || validacion.message || 'El horario seleccionado no está disponible.';
        mostrarResultado({ tipo: 'error', titulo: 'Horario no disponible', mensaje });
        return;
      }

      const res = await agendaProveedorService.crearCita(payload);

      if (res.success && res.data) {
        const mecanicoAsignado = res.data.mecanico_nombre?.trim();
        const mensajeExito = mecanicoAsignado
          ? `La cita fue creada y asignada a ${mecanicoAsignado}.`
          : 'La cita personal fue creada correctamente.';
        mostrarResultado({ tipo: 'success', citaId: res.data.id, mensaje: mensajeExito });
        if (Platform.OS !== 'web') {
          showAlert('Cita agendada', 'La cita personal fue creada correctamente.');
        }
      } else {
        const mensaje = res.message || 'No se pudo crear la cita. Revisa los datos e inténtalo de nuevo.';
        mostrarResultado({ tipo: 'error', titulo: 'No se pudo agendar', mensaje });
      }
    } catch (e) {
      const mensaje =
        e instanceof Error && e.message.trim()
          ? e.message
          : 'Ocurrió un error inesperado. Comprueba tu conexión e inténtalo de nuevo.';
      mostrarResultado({ tipo: 'error', titulo: 'Error al agendar', mensaje });
    } finally {
      setGuardando(false);
    }
  }, [puedeAgendar, validarFormulario, construirPayload, fechaHora.fecha, mostrarResultado]);

  const toggleCatalogoGrupo = useCallback((key: string) => {
    setCatalogoGrupoKey((prev) => (prev === key ? null : key));
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Header
        title="Agendar cita personal"
        showBack
        onBackPress={() => router.back()}
        backgroundColor={I.canvas}
        titleColor={I.ink}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={{
            paddingHorizontal: hx,
            paddingBottom: insets.bottom + SPACING.fixed.xl,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.bannerWrap}>
            <EstadoBanner
              type="info"
              title="¿Cliente externo a Mecanimovil?"
              message="Recomienda la app Mecanimovil Usuarios para reservas con pago, historial y seguimiento del servicio."
              icon="smartphone"
            />
          </View>

          <Section title="Cliente">
            <InstitutionalField
              label="Nombre *"
              value={clienteNombre}
              onChangeText={setClienteNombre}
              placeholder="Nombre completo"
            />
            <ChilePhoneField value={clienteTelefono} onChangeValue={setClienteTelefono} />
          </Section>

          <Section title="Vehículo">
            <InstitutionalField label="Marca *" value={vehiculoMarca} onChangeText={setVehiculoMarca} placeholder="Toyota" />
            <InstitutionalField label="Modelo *" value={vehiculoModelo} onChangeText={setVehiculoModelo} placeholder="Corolla" />
            <View style={styles.rowFields}>
              <View style={styles.halfField}>
                <InstitutionalField
                  label="Patente"
                  value={vehiculoPatente}
                  onChangeText={setVehiculoPatente}
                  placeholder="AA1234"
                  autoCapitalize="characters"
                />
              </View>
              <View style={styles.halfField}>
                <InstitutionalField
                  label="Año"
                  value={vehiculoAnio}
                  onChangeText={setVehiculoAnio}
                  placeholder="2020"
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </Section>

          <Section title="Tipo de servicio">
            <View style={styles.segmentRow}>
              {!esMecanico && (
                <SegmentButton
                  label="En taller"
                  selected={tipoServicio === 'taller'}
                  onPress={() => setTipoServicio('taller')}
                />
              )}
              <SegmentButton
                label="A domicilio"
                selected={tipoServicio === 'domicilio'}
                onPress={() => setTipoServicio('domicilio')}
              />
            </View>
            {tipoServicio === 'domicilio' && (
              <ChileAddressField
                label="Dirección del servicio *"
                hint="Busca una dirección real en Chile. Escribe al menos 4 caracteres y elige un resultado."
                value={direccion}
                validated={direccionValidada}
                onChangeText={setDireccion}
                onValidatedChange={setDireccionValidada}
                placeholder="Ej: Av. Providencia 1200, Providencia"
              />
            )}
          </Section>

          <Section title="Servicio">
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
                  No tienes servicios disponibles en catálogo. Usa modo manual o crea servicios en Mis Servicios.
                </Text>
              ) : (
                <View style={styles.catalogoList}>
                  {serviciosCatalogoGrupos.map((grupo) => {
                    const selected = catalogoGrupoKey === grupo.key;
                    return (
                      <TouchableOpacity
                        key={grupo.key}
                        style={[styles.catalogoItem, selected && styles.catalogoItemSelected]}
                        onPress={() => toggleCatalogoGrupo(grupo.key)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.catalogoItemTitle, selected && styles.catalogoItemTitleOn]}>
                          {grupo.nombre}
                        </Text>
                        {selected && (
                          <InstitutionalIcon name="check-circle" size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                        )}
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

            <InstitutionalField
              label="Descripción (opcional)"
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="Notas adicionales del servicio"
              multiline
            />
            <MontoCLPField value={precioReferencia} onChangeValue={setPrecioReferencia} />
          </Section>

          {mecanicos.length > 0 && (
            <Section title="Mecánico asignado">
              <Text style={styles.helperText}>
                {mecanicosCompatibles.length > 0
                  ? `Solo técnicos con especialidad y modalidad compatibles${
                      modoServicio === 'catalogo' && catalogoGrupoKey
                        ? ` con «${
                            serviciosCatalogoGrupos.find((g) => g.key === catalogoGrupoKey)?.nombre ?? 'el servicio'
                          }»`
                        : ''
                    }. Automático elige al mejor disponible.`
                  : modoServicio === 'catalogo' && !catalogoGrupoKey
                    ? 'Selecciona un servicio del catálogo para ver mecánicos compatibles por especialidad y modalidad.'
                    : modoServicio === 'catalogo'
                      ? 'Ningún mecánico tiene la especialidad y modalidad requeridas para este servicio.'
                      : 'No hay mecánicos compatibles con la modalidad seleccionada.'}
              </Text>
              <View style={styles.catalogoList}>
                <TouchableOpacity
                  style={[
                    styles.catalogoItem,
                    miembroSeleccionado === null && styles.catalogoItemSelected,
                    mecanicosCompatibles.length === 0 && styles.catalogoItemDisabled,
                  ]}
                  onPress={() => mecanicosCompatibles.length > 0 && setMiembroSeleccionado(null)}
                  disabled={mecanicosCompatibles.length === 0}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.catalogoItemTitle, miembroSeleccionado === null && styles.catalogoItemTitleOn]}>
                    Automático
                  </Text>
                  {miembroSeleccionado === null && mecanicosCompatibles.length > 0 && (
                    <InstitutionalIcon name="check-circle" size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                  )}
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
                          style={[styles.catalogoItemTitle, selected && styles.catalogoItemTitleOn]}
                          numberOfLines={1}
                        >
                          {m.nombre}
                        </Text>
                        {modalidadLabel ? (
                          <View style={[styles.modalidadBadge, selected && styles.modalidadBadgeOn]}>
                            <Text
                              style={[styles.modalidadBadgeText, selected && styles.modalidadBadgeTextOn]}
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
                      {selected && (
                        <InstitutionalIcon name="check-circle" size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Section>
          )}

          {!puedeAgendar && (
            <View style={styles.bannerWrap}>
              <EstadoBanner
                type="error"
                title="Sin permiso de agenda"
                message="Tu cuenta de supervisor no puede agendar citas. Pide al mandante que active el permiso de agenda."
                icon="lock"
              />
            </View>
          )}

          <Section title="Fecha y hora">
            <CatalogoFechaHoraPickers
              value={fechaHora}
              onChange={setFechaHora}
              modo="rango"
              fechasDisponibles={agendaParamsListos ? fechasDisponibles : null}
              cargandoFechas={agendaParamsListos && cargandoFechas}
              mensajeSinFechas={
                agendaParamsListos
                  ? mensajeSinFechas
                  : 'Selecciona modalidad, servicio y mecánico (si aplica) para ver fechas disponibles.'
              }
              horasDisponibles={agendaParamsListos ? (horasDisponibles ?? []) : null}
              cargandoHoras={agendaParamsListos && cargandoHoras}
              mensajeSinHoras={mensajeSinHoras}
            />
            {(!fechaHora.hora || !fechaHora.horaFin) && (
              <Text style={styles.helperTextWarn}>Selecciona hora de inicio y término para confirmar la cita.</Text>
            )}
          </Section>

          {resultadoEnvio?.tipo === 'success' ? (
            <View style={styles.resultadoWrap}>
              <EstadoBanner
                type="success"
                title="Cita agendada"
                message={resultadoEnvio.mensaje ?? 'La cita personal fue creada correctamente.'}
                icon="check-circle"
              />
              <View style={styles.successActions}>
                <TouchableOpacity
                  style={styles.successActionBtn}
                  onPress={() => router.replace(`/cita-agenda-personal/${resultadoEnvio.citaId}`)}
                  activeOpacity={0.88}
                >
                  <InstitutionalIcon name="eye-outline" size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                  <Text style={styles.successActionText}>Ver detalle</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : resultadoEnvio ? (
            <View style={styles.resultadoWrap}>
              <EstadoBanner
                type={resultadoEnvio.tipo === 'warning' ? 'warning' : 'error'}
                title={resultadoEnvio.titulo}
                message={resultadoEnvio.mensaje}
              />
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (guardando || !puedeAgendar) && styles.submitBtnDisabled,
            ]}
            onPress={handleGuardar}
            disabled={guardando || !puedeAgendar}
            activeOpacity={0.88}
          >
            {guardando ? (
              <ActivityIndicator color={I.onPrimary} />
            ) : (
              <>
                <InstitutionalIcon name="calendar" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.submitBtnText}>Agendar cita</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <InstitutionalSectionHeader title={title} />
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  bannerWrap: {
    marginTop: SPACING.fixed.md,
    marginBottom: SPACING.fixed.sm,
  },
  section: {
    marginTop: SPACING.fixed.md,
  },
  sectionCard: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.card.xl,
    padding: SPACING.fixed.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    ...SHADOWS.editorial,
    gap: SPACING.fixed.md,
  },
  rowFields: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
  },
  halfField: {
    flex: 1,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: SPACING.fixed.xs,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: SPACING.fixed.sm,
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
    gap: SPACING.fixed.xs,
  },
  catalogoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.sm + 4,
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
    gap: SPACING.fixed.xs,
    paddingRight: SPACING.fixed.xs,
  },
  modalidadBadge: {
    paddingHorizontal: SPACING.fixed.sm,
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
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
  },
  especialidadBadgeOn: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  especialidadBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.muted,
  },
  especialidadBadgeTextOn: {
    color: I.onPrimary,
  },
  loader: {
    paddingVertical: SPACING.fixed.md,
  },
  helperText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.sm * 1.45),
  },
  helperTextWarn: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.accentYellow,
    marginTop: SPACING.fixed.xxs,
  },
  resultadoWrap: {
    marginTop: SPACING.fixed.lg,
    gap: SPACING.fixed.sm,
  },
  successActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
  },
  successActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xxs,
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.primary,
    backgroundColor: withOpacity(I.primary, 0.06),
  },
  successActionText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.primary,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.sm,
    backgroundColor: I.primary,
    borderRadius: BORDERS.radius.lg,
    paddingVertical: SPACING.fixed.md,
    marginTop: SPACING.fixed.lg,
    ...SHADOWS.editorial,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.sansSemiBold,
    color: I.onPrimary,
  },
});
