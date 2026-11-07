import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { puedeUsarAsistenteIaEnOrden } from '@/utils/asistenteIaPermisos';

function datosCliente(cliente: ClienteProtegido | ClienteCompleto) {
  if ('nombre' in cliente) {
    return {
      nombre: `${cliente.nombre} ${cliente.apellido || ''}`.trim(),
      telefono: cliente.telefono || '',
      email: cliente.email || '',
    };
  }
  return {
    nombre: cliente.nombre_ofuscado,
    telefono: cliente.telefono_ofuscado || '',
    email: '',
  };
}

function direccionServicio(orden: Orden): string {
  return (orden.ubicacion_servicio_segura || '').trim();
}
import {
  ordenesProveedorService,
  type ClienteCompleto,
  type ClienteProtegido,
  type Orden,
} from '@/services/ordenesProveedor';
import { checklistService, type ChecklistInstance } from '@/services/checklistService';
import { ChecklistContainer } from '@/components/checklist/ChecklistContainer';
import { ChecklistCompletedView } from '@/components/checklist/ChecklistCompletedView';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS, SHADOWS, withOpacity } from '@/design-system/tokens';
import { institutionalStatusColors } from '@/app/design-system/styles/institutionalSemantic';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { AsistenteDiagnosticoCard } from '@/components/orden-detalle/AsistenteDiagnosticoCard';
import {
  HostPaperSection,
  hostScreenStyles,
  HOST_GUTTER,
} from '@/app/design-system/components';
import { AsignarTecnicoBottomSheet } from '@/components/equipo/AsignarTecnicoBottomSheet';
import equipoTallerService, { etiquetaModalidadMecanico } from '@/services/equipoTallerService';
import { formatearFechaServicioExacta } from '@/utils/fechaLocal';
import { montoConocidoCLP } from '@/utils/formatearMontoCLP';
import { HistorialAsignacionesModal } from '@/components/ordenes/HistorialAsignacionesModal';
import { ConflictosHorarioAlert } from '@/components/ordenes/ConflictosHorarioAlert';
import type { ConflictosResponse } from '@/services/ordenesProveedor';
import {
  ESTADO_OPERATIVO_LABELS,
  ESTADO_OPERATIVO_VARIANT,
  mapOrdenEstadoToOperativo,
} from '@/utils/estadoOperativo';
import { cobroVisibleOrden } from '@/utils/cobroTrabajo';
import { EstadoTrabajoCobro } from '@/components/trabajo/EstadoTrabajoCobro';
import logger from '@/utils/logger';

const I = COLORS.institutional;
const successStatus = institutionalStatusColors('success');
const errorStatus = institutionalStatusColors('error');
const primaryStatus = institutionalStatusColors('primary');
const warningStatus = institutionalStatusColors('warning');
const neutralStatus = institutionalStatusColors('neutral');

