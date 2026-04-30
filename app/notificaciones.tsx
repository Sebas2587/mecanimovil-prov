import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Bell,
  BellOff,
  CreditCard,
  Wallet,
  MapPin,
  ShieldAlert,
  Clock,
  AlertTriangle,
  Coins,
  ClipboardList,
  CheckCircle2,
  ChevronRight,
  Trash2,
  X,
} from 'lucide-react-native';
import { useAlerts, type Alerta, type TipoAlerta } from '@/context/AlertsContext';

const BLUE = '#2563EB';
const BG = '#FAFAFA';

const getAlertIcon = (tipo: TipoAlerta) => {
  switch (tipo) {
    case 'mercado_pago_no_configurado':
      return { Icon: CreditCard, bg: '#DBEAFE', color: '#2563EB' };
    case 'zonas_cobertura_no_configuradas':
      return { Icon: MapPin, bg: '#E0E7FF', color: '#4F46E5' };
    case 'creditos_bajos':
      return { Icon: Coins, bg: '#FEF3C7', color: '#D97706' };
    case 'creditos_agotados':
      return { Icon: Wallet, bg: '#FEE2E2', color: '#DC2626' };
    case 'pago_expirado':
      return { Icon: Clock, bg: '#FEE2E2', color: '#DC2626' };
    case 'suscripcion_por_vencer':
      return { Icon: ShieldAlert, bg: '#FEF3C7', color: '#D97706' };
    case 'suscripcion_vencida':
      return { Icon: AlertTriangle, bg: '#FEE2E2', color: '#DC2626' };
    case 'suscripcion_pago_fallido':
      return { Icon: AlertTriangle, bg: '#FEE2E2', color: '#DC2626' };
    case 'ordenes_pendientes_sin_aceptar':
      return { Icon: ClipboardList, bg: '#DBEAFE', color: '#2563EB' };
    default:
      return { Icon: Bell, bg: '#F3F4F6', color: '#6B7280' };
  }
};

const getPriorityStyle = (prioridad: 'alta' | 'media' | 'baja') => {
  switch (prioridad) {
    case 'alta':
      return { label: 'Urgente', bg: '#FEE2E2', color: '#DC2626' };
    case 'media':
      return { label: 'Importante', bg: '#FEF3C7', color: '#D97706' };
    case 'baja':
      return { label: 'Info', bg: '#DBEAFE', color: '#2563EB' };
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
              <Text style={[styles.priorityText, { color: priority.color }]}>
                {priority.label}
              </Text>
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
              <ChevronRight size={14} color={BLUE} />
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default function NotificacionesScreen() {
  const router = useRouter();
  const {
    alertas,
    alertasNoLeidas,
    marcarComoLeida,
    eliminarAlerta,
    verificarYGenerarAlertas,
    limpiarAlertas,
  } = useAlerts();

  const [refreshing, setRefreshing] = React.useState(false);

  const alertasOrdenadas = [...alertas].sort((a, b) => {
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
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Glass header */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <BlurView intensity={80} tint="light" style={styles.headerBlur}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerSub}>CENTRO DE</Text>
            <Text style={styles.headerTitle}>Notificaciones</Text>
          </View>

          {alertas.length > 0 ? (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={limpiarAlertas}
              activeOpacity={0.7}
            >
              <Trash2 size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </BlurView>
      </SafeAreaView>

      {/* Summary pill */}
      <Animated.View style={[styles.summaryRow, { opacity: fadeAnim }]}>
        <View style={styles.summaryPill}>
          <Bell size={14} color={BLUE} />
          <Text style={styles.summaryText}>
            {alertasNoLeidas > 0
              ? `${alertasNoLeidas} alerta${alertasNoLeidas > 1 ? 's' : ''} sin leer`
              : 'Sin alertas pendientes'}
          </Text>
        </View>
      </Animated.View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />
        }
      >
        {alertasOrdenadas.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyCircle}>
              <BellOff size={40} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>Todo en orden</Text>
            <Text style={styles.emptySub}>
              No tienes alertas ni notificaciones pendientes.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              activeOpacity={0.7}
              onPress={onFullRefresh}
            >
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  /* ── Header ── */
  headerSafe: {
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  headerBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229,231,235,0.6)',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  headerCenter: { alignItems: 'center' },
  headerSub: {
    fontSize: 10,
    fontWeight: '700',
    color: BLUE,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginTop: 1,
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Summary ── */
  summaryRow: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(219,234,254,0.5)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(191,219,254,0.6)',
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: BLUE,
  },

  /* ── Scroll ── */
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },

  /* ── Card ── */
  card: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.7)',
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  cardRead: {
    opacity: 0.6,
    backgroundColor: 'rgba(249,250,251,0.85)',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  cardTitleRead: { color: '#6B7280' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BLUE,
    marginLeft: 8,
  },
  cardMsg: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 8,
  },
  cardMsgRead: { color: '#9CA3AF' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priorityBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: BLUE,
  },
  deleteBtn: {
    padding: 4,
    marginLeft: 4,
  },

  /* ── Empty ── */
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(243,244,246,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.6)',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: BLUE,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
