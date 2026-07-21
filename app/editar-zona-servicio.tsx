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
import { Stack, router, useLocalSearchParams } from 'expo-router';
import serviceAreasApi, { Commune, Region, ServiceArea } from '@/services/serviceAreasApi';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import {
  Card,
  HostSectionKicker,
  hostScreenStyles,
  HOST_GUTTER,
} from '@/app/design-system/components';
import Header from '@/components/Header';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

export default function EditarZonaServicioScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const insets = useSafeAreaInsets();
  
  const [serviceArea, setServiceArea] = useState<ServiceArea | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [selectedCommunes, setSelectedCommunes] = useState<Commune[]>([]);
  const [availableCommunes, setAvailableCommunes] = useState<Commune[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  /** Solo bloquea UI hasta tener la zona; comunas/regiones cargan en paralelo. */
  const [loadingZone, setLoadingZone] = useState(() => Boolean(id));
  const [loadingCommunes, setLoadingCommunes] = useState(false);
  const [showCommuneSelector, setShowCommuneSelector] = useState(false);

  const I = COLORS.institutional;

  // Cargar zona, regiones y comunas en paralelo (antes la zona iba después de comunas → doble sensación de carga).
  useEffect(() => {
    const loadInitialData = async () => {
      if (!id) {
        setLoadingZone(false);
        return;
      }
      try {
        await Promise.all([loadRegions(), loadAllCommunes(), loadServiceAreaData()]);
      } catch (error) {
        console.error('Error cargando datos iniciales:', error);
      }
    };

    loadInitialData();
  }, [id]);

  // Efecto para mapear comunas cuando se cargan los datos de la zona
  useEffect(() => {
    if (serviceArea && availableCommunes.length > 0) {
      if (serviceArea.commune_names && serviceArea.commune_names.length > 0) {
        const selectedCommunesObjects = serviceArea.commune_names
          .map(communeName => {
            const found = availableCommunes.find(commune => commune.name === communeName);
            return found;
          })
          .filter(commune => commune !== undefined) as Commune[];

        setSelectedCommunes(selectedCommunesObjects);
      } else {
        setSelectedCommunes([]);
      }
    }
  }, [serviceArea, availableCommunes]);

  // Cargar datos de la zona de servicio a editar
  const loadServiceAreaData = async () => {
    try {
      setLoadingZone(true);

      const serviceAreaData = await serviceAreasApi.getServiceAreas();
      const area = serviceAreaData.find(a => a.id === id);

      if (!area) {
        Alert.alert('Error', 'Zona de servicio no encontrada');
        router.back();
        return;
      }

      setServiceArea(area);
      setZoneName(area.name || '');

    } catch (error) {
      console.error('Error cargando zona de servicio:', error);
      Alert.alert('Error', 'No se pudo cargar la zona de servicio');
      router.back();
    } finally {
      setLoadingZone(false);
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

  const bgPaper = I.canvas;
  const bgDefault = I.canvas;
  const textPrimary = I.ink;
  const textSecondary = I.body;
  const textTertiary = I.muted;
  const borderLight = I.hairline;
  const primary500 = I.primary;
  const primaryActive = I.primaryActive;
  const success500 = I.semanticUp;
  const error500 = I.semanticDown;
  const warning500 = I.accentYellow;

  const spacingXs = SPACING.xs;
  const spacingSm = SPACING.sm;
  const spacingMd = SPACING.md;
  const spacingLg = SPACING.lg;
  const radiusLg = BORDERS.radius.lg;
  const fontSizeSm = TYPOGRAPHY.fontSize.sm;
  const fontSizeMd = TYPOGRAPHY.fontSize.md;

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
      <InstitutionalIcon name="add-circle" size={24} color={primary500}  strokeWidth={ICON_STROKE_WIDTH} />
    </TouchableOpacity>
  );

  /** Lista maestra aún cargando: la zona ya existe pero el mapeo a objetos Commune espera `getCommunes`. */
  const communeListSyncing =
    Boolean(serviceArea?.commune_names?.length) &&
    loadingCommunes &&
    selectedCommunes.length === 0;

  // Renderizar comuna seleccionada
  const renderSelectedCommune = (commune: Commune) => (
    <View key={commune.code} style={[styles.selectedCommuneTag, { backgroundColor: bgPaper, borderColor: borderLight }]}>
      <Text style={[styles.selectedCommuneText, { color: textPrimary }]}>{commune.name}</Text>
      <TouchableOpacity onPress={() => removeCommune(commune.code)} activeOpacity={0.7}>
        <InstitutionalIcon name="close-circle" size={18} color={error500}  strokeWidth={ICON_STROKE_WIDTH} />
      </TouchableOpacity>
    </View>
  );

  if (loadingZone && !serviceArea) {
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
          <InstitutionalIcon name="alert-circle" size={64} color={error500}  strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={[styles.errorText, { color: error500 }]}>No se pudo cargar la zona de servicio</Text>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: primary500 }]} 
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={[styles.backButtonText, { color: I.onPrimary }]}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screenRoot}>
      <Stack.Screen
        options={{
          title: 'Editar Zona de Servicio',
          headerShown: false,
        }}
      />
      
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
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
            <InstitutionalIcon name="trash" size={20} color={error500}  strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        }
      />

      <ScrollView 
        style={hostScreenStyles.scroll} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          hostScreenStyles.scrollInner,
          { paddingBottom: insets.bottom + 20 },
        ]}
      >
        <HostSectionKicker label="Editando zona" />
        <Card elevated padding="host" style={[styles.cardGap, { backgroundColor: I.surfaceStrong }]}>
          <View style={styles.infoHeader}>
            <InstitutionalIcon name="information-circle" size={20} color={warning500}  strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={[styles.infoTitle, { color: textPrimary }]}>Editando zona existente</Text>
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
                backgroundColor: I.surfaceStrong,
                borderColor: serviceArea.is_active ? success500 : borderLight,
                borderWidth: 1
              }
            ]}>
              <Text style={[styles.statusText, { color: serviceArea.is_active ? success500 : textTertiary }]}>
                {serviceArea.is_active ? 'Activa' : 'Inactiva'}
              </Text>
            </View>
          </View>
        </Card>

        <HostSectionKicker label="Nombre de la zona" />
        <Card elevated padding="host" style={styles.cardGap}>
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
        </Card>

        <View style={styles.sectionHeader}>
          <HostSectionKicker
            label={`Comunas seleccionadas (${selectedCommunes.length})`}
            style={styles.sectionHeaderTitle}
          />
          <TouchableOpacity
            style={[
              styles.addCommuneButton,
              { backgroundColor: COLORS.primary[50] },
              loadingCommunes && availableCommunes.length === 0 && styles.addCommuneButtonDisabled,
            ]}
            onPress={() => setShowCommuneSelector(true)}
            activeOpacity={0.7}
            disabled={loadingCommunes && availableCommunes.length === 0}
          >
            <InstitutionalIcon name="add" size={16} color={primary500}  strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={[styles.addCommuneText, { color: primary500 }]}>Agregar</Text>
          </TouchableOpacity>
        </View>
        <Card elevated padding="host" style={styles.cardGap}>
          {communeListSyncing ? (
            <View style={[styles.communesSyncingRow, { backgroundColor: bgPaper, borderColor: borderLight }]}>
              <ActivityIndicator size="small" color={primary500} />
              <Text style={[styles.communesSyncingText, { color: textSecondary }]}>
                Cargando comunas de la zona…
              </Text>
            </View>
          ) : selectedCommunes.length > 0 ? (
            <View style={styles.selectedCommunesContainer}>
              {selectedCommunes.map(renderSelectedCommune)}
            </View>
          ) : (
            <View style={[styles.emptyCommunesContainer, { backgroundColor: bgPaper, borderColor: borderLight }]}>
              <InstitutionalIcon name="location-outline" size={48} color={textTertiary}  strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={[styles.emptyCommunesText, { color: textPrimary }]}>
                No hay comunas seleccionadas
              </Text>
              <Text style={[styles.emptyCommunesSubtext, { color: textTertiary }]}>
                Toca "Agregar" para seleccionar las comunas donde ofreces servicios
              </Text>
            </View>
          )}
        </Card>

        {selectedCommunes.length > 0 && (
          <>
            <HostSectionKicker label="Resumen de cambios" />
            <Card elevated padding="host" style={[styles.cardGap, { backgroundColor: I.surfaceStrong }]}>
              <Text style={[styles.summaryText, { color: textPrimary }]}>
                Nueva cobertura: {selectedCommunes.length} comuna{selectedCommunes.length !== 1 ? 's' : ''}
              </Text>
              <Text style={[styles.summarySubtext, { color: textTertiary }]}>
                Los cambios se aplicarán inmediatamente después de guardar
              </Text>
            </Card>
          </>
        )}
      </ScrollView>

      {/* Botón guardar */}
      <View style={[styles.bottomContainer, { backgroundColor: bgPaper, borderTopColor: borderLight, paddingHorizontal: HOST_GUTTER }]}>
        <TouchableOpacity
          style={[
            styles.saveButton, 
            { backgroundColor: primary500 },
            loading && styles.saveButtonDisabled
          ]}
          onPress={saveServiceArea}
          disabled={loading || selectedCommunes.length === 0}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color={I.onPrimary} />
          ) : (
            <InstitutionalIcon name="checkmark-circle" size={20} color={I.onPrimary}  strokeWidth={ICON_STROKE_WIDTH} />
          )}
          <Text style={[styles.saveButtonText, { color: I.onPrimary }]}>
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
              <InstitutionalIcon name="close" size={24} color={textTertiary}  strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
          </View>

          {/* Filtros */}
          <View style={[styles.filtersContainer, { backgroundColor: bgPaper, borderBottomColor: borderLight }]}>
            {/* Búsqueda */}
            <View style={[styles.searchContainer, { backgroundColor: bgDefault }]}>
              <InstitutionalIcon name="search" size={20} color={textTertiary}  strokeWidth={ICON_STROKE_WIDTH} />
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
                  { color: !selectedRegion ? I.onPrimary : textPrimary }
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
                    { color: selectedRegion === region.region_code ? I.onPrimary : textPrimary }
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
                  <InstitutionalIcon name="search" size={48} color={textTertiary}  strokeWidth={ICON_STROKE_WIDTH} />
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
      </SafeAreaView>
    </View>
  );
}

