import React, { useEffect, useState, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { router, useFocusEffect } from 'expo-router';
import EstadoRevisionScreen from '@/components/EstadoRevisionScreen';
import { ordenesProveedorService, type Orden, obtenerNombreSeguro } from '@/services/ordenesProveedor';
import { checklistService, type ChecklistInstance } from '@/services/checklistService';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import solicitudesService, { type SolicitudPublica } from '@/services/solicitudesService';
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
        // Actualizar alertas cuando se regresa a la pantalla principal
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
        todasLasOrdenes = activasResult.data;
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
      cargarEstadisticasMP()
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

  // Calcular porcentaje de cambio (simulado - se puede mejorar con datos reales)
  const calcularPorcentajeCambio = () => {
    // Por ahora retornamos un valor fijo, pero se puede calcular comparando semanas
    return '+14.35%';
  };

  // Función para renderizar item de lista como UI Card
  const renderTransactionItem = (orden: OrdenConChecklist) => {
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
        <View style={{ flex: 1, gap: 10 }}>
          {/* Header con Categoría y Fecha */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{
              backgroundColor: orden.tipo_servicio === 'domicilio'
                ? (safeColors?.success as any)?.['50'] || '#ECFDF5'
                : (safeColors?.info as any)?.['50'] || '#EFF6FF',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: orden.tipo_servicio === 'domicilio'
                ? (safeColors?.success as any)?.['200'] || '#A7F3D0'
                : (safeColors?.info as any)?.['200'] || '#BFDBFE',
            }}>
              <Text style={{
                fontSize: 11,
                fontWeight: '700',
                color: orden.tipo_servicio === 'domicilio'
                  ? (safeColors?.success as any)?.['700'] || '#047857'
                  : (safeColors?.info as any)?.['700'] || '#1D4ED8',
                textTransform: 'uppercase'
              }}>
                {orden.tipo_servicio === 'domicilio' ? 'A Domicilio' : 'En Taller'}
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: (safeColors?.text as any)?.primary || '#000000' }}>
                {formatearFecha(orden.fecha_servicio)}
              </Text>
              {orden.hora_servicio && (
                <Text style={{ fontSize: 12, color: (safeColors?.text as any)?.tertiary || '#666666' }}>
                  {formatearHora(orden.hora_servicio)} hrs
                </Text>
              )}
            </View>
          </View>

          {/* Vehículo Destacado */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="car" size={18} color={(safeColors?.text as any)?.secondary || '#4B5563'} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: (safeColors?.text as any)?.primary || '#000000' }}>
              {orden.vehiculo_detail?.marca} {orden.vehiculo_detail?.modelo}
            </Text>
            {orden.vehiculo_detail?.año && (
              <Text style={{ fontSize: 14, color: (safeColors?.text as any)?.tertiary || '#9CA3AF' }}>
                ({orden.vehiculo_detail.año})
              </Text>
            )}
          </View>

          {/* Servicio Título */}
          <Text style={{
            fontSize: 16,
            color: (safeColors?.text as any)?.primary || '#374151',
            lineHeight: 22
          }}>
            {nombreServicio}
          </Text>

          {/* Footer con Usuario y Precio */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 4,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: (safeColors?.border as any)?.light || '#F3F4F6'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {clienteFoto ? (
                <Image source={{ uri: clienteFoto }} style={{ width: 24, height: 24, borderRadius: 12 }} />
              ) : (
                <MaterialIcons name="account-circle" size={24} color={(safeColors?.text as any)?.disabled || '#D1D5DB'} />
              )}
              <Text style={{ fontSize: 13, color: (safeColors?.text as any)?.secondary || '#4B5563' }}>
                {nombreCompleto}
              </Text>
            </View>
            {precioConSimbolo && (
              <Text style={{ fontSize: 16, fontWeight: '800', color: (safeColors?.success as any)?.['600'] || '#059669' }}>
                {precioConSimbolo}
              </Text>
            )}
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
      {/* Header con SafeAreaView */}
      <SafeAreaView edges={['top']} style={[styles.headerSafeArea, { backgroundColor: primaryColor }]}>
        <View style={[styles.header, { backgroundColor: primaryColor }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>{obtenerNombreProveedor()}</Text>
          </View>
          <View style={styles.headerAlertsContainer}>
            <AlertsPanel variant="header" iconColor="#FFFFFF" />
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View style={styles.content}>

          {/* Saldo de créditos */}
          {saldoCreditos && (
            <View style={styles.creditosContainer}>
              <SaldoCreditos
                saldo={saldoCreditos.saldo_creditos}
                ganancias={estadisticasMP?.total_recibido_mes || 0}
                onPress={() => router.push('/creditos')}
              />
            </View>
          )}

          {/* Quick Actions - Diseño similar a categorías de app usuarios */}
          <View style={styles.quickActionsSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickActionsHorizontal}
              bounces={false}
              decelerationRate="fast"
            >
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => router.push('/(tabs)/calendario')}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIconCircle, {
                  backgroundColor: COLORS?.background?.paper || '#FFFFFF',
                  padding: 0,
                  overflow: 'hidden'
                }]}>
                  <Image
                    source={require('../../assets/images/calendario_icon.jpg')}
                    style={{ width: 68, height: 68, borderRadius: 34 }}
                    resizeMode="cover"
                  />
                </View>
                <Text style={styles.quickActionCardLabel} numberOfLines={2}>
                  Calendario
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => router.push('/(tabs)/ordenes?tab=completadas')}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIconCircle, {
                  backgroundColor: COLORS?.background?.paper || '#FFFFFF',
                  padding: 0,
                  overflow: 'hidden'
                }]}>
                  <Image
                    source={require('../../assets/images/historial_icon.jpg')}
                    style={{ width: 68, height: 68, borderRadius: 34 }}
                    resizeMode="cover"
                  />
                </View>
                <Text style={styles.quickActionCardLabel} numberOfLines={2}>
                  Historial
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => router.push('/configuracion-mercadopago')}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIconCircle, {
                  backgroundColor: COLORS?.background?.paper || '#FFFFFF',
                  padding: 0,
                  overflow: 'hidden'
                }]}>
                  <Image
                    source={require('../../assets/images/mercadopago_icon.jpg')}
                    style={{ width: 68, height: 68, borderRadius: 34 }}
                    resizeMode="cover"
                  />
                </View>
                <Text style={styles.quickActionCardLabel} numberOfLines={2}>
                  Mercado Pago
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => router.push('/creditos')}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIconCircle, {
                  backgroundColor: COLORS?.background?.paper || '#FFFFFF',
                  padding: 0,
                  overflow: 'hidden'
                }]}>
                  <Image
                    source={require('../../assets/images/creditos_icon.jpg')}
                    style={{ width: 68, height: 68, borderRadius: 34 }}
                    resizeMode="cover"
                  />
                </View>
                <Text style={styles.quickActionCardLabel} numberOfLines={2}>
                  Créditos
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Sección de Oportunidades de Trabajo - PRIMERO (arriba de Mis Órdenes) */}
          <View style={styles.transactionsSection}>
            <View style={styles.transactionsHeader}>
              <Text style={styles.transactionsTitle}>Oportunidades de Trabajo</Text>
              {solicitudesDisponibles.length > 3 && (
                <TouchableOpacity
                  style={styles.viewAllLink}
                  onPress={() => router.push('/solicitudes-disponibles')}
                >
                  <Text style={styles.viewAllLinkText}>Ver todas</Text>
                </TouchableOpacity>
              )}
            </View>

            {loadingSolicitudes ? (
              <View style={styles.loadingOrdenes}>
                <ActivityIndicator size="small" color={primaryColor} />
                <Text style={styles.loadingOrdenesTextDark}>Cargando...</Text>
              </View>
            ) : solicitudesDisponibles.length > 0 ? (
              <>
                {solicitudesDisponibles.slice(0, 5).map((solicitud) => {
                  const clienteFoto = solicitud.cliente_info?.foto_perfil || (solicitud as any).cliente_detail?.foto_perfil;
                  // Corregir: Dar prioridad a la info detallada del cliente sobre el nombre plano
                  const nombreCliente = solicitud.cliente_info?.nombre || (solicitud as any).cliente_detail?.nombre || solicitud.cliente_nombre || 'Cliente';
                  const servicios = solicitud.servicios_solicitados_detail || [];
                  const primerServicio = servicios[0]?.nombre || 'Servicio solicitado';
                  const serviciosTexto = servicios.length > 1
                    ? servicios.map(s => s.nombre).join(', ')
                    : primerServicio;
                  const vehiculo = solicitud.vehiculo_info;
                  const vehiculoMarca = vehiculo?.marca || '';
                  const vehiculoModelo = vehiculo?.modelo || '';
                  const vehiculoAno = vehiculo?.anio || vehiculo?.año || '';

                  // Determinar tipo de servicio: si tiene dirección es a domicilio, si no es en taller
                  const esDomicilio = !!(solicitud.direccion_servicio_texto || solicitud.direccion_usuario_info || solicitud.ubicacion_servicio);
                  const tipoServicioTexto = esDomicilio ? 'A domicilio' : 'En taller';

                  return (
                    <TouchableOpacity
                      key={solicitud.id}
                      style={styles.opportunityCard}
                      onPress={() => router.push(`/solicitud-detalle/${solicitud.id}`)}
                      activeOpacity={0.8}
                    >
                      {/* Cabecera con Badge de Categoría y Precio/Tipo */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <View style={{
                          backgroundColor: (safeColors?.primary as any)?.['50'] || '#E6F2FF',
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: (safeColors?.primary as any)?.['200'] || '#BFDBFE',
                        }}>
                          <Text style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: (safeColors?.primary as any)?.['700'] || '#1D4ED8',
                            textTransform: 'uppercase'
                          }}>
                            {tipoServicioTexto}
                          </Text>
                        </View>

                        {/* Fecha de Servicio Destacada */}
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          {/* Timer de expiración */}
                          {solicitud.fecha_expiracion && (
                            <CountdownTimer targetDate={solicitud.fecha_expiracion} />
                          )}

                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: (safeColors?.text as any)?.primary || '#000000' }}>
                              {solicitud.fecha_preferida
                                ? new Date(solicitud.fecha_preferida).toLocaleDateString('es-CL', {
                                  day: 'numeric',
                                  month: 'short'
                                })
                                : 'Fecha flexible'}
                            </Text>
                            <Text style={{ fontSize: 12, color: (safeColors?.text as any)?.tertiary || '#666666' }}>
                              {solicitud.hora_preferida ? formatearHora(solicitud.hora_preferida) : 'Por definir'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Contenido principal */}
                      <View style={styles.opportunityCardContent}>
                        {/* Título: Nombre del servicio */}
                        <Text style={[styles.orderListCardTitle, { marginBottom: 8 }]} numberOfLines={2}>
                          {serviciosTexto}
                        </Text>

                        {/* Información del Vehículo Destacada */}
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: (safeColors?.neutral as any)?.gray?.[50] || '#F9FAFB',
                          padding: 10,
                          borderRadius: 8,
                          marginBottom: 8,
                          borderWidth: 1,
                          borderColor: (safeColors?.border as any)?.light || '#EEEEEE'
                        }}>
                          <Ionicons name="car-sport" size={20} color={(safeColors?.primary as any)?.['500'] || '#4E4FEB'} style={{ marginRight: 8 }} />
                          <View>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: (safeColors?.text as any)?.primary || '#000000' }}>
                              {vehiculoMarca} {vehiculoModelo}
                            </Text>
                            {vehiculoAno ? (
                              <Text style={{ fontSize: 13, color: (safeColors?.text as any)?.secondary || '#4B5563' }}>
                                Año {vehiculoAno}
                              </Text>
                            ) : null}
                          </View>
                        </View>

                        {/* Información del usuario (más sutil) */}
                        {/* Información del usuario (más visible) */}
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginTop: 4,
                          marginBottom: 8,
                          gap: 8
                        }}>
                          {clienteFoto ? (
                            <Image
                              source={{ uri: clienteFoto }}
                              style={{ width: 28, height: 28, borderRadius: 14 }}
                            />
                          ) : (
                            <View style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              backgroundColor: (safeColors?.neutral as any)?.gray?.[200] || '#E5E7EB',
                              justifyContent: 'center',
                              alignItems: 'center'
                            }}>
                              <MaterialIcons name="person" size={16} color={(safeColors?.text as any)?.secondary || '#6B7280'} />
                            </View>
                          )}

                          <View>
                            <Text style={{ fontSize: 12, color: (safeColors?.text as any)?.tertiary || '#6B7280', marginBottom: 2 }}>
                              Cliente
                            </Text>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: (safeColors?.text as any)?.primary || '#1F2937' }}>
                              {nombreCliente}
                            </Text>
                          </View>
                        </View>

                        {/* Botón de acción */}
                        <View style={styles.opportunityCardActionButton}>
                          <Text style={styles.opportunityCardActionText}>
                            Ver detalle y ofertar
                          </Text>
                          <MaterialIcons name="arrow-forward" size={16} color={(safeColors?.primary as any)?.['500'] || (safeColors?.accent as any)?.['500'] || '#4E4FEB'} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="search" size={48} color={(safeColors?.text?.tertiary || (safeColors?.neutral?.gray as any)?.[700] || '#666666')} />
                <Text style={styles.emptyStateTextDark}>
                  No hay oportunidades disponibles
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Revisa más tarde para encontrar nuevas oportunidades
                </Text>
              </View>
            )}
          </View>

          {/* Sección de Mis Órdenes - SEGUNDO (debajo de Oportunidades) */}
          <View style={styles.transactionsSection}>
            <View style={styles.transactionsHeader}>
              <Text style={styles.transactionsTitle}>Mis Órdenes</Text>
              {ordenes.length > 0 && (
                <TouchableOpacity
                  style={styles.viewAllLink}
                  onPress={() => router.push('/(tabs)/ordenes')}
                >
                  <Text style={styles.viewAllLinkText}>Ver todas</Text>
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
              <View style={styles.loadingOrdenes}>
                <ActivityIndicator size="small" color={primaryColor} />
                <Text style={styles.loadingOrdenesTextDark}>Cargando órdenes...</Text>
              </View>
            ) : ordenes.length > 0 ? (
              // Agrupar órdenes por fecha y mostrar estilo transacciones
              (() => {
                const ordenesOrdenadas = [...ordenes]
                  .sort((a, b) => {
                    const fechaA = new Date(a.fecha_hora_solicitud || a.fecha_servicio).getTime();
                    const fechaB = new Date(b.fecha_hora_solicitud || b.fecha_servicio).getTime();
                    return fechaB - fechaA;
                  })
                  .slice(0, 5);

                // Agrupar por fecha
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);
                const ayer = new Date(hoy);
                ayer.setDate(ayer.getDate() - 1);

                const ordenesHoy = ordenesOrdenadas.filter(orden => {
                  const fechaOrden = new Date(orden.fecha_hora_solicitud || orden.fecha_servicio);
                  fechaOrden.setHours(0, 0, 0, 0);
                  return fechaOrden.getTime() === hoy.getTime();
                });

                const ordenesAyer = ordenesOrdenadas.filter(orden => {
                  const fechaOrden = new Date(orden.fecha_hora_solicitud || orden.fecha_servicio);
                  fechaOrden.setHours(0, 0, 0, 0);
                  return fechaOrden.getTime() === ayer.getTime();
                });

                const ordenesAnteriores = ordenesOrdenadas.filter(orden => {
                  const fechaOrden = new Date(orden.fecha_hora_solicitud || orden.fecha_servicio);
                  fechaOrden.setHours(0, 0, 0, 0);
                  return fechaOrden.getTime() < ayer.getTime();
                });

                return (
                  <>
                    {ordenesHoy.length > 0 && (
                      <>
                        <Text style={styles.transactionDateLabel}>Hoy</Text>
                        {ordenesHoy.map((orden) => renderTransactionItem(orden))}
                      </>
                    )}
                    {ordenesAyer.length > 0 && (
                      <>
                        <Text style={styles.transactionDateLabel}>Ayer</Text>
                        {ordenesAyer.map((orden) => renderTransactionItem(orden))}
                      </>
                    )}
                    {ordenesAnteriores.length > 0 && (
                      <>
                        {ordenesAnteriores.map((orden) => renderTransactionItem(orden))}
                      </>
                    )}
                  </>
                );
              })()
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="assignment" size={48} color={(safeColors?.text?.tertiary || (safeColors?.neutral?.gray as any)?.[700] || '#666666')} />
                <Text style={styles.emptyStateTextDark}>
                  No tienes órdenes asignadas
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Las órdenes aparecerán aquí cuando te asignen trabajos
                </Text>
              </View>
            )}
          </View>



          {/* App Features Guide - Always visible at the bottom */}
          <View style={styles.featuresGuideContainer}>
            <Text style={styles.featuresGuideTitle}>Con la App de Profesional Mecánico podrás:</Text>

            <View style={styles.featureItem}>
              <View style={[styles.featureIconContainer, { backgroundColor: '#E0F2FE' }]}>
                <MaterialIcons name="work-outline" size={24} color="#0061FF" />
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>Ver oportunidades de trabajo reales</Text>
                <Text style={styles.featureDescription}>
                  Los servicios llegan a ti, no necesitas buscarlos.
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIconContainer, { backgroundColor: '#DCFCE7' }]}>
                <MaterialIcons name="settings-remote" size={24} color="#10B981" />
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>Control total de tus servicios</Text>
                <Text style={styles.featureDescription}>
                  Gestiona tus órdenes y clientes desde un solo lugar.
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIconContainer, { backgroundColor: '#F3E8FF' }]}>
                <MaterialIcons name="payments" size={24} color="#9333EA" />
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>Recibe pagos seguros</Text>
                <Text style={styles.featureDescription}>
                  Pagos garantizados y seguros con Mercado Pago.
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIconContainer, { backgroundColor: '#FEF3C7' }]}>
                <MaterialIcons name="schedule" size={24} color="#D97706" />
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>Trabaja cuando quieras</Text>
                <Text style={styles.featureDescription}>
                  Tú decides tu horario y disponibilidad.
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIconContainer, { backgroundColor: '#FCE7F3' }]}>
                <MaterialIcons name="rocket-launch" size={24} color="#EC4899" />
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>Aumenta tu alcance</Text>
                <Text style={styles.featureDescription}>
                  Diversos paquetes de créditos para llegar a más clientes.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Alerta de pago expirado o cancelado */}
      <AlertaPagoExpirado
        visible={mostrarAlertaPago}
        mensaje={alertaMensaje}
        tipo={alertaTipo}
        ofertaId={alertaOfertaId}
        solicitudId={alertaSolicitudId}
        creditosDevueltos={alertaCreditosDevueltos}
        onDismiss={async () => {
          setMostrarAlertaPago(false);
          // Marcar alerta como descartada en el backend si hay solicitud_id
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
    </TabScreenWrapper>
  );
}

