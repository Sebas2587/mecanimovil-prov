import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Image,
  FlatList,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
// import { Picker } from '@react-native-picker/picker'; // Ya no se usa - reemplazado por selectores visuales
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Header from '@/components/Header';
import { parseMontoDecimal } from '@/utils/parseMontoDecimal';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS, withOpacity } from '@/app/design-system/tokens';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;
const hx = SPACING.container.horizontal;
const lh = (fontSize: number, mult: number) => Math.round(fontSize * mult);

// Interfaces
interface MarcaVehiculo {
  id: number;
  nombre: string;
  logo: string | null;
}

interface Servicio {
  id: number;
  nombre: string;
  descripcion: string;
  requiere_repuestos: boolean;
  foto: string | null;
}

interface Repuesto {
  id: number;
  nombre: string;
  descripcion: string;
  marca: string;
  precio_referencia: number;
  categoria_repuesto: string;
  cantidad_estimada?: number;
  es_opcional?: boolean;
}

interface CalculosPrecios {
  costo_total_sin_iva: number;
  iva_19_porciento: number;
  precio_final_cliente: number;
  comision_mecanmovil_20_porciento: number;
  iva_sobre_comision: number;
  ganancia_neta_proveedor: number;
  monto_transferido: number;
}

// Interface para el servicio existente en edición
interface ServicioExistente {
  id: number;
  servicio: number;
  servicio_info: {
    id: number;
    nombre: string;
    descripcion: string;
    requiere_repuestos: boolean;
    foto: string | null;
  };
  marca_vehiculo_seleccionada: number | null;
  marca_vehiculo_info: {
    id: number;
    nombre: string;
    logo: string | null;
  } | null;
  tipo_servicio: 'con_repuestos' | 'sin_repuestos';
  disponible: boolean;
  duracion_estimada: string | null;
  incluye_garantia: boolean;
  duracion_garantia: number;
  detalles_adicionales: string | null;
  repuestos_seleccionados: any[];
  repuestos_info: any[];
  costo_mano_de_obra_sin_iva: string;
  costo_repuestos_sin_iva: string;
  precio_publicado_cliente: string;
  comision_mecanmovil: string;
  iva_sobre_comision: string;
  ganancia_neta_proveedor: string;
  desglose_precios: CalculosPrecios;
  fecha_creacion: string;
  ultima_actualizacion: string;
  fotos_urls: string[];
}

const { width: screenWidth } = Dimensions.get('window');

