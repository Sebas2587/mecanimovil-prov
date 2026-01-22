import React, { useState, useEffect, useMemo } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { ordenesProveedorService, type Orden, obtenerNombreSeguro } from '@/services/ordenesProveedor';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';
import Header from '@/components/Header';

export default function CalendarioScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { estadoProveedor } = useAuth();
  
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date());
  const [mesActual, setMesActual] = useState(new Date());

  // Obtener valores seguros del tema
  const safeColors = useMemo(() => theme?.colors || COLORS || {}, [theme]);
  const primaryObj = safeColors?.primary as any;
  const accentObj = safeColors?.accent as any;
  const primary500 = primaryObj?.['500'] || accentObj?.['500'] || '#003459';

  // Cargar órdenes
  useEffect(() => {
    if (estadoProveedor?.verificado) {
      cargarOrdenes();
    }
  }, [estadoProveedor]);

  const cargarOrdenes = async () => {
    setLoading(true);
    try {
      // Cargar órdenes activas y completadas
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

  // Generar calendario mensual
  const generarCalendario = () => {
    const year = mesActual.getFullYear();
    const month = mesActual.getMonth();
    
    // Primer día del mes
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    
    // Día de la semana del primer día (0 = domingo, 1 = lunes, etc.)
    const diaInicioSemana = primerDia.getDay();
    // Ajustar para que lunes sea 0
    const diaInicioAjustado = diaInicioSemana === 0 ? 6 : diaInicioSemana - 1;
    
    const dias: Array<{
      dia: number;
      fecha: Date;
      tieneOrdenes: boolean;
      esHoy: boolean;
      esSeleccionado: boolean;
      esOtroMes: boolean;
    }> = [];

    // Días del mes anterior
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

    // Días del mes actual
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

    // Días del mes siguiente para completar la cuadrícula
    const diasRestantes = 42 - dias.length; // 6 semanas * 7 días
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
  };

  // Verificar si hay órdenes en una fecha
  const tieneOrdenesEnFecha = (fecha: Date): boolean => {
    const fechaStr = formatearFechaParaComparar(fecha);
    return ordenes.some(orden => {
      const fechaOrden = new Date(orden.fecha_servicio);
      return formatearFechaParaComparar(fechaOrden) === fechaStr;
    });
  };

  // Formatear fecha para comparación (YYYY-MM-DD)
  const formatearFechaParaComparar = (fecha: Date): string => {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Verificar si es hoy
  const esHoy = (fecha: Date): boolean => {
    const hoy = new Date();
    return formatearFechaParaComparar(fecha) === formatearFechaParaComparar(hoy);
  };

  // Verificar si es la misma fecha
  const esMismaFecha = (fecha1: Date, fecha2: Date): boolean => {
    return formatearFechaParaComparar(fecha1) === formatearFechaParaComparar(fecha2);
  };

  // Obtener órdenes de la fecha seleccionada
  const obtenerOrdenesDeFecha = (fecha: Date): Orden[] => {
    const fechaStr = formatearFechaParaComparar(fecha);
    return ordenes.filter(orden => {
      const fechaOrden = new Date(orden.fecha_servicio);
      return formatearFechaParaComparar(fechaOrden) === fechaStr;
    });
  };

  // Cambiar mes
  const cambiarMes = (direccion: 'anterior' | 'siguiente') => {
    const nuevoMes = new Date(mesActual);
    if (direccion === 'anterior') {
      nuevoMes.setMonth(nuevoMes.getMonth() - 1);
    } else {
      nuevoMes.setMonth(nuevoMes.getMonth() + 1);
    }
    setMesActual(nuevoMes);
  };

  // Ir a hoy
  const irAHoy = () => {
    const hoy = new Date();
    setMesActual(hoy);
    setFechaSeleccionada(hoy);
  };

  // Nombres de los días de la semana
  const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const mesesNombres = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const calendario = generarCalendario();
  const ordenesFechaSeleccionada = obtenerOrdenesDeFecha(fechaSeleccionada);
  const styles = createStyles();

  // Formatear fecha completa
  const formatearFechaCompleta = (fecha: Date): string => {
    return fecha.toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Formatear fecha (DD/MM/YYYY)
  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Formatear hora (HH:MM)
  const formatearHora = (hora: string) => {
    return hora.substring(0, 5); // HH:MM
  };

  // Obtener color según estado
  const getColorEstado = (estado: string): string => {
    const warningObj = safeColors?.warning as any;
    const infoObj = safeColors?.info as any;
    const successObj = safeColors?.success as any;
    const errorObj = safeColors?.error as any;
    const neutralGray = safeColors?.neutral?.gray as any;
    
    const warningColor = warningObj?.main || warningObj?.['500'] || '#FFB84D';
    const infoColor = infoObj?.main || infoObj?.['500'] || accentObj?.['500'] || '#007EA7';
    const successColor = successObj?.main || successObj?.['500'] || '#00C9A7';
    const errorColor = errorObj?.main || errorObj?.['500'] || '#FF6B6B';
    const neutralColor = neutralGray?.[700] || safeColors?.text?.tertiary || '#5D6F75';

    switch (estado) {
      case 'pendiente_aceptacion_proveedor':
      case 'confirmado':
        return warningColor;
      case 'aceptada_por_proveedor':
      case 'servicio_iniciado':
      case 'en_proceso':
        return infoColor;
      case 'completado':
      case 'completada':
        return successColor;
      case 'cancelado':
      case 'rechazada_por_proveedor':
        return errorColor;
      default:
        return neutralColor;
    }
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Calendario" 
        showBack={true}
        onBackPress={() => router.back()}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={primary500} />
            <Text style={styles.loadingText}>Cargando calendario...</Text>
          </View>
        ) : (
          <>
            {/* Controles del calendario */}
            <View style={styles.calendarControls}>
              <TouchableOpacity
                style={styles.monthButton}
                onPress={() => cambiarMes('anterior')}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={24} color={primary500} />
              </TouchableOpacity>
              
              <View style={styles.monthTitleContainer}>
                <Text style={styles.monthTitle}>
                  {mesesNombres[mesActual.getMonth()]} {mesActual.getFullYear()}
                </Text>
                <TouchableOpacity
                  style={styles.todayButton}
                  onPress={irAHoy}
                  activeOpacity={0.7}
                >
                  <Text style={styles.todayButtonText}>Hoy</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={styles.monthButton}
                onPress={() => cambiarMes('siguiente')}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-forward" size={24} color={primary500} />
              </TouchableOpacity>
            </View>

            {/* Calendario */}
            <View style={styles.calendarContainer}>
              {/* Días de la semana */}
              <View style={styles.diasSemanaContainer}>
                {diasSemana.map((dia, index) => (
                  <View key={index} style={styles.diaSemanaHeader}>
                    <Text style={styles.diaSemanaText}>{dia}</Text>
                  </View>
                ))}
              </View>

              {/* Grid del calendario */}
              <View style={styles.calendarGrid}>
                {calendario.map((diaCalendario, index) => {
                  const esSeleccionado = esMismaFecha(diaCalendario.fecha, fechaSeleccionada);
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.calendarDay,
                        diaCalendario.esOtroMes && styles.calendarDayOtherMonth,
                        diaCalendario.esHoy && !esSeleccionado && styles.calendarDayToday,
                        esSeleccionado && styles.calendarDaySelected,
                        diaCalendario.tieneOrdenes && !esSeleccionado && !diaCalendario.esOtroMes && styles.calendarDayWithOrders,
                      ]}
                      onPress={() => setFechaSeleccionada(diaCalendario.fecha)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          diaCalendario.esOtroMes && styles.calendarDayTextOtherMonth,
                          diaCalendario.esHoy && !esSeleccionado && styles.calendarDayTextToday,
                          esSeleccionado && styles.calendarDayTextSelected,
                          diaCalendario.tieneOrdenes && !esSeleccionado && !diaCalendario.esOtroMes && styles.calendarDayTextWithOrders,
                        ]}
                      >
                        {diaCalendario.dia}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Órdenes de la fecha seleccionada */}
            <View style={styles.ordenesSection}>
              <Text style={styles.ordenesSectionTitle}>
                {formatearFechaCompleta(fechaSeleccionada)}
              </Text>
              
              {ordenesFechaSeleccionada.length > 0 ? (
                ordenesFechaSeleccionada.map((orden) => {
                  const clienteFoto = (orden.cliente_detail as any)?.foto_perfil;
                  const nombreCompleto = obtenerNombreSeguro(orden.cliente_detail);
                  
                  // Obtener nombres de servicios - usar todos los servicios de las líneas
                  const serviciosNombres = orden.lineas.map(linea => linea.servicio_nombre);
                  const nombreServicio = serviciosNombres.length > 0 
                    ? (serviciosNombres.length === 1 
                        ? serviciosNombres[0] 
                        : serviciosNombres.join(', '))
                    : 'Servicio';
                  
                  const precioFormateado = orden.total 
                    ? parseFloat(orden.total.toString().replace(/[^0-9.-]+/g, '')).toLocaleString('es-CL')
                    : '';
                  const precioConSimbolo = precioFormateado ? `$${precioFormateado}` : '';
                  
                  return (
                    <TouchableOpacity
                      key={orden.id}
                      style={styles.orderListCard}
                      onPress={() => {
                        const ofertaId = (orden as any).oferta_proveedor_id;
                        if (ofertaId) {
                          router.push(`/oferta-detalle/${ofertaId}`);
                        } else {
                          router.push(`/servicio-detalle/${orden.id}`);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      {/* Contenido principal */}
                      <View style={styles.orderListCardContent}>
                        {/* Título: Nombre del servicio - debe resaltar */}
                        <Text style={styles.orderListCardTitle} numberOfLines={2}>
                          {nombreServicio}
                        </Text>
                        
                        {/* Fecha */}
                        <Text style={styles.orderListCardDate}>
                          {formatearFecha(orden.fecha_servicio)}
                          {orden.hora_servicio && ` • ${formatearHora(orden.hora_servicio)}`}
                        </Text>

                        {/* Información del usuario */}
                        <View style={styles.orderListCardUserSection}>
                          {/* Foto del usuario (más pequeña, solo informativa) */}
                          {clienteFoto ? (
                            <Image 
                              source={{ uri: clienteFoto }} 
                              style={styles.orderListCardUserPhoto}
                              onError={() => console.log('Error cargando foto del cliente')}
                            />
                          ) : (
                            <View style={styles.orderListCardUserPhotoPlaceholder}>
                              <MaterialIcons name="person" size={16} color={COLORS?.base?.white || '#FFFFFF'} />
                            </View>
                          )}
                          
                          {/* Nombre y vehículo */}
                          <View style={styles.orderListCardUserInfo}>
                            <Text style={styles.orderListCardUserName} numberOfLines={1}>
                              {nombreCompleto}
                            </Text>
                            {/* Marca, modelo, año del auto debajo del nombre */}
                            <Text style={styles.orderListCardVehicle} numberOfLines={1}>
                              {orden.vehiculo_detail?.marca} {orden.vehiculo_detail?.modelo}
                              {orden.vehiculo_detail?.año && ` (${orden.vehiculo_detail.año})`}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Lado derecho: Tipo de servicio y Precio (alineados al final) */}
                      <View style={styles.orderListCardRight}>
                        {/* Tipo de servicio (texto simple, arriba) */}
                        <Text style={styles.orderListCardServiceType}>
                          {orden.tipo_servicio === 'domicilio' ? 'A domicilio' : 'En taller'}
                        </Text>
                        
                        {/* Precio (abajo, debe resaltar) */}
                        {precioConSimbolo && (
                          <Text style={styles.orderListCardPrice}>{precioConSimbolo}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <MaterialIcons name="event-busy" size={48} color={safeColors?.text?.tertiary || '#5D6F75'} />
                  <Text style={styles.emptyStateText}>
                    No hay órdenes para esta fecha
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// Función para crear estilos usando tokens del sistema de diseño
const createStyles = () => {
  const bgPaper = COLORS?.background?.paper || COLORS?.base?.white || '#FFFFFF';
  const bgDefault = COLORS?.background?.default || '#F5F7F8';
  const textPrimary = COLORS?.text?.primary || COLORS?.neutral?.inkBlack || '#00171F';
  const textSecondary = COLORS?.text?.secondary || COLORS?.neutral?.gray?.[800] || '#3E4F53';
  const textTertiary = COLORS?.text?.tertiary || ((COLORS?.neutral?.gray as any)?.[700]) || '#5D6F75';
  const borderLight = COLORS?.border?.light || COLORS?.neutral?.gray?.[200] || '#D7DFE3';
  
  const primaryObj = COLORS?.primary as any;
  const accentObj = COLORS?.accent as any;
  const successObj = COLORS?.success as any;
  const primary500 = primaryObj?.['500'] || accentObj?.['500'] || '#003459';
  const primaryLight = primaryObj?.['50'] || accentObj?.['50'] || '#E6F2F8';
  const success500 = successObj?.['500'] || successObj?.main || '#00C9A7';
  const successLight = successObj?.['50'] || successObj?.light || '#E6F7F4';
  
  const spacingXs = SPACING?.xs || 4;
  const spacingSm = SPACING?.sm || 8;
  const spacingMd = SPACING?.md || 16;
  const spacingLg = SPACING?.lg || 24;
  const containerHorizontal = SPACING?.container?.horizontal || SPACING?.content?.horizontal || 18;
  
  const fontSizeXs = TYPOGRAPHY?.fontSize?.xs || 10;
  const fontSizeSm = TYPOGRAPHY?.fontSize?.sm || 12;
  const fontSizeBase = TYPOGRAPHY?.fontSize?.base || 14;
  const fontSizeMd = TYPOGRAPHY?.fontSize?.md || 16;
  const fontSizeLg = TYPOGRAPHY?.fontSize?.lg || 18;
  const fontSizeXl = TYPOGRAPHY?.fontSize?.xl || 20;
  
  const fontWeightMedium = TYPOGRAPHY?.fontWeight?.medium || '500';
  const fontWeightSemibold = TYPOGRAPHY?.fontWeight?.semibold || '600';
  const fontWeightBold = TYPOGRAPHY?.fontWeight?.bold || '700';
  
  const radiusSm = BORDERS?.radius?.sm || 4;
  const radiusMd = BORDERS?.radius?.md || 8;
  const radiusLg = BORDERS?.radius?.lg || 12;
  const radiusXl = BORDERS?.radius?.xl || 16;
  
  const shadowSm = SHADOWS?.sm || { shadowColor: '#00171F', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 };
  const shadowMd = SHADOWS?.md || { shadowColor: '#00171F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bgDefault,
    },
    scrollView: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacingLg * 2,
    },
    loadingText: {
      marginTop: spacingMd,
      fontSize: fontSizeBase,
      color: textTertiary,
    },
    calendarControls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: containerHorizontal,
      paddingVertical: spacingLg,
      backgroundColor: bgPaper,
      marginTop: spacingMd,
      marginHorizontal: containerHorizontal,
      borderRadius: radiusXl,
      ...shadowSm,
      borderWidth: 1,
      borderColor: borderLight,
    },
    monthButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: bgDefault,
    },
    monthTitleContainer: {
      flex: 1,
      alignItems: 'center',
      gap: spacingXs,
    },
    monthTitle: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
      color: textPrimary,
      textTransform: 'capitalize',
    },
    todayButton: {
      paddingHorizontal: spacingSm + 4,
      paddingVertical: spacingXs,
      borderRadius: radiusSm,
      backgroundColor: primary500,
    },
    todayButtonText: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightSemibold,
      color: COLORS?.base?.white || '#FFFFFF',
    },
    calendarContainer: {
      backgroundColor: bgPaper,
      marginHorizontal: containerHorizontal,
      marginTop: spacingLg,
      borderRadius: radiusXl,
      padding: spacingMd,
      ...shadowMd,
      borderWidth: 1,
      borderColor: borderLight,
    },
    diasSemanaContainer: {
      flexDirection: 'row',
      marginBottom: spacingSm,
    },
    diaSemanaHeader: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacingSm,
    },
    diaSemanaText: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightSemibold,
      color: textSecondary,
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
      borderRadius: radiusMd,
      margin: 2,
    },
    calendarDayOtherMonth: {
      opacity: 0.3,
    },
    calendarDayToday: {
      backgroundColor: primaryLight,
      borderWidth: 2,
      borderColor: primary500,
    },
    calendarDaySelected: {
      backgroundColor: '#D6D8DB',
    },
    calendarDayWithOrders: {
      backgroundColor: successLight,
      borderWidth: 1,
      borderColor: success500,
    },
    calendarDayText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightMedium,
      color: textPrimary,
    },
    calendarDayTextOtherMonth: {
      color: textTertiary,
    },
    calendarDayTextToday: {
      color: primary500,
      fontWeight: fontWeightBold,
    },
    calendarDayTextSelected: {
      color: textPrimary,
      fontWeight: fontWeightBold,
    },
    calendarDayTextWithOrders: {
      color: success500,
      fontWeight: fontWeightSemibold,
    },
    ordenesSection: {
      paddingHorizontal: containerHorizontal,
      paddingTop: spacingLg,
      paddingBottom: spacingMd,
    },
    ordenesSectionTitle: {
      fontSize: fontSizeXl,
      fontWeight: fontWeightBold,
      color: textPrimary,
      marginBottom: spacingMd,
      textTransform: 'capitalize',
    },
    // Estilos para Order List Cards (UI Card format) - Igual que index.tsx
    orderListCard: {
      backgroundColor: bgPaper,
      borderRadius: radiusXl,
      padding: spacingMd,
      marginBottom: spacingMd,
      ...shadowSm,
      borderWidth: 1,
      borderColor: borderLight,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacingMd,
    },
    orderListCardContent: {
      flex: 1,
      gap: spacingSm,
      minWidth: 0,
    },
    orderListCardTitle: {
      fontSize: fontSizeLg + 2, // 20
      fontWeight: fontWeightBold,
      color: textPrimary,
      marginBottom: spacingXs / 2,
      lineHeight: (fontSizeLg + 2) * 1.3,
    },
    orderListCardDate: {
      fontSize: fontSizeSm,
      color: textTertiary,
      marginBottom: spacingSm,
    },
    orderListCardUserSection: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacingSm,
      marginTop: spacingXs,
    },
    orderListCardUserPhoto: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: borderLight,
      flexShrink: 0,
    },
    orderListCardUserPhotoPlaceholder: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: primary500,
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 0,
    },
    orderListCardUserInfo: {
      flex: 1,
      gap: 2,
    },
    orderListCardUserName: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightMedium,
      color: textPrimary,
    },
    orderListCardVehicle: {
      fontSize: fontSizeSm,
      color: textTertiary,
    },
    orderListCardRight: {
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      gap: spacingXs + 2,
      minWidth: 100,
      flexShrink: 0,
    },
    orderListCardServiceType: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightMedium,
      color: textTertiary,
      textAlign: 'right',
    },
    orderListCardPrice: {
      fontSize: fontSizeLg + 2, // 20
      fontWeight: fontWeightBold,
      color: textPrimary,
      textAlign: 'right',
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacingLg * 2,
    },
    emptyStateText: {
      fontSize: fontSizeBase,
      color: textTertiary,
      marginTop: spacingMd,
    },
  });
};

