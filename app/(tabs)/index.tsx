import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell, Calendar,
  ShieldCheck, Clock,
  ChevronRight,
  Wrench, Settings, Map, MapPin, AlertTriangle, CreditCard,
  Users,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useRadarOportunidades } from '@/context/RadarOportunidadesContext';
import { router, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { openSolicitudDetalle } from '@/utils/navigateProveedorDetalle';
import EstadoRevisionScreen from '@/components/EstadoRevisionScreen';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import websocketService, { type NuevaSolicitudEvent } from '@/app/services/websocketService';
import {
  useSolicitudesDisponiblesQuery,
  useSolicitudesDisponiblesRealtime,
} from '@/hooks/useSolicitudesDisponiblesQuery';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';
import { HomeInlineAlert } from '@/components/dashboard/HomeInlineAlert';
import { HomeSolicitudesSection } from '@/components/dashboard/HomeSolicitudesSection';
import AlertaPagoExpirado from '@/components/alerts/AlertaPagoExpirado';
import { useAlerts } from '@/context/AlertsContext';
import { PerformanceWidget } from '@/components/dashboard/PerformanceWidget';
import { FinanzasTallerCard } from '@/components/dashboard/FinanzasTallerCard';
import { FinanzasTallerCardSkeleton } from '@/components/dashboard/FinanzasTallerCardSkeleton';
import { useProveedorKpisResumen } from '@/hooks/useProveedorKpisResumen';
import {
  useSaldoCreditosQuery,
  useGananciasResumenQuery,
  useSuscripcionProveedorQuery,
  invalidateDashboardFinanzasQueries,
} from '@/hooks/useDashboardFinanzas';
import { estadoProveedorReloadKey } from '@/utils/estadoProveedorReloadKey';
import { devLog, devWarn } from '@/utils/devLog';
import { createHomeScreenStyles, type HomeScreenFonts } from '@/styles/homeScreenStyles';
import { horariosAPI } from '@/services/api';
import { MecanicoHomeView } from '@/components/home/MecanicoHomeView';
import {
  normalizarEstadoAgendaApi,
} from '@/utils/horariosProveedor';

export default function HomeScreen() {
  // Hook del sistema de diseño - acceso seguro a tokens
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { verificarYGenerarAlertas, saludSuscripcion, alertasNoLeidas } = useAlerts();

  const {
    isAuthenticated,
    isLoading,
    estadoProveedor,
    usuario,
    obtenerNombreProveedor,
    esSupervisor,
    esMecanicoEquipo,
    puede,
  } = useAuth();

  const {
    radarOportunidadesActivo,
    radarPreferenciaCargada,
    setRadarOportunidadesActivo,
  } = useRadarOportunidades();

  const esMecanicoDomicilio = estadoProveedor?.tipo_proveedor === 'mecanico';
  const esMultimarca = useMemo(() => {
    const cobertura =
      estadoProveedor?.tipo_cobertura_marca
      || (estadoProveedor?.datos_proveedor as { tipo_cobertura_marca?: string } | undefined)
        ?.tipo_cobertura_marca;
    return cobertura === 'multimarca';
  }, [estadoProveedor]);
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
      return `Índice del taller en Mecanimovil (últimos ${d} días). Posiciona tu negocio en la app de clientes.`;
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

  const dashboardFinanzasEnabled = Boolean(
    isAuthenticated && cuentaAprobadaPorAdmin && !isLoading,
  );
  const saldoCreditosQuery = useSaldoCreditosQuery(dashboardFinanzasEnabled && puede('finanzas'));
  const gananciasQuery = useGananciasResumenQuery(dashboardFinanzasEnabled && puede('finanzas'));
  const suscripcionQuery = useSuscripcionProveedorQuery(dashboardFinanzasEnabled && !esSupervisor);
  const saldoCreditos = saldoCreditosQuery.data;
  const gananciasResumen = gananciasQuery.data;
  const suscripcion = suscripcionQuery.data;

  // Solicitudes del radar (TanStack Query + invalidación por WS)
  const [nuevasSolicitudesIds, setNuevasSolicitudesIds] = useState<Set<string>>(new Set());
  const solicitudesRadarEnabled =
    cuentaAprobadaPorAdmin && radarPreferenciaCargada && radarOportunidadesActivo;
  const {
    data: solicitudesDisponibles = [],
    isLoading: loadingSolicitudes,
    refetch: refetchSolicitudesDisponibles,
  } = useSolicitudesDisponiblesQuery(solicitudesRadarEnabled);
  useSolicitudesDisponiblesRealtime({ enabled: solicitudesRadarEnabled });

  // Estado para alertas de pago expirado
  const [mostrarAlertaPago, setMostrarAlertaPago] = useState(false);
  const [alertaMensaje, setAlertaMensaje] = useState('');
  const [alertaTipo, setAlertaTipo] = useState<'expirado' | 'cancelado'>('expirado');
  const [alertaOfertaId, setAlertaOfertaId] = useState<string | undefined>(undefined);
  const [alertaSolicitudId, setAlertaSolicitudId] = useState<string | undefined>(undefined);
  const [alertaCreditosDevueltos, setAlertaCreditosDevueltos] = useState(false);

  const [radarSwitchLoading, setRadarSwitchLoading] = useState(false);
  /** null = aún no consultado; true = falta configurar horarios en BD */
  const [necesitaConfigurarHorarios, setNecesitaConfigurarHorarios] = useState<boolean | null>(null);

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

  const handleRecargarCreditos = useCallback(() => {
    router.push('/creditos?tab=tienda');
  }, []);

  const handleFinanzasCardPress = useCallback(() => {
    router.push('/creditos?tab=saldo');
  }, []);

  const handlePressPlanSuscripcion = useCallback(() => {
    router.push('/creditos?tab=suscripcion');
  }, []);

  const queryClient = useQueryClient();
  const lastFinanzasInvalidateRef = useRef(0);
  const FINANZAS_INVALIDATE_MIN_MS = 60_000;

  const handleOpenSolicitudDetalle = useCallback((solicitudId: string) => {
    const solicitud = solicitudesDisponibles.find((s) => String(s.id) === String(solicitudId));
    openSolicitudDetalle(
      router,
      queryClient,
      solicitudId,
      solicitud ? { solicitud } : undefined,
    );
  }, [queryClient, solicitudesDisponibles]);

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

  const verificarHorariosConfigurados = useCallback(async () => {
    if (!cuentaAprobadaPorAdmin) {
      setNecesitaConfigurarHorarios(null);
      return;
    }
    try {
      const estado = await horariosAPI.obtenerEstadoConfiguracion();
      const normalizado = normalizarEstadoAgendaApi(estado);
      setNecesitaConfigurarHorarios(normalizado.necesita_configurar);
    } catch (error) {
      devWarn('No se pudo verificar horarios del proveedor:', error);
      setNecesitaConfigurarHorarios(null);
    }
  }, [cuentaAprobadaPorAdmin]);

  // Redirigir al onboarding si el usuario no tiene perfil
  useEffect(() => {
    if (!isLoading && estadoProveedor) {
      if (!estadoProveedor.tiene_perfil || estadoProveedor.necesita_onboarding) {
        devLog('Usuario sin perfil de proveedor, redirigiendo al onboarding');
        router.replace('/(onboarding)/tipo-cuenta');
      }
    }
  }, [isLoading, estadoProveedor]);

  // Horarios: solo al montar o cuando cambia el perfil (no en cada focus).
  useEffect(() => {
    if (cuentaAprobadaPorAdmin) {
      verificarHorariosConfigurados();
    }
  }, [perfilProveedorKey, cuentaAprobadaPorAdmin, verificarHorariosConfigurados]);

  // Al volver al tab: alertas y finanzas actualizadas (tras cerrar órdenes o citas).
  useFocusEffect(
    React.useCallback(() => {
      if (!isAuthenticated || !cuentaAprobadaPorAdmin) return;
      if (dashboardFinanzasEnabled && puede('finanzas')) {
        const now = Date.now();
        if (now - lastFinanzasInvalidateRef.current >= FINANZAS_INVALIDATE_MIN_MS) {
          lastFinanzasInvalidateRef.current = now;
          invalidateDashboardFinanzasQueries(queryClient);
        }
      }
    }, [
      cuentaAprobadaPorAdmin,
      dashboardFinanzasEnabled,
      isAuthenticated,
      puede,
      queryClient,
    ]),
  );

  // Badge de novedad en header al recibir solicitud por WebSocket
  useEffect(() => {
    if (!cuentaAprobadaPorAdmin) return;

    const unsubscribe = websocketService.onNuevaSolicitud((event: NuevaSolicitudEvent) => {
      devLog('📬 Nueva solicitud recibida vía WebSocket:', event);
      setNuevasSolicitudesIds((prev) => new Set([...prev, event.solicitud_id]));
    });

    return () => {
      unsubscribe();
    };
  }, [cuentaAprobadaPorAdmin]);

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

  const onRefresh = async () => {
    setRefreshing(true);
    const tasks: Promise<unknown>[] = [
      saldoCreditosQuery.refresh(),
      gananciasQuery.refresh(),
      suscripcionQuery.refresh(),
      kpisResumen.refresh(),
      verificarHorariosConfigurados(),
    ];
    if (solicitudesRadarEnabled) {
      tasks.push(refetchSolicitudesDisponibles());
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

  const primaryObj = safeColors?.primary as any;
  const accentObj = safeColors?.accent as any;

  const primaryColor = primaryObj?.['500'] || accentObj?.['500'] || COLORS.institutional.primary;
  const loadingColor = primaryColor;

  const palette = useMemo(() => {
    const inst = (safeColors as any)?.institutional ?? COLORS.institutional;
    const warn = (safeColors as any)?.warning ?? COLORS.warning;
    return {
      ...inst,
      primary: primaryColor,
      warningEmphasis: typeof warn?.text === 'string' ? warn.text : COLORS.warning.text,
    };
  }, [safeColors, primaryColor]);

  const themedStyles = useMemo(() => {
    const typo = safeTypography as any;
    const ff = typo?.fontFamily ?? TYPOGRAPHY.fontFamily;
    const fonts: HomeScreenFonts = {
      sansRegular: ff.sansRegular ?? 'System',
      sansMedium: ff.sansMedium ?? ff.sansRegular ?? 'System',
      sansSemiBold: ff.sansSemiBold ?? 'System',
      mono: ff.monoMedium ?? 'System',
    };
    const br = safeBorders?.radius ?? BORDERS.radius;
    const hPad =
      typeof safeSpacing?.container?.horizontal === 'number'
        ? safeSpacing.container.horizontal
        : 20;
    const spFixed = safeSpacing?.fixed ?? SPACING.fixed;
    return createHomeScreenStyles(palette, fonts, {
      horizontalPadding: hPad,
      sectionMarginBottom: typeof spFixed?.lg === 'number' ? spFixed.lg : SPACING.fixed.lg,
      radiusCard: typeof br?.xl === 'number' ? br.xl : 24,
      radiusMd: typeof br?.md === 'number' ? br.md : 12,
      radiusSm: typeof br?.sm === 'number' ? br.sm : 8,
      avatarSize: 48,
    });
  }, [palette, safeTypography, safeBorders, safeSpacing]);

  // Mostrar loading si aún se está cargando el estado
  if (isLoading || !estadoProveedor) {
    return (
      <SafeAreaView style={themedStyles.loadingContainer}>
        <ActivityIndicator size="large" color={loadingColor} />
        <Text style={themedStyles.loadingText}>Cargando...</Text>
      </SafeAreaView>
    );
  }

  // Si no tiene perfil, no mostrar nada (se está redirigiendo)
  if (!estadoProveedor.tiene_perfil || estadoProveedor.necesita_onboarding) {
    return (
      <SafeAreaView style={themedStyles.loadingContainer}>
        <ActivityIndicator size="large" color={loadingColor} />
        <Text style={themedStyles.loadingText}>Redirigiendo al onboarding...</Text>
      </SafeAreaView>
    );
  }

  // Sin aprobación administrativa (estado aprobado), pantalla de revisión
  if (!cuentaAprobadaPorAdmin) {
    return <EstadoRevisionScreen estadoProveedor={estadoProveedor} />;
  }

  // Mecánico del equipo: home simplificado con órdenes asignadas
  if (esMecanicoEquipo) {
    const nombreTaller = obtenerNombreProveedor();
    const nombreMecanico =
      estadoProveedor?.miembro_nombre
      || `${usuario?.first_name || ''} ${usuario?.last_name || ''}`.trim()
      || usuario?.username
      || 'Mecánico';

    return (
      <TabScreenWrapper>
        <LinearGradient
          style={themedStyles.screen}
          colors={[palette.surfaceSoft, palette.canvas] as const}
          locations={[0, 1] as const}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        >
          <SafeAreaView edges={['top']} style={{ backgroundColor: palette.canvas }}>
            <View style={themedStyles.header}>
              <View style={themedStyles.headerLeft}>
                {(usuario as any)?.foto_perfil ? (
                  <Image source={{ uri: (usuario as any).foto_perfil }} style={themedStyles.avatar} />
                ) : (
                  <View style={themedStyles.avatarPlaceholder}>
                    <Text style={themedStyles.avatarInitial}>
                      {nombreMecanico.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={themedStyles.welcomeLabel} numberOfLines={1}>
                    {nombreTaller}
                  </Text>
                  <Text style={themedStyles.providerName} numberOfLines={1}>
                    {nombreMecanico}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={themedStyles.bellOuter}
                activeOpacity={0.7}
                onPress={() => router.push('/notificaciones')}
              >
                <View style={themedStyles.bellButton}>
                  <Bell size={20} color={palette.ink} />
                </View>
                {alertasNoLeidas > 0 ? (
                  <Animated.View style={[themedStyles.bellDot, { transform: [{ scale: pulseAnim }] }]} />
                ) : null}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
          <MecanicoHomeView />
        </LinearGradient>
      </TabScreenWrapper>
    );
  }

  // Cuenta aprobada: dashboard principal
  const showFinanzasCard = puede('finanzas') && (saldoCreditos || saldoCreditosQuery.loading);
  const dashboardTwoColumns = showFinanzasCard && windowWidth >= 560;

  return (
    <TabScreenWrapper>
      <LinearGradient
        style={themedStyles.screen}
        colors={[palette.surfaceSoft, palette.canvas] as const}
        locations={[0, 1] as const}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        {/* 1. HEADER */}
        <SafeAreaView edges={['top']} style={{ backgroundColor: palette.canvas }}>
          <View style={themedStyles.header}>
            <View style={themedStyles.headerLeft}>
              {(usuario as any)?.foto_perfil ? (
                <Image source={{ uri: (usuario as any).foto_perfil }} style={themedStyles.avatar} />
              ) : (
                <View style={themedStyles.avatarPlaceholder}>
                  <Text style={themedStyles.avatarInitial}>
                    {(obtenerNombreProveedor() || 'T').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={themedStyles.welcomeLabel}>Bienvenido</Text>
                <Text style={themedStyles.providerName} numberOfLines={1}>{obtenerNombreProveedor()}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={themedStyles.bellOuter}
              activeOpacity={0.7}
              onPress={() => router.push('/notificaciones')}
            >
              <View style={themedStyles.bellButton}>
                <Bell size={20} color={palette.ink} />
              </View>
              {(nuevasSolicitudesIds.size > 0 || alertasNoLeidas > 0) && (
                <Animated.View style={[themedStyles.bellDot, { transform: [{ scale: pulseAnim }] }]} />
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{
            paddingTop: SPACING.fixed.xl,
            paddingBottom: insets.bottom + (safeSpacing?.fixed?.xl ?? SPACING.fixed.xl),
          }}
        >
          {(necesitaConfigurarHorarios === true
            || (!esSupervisor && saludSuscripcion && saludSuscripcion.estado_salud !== 'ok')) ? (
            <View style={[themedStyles.sectionWrap, themedStyles.alertsStack]}>
              {necesitaConfigurarHorarios === true ? (
                <HomeInlineAlert
                  variant="warning"
                  Icon={Clock}
                  title="Configura tus horarios"
                  message="Activa el horario del taller o de al menos un mecánico para que los clientes puedan agendar."
                  onPress={() => router.push('/configuracion-horarios')}
                />
              ) : null}
              {!esSupervisor && saludSuscripcion && saludSuscripcion.estado_salud !== 'ok' ? (
                <HomeInlineAlert
                  variant={
                    saludSuscripcion.estado_salud === 'por_vencer' ? 'warning' : 'danger'
                  }
                  Icon={
                    saludSuscripcion.estado_salud === 'por_vencer'
                      ? Clock
                      : saludSuscripcion.estado_salud === 'pago_fallido'
                        ? CreditCard
                        : AlertTriangle
                  }
                  title={
                    saludSuscripcion.estado_salud === 'por_vencer'
                      ? 'Renovación próxima'
                      : saludSuscripcion.estado_salud === 'pago_fallido'
                        ? 'Pago fallido'
                        : saludSuscripcion.estado_salud === 'sin_suscripcion'
                          ? 'Sin suscripción'
                          : 'Suscripción vencida'
                  }
                  message={saludSuscripcion.mensaje ?? undefined}
                  onPress={
                    saludSuscripcion.accion
                      ? () => router.push(saludSuscripcion.accion as any)
                      : undefined
                  }
                />
              ) : null}
            </View>
          ) : null}

          {/* Rendimiento + finanzas (2 columnas en pantallas anchas) */}
          <View style={themedStyles.sectionWrap}>
            <View
              style={
                dashboardTwoColumns
                  ? themedStyles.dashboardDualRow
                  : themedStyles.dashboardDualStack
              }
            >
              <View style={dashboardTwoColumns ? themedStyles.dashboardDualCol : undefined}>
                <PerformanceWidget
                  progress={kpisResumen.progress}
                  targetTierName={kpisResumen.targetTierName}
                  periodSubtitle={rendimientoWidgetPeriod}
                  isLoading={kpisResumen.loading && !kpisResumen.hasData}
                  onPress={handlePerformanceWidgetPress}
                  fill={dashboardTwoColumns}
                />
              </View>
              {showFinanzasCard ? (
                <View style={dashboardTwoColumns ? themedStyles.dashboardDualCol : undefined}>
                  {saldoCreditos ? (
                    <FinanzasTallerCard
                      ganancias={gananciasResumen}
                      saldoCreditos={saldoCreditos}
                      suscripcion={suscripcion}
                      esSupervisor={esSupervisor}
                      isLoadingGanancias={gananciasQuery.loading && !gananciasResumen}
                      isLoadingCreditos={saldoCreditosQuery.loading && !saldoCreditos}
                      warningEmphasis={palette.warningEmphasis}
                      onPress={handleFinanzasCardPress}
                      onRecargarCreditos={handleRecargarCreditos}
                      onPressPlan={handlePressPlanSuscripcion}
                      fill={dashboardTwoColumns}
                    />
                  ) : (
                    <FinanzasTallerCardSkeleton fill={dashboardTwoColumns} />
                  )}
                </View>
              ) : null}
            </View>
          </View>

          {/* Solicitudes disponibles (toggle + listado unificado) */}
          <View style={themedStyles.sectionWrap}>
            <HomeSolicitudesSection
              radarActivo={radarOportunidadesActivo}
              radarPreferenciaCargada={radarPreferenciaCargada}
              radarSwitchLoading={radarSwitchLoading}
              loadingSolicitudes={loadingSolicitudes}
              solicitudes={solicitudesDisponibles}
              onToggleRadar={handleRadarOportunidadesToggle}
              onOpenDetail={handleOpenSolicitudDetalle}
              onVerTodas={handleVerSolicitudesDisponibles}
            />
          </View>

          {/* 4. CATEGORÍAS DE GESTIÓN (filtradas por rol/permisos del supervisor) */}
          {(() => {
            const mgmtItems: {
              key: string;
              title: string;
              Icon: typeof Calendar;
              color: string;
              route: string;
            }[] = [];

            // Calendario / agenda
            if (puede('agenda')) {
              mgmtItems.push({ key: 'calendario', title: 'Calendario', Icon: Calendar, color: palette.primary, route: '/(tabs)/calendario' });
            }
            // Marcas (identidad del taller): solo el dueño la edita
            if (!esMultimarca && !esSupervisor) {
              mgmtItems.push({ key: 'marcas', title: 'Marcas', Icon: Wrench, color: palette.ink, route: '/especialidades-marcas' });
            }
            // Servicios
            if (puede('servicios')) {
              mgmtItems.push({ key: 'servicios', title: 'Servicios', Icon: Settings, color: palette.ink, route: '/mis-servicios' });
            }
            // Horarios
            if (puede('horarios')) {
              mgmtItems.push({ key: 'horarios', title: 'Horarios', Icon: Clock, color: palette.ink, route: '/configuracion-horarios' });
            }
            // Equipo (mecánicos)
            if (!esMecanicoDomicilio && puede('mecanicos')) {
              mgmtItems.push({ key: 'equipo', title: 'Equipo', Icon: Users, color: palette.ink, route: '/gestion-equipo' });
            }
            // Ubicación / zonas (modalidad a domicilio)
            if (esMecanicoDomicilio) {
              // 'Mi ubicación' es del dueño legacy; no se muestra al supervisor.
              if (!esSupervisor) {
                mgmtItems.push({ key: 'ubicacion', title: 'Mi ubicación', Icon: MapPin, color: palette.ink, route: '/actualizar-ubicacion' });
              }
              if (puede('zonas_cobertura')) {
                mgmtItems.push({ key: 'zonas', title: 'Zonas', Icon: Map, color: palette.ink, route: '/zonas-servicio' });
              }
            }

            if (mgmtItems.length === 0) return null;

            const filas: (typeof mgmtItems)[] = [];
            for (let i = 0; i < mgmtItems.length; i += 2) {
              filas.push(mgmtItems.slice(i, i + 2));
            }

            return (
              <View style={themedStyles.sectionWrap}>
                <Text style={themedStyles.mgmtTitle}>Gestión del Taller</Text>
                <View style={themedStyles.mgmtGrid}>
                  {filas.map((fila, idx) => (
                    <View style={themedStyles.mgmtRow} key={`mgmt-row-${idx}`}>
                      {fila.map((item) => (
                        <TouchableOpacity
                          key={item.key}
                          style={themedStyles.mgmtCard}
                          onPress={() => router.push(item.route as any)}
                          activeOpacity={0.7}
                        >
                          <View style={themedStyles.mgmtIconBox}>
                            <item.Icon size={22} color={item.color} />
                          </View>
                          <View style={themedStyles.mgmtCardTextCol}>
                            <Text style={themedStyles.mgmtCardTitle}>{item.title}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}
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
