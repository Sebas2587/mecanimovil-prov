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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS, withOpacity } from '@/app/design-system/tokens';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  agruparOfertasPorCatalogo,
  type ServicioCatalogoGrupo,
} from '@/utils/agruparOfertasPorCatalogo';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { navigateBack } from '@/utils/navigateBack';
import { TarifasMarcaListaDestacada } from '@/components/servicios/TarifasMarcaCatalogo';
import { etiquetaCantidadTarifas } from '@/utils/tarifasPorMarca';
import { MotoresAplicablesChips } from '@/components/servicios/MotoresAplicablesChips';
import { CategoriasServicioChips } from '@/components/servicios/CategoriasServicioChips';
import { extractMotoresServicio, labelTipoMotor } from '@/utils/tiposMotorCatalogo';
import {
  useMisServiciosQuery,
  type ServicioOfertaRow,
} from '@/hooks/useMisServiciosQuery';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const hx = SPACING.container.horizontal;

function categoriasDelGrupo(grupo: ServicioCatalogoGrupo<ServicioOfertaRow>) {
  const map = new Map<number, string>();
  for (const oferta of grupo.ofertas) {
    for (const cat of oferta.servicio_info?.categorias_info ?? []) {
      if (cat?.id && cat?.nombre?.trim()) {
        map.set(cat.id, cat.nombre.trim());
      }
    }
  }
  return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
}

const MisServiciosScreen = () => {
  const insets = useSafeAreaInsets();
  const { servicios, loading, isRefetching, refresh } = useMisServiciosQuery(true);
  const [serviciosFiltrados, setServiciosFiltrados] = useState<ServicioOfertaRow[]>([]);
  const [searchText, setSearchText] = useState('');

  const verDetalleServicio = (grupo: ServicioCatalogoGrupo<ServicioOfertaRow>) => {
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

  const aplicarFiltro = useCallback((texto: string, serviciosLista: ServicioOfertaRow[]) => {
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
      const motorMatch = labelTipoMotor(servicio.tipo_motor).toLowerCase().includes(textoLower);
      return nombreMatch || marcaMatch || tipoMatch || motorMatch;
    });
    setServiciosFiltrados(filtrados);
  }, []);

  useEffect(() => {
    aplicarFiltro(searchText, servicios);
  }, [searchText, servicios, aplicarFiltro]);

  const onRefresh = useCallback(async () => {
    try {
      await refresh();
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los servicios');
    }
  }, [refresh]);

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
            refreshing={isRefetching}
            onRefresh={onRefresh}
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

          <InstitutionalSectionHeader
            title={`Servicios (${totalLabel})${totalOfertas !== totalLabel ? ` · ${totalOfertas} ofertas` : ''}`}
            level="h4"
            style={styles.sectionHeader}
          />

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
                      <Text style={[styles.listCardTitle, styles.listCardTitleFlex]} numberOfLines={2}>
                        {grupo.representante.servicio_info.nombre}
                      </Text>
                      <EstadoDisponibilidadPill grupo={grupo} />
                    </View>
                    <View style={styles.listCardTagsRow}>
                      <CategoriasServicioChips
                        categorias={categoriasDelGrupo(grupo)}
                        embed
                      />
                      {grupo.motoresDistintos.length > 1 ? (
                        <MotoresAplicablesChips
                          motores={grupo.motoresDistintos}
                          variant="card"
                          embed
                        />
                      ) : (
                        <MotoresAplicablesChips
                          motores={extractMotoresServicio(grupo.representante.servicio_info)}
                          tipoMotorOferta={
                            grupo.motoresDistintos[0] ?? grupo.representante.tipo_motor
                          }
                          variant="card"
                          embed
                        />
                      )}
                    </View>
                    <Text style={styles.listCardTarifasHint}>
                      {etiquetaCantidadTarifas(grupo.tarifasPorMarca)}
                    </Text>
                    <EstadoDisponibilidadHint grupo={grupo} />
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
  listCardTitleFlex: {
    flex: 1,
    minWidth: 0,
  },
  listCardTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignContent: 'flex-start',
    gap: SPACING.fixed.xxs + 2,
    rowGap: SPACING.fixed.xxs + 2,
    width: '100%',
  },
  listCardTarifasHint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
    marginTop: SPACING.fixed.xxs,
  },
  disponibilidadHint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansRegular,
    color: I.muted,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.xs * 1.4),
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

function contarDisponibilidadGrupo(grupo: ServicioCatalogoGrupo<ServicioOferta>) {
  const total = grupo.ofertas.length;
  const activas = grupo.ofertas.filter((o) => o.disponible !== false).length;
  return { total, activas, pausadas: total - activas };
}

function EstadoDisponibilidadPill({ grupo }: { grupo: ServicioCatalogoGrupo<ServicioOferta> }) {
  const { total, activas, pausadas } = contarDisponibilidadGrupo(grupo);
  const todas = activas === total;
  const ninguna = activas === 0;
  const label = todas
    ? 'Activo'
    : ninguna
      ? 'Pausado'
      : `${activas}/${total} activas`;
  const pillStyle = todas
    ? styles.statusPillOn
    : ninguna
      ? styles.statusPillOff
      : styles.statusPillPartial;
  const textStyle = todas
    ? styles.statusPillTextOn
    : ninguna
      ? styles.statusPillTextOff
      : styles.statusPillTextPartial;

  return (
    <View style={[styles.statusPill, pillStyle]}>
      <Text style={[styles.statusPillText, textStyle]}>{label}</Text>
    </View>
  );
}

function EstadoDisponibilidadHint({ grupo }: { grupo: ServicioCatalogoGrupo<ServicioOferta> }) {
  const { total, activas, pausadas } = contarDisponibilidadGrupo(grupo);
  if (total <= 1) return null;
  if (activas === total || pausadas === total) return null;

  return (
    <Text style={styles.disponibilidadHint}>
      {pausadas} marca{pausadas !== 1 ? 's' : ''} pausada{pausadas !== 1 ? 's' : ''} · gestiona cada una en el detalle
    </Text>
  );
}

export default MisServiciosScreen;
