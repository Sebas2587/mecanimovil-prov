import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import Header from '@/components/Header';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS, withOpacity } from '@/app/design-system/tokens';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { parseOfertasGrupoParam } from '@/utils/agruparOfertasServicio';
import { navigateBack } from '@/utils/navigateBack';

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

function parseServicioFromParams(raw?: string): ServicioOferta | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw) as ServicioOferta;
  } catch {
    return null;
  }
}

function fmtMoney(n: number | string | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) || 0 : typeof n === 'number' ? n : 0;
  return `$${v.toLocaleString('es-CL')}`;
}

export default function ServicioResumenScreen() {
  const insets = useSafeAreaInsets();
  const { id, servicioData, ofertasGrupo: ofertasGrupoParam } = useLocalSearchParams<{
    id: string;
    servicioData?: string;
    ofertasGrupo?: string;
  }>();

  const ofertasGrupo = useMemo(
    () => parseOfertasGrupoParam(ofertasGrupoParam),
    [ofertasGrupoParam]
  );

  const initial = useMemo(() => parseServicioFromParams(servicioData), [servicioData]);
  const [servicio, setServicio] = useState<ServicioOferta | null>(initial);
  const [loading, setLoading] = useState(!initial);
  const [loadError, setLoadError] = useState(false);
  const [loadingFotos, setLoadingFotos] = useState(false);

  useEffect(() => {
    if (initial) {
      setServicio(initial);
      setLoading(false);
      setLoadError(false);
      return;
    }
    const sid = id ? Number(id) : NaN;
    if (!Number.isFinite(sid) || sid <= 0) {
      setLoading(false);
      setLoadError(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    (async () => {
      try {
        const { serviciosProveedorAPI } = await import('@/services/serviciosApi');
        const s = (await serviciosProveedorAPI.obtenerServicioPorId(sid)) as unknown as ServicioOferta;
        if (!cancelled) {
          setServicio(s);
          setLoadError(false);
        }
      } catch (e) {
        console.error('❌ Error cargando servicio por id:', e);
        if (!cancelled) {
          setServicio(null);
          setLoadError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, initial]);

  useEffect(() => {
    const cargarFotos = async () => {
      if (!servicio?.id) return;

      try {
        setLoadingFotos(true);
        const { fotosServiciosAPI } = await import('@/services/api');
        const fotosData = await fotosServiciosAPI.obtenerFotosOferta(servicio.id);

        const fotosUrls: string[] = [];
        if (Array.isArray(fotosData)) {
          fotosData.forEach((foto: any) => {
            if (foto.imagen_url) fotosUrls.push(foto.imagen_url);
            else if (foto.imagen) fotosUrls.push(foto.imagen);
          });
        } else if (fotosData?.results && Array.isArray(fotosData.results)) {
          fotosData.results.forEach((foto: any) => {
            if (foto.imagen_url) fotosUrls.push(foto.imagen_url);
            else if (foto.imagen) fotosUrls.push(foto.imagen);
          });
        }

        setServicio((prev) => (prev ? { ...prev, fotos_urls: fotosUrls } : prev));
      } catch (error) {
        console.error('❌ Error cargando fotos del servicio:', error);
      } finally {
        setLoadingFotos(false);
      }
    };

    if (servicio?.id) cargarFotos();
  }, [servicio?.id]);

  const toggleDisponibilidad = async () => {
    if (!servicio) return;
    try {
      const { serviciosAPI } = await import('@/services/api');
      await serviciosAPI.cambiarDisponibilidad(servicio.id, !servicio.disponible);
      setServicio({ ...servicio, disponible: !servicio.disponible });
      Alert.alert('Éxito', `Servicio ${!servicio.disponible ? 'activado' : 'pausado'} correctamente`);
    } catch (error) {
      console.error('❌ Error cambiando disponibilidad:', error);
      Alert.alert('Error', 'No se pudo cambiar la disponibilidad del servicio');
    }
  };

  const eliminarServicio = async () => {
    if (!servicio) return;
    const idsEliminar =
      ofertasGrupo.length > 0
        ? [...new Set(ofertasGrupo.map((o) => o.id))]
        : [servicio.id];
    const msgExtra =
      idsEliminar.length > 1
        ? ` Se eliminarán ${idsEliminar.length} ofertas (todas las marcas asociadas).`
        : '';

    Alert.alert(
      'Eliminar servicio',
      `¿Eliminar "${servicio.servicio_info.nombre}"?${msgExtra} Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { serviciosAPI } = await import('@/services/api');
              for (const oid of idsEliminar) {
                await serviciosAPI.eliminarServicio(oid);
              }
              Alert.alert('Éxito', 'El servicio ha sido eliminado correctamente', [
                { text: 'OK', onPress: () => navigateBack('/mis-servicios') },
              ]);
            } catch (error) {
              console.error('❌ Error eliminando servicio:', error);
              Alert.alert('Error', 'No se pudo eliminar el servicio. Intenta nuevamente.');
            }
          },
        },
      ]
    );
  };

  const editarServicio = useCallback(() => {
    if (!servicio) return;
    router.push({
      pathname: '/crear-servicio',
      params: {
        mode: 'edit',
        servicioId: servicio.id.toString(),
        servicioData: JSON.stringify(servicio),
        ofertasGrupo:
          ofertasGrupo.length > 0
            ? JSON.stringify(ofertasGrupo)
            : JSON.stringify([{ id: servicio.id, marca_id: servicio.marca_vehiculo_seleccionada ?? 0 }]),
      },
    });
  }, [servicio, ofertasGrupo]);

  const formatearFecha = (fecha: string) =>
    new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const desglose = servicio?.desglose_precios;

  const handleBack = useCallback(() => {
    navigateBack('/mis-servicios');
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header
          title="Resumen del servicio"
          showBack
          onBackPress={handleBack}
          backgroundColor={I.canvas}
          titleColor={I.ink}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={I.primary} />
          <Text style={styles.mutedCenter}>Cargando servicio…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!servicio || loadError) {
    return (
      <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header
          title="Resumen del servicio"
          showBack
          onBackPress={handleBack}
          backgroundColor={I.canvas}
          titleColor={I.ink}
        />
        <View style={styles.centered}>
          <InstitutionalIcon name="error-outline" size={48} color={I.muted}  strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={styles.errorTitle}>No se pudo cargar el servicio</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleBack} activeOpacity={0.88}>
            <Text style={styles.primaryBtnText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const repuestosLista =
    servicio.repuestos_info?.length > 0
      ? servicio.repuestos_info
      : servicio.repuestos_seleccionados?.length > 0
        ? servicio.repuestos_seleccionados
        : [];

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header
        title="Resumen del servicio"
        showBack
        onBackPress={handleBack}
        backgroundColor={I.canvas}
        titleColor={I.ink}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: hx,
          paddingTop: SPACING.fixed.md,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heroSub}>Servicio #{servicio.id}</Text>

        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={[styles.statusPill, servicio.disponible ? styles.statusPillOn : styles.statusPillOff]}>
              <Text style={[styles.statusPillText, servicio.disponible ? styles.statusPillTextOn : styles.statusPillTextOff]}>
                {servicio.disponible ? 'Activo' : 'Pausado'}
              </Text>
            </View>
            <Text style={styles.metaDate}>Creado {formatearFecha(servicio.fecha_creacion)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Información del servicio</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <InstitutionalIcon name="build" size={20} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.label}>Nombre</Text>
              <Text style={styles.value}>{servicio.servicio_info.nombre}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, styles.infoRowDivider]}>
            <View style={styles.infoIcon}>
              <InstitutionalIcon name="directions-car" size={20} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.label}>
                {ofertasGrupo.length > 1 ? 'Marcas de vehículo' : 'Marca de vehículo'}
              </Text>
              {ofertasGrupo.length > 1 ? (
                <View style={styles.tagsWrap}>
                  {ofertasGrupo.map((item) => (
                    <View key={item.id} style={styles.tag}>
                      <Text style={styles.tagText}>
                        {item.marca_id === 0
                          ? 'Genérico'
                          : item.nombre?.trim() || `Marca #${item.marca_id}`}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.value}>
                  {servicio.marca_vehiculo_info?.nombre?.trim()
                    ? servicio.marca_vehiculo_info.nombre
                    : ofertasGrupo[0]?.marca_id === 0
                      ? 'Servicio genérico (todas las marcas)'
                      : 'No especificada'}
                </Text>
              )}
            </View>
          </View>

          <View style={[styles.infoRow, styles.infoRowDivider]}>
            <View style={styles.infoIcon}>
              <InstitutionalIcon name="settings" size={20} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.label}>Repuestos</Text>
              {servicio.tipo_servicio === 'con_repuestos' ? (
                repuestosLista.length > 0 ? (
                  <View style={styles.tagsWrap}>
                    {repuestosLista.map((repuesto: any, index: number) => {
                      const nombre = repuesto.nombre || repuesto.descripcion || `Repuesto ${index + 1}`;
                      const cantidad = repuesto.cantidad ? ` ×${repuesto.cantidad}` : '';
                      return (
                        <View key={repuesto.id ?? index} style={styles.tag}>
                          <Text style={styles.tagText}>
                            {nombre}
                            {cantidad}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.valueMuted}>Sin repuestos seleccionados</Text>
                )
              ) : (
                <Text style={styles.valueMuted}>Sin repuestos</Text>
              )}
            </View>
          </View>

          <View style={[styles.infoRow, styles.infoRowDivider]}>
            <View style={styles.infoIcon}>
              <InstitutionalIcon name="photo-library" size={20} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.label}>Fotos del servicio</Text>
              {loadingFotos ? (
                <View style={styles.rowInline}>
                  <ActivityIndicator size="small" color={I.primary} />
                  <Text style={styles.valueMuted}>Cargando fotos…</Text>
                </View>
              ) : servicio.fotos_urls?.length ? (
                <>
                  <View style={styles.photosRow}>
                    {servicio.fotos_urls.slice(0, 4).map((foto, index) => (
                      <Image key={index} source={{ uri: foto }} style={styles.photoThumb} />
                    ))}
                    {servicio.fotos_urls.length > 4 ? (
                      <View style={[styles.photoThumb, styles.photoMore]}>
                        <Text style={styles.photoMoreText}>+{servicio.fotos_urls.length - 4}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.caption}>
                    {servicio.fotos_urls.length} foto{servicio.fotos_urls.length !== 1 ? 's' : ''}
                  </Text>
                </>
              ) : (
                <Text style={styles.valueMuted}>No hay fotos disponibles</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Desglose de precios</Text>

          <View style={styles.priceBlock}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Precio mano de obra</Text>
              <Text style={styles.priceValue}>{fmtMoney(servicio.costo_mano_de_obra_sin_iva)}</Text>
            </View>
            {servicio.tipo_servicio === 'con_repuestos' && parseFloat(String(servicio.costo_repuestos_sin_iva)) > 0 ? (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Precio repuestos</Text>
                <Text style={styles.priceValue}>{fmtMoney(servicio.costo_repuestos_sin_iva)}</Text>
              </View>
            ) : null}

            {desglose ? (
              <>
                <View style={[styles.priceRow, styles.subtotalBox]}>
                  <Text style={styles.subtotalLabel}>Costo total sin IVA</Text>
                  <Text style={styles.subtotalValue}>{fmtMoney(desglose.costo_total_sin_iva)}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>IVA 19%</Text>
                  <Text style={styles.priceValue}>{fmtMoney(desglose.iva_19_porciento)}</Text>
                </View>
                <View style={[styles.priceRow, styles.highlightBox]}>
                  <Text style={styles.highlightLabel}>Precio al público</Text>
                  <Text style={styles.highlightValue}>{fmtMoney(desglose.precio_final_cliente)}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.valueMuted}>Sin desglose numérico disponible.</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <SafeAreaView style={styles.footerSafe} edges={['bottom']}>
        <View style={[styles.actionsBar, { paddingBottom: Math.max(insets.bottom, SPACING.fixed.sm) }]}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              servicio.disponible ? styles.actionPause : styles.actionPlay,
            ]}
            onPress={toggleDisponibilidad}
            activeOpacity={0.88}
          >
            <InstitutionalIcon
              name={servicio.disponible ? 'pause' : 'play-arrow'}
              size={20}
              color={servicio.disponible ? I.accentYellow : I.semanticUp}
             strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={[styles.actionText, servicio.disponible ? styles.actionTextPause : styles.actionTextPlay]}>
              {servicio.disponible ? 'Pausar' : 'Activar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.actionEdit]} onPress={editarServicio} activeOpacity={0.88}>
            <InstitutionalIcon name="edit" size={20} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.actionTextEdit}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.actionDelete]} onPress={eliminarServicio} activeOpacity={0.88}>
            <InstitutionalIcon name="delete-outline" size={20} color={I.semanticDown}  strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.actionTextDelete}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  scroll: {
    flex: 1,
  },
  heroSub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
    marginBottom: SPACING.fixed.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.fixed.xl,
  },
  mutedCenter: {
    marginTop: SPACING.fixed.md,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  errorTitle: {
    marginTop: SPACING.fixed.md,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    textAlign: 'center',
    marginBottom: SPACING.fixed.lg,
  },
  primaryBtn: {
    backgroundColor: I.primary,
    paddingHorizontal: SPACING.fixed.xl,
    paddingVertical: SPACING.fixed.md,
    borderRadius: BORDERS.radius.pill,
  },
  primaryBtnText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.onPrimary,
  },
  card: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.fixed.md,
    marginBottom: SPACING.fixed.md,
    ...SHADOWS.editorial,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginBottom: SPACING.fixed.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  statusPill: {
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.xs,
    borderRadius: BORDERS.radius.pill,
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
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statusPillTextOn: { color: I.semanticUp },
  statusPillTextOff: { color: I.semanticDown },
  metaDate: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
    flexShrink: 1,
    textAlign: 'right',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.md,
  },
  infoRowDivider: {
    marginTop: SPACING.fixed.md,
    paddingTop: SPACING.fixed.md,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBody: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    color: I.muted,
    marginBottom: SPACING.fixed.xxs,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  value: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.ink,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.base * (TYPOGRAPHY.lineHeight?.normal ?? 1.5)),
  },
  valueMuted: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
    marginTop: SPACING.fixed.xxs,
  },
  tag: {
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xxs + 2,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.primary[50],
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.primary, 0.2),
  },
  tagText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.primary,
  },
  rowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    marginTop: SPACING.fixed.xxs,
  },
  photosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
    marginTop: SPACING.fixed.xxs,
  },
  photoThumb: {
    width: 52,
    height: 52,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.surfaceStrong,
  },
  photoMore: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: I.surfaceStrong,
  },
  photoMoreText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.monoMedium,
    color: I.muted,
  },
  caption: {
    marginTop: SPACING.fixed.xs,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  priceBlock: {
    gap: SPACING.fixed.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.fixed.md,
  },
  priceLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.body,
  },
  priceValue: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.monoMedium,
    color: I.ink,
    textAlign: 'right',
  },
  subtotalBox: {
    marginTop: SPACING.fixed.xs,
    padding: SPACING.fixed.md,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceStrong,
  },
  subtotalLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    flex: 1,
  },
  subtotalValue: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.monoMedium,
    color: I.ink,
  },
  highlightBox: {
    marginTop: SPACING.fixed.xs,
    padding: SPACING.fixed.md,
    borderRadius: BORDERS.radius.md,
    backgroundColor: withOpacity(I.primary, 0.08),
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.primary, 0.22),
  },
  highlightLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    flex: 1,
  },
  highlightValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.monoMedium,
    color: I.primary,
    textAlign: 'right',
  },
  footerSafe: {
    backgroundColor: I.canvas,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
  },
  actionsBar: {
    flexDirection: 'row',
    paddingHorizontal: hx,
    paddingTop: SPACING.fixed.md,
    gap: SPACING.fixed.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.fixed.md,
    borderRadius: BORDERS.radius.lg,
    gap: SPACING.fixed.xxs,
  },
  actionPause: {
    backgroundColor: withOpacity(I.accentYellow, 0.16),
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.accentYellow, 0.35),
  },
  actionPlay: {
    backgroundColor: withOpacity(I.semanticUp, 0.12),
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.semanticUp, 0.28),
  },
  actionText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
  },
  actionTextPause: { color: I.ink },
  actionTextPlay: { color: I.semanticUp },
  actionEdit: {
    backgroundColor: COLORS.primary[50],
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.primary, 0.25),
  },
  actionTextEdit: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.primary,
  },
  actionDelete: {
    backgroundColor: withOpacity(I.semanticDown, 0.08),
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.semanticDown, 0.22),
  },
  actionTextDelete: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.semanticDown,
  },
});
