import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, ChevronRight, Trash2 } from 'lucide-react-native';
import { GuiaReparacionContenido } from '@/components/orden-detalle/GuiaReparacionContenido';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import { BLANK_GLASS, GLASS_INSET } from '@/app/design-system/blankGlass';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { showAlert, showConfirm } from '@/utils/platformAlert';
import {
  guiasReparacionService,
  type GuiaReparacionGrupoMarca,
  type GuiaReparacionGuardada,
} from '@/services/guiasReparacionService';

const I = COLORS.institutional;

export default function GuiasReparacionScreen() {
  const { esMecanicoEquipo } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [grupos, setGrupos] = useState<GuiaReparacionGrupoMarca[]>([]);
  const [marcaSel, setMarcaSel] = useState<string | null>(null);
  const [modeloSel, setModeloSel] = useState<string | null>(null);
  const [guias, setGuias] = useState<GuiaReparacionGuardada[]>([]);
  const [loadingGuias, setLoadingGuias] = useState(false);
  const [guiaDetalle, setGuiaDetalle] = useState<GuiaReparacionGuardada | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const cargarGrupos = useCallback(async () => {
    const data = await guiasReparacionService.agrupadas();
    setGrupos(data);
    setErrorCarga(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!esMecanicoEquipo) {
        setLoading(false);
        return;
      }
      let activo = true;
      void (async () => {
        setLoading(true);
        try {
          await cargarGrupos();
        } catch (error) {
          if (!activo) return;
          const mensaje =
            error instanceof Error ? error.message : 'No se pudieron cargar tus guías guardadas.';
          setErrorCarga(mensaje);
          setGrupos([]);
        } finally {
          if (activo) setLoading(false);
        }
      })();
      return () => {
        activo = false;
      };
    }, [esMecanicoEquipo, cargarGrupos]),
  );

  const abrirModelo = async (marca: string, modelo: string) => {
    setMarcaSel(marca);
    setModeloSel(modelo);
    setLoadingGuias(true);
    try {
      const lista = await guiasReparacionService.listar({ marca, modelo });
      setGuias(lista);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar las guías de este modelo.';
      showAlert('Error', mensaje);
    } finally {
      setLoadingGuias(false);
    }
  };

  const eliminarGuia = (guia: GuiaReparacionGuardada) => {
    showConfirm('Eliminar guía', '¿Quieres quitar esta guía de tu biblioteca?', {
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await guiasReparacionService.eliminar(guia.id);
          setGuias((prev) => prev.filter((g) => g.id !== guia.id));
          if (guiaDetalle?.id === guia.id) setGuiaDetalle(null);
          await cargarGrupos();
        } catch (error) {
          const mensaje = error instanceof Error ? error.message : 'No se pudo eliminar la guía.';
          showAlert('Error', mensaje);
        }
      },
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (marcaSel && modeloSel) {
        const lista = await guiasReparacionService.listar({ marca: marcaSel, modelo: modeloSel });
        setGuias(lista);
      }
      await cargarGrupos();
    } catch {
      /* silencioso */
    } finally {
      setRefreshing(false);
    }
  };

  const tituloHeader = guiaDetalle
    ? guiaDetalle.titulo
    : marcaSel && modeloSel
      ? `${marcaSel} ${modeloSel}`
      : 'Guías de reparación';

  const volver = () => {
    if (guiaDetalle) {
      setGuiaDetalle(null);
      return;
    }
    if (marcaSel) {
      setMarcaSel(null);
      setModeloSel(null);
      setGuias([]);
      return;
    }
    router.back();
  };

  if (!esMecanicoEquipo) {
    return (
      <LinearGradient style={styles.flex} colors={BLANK_GLASS.gradient} locations={BLANK_GLASS.gradientLocations}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="Guías de reparación" showBack onBackPress={() => router.back()} />
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Esta sección solo está disponible para mecánicos del equipo.</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient style={styles.flex} colors={BLANK_GLASS.gradient} locations={BLANK_GLASS.gradientLocations}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title={tituloHeader} showBack onBackPress={volver} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: GLASS_INSET }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={I.primary} />}
      >
        {loading ? (
          <ActivityIndicator color={I.primary} style={{ marginTop: SPACING.xl }} />
        ) : guiaDetalle ? (
          <View style={styles.card}>
            <View style={styles.guiaMetaRow}>
              <Text style={styles.guiaMeta}>
                {[guiaDetalle.vehiculo_marca, guiaDetalle.vehiculo_modelo, guiaDetalle.vehiculo_anio]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <TouchableOpacity onPress={() => eliminarGuia(guiaDetalle)} hitSlop={8}>
                <Trash2 size={18} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
              </TouchableOpacity>
            </View>
            {guiaDetalle.vehiculo_patente ? (
              <Text style={styles.patenteText}>Patente {guiaDetalle.vehiculo_patente}</Text>
            ) : null}
            <GuiaReparacionContenido contenido={guiaDetalle.contenido} />
          </View>
        ) : marcaSel && modeloSel ? (
          loadingGuias ? (
            <ActivityIndicator color={I.primary} style={{ marginTop: SPACING.xl }} />
          ) : guias.length === 0 ? (
            <Text style={styles.emptyText}>No hay guías guardadas para este modelo.</Text>
          ) : (
            guias.map((guia) => (
              <TouchableOpacity
                key={guia.id}
                style={styles.listRow}
                onPress={() => setGuiaDetalle(guia)}
                activeOpacity={0.85}
              >
                <View style={styles.rowIconPlate}>
                  <Sparkles size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={2}>{guia.titulo}</Text>
                  <Text style={styles.rowSubtitle}>
                    {guia.vehiculo_patente ? `Patente ${guia.vehiculo_patente} · ` : ''}
                    {new Date(guia.creado_en).toLocaleDateString('es-CL')}
                  </Text>
                </View>
                <ChevronRight size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              </TouchableOpacity>
            ))
          )
        ) : errorCarga ? (
          <View style={styles.emptyWrap}>
            <Sparkles size={32} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.emptyTitle}>Biblioteca no disponible</Text>
            <Text style={styles.emptyText}>{errorCarga}</Text>
          </View>
        ) : grupos.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Sparkles size={32} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.emptyTitle}>Sin guías guardadas</Text>
            <Text style={styles.emptyText}>
              Cuando generes una guía de reparación en una orden o cita, podrás guardarla aquí para consultarla después por marca y modelo.
            </Text>
          </View>
        ) : (
          grupos.map((grupo) => (
            <View key={grupo.marca} style={styles.marcaSection}>
              <Text style={styles.marcaTitle}>{grupo.marca}</Text>
              {grupo.modelos.map((m) => (
                <TouchableOpacity
                  key={`${grupo.marca}-${m.modelo}`}
                  style={styles.listRow}
                  onPress={() => void abrirModelo(grupo.marca, m.modelo)}
                  activeOpacity={0.85}
                >
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{m.modelo}</Text>
                    <Text style={styles.rowSubtitle}>
                      {m.total} {m.total === 1 ? 'guía guardada' : 'guías guardadas'}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
    gap: SPACING.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  backLink: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcaSection: {
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  marcaTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    padding: SPACING.md,
    ...SHADOWS.editorial,
  },
  rowIconPlate: {
    width: 32,
    height: 32,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: I.ink,
  },
  rowSubtitle: {
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
  },
  card: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.editorial,
  },
  guiaMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  guiaMeta: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  patenteText: {
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
  },
  emptyWrap: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: I.ink,
  },
  emptyText: {
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
