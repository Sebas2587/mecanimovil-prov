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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
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
import Header from '@/components/Header';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

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
  const handlePress = useCallback(() => {
    onSelect(diaCalendario.fecha);
  }, [onSelect, diaCalendario.fecha]);

  return (
    <TouchableOpacity
      style={[
        styles.calendarDay,
        diaCalendario.esOtroMes && styles.calendarDayOtherMonth,
        esPasadaVisible
          && !esSeleccionado
          && !diaCalendario.tieneOrdenes
          && styles.calendarDayPast,
        diaCalendario.esHoy && !esSeleccionado && styles.calendarDayToday,
        esSeleccionado && styles.calendarDaySelected,
        diaCalendario.tieneOrdenes
          && !esSeleccionado
          && !diaCalendario.esOtroMes
          && styles.calendarDayWithOrders,
        diaCalendario.tieneOrdenes
          && !esSeleccionado
          && !diaCalendario.esOtroMes
          && esPasadaVisible
          && styles.calendarDayPastWithOrders,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: esSeleccionado }}
      accessibilityLabel={`${diaCalendario.dia}${diaCalendario.tieneOrdenes ? ', con citas' : ''}`}
    >
      <Text
        style={[
          styles.calendarDayText,
          diaCalendario.esOtroMes && styles.calendarDayTextOtherMonth,
          esPasadaVisible && !esSeleccionado && !diaCalendario.tieneOrdenes && styles.calendarDayTextPast,
          diaCalendario.esHoy && !esSeleccionado && styles.calendarDayTextToday,
          esSeleccionado && styles.calendarDayTextSelected,
          diaCalendario.tieneOrdenes
            && !esSeleccionado
            && !diaCalendario.esOtroMes
            && styles.calendarDayTextWithOrders,
        ]}
      >
        {diaCalendario.dia}
      </Text>
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
  const esPersonal = evento.origen === 'personal';
  const badgeBg = esPersonal ? withOpacity(I.primary, 0.12) : withOpacity(I.semanticUp, 0.12);
  const badgeText = esPersonal ? I.primaryActive : I.semanticUp;

  return (
    <TouchableOpacity
      style={styles.orderListCard}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.orderListCardContent}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.orderListCardTitle} numberOfLines={2}>
            {nombreServicio}
          </Text>
          <View style={[styles.origenBadge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.origenBadgeText, { color: badgeText }]}>
              {evento.etiqueta}
            </Text>
          </View>
        </View>

        <Text style={styles.orderListCardDate}>
          {formatearFechaStr(evento.fecha_servicio)}
          {evento.hora_servicio && ` • ${formatearHoraStr(evento.hora_servicio)}`}
        </Text>

        <View style={styles.orderListCardUserSection}>
          <View style={styles.orderListCardUserPhotoPlaceholder}>
            <InstitutionalIcon name="person" size={16} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
          <View style={styles.orderListCardUserInfo}>
            <Text style={styles.orderListCardUserName} numberOfLines={1}>
              {evento.cliente_nombre || 'Cliente'}
            </Text>
            <Text style={styles.orderListCardVehicle} numberOfLines={1}>
              {evento.vehiculo_marca} {evento.vehiculo_modelo}
              {evento.vehiculo_anio ? ` (${evento.vehiculo_anio})` : ''}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.orderListCardRight}>
        <Text style={styles.orderListCardServiceType}>
          {evento.tipo_servicio === 'domicilio' ? 'A domicilio' : 'En taller'}
        </Text>
        {precio ? <Text style={styles.orderListCardPrice}>{precio}</Text> : null}
      </View>
    </TouchableOpacity>
  );
});