// Función para crear estilos usando tokens del sistema de diseño
const createStyles = () => {
  // Valores seguros con fallbacks
  const bgPaper = COLORS?.background?.paper || COLORS?.base?.white || '#FFFFFF';
  const bgDefault = COLORS?.background?.default || '#EEEEEE';
  const textPrimary = COLORS?.text?.primary || COLORS?.neutral?.inkBlack || '#000000';
  const textSecondary = COLORS?.text?.secondary || COLORS?.neutral?.gray?.[700] || '#666666';
  const neutralGrayObj = COLORS?.neutral?.gray as any;
  const textTertiary = COLORS?.text?.tertiary || neutralGrayObj?.[700] || '#666666';
  const borderLight = COLORS?.border?.light || COLORS?.neutral?.gray?.[200] || '#EEEEEE';
  const borderMain = COLORS?.border?.main || COLORS?.neutral?.gray?.[300] || '#D0D0D0';
  // Acceso seguro a propiedades numéricas usando type assertion
  const primaryObj = COLORS?.primary as any;
  const accentObj = COLORS?.accent as any;
  const successObj = COLORS?.success as any;
  const warningObj = COLORS?.warning as any;
  const infoObj = COLORS?.info as any;
  const errorObj = COLORS?.error as any;

  const primary500 = primaryObj?.['500'] || '#4E4FEB';
  const accent500 = accentObj?.['500'] || '#FF6B00';
  const success500 = successObj?.['500'] || '#3DB6B1';
  const warningColor = warningObj?.main || warningObj?.['500'] || '#FFB84D';
  const infoColor = infoObj?.main || infoObj?.['500'] || accentObj?.['500'] || '#068FFF';
  const errorColor = errorObj?.main || errorObj?.['500'] || '#FF5555';

  const spacingXs = SPACING?.xs || 4;
  const spacingSm = SPACING?.sm || 8;
  const spacingMd = SPACING?.md || 16;
  const spacingLg = SPACING?.lg || 24;
  const spacingXl = SPACING?.xl || 32;

  // Espaciado optimizado para contenido y containers
  const containerHorizontal = SPACING?.container?.horizontal || SPACING?.content?.horizontal || 18;
  const containerVertical = SPACING?.container?.vertical || SPACING?.content?.vertical || 20;
  const cardPadding = SPACING?.cardPadding || spacingMd;
  const cardGap = SPACING?.cardGap || spacingSm;
  const cardMargin = SPACING?.cardMargin || spacingSm;

  const fontSizeXs = TYPOGRAPHY?.fontSize?.xs || 10;
  const fontSizeSm = TYPOGRAPHY?.fontSize?.sm || 12;
  const fontSizeBase = TYPOGRAPHY?.fontSize?.base || 14;
  const fontSizeMd = TYPOGRAPHY?.fontSize?.md || 16;
  const fontSizeLg = TYPOGRAPHY?.fontSize?.lg || 18;
  const fontSizeXl = TYPOGRAPHY?.fontSize?.xl || 20;
  const fontSize2xl = TYPOGRAPHY?.fontSize?.['2xl'] || 24;
  const fontSize3xl = TYPOGRAPHY?.fontSize?.['3xl'] || 28;

  const fontWeightLight = TYPOGRAPHY?.fontWeight?.light || '300';
  const fontWeightRegular = TYPOGRAPHY?.fontWeight?.regular || '400';
  const fontWeightMedium = TYPOGRAPHY?.fontWeight?.medium || '500';
  const fontWeightSemibold = TYPOGRAPHY?.fontWeight?.semibold || '600';
  const fontWeightBold = TYPOGRAPHY?.fontWeight?.bold || '700';

  const radiusSm = BORDERS?.radius?.sm || 4;
  const radiusMd = BORDERS?.radius?.md || 8;
  const radiusLg = BORDERS?.radius?.lg || 12;
  const radiusXl = BORDERS?.radius?.xl || 16;
  const radius2xl = BORDERS?.radius?.['2xl'] || 20;
  const radiusFull = BORDERS?.radius?.full || 9999;
  const cardRadius = BORDERS?.radius?.card?.md || radiusLg;

  // Definir borderWidthThin para usar en los estilos
  const borderWidthThin = BORDERS?.width?.thin || 1;

  const shadowSm = SHADOWS?.sm || { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 };
  const shadowMd = SHADOWS?.md || { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bgPaper,
    },
    headerSafeArea: {
      borderBottomWidth: 0,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: containerHorizontal,
      paddingVertical: spacingMd,
    },
    headerContent: {
      flex: 1,
    },
    headerAlertsContainer: {
      marginLeft: spacingSm,
    },
    headerTitle: {
      fontSize: fontSize2xl,
      fontWeight: fontWeightBold,
      color: '#FFFFFF',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: bgPaper,
    },
    loadingText: {
      marginTop: spacingMd,
      fontSize: fontSizeMd,
      color: textTertiary,
    },
    scrollContainer: {
      flex: 1,
      backgroundColor: bgPaper,
    },
    scrollableHeader: {
      paddingHorizontal: containerHorizontal,
      paddingVertical: spacingMd,
      backgroundColor: bgPaper,
      borderBottomWidth: 1,
      borderBottomColor: borderLight,
    },
    content: {
      paddingHorizontal: 0,
      paddingVertical: containerVertical,
      backgroundColor: bgPaper,
      flex: 1,
    },
    welcomeSection: {
      marginBottom: spacingLg + 6, // 30
    },
    saludo: {
      fontSize: fontSize2xl,
      fontWeight: fontWeightLight,
      color: textSecondary,
      marginBottom: spacingXs,
    },
    nombreProveedor: {
      fontSize: fontSize3xl,
      fontWeight: fontWeightBold,
      color: textPrimary,
      marginBottom: spacingSm + 4, // 12
    },
    estadoBadge: {
      backgroundColor: (successObj?.light || successObj?.['50'] || COLORS?.background?.success),
      paddingHorizontal: spacingSm + 4, // 12
      paddingVertical: 6,
      borderRadius: radius2xl,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: (successObj?.light || successObj?.['100'] || COLORS?.success?.light),
    },
    estadoText: {
      color: (successObj?.text || successObj?.['700'] || COLORS?.text?.onSuccess),
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
    },
    alertaChecklist: {
      backgroundColor: (warningObj?.light || warningObj?.['50'] || COLORS?.background?.warning),
      borderWidth: 1,
      borderColor: (warningObj?.light || warningObj?.['100'] || COLORS?.warning?.light),
      borderRadius: radiusLg,
      padding: spacingMd,
      marginBottom: spacingXl,
    },
    alertaChecklistContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm + 4, // 12
    },
    alertaChecklistTexto: {
      flex: 1,
    },
    alertaChecklistTitle: {
      fontSize: fontSizeMd,
      fontWeight: fontWeightSemibold,
      color: (warningObj?.text || warningObj?.['700'] || COLORS?.text?.onWarning),
      marginBottom: 2,
    },
    alertaChecklistSubtitle: {
      fontSize: fontSizeBase,
      color: (warningObj?.text || warningObj?.['700'] || COLORS?.text?.onWarning),
    },
    ordenesSection: {
      marginBottom: spacingLg + 6, // 30
    },
    ordenesTitle: {
      fontSize: fontSizeXl + 2, // 22
      fontWeight: fontWeightBold,
      color: textPrimary,
      marginBottom: spacingSm,
    },
    ordenesSubtitle: {
      fontSize: fontSizeMd,
      color: textTertiary,
      marginBottom: spacingXl,
    },
    loadingOrdenes: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacingXl,
    },
    loadingOrdenesText: {
      marginLeft: 10,
      fontSize: fontSizeMd,
      color: textTertiary,
    },
    emptyState: {
      backgroundColor: bgPaper,
      padding: spacingXl,
      borderRadius: radiusLg,
      alignItems: 'center',
      marginBottom: 10,
    },
    emptyStateIcon: {
      marginBottom: spacingMd,
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: COLORS?.neutral?.gray?.[100] || '#F3F4F6',
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyStateText: {
      fontSize: fontSizeMd,
      color: textTertiary,
      textAlign: 'center',
    },
    modernCard: {
      backgroundColor: bgPaper,
      borderRadius: cardRadius,
      ...shadowSm,
      marginBottom: cardGap,
      marginHorizontal: 0,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: borderLight,
    },
    pendingCard: {
      borderLeftWidth: 4,
      borderLeftColor: warningColor,
    },
    urgentCard: {
      borderLeftWidth: 4,
      borderLeftColor: errorColor,
    },
    completableCard: {
      borderLeftWidth: 4,
      borderLeftColor: success500,
    },
    cardHeader: {
      paddingHorizontal: spacingMd,
      paddingVertical: spacingSm + 4, // 12
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 0,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm,
    },
    orderNumber: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      color: COLORS?.base?.white || '#FFFFFF',
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacingXs,
    },
    orderStatus: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightSemibold,
      color: COLORS?.base?.white || '#FFFFFF',
      textTransform: 'uppercase',
    },
    pendingIcon: {
      marginLeft: spacingXs,
    },
    cardContent: {
      padding: spacingMd,
    },
    // Nuevos estilos para diseño minimalista
    headerSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacingLg,
      paddingTop: 0, // El padding vertical viene del contenedor
    },
    headerLeftSection: {
      flex: 1,
    },
    welcomeText: {
      fontSize: fontSizeMd,
      color: textTertiary,
      marginBottom: spacingXs,
      fontWeight: fontWeightRegular,
    },
    providerName: {
      fontSize: fontSize2xl,
      fontWeight: fontWeightBold,
      color: textPrimary,
      marginBottom: spacingSm,
    },
    priorityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: spacingXs,
    },
    priorityText: {
      fontSize: fontSizeBase,
      color: primary500,
      fontWeight: fontWeightMedium,
    },
    profileImage: {
      width: 56,
      height: 56,
      borderRadius: radiusFull,
      borderWidth: 2,
      borderColor: borderMain,
    },
    profileImagePlaceholder: {
      width: 56,
      height: 56,
      borderRadius: radiusFull,
      backgroundColor: COLORS?.neutral?.gray?.[100] || '#EBEFF1',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: borderMain,
    },
    summaryCard: {
      borderRadius: radius2xl,
      padding: spacingLg,
      marginBottom: spacingLg,
      minHeight: 180,
    },
    summaryCardContent: {
      flex: 1,
      justifyContent: 'space-between',
    },
    summaryAmountContainer: {
      marginBottom: spacingSm,
    },
    summaryAmount: {
      fontSize: fontSize3xl + 8, // 36
      fontWeight: fontWeightBold,
      color: COLORS?.base?.white || '#FFFFFF',
      lineHeight: 42,
    },
    summaryAmountDecimals: {
      fontSize: fontSize2xl,
    },
    summaryLabel: {
      fontSize: fontSizeMd,
      color: COLORS?.base?.white || '#FFFFFF',
      opacity: 0.9,
      marginBottom: spacingXs,
    },
    summaryDescription: {
      fontSize: fontSizeBase,
      color: COLORS?.base?.white || '#FFFFFF',
      opacity: 0.8,
    },
    categoryCardsContainer: {
      flexDirection: 'row',
      gap: spacingMd,
      marginBottom: spacingLg,
      paddingHorizontal: 0,
    },
    categoryCard: {
      flex: 1,
      backgroundColor: bgPaper,
      borderRadius: radiusXl,
      padding: spacingLg,
      ...shadowSm,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 120,
      gap: spacingMd,
    },
    categoryCardTitle: {
      fontSize: fontSizeMd,
      fontWeight: fontWeightBold,
      color: textPrimary,
      textAlign: 'center',
    },
    ordersSection: {
      marginBottom: spacingLg,
    },
    sectionHeaderWithDescription: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacingMd,
      gap: spacingMd,
    },
    sectionHeaderContent: {
      flex: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacingMd,
    },
    sectionDescription: {
      fontSize: fontSizeSm,
      color: textTertiary,
      marginTop: spacingXs / 2,
      fontWeight: fontWeightRegular,
    },
    viewAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingXs / 2,
      paddingTop: spacingXs,
    },
    viewAllText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      color: primary500 || accent500 || '#4E4FEB',
    },
    sectionTitle: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
      color: textPrimary,
    },
    sortButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingXs,
    },
    sortButtonText: {
      fontSize: fontSizeBase,
      color: textPrimary,
      fontWeight: fontWeightMedium,
    },
    incomingServiceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacingMd,
      backgroundColor: bgPaper,
      borderRadius: radiusXl,
      marginBottom: spacingSm + 4, // 12
      gap: spacingSm + 4, // 12
      ...shadowMd,
    },
    orderItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: cardPadding,
      backgroundColor: bgPaper,
      borderRadius: cardRadius,
      marginBottom: cardGap,
      marginHorizontal: 0, // El padding horizontal viene del contenedor padre
      gap: spacingSm + 4, // 12
      ...shadowSm,
      borderWidth: 1,
      borderColor: borderLight,
    },
    serviceItemInfo: {
      flex: 1,
      marginLeft: spacingSm + 4, // 12
    },
    serviceItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacingSm,
    },
    serviceItemName: {
      fontSize: fontSizeMd,
      fontWeight: fontWeightBold,
      color: textPrimary,
      flex: 1,
    },
    serviceItemDetails: {
      gap: spacingXs,
    },
    serviceItemDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 2,
    },
    serviceItemDate: {
      fontSize: fontSizeBase - 1, // 13
      color: textTertiary,
    },
    serviceItemType: {
      fontSize: fontSizeBase - 1, // 13
      color: textTertiary,
      flex: 1,
    },
    serviceItemPrice: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      color: success500,
    },
    serviceItemStatus: {
      alignItems: 'flex-end',
      gap: spacingXs,
    },
    actionHint: {
      fontSize: fontSizeXs + 1, // 11
      color: textTertiary,
      fontStyle: 'italic',
      marginTop: 2,
    },
    serviceItemStatusText: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightSemibold,
      paddingHorizontal: spacingSm + 4, // 12
      paddingVertical: spacingXs,
      borderRadius: radiusLg,
      overflow: 'hidden',
    },
    statusSuccess: {
      backgroundColor: success500,
      color: COLORS?.base?.white || '#FFFFFF',
    },
    statusFailed: {
      backgroundColor: errorColor,
      color: COLORS?.base?.white || '#FFFFFF',
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: spacingXs,
      borderRadius: radiusLg,
      minWidth: 80,
      alignItems: 'center',
    },
    statusBadgeText: {
      fontSize: fontSizeXs + 1, // 11
      fontWeight: fontWeightSemibold,
      color: COLORS?.base?.white || '#FFFFFF',
      textTransform: 'uppercase',
    },
    loadingOrdenesTextDark: {
      marginLeft: 10,
      fontSize: fontSizeMd,
      color: textTertiary,
    },
    emptyStateTextDark: {
      fontSize: fontSizeMd,
      fontWeight: fontWeightSemibold,
      color: textPrimary,
      textAlign: 'center',
      marginTop: spacingMd,
      marginBottom: spacingXs,
    },
    emptyStateSubtext: {
      fontSize: fontSizeSm,
      color: textTertiary,
      textAlign: 'center',
      paddingHorizontal: spacingMd,
    },
    // Nuevos estilos para cards de órdenes
    orderCard: {
      backgroundColor: bgPaper,
      borderRadius: radiusXl,
      padding: spacingLg,
      marginBottom: cardGap,
      ...shadowSm,
    },
    orderCardHeader: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacingXs + 1,
      marginBottom: spacingMd,
    },
    orderStatusBadge: {
      paddingHorizontal: spacingSm + 2,
      paddingVertical: spacingXs + 1,
      borderRadius: radiusLg,
    },
    orderStatusText: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightSemibold,
      color: COLORS?.base?.white || '#FFFFFF',
    },
    urgentBadgeSmall: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: errorColor,
      paddingHorizontal: spacingXs + 2,
      paddingVertical: spacingXs,
      borderRadius: radiusSm,
      gap: spacingXs / 2,
    },
    urgentBadgeTextSmall: {
      fontSize: fontSizeSm - 1,
      fontWeight: fontWeightBold,
      color: COLORS?.base?.white || '#FFFFFF',
    },
    checklistPendingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: (warningObj?.light || warningObj?.['50'] || COLORS?.warning?.light),
      paddingHorizontal: spacingXs + 2,
      paddingVertical: spacingXs,
      borderRadius: radiusSm,
      gap: spacingXs / 2,
      borderWidth: 1,
      borderColor: (warningObj?.['200'] || warningColor),
    },
    checklistPendingText: {
      fontSize: fontSizeSm - 1,
      fontWeight: fontWeightSemibold,
      color: (warningObj?.text || warningObj?.['700'] || COLORS?.warning?.text),
    },
    orderCardClientRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm + 2,
      marginBottom: spacingMd,
      paddingBottom: spacingMd,
      borderBottomWidth: 1,
      borderBottomColor: borderLight,
    },
    orderClientPhoto: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: (neutralGrayObj?.[200]) || '#E5E7EB',
    },
    orderClientPhotoPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: primary500,
      alignItems: 'center',
      justifyContent: 'center',
    },
    orderClientInfo: {
      flex: 1,
    },
    orderClientName: {
      fontSize: fontSizeMd + 1,
      fontWeight: fontWeightBold,
      color: textPrimary,
      marginBottom: spacingXs / 2,
    },
    orderVehicleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingXs / 2,
      marginTop: 2,
    },
    orderVehicleText: {
      fontSize: fontSizeBase,
      color: textTertiary,
      flex: 1,
    },
    orderCardServiceInfo: {
      marginBottom: spacingMd,
      gap: spacingSm,
    },
    orderServiceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingXs + 1,
    },
    orderServiceText: {
      fontSize: fontSizeBase,
      color: textPrimary,
      flex: 1,
    },
    orderDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingXs + 1,
    },
    orderDateText: {
      fontSize: fontSizeBase,
      color: textTertiary,
    },
    orderCardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: spacingMd,
      borderTopWidth: 1,
      borderTopColor: borderLight,
    },
    orderFooterLeft: {
      flex: 1,
    },
    serviceTypeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingXs / 2,
      alignSelf: 'flex-start',
    },
    serviceTypeText: {
      fontSize: fontSizeSm,
      color: primary500,
      fontWeight: fontWeightMedium,
    },
    orderPrice: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
      color: textPrimary,
    },
    viewAllOrdersButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacingSm + 4,
      marginTop: spacingSm,
      gap: spacingXs,
    },
    viewAllOrdersText: {
      color: primary500 || accent500 || '#4E4FEB',
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
    },
    solicitudesSection: {
      marginTop: spacingLg,
      marginBottom: spacingLg + 6, // 30
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm,
    },
    badgeNuevo: {
      backgroundColor: errorColor,
      borderRadius: radiusLg,
      paddingHorizontal: spacingSm,
      paddingVertical: 2,
      minWidth: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeNuevoTexto: {
      color: COLORS?.base?.white || '#FFFFFF',
      fontSize: fontSizeXs + 1, // 11
      fontWeight: fontWeightBold,
    },
    verTodasTexto: {
      color: accent500,
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
    },
    verTodasButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacingSm + 4, // 12
      marginTop: spacingSm,
      gap: spacingXs,
    },
    verTodasButtonTexto: {
      color: accent500,
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
    },
    // Estilos minimalistas para órdenes activas
    minimalCard: {
      backgroundColor: bgPaper,
      borderRadius: radiusXl,
      padding: spacingMd,
      marginBottom: spacingSm + 4, // 12
      ...SHADOWS?.sm || shadowMd,
    },
    minimalCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacingMd,
      paddingBottom: spacingSm + 4, // 12
      borderBottomWidth: 1,
      borderBottomColor: borderLight,
    },
    minimalHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm,
    },
    minimalOrderNumber: {
      fontSize: fontSizeMd,
      fontWeight: fontWeightSemibold,
      color: textPrimary,
    },
    minimalStatusBadge: {
      paddingHorizontal: spacingSm + 4, // 12
      paddingVertical: spacingXs,
      borderRadius: radiusLg,
    },
    minimalStatusText: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightSemibold,
      color: COLORS?.base?.white || '#FFFFFF',
      textTransform: 'uppercase',
    },
    minimalVehicleSection: {
      marginBottom: spacingSm + 4, // 12
    },
    minimalVehicleBrand: {
      fontSize: fontSizeMd,
      fontWeight: fontWeightBold,
      color: textPrimary,
      marginBottom: spacingXs,
    },
    minimalVehicleDetails: {
      fontSize: fontSizeBase,
      color: textTertiary,
    },
    minimalClientSection: {
      marginBottom: spacingSm + 4, // 12
    },
    minimalClientName: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightMedium,
      color: primary500,
    },
    minimalTimeSection: {
      marginBottom: spacingSm + 4, // 12
    },
    minimalTimeText: {
      fontSize: fontSizeBase - 1, // 13
      color: textTertiary,
    },
    minimalServicesSection: {
      marginBottom: spacingSm + 4, // 12
    },
    minimalServiceText: {
      fontSize: fontSizeBase - 1, // 13
      color: textPrimary,
      marginBottom: spacingXs,
    },
    minimalMoreServices: {
      fontSize: fontSizeSm,
      color: textTertiary,
      fontStyle: 'italic',
    },
    minimalChecklistInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: spacingSm + 4, // 12
    },
    minimalChecklistText: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightMedium,
    },
    minimalPriceSection: {
      marginBottom: spacingSm + 4, // 12
    },
    minimalPriceAmount: {
      fontSize: fontSizeXl,
      fontWeight: fontWeightBold,
      color: success500,
    },
    minimalActionSection: {
      flexDirection: 'row',
      gap: 10,
      paddingTop: spacingSm + 4, // 12
      borderTopWidth: 1,
      borderTopColor: borderLight,
    },
    minimalDetailButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: spacingMd,
      borderRadius: radiusSm,
      borderWidth: 1,
      borderColor: borderMain,
      backgroundColor: COLORS?.neutral?.gray?.[50] || '#F9F9F9',
      alignItems: 'center',
    },
    minimalDetailButtonFull: {
      width: '100%',
      paddingVertical: 10,
      paddingHorizontal: spacingMd,
      borderRadius: radiusSm,
      borderWidth: 1,
      borderColor: borderMain,
      backgroundColor: COLORS?.neutral?.gray?.[50] || '#F9F9F9',
      alignItems: 'center',
    },
    minimalDetailButtonText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightMedium,
      color: textSecondary,
    },
    // Estilos adicionales que pueden estar siendo usados
    clientPhotoInList: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: borderMain,
    },
    clientPhotoPlaceholderInList: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: COLORS?.neutral?.gray?.[100] || '#EBEFF1',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: borderMain,
    },
    // Mantener todos los estilos adicionales para compatibilidad
    serviceItemIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS?.neutral?.gray?.[50] || '#F9F9F9',
      justifyContent: 'center',
      alignItems: 'center',
    },
    vehicleSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacingMd,
      paddingBottom: spacingSm + 4, // 12
      borderBottomWidth: 1,
      borderBottomColor: borderLight,
    },
    vehicleIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS?.neutral?.gray?.[50] || '#F9F9F9',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacingSm + 4, // 12
    },
    vehicleInfo: {
      flex: 1,
    },
    vehicleBrand: {
      fontSize: fontSizeMd,
      fontWeight: fontWeightBold,
      color: textPrimary,
      marginBottom: 2,
    },
    vehicleDetails: {
      fontSize: fontSizeBase - 1, // 13
      color: textTertiary,
    },
    priceContainer: {
      alignItems: 'flex-end',
    },
    priceLabel: {
      fontSize: fontSizeXs + 1, // 11
      color: textTertiary,
      textTransform: 'uppercase',
      fontWeight: fontWeightSemibold,
    },
    priceAmount: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
      color: success500,
    },
    clientSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacingSm + 4, // 12
      backgroundColor: COLORS?.neutral?.gray?.[50] || '#F9F9F9',
      padding: spacingSm,
      borderRadius: 6,
    },
    clientIcon: {
      marginRight: spacingSm,
    },
    clientName: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightMedium,
      color: primary500,
    },
    serviceTimeSection: {
      flexDirection: 'row',
      gap: spacingMd,
    },
    timeBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS?.info?.light || '#E6F5F9',
      paddingHorizontal: spacingSm,
      paddingVertical: spacingXs,
      borderRadius: radiusSm,
      gap: spacingXs,
    },
    timeText: {
      fontSize: fontSizeSm,
      color: infoColor,
      fontWeight: fontWeightMedium,
    },
    servicesSection: {
      marginBottom: spacingSm + 4, // 12
    },
    servicesTitle: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      color: textPrimary,
      marginBottom: 6,
    },
    serviceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacingXs,
      gap: spacingSm,
    },
    serviceText: {
      fontSize: fontSizeBase - 1, // 13
      color: textTertiary,
    },
    serviceType: {
      fontSize: fontSizeXs + 1, // 11
      color: accent500,
      fontWeight: fontWeightMedium,
    },
    moreServices: {
      fontSize: fontSizeSm,
      color: accent500,
      fontStyle: 'italic',
      marginLeft: 22,
    },
    checklistBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: (infoObj?.light || infoObj?.['50'] || COLORS?.info?.light),
      padding: 10,
      borderRadius: 6,
      marginBottom: spacingSm + 4, // 12
      borderLeftWidth: 3,
      borderLeftColor: primary500,
      gap: spacingSm,
    },
    checklistUrgent: {
      backgroundColor: (warningObj?.light || warningObj?.['50'] || COLORS?.background?.warning),
      borderLeftColor: warningColor,
    },
    checklistCompleted: {
      backgroundColor: (successObj?.light || successObj?.['50'] || COLORS?.background?.success),
      borderLeftColor: success500,
    },
    checklistText: {
      fontSize: fontSizeBase - 1, // 13
      fontWeight: fontWeightMedium,
      flex: 1,
    },
    urgentAlert: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: (errorObj?.light || errorObj?.['50'] || COLORS?.error?.light),
      padding: 10,
      borderRadius: 6,
      marginBottom: spacingSm + 4, // 12
      borderWidth: 1,
      borderColor: (errorObj?.light || errorObj?.['100'] || COLORS?.error?.light),
      gap: spacingSm,
    },
    urgentAlertText: {
      fontSize: fontSizeSm,
      color: (errorObj?.text || errorObj?.['700'] || COLORS?.text?.onError),
      fontWeight: fontWeightMedium,
      flex: 1,
    },
    progressSection: {
      marginBottom: spacingSm + 4, // 12
      backgroundColor: COLORS?.neutral?.gray?.[50] || '#F9F9F9',
      padding: 10,
      borderRadius: 6,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    progressLabel: {
      fontSize: fontSizeSm,
      color: textSecondary,
      fontWeight: fontWeightSemibold,
    },
    progressPercentage: {
      fontSize: fontSizeSm,
      color: warningColor,
    },
    progressBarContainer: {
      height: 6,
      backgroundColor: borderLight,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      backgroundColor: warningColor,
      borderRadius: 3,
    },
    actionSection: {
      paddingHorizontal: spacingMd,
      paddingVertical: spacingSm + 4, // 12
      borderTopWidth: 1,
      borderTopColor: borderLight,
    },
    pendingActions: {
      gap: 10,
    },
    detailButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacingSm,
      paddingHorizontal: spacingSm + 4, // 12
      borderRadius: 6,
      borderWidth: 1,
      borderColor: borderMain,
      backgroundColor: COLORS?.neutral?.gray?.[50] || '#F9F9F9',
      gap: 6,
      justifyContent: 'center',
    },
    detailButtonFull: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacingSm + 4, // 12
      paddingHorizontal: spacingMd,
      borderRadius: radiusSm,
      borderWidth: 1,
      borderColor: borderMain,
      backgroundColor: COLORS?.neutral?.gray?.[50] || '#F9F9F9',
      gap: spacingSm,
      justifyContent: 'center',
      width: '100%',
    },
    detailButtonText: {
      fontSize: fontSizeBase,
      color: textSecondary,
      fontWeight: fontWeightMedium,
    },
    decisionButtons: {
      flexDirection: 'row',
      gap: 10,
    },
    rejectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacingSm + 4, // 12
      paddingHorizontal: spacingXl,
      borderRadius: 25,
      backgroundColor: errorColor,
      flex: 1,
      justifyContent: 'center',
      gap: 6,
    },
    rejectButtonText: {
      fontSize: fontSizeBase,
      color: COLORS?.base?.white || '#FFFFFF',
      fontWeight: fontWeightSemibold,
    },
    acceptButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacingSm + 4, // 12
      paddingHorizontal: spacingXl,
      borderRadius: 25,
      backgroundColor: success500,
      flex: 1,
      justifyContent: 'center',
      gap: 6,
    },
    acceptButtonText: {
      fontSize: fontSizeBase,
      color: COLORS?.base?.white || '#FFFFFF',
      fontWeight: fontWeightSemibold,
    },
    activeActions: {
      flexDirection: 'row',
      gap: 10,
    },
    checklistActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacingSm + 4, // 12
      paddingHorizontal: spacingXl,
      borderRadius: 25,
      flex: 2,
      justifyContent: 'center',
      gap: 6,
    },
    checklistActionText: {
      fontSize: fontSizeBase,
      color: COLORS?.base?.white || '#FFFFFF',
      fontWeight: fontWeightSemibold,
    },
    urgentActionButton: {
      elevation: 2,
      shadowColor: errorColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    timeLimit: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS?.error?.light || '#FFEBEE',
      padding: spacingSm,
      borderRadius: 6,
      marginBottom: spacingSm + 4, // 12
    },
    timeLimitText: {
      fontSize: fontSizeSm,
      color: COLORS?.error?.text || '#8B1A1A',
      fontWeight: fontWeightMedium,
    },
    infoCard: {
      backgroundColor: bgPaper,
      padding: spacingXl,
      borderRadius: radiusLg,
      ...shadowMd,
    },
    infoTitle: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
      color: textPrimary,
      marginBottom: spacingMd,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacingSm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS?.neutral?.gray?.[50] || '#F9F9F9',
    },
    infoLabel: {
      fontSize: fontSizeBase,
      color: textTertiary,
      flex: 1,
    },
    infoValue: {
      fontSize: fontSizeBase,
      color: textPrimary,
      fontWeight: fontWeightMedium,
      flex: 2,
      textAlign: 'right',
    },
    verificado: {
      color: success500,
    },
    // Estilos para Créditos
    creditosContainer: {
      marginHorizontal: containerHorizontal,
      marginBottom: spacingMd,
      marginTop: spacingMd,
    },
    // Estilos para Quick Actions - Diseño similar a categorías de app usuarios
    quickActionsSection: {
      marginBottom: spacingLg,
    },
    quickActionsHorizontal: {
      paddingVertical: spacingXs,
      paddingHorizontal: spacingMd,
      alignItems: 'center',
      justifyContent: 'center',
      flexGrow: 1,
    },
    quickActionCard: {
      alignItems: 'center',
      justifyContent: 'flex-start',
      width: 90,
      marginRight: spacingMd,
      paddingVertical: 0,
    },
    quickActionIconCircle: {
      width: 68,
      height: 68,
      borderRadius: 34,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacingXs,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 3,
    },
    quickActionCardLabel: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightMedium,
      color: textPrimary,
      textAlign: 'center',
      lineHeight: fontSizeSm * 1.3,
      maxWidth: 90,
      paddingHorizontal: spacingXs,
      marginTop: 0,
      flexShrink: 1,
    },
    // Estilos para Transactions Section
    transactionsSection: {
      marginBottom: spacingLg,
      marginHorizontal: containerHorizontal,
    },
    transactionsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacingMd,
    },
    transactionsHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm,
    },
    transactionsTitle: {
      fontSize: fontSize2xl + 2, // 26
      fontWeight: fontWeightBold,
      color: textPrimary,
      letterSpacing: -0.5,
    },
    viewAllLink: {
      paddingVertical: spacingXs,
    },
    viewAllLinkText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      color: primary500 || accent500 || '#4E4FEB',
    },
    transactionDateLabel: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      color: textSecondary,
      marginTop: spacingMd,
      marginBottom: spacingSm,
    },
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacingMd,
      paddingHorizontal: 0,
      gap: spacingMd,
    },
    transactionIconContainer: {
      position: 'relative',
    },
    transactionIconImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: borderLight,
    },
    transactionIconPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    newBadgeDot: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: errorColor,
      borderWidth: 2,
      borderColor: bgPaper,
    },
    transactionContent: {
      flex: 1,
    },
    transactionType: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      color: textPrimary,
      marginBottom: 2,
    },
    transactionDescription: {
      fontSize: fontSizeSm,
      color: textTertiary,
    },
    transactionAmount: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightBold,
      color: textPrimary,
    },
    // Estilos para Order List Cards (UI Card format) - Mejorado
    orderListCard: {
      backgroundColor: bgPaper,
      borderRadius: radiusXl,
      padding: spacingMd + 4, // 20
      marginBottom: spacingMd,
      ...shadowSm,
      borderWidth: borderWidthThin,
      borderColor: borderLight,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacingMd,
      minHeight: 120,
    },
    orderListCardContent: {
      flex: 1,
      gap: spacingSm,
      minWidth: 0,
      paddingRight: spacingSm,
    },
    orderListCardTitle: {
      fontSize: fontSizeLg, // 18
      fontWeight: fontWeightBold,
      color: textPrimary,
      marginBottom: spacingXs,
      lineHeight: fontSizeLg * 1.4,
    },
    orderListCardDate: {
      fontSize: fontSizeSm,
      color: textTertiary,
      marginBottom: spacingSm + 2,
      fontWeight: fontWeightRegular,
    },
    orderListCardUserSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm + 2,
      marginTop: spacingXs,
      paddingTop: spacingSm,
      borderTopWidth: borderWidthThin,
      borderTopColor: borderLight,
    },
    orderListCardUserPhoto: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: borderLight,
      flexShrink: 0,
      borderWidth: 1,
      borderColor: borderMain,
    },
    orderListCardUserPhotoPlaceholder: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: primary500,
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 0,
      borderWidth: 1,
      borderColor: (primaryObj?.['300'] || primary500),
    },
    orderListCardUserInfo: {
      flex: 1,
      gap: 3,
    },
    orderListCardUserName: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      color: textPrimary,
    },
    orderListCardVehicle: {
      fontSize: fontSizeSm,
      color: textTertiary,
      fontWeight: fontWeightRegular,
    },
    orderListCardServiceTypeContainer: {
      marginTop: spacingSm,
      marginBottom: spacingSm,
      alignSelf: 'flex-start',
    },
    orderListCardServiceType: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightMedium,
      color: textTertiary,
      paddingHorizontal: spacingSm + 4,
      paddingVertical: spacingXs + 2,
      backgroundColor: (neutralGrayObj?.[50] || COLORS?.neutral?.gray?.[50] || '#F9F9F9'),
      borderRadius: radiusSm,
      overflow: 'hidden',
      borderWidth: borderWidthThin,
      borderColor: borderLight,
    },
    orderListCardPriceContainer: {
      marginTop: spacingXs,
      paddingTop: spacingSm,
      borderTopWidth: borderWidthThin,
      borderTopColor: borderLight,
      width: '100%',
      alignItems: 'flex-end',
    },
    orderListCardPrice: {
      fontSize: fontSizeLg + 2, // 20
      fontWeight: fontWeightBold,
      color: success500 || '#3DB6B1',
      textAlign: 'right',
    },
    orderListCardActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacingXs,
      paddingHorizontal: spacingMd,
      paddingVertical: spacingSm + 2,
      marginTop: spacingSm,
      backgroundColor: (primaryObj?.['50'] || primaryObj?.['100'] || COLORS?.primary?.['50'] || '#F0F0FF'),
      borderRadius: radiusMd,
      borderWidth: borderWidthThin,
      borderColor: (primaryObj?.['200'] || primaryObj?.['300'] || primary500 || '#4E4FEB'),
      width: '100%',
    },
    orderListCardActionText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      color: primary500 || accent500 || '#4E4FEB',
    },
    // Estilos específicos para cards de oportunidades de trabajo
    opportunityCard: {
      backgroundColor: bgPaper,
      borderRadius: radiusXl,
      padding: spacingMd + 4, // 20
      marginBottom: spacingMd,
      ...shadowSm,
      borderWidth: borderWidthThin,
      borderColor: borderLight,
      flexDirection: 'column',
      alignItems: 'stretch',
      minHeight: 120,
    },
    opportunityCardContent: {
      flex: 1,
      gap: spacingSm,
      width: '100%',
    },
    opportunityCardServiceTypeContainer: {
      marginTop: spacingSm,
      marginBottom: spacingSm,
      alignSelf: 'flex-start',
    },
    opportunityCardServiceType: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightMedium,
      color: textTertiary,
      paddingHorizontal: spacingSm + 4,
      paddingVertical: spacingXs + 2,
      backgroundColor: (neutralGrayObj?.[50] || COLORS?.neutral?.gray?.[50] || '#F9F9F9'),
      borderRadius: radiusSm,
      overflow: 'hidden',
      borderWidth: borderWidthThin,
      borderColor: borderLight,
    },
    opportunityCardActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacingXs,
      paddingHorizontal: spacingMd,
      paddingVertical: spacingSm + 2,
      marginTop: spacingSm,
      backgroundColor: (primaryObj?.['50'] || primaryObj?.['100'] || COLORS?.primary?.['50'] || '#F0F0FF'),
      borderRadius: radiusMd,
      borderWidth: borderWidthThin,
      borderColor: (primaryObj?.['200'] || primaryObj?.['300'] || primary500 || '#4E4FEB'),
      width: '100%',
    },
    opportunityCardActionText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      color: primary500 || accent500 || '#4E4FEB',
    },
    // Features Guide Styles
    featuresGuideContainer: {
      marginTop: spacingXl || 32,
      marginHorizontal: 0, // Padding handled by parent container
      marginBottom: spacingLg || 24,
      backgroundColor: bgPaper || '#FFFFFF',
      borderRadius: radiusLg || 16,
      padding: spacingLg || 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.03)',
    },
    featuresGuideTitle: {
      fontSize: fontSizeLg || 18,
      fontWeight: '800',
      color: textPrimary || '#00171F',
      marginBottom: spacingLg || 20,
      textAlign: 'center',
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacingMd || 16,
    },
    featureIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacingMd || 16,
    },
    featureTextContainer: {
      flex: 1,
    },
    featureTitle: {
      fontSize: (fontSizeMd || 15) + 1,
      fontWeight: '700',
      color: textPrimary || '#00171F',
      marginBottom: 2,
    },
    featureDescription: {
      fontSize: 13,
      color: textSecondary || '#5D6F75',
      lineHeight: 18,
    },
  });
};

// Crear estilos usando la función
const styles = createStyles();

