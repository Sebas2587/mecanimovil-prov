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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  Clock,
  AlertTriangle, CreditCard,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import EstadoRevisionScreen from '@/components/EstadoRevisionScreen';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import websocketService, { type NuevaSolicitudEvent } from '@/app/services/websocketService';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';
import { HOST_GUTTER, hostScreenStyles } from '@/app/design-system/components';
import { HomeInlineAlert } from '@/components/dashboard/HomeInlineAlert';
import { HomeTodayActions } from '@/components/dashboard/HomeTodayActions';
import { HomeServiciosRecientesSection } from '@/components/dashboard/HomeServiciosRecientesSection';
import AlertaPagoExpirado from '@/components/alerts/AlertaPagoExpirado';
import { useAlerts } from '@/context/AlertsContext';
import { AgendarDesdeCanalModal } from '@/components/chats/AgendarDesdeCanalModal';
import { estadoProveedorReloadKey } from '@/utils/estadoProveedorReloadKey';
import { devLog, devWarn } from '@/utils/devLog';
import { createHomeScreenStyles, type HomeScreenFonts } from '@/styles/homeScreenStyles';
import { horariosAPI } from '@/services/api';
import { MecanicoHomeView } from '@/components/home/MecanicoHomeView';
import { HomeBandejaEntry } from '@/components/dashboard/HomeBandejaEntry';
import { useAgenteBorradoresPendientesQuery } from '@/hooks/useAgenteIaQueries';
import {
  normalizarEstadoAgendaApi,
} from '@/utils/horariosProveedor';

export default function HomeScreen() {
  // Hook del sistema de diseño - acceso seguro a tokens
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { saludSuscripcion, alertasNoLeidas } = useAlerts();

  const {
    isLoading,
    estadoProveedor,
    usuario,
    obtenerNombreProveedor,
    esSupervisor,
    esMecanicoEquipo,
    puede,
  } = useAuth();

  /** Habilitado por admin para operar (≠ sello "Verificado" en perfil). */
  const cuentaAprobadaPorAdmin = estadoProveedor?.estado_verificacion === 'aprobado';
  const { data: borradoresAgente } = useAgenteBorradoresPendientesQuery(
    cuentaAprobadaPorAdmin && puede('servicios'),
  );
  const borradoresAgenteCount = borradoresAgente?.count ?? 0;
  const perfilProveedorKey = useMemo(
    () => estadoProveedorReloadKey(estadoProveedor ?? null),
    [estadoProveedor]
  );
  const [refreshing, setRefreshing] = useState(false);
  const [agendarRapidoVisible, setAgendarRapidoVisible] = useState(false);
  const [nuevasSolicitudesIds, setNuevasSolicitudesIds] = useState<Set<string>>(new Set());

  // Estado para alertas de pago expirado
  const [mostrarAlertaPago, setMostrarAlertaPago] = useState(false);
  const [alertaMensaje, setAlertaMensaje] = useState('');
  const [alertaTipo, setAlertaTipo] = useState<'expirado' | 'cancelado'>('expirado');
  const [alertaOfertaId, setAlertaOfertaId] = useState<string | undefined>(undefined);
  const [alertaSolicitudId, setAlertaSolicitudId] = useState<string | undefined>(undefined);
  const [alertaCreditosDevueltos, setAlertaCreditosDevueltos] = useState(false);

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
    await verificarHorariosConfigurados();
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
      paper: COLORS.background.paper,
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
    const spFixed = safeSpacing?.fixed ?? SPACING.fixed;
    return createHomeScreenStyles(palette, fonts, {
      /** Header (fuera del ScrollView); el scroll usa hostScreenStyles.scrollInner. */
      horizontalPadding: HOST_GUTTER,
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
        <View style={[themedStyles.screen, { backgroundColor: palette.canvas }]}>
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
        </View>
      </TabScreenWrapper>
    );
  }

  // Cuenta aprobada: dashboard principal
  return (
    <TabScreenWrapper>
      <View style={[themedStyles.screen, { backgroundColor: palette.canvas }]}>
        {/* 1. HEADER — Today */}
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
                <Text style={themedStyles.welcomeLabel}>{obtenerSaludo()}</Text>
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
          style={hostScreenStyles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={[
            hostScreenStyles.scrollInner,
            {
              paddingTop: SPACING.fixed.xl,
              paddingBottom: insets.bottom + (safeSpacing?.fixed?.xl ?? SPACING.fixed.xl),
            },
          ]}
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

          {/* 1) Crear: agendar / cotizar IA */}
          <View style={themedStyles.sectionWrap}>
            <HomeTodayActions
              onAgendar={() => setAgendarRapidoVisible(true)}
              onCotizarIa={() => router.push('/cotizar-ia')}
              showCotizarIa={puede('servicios')}
              cotizacionesIaPendientes={borradoresAgenteCount}
            />
          </View>

          {/* 2) Acceso primario a Bandeja (también es tab inferior) */}
          {!esMecanicoEquipo && cuentaAprobadaPorAdmin ? (
            <View style={themedStyles.sectionWrap}>
              <HomeBandejaEntry enabled={cuentaAprobadaPorAdmin} />
            </View>
          ) : null}

          {/* 3) Operación: órdenes/citas/ofertas activas del taller */}
          <View style={themedStyles.sectionWrap}>
            <HomeServiciosRecientesSection enabled={cuentaAprobadaPorAdmin} />
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

        <AgendarDesdeCanalModal
          visible={agendarRapidoVisible}
          onClose={() => setAgendarRapidoVisible(false)}
          subtitle="Agenda una cita personal para un cliente"
        />
        </View>
    </TabScreenWrapper>
  );
}
