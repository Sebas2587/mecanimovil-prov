import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { especialidadesAPI, type CategoriaServicio } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import OnboardingHeader from '@/components/OnboardingHeader';

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
          Alert.alert(
            'Límite alcanzado',
            `Solo puedes seleccionar un máximo de ${MAX_ESPECIALIDADES} especialidades.`,
            [{ text: 'OK' }]
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
        Alert.alert(
          'Límite alcanzado',
          `Solo puedes seleccionar un máximo de ${MAX_ESPECIALIDADES} especialidades.`,
          [{ text: 'OK' }]
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
        Alert.alert(
          'Límite alcanzado',
          `Se seleccionaron ${nuevasSelecciones.length} especialidades. Solo puedes tener un máximo de ${MAX_ESPECIALIDADES}.`,
          [{ text: 'OK' }]
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
        Alert.alert(
          'Especialidades Requeridas',
          'Como mecánico a domicilio, debes seleccionar al menos una especialidad.'
        );
        return false;
      }
      
      // Validar máximo
      if (seleccionadas.length > MAX_ESPECIALIDADES) {
        Alert.alert(
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
        Alert.alert('Error', 'Tipo de proveedor no válido. Por favor, vuelve al inicio.');
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
      router.push(`/(onboarding)/marcas?${params.toString()}`);
    } catch (error: any) {
      console.error('Error en handleContinuar (especialidades):', error);
      Alert.alert(
        'Error',
        'Ocurrió un error al continuar. Por favor, intenta nuevamente.',
        [{ text: 'OK' }]
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
          styles.especialidadItem, 
          isSelected && styles.especialidadSeleccionada,
          isDisabled && styles.especialidadDisabled
        ]}
        onPress={() => toggleEspecialidad(especialidad.id)}
        disabled={isDisabled}
        activeOpacity={isDisabled ? 1 : 0.7}
      >
        <View style={styles.especialidadContent}>
          <View style={styles.especialidadTexto}>
            <Text style={[
              styles.especialidadNombre, 
              isSelected && styles.especialidadNombreSeleccionada,
              isDisabled && styles.especialidadNombreDisabled
            ]}>
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
          <Ionicons 
            name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
            size={24} 
            color={
              isSelected ? "#27ae60" : 
              isDisabled ? "#e0e0e0" : 
              "#bdc3c7"
            } 
          />
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Cargando especialidades...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const especialidadesParaMostrar = especialidadesFiltradas();
  const todasSeleccionadas = especialidadesParaMostrar && especialidadesParaMostrar.length > 0 && Array.isArray(especialidadesSeleccionadas)
    ? especialidadesParaMostrar.every(especialidad => especialidadesSeleccionadas.includes(especialidad.id))
    : false;

  // Para talleres, las especialidades son opcionales
  const esOpcional = tipo === 'taller';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.contentWrapper}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          <OnboardingHeader
            title="Especialidades"
            subtitle={`${esOpcional ? 'Opcionalmente, selecciona' : 'Selecciona'} las especialidades que ${tipo === 'taller' ? 'ofrece tu taller' : 'manejas como mecánico'}`}
            currentStep={3}
            totalSteps={6}
            icon="construct"
            backPath={getBackPath()}
          />

          {esOpcional && (
            <View style={styles.infoContainer}>
              <Ionicons name="information-circle" size={20} color="#4E4FEB" />
              <Text style={styles.infoText}>
                Para talleres, las especialidades son opcionales. Puedes saltarte este paso.
              </Text>
            </View>
          )}

          {tipo === 'mecanico' && (
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#666666" />
              <TextInput
                style={styles.searchInput}
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Buscar especialidad..."
                placeholderTextColor="#999999"
              />
            </View>
          )}

          {tipo === 'mecanico' && (
            <View style={styles.controlsContainer}>
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={seleccionarTodas}
                activeOpacity={0.7}
              >
                <Text style={styles.selectAllText}>
                  {todasSeleccionadas ? 'Deseleccionar todas' : 'Seleccionar todas'}
                </Text>
              </TouchableOpacity>
              
              <Text style={styles.selectedCount}>
                {Array.isArray(especialidadesSeleccionadas) ? especialidadesSeleccionadas.length : 0} / {MAX_ESPECIALIDADES} seleccionadas
              </Text>
            </View>
          )}

          <View style={styles.especialidadesContainer}>
            {especialidadesParaMostrar && especialidadesParaMostrar.length > 0 ? (
              especialidadesParaMostrar.map(renderEspecialidad)
            ) : null}
          </View>

          {especialidadesParaMostrar && especialidadesParaMostrar.length === 0 && busqueda.length > 0 && (
            <View style={styles.noResultsContainer}>
              <Ionicons name="search" size={48} color="#B5B5B5" />
              <Text style={styles.noResultsText}>
                No se encontraron especialidades que coincidan con "{busqueda}"
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Botón fijo en la parte inferior */}
        <SafeAreaView edges={['bottom']} style={styles.fixedButtonContainer}>
          <TouchableOpacity
            style={[styles.continueButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleContinuar}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>
              {isSubmitting ? 'Guardando...' : 'Continuar'}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEEEEE',
  },
  contentWrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E6F5FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 13,
    color: '#666666',
    flex: 1,
    lineHeight: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#000000',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  selectAllText: {
    fontSize: 14,
    color: '#4E4FEB',
    fontWeight: '600',
  },
  selectedCount: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '600',
  },
  especialidadesContainer: {
    gap: 12,
    marginBottom: 20,
  },
  especialidadItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  especialidadSeleccionada: {
    borderColor: '#3DB6B1',
    backgroundColor: '#E6F7F5',
    borderWidth: 2,
  },
  especialidadContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  especialidadTexto: {
    flex: 1,
    marginRight: 12,
  },
  especialidadNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  especialidadNombreSeleccionada: {
    color: '#3DB6B1',
  },
  especialidadDescripcion: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  especialidadDisabled: {
    opacity: 0.5,
    backgroundColor: '#F5F5F5',
  },
  especialidadNombreDisabled: {
    color: '#999999',
  },
  especialidadDescripcionDisabled: {
    color: '#CCCCCC',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16,
  },
  fixedButtonContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButton: {
    backgroundColor: '#4E4FEB',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  buttonDisabled: {
    backgroundColor: '#D0D0D0',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
}); 