import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { vehiculoAPI, type MarcaVehiculo } from '@/services/api';
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
import { appendOnboardingParams } from '@/utils/onboardingNavigation';
import { showAlert } from '@/utils/platformAlert';

const I = COLORS.institutional;
const MAX_MARCAS = 5;

export default function SeleccionMarcasScreen() {
  const { tipo, ...otherParams } = useLocalSearchParams();
  const router = useRouter();

  const [marcas, setMarcas] = useState<MarcaVehiculo[]>([]);
  const [marcasSeleccionadas, setMarcasSeleccionadas] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const tipoStr = Array.isArray(tipo) ? tipo[0] : tipo;

  useEffect(() => {
    cargarMarcas();
  }, []);

  const buildParams = () => {
    const params = new URLSearchParams();
    appendOnboardingParams(params, { ...otherParams, tipo: tipoStr });
    return params;
  };

  const cargarMarcas = async () => {
    try {
      setIsLoading(true);
      const marcasData = await vehiculoAPI.obtenerMarcas();

      if (Array.isArray(marcasData)) {
        setMarcas(marcasData);
      } else if (marcasData && typeof marcasData === 'object' && 'results' in marcasData) {
        const resultados = (marcasData as { results?: MarcaVehiculo[] }).results;
        setMarcas(Array.isArray(resultados) ? resultados : []);
      } else {
        setMarcas([]);
      }
    } catch (error) {
      console.error('Error cargando marcas:', error);
      setMarcas([
        { id: 1, nombre: 'Toyota' },
        { id: 2, nombre: 'Honda' },
        { id: 3, nombre: 'Nissan' },
        { id: 4, nombre: 'Hyundai' },
        { id: 5, nombre: 'Kia' },
        { id: 6, nombre: 'Mazda' },
        { id: 7, nombre: 'Suzuki' },
        { id: 8, nombre: 'Chevrolet' },
        { id: 9, nombre: 'Ford' },
        { id: 10, nombre: 'Volkswagen' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMarca = (marcaId: number) => {
    setMarcasSeleccionadas((prev) => {
      const prevArray = Array.isArray(prev) ? prev : [];
      if (prevArray.includes(marcaId)) {
        return prevArray.filter((id) => id !== marcaId);
      }
      if (prevArray.length >= MAX_MARCAS) {
        showAlert(
          'Límite alcanzado',
          `Solo puedes seleccionar un máximo de ${MAX_MARCAS} marcas automotrices.`
        );
        return prevArray;
      }
      return [...prevArray, marcaId];
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
        return prev.filter((id) => !marcasFiltradasList.map((m) => m.id).includes(id));
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
      return [...new Set([...p, ...nuevasSelecciones])];
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

    const params = buildParams();
    params.append('es_multimarca', 'false');
    params.append(
      'marcas',
      JSON.stringify(Array.isArray(marcasSeleccionadas) ? marcasSeleccionadas : [])
    );

    router.push(`/(onboarding)/catalogo-servicios-marcas?${params.toString()}` as any);
  };

  const getBackPath = () => {
    const params = buildParams();
    return `/(onboarding)/cobertura-marcas?${params.toString()}`;
  };

  const renderMarca = (marca: MarcaVehiculo) => {
    const isSelected =
      Array.isArray(marcasSeleccionadas) && marcasSeleccionadas.includes(marca.id);
    const seleccionadas = Array.isArray(marcasSeleccionadas) ? marcasSeleccionadas : [];
    const isDisabled = !isSelected && seleccionadas.length >= MAX_MARCAS;

    return (
      <TouchableOpacity
        key={marca.id}
        style={[
          onboardingStyles.selectionItem,
          isSelected && onboardingStyles.selectionItemSelected,
          isDisabled && styles.marcaDisabled,
        ]}
        onPress={() => toggleMarca(marca.id)}
        disabled={isDisabled}
        activeOpacity={isDisabled ? 1 : 0.7}
      >
        <View style={onboardingStyles.selectionItemBody}>
          <View style={styles.marcaTexto}>
            <Text
              style={[
                onboardingStyles.optionTitle,
                isSelected && onboardingStyles.optionTitleSelected,
                isDisabled && styles.marcaNombreDisabled,
              ]}
            >
              {marca.nombre}
            </Text>
          </View>
          <InstitutionalIcon
            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={isSelected ? I.primary : isDisabled ? I.mutedSoft : I.hairline}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </View>
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

      <View style={styles.marcasContainer}>
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
  marcasContainer: { gap: 12, marginBottom: 8 },
  marcaTexto: { flex: 1, marginRight: 12 },
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
