import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';

type Props = {
  visible: boolean;
  fechaReferencia?: string;
  horaReferencia?: string | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (fecha: string, hora: string, motivo: string) => void;
};

export function ProponerFechaCatalogoModal({
  visible,
  fechaReferencia = '',
  horaReferencia = '',
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  const [fecha, setFecha] = useState(fechaReferencia);
  const [hora, setHora] = useState(horaReferencia ? String(horaReferencia).substring(0, 5) : '');
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (visible) {
      setFecha(fechaReferencia || '');
      setHora(horaReferencia ? String(horaReferencia).substring(0, 5) : '');
      setMotivo('');
    }
  }, [visible, fechaReferencia, horaReferencia]);

  const handleSubmit = () => {
    if (!fecha.trim()) return;
    onConfirm(fecha.trim(), hora.trim(), motivo.trim());
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>Proponer otra fecha</Text>
          <Text style={styles.subtitle}>
            El cliente deberá aceptar la fecha antes de que puedas confirmar la asignación.
          </Text>

          <Text style={styles.label}>Fecha (AAAA-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={fecha}
            onChangeText={setFecha}
            placeholder="2026-05-25"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Hora (HH:MM, opcional)</Text>
          <TextInput
            style={styles.input}
            value={hora}
            onChangeText={setHora}
            placeholder="10:30"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Motivo (opcional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={motivo}
            onChangeText={setMotivo}
            placeholder="Ej: agenda completa ese día"
            multiline
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, loading && styles.confirmDisabled]}
              onPress={handleSubmit}
              disabled={loading || !fecha.trim()}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.institutional.onPrimary} />
              ) : (
                <Text style={styles.confirmText}>Enviar propuesta</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: COLORS.institutional.surface,
    borderTopLeftRadius: BORDERS.radius.xl,
    borderTopRightRadius: BORDERS.radius.xl,
    padding: SPACING.fixed.lg,
    paddingBottom: SPACING.fixed.xl,
  },
  title: {
    fontSize: TYPOGRAPHY.styles.h3.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansBold,
    color: COLORS.institutional.ink,
    marginBottom: SPACING.fixed.xs,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.styles.body.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: COLORS.institutional.inkMuted,
    marginBottom: SPACING.fixed.md,
  },
  label: {
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    color: COLORS.institutional.ink,
    marginBottom: 4,
    marginTop: SPACING.fixed.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.institutional.border,
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 10,
    fontSize: TYPOGRAPHY.styles.body.fontSize,
    color: COLORS.institutional.ink,
    backgroundColor: COLORS.institutional.surfaceSoft,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
    marginTop: SPACING.fixed.lg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: BORDERS.radius.md,
    borderWidth: 1,
    borderColor: COLORS.institutional.border,
  },
  cancelText: {
    color: COLORS.institutional.ink,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.institutional.primary,
  },
  confirmDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    color: COLORS.institutional.onPrimary,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
  },
});
