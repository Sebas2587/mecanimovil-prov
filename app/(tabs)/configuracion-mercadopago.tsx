import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
  FlatList,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack, router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import Header from '@/components/Header';
import mercadoPagoProveedorService, {
  type CuentaMercadoPagoProveedor,
  type EstadisticasPagosMP,
  type EstadoCuentaMP,
  type PagoRecibido,
} from '@/services/mercadoPagoProveedorService';

// Necesario para que WebBrowser pueda completar la sesión de autenticación
WebBrowser.maybeCompleteAuthSession();

export default function ConfiguracionMercadoPagoScreen() {
  const theme = useTheme();
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conectando, setConectando] = useState(false);
  const [desconectando, setDesconectando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Datos
  const [cuenta, setCuenta] = useState<CuentaMercadoPagoProveedor | null>(null);
  const [estadisticas, setEstadisticas] = useState<EstadisticasPagosMP | null>(null);
  const [historialPagos, setHistorialPagos] = useState<PagoRecibido[]>([]);
  
  // Obtener colores del sistema de diseño
  const safeColors = useMemo(() => theme?.colors || COLORS || {}, [theme]);
  const bgPaper = (safeColors?.background as any)?.paper || '#FFFFFF';
  const bgDefault = (safeColors?.background as any)?.default || '#F5F5F5';
  const textPrimary = safeColors?.text?.primary || '#000000';
  const textSecondary = safeColors?.text?.secondary || '#666666';
  const textTertiary = safeColors?.text?.tertiary || '#999999';
  const primary500 = (safeColors?.primary as any)?.['500'] || '#4E4FEB';
  const primaryLight = (safeColors?.primary as any)?.['50'] || '#E6F2FF';
  const success500 = (safeColors?.success as any)?.main || '#3DB6B1';
  const successLight = (safeColors?.success as any)?.light || '#E8F5E9';
  const error500 = (safeColors?.error as any)?.main || '#FF5555';
  const errorLight = (safeColors?.error as any)?.light || '#FFEBEE';
  const warning500 = (safeColors?.warning as any)?.main || '#FFB84D';
  const warningLight = (safeColors?.warning as any)?.light || '#FFF3E0';
  const borderLight = (safeColors?.border as any)?.light || '#EEEEEE';
  const borderMain = (safeColors?.border as any)?.main || '#D0D0D0';
  const neutralGray100 = ((safeColors?.neutral as any)?.gray as any)?.['100'] || '#F5F5F5';

  // Color de Mercado Pago
  const mpBlue = '#009EE3';
  const mpBlueLight = '#E3F6FF';

  // Cargar datos
  const cargarDatos = useCallback(async (isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setLoading(true);
      }
      setError(null);
      
      // Obtener estado de la cuenta
      const cuentaResult = await mercadoPagoProveedorService.obtenerEstadoCuenta();
      if (cuentaResult.success && cuentaResult.data) {
        setCuenta(cuentaResult.data);
        
        // Si la cuenta está conectada, obtener estadísticas e historial
        if (cuentaResult.data.estado === 'conectada') {
          // Cargar estadísticas e historial en paralelo
          const [estadisticasResult, historialResult] = await Promise.all([
            mercadoPagoProveedorService.obtenerEstadisticasPagos(),
            mercadoPagoProveedorService.obtenerHistorialPagos(),
          ]);
          
          if (estadisticasResult.success && estadisticasResult.data) {
            console.log('✅ Estadísticas cargadas:', estadisticasResult.data);
            setEstadisticas(estadisticasResult.data);
          } else {
            console.warn('⚠️ Error cargando estadísticas:', estadisticasResult.error);
            // Inicializar con valores por defecto si hay error
            setEstadisticas({
              total_recibido: 0,
              total_recibido_mes: 0,
              cantidad_transacciones: 0,
              cantidad_transacciones_mes: 0,
              ultima_transaccion: null,
              cantidad_pagos_repuestos: 0,
              total_repuestos: 0,
              moneda: 'CLP'
            });
          }
          
          if (historialResult.success && historialResult.data) {
            console.log('✅ Historial cargado:', historialResult.data.historial?.length || 0, 'pagos');
            setHistorialPagos(historialResult.data.historial || []);
          } else {
            console.warn('⚠️ Error cargando historial:', historialResult.error);
            setHistorialPagos([]);
          }
        }
      } else if (cuentaResult.error) {
        setError(cuentaResult.error);
      }
    } catch (err: any) {
      console.error('Error cargando datos de Mercado Pago:', err);
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Referencia para rastrear si estamos en proceso de conexión OAuth
  const oauthInProgress = useRef(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Listener para detectar cuando la app vuelve del background después de OAuth
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(`📱 AppState cambió: ${appState.current} → ${nextAppState}`);
      
      // Si la app estaba en background/inactive y ahora está activa
      if (
        (appState.current === 'background' || appState.current === 'inactive') &&
        nextAppState === 'active'
      ) {
        // Si estábamos en proceso de OAuth, recargar datos
        if (oauthInProgress.current) {
          console.log('🔄 App volvió de OAuth, recargando datos de Mercado Pago...');
          oauthInProgress.current = false;
          setTimeout(() => {
            cargarDatos(true);
          }, 1000);
        }
      }
      
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [cargarDatos]);

  // Listener para el deep link callback
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      console.log('🔗 Deep link recibido:', event.url);
      
      if (event.url.includes('mercadopago/callback')) {
        console.log('✅ Callback de Mercado Pago recibido, recargando datos...');
        oauthInProgress.current = false;
        setTimeout(() => {
          cargarDatos(true);
        }, 500);
      }
    };

    // Escuchar deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Verificar si la app se abrió con un deep link
    Linking.getInitialURL().then((url) => {
      if (url && url.includes('mercadopago/callback')) {
        console.log('🔗 App iniciada con deep link de callback:', url);
        cargarDatos(true);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [cargarDatos]);

  // Recargar datos cuando la pantalla vuelve a estar en foco
  // Esto es importante para cuando el usuario vuelve del navegador OAuth
  useFocusEffect(
    useCallback(() => {
      // Solo recargar si no está cargando actualmente
      if (!loading && !conectando) {
        console.log('🔄 ConfiguracionMercadoPago: Pantalla en foco, recargando datos...');
        cargarDatos(true);
      }
    }, [loading, conectando, cargarDatos])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    cargarDatos(true);
  }, [cargarDatos]);

  // Manejar conexión de cuenta
  const handleConectarCuenta = async () => {
    try {
      setConectando(true);
      
      const result = await mercadoPagoProveedorService.iniciarConexion();
      
      if (result.success && result.data?.auth_url) {
        // Marcar que estamos en proceso de OAuth para detectar cuando volvamos
        oauthInProgress.current = true;
        
        console.log('🔗 Abriendo navegador para OAuth...');
        console.log('🔗 Auth URL:', result.data.auth_url);
        
        // Usar Linking.openURL simple - es más predecible
        // Cuando el usuario complete el proceso y cierre el navegador,
        // el listener de AppState detectará que volvimos y recargará datos
        const canOpen = await Linking.canOpenURL(result.data.auth_url);
        
        if (canOpen) {
          await Linking.openURL(result.data.auth_url);
          
          // Mostrar alerta informativa
          Alert.alert(
            '📱 Conectar Mercado Pago',
            'Se abrió el navegador para conectar tu cuenta de Mercado Pago.\n\n' +
            '1️⃣ Completa el proceso en el navegador\n' +
            '2️⃣ Presiona "Cerrar y Volver" cuando termine\n' +
            '3️⃣ Los datos se actualizarán automáticamente',
            [{ text: 'Entendido', style: 'default' }]
          );
        } else {
          oauthInProgress.current = false;
          Alert.alert('Error', 'No se pudo abrir el navegador. Por favor intenta de nuevo.');
        }
      } else {
        // Detectar si es un error de configuración del servidor
        const isConfigError = (result as any).isConfigurationError;
        
        if (isConfigError) {
          Alert.alert(
            '⚠️ Configuración Requerida',
            result.error || 'La integración con Mercado Pago no está configurada correctamente en el servidor.\n\n' +
            'Por favor, contacta al equipo de soporte para resolver este problema.',
            [{ text: 'Entendido', style: 'default' }]
          );
        } else {
          Alert.alert('Error', result.error || 'No se pudo iniciar la conexión con Mercado Pago');
        }
        
        // Recargar datos para actualizar el estado de la cuenta
        // (por si el backend marcó la cuenta como pendiente antes del error)
        await cargarDatos();
      }
    } catch (err: any) {
      console.error('Error conectando cuenta MP:', err);
      oauthInProgress.current = false;
      Alert.alert('Error', 'Ocurrió un error al conectar la cuenta. Por favor intenta de nuevo.');
    } finally {
      setConectando(false);
    }
  };

  // Manejar cancelación de conexión pendiente
  const handleCancelarConexion = () => {
    Alert.alert(
      'Cancelar Conexión',
      '¿Estás seguro de que deseas cancelar el proceso de conexión? Podrás intentarlo nuevamente después.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              setDesconectando(true);
              
              const result = await mercadoPagoProveedorService.desconectarCuenta();
              
              if (result.success) {
                Alert.alert('Proceso cancelado', 'Puedes intentar conectar tu cuenta nuevamente cuando lo desees.');
                cargarDatos();
              } else {
                Alert.alert('Error', result.error || 'No se pudo cancelar el proceso');
              }
            } catch (err: any) {
              console.error('Error cancelando conexión MP:', err);
              Alert.alert('Error', 'Ocurrió un error al cancelar el proceso');
            } finally {
              setDesconectando(false);
            }
          }
        }
      ]
    );
  };

  // Manejar desconexión de cuenta
  const handleDesconectarCuenta = () => {
    Alert.alert(
      'Desconectar Mercado Pago',
      '¿Estás seguro de que deseas desconectar tu cuenta de Mercado Pago? No podrás recibir pagos directos de los clientes hasta que la vuelvas a conectar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            try {
              setDesconectando(true);
              
              const result = await mercadoPagoProveedorService.desconectarCuenta();
              
              if (result.success) {
                Alert.alert('Éxito', 'Cuenta de Mercado Pago desconectada correctamente');
                cargarDatos();
              } else {
                Alert.alert('Error', result.error || 'No se pudo desconectar la cuenta');
              }
            } catch (err: any) {
              console.error('Error desconectando cuenta MP:', err);
              Alert.alert('Error', 'Ocurrió un error al desconectar la cuenta');
            } finally {
              setDesconectando(false);
            }
          }
        }
      ]
    );
  };

  // Obtener estilos según el estado
  const getEstadoStyles = (estado: EstadoCuentaMP) => {
    switch (estado) {
      case 'conectada':
        return {
          bgColor: successLight,
          textColor: success500,
          icon: 'check-circle' as const,
        };
      case 'pendiente':
        return {
          bgColor: warningLight,
          textColor: warning500,
          icon: 'schedule' as const,
        };
      case 'error':
      case 'suspendida':
        return {
          bgColor: errorLight,
          textColor: error500,
          icon: 'error' as const,
        };
      case 'desconectada':
        return {
          bgColor: neutralGray100,
          textColor: textTertiary,
          icon: 'link-off' as const,
        };
      case 'no_configurada':
      default:
        return {
          bgColor: mpBlueLight,
          textColor: mpBlue,
          icon: 'add-circle-outline' as const,
        };
    }
  };

  // Renderizar estado de la cuenta
  const renderEstadoCuenta = () => {
    if (!cuenta) return null;
    
    const estadoStyles = getEstadoStyles(cuenta.estado);
    
    return (
      <View style={[styles.card, { backgroundColor: bgPaper, borderColor: borderLight }]}>
        {/* Header del estado */}
        <View style={[styles.estadoHeader, { backgroundColor: estadoStyles.bgColor }]}>
          <MaterialIcons name={estadoStyles.icon} size={32} color={estadoStyles.textColor} />
          <View style={styles.estadoHeaderText}>
            <Text style={[styles.estadoTitulo, { color: estadoStyles.textColor }]}>
              {cuenta.estado_display || getEstadoDisplayText(cuenta.estado)}
            </Text>
            <Text style={[styles.estadoSubtitulo, { color: textSecondary }]}>
              {cuenta.mensaje_estado}
            </Text>
          </View>
        </View>

        {/* Información de la cuenta si está conectada */}
        {cuenta.estado === 'conectada' && cuenta.email_mp && (
          <View style={styles.cuentaInfo}>
            <View style={styles.infoRow}>
              <MaterialIcons name="email" size={20} color={textSecondary} />
              <Text style={[styles.infoText, { color: textPrimary }]}>
                {cuenta.email_mp}
              </Text>
            </View>
            {cuenta.nombre_cuenta && (
              <View style={styles.infoRow}>
                <MaterialIcons name="person" size={20} color={textSecondary} />
                <Text style={[styles.infoText, { color: textPrimary }]}>
                  {cuenta.nombre_cuenta}
                </Text>
              </View>
            )}
            {cuenta.fecha_conexion && (
              <View style={styles.infoRow}>
                <MaterialIcons name="event" size={20} color={textSecondary} />
                <Text style={[styles.infoText, { color: textSecondary }]}>
                  Conectada desde: {new Date(cuenta.fecha_conexion).toLocaleDateString('es-CL')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Botón de acción */}
        <View style={styles.accionesContainer}>
          {cuenta.estado === 'no_configurada' || cuenta.estado === 'desconectada' ? (
            <TouchableOpacity
              style={[styles.botonPrincipal, { backgroundColor: mpBlue }]}
              onPress={handleConectarCuenta}
              disabled={conectando}
              activeOpacity={0.8}
            >
              {conectando ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="link" size={20} color="#FFFFFF" />
                  <Text style={styles.botonPrincipalTexto}>
                    {cuenta.estado === 'desconectada' ? 'Reconectar Cuenta' : 'Conectar Mercado Pago'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : cuenta.estado === 'pendiente' || cuenta.estado === 'error' ? (
            <View style={styles.botonesMultiples}>
              <TouchableOpacity
                style={[styles.botonPrincipal, { backgroundColor: mpBlue, flex: 1 }]}
                onPress={handleConectarCuenta}
                disabled={conectando}
                activeOpacity={0.8}
              >
                {conectando ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="refresh" size={20} color="#FFFFFF" />
                    <Text style={styles.botonPrincipalTexto}>
                      Reintentar Conexión
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.botonSecundario, { borderColor: textSecondary }]}
                onPress={handleCancelarConexion}
                disabled={desconectando}
                activeOpacity={0.8}
              >
                {desconectando ? (
                  <ActivityIndicator size="small" color={textSecondary} />
                ) : (
                  <>
                    <MaterialIcons name="close" size={20} color={textSecondary} />
                    <Text style={[styles.botonSecundarioTexto, { color: textSecondary }]}>
                      Cancelar
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : cuenta.estado === 'conectada' ? (
            <TouchableOpacity
              style={[styles.botonSecundario, { borderColor: error500 }]}
              onPress={handleDesconectarCuenta}
              disabled={desconectando}
              activeOpacity={0.8}
            >
              {desconectando ? (
                <ActivityIndicator size="small" color={error500} />
              ) : (
                <>
                  <MaterialIcons name="link-off" size={20} color={error500} />
                  <Text style={[styles.botonSecundarioTexto, { color: error500 }]}>
                    Desconectar Cuenta
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  // Renderizar estadísticas de pagos
  const renderEstadisticas = () => {
    if (cuenta?.estado !== 'conectada') {
      console.log('⚠️ Cuenta no conectada, no se muestran estadísticas. Estado:', cuenta?.estado);
      return null;
    }
    
    // Mostrar estadísticas incluso si están en 0 o no están disponibles
    // Esto ayuda a identificar si el problema es que no hay datos o que no se están cargando
    if (!estadisticas) {
      console.log('⚠️ Estadísticas no disponibles, mostrando valores por defecto');
      // Mostrar card con valores en 0 para indicar que no hay datos
      return (
        <View style={[styles.card, { backgroundColor: bgPaper, borderColor: borderLight }]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="bar-chart" size={24} color={primary500} />
            <Text style={[styles.cardTitle, { color: textPrimary }]}>
              Estadísticas de Pagos
            </Text>
          </View>
          <View style={styles.emptyHistorial}>
            <MaterialIcons name="info" size={48} color={textTertiary} />
            <Text style={[styles.emptyHistorialTexto, { color: textSecondary }]}>
              Cargando estadísticas...
            </Text>
          </View>
        </View>
      );
    }
    
    console.log('📊 Renderizando estadísticas:', estadisticas);
    
    return (
      <View style={[styles.card, { backgroundColor: bgPaper, borderColor: borderLight }]}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="bar-chart" size={24} color={primary500} />
          <Text style={[styles.cardTitle, { color: textPrimary }]}>
            Estadísticas de Pagos
          </Text>
        </View>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: success500 }]}>
              {mercadoPagoProveedorService.formatearMonto(estadisticas.total_recibido_mes)}
            </Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>
              Recibido este mes
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: primary500 }]}>
              {estadisticas.cantidad_transacciones_mes}
            </Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>
              Transacciones
            </Text>
          </View>
        </View>
        
        <View style={[styles.divider, { backgroundColor: borderLight }]} />
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: textPrimary }]}>
              {mercadoPagoProveedorService.formatearMonto(estadisticas.total_recibido)}
            </Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>
              Total recibido
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: textPrimary }]}>
              {estadisticas.cantidad_transacciones}
            </Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>
              Total transacciones
            </Text>
          </View>
        </View>
        
        {estadisticas.ultima_transaccion && (
          <View style={[styles.ultimaTransaccion, { backgroundColor: neutralGray100 }]}>
            <MaterialIcons name="access-time" size={16} color={textSecondary} />
            <Text style={[styles.ultimaTransaccionTexto, { color: textSecondary }]}>
              Última transacción: {new Date(estadisticas.ultima_transaccion).toLocaleDateString('es-CL')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Renderizar un item del historial de pagos (estilo lista clásica)
  const renderPagoItem = ({ item }: { item: PagoRecibido }) => {
    // Formatear fecha y hora de forma breve
    const fechaFormateada = item.fecha 
      ? new Date(item.fecha).toLocaleDateString('es-CL', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'Fecha no disponible';
    
    // Obtener etiqueta breve del servicio (solo el primer servicio o los primeros caracteres)
    const serviciosTexto = item.servicios || 'Servicio';
    const servicioBreve = serviciosTexto.length > 35 
      ? serviciosTexto.substring(0, 35) + '...' 
      : serviciosTexto;
    
    return (
      <>
        {/* Icono a la izquierda */}
        <View style={[styles.pagoListIcon, { backgroundColor: successLight, borderColor: borderLight }]}>
          <MaterialIcons name="payments" size={20} color={success500} />
        </View>
        
        {/* Información principal en el medio */}
        <View style={styles.pagoListInfo}>
          <Text style={[styles.pagoListCliente, { color: textPrimary }]} numberOfLines={1}>
            {item.cliente_nombre || 'Cliente'}
          </Text>
          <Text style={[styles.pagoListServicio, { color: textSecondary }]} numberOfLines={1}>
            {servicioBreve}
          </Text>
          <View style={styles.pagoListMeta}>
            <MaterialIcons name="access-time" size={12} color={textTertiary} />
            <Text style={[styles.pagoListFecha, { color: textTertiary }]}>
              {fechaFormateada}
            </Text>
          </View>
        </View>
        
        {/* Monto y badge a la derecha */}
        <View style={styles.pagoListRight}>
          <Text style={[styles.pagoListMonto, { color: success500 }]}>
            {mercadoPagoProveedorService.formatearMonto(item.monto)}
          </Text>
          {item.estado_oferta === 'pagada_parcialmente' && (
            <View style={[styles.pagoListBadge, { backgroundColor: warningLight }]}>
              <Text style={[styles.pagoListBadgeText, { color: warning500 }]}>
                Parcial
              </Text>
            </View>
          )}
        </View>
      </>
    );
  };

  // Renderizar historial de pagos
  const renderHistorialPagos = () => {
    if (cuenta?.estado !== 'conectada') {
      console.log('⚠️ Cuenta no conectada, no se muestra historial. Estado:', cuenta?.estado);
      return null;
    }
    
    console.log('📋 Renderizando historial. Total pagos:', historialPagos.length);
    
    return (
      <View style={[styles.card, { backgroundColor: bgPaper, borderColor: borderLight }]}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="receipt-long" size={24} color={mpBlue} />
          <Text style={[styles.cardTitle, { color: textPrimary }]}>
            Pagos Recibidos
          </Text>
          {historialPagos.length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: mpBlueLight }]}>
              <Text style={[styles.countBadgeText, { color: mpBlue }]}>
                {historialPagos.length}
              </Text>
            </View>
          )}
        </View>
        
        {historialPagos.length === 0 ? (
          <View style={styles.emptyHistorial}>
            <MaterialIcons name="inbox" size={48} color={textTertiary} />
            <Text style={[styles.emptyHistorialTexto, { color: textSecondary }]}>
              Aún no has recibido pagos
            </Text>
            <Text style={[styles.emptyHistorialSubtexto, { color: textTertiary }]}>
              Cuando los clientes paguen tus servicios, aparecerán aquí
            </Text>
          </View>
        ) : (
          <View style={styles.historialLista}>
            {historialPagos.slice(0, 10).map((pago, index) => {
              const isLast = index === Math.min(historialPagos.length, 10) - 1;
              return (
                <View 
                  key={pago.id}
                  style={[
                    styles.pagoListItem, 
                    { 
                      borderBottomColor: borderLight,
                      borderBottomWidth: isLast ? 0 : 1,
                    }
                  ]}
                >
                  {renderPagoItem({ item: pago })}
                </View>
              );
            })}
            {historialPagos.length > 10 && (
              <TouchableOpacity 
                style={[styles.verMasButton, { borderColor: mpBlue, marginTop: SPACING?.md || 16, marginHorizontal: SPACING?.md || 16 }]}
                onPress={() => Alert.alert('Info', 'Funcionalidad de ver más próximamente')}
              >
                <Text style={[styles.verMasTexto, { color: mpBlue }]}>
                  Ver más ({historialPagos.length - 10} restantes)
                </Text>
                <MaterialIcons name="chevron-right" size={20} color={mpBlue} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  // Renderizar información sobre Mercado Pago
  const renderInfoMercadoPago = () => (
    <View style={[styles.card, { backgroundColor: bgPaper, borderColor: borderLight }]}>
      <View style={styles.cardHeader}>
        <MaterialIcons name="info-outline" size={24} color={mpBlue} />
        <Text style={[styles.cardTitle, { color: textPrimary }]}>
          ¿Por qué conectar Mercado Pago?
        </Text>
      </View>
      
      <View style={styles.beneficiosList}>
        <View style={styles.beneficioItem}>
          <View style={[styles.beneficioIcon, { backgroundColor: successLight }]}>
            <MaterialIcons name="payments" size={20} color={success500} />
          </View>
          <View style={styles.beneficioTexto}>
            <Text style={[styles.beneficioTitulo, { color: textPrimary }]}>
              Pagos directos
            </Text>
            <Text style={[styles.beneficioDescripcion, { color: textSecondary }]}>
              Recibe el pago de tus servicios directamente en tu cuenta
            </Text>
          </View>
        </View>
        
        <View style={styles.beneficioItem}>
          <View style={[styles.beneficioIcon, { backgroundColor: primaryLight }]}>
            <MaterialIcons name="speed" size={20} color={primary500} />
          </View>
          <View style={styles.beneficioTexto}>
            <Text style={[styles.beneficioTitulo, { color: textPrimary }]}>
              Cobros inmediatos
            </Text>
            <Text style={[styles.beneficioDescripcion, { color: textSecondary }]}>
              Los clientes pagan al confirmar el servicio
            </Text>
          </View>
        </View>
        
        <View style={styles.beneficioItem}>
          <View style={[styles.beneficioIcon, { backgroundColor: mpBlueLight }]}>
            <MaterialIcons name="security" size={20} color={mpBlue} />
          </View>
          <View style={styles.beneficioTexto}>
            <Text style={[styles.beneficioTitulo, { color: textPrimary }]}>
              Seguro y confiable
            </Text>
            <Text style={[styles.beneficioDescripcion, { color: textSecondary }]}>
              Respaldado por Mercado Pago con protección al vendedor
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  // Función segura para volver atrás
  // En Expo Router, router.back() muestra un warning si no hay pantalla anterior
  // Para evitar el warning, navegamos directamente a la pantalla de perfil
  // ya que esta pantalla generalmente se accede desde el perfil
  const handleGoBack = useCallback(() => {
    // Navegar directamente a la pantalla de perfil para evitar el warning
    // cuando no hay pantalla anterior en el stack
    router.replace('/(tabs)/perfil');
  }, []);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgDefault }]} edges={[]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header 
          title="Mercado Pago" 
          showBack={true}
          onBackPress={handleGoBack}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={mpBlue} />
          <Text style={[styles.loadingText, { color: textSecondary }]}>
            Cargando configuración...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgDefault }]} edges={[]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header 
        title="Mercado Pago" 
        showBack={true}
        onBackPress={handleGoBack}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[mpBlue]}
            tintColor={mpBlue}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={[styles.errorCard, { backgroundColor: errorLight, borderColor: error500 }]}>
            <MaterialIcons name="error-outline" size={24} color={error500} />
            <Text style={[styles.errorText, { color: error500 }]}>{error}</Text>
            <TouchableOpacity onPress={() => cargarDatos()}>
              <Text style={[styles.errorRetry, { color: error500 }]}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {renderEstadoCuenta()}
        {renderEstadisticas()}
        {renderHistorialPagos()}
        {renderInfoMercadoPago()}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper function para obtener texto de estado
const getEstadoDisplayText = (estado: EstadoCuentaMP): string => {
  switch (estado) {
    case 'conectada':
      return 'Cuenta Conectada';
    case 'pendiente':
      return 'Conexión Pendiente';
    case 'error':
      return 'Error de Conexión';
    case 'suspendida':
      return 'Cuenta Suspendida';
    case 'desconectada':
      return 'Cuenta Desconectada';
    case 'no_configurada':
    default:
      return 'Sin Configurar';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING?.md || 16,
    gap: SPACING?.md || 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING?.md || 16,
  },
  loadingText: {
    fontSize: TYPOGRAPHY?.fontSize?.md || 16,
  },
  card: {
    borderRadius: BORDERS?.radius?.xl || 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...((SHADOWS?.sm as object) || {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING?.sm || 8,
    padding: SPACING?.md || 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  cardTitle: {
    fontSize: TYPOGRAPHY?.fontSize?.lg || 18,
    fontWeight: TYPOGRAPHY?.fontWeight?.semibold || '600',
    flex: 1,
  },
  estadoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING?.md || 16,
    padding: SPACING?.lg || 24,
  },
  estadoHeaderText: {
    flex: 1,
  },
  estadoTitulo: {
    fontSize: TYPOGRAPHY?.fontSize?.xl || 20,
    fontWeight: TYPOGRAPHY?.fontWeight?.bold || '700',
    marginBottom: SPACING?.xs || 4,
  },
  estadoSubtitulo: {
    fontSize: TYPOGRAPHY?.fontSize?.sm || 14,
    lineHeight: 20,
  },
  cuentaInfo: {
    padding: SPACING?.md || 16,
    gap: SPACING?.sm || 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING?.sm || 8,
  },
  infoText: {
    fontSize: TYPOGRAPHY?.fontSize?.md || 16,
    flex: 1,
  },
  accionesContainer: {
    padding: SPACING?.md || 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  botonPrincipal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING?.sm || 8,
    paddingVertical: SPACING?.md || 16,
    paddingHorizontal: SPACING?.lg || 24,
    borderRadius: BORDERS?.radius?.lg || 12,
  },
  botonPrincipalTexto: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY?.fontSize?.md || 16,
    fontWeight: TYPOGRAPHY?.fontWeight?.semibold || '600',
  },
  botonSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING?.sm || 8,
    paddingVertical: SPACING?.md || 16,
    paddingHorizontal: SPACING?.lg || 24,
    borderRadius: BORDERS?.radius?.lg || 12,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  botonSecundarioTexto: {
    fontSize: TYPOGRAPHY?.fontSize?.md || 16,
    fontWeight: TYPOGRAPHY?.fontWeight?.semibold || '600',
  },
  botonesMultiples: {
    gap: SPACING?.sm || 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: SPACING?.md || 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: TYPOGRAPHY?.fontSize?.['2xl'] || 24,
    fontWeight: TYPOGRAPHY?.fontWeight?.bold || '700',
    marginBottom: SPACING?.xs || 4,
  },
  statLabel: {
    fontSize: TYPOGRAPHY?.fontSize?.sm || 14,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    marginHorizontal: SPACING?.md || 16,
  },
  ultimaTransaccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING?.xs || 4,
    margin: SPACING?.md || 16,
    marginTop: 0,
    padding: SPACING?.sm || 8,
    borderRadius: BORDERS?.radius?.md || 8,
  },
  ultimaTransaccionTexto: {
    fontSize: TYPOGRAPHY?.fontSize?.sm || 14,
  },
  beneficiosList: {
    padding: SPACING?.md || 16,
    gap: SPACING?.md || 16,
  },
  beneficioItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING?.md || 16,
  },
  beneficioIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  beneficioTexto: {
    flex: 1,
  },
  beneficioTitulo: {
    fontSize: TYPOGRAPHY?.fontSize?.md || 16,
    fontWeight: TYPOGRAPHY?.fontWeight?.semibold || '600',
    marginBottom: SPACING?.xs || 4,
  },
  beneficioDescripcion: {
    fontSize: TYPOGRAPHY?.fontSize?.sm || 14,
    lineHeight: 20,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING?.sm || 8,
    padding: SPACING?.md || 16,
    borderRadius: BORDERS?.radius?.lg || 12,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontSize: TYPOGRAPHY?.fontSize?.sm || 14,
  },
  errorRetry: {
    fontSize: TYPOGRAPHY?.fontSize?.sm || 14,
    fontWeight: TYPOGRAPHY?.fontWeight?.semibold || '600',
    textDecorationLine: 'underline',
  },
  bottomSpacing: {
    height: SPACING?.xl || 32,
  },
  // Estilos para el historial de pagos (estilo lista clásica)
  countBadge: {
    paddingHorizontal: SPACING?.sm || 8,
    paddingVertical: SPACING?.xs || 4,
    borderRadius: BORDERS?.radius?.full || 9999,
    minWidth: 28,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: TYPOGRAPHY?.fontSize?.sm || 14,
    fontWeight: TYPOGRAPHY?.fontWeight?.bold || '700',
  },
  historialLista: {
    paddingHorizontal: 0, // Sin padding horizontal, el padding viene del card
  },
  pagoListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING?.md || 16,
    paddingHorizontal: SPACING?.md || 16,
    gap: SPACING?.md || 16,
  },
  pagoListIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  pagoListInfo: {
    flex: 1,
    gap: SPACING?.xs || 4,
  },
  pagoListCliente: {
    fontSize: TYPOGRAPHY?.fontSize?.md || 16,
    fontWeight: TYPOGRAPHY?.fontWeight?.semibold || '600',
  },
  pagoListServicio: {
    fontSize: TYPOGRAPHY?.fontSize?.sm || 14,
  },
  pagoListMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING?.xs || 4,
    marginTop: SPACING?.xs || 4,
  },
  pagoListFecha: {
    fontSize: TYPOGRAPHY?.fontSize?.xs || 12,
  },
  pagoListRight: {
    alignItems: 'flex-end',
    gap: SPACING?.xs || 4,
  },
  pagoListMonto: {
    fontSize: TYPOGRAPHY?.fontSize?.lg || 18,
    fontWeight: TYPOGRAPHY?.fontWeight?.bold || '700',
  },
  pagoListBadge: {
    paddingHorizontal: SPACING?.sm || 8,
    paddingVertical: SPACING?.xs || 4,
    borderRadius: BORDERS?.radius?.sm || 6,
  },
  pagoListBadgeText: {
    fontSize: TYPOGRAPHY?.fontSize?.xs || 12,
    fontWeight: TYPOGRAPHY?.fontWeight?.medium || '500',
  },
  emptyHistorial: {
    alignItems: 'center',
    padding: SPACING?.xl || 32,
    gap: SPACING?.sm || 8,
  },
  emptyHistorialTexto: {
    fontSize: TYPOGRAPHY?.fontSize?.md || 16,
    fontWeight: TYPOGRAPHY?.fontWeight?.medium || '500',
    textAlign: 'center',
  },
  emptyHistorialSubtexto: {
    fontSize: TYPOGRAPHY?.fontSize?.sm || 14,
    textAlign: 'center',
  },
  verMasButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING?.md || 16,
    borderWidth: 1,
    borderRadius: BORDERS?.radius?.lg || 12,
    gap: SPACING?.xs || 4,
  },
  verMasTexto: {
    fontSize: TYPOGRAPHY?.fontSize?.md || 16,
    fontWeight: TYPOGRAPHY?.fontWeight?.medium || '500',
  },
});

