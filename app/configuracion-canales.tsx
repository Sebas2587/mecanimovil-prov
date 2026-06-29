import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
  AppState,
  AppStateStatus,
  Switch,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MessageCircle,
  MessageSquare,
  Link2,
  Unlink,
  Phone,
  Camera,
  type LucideIcon,
} from 'lucide-react-native';
import { COLORS, SPACING, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import Header from '@/components/Header';
import omnichannelService, {
  type CanalSlug,
  type ConexionCanal,
} from '@/services/omnichannelService';
import { BLANK_GLASS } from '@/app/design-system/blankGlass';

const I = COLORS.institutional;

const CANALES: { slug: CanalSlug; title: string; Icon: LucideIcon; hint: string }[] = [
  {
    slug: 'whatsapp',
    title: 'WhatsApp',
    Icon: Phone,
    hint: 'Conecta tu WhatsApp Business. No necesitas desinstalar WhatsApp personal.',
  },
  {
    slug: 'messenger',
    title: 'Facebook Messenger',
    Icon: MessageSquare,
    hint: 'Requiere una Página de Facebook de tu taller.',
  },
  {
    slug: 'instagram',
    title: 'Instagram',
    Icon: Camera,
    hint: 'Requiere cuenta Business vinculada a tu Página de Facebook.',
  },
];

function findConnection(connections: ConexionCanal[], slug: CanalSlug) {
  return connections.find((c) => c.channel_slug === slug);
}

async function confirmarAccion(titulo: string, mensaje: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return window.confirm(`${titulo}\n\n${mensaje}`);
  }
  return new Promise((resolve) => {
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Confirmar', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

function extractApiError(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: { error?: string; message?: string } } }).response?.data;
    return data?.error || data?.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export default function ConfiguracionCanalesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featureEnabled, setFeatureEnabled] = useState(true);
  const [connections, setConnections] = useState<ConexionCanal[]>([]);
  const [conectando, setConectando] = useState<CanalSlug | null>(null);
  const [phoneNumberIdInput, setPhoneNumberIdInput] = useState('');
  const [guardandoPhoneId, setGuardandoPhoneId] = useState(false);
  const oauthInProgress = useRef(false);

  const cargar = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const data = await omnichannelService.obtenerEstadoCanales();
      setFeatureEnabled(data.enabled);
      setConnections(data.connections || []);
    } catch (e) {
      console.error('[configuracion-canales]', e);
      Alert.alert('Error', 'No se pudo cargar el estado de los canales.');
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && oauthInProgress.current) {
        oauthInProgress.current = false;
        cargar(true);
      }
    });
    return () => sub.remove();
  }, [cargar]);

  const handleConectar = async (slug: CanalSlug) => {
    try {
      setConectando(slug);
      const result = await omnichannelService.iniciarConexion(slug);
      if (result.auth_url) {
        oauthInProgress.current = true;
        await Linking.openURL(result.auth_url);
        Alert.alert(
          'Conectar canal',
          'Completa el proceso en el navegador y vuelve a la app. El estado se actualizará automáticamente.',
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo iniciar la conexión';
      Alert.alert('Error', msg);
    } finally {
      setConectando(null);
    }
  };

  const handleToggle = async (conn: ConexionCanal, value: boolean) => {
    try {
      const updated = await omnichannelService.toggleCanal(conn.id, value);
      setConnections((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (e: unknown) {
      Alert.alert('Error', extractApiError(e, 'No se pudo cambiar el estado del canal.'));
      cargar(true);
    }
  };

  const handleDesconectar = (conn: ConexionCanal) => {
    void (async () => {
      const ok = await confirmarAccion(
        'Desconectar canal',
        `¿Desconectar ${conn.channel_display}? Dejarás de recibir mensajes por este canal.`,
      );
      if (!ok) return;
      try {
        const updated = await omnichannelService.desconectarCanal(conn.id);
        setConnections((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } catch (e: unknown) {
        Alert.alert('Error', extractApiError(e, 'No se pudo desconectar.'));
      }
    })();
  };

  const handleConfigurarWhatsapp = async (conn: ConexionCanal) => {
    const phoneNumberId = phoneNumberIdInput.trim();
    if (!phoneNumberId) {
      Alert.alert('Phone Number ID', 'Pega el identificador desde Meta Business Suite.');
      return;
    }
    try {
      setGuardandoPhoneId(true);
      const updated = await omnichannelService.configurarWhatsapp(conn.id, phoneNumberId);
      setConnections((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setPhoneNumberIdInput('');
      Alert.alert('Listo', 'WhatsApp conectado correctamente.');
    } catch (e: unknown) {
      Alert.alert('Error', extractApiError(e, 'No se pudo validar el Phone Number ID.'));
    } finally {
      setGuardandoPhoneId(false);
    }
  };

  const renderCanal = (cfg: (typeof CANALES)[number]) => {
    const conn = findConnection(connections, cfg.slug);
    const conectada = conn?.status === 'conectada';
    const pendienteWhatsapp = cfg.slug === 'whatsapp' && conn?.status === 'pendiente';
    const isConnecting = conectando === cfg.slug;

    return (
      <View key={cfg.slug} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconWrap}>
            <cfg.Icon size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
          <View style={styles.cardTitleBlock}>
            <InstitutionalText role="h4" color="ink" style={styles.cardTitle}>
              {cfg.title}
            </InstitutionalText>
            <InstitutionalText role="caption" color="muted" style={styles.cardStatus}>
              {conn?.status_display || 'Sin configurar'}
              {conn?.display_identifier ? ` · ${conn.display_identifier}` : ''}
            </InstitutionalText>
          </View>
          {conectada && conn ? (
            <Switch
              value={conn.enabled}
              onValueChange={(v) => handleToggle(conn, v)}
              trackColor={{ false: I.hairline, true: I.primary }}
            />
          ) : null}
        </View>
        <InstitutionalText role="caption" color="muted" style={styles.hint}>
          {cfg.hint}
        </InstitutionalText>
        {conn?.mensaje_estado ? (
          <InstitutionalText role="caption" color="body" style={styles.msgEstado}>
            {conn.mensaje_estado}
          </InstitutionalText>
        ) : null}
        {pendienteWhatsapp && conn ? (
          <View style={styles.phoneIdBlock}>
            <InstitutionalText role="caption" color="muted" style={styles.hint}>
              Meta Business Suite → WhatsApp → Mecanimovil spa → Configuración API →
              Identificador de número de teléfono (+56995945258).
            </InstitutionalText>
            <TextInput
              style={styles.phoneIdInput}
              value={phoneNumberIdInput}
              onChangeText={setPhoneNumberIdInput}
              placeholder="Phone Number ID (ej. 106540352242922)"
              placeholderTextColor={I.muted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => handleConfigurarWhatsapp(conn)}
              disabled={guardandoPhoneId}
            >
              {guardandoPhoneId ? (
                <ActivityIndicator color={I.onPrimary} />
              ) : (
                <InstitutionalText role="button" color="onPrimary">Completar conexión</InstitutionalText>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={styles.actions}>
          {!conectada && !pendienteWhatsapp ? (
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => handleConectar(cfg.slug)}
              disabled={isConnecting || !featureEnabled}
            >
              {isConnecting ? (
                <ActivityIndicator color={I.onPrimary} />
              ) : (
                <>
                  <Link2 size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                  <InstitutionalText role="button" color="onPrimary">Conectar</InstitutionalText>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => conn && handleDesconectar(conn)}
            >
              <Unlink size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
              <InstitutionalText role="button" color="primary">Desconectar</InstitutionalText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <LinearGradient
        style={StyleSheet.absoluteFill}
        colors={BLANK_GLASS.gradient}
        locations={BLANK_GLASS.gradientLocations}
      />
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="Canales de mensajería" onBackPress={() => router.back()} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={I.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(true); }} />
          }
        >
          {!featureEnabled ? (
            <View style={styles.banner}>
              <MessageCircle size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
              <InstitutionalText role="caption" color="body" style={styles.bannerText}>
                La mensajería omnicanal aún no está activa en el servidor. Contacta a soporte Mecanimovil.
              </InstitutionalText>
            </View>
          ) : null}

          <InstitutionalText role="body" color="body" style={styles.intro}>
            Conecta WhatsApp, Facebook e Instagram de tu taller. Los mensajes llegarán al tab Chats con
            identificador de canal. Tu WhatsApp personal no se ve afectado.
          </InstitutionalText>

          {CANALES.map(renderCanal)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: I.canvas },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  intro: { marginBottom: SPACING.lg },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: I.surfaceSoft,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: I.hairline,
  },
  bannerText: { flex: 1 },
  card: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: I.hairline,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitleBlock: { flex: 1, minWidth: 0, gap: SPACING.xs },
  cardTitle: {},
  cardStatus: {},
  hint: { marginBottom: SPACING.sm },
  msgEstado: { marginBottom: SPACING.sm },
  phoneIdBlock: { gap: SPACING.sm, marginBottom: SPACING.sm },
  phoneIdInput: {
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: I.ink,
    backgroundColor: I.surfaceSoft,
  },
  actions: { flexDirection: 'row', marginTop: SPACING.xs },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: I.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDERS.radius.md,
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: I.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDERS.radius.md,
  },
});
