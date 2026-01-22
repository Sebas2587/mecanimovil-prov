import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface FuelGaugeComponentProps {
  item: any;
  respuesta: any;
  onResponseChange: (response: any) => void;
  disabled?: boolean;
}

const FUEL_LEVELS = [
  { key: 'E', label: 'E (Vacío)', value: 0, color: '#dc3545', icon: 'battery-0-bar' },
  { key: '1/4', label: '1/4', value: 25, color: '#fd7e14', icon: 'battery-1-bar' },
  { key: '1/2', label: '1/2', value: 50, color: '#ffc107', icon: 'battery-3-bar' },
  { key: '3/4', label: '3/4', value: 75, color: '#28a745', icon: 'battery-5-bar' },
  { key: 'F', label: 'F (Lleno)', value: 100, color: '#007bff', icon: 'battery-full' },
];

export const FuelGaugeComponent: React.FC<FuelGaugeComponentProps> = ({
  item,
  respuesta,
  onResponseChange,
  disabled = false,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<string>('');

  useEffect(() => {
    if (respuesta?.respuesta_seleccion) {
      setSelectedLevel(respuesta.respuesta_seleccion);
    }
  }, [respuesta]);

  const handleLevelSelect = (level: string) => {
    if (disabled) return;

    setSelectedLevel(level);
    
    const fuelLevel = FUEL_LEVELS.find(f => f.key === level);
    
    onResponseChange({
      respuesta_seleccion: level,
      respuesta_texto: fuelLevel?.label || level,
      respuesta_numero: fuelLevel?.value || 0,
      completado: true,
    });
  };

  const selectedFuelLevel = FUEL_LEVELS.find(f => f.key === selectedLevel);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{item.pregunta_texto}</Text>
        {item.descripcion_ayuda && (
          <Text style={styles.description}>{item.descripcion_ayuda}</Text>
        )}
      </View>

      {/* Medidor visual simplificado */}
      <View style={styles.gaugeContainer}>
        <View style={styles.gaugeHeader}>
          <MaterialIcons name="local-gas-station" size={24} color="#495057" />
          <Text style={styles.gaugeTitle}>Nivel de Combustible</Text>
        </View>
        
        <View style={styles.gaugeBar}>
          {FUEL_LEVELS.map((level, index) => (
            <View
              key={level.key}
              style={[
                styles.gaugeSegment,
                index === 0 && styles.gaugeSegmentFirst,
                index === FUEL_LEVELS.length - 1 && styles.gaugeSegmentLast,
                {
                  backgroundColor: selectedLevel === level.key 
                    ? level.color 
                    : selectedFuelLevel && FUEL_LEVELS.findIndex(f => f.key === selectedFuelLevel.key) >= index
                      ? level.color
                      : '#e9ecef'
                }
              ]}
            >
              <Text style={[
                styles.gaugeSegmentText,
                {
                  color: selectedLevel === level.key || 
                         (selectedFuelLevel && FUEL_LEVELS.findIndex(f => f.key === selectedFuelLevel.key) >= index)
                    ? '#fff' 
                    : '#6c757d'
                }
              ]}>
                {level.key}
              </Text>
            </View>
          ))}
        </View>
        
        {/* Indicador de nivel seleccionado */}
        {selectedLevel && (
          <View style={styles.gaugeIndicator}>
            <MaterialIcons 
              name={selectedFuelLevel?.icon as any || 'battery-unknown'} 
              size={20} 
              color={selectedFuelLevel?.color || '#28a745'} 
            />
            <Text style={[
              styles.gaugeIndicatorText,
              { color: selectedFuelLevel?.color || '#28a745' }
            ]}>
              {selectedFuelLevel?.value || 0}%
            </Text>
          </View>
        )}
      </View>

      {/* Valor seleccionado */}
      {selectedLevel && (
        <View style={[
          styles.selectedValue,
          { backgroundColor: selectedFuelLevel?.color || '#28a745' }
        ]}>
          <MaterialIcons name="speed" size={16} color="#fff" />
          <Text style={styles.selectedValueText}>
            {selectedFuelLevel?.label || selectedLevel}
          </Text>
        </View>
      )}

      {/* Botones de selección */}
      <View style={styles.buttonsContainer}>
        {FUEL_LEVELS.map((level) => (
          <TouchableOpacity
            key={level.key}
            style={[
              styles.levelButton,
              selectedLevel === level.key && styles.levelButtonSelected,
              selectedLevel === level.key && { backgroundColor: level.color },
              disabled && styles.levelButtonDisabled,
            ]}
            onPress={() => handleLevelSelect(level.key)}
            disabled={disabled}
          >
            <MaterialIcons 
              name={level.icon as any} 
              size={20} 
              color={selectedLevel === level.key ? '#fff' : level.color} 
            />
            <Text style={[
              styles.levelButtonText,
              selectedLevel === level.key && styles.levelButtonTextSelected,
              disabled && styles.levelButtonTextDisabled,
            ]}>
              {level.label}
            </Text>
            <Text style={[
              styles.levelButtonValue,
              selectedLevel === level.key && styles.levelButtonValueSelected,
              disabled && styles.levelButtonTextDisabled,
            ]}>
              {level.value}%
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Información adicional */}
      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <MaterialIcons name="info" size={16} color="#6c757d" />
          <Text style={styles.infoText}>
            Selecciona el nivel según el medidor del tablero del vehículo
          </Text>
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
    marginBottom: 20,
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
  },
  gaugeContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  gaugeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  gaugeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  gaugeBar: {
    flexDirection: 'row',
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#dee2e6',
  },
  gaugeSegment: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#fff',
  },
  gaugeSegmentFirst: {
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  gaugeSegmentLast: {
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderRightWidth: 0,
  },
  gaugeSegmentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  gaugeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  gaugeIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedValue: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
    gap: 6,
  },
  selectedValueText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonsContainer: {
    gap: 8,
  },
  levelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: '#f8f9fa',
    gap: 12,
  },
  levelButtonSelected: {
    borderColor: 'transparent',
  },
  levelButtonDisabled: {
    opacity: 0.5,
  },
  levelButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  levelButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  levelButtonValue: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600',
  },
  levelButtonValueSelected: {
    color: '#fff',
  },
  levelButtonTextDisabled: {
    opacity: 0.5,
  },
  infoContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#6c757d',
    lineHeight: 18,
  },
}); 