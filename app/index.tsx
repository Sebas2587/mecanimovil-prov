import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import EstadoRevisionScreen from '@/components/EstadoRevisionScreen';
import * as SecureStore from 'expo-secure-store';

export default function IndexScreen() {
  const { isAuthenticated, isLoading, usuario, estadoProveedor, refrescarEstadoProveedor } = useAuth();
  const router = useRouter();
  const [mostrarErrorConectividad, setMostrarErrorConectividad] = useState(false);

  // Log solo en desarrollo (__DEV__), nunca en producción (APK)
  if (__DEV__) {
    console.log('🎬 IndexScreen montado/renderizado');
  }

  useEffect(() => {
    // Log solo en desarrollo
    if (__DEV__) {
      console.log('🔍 Index useEffect - Estado actual:', {
        isLoading,
        isAuthenticated,
        hasUsuario: !!usuario,
        estadoProveedor: estadoProveedor ? {
          tiene_perfil: estadoProveedor.tiene_perfil,
          tipo_proveedor: estadoProveedor.tipo_proveedor,
          onboarding_iniciado: estadoProveedor.onboarding_iniciado,
          onboarding_completado: estadoProveedor.onboarding_completado,
          verificado: estadoProveedor.verificado
        } : null
      });
    }

    if (!isLoading) {
      // Log solo en desarrollo
      if (__DEV__) {
        console.log('📍 No está cargando, evaluando navegación...');
      }
      
      // CASO 1: Usuario no autenticado - ir al login SIEMPRE
      if (!isAuthenticated) {
        if (__DEV__) {
          console.log('📱 Usuario sin sesión - navegando a login');
        }
        router.replace('/(auth)/login');
        return;
      }

      // CASO 2: Usuario autenticado pero sin datos de usuario - caso extraño
      if (!usuario) {
        if (__DEV__) {
          console.log('❌ Está autenticado pero no hay usuario - navegando a login');
        }
        router.replace('/(auth)/login');
        return;
      }

      // A partir de aquí, el usuario SÍ está autenticado y tiene datos válidos
      if (__DEV__) {
        console.log('👤 Usuario autenticado existe, evaluando estado del proveedor...');
        console.log('EstadoProveedor completo:', estadoProveedor);
      }
      
      // CASO 3: EstadoProveedor es null - verificar si es por token expirado
      // Si el usuario está autenticado pero estadoProveedor es null después de checkAuthStatus,
      // es muy probable que el token esté expirado y no se limpió correctamente
      if (estadoProveedor === null) {
        if (__DEV__) {
          console.log('⚠️ EstadoProveedor es null - verificando token');
        }
        // Verificar si realmente hay un token válido (async dentro de useEffect)
        SecureStore.getItemAsync('authToken').then((token) => {
          if (!token) {
            // No hay token, redirigir al login inmediatamente
            if (__DEV__) {
              console.log('🔒 No hay token, redirigiendo al login');
            }
            router.replace('/(auth)/login');
          } else {
            // Hay token pero estadoProveedor es null - podría ser error de conectividad
            // o token expirado que no se detectó. Mostrar error de conectividad
            if (__DEV__) {
              console.log('🔄 Token existe pero estadoProveedor es null - posible error de conectividad');
            }
            setMostrarErrorConectividad(true);
          }
        }).catch((error) => {
          // Log solo en desarrollo
          if (__DEV__) {
            console.error('Error verificando token (detalles solo en desarrollo):', error);
          }
          router.replace('/(auth)/login');
        });
        return;
      }

      // CASO 4: Usuario SIN perfil de proveedor - debe crear uno desde cero
      if (!estadoProveedor.tiene_perfil) {
        if (__DEV__) {
          console.log('🚀 Usuario sin perfil de proveedor - navegando a onboarding desde cero');
        }
        router.replace('/(onboarding)/tipo-cuenta');
        return;
      }

      // CASO 5: Usuario CON perfil pero onboarding NO completado - EMPEZAR DE CERO
      if (estadoProveedor.tiene_perfil && !estadoProveedor.onboarding_completado) {
        if (__DEV__) {
          console.log('🔄 Usuario con onboarding incompleto - empezando desde cero (tipo-cuenta)');
          console.log(`Perfil actual: ${estadoProveedor.tipo_proveedor}, pero empezará desde el principio`);
        }
        router.replace('/(onboarding)/tipo-cuenta');
        return;
      }

      // CASO 6: Usuario con onboarding completado pero no verificado
      if (estadoProveedor.onboarding_completado && !estadoProveedor.verificado) {
        if (__DEV__) {
          console.log('⏳ Onboarding completado pero no verificado - mostrando pantalla de revisión');
        }
        return;
      }

      // CASO 7: Usuario verificado
      if (estadoProveedor.verificado) {
        if (__DEV__) {
          console.log('✅ Usuario verificado - navegando a tabs principales');
        }
        router.replace('/(tabs)');
        return;
      }

      // CASO 8: Caso edge - mostrar pantalla de revisión por defecto
      if (__DEV__) {
        console.log('❓ Caso edge - mostrando pantalla de revisión');
      }
      return;
    } else {
      // Log solo en desarrollo
      if (__DEV__) {
        console.log('⏳ Todavía cargando, esperando...');
      }
    }
  }, [isAuthenticated, isLoading, usuario, estadoProveedor, router]);

  // Función para reintentar la carga del estado
  const handleRetry = async () => {
    // Log solo en desarrollo
    if (__DEV__) {
      console.log('🔄 Reintentando obtener estado del proveedor...');
    }
    setMostrarErrorConectividad(false);
    try {
      await refrescarEstadoProveedor();
    } catch (error) {
      // Log solo en desarrollo
      if (__DEV__) {
        console.log('❌ Error al reintentar, mostrando pantalla de error nuevamente (detalles solo en desarrollo):', error);
      }
      setMostrarErrorConectividad(true);
    }
  };

  // Función para ir al login (cerrar sesión)
  const handleGoToLogin = () => {
    // Log solo en desarrollo
    if (__DEV__) {
      console.log('🔑 Navegando a login por decisión del usuario');
    }
    router.replace('/(auth)/login');
  };

  // Función para ir al onboarding
  const handleGoToOnboarding = () => {
    // Log solo en desarrollo
    if (__DEV__) {
      console.log('🚀 Navegando a onboarding por decisión del usuario');
    }
    setMostrarErrorConectividad(false);
    router.replace('/(onboarding)/tipo-cuenta');
  };

  // Mostrar loading mientras se determina el estado
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  // Si está autenticado, tiene perfil, completó onboarding pero no está verificado
  if (isAuthenticated && estadoProveedor && estadoProveedor.tiene_perfil && 
      estadoProveedor.onboarding_completado && !estadoProveedor.verificado) {
    return <EstadoRevisionScreen estadoProveedor={estadoProveedor} />;
  }

  // Si está autenticado pero hay error de conectividad al obtener estado del proveedor
  if (isAuthenticated && usuario && mostrarErrorConectividad) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Error de Conectividad</Text>
        <Text style={styles.errorMessage}>
          No pudimos obtener tu información de proveedor. 
          Esto puede deberse a un problema temporal del servidor.
        </Text>
        
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
        
        <View style={styles.alternativeActions}>
          <Text style={styles.alternativeText}>¿Eres nuevo como proveedor?</Text>
          <TouchableOpacity style={styles.onboardingButton} onPress={handleGoToOnboarding}>
            <Text style={styles.onboardingButtonText}>Registrarme como Proveedor</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.loginButton} onPress={handleGoToLogin}>
            <Text style={styles.loginButtonText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Loading por defecto (mientras se resuelve la navegación)
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Cargando...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  alternativeActions: {
    alignItems: 'center',
    marginTop: 20,
  },
  alternativeText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  onboardingButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  onboardingButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
}); 