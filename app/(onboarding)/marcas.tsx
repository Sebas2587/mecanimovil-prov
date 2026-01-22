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
import { vehiculoAPI, type MarcaVehiculo } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import OnboardingHeader from '@/components/OnboardingHeader';

export default function MarcasScreen() {
  const { tipo, ...otherParams } = useLocalSearchParams();
  const router = useRouter();
  
  const [marcas, setMarcas] = useState<MarcaVehiculo[]>([]);
  const [marcasSeleccionadas, setMarcasSeleccionadas] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    cargarMarcas();
  }, []);

  const cargarMarcas = async () => {
    try {
      setIsLoading(true);
      const marcasData = await vehiculoAPI.obtenerMarcas();
      
      // Validar que sea un array antes de usar
      if (Array.isArray(marcasData)) {
        console.log('Marcas cargadas:', marcasData.length, 'marcas');
        setMarcas(marcasData);
      } else {
        console.warn('⚠️ marcasData no es un array:', typeof marcasData);
        // Intentar extraer si viene en formato de respuesta
        if (marcasData && typeof marcasData === 'object' && 'results' in marcasData) {
          const resultados = (marcasData as any).results;
          if (Array.isArray(resultados)) {
            console.log('Marcas cargadas (desde results):', resultados.length, 'marcas');
            setMarcas(resultados);
          } else {
            setMarcas([]);
          }
        } else {
          setMarcas([]);
        }
      }
      
    } catch (error) {
      console.error('Error cargando marcas:', error);
      console.log('Usando marcas de ejemplo como fallback');
      
      // Marcas de ejemplo en caso de error
      const marcasEjemplo = [
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
        { id: 11, nombre: 'Renault' },
        { id: 12, nombre: 'Peugeot' },
      ];
      setMarcas(marcasEjemplo);
    } finally {
      setIsLoading(false);
    }
  };

  const MAX_MARCAS = 3;

  const toggleMarca = (marcaId: number) => {
    setMarcasSeleccionadas(prev => {
      const prevArray = Array.isArray(prev) ? prev : [];
      if (prevArray.includes(marcaId)) {
        // Deseleccionar
        return prevArray.filter(id => id !== marcaId);
      } else {
        // Verificar límite antes de seleccionar
        if (prevArray.length >= MAX_MARCAS) {
          Alert.alert(
            'Límite alcanzado',
            `Solo puedes seleccionar un máximo de ${MAX_MARCAS} marcas automotrices.`,
            [{ text: 'OK' }]
          );
          return prevArray;
        }
        return [...prevArray, marcaId];
      }
    });
  };

  const marcasFiltradas = (): MarcaVehiculo[] => {
    if (!marcas || !Array.isArray(marcas)) {
      return [];
    }
    if (!busqueda.trim()) return marcas;
    return marcas.filter(marca => 
      marca.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );
  };

  const seleccionarTodas = () => {
    const marcasFiltradasList = marcasFiltradas();
    if (!marcasFiltradasList || marcasFiltradasList.length === 0) {
      return;
    }
    
    const todasSeleccionadas = Array.isArray(marcasSeleccionadas) && marcasFiltradasList.every(marca => 
      marcasSeleccionadas.includes(marca.id)
    );
    
    if (todasSeleccionadas) {
      // Deseleccionar todas las filtradas
      setMarcasSeleccionadas(prev => {
        if (!Array.isArray(prev)) return [];
        return prev.filter(id => !marcasFiltradasList.map(m => m.id).includes(id));
      });
    } else {
      // Seleccionar todas las filtradas, respetando el límite
      const prevArray = Array.isArray(marcasSeleccionadas) ? marcasSeleccionadas : [];
      const disponibles = MAX_MARCAS - prevArray.length;
      
      if (disponibles <= 0) {
        Alert.alert(
          'Límite alcanzado',
          `Solo puedes seleccionar un máximo de ${MAX_MARCAS} marcas automotrices.`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      const nuevasSelecciones = marcasFiltradasList
        .filter(m => !prevArray.includes(m.id))
        .slice(0, disponibles)
        .map(m => m.id);
      
      setMarcasSeleccionadas(prev => {
        const prevArray = Array.isArray(prev) ? prev : [];
        const combined = [...prevArray, ...nuevasSelecciones];
        return [...new Set(combined)]; // Eliminar duplicados
      });
      
      if (nuevasSelecciones.length < marcasFiltradasList.filter(m => !prevArray.includes(m.id)).length) {
        Alert.alert(
          'Límite alcanzado',
          `Se seleccionaron ${nuevasSelecciones.length} marcas. Solo puedes tener un máximo de ${MAX_MARCAS}.`,
          [{ text: 'OK' }]
        );
      }
    }
  };

  const validarSeleccion = () => {
    try {
      const seleccionadas = Array.isArray(marcasSeleccionadas) ? marcasSeleccionadas : [];
      
      // Validar mínimo
      if (seleccionadas.length === 0) {
        Alert.alert(
          'Marcas Requeridas',
          'Debes seleccionar al menos una marca de vehículo que atiendas.'
        );
        return false;
      }
      
      // Validar máximo
      if (seleccionadas.length > MAX_MARCAS) {
        Alert.alert(
          'Límite excedido',
          `Solo puedes seleccionar un máximo de ${MAX_MARCAS} marcas automotrices.`
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error en validarSeleccion:', error);
      Alert.alert('Error', 'Ocurrió un error al validar la selección.');
      return false;
    }
  };

  const handleContinuar = () => {
    try {
      if (!validarSeleccion()) {
        return;
      }

      // Validar que tipo esté definido
      if (!tipo || (tipo !== 'taller' && tipo !== 'mecanico')) {
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
      const tipoStr = Array.isArray(tipo) ? tipo[0] : tipo;
      if (tipoStr) params.append('tipo', String(tipoStr));
      
      // Validar que marcasSeleccionadas sea un array antes de stringify
      if (Array.isArray(marcasSeleccionadas)) {
        params.append('marcas', JSON.stringify(marcasSeleccionadas));
      } else {
        params.append('marcas', JSON.stringify([]));
      }

      // Ir directamente a finalizar onboarding básico (sin documentos)
      router.push(`/(onboarding)/finalizar-basico?${params.toString()}` as any);
    } catch (error: any) {
      console.error('Error en handleContinuar (marcas):', error);
      Alert.alert(
        'Error',
        'Ocurrió un error al continuar. Por favor, intenta nuevamente.',
        [{ text: 'OK' }]
      );
    }
  };

  const getBackPath = () => {
    try {
      const params = new URLSearchParams();
      Object.entries(otherParams).forEach(([key, value]) => {
        if (value) {
          const valueStr = Array.isArray(value) ? value[0] : value;
          if (valueStr) params.append(key, String(valueStr));
        }
      });
      const tipoStr = Array.isArray(tipo) ? tipo[0] : tipo;
      if (tipoStr) params.append('tipo', String(tipoStr));
      return `/(onboarding)/especialidades?${params.toString()}`;
    } catch (error) {
      console.error('Error construyendo backPath:', error);
      return `/(onboarding)/especialidades?tipo=${tipo || ''}`;
    }
  };

  const renderMarca = (marca: MarcaVehiculo) => {
    const isSelected = Array.isArray(marcasSeleccionadas) && marcasSeleccionadas.includes(marca.id);
    const seleccionadas = Array.isArray(marcasSeleccionadas) ? marcasSeleccionadas : [];
    const isDisabled = !isSelected && seleccionadas.length >= MAX_MARCAS;
    
    return (
      <TouchableOpacity
        key={marca.id}
        style={[
          styles.marcaItem, 
          isSelected && styles.marcaSeleccionada,
          isDisabled && styles.marcaDisabled
        ]}
        onPress={() => toggleMarca(marca.id)}
        disabled={isDisabled}
        activeOpacity={isDisabled ? 1 : 0.7}
      >
        <View style={styles.marcaContent}>
          <View style={styles.marcaTexto}>
            <Text style={[
              styles.marcaNombre, 
              isSelected && styles.marcaNombreSeleccionada,
              isDisabled && styles.marcaNombreDisabled
            ]}>
              {marca.nombre}
            </Text>
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
          <Text style={styles.loadingText}>Cargando marcas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const marcasParaMostrar = marcasFiltradas();
  const todasSeleccionadas = marcasParaMostrar && marcasParaMostrar.length > 0 && Array.isArray(marcasSeleccionadas)
    ? marcasParaMostrar.every(marca => marcasSeleccionadas.includes(marca.id))
    : false;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.contentWrapper}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          <OnboardingHeader
            title="Marcas de Vehículos"
            subtitle={`Selecciona las marcas de vehículos que atiende tu ${tipo === 'taller' ? 'taller' : 'servicio'}`}
            currentStep={4}
            totalSteps={6}
            icon="car"
            backPath={getBackPath()}
          />

          {/* Barra de búsqueda */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar marca..."
              value={busqueda}
              onChangeText={setBusqueda}
              placeholderTextColor="#999999"
            />
          </View>

          {/* Botón para seleccionar/deseleccionar todas */}
          {marcasParaMostrar.length > 0 && (
            <TouchableOpacity style={styles.selectAllButton} onPress={seleccionarTodas} activeOpacity={0.7}>
              <Ionicons 
                name={todasSeleccionadas ? "checkmark-circle" : "ellipse-outline"} 
                size={20} 
                color="#4E4FEB" 
              />
              <Text style={styles.selectAllText}>
                {todasSeleccionadas ? 'Deseleccionar todas' : 'Seleccionar todas'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Contador de selecciones */}
          <View style={styles.counterContainer}>
            <Text style={styles.counterText}>
              {Array.isArray(marcasSeleccionadas) ? marcasSeleccionadas.length : 0} / {MAX_MARCAS} marca{(Array.isArray(marcasSeleccionadas) && marcasSeleccionadas.length !== 1) ? 's' : ''} seleccionada{(Array.isArray(marcasSeleccionadas) && marcasSeleccionadas.length !== 1) ? 's' : ''}
            </Text>
          </View>

          {/* Lista de marcas */}
          <View style={styles.marcasContainer}>
            {marcasParaMostrar.map(renderMarca)}
          </View>

          {marcasParaMostrar.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={48} color="#B5B5B5" />
              <Text style={styles.emptyText}>No se encontraron marcas</Text>
              <Text style={styles.emptySubtext}>Intenta con otro término de búsqueda</Text>
            </View>
          )}
        </ScrollView>

        {/* Botón fijo en la parte inferior */}
        <SafeAreaView edges={['bottom']} style={styles.fixedButtonContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinuar}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continuar</Text>
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
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 16,
  },
  selectAllText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4E4FEB',
    fontWeight: '600',
  },
  counterContainer: {
    marginBottom: 16,
  },
  counterText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '600',
  },
  marcasContainer: {
    gap: 12,
    marginBottom: 24,
  },
  marcaItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  marcaSeleccionada: {
    backgroundColor: '#E6F7F5',
    borderColor: '#3DB6B1',
    borderWidth: 2,
  },
  marcaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  marcaTexto: {
    flex: 1,
  },
  marcaNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  marcaNombreSeleccionada: {
    color: '#3DB6B1',
  },
  marcaDisabled: {
    opacity: 0.5,
    backgroundColor: '#F5F5F5',
  },
  marcaNombreDisabled: {
    color: '#999999',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
    textAlign: 'center',
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
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
}); 