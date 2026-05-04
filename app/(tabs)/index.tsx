import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
  Switch,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell, Wallet, DollarSign, Radar, Calendar,
  ShieldCheck, Clock,
  TrendingUp, TrendingDown, ChevronRight, Search,
  Wrench, Settings, Map, MapPin, AlertTriangle, CreditCard,
  Wifi,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useRadarOportunidades } from '@/context/RadarOportunidadesContext';
import { router, useFocusEffect } from 'expo-router';
import EstadoRevisionScreen from '@/components/EstadoRevisionScreen';
import { ordenesProveedorService } from '@/services/ordenesProveedor';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import solicitudesService, { type SolicitudPublica } from '@/services/solicitudesService';
import websocketService, { type NuevaSolicitudEvent } from '@/app/services/websocketService';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';
import creditosService, { type CreditoProveedor } from '@/services/creditosService';
import mercadoPagoProveedorService, { type EstadisticasPagosMP } from '@/services/mercadoPagoProveedorService';
import { SaldoCreditos } from '@/components/creditos';
import { HomeRadarSolicitudItem } from '@/components/solicitudes/HomeRadarSolicitudItem';
import AlertaPagoExpirado from '@/components/alerts/AlertaPagoExpirado';
import { useAlerts } from '@/context/AlertsContext';
import suscripcionesService, { type SuscripcionProveedor, type SaludSuscripcion } from '@/services/suscripcionesService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PerformanceWidget } from '@/components/dashboard/PerformanceWidget';
import { useProveedorKpisResumen } from '@/hooks/useProveedorKpisResumen';
import { estadoProveedorReloadKey } from '@/utils/estadoProveedorReloadKey';
import { devLog, devWarn } from '@/utils/devLog';

