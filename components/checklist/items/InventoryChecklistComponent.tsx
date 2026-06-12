import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

interface InventoryChecklistComponentProps {
  item: { opciones_seleccion?: string[] };
  respuesta: { respuesta_seleccion?: InventoryItem[] } | null;
  onResponseChange: (response: Record<string, unknown>) => void;
  disabled?: boolean;
}

interface InventoryItem {
  name: string;
  checked: boolean;
  condition?: 'BUENO' | 'REGULAR' | 'MALO' | 'FALTANTE';
  notes?: string;
}

const CONDITION_COLORS: Record<string, string> = {
  BUENO: I.semanticUp,
  REGULAR: I.accentYellow,
  MALO: I.semanticDown,
  FALTANTE: I.muted,
};

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
      const savedState = respuesta.respuesta_seleccion;
      initialState = opciones.map((opcion: string) => {
        const saved = savedState.find((s) => s.name === opcion);
        return (
          saved || {
            name: opcion,
            checked: false,
            condition: 'BUENO' as const,
            notes: '',
          }
        );
      });
    } else {
      initialState = opciones.map((opcion: string) => ({
        name: opcion,
        checked: false,
        condition: 'BUENO' as const,
        notes: '',
      }));
    }

    setInventoryState(initialState);
  };

  const generateInventorySummary = (state: InventoryItem[]): string => {
    const checkedItems = state.filter((entry) => entry.checked);
    const faltantes = state.filter((entry) => !entry.checked);

    let summary = '';

    if (checkedItems.length > 0) {
      summary += `Presentes: ${checkedItems
        .map((entry) => {
          let itemText = entry.name;
          if (entry.condition && entry.condition !== 'BUENO') {
            itemText += ` (${entry.condition})`;
          }
          return itemText;
        })
        .join(', ')}`;
    }

    if (faltantes.length > 0) {
      if (summary) summary += ' | ';
      summary += `Faltantes: ${faltantes.map((entry) => entry.name).join(', ')}`;
    }

    return summary || 'Inventario sin completar';
  };

  const updateInventoryItem = (index: number, updates: Partial<InventoryItem>) => {
    if (disabled) return;

    const newState = [...inventoryState];
    newState[index] = { ...newState[index], ...updates };
    setInventoryState(newState);

    const checkedItems = newState.filter((entry) => entry.checked);
    const isCompleted = checkedItems.length > 0;

    onResponseChange({
      respuesta_seleccion: newState,
      respuesta_texto: generateInventorySummary(newState),
      completado: isCompleted,
    });
  };

  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case 'BUENO':
        return 'check-circle';
      case 'REGULAR':
        return 'warning';
      case 'MALO':
        return 'error';
      case 'FALTANTE':
        return 'remove-circle';
      default:
        return 'check-circle';
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

  const checkedCount = inventoryState.filter((entry) => entry.checked).length;
  const totalCount = inventoryState.length;

  return (
    <View style={styles.container}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>
          {checkedCount} de {totalCount} verificados
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` },
            ]}
          />
        </View>
      </View>

      <ScrollView style={styles.inventoryList} showsVerticalScrollIndicator={false}>
        {inventoryState.map((inventoryItem, index) => (
          <View key={inventoryItem.name} style={styles.inventoryItem}>
            <TouchableOpacity
              style={[
                styles.inventoryCheckbox,
                inventoryItem.checked && styles.inventoryCheckboxChecked,
                disabled && styles.inventoryCheckboxDisabled,
              ]}
              onPress={() => updateInventoryItem(index, { checked: !inventoryItem.checked })}
              disabled={disabled}
            >
              {inventoryItem.checked ? (
                <InstitutionalIcon name="check" size={14} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
              ) : null}
            </TouchableOpacity>

            <View style={styles.inventoryContent}>
              <Text
                style={[
                  styles.inventoryName,
                  !inventoryItem.checked && styles.inventoryNameUnchecked,
                  disabled && styles.inventoryNameDisabled,
                ]}
              >
                {inventoryItem.name}
              </Text>

              {inventoryItem.checked ? (
                <TouchableOpacity
                  style={[
                    styles.conditionButton,
                    {
                      backgroundColor:
                        CONDITION_COLORS[inventoryItem.condition || 'BUENO'] || I.semanticUp,
                    },
                    disabled && styles.conditionButtonDisabled,
                  ]}
                  onPress={() => toggleCondition(index)}
                  disabled={disabled}
                >
                  <InstitutionalIcon
                    name={getConditionIcon(inventoryItem.condition || 'BUENO') as 'check-circle'}
                    size={12}
                    color={I.onPrimary}
                    strokeWidth={ICON_STROKE_WIDTH}
                  />
                  <Text style={styles.conditionText}>{inventoryItem.condition || 'BUENO'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.legend}>
        {(['BUENO', 'REGULAR', 'MALO', 'FALTANTE'] as const).map((state) => (
          <View key={state} style={styles.legendItem}>
            <InstitutionalIcon
              name={getConditionIcon(state) as 'check-circle'}
              size={14}
              color={CONDITION_COLORS[state]}
              strokeWidth={ICON_STROKE_WIDTH}
            />
            <Text style={styles.legendText}>{state.charAt(0) + state.slice(1).toLowerCase()}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.fixed.sm,
  },
  progressHeader: {
    gap: SPACING.fixed.xxs,
  },
  progressText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.muted,
  },
  progressBar: {
    height: 3,
    backgroundColor: I.hairlineSoft,
    borderRadius: BORDERS.radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: I.semanticUp,
    borderRadius: BORDERS.radius.pill,
  },
  inventoryList: {
    maxHeight: 280,
  },
  inventoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.fixed.xs,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: I.hairlineSoft,
  },
  inventoryCheckbox: {
    width: 22,
    height: 22,
    borderRadius: BORDERS.radius.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    marginRight: SPACING.fixed.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.canvas,
  },
  inventoryCheckboxChecked: {
    backgroundColor: I.semanticUp,
    borderColor: I.semanticUp,
  },
  inventoryCheckboxDisabled: {
    opacity: 0.5,
  },
  inventoryContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.xs,
  },
  inventoryName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.ink,
    flex: 1,
  },
  inventoryNameUnchecked: {
    color: I.muted,
  },
  inventoryNameDisabled: {
    opacity: 0.5,
  },
  conditionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.fixed.xs,
    paddingVertical: 3,
    borderRadius: BORDERS.radius.pill,
    gap: 4,
  },
  conditionButtonDisabled: {
    opacity: 0.5,
  },
  conditionText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    color: I.onPrimary,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.xs,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairlineSoft,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
});
