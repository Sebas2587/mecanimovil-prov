import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS, withOpacity } from '@/app/design-system/tokens';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const hx = SPACING.container.horizontal;
const TY = TYPOGRAPHY.styles;

interface ServicioOferta {
  id: number;
  servicio: number;
  servicio_info: {
    id: number;
    nombre: string;
    descripcion: string;
    requiere_repuestos: boolean;
    foto: string | null;
  };
  marca_vehiculo_seleccionada: number | null;
  marca_vehiculo_info: {
    id: number;
    nombre: string;
    logo: string | null;
  } | null;
  tipo_servicio: 'con_repuestos' | 'sin_repuestos';
  disponible: boolean;
  duracion_estimada: string | null;
  incluye_garantia: boolean;
  duracion_garantia: number;
  detalles_adicionales: string | null;
  repuestos_seleccionados: any[];
  repuestos_info: any[];
  costo_mano_de_obra_sin_iva: string;
  costo_repuestos_sin_iva: string;
  precio_publicado_cliente: string;
  comision_mecanmovil: string;
  iva_sobre_comision: string;
  ganancia_neta_proveedor: string;
  desglose_precios: {
    costo_total_sin_iva: number;
    iva_19_porciento: number;
    precio_final_cliente: number;
    comision_mecanmovil_20_porciento: number;
    iva_sobre_comision: number;
    ganancia_neta_proveedor: number;
    monto_transferido: number;
  };
  fecha_creacion: string;
  ultima_actualizacion: string;
  fotos_urls: string[];
}

type MarcaProveedorRow = { id: number; nombre: string; logo?: string | null };

/** Completa marca_vehiculo_info cuando la API devuelve FK pero el objeto anidado falta o está vacío. */
function enriquecerOfertasConMarcas(
  ofertas: ServicioOferta[],
  marcasProveedor: MarcaProveedorRow[]
): ServicioOferta[] {
  const byId = new Map(marcasProveedor.map((m) => [m.id, m]));
  return ofertas.map((s) => {
    if (s.marca_vehiculo_info?.nombre?.trim()) {
      return s;
    }
    const raw = s.marca_vehiculo_seleccionada;
    const mid = typeof raw === 'number' ? raw : raw != null ? Number(raw) : NaN;
    if (!Number.isFinite(mid) || mid <= 0) {
      return s;
    }
    const m = byId.get(mid);
    const nombre = m?.nombre?.trim();
    if (!nombre) {
      return s;
    }
    return {
      ...s,
      marca_vehiculo_info: {
        id: mid,
        nombre,
        logo: m?.logo != null ? m.logo : null,
      },
    };
  });
}

function montoPrecioPublicoCLP(servicio: ServicioOferta): number | null {
  const d = servicio.desglose_precios?.precio_final_cliente;
  if (typeof d === 'number' && Number.isFinite(d) && d >= 0) {
    return d;
  }
  const raw = String(servicio.precio_publicado_cliente ?? '').trim().replace(',', '.');
  const p = parseFloat(raw);
  if (!Number.isFinite(p) || p < 0) {
    return null;
  }
  return p;
}

function formatearPrecioCLP(valor: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Math.round(valor));
}

