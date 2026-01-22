// CRÍTICO: Deshabilitar LogBox/RedBox/YellowBox COMPLETAMENTE
// Esta configuración debe ejecutarse lo antes posible para evitar que errores aparezcan visualmente
import { LogBox as RNLogBox } from 'react-native';

// CRÍTICO: Deshabilitar LogBox COMPLETAMENTE después de importar React Native
// Esto debe ejecutarse INMEDIATAMENTE después de importar para que funcione correctamente
// Esta es la configuración PRINCIPAL que deshabilita LogBox completamente
if (typeof RNLogBox !== 'undefined') {
  try {
    // PASO 1: Ignorar TODOS los logs y errores para que NO aparezcan en la UI
    // Esto es la configuración más importante y debe estar primero
    RNLogBox.ignoreAllLogs(true);

    // PASO 2: Configuración adicional para ignorar errores específicos
    // NOTA: LogBox.ignoreLogs() solo acepta strings, no regex
    // Esta es una capa adicional de protección en caso de que ignoreAllLogs no funcione completamente
    RNLogBox.ignoreLogs([
      // Errores de React Navigation
      'Non-serializable values were found in the navigation state',
      'Remote debugger',
      'VirtualizedLists should never be nested',

      // Errores de API/Red (strings comunes que aparecen en errores)
      'Error en POST',
      'Error en GET',
      'Error en PUT',
      'Error en PATCH',
      'Error en DELETE',
      'Error en login',
      'Error en proceso de login',
      'Error de respuesta detallado',
      'Error capturado',
      'Error global',
      'network',
      'Network',
      'ERR_',
      'ECONN',
      'ETIMEDOUT',
      'ENOTFOUND',
      'status',
      'Status',
      'HTTP',
      'axios',
      'Error en POST a',
      'Error en GET a',
      'Error en PUT a',
      'Error en PATCH a',
      'Error en DELETE a',

      // Errores de autenticación
      'credenciales',
      'Credenciales',
      'autenticación',
      'token',
      'Token',
      '401',
      '400',
      'credenciales inválidas',
      'Credenciales inválidas',
      'No puede iniciar sesión',
      'No se pudo iniciar sesión',

      // Patrones generales de errores técnicos
      'ERROR',
      'Error en',
      'Error:',
      '❌',
      'authService',
      'AuthContext',
      'Error en proceso de',
      'Error al',
      'Request failed with status code',
      'AxiosError',
      'Network Error',
    ]);
  } catch (e) {
    // Si LogBox no está disponible o hay algún error, ignorarlo silenciosamente
    // No mostrar ningún error aquí para evitar que aparezca en la UI
  }
}

// NOTA IMPORTANTE:
// - Los logs técnicos seguirán apareciendo en el TERMINAL (no en la UI) para debugging en desarrollo (con __DEV__)
// - Los errores NUNCA aparecerán visualmente en la interfaz (ni RedBox, ni LogBox, ni YellowBox)
// - El usuario solo verá Alert.alert con mensajes amigables cuando sea necesario

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '@/context/AuthContext';
import { ChatsProvider } from '@/context/ChatsContext';
import { AlertsProvider } from '@/context/AlertsContext';
import { DesignSystemThemeProvider } from '@/app/design-system/theme/DesignSystemThemeProvider';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <SafeAreaProvider>
      <DesignSystemThemeProvider>
        <AuthProvider>
          <AlertsProvider>
            <ChatsProvider>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <Stack>
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="creditos" options={{ headerShown: false }} />
                  <Stack.Screen name="mis-servicios" options={{ headerShown: false }} />
                  <Stack.Screen name="configuracion-horarios" options={{ headerShown: false }} />
                  <Stack.Screen name="especialidades-marcas" options={{ headerShown: false }} />
                  <Stack.Screen name="configuracion-mercadopago" options={{ headerShown: false }} />
                  <Stack.Screen name="zonas-servicio" options={{ headerShown: false }} />
                  <Stack.Screen name="configuracion-perfil" options={{ headerShown: false }} />
                  <Stack.Screen name="gestionar-taller" options={{ headerShown: false }} />
                  <Stack.Screen name="actualizar-ubicacion" options={{ headerShown: false }} />
                  <Stack.Screen name="orden-detalle/[id]" options={{ headerShown: false }} />
                  <Stack.Screen name="servicio-detalle/[id]" options={{ headerShown: false }} />
                  <Stack.Screen name="checklist-item/[ordenId]/[itemId]" options={{ headerShown: false }} />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style="auto" />
              </ThemeProvider>
            </ChatsProvider>
          </AlertsProvider>
        </AuthProvider>
      </DesignSystemThemeProvider>
    </SafeAreaProvider>
  );
}
