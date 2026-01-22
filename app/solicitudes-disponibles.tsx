import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import solicitudesService, { type SolicitudPublica } from '@/services/solicitudesService';
import { SolicitudCard } from '@/components/solicitudes/SolicitudCard';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';

type FiltroUrgencia = 'todos' | 'urgente' | 'normal';

export default function SolicitudesDisponiblesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
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

  const safeBorders = useMemo(() => {
    return theme?.borders || BORDERS || {};
  }, [theme]);

  const safeShadows = useMemo(() => {
    return theme?.shadows || SHADOWS || {};
  }, [theme]);

  const [solicitudes, setSolicitudes] = useState<SolicitudPublica[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroUrgencia, setFiltroUrgencia] = useState<FiltroUrgencia>('todos');

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const cargarSolicitudes = async () => {
    try {
      setLoading(true);
      const result = await solicitudesService.obtenerSolicitudesDisponibles();
      
      if (result.success && result.data) {
        setSolicitudes(result.data);
      } else {
        console.error('Error cargando solicitudes:', result.error);
      }
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarSolicitudes();
  };

  const aplicarFiltro = (solicitudesList: SolicitudPublica[], filtro: FiltroUrgencia): SolicitudPublica[] => {
    if (filtro === 'todos') {
      return solicitudesList;
    }
    return solicitudesList.filter(s => s.urgencia === filtro);
  };

  const solicitudesFiltradas = aplicarFiltro(solicitudes, filtroUrgencia);

  // Obtener colores del sistema de diseño
  const bgPaper = (safeColors?.background as any)?.paper || (safeColors?.base as any)?.white || '#FFFFFF';
  const bgDefault = (safeColors?.background as any)?.default || '#F5F7F8';
  const textPrimary = safeColors?.text?.primary || (safeColors?.neutral as any)?.inkBlack || '#00171F';
  const textTertiary = safeColors?.text?.tertiary || ((safeColors?.neutral as any)?.gray as any)?.[700] || '#5D6F75';
  const primaryObj = safeColors?.primary as any;
  const accentObj = safeColors?.accent as any;
  const errorObj = safeColors?.error as any;
  const primary500 = primaryObj?.['500'] || accentObj?.['500'] || '#003459';
  const error500 = errorObj?.main || errorObj?.['500'] || '#FF6B6B';
  const borderLight = (safeColors?.border as any)?.light || ((safeColors?.neutral as any)?.gray as any)?.[200] || '#D7DFE3';
  const containerHorizontal = safeSpacing?.container?.horizontal || safeSpacing?.content?.horizontal || 18;
  const spacingMd = safeSpacing?.md || 16;
  const spacingSm = safeSpacing?.sm || 8;
  const spacingLg = safeSpacing?.lg || 24;
  const fontSizeBase = safeTypography?.fontSize?.base || 14;
  const fontSizeLg = safeTypography?.fontSize?.lg || 18;
  const fontWeightSemibold = safeTypography?.fontWeight?.semibold || '600';
  const fontWeightBold = safeTypography?.fontWeight?.bold || '700';
  const radiusLg = safeBorders?.radius?.lg || 12;
  const radiusXl = safeBorders?.radius?.xl || 16;
  const shadowSm = safeShadows?.sm || { shadowColor: '#00171F', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgDefault }]} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Solicitudes Disponibles',
          headerStyle: {
            backgroundColor: bgPaper,
          },
          headerTintColor: textPrimary,
        }}
      />
      
      {/* Filtros */}
      <View style={[styles.filtrosContainer, { backgroundColor: bgPaper, borderBottomColor: borderLight }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtrosContent}>
          <TouchableOpacity
            style={[
              styles.filtroButton,
              filtroUrgencia === 'todos' && { backgroundColor: primary500 },
              { borderColor: borderLight }
            ]}
            onPress={() => setFiltroUrgencia('todos')}
          >
            <Text style={[
              styles.filtroButtonText,
              { color: filtroUrgencia === 'todos' ? '#FFFFFF' : textPrimary }
            ]}>
              Todas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filtroButton,
              filtroUrgencia === 'urgente' && { backgroundColor: error500 },
              { borderColor: borderLight }
            ]}
            onPress={() => setFiltroUrgencia('urgente')}
          >
            <MaterialIcons name="priority-high" size={16} color={filtroUrgencia === 'urgente' ? '#FFFFFF' : textPrimary} />
            <Text style={[
              styles.filtroButtonText,
              { color: filtroUrgencia === 'urgente' ? '#FFFFFF' : textPrimary }
            ]}>
              Urgentes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filtroButton,
              filtroUrgencia === 'normal' && { backgroundColor: primary500 },
              { borderColor: borderLight }
            ]}
            onPress={() => setFiltroUrgencia('normal')}
          >
            <Text style={[
              styles.filtroButtonText,
              { color: filtroUrgencia === 'normal' ? '#FFFFFF' : textPrimary }
            ]}>
              Normales
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Lista de solicitudes */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primary500} />
          <Text style={[styles.loadingText, { color: textTertiary }]}>
            Cargando solicitudes...
          </Text>
        </View>
      ) : solicitudesFiltradas.length > 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacingMd }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {solicitudesFiltradas.map((solicitud) => (
            <SolicitudCard
              key={solicitud.id}
              solicitud={solicitud}
              onPress={() => router.push(`/solicitud-detalle/${solicitud.id}`)}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="inbox" size={64} color={textTertiary} />
          <Text style={[styles.emptyText, { color: textPrimary }]}>
            No hay solicitudes disponibles
          </Text>
          <Text style={[styles.emptySubtext, { color: textTertiary }]}>
            {filtroUrgencia !== 'todos' 
              ? `No hay solicitudes ${filtroUrgencia === 'urgente' ? 'urgentes' : 'normales'} disponibles`
              : 'Las solicitudes aparecerán aquí cuando estén disponibles'}
          </Text>
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: primary500 }]}
            onPress={onRefresh}
          >
            <MaterialIcons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.refreshButtonText}>Actualizar</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// Función para crear estilos usando tokens del sistema de diseño
