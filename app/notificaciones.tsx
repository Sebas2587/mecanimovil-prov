import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Bell,
  BellOff,
  CreditCard,
  Wallet,
  MapPin,
  ShieldAlert,
  Clock,
  AlertTriangle,
  Coins,
  ChevronRight,
  Trash2,
  X,
} from 'lucide-react-native';
import { useAlerts, type Alerta, type TipoAlerta } from '@/context/AlertsContext';
import Header from '@/components/Header';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS, withOpacity } from '@/app/design-system/tokens';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

const getAlertIcon = (tipo: TipoAlerta) => {
  const plate = I.surfaceStrong;
  const primary = I.primary;
  const danger = I.semanticDown;
  const warnBg = withOpacity(I.accentYellow, 0.22);
  const dangerBg = withOpacity(danger, 0.12);

  switch (tipo) {
    case 'mercado_pago_no_configurado':
      return { Icon: CreditCard, bg: plate, color: primary };
    case 'zonas_cobertura_no_configuradas':
      return { Icon: MapPin, bg: plate, color: I.ink };
    case 'ubicacion_no_configurada':
      return { Icon: MapPin, bg: plate, color: primary };
    case 'creditos_bajos':
      return { Icon: Coins, bg: warnBg, color: COLORS.warning.text };
    case 'creditos_agotados':
      return { Icon: Wallet, bg: dangerBg, color: danger };
    case 'pago_expirado':
      return { Icon: Clock, bg: dangerBg, color: danger };
    case 'suscripcion_por_vencer':
      return { Icon: ShieldAlert, bg: withOpacity(I.accentYellow, 0.18), color: COLORS.warning.text };
    case 'suscripcion_vencida':
    case 'suscripcion_pago_fallido':
      return { Icon: AlertTriangle, bg: dangerBg, color: danger };
    case 'orden_asignada_mecanico':
      return { Icon: Bell, bg: plate, color: primary };
    case 'checklist_pendiente':
      return { Icon: Clock, bg: warnBg, color: COLORS.warning.text };
    default:
      return { Icon: Bell, bg: plate, color: I.muted };
  }
};

const getPriorityStyle = (prioridad: 'alta' | 'media' | 'baja') => {
  switch (prioridad) {
    case 'alta':
      return {
        label: 'Urgente',
        bg: withOpacity(I.semanticDown, 0.12),
        color: I.semanticDown,
      };
    case 'media':
      return {
        label: 'Importante',
        bg: withOpacity(I.accentYellow, 0.22),
        color: COLORS.warning.text,
      };
    case 'baja':
      return { label: 'Info', bg: COLORS.primary[50], color: I.primary };
  }
};