const MisServiciosScreen = () => {
  const insets = useSafeAreaInsets();
  const [servicios, setServicios] = useState<ServicioOferta[]>([]);
  const [serviciosFiltrados, setServiciosFiltrados] = useState<ServicioOferta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

  const fetchServicios = useCallback(async () => {
    try {
      const { serviciosAPI } = await import('@/services/api');
      const [resServicios, resMarcas] = await Promise.all([
        serviciosAPI.obtenerMisServicios(),
        serviciosAPI.obtenerMisMarcas().catch(() => ({ data: [] as MarcaProveedorRow[] })),
      ]);
      const raw = resServicios.data?.results || resServicios.data || [];
      const lista = Array.isArray(raw) ? raw : [];
      const marcasArr = Array.isArray(resMarcas.data) ? (resMarcas.data as MarcaProveedorRow[]) : [];
      const serviciosData = enriquecerOfertasConMarcas(lista, marcasArr);
      setServicios(serviciosData);
      setServiciosFiltrados(serviciosData);
    } catch (error) {
      console.error('❌ Error cargando servicios:', error);
      Alert.alert('Error', 'No se pudieron cargar los servicios');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchServicios();
    }, [fetchServicios])
  );

  const verDetalleServicio = (servicio: ServicioOferta) => {
    router.push({
      pathname: '/servicio-resumen/[id]' as any,
      params: {
        id: servicio.id.toString(),
        servicioData: JSON.stringify(servicio),
      },
    });
  };

  const aplicarFiltro = useCallback((texto: string, serviciosLista: ServicioOferta[]) => {
    if (!texto.trim()) {
      setServiciosFiltrados(serviciosLista);
      return;
    }
    const textoLower = texto.toLowerCase().trim();
    const filtrados = serviciosLista.filter((servicio) => {
      const nombreMatch = servicio.servicio_info.nombre.toLowerCase().includes(textoLower);
      const marcaMatch = servicio.marca_vehiculo_info?.nombre.toLowerCase().includes(textoLower);
      const tipoMatch =
        servicio.tipo_servicio === 'con_repuestos'
          ? 'con repuestos'.includes(textoLower)
          : 'sin repuestos'.includes(textoLower);
      return nombreMatch || marcaMatch || tipoMatch;
    });
    setServiciosFiltrados(filtrados);
  }, []);

  useEffect(() => {
    aplicarFiltro(searchText, servicios);
  }, [searchText, servicios, aplicarFiltro]);

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const listaOrdenada = useMemo(
    () =>
      [...serviciosFiltrados].sort((a, b) =>
        (a.servicio_info?.nombre || '').localeCompare(b.servicio_info?.nombre || '', 'es', {
          sensitivity: 'base',
        })
      ),
    [serviciosFiltrados]
  );

  const totalLabel = searchText ? serviciosFiltrados.length : servicios.length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <Header
          title="Mis servicios"
          showBack
          onBackPress={() => router.back()}
          backgroundColor={I.canvas}
          titleColor={I.ink}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={I.primary} />
          <Text style={styles.loadingText}>Cargando tus servicios…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: 'Mis Servicios', headerShown: false }} />
      <Header
        title="Mis servicios"
        showBack
        onBackPress={() => router.back()}
        backgroundColor={I.canvas}
        titleColor={I.ink}
      />

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.fixed.lg }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchServicios();
            }}
            tintColor={I.primary}
          />
        }
      >
        <View style={[styles.content, { paddingHorizontal: hx }]}>
          <View style={styles.searchRow}>
            <View style={styles.searchField}>
              <Ionicons name="search" size={20} color={I.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre, marca o tipo…"
                placeholderTextColor={I.mutedSoft}
                value={searchText}
                onChangeText={setSearchText}
              />
              {searchText.length > 0 ? (
                <TouchableOpacity onPress={() => setSearchText('')} hitSlop={12}>
                  <Ionicons name="close-circle" size={22} color={I.muted} />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/crear-servicio')}
              activeOpacity={0.88}
              accessibilityLabel="Agregar servicio"
            >
              <MaterialIcons name="add" size={20} color={I.ink} />
              <Text style={styles.addButtonText}>Agregar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Servicios ({totalLabel})</Text>
          </View>

          {servicios.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="construct-outline" size={48} color={I.muted} />
              </View>
              <Text style={styles.emptyTitle}>No tienes servicios publicados</Text>
              <Text style={styles.emptySubtitle}>
                Crea tu primer servicio para empezar a recibir solicitudes de clientes.
              </Text>
              <TouchableOpacity
                style={styles.primaryCta}
                onPress={() => router.push('/crear-servicio')}
                activeOpacity={0.88}
              >
                <MaterialIcons name="add-circle-outline" size={22} color={I.onPrimary} />
                <Text style={styles.primaryCtaText}>Crear mi primer servicio</Text>
              </TouchableOpacity>
            </View>
          ) : serviciosFiltrados.length > 0 ? (
            listaOrdenada.map((servicio) => (
              <TouchableOpacity
                key={servicio.id}
                style={styles.listCard}
                onPress={() => verDetalleServicio(servicio)}
                activeOpacity={0.88}
              >
                <View style={styles.listCardBody}>
                  <View style={styles.listCardTopRow}>
                    <View style={styles.listCardTitleWrap}>
                      <Text style={styles.listCardTitle} numberOfLines={2}>
                        {servicio.servicio_info.nombre}
                      </Text>
                    </View>
                    <View style={styles.listCardPillsRow}>
                      <View style={styles.marcaBadgeCell}>
                        <MarcaBadge servicio={servicio} />
                      </View>
                      <View
                        style={[
                          styles.statusPill,
                          servicio.disponible ? styles.statusPillOn : styles.statusPillOff,
                        ]}
                      >
                        <Text style={[styles.statusPillText, servicio.disponible ? styles.statusPillTextOn : styles.statusPillTextOff]}>
                          {servicio.disponible ? 'Activo' : 'Inactivo'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.listCardBottomRow}>
                    <Text style={styles.listCardMeta}>{formatearFecha(servicio.fecha_creacion)}</Text>
                    <PrecioPublicoMonto servicio={servicio} />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={44} color={I.muted} />
              <Text style={styles.noResultsTitle}>Sin resultados</Text>
              <Text style={styles.noResultsSub}>Prueba otros términos de búsqueda.</Text>
              <TouchableOpacity style={styles.secondaryCta} onPress={() => setSearchText('')} activeOpacity={0.88}>
                <Text style={styles.secondaryCtaText}>Limpiar búsqueda</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.fixed.xl,
  },
  loadingText: {
    marginTop: SPACING.fixed.md,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  content: {
    paddingTop: SPACING.fixed.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.md,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.sm,
    ...SHADOWS.editorial,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.ink,
    padding: 0,
  },
  /** Secundario institucional: surfaceStrong + ink (doc DESIGN_PROVEEDORES_INSTITUCIONAL) */
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.xxs + 2,
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.sm + 2,
    minHeight: 48,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  addButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  sectionHeader: {
    marginBottom: SPACING.fixed.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  listCard: {
    width: '100%',
    flexDirection: 'column',
    backgroundColor: I.canvas,
    paddingVertical: SPACING.fixed.md,
    paddingHorizontal: SPACING.fixed.md,
    marginBottom: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    ...SHADOWS.editorial,
  },
  listCardBody: {
    width: '100%',
    gap: SPACING.fixed.sm,
  },
  listCardTopRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: SPACING.fixed.sm,
  },
  listCardPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: SPACING.fixed.sm,
  },
  marcaBadgeCell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
  },
  listCardTitleWrap: {
    width: '100%',
  },
  listCardTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.md * 1.35),
  },
  listCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
  listCardMeta: {
    flex: 1,
    minWidth: 0,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  precioPublicoWrap: {
    alignItems: 'flex-end',
    flexShrink: 0,
    maxWidth: '52%',
  },
  precioPublicoMonto: {
    fontSize: TY.numberDisplay.fontSize,
    fontFamily: FF.monoMedium,
    fontWeight: TY.numberDisplay.fontWeight,
    lineHeight: Math.round(TY.numberDisplay.fontSize * Number(TY.numberDisplay.lineHeight)),
    color: I.ink,
    letterSpacing: TY.numberDisplay.letterSpacing,
    textAlign: 'right',
  },
  precioPublicoMontoVacío: {
    fontSize: TY.small.fontSize,
    fontFamily: FF.sansRegular,
    fontWeight: TY.small.fontWeight,
    lineHeight: Math.round(TY.small.fontSize * Number(TY.small.lineHeight)),
    color: I.muted,
    textAlign: 'right',
  },
  marcaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.fixed.xxs,
    paddingHorizontal: SPACING.fixed.xs + 2,
    paddingVertical: SPACING.fixed.xxs + 2,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: withOpacity(I.primary, 0.08),
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.primary, 0.22),
  },
  /** Tope del texto del chip (~200): 4×`fixed.2xl` + `fixed.xs` (tokens), sin estirar el pill a todo el ancho. */
  marcaBadgeTextCol: {
    maxWidth: SPACING.fixed['2xl'] * 4 + SPACING.fixed.xs,
    flexShrink: 1,
  },
  marcaBadgeGenerico: {
    backgroundColor: I.surfaceStrong,
    borderColor: I.hairline,
  },
  marcaBadgeLogo: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  marcaBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    color: I.primary,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.xs * 1.35),
  },
  marcaBadgeTextGenerico: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    color: I.muted,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.xs * 1.35),
  },
  statusPill: {
    paddingHorizontal: SPACING.fixed.xs + 2,
    paddingVertical: SPACING.fixed.xxs + 2,
    borderRadius: BORDERS.radius.pill,
    flexShrink: 0,
  },
  statusPillOn: {
    backgroundColor: withOpacity(I.semanticUp, 0.14),
  },
  statusPillOff: {
    backgroundColor: withOpacity(I.semanticDown, 0.1),
  },
  statusPillText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.xs * 1.35),
  },
  statusPillTextOn: {
    color: I.semanticUp,
  },
  statusPillTextOff: {
    color: I.semanticDown,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.fixed['2xl'],
    paddingHorizontal: SPACING.fixed.md,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: I.surfaceStrong,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.fixed.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginBottom: SPACING.fixed.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.body,
    textAlign: 'center',
    lineHeight: Math.round(TYPOGRAPHY.fontSize.base * TYPOGRAPHY.lineHeight.normal),
    marginBottom: SPACING.fixed.lg,
    maxWidth: 300,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    backgroundColor: I.primary,
    paddingHorizontal: SPACING.fixed.xl,
    paddingVertical: SPACING.fixed.md,
    borderRadius: BORDERS.radius.pill,
  },
  primaryCtaText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.onPrimary,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: SPACING.fixed['2xl'],
    paddingHorizontal: SPACING.fixed.lg,
  },
  noResultsTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginTop: SPACING.fixed.md,
    marginBottom: SPACING.fixed.xs,
  },
  noResultsSub: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.muted,
    textAlign: 'center',
    marginBottom: SPACING.fixed.lg,
  },
  secondaryCta: {
    paddingHorizontal: SPACING.fixed.lg,
    paddingVertical: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  secondaryCtaText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
});

