import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';

interface EstadisticasDocumentos {
  totalSubidos: number;
  obligatoriosSubidos: number;
  opcionalesSubidos: number;
  totalObligatorios: number;
  totalOpcionales: number;
}

export default function CuentaEnRevisionScreen() {
  const router = useRouter();
  const { estadoProveedor, refrescarEstadoProveedor } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    console.log('🔍 CuentaEnRevisionScreen - Estado del proveedor:', estadoProveedor);
    
    // Si el usuario está verificado, redirigir a la app principal
    if (estadoProveedor?.verificado) {
      console.log('✅ Usuario verificado, redirigiendo a app principal');
      router.replace('/(tabs)');
      return;
    }

    // Si no tiene perfil, redirigir a onboarding
    if (!estadoProveedor?.tiene_perfil) {
      console.log('❌ Usuario sin perfil, redirigiendo a onboarding');
      router.replace('/(onboarding)/tipo-cuenta');
      return;
    }

    // Si el onboarding no está completo, redirigir a onboarding
    if (!estadoProveedor?.onboarding_completado) {
      console.log('❌ Onboarding incompleto, redirigiendo a onboarding');
      router.replace('/(onboarding)/tipo-cuenta');
      return;
    }
  }, [estadoProveedor]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refrescarEstadoProveedor();
    } catch (error) {
      console.error('Error refrescando estado:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const obtenerEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente de Revisión';
      case 'en_revision':
        return 'En Revisión';
      case 'revision_documentos':
        return 'Revisión de Documentos';
      case 'verificado':
        return 'Verificado';
      case 'rechazado':
        return 'Rechazado';
      default:
        return 'Pendiente de Revisión';
    }
  };

  const obtenerEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return '#f39c12';
      case 'en_revision':
        return '#3498db';
      case 'revision_documentos':
        return '#9b59b6';
      case 'verificado':
        return '#27ae60';
      case 'rechazado':
        return '#e74c3c';
      default:
        return '#f39c12';
    }
  };

  const obtenerEstadoIcono = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'time-outline';
      case 'en_revision':
        return 'eye-outline';
      case 'revision_documentos':
        return 'document-text-outline';
      case 'verificado':
        return 'checkmark-circle-outline';
      case 'rechazado':
        return 'close-circle-outline';
      default:
        return 'time-outline';
    }
  };

  const obtenerMensajePrincipal = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'Tu registro está completo y ha sido enviado a nuestro equipo de verificación.';
      case 'en_revision':
        return 'Nuestro equipo está revisando tu información y documentos.';
      case 'revision_documentos':
        return 'Estamos verificando la autenticidad de tus documentos.';
      case 'verificado':
        return '¡Felicitaciones! Tu cuenta ha sido verificada exitosamente.';
      case 'rechazado':
        return 'Hemos encontrado algunos problemas con tu registro que necesitan ser corregidos.';
      default:
        return 'Tu registro está siendo procesado por nuestro equipo.';
    }
  };

  const obtenerMensajeSecundario = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'Recibirás una notificación cuando iniciemos la revisión. Este proceso puede tomar de 1 a 3 días hábiles.';
      case 'en_revision':
        return 'Este proceso puede tomar de 1 a 2 días hábiles. Te notificaremos del progreso.';
      case 'revision_documentos':
        return 'Verificamos que tus documentos sean auténticos y estén vigentes. Este proceso puede tomar hasta 24 horas.';
      case 'verificado':
        return 'Ya puedes empezar a recibir órdenes de servicio. Te notificaremos cuando tengas nuevas solicitudes.';
      case 'rechazado':
        return 'Revisa los comentarios de nuestro equipo y corrige la información requerida.';
      default:
        return 'Te mantendremos informado sobre el progreso de tu verificación.';
    }
  };

  const irASubirDocumentos = () => {
    router.push('/(onboarding)/subir-documentos');
  };

  const irAInicio = () => {
    router.replace('/(tabs)');
  };

  const cerrarSesion = () => {
    router.replace('/(auth)/login');
  };

  const renderEstadoCard = () => {
    const estado = estadoProveedor?.estado_verificacion || 'pendiente';
    const color = obtenerEstadoColor(estado);
    const icono = obtenerEstadoIcono(estado);
    
    return (
      <View style={[styles.estadoCard, { borderLeftColor: color }]}>
        <View style={styles.estadoHeader}>
          <Ionicons name={icono as any} size={32} color={color} />
          <View style={styles.estadoInfo}>
            <Text style={[styles.estadoTitulo, { color }]}>
              {obtenerEstadoTexto(estado)}
            </Text>
            <Text style={styles.estadoFecha}>
              Última actualización: {new Date().toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        <Text style={styles.estadoMensaje}>
          {obtenerMensajePrincipal(estado)}
        </Text>
        
        <Text style={styles.estadoDetalle}>
          {obtenerMensajeSecundario(estado)}
        </Text>
      </View>
    );
  };

  const renderInformacionPerfil = () => {
    const tipoProveedor = estadoProveedor?.tipo_proveedor || 'proveedor';
    const nombre = estadoProveedor?.nombre || 'Tu negocio';
    
    return (
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons 
            name={tipoProveedor === 'taller' ? 'business-outline' : 'person-outline'} 
            size={24} 
            color="#3498db" 
          />
          <Text style={styles.infoTitulo}>Información del Perfil</Text>
        </View>
        
        <View style={styles.infoDetalle}>
          <Text style={styles.infoLabel}>Nombre:</Text>
          <Text style={styles.infoValor}>{nombre}</Text>
        </View>
        
        <View style={styles.infoDetalle}>
          <Text style={styles.infoLabel}>Tipo:</Text>
          <Text style={styles.infoValor}>
            {tipoProveedor === 'taller' ? 'Taller Mecánico' : 'Mecánico a Domicilio'}
          </Text>
        </View>
        
        <View style={styles.infoDetalle}>
          <Text style={styles.infoLabel}>Estado del Onboarding:</Text>
          <Text style={[styles.infoValor, { color: '#27ae60' }]}>
            {estadoProveedor?.onboarding_completado ? 'Completado' : 'Pendiente'}
          </Text>
        </View>
      </View>
    );
  };

  const renderDocumentosStatus = () => {
    // Por ahora, asumimos que si tiene onboarding completado, los documentos están en proceso
    // En el futuro, se puede agregar un campo específico para documentos en EstadoProveedor
    const documentosEnProceso = estadoProveedor?.onboarding_completado || false;
    
    return (
      <View style={styles.documentosCard}>
        <View style={styles.documentosHeader}>
          <Ionicons 
            name="document-text-outline" 
            size={24} 
            color={documentosEnProceso ? '#27ae60' : '#f39c12'} 
          />
          <Text style={styles.documentosTitulo}>Estado de Documentos</Text>
        </View>
        
        <View style={styles.documentosStatus}>
          <Ionicons 
            name={documentosEnProceso ? 'checkmark-circle' : 'time'} 
            size={20} 
            color={documentosEnProceso ? '#27ae60' : '#f39c12'} 
          />
          <Text style={[
            styles.documentosTexto,
            { color: documentosEnProceso ? '#27ae60' : '#f39c12' }
          ]}>
            {documentosEnProceso ? 'Documentos en Revisión' : 'Documentos Pendientes'}
          </Text>
        </View>
        
        {!documentosEnProceso && (
          <TouchableOpacity 
            style={styles.subirDocumentosButton}
            onPress={irASubirDocumentos}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="white" />
            <Text style={styles.subirDocumentosTexto}>Subir Documentos</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderAcciones = () => {
    const verificado = estadoProveedor?.verificado || false;
    
    return (
      <View style={styles.accionesContainer}>
        {verificado ? (
          <TouchableOpacity 
            style={styles.accionPrimaria}
            onPress={irAInicio}
          >
            <Ionicons name="home-outline" size={20} color="white" />
            <Text style={styles.accionPrimariaTexto}>Ir a la Aplicación</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.accionesDisponibles}>
            <TouchableOpacity 
              style={styles.accionSecundaria}
              onPress={onRefresh}
            >
              <Ionicons name="refresh-outline" size={20} color="#3498db" />
              <Text style={styles.accionSecundariaTexto}>Actualizar Estado</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.accionSecundaria}
              onPress={cerrarSesion}
            >
              <Ionicons name="log-out-outline" size={20} color="#e74c3c" />
              <Text style={[styles.accionSecundariaTexto, { color: '#e74c3c' }]}>
                Cerrar Sesión
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (!estadoProveedor) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Cargando estado...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Ionicons name="shield-checkmark-outline" size={64} color="#3498db" />
          <Text style={styles.headerTitulo}>Estado de tu Cuenta</Text>
          <Text style={styles.headerSubtitulo}>
            Verificación de Proveedor
          </Text>
        </View>

        {renderEstadoCard()}
        {renderInformacionPerfil()}
        {renderDocumentosStatus()}
        {renderAcciones()}

        <View style={styles.ayudaContainer}>
          <Ionicons name="help-circle-outline" size={24} color="#95a5a6" />
          <Text style={styles.ayudaTitulo}>¿Necesitas ayuda?</Text>
          <Text style={styles.ayudaTexto}>
            Si tienes preguntas sobre el proceso de verificación o necesitas actualizar tu información, 
            contáctanos a través de nuestro soporte técnico.
          </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#5d6d7e',
  },
  scrollContainer: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 15,
    marginBottom: 5,
  },
  headerSubtitulo: {
    fontSize: 16,
    color: '#5d6d7e',
  },
  estadoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  estadoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  estadoInfo: {
    flex: 1,
    marginLeft: 15,
  },
  estadoTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  estadoFecha: {
    fontSize: 12,
    color: '#95a5a6',
  },
  estadoMensaje: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 10,
    lineHeight: 22,
  },
  estadoDetalle: {
    fontSize: 14,
    color: '#5d6d7e',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 10,
  },
  infoDetalle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#5d6d7e',
  },
  infoValor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  documentosCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  documentosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  documentosTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 10,
  },
  documentosStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  documentosTexto: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  subirDocumentosButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  subirDocumentosTexto: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  accionesContainer: {
    marginBottom: 20,
  },
  accionPrimaria: {
    backgroundColor: '#27ae60',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  accionPrimariaTexto: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  accionesDisponibles: {
    gap: 10,
  },
  accionSecundaria: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  accionSecundariaTexto: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  ayudaContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  ayudaTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 10,
    marginBottom: 10,
  },
  ayudaTexto: {
    fontSize: 14,
    color: '#5d6d7e',
    textAlign: 'center',
    lineHeight: 20,
  },
}); 