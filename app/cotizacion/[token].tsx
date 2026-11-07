import { useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { COLORS, SPACING } from '@/app/design-system/tokens';

const I = COLORS.institutional;

type CotizacionPublica = {
  numero_publico?: string | null;
  estado?: string;
  servicio_nombre?: string;
  descripcion_problema?: string;
  cliente_nombre?: string;
  vehiculo_marca?: string;
  vehiculo_modelo?: string;
  vehiculo_patente?: string;
  total_clp?: number | null;
  puede_responder?: boolean;
  es_trabajo_adicional?: boolean;
  motivo_servicio_adicional?: string | null;
  error?: string;
};

function apiBase(): string {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    const force = localStorage.getItem('FORCE_LOCAL_API');
    const local = localStorage.getItem('LOCAL_API_URL');
    if (force === 'true' && local) return local.replace(/\/$/, '');
  }
  const prod = (process.env.EXPO_PUBLIC_PRODUCTION_API_URL || 'https://mecanimovil-api.onrender.com').replace(/\/$/, '');
  return prod.endsWith('/api') ? prod : `${prod}/api`;
}

function dinero(value: number | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

export default function CotizacionPublicaScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const insets = useSafeAreaInsets();
  const [override, setOverride] = useState<CotizacionPublica | null>(null);
  const [errorLocal, setErrorLocal] = useState('');
  const [enviando, setEnviando] = useState<'aceptar' | 'rechazar' | null>(null);

  const loaded = useQuery({
    queryKey: ['cotizacion-publica', token],
    enabled: Boolean(token),
    retry: false,
    queryFn: async () => {
      const resp = await fetch(`${apiBase()}/ordenes/cotizaciones-publicas/${encodeURIComponent(token)}/`, {
        headers: { Accept: 'application/json' },
      });
      const body = (await resp.json()) as CotizacionPublica;
      if (!resp.ok && !body.servicio_nombre && !body.estado) {
        throw new Error(body.error || 'No se pudo abrir la cotización.');
      }
      return body;
    },
  });

  const doc = override ?? loaded.data ?? null;
  const cargando = Boolean(token) && loaded.isPending;
  const error = !token
    ? 'Falta el enlace de la cotización.'
    : errorLocal || (loaded.error instanceof Error ? loaded.error.message : '');

  const responder = async (accion: 'aceptar' | 'rechazar') => {
    if (!token) return;
    setEnviando(accion);
    setErrorLocal('');
    try {
      const resp = await fetch(
        `${apiBase()}/ordenes/cotizaciones-publicas/${encodeURIComponent(token)}/${accion}/`,
        { method: 'POST', headers: { Accept: 'application/json' } },
      );
      const body = (await resp.json()) as CotizacionPublica;
      if (!resp.ok) {
        setErrorLocal(body.error || 'No se pudo registrar la respuesta.');
        if (body.estado || body.servicio_nombre) setOverride(body);
        return;
      }
      setOverride(body);
    } catch {
      setErrorLocal('No se pudo registrar la respuesta.');
    } finally {
      setEnviando(null);
    }
  };

  const vehiculo = [doc?.vehiculo_marca, doc?.vehiculo_modelo, doc?.vehiculo_patente].filter(Boolean).join(' · ');
  const puedeResponder = Boolean(doc?.puede_responder && doc?.estado === 'enviada');
  const total = dinero(doc?.total_clp);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <InstitutionalText role="caption" color="muted" testID="cotizacion-publica-bearer">
          Quien tenga este enlace puede aceptar o rechazar la cotización. Abrirlo no comprueba la identidad de la persona.
        </InstitutionalText>
        {cargando ? <ActivityIndicator color={I.primary} /> : null}
        {error ? (
          <InstitutionalText role="body" testID="cotizacion-publica-error">{error}</InstitutionalText>
        ) : null}
        {doc ? (
          <View style={styles.card}>
            <InstitutionalText role="caption" color="muted">
              {doc.numero_publico ? `#${doc.numero_publico}` : 'Cotización'}
              {doc.es_trabajo_adicional ? ' · Trabajo adicional' : ''}
            </InstitutionalText>
            <InstitutionalText role="h3" testID="cotizacion-publica-servicio">
              {doc.servicio_nombre || 'Servicio'}
            </InstitutionalText>
            {doc.cliente_nombre ? (
              <InstitutionalText role="body" testID="cotizacion-publica-cliente">
                {doc.cliente_nombre}
              </InstitutionalText>
            ) : null}
            {vehiculo ? (
              <InstitutionalText role="body" testID="cotizacion-publica-vehiculo">
                {vehiculo}
              </InstitutionalText>
            ) : null}
            {doc.motivo_servicio_adicional ? (
              <InstitutionalText role="body" testID="cotizacion-publica-motivo">
                {doc.motivo_servicio_adicional}
              </InstitutionalText>
            ) : null}
            {total ? (
              <InstitutionalText role="h4" testID="cotizacion-publica-total">{total}</InstitutionalText>
            ) : null}
            <InstitutionalText role="caption" testID="cotizacion-publica-estado">
              {doc.estado || ''}
            </InstitutionalText>
          </View>
        ) : null}
        {puedeResponder ? (
          <View style={styles.actions}>
            <InstitutionalButton
              label={enviando === 'aceptar' ? 'Aceptando…' : 'Aceptar'}
              onPress={() => { void responder('aceptar'); }}
              disabled={enviando != null}
              testID="cotizacion-publica-aceptar"
            />
            <InstitutionalButton
              label={enviando === 'rechazar' ? 'Rechazando…' : 'Rechazar'}
              variant="outline"
              onPress={() => { void responder('rechazar'); }}
              disabled={enviando != null}
              testID="cotizacion-publica-rechazar"
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: I.canvas,
  },
  content: {
    padding: SPACING.fixed.lg,
    gap: SPACING.fixed.md,
  },
  card: {
    gap: SPACING.fixed.sm,
    padding: SPACING.fixed.md,
    backgroundColor: I.paper,
    borderRadius: 16,
  },
  actions: {
    gap: SPACING.fixed.sm,
  },
});
