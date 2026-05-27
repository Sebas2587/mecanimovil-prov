import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { serviciosAPI, vehiculoAPI, type MarcaVehiculo } from '@/services/api';
import OnboardingHeader from '@/components/OnboardingHeader';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { showAlert, showConfirm } from '@/utils/platformAlert';

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
  // marcaId → Set de servicioIds seleccionados
  const [seleccionados, setSeleccionados] = useState<Record<number, Set<number>>>({});

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
          resultados.push({ marcaId, marcaNombre: nombreMarca(marcaId), servicios: [] });
        }
      }
      resultados.sort((a, b) => a.marcaNombre.localeCompare(b.marcaNombre, 'es', { sensitivity: 'base' }));
      setGrupos(resultados);
    } catch (e) {
      console.error(e);
      showAlert('Error', 'No se pudo cargar el catálogo de servicios. Intenta de nuevo.');
      setGrupos([]);
    } finally {
      setIsLoading(false);
    }
  }, [marcasIds]);

  useEffect(() => {
    cargarCatalogo();
  }, [cargarCatalogo]);

  const toggleServicio = useCallback((marcaId: number, servicioId: number) => {
    setSeleccionados((prev) => {
      const set = new Set(prev[marcaId] ?? []);
      if (set.has(servicioId)) {
        set.delete(servicioId);
      } else {
        set.add(servicioId);
      }
      return { ...prev, [marcaId]: set };
    });
  }, []);

  const toggleTodoGrupo = useCallback(
    (grupo: GrupoMarca) => {
      const actuales = seleccionados[grupo.marcaId] ?? new Set();
      const todosSeleccionados = grupo.servicios.every((s) => actuales.has(s.id));
      setSeleccionados((prev) => ({
        ...prev,
        [grupo.marcaId]: todosSeleccionados ? new Set() : new Set(grupo.servicios.map((s) => s.id)),
      }));
    },
    [seleccionados],
  );

  const totalSeleccionados = useMemo(
    () => Object.values(seleccionados).reduce((sum, set) => sum + set.size, 0),
    [seleccionados],
  );

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
    if (totalSeleccionados === 0) {
      showConfirm(
        'Sin servicios seleccionados',
        'Selecciona al menos un servicio para continuar. Puedes agregar más desde "Mis servicios" luego.',
        {
          confirmText: 'Continuar de todas formas',
          onConfirm: () => navegar(),
        },
      );
      return;
    }
    navegar();
  };

  const navegar = () => {
    try {
      const tipoStr = Array.isArray(tipo) ? tipo[0] : tipo;
      if (!tipoStr || (tipoStr !== 'taller' && tipoStr !== 'mecanico')) {
        showAlert('Error', 'Tipo de proveedor no válido. Vuelve al inicio.');
        router.replace('/(onboarding)/tipo-cuenta');
        return;
      }

      // Serializar { marcaId: [servicioId, ...] }[]
      const serviciosSeleccionadosArr: { marcaId: number; servicioId: number }[] = [];
      for (const [mId, set] of Object.entries(seleccionados)) {
        for (const sId of Array.from(set)) {
          serviciosSeleccionadosArr.push({ marcaId: Number(mId), servicioId: sId });
        }
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
      params.set('servicios_seleccionados', JSON.stringify(serviciosSeleccionadosArr));

      router.push(`/(onboarding)/finalizar-basico?${params.toString()}` as any);
    } catch (e) {
      console.error(e);
      showAlert('Error', 'No se pudo continuar. Intenta nuevamente.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4E4FEB" />
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
            subtitle="Selecciona los servicios que ofrecerás por cada marca. Configura precios desde Mis servicios."
            currentStep={4}
            totalSteps={5}
            icon="construct"
            backPath={getBackPath()}
          />

          <View style={styles.infoBox}>
            <InstitutionalIcon name="information-circle" size={22} color="#4E4FEB"  strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.infoText}>
              Toca cada servicio para marcarlo. Usa el botón por marca para seleccionar/deseleccionar todos. Los precios los configuras al publicar cada servicio.
            </Text>
          </View>

          {totalSeleccionados > 0 && (
            <View style={styles.resumenBox}>
              <InstitutionalIcon name="checkmark-circle" size={18} color="#27AE60"  strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.resumenText}>
                {totalSeleccionados} servicio{totalSeleccionados !== 1 ? 's' : ''} seleccionado{totalSeleccionados !== 1 ? 's' : ''}
              </Text>
            </View>
          )}

          {marcasIds.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No hay marcas seleccionadas</Text>
              <Text style={styles.emptySub}>Vuelve atrás y elige al menos una marca.</Text>
            </View>
          ) : (
            grupos.map((grupo) => {
              const grupoSet = seleccionados[grupo.marcaId] ?? new Set<number>();
              const todosSeleccionados =
                grupo.servicios.length > 0 && grupo.servicios.every((s) => grupoSet.has(s.id));
              const algunoSeleccionado = grupo.servicios.some((s) => grupoSet.has(s.id));

              return (
                <View key={grupo.marcaId} style={styles.grupo}>
                  <View style={styles.grupoHeader}>
                    <View style={styles.grupoTituloRow}>
                      <Text style={styles.grupoTitulo}>{grupo.marcaNombre}</Text>
                      <Text style={styles.grupoCount}>
                        {grupoSet.size}/{grupo.servicios.length}
                      </Text>
                    </View>
                    {grupo.servicios.length > 0 && (
                      <TouchableOpacity
                        onPress={() => toggleTodoGrupo(grupo)}
                        style={[
                          styles.toggleTodoBtn,
                          todosSeleccionados && styles.toggleTodoBtnActive,
                        ]}
                        activeOpacity={0.7}
                      >
                        <InstitutionalIcon
                          name={todosSeleccionados ? 'checkbox' : algunoSeleccionado ? 'remove-circle-outline' : 'square-outline'}
                          size={16}
                          color={todosSeleccionados ? '#fff' : algunoSeleccionado ? '#4E4FEB' : '#555'}
                         strokeWidth={ICON_STROKE_WIDTH} />
                        <Text
                          style={[
                            styles.toggleTodoBtnText,
                            todosSeleccionados && styles.toggleTodoBtnTextActive,
                          ]}
                        >
                          {todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {grupo.servicios.length === 0 ? (
                    <Text style={styles.sinServicios}>No hay servicios catalogados para esta marca aún.</Text>
                  ) : (
                    grupo.servicios.map((s) => {
                      const isSelected = grupoSet.has(s.id);
                      return (
                        <TouchableOpacity
                          key={`${grupo.marcaId}-${s.id}`}
                          style={[styles.servicioRow, isSelected && styles.servicioRowSelected]}
                          onPress={() => toggleServicio(grupo.marcaId, s.id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.servicioLeft}>
                            <InstitutionalIcon
                              name={isSelected ? 'checkbox' : 'square-outline'}
                              size={22}
                              color={isSelected ? '#4E4FEB' : '#aaa'}
                              style={styles.checkIcon}
                             strokeWidth={ICON_STROKE_WIDTH} />
                            <View style={styles.servicioInfo}>
                              <Text style={[styles.servicioNombre, isSelected && styles.servicioNombreSelected]}>
                                {s.nombre}
                              </Text>
                              <Text style={styles.servicioMeta}>
                                {s.requiere_repuestos ? 'Con repuestos' : 'Sin repuestos'}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              );
            })
          )}
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.fixedButtonContainer}>
          <TouchableOpacity style={styles.continueButton} onPress={handleContinuar} activeOpacity={0.8}>
            <Text style={styles.continueButtonText}>
              {totalSeleccionados > 0
                ? `Continuar con ${totalSeleccionados} servicio${totalSeleccionados !== 1 ? 's' : ''}`
                : 'Continuar'}
            </Text>
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  infoText: { flex: 1, fontSize: 14, color: '#444', lineHeight: 20 },
  resumenBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EAF9EF',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#B7E4C7',
  },
  resumenText: { fontSize: 14, color: '#27AE60', fontWeight: '600' },
  grupo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  grupoHeader: { marginBottom: 10 },
  grupoTituloRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  grupoTitulo: { fontSize: 17, fontWeight: '700', color: '#000' },
  grupoCount: { fontSize: 13, color: '#666', fontWeight: '600' },
  toggleTodoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F3FF',
    borderWidth: 1,
    borderColor: '#D0D0F0',
    alignSelf: 'flex-start',
  },
  toggleTodoBtnActive: {
    backgroundColor: '#4E4FEB',
    borderColor: '#4E4FEB',
  },
  toggleTodoBtnText: { fontSize: 13, color: '#555', fontWeight: '500' },
  toggleTodoBtnTextActive: { color: '#fff' },
  sinServicios: { fontSize: 14, color: '#888', fontStyle: 'italic' },
  servicioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
    borderRadius: 8,
    marginHorizontal: -4,
  },
  servicioRowSelected: {
    backgroundColor: '#F3F3FF',
  },
  servicioLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkIcon: { marginRight: 12 },
  servicioInfo: { flex: 1 },
  servicioNombre: { fontSize: 15, fontWeight: '500', color: '#333' },
  servicioNombreSelected: { color: '#4E4FEB', fontWeight: '600' },
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
