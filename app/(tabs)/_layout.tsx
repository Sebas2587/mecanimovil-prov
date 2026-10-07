import { Tabs } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { Home, ClipboardList, ArrowRight, FileText, Users } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useAlerts } from '@/context/AlertsContext';
import { useRadarOportunidades } from '@/context/RadarOportunidadesContext';
import websocketService from '@/app/services/websocketService';
import connectionService from '@/services/connectionService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/app/design-system/tokens/colors';
import { platformShadow } from '@/app/design-system/tokens';
import { TYPOGRAPHY } from '@/app/design-system/tokens/typography';
import { useLegalConsentGate } from '@/hooks/useLegalConsentGate';
import LegalConsentModal from '@/components/legal/LegalConsentModal';
import MenuTabIcon from '@/components/navigation/MenuTabIcon';
import { TallerShellContext } from '@/components/navigation/TallerShellContext';
import { AgendaTabIcon, NuevaCotizacionFlotante, TallerChrome } from '@/components/navigation/TallerChrome';
import { usePipelineComercialQuery } from '@/hooks/usePipelineComercialQuery';
import { pasoDeCaso } from '@/utils/pasoComercial';
import { CotizacionLibreModal } from '@/components/chats/CotizacionLibreModal';
import { useInvalidateCotizacionesCanalTaller } from '@/hooks/useCotizacionesCanalTallerQuery';

const C = COLORS;

/**
 * Dueño: Hoy, Cotizaciones, Clientes y Agenda.
 * Escritorio web: esa barra va arriba. Teléfono y app nativa: abajo.
 * Mensajes, Servicios y Menú siguen a un toque en el cromado.
 * Mecánico: Hoy, Servicios y Menú, siempre abajo.
 */
