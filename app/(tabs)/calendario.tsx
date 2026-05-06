import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { ordenesProveedorService, type Orden, obtenerNombreSeguro } from '@/services/ordenesProveedor';
import { estadoProveedorReloadKey } from '@/utils/estadoProveedorReloadKey';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS, withOpacity } from '@/app/design-system/tokens';
import Header from '@/components/Header';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

function formatearFechaParaComparar(fecha: Date): string {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function esMismaFecha(fecha1: Date, fecha2: Date): boolean {
  return formatearFechaParaComparar(fecha1) === formatearFechaParaComparar(fecha2);
}

function esHoy(fecha: Date): boolean {
  const hoy = new Date();
  return formatearFechaParaComparar(fecha) === formatearFechaParaComparar(hoy);
}

type DiaCalendario = {
  dia: number;
  fecha: Date;
  tieneOrdenes: boolean;
  esHoy: boolean;
  esSeleccionado: boolean;
  esOtroMes: boolean;
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
  const handlePress = useCallback(() => {
    onSelect(diaCalendario.fecha);
  }, [onSelect, diaCalendario.fecha]);

  return (
    <TouchableOpacity
      style={[
        styles.calendarDay,
        diaCalendario.esOtroMes && styles.calendarDayOtherMonth,
        diaCalendario.esHoy && !esSeleccionado && styles.calendarDayToday,
        esSeleccionado && styles.calendarDaySelected,
        diaCalendario.tieneOrdenes &&
          !esSeleccionado &&
          !diaCalendario.esOtroMes &&
          styles.calendarDayWithOrders,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.calendarDayText,
          diaCalendario.esOtroMes && styles.calendarDayTextOtherMonth,
          diaCalendario.esHoy && !esSeleccionado && styles.calendarDayTextToday,
          esSeleccionado && styles.calendarDayTextSelected,
          diaCalendario.tieneOrdenes &&
            !esSeleccionado &&
            !diaCalendario.esOtroMes &&
            styles.calendarDayTextWithOrders,
        ]}
      >
        {diaCalendario.dia}
      </Text>
    </TouchableOpacity>
  );
});

