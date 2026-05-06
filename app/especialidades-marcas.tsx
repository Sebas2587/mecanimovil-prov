import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Dimensions,
  RefreshControl,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { Stack, router } from 'expo-router';
import {
  especialidadesAPI,
  proveedorVerificadoAPI,
  vehiculoAPI,
  modelosAPI,
  type CategoriaServicio,
  type MarcaVehiculo,
  type ModeloVehiculo,
} from '@/services/api';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS, withOpacity } from '@/app/design-system/tokens';
import Header from '@/components/Header';
import Snackbar from '@/components/Snackbar';
import { InstitutionalScreenTabs } from '@/app/design-system/components/InstitutionalScreenTabs';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;

const lh = (fontSize: number, ratio: number) => Math.round(fontSize * ratio);

const hx = SPACING.container.horizontal;
/** Padding horizontal de `panelBody` (debe coincidir con el estilo). */
const PANEL_BODY_H_PAD = SPACING.fixed.sm;
/** Hueco fijo entre las dos columnas. */
const GRID_COL_GAP = SPACING.fixed.xs;

function estimateGridSlotWidth(): number {
  const w = Dimensions.get('window').width;
  return Math.max(0, w - hx * 2 - PANEL_BODY_H_PAD * 2);
}

const EspecialidadCard = React.memo(function EspecialidadCard({
  especialidad,
  isSelected,
  disabled,
  cardWidth,
  isLeftColumn,
  onToggle,
}: {
  especialidad: CategoriaServicio;
  isSelected: boolean;
  disabled: boolean;
  cardWidth: number;
  isLeftColumn: boolean;
  onToggle: (id: number) => void;
}) {
  const onPress = useCallback(() => onToggle(especialidad.id), [onToggle, especialidad.id]);

  return (
    <TouchableOpacity
      style={[
        styles.selectionCard,
        {
          width: cardWidth,
          marginRight: isLeftColumn ? GRID_COL_GAP : 0,
        },
        isSelected && styles.selectionCardSelected,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <View
        style={[
          styles.checkbox,
          isSelected && styles.checkboxSelected,
        ]}
      >
        {isSelected ? <InstitutionalIcon name="checkmark" size={12} color={I.onPrimary}  strokeWidth={ICON_STROKE_WIDTH} /> : null}
      </View>

      <View
        style={[
          styles.cardIconPlate,
          isSelected ? styles.cardIconPlateSelected : styles.cardIconPlateIdle,
        ]}
      >
        <InstitutionalIcon name="build" size={16} color={isSelected ? I.primary : I.muted}  strokeWidth={ICON_STROKE_WIDTH} />
      </View>

      <View style={styles.cardTextBlock}>
        <Text
          style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}
          numberOfLines={2}
        >
          {especialidad.nombre}
        </Text>
        {especialidad.descripcion ? (
          <Text
            style={[styles.cardDescription, isSelected ? styles.cardDescriptionSelected : styles.cardDescriptionIdle]}
            numberOfLines={2}
          >
            {especialidad.descripcion}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

const MarcaCard = React.memo(function MarcaCard({
  marca,
  modelosDeMarca,
  isSelected,
  disabled,
  cardWidth,
  isLeftColumn,
  onToggle,
}: {
  marca: MarcaVehiculo;
  modelosDeMarca: ModeloVehiculo[];
  isSelected: boolean;
  disabled: boolean;
  cardWidth: number;
  isLeftColumn: boolean;
  onToggle: (id: number) => void;
}) {
  const onPress = useCallback(() => onToggle(marca.id), [onToggle, marca.id]);
  const previewLine =
    modelosDeMarca.length > 0
      ? `${modelosDeMarca
          .slice(0, 3)
          .map((m) => m.nombre)
          .join(', ')}${modelosDeMarca.length > 3 ? ` +${modelosDeMarca.length - 3} más` : ''}`
      : '';

  return (
    <TouchableOpacity
      style={[
        styles.selectionCard,
        {
          width: cardWidth,
          marginRight: isLeftColumn ? GRID_COL_GAP : 0,
        },
        isSelected && styles.selectionCardSelected,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
        {isSelected ? <InstitutionalIcon name="checkmark" size={12} color={I.onPrimary}  strokeWidth={ICON_STROKE_WIDTH} /> : null}
      </View>

      <View
        style={[
          styles.cardIconPlate,
          isSelected ? styles.cardIconPlateSelected : styles.cardIconPlateIdle,
        ]}
      >
        <InstitutionalIcon name="directions-car" size={16} color={isSelected ? I.primary : I.muted}  strokeWidth={ICON_STROKE_WIDTH} />
      </View>

      <View style={styles.cardTextBlock}>
        <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]} numberOfLines={2}>
          {marca.nombre}
        </Text>
        <Text
          style={[styles.cardMeta, isSelected ? styles.cardMetaSelected : styles.cardMetaIdle]}
          numberOfLines={1}
        >
          {modelosDeMarca.length} {modelosDeMarca.length === 1 ? 'modelo' : 'modelos'}
        </Text>
        {isSelected && previewLine ? (
          <View style={styles.modelosPreview}>
            <Text style={styles.modelosPreviewText} numberOfLines={2}>
              {previewLine}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

export default function EspecialidadesMarcasScreen() {
  const { estadoProveedor } = useAuth();
  const insets = useSafeAreaInsets();

  /** Ancho real del hueco del grid (panelBody); `onLayout` corrige el estimado por bordes / fuente. */
  const [gridSlotWidth, setGridSlotWidth] = useState(estimateGridSlotWidth);
  const onGridSlotLayout = useCallback((e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) {
      setGridSlotWidth((prev) => (Math.abs(prev - width) > 0.5 ? width : prev));
    }
  }, []);

  const cardWidth = useMemo(
    () => Math.max(96, Math.floor((gridSlotWidth - GRID_COL_GAP) / 2)),
    [gridSlotWidth]
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [todasEspecialidades, setTodasEspecialidades] = useState<CategoriaServicio[]>([]);
  const [especialidadesActuales, setEspecialidadesActuales] = useState<CategoriaServicio[]>([]);
  const [especialidadesSeleccionadas, setEspecialidadesSeleccionadas] = useState<number[]>([]);

  const [todasMarcas, setTodasMarcas] = useState<MarcaVehiculo[]>([]);
  const [marcasActuales, setMarcasActuales] = useState<MarcaVehiculo[]>([]);
  const [marcasSeleccionadas, setMarcasSeleccionadas] = useState<number[]>([]);
  const [modelosPorMarca, setModelosPorMarca] = useState<{ [key: number]: ModeloVehiculo[] }>({});

  const [busquedaEspecialidades, setBusquedaEspecialidades] = useState('');
  const [busquedaMarcas, setBusquedaMarcas] = useState('');
  const [tabActiva, setTabActiva] = useState<'especialidades' | 'marcas'>('especialidades');
  const [modoEdicion, setModoEdicion] = useState(false);

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarVariant, setSnackbarVariant] = useState<'success' | 'warning' | 'error' | 'info'>('warning');

  const MAX_ESPECIALIDADES = 6;
  const MAX_MARCAS = 3;

  useEffect(() => {
    if (estadoProveedor?.estado_verificacion !== 'aprobado') {
      Alert.alert(
        'Acceso Restringido',
        'Solo los proveedores con cuenta aprobada pueden configurar sus especialidades y marcas.',
        [{ text: 'Entendido', onPress: () => router.back() }]
      );
      return;
    }

    cargarDatos();
  }, [estadoProveedor]);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      const especialidadesData = await especialidadesAPI.obtenerCategorias();
      setTodasEspecialidades(especialidadesData);

      const marcasData = await vehiculoAPI.obtenerMarcas();
      setTodasMarcas(marcasData);

      const modelosData = await modelosAPI.obtenerTodosLosModelos();

      const modelosAgrupados: { [key: number]: ModeloVehiculo[] } = {};
      modelosData.forEach((modelo: ModeloVehiculo) => {
        if (!modelosAgrupados[modelo.marca]) {
          modelosAgrupados[modelo.marca] = [];
        }
        modelosAgrupados[modelo.marca].push(modelo);
      });
      setModelosPorMarca(modelosAgrupados);

      try {
        const datosProveedor = await proveedorVerificadoAPI.obtenerDatosCompletos();

        if (datosProveedor.data.especialidades && Array.isArray(datosProveedor.data.especialidades)) {
          if (
            datosProveedor.data.especialidades.length > 0 &&
            typeof datosProveedor.data.especialidades[0] === 'object'
          ) {
            setEspecialidadesActuales(datosProveedor.data.especialidades);
            setEspecialidadesSeleccionadas(datosProveedor.data.especialidades.map((esp: any) => esp.id));
          } else {
            const especialidadesActualesObj = especialidadesData.filter((esp) =>
              datosProveedor.data.especialidades.includes(esp.id)
            );
            setEspecialidadesActuales(especialidadesActualesObj);
            setEspecialidadesSeleccionadas(datosProveedor.data.especialidades);
          }
        } else {
          setEspecialidadesActuales([]);
          setEspecialidadesSeleccionadas([]);
        }

        if (datosProveedor.data.marcas_atendidas && Array.isArray(datosProveedor.data.marcas_atendidas)) {
          if (
            datosProveedor.data.marcas_atendidas.length > 0 &&
            typeof datosProveedor.data.marcas_atendidas[0] === 'object'
          ) {
            setMarcasActuales(datosProveedor.data.marcas_atendidas);
            setMarcasSeleccionadas(datosProveedor.data.marcas_atendidas.map((marca: any) => marca.id));
          } else {
            const marcasActualesObj = marcasData.filter((marca: MarcaVehiculo) =>
              datosProveedor.data.marcas_atendidas.includes(marca.id)
            );
            setMarcasActuales(marcasActualesObj);
            setMarcasSeleccionadas(datosProveedor.data.marcas_atendidas);
          }
        } else {
          setMarcasActuales([]);
          setMarcasSeleccionadas([]);
        }
      } catch (error) {
        console.warn('⚠️ No se pudieron cargar datos actuales del proveedor:', error);
        setEspecialidadesActuales([]);
        setMarcasActuales([]);
        setEspecialidadesSeleccionadas([]);
        setMarcasSeleccionadas([]);
      }
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos. Intenta nuevamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  const mostrarSnackbar = useCallback(
    (message: string, variant: 'success' | 'warning' | 'error' | 'info' = 'warning') => {
      setSnackbarMessage(message);
      setSnackbarVariant(variant);
      setSnackbarVisible(true);
    },
    []
  );

  const toggleEspecialidad = useCallback(
    (especialidadId: number) => {
      if (!modoEdicion) {
        setModoEdicion(true);
      }

      setEspecialidadesSeleccionadas((prev) => {
        if (prev.includes(especialidadId)) {
          setHasChanges(true);
          return prev.filter((id) => id !== especialidadId);
        }
        if (prev.length >= MAX_ESPECIALIDADES) {
          mostrarSnackbar(
            `Has alcanzado el límite máximo de ${MAX_ESPECIALIDADES} especialidades. Deselecciona una para agregar otra.`,
            'warning'
          );
          return prev;
        }
        setHasChanges(true);
        return [...prev, especialidadId];
      });
    },
    [modoEdicion, mostrarSnackbar]
  );

  const toggleMarca = useCallback(
    (marcaId: number) => {
      if (!modoEdicion) {
        setModoEdicion(true);
      }

      setMarcasSeleccionadas((prev) => {
        if (prev.includes(marcaId)) {
          setHasChanges(true);
          return prev.filter((id) => id !== marcaId);
        }
        if (prev.length >= MAX_MARCAS) {
          mostrarSnackbar(
            `Has alcanzado el límite máximo de ${MAX_MARCAS} marcas de vehículos. Deselecciona una para agregar otra.`,
            'warning'
          );
          return prev;
        }
        setHasChanges(true);
        return [...prev, marcaId];
      });
    },
    [modoEdicion, mostrarSnackbar]
  );

  const cancelarEdicion = () => {
    setEspecialidadesSeleccionadas(especialidadesActuales.map((esp) => esp.id));
    setMarcasSeleccionadas(marcasActuales.map((marca) => marca.id));
    setModoEdicion(false);
    setHasChanges(false);
    setBusquedaEspecialidades('');
    setBusquedaMarcas('');
  };

  const seleccionarTodasLasMarcas = () => {
    setModoEdicion(true);
    const todasLasMarcasIds = todasMarcas.map((m: MarcaVehiculo) => m.id);
    const marcasLimitadas = todasLasMarcasIds.slice(0, MAX_MARCAS);
    setMarcasSeleccionadas(marcasLimitadas);
    setHasChanges(true);

    if (todasLasMarcasIds.length > MAX_MARCAS) {
      mostrarSnackbar(
        `Solo puedes seleccionar un máximo de ${MAX_MARCAS} marcas. Se han seleccionado las primeras ${MAX_MARCAS}.`,
        'info'
      );
    }
  };

  const limpiarSeleccionMarcas = () => {
    setModoEdicion(true);
    setMarcasSeleccionadas([]);
    setHasChanges(true);
  };

  const limpiarSeleccionEspecialidades = () => {
    setModoEdicion(true);
    setEspecialidadesSeleccionadas([]);
    setHasChanges(true);
  };

  const seleccionarTodasLasEspecialidades = () => {
    setModoEdicion(true);
    const todasLasEspecialidadesIds = todasEspecialidades.map((e) => e.id);
    const especialidadesLimitadas = todasLasEspecialidadesIds.slice(0, MAX_ESPECIALIDADES);
    setEspecialidadesSeleccionadas(especialidadesLimitadas);
    setHasChanges(true);

    if (todasLasEspecialidadesIds.length > MAX_ESPECIALIDADES) {
      mostrarSnackbar(
        `Solo puedes seleccionar un máximo de ${MAX_ESPECIALIDADES} especialidades. Se han seleccionado las primeras ${MAX_ESPECIALIDADES}.`,
        'info'
      );
    }
  };

  const guardarCambios = async () => {
    try {
      setSaving(true);

      if (especialidadesSeleccionadas.length === 0) {
        Alert.alert('Error', 'Debes seleccionar al menos una especialidad.');
        setSaving(false);
        return;
      }

      if (especialidadesSeleccionadas.length > MAX_ESPECIALIDADES) {
        mostrarSnackbar(
          `Has excedido el límite de ${MAX_ESPECIALIDADES} especialidades. Por favor, deselecciona algunas.`,
          'error'
        );
        setSaving(false);
        return;
      }

      if (marcasSeleccionadas.length === 0) {
        Alert.alert('Error', 'Debes seleccionar al menos una marca de vehículo.');
        setSaving(false);
        return;
      }

      if (marcasSeleccionadas.length > MAX_MARCAS) {
        mostrarSnackbar(`Has excedido el límite de ${MAX_MARCAS} marcas. Por favor, deselecciona algunas.`, 'error');
        setSaving(false);
        return;
      }

      await especialidadesAPI.actualizarEspecialidades(especialidadesSeleccionadas);
      await proveedorVerificadoAPI.actualizarMarcas(marcasSeleccionadas, estadoProveedor?.tipo_proveedor || '');

      Alert.alert(
        '✅ Configuración Guardada',
        `Se han actualizado ${especialidadesSeleccionadas.length} especialidades y ${marcasSeleccionadas.length} marcas de vehículos.`,
        [{ text: 'Perfecto', style: 'default' }]
      );

      setHasChanges(false);
      setModoEdicion(false);
      setBusquedaEspecialidades('');
      setBusquedaMarcas('');
      await cargarDatos();
    } catch (error: any) {
      console.error('Error guardando configuración:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudo guardar la configuración. Intenta nuevamente.'
      );
    } finally {
      setSaving(false);
    }
  };

  const especialidadesMostrar = useMemo(() => {
    const list = modoEdicion ? todasEspecialidades : especialidadesActuales;
    return list.filter((esp) => esp.nombre.toLowerCase().includes(busquedaEspecialidades.toLowerCase()));
  }, [modoEdicion, todasEspecialidades, especialidadesActuales, busquedaEspecialidades]);

  const marcasMostrar = useMemo(() => {
    const list = modoEdicion ? todasMarcas : marcasActuales;
    return list.filter((marca) => marca.nombre.toLowerCase().includes(busquedaMarcas.toLowerCase()));
  }, [modoEdicion, todasMarcas, marcasActuales, busquedaMarcas]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <Header
          title="Especialidades y Marcas"
          showBack
          onBackPress={() => router.back()}
          backgroundColor={I.canvas}
          titleColor={I.ink}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={I.primary} />
          <Text style={styles.loadingText}>Cargando configuración...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'Especialidades y Marcas',
          headerShown: false,
        }}
      />

      <Header
        title="Especialidades y Marcas"
        showBack
        onBackPress={() => router.back()}
        backgroundColor={I.canvas}
        titleColor={I.ink}
      />

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={I.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 88 }}
      >
        <View style={[styles.content, { paddingHorizontal: hx }]}>
          <View style={styles.infoNotice}>
            <View style={styles.infoCardContent}>
              <InstitutionalIcon name="information-circle" size={20} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.infoText}>
                {modoEdicion
                  ? 'Selecciona las especialidades que ofreces y las marcas de vehículos que atiendes. Esto define tu perfil de servicios.'
                  : 'Esta es tu configuración actual. Toca «Configurar» abajo para modificar.'}
              </Text>
            </View>
          </View>

          <View style={styles.mainPanel}>
            <InstitutionalScreenTabs
              style={styles.tabsInPanel}
              activeKey={tabActiva}
              onChange={setTabActiva}
              tabs={[
                {
                  key: 'especialidades',
                  label: 'Especialidades',
                  leading: (
                    <InstitutionalIcon
                      name="build"
                      size={18}
                      color={tabActiva === 'especialidades' ? I.onPrimary : I.muted}
                     strokeWidth={ICON_STROKE_WIDTH} />
                  ),
                },
                {
                  key: 'marcas',
                  label: 'Marcas',
                  leading: (
                    <InstitutionalIcon
                      name="directions-car"
                      size={18}
                      color={tabActiva === 'marcas' ? I.onPrimary : I.muted}
                     strokeWidth={ICON_STROKE_WIDTH} />
                  ),
                },
              ]}
            />
            <View style={styles.panelDivider} />
            <View style={styles.panelBody}>
              {tabActiva === 'especialidades' && (
                <>
                  {modoEdicion && (
                    <View style={styles.toolBlock}>
                      <View style={styles.searchRow}>
                        <InstitutionalIcon name="search" size={18} color={I.muted}  strokeWidth={ICON_STROKE_WIDTH} />
                        <TextInput
                          style={styles.searchInput}
                          placeholder="Buscar especialidades…"
                          value={busquedaEspecialidades}
                          onChangeText={setBusquedaEspecialidades}
                          placeholderTextColor={I.mutedSoft}
                        />
                        {busquedaEspecialidades.length > 0 ? (
                          <TouchableOpacity onPress={() => setBusquedaEspecialidades('')} hitSlop={12}>
                            <InstitutionalIcon name="close-circle" size={20} color={I.muted}  strokeWidth={ICON_STROKE_WIDTH} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  )}

                  {modoEdicion && (
                    <View style={[styles.toolBlock, styles.toolBlockNoTopPad]}>
                      <View style={styles.quickActionsRow}>
                        <TouchableOpacity
                          style={styles.quickChip}
                          onPress={seleccionarTodasLasEspecialidades}
                          activeOpacity={0.85}
                        >
                          <InstitutionalIcon name="checkmark-done" size={16} color={I.semanticUp}  strokeWidth={ICON_STROKE_WIDTH} />
                          <Text style={styles.quickChipTextUp}>Seleccionar todas</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.quickChip}
                          onPress={limpiarSeleccionEspecialidades}
                          activeOpacity={0.85}
                        >
                          <InstitutionalIcon name="close" size={16} color={I.semanticDown}  strokeWidth={ICON_STROKE_WIDTH} />
                          <Text style={styles.quickChipTextDown}>Limpiar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <View style={styles.counterRow}>
                    <InstitutionalIcon name="list" size={18} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.counterLabel}>
                      <Text style={styles.counterMono}>{especialidadesSeleccionadas.length}</Text>
                      <Text style={styles.counterSlash}> / </Text>
                      <Text style={styles.counterMono}>{MAX_ESPECIALIDADES}</Text>
                      <Text style={styles.counterRest}> especialidades</Text>
                    </Text>
                  </View>

                  <View style={styles.gridSlot} onLayout={onGridSlotLayout}>
                    <View style={styles.itemsGrid}>
                      {especialidadesMostrar.map((esp, index) => (
                        <EspecialidadCard
                          key={esp.id}
                          especialidad={esp}
                          isSelected={especialidadesSeleccionadas.includes(esp.id)}
                          disabled={!modoEdicion && !especialidadesSeleccionadas.includes(esp.id)}
                          cardWidth={cardWidth}
                          isLeftColumn={index % 2 === 0}
                          onToggle={toggleEspecialidad}
                        />
                      ))}
                    </View>
                  </View>
                </>
              )}

              {tabActiva === 'marcas' && (
                <>
                  {modoEdicion && (
                    <View style={styles.toolBlock}>
                      <View style={styles.searchRow}>
                        <InstitutionalIcon name="search" size={18} color={I.muted}  strokeWidth={ICON_STROKE_WIDTH} />
                        <TextInput
                          style={styles.searchInput}
                          placeholder="Buscar marcas…"
                          value={busquedaMarcas}
                          onChangeText={setBusquedaMarcas}
                          placeholderTextColor={I.mutedSoft}
                        />
                        {busquedaMarcas.length > 0 ? (
                          <TouchableOpacity onPress={() => setBusquedaMarcas('')} hitSlop={12}>
                            <InstitutionalIcon name="close-circle" size={20} color={I.muted}  strokeWidth={ICON_STROKE_WIDTH} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  )}

                  {modoEdicion && (
                    <View style={[styles.toolBlock, styles.toolBlockNoTopPad]}>
                      <View style={styles.quickActionsRow}>
                        <TouchableOpacity style={styles.quickChip} onPress={seleccionarTodasLasMarcas} activeOpacity={0.85}>
                          <InstitutionalIcon name="checkmark-done" size={16} color={I.semanticUp}  strokeWidth={ICON_STROKE_WIDTH} />
                          <Text style={styles.quickChipTextUp}>Seleccionar todas</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.quickChip} onPress={limpiarSeleccionMarcas} activeOpacity={0.85}>
                          <InstitutionalIcon name="close" size={16} color={I.semanticDown}  strokeWidth={ICON_STROKE_WIDTH} />
                          <Text style={styles.quickChipTextDown}>Limpiar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <View style={styles.counterRow}>
                    <InstitutionalIcon name="directions-car" size={18} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.counterLabel}>
                      <Text style={styles.counterMono}>{marcasSeleccionadas.length}</Text>
                      <Text style={styles.counterSlash}> / </Text>
                      <Text style={styles.counterMono}>{MAX_MARCAS}</Text>
                      <Text style={styles.counterRest}> marcas</Text>
                    </Text>
                  </View>

                  <View style={styles.gridSlot} onLayout={onGridSlotLayout}>
                    <View style={styles.itemsGrid}>
                      {marcasMostrar.map((marca, index) => (
                        <MarcaCard
                          key={marca.id}
                          marca={marca}
                          modelosDeMarca={modelosPorMarca[marca.id] || []}
                          isSelected={marcasSeleccionadas.includes(marca.id)}
                          disabled={!modoEdicion && !marcasSeleccionadas.includes(marca.id)}
                          cardWidth={cardWidth}
                          isLeftColumn={index % 2 === 0}
                          onToggle={toggleMarca}
                        />
                      ))}
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.floatingBottomBar, { paddingBottom: Math.max(insets.bottom, SPACING.fixed.md) }]}>
        {!modoEdicion ? (
          <TouchableOpacity
            style={styles.primaryCta}
            onPress={() => setModoEdicion(true)}
            activeOpacity={0.88}
          >
            <InstitutionalIcon name="edit" size={20} color={I.onPrimary}  strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.primaryCtaText}>Configurar especialidades y marcas</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editingButtonsFloat}>
            <TouchableOpacity style={styles.secondaryCta} onPress={cancelarEdicion} activeOpacity={0.88}>
              <Text style={styles.secondaryCtaText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveCta, (!hasChanges || saving) && styles.saveCtaDisabled]}
              onPress={guardarCambios}
              disabled={saving || !hasChanges}
              activeOpacity={0.88}
            >
              {saving ? (
                <ActivityIndicator size="small" color={I.onPrimary} />
              ) : (
                <InstitutionalIcon name="checkmark" size={20} color={hasChanges ? I.onPrimary : I.muted}  strokeWidth={ICON_STROKE_WIDTH} />
              )}
              <Text style={[styles.saveCtaText, (!hasChanges || saving) && styles.saveCtaTextDisabled]}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Snackbar
        visible={snackbarVisible}
        message={snackbarMessage}
        variant={snackbarVariant}
        duration={4000}
        onDismiss={() => setSnackbarVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: I.surfaceSoft,
  },
  loadingText: {
    marginTop: SPACING.fixed.md,
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    color: I.muted,
  },
  content: {
    paddingVertical: SPACING.fixed.sm,
  },
  infoNotice: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    ...SHADOWS.editorial,
  },
  mainPanel: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.card.xl,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    ...SHADOWS.editorial,
    overflow: 'hidden',
    marginBottom: SPACING.fixed.sm,
  },
  tabsInPanel: {
    marginHorizontal: SPACING.fixed.sm,
    marginTop: SPACING.fixed.sm,
  },
  panelDivider: {
    height: BORDERS.width.thin,
    backgroundColor: I.hairline,
    marginTop: SPACING.fixed.sm,
    marginHorizontal: SPACING.fixed.sm,
  },
  panelBody: {
    paddingHorizontal: PANEL_BODY_H_PAD,
    paddingTop: SPACING.fixed.sm,
    paddingBottom: SPACING.fixed.sm,
  },
  toolBlock: {
    paddingBottom: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: I.hairlineSoft,
  },
  toolBlockNoTopPad: {
    paddingTop: 0,
  },
  infoCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.xs + 2,
  },
  infoText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.body.lineHeight),
    color: I.body,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.ink,
    paddingVertical: SPACING.fixed.xxs,
  },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
  },
  quickChip: {
    flex: 1,
    minWidth: 108,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.xxs,
    paddingVertical: SPACING.fixed.xs,
    paddingHorizontal: SPACING.fixed.xs,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.surfaceSoft,
  },
  quickChipTextUp: {
    fontSize: TS.captionBold.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.captionBold.fontSize, TS.captionBold.lineHeight),
    color: I.semanticUp,
  },
  quickChipTextDown: {
    fontSize: TS.captionBold.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.captionBold.fontSize, TS.captionBold.lineHeight),
    color: I.semanticDown,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: SPACING.fixed.xs,
    marginBottom: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.xxs,
  },
  counterLabel: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  counterMono: {
    fontSize: TS.numberDisplay.fontSize,
    fontFamily: FF.monoMedium,
    color: I.ink,
  },
  counterSlash: {
    fontSize: TS.caption.fontSize,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  counterRest: {
    fontSize: TS.caption.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.caption.fontSize, TS.caption.lineHeight),
    color: I.body,
  },
  gridSlot: {
    width: '100%',
    alignSelf: 'stretch',
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    rowGap: GRID_COL_GAP,
    marginBottom: SPACING.fixed.sm,
  },
  selectionCard: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.fixed.xs,
    paddingTop: 28,
    paddingBottom: SPACING.fixed.xs,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    flexShrink: 0,
    overflow: 'hidden',
  },
  selectionCardSelected: {
    backgroundColor: COLORS.primary[50],
    borderColor: I.primary,
  },
  checkbox: {
    position: 'absolute',
    top: SPACING.fixed.xxs + 2,
    right: SPACING.fixed.xxs + 2,
    width: 20,
    height: 20,
    borderRadius: BORDERS.radius.full,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.canvas,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: I.primary,
    backgroundColor: I.primary,
  },
  cardIconPlate: {
    width: 28,
    height: 28,
    borderRadius: BORDERS.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.fixed.xxs + 2,
  },
  cardIconPlateIdle: {
    backgroundColor: I.surfaceStrong,
  },
  cardIconPlateSelected: {
    backgroundColor: withOpacity(I.primary, 0.12),
  },
  cardTextBlock: {
    width: '100%',
    paddingRight: 24,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, 1.35),
    color: I.ink,
    marginBottom: 2,
  },
  cardTitleSelected: {
    color: I.primary,
  },
  cardDescription: {
    fontSize: TS.caption.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.caption.fontSize, TS.caption.lineHeight),
  },
  cardDescriptionIdle: {
    color: I.muted,
  },
  cardDescriptionSelected: {
    color: I.body,
  },
  cardMeta: {
    fontSize: TS.caption.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.caption.fontSize, TS.caption.lineHeight),
  },
  cardMetaIdle: {
    color: I.muted,
  },
  cardMetaSelected: {
    color: I.body,
  },
  modelosPreview: {
    marginTop: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.xxs + 2,
    paddingHorizontal: SPACING.fixed.xs,
    borderRadius: BORDERS.radius.sm,
    backgroundColor: I.canvas,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    alignSelf: 'stretch',
  },
  modelosPreviewText: {
    fontSize: TS.small.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.small.fontSize, TS.small.lineHeight),
    color: I.body,
  },
  floatingBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: I.canvas,
    paddingTop: SPACING.fixed.md,
    paddingHorizontal: hx,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
    ...SHADOWS.editorial,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.fixed.md,
    borderRadius: BORDERS.radius.pill,
    gap: SPACING.fixed.sm,
    backgroundColor: I.primary,
  },
  primaryCtaText: {
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.button.fontSize, TS.button.lineHeight),
    color: I.onPrimary,
  },
  editingButtonsFloat: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
    justifyContent: 'space-between',
  },
  secondaryCta: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.fixed.md - 2,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.surfaceStrong,
  },
  secondaryCtaText: {
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  saveCta: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.fixed.md - 2,
    borderRadius: BORDERS.radius.pill,
    gap: SPACING.fixed.xs,
    backgroundColor: I.primary,
  },
  saveCtaDisabled: {
    backgroundColor: I.surfaceStrong,
  },
  saveCtaText: {
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    color: I.onPrimary,
  },
  saveCtaTextDisabled: {
    color: I.muted,
  },
});
