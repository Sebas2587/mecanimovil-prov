import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X, Wrench, ChevronRight } from 'lucide-react-native';
import Header from '@/components/Header';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import {
  HostPaperSection,
  HostSectionKicker,
  InstitutionalButton,
  InstitutionalTag,
  hostScreenStyles,
} from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  agruparOfertasPorCatalogo,
  type ServicioCatalogoGrupo,
} from '@/utils/agruparOfertasPorCatalogo';
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
import { showAlert } from '@/utils/platformAlert';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;

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

function contarDisponibilidadGrupo(grupo: ServicioCatalogoGrupo<ServicioOfertaRow>) {
  const total = grupo.ofertas.length;
  const activas = grupo.ofertas.filter((o) => o.disponible !== false).length;
  return { total, activas, pausadas: total - activas };
}

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

type CardProps = {
  grupo: ServicioCatalogoGrupo<ServicioOfertaRow>;
  onPress: (grupo: ServicioCatalogoGrupo<ServicioOfertaRow>) => void;
};

const ServicioCatalogoCard = memo(function ServicioCatalogoCard({ grupo, onPress }: CardProps) {
  const { total, activas, pausadas } = contarDisponibilidadGrupo(grupo);
  const todas = activas === total;
  const ninguna = activas === 0;
  const statusLabel = todas ? 'Activo' : ninguna ? 'Pausado' : `${activas}/${total} activas`;
  const statusVariant = todas ? 'success' : ninguna ? 'error' : 'warning';

  return (
    <HostPaperSection style={styles.listCard} onPress={() => onPress(grupo)}>
      <View style={styles.listCardTitleRow}>
        <Text style={styles.listCardTitle} numberOfLines={2}>
          {grupo.representante.servicio_info.nombre}
        </Text>
        <View style={styles.titleTrailing}>
          <InstitutionalTag label={statusLabel} variant={statusVariant} size="sm" />
          <ChevronRight size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
        </View>
      </View>

      <View style={styles.listCardTagsRow}>
        <CategoriasServicioChips categorias={categoriasDelGrupo(grupo)} embed />
        {grupo.motoresDistintos.length > 1 ? (
          <MotoresAplicablesChips motores={grupo.motoresDistintos} variant="card" embed />
        ) : (
          <MotoresAplicablesChips
            motores={extractMotoresServicio(grupo.representante.servicio_info)}
            tipoMotorOferta={grupo.motoresDistintos[0] ?? grupo.representante.tipo_motor}
            variant="card"
            embed
          />
        )}
      </View>

      <Text style={styles.tarifasHint}>{etiquetaCantidadTarifas(grupo.tarifasPorMarca)}</Text>

      {total > 1 && activas > 0 && pausadas > 0 ? (
        <Text style={styles.disponibilidadHint}>
          {pausadas} marca{pausadas !== 1 ? 's' : ''} pausada{pausadas !== 1 ? 's' : ''} · gestiona
          cada una en el detalle
        </Text>
      ) : null}

      <TarifasMarcaListaDestacada tarifas={grupo.tarifasPorMarca} ofertas={grupo.ofertas} />

      <Text style={styles.listCardMeta}>Actualizado {formatearFecha(grupo.fechaReciente)}</Text>
    </HostPaperSection>
  );
});

/** Tablet / web ancho: 2 cards por fila; móvil: 1. */
const GRID_BREAKPOINT = 700;

