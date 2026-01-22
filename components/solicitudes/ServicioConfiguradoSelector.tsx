import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ServicioConfiguradoParaOferta } from '@/services/serviciosApi';

interface ServicioConfiguradoSelectorProps {
  servicioConfigurado: ServicioConfiguradoParaOferta | null;
  loading?: boolean;
  onUsarServicioConfigurado: () => void;
  onCrearManual: () => void;
  usandoServicioConfigurado: boolean;
}

export const ServicioConfiguradoSelector: React.FC<ServicioConfiguradoSelectorProps> = ({
  servicioConfigurado,
  loading = false,
  onUsarServicioConfigurado,
  onCrearManual,
  usandoServicioConfigurado,
}) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#0061FF" />
        <Text style={styles.loadingText}>Buscando servicio configurado...</Text>
      </View>
    );
  }

  if (!servicioConfigurado) {
    return (
      <View style={styles.infoCard}>
        <MaterialIcons name="info-outline" size={20} color="#666" />
        <Text style={styles.infoText}>
          No tienes un servicio configurado para esta marca. Puedes crear la oferta manualmente.
        </Text>
      </View>
    );
  }

  if (usandoServicioConfigurado) {
    return (
      <View style={styles.activoCard}>
        <View style={styles.activoHeader}>
          <MaterialIcons name="check-circle" size={20} color="#10B981" />
          <Text style={styles.activoTitle}>Usando servicio configurado</Text>
        </View>
        <Text style={styles.activoSubtitle}>
          {servicioConfigurado.servicio_info.nombre}
          {servicioConfigurado.marca_vehiculo_info && (
            <> - {servicioConfigurado.marca_vehiculo_info.nombre}</>
          )}
        </Text>
        <TouchableOpacity
          style={styles.cambiarButton}
          onPress={onCrearManual}
          activeOpacity={0.7}
        >
          <Text style={styles.cambiarButtonText}>Cambiar a modo manual</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialIcons name="auto-fix-high" size={24} color="#0061FF" />
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>Servicio configurado disponible</Text>
          <Text style={styles.cardSubtitle}>
            Usa tu configuración guardada para crear la oferta rápidamente
          </Text>
        </View>
      </View>

      <View style={styles.servicioInfo}>
        <Text style={styles.servicioNombre}>
          {servicioConfigurado.servicio_info.nombre}
        </Text>
        {servicioConfigurado.marca_vehiculo_info && (
          <View style={styles.marcaInfo}>
            <MaterialIcons name="directions-car" size={16} color="#666" />
            <Text style={styles.marcaText}>
              {servicioConfigurado.marca_vehiculo_info.nombre}
            </Text>
          </View>
        )}
        <View style={styles.detallesRow}>
          <View style={styles.detalleItem}>
            <MaterialIcons name="build" size={16} color="#666" />
            <Text style={styles.detalleText}>
              {servicioConfigurado.tipo_servicio === 'con_repuestos'
                ? 'Con repuestos'
                : 'Solo mano de obra'}
            </Text>
          </View>
          {servicioConfigurado.repuestos_info_detallado &&
            servicioConfigurado.repuestos_info_detallado.length > 0 && (
              <View style={styles.detalleItem}>
                <MaterialIcons name="inventory-2" size={16} color="#666" />
                <Text style={styles.detalleText}>
                  {servicioConfigurado.repuestos_info_detallado.length} repuesto(s)
                </Text>
              </View>
            )}
        </View>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.usarButton}
          onPress={onUsarServicioConfigurado}
          activeOpacity={0.8}
        >
          <MaterialIcons name="auto-fix-high" size={20} color="#FFF" />
          <Text style={styles.usarButtonText}>Usar servicio configurado</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.manualButton}
          onPress={onCrearManual}
          activeOpacity={0.7}
        >
          <Text style={styles.manualButtonText}>Crear manualmente</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#0061FF',
    shadowColor: '#0061FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  servicioInfo: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  servicioNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  marcaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  marcaText: {
    fontSize: 13,
    color: '#666',
  },
  detallesRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  detalleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detalleText: {
    fontSize: 13,
    color: '#666',
  },
  buttonsContainer: {
    gap: 12,
  },
  usarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#0061FF',
  },
  usarButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  manualButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  manualButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activoCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  activoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  activoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981',
  },
  activoSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    marginLeft: 28,
  },
  cambiarButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  cambiarButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
});

