import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { serviciosAPI, vehiculoAPI, type MarcaVehiculo } from '@/services/api';
import OnboardingHeader from '@/components/OnboardingHeader';

type ServicioCatalogo = {
  id: number;
  nombre: string;
  descripcion: string;
  requiere_repuestos: boolean;
};

type GrupoMarca = {
  marcaId: number;
  marcaNombre: string;
  servicios: ServicioCatalogo[];
};

export default function CatalogoServiciosMarcasScreen() {
  const router = useRouter();
  const rawParams = useLocalSearchParams();
  const { tipo, marcas: marcasParam, ...otherParams } = rawParams;

  const [grupos, setGrupos] = useState<GrupoMarca[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const marcasIds = useMemo(() => {
    const m = Array.isArray(marcasParam) ? marcasParam[0] : marcasParam;
    if (!m || typeof m !== 'string') return [] as number[];
    try {
      const parsed = JSON.parse(m) as unknown;
      return Array.isArray(parsed) ? parsed.map((id) => Number(id)).filter((id) => Number.isFinite(id)) : [];
    } catch {
      return [];
    }
  }, [marcasParam]);

  const cargarCatalogo = useCallback(async () => {
    if (marcasIds.length === 0) {
      setGrupos([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      let marcasLista: MarcaVehiculo[] = [];
      try {
        const data = await vehiculoAPI.obtenerMarcas();
        marcasLista = Array.isArray(data) ? data : (data as any)?.results || [];
      } catch {
        marcasLista = [];
      }
      const nombreMarca = (id: number) => marcasLista.find((x) => x.id === id)?.nombre || `Marca #${id}`;

      const resultados: GrupoMarca[] = [];
      for (const marcaId of marcasIds) {
        try {
          const res = (await serviciosAPI.obtenerCatalogoServiciosPorMarca(marcaId)) as {
            data?: ServicioCatalogo[];
          };
          const lista = res?.data ?? [];
          const servicios: ServicioCatalogo[] = Array.isArray(lista)
            ? lista.map((s: any) => ({
                id: s.id,
                nombre: s.nombre,
                descripcion: s.descripcion || '',
                requiere_repuestos: !!s.requiere_repuestos,
              }))
            : [];
          resultados.push({
            marcaId,
            marcaNombre: nombreMarca(marcaId),
            servicios: servicios.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })),
          });
        } catch (e) {
          console.warn('Error catálogo marca', marcaId, e);
          resultados.push({
            marcaId,
            marcaNombre: nombreMarca(marcaId),
            servicios: [],
          });
        }
      }
      resultados.sort((a, b) => a.marcaNombre.localeCompare(b.marcaNombre, 'es', { sensitivity: 'base' }));
      setGrupos(resultados);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo cargar el catálogo de servicios. Intenta de nuevo.');
      setGrupos([]);
    } finally {
      setIsLoading(false);
    }
  }, [marcasIds]);

  useEffect(() => {
    cargarCatalogo();
  }, [cargarCatalogo]);

  const getBackPath = () => {
    const params = new URLSearchParams();
    Object.entries(otherParams).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      const valueStr = Array.isArray(value) ? value[0] : value;
      if (valueStr !== undefined && valueStr !== '') params.append(key, String(valueStr));
    });
    const tipoStr = Array.isArray(tipo) ? tipo[0] : tipo;
    if (tipoStr) params.append('tipo', String(tipoStr));
    const m = Array.isArray(marcasParam) ? marcasParam[0] : marcasParam;
    if (m) params.append('marcas', String(m));
    return `/(onboarding)/marcas?${params.toString()}`;
  };

  const handleContinuar = () => {
    try {
      const tipoStr = Array.isArray(tipo) ? tipo[0] : tipo;
      if (!tipoStr || (tipoStr !== 'taller' && tipoStr !== 'mecanico')) {
        Alert.alert('Error', 'Tipo de proveedor no válido. Vuelve al inicio.');
        router.replace('/(onboarding)/tipo-cuenta');
        return;
      }
      const params = new URLSearchParams();
      Object.entries(rawParams).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        const valueStr = Array.isArray(value) ? value[0] : value;
        if (valueStr !== undefined && valueStr !== '') params.append(key, String(valueStr));
      });
      if (!params.has('especialidades')) {
        params.append('especialidades', JSON.stringify([]));
      }
      router.push(`/(onboarding)/finalizar-basico?${params.toString()}` as any);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo continuar. Intenta nuevamente.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Cargando servicios por marca…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.contentWrapper}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          <OnboardingHeader
            title="Servicios por marca"
            subtitle="Así quedará tu catálogo según las marcas que elegiste. Luego podrás publicar precios en Mis servicios."
            currentStep={4}
            totalSteps={5}
            icon="construct"
            backPath={getBackPath()}
          />

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={22} color="#4E4FEB" />
            <Text style={styles.infoText}>
              No necesitas elegir categorías: solo servicios compatibles con cada marca. Los precios los configuras al publicar cada servicio.
            </Text>
          </View>

          {marcasIds.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No hay marcas seleccionadas</Text>
              <Text style={styles.emptySub}>Vuelve atrás y elige al menos una marca.</Text>
            </View>
          ) : (
            grupos.map((grupo) => (
              <View key={grupo.marcaId} style={styles.grupo}>
                <Text style={styles.grupoTitulo}>{grupo.marcaNombre}</Text>
                <Text style={styles.grupoCount}>{grupo.servicios.length} servicio(s)</Text>
                {grupo.servicios.length === 0 ? (
                  <Text style={styles.sinServicios}>No hay servicios catalogados para esta marca aún.</Text>
                ) : (
                  grupo.servicios.map((s) => (
                    <View key={`${grupo.marcaId}-${s.id}`} style={styles.servicioRow}>
                      <Text style={styles.servicioNombre}>{s.nombre}</Text>
                      <Text style={styles.servicioMeta}>
                        {s.requiere_repuestos ? 'Con repuestos' : 'Sin repuestos'}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            ))
          )}
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.fixedButtonContainer}>
          <TouchableOpacity style={styles.continueButton} onPress={handleContinuar} activeOpacity={0.8}>
            <Text style={styles.continueButtonText}>Continuar</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEEEEE' },
  contentWrapper: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContainer: { padding: 20, paddingBottom: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 15, color: '#7f8c8d' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  infoText: { flex: 1, fontSize: 14, color: '#444', lineHeight: 20 },
  grupo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  grupoTitulo: { fontSize: 17, fontWeight: '700', color: '#000' },
  grupoCount: { fontSize: 13, color: '#666', marginBottom: 10 },
  sinServicios: { fontSize: 14, color: '#888', fontStyle: 'italic' },
  servicioRow: {
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
  },
  servicioNombre: { fontSize: 15, fontWeight: '600', color: '#222' },
  servicioMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  emptyBox: { padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  emptySub: { fontSize: 14, color: '#888', marginTop: 6, textAlign: 'center' },
  fixedButtonContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    elevation: 8,
  },
  continueButton: {
    backgroundColor: '#4E4FEB',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    minHeight: 56,
  },
  continueButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
