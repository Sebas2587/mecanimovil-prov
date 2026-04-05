import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { Home, ClipboardList, MessageCircle, Settings } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useChats } from '@/context/ChatsContext';
import websocketService from '../services/websocketService';
import connectionService from '@/services/connectionService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();
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
      websocketService.disconnect();
      connectionService.stopConnectionMonitoring();
      router.replace('/(auth)/login');
    }

    // Si está autenticado, iniciar conexión WebSocket y monitoreo de conexión
    if (!isLoading && isAuthenticated) {
      if (__DEV__) {
        console.log('🔗 TabLayout - Usuario autenticado, iniciando WebSocket y monitoreo de conexión');
      }
      websocketService.connect();
      connectionService.startConnectionMonitoring();
    }
  }, [isAuthenticated, isLoading]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      // Log solo en desarrollo
      if (__DEV__) {
        console.log('🧹 TabLayout - Desmontando, desconectando WebSocket y monitoreo de conexión');
      }
      websocketService.disconnect();
      connectionService.stopConnectionMonitoring();
    };
  }, []);

  const TAB_ACTIVE = '#2563EB';
  const TAB_INACTIVE = '#9CA3AF';
  /** Blur en la tab bar mezcla el contenido de detrás y en iOS se ve gris; mismo blanco en ambas plataformas */
  const TAB_BAR_WHITE = '#FFFFFF';
  const tabH = Platform.OS === 'ios' ? 84 : 64;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: TAB_ACTIVE,
        tabBarInactiveTintColor: TAB_INACTIVE,
        headerShown: false,
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: TAB_BAR_WHITE }]} />
        ),
        tabBarStyle: {
          backgroundColor: TAB_BAR_WHITE,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: '#E8E8E8',
          height: tabH + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: Platform.OS === 'ios' ? 0.05 : 0.08,
          shadowRadius: 4,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
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
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
}); 