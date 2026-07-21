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
import { MapPin, Navigation, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react-native';
import Header from '@/components/Header';
import { useAuth } from '@/context/AuthContext';
import { mecanicoAPI, tallerAPI, type EstadoProveedor } from '@/services/api';
import {
  Card,
  HostPaperSection,
  HostSectionKicker,
  hostScreenStyles,
} from '@/app/design-system/components';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { searchChileAddresses, type ChileAddressHit } from '@/utils/chileNominatimSearch';
import { reverseGeocodeProveedor } from '@/utils/providerReverseGeocode';
import { useLocationConsentGate } from '@/hooks/useLocationConsentGate';
import LocationConsentModal from '@/components/legal/LocationConsentModal';

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
  const I = COLORS.institutional;
  const {
    modalVisible: locationConsentVisible,
    loading: locationConsentLoading,
    ensureLocationConsent,
    accept: acceptLocationConsent,
    decline: declineLocationConsent,
  } = useLocationConsentGate();

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
      const consented = await ensureLocationConsent();
      if (!consented) {
        Alert.alert('Ubicación', 'Necesitamos tu consentimiento para usar el GPS.');
        return;
      }
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
    <View style={[styles.root, { backgroundColor: I.canvas }]}>
      <LocationConsentModal
        visible={locationConsentVisible}
        loading={locationConsentLoading}
        onAccept={() => void acceptLocationConsent()}
        onDecline={declineLocationConsent}
      />
      <SafeAreaView style={[styles.safe, { backgroundColor: I.canvas }]} edges={['left', 'right', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title={screenTitle} showBack onBackPress={() => router.back()} />

        <ScrollView
          style={hostScreenStyles.scroll}
          contentContainerStyle={[
            hostScreenStyles.scrollInner,
            { paddingBottom: insets.bottom + 28 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <HostSectionKicker label="Dirección guardada" />
          <HostPaperSection>
            <View style={[styles.savedBox, { backgroundColor: I.surfaceSoft, borderColor: I.hairline }]}>
              <Text style={[styles.savedText, { color: I.ink }]}>
                {savedAddress
                  ? savedAddress
                  : 'Sin texto de dirección aún. Tras guardar con GPS o búsqueda, aquí verás la misma línea que usa la app de usuarios.'}
              </Text>
              {savedCoords ? (
                <Text style={[styles.savedCoords, { color: I.muted }]}>
                  Punto guardado · {savedCoords.lat.toFixed(5)}, {savedCoords.lng.toFixed(5)}
                </Text>
              ) : null}
            </View>
          </HostPaperSection>

          <HostSectionKicker label="Ubicación actual" />
          <Card elevated padding="host">
            <TouchableOpacity
              style={[styles.heroGpsRow, gpsLoading && styles.btnDisabled]}
              onPress={usarGps}
              disabled={gpsLoading}
              activeOpacity={0.85}
            >
              <View style={[styles.iconPlate, { backgroundColor: I.surfaceStrong }]}>
                {gpsLoading ? (
                  <ActivityIndicator color={I.primary} />
                ) : (
                  <Navigation size={22} color={I.ink} />
                )}
              </View>
              <View style={styles.heroGpsTextWrap}>
                <Text style={[styles.rowTitle, { color: I.ink }]}>
                  {gpsLoading ? 'Obteniendo ubicación…' : 'Usar mi ubicación actual'}
                </Text>
              </View>
              <ChevronRight size={20} color={I.muted} />
            </TouchableOpacity>
          </Card>

          <HostSectionKicker label="Buscar dirección" />
          <HostPaperSection>
            {(selectedLine || selectedCoords) && (
              <View style={[styles.pendingBlock, { backgroundColor: I.surfaceSoft, borderColor: I.hairline }]}>
                <View style={styles.pendingHeader}>
                  <Text style={[styles.pendingTitle, { color: I.muted }]}>Cambio pendiente de guardar</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedLine(null);
                      setSelectedCoords(null);
                      setUbicacionDetectada(false);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[styles.pendingClear, { color: I.primary }]}>Limpiar</Text>
                  </TouchableOpacity>
                </View>
                {selectedLine ? (
                  <Text style={[styles.pendingLine, { color: I.ink }]}>{selectedLine}</Text>
                ) : null}
                {selectedCoords ? (
                  <Text style={[styles.pendingCoords, { color: I.body }]}>
                    GPS · {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
                  </Text>
                ) : null}
              </View>
            )}

            <Text style={[styles.label, { color: I.ink }]}>Buscar otra dirección en Chile</Text>
            {ubicacionDetectada ? (
              <View style={[styles.detectedBanner, { backgroundColor: I.surfaceSoft, borderColor: I.hairline }]}>
                <CheckCircle2 size={18} color={I.semanticUp} />
                <Text style={[styles.detectedBannerText, { color: I.body }]}>
                  Ubicación nueva lista — pulsa Guardar abajo para registrarla (mismo formato que en la app de
                  usuarios).
                </Text>
              </View>
            ) : null}
            <TextInput
              style={[styles.input, { borderColor: I.hairline, color: I.ink, backgroundColor: I.surfaceSoft }]}
              placeholder="Ej: Los Leones 1200, Providencia"
              placeholderTextColor={I.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="words"
            />
            <Text style={[styles.hint, { color: I.muted }]}>{hintSearch}</Text>

            {suggestions.length > 0 && (
              <View style={[styles.suggestionsBox, { borderColor: I.hairline, backgroundColor: I.canvas }]}>
                {suggestions.map((item, idx) => (
                  <TouchableOpacity
                    key={`${item.lat}-${item.lon}-${idx}`}
                    style={styles.suggestionRow}
                    onPress={() => onPickSuggestion(item)}
                    activeOpacity={0.7}
                  >
                    <MapPin size={16} color={I.primary} />
                    <Text style={[styles.suggestionText, { color: I.ink }]} numberOfLines={3}>
                      {item.display_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {!selectedCoords && searchQuery.trim().length >= MIN_QUERY && (
              <View style={styles.warnRow}>
                <AlertCircle size={16} color={I.accentYellow} />
                <Text style={[styles.warnText, { color: I.body }]}>
                  Elige un resultado de la lista o usa GPS. Si solo escribes texto, al guardar el servidor intentará
                  ubicarlo en el mapa.
                </Text>
              </View>
            )}
          </HostPaperSection>

          <TouchableOpacity
            style={[
              styles.btnPrimary,
              { backgroundColor: I.primary },
              saving && styles.btnDisabled,
            ]}
            onPress={guardar}
            disabled={saving}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator color={I.onPrimary} />
            ) : (
              <Text style={[styles.btnPrimaryText, { color: I.onPrimary }]}>
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
  heroGpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  iconPlate: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGpsTextWrap: { flex: 1 },
  rowTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
  },
  detectedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
    padding: 12,
    borderRadius: radiusMd,
    borderWidth: BORDERS.width.thin,
  },
  detectedBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontWeight: TYPOGRAPHY.fontWeight.regular as '400',
    lineHeight: 18,
  },
  savedBox: {
    borderRadius: radiusMd,
    padding: 14,
    borderWidth: BORDERS.width.thin,
  },
  savedText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    lineHeight: 22,
  },
  savedCoords: {
    marginTop: 10,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.monoMedium,
    fontWeight: TYPOGRAPHY.fontWeight.medium as '500',
  },
  pendingBlock: {
    marginBottom: 14,
    padding: 12,
    borderRadius: radiusMd,
    borderWidth: BORDERS.width.thin,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pendingTitle: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
  },
  pendingClear: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
  },
  pendingLine: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    lineHeight: 20,
  },
  pendingCoords: {
    marginTop: 6,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.monoMedium,
    fontWeight: TYPOGRAPHY.fontWeight.medium as '500',
  },
  label: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: radiusMd,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    lineHeight: 17,
  },
  suggestionsBox: {
    marginTop: 12,
    maxHeight: 220,
    borderRadius: radiusMd,
    borderWidth: 1,
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
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    lineHeight: 18,
  },
  btnPrimary: {
    marginTop: 20,
    borderRadius: BORDERS.radius.pill,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.editorial,
  },
  btnPrimaryText: {
    fontSize: TYPOGRAPHY.styles.button.fontSize,
    lineHeight: Math.round(TYPOGRAPHY.styles.button.fontSize * TYPOGRAPHY.styles.button.lineHeight),
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.styles.button.fontWeight as '600',
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
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    lineHeight: 17,
  },
});
