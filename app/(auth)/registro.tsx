import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import {
  OnboardingScreenLayout,
  OnboardingPrimaryButton,
} from '@/components/onboarding';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS } from '@/app/design-system/tokens';
import { Card } from '@/app/design-system/components';
import { onboardingStyles } from '@/app/design-system/styles/onboarding';
import LegalAcceptanceRow from '@/components/legal/LegalAcceptanceRow';

const I = COLORS.institutional;

// Mapeo de errores comunes del backend a mensajes amigables
const ERROR_MESSAGES: { [key: string]: string } = {
  'A user with that username already exists.': 'Este nombre de usuario ya está en uso. Prueba con otro correo.',
  'user with this email already exists.': 'Este correo electrónico ya está registrado. ¿Ya tienes una cuenta?',
  'This password is too common.': 'La contraseña es muy común. Por favor, usa una más segura.',
  'This password is entirely numeric.': 'La contraseña no puede ser solo números.',
  'The password is too similar to the username.': 'La contraseña es muy similar a tu usuario.',
  'This password is too short.': 'La contraseña es muy corta. Usa al menos 8 caracteres.',
  'Enter a valid email address.': 'Por favor, ingresa un correo electrónico válido.',
};

// Función para obtener mensaje de error amigable
const getErrorMessage = (error: any): string => {
  // Error de red/conexión
  if (error.message?.includes('Network') || error.message?.includes('network') || error.code === 'ERR_NETWORK') {
    return 'No hay conexión a internet. Por favor, verifica tu conexión e intenta nuevamente.';
  }
  
  // Error del servidor
  if (error.response?.status === 500) {
    return 'Error en el servidor. Por favor, intenta más tarde.';
  }
  
  if (error.response?.status === 503) {
    return 'El servicio no está disponible temporalmente. Por favor, intenta más tarde.';
  }
  
  // Errores específicos del backend
  if (error.response?.data) {
    const data = error.response.data;
    
    // Verificar campos específicos
    if (data.username) {
      const msg = Array.isArray(data.username) ? data.username[0] : data.username;
      return ERROR_MESSAGES[msg] || `Usuario: ${msg}`;
    }
    
    if (data.email) {
      const msg = Array.isArray(data.email) ? data.email[0] : data.email;
      return ERROR_MESSAGES[msg] || `Correo: ${msg}`;
    }
    
    if (data.password) {
      const msg = Array.isArray(data.password) ? data.password[0] : data.password;
      return ERROR_MESSAGES[msg] || `Contraseña: ${msg}`;
    }
    
    if (data.non_field_errors) {
      const msg = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
      return ERROR_MESSAGES[msg] || msg;
    }
    
    if (data.error) {
      return ERROR_MESSAGES[data.error] || data.error;
    }
    
    if (data.detail) {
      return ERROR_MESSAGES[data.detail] || data.detail;
    }
  }
  
  // Mensaje del error directamente
  if (error.message && ERROR_MESSAGES[error.message]) {
    return ERROR_MESSAGES[error.message];
  }
  
  // Mensaje por defecto o del error
  return error.message || 'Ha ocurrido un error al registrar tu cuenta. Por favor, intenta nuevamente.';
};

