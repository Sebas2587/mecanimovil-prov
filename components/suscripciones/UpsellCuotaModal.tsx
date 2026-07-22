import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { InstitutionalButton } from '@/app/design-system/components';

const I = COLORS.institutional;

export interface UpsellCuotaModalProps {
  visible: boolean;
  titulo?: string;
  mensaje: string;
  onClose: () => void;
  /** Tab destino en /creditos */
  tabDestino?: 'suscripcion' | 'tienda';
}

export function UpsellCuotaModal({
  visible,
  titulo = 'Límite del plan alcanzado',
  mensaje,
  onClose,
  tabDestino = 'suscripcion',
}: UpsellCuotaModalProps) {
  const irACreditos = () => {
    onClose();
    router.push({ pathname: '/creditos', params: { tab: tabDestino } });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{titulo}</Text>
          <Text style={styles.message}>{mensaje}</Text>
          <View style={styles.actions}>
            <InstitutionalButton label="Ver mi plan" variant="primary" onPress={irACreditos} />
            <InstitutionalButton label="Cerrar" variant="secondary" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: I.surface,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
  },
  title: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: I.ink,
  },
  message: {
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.body,
    lineHeight: 20,
  },
  actions: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
});
