import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Image,
  Switch,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell, Wallet, DollarSign, Radar, Briefcase, Calendar,
  ShieldCheck, Car, Clock,
  TrendingUp, TrendingDown, ChevronRight, Search,
  Wrench, Settings, Map,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { router, useFocusEffect } from 'expo-router';
import EstadoRevisionScreen from '@/components/EstadoRevisionScreen';
import {
  ordenesProveedorService,
  type Orden,
  obtenerNombreSeguro,
  dedupeOrdenesPorIdYOferta,
} from '@/services/ordenesProveedor';
import { checklistService, type ChecklistInstance } from '@/services/checklistService';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import solicitudesService, { type SolicitudPublica, obtenerMisOfertas, type OfertaProveedor } from '@/services/solicitudesService';
import { SolicitudCard } from '@/components/solicitudes/SolicitudCard';
import websocketService, { type NuevaSolicitudEvent } from '@/app/services/websocketService';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';
import creditosService, { type CreditoProveedor } from '@/services/creditosService';
import mercadoPagoProveedorService, { type EstadisticasPagosMP } from '@/services/mercadoPagoProveedorService';
import { SaldoCreditos } from '@/components/creditos';
import { CountdownTimer } from '@/components/solicitudes/CountdownTimer';
import AlertaPagoExpirado from '@/components/alerts/AlertaPagoExpirado';
import { AlertsPanel } from '@/components/alerts/AlertsPanel';
import { useAlerts } from '@/context/AlertsContext';
import suscripcionesService, { type SuscripcionProveedor } from '@/services/suscripcionesService';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface OrdenConChecklist extends Orden {
  checklist_instance?: ChecklistInstance;
  requiere_checklist?: boolean;
}

