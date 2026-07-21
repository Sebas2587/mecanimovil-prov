import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  openCitaPersonalDetalle,
  openOfertaDetalle,
} from '@/utils/navigateProveedorDetalle';
import { useAuth } from '@/context/AuthContext';
import {
  nombreServicioEvento,
  type EventoAgendaUnificado,
} from '@/services/agendaProveedorService';
import { useAgendaCalendarioQuery } from '@/hooks/useAgendaCalendarioQuery';
import { useEquipoTallerQuery } from '@/hooks/useEquipoTallerQuery';
import { formatDateApi } from '@/components/solicitudes/CatalogoFechaHoraPickers';
import {
  parseFechaLocal,
  isSameDay,
  esHoy as esHoyLocal,
  esPasada,
  startOfDay,
} from '@/utils/fechaLocal';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS, withOpacity } from '@/app/design-system/tokens';
import { institutionalCardStyles } from '@/app/design-system/styles/institutionalSemantic';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import Header from '@/components/Header';
import { AgendarDesdeCanalModal } from '@/components/chats/AgendarDesdeCanalModal';
import { BottomSheet } from '@/design-system/components/BottomSheet';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { OrigenOrdenBadge } from '@/components/ordenes/OrigenOrdenBadge';
import type { OrigenOrden } from '@/utils/ordenProveedorUnificada';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { ChevronRight } from 'lucide-react-native';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

function formatearFechaParaComparar(fecha: Date): string {
  return formatDateApi(fecha);
}

function esMismaFecha(fecha1: Date, fecha2: Date): boolean {
  return isSameDay(fecha1, fecha2);
}

function esHoy(fecha: Date): boolean {
  return esHoyLocal(fecha);
}

type DiaCalendario = {
  dia: number;
  fecha: Date;
  tieneOrdenes: boolean;
  esHoy: boolean;
  esSeleccionado: boolean;
  esOtroMes: boolean;
  esPasada: boolean;
};

const CalendarDayCell = React.memo(function CalendarDayCell({
  diaCalendario,
  fechaSeleccionada,
  onSelect,
}: {
  diaCalendario: DiaCalendario;
  fechaSeleccionada: Date;
  onSelect: (d: Date) => void;
}) {
  const esSeleccionado = esMismaFecha(diaCalendario.fecha, fechaSeleccionada);
  const esPasadaVisible = diaCalendario.esPasada && !diaCalendario.esOtroMes;
  const tieneCitas = diaCalendario.tieneOrdenes && !diaCalendario.esOtroMes;
  const handlePress = useCallback(() => {
    onSelect(diaCalendario.fecha);
  }, [onSelect, diaCalendario.fecha]);

  return (
    <TouchableOpacity
      style={[
        styles.calendarDay,
        diaCalendario.esOtroMes && styles.calendarDayOtherMonth,
        esPasadaVisible && !esSeleccionado && !tieneCitas && styles.calendarDayPast,
        tieneCitas && !esSeleccionado && styles.calendarDayWithOrders,
        tieneCitas && !esSeleccionado && esPasadaVisible && styles.calendarDayPastWithOrders,
        diaCalendario.esHoy && !esSeleccionado && styles.calendarDayToday,
        esSeleccionado && styles.calendarDaySelected,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: esSeleccionado }}
      accessibilityLabel={`${diaCalendario.dia}${tieneCitas ? ', con citas' : ''}`}
    >
      <Text
        style={[
          styles.calendarDayText,
          diaCalendario.esOtroMes && styles.calendarDayTextOtherMonth,
          esPasadaVisible && !esSeleccionado && !tieneCitas && styles.calendarDayTextPast,
          tieneCitas && !esSeleccionado && styles.calendarDayTextWithOrders,
          diaCalendario.esHoy && !esSeleccionado && styles.calendarDayTextToday,
          esSeleccionado && styles.calendarDayTextSelected,
        ]}
      >
        {diaCalendario.dia}
      </Text>
      {tieneCitas ? (
        <View
          style={[
            styles.calendarDayBar,
            esSeleccionado && styles.calendarDayBarOnSelected,
          ]}
        />
      ) : null}
    </TouchableOpacity>
  );
});

