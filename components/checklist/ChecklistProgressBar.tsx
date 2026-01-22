import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ChecklistItemTemplate } from '@/services/checklistService';

interface ChecklistProgressBarProps {
  currentStep: number;
  totalSteps: number;
  progreso: number;
  items: ChecklistItemTemplate[];
  completedItemIds?: number[]; // IDs de items completados
}

export const ChecklistProgressBar: React.FC<ChecklistProgressBarProps> = ({
  currentStep,
  totalSteps,
  progreso,
  items,
  completedItemIds = [],
}) => {
  return (
    <View style={styles.container}>
      {/* Progreso general - Minimalista */}
      <View style={styles.progressInfo}>
        <Text style={styles.progressText}>{Math.round(progreso)}% Completado</Text>
        <Text style={styles.stepText}>{currentStep}/{totalSteps}</Text>
      </View>
      
      {/* Barra de progreso - Minimalista */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View 
            style={[
              styles.progressBarFill,
              { width: `${progreso}%` }
            ]} 
          />
        </View>
      </View>
      
      {/* Indicadores de pasos */}
      <View style={styles.stepsContainer}>
        {items.map((item, index) => {
          const isCompleted = completedItemIds.includes(item.id) || progreso === 100;
          
          return (
            <View key={item.id} style={styles.stepIndicator}>
              <View 
                style={[
                  styles.stepCircle,
                  isCompleted && styles.stepCircleCompleted,
                  !isCompleted && styles.stepCircleNext,
                ]}
              >
                {isCompleted ? (
                  <MaterialIcons name="check" size={12} color="#fff" />
                ) : (
                  <Text style={styles.stepNumber}>
                    {index + 1}
                  </Text>
                )}
              </View>
              
              {item.es_obligatorio && (
                <View style={styles.requiredIndicator}>
                  <MaterialIcons name="star" size={8} color="#dc3545" />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

// Función auxiliar para obtener nombres de categorías más amigables
function getCategoryDisplayName(categoria: string): string {
  const categoryMap: Record<string, string> = {
    'DATOS_GENERALES': 'Datos Generales',
    'EXTERIOR_FOTOS': 'Fotos Exteriores',
    'INTERIOR_FOTOS': 'Fotos Interiores',
    'MOTOR_FOTOS': 'Fotos del Motor',
    'ACCESORIOS': 'Accesorios',
    'FLUIDOS': 'Fluidos',
    'ELECTRICIDAD': 'Sistema Eléctrico',
    'FRENOS': 'Frenos',
    'SUSPENSION': 'Suspensión',
    'TRANSMISION': 'Transmisión',
    'OBSERVACIONES': 'Observaciones',
    'FIRMA_INICIO': 'Firmas Iniciales',
    'FIRMA_FINALIZACION': 'Firmas Finales',
  };
  
  return categoryMap[categoria] || categoria;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  stepText: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: '500',
  },
  progressBarContainer: {
    marginBottom: 16,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#619FF0',
    borderRadius: 3,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepIndicator: {
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#dee2e6',
  },
  stepCircleCompleted: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  stepCircleCurrent: {
    backgroundColor: '#619FF0',
    borderColor: '#619FF0',
  },
  stepCircleNext: {
    backgroundColor: '#e9ecef',
    borderColor: '#dee2e6',
  },
  stepNumber: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6c757d',
  },
  stepNumberCurrent: {
    color: '#ffffff',
  },
  requiredIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 1,
  },
  categoryContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
}); 