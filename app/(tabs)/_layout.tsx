import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, View, Text, StyleSheet, Pressable } from 'react-native';
import { Home, ClipboardList, MessageCircle, Calendar, Inbox, ArrowRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useAlerts } from '@/context/AlertsContext';
import { useRadarOportunidades } from '@/context/RadarOportunidadesContext';
import { useChats } from '@/context/ChatsContext';
import websocketService from '@/app/services/websocketService';
import connectionService from '@/services/connectionService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/app/design-system/tokens/colors';
import { platformShadow } from '@/app/design-system/tokens';
import { TYPOGRAPHY } from '@/app/design-system/tokens/typography';
import { useLegalConsentGate } from '@/hooks/useLegalConsentGate';
import LegalConsentModal from '@/components/legal/LegalConsentModal';
import MenuTabIcon from '@/components/navigation/MenuTabIcon';

const C = COLORS;

/**
 * Orden estratégico (usabilidad taller):
 * 1. Hoy — hub del día
 * 2. Agenda — cuándo trabajar
 * 3. Servicios — activas / completadas / rechazadas (incl. citas personales)
 * 4. Mensajes — comunicación
 * 5. Menú — configuración y resto
 *
 * Bandeja comercial: no va en tabs (ya hay card en Hoy). Ruta oculta.
 */
export default function TabLayout() {
  const { isAuthenticated, isLoading, esMecanicoEquipo } = useAuth();
  const { needsConsent, clearNeedsConsent } = useLegalConsentGate(isAuthenticated);
  const { radarOportunidadesActivo, radarPreferenciaCargada } = useRadarOportunidades();
  const { totalMensajesNoLeidos } = useChats();
  const insets = useSafeAreaInsets();

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
  /** Seleccionado = magenta Tinder; inactivo = muted Airbnb Hosts. */
  const activeTint = C.tab.selectedText;
  const inactiveTint = C.tab.unselected;

  return (
    <>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: inactiveTint,
        headerShown: false,
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: C.background.paper }]} />
        ),
        tabBarStyle: {
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
        tabBarActiveLabelStyle: {
          fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
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
        name="calendario"
        options={{
          title: 'Agenda',
          href: esMecanicoEquipo ? null : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Calendar size={22} color={color} strokeWidth={focused ? 2 : 1.75} />
          ),
        }}
      />

      <Tabs.Screen
        name="ordenes"
        options={{
          title: 'Servicios',
          tabBarIcon: ({ color, focused }) => (
            <ClipboardList size={22} color={color} strokeWidth={focused ? 2 : 1.75} />
          ),
        }}
      />

      <Tabs.Screen
        name="chats"
        options={{
          title: 'Mensajes',
          href: esMecanicoEquipo ? null : undefined,
          tabBarIcon: ({ color, focused }) => (
            <View style={tabStyles.iconWrap}>
              <MessageCircle size={22} color={color} strokeWidth={focused ? 2 : 1.75} />
              {totalMensajesNoLeidos > 0 && (
                <View style={tabStyles.badge}>
                  <Text style={tabStyles.badgeText}>
                    {totalMensajesNoLeidos > 99 ? '99+' : totalMensajesNoLeidos}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Menú',
          tabBarIcon: ({ focused }) => <MenuTabIcon focused={focused} />,
        }}
      />

      {/* Bandeja: card en Hoy; no satura la barra inferior. */}
      <Tabs.Screen
        name="bandeja"
        options={{
          title: 'Bandeja',
          href: null,
          tabBarIcon: ({ color, focused }) => (
            <Inbox size={22} color={color} strokeWidth={focused ? 2 : 1.75} />
          ),
        }}
      />

      <Tabs.Screen name="checklist-demo" options={{ href: null }} />
    </Tabs>
    <PlanUpdateEdge bottom={tabH + insets.bottom} />
    {needsConsent ? (
      <LegalConsentModal visible={needsConsent} onAccepted={clearNeedsConsent} />
    ) : null}
    </>
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

const tabStyles = StyleSheet.create({
  iconWrap: {
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: C.primary[500],
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: C.background.paper,
  },
  badgeText: {
    color: C.text.onPrimary,
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
  },
});
