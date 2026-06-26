import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS, withOpacity } from '@/app/design-system/tokens';
import { BlurView } from 'expo-blur';
import { VerificacionCreditosOferta } from '@/services/creditosService';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import {
  institutionalCardStyles,
  institutionalStatusColors,
} from '@/app/design-system/styles/institutionalSemantic';

const I = COLORS.institutional;
const errorStatus = institutionalStatusColors('error');

interface ModalCreditosInsuficientesProps {
  visible: boolean;
  onClose: () => void;
  onComprarCreditos: () => void;
  verificacion: VerificacionCreditosOferta | null;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ModalCreditosInsuficientes: React.FC<ModalCreditosInsuficientesProps> = ({
  visible,
  onClose,
  onComprarCreditos,
  verificacion,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!verificacion) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <BlurView intensity={20} style={styles.blurContainer} tint="dark">
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.modalContainer,
            institutionalCardStyles.surface,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: errorStatus.bg }]}>
            <InstitutionalIcon
              name="account-balance-wallet"
              size={48}
              color={errorStatus.icon}
              strokeWidth={ICON_STROKE_WIDTH}
            />
            <View style={styles.badgeContainer}>
              <InstitutionalIcon name="error" size={24} color={errorStatus.icon} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
          </View>

          <InstitutionalText role="h3" style={styles.title}>
            Créditos Insuficientes
          </InstitutionalText>

          <InstitutionalText role="body" color="body" style={styles.message}>
            No tienes suficientes créditos para crear esta oferta.
          </InstitutionalText>

          <View style={[styles.creditosResumen, { borderColor: I.hairline }]}>
            <View style={styles.creditoRow}>
              <InstitutionalText role="caption" color="body">
                Tu saldo actual:
              </InstitutionalText>
              <InstitutionalText role="body" style={styles.creditoValue}>
                {verificacion.saldo_actual} créditos
              </InstitutionalText>
            </View>
            <View style={styles.creditoRow}>
              <InstitutionalText role="caption" color="body">
                Créditos necesarios:
              </InstitutionalText>
              <InstitutionalText role="body" style={styles.creditoValue}>
                {verificacion.creditos_necesarios} créditos
              </InstitutionalText>
            </View>
            <View style={[styles.creditoRow, styles.faltantesRow]}>
              <InstitutionalText role="caption" color="semanticDown" style={styles.faltantesLabel}>
                Te faltan:
              </InstitutionalText>
              <InstitutionalText role="body" color="semanticDown" style={styles.faltantesValue}>
                {verificacion.creditos_faltantes} créditos
              </InstitutionalText>
            </View>
          </View>

          {verificacion.detalle_servicios.length > 0 ? (
            <View style={[styles.detalleContainer, { borderColor: I.hairline }]}>
              <InstitutionalText role="small" color="body" style={styles.detalleTitle}>
                Desglose por servicio:
              </InstitutionalText>
              {verificacion.detalle_servicios.map((servicio, index) => (
                <View key={index} style={styles.servicioRow}>
                  <InstitutionalIcon name="build" size={14} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                  <InstitutionalText role="caption" style={styles.servicioNombre} numberOfLines={1}>
                    {servicio.nombre}
                  </InstitutionalText>
                  <InstitutionalText role="caption" color="primary" style={styles.servicioCreditos}>
                    {servicio.creditos} créditos
                  </InstitutionalText>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.botonesContainer}>
            <InstitutionalButton
              label="Cancelar"
              variant="outline"
              size="compact"
              onPress={onClose}
              style={styles.footerButton}
            />
            <InstitutionalButton
              label="Comprar Créditos"
              variant="primary"
              size="compact"
              onPress={onComprarCreditos}
              leading={
                <InstitutionalIcon name="add-shopping-cart" size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
              }
              style={styles.footerButtonPrimary}
            />
          </View>
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: withOpacity(I.ink, 0.5),
  },
  backdropTouchable: {
    flex: 1,
    width: '100%',
  },
  modalContainer: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 400,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    padding: 2,
  },
  title: {
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: TYPOGRAPHY.fontSize.md * 1.5,
  },
  creditosResumen: {
    width: '100%',
    borderWidth: BORDERS.width.thin,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  creditoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  faltantesRow: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
    marginBottom: 0,
  },
  creditoValue: {
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
  },
  faltantesLabel: {
    fontWeight: '600',
  },
  faltantesValue: {
    fontWeight: '700',
  },
  detalleContainer: {
    width: '100%',
    borderWidth: BORDERS.width.thin,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.sm,
    marginBottom: SPACING.lg,
    maxHeight: 120,
  },
  detalleTitle: {
    marginBottom: SPACING.xs,
  },
  servicioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: SPACING.xs,
  },
  servicioNombre: {
    flex: 1,
  },
  servicioCreditos: {
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
  },
  botonesContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: SPACING.sm,
  },
  footerButton: {
    flex: 1,
  },
  footerButtonPrimary: {
    flex: 1.5,
  },
});