const createStyles = () => {
  const bgPaper = COLORS?.background?.paper || COLORS?.base?.white || '#FFFFFF';
  const bgDefault = COLORS?.background?.default || '#F5F7F8';
  const textPrimary = COLORS?.text?.primary || COLORS?.neutral?.inkBlack || '#00171F';
  const textTertiary = COLORS?.text?.tertiary || ((COLORS?.neutral?.gray as any)?.[700]) || '#5D6F75';
  const borderLight = COLORS?.border?.light || ((COLORS?.neutral?.gray as any)?.[200]) || '#D7DFE3';
  const spacingSm = SPACING?.sm || 8;
  const spacingMd = SPACING?.md || 16;
  const spacingLg = SPACING?.lg || 24;
  const containerHorizontal = SPACING?.container?.horizontal || SPACING?.content?.horizontal || 18;
  const fontSizeBase = TYPOGRAPHY?.fontSize?.base || 14;
  const fontSizeLg = TYPOGRAPHY?.fontSize?.lg || 18;
  const fontWeightSemibold = TYPOGRAPHY?.fontWeight?.semibold || '600';
  const fontWeightBold = TYPOGRAPHY?.fontWeight?.bold || '700';
  const radiusLg = BORDERS?.radius?.lg || 12;
  const radiusXl = BORDERS?.radius?.xl || 16;
  const shadowSm = SHADOWS?.sm || { shadowColor: '#00171F', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bgDefault,
    },
    filtrosContainer: {
      paddingVertical: spacingSm + 4,
      paddingHorizontal: containerHorizontal,
      borderBottomWidth: 1,
    },
    filtrosContent: {
      gap: spacingSm,
    },
    filtroButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacingMd,
      paddingVertical: spacingSm,
      borderRadius: radiusXl,
      borderWidth: 1,
      gap: spacingSm / 2,
      backgroundColor: bgPaper,
    },
    filtroButtonText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: containerHorizontal,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: spacingMd,
      fontSize: fontSizeBase,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacingLg * 2,
    },
    emptyText: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
      marginTop: spacingMd,
      marginBottom: spacingSm,
    },
    emptySubtext: {
      fontSize: fontSizeBase,
      textAlign: 'center',
      marginBottom: spacingLg,
    },
    refreshButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacingLg,
      paddingVertical: spacingSm + 4,
      borderRadius: radiusLg,
      gap: spacingSm,
    },
    refreshButtonText: {
      color: '#FFFFFF',
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
    },
  });
};

const styles = createStyles();

