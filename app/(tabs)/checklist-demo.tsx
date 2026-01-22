import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ChecklistContainer } from '@/components/checklist';

export default function ChecklistDemoScreen() {
  const [showChecklist, setShowChecklist] = useState(false);
  const [selectedOrdenId, setSelectedOrdenId] = useState<number | null>(null);

  // Órdenes de ejemplo para probar
  const ordenesEjemplo = [
    {
      id: 1,
      cliente: 'Juan Pérez',
      vehiculo: 'Toyota Corolla 2020',
      servicio: 'Cambio de Embrague',
      estado: 'aceptada_por_proveedor',
    },
    {
      id: 2,
      cliente: 'María González',
      vehiculo: 'Honda Civic 2019',
      servicio: 'Revisión General',
      estado: 'checklist_en_progreso',
    },
    {
      id: 3,
      cliente: 'Carlos López',
      vehiculo: 'Ford Focus 2021',
      servicio: 'Cambio de Frenos',
      estado: 'checklist_completado',
    },
  ];

  const handleIniciarChecklist = (ordenId: number) => {
    setSelectedOrdenId(ordenId);
    setShowChecklist(true);
  };

  const handleChecklistComplete = () => {
    Alert.alert(
      'Checklist Completado',
      'El checklist ha sido finalizado exitosamente',
      [
        {
          text: 'OK',
          onPress: () => {
            setShowChecklist(false);
            setSelectedOrdenId(null);
          },
        },
      ]
    );
  };

  const handleChecklistCancel = () => {
    setShowChecklist(false);
    setSelectedOrdenId(null);
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'aceptada_por_proveedor':
        return '#007bff';
      case 'checklist_en_progreso':
        return '#ffc107';
      case 'checklist_completado':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };

  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'aceptada_por_proveedor':
        return 'Listo para checklist';
      case 'checklist_en_progreso':
        return 'Checklist en progreso';
      case 'checklist_completado':
        return 'Checklist completado';
      default:
        return estado;
    }
  };

  if (showChecklist && selectedOrdenId) {
    return (
      <ChecklistContainer
        ordenId={selectedOrdenId}
        onComplete={handleChecklistComplete}
        onCancel={handleChecklistCancel}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Demo de Checklist</Text>
        <Text style={styles.headerSubtitle}>
          Sistema de checklist de pre-servicio
        </Text>
      </View>

      {/* Información del sistema */}
      <View style={styles.infoContainer}>
        <View style={styles.infoHeader}>
          <MaterialIcons name="info" size={20} color="#2A4065" />
          <Text style={styles.infoTitle}>Acerca del Sistema</Text>
        </View>
        <Text style={styles.infoText}>
          El sistema de checklist de pre-servicio es obligatorio para todas las órdenes.
          Incluye captura de fotos, firmas digitales y ubicación GPS.
        </Text>
      </View>

      {/* Lista de órdenes */}
      <ScrollView style={styles.ordenesList}>
        <Text style={styles.sectionTitle}>Órdenes Disponibles</Text>
        
        {ordenesEjemplo.map((orden) => (
          <View key={orden.id} style={styles.ordenCard}>
            <View style={styles.ordenHeader}>
              <Text style={styles.ordenId}>Orden #{orden.id}</Text>
              <View style={[
                styles.estadoBadge,
                { backgroundColor: getEstadoColor(orden.estado) }
              ]}>
                <Text style={styles.estadoText}>
                  {getEstadoTexto(orden.estado)}
                </Text>
              </View>
            </View>
            
            <View style={styles.ordenInfo}>
              <View style={styles.ordenInfoRow}>
                <MaterialIcons name="person" size={16} color="#6c757d" />
                <Text style={styles.ordenInfoText}>{orden.cliente}</Text>
              </View>
              <View style={styles.ordenInfoRow}>
                <MaterialIcons name="directions-car" size={16} color="#6c757d" />
                <Text style={styles.ordenInfoText}>{orden.vehiculo}</Text>
              </View>
              <View style={styles.ordenInfoRow}>
                <MaterialIcons name="build" size={16} color="#6c757d" />
                <Text style={styles.ordenInfoText}>{orden.servicio}</Text>
              </View>
            </View>

            {orden.estado === 'aceptada_por_proveedor' && (
              <TouchableOpacity
                style={styles.iniciarButton}
                onPress={() => handleIniciarChecklist(orden.id)}
              >
                <MaterialIcons name="play-arrow" size={20} color="#fff" />
                <Text style={styles.iniciarButtonText}>Iniciar Checklist</Text>
              </TouchableOpacity>
            )}

            {orden.estado === 'checklist_en_progreso' && (
              <TouchableOpacity
                style={styles.continuarButton}
                onPress={() => handleIniciarChecklist(orden.id)}
              >
                <MaterialIcons name="play-arrow" size={20} color="#fff" />
                <Text style={styles.continuarButtonText}>Continuar Checklist</Text>
              </TouchableOpacity>
            )}

            {orden.estado === 'checklist_completado' && (
              <View style={styles.completadoIndicator}>
                <MaterialIcons name="check-circle" size={20} color="#28a745" />
                <Text style={styles.completadoText}>Checklist Completado</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Información adicional */}
      <View style={styles.footerInfo}>
        <Text style={styles.footerTitle}>Características del Sistema:</Text>
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <MaterialIcons name="offline-bolt" size={16} color="#28a745" />
            <Text style={styles.featureText}>Funciona offline</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="photo-camera" size={16} color="#28a745" />
            <Text style={styles.featureText}>Captura de fotos</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="edit" size={16} color="#28a745" />
            <Text style={styles.featureText}>Firmas digitales</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="location-on" size={16} color="#28a745" />
            <Text style={styles.featureText}>Ubicación GPS</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2A4065',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 4,
  },
  infoContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2A4065',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A4065',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  ordenesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },
  ordenCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ordenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ordenId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
  ordenInfo: {
    gap: 8,
    marginBottom: 16,
  },
  ordenInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ordenInfoText: {
    fontSize: 14,
    color: '#6c757d',
  },
  iniciarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  iniciarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  continuarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffc107',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  continuarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  completadoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  completadoText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#28a745',
  },
  footerInfo: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },
  featureList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: '45%',
  },
  featureText: {
    fontSize: 12,
    color: '#6c757d',
  },
}); 