// Función para crear estilos usando tokens del sistema de diseño
const createStyles = () => {
  const I = COLORS.institutional;
  const bgPaper = I.canvas;
  const bgDefault = I.canvas;
  const textPrimary = I.ink;
  const textTertiary = I.muted;
  const borderLight = I.hairline;
  const spacingXs = SPACING.xs;
  const spacingSm = SPACING.sm;
  const spacingMd = SPACING.md;
  const spacingLg = SPACING.lg;
  const containerHorizontal = HOST_GUTTER;
  const cardPadding = spacingMd;
  const cardGap = spacingMd;
  const radiusXl = BORDERS.radius.xl;
  const fontSizeBase = TYPOGRAPHY.fontSize.base;
  const fontSizeSm = TYPOGRAPHY.fontSize.sm;
  const fontSizeMd = TYPOGRAPHY.fontSize.md;
  const fontSizeLg = TYPOGRAPHY.fontSize.lg;
  const fontWeightMedium = TYPOGRAPHY.fontWeight.medium;
  const fontWeightSemibold = TYPOGRAPHY.fontWeight.semibold;
  const fontWeightBold = TYPOGRAPHY.fontWeight.bold;

  return StyleSheet.create({
    screenRoot: {
      flex: 1,
      backgroundColor: bgDefault,
    },
    container: {
      flex: 1,
      backgroundColor: bgDefault,
    },
    cardGap: {
      marginBottom: cardGap,
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
    },
    sectionHeaderTitle: {
      flex: 1,
      minWidth: 0,
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
    addCommuneButtonDisabled: {
      opacity: 0.45,
    },
    communesSyncingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm,
      marginTop: spacingSm,
      paddingVertical: spacingMd,
      paddingHorizontal: spacingMd,
      borderRadius: radiusXl / 2,
      borderWidth: 1,
    },
    communesSyncingText: {
      flex: 1,
      fontSize: fontSizeBase,
    },
    textInput: {
      borderRadius: radiusXl / 2,
      padding: spacingMd,
      fontSize: fontSizeBase,
      borderWidth: 1,
    },
    helperText: {
      fontSize: fontSizeSm,
      marginTop: spacingSm,
    },
    selectedCommunesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacingSm,
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
    summaryText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      marginBottom: spacingXs,
    },
    summarySubtext: {
      fontSize: fontSizeSm,
    },
    bottomContainer: {
      paddingVertical: spacingMd,
      paddingBottom: spacingLg + 14,
      borderTopWidth: 1,
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
    },
    modalTitle: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
    },
    filtersContainer: {
      padding: containerHorizontal,
      borderBottomWidth: 1,
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
  });
};

const styles = createStyles(); 