import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import Header from '@/components/Header';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import {
  HostPaperSection,
  HostSectionKicker,
  HostMetricRow,
  InstitutionalButton,
  InstitutionalTag,
  hostScreenStyles,
  HOST_GUTTER,
} from '@/app/design-system/components';
import { TarifaMarcaResumenCard } from '@/components/servicios/TarifasMarcaCatalogo';
import { etiquetaMarcaOferta } from '@/utils/tarifasPorMarca';
import { parseOfertasGrupoParam, ofertaToGrupoItem } from '@/utils/agruparOfertasServicio';
import { navigateBack } from '@/utils/navigateBack';
import { showAlert, showAlertButtons, showConfirm } from '@/utils/platformAlert';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;

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
  modelo_vehiculo_seleccionado?: number | null;
  modelo_vehiculo_info?: {
    id: number;
    nombre: string;
    marca_id?: number;
    marca_nombre?: string;
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

function parseOfertasCatalogoParam(raw?: string | string[]): ServicioOferta[] {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s || typeof s !== 'string') return [];
  try {
    const parsed = JSON.parse(s) as ServicioOferta[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function fmtMoney(n: number | string | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) || 0 : typeof n === 'number' ? n : 0;
  return `$${v.toLocaleString('es-CL')}`;
}

function DesglosePrecioOferta({
  oferta,
  omitirPrecioPublicoHero = false,
}: {
  oferta: ServicioOferta;
  omitirPrecioPublicoHero?: boolean;
}) {
  const desglose = oferta.desglose_precios;
  const showRepuestos =
    oferta.tipo_servicio === 'con_repuestos' &&
    parseFloat(String(oferta.costo_repuestos_sin_iva)) > 0;

  return (
    <View>
      <HostMetricRow
        label="Precio mano de obra"
        value={fmtMoney(oferta.costo_mano_de_obra_sin_iva)}
        last={!showRepuestos && !desglose}
      />
      {showRepuestos ? (
        <HostMetricRow
          label="Precio repuestos"
          value={fmtMoney(oferta.costo_repuestos_sin_iva)}
          last={!desglose}
        />
      ) : null}
      {desglose ? (
        <>
          <HostMetricRow
            label="Costo total sin IVA"
            value={fmtMoney(desglose.costo_total_sin_iva)}
          />
          <HostMetricRow
            label="IVA 19%"
            value={fmtMoney(desglose.iva_19_porciento)}
            last={omitirPrecioPublicoHero}
          />
          {!omitirPrecioPublicoHero ? (
            <HostMetricRow
              label="Precio al público"
              value={fmtMoney(desglose.precio_final_cliente)}
              last
            />
          ) : null}
        </>
      ) : (
        <Text style={styles.valueMuted}>Sin desglose numérico disponible.</Text>
      )}
    </View>
  );
}

export default function ServicioResumenScreen() {
  const insets = useSafeAreaInsets();
  const {
    id,
    servicioData,
    ofertasGrupo: ofertasGrupoParam,
    ofertasCatalogo: ofertasCatalogoParam,
  } = useLocalSearchParams<{
    id: string;
    servicioData?: string;
    ofertasGrupo?: string;
    ofertasCatalogo?: string;
  }>();

  const ofertasGrupo = useMemo(
    () => parseOfertasGrupoParam(ofertasGrupoParam),
    [ofertasGrupoParam],
  );

  const ofertasCatalogo = useMemo(
    () => parseOfertasCatalogoParam(ofertasCatalogoParam),
    [ofertasCatalogoParam],
  );

  const initial = useMemo(() => parseServicioFromParams(servicioData), [servicioData]);
  const [servicio, setServicio] = useState<ServicioOferta | null>(initial);

  const [ofertasEnGrupo, setOfertasEnGrupo] = useState<ServicioOferta[]>(() =>
    ofertasCatalogo.length > 0 ? ofertasCatalogo : initial ? [initial] : [],
  );

  useEffect(() => {
    if (ofertasCatalogo.length > 0) {
      setOfertasEnGrupo(ofertasCatalogo);
    } else if (servicio) {
      setOfertasEnGrupo([servicio]);
    }
  }, [ofertasCatalogo, servicio?.id]);

  const ofertasParaDesglose = useMemo(() => {
    if (ofertasEnGrupo.length > 0) return ofertasEnGrupo;
    return servicio ? [servicio] : [];
  }, [ofertasEnGrupo, servicio]);

  const variasTarifas = ofertasParaDesglose.length > 1;

  const resumenDisponibilidad = useMemo(() => {
    const total = ofertasParaDesglose.length;
    const activas = ofertasParaDesglose.filter((o) => o.disponible !== false).length;
    return { total, activas, pausadas: total - activas };
  }, [ofertasParaDesglose]);

  const [loading, setLoading] = useState(!initial);
  const [togglingOfertaId, setTogglingOfertaId] = useState<number | null>(null);
  const [togglingTodas, setTogglingTodas] = useState(false);
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

  const aplicarDisponibilidadLocal = useCallback((ofertaId: number, disponible: boolean) => {
    setOfertasEnGrupo((prev) =>
      prev.map((o) => (o.id === ofertaId ? { ...o, disponible } : o)),
    );
    setServicio((prev) => (prev?.id === ofertaId ? { ...prev, disponible } : prev));
  }, []);

  const toggleDisponibilidadOferta = async (ofertaId: number, disponibleActual: boolean) => {
    const nueva = !disponibleActual;
    const ofertaRef = ofertasParaDesglose.find((o) => o.id === ofertaId);
    const marcaLabel = ofertaRef ? etiquetaMarcaOferta(ofertaRef) : 'esta tarifa';
    try {
      setTogglingOfertaId(ofertaId);
      const { serviciosAPI } = await import('@/services/api');
      await serviciosAPI.cambiarDisponibilidad(ofertaId, nueva);
      aplicarDisponibilidadLocal(ofertaId, nueva);
      showAlert(
        'Éxito',
        nueva
          ? `Oferta activada para ${marcaLabel}.`
          : `Oferta pausada para ${marcaLabel}. Las demás marcas no se modifican.`,
      );
    } catch (error) {
      console.error('❌ Error cambiando disponibilidad:', error);
      showAlert('Error', 'No se pudo cambiar la disponibilidad de esta marca');
    } finally {
      setTogglingOfertaId(null);
    }
  };

  const toggleDisponibilidadTodas = () => {
    if (!servicio || ofertasParaDesglose.length === 0) return;
    const activar = resumenDisponibilidad.activas < resumenDisponibilidad.total;
    const accion = activar ? 'activar' : 'pausar';
    const nombres = ofertasParaDesglose.map((o) => etiquetaMarcaOferta(o)).join(', ');

    showConfirm(
      activar ? 'Activar todas las marcas' : 'Pausar todas las marcas',
      `Se ${activar ? 'activarán' : 'pausarán'} las ${ofertasParaDesglose.length} ofertas de este servicio:\n• ${nombres.replace(/, /g, '\n• ')}`,
      {
        confirmText: activar ? 'Activar todas' : 'Pausar todas',
        onConfirm: async () => {
          try {
            setTogglingTodas(true);
            const { serviciosAPI } = await import('@/services/api');
            for (const oferta of ofertasParaDesglose) {
              if (oferta.disponible !== activar) {
                await serviciosAPI.cambiarDisponibilidad(oferta.id, activar);
                aplicarDisponibilidadLocal(oferta.id, activar);
              }
            }
            showAlert('Éxito', `Todas las marcas fueron ${activar ? 'activadas' : 'pausadas'}.`);
          } catch (error) {
            console.error('❌ Error cambiando disponibilidad masiva:', error);
            showAlert(
              'Error',
              `No se pudo ${accion} todas las marcas. Revisa el detalle de cada una.`,
            );
          } finally {
            setTogglingTodas(false);
          }
        },
      },
    );
  };

  const toggleDisponibilidad = async () => {
    if (!servicio) return;
    if (variasTarifas) {
      toggleDisponibilidadTodas();
      return;
    }
    await toggleDisponibilidadOferta(servicio.id, servicio.disponible);
  };

  const eliminarServicio = () => {
    if (!servicio) return;
    const idsEliminar =
      ofertasGrupo.length > 0
        ? [...new Set(ofertasGrupo.map((o) => o.id))]
        : [servicio.id];
    const msgExtra =
      idsEliminar.length > 1
        ? ` Se eliminarán ${idsEliminar.length} ofertas (todas las marcas asociadas).`
        : '';

    showConfirm(
      'Eliminar servicio',
      `¿Eliminar "${servicio.servicio_info.nombre}"?${msgExtra} Esta acción no se puede deshacer.`,
      {
        confirmText: 'Eliminar',
        onConfirm: async () => {
          try {
            const { serviciosAPI } = await import('@/services/api');
            for (const oid of idsEliminar) {
              await serviciosAPI.eliminarServicio(oid);
            }
            showAlertButtons('Éxito', 'El servicio ha sido eliminado correctamente', [
              { text: 'OK', onPress: () => navigateBack('/mis-servicios') },
            ]);
          } catch (error) {
            console.error('❌ Error eliminando servicio:', error);
            showAlert('Error', 'No se pudo eliminar el servicio. Intenta nuevamente.');
          }
        },
      },
    );
  };

  const editarOferta = useCallback((oferta: ServicioOferta) => {
    router.push({
      pathname: '/crear-servicio',
      params: {
        mode: 'edit',
        servicioId: oferta.id.toString(),
        servicioData: JSON.stringify(oferta),
        ofertasGrupo: JSON.stringify([ofertaToGrupoItem(oferta)]),
      },
    });
  }, []);

  const editarServicio = useCallback(() => {
    if (!servicio) return;
    editarOferta(servicio);
  }, [servicio, editarOferta]);

  const formatearFecha = (fecha: string) =>
    new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const handleBack = useCallback(() => {
    navigateBack('/mis-servicios');
  }, []);

  const statusLabel = useMemo(() => {
    if (variasTarifas) {
      if (resumenDisponibilidad.activas === resumenDisponibilidad.total) return 'Todas activas';
      if (resumenDisponibilidad.activas === 0) return 'Todas pausadas';
      return `${resumenDisponibilidad.activas}/${resumenDisponibilidad.total} activas`;
    }
    return servicio?.disponible ? 'Activo' : 'Pausado';
  }, [variasTarifas, resumenDisponibilidad, servicio?.disponible]);

  const statusVariant = useMemo(() => {
    if (variasTarifas) {
      if (resumenDisponibilidad.activas === resumenDisponibilidad.total) return 'success' as const;
      if (resumenDisponibilidad.activas === 0) return 'error' as const;
      return 'warning' as const;
    }
    return servicio?.disponible ? ('success' as const) : ('error' as const);
  }, [variasTarifas, resumenDisponibilidad, servicio?.disponible]);

  const pauseAllLabel = variasTarifas
    ? resumenDisponibilidad.activas === resumenDisponibilidad.total
      ? 'Pausar todas'
      : 'Activar todas'
    : servicio?.disponible
      ? 'Pausar'
      : 'Activar';

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
          <Text style={styles.errorTitle}>No se pudo cargar el servicio</Text>
          <InstitutionalButton label="Volver" variant="secondary" onPress={handleBack} />
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

  const repuestosValue =
    servicio.tipo_servicio === 'con_repuestos'
      ? repuestosLista.length > 0
        ? repuestosLista
            .map((r: any, i: number) => {
              const nombre = r.nombre || r.descripcion || `Repuesto ${i + 1}`;
              const cantidad = r.cantidad ? ` ×${r.cantidad}` : '';
              return `${nombre}${cantidad}`;
            })
            .join(' · ')
        : 'Sin repuestos seleccionados'
      : 'Sin repuestos';

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
        style={hostScreenStyles.scroll}
        contentContainerStyle={[
          hostScreenStyles.scrollInner,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={styles.h1}>{servicio.servicio_info.nombre}</Text>
          <View style={styles.headingMeta}>
            <InstitutionalTag label={statusLabel} variant={statusVariant} size="sm" />
            <Text style={styles.metaDate}>Creado {formatearFecha(servicio.fecha_creacion)}</Text>
          </View>
          {variasTarifas ? (
            <Text style={styles.statusHint}>
              Cada marca tiene su precio. Edita o pausa por tarifa en cada bloque.
            </Text>
          ) : null}
        </View>

        <HostSectionKicker label="Información" style={styles.kickerFlush} />
        <HostPaperSection style={styles.paper}>
          <HostMetricRow label="Nombre" value={servicio.servicio_info.nombre} />
          {!variasTarifas ? (
            <HostMetricRow label="Marca / modelo" value={etiquetaMarcaOferta(servicio)} />
          ) : null}
          <HostMetricRow label="Repuestos" value={repuestosValue} last={!loadingFotos && !servicio.fotos_urls?.length} />

          <View style={styles.fotosBlock}>
            <Text style={styles.fotosLabel}>Fotos del servicio</Text>
            {loadingFotos ? (
              <View style={styles.rowInline}>
                <ActivityIndicator size="small" color={I.muted} />
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
                  {servicio.fotos_urls.length} foto
                  {servicio.fotos_urls.length !== 1 ? 's' : ''}
                </Text>
              </>
            ) : (
              <Text style={styles.valueMuted}>No hay fotos disponibles</Text>
            )}
          </View>
        </HostPaperSection>

        {variasTarifas ? (
          <>
            <HostSectionKicker
              label={`${ofertasParaDesglose.length} tarifas por marca`}
            />
            {ofertasParaDesglose.map((oferta) => (
              <TarifaMarcaResumenCard
                key={oferta.id}
                oferta={oferta}
                onEditar={() => editarOferta(oferta)}
                onToggleDisponibilidad={() =>
                  toggleDisponibilidadOferta(oferta.id, oferta.disponible !== false)
                }
                togglingDisponibilidad={togglingOfertaId === oferta.id}
              >
                <DesglosePrecioOferta oferta={oferta} omitirPrecioPublicoHero />
              </TarifaMarcaResumenCard>
            ))}
          </>
        ) : (
          <>
            <HostSectionKicker label="Desglose de precios" />
            <HostPaperSection style={styles.paper}>
              <DesglosePrecioOferta oferta={servicio} />
            </HostPaperSection>
          </>
        )}
      </ScrollView>

      <SafeAreaView style={styles.footerSafe} edges={['bottom']}>
        <View
          style={[
            styles.actionsBar,
            { paddingBottom: Math.max(insets.bottom, SPACING.fixed.sm) },
          ]}
        >
          <View style={styles.actionFlex}>
            <InstitutionalButton
              label={pauseAllLabel}
              variant="secondary"
              size="compact"
              loading={togglingTodas}
              disabled={togglingTodas || togglingOfertaId != null}
              onPress={toggleDisponibilidad}
            />
          </View>
          {!variasTarifas ? (
            <View style={styles.actionFlex}>
              <InstitutionalButton
                label="Editar"
                variant="outline"
                size="compact"
                onPress={editarServicio}
              />
            </View>
          ) : null}
          <View style={styles.actionFlex}>
            <InstitutionalButton
              label="Eliminar"
              variant="destructiveOutline"
              size="compact"
              onPress={eliminarServicio}
            />
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: I.canvas,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.fixed.xl,
    gap: SPACING.fixed.md,
  },
  mutedCenter: {
    marginTop: SPACING.fixed.md,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    textAlign: 'center',
  },
  heading: {
    marginBottom: SPACING.fixed.lg,
    gap: SPACING.fixed.xs,
  },
  h1: {
    fontSize: TS.h3.fontSize,
    lineHeight: Math.round(TS.h3.fontSize * 1.2),
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  headingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
  },
  metaDate: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  statusHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.sm * 1.4),
  },
  kickerFlush: {
    marginTop: 0,
  },
  paper: {
    marginBottom: SPACING.fixed.md,
  },
  valueMuted: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.muted,
    paddingVertical: SPACING.fixed.sm,
  },
  fotosBlock: {
    paddingTop: SPACING.fixed.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    gap: SPACING.fixed.xs,
  },
  fotosLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.muted,
  },
  rowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  photosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
  },
  photoThumb: {
    width: 56,
    height: 56,
    borderRadius: BORDERS.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    backgroundColor: I.surfaceStrong,
  },
  photoMore: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoMoreText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.monoMedium,
    color: I.muted,
  },
  caption: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  footerSafe: {
    backgroundColor: I.canvas,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  actionsBar: {
    flexDirection: 'row',
    paddingHorizontal: HOST_GUTTER,
    paddingTop: SPACING.fixed.md,
    gap: SPACING.fixed.sm,
  },
  actionFlex: {
    flex: 1,
    minWidth: 0,
  },
});