export default function TabLayout() {
  const { isAuthenticated, isLoading, esMecanicoEquipo, estadoProveedor, obtenerNombreProveedor } = useAuth();
  const { width } = useWindowDimensions();
  const escritorio = Platform.OS === 'web' && width >= 1024 && !esMecanicoEquipo;
  const cuentaAprobada = estadoProveedor?.estado_verificacion === 'aprobado';
  const { needsConsent, clearNeedsConsent } = useLegalConsentGate(isAuthenticated);
  const { radarOportunidadesActivo, radarPreferenciaCargada } = useRadarOportunidades();
  const insets = useSafeAreaInsets();
  const pipeline = usePipelineComercialQuery(
    { limite: 100, fetchAllEstados: true },
    { enabled: cuentaAprobada && !esMecanicoEquipo },
  );
  const porAgendar = useMemo(
    () => (pipeline.data?.results ?? []).filter((row) => pasoDeCaso(row) === 'por_agendar').length,
    [pipeline.data?.results],
  );
  const [nuevaCotizacionAbierta, setNuevaCotizacionAbierta] = useState(false);
  const invalidarCotizaciones = useInvalidateCotizacionesCanalTaller();
  const abrirNuevaCotizacion = useCallback(() => setNuevaCotizacionAbierta(true), []);
  const shell = useMemo(
    () => ({
      ocupaTope: !esMecanicoEquipo,
      accionFlotante: !escritorio && !esMecanicoEquipo,
      abrirNuevaCotizacion,
    }),
    [esMecanicoEquipo, escritorio, abrirNuevaCotizacion],
  );

  useEffect(() => {
    websocketService.setMecanicoEquipoSession(Boolean(esMecanicoEquipo));
    websocketService.setTallerTabsSession(Boolean(isAuthenticated && !isLoading));
  }, [esMecanicoEquipo, isAuthenticated, isLoading]);

  useEffect(() => {
    if (__DEV__) {
      console.log('🏠 TabLayout - Monitoreando autenticación:', { isAuthenticated, isLoading });
    }

    if (!isLoading && !isAuthenticated) {
      if (__DEV__) {
        console.log('🚪 TabLayout - Usuario no autenticado, navegando al login');
      }
      websocketService.disconnect({ force: true });
      connectionService.stopConnectionMonitoring();
      router.replace('/(auth)/login');
    }

    if (!isLoading && isAuthenticated && radarPreferenciaCargada) {
      const mantenerWs =
        radarOportunidadesActivo || esMecanicoEquipo || websocketService.isTallerTabsSessionActive();
      if (mantenerWs) {
        if (__DEV__) {
          console.log('🔗 TabLayout - WebSocket activo', {
            radar: radarOportunidadesActivo,
            mecanico: esMecanicoEquipo,
            tallerTabs: websocketService.isTallerTabsSessionActive(),
          });
        }
        void websocketService.connect({ force: esMecanicoEquipo });
        if (radarOportunidadesActivo) {
          connectionService.startConnectionMonitoring();
        } else {
          connectionService.stopConnectionMonitoring();
        }
      } else {
        if (__DEV__) {
          console.log('⏸️ TabLayout - Sin sesión comercial activa: WebSocket apagado');
        }
        if (!websocketService.isChatSessionActive()) {
          websocketService.disconnect();
        }
        connectionService.stopConnectionMonitoring();
      }
    }
  }, [isAuthenticated, isLoading, radarOportunidadesActivo, radarPreferenciaCargada, esMecanicoEquipo]);

  useEffect(() => {
    return () => {
      if (__DEV__) {
        console.log('🧹 TabLayout - Desmontando, desconectando WebSocket y monitoreo de conexión');
      }
      websocketService.disconnect({ force: true });
      connectionService.stopConnectionMonitoring();
    };
  }, []);

  const tabH = Platform.OS === 'ios' ? 84 : 64;
  const barraInferior = escritorio ? 0 : tabH + insets.bottom;
  /** Seleccionado = magenta Tinder; inactivo = muted Airbnb Hosts. */
  const activeTint = C.tab.selectedText;
  const inactiveTint = C.tab.unselected;

  return (
    <TallerShellContext.Provider value={shell}>
    <View style={shellStyles.frame}>
    {!esMecanicoEquipo ? (
      <TallerChrome
        nombre={obtenerNombreProveedor()}
        porAgendar={porAgendar}
        variante={escritorio ? 'superior' : 'marca'}
        compacto={width < 1280}
      />
    ) : null}
    <View style={shellStyles.escena}>
    <Tabs
      tabBar={escritorio ? () => null : undefined}
      screenOptions={{
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: inactiveTint,
        headerShown: false,
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: C.background.paper }]} />
        ),
        tabBarStyle: escritorio
          ? { display: 'none', height: 0 }
          : {
            backgroundColor: C.background.paper,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: C.border.light,
            height: tabH + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 6,
            ...platformShadow({
              shadowColor: C.text.primary,
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: Platform.OS === 'ios' ? 0.04 : 0.06,
              shadowRadius: 8,
              elevation: 8,
            }),
          },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hoy',
          tabBarIcon: ({ color, focused }) => (
            <Home size={22} color={color} strokeWidth={focused ? 2 : 1.75} />
          ),
        }}
      />

      <Tabs.Screen
        name="cotizaciones"
        options={{
          title: 'Cotizaciones',
          href: esMecanicoEquipo ? null : undefined,
          tabBarIcon: ({ color, focused }) => (
            <FileText size={22} color={color} strokeWidth={focused ? 2 : 1.75} />
          ),
        }}
      />

      <Tabs.Screen
        name="bandeja"
        options={{
          title: 'Clientes',
          href: esMecanicoEquipo ? null : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Users size={22} color={color} strokeWidth={focused ? 2 : 1.75} />
          ),
        }}
      />

      <Tabs.Screen
        name="calendario"
        options={{
          title: 'Agenda',
          href: esMecanicoEquipo ? null : undefined,
          tabBarIcon: ({ color, focused }) => (
            <AgendaTabIcon color={color} focused={focused} conteo={porAgendar} />
          ),
        }}
      />

      <Tabs.Screen
        name="ordenes"
        options={{
          title: 'Servicios',
          href: esMecanicoEquipo ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <ClipboardList size={22} color={color} strokeWidth={focused ? 2 : 1.75} />
          ),
        }}
      />

      <Tabs.Screen
        name="chats"
        options={{
          title: 'Mensajes',
          href: null,
        }}
      />

      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Menú',
          href: esMecanicoEquipo ? undefined : null,
          tabBarIcon: ({ focused }) => <MenuTabIcon focused={focused} />,
        }}
      />

      <Tabs.Screen name="checklist-demo" options={{ href: null }} />
    </Tabs>
    </View>
    {shell.accionFlotante ? (
      <NuevaCotizacionFlotante bottom={barraInferior + 12} />
    ) : null}
    <PlanUpdateEdge bottom={barraInferior + (shell.accionFlotante ? 68 : 0)} />
    {needsConsent ? (
      <LegalConsentModal visible={needsConsent} onAccepted={clearNeedsConsent} />
    ) : null}
    {!esMecanicoEquipo ? (
      <CotizacionLibreModal
        visible={nuevaCotizacionAbierta}
        onClose={() => setNuevaCotizacionAbierta(false)}
        onEnviada={() => {
          setNuevaCotizacionAbierta(false);
          invalidarCotizaciones();
        }}
      />
    ) : null}
    </View>
    </TallerShellContext.Provider>
  );
}

/** Pastilla pegada al borde superior de la barra, solo sin plan activo. */
function PlanUpdateEdge({ bottom }: { bottom: number }) {
  const { esMecanicoEquipo } = useAuth();
  const { saludSuscripcion } = useAlerts();
  if (esMecanicoEquipo || saludSuscripcion?.estado_salud !== 'sin_suscripcion') return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Activar un plan"
      onPress={() => router.push('/creditos')}
      style={[edgeStyles.wrap, { bottom }]}
    >
      <View style={edgeStyles.pill}>
        <Text style={edgeStyles.copy} numberOfLines={1}>
          Activa un plan y recibe créditos cada mes
        </Text>
        <View style={edgeStyles.chip}>
          <Text style={edgeStyles.chipText}>Update</Text>
          <ArrowRight size={12} color={C.institutional.onPrimary} strokeWidth={1.75} />
        </View>
      </View>
    </Pressable>
  );
}

const edgeStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 40,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: C.brand.magenta,
    borderRadius: 999,
    backgroundColor: C.background.paper,
    paddingVertical: 4,
    paddingLeft: 14,
    paddingRight: 4,
    ...platformShadow({
      shadowColor: C.text.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 6,
    }),
  },
  copy: {
    flexShrink: 1,
    color: C.brand.magenta,
    fontSize: 13,
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.brand.magenta,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    color: C.institutional.onPrimary,
    fontSize: 13,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
  },
});

const shellStyles = StyleSheet.create({
  frame: {
    flex: 1,
    backgroundColor: C.institutional.canvas,
  },
  escena: {
    flex: 1,
  },
});
