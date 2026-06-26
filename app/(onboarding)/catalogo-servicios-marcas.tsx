import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { serviciosAPI } from '@/services/api';
import { useOnboardingDraft } from '@/context/OnboardingDraftContext';
import OnboardingHeader from '@/components/OnboardingHeader';
import {
  OnboardingScreenLayout,
  OnboardingPrimaryButton,
  OnboardingNotice,
} from '@/components/onboarding';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS } from '@/app/design-system/tokens';
import { onboardingStyles } from '@/app/design-system/styles/onboarding';
import { showAlert, showConfirm } from '@/utils/platformAlert';
import { catalogoStep } from '@/utils/onboardingNavigation';
import {
  buildOnboardingHref,
  mergeRouteParamsIntoDraft,
  serviciosDraftToState,
  stateToServiciosDraft,
} from '@/utils/onboardingDraftParams';
import {
  extractApiList,
  marcasIdsKeyFromParam,
  parseMarcasIdsParam,
  parseMarcasMetaParam,
  readRouteParam,
} from '@/utils/extractApiList';

const I = COLORS.institutional;

type ServicioCatalogo = {
  id: number;
  nombre: string;
  descripcion: string;
  requiere_repuestos: boolean;
};

type GrupoMarca = {
  marcaId: number;
  marcaNombre: string;
  servicios: ServicioCatalogo[];
};

function mapServicioCatalogo(s: Record<string, unknown>): ServicioCatalogo | null {
  const id = Number(s.id);
  const nombre = String(s.nombre ?? '').trim();
  if (!Number.isFinite(id) || !nombre) return null;
  return {
    id,
    nombre,
    descripcion: String(s.descripcion ?? ''),
    requiere_repuestos: !!s.requiere_repuestos,
  };
}