const CrearServicioScreen = () => {
  const insets = useSafeAreaInsets();
  // Parámetros de navegación para modo edición
  const params = useLocalSearchParams();
  const isEditMode = params.mode === 'edit';
  const servicioId = params.servicioId ? parseInt(params.servicioId as string) : null;
  const servicioExistente: ServicioExistente | null = params.servicioData ?
    JSON.parse(params.servicioData as string) : null;

  // Estados del formulario
  const [tipoServicio, setTipoServicio] = useState<'con_repuestos' | 'sin_repuestos'>('con_repuestos');
  /** IDs de marca; 0 = genérico (sin marca en API). En creación permite varias marcas reales. */
  const [marcasSeleccionadas, setMarcasSeleccionadas] = useState<number[]>([]);
  const [servicioSeleccionado, setServicioSeleccionado] = useState<number | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [costoManoObra, setCostoManoObra] = useState('');
  const [costoRepuestos, setCostoRepuestos] = useState('');
  const [repuestosSeleccionados, setRepuestosSeleccionados] = useState<Set<number>>(new Set());
  const [preciosRepuestos, setPreciosRepuestos] = useState<Map<number, string>>(new Map());
  const [preciosRepuestosVersion, setPreciosRepuestosVersion] = useState(0); // Version counter para forzar recálculos
  const preciosRepuestosRef = useRef<Map<number, string>>(new Map()); // Ref para acceso actualizado en efectos
  const [fotos, setFotos] = useState<string[]>([]);

  // Estados de datos de API
  const [marcas, setMarcas] = useState<MarcaVehiculo[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [calculos, setCalculos] = useState<CalculosPrecios | null>(null);

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [loadingMarcas, setLoadingMarcas] = useState(true);
  const [loadingServicios, setLoadingServicios] = useState(false);
  const [loadingRepuestos, setLoadingRepuestos] = useState(false);
  const [showCalculos, setShowCalculos] = useState(false);

  // Estado para controlar si ya se pre-cargaron los datos (evitar bucle infinito)
  const [datosPreCargados, setDatosPreCargados] = useState(false);

  // Estado para guardar el servicio original en modo edición (para restaurar cuando se cambia tipo)
  const [servicioOriginal, setServicioOriginal] = useState<number | null>(null);

  const marcasRealesSeleccionadas = useMemo(
    () => marcasSeleccionadas.filter((id) => id > 0),
    [marcasSeleccionadas]
  );
  const esGenericoTodasMarcas =
    marcasSeleccionadas.length === 1 && marcasSeleccionadas[0] === 0;
  const esMultimarca = !isEditMode && marcasRealesSeleccionadas.length > 1;
  const tieneSeleccionMarca = marcasSeleccionadas.length > 0;
  const marcasSeleccionadasKey = marcasSeleccionadas.join(',');

  // Pre-cargar datos en modo edición (OPTIMIZADO - evita bucle infinito)
  useEffect(() => {
    if (isEditMode && servicioExistente && !datosPreCargados) {
      console.log('🔧 Modo edición detectado, pre-cargando datos del servicio:', {
        id: servicioExistente.id,
        tipo: servicioExistente.tipo_servicio,
        servicio: servicioExistente.servicio
      });
      console.log('📦 servicioExistente COMPLETO recibido:', JSON.stringify(servicioExistente, null, 2));


      // Pre-cargar datos del formulario
      setTipoServicio(servicioExistente.tipo_servicio);
      setServicioSeleccionado(servicioExistente.servicio);
      // Guardar servicio original para poder restaurarlo si se cambia el tipo
      setServicioOriginal(servicioExistente.servicio);
      setDescripcion(servicioExistente.detalles_adicionales || '');
      setCostoManoObra(servicioExistente.costo_mano_de_obra_sin_iva);
      setCostoRepuestos(servicioExistente.costo_repuestos_sin_iva);
      // Pre-cargar fotos - asegurar que sea un array
      const fotosExistentes = servicioExistente.fotos_urls || [];
      setFotos(Array.isArray(fotosExistentes) ? fotosExistentes : []);
      console.log('📸 Fotos pre-cargadas:', fotosExistentes.length);

      // Pre-cargar marca(s): null en API = servicio genérico (UI id 0)
      if (servicioExistente.marca_vehiculo_seleccionada) {
        console.log('🚗 Pre-cargando marca seleccionada:', servicioExistente.marca_vehiculo_info?.nombre);
        setMarcasSeleccionadas([servicioExistente.marca_vehiculo_seleccionada]);
      } else {
        setMarcasSeleccionadas([0]);
      }

      // Pre-cargar repuestos seleccionados - PRIORITARIO: usar repuestos_seleccionados que tiene los precios personalizados
      const repuestosIds = new Set<number>();
      const preciosMap = new Map<number, string>();

      // PRIMERO: Procesar repuestos_seleccionados que contiene los precios personalizados del proveedor
      if (servicioExistente.repuestos_seleccionados && Array.isArray(servicioExistente.repuestos_seleccionados) && servicioExistente.repuestos_seleccionados.length > 0) {
        console.log('🔩 Procesando repuestos_seleccionados:', servicioExistente.repuestos_seleccionados);
        servicioExistente.repuestos_seleccionados.forEach((r: any) => {
          // Manejar tanto objetos como IDs simples
          let id: number | null = null;
          if (typeof r === 'object' && r !== null) {
            id = r.id || (typeof r === 'number' ? r : null);
          } else if (typeof r === 'number') {
            id = r;
          }

          if (id && typeof id === 'number') {
            console.log(`  ✅ Agregando repuesto ID ${id} a la selección`);
            repuestosIds.add(id);
            // Si el repuesto tiene precio personalizado, cargarlo (PRIORIDAD)
            // Cargar el precio incluso si es 0, para mantener la consistencia
            if (typeof r === 'object' && r.precio !== undefined && r.precio !== null && r.precio > 0) {
              preciosMap.set(id, r.precio.toString());
              console.log(`    💰 Precio cargado para repuesto ${id}: ${r.precio}`);
            } else {
              // Si no hay precio guardado o es 0, dejar vacío para que el proveedor lo ingrese
              preciosMap.set(id, '');
              console.log(`    ⚠️ Sin precio válido para repuesto ${id}, se dejará vacío`);
            }
          } else {
            console.warn(`  ⚠️ Repuesto inválido ignorado:`, r);
          }
        });
      } else {
        console.log('⚠️ No hay repuestos_seleccionados o está vacío:', servicioExistente.repuestos_seleccionados);
      }

      // SEGUNDO: Procesar repuestos_info_detallado que también puede tener precios personalizados
      if ((servicioExistente as any).repuestos_info_detallado && Array.isArray((servicioExistente as any).repuestos_info_detallado) && (servicioExistente as any).repuestos_info_detallado.length > 0) {
        (servicioExistente as any).repuestos_info_detallado.forEach((r: any) => {
          const id = r.id;
          if (id && typeof id === 'number') {
            // Solo agregar si no estaba en repuestos_seleccionados
            if (!repuestosIds.has(id)) {
              repuestosIds.add(id);
            }
            // Si tiene precio personalizado válido, usarlo
            if (r.precio !== undefined && r.precio !== null && r.precio > 0) {
              preciosMap.set(id, r.precio.toString());
            } else if (!preciosMap.has(id)) {
              // Si no hay precio personalizado válido, dejar vacío para que el proveedor lo ingrese
              preciosMap.set(id, '');
            }
          }
        });
      }

      // TERCERO: Completar con repuestos_info solo si faltan precios (usar precio_referencia como fallback final)
      if (servicioExistente.repuestos_info && Array.isArray(servicioExistente.repuestos_info) && servicioExistente.repuestos_info.length > 0) {
        servicioExistente.repuestos_info.forEach((r: any) => {
          const id = r.id;
          if (id && typeof id === 'number') {
            // Solo agregar si no estaba en repuestos_seleccionados
            if (!repuestosIds.has(id)) {
              repuestosIds.add(id);
            }
            // Si no hay precio personalizado ya cargado, dejar vacío para que el proveedor lo ingrese
            if (!preciosMap.has(id)) {
              preciosMap.set(id, '');
            }
          }
        });
      }
      // SIEMPRE establecer los repuestos seleccionados, incluso si está vacío (para limpiar selección previa)
      console.log('🔩 Pre-cargando repuestos seleccionados:', Array.from(repuestosIds));
      console.log('🔩 Precios pre-cargados:', Array.from(preciosMap.entries()));
      console.log('🔩 servicioExistente.repuestos_seleccionados:', JSON.stringify(servicioExistente.repuestos_seleccionados, null, 2));
      console.log('🔩 servicioExistente.repuestos_info:', JSON.stringify(servicioExistente.repuestos_info, null, 2));
      setRepuestosSeleccionados(repuestosIds);
      setPreciosRepuestos(preciosMap);
      // Sincronizar ref inmediatamente
      preciosRepuestosRef.current = preciosMap;
      // Incrementar versión para forzar recálculo
      if (repuestosIds.size > 0) {
        setPreciosRepuestosVersion(v => v + 1);
      }

      // NOTA: NO llamar cargarRepuestos() aquí - el efecto de cargarRepuestos se disparará
      // automáticamente cuando servicioSeleccionado y datosPreCargados estén listos
      // El setTimeout causaba race conditions con closures desactualizados
      if (servicioExistente.servicio) {
        console.log('🔩 Repuestos disponibles se cargarán automáticamente por el efecto');
      }

      // Pre-cargar cálculos existentes
      if (servicioExistente.desglose_precios) {
        setCalculos(servicioExistente.desglose_precios);
        setShowCalculos(true);
      }

      // Marcar como pre-cargado para evitar re-ejecución
      setDatosPreCargados(true);
      console.log('✅ Datos pre-cargados para edición');
    }
  }, [isEditMode, servicioId, datosPreCargados]); // Usar servicioId en lugar de servicioExistente

  // Cargar marcas al montar componente e inicializar datosPreCargados para modo creación
  useEffect(() => {
    console.log('🎬 CrearServicioScreen - Iniciando carga de marcas...');
    cargarMarcas();

    // En modo creación, marcar como "pre-cargado" inmediatamente para permitir carga de servicios
    if (!isEditMode) {
      setDatosPreCargados(true);
    }
  }, [isEditMode]);

  // Debug: Monitorear cambios en el estado de marcas
  useEffect(() => {
    console.log('📊 Estado actualizado - Marcas:', marcas.length);
    console.log('📊 Marcas cargadas:', marcas.map(m => `${m.id}: ${m.nombre}`).join(', '));
  }, [marcas]);

  // Efecto especial para pre-cargar marca en modo edición basado en servicios disponibles
  useEffect(() => {
    if (isEditMode && servicioSeleccionado && tipoServicio === 'con_repuestos' && datosPreCargados && marcas.length > 0 && !tieneSeleccionMarca) {
      console.log('🔧 Modo edición: Determinando marca automáticamente para servicio ID:', servicioSeleccionado);
      determinarMarcaDelServicio();
    }
  }, [isEditMode, servicioSeleccionado, tipoServicio, datosPreCargados, marcas.length, tieneSeleccionMarca]);

  // Función para determinar la marca basándose en servicios disponibles
  const determinarMarcaDelServicio = async () => {
    try {
      const { serviciosAPI } = await import('@/services/api');

      // Probar cada marca hasta encontrar la que tiene el servicio
      for (const marca of marcas) {
        if (marca.id === 0) {
          continue;
        }
        try {
          console.log(`🔍 Probando marca: ${marca.nombre} (ID: ${marca.id})`);
          const response = await serviciosAPI.obtenerServiciosPorMarca(marca.id);
          const serviciosDeEstaMarca = response.data || [];

          console.log(`📋 Servicios encontrados en ${marca.nombre}:`, serviciosDeEstaMarca.length);
          console.log(`📋 IDs de servicios en ${marca.nombre}:`, serviciosDeEstaMarca.map((s: any) => s.id));

          const servicioEncontrado = serviciosDeEstaMarca.find((s: any) => s.id === servicioSeleccionado);

          if (servicioEncontrado) {
            console.log(`✅ ¡Servicio encontrado en marca: ${marca.nombre}!`);
            console.log(`📋 Servicio: ${servicioEncontrado.nombre}`);

            // Pre-seleccionar esta marca
            setMarcasSeleccionadas([marca.id]);

            // Cargar todos los servicios de esta marca
            setServicios(serviciosDeEstaMarca);

            console.log('✅ Marca y servicios configurados automáticamente para edición');
            return; // Salir del loop una vez encontrado
          }
        } catch (error) {
          console.warn(`⚠️ Error probando marca ${marca.nombre}:`, error);
        }
      }

      console.warn('⚠️ No se encontró el servicio en ninguna marca disponible');
      console.warn('📊 DIAGNÓSTICO:');
      console.warn('  - Servicio buscado ID:', servicioSeleccionado);
      console.warn('  - Total marcas probadas:', marcas.length);
      console.warn('  - Nombres de marcas:', marcas.map(m => m.nombre).join(', '));
    } catch (error) {
      console.error('❌ Error determinando marca del servicio:', error);
    }
  };

  // Debug: Monitorear cambios en el estado de servicios
  useEffect(() => {
    console.log('📊 Estado actualizado - Servicios:', servicios.length);
    console.log('📊 Servicios cargados:', servicios.map(s => `${s.id}: ${s.nombre}`).join(', '));
  }, [servicios]);

  // Debug: Monitorear selecciones
  useEffect(() => {
    console.log('🎯 Selecciones actuales:');
    console.log('  - Tipo servicio:', tipoServicio);
    console.log('  - Marcas seleccionadas:', marcasSeleccionadas);
    console.log('  - Servicio seleccionado:', servicioSeleccionado);
    console.log('  - Servicio original (edición):', servicioOriginal);
    console.log('  - Repuestos seleccionados:', Array.from(repuestosSeleccionados));
    console.log('  - Fotos:', fotos.length);
  }, [tipoServicio, marcasSeleccionadasKey, servicioSeleccionado, servicioOriginal, repuestosSeleccionados, fotos.length]);

  // Efecto para restaurar servicio cuando se vuelve a "con repuestos" en modo edición
  useEffect(() => {
    if (isEditMode && tipoServicio === 'con_repuestos' && servicioOriginal && !servicioSeleccionado && tieneSeleccionMarca && datosPreCargados) {
      console.log('🔄 Restaurando servicio original después de cambiar tipo:', servicioOriginal);
      // Esperar un momento para que los servicios se carguen primero
      setTimeout(() => {
        setServicioSeleccionado(servicioOriginal);
      }, 500);
    }
  }, [isEditMode, tipoServicio, servicioOriginal, servicioSeleccionado, tieneSeleccionMarca, datosPreCargados]);

  // Cargar servicios cuando cambian las marcas seleccionadas
  useEffect(() => {
    if (tieneSeleccionMarca) {
      if (!isEditMode || datosPreCargados) {
        console.log('⚙️ Cargando servicios para marcas:', marcasSeleccionadas);
        cargarServicios();
      }
    } else {
      setServicios([]);
      if (!isEditMode || !datosPreCargados) {
        setServicioSeleccionado(null);
      }
    }
  }, [marcasSeleccionadasKey, datosPreCargados, isEditMode]);

  // Cargar repuestos cuando cambia el servicio (CORREGIDO - protege repuestos pre-cargados)
  useEffect(() => {
    if (servicioSeleccionado && tipoServicio === 'con_repuestos') {
      // Cargar repuestos tanto en modo creación como edición
      // En modo edición, esperar a que los datos se hayan pre-cargado
      // En modo creación, cargar inmediatamente
      if (!isEditMode || datosPreCargados) {
        cargarRepuestos();
      } else {
        console.log('⏳ Esperando datosPreCargados antes de cargar repuestos...');
      }
    } else if (!servicioSeleccionado) {
      setRepuestos([]);
      // CRÍTICO: Solo limpiar repuestos si NO estamos en modo edición
      // En modo edición, los repuestos se pre-cargan y no deben limpiarse
      if (!isEditMode) {
        setRepuestosSeleccionados(new Set());
        setPreciosRepuestos(new Map());
      }
    }
  }, [servicioSeleccionado, tipoServicio, datosPreCargados, isEditMode]);

  // Efecto para sincronizar repuestos seleccionados cuando se cargan los repuestos en modo edición
  // Solo ejecutar una vez cuando se cargan los repuestos, no cada vez que cambian repuestosSeleccionados
  const repuestosIdsCargados = useMemo(() => new Set(repuestos.map(r => r.id)), [repuestos]);

  useEffect(() => {
    if (isEditMode && datosPreCargados && repuestos.length > 0 && repuestosSeleccionados.size > 0) {
      const idsSeleccionados = Array.from(repuestosSeleccionados);
      const idsValidos = idsSeleccionados.filter(id => repuestosIdsCargados.has(id));

      // Solo sincronizar si hay diferencias
      if (idsValidos.length !== idsSeleccionados.length) {
        console.log('🔧 Sincronizando repuestos seleccionados con repuestos cargados');
        console.log('  - IDs seleccionados:', idsSeleccionados);
        console.log('  - IDs cargados:', Array.from(repuestosIdsCargados));
        console.log('  - IDs válidos:', idsValidos);

        // Actualizar repuestos seleccionados solo con los válidos
        setRepuestosSeleccionados(new Set(idsValidos));
      }

      // Asegurar que todos los repuestos válidos tengan precio (solo una vez al cargar)
      setPreciosRepuestos(prev => {
        const nuevosPrecios = new Map(prev);
        let huboCambios = false;

        idsValidos.forEach(id => {
          if (!nuevosPrecios.has(id) || !nuevosPrecios.get(id)) {
            // Si no tiene precio, usar precio_referencia
            const repuesto = repuestos.find(r => r.id === id);
            if (repuesto && repuesto.precio_referencia) {
              nuevosPrecios.set(id, repuesto.precio_referencia.toString());
              huboCambios = true;
            }
          }
        });

        if (huboCambios) {
          console.log('  - Precios actualizados:', Array.from(nuevosPrecios.entries()));
          setPreciosRepuestosVersion(v => v + 1);
          return nuevosPrecios;
        }

        return prev; // No crear nuevo Map si no hay cambios
      });
    }
  }, [repuestos.length, repuestosIdsCargados, isEditMode, datosPreCargados]); // Remover repuestosSeleccionados de dependencias

  // Función para calcular el total de repuestos - centralizada y reutilizable
  const calcularTotalRepuestos = useCallback((preciosMap: Map<number, string>): string => {
    if (tipoServicio !== 'con_repuestos' || repuestosSeleccionados.size === 0) {
      return '0';
    }

    let total = 0;
    repuestosSeleccionados.forEach((repuestoId) => {
      const precioStr = preciosMap.get(repuestoId);
      if (precioStr && precioStr !== '' && precioStr !== '0') {
        const precio = parseMontoDecimal(precioStr);
        if (precio > 0) {
          total += precio;
        }
      }
    });

    return total.toString();
  }, [tipoServicio, repuestosSeleccionados]);

  // Sincronizar ref con el estado del Map
  useEffect(() => {
    preciosRepuestosRef.current = preciosRepuestos;
  }, [preciosRepuestos]);

  // Calcular y actualizar costoRepuestos cuando cambian repuestos o precios - OPTIMIZADO
  useEffect(() => {

    if (tipoServicio === 'con_repuestos' && repuestosSeleccionados.size > 0) {
      // Leer del ref que siempre tiene el estado más actualizado
      const nuevoTotal = calcularTotalRepuestos(preciosRepuestosRef.current);


      setCostoRepuestos(prev => {
        if (prev !== nuevoTotal) {
          console.log(`💰 Actualizando costoRepuestos: ${prev} -> ${nuevoTotal}`);
          return nuevoTotal;
        }
        return prev;
      });
    } else if (tipoServicio === 'sin_repuestos') {
      setCostoRepuestos('');
    }
    // Depender de versión para forzar recálculo cuando cambian los precios
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repuestosSeleccionados, preciosRepuestosVersion, tipoServicio, calcularTotalRepuestos]);

  // Calcular precios en tiempo real (OPTIMIZADO - evita cálculos en pre-carga)
  useEffect(() => {
    // Solo calcular si no estamos en modo edición con datos ya pre-cargados
    // o si estamos en modo edición pero el usuario cambió los costos
    if (costoManoObra && (!isEditMode || datosPreCargados)) {
      calcularPrecios();
    } else if (!costoManoObra) {
      setCalculos(null);
      setShowCalculos(false);
    }
  }, [costoManoObra, costoRepuestos, isEditMode, datosPreCargados]);

  // Funciones de carga de datos
  const cargarMarcas = async () => {
    try {
      console.log('🚗 Cargando marcas del proveedor...');
      const { serviciosAPI } = await import('@/services/api');

      // Verificar que la función existe antes de usarla
      if (!serviciosAPI || !serviciosAPI.obtenerMisMarcas) {
        console.error('❌ serviciosAPI.obtenerMisMarcas no está disponible');
        // Fallback: usar endpoint directo
        const { get } = await import('@/services/api');
        const response = await get('/servicios/proveedor/mis-servicios/mis_marcas/');
        console.log('✅ Marcas del proveedor cargadas (fallback):', response.data?.length || 0);
        setMarcas(response.data || []);
        return;
      }

      const response = await serviciosAPI.obtenerMisMarcas();
      console.log('✅ Marcas del proveedor cargadas:', response.data?.length || 0);

      const marcasObtenidas = response.data || [];
      // Agregar la marca genérica (ID 0) a la lista
      setMarcas([
        { id: 0, nombre: 'Todas las marcas (servicios genéricos)', logo: null },
        ...marcasObtenidas
      ]);
    } catch (error) {
      console.error('❌ Error cargando marcas del proveedor:', error);
      Alert.alert('Error', 'No se pudieron cargar las marcas de vehículos que usted atiende');
    } finally {
      setLoadingMarcas(false);
    }
  };

  const resetDependientesDeMarca = useCallback(() => {
    if (!isEditMode || !datosPreCargados) {
      setServicioSeleccionado(null);
      setRepuestos([]);
      setRepuestosSeleccionados(new Set());
      setPreciosRepuestos(new Map());
    }
    setServicios([]);
  }, [isEditMode, datosPreCargados]);

  const cargarServicios = async () => {
    if (!tieneSeleccionMarca) return;

    setLoadingServicios(true);
    try {
      console.log('⚙️ Cargando catálogo para marcas:', marcasSeleccionadas);
      const { serviciosAPI } = await import('@/services/api');

      let serviciosCargados: Servicio[] = [];

      if (esGenericoTodasMarcas) {
        const response = await serviciosAPI.obtenerServiciosPorMarca(0);
        serviciosCargados = response.data || [];
      } else if (esMultimarca) {
        const response = await serviciosAPI.obtenerServiciosComunesPorMarcas(
          marcasRealesSeleccionadas
        );
        serviciosCargados = response.data || [];
      } else {
        const marcaId =
          marcasRealesSeleccionadas[0] ?? marcasSeleccionadas[0];
        const response = await serviciosAPI.obtenerServiciosPorMarca(marcaId);
        serviciosCargados = response.data || [];
      }

      console.log('✅ Servicios cargados:', serviciosCargados.length);
      setServicios(serviciosCargados);

      // En modo edición, verificar que el servicio seleccionado esté en la lista
      if (isEditMode && servicioSeleccionado) {
        const servicioEncontrado = serviciosCargados.find((s: Servicio) => s.id === servicioSeleccionado);
        if (!servicioEncontrado) {
          console.warn('⚠️ El servicio seleccionado no está en la lista de servicios de esta marca');
          console.warn('  - Servicio buscado ID:', servicioSeleccionado);
          console.warn('  - Servicios disponibles:', serviciosCargados.map((s: Servicio) => s.id));
        } else {
          console.log('✅ Servicio seleccionado encontrado en la lista:', servicioEncontrado.nombre);
        }
      }
    } catch (error) {
      console.error('❌ Error cargando servicios del proveedor:', error);
      Alert.alert('Error', 'No se pudieron cargar los servicios que usted ofrece para esta marca');
    } finally {
      setLoadingServicios(false);
    }
  };

  const cargarRepuestos = async () => {
    if (!servicioSeleccionado) {
      console.log('⚠️ No hay servicio seleccionado, no se pueden cargar repuestos');
      return;
    }

    setLoadingRepuestos(true);
    try {
      console.log('🔩 Cargando repuestos para servicio:', servicioSeleccionado);
      const { serviciosAPI } = await import('@/services/api');
      const response = await serviciosAPI.obtenerRepuestosPorServicio(servicioSeleccionado);
      const repuestosCargados = response.data || [];
      console.log('✅ Repuestos cargados:', repuestosCargados.length);
      console.log('🔩 Repuestos seleccionados actuales:', Array.from(repuestosSeleccionados));

      setRepuestos(repuestosCargados);

      // Después de cargar los repuestos, verificar que los seleccionados estén en la lista
      if (repuestosSeleccionados.size > 0 && repuestosCargados.length > 0) {
        const repuestosIdsCargados = new Set(repuestosCargados.map((r: any) => r.id));
        const repuestosValidos = Array.from(repuestosSeleccionados).filter(id => repuestosIdsCargados.has(id));
        if (repuestosValidos.length !== repuestosSeleccionados.size) {
          console.warn('⚠️ Algunos repuestos seleccionados no están en la lista cargada');
          console.warn('  - Repuestos seleccionados:', Array.from(repuestosSeleccionados));
          console.warn('  - Repuestos disponibles:', Array.from(repuestosIdsCargados));
        } else {
          console.log('✅ Todos los repuestos seleccionados están en la lista cargada');
        }
      }
    } catch (error) {
      console.error('❌ Error cargando repuestos:', error);
      Alert.alert('Error', 'No se pudieron cargar los repuestos');
    } finally {
      setLoadingRepuestos(false);
    }
  };

  const calcularPrecios = async () => {
    const manoObra = parseMontoDecimal(costoManoObra);
    const repuestos = parseMontoDecimal(costoRepuestos || '0');

    try {
      console.log('💰 Calculando precios:', { manoObra, repuestos });
      const { serviciosAPI } = await import('@/services/api');
      const response = await serviciosAPI.calcularPreview(manoObra, repuestos);
      console.log('✅ Cálculos obtenidos:', response.data);
      setCalculos(response.data);
      setShowCalculos(manoObra > 0);
    } catch (error) {
      console.error('❌ Error calculando precios:', error);
    }
  };

  // Función para toggle repuestos
  const toggleRepuesto = (repuestoId: number) => {
    const nuevosSeleccionados = new Set(repuestosSeleccionados);
    const nuevosPrecios = new Map(preciosRepuestos);

    if (nuevosSeleccionados.has(repuestoId)) {
      nuevosSeleccionados.delete(repuestoId);
      const precioAnterior = nuevosPrecios.get(repuestoId);
      nuevosPrecios.delete(repuestoId);
    } else {
      nuevosSeleccionados.add(repuestoId);
      // NO sobrescribir precio si ya existe uno (modo edición)
      if (!nuevosPrecios.has(repuestoId)) {
        // NO inicializar precio - el proveedor debe ingresarlo manualmente
        // Dejamos el precio vacío inicialmente solo si no existe
        nuevosPrecios.set(repuestoId, '');
      } else {
      }
    }
    setRepuestosSeleccionados(nuevosSeleccionados);
    setPreciosRepuestos(nuevosPrecios);
    // Incrementar versión cuando se cambian los repuestos seleccionados
    if (nuevosSeleccionados.size !== repuestosSeleccionados.size) {
      setPreciosRepuestosVersion(v => v + 1);
    }
  };

  // Función para actualizar precio de un repuesto - optimizada y robusta
  const actualizarPrecioRepuesto = useCallback((repuestoId: number, precio: string) => {
    console.log(`💰 actualizarPrecioRepuesto: repuestoId=${repuestoId}, precio="${precio}"`);

    setPreciosRepuestos(prev => {
      const nuevosPrecios = new Map(prev);
      nuevosPrecios.set(repuestoId, precio);
      const mapFinal = new Map(nuevosPrecios);


      // Actualizar el ref INMEDIATAMENTE para que esté disponible para cálculos
      preciosRepuestosRef.current = mapFinal;


      return mapFinal;
    });


    // Incrementar versión para que el useEffect detecte el cambio y recalcule
    setPreciosRepuestosVersion(v => {
      const nuevaVersion = v + 1;
      return nuevaVersion;
    });
  }, [preciosRepuestos]);

  // Funciones para manejo de fotos
  const solicitarPermisos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permisos necesarios',
        'Se necesitan permisos para acceder a la galería de fotos'
      );
      return false;
    }
    return true;
  };

  const seleccionarFoto = async () => {
    const permisos = await solicitarPermisos();
    if (!permisos) return;

    if (fotos.length >= 5) {
      Alert.alert('Límite alcanzado', 'Puedes subir máximo 5 fotos por servicio');
      return;
    }

    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!resultado.canceled && resultado.assets[0]) {
        console.log('📸 Foto seleccionada:', resultado.assets[0].uri);

        // Redimensionar imagen para optimizar
        const imagenOptimizada = await ImageManipulator.manipulateAsync(
          resultado.assets[0].uri,
          [{ resize: { width: 800 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );

        setFotos(prev => [...prev, imagenOptimizada.uri]);
        console.log('✅ Foto agregada, total:', fotos.length + 1);
      }
    } catch (error) {
      console.error('❌ Error seleccionando foto:', error);
      Alert.alert('Error', 'No se pudo seleccionar la foto');
    }
  };

  const eliminarFoto = (index: number) => {
    Alert.alert(
      'Eliminar foto',
      '¿Estás seguro de que deseas eliminar esta foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setFotos(prev => prev.filter((_, i) => i !== index));
            console.log('🗑️ Foto eliminada, total:', fotos.length - 1);
          }
        }
      ]
    );
  };

  // Función para subir fotos al servidor
  const subirFotosAlServidor = async (ofertaId: number) => {
    if (fotos.length === 0) {
      console.log('📸 No hay fotos para subir');
      return [];
    }

    try {
      console.log(`📸 Subiendo ${fotos.length} fotos al servidor para oferta ${ofertaId}...`);
      const { fotosServiciosAPI } = await import('@/services/api');

      // Convertir URIs locales a objetos de archivo
      const archivos = fotos.map((uri, index) => ({
        uri: uri,
        type: 'image/jpeg',
        name: `foto_servicio_${index + 1}_${Date.now()}.jpg`
      }));

      // Subir múltiples fotos
      const response = await fotosServiciosAPI.subirMultiplesFotos(ofertaId, archivos);
      console.log('✅ Fotos subidas exitosamente:', response.fotos?.length || 0);

      return response.fotos || [];
    } catch (error) {
      console.error('❌ Error subiendo fotos:', error);
      // No lanzar error aquí, solo logearlo para no interrumpir el flujo principal
      return [];
    }
  };

  // Función para publicar o actualizar servicio
  const publicarServicio = async () => {
    // Validaciones
    if (!costoManoObra || parseMontoDecimal(costoManoObra) <= 0) {
      Alert.alert('Error', 'Debes especificar un costo de mano de obra válido');
      return;
    }

    if (!tieneSeleccionMarca) {
      Alert.alert('Error', 'Debes seleccionar al menos una marca de vehículo');
      return;
    }

    // Validar que si hay repuestos seleccionados, todos tengan precio válido
    if (tipoServicio === 'con_repuestos' && repuestosSeleccionados.size > 0) {
      const repuestosSinPrecio: number[] = [];
      repuestosSeleccionados.forEach((id) => {
        const precioStr = preciosRepuestosRef.current.get(id);
        if (!precioStr || precioStr.trim() === '' || precioStr === '0') {
          repuestosSinPrecio.push(id);
        } else {
          const precio = parseMontoDecimal(precioStr);
          if (precio <= 0) {
            repuestosSinPrecio.push(id);
          }
        }
      });

      if (repuestosSinPrecio.length > 0) {
        Alert.alert(
          'Precios no confirmados',
          `Tienes ${repuestosSinPrecio.length} repuesto(s) sin precio confirmado. Por favor ingresa el precio y presiona el botón "Confirmar" para cada repuesto seleccionado.`
        );
        return;
      }
    }

    if (tipoServicio === 'con_repuestos') {
      if (!servicioSeleccionado) {
        Alert.alert('Error', 'Debes seleccionar un tipo de servicio');
        return;
      }
    }

    if (!descripcion.trim()) {
      Alert.alert('Error', 'Debes agregar una descripción del servicio');
      return;
    }

    setLoading(true);
    try {
      const accion = isEditMode ? 'Actualizando' : 'Publicando';
      console.log(`🚀 ${accion} servicio...`);
      const { serviciosAPI } = await import('@/services/api');

      // Construir datos del servicio (SIN fotos por ahora)
      // IMPORTANTE: Usar el ref para asegurar que leemos el estado más reciente del Map

      const repuestosArray = tipoServicio === 'con_repuestos'
        ? Array.from(repuestosSeleccionados).map(id => {
          // Leer del Map usando el ref para asegurar el estado más actualizado
          const precioStr = preciosRepuestosRef.current.get(id);
          console.log(`🔍 Construyendo repuesto ${id}: precioStr="${precioStr}"`);
          console.log(`🔍 Precios actuales en ref:`, Array.from(preciosRepuestosRef.current.entries()));
          console.log(`🔍 Precios actuales en estado:`, Array.from(preciosRepuestos.entries()));


          let precio: number | undefined = undefined;

          // Solo usar el precio que el proveedor ingresó manualmente
          // NO usar precio_referencia como fallback - el proveedor debe ingresar el precio
          if (precioStr && precioStr.trim() !== '' && precioStr !== '0') {
            const precioParsed = parseMontoDecimal(precioStr);
            if (precioParsed > 0) {
              precio = precioParsed;
            }
          }

          const repuestoObj: any = { id };
          // Incluir precio solo si el proveedor ingresó un valor válido (> 0)
          if (precio !== undefined && !isNaN(precio) && precio > 0) {
            repuestoObj.precio = precio;
            console.log(`✅ Agregando repuesto ${id} con precio ${precio}`);
          } else {
            // IMPORTANTE: Si no hay precio válido, igualmente guardar el repuesto (sin precio)
            // Esto asegura que el repuesto aparezca seleccionado cuando se edite el servicio
            console.log(`⚠️ Repuesto ${id} sin precio válido (precioStr: "${precioStr}"), se guardará sin precio pero seleccionado`);
          }
          // SIEMPRE retornar el objeto con id, incluso sin precio
          // Esto asegura que el repuesto quede guardado y se pueda ver al editar
          return repuestoObj;
        })
        : [];

      console.log('📦 repuestosArray final:', JSON.stringify(repuestosArray, null, 2));

      // No enviar servicio cuando es null: la API rechaza "este campo no puede ser nulo".
      // En PATCH, si no se envía servicio, se conserva el valor actual de la oferta.
      const datosBase: Record<string, unknown> = {
        tipo_servicio: tipoServicio,
        detalles_adicionales: descripcion.trim(),
        costo_mano_de_obra_sin_iva: parseMontoDecimal(costoManoObra),
        costo_repuestos_sin_iva: parseMontoDecimal(costoRepuestos || '0'),
        repuestos_seleccionados: repuestosArray,
        disponible: true,
      };
      if (servicioSeleccionado != null) {
        datosBase.servicio = servicioSeleccionado;
      }

      const marcasPublicacion: (number | null)[] = esGenericoTodasMarcas
        ? [null]
        : (marcasRealesSeleccionadas.length > 0
            ? marcasRealesSeleccionadas
            : marcasSeleccionadas.map((id) => (id === 0 ? null : id)));

      console.log('📤 Datos base del servicio:', datosBase);
      console.log('📤 Marcas destino:', marcasPublicacion);

      let tituloExito = isEditMode ? '¡Servicio Actualizado!' : '¡Servicio Publicado!';
      let mensajeExito = isEditMode
        ? 'Tu servicio ha sido actualizado correctamente y los cambios ya están disponibles para los clientes.'
        : 'Tu servicio ha sido publicado correctamente y ya está disponible para los clientes.';

      if (isEditMode && servicioId) {
        const marcaApi =
          marcasSeleccionadas[0] === 0 ? null : marcasSeleccionadas[0];
        const datosServicio = {
          ...datosBase,
          marca_vehiculo_seleccionada: marcaApi,
        };
        const response = await serviciosAPI.actualizarServicio(servicioId, datosServicio);
        console.log('✅ Servicio actualizado exitosamente:', response.data);
        if (fotos.length > 0) {
          await subirFotosAlServidor(response.data.id);
        }
      } else {
        let creados = 0;
        const erroresMarca: string[] = [];

        for (const marcaId of marcasPublicacion) {
          const datosServicio = {
            ...datosBase,
            marca_vehiculo_seleccionada: marcaId,
          };
          try {
            const response = await serviciosAPI.crearServicio(datosServicio);
            creados += 1;
            if (fotos.length > 0) {
              await subirFotosAlServidor(response.data.id);
            }
          } catch (err: any) {
            const nombreMarca =
              marcas.find((m) => m.id === marcaId)?.nombre ?? `ID ${marcaId}`;
            const detalle =
              err?.response?.data?.servicio?.[0] ??
              err?.response?.data?.detail ??
              err?.response?.data?.error ??
              'No se pudo crear';
            erroresMarca.push(`${nombreMarca}: ${detalle}`);
          }
        }

        if (creados === 0) {
          throw new Error(
            erroresMarca.join('\n') || 'No se pudo publicar en ninguna marca'
          );
        }

        if (erroresMarca.length > 0) {
          tituloExito = 'Publicación parcial';
          mensajeExito = `Se publicó en ${creados} marca(s). No se pudo en:\n${erroresMarca.join('\n')}`;
        } else if (creados > 1) {
          mensajeExito = `Tu servicio se publicó en ${creados} marcas con la misma configuración.`;
        }
      }

      Alert.alert(
        tituloExito,
        mensajeExito,
        [
          {
            text: 'Ver mis servicios',
            onPress: () => router.replace('/mis-servicios')
          }
        ]
      );

    } catch (error: any) {
      console.error(`❌ Error ${isEditMode ? 'actualizando' : 'publicando'} servicio:`, error);

      const accionError = isEditMode ? 'actualizar' : 'publicar';
      let mensajeError = `No se pudo ${accionError} el servicio. Por favor, intenta nuevamente.`;

      if (error?.response?.data) {
        // Si hay detalles específicos del error
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          mensajeError = errorData;
        } else if (errorData.detail) {
          mensajeError = errorData.detail;
        } else if (errorData.error) {
          mensajeError = errorData.error;
        } else if (errorData.servicio) {
          // Error de validación específico del campo servicio (duplicado)
          mensajeError = Array.isArray(errorData.servicio)
            ? errorData.servicio[0]
            : errorData.servicio;
        } else if (typeof errorData === 'object') {
          // Extraer primer mensaje de error de validación de Django
          const campos = Object.keys(errorData);
          if (campos.length > 0) {
            const primerCampo = campos[0];
            const valor = errorData[primerCampo];
            mensajeError = Array.isArray(valor) ? valor[0] : valor;
          }
        }
      }

      Alert.alert('Error', mensajeError);
    } finally {
      setLoading(false);
    }
  };

  // Componente de selector de tipo de servicio
  const TipoServicioSelector = () => {
    const handleChangeTipoServicio = (nuevoTipo: 'con_repuestos' | 'sin_repuestos') => {
      // Permitir cambio de tipo de servicio en edición (el usuario puede necesitar cambiar)
      console.log('🔄 Cambiando tipo de servicio a:', nuevoTipo);
      setTipoServicio(nuevoTipo);

      // Resetear selecciones dependientes pero MANTENER marca (requerida para todos los servicios)
      // Resetear selecciones dependientes pero MANTENER marca y servicios
      if (nuevoTipo === 'sin_repuestos') {
        // No resetear marca - es requerida para todos los tipos
        // Tampoco resetear servicioSeleccionado si ya existe, ni la lista de servicios

        // Solo limpiar repuestos y costos de repuestos
        setRepuestosSeleccionados(new Set());
        setPreciosRepuestos(new Map());
        setRepuestos([]);
        setCostoRepuestos('');
      } else if (nuevoTipo === 'con_repuestos') {
        // Restaurar servicio original si existe y no hay uno seleccionado
        if (servicioOriginal && !servicioSeleccionado) {
          console.log('🔄 Restaurando servicio original:', servicioOriginal);
          setServicioSeleccionado(servicioOriginal);
        }
        // Cargar repuestos si hay servicio seleccionado
        if (servicioSeleccionado) {
          // El useEffect de repuestos se encargará de esto
        }
      }
    };

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Tipo de servicio</Text>
        {isEditMode && (
          <Text style={styles.subtitle}>
            Editando servicio - puedes cambiar cualquier opción
          </Text>
        )}
        <View style={styles.tipoServicioContainer}>
          <TouchableOpacity
            style={[
              styles.tipoServicioOption,
              tipoServicio === 'con_repuestos' && styles.tipoServicioSelected
            ]}
            onPress={() => handleChangeTipoServicio('con_repuestos')}
          >
            <InstitutionalIcon
              name="build"
              size={24}
              color={tipoServicio === 'con_repuestos' ? I.primary : I.muted}
             strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={[
              styles.tipoServicioText,
              tipoServicio === 'con_repuestos' && styles.tipoServicioTextSelected
            ]}>
              Con repuestos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tipoServicioOption,
              tipoServicio === 'sin_repuestos' && styles.tipoServicioSelected
            ]}
            onPress={() => handleChangeTipoServicio('sin_repuestos')}
          >
            <InstitutionalIcon
              name="handyman"
              size={24}
              color={tipoServicio === 'sin_repuestos' ? I.primary : I.muted}
             strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={[
              styles.tipoServicioText,
              tipoServicio === 'sin_repuestos' && styles.tipoServicioTextSelected
            ]}>
              Solo mano de obra
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Componente de selección de marca (requerido para todos los servicios)
  const MarcaSelector = () => {
    const marcasReales = marcas.filter((m) => m.id > 0);
    const marcaGenerica = marcas.find((m) => m.id === 0);

    const estaSeleccionada = (marcaId: number) => marcasSeleccionadas.includes(marcaId);

    const handleToggleMarca = (marcaId: number) => {
      if (isEditMode) {
        if (estaSeleccionada(marcaId)) return;
        setMarcasSeleccionadas([marcaId]);
        resetDependientesDeMarca();
        return;
      }

      if (marcaId === 0) {
        setMarcasSeleccionadas([0]);
        resetDependientesDeMarca();
        return;
      }

      setMarcasSeleccionadas((prev) => {
        const sinGenerico = prev.filter((id) => id !== 0);
        if (sinGenerico.includes(marcaId)) {
          return sinGenerico.filter((id) => id !== marcaId);
        }
        return [...sinGenerico, marcaId];
      });
      resetDependientesDeMarca();
    };

    const seleccionarTodasMisMarcas = () => {
      const ids = marcasReales.map((m) => m.id);
      setMarcasSeleccionadas(ids);
      resetDependientesDeMarca();
    };

    const limpiarMarcas = () => {
      setMarcasSeleccionadas([]);
      resetDependientesDeMarca();
    };

    if (marcas.length === 0) {
      return (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Marca del vehículo</Text>
          <View style={styles.noDataContainer}>
            <InstitutionalIcon name="information-circle-outline" size={24} color={I.accentYellow} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.noDataText}>
              No se encontraron marcas. Verifica tu configuración de especialidades.
            </Text>
          </View>
        </View>
      );
    }

    const resumenSeleccion = () => {
      if (!tieneSeleccionMarca) return null;
      if (esGenericoTodasMarcas) {
        return 'Servicios genéricos (diagnóstico y similares, sin marca específica)';
      }
      if (esMultimarca) {
        const nombres = marcasRealesSeleccionadas
          .map((id) => marcas.find((m) => m.id === id)?.nombre)
          .filter(Boolean)
          .join(', ');
        return `${marcasRealesSeleccionadas.length} marcas: ${nombres}`;
      }
      const m = marcas.find((x) => x.id === marcasSeleccionadas[0]);
      return m?.nombre ?? '';
    };

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Marca del vehículo</Text>
        <Text style={styles.subtitle}>
          {isEditMode && !tieneSeleccionMarca && servicioSeleccionado
            ? 'Determinando marca del servicio...'
            : isEditMode
              ? 'Marca de esta oferta (no se puede cambiar a varias en edición)'
              : 'Elige una o varias marcas. Con varias, verás solo servicios comunes a todas.'}
        </Text>

        {isEditMode && !tieneSeleccionMarca && servicioSeleccionado && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={I.primary} />
            <Text style={styles.loadingText}>Buscando marca del servicio...</Text>
          </View>
        )}

        {marcaGenerica && (
          <>
            <Text style={styles.marcaGrupoLabel}>Servicios genéricos</Text>
            <TouchableOpacity
              style={[
                styles.selectorOption,
                estaSeleccionada(0) && styles.selectorOptionSelected,
              ]}
              onPress={() => handleToggleMarca(0)}
              activeOpacity={0.7}
            >
              <View style={styles.selectorContent}>
                <Text style={styles.selectorEmoji}>🌐</Text>
                <Text
                  style={[
                    styles.selectorText,
                    estaSeleccionada(0) && styles.selectorTextSelected,
                  ]}
                >
                  {marcaGenerica.nombre}
                </Text>
                {estaSeleccionada(0) && (
                  <InstitutionalIcon name="checkmark-circle" size={24} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.marcaHint}>
              Solo para diagnóstico y servicios que no dependen de una marca de auto.
            </Text>
          </>
        )}

        {marcasReales.length > 0 && (
          <>
            <Text style={styles.marcaGrupoLabel}>Por marca de vehículo</Text>
            {!isEditMode && (
              <View style={styles.marcaAccionesRow}>
                <TouchableOpacity
                  style={styles.quickChip}
                  onPress={seleccionarTodasMisMarcas}
                  activeOpacity={0.85}
                >
                  <Text style={styles.quickChipText}>Todas mis marcas</Text>
                </TouchableOpacity>
                {tieneSeleccionMarca && !esGenericoTodasMarcas && (
                  <TouchableOpacity
                    style={styles.quickChipOutline}
                    onPress={limpiarMarcas}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.quickChipOutlineText}>Limpiar</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <View style={styles.selectorContainer}>
              {marcasReales.map((marca) => (
                <TouchableOpacity
                  key={marca.id}
                  style={[
                    styles.selectorOption,
                    estaSeleccionada(marca.id) && styles.selectorOptionSelected,
                  ]}
                  onPress={() => handleToggleMarca(marca.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.selectorContent}>
                    <Text style={styles.selectorEmoji}>🚗</Text>
                    <Text
                      style={[
                        styles.selectorText,
                        estaSeleccionada(marca.id) && styles.selectorTextSelected,
                      ]}
                    >
                      {marca.nombre}
                    </Text>
                    {estaSeleccionada(marca.id) && (
                      <InstitutionalIcon name="checkmark-circle" size={24} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {tieneSeleccionMarca && (
          <View style={styles.selectedIndicator}>
            <InstitutionalIcon name="checkmark-circle" size={20} color={I.semanticUp} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.selectedText}>{resumenSeleccion()}</Text>
          </View>
        )}
      </View>
    );
  };

  // Componente de selección de servicio
  const ServicioSelector = () => {
    if (!tieneSeleccionMarca) return null;

    const handleSelectServicio = (servicioId: number, servicioNombre: string) => {
      console.log('⚙️ Servicio seleccionado:', servicioId, servicioNombre);

      // Si es el mismo servicio, no hacer nada
      if (servicioId === servicioSeleccionado) {
        console.log('⚙️ Mismo servicio, ignorando');
        return;
      }

      setServicioSeleccionado(servicioId);

      // Solo resetear repuestos si estamos cambiando a un servicio diferente
      // Y no estamos en modo edición con datos pre-cargados del mismo servicio
      if (!isEditMode || !datosPreCargados || servicioId !== servicioOriginal) {
        setRepuestos([]);
        setRepuestosSeleccionados(new Set());
        setPreciosRepuestos(new Map());
      } else {
        setRepuestos([]);
      }
    };

    const servicioSeleccionadoObj = servicios.find(s => s.id === servicioSeleccionado);

    const subtituloServicios = () => {
      const n = servicios.length;
      if (esGenericoTodasMarcas) {
        return `Servicios genéricos del catálogo (${n} disponibles)`;
      }
      if (esMultimarca) {
        return `Servicios comunes a las ${marcasRealesSeleccionadas.length} marcas seleccionadas (${n})`;
      }
      const marcaObj = marcas.find((m) => m.id === marcasRealesSeleccionadas[0]);
      return marcaObj
        ? `Servicios para ${marcaObj.nombre} (${n} disponibles)`
        : `Selecciona marca(s) primero`;
    };

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Servicio ofrecido</Text>
        <Text style={styles.subtitle}>{subtituloServicios()}</Text>
        {esMultimarca && (
          <Text style={styles.marcaHint}>
            Solo aparecen servicios que el catálogo tiene para todas las marcas elegidas.
          </Text>
        )}


        {loadingServicios ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={I.primary} />
            <Text style={styles.loadingText}>Cargando servicios...</Text>
          </View>
        ) : servicios.length > 0 ? (
          <>
            {/* Selector Visual de Servicios */}
            <View style={styles.selectorContainer}>
              {servicios.map((servicio) => (
                <TouchableOpacity
                  key={servicio.id}
                  style={[
                    styles.selectorOption,
                    servicioSeleccionado === servicio.id && styles.selectorOptionSelected
                  ]}
                  onPress={() => handleSelectServicio(servicio.id, servicio.nombre)}
                >
                  <View style={styles.selectorContent}>
                    <Text style={styles.selectorEmoji}>⚙️</Text>
                    <View style={styles.selectorTextContainer}>
                      <Text style={[
                        styles.selectorText,
                        servicioSeleccionado === servicio.id && styles.selectorTextSelected
                      ]}>
                        {servicio.nombre}
                      </Text>
                      {servicio.descripcion && (
                        <Text style={styles.selectorDescription}>
                          {servicio.descripcion}
                        </Text>
                      )}
                    </View>
                    {servicioSeleccionado === servicio.id && (
                      <InstitutionalIcon name="checkmark-circle" size={20} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {servicioSeleccionadoObj && (
              <View style={styles.selectedIndicator}>
                <InstitutionalIcon name="checkmark-circle" size={20} color={I.semanticUp}  strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.selectedText}>
                  Servicio seleccionado: {servicioSeleccionadoObj.nombre}
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <InstitutionalIcon name="information-circle-outline" size={24} color={I.accentYellow}  strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.noDataText}>
              {esMultimarca
                ? 'No hay servicios en común para todas las marcas seleccionadas. Prueba con menos marcas o publícalo por separado.'
                : 'No hay servicios catalogados para esta selección. Si crees que falta alguno, contacta al administrador.'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Componente para el campo de precio de repuesto con BOTÓN DE CONFIRMAR
  const PrecioRepuestoInput = ({
    repuestoId,
    precioInicial,
    precioActual,
    onPrecioChange
  }: {
    repuestoId: number;
    precioInicial: number;
    precioActual: string;
    onPrecioChange: (id: number, precio: string) => void;
  }) => {
    // Estado local para el input
    const [localPrecio, setLocalPrecio] = useState(precioActual || '');
    // Estado para indicar si el precio ha sido confirmado
    const [precioConfirmado, setPrecioConfirmado] = useState(precioActual !== '' && precioActual !== '0');

    // Sincronizar cuando cambia precioActual desde fuera
    useEffect(() => {
      if (precioActual !== undefined && precioActual !== null) {
        setLocalPrecio(precioActual);
        setPrecioConfirmado(precioActual !== '' && precioActual !== '0');
      }
    }, [precioActual, repuestoId]);

    const handleChangeText = (text: string) => {
      // Solo permitir números y punto decimal
      const numericText = text.replace(/[^0-9.]/g, '');
      setLocalPrecio(numericText);
      // Marcar como no confirmado cuando cambia el texto
      if (precioConfirmado) {
        setPrecioConfirmado(false);
      }
    };

    // Función para confirmar el precio - SE LLAMA CON EL BOTÓN
    const confirmarPrecio = () => {

      const precioStr = localPrecio.trim();
      if (precioStr === '' || precioStr === '0') {
        Alert.alert('Precio inválido', 'Por favor ingrese un precio mayor a 0');
        return;
      }

      const precioNum = parseMontoDecimal(precioStr);
      if (precioNum <= 0) {
        Alert.alert('Precio inválido', 'Por favor ingrese un número válido mayor a 0');
        return;
      }

      // Formatear el número
      const valorFormateado = precioNum.toString();
      setLocalPrecio(valorFormateado);
      setPrecioConfirmado(true);

      console.log(`✅ Precio confirmado para repuesto ${repuestoId}: ${valorFormateado}`);

      // Actualizar el estado global
      onPrecioChange(repuestoId, valorFormateado);
    };

    return (
      <View style={styles.repuestoPrecioInputContainer}>
        <Text style={styles.repuestoPrecioLabel}>
          Precio del repuesto:{' '}
          {precioConfirmado ? <Text style={styles.precioConfirmadoBadge}>✓ Confirmado</Text> : null}
        </Text>
        <View style={styles.repuestoPrecioRow}>
          <TextInput
            style={[
              styles.repuestoPrecioInput,
              styles.repuestoPrecioInputWithButton,
              precioConfirmado && styles.repuestoPrecioInputConfirmed
            ]}
            placeholder={`Ref: $${precioInicial.toLocaleString()}`}
            placeholderTextColor={I.mutedSoft}
            value={localPrecio}
            onChangeText={handleChangeText}
            keyboardType="numeric"
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[
              styles.confirmarPrecioBtn,
              precioConfirmado && styles.confirmarPrecioBtnConfirmed
            ]}
            onPress={confirmarPrecio}
          >
            <InstitutionalIcon
              name={precioConfirmado ? "checkmark-circle" : "checkmark"}
              size={20}
              color={I.onPrimary}
             strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.confirmarPrecioBtnText}>
              {precioConfirmado ? 'OK' : 'Confirmar'}
            </Text>
          </TouchableOpacity>
        </View>
        {!precioConfirmado && localPrecio !== '' && (
          <Text style={styles.precioNoConfirmadoText}>
            ⚠️ Presiona "Confirmar" para guardar este precio
          </Text>
        )}
      </View>
    );
  };

  // Componente de selección de repuestos
  const RepuestosSelector = () => {
    if (tipoServicio !== 'con_repuestos' || !servicioSeleccionado) return null;

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Repuestos a incluir</Text>
        {loadingRepuestos ? (
          <ActivityIndicator style={styles.loader} />
        ) : repuestos.length > 0 ? (
          <View>
            {repuestos.map((repuesto) => {
              const estaSeleccionado = repuestosSeleccionados.has(repuesto.id);
              // Leer precio actual del Map - solo usar el precio que el proveedor haya ingresado
              // NO usar precio_referencia como valor inicial, el proveedor debe ingresar el precio manualmente
              const precioStr = preciosRepuestos.get(repuesto.id);
              const precioActual = precioStr !== undefined && precioStr !== null ? precioStr : '';
              // precioInicial solo se usa como placeholder, no como valor inicial
              const precioInicial = repuesto.precio_referencia || 0;

              return (
                <View
                  key={repuesto.id}
                  style={[
                    styles.repuestoItem,
                    estaSeleccionado && styles.repuestoSelected
                  ]}
                >
                  <TouchableOpacity
                    style={styles.repuestoInfoContainer}
                    onPress={() => toggleRepuesto(repuesto.id)}
                  >
                    <View style={styles.repuestoInfo}>
                      <Text style={styles.repuestoNombre}>{repuesto.nombre}</Text>
                      <Text style={styles.repuestoMarca}>{repuesto.marca}</Text>
                      {!estaSeleccionado && (
                        <Text style={styles.repuestoPrecio}>
                          Precio ref: ${precioInicial.toLocaleString()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.checkbox}>
                      {estaSeleccionado && (
                        <InstitutionalIcon name="checkmark" size={20} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
                      )}
                    </View>
                  </TouchableOpacity>

                  {estaSeleccionado && (
                    <PrecioRepuestoInput
                      repuestoId={repuesto.id}
                      precioInicial={precioInicial}
                      precioActual={precioActual}
                      onPrecioChange={actualizarPrecioRepuesto}
                    />
                  )}
                </View>
              );
            })}

            {repuestosSeleccionados.size > 0 && (
              <View style={styles.repuestosTotalContainer}>
                <Text style={styles.repuestosTotalLabel}>Total repuestos:</Text>
                <Text style={styles.repuestosTotalValue}>
                  ${parseMontoDecimal(costoRepuestos || '0').toLocaleString('es-CL')}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyRepuestosContainer}>
            <InstitutionalIcon name="info-outline" size={48} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.emptyRepuestosTitle}>
              No hay repuestos configurados
            </Text>
            <Text style={styles.emptyRepuestosText}>
              Este servicio aún no tiene repuestos asociados en el catálogo del sistema.
            </Text>
            <View style={styles.emptyRepuestosOptions}>
              <Text style={styles.emptyRepuestosHint}>Tus opciones</Text>
              <View style={styles.emptyOptionItem}>
                <Text style={styles.emptyOptionBullet}>•</Text>
                <Text style={styles.emptyOptionText}>
                  Cambia a "Solo mano de obra" arriba si no necesitas incluir repuestos en este servicio
                </Text>
              </View>
              <View style={styles.emptyOptionItem}>
                <Text style={styles.emptyOptionBullet}>•</Text>
                <Text style={styles.emptyOptionText}>
                  Contacta al administrador del sistema para que agregue repuestos a este tipo de servicio
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Componente de selección de fotos
  const FotoSelector = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Fotos del servicio (opcional)</Text>
      <Text style={styles.fotoSubtitle}>
        Agrega hasta 5 fotos que muestren tu trabajo o materiales
      </Text>

      {fotos.length > 0 && (
        <FlatList
          data={fotos}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => index.toString()}
          style={styles.fotosLista}
          renderItem={({ item, index }) => (
            <View style={styles.fotoContainer}>
              <Image source={{ uri: item }} style={styles.fotoPreview} />
              <TouchableOpacity
                style={styles.eliminarFotoBtn}
                onPress={() => eliminarFoto(index)}
              >
                <InstitutionalIcon name="close-circle" size={24} color={I.semanticDown}  strokeWidth={ICON_STROKE_WIDTH} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {fotos.length < 5 && (
        <TouchableOpacity style={styles.agregarFotoBtn} onPress={seleccionarFoto}>
          <InstitutionalIcon name="camera-outline" size={32} color={I.muted}  strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={styles.agregarFotoText}>
            {fotos.length === 0 ? 'Agregar primera foto' : `Agregar foto (${fotos.length}/5)`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Componente de desglose de precios
  const DesglosePrecios = () => {
    if (!showCalculos || !calculos) return null;

    return (
      <View style={styles.calculosContainer}>
        <Text style={styles.calculosTitle}>Desglose de precios</Text>

        <View style={styles.calculoRow}>
          <Text style={styles.calculoLabel}>Precio mano de servicio:</Text>
          <Text style={styles.calculoValue}>
            ${parseMontoDecimal(costoManoObra || '0').toLocaleString('es-CL')}
          </Text>
        </View>

        {tipoServicio === 'con_repuestos' && parseMontoDecimal(costoRepuestos || '0') > 0 && (
          <View style={styles.calculoRow}>
            <Text style={styles.calculoLabel}>Precio repuestos:</Text>
            <Text style={styles.calculoValue}>
              ${parseMontoDecimal(costoRepuestos || '0').toLocaleString('es-CL')}
            </Text>
          </View>
        )}

        <View style={[styles.calculoRow, styles.calculoDestacado]}>
          <Text style={styles.calculoLabel}>Costo total sin IVA:</Text>
          <Text style={styles.calculoValue}>
            ${calculos.costo_total_sin_iva.toLocaleString('es-CL')}
          </Text>
        </View>

        <View style={styles.calculoRow}>
          <Text style={styles.calculoLabel}>IVA 19%:</Text>
          <Text style={styles.calculoValue}>
            ${calculos.iva_19_porciento.toLocaleString('es-CL')}
          </Text>
        </View>

        <View style={[styles.calculoRow, styles.calculoFinal]}>
          <Text style={[styles.calculoLabel, styles.calculoLabelBold]}>Precio al público</Text>
          <Text style={styles.calculoPrecioPublico}>
            ${calculos.precio_final_cliente.toLocaleString('es-CL')}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <Header
        title={isEditMode ? 'Editar servicio' : 'Crear servicio'}
        showBack
        onBackPress={() => router.back()}
        backgroundColor={I.canvas}
        titleColor={I.ink}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.fixed['2xl'] }}
        >
          <TipoServicioSelector />

          {loadingMarcas ? (
            <View style={styles.sectionContainer}>
              <ActivityIndicator size="large" color={I.primary} style={styles.loader} />
              <Text style={styles.loadingText}>Cargando marcas de vehículos...</Text>
            </View>
          ) : (
            <>
              {console.log('🎨 Renderizando componentes de selección:', {
                tipoServicio,
                marcasLength: marcas.length,
                marcasSeleccionadas,
                serviciosLength: servicios.length,
                servicioSeleccionado
              })}
              <MarcaSelector />
              <ServicioSelector />
              <RepuestosSelector />
            </>
          )}

          <FotoSelector />

          {/* Descripción */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Descripción del servicio</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe tu servicio, metodología, garantías, etc."
              placeholderTextColor={I.mutedSoft}
              multiline
              numberOfLines={4}
              value={descripcion}
              onChangeText={setDescripcion}
              textAlignVertical="top"
            />
          </View>

          {/* Costos */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Costos (sin IVA)</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Costo mano de obra *</Text>
              <TextInput
                style={styles.numberInput}
                placeholder="0"
                placeholderTextColor={I.mutedSoft}
                value={costoManoObra}
                onChangeText={setCostoManoObra}
                keyboardType="numeric"
              />
            </View>

            {tipoServicio === 'con_repuestos' && repuestosSeleccionados.size > 0 && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Costo total repuestos</Text>
                <TextInput
                  style={[styles.numberInput, styles.numberInputDisabled]}
                  placeholder="0"
                  placeholderTextColor={I.mutedSoft}
                  value={costoRepuestos}
                  editable={false}
                  keyboardType="numeric"
                />
                <Text style={styles.inputHelp}>
                  Este valor se calcula automáticamente sumando los precios de los repuestos seleccionados
                </Text>
              </View>
            )}
          </View>

          <DesglosePrecios />

          {/* Botón publicar */}
          <View style={styles.publishContainer}>
            <TouchableOpacity
              style={[
                styles.publishButton,
                loading && styles.publishButtonDisabled
              ]}
              onPress={publicarServicio}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={I.onPrimary} />
              ) : (
                <>
                  <InstitutionalIcon name={isEditMode ? "checkmark-circle" : "rocket"} size={20} color={I.onPrimary}  strokeWidth={ICON_STROKE_WIDTH} />
                  <Text style={styles.publishButtonText}>
                    {isEditMode
                      ? 'Actualizar Servicio'
                      : esMultimarca
                        ? `Publicar en ${marcasRealesSeleccionadas.length} marcas`
                        : 'Publicar Servicio'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.publishNote}>
              {isEditMode
                ? 'Al actualizar, los cambios estarán disponibles inmediatamente para los clientes'
                : 'Al publicar, tu servicio estará disponible inmediatamente para los clientes'
              }
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  flex: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  loader: {
    marginVertical: SPACING.fixed.lg,
  },

  sectionContainer: {
    backgroundColor: I.canvas,
    marginHorizontal: hx,
    marginVertical: SPACING.fixed.sm,
    padding: SPACING.fixed.md,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    ...SHADOWS.editorial,
  },
  sectionTitle: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    marginBottom: SPACING.fixed.sm,
    color: I.ink,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
  },

  tipoServicioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.fixed.xs,
  },
  tipoServicioOption: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.fixed.md,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.canvas,
  },
  tipoServicioSelected: {
    borderColor: I.primary,
    backgroundColor: withOpacity(I.primary, 0.08),
  },
  tipoServicioText: {
    marginTop: SPACING.fixed.xs,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.muted,
    textAlign: 'center',
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TYPOGRAPHY.lineHeight.normal),
  },
  tipoServicioTextSelected: {
    color: I.primary,
    fontFamily: FF.sansSemiBold,
  },

  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.muted,
    marginBottom: SPACING.fixed.sm,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TYPOGRAPHY.lineHeight.normal),
  },

  marcaGrupoLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginTop: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.xs,
  },
  marcaHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
    marginBottom: SPACING.fixed.sm,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
  },
  marcaAccionesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
    marginBottom: SPACING.fixed.sm,
  },
  quickChip: {
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.xs,
    borderRadius: BORDERS.radius.full,
    backgroundColor: withOpacity(I.primary, 0.12),
  },
  quickChipText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.primary,
  },
  quickChipOutline: {
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.xs,
    borderRadius: BORDERS.radius.full,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  quickChipOutlineText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },

  selectorContainer: {
    marginTop: SPACING.fixed.sm,
    gap: SPACING.fixed.xs,
  },

  selectorOption: {
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.canvas,
    paddingVertical: SPACING.fixed.md,
    paddingHorizontal: SPACING.fixed.md,
    ...SHADOWS.editorial,
  },

  selectorOptionSelected: {
    borderColor: I.primary,
    backgroundColor: withOpacity(I.primary, 0.06),
  },

  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  selectorEmoji: {
    fontSize: 22,
    marginRight: SPACING.fixed.sm,
  },

  selectorTextContainer: {
    flex: 1,
  },

  selectorText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },

  selectorTextSelected: {
    color: I.primary,
  },

  selectorDescription: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.muted,
    marginTop: SPACING.fixed.xxs,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TYPOGRAPHY.lineHeight.normal),
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.fixed.sm,
    padding: SPACING.fixed.sm,
    backgroundColor: withOpacity(I.semanticUp, 0.1),
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.semanticUp, 0.35),
  },
  selectedText: {
    marginLeft: SPACING.fixed.xs,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.semanticUp,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.fixed.lg,
  },
  loadingText: {
    marginLeft: SPACING.fixed.sm,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  noDataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.fixed.lg,
    backgroundColor: withOpacity(I.accentYellow, 0.12),
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.accentYellow, 0.4),
    marginTop: SPACING.fixed.xs,
  },
  noDataText: {
    marginLeft: SPACING.fixed.sm,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.body,
    textAlign: 'center',
    flex: 1,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TYPOGRAPHY.lineHeight.relaxed),
  },

  repuestoItem: {
    padding: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.xs,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.canvas,
  },
  repuestoSelected: {
    borderColor: I.primary,
    backgroundColor: withOpacity(I.primary, 0.06),
  },
  repuestoInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repuestoInfo: {
    flex: 1,
  },
  repuestoNombre: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  repuestoMarca: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.muted,
    marginTop: 2,
  },
  repuestoPrecio: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.monoMedium,
    color: I.semanticUp,
    marginTop: SPACING.fixed.xxs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: I.canvas,
  },
  repuestoPrecioInputContainer: {
    marginTop: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.sm,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
  },
  repuestoPrecioLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginBottom: SPACING.fixed.xxs + 2,
  },
  precioConfirmadoBadge: {
    fontFamily: FF.sansSemiBold,
    color: I.semanticUp,
  },
  repuestoPrecioInput: {
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.sm,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.monoMedium,
    color: I.ink,
    backgroundColor: I.canvas,
  },
  repuestoPrecioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
  },
  repuestoPrecioInputWithButton: {
    flex: 1,
  },
  repuestoPrecioInputConfirmed: {
    borderColor: I.semanticUp,
    backgroundColor: withOpacity(I.semanticUp, 0.08),
  },
  confirmarPrecioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: I.primary,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.md,
    gap: SPACING.fixed.xxs,
  },
  confirmarPrecioBtnConfirmed: {
    backgroundColor: I.semanticUp,
  },
  confirmarPrecioBtnText: {
    color: I.onPrimary,
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  precioNoConfirmadoText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.accentYellow,
    marginTop: SPACING.fixed.xxs,
    fontStyle: 'italic',
  },
  repuestosTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.fixed.md,
    padding: SPACING.fixed.md,
    backgroundColor: I.surfaceStrong,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  repuestosTotalLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  repuestosTotalValue: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.monoMedium,
    color: I.semanticUp,
  },
  noRepuestosText: {
    textAlign: 'center',
    color: I.muted,
    fontFamily: FF.sansRegular,
    fontStyle: 'italic',
    padding: SPACING.fixed.lg,
  },

  inputContainer: {
    marginBottom: SPACING.fixed.md,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginBottom: SPACING.fixed.xxs + 2,
  },
  numberInput: {
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.sm,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.monoMedium,
    color: I.ink,
    backgroundColor: I.canvas,
  },
  numberInputDisabled: {
    backgroundColor: I.surfaceStrong,
    color: I.muted,
    fontFamily: FF.monoMedium,
  },
  inputHelp: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
    marginTop: SPACING.fixed.xxs,
    fontStyle: 'italic',
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.relaxed),
  },
  textArea: {
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.sm,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.sansRegular,
    color: I.ink,
    backgroundColor: I.canvas,
    minHeight: 100,
    lineHeight: lh(TYPOGRAPHY.fontSize.md, TYPOGRAPHY.lineHeight.normal),
  },

  calculosContainer: {
    backgroundColor: I.canvas,
    marginHorizontal: hx,
    marginVertical: SPACING.fixed.sm,
    padding: SPACING.fixed.md,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    ...SHADOWS.editorial,
  },
  calculosTitle: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    marginBottom: SPACING.fixed.sm,
    color: I.ink,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
  },
  calculoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.fixed.xs,
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
  },
  calculoDestacado: {
    backgroundColor: I.surfaceStrong,
    padding: SPACING.fixed.xs,
    borderRadius: BORDERS.radius.sm,
    marginVertical: SPACING.fixed.xxs,
  },
  calculoFinal: {
    backgroundColor: withOpacity(I.primary, 0.1),
    padding: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.md,
    marginTop: SPACING.fixed.xs,
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.primary, 0.22),
  },
  calculoLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.body,
    flex: 1,
  },
  calculoLabelBold: {
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  calculoValue: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.monoMedium,
    color: I.ink,
    textAlign: 'right',
  },
  calculoPrecioPublico: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.monoMedium,
    color: I.primary,
  },
  separador: {
    height: BORDERS.width.thin,
    backgroundColor: I.hairline,
    marginVertical: SPACING.fixed.xs,
  },
  montoTransferido: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
    textAlign: 'center',
    marginTop: SPACING.fixed.xs,
    fontStyle: 'italic',
  },

  publishContainer: {
    paddingHorizontal: hx,
    paddingTop: SPACING.fixed.md,
    paddingBottom: SPACING.fixed.xl,
  },
  publishButton: {
    backgroundColor: I.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.fixed.md,
    borderRadius: BORDERS.radius.pill,
    marginBottom: SPACING.fixed.xs,
    gap: SPACING.fixed.sm,
  },
  publishButtonDisabled: {
    opacity: 0.55,
  },
  publishButtonText: {
    color: I.onPrimary,
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.button.fontSize, TS.button.lineHeight),
  },
  publishNote: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
    textAlign: 'center',
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
  },

  fotoSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.muted,
    marginBottom: SPACING.fixed.sm,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TYPOGRAPHY.lineHeight.normal),
  },
  fotosLista: {
    marginBottom: SPACING.fixed.md,
  },
  fotoContainer: {
    marginRight: SPACING.fixed.sm,
    position: 'relative',
  },
  fotoPreview: {
    width: 100,
    height: 100,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceStrong,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  eliminarFotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: I.canvas,
    borderRadius: 14,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    ...SHADOWS.editorial,
  },
  agregarFotoBtn: {
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    borderStyle: 'dashed',
    borderRadius: BORDERS.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.fixed.xl,
    paddingHorizontal: SPACING.fixed.md,
    backgroundColor: I.surfaceSoft,
  },
  agregarFotoText: {
    marginTop: SPACING.fixed.xs,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.muted,
    textAlign: 'center',
  },

  emptyRepuestosContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.fixed.lg,
    backgroundColor: I.surfaceStrong,
    borderRadius: BORDERS.radius.lg,
    marginTop: SPACING.fixed.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  emptyRepuestosTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginTop: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.xs,
    textAlign: 'center',
  },
  emptyRepuestosText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.body,
    textAlign: 'center',
    marginBottom: SPACING.fixed.md,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TYPOGRAPHY.lineHeight.relaxed),
  },
  emptyRepuestosOptions: {
    width: '100%',
    backgroundColor: I.canvas,
    padding: SPACING.fixed.md,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  emptyRepuestosHint: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginBottom: SPACING.fixed.xs,
  },
  emptyOptionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.fixed.xs,
  },
  emptyOptionBullet: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.sansSemiBold,
    color: I.primary,
    marginRight: SPACING.fixed.xs,
    lineHeight: lh(TYPOGRAPHY.fontSize.md, TYPOGRAPHY.lineHeight.normal),
  },
  emptyOptionText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.body,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.relaxed),
  },
});

export default CrearServicioScreen;
