import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import EstadoRevisionScreen from '@/components/EstadoRevisionScreen';
import { getItem } from '@/utils/authStorage';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { applyProveedorRoute, resolveProveedorRoute } from '@/utils/auth/resolveProveedorRoute';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

export default function IndexScreen() {
  const {
    isAuthenticated,
    isLoading,
    usuario,
    estadoProveedor,
    refrescarEstadoProveedor,
    logout,
  } = useAuth();
  const router = useRouter();
  const [mostrarErrorConectividad, setMostrarErrorConectividad] = useState(false);
  const [reintentando, setReintentando] = useState(false);
  const autoRetryDone = useRef(false);

  if (__DEV__) {
    console.log('🎬 IndexScreen montado/renderizado');
  }

  useEffect(() => {
    if (__DEV__) {
      console.log('🔍 Index useEffect - Estado actual:', {
        isLoading,
        isAuthenticated,
        hasUsuario: !!usuario,
        hasEstado: !!estadoProveedor,
      });
    }

    if (isLoading) return;

    if (!isAuthenticated || !usuario) {
      router.replace('/(auth)/login');
      return;
    }

    if (estadoProveedor !== null) {
      setMostrarErrorConectividad(false);
      const route = resolveProveedorRoute(estadoProveedor, { authenticated: true });
      if (route.kind === 'href') {
        if (__DEV__) {
          console.log('✅ Navegando según resolveProveedorRoute:', route.href);
        }
        applyProveedorRoute(router, route);
        return;
      }
      // stay: revisión / edge
      return;
    }

    // Sin estado: un auto-reintento silencioso antes de mostrar error
    if (!autoRetryDone.current) {
      autoRetryDone.current = true;
      setReintentando(true);
      void (async () => {
        try {
          const refreshed = await refrescarEstadoProveedor();
          if (!refreshed) {
            const token = await getItem('authToken');
            if (!token) {
              router.replace('/(auth)/login');
              return;
            }
            setMostrarErrorConectividad(true);
          }
        } catch {
          const token = await getItem('authToken').catch(() => null);
          if (!token) {
            router.replace('/(auth)/login');
            return;
          }
          setMostrarErrorConectividad(true);
        } finally {
          setReintentando(false);
        }
      })();
      return;
    }

    setMostrarErrorConectividad(true);
  }, [isAuthenticated, isLoading, usuario, estadoProveedor, router, refrescarEstadoProveedor]);

  const handleRetry = async () => {
    setMostrarErrorConectividad(false);
    setReintentando(true);
    try {
      const refreshed = await refrescarEstadoProveedor();
      if (!refreshed) {
        const token = await getItem('authToken').catch(() => null);
        if (!token) {
          router.replace('/(auth)/login');
          return;
        }
        setMostrarErrorConectividad(true);
      }
    } catch {
      const token = await getItem('authToken').catch(() => null);
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }
      setMostrarErrorConectividad(true);
    } finally {
      setReintentando(false);
    }
  };

  const handleGoToLogin = () => {
    void (async () => {
      try {
        await logout();
      } catch {
        /* igual vamos a login */
      }
      router.replace('/(auth)/login');
    })();
  };

  const handleGoToOnboarding = () => {
    setMostrarErrorConectividad(false);
    router.replace('/(onboarding)/tipo-cuenta');
  };

  if (isLoading || reintentando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={I.primary} />
        <Text style={styles.loadingText}>
          {reintentando ? 'Reconectando con el servidor…' : 'Cargando...'}
        </Text>
      </View>
    );
  }

  if (isAuthenticated && estadoProveedor && estadoProveedor.tiene_perfil &&
      estadoProveedor.onboarding_completado && estadoProveedor.estado_verificacion !== 'aprobado') {
    return <EstadoRevisionScreen estadoProveedor={estadoProveedor} />;
  }

  if (isAuthenticated && usuario && mostrarErrorConectividad) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>No pudimos cargar tu taller</Text>
        <Text style={styles.errorMessage}>
          El servidor no respondió a tiempo. Reintenta en unos segundos;
          si persiste, cierra sesión e ingresa de nuevo.
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
