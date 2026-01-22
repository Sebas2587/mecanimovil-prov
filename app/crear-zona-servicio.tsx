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
import { Stack, router } from 'expo-router';
import serviceAreasApi, { Commune, Region } from '@/services/serviceAreasApi';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';
import Header from '@/components/Header';

export default function CrearZonaServicioScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [zoneName, setZoneName] = useState('');
  const [selectedCommunes, setSelectedCommunes] = useState<Commune[]>([]);
  const [availableCommunes, setAvailableCommunes] = useState<Commune[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
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
    loadRegions();
    loadAllCommunes();
  }, []);

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

  const saveServiceArea = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Generar nombre automático si no se proporcionó uno manual
      const finalZoneName = zoneName.trim() || generateZoneName(selectedCommunes);

      const serviceAreaData = {
        name: finalZoneName,
        commune_names: selectedCommunes.map(c => c.name),
        area_type: 'COMMUNE' as const,
        is_active: true,
      };

      console.log('Guardando zona de servicio:', serviceAreaData);

      const response = await serviceAreasApi.createServiceArea(serviceAreaData);

      Alert.alert(
        'Éxito',
        'Zona de servicio creada correctamente',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );

    } catch (error) {
      console.error('Error guardando zona:', error);
      Alert.alert('Error', 'No se pudo guardar la zona de servicio');
    } finally {
      setLoading(false);
    }
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

  return (
    <View style={[styles.container, { backgroundColor: bgDefault }]}>
      <Stack.Screen
        options={{
          title: 'Nueva Zona de Servicio',
          headerShown: false,
        }}
      />
      
      <Header 
        title="Nueva Zona de Servicio"
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View style={[styles.content, { paddingHorizontal: containerHorizontal }]}>
          {/* Información - UI Card */}
          <View style={[styles.uiCard, { backgroundColor: (infoObj?.light || '#E6F5F9'), borderColor: info500 }]}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={20} color={info500} />
              <Text style={[styles.infoTitle, { color: info500 }]}>¿Qué son las zonas de servicio?</Text>
            </View>
            <Text style={[styles.infoText, { color: textPrimary }]}>
              Las zonas de servicio definen las comunas donde ofreces servicios a domicilio. 
              Solo recibirás solicitudes de clientes en estas comunas.
            </Text>
          </View>

          {/* Nombre de la zona (opcional) - UI Card */}
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
                  No has seleccionado comunas
                </Text>
                <Text style={[styles.emptyCommunesSubtext, { color: textTertiary }]}>
                  Toca "Agregar" para seleccionar las comunas donde ofreces servicios
                </Text>
              </View>
            )}
          </View>

          {/* Resumen - UI Card */}
          {selectedCommunes.length > 0 && (
            <View style={[styles.summaryCard, { backgroundColor: (successObj?.light || '#E6F7F4'), borderColor: success500 }]}>
              <Text style={[styles.summaryTitle, { color: textPrimary }]}>Resumen</Text>
              <Text style={[styles.summaryText, { color: textPrimary }]}>
                Cobertura: {selectedCommunes.length} comuna{selectedCommunes.length !== 1 ? 's' : ''}
              </Text>
              <Text style={[styles.summarySubtext, { color: textTertiary }]}>
                Recibirás solicitudes de servicios a domicilio en estas comunas
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
            {loading ? 'Guardando...' : 'Crear Zona de Servicio'}
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
            <Text style={[styles.modalTitle, { color: textPrimary }]}>Seleccionar Comunas</Text>
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