function formatearFechaStr(fecha: string) {
  const parsed = parseFechaLocal(fecha);
  if (!parsed) return fecha;
  return parsed.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatearHoraStr(hora: string) {
  return hora.substring(0, 5);
}

export default function CalendarioScreen() {
  const insets = useSafeAreaInsets();
  const { estadoProveedor } = useAuth();
  const { fecha: fechaParam } = useLocalSearchParams<{ fecha?: string }>();
  const cuentaAprobada = estadoProveedor?.estado_verificacion === 'aprobado';

  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(() => startOfDay(new Date()));
  const [mesActual, setMesActual] = useState(() => startOfDay(new Date()));
  const [miembroFiltro, setMiembroFiltro] = useState<number | null>(null);

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

  const { miembros: equipoMiembros } = useEquipoTallerQuery(cuentaAprobada);
  const mecanicos = useMemo(
    () => equipoMiembros.filter((m) => m.rol === 'mecanico'),
    [equipoMiembros],
  );

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
    router.push({
      pathname: '/agendar-cita-personal',
      params: { fecha: formatDateApi(fechaSeleccionada) },
    });
  }, [fechaSeleccionada, puedeAgendarEnSeleccion]);

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
      router.push(`/cita-agenda-personal/${evento.id}`);
      return;
    }
    if (evento.oferta_proveedor_id) {
      router.push(`/oferta-detalle/${evento.oferta_proveedor_id}`);
    } else if (evento.orden_id) {
      router.push(`/servicio-detalle/${evento.orden_id}`);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Header
        title="Calendario"
        showBack
        onBackPress={() => router.back()}
        backgroundColor={I.canvas}
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
            <View style={styles.calendarControls}>
              <TouchableOpacity
                style={styles.monthButton}
                onPress={() => cambiarMes('anterior')}
                activeOpacity={0.7}
              >
                <InstitutionalIcon name="chevron-back" size={24} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
              </TouchableOpacity>

              <View style={styles.monthTitleContainer}>
                <Text style={styles.monthTitle}>
                  {mesesNombres[mesActual.getMonth()]} {mesActual.getFullYear()}
                </Text>
                <TouchableOpacity style={styles.todayButton} onPress={irAHoy} activeOpacity={0.7}>
                  <Text style={styles.todayButtonText}>Hoy</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.monthButton}
                onPress={() => cambiarMes('siguiente')}
                activeOpacity={0.7}
              >
                <InstitutionalIcon name="chevron-forward" size={24} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
              </TouchableOpacity>
            </View>

            {mecanicos.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtroMecanicoRow}
              >
                <TouchableOpacity
                  style={[styles.filtroChip, miembroFiltro === null && styles.filtroChipActive]}
                  onPress={() => setMiembroFiltro(null)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filtroChipText, miembroFiltro === null && styles.filtroChipTextActive]}>
                    Todos
                  </Text>
                </TouchableOpacity>
                {mecanicos.map((m) => {
                  const activo = miembroFiltro === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.filtroChip, activo && styles.filtroChipActive]}
                      onPress={() => setMiembroFiltro(m.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.filtroChipText, activo && styles.filtroChipTextActive]}>{m.nombre}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.calendarContainer}>
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
                  {puedeAgendarEnSeleccion && (
                    <TouchableOpacity
                      style={styles.agendarDiaBtn}
                      onPress={handleAgendarCita}
                      activeOpacity={0.85}
                    >
                      <InstitutionalIcon name="add" size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                      <Text style={styles.agendarDiaBtnText}>Agendar cita en este día</Text>
                    </TouchableOpacity>
                  )}
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
          accessibilityLabel="Agendar cita personal"
        >
          <InstitutionalIcon name="add" size={28} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const hx = SPACING.container.horizontal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
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
  calendarControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.lg,
    backgroundColor: I.canvas,
    marginTop: SPACING.fixed.md,
    marginHorizontal: hx,
    borderRadius: BORDERS.radius.card.xl,
    ...SHADOWS.editorial,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  filtroMecanicoRow: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
    paddingHorizontal: hx,
    paddingTop: SPACING.fixed.md,
  },
  filtroChip: {
    paddingVertical: SPACING.fixed.xs + 2,
    paddingHorizontal: SPACING.fixed.md,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  filtroChipActive: {
    backgroundColor: I.primary,
    borderColor: I.primary,
  },
  filtroChipText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.body,
  },
  filtroChipTextActive: {
    color: I.onPrimary,
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
    paddingHorizontal: SPACING.fixed.sm + 4,
    paddingVertical: SPACING.fixed.xxs,
    borderRadius: BORDERS.radius.sm,
    backgroundColor: I.primary,
  },
  todayButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.onPrimary,
  },
  calendarContainer: {
    backgroundColor: I.canvas,
    marginHorizontal: hx,
    marginTop: SPACING.fixed.lg,
    borderRadius: BORDERS.radius.card.xl,
    padding: SPACING.fixed.md,
    ...SHADOWS.editorial,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
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
    borderRadius: BORDERS.radius.md,
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
  calendarDayToday: {
    backgroundColor: COLORS.primary[50],
    borderWidth: 2,
    borderColor: I.primary,
  },
  calendarDaySelected: {
    backgroundColor: COLORS.primary[100],
    borderWidth: 2,
    borderColor: I.primary,
  },
  calendarDayWithOrders: {
    backgroundColor: withOpacity(I.semanticUp, 0.12),
    borderWidth: BORDERS.width.thin,
    borderColor: I.semanticUp,
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
    color: I.primary,
    fontFamily: FF.sansBold,
  },
  calendarDayTextSelected: {
    color: I.ink,
    fontFamily: FF.sansBold,
  },
  calendarDayTextWithOrders: {
    color: I.semanticUp,
    fontFamily: FF.sansSemiBold,
  },
  ordenesSection: {
    paddingHorizontal: hx,
    paddingTop: SPACING.fixed.lg,
    paddingBottom: SPACING.fixed.md,
  },
  ordenesSectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginBottom: SPACING.fixed.md,
    textTransform: 'capitalize',
  },
  orderListCard: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.card.xl,
    padding: SPACING.fixed.md,
    marginBottom: SPACING.fixed.md,
    ...SHADOWS.editorial,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.fixed.md,
  },
  orderListCardContent: {
    flex: 1,
    gap: SPACING.fixed.sm,
    minWidth: 0,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.xs,
  },
  origenBadge: {
    paddingHorizontal: SPACING.fixed.xs + 2,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.sm,
    flexShrink: 0,
  },
  origenBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  orderListCardTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg + 2,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginBottom: 2,
    lineHeight: Math.round((TYPOGRAPHY.fontSize.lg + 2) * 1.3),
  },
  orderListCardDate: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
    marginBottom: SPACING.fixed.sm,
  },
  orderListCardUserSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
    marginTop: SPACING.fixed.xxs,
  },
  orderListCardUserPhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: I.hairline,
    flexShrink: 0,
  },
  orderListCardUserPhotoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: I.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  orderListCardUserInfo: {
    flex: 1,
    gap: 2,
  },
  orderListCardUserName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansMedium,
    color: I.ink,
  },
  orderListCardVehicle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  orderListCardRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: SPACING.fixed.xxs + 2,
    minWidth: 100,
    flexShrink: 0,
  },
  orderListCardServiceType: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.muted,
    textAlign: 'right',
  },
  orderListCardPrice: {
    fontSize: TYPOGRAPHY.fontSize.lg + 2,
    fontFamily: FF.monoMedium,
    color: I.ink,
    textAlign: 'right',
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
  agendarDiaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    marginTop: SPACING.fixed.md,
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.primary,
  },
  agendarDiaBtnText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.onPrimary,
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
});
