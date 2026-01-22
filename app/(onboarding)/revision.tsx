import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';

export default function RevisionScreen() {
  const { tipo } = useLocalSearchParams();
  const router = useRouter();
  const { logout } = useAuth();

  const handleVolverLogin = async () => {
    await logout();
    router.replace('/(auth)/login' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#27ae60" />
          </View>
          <Text style={styles.title}>¡Registro Completado!</Text>
          <Text style={styles.subtitle}>
            Tu solicitud de registro como {tipo === 'taller' ? 'taller mecánico' : 'mecánico a domicilio'} ha sido enviada exitosamente.
          </Text>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Ionicons name="time" size={24} color="#3498db" />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Tiempo de Revisión</Text>
              <Text style={styles.infoDescription}>
                Nuestro equipo revisará tu solicitud en un plazo de 24-48 horas hábiles.
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="document-text" size={24} color="#f39c12" />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Verificación de Documentos</Text>
              <Text style={styles.infoDescription}>
                Verificaremos la autenticidad de los documentos y la información proporcionada.
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="mail" size={24} color="#9b59b6" />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Notificación por Email</Text>
              <Text style={styles.infoDescription}>
                Te enviaremos un correo electrónico con el resultado de la revisión.
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="shield-checkmark" size={24} color="#27ae60" />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Activación de Cuenta</Text>
              <Text style={styles.infoDescription}>
                Una vez aprobado, podrás acceder a la plataforma y comenzar a recibir solicitudes de servicio.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.nextStepsContainer}>
          <Text style={styles.nextStepsTitle}>Próximos Pasos</Text>
          
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>
              Mantén tu correo electrónico activo para recibir notificaciones
            </Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>
              Prepara tu {tipo === 'taller' ? 'taller' : 'equipo de trabajo'} para comenzar a atender clientes
            </Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>
              Una vez aprobado, descarga la aplicación para proveedores y comienza a trabajar
            </Text>
          </View>
        </View>

        <View style={styles.contactContainer}>
          <Ionicons name="help-circle" size={20} color="#3498db" />
          <Text style={styles.contactText}>
            ¿Tienes preguntas? Contáctanos en{' '}
            <Text style={styles.contactEmail}>soporte@mecanimovil.com</Text>
          </Text>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleVolverLogin}
        >
          <Text style={styles.logoutButtonText}>Volver al Login</Text>
        </TouchableOpacity>
      </ScrollView>
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
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 40,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  infoContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  nextStepsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  nextStepsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
  contactContainer: {
    flexDirection: 'row',
    backgroundColor: '#e8f4fd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  contactText: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
    marginLeft: 8,
    lineHeight: 20,
  },
  contactEmail: {
    color: '#3498db',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 