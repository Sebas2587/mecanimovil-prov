import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { MotivoRechazo } from '@/services/solicitudesService';

interface RechazarSolicitudModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (motivo: MotivoRechazo, detalle: string) => Promise<void>;
  loading?: boolean;
}

interface MotivoOption {
  value: MotivoRechazo;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

const MOTIVOS_RECHAZO: MotivoOption[] = [
  { value: 'ocupado', label: 'No tengo disponibilidad en esas fechas', icon: 'event-busy' },
  { value: 'lejos', label: 'La ubicación está muy lejos', icon: 'location-off' },
  { value: 'no_servicio', label: 'No realizo ese tipo de servicio', icon: 'build-circle' },
  { value: 'no_marca', label: 'No trabajo con esa marca', icon: 'directions-car' },
  { value: 'precio', label: 'El precio esperado no es viable', icon: 'money-off' },
  { value: 'complejidad', label: 'El trabajo es muy complejo', icon: 'engineering' },
  { value: 'recursos', label: 'No tengo herramientas/repuestos', icon: 'inventory' },
  { value: 'otro', label: 'Otro motivo', icon: 'more-horiz' },
];

export const RechazarSolicitudModal: React.FC<RechazarSolicitudModalProps> = ({
  visible,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const [motivoSeleccionado, setMotivoSeleccionado] = useState<MotivoRechazo | ''>('');
  const [detalle, setDetalle] = useState('');

  const handleConfirm = async () => {
    if (!motivoSeleccionado) {
      Alert.alert('Error', 'Debes seleccionar un motivo');
      return;
    }
    
    await onConfirm(motivoSeleccionado as MotivoRechazo, detalle);
    
    // Resetear
    setMotivoSeleccionado('');
    setDetalle('');
  };

  const handleClose = () => {
    if (!loading) {
      setMotivoSeleccionado('');
      setDetalle('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Rechazar Solicitud</Text>
            <TouchableOpacity onPress={handleClose} disabled={loading}>
              <MaterialIcons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.subtitle}>
              Selecciona el motivo por el que no puedes atender esta solicitud
            </Text>

            {/* Motivos */}
            <View style={styles.motivosContainer}>
              {MOTIVOS_RECHAZO.map((motivo) => (
                <TouchableOpacity
                  key={motivo.value}
                  style={[
                    styles.motivoCard,
                    motivoSeleccionado === motivo.value && styles.motivoCardSelected
                  ]}
                  onPress={() => setMotivoSeleccionado(motivo.value)}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <View style={[
                    styles.radioButton,
                    motivoSeleccionado === motivo.value && styles.radioButtonSelected
                  ]}>
                    {motivoSeleccionado === motivo.value && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <MaterialIcons 
                    name={motivo.icon} 
                    size={24} 
                    color={motivoSeleccionado === motivo.value ? '#DC3545' : '#666'} 
                  />
                  <Text style={[
                    styles.motivoText,
                    motivoSeleccionado === motivo.value && styles.motivoTextSelected
                  ]}>
                    {motivo.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Detalle opcional */}
            {motivoSeleccionado && (
              <View style={styles.detalleContainer}>
                <Text style={styles.detalleLabel}>
                  Detalle adicional (opcional)
                </Text>
                <TextInput
                  style={styles.detalleInput}
                  placeholder="Puedes agregar más información..."
                  placeholderTextColor="#999"
                  value={detalle}
                  onChangeText={setDetalle}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  editable={!loading}
                />
                <Text style={styles.characterCount}>
                  {detalle.length}/500
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!motivoSeleccionado || loading) && styles.confirmButtonDisabled
              ]}
              onPress={handleConfirm}
              disabled={!motivoSeleccionado || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirmar Rechazo</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  motivosContainer: {
    gap: 12,
  },
  motivoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  motivoCardSelected: {
    borderColor: '#DC3545',
    backgroundColor: '#FFF5F5',
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#DC3545',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#DC3545',
  },
  motivoText: {
    flex: 1,
    fontSize: 15,
    color: '#000',
  },
  motivoTextSelected: {
    fontWeight: '600',
    color: '#DC3545',
  },
  detalleContainer: {
    marginTop: 20,
  },
  detalleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  detalleInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#000',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#DC3545',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCC',
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});