export default function CatalogoServiciosMarcasScreen() {
  const router = useRouter();
  const rawParams = useLocalSearchParams();
  const { draft, patchDraft } = useOnboardingDraft();
  const {
    tipo,
    marcas: marcasParam,
    marcas_meta: marcasMetaParam,
    es_multimarca: esMultimarcaParam,
  } = rawParams;

  const esMultimarca = readRouteParam(esMultimarcaParam) === 'true' || draft.es_multimarca === true;
  const marcasIdsKey = marcasIdsKeyFromParam(marcasParam) || draft.marcas.join(',');
  const marcasMetaKey = readRouteParam(marcasMetaParam) ?? JSON.stringify(draft.marcas_meta);
  const marcasIds = useMemo(
    () => (parseMarcasIdsParam(marcasParam).length ? parseMarcasIdsParam(marcasParam) : draft.marcas),
    [marcasIdsKey, draft.marcas],
  );
  const marcasMeta = useMemo(
    () => (parseMarcasMetaParam(marcasMetaParam).length ? parseMarcasMetaParam(marcasMetaParam) : draft.marcas_meta),
    [marcasMetaKey, draft.marcas_meta],
  );

  const [grupos, setGrupos] = useState<GrupoMarca[]>([]);
  const [serviciosGenericos, setServiciosGenericos] = useState<ServicioCatalogo[]>([]);
  const [seleccionadosGenericos, setSeleccionadosGenericos] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // marcaId → Set de servicioIds seleccionados
  const [seleccionados, setSeleccionados] = useState<Record<number, Set<number>>>({});

  const syncServiciosDraft = useCallback(
    (genericos: Set<number>, porMarca: Record<number, Set<number>>) => {
      patchDraft({
        servicios_seleccionados: stateToServiciosDraft(esMultimarca, genericos, porMarca),
      });
    },
    [esMultimarca, patchDraft],
  );

  const serviciosParamKey = readRouteParam(rawParams.servicios_seleccionados) ?? '';
  const esMultimarcaParamKey = readRouteParam(rawParams.es_multimarca) ?? '';
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useFocusEffect(
    useCallback(() => {
      const partial = mergeRouteParamsIntoDraft(
        draftRef.current,
        rawParams as Record<string, string | string[] | undefined>,
      );
      if (Object.keys(partial).length > 0) {
        patchDraft(partial);
      }
      const merged = { ...draftRef.current, ...partial };
      const restored = serviciosDraftToState(merged.servicios_seleccionados, esMultimarca);
      setSeleccionadosGenericos(restored.genericos);
      setSeleccionados(restored.porMarca);
    }, [marcasIdsKey, serviciosParamKey, esMultimarcaParamKey, patchDraft, rawParams, esMultimarca]),
  );

  useEffect(() => {
    let cancelled = false;

    const finish = () => {
      if (!cancelled) setIsLoading(false);
    };

    const cargarCatalogoGenerico = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        let servicios: ServicioCatalogo[] = [];
        try {
          const res = await (serviciosAPI as { obtenerCatalogoServiciosGenericos?: () => Promise<unknown> })
            .obtenerCatalogoServiciosGenericos?.();
          const raw = extractApiList<Record<string, unknown>>(res);
          if (raw.length) {
            servicios = raw.map(mapServicioCatalogo).filter((s): s is ServicioCatalogo => s != null);
          } else {
            const allRes = await serviciosAPI.obtenerServicios();
            const allRaw = extractApiList<Record<string, unknown>>(allRes);
            servicios = allRaw.map(mapServicioCatalogo).filter((s): s is ServicioCatalogo => s != null);
          }
        } catch {
          servicios = [];
        }

        if (!cancelled) {
          setServiciosGenericos(
            servicios.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })),
          );
        }
      } catch (e) {
        console.error('Error cargando catálogo genérico:', e);
        if (!cancelled) {
          setServiciosGenericos([]);
          setLoadError('No se pudo cargar el catálogo de servicios.');
        }
      } finally {
        finish();
      }
    };

    const cargarCatalogoEspecialista = async () => {
      if (marcasIds.length === 0) {
        if (!cancelled) {
          setGrupos([]);
          setLoadError(null);
        }
        finish();
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      const nombreMarca = (id: number) =>
        marcasMeta.find((m) => m.id === id)?.nombre ?? `Marca #${id}`;

      try {
        const resultados = await Promise.all(
          marcasIds.map(async (marcaId) => {
            try {
              const res = await serviciosAPI.obtenerCatalogoServiciosPorMarca(marcaId);
              const lista = extractApiList<Record<string, unknown>>(res);
              const servicios = lista
                .map(mapServicioCatalogo)
                .filter((s): s is ServicioCatalogo => s != null)
                .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

              return { marcaId, marcaNombre: nombreMarca(marcaId), servicios };
            } catch (e) {
              console.warn('Error catálogo marca', marcaId, e);
              return { marcaId, marcaNombre: nombreMarca(marcaId), servicios: [] as ServicioCatalogo[] };
            }
          }),
        );

        if (!cancelled) {
          resultados.sort((a, b) =>
            a.marcaNombre.localeCompare(b.marcaNombre, 'es', { sensitivity: 'base' }),
          );
          setGrupos(resultados);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setGrupos([]);
          setLoadError('No se pudo cargar el catálogo de servicios. Intenta de nuevo.');
        }
      } finally {
        finish();
      }
    };

    if (esMultimarca) {
      cargarCatalogoGenerico();
    } else {
      cargarCatalogoEspecialista();
    }

    return () => {
      cancelled = true;
    };
  }, [esMultimarca, marcasIdsKey, marcasMetaKey]);

  const toggleServicio = useCallback((marcaId: number, servicioId: number) => {
    setSeleccionados((prev) => {
      const set = new Set(prev[marcaId] ?? []);
      if (set.has(servicioId)) {
        set.delete(servicioId);
      } else {
        set.add(servicioId);
      }
      const next = { ...prev, [marcaId]: set };
      syncServiciosDraft(seleccionadosGenericos, next);
      return next;
    });
  }, [seleccionadosGenericos, syncServiciosDraft]);

  const toggleServicioGenerico = useCallback((servicioId: number) => {
    setSeleccionadosGenericos((prev) => {
      const next = new Set(prev);
      if (next.has(servicioId)) {
        next.delete(servicioId);
      } else {
        next.add(servicioId);
      }
      syncServiciosDraft(next, seleccionados);
      return next;
    });
  }, [seleccionados, syncServiciosDraft]);

  const toggleTodosGenericos = useCallback(() => {
    const todosIds = serviciosGenericos.map((s) => s.id);
    const todosSeleccionados = todosIds.every((id) => seleccionadosGenericos.has(id));
    const next = todosSeleccionados ? new Set<number>() : new Set(todosIds);
    setSeleccionadosGenericos(next);
    syncServiciosDraft(next, seleccionados);
  }, [serviciosGenericos, seleccionadosGenericos, seleccionados, syncServiciosDraft]);

  const toggleTodoGrupo = useCallback(
    (grupo: GrupoMarca) => {
      const actuales = seleccionados[grupo.marcaId] ?? new Set();
      const todosSeleccionados = grupo.servicios.every((s) => actuales.has(s.id));
      setSeleccionados((prev) => {
        const next = {
          ...prev,
          [grupo.marcaId]: todosSeleccionados ? new Set<number>() : new Set(grupo.servicios.map((s) => s.id)),
        };
        syncServiciosDraft(seleccionadosGenericos, next);
        return next;
      });
    },
    [seleccionados, seleccionadosGenericos, syncServiciosDraft],
  );

  const totalSeleccionados = useMemo(
    () => esMultimarca
      ? seleccionadosGenericos.size
      : Object.values(seleccionados).reduce((sum, set) => sum + set.size, 0),
    [esMultimarca, seleccionadosGenericos, seleccionados],
  );

  const getBackPath = () => {
    const merged = {
      ...draft,
      ...mergeRouteParamsIntoDraft(draft, rawParams as Record<string, string | string[] | undefined>),
      servicios_seleccionados: stateToServiciosDraft(
        esMultimarca,
        seleccionadosGenericos,
        seleccionados,
      ),
    };
    if (esMultimarca) {
      return buildOnboardingHref('/(onboarding)/cobertura-marcas', merged);
    }
    return buildOnboardingHref('/(onboarding)/seleccion-marcas', merged);
  };

  const pasoCatalogo = catalogoStep(esMultimarca);

  const handleContinuar = () => {
    if (totalSeleccionados === 0) {
      showConfirm(
        'Sin servicios seleccionados',
        'Selecciona al menos un servicio para continuar. Puedes agregar más desde "Mis servicios" luego.',
        {
          confirmText: 'Continuar de todas formas',
          onConfirm: () => navegar(),
        },
      );
      return;
    }
    navegar();
  };

  const navegar = () => {
    try {
      const tipoStr = Array.isArray(tipo) ? tipo[0] : tipo;
      if (!tipoStr || (tipoStr !== 'taller' && tipoStr !== 'mecanico')) {
        showAlert('Error', 'Tipo de proveedor no válido. Vuelve al inicio.');
        router.replace('/(onboarding)/tipo-cuenta');
        return;
      }

      const serviciosSeleccionadosArr = stateToServiciosDraft(
        esMultimarca,
        seleccionadosGenericos,
        seleccionados,
      );

      const nextDraft = {
        ...draft,
        ...mergeRouteParamsIntoDraft(draft, rawParams as Record<string, string | string[] | undefined>),
        servicios_seleccionados: serviciosSeleccionadosArr,
      };
      patchDraft({ servicios_seleccionados: serviciosSeleccionadosArr });

      router.push(buildOnboardingHref('/(onboarding)/finalizar-basico', nextDraft) as any);
    } catch (e) {
      console.error(e);
      showAlert('Error', 'No se pudo continuar. Intenta nuevamente.');
    }
  };

  const footerLabel =
    totalSeleccionados > 0
      ? `Continuar con ${totalSeleccionados} servicio${totalSeleccionados !== 1 ? 's' : ''}`
      : 'Continuar';

  if (isLoading) {
    return (
      <OnboardingScreenLayout>
        <View style={onboardingStyles.loadingCenter}>
          <ActivityIndicator size="large" color={I.primary} />
          <Text style={onboardingStyles.loadingText}>
            {esMultimarca ? 'Cargando catálogo de servicios…' : 'Cargando servicios por marca…'}
          </Text>
        </View>
      </OnboardingScreenLayout>
    );
  }

  return (
    <OnboardingScreenLayout
      footer={<OnboardingPrimaryButton label={footerLabel} onPress={handleContinuar} />}
    >
      <OnboardingHeader
            title={esMultimarca ? 'Servicios que ofreces' : 'Servicios por marca'}
            subtitle={esMultimarca
              ? 'Elige los servicios que ofreces. Luego define un precio base o tarifas por marca en Mis servicios.'
              : 'Selecciona los servicios que ofrecerás por cada marca. Configura precios desde Mis servicios.'}
            currentStep={pasoCatalogo.current}
            totalSteps={pasoCatalogo.total}
            icon="construct"
            backPath={getBackPath()}
          />

          {/* Badge multimarca informativo */}
      {esMultimarca ? (
        <View style={styles.multimarcaBadge}>
          <InstitutionalIcon name="globe-outline" size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={styles.multimarcaBadgeText}>Multimarca — visible para todas las marcas; precios configurables por marca</Text>
        </View>
      ) : null}

      <OnboardingNotice>
        {esMultimarca
          ? 'Marca los servicios que ofreces. En Mis servicios podrás fijar un precio base o precios distintos por marca de vehículo.'
          : 'Toca cada servicio para marcarlo. Usa el botón por marca para seleccionar o deseleccionar todos. Los precios los configuras al publicar cada servicio.'}
      </OnboardingNotice>

      {loadError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      ) : null}

          {totalSeleccionados > 0 && (
            <View style={styles.resumenBox}>
              <InstitutionalIcon name="checkmark-circle" size={18} color={I.semanticUp} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.resumenText}>
                {totalSeleccionados} servicio{totalSeleccionados !== 1 ? 's' : ''} seleccionado{totalSeleccionados !== 1 ? 's' : ''}
              </Text>
            </View>
          )}

          {/* Vista para proveedor MULTIMARCA */}
          {esMultimarca ? (
            <View style={onboardingStyles.groupCard}>
              <View style={styles.grupoHeader}>
                <View style={styles.grupoTituloRow}>
                  <Text style={styles.grupoTitulo}>Catálogo de servicios</Text>
                  <Text style={styles.grupoCount}>
                    {seleccionadosGenericos.size}/{serviciosGenericos.length}
                  </Text>
                </View>
                {serviciosGenericos.length > 0 && (
                  <TouchableOpacity
                    onPress={toggleTodosGenericos}
                    style={[
                      styles.toggleTodoBtn,
                      serviciosGenericos.every((s) => seleccionadosGenericos.has(s.id)) && styles.toggleTodoBtnActive,
                    ]}
                    activeOpacity={0.7}
                  >
                    <InstitutionalIcon
                      name={serviciosGenericos.every((s) => seleccionadosGenericos.has(s.id)) ? 'checkbox' : 'square-outline'}
                      size={16}
                      color={serviciosGenericos.every((s) => seleccionadosGenericos.has(s.id)) ? I.onPrimary : I.body}
                      strokeWidth={ICON_STROKE_WIDTH}
                    />
                    <Text style={[
                      styles.toggleTodoBtnText,
                      serviciosGenericos.every((s) => seleccionadosGenericos.has(s.id)) && styles.toggleTodoBtnTextActive,
                    ]}>
                      {serviciosGenericos.every((s) => seleccionadosGenericos.has(s.id)) ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {serviciosGenericos.map((s) => {
                const isSelected = seleccionadosGenericos.has(s.id);
                return (
                  <TouchableOpacity
                    key={`generico-${s.id}`}
                    style={[styles.servicioRow, isSelected && styles.servicioRowSelected]}
                    onPress={() => toggleServicioGenerico(s.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.servicioLeft}>
                      <InstitutionalIcon
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={isSelected ? I.primary : I.mutedSoft}
                        style={styles.checkIcon}
                        strokeWidth={ICON_STROKE_WIDTH}
                      />
                      <View style={styles.servicioInfo}>
                        <Text style={[styles.servicioNombre, isSelected && styles.servicioNombreSelected]}>
                          {s.nombre}
                        </Text>
                        <Text style={styles.servicioMeta}>
                          {s.requiere_repuestos ? 'Con repuestos' : 'Sin repuestos'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (

          /* Vista para proveedor ESPECIALISTA (por marca) */
          marcasIds.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No hay marcas seleccionadas</Text>
              <Text style={styles.emptySub}>Vuelve atrás y elige al menos una marca.</Text>
            </View>
          ) : (
            grupos.map((grupo) => {
              const grupoSet = seleccionados[grupo.marcaId] ?? new Set<number>();
              const todosSeleccionados =
                grupo.servicios.length > 0 && grupo.servicios.every((s) => grupoSet.has(s.id));
              const algunoSeleccionado = grupo.servicios.some((s) => grupoSet.has(s.id));

              return (
                <View key={grupo.marcaId} style={onboardingStyles.groupCard}>
                  <View style={styles.grupoHeader}>
                    <View style={styles.grupoTituloRow}>
                      <Text style={styles.grupoTitulo}>{grupo.marcaNombre}</Text>
                      <Text style={styles.grupoCount}>
                        {grupoSet.size}/{grupo.servicios.length}
                      </Text>
                    </View>
                    {grupo.servicios.length > 0 && (
                      <TouchableOpacity
                        onPress={() => toggleTodoGrupo(grupo)}
                        style={[
                          styles.toggleTodoBtn,
                          todosSeleccionados && styles.toggleTodoBtnActive,
                        ]}
                        activeOpacity={0.7}
                      >
                        <InstitutionalIcon
                          name={todosSeleccionados ? 'checkbox' : algunoSeleccionado ? 'remove-circle-outline' : 'square-outline'}
                          size={16}
                          color={todosSeleccionados ? I.onPrimary : algunoSeleccionado ? I.primary : I.muted}
                         strokeWidth={ICON_STROKE_WIDTH} />
                        <Text
                          style={[
                            styles.toggleTodoBtnText,
                            todosSeleccionados && styles.toggleTodoBtnTextActive,
                          ]}
                        >
                          {todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {grupo.servicios.length === 0 ? (
                    <Text style={styles.sinServicios}>No hay servicios catalogados para esta marca aún.</Text>
                  ) : (
                    grupo.servicios.map((s) => {
                      const isSelected = grupoSet.has(s.id);
                      return (
                        <TouchableOpacity
                          key={`${grupo.marcaId}-${s.id}`}
                          style={[styles.servicioRow, isSelected && styles.servicioRowSelected]}
                          onPress={() => toggleServicio(grupo.marcaId, s.id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.servicioLeft}>
                            <InstitutionalIcon
                              name={isSelected ? 'checkbox' : 'square-outline'}
                              size={22}
                              color={isSelected ? I.primary : I.mutedSoft}
                              style={styles.checkIcon}
                             strokeWidth={ICON_STROKE_WIDTH} />
                            <View style={styles.servicioInfo}>
                              <Text style={[styles.servicioNombre, isSelected && styles.servicioNombreSelected]}>
                                {s.nombre}
                              </Text>
                              <Text style={styles.servicioMeta}>
                                {s.requiere_repuestos ? 'Con repuestos' : 'Sin repuestos'}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              );
            })
          ))}
    </OnboardingScreenLayout>
  );
}

const styles = StyleSheet.create({
  multimarcaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 82, 255, 0.06)',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 82, 255, 0.2)',
  },
  multimarcaBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: I.primary,
  },
  resumenBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(5, 177, 105, 0.08)',
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(5, 177, 105, 0.25)',
  },
  resumenText: { fontSize: 14, color: I.semanticUp, fontWeight: '600' },
  grupoHeader: { marginBottom: 10 },
  grupoTituloRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  grupoTitulo: { fontSize: 17, fontWeight: '700', color: I.ink },
  grupoCount: { fontSize: 13, color: I.muted, fontWeight: '600' },
  toggleTodoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: I.surfaceSoft,
    borderWidth: 1,
    borderColor: I.hairline,
    alignSelf: 'flex-start',
  },
  toggleTodoBtnActive: {
    backgroundColor: I.primary,
    borderColor: I.primary,
  },
  toggleTodoBtnText: { fontSize: 13, color: I.muted, fontWeight: '500' },
  toggleTodoBtnTextActive: { color: I.onPrimary },
  sinServicios: { fontSize: 14, color: I.mutedSoft, fontStyle: 'italic' },
  servicioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  servicioRowSelected: {
    backgroundColor: 'rgba(0, 82, 255, 0.06)',
  },
  servicioLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkIcon: { marginRight: 12 },
  servicioInfo: { flex: 1 },
  servicioNombre: { fontSize: 15, fontWeight: '500', color: I.body },
  servicioNombreSelected: { color: I.primary, fontWeight: '600' },
  servicioMeta: { fontSize: 12, color: I.mutedSoft, marginTop: 2 },
  emptyBox: { padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: I.ink },
  emptySub: { fontSize: 14, color: I.mutedSoft, marginTop: 6, textAlign: 'center' },
  errorBox: {
    backgroundColor: 'rgba(207, 32, 47, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(207, 32, 47, 0.25)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { fontSize: 14, color: I.semanticDown, textAlign: 'center' },
});
