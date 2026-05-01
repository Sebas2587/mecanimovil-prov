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

/** Evita guardar solo "lat, lng" como dirección cuando ya hay texto legible (alineado con app usuarios). */
function looksLikeCoordOnlyLine(s: string): boolean {
  return /^-?\d{1,3}(?:\.\d+)?\s*,\s*-?\d{1,3}(?:\.\d+)?$/.test(s.trim());
}

function savedTextFromEstado(estado: EstadoProveedor | null): string {
  const tipo = estado?.tipo_proveedor;
  if (tipo !== 'mecanico' && tipo !== 'taller') return '';
  const dp = estado?.datos_proveedor;
  if (!dp) return '';
  const fromUser =
    (typeof dp.direccion === 'string' && dp.direccion.trim()) ||
    (dp.direccion_fisica?.direccion_completa && String(dp.direccion_fisica.direccion_completa).trim()) ||
    '';
  return fromUser;
}

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
    setSavedAddress(savedTextFromEstado(estado));
    setSearchQuery('');
    setSelectedLine(null);
    setSelectedCoords(null);
    setUbicacionDetectada(false);
    if (dp.ubicacion_lat != null && dp.ubicacion_lng != null) {
      const lat = Number(dp.ubicacion_lat);
      const lng = Number(dp.ubicacion_lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setSavedCoords({ lat, lng });
      } else {
        setSavedCoords(null);
      }
    } else {
      setSavedCoords(null);
    }
  }, []);

  /** Texto que viene del servidor (solo lectura), mismo criterio que EstadoProveedor. */
  const [savedAddress, setSavedAddress] = useState('');
  /** Coordenadas guardadas en backend (solo lectura / referencia). */
  const [savedCoords, setSavedCoords] = useState<{ lat: number; lng: number } | null>(null);
  /** Campo de búsqueda Nominatim (no mezclar con dirección guardada). */
  const [searchQuery, setSearchQuery] = useState('');
  /** Línea elegida por GPS o sugerencia (formato tipo app usuarios: calle, comuna, ciudad). */
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [suggestions, setSuggestions] = useState<ChileAddressHit[]>([]);
  const [searchUi, setSearchUi] = useState<SearchUi>('idle');
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  /** Flujo tipo app usuarios: tras GPS mostramos bloque “detectada / editable”. */
  const [ubicacionDetectada, setUbicacionDetectada] = useState(false);

  const skipDebounceRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const estadoRef = useRef(estadoProveedor);
  estadoRef.current = estadoProveedor;

  // Solo al enfocar la pantalla (no cuando cambia estado en contexto mientras editas).
  useFocusEffect(
    useCallback(() => {
      const e = estadoRef.current;
      if (e) hydrateFromEstado(e);
    }, [hydrateFromEstado])
  );

  useEffect(() => {
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      setSuggestions([]);
      setSearchUi('idle');
      return;
    }

    const q = searchQuery.trim();
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
  }, [searchQuery]);

  const onPickSuggestion = (h: ChileAddressHit) => {
    Keyboard.dismiss();
    skipDebounceRef.current = true;
    setSearchQuery('');
    setSelectedLine(h.display_name);
    setSelectedCoords({ lat: h.lat, lng: h.lon });
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
      setSearchQuery('');
      const rev = await reverseGeocodeProveedor(latitude, longitude);
      setSelectedLine(rev.formattedLine);
      setSelectedCoords({ lat: latitude, lng: longitude });
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
    const fromSelection = (selectedLine ?? '').trim();
    const fromSearch = searchQuery.trim();
    let direccionHumana = fromSelection || fromSearch;
    if (direccionHumana && looksLikeCoordOnlyLine(direccionHumana) && selectedCoords) {
      direccionHumana = '';
    }
    if (!direccionHumana && !selectedCoords) {
      Alert.alert(
        'Faltan datos',
        'Usa el GPS, elige un resultado de búsqueda o escribe una dirección en Chile (como en la app de usuarios).'
      );
      return;
    }

    try {
      setSaving(true);
      const payload: { direccion?: string; latitud?: number; longitud?: number } = {};
      if (direccionHumana) payload.direccion = direccionHumana;
      if (selectedCoords) {
        payload.latitud = selectedCoords.lat;
        payload.longitud = selectedCoords.lng;
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
          : searchQuery.trim().length >= MIN_QUERY
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
          <View style={[styles.glassOuter, { marginTop: 14 }]}>
            <BlurView intensity={blurIntensity} tint={glassTint} style={StyleSheet.absoluteFill} />
            <View style={styles.glassInner}>
              <Text style={styles.sectionLabel}>Dirección guardada</Text>
              <View style={styles.savedBox}>
                <Text style={styles.savedText}>
                  {savedAddress
                    ? savedAddress
                    : 'Sin texto de dirección aún. Tras guardar con GPS o búsqueda, aquí verás la misma línea que usa la app de usuarios.'}
                </Text>
                {savedCoords ? (
                  <Text style={styles.savedCoords}>
                    Punto guardado · {savedCoords.lat.toFixed(5)}, {savedCoords.lng.toFixed(5)}
                  </Text>
                ) : null}
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
                </View>
                <ChevronRight size={20} color={COLORS.neutral?.gray?.[400] ?? '#9CA3AF'} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.glassOuter, { marginTop: 14 }]}>
            <BlurView intensity={blurIntensity} tint={glassTint} style={StyleSheet.absoluteFill} />
            <View style={styles.glassInner}>
              {(selectedLine || selectedCoords) && (
                <View style={styles.pendingBlock}>
                  <View style={styles.pendingHeader}>
                    <Text style={styles.pendingTitle}>Cambio pendiente de guardar</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedLine(null);
                        setSelectedCoords(null);
                        setUbicacionDetectada(false);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.pendingClear}>Limpiar</Text>
                    </TouchableOpacity>
                  </View>
                  {selectedLine ? (
                    <Text style={styles.pendingLine}>{selectedLine}</Text>
                  ) : null}
                  {selectedCoords ? (
                    <Text style={styles.pendingCoords}>
                      GPS · {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
                    </Text>
                  ) : null}
                </View>
              )}

              <Text style={styles.label}>Buscar otra dirección en Chile</Text>
              {ubicacionDetectada ? (
                <View style={styles.detectedBanner}>
                  <CheckCircle2 size={18} color="#059669" />
                  <Text style={styles.detectedBannerText}>
                    Ubicación nueva lista — pulsa Guardar abajo para registrarla (mismo formato que en la app de
                    usuarios).
                  </Text>
                </View>
              ) : null}
              <TextInput
                style={styles.input}
                placeholder="Ej: Los Leones 1200, Providencia"
                placeholderTextColor={COLORS.neutral?.gray?.[400] ?? '#9CA3AF'}
                value={searchQuery}
                onChangeText={setSearchQuery}
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

              {!selectedCoords && searchQuery.trim().length >= MIN_QUERY && (
                <View style={styles.warnRow}>
                  <AlertCircle size={16} color="#D97706" />
                  <Text style={styles.warnText}>
                    Elige un resultado de la lista o usa GPS. Si solo escribes texto, al guardar el servidor intentará
                    ubicarlo en el mapa.
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
                {selectedLine || selectedCoords || searchQuery.trim()
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text?.primary ?? '#111827',
    marginBottom: 4,
  },
  savedHint: {
    fontSize: 12,
    color: COLORS.text?.tertiary ?? '#6B7280',
    marginBottom: 10,
    lineHeight: 17,
  },
  savedBox: {
    borderRadius: radiusMd,
    padding: 14,
    backgroundColor: 'rgba(0, 52, 89, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0, 52, 89, 0.1)',
  },
  savedText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.text?.primary ?? '#1F2937',
    fontWeight: '600',
  },
  savedCoords: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.text?.tertiary ?? '#6B7280',
    fontWeight: '500',
  },
  pendingBlock: {
    marginBottom: 14,
    padding: 12,
    borderRadius: radiusMd,
    backgroundColor: 'rgba(0, 168, 232, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 126, 167, 0.25)',
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pendingTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.secondary?.[600] ?? '#006586',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pendingClear: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.secondary?.[500] ?? '#007EA7',
  },
  pendingLine: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text?.primary ?? '#111827',
    fontWeight: '600',
  },
  pendingCoords: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.text?.secondary ?? '#4B5563',
    fontWeight: '500',
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
