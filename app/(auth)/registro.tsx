import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

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

    return null;
  };

  const handleRegister = async () => {
    // Limpiar errores previos
    setErrorMessage(null);
    
    // Validar formulario
    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Crear Cuenta</Text>
            <Text style={styles.subtitle}>
              Únete a MecaniMóvil Proveedores
            </Text>
          </View>

          <View style={styles.form}>
            {/* Banner de error */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <InstitutionalIcon name="alert-circle" size={20} color="#FFFFFF"  strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
                <TouchableOpacity 
                  onPress={() => setErrorMessage(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <InstitutionalIcon name="close" size={18} color="#FFFFFF"  strokeWidth={ICON_STROKE_WIDTH} />
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nombre Completo</Text>
              <TextInput
                style={styles.input}
                value={formData.nombre}
                onChangeText={(value) => handleInputChange('nombre', value)}
                placeholder="Ingresa tu nombre completo"
                placeholderTextColor="#999"
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Correo Electrónico</Text>
              <TextInput
                style={styles.input}
                value={formData.correo}
                onChangeText={(value) => handleInputChange('correo', value)}
                placeholder="ejemplo@correo.com"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={[styles.passwordInputWrapper, isLoading && styles.inputDisabled]}>
                <TextInput
                  style={styles.passwordInput}
                  value={formData.contrasena}
                  onChangeText={(value) => handleInputChange('contrasena', value)}
                  placeholder="Mínimo 8 caracteres"
                  placeholderTextColor="#999"
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
                    color={showPassword ? '#4E4FEB' : '#666666'}
                   strokeWidth={ICON_STROKE_WIDTH} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirmar Contraseña</Text>
              <View style={[styles.passwordInputWrapper, isLoading && styles.inputDisabled]}>
                <TextInput
                  style={styles.passwordInput}
                  value={formData.confirmarContrasena}
                  onChangeText={(value) => handleInputChange('confirmarContrasena', value)}
                  placeholder="Repite tu contraseña"
                  placeholderTextColor="#999"
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
                    color={showConfirmPassword ? '#4E4FEB' : '#666666'}
                   strokeWidth={ICON_STROKE_WIDTH} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.registerButtonText}>Creando Cuenta...</Text>
                </View>
              ) : (
                <Text style={styles.registerButtonText}>Crear Cuenta</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <Text style={styles.dividerText}>¿Ya tienes cuenta?</Text>
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={goToLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  errorBannerText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#2c3e50',
  },
  inputDisabled: {
    opacity: 0.6,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#2c3e50',
  },
  eyeIcon: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  registerButton: {
    backgroundColor: '#27ae60',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#95a5a6',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  divider: {
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerText: {
    color: '#7f8c8d',
    fontSize: 16,
  },
  loginButton: {
    borderWidth: 2,
    borderColor: '#3498db',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#3498db',
    fontSize: 18,
    fontWeight: '600',
  },
}); 