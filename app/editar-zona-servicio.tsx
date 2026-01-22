import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import serviceAreasApi, { Commune, Region, ServiceArea } from '@/services/serviceAreasApi';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';
import Header from '@/components/Header';

export default function EditarZonaServicioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const [serviceArea, setServiceArea] = useState<ServiceArea | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [selectedCommunes, setSelectedCommunes] = useState<Commune[]>([]);
  const [availableCommunes, setAvailableCommunes] = useState<Commune[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingCommunes, setLoadingCommunes] = useState(false);
  const [showCommuneSelector, setShowCommuneSelector] = useState(false);

  // Obtener valores seguros del tema con fallbacks
  const safeColors = useMemo(() => {
    return theme?.colors || COLORS || {};
  }, [theme]);

  const safeSpacing = useMemo(() => {
    return theme?.spacing || SPACING || {};
  }, [theme]);

  const safeTypography = useMemo(() => {
    return theme?.typography || TYPOGRAPHY || {};
  }, [theme]);

  const safeShadows = useMemo(() => {
    return theme?.shadows || SHADOWS || {};
  }, [theme]);

  const safeBorders = useMemo(() => {
    return theme?.borders || BORDERS || {};
  }, [theme]);

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Cargar regiones y comunas primero
        await Promise.all([loadRegions(), loadAllCommunes()]);
        
        // Luego cargar los datos de la zona específica
        if (id) {
          await loadServiceAreaData();
        }
      } catch (error) {
        console.error('Error cargando datos iniciales:', error);
      }
    };
    
    loadInitialData();
  }, [id]);

  // Efecto para mapear comunas cuando se cargan los datos de la zona
  useEffect(() => {
    if (serviceArea && availableCommunes.length > 0) {
      console.log('🔄 Iniciando mapeo de comunas...');
      console.log('📋 Zona de servicio:', serviceArea.name);
      console.log('📍 Comunas en la zona:', serviceArea.commune_names);
      console.log('🏙️ Comunas disponibles:', availableCommunes.length);
      
      // Mapear los nombres de comunas a objetos Commune completos
      if (serviceArea.commune_names && serviceArea.commune_names.length > 0) {
        const selectedCommunesObjects = serviceArea.commune_names
          .map(communeName => {
            const found = availableCommunes.find(commune => commune.name === communeName);
            console.log(`🔍 Buscando "${communeName}": ${found ? '✅ Encontrada' : '❌ No encontrada'}`);
            return found;
          })
          .filter(commune => commune !== undefined) as Commune[];
        
        console.log('🔍 Mapeando comunas de la zona:', {
          commune_names: serviceArea.commune_names,
          mapeadas: selectedCommunesObjects.length,
          total_disponibles: availableCommunes.length,
          comunas_mapeadas: selectedCommunesObjects.map(c => c.name)
        });
        
        setSelectedCommunes(selectedCommunesObjects);
      } else {
        console.log('⚠️ No se encontraron comunas en la zona');
        setSelectedCommunes([]);
      }
    } else {
      console.log('⏳ Esperando datos...', {
        tiene_service_area: !!serviceArea,
        comunas_disponibles: availableCommunes.length
      });
    }
  }, [serviceArea, availableCommunes]);

  // Cargar datos de la zona de servicio a editar
  const loadServiceAreaData = async () => {
    try {
      setLoadingData(true);
      
      // Obtener la zona específica desde la API
      const serviceAreaData = await serviceAreasApi.getServiceAreas();
      const area = serviceAreaData.find(area => area.id === id);
      
      if (!area) {
        Alert.alert('Error', 'Zona de servicio no encontrada');
        router.back();
        return;
      }
      
      setServiceArea(area);
      setZoneName(area.name || '');
      
      console.log('✅ Zona de servicio cargada:', {
        id: area.id,
        name: area.name,
        commune_names: area.commune_names,
        commune_count: area.commune_names?.length || 0
      });
      
    } catch (error) {
      console.error('Error cargando zona de servicio:', error);
      Alert.alert('Error', 'No se pudo cargar la zona de servicio');
      router.back();
    } finally {
      setLoadingData(false);
    }
  };

  // Cargar regiones
  const loadRegions = async () => {
    try {
      const response = await serviceAreasApi.getRegions();
      setRegions(response || []);
    } catch (error) {
      console.error('Error cargando regiones:', error);
      setRegions([]);
    }
  };

  // Cargar todas las comunas
  const loadAllCommunes = async () => {
    try {
      setLoadingCommunes(true);
      const response = await serviceAreasApi.getCommunes();
      setAvailableCommunes(response || []);
    } catch (error) {
      console.error('Error cargando comunas:', error);
      setAvailableCommunes([]);
    } finally {
      setLoadingCommunes(false);
    }
  };

  // Filtrar comunas
  const getFilteredCommunes = () => {
    let filtered = availableCommunes;

    // Filtrar por región seleccionada
    if (selectedRegion) {
      filtered = filtered.filter(commune => commune.region_code === selectedRegion);
    }

    // Filtrar por texto de búsqueda
    if (searchText.trim()) {
      filtered = filtered.filter(commune =>
        commune.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Excluir comunas ya seleccionadas
    const selectedCodes = selectedCommunes.map(c => c.code);
    filtered = filtered.filter(commune => !selectedCodes.includes(commune.code));

    return filtered;
  };

  // Agregar comuna a la selección
  const addCommune = (commune: Commune) => {
    setSelectedCommunes(prev => [...prev, commune]);
  };

  // Remover comuna de la selección
  const removeCommune = (communeCode: string) => {
    setSelectedCommunes(prev => prev.filter(c => c.code !== communeCode));
  };

  // Validar formulario
  const validateForm = () => {
    if (selectedCommunes.length === 0) {
      Alert.alert('Error', 'Debes seleccionar al menos una comuna');
      return false;
    }

    if (selectedCommunes.length > 50) {
      Alert.alert('Error', 'No puedes seleccionar más de 50 comunas');
      return false;
    }

    if (zoneName.trim() && zoneName.trim().length < 3) {
      Alert.alert('Error', 'El nombre de la zona debe tener al menos 3 caracteres');
      return false;
    }

    return true;
  };

  // Generar nombre automático para la zona basado en las comunas
  const generateZoneName = (communes: Commune[]): string => {
    if (communes.length === 0) return '';
    
    if (communes.length === 1) {
      return `Zona ${communes[0].name}`;
    }
    
    if (communes.length === 2) {
      return `Zona ${communes[0].name} - ${communes[1].name}`;
    }
    
    // Para más de 2 comunas, usar la primera y agregar "+X más"
    const firstCommune = communes[0].name;
    const remainingCount = communes.length - 1;
    return `Zona ${firstCommune} +${remainingCount} más`;
  };

  // Guardar cambios en la zona de servicio
  const saveServiceArea = async () => {
    if (!validateForm() || !serviceArea) return;

    try {
      setLoading(true);

      // Generar nombre automático si no se proporcionó uno manual
      const finalZoneName = zoneName.trim() || generateZoneName(selectedCommunes);

      const updateData = {
        name: finalZoneName,
        commune_names: selectedCommunes.map(c => c.name),
      };

      console.log('Actualizando zona de servicio:', updateData);

      // Llamada real a la API
      await serviceAreasApi.updateServiceArea(serviceArea.id, updateData);

      Alert.alert(
        'Éxito',
        'Zona de servicio actualizada correctamente',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );

    } catch (error) {
      console.error('Error actualizando zona:', error);
      Alert.alert('Error', 'No se pudo actualizar la zona de servicio');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar zona de servicio
  const deleteServiceArea = () => {
    if (!serviceArea) return;

    Alert.alert(
      'Eliminar Zona',
      `¿Estás seguro de que quieres eliminar "${serviceArea.name || 'esta zona'}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Llamada real a la API
              await serviceAreasApi.deleteServiceArea(serviceArea.id);
              
              Alert.alert(
                'Éxito',
                'Zona eliminada correctamente',
                [
                  {
                    text: 'OK',
                    onPress: () => router.back()
                  }
                ]
              );
            } catch (error) {
              console.error('Error eliminando zona:', error);
              Alert.alert('Error', 'No se pudo eliminar la zona');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Obtener colores del sistema de diseño
  const bgPaper = (safeColors?.background as any)?.paper || (safeColors?.base as any)?.white || '#FFFFFF';
  const bgDefault = (safeColors?.background as any)?.default || '#F5F7F8';
  const textPrimary = safeColors?.text?.primary || (safeColors?.neutral as any)?.inkBlack || '#00171F';
  const textSecondary = safeColors?.text?.secondary || ((safeColors?.neutral as any)?.gray as any)?.[800] || '#3E4F53';
  const textTertiary = safeColors?.text?.tertiary || ((safeColors?.neutral as any)?.gray as any)?.[700] || '#5D6F75';
  const borderLight = (safeColors?.border as any)?.light || ((safeColors?.neutral as any)?.gray as any)?.[200] || '#D7DFE3';
  const primaryObj = safeColors?.primary as any;
  const successObj = safeColors?.success as any;
  const errorObj = safeColors?.error as any;
  const warningObj = safeColors?.warning as any;
  const infoObj = safeColors?.info as any;
  const accentObj = safeColors?.accent as any;
  const primary500 = primaryObj?.['500'] || (safeColors?.accent as any)?.['500'] || '#003459';
  const success500 = successObj?.main || successObj?.['500'] || '#00C9A7';
  const error500 = errorObj?.main || errorObj?.['500'] || '#FF6B6B';
  const warning500 = warningObj?.main || warningObj?.['500'] || '#FFB84D';
  const info500 = infoObj?.main || infoObj?.['500'] || accentObj?.['500'] || '#007EA7';
  const containerHorizontal = safeSpacing?.container?.horizontal || safeSpacing?.content?.horizontal || 18;
  const spacingXs = safeSpacing?.xs || 4;
  const spacingSm = safeSpacing?.sm || 8;
  const spacingMd = safeSpacing?.md || 16;
  const spacingLg = safeSpacing?.lg || 24;
  const cardPadding = safeSpacing?.cardPadding || spacingMd;
  const cardGap = safeSpacing?.cardGap || spacingSm + 4;
  const radiusXl = safeBorders?.radius?.xl || 16;
  const fontSizeBase = safeTypography?.fontSize?.base || 14;
  const fontSizeSm = safeTypography?.fontSize?.sm || 12;
  const fontSizeMd = safeTypography?.fontSize?.md || 16;
  const fontSizeLg = safeTypography?.fontSize?.lg || 18;
  const fontWeightMedium = safeTypography?.fontWeight?.medium || '500';
  const fontWeightSemibold = safeTypography?.fontWeight?.semibold || '600';
  const fontWeightBold = safeTypography?.fontWeight?.bold || '700';
  const shadowSm = safeShadows?.sm || { shadowColor: '#00171F', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 };
  const shadowMd = safeShadows?.md || { shadowColor: '#00171F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 };

  // Renderizar comuna en la lista de selección
  const renderCommuneItem = ({ item }: { item: Commune }) => (
    <TouchableOpacity
      style={[styles.communeItem, { backgroundColor: bgPaper }]}
      onPress={() => addCommune(item)}
      activeOpacity={0.7}
    >
      <View style={styles.communeInfo}>
        <Text style={[styles.communeName, { color: textPrimary }]}>{item.name}</Text>
        <Text style={[styles.communeRegion, { color: textTertiary }]}>
          {item.province_name}, {item.region_name}
        </Text>
      </View>
      <Ionicons name="add-circle" size={24} color={primary500} />
    </TouchableOpacity>
  );

  // Renderizar comuna seleccionada
  const renderSelectedCommune = (commune: Commune) => (
    <View key={commune.code} style={[styles.selectedCommuneTag, { backgroundColor: bgPaper, borderColor: borderLight, ...shadowSm }]}>
      <Text style={[styles.selectedCommuneText, { color: textPrimary }]}>{commune.name}</Text>
      <TouchableOpacity onPress={() => removeCommune(commune.code)} activeOpacity={0.7}>
        <Ionicons name="close-circle" size={18} color={error500} />
      </TouchableOpacity>
    </View>
  );

  if (loadingData) {
    return (
      <View style={[styles.container, { backgroundColor: bgDefault }]}>
        <Header 
          title="Editar Zona de Servicio"
          showBack
          onBackPress={() => router.back()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primary500} />
          <Text style={[styles.loadingText, { color: textTertiary }]}>Cargando zona de servicio...</Text>
        </View>
      </View>
    );
  }

  if (!serviceArea) {
    return (
      <View style={[styles.container, { backgroundColor: bgDefault }]}>
        <Header 
          title="Editar Zona de Servicio"
          showBack
          onBackPress={() => router.back()}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={error500} />
          <Text style={[styles.errorText, { color: error500 }]}>No se pudo cargar la zona de servicio</Text>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: primary500, ...shadowMd }]} 
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={[styles.backButtonText, { color: COLORS?.text?.onPrimary || COLORS?.base?.white || '#FFFFFF' }]}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgDefault }]}>
      <Stack.Screen
        options={{
          title: 'Editar Zona de Servicio',
          headerShown: false,
        }}
      />
      
      <Header 
        title="Editar Zona de Servicio"
        showBack
        onBackPress={() => router.back()}
        rightComponent={
          <TouchableOpacity
            onPress={deleteServiceArea}
            activeOpacity={0.7}
            style={styles.deleteButtonHeader}
          >
            <Ionicons name="trash" size={20} color={error500} />
          </TouchableOpacity>
        }
      />

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View style={[styles.content, { paddingHorizontal: containerHorizontal }]}>
          {/* Información actual - UI Card */}
          <View style={[styles.uiCard, { backgroundColor: (warningObj?.light || '#FFF4E6'), borderColor: warning500 }]}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={20} color={warning500} />
              <Text style={[styles.infoTitle, { color: warning500 }]}>Editando zona existente</Text>
            </View>
            <Text style={[styles.infoText, { color: textPrimary }]}>
              Modifica el nombre y las comunas de tu zona de servicio. Los cambios se aplicarán 
              inmediatamente para futuras solicitudes.
            </Text>
            <View style={styles.statusContainer}>
              <Text style={[styles.statusLabel, { color: textPrimary }]}>Estado actual:</Text>
              <View style={[
                styles.statusBadge,
                { 
                  backgroundColor: serviceArea.is_active ? (successObj?.light || '#E6F7F4') : bgDefault,
                  borderColor: serviceArea.is_active ? success500 : borderLight,
                  borderWidth: 1
                }
              ]}>
                <Text style={[styles.statusText, { color: serviceArea.is_active ? success500 : textTertiary }]}>
                  {serviceArea.is_active ? 'Activa' : 'Inactiva'}
                </Text>
              </View>
            </View>
          </View>

          {/* Nombre de la zona - UI Card */}
          <View style={styles.uiCard}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Nombre de la Zona</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: bgPaper, borderColor: borderLight, color: textPrimary }]}
              placeholder="Ej: Mi Zona Santiago Centro"
              placeholderTextColor={textTertiary}
              value={zoneName}
              onChangeText={setZoneName}
              maxLength={100}
            />
            <Text style={[styles.helperText, { color: textTertiary }]}>
              {zoneName.trim() 
                ? 'Nombre personalizado para tu zona'
                : `Se generará automáticamente: "${generateZoneName(selectedCommunes)}"`
              }
            </Text>
          </View>

          {/* Comunas seleccionadas - UI Card */}
          <View style={styles.uiCard}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                Comunas Seleccionadas ({selectedCommunes.length})
              </Text>
              <TouchableOpacity
                style={[styles.addCommuneButton, { backgroundColor: (primaryObj?.['50'] || '#E6F0F5') }]}
                onPress={() => setShowCommuneSelector(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={16} color={primary500} />
                <Text style={[styles.addCommuneText, { color: primary500 }]}>Agregar</Text>
              </TouchableOpacity>
            </View>

            {selectedCommunes.length > 0 ? (
              <View style={styles.selectedCommunesContainer}>
                {selectedCommunes.map(renderSelectedCommune)}
              </View>
            ) : (
              <View style={[styles.emptyCommunesContainer, { backgroundColor: bgPaper, borderColor: borderLight }]}>
                <Ionicons name="location-outline" size={48} color={textTertiary} />
                <Text style={[styles.emptyCommunesText, { color: textPrimary }]}>
                  No hay comunas seleccionadas
                </Text>
                <Text style={[styles.emptyCommunesSubtext, { color: textTertiary }]}>
                  Toca "Agregar" para seleccionar las comunas donde ofreces servicios
                </Text>
              </View>
            )}
          </View>

          {/* Resumen de cambios - UI Card */}
          {selectedCommunes.length > 0 && (
            <View style={[styles.summaryCard, { backgroundColor: (successObj?.light || '#E6F7F4'), borderColor: success500 }]}>
              <Text style={[styles.summaryTitle, { color: textPrimary }]}>Resumen de Cambios</Text>
              <Text style={[styles.summaryText, { color: textPrimary }]}>
                Nueva cobertura: {selectedCommunes.length} comuna{selectedCommunes.length !== 1 ? 's' : ''}
              </Text>
              <Text style={[styles.summarySubtext, { color: textTertiary }]}>
                Los cambios se aplicarán inmediatamente después de guardar
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Botón guardar */}
      <View style={[styles.bottomContainer, { backgroundColor: bgPaper, borderTopColor: borderLight }]}>
        <TouchableOpacity
          style={[
            styles.saveButton, 
            { backgroundColor: primary500, ...shadowMd },
            loading && styles.saveButtonDisabled
          ]}
          onPress={saveServiceArea}
          disabled={loading || selectedCommunes.length === 0}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS?.text?.onPrimary || COLORS?.base?.white || '#FFFFFF'} />
          ) : (
            <Ionicons name="checkmark-circle" size={20} color={COLORS?.text?.onPrimary || COLORS?.base?.white || '#FFFFFF'} />
          )}
          <Text style={[styles.saveButtonText, { color: COLORS?.text?.onPrimary || COLORS?.base?.white || '#FFFFFF' }]}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal selector de comunas */}
      <Modal
        visible={showCommuneSelector}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCommuneSelector(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: bgDefault }]}>
          <View style={[styles.modalHeader, { backgroundColor: bgPaper, borderBottomColor: borderLight }]}>
            <Text style={[styles.modalTitle, { color: textPrimary }]}>Agregar Comunas</Text>
            <TouchableOpacity onPress={() => setShowCommuneSelector(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Filtros */}
          <View style={[styles.filtersContainer, { backgroundColor: bgPaper, borderBottomColor: borderLight }]}>
            {/* Búsqueda */}
            <View style={[styles.searchContainer, { backgroundColor: bgDefault }]}>
              <Ionicons name="search" size={20} color={textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: textPrimary }]}
                placeholder="Buscar comuna..."
                placeholderTextColor={textTertiary}
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>

            {/* Selector de región */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.regionSelector}
            >
              <TouchableOpacity
                style={[
                  styles.regionChip,
                  { backgroundColor: !selectedRegion ? primary500 : bgDefault, borderColor: borderLight },
                  !selectedRegion && styles.regionChipActive
                ]}
                onPress={() => setSelectedRegion(null)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.regionChipText,
                  { color: !selectedRegion ? (COLORS?.text?.onPrimary || COLORS?.base?.white || '#FFFFFF') : textPrimary }
                ]}>
                  Todas las regiones
                </Text>
              </TouchableOpacity>
              {regions.map(region => (
                <TouchableOpacity
                  key={region.region_code}
                  style={[
                    styles.regionChip,
                    { 
                      backgroundColor: selectedRegion === region.region_code ? primary500 : bgDefault, 
                      borderColor: borderLight 
                    },
                    selectedRegion === region.region_code && styles.regionChipActive
                  ]}
                  onPress={() => setSelectedRegion(region.region_code)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.regionChipText,
                    { color: selectedRegion === region.region_code ? (COLORS?.text?.onPrimary || COLORS?.base?.white || '#FFFFFF') : textPrimary }
                  ]}>
                    {region.region_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Lista de comunas */}
          {loadingCommunes ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={primary500} />
              <Text style={[styles.loadingText, { color: textTertiary }]}>Cargando comunas...</Text>
            </View>
          ) : (
            <FlatList
              data={getFilteredCommunes()}
              renderItem={renderCommuneItem}
              keyExtractor={(item) => item.code}
              style={styles.communesList}
              ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: borderLight }]} />}
              ListEmptyComponent={() => (
                <View style={styles.emptyListContainer}>
                  <Ionicons name="search" size={48} color={textTertiary} />
                  <Text style={[styles.emptyListText, { color: textPrimary }]}>No se encontraron comunas</Text>
                  <Text style={[styles.emptyListSubtext, { color: textTertiary }]}>
                    Intenta cambiar los filtros o el texto de búsqueda
                  </Text>
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// Función para crear estilos usando tokens del sistema de diseño
const createStyles = () => {
  const bgPaper = COLORS?.background?.paper || COLORS?.base?.white || '#FFFFFF';
  const bgDefault = COLORS?.background?.default || '#F5F7F8';
  const textPrimary = COLORS?.text?.primary || COLORS?.neutral?.inkBlack || '#00171F';
  const textTertiary = COLORS?.text?.tertiary || ((COLORS?.neutral?.gray as any)?.[700]) || '#5D6F75';
  const borderLight = COLORS?.border?.light || COLORS?.neutral?.gray?.[200] || '#D7DFE3';
  const spacingXs = SPACING?.xs || 4;
  const spacingSm = SPACING?.sm || 8;
  const spacingMd = SPACING?.md || 16;
  const spacingLg = SPACING?.lg || 24;
  const containerHorizontal = SPACING?.container?.horizontal || SPACING?.content?.horizontal || 18;
  const cardPadding = SPACING?.cardPadding || spacingMd;
  const cardGap = SPACING?.cardGap || spacingSm + 4;
  const radiusXl = BORDERS?.radius?.xl || 16;
  const fontSizeBase = TYPOGRAPHY?.fontSize?.base || 14;
  const fontSizeSm = TYPOGRAPHY?.fontSize?.sm || 12;
  const fontSizeMd = TYPOGRAPHY?.fontSize?.md || 16;
  const fontSizeLg = TYPOGRAPHY?.fontSize?.lg || 18;
  const fontWeightMedium = TYPOGRAPHY?.fontWeight?.medium || '500';
  const fontWeightSemibold = TYPOGRAPHY?.fontWeight?.semibold || '600';
  const fontWeightBold = TYPOGRAPHY?.fontWeight?.bold || '700';
  const shadowSm = SHADOWS?.sm || { shadowColor: '#00171F', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 };
  const shadowMd = SHADOWS?.md || { shadowColor: '#00171F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bgDefault,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      paddingVertical: spacingMd,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacingLg * 2,
    },
    loadingText: {
      marginTop: spacingMd,
      fontSize: fontSizeBase,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: containerHorizontal,
    },
    errorText: {
      fontSize: fontSizeLg,
      textAlign: 'center',
      marginTop: spacingMd,
      fontWeight: fontWeightSemibold,
    },
    backButton: {
      marginTop: spacingLg,
      paddingHorizontal: spacingLg,
      paddingVertical: spacingSm + 2,
      borderRadius: radiusXl / 2,
    },
    backButtonText: {
      fontWeight: fontWeightBold,
    },
    deleteButtonHeader: {
      padding: spacingXs,
      borderRadius: radiusXl / 2,
    },
    uiCard: {
      backgroundColor: bgPaper,
      borderRadius: radiusXl,
      padding: cardPadding,
      marginBottom: cardGap,
      ...shadowSm,
      borderWidth: 1,
      borderColor: borderLight,
    },
    infoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacingSm,
      gap: spacingSm,
    },
    infoTitle: {
      fontSize: fontSizeMd,
      fontWeight: fontWeightBold,
    },
    infoText: {
      fontSize: fontSizeBase,
      lineHeight: fontSizeBase + 6,
      marginBottom: spacingMd,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm,
      marginTop: spacingSm,
    },
    statusLabel: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightMedium,
    },
    statusBadge: {
      paddingHorizontal: spacingSm,
      paddingVertical: spacingXs + 1,
      borderRadius: radiusXl / 2,
    },
    statusText: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightSemibold,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacingMd,
    },
    sectionTitle: {
      fontSize: fontSizeMd,
      fontWeight: fontWeightBold,
    },
    addCommuneButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingXs,
      paddingHorizontal: spacingSm + 2,
      paddingVertical: spacingSm,
      borderRadius: radiusXl / 2,
    },
    addCommuneText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
    },
    textInput: {
      borderRadius: radiusXl / 2,
      padding: spacingMd,
      fontSize: fontSizeBase,
      borderWidth: 1,
      marginTop: spacingSm,
    },
    helperText: {
      fontSize: fontSizeSm,
      marginTop: spacingSm,
    },
    selectedCommunesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacingSm,
      marginTop: spacingSm,
    },
    selectedCommuneTag: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacingSm + 2,
      paddingVertical: spacingSm,
      borderRadius: radiusXl / 2,
      gap: spacingXs,
      borderWidth: 1,
    },
    selectedCommuneText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightMedium,
    },
    emptyCommunesContainer: {
      alignItems: 'center',
      padding: spacingLg * 2,
      borderRadius: radiusXl,
      borderWidth: 2,
      borderStyle: 'dashed',
      marginTop: spacingSm,
    },
    emptyCommunesText: {
      fontSize: fontSizeMd,
      fontWeight: fontWeightSemibold,
      marginTop: spacingMd,
      marginBottom: spacingXs,
    },
    emptyCommunesSubtext: {
      fontSize: fontSizeBase,
      textAlign: 'center',
      lineHeight: fontSizeBase + 6,
    },
    summaryCard: {
      borderRadius: radiusXl,
      padding: cardPadding,
      borderWidth: 1,
      ...shadowSm,
    },
    summaryTitle: {
      fontSize: fontSizeMd,
      fontWeight: fontWeightBold,
      marginBottom: spacingSm,
    },
    summaryText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      marginBottom: spacingXs,
    },
    summarySubtext: {
      fontSize: fontSizeSm,
    },
    bottomContainer: {
      padding: containerHorizontal,
      paddingBottom: spacingLg + 14,
      borderTopWidth: 1,
      ...shadowSm,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacingMd,
      borderRadius: radiusXl / 2,
      gap: spacingSm,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      fontSize: fontSizeMd,
      fontWeight: fontWeightBold,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: bgDefault,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: containerHorizontal,
      paddingVertical: spacingMd,
      borderBottomWidth: 1,
      ...shadowSm,
    },
    modalTitle: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
    },
    filtersContainer: {
      padding: containerHorizontal,
      borderBottomWidth: 1,
      ...shadowSm,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radiusXl / 2,
      paddingHorizontal: spacingMd,
      paddingVertical: spacingSm + 2,
      marginBottom: spacingMd,
      gap: spacingSm,
    },
    searchInput: {
      flex: 1,
      fontSize: fontSizeBase,
    },
    regionSelector: {
      flexDirection: 'row',
    },
    regionChip: {
      paddingHorizontal: spacingMd,
      paddingVertical: spacingSm,
      marginRight: spacingSm,
      borderRadius: radiusXl / 2,
      borderWidth: 1,
    },
    regionChipActive: {
      // Estilos aplicados dinámicamente
    },
    regionChipText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
    },
    regionChipTextActive: {
      // Estilos aplicados dinámicamente
    },
    communesList: {
      flex: 1,
    },
    communeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: containerHorizontal,
      paddingVertical: spacingMd,
      backgroundColor: bgPaper,
    },
    communeInfo: {
      flex: 1,
    },
    communeName: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      marginBottom: spacingXs,
    },
    communeRegion: {
      fontSize: fontSizeSm,
    },
    separator: {
      height: 1,
      marginLeft: containerHorizontal,
    },
    emptyListContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacingLg * 3,
    },
    emptyListText: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightSemibold,
      marginTop: spacingMd,
      marginBottom: spacingXs,
    },
    emptyListSubtext: {
      fontSize: fontSizeBase,
      textAlign: 'center',
      lineHeight: fontSizeBase + 6,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: fontSizeBase,
      marginTop: spacingMd,
    },
  });
};

const styles = createStyles(); 