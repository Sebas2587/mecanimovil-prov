import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Stack, router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MapPin, Navigation, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react-native';
import Header from '@/components/Header';
import { useAuth } from '@/context/AuthContext';
import { mecanicoAPI, tallerAPI, type EstadoProveedor } from '@/services/api';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { searchChileAddresses, type ChileAddressHit } from '@/utils/chileNominatimSearch';
import { reverseGeocodeProveedor } from '@/utils/providerReverseGeocode';

type SearchUi = 'idle' | 'loading' | 'results' | 'empty' | 'error';

const DEBOUNCE_MS = 480;
const MIN_QUERY = 4;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function humanSaveError(e: unknown): string {
  const ax = e as {
    response?: { status?: number; data?: { error?: string; message?: string } };
    message?: string;
  };
  const status = ax?.response?.status;
  const data = ax?.response?.data as { code?: string; error?: string } | undefined;
  if (data?.code === 'database_unavailable' && typeof data?.error === 'string') {
    return data.error;
  }
  if (status === 502 || status === 503 || status === 500) {
    return 'El servidor no está disponible por unos instantes (suele pasar si la base de datos reinicia en Render). Espera 30–60 s y pulsa Guardar de nuevo.';
  }
  const msg =
    data?.error ||
    ax?.response?.data?.message ||
    ax?.message ||
    'No se pudo guardar.';
  return String(msg);
}

async function guardarUbicacionConReintentos(
  tipo: 'taller' | 'mecanico' | undefined,
  payload: { direccion?: string; latitud?: number; longitud?: number },
  maxAttempts = 4
) {
  let last: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (tipo === 'taller') {
        return await tallerAPI.actualizarUbicacionDomicilio(payload);
      }
      return await mecanicoAPI.actualizarUbicacionDomicilio(payload);
    } catch (e: unknown) {
      last = e;
      const ax = e as { response?: { status?: number }; code?: string; message?: string };
      const status = ax?.response?.status;
      const transient =
        status === undefined ||
        status >= 500 ||
        status === 429 ||
        ax?.code === 'ECONNABORTED' ||
        (typeof ax?.message === 'string' && ax.message.toLowerCase().includes('network'));
      if (!transient || attempt === maxAttempts) throw e;
      await sleep(650 * attempt);
    }
  }
  throw last;
}

async function refrescarEstadoConReintentos(
  fn: () => Promise<EstadoProveedor | null>,
  attempts = 3
): Promise<EstadoProveedor | null> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i === attempts) break;
      await sleep(400 * i);
    }
  }
  console.warn('refrescarEstadoProveedor tras guardar:', last);
  return null;
}