const AlertCard = ({
  alerta,
  onPress,
  onDelete,
}: {
  alerta: Alerta;
  onPress: () => void;
  onDelete: () => void;
}) => {
  const { Icon, bg: iconBg, color: iconColor } = getAlertIcon(alerta.tipo);
  const priority = getPriorityStyle(alerta.prioridad);

  return (
    <TouchableOpacity
      style={[styles.card, alerta.leida && styles.cardRead]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.cardRow}>
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Icon size={20} color={iconColor} />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text
              style={[styles.cardTitle, alerta.leida && styles.cardTitleRead]}
              numberOfLines={1}
            >
              {alerta.titulo}
            </Text>
            {!alerta.leida && <View style={styles.unreadDot} />}
          </View>

          <Text
            style={[styles.cardMsg, alerta.leida && styles.cardMsgRead]}
            numberOfLines={2}
          >
            {alerta.mensaje}
          </Text>

          <View style={styles.cardFooter}>
            <View style={[styles.priorityBadge, { backgroundColor: priority.bg }]}>
              <Text style={[styles.priorityText, { color: priority.color }]}>{priority.label}</Text>
            </View>

            <Text style={styles.cardDate}>
              {alerta.fecha.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {alerta.accion && (
            <View style={styles.actionRow}>
              <Text style={styles.actionText}>{alerta.accion.texto}</Text>
              <ChevronRight size={14} color={I.primary} />
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={16} color={I.muted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default function NotificacionesScreen() {
  const router = useRouter();
  const {
    alertasVisibles,
    alertasNoLeidas,
    marcarComoLeida,
    eliminarAlerta,
    verificarYGenerarAlertas,
    limpiarAlertas,
  } = useAlerts();

  const [refreshing, setRefreshing] = React.useState(false);

  const alertasOrdenadas = [...alertasVisibles].sort((a, b) => {
    const prioridadOrder = { alta: 3, media: 2, baja: 1 };
    if (prioridadOrder[a.prioridad] !== prioridadOrder[b.prioridad]) {
      return prioridadOrder[b.prioridad] - prioridadOrder[a.prioridad];
    }
    return b.fecha.getTime() - a.fecha.getTime();
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await verificarYGenerarAlertas();
    setRefreshing(false);
  }, [verificarYGenerarAlertas]);

  const onFullRefresh = useCallback(async () => {
    await AsyncStorage.removeItem('@mecanimovil_prov_dismissed_alerts');
    await verificarYGenerarAlertas();
  }, [verificarYGenerarAlertas]);

  const handlePress = (alerta: Alerta) => {
    marcarComoLeida(alerta.id);
    if (alerta.accion) {
      router.push(alerta.accion.ruta as any);
    }
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <Header
        title="Notificaciones"
        showBack
        onBackPress={() => router.back()}
        backgroundColor={I.canvas}
        titleColor={I.ink}
        rightComponent={
          alertasVisibles.length > 0 ? (
            <TouchableOpacity
              onPress={limpiarAlertas}
              style={styles.headerIconHit}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={20} color={I.muted} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerIconHit} />
          )
        }
      />

      <Animated.View style={[styles.summaryRow, { opacity: fadeAnim }]}>
        <View style={styles.summaryPill}>
          <Bell size={14} color={I.primary} />
          <Text style={styles.summaryText}>
            {alertasNoLeidas > 0
              ? `${alertasNoLeidas} alerta${alertasNoLeidas > 1 ? 's' : ''} sin leer`
              : 'Sin alertas pendientes'}
          </Text>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={I.primary} />
        }
      >
        {alertasOrdenadas.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyCircle}>
              <BellOff size={40} color={I.mutedSoft} />
            </View>
            <Text style={styles.emptyTitle}>Todo en orden</Text>
            <Text style={styles.emptySub}>
              No tienes alertas ni notificaciones pendientes.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} activeOpacity={0.7} onPress={onFullRefresh}>
              <Text style={styles.emptyBtnText}>Verificar ahora</Text>
            </TouchableOpacity>
          </View>
        ) : (
          alertasOrdenadas.map((alerta) => (
            <AlertCard
              key={alerta.id}
              alerta={alerta}
              onPress={() => handlePress(alerta)}
              onDelete={() => eliminarAlerta(alerta.id)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  headerIconHit: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryRow: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.fixed.sm,
    paddingBottom: SPACING.fixed.xxs,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDERS.radius.pill,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xxs + 2,
    gap: 6,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[100],
  },
  summaryText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.primary,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.fixed.xs,
    paddingBottom: SPACING.fixed['2xl'],
  },
  card: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.card.xl,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.fixed.md,
    marginBottom: SPACING.fixed.sm,
    ...SHADOWS.editorial,
  },
  cardRead: {
    opacity: 0.62,
    backgroundColor: I.surfaceSoft,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.fixed.sm,
  },
  cardBody: { flex: 1 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.fixed.xxs,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    flex: 1,
  },
  cardTitleRead: { color: I.muted },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: I.primary,
    marginLeft: SPACING.fixed.xs,
  },
  cardMsg: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.body,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.base * TYPOGRAPHY.lineHeight.normal),
    marginBottom: SPACING.fixed.xs,
  },
  cardMsgRead: { color: I.mutedSoft },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
  },
  priorityBadge: {
    borderRadius: BORDERS.radius.sm,
    paddingHorizontal: SPACING.fixed.xs,
    paddingVertical: 3,
  },
  priorityText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
  },
  cardDate: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.fixed.sm,
    gap: 4,
  },
  actionText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.primary,
  },
  deleteBtn: {
    padding: SPACING.fixed.xxs,
    marginLeft: SPACING.fixed.xxs,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: SPACING.fixed.section,
  },
  emptyCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: I.surfaceStrong,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    marginBottom: SPACING.fixed.md,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginBottom: SPACING.fixed.xxs + 2,
  },
  emptySub: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.body,
    textAlign: 'center',
    paddingHorizontal: SPACING.fixed.xl,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.base * TYPOGRAPHY.lineHeight.normal),
    marginBottom: SPACING.fixed.lg,
  },
  emptyBtn: {
    backgroundColor: I.primary,
    borderRadius: BORDERS.radius.lg,
    paddingHorizontal: SPACING.fixed.lg,
    paddingVertical: SPACING.fixed.sm,
  },
  emptyBtnText: {
    color: I.onPrimary,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
  },
});
