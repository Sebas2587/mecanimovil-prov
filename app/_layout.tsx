// Configuración de LogBox: Ignorar solo warnings específicos ruidosos
import { useEffect } from 'react';
import { ActivityIndicator, LogBox as RNLogBox, Text, TextInput, View } from 'react-native';
import { COLORS, TYPOGRAPHY } from '@/app/design-system/tokens';

// Configurar LogBox para ignorar solo warnings conocidos y ruidosos
// Mantener LogBox habilitado para detectar errores reales durante desarrollo
if (typeof RNLogBox !== 'undefined') {
  try {
    // Ignorar solo warnings específicos que son ruidosos pero no críticos
    RNLogBox.ignoreLogs([
      // React Navigation: Serialización de state (warning conocido con Expo Router)
      'Non-serializable values were found in the navigation state',
      
      // Debugging: No afecta producción
      'Remote debugger',
      
      // VirtualizedLists: Warning común pero no crítico en la mayoría de casos
      'VirtualizedLists should never be nested',
      
      // Animated: Warning de compatibilidad
      'Animated: `useNativeDriver` was not specified',
    ]);
  } catch (e) {
    // Si LogBox no está disponible, continuar sin configuración
    if (__DEV__) {
      logger.warn('[LogBox] No se pudo configurar LogBox:', e);
    }
  }
}

// NOTA: LogBox ahora está habilitado y mostrará errores reales.
// Los logs técnicos solo aparecen en desarrollo (__DEV__).
// Los errores de red, autenticación, etc. se manejan en los servicios sin mostrar LogBox.

