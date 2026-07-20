import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import type { MotivoRechazo } from '@/services/solicitudesService';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS, SPACING, BORDERS, withOpacity } from '@/app/design-system/tokens';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalModal } from '@/design-system/components/InstitutionalModal';
import {
  institutionalCardStyles,
  institutionalStatusColors,
} from '@/app/design-system/styles/institutionalSemantic';

const I = COLORS.institutional;
const errorStatus = institutionalStatusColors('error');

interface RechazarSolicitudModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (motivo: MotivoRechazo, detalle: string) => Promise<void>;
  loading?: boolean;
}

interface MotivoOption {
  value: MotivoRechazo;
  label: string;
  icon: string;
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
    <InstitutionalModal
      visible={visible}
      onRequestClose={handleClose}
      onClose={handleClose}
      title="Rechazar solicitud"
      footer={
        <View style={styles.footer}>
          <InstitutionalButton
            label="Cancelar"
            variant="secondary"
            size="compact"
            onPress={handleClose}
            disabled={loading}
            style={styles.footerButton}
          />
          <InstitutionalButton
            label="Confirmar Rechazo"
            variant="primary"
            size="compact"
            onPress={handleConfirm}
            disabled={!motivoSeleccionado}
            loading={loading}
            style={[styles.footerButton, styles.confirmButton, { backgroundColor: I.semanticDown, borderColor: I.semanticDown }]}
          />
        </View>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        <InstitutionalText role="body" color="body" style={styles.subtitle}>
          Selecciona el motivo por el que no puedes atender esta solicitud
        </InstitutionalText>

        <View style={styles.motivosContainer}>
          {MOTIVOS_RECHAZO.map((motivo) => {
            const selected = motivoSeleccionado === motivo.value;
            return (
              <TouchableOpacity
                key={motivo.value}
                style={[
                  styles.motivoCard,
                  institutionalCardStyles.surface,
                  selected && {
                    borderColor: errorStatus.border,
                    backgroundColor: errorStatus.bg,
                  },
                ]}
                onPress={() => setMotivoSeleccionado(motivo.value)}
                activeOpacity={0.7}
                disabled={loading}
              >
                <View
                  style={[
                    styles.radioButton,
                    { borderColor: selected ? errorStatus.icon : I.hairline },
                  ]}
                >
                  {selected ? (
                    <View style={[styles.radioButtonInner, { backgroundColor: errorStatus.icon }]} />
                  ) : null}
                </View>
                <InstitutionalIcon
                  name={motivo.icon}
                  size={24}
                  color={selected ? errorStatus.icon : I.muted}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
                <InstitutionalText
                  role="body"
                  color={selected ? 'semanticDown' : 'ink'}
                  style={[styles.motivoText, selected && styles.motivoTextSelected]}
                >
                  {motivo.label}
                </InstitutionalText>
              </TouchableOpacity>
            );
          })}
        </View>

        {motivoSeleccionado ? (
          <View style={styles.detalleContainer}>
            <InstitutionalText role="body" style={styles.detalleLabel}>
              Detalle adicional (opcional)
            </InstitutionalText>
            <TextInput
              style={[
                styles.detalleInput,
                {
                  borderColor: I.hairline,
                  color: I.ink,
                },
              ]}
              placeholder="Puedes agregar más información..."
              placeholderTextColor={I.muted}
              value={detalle}
              onChangeText={setDetalle}
              multiline
              numberOfLines={4}
              maxLength={500}
              editable={!loading}
            />
            <InstitutionalText role="small" color="muted" style={styles.characterCount}>
              {detalle.length}/500
            </InstitutionalText>
          </View>
        ) : null}
      </ScrollView>
    </InstitutionalModal>
  );
};

const styles = StyleSheet.create({
  content: {
    maxHeight: 420,
  },
  subtitle: {
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  motivosContainer: {
    gap: SPACING.sm,
  },
  motivoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  motivoText: {
    flex: 1,
  },
  motivoTextSelected: {
    fontWeight: '600',
  },
  detalleContainer: {
    marginTop: SPACING.lg,
  },
  detalleLabel: {
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  detalleInput: {
    borderWidth: BORDERS.width.thin,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md - 2,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    marginTop: SPACING.xs + 2,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  footerButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 2,
  },
});
