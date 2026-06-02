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
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS, withOpacity } from '@/app/design-system/tokens';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  agruparOfertasPorCatalogo,
  type ServicioCatalogoGrupo,
} from '@/utils/agruparOfertasPorCatalogo';
import { navigateBack } from '@/utils/navigateBack';
import { parseMisMarcasResponse } from '@/utils/parseMisMarcasResponse';
import { TarifasMarcaListaDestacada } from '@/components/servicios/TarifasMarcaCatalogo';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const hx = SPACING.container.horizontal;
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

const MisServiciosScreen = () => {
  const insets = useSafeAreaInsets();
  const [servicios, setServicios] = useState<ServicioOferta[]>([]);
  const [serviciosFiltrados, setServiciosFiltrados] = useState<ServicioOferta[]>([]);
  const marcasLookupRef = React.useRef<Map<number, MarcaProveedorRow>>(new Map());
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
      const marcasParsed = parseMisMarcasResponse(resMarcas?.data ?? resMarcas);
      const marcasArr = marcasParsed.marcas as MarcaProveedorRow[];
      marcasLookupRef.current = new Map(marcasArr.map((m) => [m.id, m]));
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

  const verDetalleServicio = (grupo: ServicioCatalogoGrupo<ServicioOferta>) => {
    router.push({
      pathname: '/servicio-resumen/[id]' as any,
      params: {
        id: grupo.representante.id.toString(),
        servicioData: JSON.stringify(grupo.representante),
        ofertasGrupo: JSON.stringify(grupo.ofertasGrupo),
        ofertasCatalogo: JSON.stringify(grupo.ofertas),
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

  const gruposOrdenados = useMemo(
    () => agruparOfertasPorCatalogo(serviciosFiltrados),
    [serviciosFiltrados]
  );

  const totalLabel = searchText
    ? gruposOrdenados.length
    : agruparOfertasPorCatalogo(servicios).length;
  const totalOfertas = searchText ? serviciosFiltrados.length : servicios.length;

  const handleBack = useCallback(() => {
    navigateBack('/(tabs)');
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <Header
          title="Mis servicios"
          showBack
          onBackPress={handleBack}
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
        onBackPress={handleBack}
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
              <InstitutionalIcon name="search" size={20} color={I.muted}  strokeWidth={ICON_STROKE_WIDTH} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre, marca o tipo…"
                placeholderTextColor={I.mutedSoft}
                value={searchText}
                onChangeText={setSearchText}
              />
              {searchText.length > 0 ? (
                <TouchableOpacity onPress={() => setSearchText('')} hitSlop={12}>
                  <InstitutionalIcon name="close-circle" size={22} color={I.muted}  strokeWidth={ICON_STROKE_WIDTH} />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/crear-servicio')}
              activeOpacity={0.88}
              accessibilityLabel="Agregar servicio"
            >
              <InstitutionalIcon name="add" size={20} color={I.ink}  strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.addButtonText}>Agregar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Servicios ({totalLabel}){totalOfertas !== totalLabel ? ` · ${totalOfertas} ofertas` : ''}
            </Text>
          </View>

          {servicios.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <InstitutionalIcon name="construct-outline" size={48} color={I.muted}  strokeWidth={ICON_STROKE_WIDTH} />
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
                <InstitutionalIcon name="add-circle-outline" size={22} color={I.onPrimary}  strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.primaryCtaText}>Crear mi primer servicio</Text>
              </TouchableOpacity>
            </View>
          ) : serviciosFiltrados.length > 0 ? (
            gruposOrdenados.map((grupo) => (
              <TouchableOpacity
                key={grupo.key}
                style={styles.listCard}
                onPress={() => verDetalleServicio(grupo)}
                activeOpacity={0.88}
              >
                <View style={styles.listCardBody}>
                  <View style={styles.listCardTopRow}>
                    <View style={styles.listCardTitleRow}>
                      <Text style={styles.listCardTitle} numberOfLines={2}>
                        {grupo.representante.servicio_info.nombre}
                      </Text>
                      <EstadoDisponibilidadPill grupo={grupo} />
                    </View>
                    <Text style={styles.listCardTarifasHint}>
                      {grupo.tarifasPorMarca.length > 1
                        ? 'Precio por marca configurada'
                        : 'Precio publicado'}
                    </Text>
                    <TarifasMarcaListaDestacada
                      tarifas={grupo.tarifasPorMarca}
                      ofertas={grupo.ofertas}
                    />
                  </View>
                  <Text style={styles.listCardMeta}>
                    Actualizado {formatearFecha(grupo.fechaReciente)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noResults}>
              <InstitutionalIcon name="search-outline" size={44} color={I.muted}  strokeWidth={ICON_STROKE_WIDTH} />
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
    gap: SPACING.fixed.xs,
  },
  listCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
    gap: SPACING.fixed.sm,
  },
  listCardTarifasHint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
    marginTop: SPACING.fixed.xxs,
  },
  marcasBadgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xxs,
    maxWidth: '100%',
  },
  marcaBadgeCompact: {
    paddingHorizontal: SPACING.fixed.xs,
    paddingVertical: 2,
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
  listCardMeta: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansRegular,
    color: I.muted,
    marginTop: SPACING.fixed.xs,
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
  statusPillPartial: {
    backgroundColor: withOpacity(I.accentYellow, 0.18),
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
  statusPillTextPartial: {
    color: I.ink,
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

function EstadoDisponibilidadPill({ grupo }: { grupo: ServicioCatalogoGrupo<ServicioOferta> }) {
  const todas = grupo.todasDisponibles;
  const alguna = grupo.algunaDisponible;
  const label = todas ? 'Activo' : alguna ? 'Parcial' : 'Inactivo';
  const pillStyle = todas
    ? styles.statusPillOn
    : alguna
      ? styles.statusPillPartial
      : styles.statusPillOff;
  const textStyle = todas
    ? styles.statusPillTextOn
    : alguna
      ? styles.statusPillTextPartial
      : styles.statusPillTextOff;

  return (
    <View style={[styles.statusPill, pillStyle]}>
      <Text style={[styles.statusPillText, textStyle]}>{label}</Text>
    </View>
  );
}

export default MisServiciosScreen;
