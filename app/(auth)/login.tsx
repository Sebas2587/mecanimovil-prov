import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    // Logs solo en desarrollo (__DEV__), nunca en producción (APK)
    if (__DEV__) {
      console.log('🔑 Iniciando proceso de login...');
      console.log('Username:', username.trim());
      console.log('Password length:', password.length);
    }
    
    if (!username.trim() || !password) {
      if (__DEV__) {
        console.log('❌ Campos incompletos');
      }
      Alert.alert(
        'Campos incompletos',
        'Por favor completa todos los campos para iniciar sesión.',
        [{ text: 'Entendido', style: 'default' }]
      );
      return;
    }

    setIsLoading(true);
    
    try {
      if (__DEV__) {
        console.log('📡 Llamando a login API...');
      }
      const result = await login(username.trim(), password);
      
      if (__DEV__) {
        console.log('✅ Login exitoso! Navegando...');
      }
      
      // Usar el estado del proveedor retornado por login
      const { estadoProveedor: estadoActual } = result;
      
      if (__DEV__) {
        console.log('🧭 EstadoProveedor retornado por login:', estadoActual);
      }
      
      // Lógica de navegación corregida
      if (!estadoActual || !estadoActual.tiene_perfil) {
        if (__DEV__) {
          console.log('🚀 Navegando a onboarding - sin perfil de proveedor');
        }
        router.replace('/(onboarding)/tipo-cuenta');
      } else if (estadoActual.onboarding_iniciado && !estadoActual.onboarding_completado) {
        if (__DEV__) {
          console.log('🔄 Navegando a onboarding - onboarding iniciado pero no completado');
        }
        router.replace('/(onboarding)/tipo-cuenta');
      } else if (estadoActual.onboarding_completado && !estadoActual.verificado) {
        if (__DEV__) {
          console.log('✅ Usuario con onboarding completado pero no verificado - navegando a home');
        }
        router.replace('/(tabs)' as any);
      } else if (estadoActual.verificado) {
        if (__DEV__) {
          console.log('🎉 Usuario verificado - navegando a tabs principales');
        }
        router.replace('/(tabs)' as any);
      } else {
        if (__DEV__) {
          console.log('❓ Caso edge - navegando a home por defecto');
        }
        router.replace('/(tabs)' as any);
      }
      
    } catch (error: any) {
      // Log detallado solo en desarrollo para debugging
      // En producción (APK), estos logs NO aparecerán
      if (__DEV__) {
        console.error('❌ Error en login (detalles solo en desarrollo):', {
          message: error.message,
          code: error.code,
          // NO loguear datos sensibles o detalles técnicos completos
        });
      }
      
      // El mensaje de error ya viene amigable desde AuthContext
      // Solo mostrarlo en una alerta apropiada
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Ocurrió un problema al intentar iniciar sesión. Por favor, verifica tu conexión a internet e intenta nuevamente.';
      
      Alert.alert(
        'Error al iniciar sesión',
        errorMessage,
        [{ text: 'Entendido', style: 'default' }]
      );
    } finally {
      if (__DEV__) {
        console.log('🏁 Finalizando proceso de login, isLoading = false');
      }
      setIsLoading(false);
    }
  };

  const goToRegister = () => {
    router.push('/registro' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>MecaniMóvil</Text>
            <Text style={styles.subtitle}>Proveedores</Text>
            <Text style={styles.description}>
              Conecta tu taller o servicio a domicilio con clientes
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Usuario o Email</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Ingresa tu usuario o email"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Ingresa tu contraseña"
                placeholderTextColor="#999"
                secureTextEntry
                autoComplete="current-password"
                autoCorrect={false}
                autoCapitalize="none"
                textContentType="password"
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <Text style={styles.dividerText}>¿No tienes cuenta?</Text>
            </View>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={goToRegister}
              disabled={isLoading}
            >
              <Text style={styles.registerButtonText}>Crear Cuenta</Text>
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3498db',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 22,
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
  loginButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  loginButtonText: {
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
  registerButton: {
    borderWidth: 2,
    borderColor: '#3498db',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#3498db',
    fontSize: 18,
    fontWeight: '600',
  },
}); 