const AgendaEventCard = React.memo(function AgendaEventCard({
  evento,
  onPress,
}: {
  evento: EventoAgendaUnificado;
  onPress: (evento: EventoAgendaUnificado) => void;
}) {
  const handlePress = useCallback(() => {
    onPress(evento);
  }, [onPress, evento]);

  const nombreServicio = nombreServicioEvento(evento);
  const precio = evento.precio_referencia
    ? formatearMontoCLP(evento.precio_referencia)
    : '';
  const hora = evento.hora_servicio ? formatearHoraStr(evento.hora_servicio) : null;
  const vehiculo = [evento.vehiculo_marca, evento.vehiculo_modelo]
    .filter(Boolean)
    .join(' ');
  const modalidadLabel = evento.tipo_servicio === 'domicilio' ? 'A domicilio' : 'En taller';

  return (
    <TouchableOpacity
      style={styles.orderListCard}
      onPress={handlePress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`${nombreServicio}, ${evento.cliente_nombre || 'cliente'}`}
    >
      <View style={styles.cardTop}>
        {hora ? <Text style={styles.cardTime}>{hora}</Text> : null}
        <View style={styles.cardTopSpacer} />
        {precio ? <Text style={styles.cardPrice}>{precio}</Text> : null}
      </View>

      <Text style={styles.cardTitle} numberOfLines={2}>
        {nombreServicio}
      </Text>

      <View style={styles.cardTags}>
        <OrigenOrdenBadge origen={evento.origen as OrigenOrden} />
        <InstitutionalTag label={modalidadLabel} variant="neutral" size="sm" />
      </View>

      <View style={styles.cardGuestRow}>
        <View style={styles.cardGuestAvatar}>
          <InstitutionalIcon name="person" size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
        </View>
        <View style={styles.cardGuestCopy}>
          <Text style={styles.cardGuestName} numberOfLines={1}>
            {evento.cliente_nombre || 'Cliente'}
          </Text>
          {vehiculo ? (
            <Text style={styles.cardGuestMeta} numberOfLines={1}>
              {vehiculo}
              {evento.vehiculo_anio ? ` · ${evento.vehiculo_anio}` : ''}
            </Text>
          ) : null}
        </View>
        <ChevronRight size={18} color={I.mutedSoft} strokeWidth={ICON_STROKE_WIDTH} />
      </View>
    </TouchableOpacity>
  );
});

function formatearHoraStr(hora: string) {
  return hora.substring(0, 5);
}