export default function OrdenDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { esMecanicoEquipo, miembroId, estadoProveedor, esSupervisor, rolTaller, puede } = useAuth();
  const esProveedorDomicilio = estadoProveedor?.tipo_proveedor === 'mecanico';
  const esMandanteTaller = rolTaller === 'mandante';
  const [orden, setOrden] = useState<Orden | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  // 🔄 ESTADOS PARA CHECKLIST - IGUAL QUE EN INDEX.TSX
  // Estados para checklist completado
  const [showCompletedChecklist, setShowCompletedChecklist] = useState(false);
  const [selectedOrdenIdForChecklist, setSelectedOrdenIdForChecklist] = useState<number | null>(null);

  // Estados para checklist en progreso/pendiente
  const [showChecklistContainer, setShowChecklistContainer] = useState(false);
  const [selectedOrdenIdForContainer, setSelectedOrdenIdForContainer] = useState<number | null>(null);
  const [asignarVisible, setAsignarVisible] = useState(false);
  const [mecanicoDetalle, setMecanicoDetalle] = useState<{
    nombre: string;
    modalidad?: string;
    especialidades?: string;
  } | null>(null);
  
  // ✅ Estado para verificar si hay checklist disponible
  const [tieneChecklistDisponible, setTieneChecklistDisponible] = useState<boolean | null>(null);

  // Nuevos estados para assignment history y conflicts
  const [historialVisible, setHistorialVisible] = useState(false);
  const [conflictosVisible, setConflictosVisible] = useState(false);
  const [conflictosData, setConflictosData] = useState<ConflictosResponse | null>(null);

  useEffect(() => {
    if (id) {
      cargarOrden();
    }
  }, [id]);

  useEffect(() => {
    const mecanicoId = orden?.mecanico_asignado_id;
    if (!mecanicoId) {
      setMecanicoDetalle(null);
      return;
    }
    void equipoTallerService.obtener(mecanicoId).then((m) => {
      if (!m) {
        setMecanicoDetalle(null);
        return;
      }
      setMecanicoDetalle({
        nombre: m.nombre,
        modalidad: etiquetaModalidadMecanico(m),
        especialidades: m.especialidades_detalle?.map((e) => e.nombre).join(' · '),
      });
    });
  }, [orden?.mecanico_asignado_id]);

  const cargarOrden = async () => {
    try {
      setLoading(true);
      const response = await ordenesProveedorService.obtenerDetalle(Number(id));
      
      if (response.success && response.data) {
        const ordenData = response.data;
        
        // Si la orden tiene una oferta asociada y está en estados que requieren checklist,
        // redirigir a la pantalla de oferta en lugar de mostrar orden-detalle
        const estadosConChecklist = [
          'aceptada_por_proveedor',
          'servicio_iniciado',
          'checklist_en_progreso',
          'checklist_completado',
          'en_proceso',
          'completado'
        ];
        
        if ((ordenData as any).oferta_proveedor_id && estadosConChecklist.includes(ordenData.estado)) {
          logger.log('🔄 Redirigiendo a oferta-detalle porque la orden tiene oferta asociada');
          router.replace(`/oferta-detalle/${(ordenData as any).oferta_proveedor_id}`);
          return;
        }
        
        setOrden(ordenData);
        
        // ✅ Verificar si hay checklist disponible para esta orden
        // Solo verificar si el estado requiere checklist
        const estadosParaVerificarChecklist = [
          'servicio_iniciado',
          'checklist_en_progreso',
          'checklist_completado',
          'completado'
        ];
        
        if (estadosParaVerificarChecklist.includes(ordenData.estado) && 
            (ordenData.tipo_servicio === 'domicilio' || ordenData.tipo_servicio === 'taller')) {
          try {
            logger.log('🔍 Verificando checklist para orden:', ordenData.id);
            const checklistResult = await checklistService.getInstanceByOrder(ordenData.id);
            logger.log('📋 Resultado checklist:', checklistResult);
            
            if (checklistResult.success && checklistResult.data) {
              setTieneChecklistDisponible(true);
              logger.log('✅ Checklist disponible para orden:', ordenData.id);
            } else {
              setTieneChecklistDisponible(false);
              logger.log('ℹ️ No hay checklist disponible:', checklistResult.message);
            }
          } catch (error: any) {
            logger.error('❌ Error obteniendo checklist:', error);
            setTieneChecklistDisponible(false);
            // Show error to user for debugging
            if (ordenData.estado === 'servicio_iniciado') {
              Alert.alert('Info Checklist', `No se pudo cargar checklist: ${error.message || 'Error desconocido'}. Refresque la página.`);
            }
          }
        } else {
          setTieneChecklistDisponible(false);
        }
      } else {
        Alert.alert('Error', response.message || 'No se pudo cargar la orden');
        router.back();
      }
    } catch (error) {
      logger.error('Error inesperado cargando orden:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleLlamarCliente = () => {
    const telefono = orden ? datosCliente(orden.cliente_detail).telefono : '';
    if (telefono) {
      Linking.openURL(`tel:${telefono}`);
    }
  };

  const handleAbrirMapa = () => {
    const direccion = orden ? direccionServicio(orden) : '';
    if (direccion) {
      const address = encodeURIComponent(direccion);
      Linking.openURL(`https://maps.google.com/?q=${address}`);
    }
  };

  const handleAceptar = async () => {
    if (!orden || procesando) return;

    Alert.alert(
      'Aceptar Orden',
      '¿Estás seguro de que quieres aceptar esta orden?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar',
          onPress: async () => {
            try {
              setProcesando(true);
              const response = await ordenesProveedorService.aceptarOrden(orden.id, {});
              
              if (response.success) {
                const mensaje = response.data?.message || response.message || 'Orden aceptada correctamente';
                Alert.alert('Éxito', mensaje);
                await cargarOrden();
              } else {
                Alert.alert('Error', response.message || 'No se pudo aceptar la orden');
              }
            } catch (error) {
              logger.error('Error inesperado aceptando orden:', error);
              const errorMsg = (error as any)?.response?.data?.message || 'Ocurrió un error inesperado. Por favor, intenta de nuevo.';
              Alert.alert('Error', errorMsg);
            } finally {
              setProcesando(false);
            }
          },
        },
      ]
    );
  };

  const handleRechazar = async () => {
    if (!orden) return;

    Alert.prompt(
      'Rechazar Orden',
      'Por favor, indica el motivo del rechazo:',
      async (motivo) => {
        if (motivo && motivo.trim()) {
          try {
            setProcesando(true);
            const response = await ordenesProveedorService.rechazarOrden(orden.id, {
              motivo_rechazo: motivo.trim(),
            });
            
            if (response.success) {
              Alert.alert('Orden rechazada', response.data?.message || 'La orden ha sido rechazada');
              await cargarOrden(); // Recargar datos
            } else {
              Alert.alert('Error', response.message || 'No se pudo rechazar la orden');
            }
          } catch (error) {
            logger.error('Error inesperado rechazando orden:', error);
            Alert.alert('Error', 'Ocurrió un error inesperado');
          } finally {
            setProcesando(false);
          }
        }
      },
      'plain-text',
      '',
      'default'
    );
  };

  const handleIniciarServicio = async () => {
    if (!orden || procesando) return;

    Alert.alert(
      'Iniciar Servicio',
      '¿Estás listo para comenzar con el servicio? Esto activará el checklist correspondiente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Iniciar',
          onPress: async () => {
            try {
              setProcesando(true);
              logger.log('🚀 Iniciando servicio para orden desde detalle:', orden.id);
              const resultado = await ordenesProveedorService.iniciarServicio(orden.id);
              
              if (resultado.success) {
                await checklistService.forceRefreshChecklist(orden.id);
                await new Promise(resolve => setTimeout(resolve, 2000));
                await checklistService.clearChecklistCache();
                
                const mensaje = resultado.data?.message || resultado.message || 'El servicio ha sido iniciado. Ahora puedes proceder con el checklist.';
                Alert.alert(
                  'Servicio Iniciado', 
                  mensaje,
                  [
                    {
                      text: 'OK',
                      onPress: async () => {
                        await cargarOrden();
                      }
                    }
                  ]
                );
              } else {
                Alert.alert('Error', resultado.message || 'No se pudo iniciar el servicio');
              }
            } catch (error) {
              logger.error('Error inesperado iniciando servicio desde detalle:', error);
              const errorMsg = (error as any)?.response?.data?.message || 'Error inesperado al iniciar el servicio. Si el problema persiste, intenta recargar la orden.';
              Alert.alert('Error', errorMsg);
            } finally {
              setProcesando(false);
            }
          },
        },
      ]
    );
  };

  const handleCompletarServicio = async () => {
    if (!orden) return;

    Alert.alert(
      'Completar Servicio',
      '¿Has terminado el servicio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Completar',
          onPress: async () => {
            try {
              setProcesando(true);
              const response = await ordenesProveedorService.actualizarEstado(orden.id, 'completado');
              
              if (response.success) {
                Alert.alert('Servicio completado', response.data?.message || 'El servicio ha sido marcado como completado');
                await cargarOrden();
              } else {
                Alert.alert('Error', response.message || 'No se pudo completar el servicio');
              }
            } catch (error) {
              logger.error('Error inesperado completando servicio:', error);
              Alert.alert('Error', 'Ocurrió un error inesperado');
            } finally {
              setProcesando(false);
            }
          },
        },
      ]
    );
  };

  // 🔄 FUNCIONES DE CHECKLIST - IGUALES QUE EN INDEX.TSX
  const handleChecklistComplete = () => {
    logger.log('✅ handleChecklistComplete - Cerrando ChecklistContainer desde orden-detalle');
    Alert.alert(
      'Checklist Completado',
      'El checklist ha sido finalizado exitosamente',
      [
        {
          text: 'OK',
          onPress: () => {
            setShowChecklistContainer(false);
            setSelectedOrdenIdForContainer(null);
            cargarOrden(); // Recargar para actualizar estados
          },
        },
      ]
    );
  };

  const handleChecklistCancel = () => {
    logger.log('🚫 handleChecklistCancel - Cerrando ChecklistContainer desde orden-detalle');
    setShowChecklistContainer(false);
    setSelectedOrdenIdForContainer(null);
  };

  const handleFinalizarServicio = async () => {
    if (!orden) return;

    Alert.alert(
      'Finalizar Servicio',
      '¿Confirmas que el servicio ha sido completado? Esta acción marcará la orden como terminada.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          onPress: async () => {
            try {
              logger.log('✅ Finalizando servicio para orden desde detalle:', orden.id);
              const resultado = await ordenesProveedorService.finalizarServicio(orden.id);
              
              if (resultado.success) {
                Alert.alert(
                  'Servicio Finalizado', 
                  'El servicio ha sido completado exitosamente.'
                );
                cargarOrden(); // Recargar datos
              } else {
                Alert.alert('Error', resultado.message || 'No se pudo finalizar el servicio');
              }
            } catch (error) {
              logger.error('Error inesperado finalizando servicio desde detalle:', error);
              Alert.alert('Error', 'Error inesperado al finalizar el servicio');
            }
          },
        },
      ]
    );
  };

  // Función para determinar qué botón de checklist mostrar
  const getBotonChecklist = () => {
    if (!orden) return null;
    
    // 1. Orden aceptada por proveedor → Mostrar "Iniciar Servicio"
    if (orden.estado === 'aceptada_por_proveedor') {
      return {
        texto: 'Iniciar Servicio',
        color: I.primary,
        icon: 'play-arrow',
        onPress: () => handleIniciarServicio()
      };
    }

    // 2. Servicio iniciado o checklist en progreso → Mostrar botones de checklist
    if (orden.estado === 'servicio_iniciado' || orden.estado === 'checklist_en_progreso') {
      if (tieneChecklistDisponible === false) {
        return null;
      }
      
      if (tieneChecklistDisponible === null) {
        return {
          texto: 'Verificando Checklist...',
          color: I.muted,
          icon: 'hourglass-empty',
          onPress: () => {},
          disabled: true
        };
      }
      
      return {
        texto: 'Realizar Checklist',
        color: I.primary,
        icon: 'assignment',
        testID: 'checklist-cta-button',
        onPress: () => {
          setSelectedOrdenIdForContainer(orden.id);
          setShowChecklistContainer(true);
        }
      };
    }

    // 3. Checklist completado → Mostrar "Finalizar Servicio"
    if (orden.estado === 'checklist_completado') {
      return {
        texto: 'Finalizar Servicio',
        color: I.semanticUp,
        icon: 'done-all',
        onPress: () => handleFinalizarServicio()
      };
    }

    // 4. Servicio completado → Mostrar "Ver Checklist"
    if (orden.estado === 'completado') {
      return {
        texto: 'Ver Checklist',
        color: I.primaryActive,
        icon: 'visibility',
        onPress: () => {
          setSelectedOrdenIdForChecklist(orden.id);
          setShowCompletedChecklist(true);
        }
      };
    }

    return null;
  };

  // 🔄 RENDERIZADO CONDICIONAL DE CHECKLIST
  if (showChecklistContainer && selectedOrdenIdForContainer) {
    return (
      <ChecklistContainer
        ordenId={selectedOrdenIdForContainer}
        onComplete={handleChecklistComplete}
        onCancel={handleChecklistCancel}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.headerSafeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <InstitutionalIcon name="arrow-back" size={24} color={I.ink}  strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Cargando...</Text>
            </View>
            <View style={{ width: 24 }} />
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={I.primary} />
          <Text style={styles.loadingText}>Cargando orden...</Text>
        </View>
      </View>
    );
  }

  if (!orden) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.headerSafeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <InstitutionalIcon name="arrow-back" size={24} color={I.ink}  strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Error</Text>
            </View>
            <View style={{ width: 24 }} />
          </View>
        </SafeAreaView>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se pudo cargar la orden</Text>
          <TouchableOpacity style={styles.actionButtonLegacy} onPress={() => router.back()}>
            <Text style={styles.actionButtonLegacyText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const estadoTrabajo = mapOrdenEstadoToOperativo(orden.estado);
  const tonoTrabajo = ESTADO_OPERATIVO_VARIANT[estadoTrabajo];
  const colorTrabajo = institutionalStatusColors(tonoTrabajo);
  const cobro = cobroVisibleOrden(orden);
  const montoOrden = montoConocidoCLP(orden.total);
  const puedeUsarAsistenteIa = puedeUsarAsistenteIaEnOrden({
    esMecanicoEquipo,
    esProveedorDomicilio,
    esMandanteTaller,
    esSupervisor,
    miembroId,
    mecanicoAsignadoId: orden.mecanico_asignado_id,
    puedeServicios: !esSupervisor || puede('servicios'),
  });

  return (
    <View style={styles.container}>
      {/* Header personalizado */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <InstitutionalIcon name="arrow-back" size={24} color={I.ink}  strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              {orden.numero_publico ? `#${orden.numero_publico}` : `Orden #${orden.id}`}
            </Text>
            <Text style={styles.subtitle}>
              {orden.vehiculo_detail.marca} {orden.vehiculo_detail.modelo}
            </Text>
          </View>
          <View style={[styles.estadoBadge, { backgroundColor: colorTrabajo.bg, borderColor: colorTrabajo.border }]}>
            <Text style={[styles.estadoTexto, { color: colorTrabajo.text }]}>{ESTADO_OPERATIVO_LABELS[estadoTrabajo]}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView style={hostScreenStyles.scroll} contentContainerStyle={[hostScreenStyles.scrollInner, styles.scrollInner]} showsVerticalScrollIndicator={false}>
        <EstadoTrabajoCobro
          trabajo={ESTADO_OPERATIVO_LABELS[estadoTrabajo]}
          trabajoTono={ESTADO_OPERATIVO_VARIANT[estadoTrabajo]}
          cobro={cobro}
          monto={montoOrden}
        />
        {/* Información del cliente */}
        <HostPaperSection style={styles.section}>
          <InstitutionalSectionHeader
            title="Información del Cliente"
            level="h4"
            style={styles.sectionHeader}
            leading={<InstitutionalIcon name="person" size={24} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
          />
          <View style={styles.infoRow}>
            <InstitutionalIcon name="person" size={20} color={I.body}  strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.infoText}>
              {datosCliente(orden.cliente_detail).nombre}
            </Text>
          </View>
          <TouchableOpacity style={styles.infoRow} onPress={handleLlamarCliente}>
            <InstitutionalIcon name="phone" size={20} color={I.semanticUp}  strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={[styles.infoText, styles.linkText]}>{datosCliente(orden.cliente_detail).telefono}</Text>
            <InstitutionalIcon name="call" size={16} color={I.semanticUp}  strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
          {datosCliente(orden.cliente_detail).email ? (
            <View style={styles.infoRow}>
              <InstitutionalIcon name="email" size={20} color={I.body}  strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.infoText}>{datosCliente(orden.cliente_detail).email}</Text>
            </View>
          ) : null}
        </HostPaperSection>

        {/* Información del vehículo */}
        <HostPaperSection style={styles.section}>
          <InstitutionalSectionHeader
            title="Vehículo del Cliente"
            level="h4"
            style={styles.sectionHeader}
            leading={<InstitutionalIcon name="directions-car" size={24} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
          />
          <View style={styles.vehicleInfoContainer}>
            <View style={styles.vehicleMainInfo}>
              <Text style={styles.vehicleBrand}>
                {orden.vehiculo_detail.marca} {orden.vehiculo_detail.modelo}
              </Text>
              <Text style={styles.vehicleYear}>Año {orden.vehiculo_detail.año}</Text>
            </View>
            {orden.vehiculo_detail.placa && (
              <View style={styles.plateContainer}>
                <Text style={styles.plateText}>{orden.vehiculo_detail.placa}</Text>
              </View>
            )}
          </View>
          
          {/* Detalles adicionales del vehículo */}
          <View style={styles.vehicleDetails}>
            {orden.vehiculo_detail.color && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Color:</Text>
                <Text style={styles.detailValue}>{orden.vehiculo_detail.color}</Text>
              </View>
            )}
            {orden.vehiculo_detail.numero_motor && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Motor:</Text>
                <Text style={styles.detailValue}>{orden.vehiculo_detail.numero_motor}</Text>
              </View>
            )}
            {orden.vehiculo_detail.numero_chasis && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Chasis:</Text>
                <Text style={styles.detailValue}>{orden.vehiculo_detail.numero_chasis}</Text>
              </View>
            )}
          </View>
        </HostPaperSection>

        {/* Ubicación del servicio */}
        <HostPaperSection style={styles.section}>
          <InstitutionalSectionHeader
            title={orden.tipo_servicio === 'domicilio' ? 'Servicio a Domicilio' : 'Servicio en Taller'}
            level="h4"
            style={styles.sectionHeader}
            leading={<InstitutionalIcon name={orden.tipo_servicio === 'domicilio' ? 'home' : 'business'} size={24} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
          />
          
          {orden.tipo_servicio === 'domicilio' && direccionServicio(orden) ? (
            <TouchableOpacity style={styles.addressContainer} onPress={handleAbrirMapa}>
              <View style={styles.infoRow}>
                <InstitutionalIcon name="location-on" size={20} color={I.semanticDown}  strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={[styles.infoText, styles.linkText]}>{direccionServicio(orden)}</Text>
                <InstitutionalIcon name="open-in-new" size={16} color={I.semanticDown}  strokeWidth={ICON_STROKE_WIDTH} />
              </View>
              <Text style={styles.addressHint}>Toca para abrir en Google Maps</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.infoRow}>
              <InstitutionalIcon name="business" size={20} color={I.body}  strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.infoText}>
                El cliente debe acudir a tu taller
              </Text>
            </View>
          )}
        </HostPaperSection>

        {/* Servicios solicitados */}
        <HostPaperSection style={styles.section}>
          <InstitutionalSectionHeader
            title="Servicios Solicitados"
            level="h4"
            style={styles.sectionHeader}
            leading={<InstitutionalIcon name="build" size={24} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
          />
          {orden.lineas.map((linea, index) => (
            <View key={index} style={styles.servicioItem}>
              <View style={styles.servicioInfo}>
                <Text style={styles.servicioNombre}>{linea.servicio_nombre}</Text>
                <View style={styles.servicioTags}>
                  <View style={[styles.tag, linea.con_repuestos ? styles.tagWithParts : styles.tagLaborOnly]}>
                    <Text style={styles.tagText}>
                      {linea.con_repuestos ? 'Con repuestos' : 'Solo mano de obra'}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={styles.servicioPrecio}>${linea.precio_final}</Text>
            </View>
          ))}
        </HostPaperSection>

        {/* Fecha y hora del servicio */}
        <HostPaperSection style={styles.section}>
          <InstitutionalSectionHeader
            title="Programación del Servicio"
            level="h4"
            style={styles.sectionHeader}
            leading={<InstitutionalIcon name="schedule" size={24} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
          />
          <View style={styles.scheduleContainer}>
            <View style={styles.scheduleItem}>
              <InstitutionalIcon name="event" size={20} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
              <View>
                <Text style={styles.scheduleLabel}>Fecha</Text>
                <Text style={styles.scheduleValue}>
                  {formatearFechaServicioExacta(orden.fecha_servicio)}
                </Text>
              </View>
            </View>
            <View style={styles.scheduleItem}>
              <InstitutionalIcon name="access-time" size={20} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
              <View>
                <Text style={styles.scheduleLabel}>Hora</Text>
                <Text style={styles.scheduleValue}>
                  {ordenesProveedorService.formatearHora(orden.hora_servicio)}
                </Text>
              </View>
            </View>
          </View>
        </HostPaperSection>

        <HostPaperSection style={styles.section}>
          <InstitutionalSectionHeader
            title="Técnico asignado"
            level="h4"
            style={styles.sectionHeader}
            actionLabel={!esMecanicoEquipo ? (orden.mecanico_asignado_id ? 'Reasignar' : 'Asignar') : undefined}
            onActionPress={!esMecanicoEquipo ? () => setAsignarVisible(true) : undefined}
            leading={<InstitutionalIcon name="engineering" size={24} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
          />
          <Text style={styles.infoText}>
            {mecanicoDetalle?.nombre || 'Sin técnico asignado'}
          </Text>
          {mecanicoDetalle?.modalidad ? (
            <Text style={styles.detailValue}>Atiende: {mecanicoDetalle.modalidad}</Text>
          ) : null}
          {mecanicoDetalle?.especialidades ? (
            <Text style={styles.detailValue}>{mecanicoDetalle.especialidades}</Text>
          ) : null}
          {orden.mecanico_asignado_id && (
            <TouchableOpacity
              style={styles.historialButton}
              onPress={() => setHistorialVisible(true)}
            >
              <InstitutionalIcon name="history" size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.historialButtonText}>Ver Historial de Asignaciones</Text>
            </TouchableOpacity>
          )}
        </HostPaperSection>

        {/* Información de pago */}
        <HostPaperSection style={styles.section}>
          <InstitutionalSectionHeader
            title="Información de Pago"
            level="h4"
            style={styles.sectionHeader}
            leading={<InstitutionalIcon name="payment" size={24} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
          />
          {orden.metodo_pago && (
            <View style={styles.infoRow}>
              <InstitutionalIcon name="credit-card" size={20} color={I.body}  strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.infoText}>Método: {orden.metodo_pago}</Text>
            </View>
          )}
        </HostPaperSection>

        {/* Notas */}
        {orden.notas_cliente && (
          <HostPaperSection style={styles.section}>
            <InstitutionalSectionHeader
            title="Notas del Cliente"
            level="h4"
            style={styles.sectionHeader}
            leading={<InstitutionalIcon name="note" size={24} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
          />
            <Text style={styles.notasText}>{orden.notas_cliente}</Text>
          </HostPaperSection>
        )}

        {puedeUsarAsistenteIa ? (
          <AsistenteDiagnosticoCard origen="orden" entityId={orden.id} habilitado />
        ) : null}

        {/* Notas del proveedor */}
        {orden.notas_proveedor && (
          <HostPaperSection style={styles.section}>
            <InstitutionalSectionHeader
            title="Notas del Proveedor"
            level="h4"
            style={styles.sectionHeader}
            leading={<InstitutionalIcon name="note" size={24} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
          />
            <Text style={styles.notasText}>{orden.notas_proveedor}</Text>
          </HostPaperSection>
        )}

        {/* Motivo de rechazo */}
        {orden.motivo_rechazo && (
          <HostPaperSection style={styles.section}>
            <InstitutionalSectionHeader
              title="Motivo de Rechazo"
              level="h4"
              style={styles.sectionHeader}
              leading={<InstitutionalIcon name="error" size={24} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />}
            />
            <Text style={styles.motivoRechazo}>{orden.motivo_rechazo}</Text>
          </HostPaperSection>
        )}
      </ScrollView>

      {/* Botones de acción */}
      {(orden.puede_gestionar || (tieneChecklistDisponible && orden.estado === 'servicio_iniciado')) && (
        <View style={styles.actionsContainer}>
          {!esMecanicoEquipo && orden.estado === 'pendiente_aceptacion_proveedor' && (
            <>
              <InstitutionalButton
                label="Rechazar"
                variant="destructiveOutline"
                onPress={handleRechazar}
                disabled={procesando}
                style={styles.actionButtonFlex}
                leading={<InstitutionalIcon name="close" size={20} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />}
              />
              <InstitutionalButton
                label="Aceptar"
                variant="success"
                onPress={handleAceptar}
                disabled={procesando}
                style={styles.actionButtonFlex}
                leading={<InstitutionalIcon name="check" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />}
              />
            </>
          )}
          {orden.estado === 'aceptada_por_proveedor' && (
            <View style={styles.acceptedStateActions}>
              <View style={styles.nextActionBanner}>
                <InstitutionalIcon name="info" size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <View style={styles.nextActionContent}>
                  <InstitutionalText variant="body-bold" color="primary">
                    Próximos pasos
                  </InstitutionalText>
                  <InstitutionalText variant="caption" color="muted">
                    {!orden.mecanico_asignado 
                      ? 'Asigna un técnico e inicia el servicio'
                      : `Técnico asignado: ${orden.mecanico_asignado.nombre}`
                    }
                  </InstitutionalText>
                </View>
              </View>
              
              {!orden.mecanico_asignado && (
                <InstitutionalButton
                  label="Asignar Técnico"
                  variant="secondary"
                  onPress={() => setModalAsignarTecnico({ tipo: 'orden', ordenId: orden.id, miembroActualId: orden.mecanico_asignado?.id })}
                  style={styles.actionButtonFlex}
                  leading={<InstitutionalIcon name="person" size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />}
                />
              )}
              
              <InstitutionalButton
                label={orden.mecanico_asignado ? "Iniciar Servicio" : "Iniciar sin Técnico Asignado"}
                variant="primary"
                onPress={handleIniciarServicio}
                disabled={procesando}
                style={styles.actionButtonFlex}
                leading={<InstitutionalIcon name="play-arrow" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />}
              />
            </View>
          )}
          {orden.estado === 'en_proceso' && (
            <InstitutionalButton
              label="Completar Servicio"
              variant="success"
              onPress={handleCompletarServicio}
              disabled={procesando}
              style={styles.actionButtonFlex}
              leading={<InstitutionalIcon name="check-circle" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />}
            />
          )}
          
          {/* 🔄 BOTÓN DE CHECKLIST DINÁMICO */}
          {(() => {
            const botonChecklist = getBotonChecklist();
            if (botonChecklist && 
                ['servicio_iniciado', 'checklist_en_progreso', 'checklist_completado', 'completado'].includes(orden.estado)) {
              return (
                <InstitutionalButton
                  testID={botonChecklist.testID || 'checklist-action-button'}
                  label={botonChecklist.texto}
                  variant={
                    botonChecklist.color === I.semanticUp ? 'success'
                      : botonChecklist.disabled ? 'secondary'
                      : 'primary'
                  }
                  onPress={botonChecklist.onPress}
                  disabled={procesando || botonChecklist.disabled}
                  style={styles.actionButtonFlex}
                  leading={
                    <InstitutionalIcon
                      name={botonChecklist.icon as any}
                      size={20}
                      color={botonChecklist.disabled ? I.muted : I.onPrimary}
                      strokeWidth={ICON_STROKE_WIDTH}
                    />
                  }
                />
              );
            }
            return null;
          })()}
        </View>
      )}

      {procesando && (
        <View style={styles.procesandoOverlay}>
          <ActivityIndicator size="large" color={I.onPrimary} />
          <Text style={styles.procesandoText}>Procesando...</Text>
        </View>
      )}
      
      {/* 🔄 MODAL PARA CHECKLIST COMPLETADO */}
      <ChecklistCompletedView
        visible={showCompletedChecklist}
        onClose={() => {
          setShowCompletedChecklist(false);
          setSelectedOrdenIdForChecklist(null);
        }}
        ordenId={selectedOrdenIdForChecklist || 0}
      />

      <AsignarTecnicoBottomSheet
        visible={asignarVisible}
        onClose={() => setAsignarVisible(false)}
        target={
          orden
            ? {
                tipo: 'orden',
                ordenId: orden.id,
                miembroActualId: orden.mecanico_asignado_id,
              }
            : null
        }
        onAsignado={async (mecanicoId?: number) => {
          await cargarOrden();
          
          if (mecanicoId && orden) {
            try {
              const response = await ordenesProveedorService.obtenerConflictosHorario(
                orden.id,
                mecanicoId
              );
              
              if (response.success && response.data && response.data.tiene_conflictos) {
                setConflictosData(response.data);
                setConflictosVisible(true);
              }
            } catch (error) {
              logger.error('Error verificando conflictos:', error);
            }
          }
        }}
      />

      <HistorialAsignacionesModal
        visible={historialVisible}
        ordenId={orden?.id || 0}
        onClose={() => setHistorialVisible(false)}
      />

      <ConflictosHorarioAlert
        visible={conflictosVisible}
        conflictos={conflictosData?.conflictos || []}
        capacidadDisponible={conflictosData?.capacidad_disponible || 0}
        capacidadTotal={conflictosData?.capacidad_total || 0}
        onDismiss={() => {
          setConflictosVisible(false);
          setConflictosData(null);
        }}
        onVerAgenda={() => {
          setConflictosVisible(false);
          setConflictosData(null);
          router.push('/calendario' as any);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  headerSafeArea: {
    backgroundColor: I.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HOST_GUTTER,
    paddingVertical: 16,
    backgroundColor: I.canvas,
    borderBottomWidth: 1,
    borderBottomColor: I.hairline,
  },
  backButton: {
    padding: 8,
  },
  titleContainer: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: I.ink,
  },
  subtitle: {
    fontSize: 14,
    color: I.body,
  },
  estadoBadge: {
    flexShrink: 1,
    maxWidth: '46%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  estadoTexto: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollInner: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: I.body,
    flex: 1,
  },
  linkText: {
    color: I.primary,
    textDecorationLine: 'underline',
  },
  vehicleInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleMainInfo: {
    flex: 1,
  },
  vehicleBrand: {
    fontSize: 16,
    fontWeight: '600',
    color: I.ink,
  },
  vehicleYear: {
    fontSize: 14,
    color: I.body,
    marginTop: 2,
  },
  plateContainer: {
    backgroundColor: I.surfaceSoft,
    borderWidth: 2,
    borderColor: I.ink,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  plateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: I.ink,
    letterSpacing: 1,
  },
  vehicleDetails: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: I.hairline,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: I.body,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: I.ink,
  },
  addressContainer: {
    padding: 8,
    backgroundColor: I.surfaceSoft,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: I.semanticDown,
  },
  addressHint: {
    fontSize: 12,
    color: I.body,
    fontStyle: 'italic',
    marginTop: 4,
    marginLeft: 32,
  },
  servicioItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: I.hairline,
  },
  servicioInfo: {
    flex: 1,
  },
  servicioNombre: {
    fontSize: 14,
    fontWeight: '500',
    color: I.ink,
    marginBottom: 6,
  },
  servicioTags: {
    flexDirection: 'row',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  tagWithParts: {
    backgroundColor: primaryStatus.bg,
  },
  tagLaborOnly: {
    backgroundColor: warningStatus.bg,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: I.ink,
  },
  servicioPrecio: {
    fontSize: 14,
    fontWeight: '600',
    color: I.semanticUp,
  },
  scheduleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  scheduleLabel: {
    fontSize: 12,
    color: I.body,
    fontWeight: '500',
  },
  scheduleValue: {
    fontSize: 14,
    color: I.ink,
    fontWeight: '600',
  },
  totalSection: {
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: I.semanticUp,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: I.ink,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: I.semanticUp,
  },
  notasText: {
    fontSize: 14,
    color: I.body,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  motivoRechazo: {
    fontSize: 14,
    color: I.semanticDown,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: I.canvas,
    borderTopWidth: 1,
    borderTopColor: I.hairline,
  },
  actionButtonFlex: {
    flex: 1,
  },
  acceptedStateActions: {
    gap: 12,
  },
  nextActionBanner: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: withOpacity(I.primary, 0.08),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: withOpacity(I.primary, 0.2),
  },
  nextActionContent: {
    flex: 1,
    gap: 4,
  },
  historialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  historialButtonText: {
    fontSize: 13,
    color: I.primary,
    fontWeight: '500',
  },
  actionButtonLegacy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: I.primary,
  },
  actionButtonLegacyText: {
    color: I.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: I.body,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: I.semanticDown,
    marginBottom: 20,
  },
  procesandoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: withOpacity(I.ink, 0.5),
    justifyContent: 'center',
    alignItems: 'center',
  },
  procesandoText: {
    color: I.onPrimary,
    fontSize: 16,
    marginTop: 12,
  },
}); 