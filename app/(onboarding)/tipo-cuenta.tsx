import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { authAPI, getAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useOnboardingDraft } from '@/context/OnboardingDraftContext';
import { deleteItem, getItem, setItem } from '@/utils/authStorage';
import { showAlertButtons, showConfirm } from '@/utils/platformAlert';
import OnboardingHeader from '@/components/OnboardingHeader';
import {
  OnboardingScreenLayout,
  OnboardingPrimaryButton,
} from '@/components/onboarding';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS } from '@/app/design-system/tokens';
import { onboardingStyles } from '@/app/design-system/styles/onboarding';

const I = COLORS.institutional;

type ModalidadAtencion = 'en_taller' | 'a_domicilio' | 'ambas';

// Unificación de proveedores: TODO proveedor es un taller. La modalidad de atención
// (en_taller / a_domicilio / ambas) define si ofrece servicio en local, a domicilio o ambos.
// `tipo` se mantiene en 'taller' siempre por compatibilidad con el backend.
const modalidadToTipo = (_m: ModalidadAtencion): 'taller' | 'mecanico' => 'taller';

export default function TipoCuentaScreen() {
  const [modalidadSeleccionada, setModalidadSeleccionada] = useState<ModalidadAtencion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingCredentials, setIsCheckingCredentials] = useState(true);
  const router = useRouter();
  const { login, isAuthenticated, updateUser, refrescarEstadoProveedor } = useAuth();
  const { draft, patchDraft } = useOnboardingDraft();

  useFocusEffect(
    useCallback(() => {
      if (draft.modalidad_atencion) {
        setModalidadSeleccionada(draft.modalidad_atencion);
      } else if (draft.tipo === 'mecanico') {
        setModalidadSeleccionada('a_domicilio');
      } else if (draft.tipo === 'taller') {
        setModalidadSeleccionada('en_taller');
      }
    }, [draft.modalidad_atencion, draft.tipo]),
  );

  // Verificar si hay credenciales pendientes de registro y hacer login automático
  useEffect(() => {
    const checkPendingRegistration = async () => {
      try {
        const pendingData = await getItem('pendingRegistration');
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
                await setItem('authToken', loginResponse.data.token);
                await setItem('userData', JSON.stringify(loginResponse.data.user));
                
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
                await deleteItem('pendingRegistration');
              }
            } catch (loginError: any) {
              if (__DEV__) {
                console.warn('⚠️ Error en login automático (continuando sin autenticación):', loginError.message);
              }
              // Limpiar credenciales pendientes incluso si falla el login
              await deleteItem('pendingRegistration');
            }
          } else {
            // Credenciales muy antiguas, limpiarlas
            if (__DEV__) {
              console.log('⏰ Credenciales pendientes expiradas, limpiando...');
            }
            await deleteItem('pendingRegistration');
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

  const handleSeleccion = (modalidad: ModalidadAtencion) => {
    setModalidadSeleccionada(modalidad);
    patchDraft({ modalidad_atencion: modalidad, tipo: modalidadToTipo(modalidad) });
  };

  const handleContinuar = async () => {
    if (!modalidadSeleccionada || isLoading || isCheckingCredentials) return;
    const tipoSeleccionado = modalidadToTipo(modalidadSeleccionada);
    
    // Si no está autenticado, intentar hacer login con credenciales pendientes
    if (!isAuthenticated) {
      try {
        const pendingData = await getItem('pendingRegistration');
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
            await setItem('authToken', loginResponse.data.token);
            await setItem('userData', JSON.stringify(loginResponse.data.user));
            
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
            
            await deleteItem('pendingRegistration');
            if (__DEV__) {
              console.log('✅ Login exitoso con credenciales pendientes');
            }
          }
        } else {
          showAlertButtons('Sesión requerida', 'Por favor, inicia sesión para continuar con el registro.', [
            { text: 'OK', onPress: () => router.replace('/(auth)/login') },
          ]);
          return;
        }
      } catch (loginError: any) {
        if (__DEV__) {
          console.error('❌ Error en login con credenciales pendientes:', loginError);
        }
        showConfirm('Error de autenticación', 'No se pudo iniciar sesión. ¿Intentar de nuevo?', {
          confirmText: 'Intentar de nuevo',
          onConfirm: () => handleContinuar(),
          onCancel: () => router.replace('/(auth)/login'),
        });
        return;
      }
    }
    
    setIsLoading(true);
    try {
      // Inicializar el onboarding en el backend
      if (__DEV__) {
        console.log('Inicializando onboarding para tipo:', tipoSeleccionado);
      }
      const response = await authAPI.inicializarOnboarding({
        tipo_proveedor: tipoSeleccionado,
        modalidad_atencion: modalidadSeleccionada,
      });
      if (__DEV__) {
        console.log('Onboarding inicializado:', response);
      }
      
      patchDraft({ tipo: tipoSeleccionado, modalidad_atencion: modalidadSeleccionada });
      router.push({
        pathname: '/(onboarding)/informacion-basica' as any,
        params: { tipo: tipoSeleccionado, modalidad_atencion: modalidadSeleccionada },
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
        patchDraft({ tipo: tipoSeleccionado, modalidad_atencion: modalidadSeleccionada });
        router.push({
          pathname: '/(onboarding)/informacion-basica' as any,
          params: { tipo: tipoSeleccionado, modalidad_atencion: modalidadSeleccionada },
        });
        return;
      }
      
      // Mostrar error con opción de reintentar
      showConfirm('Error', mensajeError, {
        confirmText: 'Reintentar',
        onConfirm: () => { setTimeout(() => handleContinuar(), 500); },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OnboardingScreenLayout
      footer={
        <OnboardingPrimaryButton
          label={modalidadSeleccionada ? 'Continuar' : 'Selecciona una opción'}
          onPress={handleContinuar}
          disabled={!modalidadSeleccionada}
          loading={isLoading || isCheckingCredentials}
          loadingLabel={isCheckingCredentials ? 'Verificando…' : 'Inicializando…'}
        />
      }
    >
      <OnboardingHeader
        title="¿Cómo atiendes a tus clientes?"
        subtitle="Elige tu modalidad de atención. Podrás configurar tu equipo después."
        currentStep={1}
        totalSteps={5}
        canGoBack={false}
        icon="business-outline"
      />

      <View style={onboardingStyles.optionsStack}>
        {MODALIDAD_OPCIONES.map((opcion) => {
          const seleccionada = modalidadSeleccionada === opcion.value;
          return (
            <TouchableOpacity
              key={opcion.value}
              style={[
                onboardingStyles.optionCard,
                seleccionada && onboardingStyles.optionCardSelected,
              ]}
              onPress={() => handleSeleccion(opcion.value)}
              activeOpacity={0.85}
            >
              <View style={onboardingStyles.optionCardBody}>
                <View style={onboardingStyles.optionHeaderRow}>
                  <InstitutionalIcon
                    name={opcion.icon}
                    size={28}
                    color={seleccionada ? I.primary : I.muted}
                    strokeWidth={ICON_STROKE_WIDTH}
                  />
                  <Text
                    style={[
                      onboardingStyles.optionTitle,
                      seleccionada && onboardingStyles.optionTitleSelected,
                    ]}
                  >
                    {opcion.title}
                  </Text>
                </View>
                <Text style={onboardingStyles.optionDescription}>{opcion.description}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </OnboardingScreenLayout>
  );
}

const MODALIDAD_OPCIONES: {
  value: ModalidadAtencion;
  title: string;
  description: string;
  icon: string;
}[] = [
  {
    value: 'en_taller',
    title: 'En taller (lugar físico)',
    description: 'Tengo un taller físico donde los clientes traen sus vehículos para reparación y mantenimiento.',
    icon: 'business',
  },
  {
    value: 'a_domicilio',
    title: 'A domicilio',
    description: 'Ofrezco servicios de mecánica móvil, yendo directamente a la ubicación del cliente.',
    icon: 'car-sport',
  },
  {
    value: 'ambas',
    title: 'En taller y a domicilio',
    description: 'Atiendo en mi taller y también ofrezco servicio a domicilio. Podrás asignar a cada mecánico su modalidad.',
    icon: 'swap-horizontal',
  },
];