import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { vehiculoAPI, type MarcaVehiculo } from '@/services/api';
import { useOnboardingDraft } from '@/context/OnboardingDraftContext';
import OnboardingHeader from '@/components/OnboardingHeader';
import {
  OnboardingScreenLayout,
  OnboardingPrimaryButton,
  OnboardingNotice,
} from '@/components/onboarding';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { onboardingStyles } from '@/app/design-system/styles/onboarding';
import { buildOnboardingHref, mergeRouteParamsIntoDraft } from '@/utils/onboardingDraftParams';
import { marcasIdsKeyFromParam, normalizeMarcasIds, readRouteParam } from '@/utils/extractApiList';
import { showAlert } from '@/utils/platformAlert';

const I = COLORS.institutional;
const MAX_MARCAS = 5;

export default function SeleccionMarcasScreen() {
  const rawParams = useLocalSearchParams();
  const { tipo } = rawParams;
  const router = useRouter();
  const { draft, patchDraft } = useOnboardingDraft();

  const [marcas, setMarcas] = useState<MarcaVehiculo[]>([]);
  const [marcasSeleccionadas, setMarcasSeleccionadas] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const tipoStr = Array.isArray(tipo) ? tipo[0] : tipo;
  const marcasParamKey = marcasIdsKeyFromParam(rawParams.marcas);
  const esMultimarcaParamKey = readRouteParam(rawParams.es_multimarca) ?? '';
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // Solo al enfocar la pantalla (p. ej. volver desde paso 5). No re-ejecutar al editar el borrador.
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
      setMarcasSeleccionadas(normalizeMarcasIds(merged.marcas));
    }, [marcasParamKey, esMultimarcaParamKey, patchDraft, rawParams]),
  );

  useEffect(() => {
    cargarMarcas();
  }, []);

  const getBackPath = () => buildOnboardingHref('/(onboarding)/cobertura-marcas', draft);

  const cargarMarcas = async () => {
    try {
      setIsLoading(true);
      const marcasData = await vehiculoAPI.obtenerMarcas();
      setMarcas(Array.isArray(marcasData) ? marcasData : []);
    } catch (error) {
      console.error('Error cargando marcas:', error);
      showAlert(
        'No se pudieron cargar las marcas',
        'Verifica tu conexión e intenta de nuevo. Si el problema continúa, contacta a soporte.',
      );
      setMarcas([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMarca = (marcaId: number) => {
    const id = Number(marcaId);
    setMarcasSeleccionadas((prev) => {
      const prevArray = normalizeMarcasIds(Array.isArray(prev) ? prev : []);
      let next: number[];
      if (prevArray.includes(id)) {
        next = prevArray.filter((x) => x !== id);
      } else if (prevArray.length >= MAX_MARCAS) {
        showAlert(
          'Límite alcanzado',
          `Solo puedes seleccionar un máximo de ${MAX_MARCAS} marcas automotrices.`
        );
        return prevArray;
      } else {
        next = [...prevArray, id];
      }
      patchDraft({
        marcas: next,
        marcas_meta: next.map((mid) => ({
          id: mid,
          nombre: marcas.find((m) => m.id === mid)?.nombre ?? `Marca #${mid}`,
        })),
      });
      return next;
    });
  };

  const marcasFiltradas = (): MarcaVehiculo[] => {
    if (!marcas || !Array.isArray(marcas)) return [];
    if (!busqueda.trim()) return marcas;
    return marcas.filter((marca) =>
      marca.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );
  };

  const seleccionarTodas = () => {
    const marcasFiltradasList = marcasFiltradas();
    if (!marcasFiltradasList.length) return;

    const todasSeleccionadas =
      Array.isArray(marcasSeleccionadas) &&
      marcasFiltradasList.every((marca) => marcasSeleccionadas.includes(marca.id));

    if (todasSeleccionadas) {
      setMarcasSeleccionadas((prev) => {
        if (!Array.isArray(prev)) return [];
        const next = prev.filter((id) => !marcasFiltradasList.map((m) => m.id).includes(id));
        patchDraft({
          marcas: next,
          marcas_meta: next.map((id) => ({
            id,
            nombre: marcas.find((m) => m.id === id)?.nombre ?? `Marca #${id}`,
          })),
        });
        return next;
      });
      return;
    }

    const prevArray = Array.isArray(marcasSeleccionadas) ? marcasSeleccionadas : [];
    const disponibles = MAX_MARCAS - prevArray.length;

    if (disponibles <= 0) {
      showAlert(
        'Límite alcanzado',
        `Solo puedes seleccionar un máximo de ${MAX_MARCAS} marcas automotrices.`
      );
      return;
    }

    const nuevasSelecciones = marcasFiltradasList
      .filter((m) => !prevArray.includes(m.id))
      .slice(0, disponibles)
      .map((m) => m.id);

    setMarcasSeleccionadas((prev) => {
      const p = Array.isArray(prev) ? prev : [];
      const next = [...new Set([...p, ...nuevasSelecciones])];
      patchDraft({
        marcas: next,
        marcas_meta: next.map((id) => ({
          id,
          nombre: marcas.find((m) => m.id === id)?.nombre ?? `Marca #${id}`,
        })),
      });
      return next;
    });
  };

  const validarSeleccion = () => {
    const seleccionadas = Array.isArray(marcasSeleccionadas) ? marcasSeleccionadas : [];
    if (seleccionadas.length === 0) {
      showAlert(
        'Marcas requeridas',
        'Selecciona al menos una marca que atiendas para continuar.'
      );
      return false;
    }
    if (seleccionadas.length > MAX_MARCAS) {
      showAlert(
        'Límite excedido',
        `Solo puedes seleccionar un máximo de ${MAX_MARCAS} marcas automotrices.`
      );
      return false;
    }
    return true;
  };

  const handleContinuar = () => {
    if (!validarSeleccion()) return;

    if (!tipoStr || (tipoStr !== 'taller' && tipoStr !== 'mecanico')) {
      showAlert('Error', 'Tipo de proveedor no válido. Por favor, vuelve al inicio.');
      router.replace('/(onboarding)/tipo-cuenta');
      return;
    }

    const seleccion = Array.isArray(marcasSeleccionadas) ? marcasSeleccionadas : [];
    const marcasMeta = seleccion.map((id) => ({
      id,
      nombre: marcas.find((m) => m.id === id)?.nombre ?? `Marca #${id}`,
    }));

    const nextDraft = {
      ...draft,
      ...mergeRouteParamsIntoDraft(draft, rawParams as Record<string, string | string[] | undefined>),
      es_multimarca: false,
      marcas: seleccion,
      marcas_meta: marcasMeta,
    };
    patchDraft({
      es_multimarca: false,
      marcas: seleccion,
      marcas_meta: marcasMeta,
    });

    router.push(buildOnboardingHref('/(onboarding)/catalogo-servicios-marcas', nextDraft) as any);
  };

  const renderMarca = (marca: MarcaVehiculo) => {
    const marcaId = Number(marca.id);
    const seleccionadas = normalizeMarcasIds(
      Array.isArray(marcasSeleccionadas) ? marcasSeleccionadas : [],
    );
    const isSelected = seleccionadas.includes(marcaId);
    const isDisabled = !isSelected && seleccionadas.length >= MAX_MARCAS;

    return (
      <TouchableOpacity
        key={marca.id}
        style={[
          styles.marcaCard,
          isSelected && styles.marcaCardSelected,
          isDisabled && styles.marcaDisabled,
        ]}
        onPress={() => toggleMarca(marcaId)}
        disabled={isDisabled}
        activeOpacity={isDisabled ? 1 : 0.7}
      >
        <View style={styles.marcaCardHeader}>
          <InstitutionalIcon
            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
            size={20}
            color={isSelected ? I.primary : isDisabled ? I.mutedSoft : I.hairline}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </View>
        <Text
          style={[
            styles.marcaCardTitle,
            isSelected && styles.marcaCardTitleSelected,
            isDisabled && styles.marcaNombreDisabled,
          ]}
          numberOfLines={2}
        >
          {marca.nombre}
        </Text>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <OnboardingScreenLayout>
        <View style={onboardingStyles.loadingCenter}>
          <ActivityIndicator size="large" color={I.primary} />
          <Text style={onboardingStyles.loadingText}>Cargando marcas…</Text>
        </View>
      </OnboardingScreenLayout>
    );
  }

  const marcasParaMostrar = marcasFiltradas();
  const todasSeleccionadas =
    marcasParaMostrar.length > 0 &&
    Array.isArray(marcasSeleccionadas) &&
    marcasParaMostrar.every((marca) => marcasSeleccionadas.includes(marca.id));

  const count = Array.isArray(marcasSeleccionadas) ? marcasSeleccionadas.length : 0;

  return (
    <OnboardingScreenLayout
      footer={<OnboardingPrimaryButton label="Continuar a servicios" onPress={handleContinuar} />}
    >
      <OnboardingHeader
        title="Marcas que atiendes"
        subtitle="Como especialista, elige hasta 5 marcas de vehículos que trabajas."
        currentStep={4}
        totalSteps={6}
        icon="car"
        backPath={getBackPath()}
      />

      <OnboardingNotice>
        Selecciona entre 1 y {MAX_MARCAS} marcas. Te mostraremos a clientes con esos vehículos.
      </OnboardingNotice>

      <View style={onboardingStyles.searchRow}>
        <InstitutionalIcon name="search" size={20} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
        <TextInput
          style={onboardingStyles.searchInput}
          placeholder="Buscar marca…"
          value={busqueda}
          onChangeText={setBusqueda}
          placeholderTextColor={I.mutedSoft}
        />
      </View>

      {marcasParaMostrar.length > 0 ? (
        <TouchableOpacity style={onboardingStyles.tertiaryLink} onPress={seleccionarTodas} activeOpacity={0.7}>
          <InstitutionalIcon
            name={todasSeleccionadas ? 'checkmark-circle' : 'ellipse-outline'}
            size={20}
            color={I.primary}
            strokeWidth={ICON_STROKE_WIDTH}
          />
          <Text style={[onboardingStyles.tertiaryLinkText, { marginLeft: 8 }]}>
            {todasSeleccionadas ? 'Deseleccionar todas' : 'Seleccionar todas'}
          </Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.counterText}>
        {count} / {MAX_MARCAS} marca{count !== 1 ? 's' : ''} seleccionada{count !== 1 ? 's' : ''}
      </Text>

      <View style={styles.marcasGrid}>
        {marcasParaMostrar.map(renderMarca)}
      </View>

      {marcasParaMostrar.length === 0 ? (
        <View style={styles.emptyContainer}>
          <InstitutionalIcon name="search" size={48} color={I.mutedSoft} strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={styles.emptyText}>No se encontraron marcas</Text>
          <Text style={styles.emptySubtext}>Intenta con otro término de búsqueda</Text>
        </View>
      ) : null}
    </OnboardingScreenLayout>
  );
}

const styles = StyleSheet.create({
  counterText: {
    fontSize: 14,
    color: I.muted,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 12,
  },
  marcasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: SPACING.fixed.sm,
    marginBottom: 8,
  },
  marcaCard: {
    width: '48%',
    minHeight: 88,
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.medium,
    borderColor: I.hairline,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.sm,
    justifyContent: 'space-between',
  },
  marcaCardSelected: {
    borderColor: I.primary,
    backgroundColor: I.canvas,
  },
  marcaCardHeader: {
    alignItems: 'flex-end',
    marginBottom: SPACING.fixed.xs,
  },
  marcaCardTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    color: I.ink,
    lineHeight: 20,
    textAlign: 'left',
  },
  marcaCardTitleSelected: {
    color: I.primary,
  },
  marcaDisabled: { opacity: 0.5 },
  marcaNombreDisabled: { color: I.mutedSoft },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: I.muted,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: I.mutedSoft,
    marginTop: 8,
    textAlign: 'center',
  },
});
