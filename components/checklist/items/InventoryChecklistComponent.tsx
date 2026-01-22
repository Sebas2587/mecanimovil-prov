import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface InventoryChecklistComponentProps {
  item: any;
  respuesta: any;
  onResponseChange: (response: any) => void;
  disabled?: boolean;
}

interface InventoryItem {
  name: string;
  checked: boolean;
  condition?: 'BUENO' | 'REGULAR' | 'MALO' | 'FALTANTE';
  notes?: string;
}

export const InventoryChecklistComponent: React.FC<InventoryChecklistComponentProps> = ({
  item,
  respuesta,
  onResponseChange,
  disabled = false,
}) => {
  const [inventoryState, setInventoryState] = useState<InventoryItem[]>([]);

  useEffect(() => {
    initializeInventory();
  }, [item, respuesta]);

  const initializeInventory = () => {
    const opciones = item.opciones_seleccion || [];
    let initialState: InventoryItem[] = [];

    if (respuesta?.respuesta_seleccion) {
      // Cargar estado existente
      const savedState = respuesta.respuesta_seleccion;
      initialState = opciones.map((opcion: string) => {
        const saved = savedState.find((s: any) => s.name === opcion);
        return saved || {
          name: opcion,
          checked: false,
          condition: 'BUENO',
          notes: ''
        };
      });
    } else {
      // Estado inicial
      initialState = opciones.map((opcion: string) => ({
        name: opcion,
        checked: false,
        condition: 'BUENO' as const,
        notes: ''
      }));
    }

    setInventoryState(initialState);
  };

  const updateInventoryItem = (index: number, updates: Partial<InventoryItem>) => {
    if (disabled) return;

    const newState = [...inventoryState];
    newState[index] = { ...newState[index], ...updates };
    setInventoryState(newState);

    // Calcular si está completado
    const checkedItems = newState.filter(item => item.checked);
    const isCompleted = checkedItems.length > 0;

    // Generar resumen textual
    const summary = generateInventorySummary(newState);

    // Actualizar respuesta
    onResponseChange({
      respuesta_seleccion: newState,
      respuesta_texto: summary,
      completado: isCompleted,
    });
  };

  const generateInventorySummary = (state: InventoryItem[]): string => {
    const checkedItems = state.filter(item => item.checked);
    const faltantes = state.filter(item => !item.checked);
    
    let summary = '';
    
    if (checkedItems.length > 0) {
      summary += `Presentes: ${checkedItems.map(item => {
        let itemText = item.name;
        if (item.condition && item.condition !== 'BUENO') {
          itemText += ` (${item.condition})`;
        }
        return itemText;
      }).join(', ')}`;
    }
    
    if (faltantes.length > 0) {
      if (summary) summary += ' | ';
      summary += `Faltantes: ${faltantes.map(item => item.name).join(', ')}`;
    }
    
    return summary || 'Inventario sin completar';
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'BUENO': return '#28a745';
      case 'REGULAR': return '#ffc107';
      case 'MALO': return '#dc3545';
      case 'FALTANTE': return '#6c757d';
      default: return '#28a745';
    }
  };

  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case 'BUENO': return 'check-circle';
      case 'REGULAR': return 'warning';
      case 'MALO': return 'error';
      case 'FALTANTE': return 'remove-circle';
      default: return 'check-circle';
    }
  };

  const toggleCondition = (index: number) => {
    if (disabled) return;

    const conditions = ['BUENO', 'REGULAR', 'MALO', 'FALTANTE'];
    const currentCondition = inventoryState[index].condition || 'BUENO';
    const currentIndex = conditions.indexOf(currentCondition);
    const nextIndex = (currentIndex + 1) % conditions.length;
    const nextCondition = conditions[nextIndex] as InventoryItem['condition'];

    updateInventoryItem(index, { condition: nextCondition });
  };

  const renderInventoryItem = (inventoryItem: InventoryItem, index: number) => {
    return (
      <View key={index} style={styles.inventoryItem}>
        <TouchableOpacity
          style={[
            styles.inventoryCheckbox,
            inventoryItem.checked && styles.inventoryCheckboxChecked,
            disabled && styles.inventoryCheckboxDisabled,
          ]}
          onPress={() => updateInventoryItem(index, { checked: !inventoryItem.checked })}
          disabled={disabled}
        >
          {inventoryItem.checked && (
            <MaterialIcons name="check" size={16} color="#fff" />
          )}
        </TouchableOpacity>

        <View style={styles.inventoryContent}>
          <Text style={[
            styles.inventoryName,
            !inventoryItem.checked && styles.inventoryNameUnchecked,
            disabled && styles.inventoryNameDisabled,
          ]}>
            {inventoryItem.name}
          </Text>
          
          {inventoryItem.checked && (
            <TouchableOpacity
              style={[
                styles.conditionButton,
                { backgroundColor: getConditionColor(inventoryItem.condition || 'BUENO') },
                disabled && styles.conditionButtonDisabled,
              ]}
              onPress={() => toggleCondition(index)}
              disabled={disabled}
            >
              <MaterialIcons 
                name={getConditionIcon(inventoryItem.condition || 'BUENO') as any} 
                size={12} 
                color="#fff" 
              />
              <Text style={styles.conditionText}>
                {inventoryItem.condition || 'BUENO'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const checkedCount = inventoryState.filter(item => item.checked).length;
  const totalCount = inventoryState.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{item.pregunta_texto}</Text>
        {item.descripcion_ayuda && (
          <Text style={styles.description}>{item.descripcion_ayuda}</Text>
        )}
        <View style={styles.progress}>
          <Text style={styles.progressText}>
            {checkedCount} de {totalCount} elementos verificados
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }
              ]} 
            />
          </View>
        </View>
      </View>

      <ScrollView style={styles.inventoryList} showsVerticalScrollIndicator={false}>
        {inventoryState.map((inventoryItem, index) => 
          renderInventoryItem(inventoryItem, index)
        )}
      </ScrollView>

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Estados:</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <MaterialIcons name="check-circle" size={16} color="#28a745" />
            <Text style={styles.legendText}>Bueno</Text>
          </View>
          <View style={styles.legendItem}>
            <MaterialIcons name="warning" size={16} color="#ffc107" />
            <Text style={styles.legendText}>Regular</Text>
          </View>
          <View style={styles.legendItem}>
            <MaterialIcons name="error" size={16} color="#dc3545" />
            <Text style={styles.legendText}>Malo</Text>
          </View>
          <View style={styles.legendItem}>
            <MaterialIcons name="remove-circle" size={16} color="#6c757d" />
            <Text style={styles.legendText}>Faltante</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A4065',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 12,
  },
  progress: {
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
    color: '#495057',
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: 2,
  },
  inventoryList: {
    maxHeight: 300,
  },
  inventoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  inventoryCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#dee2e6',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inventoryCheckboxChecked: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  inventoryCheckboxDisabled: {
    opacity: 0.5,
  },
  inventoryContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inventoryName: {
    fontSize: 14,
    color: '#212529',
    flex: 1,
  },
  inventoryNameUnchecked: {
    color: '#6c757d',
  },
  inventoryNameDisabled: {
    opacity: 0.5,
  },
  conditionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  conditionButtonDisabled: {
    opacity: 0.5,
  },
  conditionText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  legend: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#6c757d',
  },
}); 