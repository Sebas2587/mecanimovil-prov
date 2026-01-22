import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { catalogosAPI, Repuesto } from '@/services/serviciosApi';

interface SelectorRepuestosProps {
  visible: boolean;
  onClose: () => void;
  onSeleccionar: (repuesto: Repuesto) => void;
  repuestosExistentes: number[]; // IDs de repuestos ya agregados
  servicioId?: number; // ID del servicio para filtrar repuestos (solo para ofertas secundarias)
}

export const SelectorRepuestos: React.FC<SelectorRepuestosProps> = ({
  visible,
  onClose,
  onSeleccionar,
  repuestosExistentes,
  servicioId,
}) => {
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (visible) {
      cargarRepuestos();
    }
  }, [visible]);

  const cargarRepuestos = async () => {
    setLoading(true);
    try {
      let datos: Repuesto[];
      
      // Si hay servicioId, cargar repuestos específicos del servicio
      if (servicioId) {
        console.log(`🔩 Cargando repuestos para servicio ${servicioId}...`);
        datos = await catalogosAPI.obtenerRepuestosPorServicio(servicioId);
        console.log(`✅ Repuestos obtenidos para servicio: ${datos.length} repuestos`);
      } else {
        // Cargar todos los repuestos (comportamiento original)
        datos = await catalogosAPI.obtenerRepuestos(undefined, busqueda || undefined);
      }
      
      setRepuestos(datos);
    } catch (error) {
      console.error('Error cargando repuestos:', error);
      Alert.alert('Error', 'No se pudieron cargar los repuestos');
    } finally {
      setLoading(false);
    }
  };

  // Recargar cuando cambia la búsqueda o el servicioId
  useEffect(() => {
    if (visible) {
      if (servicioId) {
        // Si hay servicioId, recargar inmediatamente (no hay búsqueda para repuestos por servicio)
        cargarRepuestos();
      } else if (busqueda.length > 2) {
        // Solo buscar si no hay servicioId y hay búsqueda
        const timeoutId = setTimeout(() => {
          cargarRepuestos();
        }, 500); // Debounce de 500ms
        return () => clearTimeout(timeoutId);
      }
    }
  }, [busqueda, visible, servicioId]);

  const repuestosFiltrados = repuestos.filter(rep => {
    const coincideBusqueda = !busqueda || 
      rep.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (rep.descripcion && rep.descripcion.toLowerCase().includes(busqueda.toLowerCase()));
    
    const noEstaAgregado = !repuestosExistentes.includes(rep.id);
    
    return coincideBusqueda && noEstaAgregado;
  });

  const handleSeleccionar = (repuesto: Repuesto) => {
    onSeleccionar(repuesto);
    setBusqueda('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Seleccionar Repuesto</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar repuesto..."
            placeholderTextColor="#999"
            value={busqueda}
            onChangeText={setBusqueda}
            onSubmitEditing={cargarRepuestos}
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <MaterialIcons name="clear" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0061FF" />
            <Text style={styles.loadingText}>Cargando repuestos...</Text>
          </View>
        ) : repuestosFiltrados.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inventory-2" size={64} color="#CCC" />
            <Text style={styles.emptyText}>
              {busqueda ? 'No se encontraron repuestos' : 'No hay repuestos disponibles'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={repuestosFiltrados}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.repuestoItem}
                onPress={() => handleSeleccionar(item)}
                activeOpacity={0.7}
              >
                <View style={styles.repuestoInfo}>
                  <Text style={styles.repuestoNombre}>{item.nombre}</Text>
                  {item.descripcion && (
                    <Text style={styles.repuestoDescripcion} numberOfLines={2}>
                      {item.descripcion}
                    </Text>
                  )}
                  <View style={styles.repuestoMeta}>
                    {item.marca && (
                      <Text style={styles.repuestoMarca}>Marca: {item.marca}</Text>
                    )}
                    <Text style={styles.repuestoPrecio}>
                      ${(item.precio_referencia || 0).toLocaleString('es-CL')}
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="add-circle" size={24} color="#0061FF" />
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  repuestoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  repuestoInfo: {
    flex: 1,
    marginRight: 12,
  },
  repuestoNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  repuestoDescripcion: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  repuestoMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  repuestoMarca: {
    fontSize: 12,
    color: '#999',
  },
  repuestoPrecio: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0061FF',
  },
});