export default function CalendarioScreen() {
  const insets = useSafeAreaInsets();
  const { estadoProveedor } = useAuth();
  const perfilKey = useMemo(
    () => estadoProveedorReloadKey(estadoProveedor ?? null),
    [estadoProveedor]
  );

  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date());
  const [mesActual, setMesActual] = useState(new Date());

  useEffect(() => {
    if (estadoProveedor?.estado_verificacion === 'aprobado') {
      cargarOrdenes();
    }
  }, [perfilKey]);

  const cargarOrdenes = async () => {
    setLoading(true);
    try {
      const [activasResult, completadasResult] = await Promise.all([
        ordenesProveedorService.obtenerActivas(),
        ordenesProveedorService.obtenerCompletadas(),
      ]);

      const todasLasOrdenes: Orden[] = [];

      if (activasResult.success && activasResult.data) {
        todasLasOrdenes.push(...activasResult.data);
      }

      if (completadasResult.success && completadasResult.data) {
        todasLasOrdenes.push(...completadasResult.data);
      }

      setOrdenes(todasLasOrdenes);
    } catch (error) {
      console.error('Error cargando órdenes:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarOrdenes();
    setRefreshing(false);
  };

  const tieneOrdenesEnFecha = useCallback(
    (fecha: Date): boolean => {
      const fechaStr = formatearFechaParaComparar(fecha);
      return ordenes.some((orden) => {
        const fechaOrden = new Date(orden.fecha_servicio);
        return formatearFechaParaComparar(fechaOrden) === fechaStr;
      });
    },
    [ordenes]
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
      });
    }

    return dias;
  }, [mesActual, fechaSeleccionada, tieneOrdenesEnFecha]);

  const obtenerOrdenesDeFecha = useCallback(
    (fecha: Date): Orden[] => {
      const fechaStr = formatearFechaParaComparar(fecha);
      return ordenes.filter((orden) => {
        const fechaOrden = new Date(orden.fecha_servicio);
        return formatearFechaParaComparar(fechaOrden) === fechaStr;
      });
    },
    [ordenes]
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
    const hoy = new Date();
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

  const ordenesFechaSeleccionada = obtenerOrdenesDeFecha(fechaSeleccionada);

  const onSelectDay = useCallback((d: Date) => {
    setFechaSeleccionada(d);
  }, []);

  const formatearFechaCompleta = (fecha: Date): string => {
    return fecha.toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatearHora = (hora: string) => {
    return hora.substring(0, 5);
  };

  const handleOrdenPress = useCallback((orden: Orden) => {
    const ofertaId = (orden as any).oferta_proveedor_id;
    if (ofertaId) {
      router.push(`/oferta-detalle/${ofertaId}`);
    } else {
      router.push(`/servicio-detalle/${orden.id}`);
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={I.primary} />
        }
      >
        {loading ? (
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

              {ordenesFechaSeleccionada.length > 0 ? (
                ordenesFechaSeleccionada.map((orden) => {
                  const clienteFoto = (orden.cliente_detail as any)?.foto_perfil;
                  const nombreCompleto = obtenerNombreSeguro(orden.cliente_detail);

                  const serviciosNombres = orden.lineas.map((linea) => linea.servicio_nombre);
                  const nombreServicio =
                    serviciosNombres.length > 0
                      ? serviciosNombres.length === 1
                        ? serviciosNombres[0]
                        : serviciosNombres.join(', ')
                      : 'Servicio';

                  const precioFormateado = orden.total
                    ? parseFloat(orden.total.toString().replace(/[^0-9.-]+/g, '')).toLocaleString('es-CL')
                    : '';
                  const precioConSimbolo = precioFormateado ? `$${precioFormateado}` : '';

                  return (
                    <TouchableOpacity
                      key={orden.id}
                      style={styles.orderListCard}
                      onPress={() => handleOrdenPress(orden)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.orderListCardContent}>
                        <Text style={styles.orderListCardTitle} numberOfLines={2}>
                          {nombreServicio}
                        </Text>

                        <Text style={styles.orderListCardDate}>
                          {formatearFecha(orden.fecha_servicio)}
                          {orden.hora_servicio && ` • ${formatearHora(orden.hora_servicio)}`}
                        </Text>

                        <View style={styles.orderListCardUserSection}>
                          {clienteFoto ? (
                            <Image
                              source={{ uri: clienteFoto }}
                              style={styles.orderListCardUserPhoto}
                              onError={() => console.log('Error cargando foto del cliente')}
                            />
                          ) : (
                            <View style={styles.orderListCardUserPhotoPlaceholder}>
                              <InstitutionalIcon name="person" size={16} color={I.onPrimary}  strokeWidth={ICON_STROKE_WIDTH} />
                            </View>
                          )}

                          <View style={styles.orderListCardUserInfo}>
                            <Text style={styles.orderListCardUserName} numberOfLines={1}>
                              {nombreCompleto}
                            </Text>
                            <Text style={styles.orderListCardVehicle} numberOfLines={1}>
                              {orden.vehiculo_detail?.marca} {orden.vehiculo_detail?.modelo}
                              {orden.vehiculo_detail?.año && ` (${orden.vehiculo_detail.año})`}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.orderListCardRight}>
                        <Text style={styles.orderListCardServiceType}>
                          {orden.tipo_servicio === 'domicilio' ? 'A domicilio' : 'En taller'}
                        </Text>

                        {precioConSimbolo ? (
                          <Text style={styles.orderListCardPrice}>{precioConSimbolo}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <InstitutionalIcon name="event-busy" size={48} color={I.muted}  strokeWidth={ICON_STROKE_WIDTH} />
                  <Text style={styles.emptyStateText}>No hay órdenes para esta fecha</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
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
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderRadius: BORDERS.radius.md,
    margin: 2,
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
});