export default function CalendarioScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { estadoProveedor, esMecanicoEquipo, miembroId } = useAuth();
  const { fecha: fechaParam } = useLocalSearchParams<{ fecha?: string }>();
  const cuentaAprobada = estadoProveedor?.estado_verificacion === 'aprobado';
  const { miembros: equipoMiembros } = useEquipoTallerQuery(cuentaAprobada && !esMecanicoEquipo);
  const mecanicos = useMemo(
    () => equipoMiembros.filter((m) => m.rol === 'mecanico' && m.activo),
    [equipoMiembros],
  );
  const [miembroFiltroManual, setMiembroFiltroManual] = useState<number | null>(null);

  const miembroFiltro = useMemo(() => {
    if (esMecanicoEquipo && miembroId) return miembroId;
    return miembroFiltroManual;
  }, [esMecanicoEquipo, miembroId, miembroFiltroManual]);

  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(() => startOfDay(new Date()));
  const [mesActual, setMesActual] = useState(() => startOfDay(new Date()));
  const [agendarOpcionesVisible, setAgendarOpcionesVisible] = useState(false);
  const [agendarModalVisible, setAgendarModalVisible] = useState(false);

  const {
    eventos,
    loading,
    isRefetching,
    refresh,
  } = useAgendaCalendarioQuery({
    mesActual,
    miembroFiltro,
    enabled: cuentaAprobada,
  });

  useFocusEffect(
    useCallback(() => {
      if (fechaParam && typeof fechaParam === 'string') {
        const parsed = parseFechaLocal(fechaParam);
        if (parsed) {
          setFechaSeleccionada(parsed);
          setMesActual(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
        }
      }
    }, [fechaParam]),
  );

  const onRefresh = async () => {
    await refresh();
  };

  const tieneOrdenesEnFecha = useCallback(
    (fecha: Date): boolean => {
      const fechaStr = formatearFechaParaComparar(fecha);
      return eventos.some((evento) => {
        const fechaEvento = parseFechaLocal(evento.fecha_servicio);
        if (!fechaEvento) return false;
        return formatearFechaParaComparar(fechaEvento) === fechaStr;
      });
    },
    [eventos]
  );

  const calendario = useMemo(() => {
    const year = mesActual.getFullYear();
    const month = mesActual.getMonth();

    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);

    const diaInicioSemana = primerDia.getDay();
    const diaInicioAjustado = diaInicioSemana === 0 ? 6 : diaInicioSemana - 1;

    const dias: DiaCalendario[] = [];

    const diasMesAnterior = new Date(year, month, 0).getDate();
    for (let i = diaInicioAjustado - 1; i >= 0; i--) {
      const dia = diasMesAnterior - i;
      const fecha = new Date(year, month - 1, dia);
      dias.push({
        dia,
        fecha,
        tieneOrdenes: tieneOrdenesEnFecha(fecha),
        esHoy: esHoy(fecha),
        esSeleccionado: false,
        esOtroMes: true,
        esPasada: esPasada(fecha),
      });
    }

    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      const fecha = new Date(year, month, dia);
      dias.push({
        dia,
        fecha,
        tieneOrdenes: tieneOrdenesEnFecha(fecha),
        esHoy: esHoy(fecha),
        esSeleccionado: esMismaFecha(fecha, fechaSeleccionada),
        esOtroMes: false,
        esPasada: esPasada(fecha),
      });
    }

    const diasRestantes = 42 - dias.length;
    for (let dia = 1; dia <= diasRestantes; dia++) {
      const fecha = new Date(year, month + 1, dia);
      dias.push({
        dia,
        fecha,
        tieneOrdenes: tieneOrdenesEnFecha(fecha),
        esHoy: esHoy(fecha),
        esSeleccionado: false,
        esOtroMes: true,
        esPasada: esPasada(fecha),
      });
    }

    return dias;
  }, [mesActual, fechaSeleccionada, tieneOrdenesEnFecha]);

  const obtenerEventosDeFecha = useCallback(
    (fecha: Date): EventoAgendaUnificado[] => {
      const fechaStr = formatearFechaParaComparar(fecha);
      return eventos
        .filter((evento) => {
          const fechaEvento = parseFechaLocal(evento.fecha_servicio);
          if (!fechaEvento) return false;
          return formatearFechaParaComparar(fechaEvento) === fechaStr;
        })
        .sort((a, b) => {
          const ha = a.hora_servicio || '00:00';
          const hb = b.hora_servicio || '00:00';
          return ha.localeCompare(hb);
        });
    },
    [eventos]
  );

  const cambiarMes = (direccion: 'anterior' | 'siguiente') => {
    const nuevoMes = new Date(mesActual);
    if (direccion === 'anterior') {
      nuevoMes.setMonth(nuevoMes.getMonth() - 1);
    } else {
      nuevoMes.setMonth(nuevoMes.getMonth() + 1);
    }
    setMesActual(nuevoMes);
  };

  const irAHoy = () => {
    const hoy = startOfDay(new Date());
    setMesActual(hoy);
    setFechaSeleccionada(hoy);
  };

  const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const mesesNombres = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  const eventosFechaSeleccionada = obtenerEventosDeFecha(fechaSeleccionada);

  const onSelectDay = useCallback((d: Date) => {
    const day = startOfDay(d);
    setFechaSeleccionada(day);
    setMesActual((prev) => {
      if (day.getMonth() === prev.getMonth() && day.getFullYear() === prev.getFullYear()) {
        return prev;
      }
      return new Date(day.getFullYear(), day.getMonth(), 1);
    });
  }, []);

  const puedeAgendarEnSeleccion = !esPasada(fechaSeleccionada);

  const handleAgendarCita = useCallback(() => {
    if (!puedeAgendarEnSeleccion) {
      Alert.alert(
        'Fecha no disponible',
        'Solo puedes agendar citas en el día de hoy o en fechas futuras.',
      );
      return;
    }
    setAgendarOpcionesVisible(true);
  }, [puedeAgendarEnSeleccion]);

  const handleAgendarPersonal = useCallback(() => {
    setAgendarOpcionesVisible(false);
    setAgendarModalVisible(true);
  }, []);

  const handleVerSolicitudesDisponibles = useCallback(() => {
    setAgendarOpcionesVisible(false);
    router.push('/solicitudes-disponibles');
  }, []);

  const formatearFechaCompleta = (fecha: Date): string => {
    return fecha.toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleEventoPress = useCallback((evento: EventoAgendaUnificado) => {
    if (evento.origen === 'personal') {
      openCitaPersonalDetalle(router, queryClient, Number(evento.id));
      return;
    }
    if (evento.oferta_proveedor_id) {
      openOfertaDetalle(router, queryClient, evento.oferta_proveedor_id);
    } else if (evento.orden_id) {
      router.push(`/servicio-detalle/${evento.orden_id}`);
    }
  }, [queryClient]);

  return (
    <TabScreenWrapper>
      <Header
        title="Agenda"
        backgroundColor={COLORS.background.default}
        titleColor={I.ink}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.fixed.md }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={I.primary} />
        }
      >
        {loading && eventos.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={I.primary} />
            <Text style={styles.loadingText}>Cargando calendario...</Text>
          </View>
        ) : (
          <>
            {!esMecanicoEquipo && mecanicos.length > 0 ? (
              <View style={styles.mecanicoFilterWrap}>
                <Text style={styles.mecanicoFilterLabel}>Filtrar por mecánico</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mecanicoFilterRow}>
                  <TouchableOpacity
                    style={[styles.mecanicoChip, miembroFiltroManual === null && styles.mecanicoChipActive]}
                    onPress={() => setMiembroFiltroManual(null)}
                  >
                    <Text style={[styles.mecanicoChipText, miembroFiltroManual === null && styles.mecanicoChipTextActive]}>
                      Todos
                    </Text>
                  </TouchableOpacity>
                  {mecanicos.map((m) => {
                    const active = miembroFiltroManual === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.mecanicoChip, active && styles.mecanicoChipActive]}
                        onPress={() => setMiembroFiltroManual(m.id)}
                      >
                        <Text style={[styles.mecanicoChipText, active && styles.mecanicoChipTextActive]}>
                          {m.nombre}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.calendarCard}>
              <View style={styles.monthNavRow}>
                <TouchableOpacity
                  style={styles.monthButton}
                  onPress={() => cambiarMes('anterior')}
                  activeOpacity={0.7}
                  accessibilityLabel="Mes anterior"
                >
                  <InstitutionalIcon name="chevron-back" size={24} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                </TouchableOpacity>

                <View style={styles.monthTitleContainer}>
                  <Text style={styles.monthTitle}>
                    {mesesNombres[mesActual.getMonth()]} {mesActual.getFullYear()}
                  </Text>
                  <InstitutionalButton
                    label="Hoy"
                    variant="outline"
                    size="compact"
                    onPress={irAHoy}
                    style={styles.todayButton}
                  />
                </View>

                <TouchableOpacity
                  style={styles.monthButton}
                  onPress={() => cambiarMes('siguiente')}
                  activeOpacity={0.7}
                  accessibilityLabel="Mes siguiente"
                >
                  <InstitutionalIcon name="chevron-forward" size={24} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                </TouchableOpacity>
              </View>

              <View style={styles.calendarGridSection}>
                <View style={styles.diasSemanaContainer}>
                  {diasSemana.map((dia, index) => (
                    <View key={index} style={styles.diaSemanaHeader}>
                      <Text style={styles.diaSemanaText}>{dia}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {calendario.map((diaCalendario, index) => (
                    <CalendarDayCell
                      key={index}
                      diaCalendario={diaCalendario}
                      fechaSeleccionada={fechaSeleccionada}
                      onSelect={onSelectDay}
                    />
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.ordenesSection}>
              <Text style={styles.ordenesSectionTitle}>{formatearFechaCompleta(fechaSeleccionada)}</Text>

              {eventosFechaSeleccionada.length > 0 ? (
                eventosFechaSeleccionada.map((evento) => (
                  <AgendaEventCard
                    key={`${evento.origen}-${evento.id}`}
                    evento={evento}
                    onPress={handleEventoPress}
                  />
                ))
              ) : (
                <View style={styles.emptyState}>
                  <InstitutionalIcon name="event-busy" size={48} color={I.muted}  strokeWidth={ICON_STROKE_WIDTH} />
                  <Text style={styles.emptyStateText}>
                    {puedeAgendarEnSeleccion
                      ? 'No hay citas para esta fecha'
                      : 'No hay citas registradas en esta fecha'}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {estadoProveedor?.estado_verificacion === 'aprobado' && puedeAgendarEnSeleccion && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + SPACING.fixed.md }]}
          onPress={handleAgendarCita}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="Agendar cita"
        >
          <InstitutionalIcon name="add" size={28} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
        </TouchableOpacity>
      )}

      <BottomSheet visible={agendarOpcionesVisible} onClose={() => setAgendarOpcionesVisible(false)}>
        <Text style={styles.agendarSheetTitle}>¿Qué quieres agendar?</Text>
        <Text style={styles.agendarSheetSubtitle}>
          Elige una cita personal o revisa solicitudes Mecanimovil disponibles.
        </Text>
        <InstitutionalButton
          label="Cita personal"
          onPress={handleAgendarPersonal}
          style={styles.agendarSheetBtn}
        />
        <InstitutionalButton
          label="Ver solicitudes disponibles"
          variant="secondary"
          onPress={handleVerSolicitudesDisponibles}
          style={styles.agendarSheetBtn}
        />
      </BottomSheet>

      <AgendarDesdeCanalModal
        visible={agendarModalVisible}
        onClose={() => setAgendarModalVisible(false)}
        initialFecha={formatDateApi(fechaSeleccionada)}
        subtitle={`Cita para ${formatearFechaCompleta(fechaSeleccionada)}`}
      />
    </TabScreenWrapper>
  );
}

const hx = SPACING.container.horizontal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.fixed['2xl'],
  },
  loadingText: {
    marginTop: SPACING.fixed.md,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  calendarCard: {
    ...institutionalCardStyles.surface,
    marginHorizontal: hx,
    marginTop: SPACING.fixed.md,
    padding: SPACING.fixed.md,
    gap: SPACING.fixed.md,
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: I.surfaceStrong,
  },
  monthTitleContainer: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.fixed.xxs,
  },
  monthTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    textTransform: 'capitalize',
  },
  todayButton: {
    alignSelf: 'center',
    /** Chip de navegación (no CTA primario); más compacto que el botón de acción */
    minHeight: 36,
    paddingVertical: SPACING.fixed.xxs,
    paddingHorizontal: SPACING.fixed.md,
  },
  calendarGridSection: {
    gap: SPACING.fixed.sm,
  },
  diasSemanaContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.fixed.sm,
  },
  diaSemanaHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.fixed.sm,
  },
  diaSemanaText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.body,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    /** Celdas circulares estilo Airbnb Calendar */
    borderRadius: BORDERS.radius.pill,
    padding: 2,
  },
  calendarDayPast: {
    opacity: 0.45,
  },
  calendarDayPastWithOrders: {
    opacity: 0.88,
  },
  calendarDayOtherMonth: {
    opacity: 0.32,
  },
  /** Hoy: anillo ink (el relleno de “con citas” se conserva si aplica). */
  calendarDayToday: {
    borderWidth: 1.5,
    borderColor: I.ink,
  },
  /** Seleccionado: disco ink + texto blanco (Airbnb). */
  calendarDaySelected: {
    backgroundColor: I.ink,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  /** Con citas: relleno tonal + barra inferior (Airbnb busy day). */
  calendarDayWithOrders: {
    backgroundColor: I.surfaceSoft,
    borderWidth: 0,
  },
  calendarDayText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansMedium,
    color: I.ink,
  },
  calendarDayTextOtherMonth: {
    color: I.muted,
  },
  calendarDayTextPast: {
    color: I.muted,
  },
  calendarDayTextToday: {
    color: I.ink,
    fontFamily: FF.sansBold,
  },
  calendarDayTextSelected: {
    color: I.onPrimary,
    fontFamily: FF.sansBold,
  },
  calendarDayTextWithOrders: {
    color: I.ink,
    fontFamily: FF.sansBold,
  },
  calendarDayBar: {
    position: 'absolute',
    bottom: 6,
    width: 14,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: I.ink,
  },
  calendarDayBarOnSelected: {
    backgroundColor: I.onPrimary,
  },
  ordenesSection: {
    paddingHorizontal: hx,
    paddingTop: SPACING.fixed.lg,
    paddingBottom: SPACING.fixed.md,
    gap: SPACING.fixed.sm,
  },
  ordenesSectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginBottom: SPACING.fixed.xs,
    textTransform: 'capitalize',
  },
  /** Card reserva Airbnb Hosts: paper, stack vertical, hora + precio al tope. */
  orderListCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.fixed.md,
    marginBottom: SPACING.fixed.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    gap: SPACING.fixed.sm,
    ...SHADOWS.editorial,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.fixed.sm,
  },
  cardTopSpacer: { flex: 1 },
  cardTime: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    letterSpacing: 0.2,
  },
  cardPrice: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.monoMedium,
    color: I.ink,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.lg * 1.3),
  },
  cardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
  },
  cardGuestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  cardGuestAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: I.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardGuestCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  cardGuestName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansMedium,
    color: I.ink,
  },
  cardGuestMeta: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.fixed['2xl'],
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.body,
    marginTop: SPACING.fixed.md,
  },
  fab: {
    position: 'absolute',
    right: hx,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: I.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.editorial,
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.primary, 0.2),
  },
  agendarSheetTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginBottom: SPACING.fixed.xs,
  },
  agendarSheetSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
    marginBottom: SPACING.fixed.lg,
  },
  agendarSheetBtn: {
    marginBottom: SPACING.fixed.sm,
  },
  mecanicoFilterWrap: {
    marginHorizontal: hx,
    marginBottom: SPACING.fixed.sm,
  },
  mecanicoFilterLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.muted,
    marginBottom: SPACING.fixed.xs,
  },
  mecanicoFilterRow: {
    flexDirection: 'row',
    gap: SPACING.fixed.xs,
    paddingBottom: SPACING.fixed.xxs,
  },
  mecanicoChip: {
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.xs,
    borderRadius: BORDERS.radius.full,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: COLORS.background.paper,
  },
  mecanicoChipActive: {
    backgroundColor: I.primary,
    borderColor: I.primary,
  },
  mecanicoChipText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.body,
  },
  mecanicoChipTextActive: {
    color: I.onPrimary,
  },
});
