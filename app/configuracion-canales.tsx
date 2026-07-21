import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  AppState,
  AppStateStatus,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useFocusEffect } from 'expo-router';
import {
  MessageCircle,
  Link2,
  Unlink,
} from 'lucide-react-native';
import { ChannelBrandIcon } from '@/components/chats/ChannelBrandIcon';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import {
  Card,
  HostPaperSection,
  HostSectionKicker,
  hostScreenStyles,
} from '@/app/design-system/components';
import Header from '@/components/Header';
import omnichannelService, {
  type CanalSlug,
  type ConexionCanal,
} from '@/services/omnichannelService';
import { useMetaChannelConnect } from '@/hooks/useMetaChannelConnect';

const I = COLORS.institutional;

const CANALES: { slug: CanalSlug; title: string; hint: string }[] = [
  {
    slug: 'whatsapp',
    title: 'WhatsApp',
    hint: 'Conecta tu WhatsApp Business en pocos pasos con Meta.',
  },
  {
    slug: 'messenger',
    title: 'Facebook Messenger',
    hint: 'Requiere una Página de Facebook de tu taller.',
  },
  {
    slug: 'instagram',
    title: 'Instagram',
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

/** Oculta errores técnicos o instrucciones de soporte que no corresponden al taller. */
function mensajeEstadoParaUsuario(msg: string | null | undefined): string | null {
  if (!msg) return null;
  if (
    /https?:\/\//i.test(msg)
    || /graph\.facebook/i.test(msg)
    || /Client Error/i.test(msg)
    || /client_secret|access_token\?/i.test(msg)
    || /phone number id/i.test(msg)
    || /business suite/i.test(msg)
    || /configuraci[oó]n api/i.test(msg)
    || /pega(el)?/i.test(msg)
  ) {
    return 'No se pudo conectar. Pulsa Conectar e intenta de nuevo.';
  }
  return msg;
}

export default function ConfiguracionCanalesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featureEnabled, setFeatureEnabled] = useState(true);
  const [connections, setConnections] = useState<ConexionCanal[]>([]);
  const [conectando, setConectando] = useState<CanalSlug | null>(null);
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

  const recargarCanales = useCallback(() => {
    void cargar(true);
  }, [cargar]);

  const { connect: conectarCanalMeta } = useMetaChannelConnect(recargarCanales);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onMessage = (event: MessageEvent) => {
      const apiOrigins = [
        'https://mecanimovil-api.onrender.com',
        'https://api.mecanimovil.com',
        'http://localhost:8000',
      ];
      const originOk =
        event.origin === window.location.origin || apiOrigins.includes(event.origin);
      if (!originOk) return;
      const data = event.data;
      if (!data || data.type !== 'mecanimovil:meta-oauth') return;
      oauthInProgress.current = false;
      void cargar(true);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [cargar]);

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
      oauthInProgress.current = true;
      const ok = await conectarCanalMeta(slug);
      if (!ok) {
        oauthInProgress.current = false;
      }
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

  const renderCanal = (cfg: (typeof CANALES)[number]) => {
    const conn = findConnection(connections, cfg.slug);
    const conectada = conn?.status === 'conectada';
    const isConnecting = conectando === cfg.slug;
    const puedeConectar = !conectada && featureEnabled;

    return (
      <View key={cfg.slug}>
        <HostSectionKicker label={cfg.title} />
        <HostPaperSection style={styles.canalCard}>
          <View style={styles.cardHeader}>
            <ChannelBrandIcon channel={cfg.slug} size={40} />
            <View style={styles.cardTitleBlock}>
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
              {mensajeEstadoParaUsuario(conn.mensaje_estado)}
            </InstitutionalText>
          ) : null}
          <View style={styles.actions}>
            {puedeConectar ? (
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => handleConectar(cfg.slug)}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <ActivityIndicator color={I.onPrimary} />
                ) : (
                  <>
                    <Link2 size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                    <InstitutionalText role="button" color="onPrimary">
                      {conn?.status === 'pendiente' || conn?.status === 'error' ? 'Reintentar' : 'Conectar'}
                    </InstitutionalText>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
            {conn && (conectada || conn.status === 'pendiente' || conn.status === 'error') ? (
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => conn && handleDesconectar(conn)}
              >
                <Unlink size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <InstitutionalText role="button" color="primary">Desconectar</InstitutionalText>
              </TouchableOpacity>
            ) : null}
          </View>
        </HostPaperSection>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="Canales de mensajería" showBack onBackPress={() => router.back()} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={I.primary} />
        </View>
      ) : (
        <ScrollView
          style={hostScreenStyles.scroll}
          contentContainerStyle={[hostScreenStyles.scrollInner, { paddingBottom: SPACING['2xl'] }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(true); }} />
          }
        >
          {!featureEnabled ? (
            <Card elevated padding="host" style={styles.banner}>
              <MessageCircle size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
              <InstitutionalText role="caption" color="body" style={styles.bannerText}>
                La mensajería omnicanal aún no está activa en el servidor. Contacta a soporte Mecanimovil.
              </InstitutionalText>
            </Card>
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
  intro: { marginBottom: SPACING.sm, marginTop: SPACING.xs },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  bannerText: { flex: 1 },
  canalCard: {
    marginBottom: SPACING.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  cardTitleBlock: { flex: 1, minWidth: 0, gap: SPACING.xs },
  cardStatus: {},
  hint: { marginBottom: SPACING.sm },
  msgEstado: { marginBottom: SPACING.sm },
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
