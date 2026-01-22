import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import creditosService, {
  type CreditoProveedor,
  type PaqueteCreditos,
  type EstadisticasCreditos,
  type CompraCreditos,
  type ConsumoCredito,
} from '@/services/creditosService';
import {
  SaldoCreditos,
  AlertaCreditosBajos,
  PaqueteCard,
  HistorialCompras,
  HistorialConsumos,
} from '@/components/creditos';
import Header from '@/components/Header';
import { router } from 'expo-router';

type TabType = 'saldo' | 'tienda' | 'historial';
type HistorialSubTabType = 'compras' | 'consumos';

export default function CreditosScreen() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('saldo');
  const [historialSubTab, setHistorialSubTab] = useState<HistorialSubTabType>('compras');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para datos
  const [saldo, setSaldo] = useState<CreditoProveedor | null>(null);
  const [estadisticas, setEstadisticas] = useState<EstadisticasCreditos | null>(null);
  const [paquetes, setPaquetes] = useState<PaqueteCreditos[]>([]);
  const [compras, setCompras] = useState<CompraCreditos[]>([]);
  const [consumos, setConsumos] = useState<ConsumoCredito[]>([]);

  // Obtener valores del sistema de diseño
  const colors = theme?.colors || COLORS || {};
  const textPrimary = colors?.text?.primary || '#000000';
  const textSecondary = colors?.text?.secondary || '#666666';
  const primaryColor = colors?.primary?.['500'] || '#4E4FEB';
  const backgroundDefault = colors?.background?.default || '#EEEEEE';
  const backgroundPaper = colors?.background?.paper || '#FFFFFF';
  const borderMain = colors?.border?.main || '#D0D0D0';

  // Cargar datos iniciales
  const cargarDatos = useCallback(async (isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setLoading(true);
      }
      setError(null);

      // Cargar saldo
      const saldoResult = await creditosService.obtenerSaldo();
      if (saldoResult.success && saldoResult.data) {
        setSaldo(saldoResult.data);
      }

      // Cargar estadísticas
      const estadisticasResult = await creditosService.obtenerEstadisticas();
      if (estadisticasResult.success && estadisticasResult.data) {
        setEstadisticas(estadisticasResult.data);
      }

      // Cargar historial de compras directamente desde el endpoint dedicado
      const comprasResult = await creditosService.obtenerHistorialCompras(50);
      if (comprasResult.success && comprasResult.data) {
        setCompras(comprasResult.data);
      }

      // Cargar historial de consumos directamente desde el endpoint dedicado
      const consumosResult = await creditosService.obtenerHistorialConsumos(50);
      if (consumosResult.success && consumosResult.data) {
        setConsumos(consumosResult.data);
      }

      // Cargar paquetes solo si estamos en la tab de tienda
      if (activeTab === 'tienda') {
        const paquetesResult = await creditosService.obtenerPaquetes();
        if (paquetesResult.success && paquetesResult.data) {
          setPaquetes(paquetesResult.data);
        }
      }
    } catch (err: any) {
      console.error('Error cargando datos de créditos:', err);
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    cargarDatos(true);
  }, [cargarDatos]);

  const handleComprarPaquete = (paquete: PaqueteCreditos) => {
    router.push({
      pathname: '/creditos/comprar',
      params: { paqueteId: paquete.id.toString() },
    });
  };

  const renderTabContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={[styles.loadingText, { color: textSecondary }]}>
            Cargando...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={colors?.error?.main || '#FF5555'} />
          <Text style={[styles.errorText, { color: textPrimary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: primaryColor }]}
            onPress={() => cargarDatos()}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    switch (activeTab) {
      case 'saldo':
        return (
          <ScrollView
            style={styles.content}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {saldo && (
              <>
                <SaldoCreditos saldo={saldo.saldo_creditos} />
                {estadisticas && (
                  <View style={[styles.statsContainer, { backgroundColor: backgroundPaper }]}>
                    <Text style={[styles.statsTitle, { color: textPrimary }]}>
                      Estadísticas del mes
                    </Text>
                    <View style={styles.statsGrid}>
                      <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: primaryColor }]}>
                          {estadisticas.creditos_consumidos_mes}
                        </Text>
                        <Text style={[styles.statLabel, { color: textSecondary }]}>
                          Consumidos
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors?.success?.main || '#3DB6B1' }]}>
                          {estadisticas.creditos_comprados_mes}
                        </Text>
                        <Text style={[styles.statLabel, { color: textSecondary }]}>
                          Comprados
                        </Text>
                      </View>
                      {estadisticas.creditos_expirados > 0 && (
                        <View style={styles.statItem}>
                          <Text style={[styles.statValue, { color: colors?.error?.main || '#FF5555' }]}>
                            {estadisticas.creditos_expirados}
                          </Text>
                          <Text style={[styles.statLabel, { color: textSecondary }]}>
                            Expirados
                          </Text>
                        </View>
                      )}
                    </View>
                    {estadisticas.proxima_expiracion.fecha && (
                      <View style={styles.expirationContainer}>
                        <MaterialIcons
                          name="schedule"
                          size={16}
                          color={textSecondary}
                        />
                        <Text style={[styles.expirationText, { color: textSecondary }]}>
                          Próxima expiración: {new Date(estadisticas.proxima_expiracion.fecha).toLocaleDateString('es-CL')}
                          {estadisticas.proxima_expiracion.dias_restantes !== null && (
                            ` (${estadisticas.proxima_expiracion.dias_restantes} días)`
                          )}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        );

      case 'tienda':
        return (
          <ScrollView
            style={styles.content}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <View style={styles.paquetesContainer}>
              {paquetes.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="shopping-cart" size={48} color={textSecondary} />
                  <Text style={[styles.emptyText, { color: textSecondary }]}>
                    No hay paquetes disponibles
                  </Text>
                </View>
              ) : (
                paquetes.map((paquete) => (
                  <PaqueteCard
                    key={paquete.id}
                    paquete={paquete}
                    destacado={paquete.destacado}
                    onPress={() => handleComprarPaquete(paquete)}
                  />
                ))
              )}
            </View>
          </ScrollView>
        );

      case 'historial':
        return (
          <View style={styles.historialContainer}>
            <View style={[styles.historialTabs, { backgroundColor: backgroundPaper, borderBottomColor: borderMain }]}>
              <TouchableOpacity
                style={[
                  styles.historialTab,
                  { borderBottomColor: historialSubTab === 'compras' ? primaryColor : 'transparent' },
                ]}
                onPress={() => setHistorialSubTab('compras')}
              >
                <Text
                  style={[
                    styles.historialTabText,
                    { color: historialSubTab === 'compras' ? primaryColor : textSecondary },
                  ]}
                >
                  Compras
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.historialTab,
                  { borderBottomColor: historialSubTab === 'consumos' ? primaryColor : 'transparent' },
                ]}
                onPress={() => setHistorialSubTab('consumos')}
              >
                <Text
                  style={[
                    styles.historialTabText,
                    { color: historialSubTab === 'consumos' ? primaryColor : textSecondary },
                  ]}
                >
                  Consumos
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.content}>
              {historialSubTab === 'compras' ? (
                <HistorialCompras
                  compras={compras}
                  onRefresh={onRefresh}
                  refreshing={refreshing}
                />
              ) : (
                <HistorialConsumos
                  consumos={consumos}
                  onRefresh={onRefresh}
                  refreshing={refreshing}
                />
              )}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: backgroundDefault }]} edges={['left', 'right', 'bottom']}>
      <Header
        title="Créditos"
        showBack={true}
        onBackPress={() => router.back()}
      />

      <View style={[styles.tabs, { backgroundColor: backgroundPaper, borderBottomColor: borderMain }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'saldo' && { borderBottomColor: primaryColor },
          ]}
          onPress={() => setActiveTab('saldo')}
        >
          <MaterialIcons
            name="account-balance-wallet"
            size={20}
            color={activeTab === 'saldo' ? primaryColor : textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'saldo' ? primaryColor : textSecondary,
                fontWeight: activeTab === 'saldo' ? TYPOGRAPHY.fontWeight.semibold : TYPOGRAPHY.fontWeight.regular,
              },
            ]}
          >
            Saldo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'tienda' && { borderBottomColor: primaryColor },
          ]}
          onPress={() => setActiveTab('tienda')}
        >
          <MaterialIcons
            name="store"
            size={20}
            color={activeTab === 'tienda' ? primaryColor : textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'tienda' ? primaryColor : textSecondary,
                fontWeight: activeTab === 'tienda' ? TYPOGRAPHY.fontWeight.semibold : TYPOGRAPHY.fontWeight.regular,
              },
            ]}
          >
            Tienda
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'historial' && { borderBottomColor: primaryColor },
          ]}
          onPress={() => setActiveTab('historial')}
        >
          <MaterialIcons
            name="history"
            size={20}
            color={activeTab === 'historial' ? primaryColor : textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'historial' ? primaryColor : textSecondary,
                fontWeight: activeTab === 'historial' ? TYPOGRAPHY.fontWeight.semibold : TYPOGRAPHY.fontWeight.regular,
              },
            ]}
          >
            Historial
          </Text>
        </TouchableOpacity>
      </View>

      {renderTabContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: SPACING.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING['2xl'],
    gap: SPACING.md,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  statsContainer: {
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statsTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: SPACING.xs / 2,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  expirationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  expirationText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  paquetesContainer: {
    gap: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING['2xl'],
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  historialContainer: {
    flex: 1,
  },
  historialTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  historialTab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
  },
  historialTabText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});

