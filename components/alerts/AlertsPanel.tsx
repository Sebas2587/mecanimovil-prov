import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAlerts, Alerta } from '@/context/AlertsContext';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, BORDERS, SHADOWS, withOpacity } from '@/app/design-system/tokens';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import {
  institutionalStatusColors,
  institutionalCardStyles,
  type InstitutionalStatusTone,
} from '@/app/design-system/styles/institutionalSemantic';

const I = COLORS.institutional;

interface AlertsPanelProps {
  variant?: 'floating' | 'header';
  iconColor?: string;
}

function alertToneForType(tipo: Alerta['tipo']): InstitutionalStatusTone {
  switch (tipo) {
    case 'mercado_pago_no_configurado':
      return 'info';
    case 'zonas_cobertura_no_configuradas':
      return 'primary';
    case 'creditos_bajos':
      return 'warning';
    case 'pago_expirado':
      return 'error';
    default:
      return 'neutral';
  }
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ variant = 'floating', iconColor }) => {
  const { alertas, alertasNoLeidas, marcarComoLeida, eliminarAlerta } = useAlerts();
  const [modalVisible, setModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(400)).current;
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    if (modalVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(400);
    }
  }, [modalVisible]);

  const handleAbrirPanel = () => {
    setModalVisible(true);
  };

  const handleCerrarPanel = () => {
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
    });
  };

  const handleAlertaPress = (alerta: Alerta) => {
    marcarComoLeida(alerta.id);

    if (alerta.accion) {
      setModalVisible(false);
      router.push(alerta.accion.ruta as any);
    }
  };

  const handleEliminarAlerta = (id: string) => {
    eliminarAlerta(id);
  };

  const getIconoAlerta = (tipo: Alerta['tipo']) => {
    switch (tipo) {
      case 'mercado_pago_no_configurado':
        return 'card-outline';
      case 'zonas_cobertura_no_configuradas':
        return 'location-outline';
      case 'creditos_bajos':
        return 'wallet-outline';
      case 'pago_expirado':
        return 'time-outline';
      default:
        return 'notifications-outline';
    }
  };

  const alertasOrdenadas = [...alertas].sort((a, b) => {
    const prioridadOrder = { alta: 3, media: 2, baja: 1 };
    if (prioridadOrder[a.prioridad] !== prioridadOrder[b.prioridad]) {
      return prioridadOrder[b.prioridad] - prioridadOrder[a.prioridad];
    }
    return b.fecha.getTime() - a.fecha.getTime();
  });

  const renderAlertsList = () => (
    <ScrollView style={styles.alertsList} showsVerticalScrollIndicator={false}>
      {alertasOrdenadas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <InstitutionalIcon
            name="checkmark-circle-outline"
            size={64}
            color={I.mutedSoft}
            strokeWidth={ICON_STROKE_WIDTH}
          />
          <InstitutionalText role="h4" color="muted" style={styles.emptyText}>
            No hay alertas
          </InstitutionalText>
          <InstitutionalText role="body" color="muted" style={styles.emptySubtext}>
            Todo está configurado correctamente
          </InstitutionalText>
        </View>
      ) : (
        alertasOrdenadas.map((alerta) => {
          const status = institutionalStatusColors(alertToneForType(alerta.tipo));
          const icono = getIconoAlerta(alerta.tipo);

          return (
            <TouchableOpacity
              key={alerta.id}
              style={[
                styles.alertaItem,
                institutionalCardStyles.surface,
                alerta.leida && styles.alertaLeida,
              ]}
              onPress={() => handleAlertaPress(alerta)}
              activeOpacity={0.7}
            >
              <View style={[styles.alertaIconContainer, { backgroundColor: status.bg }]}>
                <InstitutionalIcon
                  name={icono as any}
                  size={24}
                  color={status.icon}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
              </View>

              <View style={styles.alertaContent}>
                <View style={styles.alertaHeader}>
                  <InstitutionalText
                    role="body"
                    color={alerta.leida ? 'muted' : 'ink'}
                    style={styles.alertaTitulo}
                  >
                    {alerta.titulo}
                  </InstitutionalText>
                  {!alerta.leida ? <View style={[styles.unreadDot, { backgroundColor: I.primary }]} /> : null}
                </View>

                <InstitutionalText
                  role="caption"
                  color={alerta.leida ? 'muted' : 'body'}
                  style={styles.alertaMensaje}
                >
                  {alerta.mensaje}
                </InstitutionalText>

                {alerta.accion ? (
                  <View style={styles.alertaAccion}>
                    <InstitutionalIcon
                      name="arrow-forward-circle"
                      size={16}
                      color={status.icon}
                      strokeWidth={ICON_STROKE_WIDTH}
                    />
                    <InstitutionalText role="caption" color={status.text} style={styles.alertaAccionTexto}>
                      {alerta.accion.texto}
                    </InstitutionalText>
                  </View>
                ) : null}

                <InstitutionalText role="small" color="muted" style={styles.alertaFecha}>
                  {alerta.fecha.toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </InstitutionalText>
              </View>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleEliminarAlerta(alerta.id)}
                activeOpacity={0.7}
              >
                <InstitutionalIcon name="trash-outline" size={20} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );

  const renderModal = () => (
    <Modal
      visible={modalVisible}
      animationType="fade"
      transparent
      onRequestClose={handleCerrarPanel}
    >
      <View style={styles.modalContainer}>
        <Pressable style={styles.modalBackdrop} onPress={handleCerrarPanel} />

        <SafeAreaView edges={['top', 'right']} style={styles.modalSafeArea}>
          <Animated.View
            style={[
              styles.modalContentWrapper,
              {
                transform: [{ translateX: slideAnim }],
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <InstitutionalSectionHeader title="Alertas" level="h3" />
                <TouchableOpacity
                  onPress={handleCerrarPanel}
                  style={styles.closeButton}
                  activeOpacity={0.7}
                >
                  <InstitutionalIcon name="close" size={24} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                </TouchableOpacity>
              </View>

              {renderAlertsList()}
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );

  if (variant === 'header') {
    const textColor =
      iconColor || theme?.colors?.text?.primary || COLORS?.text?.primary || I.ink;

    return (
      <>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleAbrirPanel}
          activeOpacity={0.7}
        >
          <InstitutionalIcon
            name="notifications-outline"
            size={24}
            color={textColor}
            strokeWidth={ICON_STROKE_WIDTH}
          />
          {alertasNoLeidas > 0 ? (
            <View style={styles.headerBadge}>
              <InstitutionalText role="small" color="onPrimary" style={styles.headerBadgeText}>
                {alertasNoLeidas > 99 ? '99+' : alertasNoLeidas}
              </InstitutionalText>
            </View>
          ) : null}
        </TouchableOpacity>
        {renderModal()}
      </>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={handleAbrirPanel}
        activeOpacity={0.8}
      >
        <InstitutionalIcon name="notifications" size={24} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
        {alertasNoLeidas > 0 ? (
          <View style={styles.badge}>
            <InstitutionalText role="small" color="onPrimary" style={styles.badgeText}>
              {alertasNoLeidas > 99 ? '99+' : alertasNoLeidas}
            </InstitutionalText>
          </View>
        ) : null}
      </TouchableOpacity>
      {renderModal()}
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: I.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.editorial,
    zIndex: 1000,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: I.semanticDown,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: I.canvas,
  },
  badgeText: {
    fontWeight: '700',
  },
  headerButton: {
    position: 'relative',
    padding: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: I.semanticDown,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: I.canvas,
  },
  headerBadgeText: {
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: withOpacity(I.ink, 0.5),
  },
  modalSafeArea: {
    width: '85%',
    maxWidth: 400,
    height: '100%',
    zIndex: 1,
  },
  modalContentWrapper: {
    width: '100%',
    height: '100%',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    backgroundColor: I.canvas,
    borderTopLeftRadius: BORDERS.radius.xl,
    borderBottomLeftRadius: BORDERS.radius.xl,
    ...SHADOWS.editorial,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: I.hairline,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  alertsList: {
    flex: 1,
    padding: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: SPACING.md,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  alertaItem: {
    flexDirection: 'row',
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  alertaLeida: {
    opacity: 0.6,
    backgroundColor: I.surfaceSoft,
  },
  alertaIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  alertaContent: {
    flex: 1,
  },
  alertaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  alertaTitulo: {
    flex: 1,
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: SPACING.sm,
  },
  alertaMensaje: {
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  alertaAccion: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  alertaAccionTexto: {
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },
  alertaFecha: {
    marginTop: SPACING.xs,
  },
  deleteButton: {
    padding: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
