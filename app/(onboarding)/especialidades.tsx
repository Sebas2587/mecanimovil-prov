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
import { especialidadesAPI, type CategoriaServicio } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
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
import { showAlert } from '@/utils/platformAlert';

const I = COLORS.institutional;

export default function EspecialidadesScreen() {
  const { tipo, ...otherParams } = useLocalSearchParams();
  const router = useRouter();
  const { usuario } = useAuth();
  
  const [especialidades, setEspecialidades] = useState<CategoriaServicio[]>([]);
  const [especialidadesSeleccionadas, setEspecialidadesSeleccionadas] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    cargarEspecialidades();
  }, []);

  const cargarEspecialidades = async () => {
    try {
      setIsLoading(true);
      const especialidadesData = await especialidadesAPI.obtenerCategorias();
      
      // Validar que sea un array antes de usar
      if (Array.isArray(especialidadesData)) {
        console.log('Especialidades cargadas:', especialidadesData.length, 'categorías');
        setEspecialidades(especialidadesData);
      } else {
        console.warn('⚠️ especialidadesData no es un array:', typeof especialidadesData);
        setEspecialidades([]);
      }
      
    } catch (error) {
      console.error('Error cargando especialidades:', error);
      console.log('Usando especialidades de ejemplo como fallback');
      
      // Especialidades de ejemplo en caso de error
      const especialidadesEjemplo = [
        { id: 1, nombre: 'Mecánica General', descripcion: 'Servicios básicos de mecánica automotriz' },
        { id: 2, nombre: 'Electricidad Automotriz', descripcion: 'Sistemas eléctricos del vehículo' },
        { id: 3, nombre: 'Frenos', descripcion: 'Mantenimiento y reparación de sistemas de frenos' },
        { id: 4, nombre: 'Suspensión', descripcion: 'Reparación de sistemas de suspensión' },
        { id: 5, nombre: 'Motor', descripcion: 'Reparación y mantenimiento de motores' },
        { id: 6, nombre: 'Transmisión', descripcion: 'Caja de cambios y transmisión' },
        { id: 7, nombre: 'Aire Acondicionado', descripcion: 'Sistema de climatización' },
        { id: 8, nombre: 'Diagnóstico por Computadora', descripcion: 'Diagnóstico con scanner automotriz' },
      ];
      setEspecialidades(especialidadesEjemplo);
    } finally {
      setIsLoading(false);
    }
  };

  const MAX_ESPECIALIDADES = 6;

  const toggleEspecialidad = (especialidadId: number) => {
    setEspecialidadesSeleccionadas(prev => {
      const prevArray = Array.isArray(prev) ? prev : [];
      if (prevArray.includes(especialidadId)) {
        // Deseleccionar
        return prevArray.filter(id => id !== especialidadId);
      } else {
        // Verificar límite antes de seleccionar
        if (prevArray.length >= MAX_ESPECIALIDADES) {
          showAlert(
            'Límite alcanzado',
            `Solo puedes seleccionar un máximo de ${MAX_ESPECIALIDADES} especialidades.`
          );
          return prevArray;
        }
        return [...prevArray, especialidadId];
      }
    });
  };

  const especialidadesFiltradas = (): CategoriaServicio[] => {
    if (!especialidades || !Array.isArray(especialidades)) {
      return [];
    }
    if (!busqueda.trim()) return especialidades;
    return especialidades.filter(especialidad => 
      especialidad.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (especialidad.descripcion && especialidad.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
    );
  };

  const seleccionarTodas = () => {
    const especialidadesFiltradasList = especialidadesFiltradas();
    if (!especialidadesFiltradasList || especialidadesFiltradasList.length === 0) {
      return;
    }
    
    const todasSeleccionadas = Array.isArray(especialidadesSeleccionadas) && especialidadesFiltradasList.every(especialidad => 
      especialidadesSeleccionadas.includes(especialidad.id)
    );
    
    if (todasSeleccionadas) {
      // Deseleccionar todas las filtradas
      setEspecialidadesSeleccionadas(prev => {
        if (!Array.isArray(prev)) return [];
        return prev.filter(id => !especialidadesFiltradasList.map(e => e.id).includes(id));
      });
    } else {
      // Seleccionar todas las filtradas, respetando el límite
      const prevArray = Array.isArray(especialidadesSeleccionadas) ? especialidadesSeleccionadas : [];
      const disponibles = MAX_ESPECIALIDADES - prevArray.length;
      
      if (disponibles <= 0) {
        showAlert(
          'Límite alcanzado',
          `Solo puedes seleccionar un máximo de ${MAX_ESPECIALIDADES} especialidades.`
        );
        return;
      }
      
      const nuevasSelecciones = especialidadesFiltradasList
        .filter(e => !prevArray.includes(e.id))
        .slice(0, disponibles)
        .map(e => e.id);
      
      setEspecialidadesSeleccionadas(prev => {
        const prevArray = Array.isArray(prev) ? prev : [];
        const combined = [...prevArray, ...nuevasSelecciones];
        return [...new Set(combined)]; // Eliminar duplicados
      });
      
      if (nuevasSelecciones.length < especialidadesFiltradasList.filter(e => !prevArray.includes(e.id)).length) {
        showAlert(
          'Límite alcanzado',
          `Se seleccionaron ${nuevasSelecciones.length} especialidades. Solo puedes tener un máximo de ${MAX_ESPECIALIDADES}.`
        );
      }
    }
  };

  const validarSeleccion = () => {
    try {
      const tipoStr = Array.isArray(tipo) ? tipo[0] : tipo;
      const seleccionadas = Array.isArray(especialidadesSeleccionadas) ? especialidadesSeleccionadas : [];
      
      // Validar mínimo para mecánicos
      if (tipoStr === 'mecanico' && seleccionadas.length === 0) {
        showAlert(
          'Especialidades Requeridas',
          'Como mecánico a domicilio, debes seleccionar al menos una especialidad.'
        );
        return false;
      }
      
      // Validar máximo
      if (seleccionadas.length > MAX_ESPECIALIDADES) {
        showAlert(
          'Límite excedido',
          `Solo puedes seleccionar un máximo de ${MAX_ESPECIALIDADES} especialidades.`
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error en validarSeleccion:', error);
      return false;
    }
  };

  const getBackPath = () => {
    try {
      // Construir la ruta de retroceso con todos los parámetros
      const params = new URLSearchParams();
      Object.entries(otherParams).forEach(([key, value]) => {
        if (value) {
          const valueStr = Array.isArray(value) ? value[0] : value;
          if (valueStr) params.append(key, String(valueStr));
        }
      });
      const tipoStr = Array.isArray(tipo) ? tipo[0] : tipo;
      if (tipoStr) params.append('tipo', String(tipoStr));
      return `/(onboarding)/informacion-basica?${params.toString()}`;
    } catch (error) {
      console.error('Error construyendo backPath:', error);
      return `/(onboarding)/informacion-basica?tipo=${tipo || ''}`;
    }
  };

  const handleContinuar = () => {
    try {
      if (!validarSeleccion()) {
        return;
      }

      // Validar que tipo esté definido
      const tipoStr = Array.isArray(tipo) ? tipo[0] : tipo;
      if (!tipoStr || (tipoStr !== 'taller' && tipoStr !== 'mecanico')) {
        showAlert('Error', 'Tipo de proveedor no válido. Por favor, vuelve al inicio.');
        router.replace('/(onboarding)/tipo-cuenta');
        return;
      }

      // Crear parámetros para la siguiente pantalla
      const params = new URLSearchParams();
      Object.entries(otherParams).forEach(([key, value]) => {
        if (value) {
          const valueStr = Array.isArray(value) ? value[0] : value;
          if (valueStr) params.append(key, String(valueStr));
        }
      });
      // tipoStr ya está declarado arriba, solo usarlo
      if (tipoStr) params.append('tipo', String(tipoStr));
      
      // Validar que especialidadesSeleccionadas sea un array antes de stringify
      if (Array.isArray(especialidadesSeleccionadas)) {
        params.append('especialidades', JSON.stringify(especialidadesSeleccionadas));
      } else {
        params.append('especialidades', JSON.stringify([]));
      }

      // Ir a selección de marcas
      router.push(`/(onboarding)/cobertura-marcas?${params.toString()}`);
    } catch (error: any) {
      console.error('Error en handleContinuar (especialidades):', error);
      showAlert(
        'Error',
        'Ocurrió un error al continuar. Por favor, intenta nuevamente.'
      );
    }
  };

  const renderEspecialidad = (especialidad: CategoriaServicio) => {
    const isSelected = Array.isArray(especialidadesSeleccionadas) && especialidadesSeleccionadas.includes(especialidad.id);
    const seleccionadas = Array.isArray(especialidadesSeleccionadas) ? especialidadesSeleccionadas : [];
    const isDisabled = !isSelected && seleccionadas.length >= MAX_ESPECIALIDADES;
    
    return (
      <TouchableOpacity
        key={especialidad.id}
        style={[
          onboardingStyles.selectionItem,
          isSelected && onboardingStyles.selectionItemSelected,
          isDisabled && styles.especialidadDisabled,
        ]}
        onPress={() => toggleEspecialidad(especialidad.id)}
        disabled={isDisabled}
        activeOpacity={isDisabled ? 1 : 0.7}
      >
        <View style={onboardingStyles.selectionItemBody}>
          <View style={styles.especialidadTexto}>
            <Text
              style={[
                onboardingStyles.optionTitle,
                isSelected && onboardingStyles.optionTitleSelected,
                isDisabled && styles.especialidadNombreDisabled,
              ]}
            >
              {especialidad.nombre}
            </Text>
            {especialidad.descripcion && (
              <Text style={[
                styles.especialidadDescripcion,
                isDisabled && styles.especialidadDescripcionDisabled
              ]}>
                {especialidad.descripcion}
              </Text>
            )}
          </View>
          <InstitutionalIcon 
            name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
            size={24} 
            color={isSelected ? I.primary : isDisabled ? I.mutedSoft : I.hairline} 
           strokeWidth={ICON_STROKE_WIDTH} />
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <OnboardingScreenLayout>
        <View style={onboardingStyles.loadingCenter}>
          <ActivityIndicator size="large" color={I.primary} />
          <Text style={onboardingStyles.loadingText}>Cargando especialidades…</Text>
        </View>
      </OnboardingScreenLayout>
    );
  }

  const especialidadesParaMostrar = especialidadesFiltradas();
  const todasSeleccionadas = especialidadesParaMostrar && especialidadesParaMostrar.length > 0 && Array.isArray(especialidadesSeleccionadas)
    ? especialidadesParaMostrar.every(especialidad => especialidadesSeleccionadas.includes(especialidad.id))
    : false;

  // Para talleres, las especialidades son opcionales
  const esOpcional = tipo === 'taller';

  return (
    <OnboardingScreenLayout
      footer={
        <OnboardingPrimaryButton
          label="Continuar"
          onPress={handleContinuar}
          loading={isSubmitting}
          loadingLabel="Guardando…"
        />
      }
    >
      <OnboardingHeader
        title="Especialidades"
        subtitle={`${esOpcional ? 'Opcionalmente, selecciona' : 'Selecciona'} las especialidades que ${tipo === 'taller' ? 'ofrece tu taller' : 'manejas como mecánico'}`}
        currentStep={3}
        totalSteps={6}
        icon="construct"
        backPath={getBackPath()}
      />

      {esOpcional ? (
        <OnboardingNotice>
          Para talleres, las especialidades son opcionales. Puedes saltarte este paso.
        </OnboardingNotice>
      ) : null}

      {tipo === 'mecanico' ? (
        <View style={onboardingStyles.searchRow}>
          <InstitutionalIcon name="search" size={20} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          <TextInput
            style={onboardingStyles.searchInput}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar especialidad…"
            placeholderTextColor={I.mutedSoft}
          />
        </View>
      ) : null}

      {tipo === 'mecanico' ? (
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={onboardingStyles.tertiaryLink} onPress={seleccionarTodas} activeOpacity={0.7}>
            <Text style={onboardingStyles.tertiaryLinkText}>
              {todasSeleccionadas ? 'Deseleccionar todas' : 'Seleccionar todas'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.selectedCount}>
            {Array.isArray(especialidadesSeleccionadas) ? especialidadesSeleccionadas.length : 0} /{' '}
            {MAX_ESPECIALIDADES}
          </Text>
        </View>
      ) : null}

      <View style={styles.especialidadesContainer}>
        {especialidadesParaMostrar?.length ? especialidadesParaMostrar.map(renderEspecialidad) : null}
      </View>

      {especialidadesParaMostrar?.length === 0 && busqueda.length > 0 ? (
        <View style={styles.noResultsContainer}>
          <InstitutionalIcon name="search" size={48} color={I.mutedSoft} strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={styles.noResultsText}>
            No se encontraron especialidades que coincidan con "{busqueda}"
          </Text>
        </View>
      ) : null}
    </OnboardingScreenLayout>
  );
}

const styles = StyleSheet.create({
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedCount: {
    fontSize: 14,
    color: I.muted,
    fontWeight: '600',
  },
  especialidadesContainer: {
    gap: 0,
    marginBottom: 20,
  },
  especialidadTexto: {
    flex: 1,
    marginRight: 12,
  },
  especialidadDescripcion: onboardingStyles.optionDescription,
  especialidadDisabled: {
    opacity: 0.45,
  },
  especialidadNombreDisabled: {
    color: I.mutedSoft,
  },
  especialidadDescripcionDisabled: {
    color: I.mutedSoft,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 15,
    color: I.muted,
    textAlign: 'center',
    marginTop: 16,
  },
}); 