function PrecioPublicoMonto({ servicio }: { servicio: ServicioOferta }) {
  const monto = montoPrecioPublicoCLP(servicio);
  return (
    <View style={styles.precioPublicoWrap}>
      {monto != null ? (
        <Text style={styles.precioPublicoMonto} numberOfLines={1}>
          {formatearPrecioCLP(monto)}
        </Text>
      ) : (
        <Text style={styles.precioPublicoMontoVacío} numberOfLines={1}>
          —
        </Text>
      )}
    </View>
  );
}

function MarcaBadge({ servicio }: { servicio: ServicioOferta }) {
  const info = servicio.marca_vehiculo_info;
  const nombre = info?.nombre?.trim();
  const logoUri = info?.logo?.trim();

  if (nombre) {
    return (
      <View style={styles.marcaBadge}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.marcaBadgeLogo} contentFit="contain" />
        ) : (
          <Ionicons name="car-sport-outline" size={11} color={I.primary} />
        )}
        <View style={styles.marcaBadgeTextCol}>
          <Text style={styles.marcaBadgeText} numberOfLines={2}>
            {nombre}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.marcaBadge, styles.marcaBadgeGenerico]}>
      <Ionicons name="albums-outline" size={11} color={I.muted} />
      <View style={styles.marcaBadgeTextCol}>
        <Text style={styles.marcaBadgeTextGenerico} numberOfLines={2}>
          Cualquier marca
        </Text>
      </View>
    </View>
  );
}

export default MisServiciosScreen;