export default function RegistroScreen() {
  const params = useLocalSearchParams<{
    email?: string;
    firstName?: string;
    lastName?: string;
  }>();

  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    contrasena: '',
    confirmarContrasena: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [termsError, setTermsError] = useState<string | undefined>();
  
  const { registro, limpiarStorage } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const prefillName = [params.firstName, params.lastName].filter(Boolean).join(' ').trim();
    if (prefillName || params.email) {
      setFormData((prev) => ({
        ...prev,
        nombre: prefillName || prev.nombre,
        correo: typeof params.email === 'string' ? params.email : prev.correo,
      }));
    }
  }, [params.email, params.firstName, params.lastName]);

  const handleInputChange = (field: string, value: string) => {
    // Limpiar error cuando el usuario empieza a escribir
    if (errorMessage) {
      setErrorMessage(null);
    }
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.nombre.trim()) {
      return 'El nombre es requerido';
    }

    if (!formData.correo.trim()) {
      return 'El correo electrónico es requerido';
    }

    // Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.correo)) {
      return 'Por favor ingresa un correo electrónico válido';
    }

    if (!formData.contrasena) {
      return 'La contraseña es requerida';
    }

    if (formData.contrasena.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }

    if (formData.contrasena !== formData.confirmarContrasena) {
      return 'Las contraseñas no coinciden';
    }

    if (!acceptTerms) {
      return 'Debes aceptar los términos y la política de privacidad';
    }

    return null;
  };

  const handleRegister = async () => {
    // Limpiar errores previos
    setErrorMessage(null);
    
    // Validar formulario
    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      if (validationError.includes('términos')) setTermsError(validationError);
      return;
    }

    setIsLoading(true);
    try {
      // Limpiar storage antes del registro para evitar tokens corrompidos
      await limpiarStorage();
      if (__DEV__) {
        console.log('Storage limpiado antes del registro');
      }
      
      // Crear username a partir del email (sin caracteres especiales)
      let username = formData.correo.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      
      // Asegurar que el username tenga al menos 3 caracteres
      if (username.length < 3) {
        username = username + '123'; // Agregar números si es muy corto
      }
      
      // Limitar el username a 30 caracteres (límite de Django)
      if (username.length > 30) {
        username = username.substring(0, 30);
      }
      
      const registroData = {
        username: username,
        email: formData.correo.toLowerCase().trim(),
        password: formData.contrasena,
        first_name: formData.nombre.trim(),
        acepta_terminos: true,
      };

      if (__DEV__) {
        console.log('📝 Intentando registro con datos:', { ...registroData, password: '***' });
        console.log('📝 Username generado:', username);
      }
      
      await registro(registroData);
      
      // Después del registro exitoso, navegar directamente al onboarding
      // Las credenciales ya están guardadas temporalmente en AuthContext
      if (__DEV__) {
        console.log('✅ Registro completado exitosamente');
        console.log('🚀 Navegando directamente al onboarding...');
      }
      router.replace('/(onboarding)/tipo-cuenta');
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ Error en registro:', error);
        console.error('Response data:', error.response?.data);
        console.error('Response status:', error.response?.status);
      }
      
      const friendlyMessage = getErrorMessage(error);
      setErrorMessage(friendlyMessage);
      
      // También mostrar en Alert para errores críticos de red
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network')) {
        Alert.alert(
          'Sin Conexión',
          'No se pudo conectar al servidor. Por favor, verifica tu conexión a internet.',
          [{ text: 'Entendido' }]
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const goToLogin = () => {
    router.back();
  };

  return (
    <OnboardingScreenLayout
      keyboardAvoiding
      footer={
        <OnboardingPrimaryButton
          label={isLoading ? 'Creando cuenta…' : 'Crear cuenta'}
          onPress={handleRegister}
          disabled={isLoading}
          loading={isLoading}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.subtitle}>Únete a Mecanimovil Proveedores</Text>
      </View>

      <Card elevated padding="host">
            {/* Banner de error */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <InstitutionalIcon name="alert-circle" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
                <TouchableOpacity 
                  onPress={() => setErrorMessage(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <InstitutionalIcon name="close" size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.inputContainer}>
              <Text style={onboardingStyles.label}>Nombre completo</Text>
              <TextInput
                style={onboardingStyles.input}
                value={formData.nombre}
                onChangeText={(value) => handleInputChange('nombre', value)}
                placeholder="Ingresa tu nombre completo"
                placeholderTextColor={I.mutedSoft}
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={onboardingStyles.label}>Correo electrónico</Text>
              <TextInput
                style={onboardingStyles.input}
                value={formData.correo}
                onChangeText={(value) => handleInputChange('correo', value)}
                placeholder="ejemplo@correo.com"
                placeholderTextColor={I.mutedSoft}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={onboardingStyles.label}>Contraseña</Text>
              <View style={[styles.passwordInputWrapper, isLoading && styles.inputDisabled]}>
                <TextInput
                  style={styles.passwordInput}
                  value={formData.contrasena}
                  onChangeText={(value) => handleInputChange('contrasena', value)}
                  placeholder="Mínimo 8 caracteres"
                  placeholderTextColor={I.mutedSoft}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  autoCorrect={false}
                  autoCapitalize="none"
                  textContentType="newPassword"
                  passwordRules="minlength: 8;"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.6}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  disabled={isLoading}
                >
                  <InstitutionalIcon
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={showPassword ? I.primary : I.muted}
                   strokeWidth={ICON_STROKE_WIDTH} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={onboardingStyles.label}>Confirmar contraseña</Text>
              <View style={[styles.passwordInputWrapper, isLoading && styles.inputDisabled]}>
                <TextInput
                  style={styles.passwordInput}
                  value={formData.confirmarContrasena}
                  onChangeText={(value) => handleInputChange('confirmarContrasena', value)}
                  placeholder="Repite tu contraseña"
                  placeholderTextColor={I.mutedSoft}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="new-password"
                  autoCorrect={false}
                  autoCapitalize="none"
                  textContentType="newPassword"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  activeOpacity={0.6}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  disabled={isLoading}
                >
                  <InstitutionalIcon
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={showConfirmPassword ? I.primary : I.muted}
                   strokeWidth={ICON_STROKE_WIDTH} />
                </TouchableOpacity>
              </View>
            </View>

            <LegalAcceptanceRow
              checked={acceptTerms}
              onToggle={() => {
                setAcceptTerms((v) => !v);
                if (termsError) setTermsError(undefined);
              }}
              error={termsError}
            />

        <View style={styles.divider}>
          <Text style={styles.dividerText}>¿Ya tienes cuenta?</Text>
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={goToLogin} disabled={isLoading}>
          <Text style={styles.loginButtonText}>Iniciar sesión</Text>
        </TouchableOpacity>
      </Card>
    </OnboardingScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: I.ink,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: I.muted,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: I.semanticDown,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  errorBannerText: {
    flex: 1,
    color: I.onPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: { marginBottom: 16 },
  inputDisabled: { opacity: 0.6 },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: 12,
    backgroundColor: I.canvas,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: I.ink,
  },
  eyeIcon: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  divider: { alignItems: 'center', marginVertical: 20 },
  dividerText: { color: I.muted, fontSize: 15 },
  loginButton: {
    borderWidth: 1.5,
    borderColor: I.primary,
    borderRadius: 999,
    padding: 14,
    alignItems: 'center',
  },
  loginButtonText: {
    color: I.primary,
    fontSize: 16,
    fontWeight: '600',
  },
}); 