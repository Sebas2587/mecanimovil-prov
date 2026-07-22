import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import {
  InstitutionalButton,
  InstitutionalTag,
  InstitutionalText,
} from '@/app/design-system/components';
import { InstitutionalModal } from '@/app/design-system/components/InstitutionalModal';
import { hostIconPlateStyle } from '@/app/design-system/styles/institutionalSemantic';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

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
    <InstitutionalModal
      visible={visible}
      onRequestClose={onClose}
      onClose={onClose}
      title={titulo}
      animationType="slide"
      footer={
        <View style={styles.footer}>
          <InstitutionalButton
            label="Ver mi plan"
            variant="primary"
            size="compact"
            onPress={irACreditos}
            style={styles.footerBtn}
          />
          <InstitutionalButton
            label="Cerrar"
            variant="outline"
            size="compact"
            onPress={onClose}
            style={styles.footerBtn}
          />
        </View>
      }
    >
      <View style={styles.body}>
        <View style={styles.introRow}>
          <View style={styles.iconPlate}>
            <InstitutionalIcon
              name="info-outline"
              size={18}
              color={I.accentYellow}
              strokeWidth={ICON_STROKE_WIDTH}
            />
          </View>
          <InstitutionalTag label="Plan" variant="warning" size="sm" />
        </View>
        <InstitutionalText role="body" color="body" style={styles.message}>
          {mensaje}
        </InstitutionalText>
        <InstitutionalText role="caption" color="muted" style={styles.hint}>
          Podés activar o cambiar tu suscripción desde Plan y créditos.
        </InstitutionalText>
      </View>
    </InstitutionalModal>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: SPACING.fixed.md,
  },
  introRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
  iconPlate: {
    ...hostIconPlateStyle,
    backgroundColor: COLORS.background.warning,
  },
  message: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 20,
  },
  hint: {
    lineHeight: 18,
  },
  footer: {
    gap: SPACING.fixed.sm,
    width: '100%',
  },
  footerBtn: {
    alignSelf: 'stretch',
    width: '100%',
  },
});
