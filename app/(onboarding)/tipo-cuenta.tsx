import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authAPI, getAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import * as SecureStore from 'expo-secure-store';
import OnboardingHeader from '@/components/OnboardingHeader';

export default function TipoCuentaScreen() {
  const [tipoSeleccionado, setTipoSeleccionado] = useState<'taller' | 'mecanico' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingCredentials, setIsCheckingCredentials] = useState(true);
  const router = useRouter();
  const { login, isAuthenticated, updateUser, refrescarEstadoProveedor } = useAuth();

  // Verificar si hay credenciales pendientes de registro y hacer login automático
  useEffect(() => {
    const checkPendingRegistration = async () => {
      try {
        const pendingData = await SecureStore.getItemAsync('pendingRegistration');
        if (pendingData) {
          const credentials = JSON.parse(pendingData);
          
          // Verificar que las credenciales no sean muy antiguas (máximo 5 minutos)
          const maxAge = 5 * 60 * 1000; // 5 minutos
          if (Date.now() - credentials.timestamp < maxAge) {
            if (__DEV__) {
              console.log('🔐 Credenciales pendientes encontradas, haciendo login automático...');
            }
            
            try {
              // Usar el endpoint de login normal para usuarios recién registrados
              // (aún no son proveedores, así que pueden usar /usuarios/login/)
              const api = await getAPI();
              const loginResponse = await api.post('/usuarios/login/', {
                username: credentials.username,
                password: credentials.password
              });
              
              if (loginResponse.data.token) {
                // Guardar token y datos del usuario
                await SecureStore.setItemAsync('authToken', loginResponse.data.token);
                await SecureStore.setItemAsync('userData', JSON.stringify(loginResponse.data.user));
                
                // Actualizar el usuario en el contexto
                if (loginResponse.data.user) {
                  updateUser(loginResponse.data.user);
                }
                
                // Intentar refrescar estado del proveedor (maneja automáticamente el caso de usuario sin perfil)
                try {
                  await refrescarEstadoProveedor();
                } catch (estadoError: any) {
                  // No crítico si falla, el estado se establecerá como usuario sin perfil
                  if (__DEV__) {
                    console.log('ℹ️ Estado del proveedor se establecerá automáticamente');
                  }
                }
                
                if (__DEV__) {
                  console.log('✅ Login automático exitoso después del registro');
                }
                
                // Limpiar credenciales pendientes
                await SecureStore.deleteItemAsync('pendingRegistration');
              }
            } catch (loginError: any) {
              if (__DEV__) {
                console.warn('⚠️ Error en login automático (continuando sin autenticación):', loginError.message);
              }
              // Limpiar credenciales pendientes incluso si falla el login
              await SecureStore.deleteItemAsync('pendingRegistration');
            }
          } else {
            // Credenciales muy antiguas, limpiarlas
            if (__DEV__) {
              console.log('⏰ Credenciales pendientes expiradas, limpiando...');
            }
            await SecureStore.deleteItemAsync('pendingRegistration');
          }
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('⚠️ Error verificando credenciales pendientes:', error);
        }
      } finally {
        setIsCheckingCredentials(false);
      }
    };

    checkPendingRegistration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar una vez al montar

  const handleSeleccion = (tipo: 'taller' | 'mecanico') => {
    setTipoSeleccionado(tipo);
  };

  const handleContinuar = async () => {
    if (!tipoSeleccionado || isLoading || isCheckingCredentials) return;
    
    // Si no está autenticado, intentar hacer login con credenciales pendientes
    if (!isAuthenticated) {
      try {
        const pendingData = await SecureStore.getItemAsync('pendingRegistration');
        if (pendingData) {
          const credentials = JSON.parse(pendingData);
          if (__DEV__) {
            console.log('🔐 Intentando login con credenciales pendientes...');
          }
          
          // Usar el endpoint de login normal para usuarios recién registrados
          const api = await getAPI();
          const loginResponse = await api.post('/usuarios/login/', {
            username: credentials.username,
            password: credentials.password
          });
          
          if (loginResponse.data.token) {
            // Guardar token y datos del usuario
            await SecureStore.setItemAsync('authToken', loginResponse.data.token);
            await SecureStore.setItemAsync('userData', JSON.stringify(loginResponse.data.user));
            
            // Actualizar el usuario en el contexto
            if (loginResponse.data.user) {
              updateUser(loginResponse.data.user);
            }
            
            // Intentar refrescar estado del proveedor (maneja automáticamente el caso de usuario sin perfil)
            try {
              await refrescarEstadoProveedor();
            } catch (estadoError: any) {
              // No crítico si falla, el estado se establecerá como usuario sin perfil
              if (__DEV__) {
                console.log('ℹ️ Estado del proveedor se establecerá automáticamente');
              }
            }
            
            await SecureStore.deleteItemAsync('pendingRegistration');
            if (__DEV__) {
              console.log('✅ Login exitoso con credenciales pendientes');
            }
          }
        } else {
          Alert.alert(
            'Sesión requerida',
            'Por favor, inicia sesión para continuar con el registro.',
            [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
          );
          return;
        }
      } catch (loginError: any) {
        if (__DEV__) {
          console.error('❌ Error en login con credenciales pendientes:', loginError);
        }
        Alert.alert(
          'Error de autenticación',
          'No se pudo iniciar sesión. Por favor, intenta nuevamente.',
          [
            { text: 'Intentar de nuevo', onPress: () => handleContinuar() },
            { text: 'Ir al login', onPress: () => router.replace('/(auth)/login') }
          ]
        );
        return;
      }
    }
    
    setIsLoading(true);
    try {
      // Inicializar el onboarding en el backend
      if (__DEV__) {
        console.log('Inicializando onboarding para tipo:', tipoSeleccionado);
      }
      const response = await authAPI.inicializarOnboarding(tipoSeleccionado);
      if (__DEV__) {
        console.log('Onboarding inicializado:', response);
      }
      
      // Navegar a la siguiente pantalla pasando el tipo seleccionado
      router.push({
        pathname: '/(onboarding)/informacion-basica' as any,
        params: { tipo: tipoSeleccionado }
      });
    } catch (error: any) {
      if (__DEV__) {
        console.error('Error inicializando onboarding:', error);
      }
      
      // Obtener mensaje de error más descriptivo
      let mensajeError = 'No se pudo inicializar el proceso de onboarding. Por favor, intenta nuevamente.';
      
      if (error.response?.data?.error) {
        mensajeError = error.response.data.error;
      } else if (error.response?.data?.detail) {
        mensajeError = error.response.data.detail;
      } else if (error.message) {
        mensajeError = error.message;
      }
      
      // Si el perfil ya existe, continuar normalmente
      if (error.response?.status === 400 && 
          (error.response?.data?.codigo === 'TALLER_DUPLICADO' || 
           error.response?.data?.codigo === 'MECANICO_DUPLICADO')) {
        if (__DEV__) {
          console.log('Perfil ya existe, continuando con información básica');
        }
        router.push({
          pathname: '/(onboarding)/informacion-basica' as any,
          params: { tipo: tipoSeleccionado }
        });
        return;
      }
      
      // Mostrar error con opción de reintentar
      Alert.alert(
        'Error',
        mensajeError,
        [
          {
            text: 'Reintentar',
            onPress: () => {
              // Pequeño delay para evitar múltiples llamadas rápidas
              setTimeout(() => handleContinuar(), 500);
            }
          },
          {
            text: 'Cancelar',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.contentWrapper}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          <OnboardingHeader
            title="¿Qué tipo de servicio ofreces?"
            subtitle="Selecciona la opción que mejor describa tu negocio"
            currentStep={1}
            totalSteps={6}
            canGoBack={false}
            icon="business-outline"
          />

          <View style={styles.opciones}>
            <TouchableOpacity
              style={[
                styles.opcion,
                tipoSeleccionado === 'taller' && styles.opcionSeleccionada
              ]}
              onPress={() => handleSeleccion('taller')}
              activeOpacity={0.8}
            >
              <View style={styles.opcionHeader}>
                <Ionicons 
                  name="business" 
                  size={32} 
                  color={tipoSeleccionado === 'taller' ? '#4E4FEB' : '#666666'} 
                />
                <Text style={[
                  styles.opcionTitulo,
                  tipoSeleccionado === 'taller' && styles.opcionTituloSeleccionado
                ]}>
                  Taller Mecánico
                </Text>
              </View>
              <Text style={styles.opcionDescripcion}>
                Tengo un taller físico donde los clientes traen sus vehículos para reparación y mantenimiento.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.opcion,
                tipoSeleccionado === 'mecanico' && styles.opcionSeleccionada
              ]}
              onPress={() => handleSeleccion('mecanico')}
              activeOpacity={0.8}
            >
              <View style={styles.opcionHeader}>
                <Ionicons 
                  name="car-sport" 
                  size={32} 
                  color={tipoSeleccionado === 'mecanico' ? '#4E4FEB' : '#666666'} 
                />
                <Text style={[
                  styles.opcionTitulo,
                  tipoSeleccionado === 'mecanico' && styles.opcionTituloSeleccionado
                ]}>
                  Mecánico a Domicilio
                </Text>
              </View>
              <Text style={styles.opcionDescripcion}>
                Ofrezco servicios de mecánica móvil, yendo directamente a la ubicación del cliente.
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Botón fijo en la parte inferior */}
        <SafeAreaView edges={['bottom']} style={styles.fixedButtonContainer}>
          <TouchableOpacity
            style={[
              styles.continuarButton,
              (!tipoSeleccionado || isLoading || isCheckingCredentials) && styles.buttonDisabled
            ]}
            onPress={handleContinuar}
            disabled={!tipoSeleccionado || isLoading || isCheckingCredentials}
            activeOpacity={0.8}
          >
            {isLoading || isCheckingCredentials ? (
              <View style={styles.loadingContent}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.continuarButtonText}>
                  {isCheckingCredentials ? 'Verificando...' : 'Inicializando...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.continuarButtonText}>
                {tipoSeleccionado ? 'Continuar' : 'Selecciona una opción'}
              </Text>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEEEEE',
  },
  contentWrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 24,
  },
  opciones: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    minHeight: 400,
  },
  opcion: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  opcionSeleccionada: {
    borderColor: '#4E4FEB',
    backgroundColor: '#E6F2FF',
  },
  opcionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  opcionTitulo: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginLeft: 12,
  },
  opcionTituloSeleccionado: {
    color: '#4E4FEB',
  },
  opcionDescripcion: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 22,
  },
  caracteristicas: {
    gap: 6,
  },
  caracteristica: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  fixedButtonContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  continuarButton: {
    backgroundColor: '#4E4FEB',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  buttonDisabled: {
    backgroundColor: '#D0D0D0',
  },
  continuarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
}); 