import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from '@expo-google-fonts/poppins';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '@/context/AuthContext';
import { RadarOportunidadesProvider } from '@/context/RadarOportunidadesContext';
import { ChatsProvider } from '@/context/ChatsContext';
import { AlertsProvider } from '@/context/AlertsContext';
import { PlatformAlertHost } from '@/components/ui/PlatformAlertHost';
import { PushNotificationSetup } from '@/components/push/PushNotificationSetup';
import { DesignSystemThemeProvider } from '@/app/design-system/theme/DesignSystemThemeProvider';
import logger from '@/utils/logger';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
        const err = error as { response?: { status?: number }; code?: string; name?: string };
        if (err?.code === 'ERR_NO_AUTH' || err?.name === 'CanceledError') return false;
        const status = err?.response?.status;
        if (status === 401 || status === 403 || status === 429) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  useEffect(() => {
    if (fontError && __DEV__) {
      logger.warn('[RootLayout] No se pudo cargar Poppins.', fontError.message);
    }
  }, [fontError]);

  // Fallback Host: Text/TextInput sin fontFamily explícita → Poppins.
  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    const base = { fontFamily: TYPOGRAPHY.fontFamily.sansRegular };
    const textDefaults = (Text as typeof Text & { defaultProps?: { style?: unknown } }).defaultProps ?? {};
    (Text as typeof Text & { defaultProps?: { style?: unknown } }).defaultProps = {
      ...textDefaults,
      style: [base, textDefaults.style],
    };
    const inputDefaults =
      (TextInput as typeof TextInput & { defaultProps?: { style?: unknown } }).defaultProps ?? {};
    (TextInput as typeof TextInput & { defaultProps?: { style?: unknown } }).defaultProps = {
      ...inputDefaults,
      style: [base, inputDefaults.style],
    };
  }, [fontsLoaded, fontError]);

  // Si loadAsync falla, `loaded` nunca pasa a true — sin este branch la app queda en pantalla en blanco.
  if (!fontsLoaded && !fontError) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: COLORS.background.default,
          }}
        >
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <DesignSystemThemeProvider>
          <AuthProvider>
            <RadarOportunidadesProvider>
            <AlertsProvider>
              <PushNotificationSetup />
              <ChatsProvider>
                <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                  <PlatformAlertHost />
                  <Stack
                    screenOptions={{
                      // iOS: evita el texto "(tabs)" junto a la flecha al abrir pantallas fuera del grupo tabs
                      headerBackTitle: '',
                      // SDK 57: sin esto, iOS/Android presentan pushes como hoja flotante (formSheet).
                      presentation: 'card',
                      animation: 'slide_from_right',
                      gestureDirection: 'horizontal',
                    }}
                  >
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="(tabs)"
                    options={{
                      headerShown: false,
                      title: '',
                      headerTitle: '',
                      headerBackTitle: '',
                    }}
                  />
                  <Stack.Screen name="creditos" options={{ headerShown: false }} />
                  <Stack.Screen name="creditos/saldo" options={{ headerShown: false }} />
                  <Stack.Screen name="caja-taller" options={{ headerShown: false }} />
                  <Stack.Screen name="creditos/historial" options={{ headerShown: false }} />
                  <Stack.Screen name="creditos/comprar" options={{ headerShown: false }} />
                  <Stack.Screen name="mis-servicios" options={{ headerShown: false }} />
                  <Stack.Screen name="configuracion-horarios" options={{ headerShown: false }} />
                  <Stack.Screen name="especialidades-marcas" options={{ headerShown: false }} />
                  <Stack.Screen name="configuracion-mercadopago" options={{ headerShown: false }} />
                  <Stack.Screen name="zonas-servicio" options={{ headerShown: false }} />
                  <Stack.Screen name="configuracion-perfil" options={{ headerShown: false }} />
                  <Stack.Screen name="gestionar-taller" options={{ headerShown: false }} />
                  <Stack.Screen name="gestion-equipo" options={{ headerShown: false }} />
                  <Stack.Screen name="pipeline-seguimiento" options={{ headerShown: false }} />
                  <Stack.Screen name="cliente-comercial/[clienteKey]" options={{ headerShown: false }} />
                  <Stack.Screen name="historial-patente" options={{ headerShown: false }} />
                  <Stack.Screen name="rendimiento-kpis" options={{ headerShown: false }} />
                  <Stack.Screen name="guias-reparacion" options={{ headerShown: false }} />
                  <Stack.Screen name="actualizar-ubicacion" options={{ headerShown: false }} />
                  <Stack.Screen name="orden-detalle/[id]" options={{ headerShown: false }} />
                  <Stack.Screen name="servicio-detalle/[id]" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="oferta-detalle/[id]"
                    options={{
                      headerBackTitle: '',
                    }}
                  />
                  <Stack.Screen name="checklist-item/[ordenId]/[itemId]" options={{ headerShown: false }} />
                  <Stack.Screen name="agendar-cita-personal" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="cita-agenda-personal/[id]"
                    options={{
                      headerBackTitle: '',
                    }}
                  />
                  <Stack.Screen name="configuracion-canales" options={{ headerShown: false }} />
                  <Stack.Screen name="configuracion-agente-ia" options={{ headerShown: false }} />
                  <Stack.Screen name="cotizaciones-plantillas" options={{ headerShown: false }} />
                  <Stack.Screen name="casas-repuestos" options={{ headerShown: false }} />
                  <Stack.Screen name="mis-precios-repuestos" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="cotizar-ia"
                    options={{
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen name="chat-omnicanal" options={{ headerShown: false }} />
                  <Stack.Screen name="chat-oferta/[ofertaId]" options={{ headerShown: false }} />
                  <Stack.Screen name="politica-privacidad" options={{ headerShown: false }} />
                  <Stack.Screen name="terminos" options={{ headerShown: false }} />
                  <Stack.Screen name="privacidad-datos" options={{ headerShown: false }} />
                  <Stack.Screen name="+not-found" />
                  </Stack>
                  <StatusBar style="auto" />
                </ThemeProvider>
              </ChatsProvider>
            </AlertsProvider>
            </RadarOportunidadesProvider>
          </AuthProvider>
        </DesignSystemThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
