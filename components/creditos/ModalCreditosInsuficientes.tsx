import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { BlurView } from 'expo-blur';
import { VerificacionCreditosOferta } from '@/services/creditosService';

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
  const theme = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  // Obtener valores del sistema de diseño
  const colors = theme?.colors || COLORS || {};
  const textPrimary = colors?.text?.primary || '#000000';
  const textSecondary = colors?.text?.secondary || '#666666';
  const primaryColor = colors?.primary?.['500'] || '#4E4FEB';
  const errorColor = colors?.error?.main || '#FF5555';
  const errorLight = colors?.error?.light || '#FFEBEE';
  const backgroundPaper = colors?.background?.paper || '#FFFFFF';
  const borderMain = colors?.border?.main || '#D0D0D0';

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
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: opacityAnim },
          ]}
        >
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.modalContainer,
            {
              backgroundColor: backgroundPaper,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Header con icono de error */}
          <View style={[styles.iconContainer, { backgroundColor: errorLight }]}>
            <MaterialIcons name="account-balance-wallet" size={48} color={errorColor} />
            <View style={styles.badgeContainer}>
              <MaterialIcons name="error" size={24} color={errorColor} />
            </View>
          </View>

          {/* Título */}
          <Text style={[styles.title, { color: textPrimary }]}>
            Créditos Insuficientes
          </Text>

          {/* Mensaje principal */}
          <Text style={[styles.message, { color: textSecondary }]}>
            No tienes suficientes créditos para crear esta oferta.
          </Text>

          {/* Resumen de créditos */}
          <View style={[styles.creditosResumen, { borderColor: borderMain }]}>
            <View style={styles.creditoRow}>
              <Text style={[styles.creditoLabel, { color: textSecondary }]}>
                Tu saldo actual:
              </Text>
              <Text style={[styles.creditoValue, { color: textPrimary }]}>
                {verificacion.saldo_actual} créditos
              </Text>
            </View>
            <View style={styles.creditoRow}>
              <Text style={[styles.creditoLabel, { color: textSecondary }]}>
                Créditos necesarios:
              </Text>
              <Text style={[styles.creditoValue, { color: textPrimary }]}>
                {verificacion.creditos_necesarios} créditos
              </Text>
            </View>
            <View style={[styles.creditoRow, styles.faltantesRow]}>
              <Text style={[styles.creditoLabel, { color: errorColor, fontWeight: '600' }]}>
                Te faltan:
              </Text>
              <Text style={[styles.creditoValue, { color: errorColor, fontWeight: '700' }]}>
                {verificacion.creditos_faltantes} créditos
              </Text>
            </View>
          </View>

          {/* Detalle por servicio */}
          {verificacion.detalle_servicios.length > 0 && (
            <View style={[styles.detalleContainer, { borderColor: borderMain }]}>
              <Text style={[styles.detalleTitle, { color: textSecondary }]}>
                Desglose por servicio:
              </Text>
              {verificacion.detalle_servicios.map((servicio, index) => (
                <View key={index} style={styles.servicioRow}>
                  <MaterialIcons name="build" size={14} color={textSecondary} />
                  <Text style={[styles.servicioNombre, { color: textPrimary }]} numberOfLines={1}>
                    {servicio.nombre}
                  </Text>
                  <Text style={[styles.servicioCreditos, { color: primaryColor }]}>
                    {servicio.creditos} créditos
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Botones */}
          <View style={styles.botonesContainer}>
            <TouchableOpacity
              style={[styles.botonSecundario, { borderColor: borderMain }]}
              onPress={onClose}
            >
              <Text style={[styles.botonSecundarioText, { color: textSecondary }]}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.botonPrimario, { backgroundColor: primaryColor }]}
              onPress={onComprarCreditos}
            >
              <MaterialIcons name="add-shopping-cart" size={18} color="#FFFFFF" />
              <Text style={styles.botonPrimarioText}>
                Comprar Créditos
              </Text>
            </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouchable: {
    flex: 1,
    width: '100%',
  },
  modalContainer: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 400,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.lg,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize['xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  message: {
    fontSize: TYPOGRAPHY.fontSize.md,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: TYPOGRAPHY.fontSize.md * 1.5,
  },
  creditosResumen: {
    width: '100%',
    borderWidth: 1,
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
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    marginBottom: 0,
  },
  creditoLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  creditoValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  detalleContainer: {
    width: '100%',
    borderWidth: 1,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.sm,
    marginBottom: SPACING.lg,
    maxHeight: 120,
  },
  detalleTitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
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
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  servicioCreditos: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  botonesContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: SPACING.sm,
  },
  botonSecundario: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDERS.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonSecundarioText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  botonPrimario: {
    flex: 1.5,
    paddingVertical: SPACING.md,
    borderRadius: BORDERS.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    ...SHADOWS.md,
  },
  botonPrimarioText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#FFFFFF',
  },
});

