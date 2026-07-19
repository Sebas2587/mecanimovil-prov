import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { Home, ClipboardList, MessageCircle, Calendar, Menu } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useRadarOportunidades } from '@/context/RadarOportunidadesContext';
import { useChats } from '@/context/ChatsContext';
import websocketService from '@/app/services/websocketService';
import connectionService from '@/services/connectionService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/app/design-system/tokens/colors';
import { platformShadow } from '@/app/design-system/tokens';
import { TYPOGRAPHY } from '@/app/design-system/tokens/typography';

const C = COLORS;

export default function TabLayout() {
  const { isAuthenticated, isLoading, esMecanicoEquipo } = useAuth();
  const { radarOportunidadesActivo, radarPreferenciaCargada } = useRadarOportunidades();
  const { totalMensajesNoLeidos } = useChats();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    websocketService.setMecanicoEquipoSession(Boolean(esMecanicoEquipo));
  }, [esMecanicoEquipo]);

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
      const mantenerWs = radarOportunidadesActivo || esMecanicoEquipo;
      if (mantenerWs) {
        if (__DEV__) {
          console.log('🔗 TabLayout - WebSocket activo', {
            radar: radarOportunidadesActivo,
            mecanico: esMecanicoEquipo,
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
          console.log('⏸️ TabLayout - Sin radar ni sesión mecánico: WebSocket apagado');
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
  const activeTint = C.icon.active;
  const inactiveTint = C.tab.unselected;

  return (
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
          href: esMecanicoEquipo ? null : undefined,
          tabBarIcon: ({ color, focused }) => (
            <ClipboardList size={22} color={color} strokeWidth={focused ? 2 : 1.75} />
          ),
        }}
      />

      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Menú',
          tabBarIcon: ({ color, focused }) => (
            <Menu size={22} color={color} strokeWidth={focused ? 2 : 1.75} />
          ),
        }}
      />

      <Tabs.Screen name="checklist-demo" options={{ href: null }} />
    </Tabs>
  );
}

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
