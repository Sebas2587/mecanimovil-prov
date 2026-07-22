import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import EstadoRevisionScreen from '@/components/EstadoRevisionScreen';
import { getItem } from '@/utils/authStorage';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

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

      if (estadoProveedor !== null) {
        setMostrarErrorConectividad(false);
      }

      // CASO 3: EstadoProveedor es null (falló API tras reintentos o sin respuesta).
      // Mostrar pantalla de conectividad en el mismo ciclo — no esperar SecureStore
      // (si no, la UI se queda en el spinner "Cargando..." hasta que resuelve la promesa).
      if (estadoProveedor === null) {
        if (__DEV__) {
          console.log('⚠️ EstadoProveedor es null — mostrando opción de reintentar / sesión');
        }
        setMostrarErrorConectividad(true);
        getItem('authToken').then((token) => {
          if (!token) router.replace('/(auth)/login');
        }).catch(() => router.replace('/(auth)/login'));
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

      // CASO 6: Onboarding listo; cuenta aún no aprobada por admin
      if (estadoProveedor.onboarding_completado && estadoProveedor.estado_verificacion !== 'aprobado') {
        if (__DEV__) {
          console.log('⏳ Onboarding completado, cuenta pendiente de aprobación');
        }
        return;
      }

      // CASO 7: Cuenta aprobada por admin → tabs
      if (estadoProveedor.estado_verificacion === 'aprobado') {
        if (__DEV__) {
          console.log('✅ Cuenta aprobada - navegando a tabs principales');
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
        <ActivityIndicator size="large" color={I.primary} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  if (isAuthenticated && estadoProveedor && estadoProveedor.tiene_perfil &&
      estadoProveedor.onboarding_completado && estadoProveedor.estado_verificacion !== 'aprobado') {
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
        
        <InstitutionalButton
          label="Reintentar"
          onPress={handleRetry}
          variant="secondary"
          style={styles.actionButton}
        />
        
        <View style={styles.alternativeActions}>
          <Text style={styles.alternativeText}>¿Eres nuevo como proveedor?</Text>
          <InstitutionalButton
            label="Registrarme como Proveedor"
            onPress={handleGoToOnboarding}
            variant="success"
            style={styles.actionButton}
          />
          
          <InstitutionalButton
            label="Cerrar Sesión"
            onPress={handleGoToLogin}
            variant="destructiveOutline"
            style={styles.actionButton}
          />
        </View>
      </View>
    );
  }

  // Loading por defecto (mientras se resuelve la navegación)
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={I.primary} />
      <Text style={styles.loadingText}>Cargando...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: I.surfaceSoft,
  },
  loadingText: {
    marginTop: SPACING.fixed.sm,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.sansRegular,
    color: I.body,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: I.surfaceSoft,
    padding: SPACING.fixed.lg,
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontFamily: FF.sansBold,
    color: I.semanticDown,
    marginBottom: SPACING.fixed.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.sansRegular,
    color: I.body,
    textAlign: 'center',
    marginBottom: SPACING.fixed.lg,
    lineHeight: 24,
  },
  actionButton: {
    width: '100%',
    maxWidth: 320,
    marginBottom: SPACING.fixed.sm,
  },
  alternativeActions: {
    alignItems: 'center',
    marginTop: SPACING.fixed.lg,
    width: '100%',
    maxWidth: 320,
  },
  alternativeText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.body,
    marginBottom: SPACING.fixed.md,
  },
});
