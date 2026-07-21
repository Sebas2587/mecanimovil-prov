import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Card } from '@/app/design-system/components';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { hostIconPlateColor, hostIconPlateStyle } from '@/app/design-system/styles/institutionalSemantic';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS, SPACING, BORDERS, withOpacity } from '@/app/design-system/tokens';

type Props = {
  visible: boolean;
  loading?: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

/**
 * Consentimiento previo a GPS (checklist / domicilio). Airbnb Host card + CTA Tinder.
 */
export default function LocationConsentModal({
  visible,
  loading = false,
  onAccept,
  onDecline,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline}>
      <View style={styles.overlay}>
        <Card elevated padding={0} style={styles.card}>
          <View style={styles.iconPlate}>
            <MapPin size={22} color={hostIconPlateColor} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
          <InstitutionalText role="h4" style={styles.title}>
            Uso de ubicación
          </InstitutionalText>
          <InstitutionalText role="body" color="body" style={styles.body}>
            MecaniMóvil necesita tu ubicación para registrar el cierre de servicios a domicilio,
            actualizar la dirección del taller o asociar fotos del checklist al lugar del trabajo.
            {'\n\n'}
            No usamos GPS para marketing. Puedes revocar el permiso en los ajustes del dispositivo.
          </InstitutionalText>
          <InstitutionalButton
            label="Permitir ubicación"
            variant="primary"
            onPress={onAccept}
            loading={loading}
            disabled={loading}
            style={styles.btn}
          />
          <InstitutionalButton
            label="Ahora no"
            variant="outline"
            onPress={onDecline}
            disabled={loading}
            style={styles.btn}
          />
        </Card>
      </View>
    </Modal>
  );
}

const C = COLORS;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: withOpacity(C.institutional.ink, 0.45),
    justifyContent: 'center',
    padding: SPACING.fixed.lg,
  },
  card: {
    padding: SPACING.fixed.lg,
    gap: SPACING.fixed.sm,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    borderRadius: BORDERS.radius.xl,
  },
  iconPlate: {
    ...hostIconPlateStyle,
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: SPACING.fixed.xs,
  },
  title: { marginBottom: SPACING.fixed.xs },
  body: { marginBottom: SPACING.fixed.sm },
  btn: { width: '100%' },
});
