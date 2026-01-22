import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { EstadoProveedor, getAPI } from '@/services/api';
import { useRouter } from 'expo-router';

interface EstadoRevisionScreenProps {
  estadoProveedor: EstadoProveedor;
}

export default function EstadoRevisionScreen({ estadoProveedor }: EstadoRevisionScreenProps) {
  const { logout, refrescarEstadoProveedor } = useAuth();
  const router = useRouter();

  const getIconoEstado = () => {
    switch (estadoProveedor.estado_verificacion) {
      case 'pendiente':
        return 'pending';
      case 'en_revision':
        return 'search';
      case 'rechazado':
        return 'error';
      default:
        return 'help';
    }
  };

  const getColorEstado = () => {
    switch (estadoProveedor.estado_verificacion) {
      case 'pendiente':
        return '#ff9500';
      case 'en_revision':
        return '#007AFF';
      case 'rechazado':
        return '#ff3b30';
      default:
        return '#8E8E93';
    }
  };

  const getMensajeEstado = () => {
    switch (estadoProveedor.estado_verificacion) {
      case 'pendiente':
        return 'Tu perfil está pendiente de revisión por nuestro equipo. Te notificaremos cuando hayamos revisado tu información.';
      case 'en_revision':
        return 'Nuestro equipo está revisando tu información. Este proceso puede tomar de 1 a 3 días hábiles.';
      case 'rechazado':
        return 'Tu perfil necesita correcciones. Por favor contacta a soporte para más información sobre los ajustes necesarios.';
      default:
        return 'Estado de verificación desconocido.';
    }
  };

  const getTituloEstado = () => {
    switch (estadoProveedor.estado_verificacion) {
      case 'pendiente':
        return 'Perfil Pendiente de Revisión';
      case 'en_revision':
        return 'Perfil en Revisión';
      case 'rechazado':
        return 'Perfil Rechazado';
      default:
        return 'Estado Desconocido';
    }
  };

  const handleContactarSoporte = () => {
    Alert.alert(
      'Contactar Soporte',
      'Para contactar a nuestro equipo de soporte, envía un email a soporte@mecanimovil.com o llama al +56 9 1234 5678',
      [{ text: 'Entendido', style: 'default' }]
    );
  };

  const handleActualizarEstado = async () => {
    try {
      await refrescarEstadoProveedor();
      Alert.alert('Estado Actualizado', 'Se ha actualizado el estado de tu perfil.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado. Intenta nuevamente.');
    }
  };

  const handleCerrarSesion = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar Sesión', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleCompletarDocumentos = async () => {
    try {
      // Llamar al endpoint para permitir completar documentos
      const api = await getAPI();
      const response = await api.post('/usuarios/completar-onboarding-documentos/');
      
      if (response.data.puede_subir_documentos) {
        Alert.alert(
          'Completar Documentos',
          'Ahora puedes subir tus documentos para completar tu verificación.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Subir Documentos', 
              onPress: () => router.push('/(onboarding)/subir-documentos') 
            },
          ]
        );
      } else {
        Alert.alert(
          'Documentos ya subidos',
          'Ya tienes documentos en revisión. Te notificaremos cuando sean aprobados.',
          [{ text: 'Entendido', style: 'default' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudo procesar la solicitud. Intenta nuevamente.',
        [{ text: 'Entendido', style: 'default' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Header con icono y estado */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: getColorEstado() + '20' }]}>
              <MaterialIcons
                name={getIconoEstado() as any}
                size={50}
                color={getColorEstado()}
              />
            </View>
            <Text style={styles.titulo}>{getTituloEstado()}</Text>
            <Text style={styles.mensaje}>{getMensajeEstado()}</Text>
          </View>

          {/* Información del perfil */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información de tu Perfil</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tipo de Proveedor:</Text>
              <Text style={styles.infoValue}>
                {estadoProveedor.tipo_proveedor === 'taller' ? 'Taller Mecánico' : 'Mecánico a Domicilio'}
              </Text>
            </View>

            {estadoProveedor.nombre && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nombre:</Text>
                <Text style={styles.infoValue}>{estadoProveedor.nombre}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha de Registro:</Text>
              <Text style={styles.infoValue}>
                {estadoProveedor.fecha_registro 
                  ? new Date(estadoProveedor.fecha_registro).toLocaleDateString('es-CL')
                  : 'No disponible'
                }
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Onboarding Completado:</Text>
              <Text style={[styles.infoValue, { color: estadoProveedor.onboarding_completado ? '#34C759' : '#FF3B30' }]}>
                {estadoProveedor.onboarding_completado ? 'Sí' : 'No'}
              </Text>
            </View>
          </View>

          {/* Botones de acción */}
          <View style={styles.actionsSection}>
            <TouchableOpacity style={styles.actionButton} onPress={handleActualizarEstado}>
              <MaterialIcons name="refresh" size={20} color="#007AFF" />
              <Text style={styles.actionButtonText}>Actualizar Estado</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleCompletarDocumentos}>
              <MaterialIcons name="upload-file" size={20} color="#007AFF" />
              <Text style={styles.actionButtonText}>Completar Documentos</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleContactarSoporte}>
              <MaterialIcons name="support" size={20} color="#007AFF" />
              <Text style={styles.actionButtonText}>Contactar Soporte</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.logoutButton]} onPress={handleCerrarSesion}>
              <MaterialIcons name="logout" size={20} color="#FF3B30" />
              <Text style={[styles.actionButtonText, styles.logoutText]}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>

          {/* Información adicional */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>¿Qué sigue?</Text>
            <Text style={styles.infoText}>
              Una vez que tu perfil sea aprobado, podrás:
            </Text>
            <View style={styles.benefitsList}>
              <Text style={styles.benefitItem}>✓ Recibir solicitudes de servicio</Text>
              <Text style={styles.benefitItem}>✓ Aparecer en la búsqueda de clientes</Text>
              <Text style={styles.benefitItem}>✓ Gestionar tu agenda de trabajo</Text>
              <Text style={styles.benefitItem}>✓ Acceder a todas las funcionalidades de la plataforma</Text>
            </View>
          </View>
        </View>
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
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 10,
  },
  mensaje: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'right',
  },
  actionsSection: {
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 8,
  },
  logoutButton: {
    borderColor: '#FF3B30',
    borderWidth: 1,
  },
  logoutText: {
    color: '#FF3B30',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  benefitsList: {
    marginTop: 5,
  },
  benefitItem: {
    fontSize: 14,
    color: '#34C759',
    marginBottom: 8,
    lineHeight: 20,
  },
}); 