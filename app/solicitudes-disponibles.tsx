import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { obtenerSolicitudesDisponibles, type SolicitudPublica } from '@/services/solicitudesService';
import { SolicitudCard } from '@/components/solicitudes/SolicitudCard';
import { useTheme } from '@/app/design-system/theme/useTheme';
import {COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS, platformShadow} from '@/app/design-system/tokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

type FiltroUrgencia = 'todos' | 'urgente' | 'normal';

const GRADIENT_LIGHT = ['#E8EDF4', '#F2F5F9', '#FAFBFC'] as const;
const HEADER_BG_LIGHT = '#E8EDF4';

export default function SolicitudesDisponiblesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const safeColors = useMemo(() => theme?.colors || COLORS || {}, [theme]);
  const safeSpacing = useMemo(() => theme?.spacing || SPACING || {}, [theme]);

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
      const result = await obtenerSolicitudesDisponibles();

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
    if (filtro === 'todos') return solicitudesList;
    return solicitudesList.filter((s) => s.urgencia === filtro);
  };

  const solicitudesFiltradas = aplicarFiltro(solicitudes, filtroUrgencia);

  const textPrimary = safeColors?.text?.primary || (safeColors?.neutral as any)?.inkBlack || '#111827';
  const textMuted = safeColors?.text?.secondary || '#6B7280';
  const textSubtle = safeColors?.text?.tertiary || '#9CA3AF';
  const primaryObj = safeColors?.primary as any;
  const accentObj = safeColors?.accent as any;
  const errorObj = safeColors?.error as any;
  const primary500 = primaryObj?.['500'] || accentObj?.['500'] || '#2563EB';
  const error500 = errorObj?.main || errorObj?.['500'] || '#EF4444';

  const containerHorizontal = safeSpacing?.container?.horizontal || safeSpacing?.content?.horizontal || 20;
  const spacingMd = safeSpacing?.md || 16;
  const spacingSm = safeSpacing?.sm || 8;

  const blurTint = isDark ? ('dark' as const) : ('light' as const);
  const blurIntensity = Platform.OS === 'ios' ? (isDark ? 40 : 52) : isDark ? 26 : 36;

  const gradientColors = isDark
    ? (['#0F1419', '#151B22', '#1A222C'] as const)
    : GRADIENT_LIGHT;
  const headerBg = isDark ? '#151B22' : HEADER_BG_LIGHT;

  const filtroChipInactiveBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.42)';
  const filtroChipBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.65)';

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[...gradientColors]}
        locations={isDark ? [0, 0.45, 1] : [0, 0.4, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Solicitudes disponibles',
            headerBackTitle: '',
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: headerBg,
            },
            headerTintColor: textPrimary,
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 17,
              color: textPrimary,
            },
          }}
        />

        <View style={{ paddingHorizontal: containerHorizontal, paddingTop: spacingSm, paddingBottom: spacingSm }}>
          <View style={[styles.filterGlassOuter, isDark && styles.filterGlassOuterDark]}>
            <BlurView intensity={blurIntensity} tint={blurTint} style={styles.filterGlassBlur}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtrosContent}
              >
                <TouchableOpacity
                  style={[
                    styles.filtroChip,
                    {
                      backgroundColor: filtroUrgencia === 'todos' ? primary500 : filtroChipInactiveBg,
                      borderColor: filtroUrgencia === 'todos' ? primary500 : filtroChipBorder,
                    },
                  ]}
                  onPress={() => setFiltroUrgencia('todos')}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.filtroChipText,
                      { color: filtroUrgencia === 'todos' ? '#FFFFFF' : textPrimary },
                    ]}
                  >
                    Todas
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filtroChip,
                    {
                      backgroundColor: filtroUrgencia === 'urgente' ? error500 : filtroChipInactiveBg,
                      borderColor: filtroUrgencia === 'urgente' ? error500 : filtroChipBorder,
                    },
                  ]}
                  onPress={() => setFiltroUrgencia('urgente')}
                  activeOpacity={0.85}
                >
                  <InstitutionalIcon
                    name="priority-high"
                    size={16}
                    color={filtroUrgencia === 'urgente' ? '#FFFFFF' : textPrimary}
                   strokeWidth={ICON_STROKE_WIDTH} />
                  <Text
                    style={[
                      styles.filtroChipText,
                      { color: filtroUrgencia === 'urgente' ? '#FFFFFF' : textPrimary },
                    ]}
                  >
                    Urgentes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filtroChip,
                    {
                      backgroundColor: filtroUrgencia === 'normal' ? primary500 : filtroChipInactiveBg,
                      borderColor: filtroUrgencia === 'normal' ? primary500 : filtroChipBorder,
                    },
                  ]}
                  onPress={() => setFiltroUrgencia('normal')}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.filtroChipText,
                      { color: filtroUrgencia === 'normal' ? '#FFFFFF' : textPrimary },
                    ]}
                  >
                    Normales
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </BlurView>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={primary500} />
            <Text style={[styles.loadingText, { color: textMuted }]}>Cargando solicitudes…</Text>
          </View>
        ) : solicitudesFiltradas.length > 0 ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + spacingMd, paddingHorizontal: containerHorizontal },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={primary500}
                colors={[primary500]}
              />
            }
            showsVerticalScrollIndicator={false}
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
          <View style={[styles.emptyWrap, { paddingHorizontal: containerHorizontal }]}>
            <View style={[styles.emptyGlassOuter, isDark && styles.emptyGlassOuterDark]}>
              <BlurView intensity={blurIntensity} tint={blurTint} style={styles.emptyGlassBlur}>
                <View style={styles.emptyInner}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)' }]}>
                    <InstitutionalIcon name="inbox" size={40} color={textSubtle}  strokeWidth={ICON_STROKE_WIDTH} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: textPrimary }]}>Sin solicitudes</Text>
                  <Text style={[styles.emptySub, { color: textMuted }]}>
                    {filtroUrgencia !== 'todos'
                      ? `No hay solicitudes ${filtroUrgencia === 'urgente' ? 'urgentes' : 'normales'} ahora.`
                      : 'Cuando haya pedidos compatibles con tu perfil, aparecerán aquí.'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.refreshGlassBtn, { borderColor: filtroChipBorder }]}
                    onPress={onRefresh}
                    activeOpacity={0.88}
                  >
                    <InstitutionalIcon name="refresh" size={20} color={primary500}  strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={[styles.refreshGlassBtnText, { color: primary500 }]}>Actualizar</Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const shadowSm = platformShadow({
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 2,
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  filterGlassOuter: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    ...shadowSm,
  },
  filterGlassOuterDark: {
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterGlassBlur: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  filtrosContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  filtroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    gap: 5,
  },
  filtroChipText: {
    fontSize: TYPOGRAPHY?.fontSize?.base || 14,
    fontWeight: TYPOGRAPHY?.fontWeight?.semibold || '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING?.md || 16,
    fontSize: TYPOGRAPHY?.fontSize?.base || 14,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 48,
  },
  emptyGlassOuter: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.62)',
    ...shadowSm,
  },
  emptyGlassOuterDark: {
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyGlassBlur: {
    overflow: 'hidden',
  },
  emptyInner: {
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY?.fontSize?.lg || 18,
    fontWeight: TYPOGRAPHY?.fontWeight?.bold || '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: TYPOGRAPHY?.fontSize?.base || 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  refreshGlassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: BORDERS?.radius?.xl || 16,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  refreshGlassBtnText: {
    fontSize: TYPOGRAPHY?.fontSize?.base || 14,
    fontWeight: TYPOGRAPHY?.fontWeight?.semibold || '600',
  },
});
