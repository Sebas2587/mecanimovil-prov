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
import { catalogosAPI, Repuesto } from '@/services/serviciosApi';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS, SHADOWS } from '@/app/design-system/tokens';
import { institutionalCardStyles } from '@/app/design-system/styles/institutionalSemantic';

const I = COLORS.institutional;

interface SelectorRepuestosProps {
  visible: boolean;
  onClose: () => void;
  onSeleccionar: (repuesto: Repuesto) => void;
  repuestosExistentes: number[];
  servicioId?: number;
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

      if (servicioId) {
        datos = await catalogosAPI.obtenerRepuestosPorServicio(servicioId);
      } else {
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

  useEffect(() => {
    if (visible) {
      if (servicioId) {
        cargarRepuestos();
      } else if (busqueda.length > 2) {
        const timeoutId = setTimeout(() => {
          cargarRepuestos();
        }, 500);
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
            <InstitutionalIcon name="close" size={24} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <InstitutionalIcon name="search" size={20} color={I.body} strokeWidth={ICON_STROKE_WIDTH} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar repuesto..."
            placeholderTextColor={I.mutedSoft}
            value={busqueda}
            onChangeText={setBusqueda}
            onSubmitEditing={cargarRepuestos}
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <InstitutionalIcon name="clear" size={20} color={I.body} strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={I.primary} />
            <Text style={styles.loadingText}>Cargando repuestos...</Text>
          </View>
        ) : repuestosFiltrados.length === 0 ? (
          <View style={styles.emptyContainer}>
            <InstitutionalIcon name="inventory-2" size={64} color={I.mutedSoft} strokeWidth={ICON_STROKE_WIDTH} />
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
                <InstitutionalIcon name="add-circle" size={24} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
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
    backgroundColor: I.surfaceSoft,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: I.canvas,
    borderBottomWidth: 1,
    borderBottomColor: I.hairline,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: I.ink,
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
    backgroundColor: I.canvas,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: I.hairline,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: I.ink,
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
    color: I.body,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: I.muted,
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
    ...institutionalCardStyles.surface,
    ...institutionalCardStyles.surfacePadding,
    marginBottom: 12,
  },
  repuestoInfo: {
    flex: 1,
    marginRight: 12,
  },
  repuestoNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: I.ink,
    marginBottom: 4,
  },
  repuestoDescripcion: {
    fontSize: 13,
    color: I.body,
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
    color: I.muted,
  },
  repuestoPrecio: {
    fontSize: 14,
    fontWeight: '600',
    color: I.primary,
  },
});