export default function ActualizarUbicacionScreen() {
  const insets = useSafeAreaInsets();
  const { estadoProveedor, refrescarEstadoProveedor } = useAuth();

  const hydrateFromEstado = useCallback((estado: EstadoProveedor | null) => {
    const tipo = estado?.tipo_proveedor;
    if (tipo !== 'mecanico' && tipo !== 'taller') return;
    const dp = estado?.datos_proveedor;
    if (!dp) return;
    skipDebounceRef.current = true;
    const text =
      (typeof dp.direccion === 'string' && dp.direccion.trim()) ||
      (dp.direccion_fisica?.direccion_completa && String(dp.direccion_fisica.direccion_completa).trim()) ||
      '';
    setAddressLine(text);
    setUbicacionDetectada(false);
    if (dp.ubicacion_lat != null && dp.ubicacion_lng != null) {
      const lat = Number(dp.ubicacion_lat);
      const lng = Number(dp.ubicacion_lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setCoords({ lat, lng });
      }
    } else {
      setCoords(null);
    }
  }, []);

  const [addressLine, setAddressLine] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [suggestions, setSuggestions] = useState<ChileAddressHit[]>([]);
  const [searchUi, setSearchUi] = useState<SearchUi>('idle');
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  /** Flujo tipo app usuarios: tras GPS mostramos bloque “detectada / editable”. */
  const [ubicacionDetectada, setUbicacionDetectada] = useState(false);

  const skipDebounceRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const estado = await refrescarEstadoProveedor();
          if (alive && estado) hydrateFromEstado(estado);
        } catch {
          /* perfil aún no disponible */
        }
      })();
      return () => {
        alive = false;
      };
    }, [refrescarEstadoProveedor, hydrateFromEstado])
  );

  useEffect(() => {
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      setSuggestions([]);
      setSearchUi('idle');
      return;
    }

    const q = addressLine.trim();
    if (q.length < MIN_QUERY) {
      setSuggestions([]);
      setSearchUi('idle');
      abortRef.current?.abort();
      return;
    }

    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setSearchUi('loading');
      try {
        const hits = await searchChileAddresses(q, { limit: 8, signal: ac.signal });
        if (ac.signal.aborted) return;
        setSuggestions(hits);
        setSearchUi(hits.length ? 'results' : 'empty');
      } catch {
        if (!ac.signal.aborted) setSearchUi('error');
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [addressLine]);

  const onPickSuggestion = (h: ChileAddressHit) => {
    Keyboard.dismiss();
    skipDebounceRef.current = true;
    setAddressLine(h.display_name);
    setCoords({ lat: h.lat, lng: h.lon });
    setUbicacionDetectada(true);
    setSuggestions([]);
    setSearchUi('idle');
  };

  const usarGps = async () => {
    try {
      setGpsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Activa la ubicación para usar el GPS.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      const { latitude, longitude } = loc.coords;
      skipDebounceRef.current = true;
      setCoords({ lat: latitude, lng: longitude });

      const rev = await reverseGeocodeProveedor(latitude, longitude);
      setAddressLine(rev.formattedLine);
      setUbicacionDetectada(true);
      setSuggestions([]);
      setSearchUi('idle');
    } catch {
      Alert.alert('GPS', 'No se pudo obtener la posición.');
    } finally {
      setGpsLoading(false);
    }
  };

  const guardar = async () => {
    const text = addressLine.trim();
    if (!text && !coords) {
      Alert.alert('Faltan datos', 'Escribe una dirección reconocida en Chile o usa el GPS.');
      return;
    }

    try {
      setSaving(true);
      const payload: { direccion?: string; latitud?: number; longitud?: number } = {};
      if (text) payload.direccion = text;
      if (coords) {
        payload.latitud = coords.lat;
        payload.longitud = coords.lng;
      }
      const tipo = estadoProveedor?.tipo_proveedor;
      await guardarUbicacionConReintentos(tipo, payload);
      const estadoFresh = await refrescarEstadoConReintentos(() => refrescarEstadoProveedor());
      if (estadoFresh) hydrateFromEstado(estadoFresh);
      setUbicacionDetectada(false);
      Alert.alert(
        'Listo',
        tipo === 'taller'
          ? 'La ubicación de tu taller quedó guardada. Los clientes te verán según la distancia desde su dirección.'
          : 'Tu ubicación base quedó guardada. Los clientes te verán ordenados por distancia.'
      );
    } catch (e: any) {
      Alert.alert('No se pudo guardar', humanSaveError(e));
    } finally {
      setSaving(false);
    }
  };

  const glassTint = Platform.OS === 'ios' ? ('light' as const) : ('dark' as const);
  const blurIntensity = Platform.OS === 'ios' ? 42 : 28;

  const hintSearch =
    searchUi === 'loading'
      ? 'Buscando direcciones…'
      : searchUi === 'empty'
        ? 'Sin coincidencias en Chile. Refina calle y número.'
        : searchUi === 'error'
          ? 'No pudimos consultar el mapa. Revisa la conexión.'
          : addressLine.trim().length >= MIN_QUERY
            ? 'Toca un resultado para fijar el punto en el mapa.'
            : `Escribe al menos ${MIN_QUERY} caracteres para buscar.`;

  const screenTitle =
    estadoProveedor?.tipo_proveedor === 'taller' ? 'Ubicación del taller' : 'Ubicación base';

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#F3F5F8', '#FAFBFC', '#FFFFFF']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title={screenTitle} showBack onBackPress={() => router.back()} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            paddingHorizontal: SPACING.container?.horizontal ?? SPACING.md ?? 16,
            paddingBottom: insets.bottom + 28,
            paddingTop: 8,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.glassOuter}>
            <BlurView intensity={blurIntensity} tint={glassTint} style={StyleSheet.absoluteFill} />
            <View style={styles.glassInner}>
              <View style={styles.heroRow}>
                <View style={styles.heroIcon}>
                  <MapPin size={22} color={COLORS.secondary?.[500] ?? '#007EA7'} />
                </View>
                <Text style={styles.heroText}>
                  Igual que cuando un cliente guarda su dirección: aquí defines el punto que usa la app de usuarios
                  para mostrarte en “Cerca de ti” y ordenar por distancia.
                </Text>
              </View>
            </View>
          </View>

          {/* Paso 1 (como app usuarios): ubicación por GPS primero */}
          <View style={[styles.glassOuter, { marginTop: 14 }]}>
            <BlurView intensity={blurIntensity} tint={glassTint} style={StyleSheet.absoluteFill} />
            <View style={styles.glassInner}>
              <TouchableOpacity
                style={[styles.heroGpsRow, gpsLoading && styles.btnDisabled]}
                onPress={usarGps}
                disabled={gpsLoading}
                activeOpacity={0.85}
              >
                <View style={styles.heroGpsIconWrap}>
                  {gpsLoading ? (
                    <ActivityIndicator color={COLORS.secondary?.[500] ?? '#007EA7'} />
                  ) : (
                    <Navigation size={24} color={COLORS.secondary?.[500] ?? '#007EA7'} />
                  )}
                </View>
                <View style={styles.heroGpsTextWrap}>
                  <Text style={styles.heroGpsTitle}>
                    {gpsLoading ? 'Obteniendo ubicación…' : 'Usar mi ubicación actual'}
                  </Text>
                  <Text style={styles.heroGpsSubtitle}>
                    Recomendado: detectamos la dirección con GPS (como en la app de usuarios).
                  </Text>
                </View>
                <ChevronRight size={20} color={COLORS.neutral?.gray?.[400] ?? '#9CA3AF'} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.glassOuter, { marginTop: 14 }]}>
            <BlurView intensity={blurIntensity} tint={glassTint} style={StyleSheet.absoluteFill} />
            <View style={styles.glassInner}>
              <Text style={styles.label}>O busca una dirección en Chile</Text>
              {ubicacionDetectada ? (
                <View style={styles.detectedBanner}>
                  <CheckCircle2 size={18} color="#059669" />
                  <Text style={styles.detectedBannerText}>
                    Ubicación detectada — revisa calle y número y corrige si hace falta (un solo registro, como
                    guardar tu dirección en la app de usuarios).
                  </Text>
                </View>
              ) : null}
              <TextInput
                style={styles.input}
                placeholder="Ej: Los Leones 1200, Providencia"
                placeholderTextColor={COLORS.neutral?.gray?.[400] ?? '#9CA3AF'}
                value={addressLine}
                onChangeText={setAddressLine}
                autoCorrect={false}
                autoCapitalize="words"
              />
              <Text style={styles.hint}>{hintSearch}</Text>

              {suggestions.length > 0 && (
                <View style={styles.suggestionsBox}>
                  {suggestions.map((item, idx) => (
                    <TouchableOpacity
                      key={`${item.lat}-${item.lon}-${idx}`}
                      style={styles.suggestionRow}
                      onPress={() => onPickSuggestion(item)}
                      activeOpacity={0.7}
                    >
                      <MapPin size={16} color={COLORS.primary?.[500] ?? '#003459'} />
                      <Text style={styles.suggestionText} numberOfLines={3}>
                        {item.display_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {coords && (
                <View style={styles.coordsPill}>
                  <CheckCircle2 size={16} color="#059669" />
                  <Text style={styles.coordsPillText}>
                    Punto listo · {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </Text>
                </View>
              )}

              {!coords && addressLine.trim().length >= MIN_QUERY && (
                <View style={styles.warnRow}>
                  <AlertCircle size={16} color="#D97706" />
                  <Text style={styles.warnText}>
                    Si no eliges un resultado ni usas GPS, al guardar intentaremos ubicar el texto automáticamente.
                  </Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, saving && styles.btnDisabled]}
            onPress={guardar}
            disabled={saving}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnPrimaryText}>
                {ubicacionDetectada
                  ? 'Confirmar y guardar'
                  : estadoProveedor?.tipo_proveedor === 'taller'
                    ? 'Guardar ubicación del taller'
                    : 'Guardar ubicación base'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const radiusMd = BORDERS?.radius?.md ?? 12;
const radiusLg = BORDERS?.radius?.lg ?? 16;

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  glassOuter: {
    borderRadius: radiusLg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 52, 89, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#00171F',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: { elevation: 3 },
    }),
  },
  glassInner: {
    padding: SPACING.md ?? 16,
    backgroundColor: 'rgba(255,255,255,0.52)',
  },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 168, 232, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
    fontSize: (TYPOGRAPHY?.fontSize?.sm ?? 14) as number,
    lineHeight: 20,
    color: COLORS.text?.secondary ?? '#4B5563',
    fontWeight: (TYPOGRAPHY?.fontWeight?.medium ?? '500') as any,
  },
  heroGpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  heroGpsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 168, 232, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGpsTextWrap: { flex: 1 },
  heroGpsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text?.primary ?? '#111827',
    marginBottom: 4,
  },
  heroGpsSubtitle: {
    fontSize: 12,
    color: COLORS.text?.tertiary ?? '#6B7280',
    lineHeight: 17,
  },
  detectedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
    padding: 12,
    borderRadius: radiusMd,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.28)',
  },
  detectedBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#047857',
    lineHeight: 18,
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text?.primary ?? '#111827',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0, 52, 89, 0.12)',
    borderRadius: radiusMd,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: COLORS.text?.primary ?? '#111827',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.text?.tertiary ?? '#6B7280',
    lineHeight: 17,
  },
  suggestionsBox: {
    marginTop: 12,
    maxHeight: 220,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: 'rgba(0, 52, 89, 0.08)',
    backgroundColor: 'rgba(255,255,255,0.65)',
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text?.primary ?? '#1F2937',
    lineHeight: 18,
  },
  btnPrimary: {
    marginTop: 20,
    borderRadius: radiusMd,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary?.[500] ?? '#007EA7',
    ...Platform.select({
      ios: {
        shadowColor: '#007EA7',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  btnDisabled: { opacity: 0.65 },
  coordsPill: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  coordsPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  warnRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  warnText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
});