const MisServiciosScreen = () => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const columns = windowWidth >= GRID_BREAKPOINT ? 2 : 1;
  const { servicios, loading, isRefetching, refresh } = useMisServiciosQuery(true);
  const [serviciosFiltrados, setServiciosFiltrados] = useState<ServicioOfertaRow[]>([]);
  const [searchText, setSearchText] = useState('');

  const verDetalleServicio = useCallback((grupo: ServicioCatalogoGrupo<ServicioOfertaRow>) => {
    router.push({
      pathname: '/servicio-resumen/[id]' as any,
      params: {
        id: grupo.representante.id.toString(),
        servicioData: JSON.stringify(grupo.representante),
        ofertasGrupo: JSON.stringify(grupo.ofertasGrupo),
        ofertasCatalogo: JSON.stringify(grupo.ofertas),
      },
    });
  }, []);

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
      showAlert('Error', 'No se pudieron cargar los servicios');
    }
  }, [refresh]);

  const gruposOrdenados = useMemo(
    () => agruparOfertasPorCatalogo(serviciosFiltrados),
    [serviciosFiltrados],
  );

  const totalLabel = searchText
    ? gruposOrdenados.length
    : agruparOfertasPorCatalogo(servicios).length;
  const totalOfertas = searchText ? serviciosFiltrados.length : servicios.length;

  const handleBack = useCallback(() => {
    navigateBack('/(tabs)');
  }, []);

  const goCrear = useCallback(() => {
    router.push('/crear-servicio');
  }, []);

  const listHeader = (
    <>
      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <Search size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, marca o tipo…"
            placeholderTextColor={I.mutedSoft}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={12} accessibilityLabel="Limpiar">
              <X size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
          ) : null}
        </View>
        <InstitutionalButton
          label="Agregar"
          variant="secondary"
          size="compact"
          onPress={goCrear}
          accessibilityLabel="Agregar servicio"
          style={styles.addBtn}
        />
      </View>

      <HostSectionKicker
        label={`Servicios (${totalLabel})${totalOfertas !== totalLabel ? ` · ${totalOfertas} ofertas` : ''}`}
        style={styles.kickerFlush}
      />
    </>
  );

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

      <FlatList
        key={`mis-servicios-cols-${columns}`}
        style={hostScreenStyles.scroll}
        data={servicios.length === 0 ? [] : gruposOrdenados}
        keyExtractor={(item) => item.key}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
        renderItem={({ item }) => (
          <View style={styles.gridCell}>
            <ServicioCatalogoCard grupo={item} onPress={verDetalleServicio} />
          </View>
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          servicios.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Wrench size={28} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              </View>
              <Text style={styles.emptyTitle}>No tienes servicios publicados</Text>
              <Text style={styles.emptySubtitle}>
                Crea tu primer servicio para empezar a recibir solicitudes de clientes.
              </Text>
              <InstitutionalButton
                label="Crear mi primer servicio"
                variant="primary"
                onPress={goCrear}
              />
            </View>
          ) : (
            <View style={styles.noResults}>
              <Search size={36} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.noResultsTitle}>Sin resultados</Text>
              <Text style={styles.noResultsSub}>Prueba otros términos de búsqueda.</Text>
              <InstitutionalButton
                label="Limpiar búsqueda"
                variant="secondary"
                size="compact"
                onPress={() => setSearchText('')}
              />
            </View>
          )
        }
        contentContainerStyle={[
          hostScreenStyles.scrollInner,
          { paddingBottom: insets.bottom + SPACING.fixed.lg },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={I.primary} />
        }
        removeClippedSubviews
        maxToRenderPerBatch={8}
        windowSize={7}
        initialNumToRender={6}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: I.canvas,
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    paddingHorizontal: SPACING.fixed.md,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.ink,
    paddingVertical: SPACING.fixed.sm,
    ...( { outlineStyle: 'none' } as object),
  },
  addBtn: {
    flexShrink: 0,
  },
  kickerFlush: {
    marginTop: SPACING.fixed.xs,
  },
  gridRow: {
    gap: SPACING.fixed.sm,
    alignItems: 'stretch',
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
  },
  listCard: {
    flex: 1,
    marginBottom: SPACING.fixed.sm,
  },
  listCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  listCardTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: TS.h4.fontSize,
    lineHeight: Math.round(TS.h4.fontSize * TS.h4.lineHeight),
    fontFamily: FF.sansSemiBold,
    fontWeight: '600',
    letterSpacing: TS.h4.letterSpacing ?? 0,
    color: I.ink,
  },
  titleTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    flexShrink: 0,
  },
  listCardTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.fixed.xxs + 2,
    marginBottom: SPACING.fixed.xs,
  },
  tarifasHint: {
    fontSize: TS.caption.fontSize,
    fontFamily: FF.sansMedium,
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    lineHeight: Math.round(TS.caption.fontSize * TS.caption.lineHeight),
    marginBottom: SPACING.fixed.xxs,
  },
  disponibilidadHint: {
    fontSize: TS.caption.fontSize,
    fontFamily: FF.sansRegular,
    color: I.muted,
    lineHeight: Math.round(TS.caption.fontSize * TS.caption.lineHeight),
    marginBottom: SPACING.fixed.xxs,
  },
  listCardMeta: {
    fontSize: TS.caption.fontSize,
    fontFamily: FF.sansRegular,
    color: I.muted,
    lineHeight: Math.round(TS.caption.fontSize * TS.caption.lineHeight),
    marginTop: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.fixed['2xl'],
    paddingHorizontal: SPACING.fixed.md,
    gap: SPACING.fixed.sm,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: I.surfaceStrong,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.fixed.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
  },
  emptyTitle: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.body,
    textAlign: 'center',
    lineHeight: Math.round(TYPOGRAPHY.fontSize.base * 1.4),
    marginBottom: SPACING.fixed.md,
    maxWidth: 320,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: SPACING.fixed['2xl'],
    paddingHorizontal: SPACING.fixed.lg,
    gap: SPACING.fixed.sm,
  },
  noResultsTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginTop: SPACING.fixed.sm,
  },
  noResultsSub: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.muted,
    textAlign: 'center',
    marginBottom: SPACING.fixed.md,
  },
});

export default MisServiciosScreen;
