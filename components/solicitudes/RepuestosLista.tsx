import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { RepuestoDetallado, Repuesto } from '@/services/serviciosApi';
import { SelectorRepuestos } from './SelectorRepuestos';

interface RepuestoEditable extends RepuestoDetallado {
  cantidad: number;
}

interface RepuestosListaProps {
  repuestos: RepuestoEditable[];
  onRepuestosChange: (repuestos: RepuestoEditable[]) => void;
  onAgregarRepuesto?: () => void;
  editable?: boolean;
  mostrarTotal?: boolean;
  servicioId?: number; // ID del servicio para filtrar repuestos (solo para ofertas secundarias)
}

export const RepuestosLista: React.FC<RepuestosListaProps> = ({
  repuestos,
  onRepuestosChange,
  onAgregarRepuesto,
  editable = true,
  mostrarTotal = true,
  servicioId,
}) => {
  const [repuestosList, setRepuestosList] = useState<RepuestoEditable[]>(repuestos);
  const [mostrarSelector, setMostrarSelector] = useState(false);

  // Sincronizar con prop cuando cambia
  React.useEffect(() => {
    setRepuestosList(repuestos);
  }, [repuestos]);

  const handleAgregarRepuesto = (repuesto: Repuesto) => {
    const nuevoRepuesto: RepuestoEditable = {
      ...repuesto,
      cantidad: 1,
      cantidad_estimada: 1,
      es_opcional: false,
    };
    
    // Agregar al final de la lista (los repuestos configurados vienen primero)
    const nuevosRepuestos = [...repuestosList, nuevoRepuesto];
    setRepuestosList(nuevosRepuestos);
    onRepuestosChange(nuevosRepuestos);
    setMostrarSelector(false);
  };

  const repuestosIdsExistentes = repuestosList.map(r => r.id);

  const actualizarCantidad = (index: number, cantidad: string) => {
    const nuevaCantidad = parseInt(cantidad) || 0;
    
    if (nuevaCantidad < 0) {
      Alert.alert('Error', 'La cantidad no puede ser negativa');
      return;
    }

    const nuevosRepuestos = [...repuestosList];
    nuevosRepuestos[index] = {
      ...nuevosRepuestos[index],
      cantidad: nuevaCantidad,
    };
    
    setRepuestosList(nuevosRepuestos);
    onRepuestosChange(nuevosRepuestos);
  };

  const eliminarRepuesto = (index: number) => {
    Alert.alert(
      'Eliminar repuesto',
      `¿Estás seguro de que deseas eliminar ${repuestosList[index].nombre}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const nuevosRepuestos = repuestosList.filter((_, i) => i !== index);
            setRepuestosList(nuevosRepuestos);
            onRepuestosChange(nuevosRepuestos);
          },
        },
      ]
    );
  };

  const calcularTotalRepuestos = (): number => {
    return repuestosList.reduce((total, repuesto) => {
      const cantidad = repuesto.cantidad || 0;
      // CORRECCIÓN: Usar precio personalizado del proveedor si existe, sino usar precio_referencia del catálogo
      const precio = repuesto.precio !== undefined && repuesto.precio !== null ? repuesto.precio : (repuesto.precio_referencia || 0);
      return total + cantidad * precio;
    }, 0);
  };

  const renderRepuesto = ({ item, index }: { item: RepuestoEditable; index: number }) => {
    // CORRECCIÓN: Usar precio personalizado del proveedor si existe, sino usar precio_referencia del catálogo
    const precioUnitario = item.precio !== undefined && item.precio !== null ? item.precio : (item.precio_referencia || 0);
    const subtotal = (item.cantidad || 0) * precioUnitario;

    return (
      <View style={styles.repuestoItem}>
        {/* Información principal del repuesto */}
        <View style={styles.repuestoMainInfo}>
          <View style={styles.repuestoInfo}>
            <Text style={styles.repuestoNombre} numberOfLines={1}>
              {item.nombre}
            </Text>
            {item.marca && (
              <Text style={styles.repuestoMarca} numberOfLines={1}>
                {item.marca}
              </Text>
            )}
          </View>
          
          {/* Botón eliminar */}
          {editable && (
            <TouchableOpacity
              style={styles.eliminarButton}
              onPress={() => eliminarRepuesto(index)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={18} color="#DC3545" />
            </TouchableOpacity>
          )}
        </View>

        {/* Controles y precios en una fila */}
        <View style={styles.repuestoControls}>
          {/* Cantidad */}
          <View style={styles.cantidadWrapper}>
            <Text style={styles.cantidadLabel}>Cant.</Text>
            {editable ? (
              <TextInput
                style={styles.cantidadInput}
                value={item.cantidad?.toString() || '0'}
                onChangeText={(text) => actualizarCantidad(index, text)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.cantidadValue}>{item.cantidad || 0}</Text>
            )}
          </View>

          {/* Precio unitario */}
          <View style={styles.precioWrapper}>
            <Text style={styles.precioLabel}>Unit.</Text>
            <Text style={styles.precioValue}>
              ${precioUnitario.toLocaleString('es-CL')}
            </Text>
          </View>

          {/* Subtotal */}
          <View style={styles.subtotalWrapper}>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
            <Text style={styles.subtotalValue}>
              ${subtotal.toLocaleString('es-CL')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Repuestos</Text>
        {editable && (
          <TouchableOpacity
            style={styles.agregarButton}
            onPress={() => setMostrarSelector(true)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="add-circle" size={20} color="#0061FF" />
            <Text style={styles.agregarButtonText}>Agregar</Text>
          </TouchableOpacity>
        )}
      </View>

      <SelectorRepuestos
        visible={mostrarSelector}
        onClose={() => setMostrarSelector(false)}
        onSeleccionar={handleAgregarRepuesto}
        repuestosExistentes={repuestosIdsExistentes}
        servicioId={servicioId}
      />

      {repuestosList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="inventory-2" size={48} color="#CCC" />
          <Text style={styles.emptyText}>No hay repuestos agregados</Text>
          {editable && (
            <TouchableOpacity
              style={styles.agregarEmptyButton}
              onPress={() => setMostrarSelector(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.agregarEmptyButtonText}>Agregar primer repuesto</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <FlatList
            data={repuestosList}
            renderItem={renderRepuesto}
            keyExtractor={(item, index) => `repuesto-${item.id}-${index}`}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />

          {mostrarTotal && repuestosList.length > 0 && (
            <View style={styles.totalContainer}>
              <View style={styles.totalDivider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Repuestos:</Text>
                <Text style={styles.totalValue}>
                  ${calcularTotalRepuestos().toLocaleString('es-CL')}
                </Text>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  agregarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0F7FF',
  },
  agregarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0061FF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
    marginBottom: 16,
  },
  agregarEmptyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0061FF',
  },
  agregarEmptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  repuestoItem: {
    flexDirection: 'column',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 6,
  },
  repuestoMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  repuestoInfo: {
    flex: 1,
    marginRight: 8,
  },
  repuestoNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  repuestoMarca: {
    fontSize: 12,
    color: '#666',
  },
  eliminarButton: {
    padding: 4,
    marginLeft: 8,
  },
  repuestoControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  cantidadWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  cantidadLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  cantidadInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    color: '#000',
    minWidth: 60,
    textAlign: 'center',
    backgroundColor: '#FFF',
  },
  cantidadValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  precioWrapper: {
    flex: 1.5,
    alignItems: 'center',
  },
  precioLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  precioValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  subtotalWrapper: {
    flex: 1.5,
    alignItems: 'flex-end',
  },
  subtotalLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  subtotalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0061FF',
  },
  separator: {
    height: 0,
  },
  totalContainer: {
    marginTop: 12,
    paddingTop: 12,
  },
  totalDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0061FF',
  },
});