export default function HomeScreen() {
  // Hook del sistema de diseño - acceso seguro a tokens
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { verificarYGenerarAlertas, saludSuscripcion, alertasNoLeidas } = useAlerts();

  const {
    isAuthenticated,
    isLoading,
    estadoProveedor,
    usuario,
    obtenerNombreProveedor
  } = useAuth();

  const {
    radarOportunidadesActivo,
    radarPreferenciaCargada,
    setRadarOportunidadesActivo,
  } = useRadarOportunidades();

  const esMecanicoDomicilio = estadoProveedor?.tipo_proveedor === 'mecanico';
  /** Habilitado por admin para operar (≠ sello "Verificado" en perfil). */
  const cuentaAprobadaPorAdmin = estadoProveedor?.estado_verificacion === 'aprobado';
  const perfilProveedorKey = useMemo(
    () => estadoProveedorReloadKey(estadoProveedor ?? null),
    [estadoProveedor]
  );
  const kpisResumen = useProveedorKpisResumen({
    enabled: Boolean(isAuthenticated && cuentaAprobadaPorAdmin && !isLoading),
    dias: 30,
  });

  /** Misma lectura que el hero de `RendimientoKpisContent` (ventana 30 días en home). */
  const rendimientoWidgetPeriod = useMemo(() => {
    if (kpisResumen.data) {
      const d = kpisResumen.data.ventana_dias;
      return `Combina ofertas, reseñas, checklist y tiempos (últimos ${d} días con actividad).`;
    }
    if (kpisResumen.loading) {
      return `Últimos ${kpisResumen.ventanaDiasMostrada} días con actividad · cargando…`;
    }
    if (kpisResumen.error) {
      return 'No se pudo cargar. Entra para reintentar.';
    }
    return `Últimos ${kpisResumen.ventanaDiasMostrada} días · mismo índice que en detalle`;
  }, [
    kpisResumen.data,
    kpisResumen.loading,
    kpisResumen.error,
    kpisResumen.ventanaDiasMostrada,
  ]);
  const [refreshing, setRefreshing] = useState(false);

  // Estado para estadísticas semanales
  const [estadisticasSemanales, setEstadisticasSemanales] = useState<{
    dinero: number;
    cantidadServicios: number;
  }>({ dinero: 0, cantidadServicios: 0 });

  // Estado para solicitudes disponibles
  const [solicitudesDisponibles, setSolicitudesDisponibles] = useState<SolicitudPublica[]>([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [nuevasSolicitudesIds, setNuevasSolicitudesIds] = useState<Set<string>>(new Set());

  // Estado para suscripción
  const [suscripcion, setSuscripcion] = useState<SuscripcionProveedor | null>(null);
  const [loadingSuscripcion, setLoadingSuscripcion] = useState(false);

  // Estado para créditos
  const [saldoCreditos, setSaldoCreditos] = useState<CreditoProveedor | null>(null);

  // Estado para estadísticas de MercadoPago
  const [estadisticasMP, setEstadisticasMP] = useState<EstadisticasPagosMP | null>(null);

  // Estado para alertas de pago expirado
  const [mostrarAlertaPago, setMostrarAlertaPago] = useState(false);
  const [alertaMensaje, setAlertaMensaje] = useState('');
  const [alertaTipo, setAlertaTipo] = useState<'expirado' | 'cancelado'>('expirado');
  const [alertaOfertaId, setAlertaOfertaId] = useState<string | undefined>(undefined);
  const [alertaSolicitudId, setAlertaSolicitudId] = useState<string | undefined>(undefined);
  const [alertaCreditosDevueltos, setAlertaCreditosDevueltos] = useState(false);

  const [radarSwitchLoading, setRadarSwitchLoading] = useState(false);

  // Animación de pulso para notificaciones y badges
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Obtener valores seguros del tema con fallbacks
  const safeColors = useMemo(() => {
    return theme?.colors || COLORS || {};
  }, [theme]);

  const safeSpacing = useMemo(() => {
    return theme?.spacing || SPACING || {};
  }, [theme]);

  const safeTypography = useMemo(() => {
    return theme?.typography || TYPOGRAPHY || {};
  }, [theme]);

  const safeShadows = useMemo(() => {
    return theme?.shadows || SHADOWS || {};
  }, [theme]);

  const safeBorders = useMemo(() => {
    return theme?.borders || BORDERS || {};
  }, [theme]);

  const handlePerformanceWidgetPress = useCallback(() => {
    router.push('/rendimiento-kpis');
  }, []);

  const handleOpenSolicitudDetalle = useCallback((solicitudId: string) => {
    router.push(`/solicitud-detalle/${solicitudId}`);
  }, []);

  const handleVerSolicitudesDisponibles = useCallback(() => {
    router.push('/solicitudes-disponibles');
  }, []);

  const handleRadarOportunidadesToggle = useCallback(
    async (activo: boolean) => {
      setRadarSwitchLoading(true);
      try {
        await setRadarOportunidadesActivo(activo);
      } finally {
        setRadarSwitchLoading(false);
      }
    },
    [setRadarOportunidadesActivo]
  );

  // Redirigir al onboarding si el usuario no tiene perfil
  useEffect(() => {
    if (!isLoading && estadoProveedor) {
      if (!estadoProveedor.tiene_perfil || estadoProveedor.necesita_onboarding) {
        devLog('Usuario sin perfil de proveedor, redirigiendo al onboarding');
        router.replace('/(onboarding)/tipo-cuenta');
      }
    }
  }, [isLoading, estadoProveedor]);

  // Cargar dashboard solo cuando cambia el perfil de verdad (no en cada refresco con misma data).
  useEffect(() => {
    if (cuentaAprobadaPorAdmin) {
      cargarEstadisticasSemanales();
      if (radarPreferenciaCargada && radarOportunidadesActivo) {
        cargarSolicitudesDisponibles();
      }
      cargarCreditos();
      cargarEstadisticasMP();
      cargarSuscripcion();
    }
  }, [perfilProveedorKey, cuentaAprobadaPorAdmin, radarOportunidadesActivo, radarPreferenciaCargada]);

  // Recargar órdenes cuando la pantalla recibe foco (cuando se regresa del detalle)
  useFocusEffect(
    React.useCallback(() => {
      if (cuentaAprobadaPorAdmin) {
        cargarEstadisticasSemanales();
        if (radarPreferenciaCargada && radarOportunidadesActivo) {
          cargarSolicitudesDisponibles();
        }
        cargarCreditos();
        cargarEstadisticasMP();
        cargarSuscripcion();
        verificarYGenerarAlertas();
        kpisResumen.refresh();
      }
    }, [cuentaAprobadaPorAdmin, kpisResumen.refresh, radarOportunidadesActivo, radarPreferenciaCargada])
  );

  useEffect(() => {
    if (radarPreferenciaCargada && !radarOportunidadesActivo) {
      setSolicitudesDisponibles([]);
    }
  }, [radarOportunidadesActivo, radarPreferenciaCargada]);

  // Cargar saldo de créditos
  const cargarCreditos = async () => {
    try {
      const result = await creditosService.obtenerSaldo();
      if (result.success && result.data) {
        setSaldoCreditos(result.data);
      } else {
        devWarn('Error cargando saldo de créditos:', result.error);
      }
    } catch (error) {
      console.error('Error cargando créditos:', error);
    }
  };

  // Cargar estadísticas de MercadoPago
  const cargarEstadisticasMP = async () => {
    try {
      const result = await mercadoPagoProveedorService.obtenerEstadisticasPagos();
      if (result.success && result.data) {
        setEstadisticasMP(result.data);
      } else {
        devWarn('Error cargando estadísticas MP:', result.error);
        // No es crítico si falla, mantener null
      }
    } catch (error) {
      console.error('Error cargando estadísticas MP:', error);
      // No es crítico si falla, mantener null
    }
  };

  // Cargar suscripción
  const cargarSuscripcion = async () => {
    try {
      setLoadingSuscripcion(true);
      const result = await suscripcionesService.obtenerMiSuscripcion();
      if (result.success) {
        setSuscripcion(result.suscripcion);
      }
    } catch (error) {
      console.error('Error cargando suscripción:', error);
    } finally {
      setLoadingSuscripcion(false);
    }
  };

  // Suscribirse a eventos de nueva solicitud vía WebSocket
  useEffect(() => {
    if (!cuentaAprobadaPorAdmin) return;

    const unsubscribe = websocketService.onNuevaSolicitud((event: NuevaSolicitudEvent) => {
      devLog('📬 Nueva solicitud recibida vía WebSocket:', event);

      // Agregar ID a nuevas solicitudes
      setNuevasSolicitudesIds(prev => new Set([...prev, event.solicitud_id]));

      if (radarOportunidadesActivo) {
        cargarSolicitudesDisponibles();
      }

      // Opcional: Mostrar notificación/alert
      // Alert.alert(
      //   'Nueva Solicitud',
      //   `Nueva solicitud disponible: ${event.vehiculo}`,
      //   [{ text: 'Ver', onPress: () => router.push(`/solicitud-detalle/${event.solicitud_id}`) }]
      // );
    });

    return () => {
      unsubscribe();
    };
  }, [cuentaAprobadaPorAdmin, radarOportunidadesActivo]);

  // Suscribirse a eventos de pago expirado y cancelación
  useEffect(() => {
    if (!cuentaAprobadaPorAdmin) return;

    // Handler para pago expirado
    const unsubscribePagoExpirado = websocketService.onPagoExpirado?.((event: any) => {
      devLog('⏰ Pago expirado recibido vía WebSocket:', event);

      // ✅ Validar que el evento tiene los datos necesarios
      if (!event.oferta_id || !event.solicitud_id) {
        devWarn('⚠️ Evento de pago expirado inválido: falta oferta_id o solicitud_id', event);
        return;
      }

      // ✅ Solo mostrar alerta si la oferta fue realmente adjudicada
      // El backend envía estos eventos solo para ofertas adjudicadas que expiraron
      setAlertaMensaje(event.mensaje || 'El cliente no pagó a tiempo. La solicitud ha sido cancelada automáticamente.');
      setAlertaTipo('expirado');
      setAlertaOfertaId(event.oferta_id);
      setAlertaSolicitudId(event.solicitud_id);
      setAlertaCreditosDevueltos(event.creditos_devueltos || false);
      setMostrarAlertaPago(true);
    });

    // Handler para solicitud cancelada por cliente
    const unsubscribeCancelada = websocketService.onSolicitudCanceladaCliente?.((event: any) => {
      devLog('❌ Solicitud cancelada por cliente recibida vía WebSocket:', event);

      // ✅ Validar que el evento tiene los datos necesarios
      if (!event.oferta_id || !event.solicitud_id) {
        devWarn('⚠️ Evento de cancelación inválido: falta oferta_id o solicitud_id', event);
        return;
      }

      // ✅ Solo mostrar alerta si la oferta fue realmente adjudicada
      // El backend envía estos eventos solo para ofertas adjudicadas que el cliente canceló
      setAlertaMensaje(event.mensaje || 'El cliente canceló esta solicitud.');
      setAlertaTipo('cancelado');
      setAlertaOfertaId(event.oferta_id);
      setAlertaSolicitudId(event.solicitud_id);
      setAlertaCreditosDevueltos(event.creditos_devueltos || false);
      setMostrarAlertaPago(true);
    });

    return () => {
      unsubscribePagoExpirado?.();
      unsubscribeCancelada?.();
    };
  }, [cuentaAprobadaPorAdmin]);

  // Cargar alertas desde API como fallback (polling cada 5 minutos)
  useEffect(() => {
    const cargarAlertas = async () => {
      try {
        const { get } = await import('@/services/api');
        const response = await get('/ordenes/solicitudes-publicas/alertas-pago/');

        // get() retorna la respuesta completa de axios, acceder a .data
        const data = response?.data;

        if (data && data.alertas && data.alertas.length > 0) {
          devLog(`📋 Recibidas ${data.alertas.length} alertas del backend`);

          // ✅ Validar que la alerta es para una solicitud realmente cancelada
          // Solo mostrar alertas que tienen oferta_id y solicitud_id válidos
          const alertasValidas = data.alertas.filter((alerta: any) => {
            // La alerta debe tener oferta_id y solicitud_id
            if (!alerta.oferta_id || !alerta.solicitud_id) {
              devLog('⚠️ Alerta inválida: falta oferta_id o solicitud_id', alerta);
              return false;
            }

            // ✅ CRÍTICO: Solo mostrar alertas si el tipo es 'pago_expirado'
            // El backend ahora solo retorna alertas de tipo 'pago_expirado' para solicitudes realmente expiradas
            // (fecha_limite_pago ya pasó)
            if (alerta.tipo !== 'pago_expirado') {
              devLog('⚠️ Alerta con tipo inválido (solo se acepta pago_expirado):', alerta.tipo, alerta);
              return false;
            }

            // ✅ Validación adicional: Verificar que fecha_limite_pago existe y ya pasó
            if (alerta.fecha_limite_pago) {
              const fechaLimite = new Date(alerta.fecha_limite_pago);
              const ahora = new Date();
              if (ahora <= fechaLimite) {
                devLog('⚠️ Alerta inválida: fecha_limite_pago aún no ha pasado', {
                  fecha_limite: fechaLimite,
                  ahora: ahora,
                  diferencia_horas: (fechaLimite.getTime() - ahora.getTime()) / (1000 * 60 * 60)
                });
                return false;
              }
            }

            // ✅ IMPORTANTE: El backend ya valida que la oferta fue adjudicada y la solicitud está cancelada Y expirada
            // Solo confiar en las alertas que vienen del backend
            devLog('✅ Alerta válida recibida del backend (solicitud expirada):', {
              tipo: alerta.tipo,
              oferta_id: alerta.oferta_id,
              solicitud_id: alerta.solicitud_id,
              fecha_limite_pago: alerta.fecha_limite_pago,
              mensaje: alerta.mensaje?.substring(0, 50) + '...'
            });
            return true;
          });

          devLog(`✅ ${alertasValidas.length} alertas válidas después del filtrado`);

          if (alertasValidas.length > 0) {
            // Mostrar la primera alerta válida
            const alerta = alertasValidas[0];
            devLog('✅ Mostrando alerta válida:', {
              tipo: alerta.tipo,
              oferta_id: alerta.oferta_id,
              solicitud_id: alerta.solicitud_id
            });
            setAlertaMensaje(alerta.mensaje || '');
            setAlertaTipo(alerta.tipo === 'pago_expirado' ? 'expirado' : 'cancelado');
            setAlertaOfertaId(alerta.oferta_id);
            setAlertaSolicitudId(alerta.solicitud_id);
            setAlertaCreditosDevueltos(alerta.creditos_devueltos || false);
            setMostrarAlertaPago(true);
          } else {
            // Si no hay alertas válidas, ocultar la alerta si está visible
            devLog('ℹ️ No hay alertas válidas después del filtrado, ocultando alerta');
            setMostrarAlertaPago(false);
          }
        } else {
          // Si no hay alertas, ocultar la alerta si está visible
          devLog('ℹ️ No hay alertas en la respuesta del backend, ocultando alerta');
          setMostrarAlertaPago(false);
        }
      } catch (error) {
        // Silenciar error 404 ya que es normal si no hay alertas
        const errorStatus = (error as any)?.response?.status;
        if (errorStatus === 404) {
          devLog('ℹ️ No hay alertas activas (404 - normal)');
          setMostrarAlertaPago(false);
        } else {
          console.error('❌ Error cargando alertas:', error);
          // En caso de error, ocultar la alerta para evitar mostrar información incorrecta
          setMostrarAlertaPago(false);
        }
      }
    };

    if (cuentaAprobadaPorAdmin) {
      cargarAlertas();
      const interval = setInterval(cargarAlertas, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [cuentaAprobadaPorAdmin]);

  // Cargar solicitudes disponibles
  const cargarSolicitudesDisponibles = async () => {
    try {
      setLoadingSolicitudes(true);
      const result = await solicitudesService.obtenerSolicitudesDisponibles();

      if (result.success && result.data) {
        setSolicitudesDisponibles(result.data);
      } else {
        console.error('Error cargando solicitudes:', result.error);
      }
    } catch (error) {
      console.error('Error cargando solicitudes disponibles:', error);
    } finally {
      setLoadingSolicitudes(false);
    }
  };

  // Función para calcular dinero de la semana según servicios realizados
  const cargarEstadisticasSemanales = async () => {
    try {
      // Obtener órdenes completadas
      const completadasResult = await ordenesProveedorService.obtenerCompletadas();

      if (completadasResult.success && completadasResult.data) {
        // Calcular inicio de semana (lunes)
        const hoy = new Date();
        const diaSemana = hoy.getDay(); // 0 = domingo, 1 = lunes, etc.
        const diasDesdeLunes = diaSemana === 0 ? 6 : diaSemana - 1;
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - diasDesdeLunes);
        inicioSemana.setHours(0, 0, 0, 0);

        // Filtrar órdenes completadas esta semana
        const ordenesEstaSemana = completadasResult.data.filter(orden => {
          const fechaCompletada = new Date(orden.fecha_hora_solicitud || orden.fecha_servicio);
          return fechaCompletada >= inicioSemana;
        });

        // Calcular ganancia REAL (después de descuentos) y cantidad de servicios
        let gananciaRealTotal = 0;

        // Limitar a 20 órdenes para evitar sobrecarga (procesar en paralelo en lotes)
        const ordenesALimite = ordenesEstaSemana.slice(0, 20);

        // Obtener detalles de órdenes para calcular ganancia real (en paralelo por lotes de 5)
        const lotes = [];
        for (let i = 0; i < ordenesALimite.length; i += 5) {
          lotes.push(ordenesALimite.slice(i, i + 5));
        }

        for (const lote of lotes) {
          // Procesar lotes en paralelo
          const promesasDetalles = lote.map(async (orden) => {
            try {
              const detalleResult = await ordenesProveedorService.obtenerDetalle(orden.id);
              if (detalleResult.success && detalleResult.data) {
                const ordenDetalle = detalleResult.data as any;

                // Sumar ganancia_neta_proveedor desde lineas_detail
                if (ordenDetalle.lineas_detail && Array.isArray(ordenDetalle.lineas_detail)) {
                  let gananciaOrden = 0;
                  ordenDetalle.lineas_detail.forEach((linea: any) => {
                    const desglose = linea.oferta_servicio_detail?.desglose_precios;
                    if (desglose && desglose.ganancia_neta_proveedor) {
                      gananciaOrden += parseFloat(desglose.ganancia_neta_proveedor) || 0;
                    }
                  });

                  if (gananciaOrden > 0) {
                    return gananciaOrden;
                  } else {
                    // Si no hay desglose, usar total como fallback aproximado
                    const totalOrden = parseFloat((ordenDetalle.total || '0').replace(/[^0-9.-]+/g, '')) || 0;
                    // Aproximación: asumir 80% del total como ganancia (después de comisiones e IVA)
                    return totalOrden * 0.80;
                  }
                } else {
                  // Si no hay lineas_detail, usar total como fallback
                  const totalOrden = parseFloat((ordenDetalle.total || '0').replace(/[^0-9.-]+/g, '')) || 0;
                  return totalOrden * 0.80; // Aproximación
                }
              }
            } catch (error) {
              console.error(`Error obteniendo detalle de orden ${orden.id}:`, error);
              // Fallback: usar total de la orden
              const totalOrden = parseFloat((orden.total || '0').replace(/[^0-9.-]+/g, '')) || 0;
              return totalOrden * 0.80; // Aproximación
            }
            return 0;
          });

          const gananciasLote = await Promise.all(promesasDetalles);
          gananciaRealTotal += gananciasLote.reduce((suma, ganancia) => suma + ganancia, 0);
        }

        // Para órdenes restantes (más de 20), usar aproximación rápida
        if (ordenesEstaSemana.length > 20) {
          const ordenesRestantes = ordenesEstaSemana.slice(20);
          const gananciaAproximadaRestantes = ordenesRestantes.reduce((suma, orden) => {
            const totalOrden = parseFloat((orden.total || '0').replace(/[^0-9.-]+/g, '')) || 0;
            return suma + (totalOrden * 0.80);
          }, 0);
          gananciaRealTotal += gananciaAproximadaRestantes;
        }

        setEstadisticasSemanales({
          dinero: gananciaRealTotal,
          cantidadServicios: ordenesEstaSemana.length
        });
      }
    } catch (error) {
      console.error('Error cargando estadísticas semanales:', error);
      // No mostrar error al usuario, solo mantener valores por defecto
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const tasks: Promise<unknown>[] = [
      cargarEstadisticasSemanales(),
      cargarCreditos(),
      cargarEstadisticasMP(),
      cargarSuscripcion(),
      kpisResumen.refresh(),
    ];
    if (radarPreferenciaCargada && radarOportunidadesActivo) {
      tasks.push(cargarSolicitudesDisponibles());
    }
    await Promise.all(tasks);
    setRefreshing(false);
  };

  // Obtener saludo según hora del día
  const obtenerSaludo = () => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return 'Buenos días';
    if (hora >= 12 && hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const calcularPorcentajeCambio = (): { texto: string; positivo: boolean } => {
    const actual = estadisticasMP?.total_recibido_mes || 0;
    const anterior = estadisticasMP?.total_recibido_mes_anterior || 0;
    if (anterior === 0) return { texto: actual > 0 ? '+100%' : '0%', positivo: actual >= 0 };
    const cambio = ((actual - anterior) / anterior) * 100;
    return { texto: `${cambio >= 0 ? '+' : ''}${cambio.toFixed(1)}%`, positivo: cambio >= 0 };
  };

  // Colores seguros para componentes - usando acceso seguro con type assertion
  const primaryObj = safeColors?.primary as any;
  const accentObj = safeColors?.accent as any;
  const warningObj = safeColors?.warning as any;
  const infoObj = safeColors?.info as any;
  const successObj = safeColors?.success as any;
  const errorObj = safeColors?.error as any;
  const neutralGrayObj = safeColors?.neutral?.gray as any;

  const primaryColor = primaryObj?.['500'] || accentObj?.['500'] || '#4E4FEB';
  const loadingColor = primaryObj?.['500'] || accentObj?.['500'] || '#068FFF';
  const warningColor = warningObj?.main || warningObj?.['500'] || '#FFB84D';
  const infoColor = infoObj?.main || infoObj?.['500'] || accentObj?.['500'] || '#068FFF';
  const successColor = successObj?.main || successObj?.['500'] || '#3DB6B1';
  const errorColor = errorObj?.main || errorObj?.['500'] || '#FF5555';

  // Mostrar loading si aún se está cargando el estado
  if (isLoading || !estadoProveedor) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={loadingColor} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </SafeAreaView>
    );
  }

  // Si no tiene perfil, no mostrar nada (se está redirigiendo)
  if (!estadoProveedor.tiene_perfil || estadoProveedor.necesita_onboarding) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={loadingColor} />
        <Text style={styles.loadingText}>Redirigiendo al onboarding...</Text>
      </SafeAreaView>
    );
  }

  // Sin aprobación administrativa (estado aprobado), pantalla de revisión
  if (!cuentaAprobadaPorAdmin) {
    return <EstadoRevisionScreen estadoProveedor={estadoProveedor} />;
  }

  // Cuenta aprobada: dashboard principal
  return (
    <TabScreenWrapper>
      <LinearGradient
        style={styles.screen}
        colors={['#F3F5F8', '#FAFBFC', '#FFFFFF']}
        locations={[0, 0.35, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        {/* 1. HEADER */}
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {(usuario as any)?.foto_perfil ? (
                <Image source={{ uri: (usuario as any).foto_perfil }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {(obtenerNombreProveedor() || 'T').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.welcomeLabel}>Bienvenido</Text>
                <Text style={styles.providerName} numberOfLines={1}>{obtenerNombreProveedor()}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.bellOuter}
              activeOpacity={0.7}
              onPress={() => router.push('/notificaciones')}
            >
              <BlurView intensity={60} tint="light" style={styles.bellBlur}>
                <Bell size={20} color="#374151" />
              </BlurView>
              {(nuevasSolicitudesIds.size > 0 || alertasNoLeidas > 0) && (
                <Animated.View style={[styles.bellDot, { transform: [{ scale: pulseAnim }] }]} />
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
          {/* Rendimiento / progreso */}
          <View style={styles.sectionWrap}>
            <PerformanceWidget
              progress={kpisResumen.progress}
              targetTierName={kpisResumen.targetTierName}
              periodSubtitle={rendimientoWidgetPeriod}
              isLoading={kpisResumen.loading && !kpisResumen.hasData}
              onPress={handlePerformanceWidgetPress}
            />
          </View>

          {/* 2. RESUMEN FINANCIERO */}
          {saldoCreditos && (
            <View style={styles.sectionWrap}>
              <View style={styles.glassOuter}>
                <BlurView intensity={60} tint="light" style={styles.glassInner}>
                  <View style={styles.finHeader}>
                    <Text style={styles.finHeaderTitle}>FINANZAS DEL TALLER</Text>
                    {suscripcion?.esta_activa ? (
                      <TouchableOpacity
                        style={[
                          styles.planBadge,
                          suscripcion.plan?.destacado && styles.planBadgeDestacado,
                        ]}
                        onPress={() => router.push('/creditos?tab=suscripcion')}
                        activeOpacity={0.7}
                      >
                        <ShieldCheck
                          size={14}
                          color={suscripcion.plan?.destacado ? '#B45309' : '#2563EB'}
                        />
                        <Text
                          style={[
                            styles.planBadgeText,
                            suscripcion.plan?.destacado && styles.planBadgeTextDestacado,
                          ]}
                        >
                          {suscripcion.plan?.nombre?.trim() || 'Plan activo'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <View style={styles.finBody}>
                    <TouchableOpacity
                      style={styles.finCol}
                      onPress={() => router.push('/creditos')}
                      activeOpacity={0.7}
                    >
                      <View style={styles.finIconAmber}>
                        <Wallet size={20} color="#D97706" />
                      </View>
                      <Text style={styles.finLabel}>Créditos</Text>
                      <Text style={styles.finCreditsVal}>{saldoCreditos.saldo_creditos}</Text>
                      <Text style={styles.finBuyMore}>Comprar más +</Text>
                    </TouchableOpacity>

                    <View style={styles.finDivider} />

                    <View style={styles.finCol}>
                      <View style={styles.finIconGreen}>
                        <DollarSign size={20} color="#059669" />
                      </View>
                      <Text style={styles.finLabel}>Ganancias</Text>
                      <Text style={styles.finEarningsVal}>
                        ${(estadisticasMP?.total_recibido_mes || estadisticasSemanales.dinero || 0).toLocaleString('es-CL')}
                      </Text>
                      {(() => {
                        const cambio = calcularPorcentajeCambio();
                        return (
                          <View style={styles.finGrowth}>
                            {cambio.positivo ? (
                              <TrendingUp size={12} color="#059669" />
                            ) : (
                              <TrendingDown size={12} color="#DC2626" />
                            )}
                            <Text style={[styles.finGrowthText, !cambio.positivo && { color: '#DC2626' }]}>
                              {cambio.texto} este mes
                            </Text>
                          </View>
                        );
                      })()}
                    </View>
                  </View>
                </BlurView>
              </View>
            </View>
          )}

          {/* BANNER ESTADO SUSCRIPCIÓN */}
          {saludSuscripcion && saludSuscripcion.estado_salud !== 'ok' && (
            <View style={styles.sectionWrap}>
              <TouchableOpacity
                style={[
                  styles.suscBanner,
                  saludSuscripcion.estado_salud === 'pago_fallido' && styles.suscBannerDanger,
                  saludSuscripcion.estado_salud === 'vencida' && styles.suscBannerDanger,
                  saludSuscripcion.estado_salud === 'sin_suscripcion' && styles.suscBannerDanger,
                  saludSuscripcion.estado_salud === 'por_vencer' && styles.suscBannerWarning,
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  if (saludSuscripcion.accion) {
                    router.push(saludSuscripcion.accion as any);
                  }
                }}
              >
                <View style={[
                  styles.suscBannerIcon,
                  saludSuscripcion.estado_salud === 'por_vencer'
                    ? { backgroundColor: '#FEF3C7' }
                    : { backgroundColor: '#FEE2E2' },
                ]}>
                  {saludSuscripcion.estado_salud === 'por_vencer' ? (
                    <Clock size={18} color="#D97706" />
                  ) : saludSuscripcion.estado_salud === 'pago_fallido' ? (
                    <CreditCard size={18} color="#DC2626" />
                  ) : (
                    <AlertTriangle size={18} color="#DC2626" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.suscBannerTitle,
                    saludSuscripcion.estado_salud !== 'por_vencer' && { color: '#991B1B' },
                  ]}>
                    {saludSuscripcion.estado_salud === 'por_vencer'
                      ? 'Renovación próxima'
                      : saludSuscripcion.estado_salud === 'pago_fallido'
                        ? 'Pago fallido'
                        : saludSuscripcion.estado_salud === 'sin_suscripcion'
                          ? 'Sin suscripción'
                          : 'Suscripción vencida'}
                  </Text>
                  <Text style={styles.suscBannerMsg} numberOfLines={2}>
                    {saludSuscripcion.mensaje}
                  </Text>
                </View>
                {saludSuscripcion.accion && (
                  <ChevronRight size={18} color="#6B7280" />
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* 3a. Disponibilidad en la plataforma (conexión / visibilidad para clientes) */}
          <View style={styles.sectionWrap}>
            <View style={styles.radarAvailabilityCard}>
              <View style={styles.radarAvailabilityIcon}>
                <Wifi size={22} color="#2563EB" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.radarAvailabilityTitle}>Disponible para oportunidades</Text>
                <Text style={styles.radarAvailabilitySub}>
                  Activa esta opción para conectarte al sistema.
                </Text>
              </View>
              {radarSwitchLoading ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <Switch
                  value={radarOportunidadesActivo}
                  onValueChange={handleRadarOportunidadesToggle}
                  disabled={!radarPreferenciaCargada}
                  trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                  thumbColor={radarOportunidadesActivo ? '#2563EB' : '#9CA3AF'}
                />
              )}
            </View>
          </View>

          {/* 3b. RADAR DE OPORTUNIDADES (listado) */}
          <View style={styles.sectionWrap}>
            <View style={styles.sectionTitleRow}>
              <Radar size={20} color="#374151" />
              <Text style={styles.sectionTitleText}>Radar de Oportunidades</Text>
            </View>

            {!radarPreferenciaCargada ? (
              <View style={styles.radarSearching}>
                <ActivityIndicator size="small" color="#2563EB" />
              </View>
            ) : !radarOportunidadesActivo ? (
              <View style={styles.radarInactiveBox}>
                <Radar size={36} color="#D1D5DB" />
                <Text style={styles.radarInactiveTitle}>Radar apagado</Text>
                <Text style={styles.radarInactiveSub}>
                  Activa «Disponible para oportunidades» arriba para ver solicitudes aquí y en la lista completa.
                </Text>
              </View>
            ) : (
            <View style={styles.glassOuter}>
              <BlurView intensity={60} tint="light" style={styles.glassInner}>
                <View style={styles.radarBody}>
                  {loadingSolicitudes ? (
                      <View style={styles.radarSearching}>
                        <ActivityIndicator size="small" color="#2563EB" />
                      </View>
                    ) : solicitudesDisponibles.length > 0 ? (
                      <>
                        {solicitudesDisponibles.slice(0, 3).map((solicitud) => (
                          <HomeRadarSolicitudItem
                            key={solicitud.id}
                            solicitud={solicitud}
                            onOpenDetail={handleOpenSolicitudDetalle}
                          />
                        ))}
                        {solicitudesDisponibles.length > 3 && (
                          <TouchableOpacity
                            style={styles.seeAllBtn}
                            onPress={handleVerSolicitudesDisponibles}
                          >
                            <Text style={styles.seeAllBtnText}>
                              Ver todas ({solicitudesDisponibles.length})
                            </Text>
                            <ChevronRight size={14} color="#2563EB" />
                          </TouchableOpacity>
                        )}
                      </>
                    ) : (
                      <View style={styles.radarEmpty}>
                        <Search size={36} color="#D1D5DB" />
                        <Text style={styles.radarEmptyTitle}>No hay oportunidades</Text>
                        <Text style={styles.radarEmptySub}>
                          Revisa más tarde para encontrar nuevas oportunidades
                        </Text>
                      </View>
                    )}
                  </View>
              </BlurView>
            </View>
            )}
          </View>

          {/* 4. CATEGORÍAS DE GESTIÓN - Grid glass */}
          <View style={styles.sectionWrap}>
            <Text style={styles.mgmtTitle}>Gestión del Taller</Text>
            <View style={styles.mgmtGrid}>
              <View style={styles.mgmtRow}>
                <TouchableOpacity
                  style={styles.mgmtCard}
                  onPress={() => router.push('/(tabs)/calendario')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.mgmtIconBox, { backgroundColor: '#DBEAFE' }]}>
                    <Calendar size={22} color="#2563EB" />
                  </View>
                  <View style={styles.mgmtCardTextCol}>
                    <Text style={styles.mgmtCardTitle}>Calendario</Text>
                    <Text style={styles.mgmtCardSub}>Disponibilidad</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.mgmtCard}
                  onPress={() => router.push('/especialidades-marcas')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.mgmtIconBox, { backgroundColor: '#F5F3FF' }]}>
                    <Wrench size={22} color="#7C3AED" />
                  </View>
                  <View style={styles.mgmtCardTextCol}>
                    <Text style={styles.mgmtCardTitle}>Especialidades</Text>
                    <Text style={styles.mgmtCardSub}>Marcas y rubros</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.mgmtRow}>
                <TouchableOpacity
                  style={styles.mgmtCard}
                  onPress={() => router.push('/mis-servicios')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.mgmtIconBox, { backgroundColor: '#ECFEFF' }]}>
                    <Settings size={22} color="#0891B2" />
                  </View>
                  <View style={styles.mgmtCardTextCol}>
                    <Text style={styles.mgmtCardTitle}>Mis servicios</Text>
                    <Text style={styles.mgmtCardSub}>Gestionar ofertas</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.mgmtCard}
                  onPress={() => router.push('/configuracion-horarios')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.mgmtIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <Clock size={22} color="#2563EB" />
                  </View>
                  <View style={styles.mgmtCardTextCol}>
                    <Text style={styles.mgmtCardTitle}>Horarios</Text>
                    <Text style={styles.mgmtCardSub}>Franjas de atención</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {esMecanicoDomicilio && (
                <View style={styles.mgmtRow}>
                  <TouchableOpacity
                    style={styles.mgmtCard}
                    onPress={() => router.push('/actualizar-ubicacion')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.mgmtIconBox, { backgroundColor: '#E0F2FE' }]}>
                      <MapPin size={22} color="#0284C7" />
                    </View>
                    <View style={styles.mgmtCardTextCol}>
                      <Text style={styles.mgmtCardTitle}>Mi ubicación</Text>
                      <Text style={styles.mgmtCardSub}>Dirección / GPS para mapa</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.mgmtCard}
                    onPress={() => router.push('/zonas-servicio')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.mgmtIconBox, { backgroundColor: '#ECFDF5' }]}>
                      <Map size={22} color="#059669" />
                    </View>
                    <View style={styles.mgmtCardTextCol}>
                      <Text style={styles.mgmtCardTitle}>Zonas</Text>
                      <Text style={styles.mgmtCardSub}>Comunas de cobertura</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <AlertaPagoExpirado
          visible={mostrarAlertaPago}
          mensaje={alertaMensaje}
          tipo={alertaTipo}
          ofertaId={alertaOfertaId}
          solicitudId={alertaSolicitudId}
          creditosDevueltos={alertaCreditosDevueltos}
          onDismiss={async () => {
            setMostrarAlertaPago(false);
            if (alertaSolicitudId) {
              try {
                const { post } = await import('@/services/api');
                await post(`/ordenes/solicitudes-publicas/${alertaSolicitudId}/descartar-alerta/`);
              } catch (error) {
                console.error('Error descartando alerta:', error);
              }
            }
          }}
        />
      </LinearGradient>
    </TabScreenWrapper>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4F46E5',
  },
  welcomeLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  providerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  bellOuter: {
    position: 'relative',
  },
  bellBlur: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  bellDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FAFAFA',
  },
  sectionWrap: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  radarAvailabilityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  radarAvailabilityIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarAvailabilityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  radarAvailabilitySub: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
  },
  radarInactiveBox: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 8,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  radarInactiveTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  radarInactiveSub: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 19,
  },
  glassOuter: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  glassInner: {
    padding: 20,
  },
  finHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  finHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  planBadgeDestacado: {
    borderColor: 'rgba(245, 158, 11, 0.45)',
    backgroundColor: '#FFFBEB',
  },
  planBadgeTextDestacado: {
    color: '#B45309',
  },
  finBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  finCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  finDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    alignSelf: 'stretch',
    marginHorizontal: 12,
  },
  finIconAmber: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  finIconGreen: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  finLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  finCreditsVal: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
  },
  finBuyMore: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 2,
  },
  finEarningsVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#059669',
  },
  finGrowth: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 2,
  },
  finGrowthText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  radarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  radarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  radarIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  radarSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  radarBody: {
    marginTop: 16,
    gap: 12,
  },
  radarSearching: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  radarSearchingText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  radarEmpty: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  radarEmptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  radarEmptySub: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  seeAllBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  mgmtTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  mgmtGrid: {
    gap: 12,
  },
  mgmtRow: {
    flexDirection: 'row',
    gap: 12,
  },
  mgmtCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  mgmtCardFull: {
    flex: 1,
  },
  mgmtCardTextCol: {
    flex: 1,
    minWidth: 0,
  },
  mgmtIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mgmtCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  mgmtCardSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  /* ── Banner suscripción ── */
  suscBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  suscBannerWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  suscBannerDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  suscBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suscBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  suscBannerMsg: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
});