export default function HomeScreen() {
  // Hook del sistema de diseño - acceso seguro a tokens
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { verificarYGenerarAlertas } = useAlerts();

  const {
    isAuthenticated,
    isLoading,
    estadoProveedor,
    usuario,
    obtenerNombreProveedor
  } = useAuth();

  const esMecanicoDomicilio = estadoProveedor?.tipo_proveedor === 'mecanico';
  const [ordenes, setOrdenes] = useState<OrdenConChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Mapa oferta_id → estado real de la oferta (para cruzar con órdenes)
  const [ofertasMap, setOfertasMap] = useState<Record<string, string>>({});

  // Estado para toggle del radar de oportunidades (UI)
  const [isOnline, setIsOnline] = useState(true);

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


  // Redirigir al onboarding si el usuario no tiene perfil
  useEffect(() => {
    if (!isLoading && estadoProveedor) {
      if (!estadoProveedor.tiene_perfil || estadoProveedor.necesita_onboarding) {
        console.log('Usuario sin perfil de proveedor, redirigiendo al onboarding');
        router.replace('/(onboarding)/tipo-cuenta');
      }
    }
  }, [isLoading, estadoProveedor]);

  // Cargar órdenes cuando el componente se monta
  useEffect(() => {
    if (estadoProveedor?.verificado) {
      cargarOrdenes();
      cargarSolicitudesDisponibles();
      cargarCreditos();
      cargarEstadisticasMP();
      cargarSuscripcion();
      cargarOfertasMap();
    }
  }, [estadoProveedor]);

  // Recargar órdenes cuando la pantalla recibe foco (cuando se regresa del detalle)
  useFocusEffect(
    React.useCallback(() => {
      if (estadoProveedor?.verificado) {
        cargarOrdenes();
        cargarSolicitudesDisponibles();
        cargarCreditos();
        cargarEstadisticasMP();
        cargarSuscripcion();
        cargarOfertasMap();
        verificarYGenerarAlertas();
      }
    }, [estadoProveedor?.verificado])
  );

  // Cargar saldo de créditos
  const cargarCreditos = async () => {
    try {
      const result = await creditosService.obtenerSaldo();
      if (result.success && result.data) {
        setSaldoCreditos(result.data);
      } else {
        console.warn('Error cargando saldo de créditos:', result.error);
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
        console.warn('Error cargando estadísticas MP:', result.error);
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

  // Cargar mapa de ofertas del proveedor (id → estado) para cruzar con órdenes
  const cargarOfertasMap = async () => {
    try {
      const response = await obtenerMisOfertas();
      if (response.success && response.data) {
        const map: Record<string, string> = {};
        const ofertas = Array.isArray(response.data) ? response.data : [];
        for (const oferta of ofertas) {
          map[String(oferta.id)] = oferta.estado;
        }
        setOfertasMap(map);
      }
    } catch (error) {
      console.error('Error cargando mapa de ofertas:', error);
    }
  };

  // Suscribirse a eventos de nueva solicitud vía WebSocket
  useEffect(() => {
    if (!estadoProveedor?.verificado) return;

    const unsubscribe = websocketService.onNuevaSolicitud((event: NuevaSolicitudEvent) => {
      console.log('📬 Nueva solicitud recibida vía WebSocket:', event);

      // Agregar ID a nuevas solicitudes
      setNuevasSolicitudesIds(prev => new Set([...prev, event.solicitud_id]));

      // Recargar solicitudes disponibles
      cargarSolicitudesDisponibles();

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
  }, [estadoProveedor?.verificado]);

  // Suscribirse a eventos de pago expirado y cancelación
  useEffect(() => {
    if (!estadoProveedor?.verificado) return;

    // Handler para pago expirado
    const unsubscribePagoExpirado = websocketService.onPagoExpirado?.((event: any) => {
      console.log('⏰ Pago expirado recibido vía WebSocket:', event);

      // ✅ Validar que el evento tiene los datos necesarios
      if (!event.oferta_id || !event.solicitud_id) {
        console.warn('⚠️ Evento de pago expirado inválido: falta oferta_id o solicitud_id', event);
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
      console.log('❌ Solicitud cancelada por cliente recibida vía WebSocket:', event);

      // ✅ Validar que el evento tiene los datos necesarios
      if (!event.oferta_id || !event.solicitud_id) {
        console.warn('⚠️ Evento de cancelación inválido: falta oferta_id o solicitud_id', event);
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
  }, [estadoProveedor?.verificado]);

  // Cargar alertas desde API como fallback (polling cada 5 minutos)
  useEffect(() => {
    const cargarAlertas = async () => {
      try {
        const { get } = await import('@/services/api');
        const response = await get('/ordenes/solicitudes-publicas/alertas-pago/');

        // get() retorna la respuesta completa de axios, acceder a .data
        const data = response?.data;

        if (data && data.alertas && data.alertas.length > 0) {
          console.log(`📋 Recibidas ${data.alertas.length} alertas del backend`);

          // ✅ Validar que la alerta es para una solicitud realmente cancelada
          // Solo mostrar alertas que tienen oferta_id y solicitud_id válidos
          const alertasValidas = data.alertas.filter((alerta: any) => {
            // La alerta debe tener oferta_id y solicitud_id
            if (!alerta.oferta_id || !alerta.solicitud_id) {
              console.log('⚠️ Alerta inválida: falta oferta_id o solicitud_id', alerta);
              return false;
            }

            // ✅ CRÍTICO: Solo mostrar alertas si el tipo es 'pago_expirado'
            // El backend ahora solo retorna alertas de tipo 'pago_expirado' para solicitudes realmente expiradas
            // (fecha_limite_pago ya pasó)
            if (alerta.tipo !== 'pago_expirado') {
              console.log('⚠️ Alerta con tipo inválido (solo se acepta pago_expirado):', alerta.tipo, alerta);
              return false;
            }

            // ✅ Validación adicional: Verificar que fecha_limite_pago existe y ya pasó
            if (alerta.fecha_limite_pago) {
              const fechaLimite = new Date(alerta.fecha_limite_pago);
              const ahora = new Date();
              if (ahora <= fechaLimite) {
                console.log('⚠️ Alerta inválida: fecha_limite_pago aún no ha pasado', {
                  fecha_limite: fechaLimite,
                  ahora: ahora,
                  diferencia_horas: (fechaLimite.getTime() - ahora.getTime()) / (1000 * 60 * 60)
                });
                return false;
              }
            }

            // ✅ IMPORTANTE: El backend ya valida que la oferta fue adjudicada y la solicitud está cancelada Y expirada
            // Solo confiar en las alertas que vienen del backend
            console.log('✅ Alerta válida recibida del backend (solicitud expirada):', {
              tipo: alerta.tipo,
              oferta_id: alerta.oferta_id,
              solicitud_id: alerta.solicitud_id,
              fecha_limite_pago: alerta.fecha_limite_pago,
              mensaje: alerta.mensaje?.substring(0, 50) + '...'
            });
            return true;
          });

          console.log(`✅ ${alertasValidas.length} alertas válidas después del filtrado`);

          if (alertasValidas.length > 0) {
            // Mostrar la primera alerta válida
            const alerta = alertasValidas[0];
            console.log('✅ Mostrando alerta válida:', {
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
            console.log('ℹ️ No hay alertas válidas después del filtrado, ocultando alerta');
            setMostrarAlertaPago(false);
          }
        } else {
          // Si no hay alertas, ocultar la alerta si está visible
          console.log('ℹ️ No hay alertas en la respuesta del backend, ocultando alerta');
          setMostrarAlertaPago(false);
        }
      } catch (error) {
        // Silenciar error 404 ya que es normal si no hay alertas
        const errorStatus = (error as any)?.response?.status;
        if (errorStatus === 404) {
          console.log('ℹ️ No hay alertas activas (404 - normal)');
          setMostrarAlertaPago(false);
        } else {
          console.error('❌ Error cargando alertas:', error);
          // En caso de error, ocultar la alerta para evitar mostrar información incorrecta
          setMostrarAlertaPago(false);
        }
      }
    };

    if (estadoProveedor?.verificado) {
      cargarAlertas();
      const interval = setInterval(cargarAlertas, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [estadoProveedor?.verificado]);

  const cargarOrdenes = async () => {
    setLoading(true);
    try {
      // ✅ Cargar todas las órdenes abiertas (no finalizadas) desde el endpoint activas
      // Este endpoint ahora incluye todas las órdenes excepto: completado, cancelado, rechazada_por_proveedor, devuelto
      const activasResult = await ordenesProveedorService.obtenerActivas();

      // Procesar todas las órdenes abiertas con checklist
      let todasLasOrdenes: Orden[] = [];

      if (activasResult.success && activasResult.data && Array.isArray(activasResult.data)) {
        todasLasOrdenes = dedupeOrdenesPorIdYOferta(activasResult.data);
      } else {
        console.log('⚠️ No se pudieron cargar órdenes activas:', activasResult.message || 'Error desconocido');
      }

      // Procesar todas las órdenes con información de checklist
      let ordenesConChecklist: OrdenConChecklist[] = [];
      if (todasLasOrdenes.length > 0) {
        ordenesConChecklist = await Promise.all(
          todasLasOrdenes.map(async (orden) => {
            console.log('🔍 Procesando orden:', orden.id, 'estado:', orden.estado);

            const puedeRequerirChecklist = (orden: Orden): boolean => {
              // Estados que típicamente requieren checklist
              const estadosConChecklist = [
                'aceptada_por_proveedor',
                'servicio_iniciado',
                'checklist_en_progreso',
                'checklist_completado',
                'en_proceso'
              ];

              // Solo verificar checklist para ciertos estados y tipos de servicio
              return estadosConChecklist.includes(orden.estado) &&
                (orden.tipo_servicio === 'domicilio' || orden.tipo_servicio === 'taller');
            };

            let checklist_instance: ChecklistInstance | undefined;
            let requiere_checklist = false;

            // Solo intentar cargar checklist si la orden puede tenerlo (el cache está integrado en el servicio)
            if (puedeRequerirChecklist(orden)) {
              try {
                console.log('🔍 Intentando cargar checklist para orden:', orden.id, 'estado:', orden.estado);
                const checklistResult = await checklistService.getInstanceByOrder(orden.id);
                console.log('📋 Resultado checklist para orden', orden.id, ':', checklistResult.success ? 'SUCCESS' : 'FAIL');
                if (checklistResult.success && checklistResult.data) {
                  checklist_instance = checklistResult.data;
                  console.log('✅ Checklist encontrado para orden', orden.id, '- ID:', checklist_instance.id, 'Estado:', checklist_instance.estado);
                } else {
                  console.log('ℹ️ No se encontró checklist para orden', orden.id, '- Mensaje:', checklistResult.message);
                }
              } catch (error) {
                console.log('ℹ️ Error cargando checklist para orden:', orden.id, error);
              }

              const tienechecklistInstance = !!checklist_instance;
              requiere_checklist =
                ['aceptada_por_proveedor', 'servicio_iniciado', 'checklist_en_progreso', 'checklist_completado', 'en_proceso'].includes(orden.estado) ||
                tienechecklistInstance;
            }

            console.log('📦 [INDEX] Orden procesada:', {
              id: orden.id,
              estado: orden.estado,
              oferta_proveedor_id: (orden as any).oferta_proveedor_id,
              tieneChecklist: requiere_checklist
            });

            return {
              ...orden,
              checklist_instance,
              requiere_checklist
            };
          })
        );
      }

      // ✅ NO filtrar órdenes - el backend ya excluye las finalizadas
      // Incluir todas las órdenes abiertas (pendientes, confirmadas, en proceso, etc.)
      setOrdenes(ordenesConChecklist);

      // Log para debugging
      console.log('📊 Total órdenes abiertas cargadas:', ordenesConChecklist.length);
      console.log('📊 Estados de órdenes:', ordenesConChecklist.map(o => ({ id: o.id, estado: o.estado, oferta_proveedor_id: (o as any).oferta_proveedor_id })));

      // Cargar estadísticas semanales
      await cargarEstadisticasSemanales();

    } catch (error) {
      console.error('Error cargando órdenes:', error);
      Alert.alert('Error', 'No se pudieron cargar las órdenes');
    } finally {
      setLoading(false);
    }
  };

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
    await Promise.all([
      cargarOrdenes(),
      cargarSolicitudesDisponibles(),
      cargarCreditos(),
      cargarEstadisticasMP(),
      cargarSuscripcion(),
      cargarOfertasMap()
    ]);
    setRefreshing(false);
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatearHora = (hora: string) => {
    return hora.substring(0, 5); // HH:MM
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

  const renderTransactionItem = (orden: OrdenConChecklist) => {
    const clienteFoto = (orden.cliente_detail as any)?.foto_perfil;
    const nombreCompleto = obtenerNombreSeguro(orden.cliente_detail);
    const serviciosNombres = orden.lineas.map(linea => linea.servicio_nombre);
    const nombreServicio = serviciosNombres.length > 0
      ? (serviciosNombres.length === 1 ? serviciosNombres[0] : serviciosNombres.join(', '))
      : 'Servicio';
    const precioFormateado = orden.total
      ? parseFloat(orden.total.toString().replace(/[^0-9.-]+/g, '')).toLocaleString('es-CL')
      : '';
    const precioConSimbolo = precioFormateado ? `$${precioFormateado}` : '';

    const ofertaId = orden.oferta_proveedor_id ? String(orden.oferta_proveedor_id) : null;
    const estadoOferta = ofertaId ? ofertasMap[ofertaId] : null;

    const estadoColorsMap: Record<string, { bg: string; dot: string; text: string }> = {
      pendiente_aceptacion_proveedor: { bg: '#FEF3C7', dot: '#F59E0B', text: '#92400E' },
      confirmado:                     { bg: '#DBEAFE', dot: '#3B82F6', text: '#1E40AF' },
      aceptada_por_proveedor:         { bg: '#D1FAE5', dot: '#10B981', text: '#065F46' },
      servicio_iniciado:              { bg: '#ECFDF5', dot: '#34D399', text: '#065F46' },
      checklist_en_progreso:          { bg: '#EDE9FE', dot: '#8B5CF6', text: '#5B21B6' },
      checklist_completado:           { bg: '#D1FAE5', dot: '#059669', text: '#065F46' },
      en_proceso:                     { bg: '#DBEAFE', dot: '#2563EB', text: '#1E40AF' },
      // Offer-originated states
      enviada:        { bg: '#DBEAFE', dot: '#3B82F6', text: '#1E40AF' },
      vista:          { bg: '#EDE9FE', dot: '#7C3AED', text: '#5B21B6' },
      en_chat:        { bg: '#FEF3C7', dot: '#F59E0B', text: '#92400E' },
      aceptada:       { bg: '#D1FAE5', dot: '#10B981', text: '#065F46' },
      pendiente_pago: { bg: '#FEF3C7', dot: '#F59E0B', text: '#92400E' },
      pagada:         { bg: '#D1FAE5', dot: '#059669', text: '#065F46' },
      en_ejecucion:   { bg: '#DBEAFE', dot: '#2563EB', text: '#1E40AF' },
    };

    const ofertaLabels: Record<string, string> = {
      enviada: 'Oferta Enviada',
      vista: 'Vista por Cliente',
      en_chat: 'En Conversación',
      aceptada: 'Aceptada',
      pendiente_pago: 'Pendiente de Pago',
      pagada: 'Pagada',
      en_ejecucion: 'En Ejecución',
    };

    const estadoEfectivo = estadoOferta || orden.estado;
    const estadoStyle = estadoColorsMap[estadoEfectivo] || { bg: '#F3F4F6', dot: '#9CA3AF', text: '#374151' };
    const estadoLabel = estadoOferta && ofertaLabels[estadoOferta]
      ? ofertaLabels[estadoOferta]
      : (orden.estado_display || orden.estado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));

    return (
      <TouchableOpacity
        key={orden.id}
        onPress={() => {
          const ofertaId = (orden as any).oferta_proveedor_id;
          if (ofertaId) {
            router.push(`/oferta-detalle/${ofertaId}`);
          } else {
            router.push(`/servicio-detalle/${orden.id}`);
          }
        }}
        activeOpacity={0.8}
        style={styles.ticketCard}
      >
        <View style={[styles.ticketTop, { backgroundColor: estadoStyle.bg }]}>
          <View style={styles.ticketBadgeRow}>
            <View style={styles.ticketBadge}>
              <Animated.View style={[styles.ticketPulseDot, { backgroundColor: estadoStyle.dot, transform: [{ scale: pulseAnim }] }]} />
              <Text style={[styles.ticketBadgeText, { color: estadoStyle.text }]}>{estadoLabel}</Text>
            </View>
            {orden.hora_servicio && (
              <View style={styles.ticketTimeBlock}>
                <Clock size={13} color="#6B7280" />
                <Text style={styles.ticketTimeText}>{formatearHora(orden.hora_servicio)}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.ticketDash} />

        <View style={styles.ticketBody}>
          <Text style={styles.ticketServiceTitle} numberOfLines={2}>{nombreServicio}</Text>

          <View style={styles.ticketClientRow}>
            {clienteFoto ? (
              <Image source={{ uri: clienteFoto }} style={styles.ticketClientPhoto} />
            ) : (
              <View style={styles.ticketClientPlaceholder}>
                <Text style={styles.ticketClientInitial}>{nombreCompleto.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.ticketClientName} numberOfLines={1}>{nombreCompleto}</Text>
          </View>

          <View style={styles.ticketFooter}>
            <View style={styles.ticketInfoItem}>
              <Car size={14} color="#9CA3AF" />
              <Text style={styles.ticketInfoText} numberOfLines={1}>
                {orden.vehiculo_detail?.marca} {orden.vehiculo_detail?.modelo}
              </Text>
            </View>
            {precioConSimbolo ? (
              <View style={styles.ticketPriceBlock}>
                <Text style={styles.ticketPriceLabel}>A COBRAR</Text>
                <Text style={styles.ticketPriceAmount}>{precioConSimbolo}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };


  const getChecklistEstado = (orden: OrdenConChecklist) => {
    // Colores seguros del sistema de diseño - usando acceso seguro
    const warningObj = safeColors?.warning as any;
    const infoObj = safeColors?.info as any;
    const successObj = safeColors?.success as any;
    const accentObj = safeColors?.accent as any;
    const neutralGray = safeColors?.neutral?.gray as any;

    const neutralColor = neutralGray?.[700] || safeColors?.text?.tertiary || '#666666';
    const warningColor = warningObj?.main || warningObj?.['500'] || '#FFB84D';
    const infoColor = infoObj?.main || infoObj?.['500'] || accentObj?.['500'] || '#068FFF';
    const successColor = successObj?.main || successObj?.['500'] || '#3DB6B1';

    if (!orden.requiere_checklist) {
      return { texto: 'No requiere', color: neutralColor, icon: 'remove-circle' };
    }

    if (!orden.checklist_instance) {
      return { texto: 'Pendiente', color: warningColor, icon: 'pending' };
    }

    switch (orden.checklist_instance.estado) {
      case 'PENDIENTE':
        return { texto: 'Pendiente', color: warningColor, icon: 'pending' };
      case 'EN_PROGRESO':
        return { texto: 'En Progreso', color: infoColor, icon: 'hourglass-empty' };
      case 'COMPLETADO':
        return { texto: 'Completado', color: successColor, icon: 'check-circle' };
      default:
        return { texto: 'Desconocido', color: neutralColor, icon: 'help' };
    }
  };

  const getColorEstado = (estado: string) => {
    // Usar colores del sistema de diseño con fallbacks seguros
    // Acceso seguro usando type assertion para evitar errores de sintaxis
    const warningObj = safeColors?.warning as any;
    const infoObj = safeColors?.info as any;
    const successObj = safeColors?.success as any;
    const errorObj = safeColors?.error as any;
    const primaryObj = safeColors?.primary as any;
    const accentObj = safeColors?.accent as any;
    const neutralGray = safeColors?.neutral?.gray as any;

    const warningColor = warningObj?.main || warningObj?.['500'] || '#FFB84D';
    const infoColor = infoObj?.main || infoObj?.['500'] || accentObj?.['500'] || '#068FFF';
    const successColor = successObj?.main || successObj?.['500'] || '#3DB6B1';
    const primaryColor = primaryObj?.['500'] || accentObj?.['500'] || '#4E4FEB';
    const errorColor = errorObj?.main || errorObj?.['500'] || '#FF5555';
    const neutralColor = neutralGray?.[700] || safeColors?.text?.tertiary || '#666666';

    switch (estado) {
      case 'pendiente_aceptacion_proveedor':
        return warningColor; // amarillo - orden pendiente
      case 'confirmado':
        return infoColor; // azul claro - orden confirmada (pagada, lista para iniciar)
      case 'aceptada_por_proveedor':
        return successColor; // verde - orden aceptada
      case 'servicio_iniciado':
        return successColor; // verde claro
      case 'checklist_en_progreso':
        return primaryColor; // azul - orden en proceso
      case 'checklist_completado':
        return successColor; // verde claro
      case 'en_proceso':
        return primaryColor; // azul - orden en proceso
      case 'completado':
        return successColor; // verde - completado
      case 'cancelado':
        return errorColor; // rojo - orden cancelada
      default:
        return neutralColor; // gris - orden entrante
    }
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

  // Si no está verificado, mostrar la pantalla de revisión
  if (!estadoProveedor.verificado) {
    return <EstadoRevisionScreen estadoProveedor={estadoProveedor} />;
  }

  // Si está verificado, mostrar el dashboard principal
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
              onPress={() => router.push('/solicitudes-disponibles')}
            >
              <BlurView intensity={60} tint="light" style={styles.bellBlur}>
                <Bell size={20} color="#374151" />
              </BlurView>
              {nuevasSolicitudesIds.size > 0 && (
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
          {/* 2. RESUMEN FINANCIERO */}
          {saldoCreditos && (
            <View style={styles.sectionWrap}>
              <View style={styles.glassOuter}>
                <BlurView intensity={60} tint="light" style={styles.glassInner}>
                  <View style={styles.finHeader}>
                    <Text style={styles.finHeaderTitle}>FINANZAS DEL TALLER</Text>
                    <TouchableOpacity
                      style={styles.planBadge}
                      onPress={() => router.push('/creditos?tab=suscripcion')}
                      activeOpacity={0.7}
                    >
                      <ShieldCheck size={14} color="#2563EB" />
                      <Text style={styles.planBadgeText}>
                        {suscripcion?.plan?.nombre || 'Plan Básico'}
                      </Text>
                    </TouchableOpacity>
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

          {/* 3. RADAR DE OPORTUNIDADES */}
          <View style={styles.sectionWrap}>
            <View style={styles.sectionTitleRow}>
              <Radar size={20} color="#374151" />
              <Text style={styles.sectionTitleText}>Radar de Oportunidades</Text>
              <View style={{ flex: 1 }} />
              <Switch
                value={isOnline}
                onValueChange={setIsOnline}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={isOnline ? '#2563EB' : '#9CA3AF'}
              />
            </View>

            {isOnline && (
            <View style={styles.glassOuter}>
              <BlurView intensity={60} tint="light" style={styles.glassInner}>
                <View style={styles.radarBody}>
                  {loadingSolicitudes ? (
                      <View style={styles.radarSearching}>
                        <ActivityIndicator size="small" color="#2563EB" />
                      </View>
                    ) : solicitudesDisponibles.length > 0 ? (
                      <>
                        {solicitudesDisponibles.slice(0, 3).map((solicitud) => {
                          const servicios = solicitud.servicios_solicitados_detail || [];
                          const primerServicio = servicios[0]?.nombre || 'Servicio solicitado';
                          const vehiculo = solicitud.vehiculo_info;
                          const vehiculoText = vehiculo
                            ? `${vehiculo.marca} ${vehiculo.modelo}`
                            : '';
                          return (
                            <TouchableOpacity
                              key={solicitud.id}
                              style={styles.radarOffer}
                              onPress={() => router.push(`/solicitud-detalle/${solicitud.id}`)}
                              activeOpacity={0.8}
                            >
                              <View style={styles.radarOfferTop}>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.radarOfferTitle} numberOfLines={1}>
                                    {primerServicio}
                                  </Text>
                                  {vehiculoText ? (
                                    <View style={styles.radarOfferMeta}>
                                      <Car size={13} color="#6B7280" />
                                      <Text style={styles.radarOfferMetaText}>
                                        {vehiculoText}
                                      </Text>
                                    </View>
                                  ) : null}
                                </View>
                                {solicitud.fecha_expiracion && (
                                  <CountdownTimer targetDate={solicitud.fecha_expiracion} />
                                )}
                              </View>
                              <TouchableOpacity
                                style={styles.radarCTA}
                                onPress={() =>
                                  router.push(`/solicitud-detalle/${solicitud.id}`)
                                }
                                activeOpacity={0.8}
                              >
                                <Text style={styles.radarCTAText}>Cotizar Trabajo</Text>
                                <ChevronRight size={16} color="#FFFFFF" />
                              </TouchableOpacity>
                            </TouchableOpacity>
                          );
                        })}
                        {solicitudesDisponibles.length > 3 && (
                          <TouchableOpacity
                            style={styles.seeAllBtn}
                            onPress={() => router.push('/solicitudes-disponibles')}
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

          {/* 4. MIS ÓRDENES ACTIVAS */}
          <View style={styles.sectionWrap}>
            <View style={styles.sectionTitleRow}>
              <Briefcase size={20} color="#374151" />
              <Text style={styles.sectionTitleText}>Órdenes en Curso</Text>
              <View style={{ flex: 1 }} />
              {ordenes.filter(o => {
                const estadosFinalizadosOrden = ['completado', 'cancelado', 'rechazada_por_proveedor', 'devuelto'];
                const estadosFinalizadosOferta = ['completada', 'rechazada', 'retirada', 'expirada'];
                if (estadosFinalizadosOrden.includes(o.estado)) return false;
                const ofertaId = o.oferta_proveedor_id ? String(o.oferta_proveedor_id) : null;
                if (ofertaId && ofertasMap[ofertaId] && estadosFinalizadosOferta.includes(ofertasMap[ofertaId])) return false;
                return true;
              }).length > 0 && (
                <TouchableOpacity onPress={() => router.push('/(tabs)/ordenes')}>
                  <Text style={styles.seeAllLink}>Ver todas</Text>
                </TouchableOpacity>
              )}
            </View>

            {(() => {
              const estadosFinalizadosOrden = ['completado', 'cancelado', 'rechazada_por_proveedor', 'devuelto'];
              const estadosFinalizadosOferta = ['completada', 'rechazada', 'retirada', 'expirada'];
              const ordenesEnCurso = ordenes.filter(o => {
                if (estadosFinalizadosOrden.includes(o.estado)) return false;
                const ofertaId = o.oferta_proveedor_id ? String(o.oferta_proveedor_id) : null;
                if (ofertaId && ofertasMap[ofertaId] && estadosFinalizadosOferta.includes(ofertasMap[ofertaId])) return false;
                return true;
              });

              if (loading) {
                return (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text style={styles.loadingRowText}>Cargando órdenes...</Text>
                  </View>
                );
              }

              if (ordenesEnCurso.length > 0) {
                return [...ordenesEnCurso]
                  .sort(
                    (a, b) =>
                      new Date(b.fecha_hora_solicitud || b.fecha_servicio).getTime() -
                      new Date(a.fecha_hora_solicitud || a.fecha_servicio).getTime()
                  )
                  .slice(0, 5)
                  .map((orden) => renderTransactionItem(orden));
              }

              return (
                <View style={styles.emptyBox}>
                  <Briefcase size={40} color="#D1D5DB" />
                  <Text style={styles.emptyTitle}>No tienes órdenes en curso</Text>
                  <Text style={styles.emptySub}>
                    Las órdenes aparecerán aquí cuando tengas trabajos activos
                  </Text>
                </View>
              );
            })()}
          </View>

          {/* 5. CATEGORÍAS DE GESTIÓN - Grid glass */}
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
                    style={[styles.mgmtCard, styles.mgmtCardFull]}
                    onPress={() => router.push('/zonas-servicio')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.mgmtIconBox, { backgroundColor: '#ECFDF5' }]}>
                      <Map size={22} color="#059669" />
                    </View>
                    <View style={styles.mgmtCardTextCol}>
                      <Text style={styles.mgmtCardTitle}>Zonas</Text>
                      <Text style={styles.mgmtCardSub}>Cobertura a domicilio</Text>
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
  seeAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
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
  radarOffer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 10,
  },
  radarOfferTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  radarOfferTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  radarOfferMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  radarOfferMetaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  radarCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  radarCTAText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
  ticketCard: {
    marginBottom: 14,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  ticketTop: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ticketBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  ticketBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  ticketTimeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketTimeText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  ticketDash: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    marginHorizontal: 16,
  },
  ticketBody: {
    padding: 16,
    gap: 10,
  },
  ticketServiceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  ticketClientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketClientPhoto: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  ticketClientPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketClientInitial: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  ticketClientName: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  ticketInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  ticketInfoText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  ticketPriceBlock: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'flex-end',
  },
  ticketPriceLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  ticketPriceAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
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
  loadingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  loadingRowText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  emptySub: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
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
});

