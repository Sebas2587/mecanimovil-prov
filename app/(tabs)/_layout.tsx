import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { Home, ClipboardList, MessageCircle, Settings } from 'lucide-react-native';
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

const I = COLORS.institutional;

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { radarOportunidadesActivo, radarPreferenciaCargada } = useRadarOportunidades();
  const { totalMensajesNoLeidos } = useChats();
  const insets = useSafeAreaInsets();

  // Monitorear estado de autenticación y manejar conexión WebSocket
  useEffect(() => {
    // Log solo en desarrollo (__DEV__), nunca en producción (APK)
    if (__DEV__) {
      console.log('🏠 TabLayout - Monitoreando autenticación:', { isAuthenticated, isLoading });
    }

    // Solo navegar al login si ya terminó de cargar y no está autenticado
    if (!isLoading && !isAuthenticated) {
      if (__DEV__) {
        console.log('🚪 TabLayout - Usuario no autenticado, navegando al login');
      }
      websocketService.disconnect({ force: true });
      connectionService.stopConnectionMonitoring();
      router.replace('/(auth)/login');
    }

    // Si está autenticado y el radar está activo, iniciar WebSocket y marcar conexión en API
    if (!isLoading && isAuthenticated && radarPreferenciaCargada) {
      if (radarOportunidadesActivo) {
        if (__DEV__) {
          console.log('🔗 TabLayout - Radar activo: WebSocket y conexión proveedor');
        }
        websocketService.connect();
        connectionService.startConnectionMonitoring();
      } else {
        if (__DEV__) {
          console.log('⏸️ TabLayout - Radar inactivo: sin conexión de oportunidades');
        }
        if (!websocketService.isChatSessionActive()) {
          websocketService.disconnect();
        }
        connectionService.stopConnectionMonitoring();
      }
    }
  }, [isAuthenticated, isLoading, radarOportunidadesActivo, radarPreferenciaCargada]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      // Log solo en desarrollo
      if (__DEV__) {
        console.log('🧹 TabLayout - Desmontando, desconectando WebSocket y monitoreo de conexión');
      }
      websocketService.disconnect({ force: true });
      connectionService.stopConnectionMonitoring();
    };
  }, []);

  const tabH = Platform.OS === 'ios' ? 84 : 64;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: I.primary,
        tabBarInactiveTintColor: I.muted,
        headerShown: false,
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: I.canvas }]} />
        ),
        tabBarStyle: {
          backgroundColor: I.canvas,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: I.hairline,
          height: tabH + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          ...platformShadow({
            shadowColor: COLORS.base.inkBlack,
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: Platform.OS === 'ios' ? 0.04 : 0.06,
            shadowRadius: 8,
            elevation: 8,
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      }}>

      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <Home size={22} color={color} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
      />

      <Tabs.Screen
        name="ordenes"
        options={{
          title: 'Órdenes',
          tabBarIcon: ({ color, focused }) => (
            <ClipboardList size={22} color={color} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
      />

      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, focused }) => (
            <View style={tabStyles.iconWrap}>
              <MessageCircle size={22} color={color} strokeWidth={focused ? 2.4 : 1.8} />
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
          title: 'Configuración',
          tabBarIcon: ({ color, focused }) => (
            <Settings size={22} color={color} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
      />

      <Tabs.Screen name="checklist-demo" options={{ href: null }} />
      <Tabs.Screen name="calendario" options={{ href: null }} />
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
    backgroundColor: COLORS.institutional.semanticDown,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.institutional.canvas,
  },
  badgeText: {
    color: COLORS.institutional.onPrimary,
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
  },
}); 