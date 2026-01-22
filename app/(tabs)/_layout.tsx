import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useChats } from '@/context/ChatsContext';
import websocketService from '../services/websocketService';
import connectionService from '@/services/connectionService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';

export default function TabLayout() {
  const theme = useTheme();
  const { isAuthenticated, isLoading } = useAuth();
  const { totalMensajesNoLeidos } = useChats();
  const insets = useSafeAreaInsets();

  // Obtener colores del sistema de diseño con fallbacks
  const colors = theme?.colors || COLORS || {};
  const primary500 = (colors?.primary as any)?.['500'] || colors?.accent?.['500'] || '#4E4FEB';
  const textTertiary = colors?.text?.tertiary || (colors?.neutral as any)?.gray?.[400] || '#8E8E93';
  const bgPaper = colors?.background?.paper || COLORS?.base?.white || '#FFFFFF';
  const borderLight = colors?.border?.light || (colors?.neutral as any)?.gray?.[200] || '#E5E5EA';
  const errorMain = colors?.error?.main || '#FF5555';
  const white = COLORS?.base?.white || '#FFFFFF';

  // Obtener tokens de espaciado y tipografía
  const spacing = theme?.spacing || SPACING || {};
  const typography = theme?.typography || TYPOGRAPHY || {};
  const shadows = theme?.shadows || SHADOWS || {};
  const borders = theme?.borders || BORDERS || {};

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

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: primary500,
        tabBarInactiveTintColor: textTertiary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: bgPaper,
          borderTopColor: borderLight,
          borderTopWidth: borders?.width?.thin || 1,
          height: Platform.OS === 'ios' ? 88 + insets.bottom : 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: spacing?.sm || 8,
          paddingHorizontal: spacing?.sm || 10,
          ...shadows?.lg || {
            shadowColor: '#00171F',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 12,
          },
          zIndex: 1000,
        },
        tabBarLabelStyle: {
          fontSize: typography?.fontSize?.xs || 11,
          fontWeight: typography?.fontWeight?.semibold || '600',
          marginTop: spacing?.xs || 2,
        },
        tabBarIconStyle: {
          marginBottom: spacing?.xs || 2,
        },
        tabBarItemStyle: {
          paddingVertical: spacing?.xs || 4,
        },
      }}>

      {/* 🏠 INICIO - Dashboard principal con órdenes activas y pendientes */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size = 24 }) => (
            <MaterialIcons name="dashboard" size={size} color={color} />
          ),
        }}
      />

      {/* 📋 ÓRDENES - Gestión completa de órdenes con filtros */}
      <Tabs.Screen
        name="ordenes"
        options={{
          title: 'Órdenes',
          tabBarIcon: ({ color, size = 24 }) => (
            <MaterialIcons name="assignment" size={size} color={color} />
          ),
        }}
      />



      {/* 💬 CHATS - Conversaciones con clientes */}
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size = 24 }) => (
            <View style={{ width: size + 10, height: size + 10 }}>
              <MaterialIcons name="chat-bubble" size={size} color={color} />
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

      {/* ⚙️ CONFIGURACIÓN - Perfil, servicios, horarios y zonas */}
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Configuración',
          tabBarIcon: ({ color, size = 24 }) => (
            <MaterialIcons name="settings" size={size} color={color} />
          ),
        }}
      />



      {/* ✅ CHECKLIST DEMO - Funcionalidad de checklist */}
      <Tabs.Screen
        name="checklist-demo"
        options={{
          href: null, // Ocultar del tab bar - se navega desde órdenes
        }}
      />

      {/* 📅 CALENDARIO - Vista mensual de órdenes */}
      <Tabs.Screen
        name="calendario"
        options={{
          href: null, // Ocultar del tab bar - se navega desde inicio
        }}
      />



      {/* 💳 MERCADO PAGO - Configuración de cuenta de pagos */}
      {/* Configuración de cuenta de pagos - Movido a stack root */}

    </Tabs>
  );
}

// Crear estilos del badge usando el sistema de diseño
const createTabStyles = () => {
  const colors = COLORS || {};
  const typography = TYPOGRAPHY || {};
  const spacing = SPACING || {};
  const borders = BORDERS || {};

  const errorMain = colors?.error?.main || '#FF5555';
  const white = colors?.base?.white || '#FFFFFF';
  const fontSizeXs = typography?.fontSize?.xs || 11;
  const fontWeightBold = typography?.fontWeight?.bold || '700';
  const radiusMd = borders?.radius?.md || 10;
  const spacingXs = spacing?.xs || 4;

  return StyleSheet.create({
    badge: {
      position: 'absolute',
      top: -3,
      right: -3,
      backgroundColor: errorMain,
      borderRadius: radiusMd,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacingXs + 1, // 5
      borderWidth: 2,
      borderColor: white,
    },
    badgeText: {
      color: white,
      fontSize: fontSizeXs,
      fontWeight: fontWeightBold,
    },
  });
};

const tabStyles = createTabStyles(); 