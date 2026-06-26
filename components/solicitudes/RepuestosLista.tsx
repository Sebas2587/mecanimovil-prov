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
import { RepuestoDetallado, Repuesto } from '@/services/serviciosApi';
import { SelectorRepuestos } from './SelectorRepuestos';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS } from '@/app/design-system/tokens';
import {
  institutionalStatusColors,
  institutionalCardStyles,
} from '@/app/design-system/styles/institutionalSemantic';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';

const I = COLORS.institutional;
const primaryStatus = institutionalStatusColors('primary');
const errorStatus = institutionalStatusColors('error');

interface RepuestoEditable extends RepuestoDetallado {
  cantidad: number;
}

interface RepuestosListaProps {
  repuestos: RepuestoEditable[];
  onRepuestosChange: (repuestos: RepuestoEditable[]) => void;
  onAgregarRepuesto?: () => void;
  editable?: boolean;
  mostrarTotal?: boolean;
  servicioId?: number;
}

export const RepuestosLista: React.FC<RepuestosListaProps> = ({
  repuestos,
  onRepuestosChange,
  editable = true,
  mostrarTotal = true,
  servicioId,
}) => {
  const [repuestosList, setRepuestosList] = useState<RepuestoEditable[]>(repuestos);
  const [mostrarSelector, setMostrarSelector] = useState(false);

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
        { text: 'Cancelar', style: 'cancel' },
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
      const precio = repuesto.precio !== undefined && repuesto.precio !== null
        ? repuesto.precio
        : (repuesto.precio_referencia || 0);
      return total + cantidad * precio;
    }, 0);
  };

  const renderRepuesto = ({ item, index }: { item: RepuestoEditable; index: number }) => {
    const precioUnitario = item.precio !== undefined && item.precio !== null
      ? item.precio
      : (item.precio_referencia || 0);
    const subtotal = (item.cantidad || 0) * precioUnitario;

    return (
      <View style={styles.repuestoItem}>
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

          {editable && (
            <TouchableOpacity
              style={styles.eliminarButton}
              onPress={() => eliminarRepuesto(index)}
              activeOpacity={0.7}
            >
              <InstitutionalIcon name="close" size={18} color={errorStatus.icon} strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.repuestoControls}>
          <View style={styles.cantidadWrapper}>
            <Text style={styles.cantidadLabel}>Cant.</Text>
            {editable ? (
              <TextInput
                style={styles.cantidadInput}
                value={item.cantidad?.toString() || '0'}
                onChangeText={(text) => actualizarCantidad(index, text)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={I.mutedSoft}
              />
            ) : (
              <Text style={styles.cantidadValue}>{item.cantidad || 0}</Text>
            )}
          </View>

          <View style={styles.precioWrapper}>
            <Text style={styles.precioLabel}>Unit.</Text>
            <Text style={styles.precioValue}>
              ${precioUnitario.toLocaleString('es-CL')}
            </Text>
          </View>

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
        <InstitutionalSectionHeader title="Repuestos" level="h4" />
        {editable && (
          <TouchableOpacity
            style={styles.agregarButton}
            onPress={() => setMostrarSelector(true)}
            activeOpacity={0.7}
          >
            <InstitutionalIcon name="add-circle" size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
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
          <InstitutionalIcon name="inventory-2" size={48} color={I.mutedSoft} strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={styles.emptyText}>No hay repuestos agregados</Text>
          {editable && (
            <InstitutionalButton
              label="Agregar primer repuesto"
              variant="primary"
              size="compact"
              onPress={() => setMostrarSelector(true)}
            />
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
  agregarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: primaryStatus.bg,
  },
  agregarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: I.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: I.surfaceSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: I.hairline,
    borderStyle: 'dashed',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: I.muted,
  },
  repuestoItem: {
    flexDirection: 'column',
    backgroundColor: I.canvas,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: I.hairline,
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
    color: I.ink,
    marginBottom: 2,
  },
  repuestoMarca: {
    fontSize: 12,
    color: I.body,
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
    borderTopColor: I.hairlineSoft,
  },
  cantidadWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  cantidadLabel: {
    fontSize: 11,
    color: I.body,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  cantidadInput: {
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    color: I.ink,
    minWidth: 60,
    textAlign: 'center',
    backgroundColor: I.canvas,
  },
  cantidadValue: {
    fontSize: 14,
    fontWeight: '600',
    color: I.ink,
  },
  precioWrapper: {
    flex: 1.5,
    alignItems: 'center',
  },
  precioLabel: {
    fontSize: 11,
    color: I.body,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  precioValue: {
    fontSize: 13,
    fontWeight: '600',
    color: I.ink,
  },
  subtotalWrapper: {
    flex: 1.5,
    alignItems: 'flex-end',
  },
  subtotalLabel: {
    fontSize: 11,
    color: I.body,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  subtotalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: I.primary,
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
    backgroundColor: I.hairline,
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
    color: I.ink,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: I.primary,
  },
});
