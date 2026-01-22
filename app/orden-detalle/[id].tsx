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
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ordenesProveedorService, type Orden } from '@/services/ordenesProveedor';
import { checklistService, type ChecklistInstance } from '@/services/checklistService';
import { ChecklistContainer } from '@/components/checklist/ChecklistContainer';
import { ChecklistCompletedView } from '@/components/checklist/ChecklistCompletedView';

export default function OrdenDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
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
  
  // ✅ Estado para verificar si hay checklist disponible
  const [tieneChecklistDisponible, setTieneChecklistDisponible] = useState<boolean | null>(null);

  useEffect(() => {
    if (id) {
      cargarOrden();
    }
  }, [id]);

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
          console.log('🔄 Redirigiendo a oferta-detalle porque la orden tiene oferta asociada');
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
            const checklistResult = await checklistService.getInstanceByOrder(ordenData.id);
            if (checklistResult.success && checklistResult.data) {
              setTieneChecklistDisponible(true);
            } else {
              // ✅ No hay checklist disponible - esto es normal
              setTieneChecklistDisponible(false);
              console.log('ℹ️ No hay checklist disponible para orden:', ordenData.id);
            }
          } catch (error) {
            // ✅ Manejar error sin mostrar al usuario
            console.log('ℹ️ No se encontró checklist para orden:', ordenData.id);
            setTieneChecklistDisponible(false);
          }
        } else {
          setTieneChecklistDisponible(false);
        }
      } else {
        Alert.alert('Error', response.message || 'No se pudo cargar la orden');
        router.back();
      }
    } catch (error) {
      console.error('Error inesperado cargando orden:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleLlamarCliente = () => {
    if (orden?.cliente_detail.telefono) {
      Linking.openURL(`tel:${orden.cliente_detail.telefono}`);
    }
  };

  const handleAbrirMapa = () => {
    if (orden?.ubicacion_servicio) {
      const address = encodeURIComponent(orden.ubicacion_servicio);
      Linking.openURL(`https://maps.google.com/?q=${address}`);
    }
  };

  const handleAceptar = async () => {
    if (!orden) return;

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
                Alert.alert('Éxito', response.data.message || 'Orden aceptada correctamente');
                await cargarOrden(); // Recargar datos
              } else {
                Alert.alert('Error', response.message || 'No se pudo aceptar la orden');
              }
            } catch (error) {
              console.error('Error inesperado aceptando orden:', error);
              Alert.alert('Error', 'Ocurrió un error inesperado');
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
              Alert.alert('Orden rechazada', response.data.message || 'La orden ha sido rechazada');
              await cargarOrden(); // Recargar datos
            } else {
              Alert.alert('Error', response.message || 'No se pudo rechazar la orden');
            }
          } catch (error) {
            console.error('Error inesperado rechazando orden:', error);
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
    if (!orden) return;

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
              console.log('🚀 Iniciando servicio para orden desde detalle:', orden.id);
              const resultado = await ordenesProveedorService.iniciarServicio(orden.id);
              
              if (resultado.success) {
                // 🔄 INVALIDAR CACHE DEL CHECKLIST PARA ESTA ORDEN
                console.log('♻️ Invalidando cache de checklist para orden desde detalle:', orden.id);
                await checklistService.forceRefreshChecklist(orden.id);
                
                // ⏰ ESPERAR UN MOMENTO PARA QUE EL BACKEND TERMINE DE CREAR EL CHECKLIST
                console.log('⏰ Esperando 2 segundos para que se complete la creación del checklist...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // 🔄 LIMPIAR CACHE COMPLETAMENTE Y RECARGAR
                console.log('🧹 Limpiando cache completo de checklist...');
                await checklistService.clearChecklistCache();
                
                Alert.alert(
                  'Servicio Iniciado', 
                  'El servicio ha sido iniciado. Ahora puedes proceder con el checklist.',
                  [
                    {
                      text: 'OK',
                      onPress: async () => {
                        // Recargar después de que el usuario cierre el alert
                        console.log('🔄 Recargando datos después de iniciar servicio desde detalle...');
                        await cargarOrden();
                      }
                    }
                  ]
                );
              } else {
                Alert.alert('Error', resultado.message || 'No se pudo iniciar el servicio');
              }
            } catch (error) {
              console.error('Error inesperado iniciando servicio desde detalle:', error);
              Alert.alert('Error', 'Error inesperado al iniciar el servicio');
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
                Alert.alert('Servicio completado', response.data.message || 'El servicio ha sido marcado como completado');
                await cargarOrden();
              } else {
                Alert.alert('Error', response.message || 'No se pudo completar el servicio');
              }
            } catch (error) {
              console.error('Error inesperado completando servicio:', error);
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
    console.log('✅ handleChecklistComplete - Cerrando ChecklistContainer desde orden-detalle');
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
    console.log('🚫 handleChecklistCancel - Cerrando ChecklistContainer desde orden-detalle');
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
              console.log('✅ Finalizando servicio para orden desde detalle:', orden.id);
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
              console.error('Error inesperado finalizando servicio desde detalle:', error);
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

    console.log('🔍 [ORDEN-DETALLE] getBotonChecklist - Orden:', orden.id, 'Estado orden:', orden.estado);
    console.log('🔍 [ORDEN-DETALLE] Estados checklist:', { showChecklistContainer, selectedOrdenIdForContainer });
    
    // 1. Orden aceptada por proveedor → Mostrar "Iniciar Servicio"
    if (orden.estado === 'aceptada_por_proveedor') {
      console.log('✅ [ORDEN-DETALLE] Retornando botón Iniciar Servicio');
      return {
        texto: 'Iniciar Servicio',
        color: '#17a2b8',
        icon: 'play-arrow',
        onPress: () => handleIniciarServicio()
      };
    }

    // 2. Servicio iniciado o checklist en progreso → Mostrar botones de checklist
    // ✅ Solo mostrar si realmente hay checklist disponible
    if (orden.estado === 'servicio_iniciado' || orden.estado === 'checklist_en_progreso') {
      // ✅ Verificar si hay checklist disponible antes de mostrar el botón
      if (tieneChecklistDisponible === false) {
        // No hay checklist disponible - no mostrar botón
        console.log('ℹ️ [ORDEN-DETALLE] No hay checklist disponible para orden:', orden.id);
        return null;
      }
      
      // Si aún está verificando (null), mostrar botón deshabilitado temporalmente
      if (tieneChecklistDisponible === null) {
        console.log('⏳ [ORDEN-DETALLE] Verificando checklist para orden:', orden.id);
        return {
          texto: 'Verificando Checklist...',
          color: '#6c757d',
          icon: 'hourglass-empty',
          onPress: () => {},
          disabled: true
        };
      }
      
      // ✅ Hay checklist disponible - mostrar botón
      console.log('✅ [ORDEN-DETALLE] Retornando botón Realizar Checklist');
      return {
        texto: 'Realizar Checklist',
        color: '#007bff',
        icon: 'assignment',
        onPress: () => {
          console.log('🎯 [ORDEN-DETALLE] Presionado Realizar Checklist para orden:', orden.id);
          console.log('🎯 [ORDEN-DETALLE] Activando showChecklistContainer...');
          setSelectedOrdenIdForContainer(orden.id);
          setShowChecklistContainer(true);
          console.log('🎯 [ORDEN-DETALLE] Estados actualizados:', { 
            selectedOrdenIdForContainer: orden.id, 
            showChecklistContainer: true 
          });
        }
      };
    }

    // 3. Checklist completado → Mostrar "Finalizar Servicio"
    if (orden.estado === 'checklist_completado') {
      return {
        texto: 'Finalizar Servicio',
        color: '#28a745',
        icon: 'done-all',
        onPress: () => handleFinalizarServicio()
      };
    }

    // 4. Servicio completado → Mostrar "Ver Checklist"
    if (orden.estado === 'completado') {
      return {
        texto: 'Ver Checklist',
        color: '#6f42c1',
        icon: 'visibility',
        onPress: () => {
          setSelectedOrdenIdForChecklist(orden.id);
          setShowCompletedChecklist(true);
        }
      };
    }

    return null;
  };

  // 🔄 RENDERIZADO CONDICIONAL DE CHECKLIST - IGUAL QUE EN INDEX.TSX
  // Si está mostrando checklist, renderizar ChecklistContainer como pantalla completa
  console.log('🔍 [ORDEN-DETALLE] Verificando renderizado condicional:', {
    showChecklistContainer,
    selectedOrdenIdForContainer,
    shouldRender: showChecklistContainer && selectedOrdenIdForContainer
  });
  
  if (showChecklistContainer && selectedOrdenIdForContainer) {
    console.log('🎯 [ORDEN-DETALLE] ✅ RENDERIZANDO ChecklistContainer como pantalla completa para orden:', selectedOrdenIdForContainer);
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
              <MaterialIcons name="arrow-back" size={24} color="#2A4065" />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Cargando...</Text>
            </View>
            <View style={{ width: 24 }} />
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
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
              <MaterialIcons name="arrow-back" size={24} color="#2A4065" />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Error</Text>
            </View>
            <View style={{ width: 24 }} />
          </View>
        </SafeAreaView>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se pudo cargar la orden</Text>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.back()}>
            <Text style={styles.actionButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const colorEstado = ordenesProveedorService.obtenerColorEstado(orden.estado);

  return (
    <View style={styles.container}>
      {/* Header personalizado */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#2A4065" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              {orden.vehiculo_detail.marca} {orden.vehiculo_detail.modelo}
            </Text>
            <Text style={styles.subtitle}>Orden #{orden.id}</Text>
          </View>
          <View style={[styles.estadoBadge, { backgroundColor: colorEstado }]}>
            <Text style={styles.estadoTexto}>{orden.estado_display}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Información del cliente */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="person" size={24} color="#2A4065" />
            <Text style={styles.sectionTitle}>Información del Cliente</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="person" size={20} color="#6c757d" />
            <Text style={styles.infoText}>
              {orden.cliente_detail.nombre} {orden.cliente_detail.apellido || ''}
            </Text>
          </View>
          <TouchableOpacity style={styles.infoRow} onPress={handleLlamarCliente}>
            <MaterialIcons name="phone" size={20} color="#28a745" />
            <Text style={[styles.infoText, styles.linkText]}>{orden.cliente_detail.telefono}</Text>
            <MaterialIcons name="call" size={16} color="#28a745" />
          </TouchableOpacity>
          {orden.cliente_detail.email && (
            <View style={styles.infoRow}>
              <MaterialIcons name="email" size={20} color="#6c757d" />
              <Text style={styles.infoText}>{orden.cliente_detail.email}</Text>
            </View>
          )}
        </View>

        {/* Información del vehículo */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="directions-car" size={24} color="#2A4065" />
            <Text style={styles.sectionTitle}>Vehículo del Cliente</Text>
          </View>
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
        </View>

        {/* Ubicación del servicio */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons 
              name={orden.tipo_servicio === 'domicilio' ? 'home' : 'business'} 
              size={24} 
              color="#2A4065" 
            />
            <Text style={styles.sectionTitle}>
              {orden.tipo_servicio === 'domicilio' ? 'Servicio a Domicilio' : 'Servicio en Taller'}
            </Text>
          </View>
          
          {orden.tipo_servicio === 'domicilio' && orden.ubicacion_servicio ? (
            <TouchableOpacity style={styles.addressContainer} onPress={handleAbrirMapa}>
              <View style={styles.infoRow}>
                <MaterialIcons name="location-on" size={20} color="#dc3545" />
                <Text style={[styles.infoText, styles.linkText]}>{orden.ubicacion_servicio}</Text>
                <MaterialIcons name="open-in-new" size={16} color="#dc3545" />
              </View>
              <Text style={styles.addressHint}>Toca para abrir en Google Maps</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.infoRow}>
              <MaterialIcons name="business" size={20} color="#6c757d" />
              <Text style={styles.infoText}>
                El cliente debe acudir a tu taller
              </Text>
            </View>
          )}
        </View>

        {/* Servicios solicitados */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="build" size={24} color="#2A4065" />
            <Text style={styles.sectionTitle}>Servicios Solicitados</Text>
          </View>
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
        </View>

        {/* Fecha y hora del servicio */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="schedule" size={24} color="#2A4065" />
            <Text style={styles.sectionTitle}>Programación del Servicio</Text>
          </View>
          <View style={styles.scheduleContainer}>
            <View style={styles.scheduleItem}>
              <MaterialIcons name="event" size={20} color="#007bff" />
              <View>
                <Text style={styles.scheduleLabel}>Fecha</Text>
                <Text style={styles.scheduleValue}>
                  {ordenesProveedorService.formatearFecha(orden.fecha_servicio)}
                </Text>
              </View>
            </View>
            <View style={styles.scheduleItem}>
              <MaterialIcons name="access-time" size={20} color="#007bff" />
              <View>
                <Text style={styles.scheduleLabel}>Hora</Text>
                <Text style={styles.scheduleValue}>
                  {ordenesProveedorService.formatearHora(orden.hora_servicio)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Información de pago */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="payment" size={24} color="#2A4065" />
            <Text style={styles.sectionTitle}>Información de Pago</Text>
          </View>
          {orden.metodo_pago && (
            <View style={styles.infoRow}>
              <MaterialIcons name="credit-card" size={20} color="#6c757d" />
              <Text style={styles.infoText}>Método: {orden.metodo_pago}</Text>
            </View>
          )}
        </View>

        {/* Total */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total a cobrar:</Text>
          <Text style={styles.totalAmount}>${orden.total}</Text>
        </View>

        {/* Notas */}
        {orden.notas_cliente && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="note" size={24} color="#2A4065" />
              <Text style={styles.sectionTitle}>Notas del Cliente</Text>
            </View>
            <Text style={styles.notasText}>{orden.notas_cliente}</Text>
          </View>
        )}

        {/* Notas del proveedor */}
        {orden.notas_proveedor && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="note" size={24} color="#2A4065" />
              <Text style={styles.sectionTitle}>Notas del Proveedor</Text>
            </View>
            <Text style={styles.notasText}>{orden.notas_proveedor}</Text>
          </View>
        )}

        {/* Motivo de rechazo */}
        {orden.motivo_rechazo && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="error" size={24} color="#dc3545" />
              <Text style={[styles.sectionTitle, { color: '#dc3545' }]}>Motivo de Rechazo</Text>
            </View>
            <Text style={styles.motivoRechazo}>{orden.motivo_rechazo}</Text>
          </View>
        )}
      </ScrollView>

      {/* Botones de acción */}
      {orden.puede_gestionar && (
        <View style={styles.actionsContainer}>
          {orden.estado === 'pendiente_aceptacion_proveedor' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={handleRechazar}
                disabled={procesando}
              >
                <MaterialIcons name="close" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Rechazar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={handleAceptar}
                disabled={procesando}
              >
                <MaterialIcons name="check" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Aceptar</Text>
              </TouchableOpacity>
            </>
          )}
          {orden.estado === 'aceptada_por_proveedor' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton]}
              onPress={handleIniciarServicio}
              disabled={procesando}
            >
              <MaterialIcons name="play-arrow" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Iniciar Servicio</Text>
            </TouchableOpacity>
          )}
          {orden.estado === 'en_proceso' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={handleCompletarServicio}
              disabled={procesando}
            >
              <MaterialIcons name="check-circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Completar Servicio</Text>
            </TouchableOpacity>
          )}
          
          {/* 🔄 BOTÓN DE CHECKLIST DINÁMICO */}
          {(() => {
            const botonChecklist = getBotonChecklist();
            if (botonChecklist && 
                ['servicio_iniciado', 'checklist_en_progreso', 'checklist_completado', 'completado'].includes(orden.estado)) {
              return (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: botonChecklist.color }]}
                  onPress={botonChecklist.onPress}
                  disabled={procesando}
                >
                  <MaterialIcons name={botonChecklist.icon as any} size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>{botonChecklist.texto}</Text>
                </TouchableOpacity>
              );
            }
            return null;
          })()}
        </View>
      )}

      {procesando && (
        <View style={styles.procesandoOverlay}>
          <ActivityIndicator size="large" color="#fff" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerSafeArea: {
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 8,
  },
  titleContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2A4065',
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoTexto: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A4065',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#495057',
    flex: 1,
  },
  linkText: {
    color: '#007bff',
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
    color: '#2A4065',
  },
  vehicleYear: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  plateContainer: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#2A4065',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  plateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2A4065',
    letterSpacing: 1,
  },
  vehicleDetails: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#495057',
  },
  addressContainer: {
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  addressHint: {
    fontSize: 12,
    color: '#6c757d',
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
    borderBottomColor: '#e9ecef',
  },
  servicioInfo: {
    flex: 1,
  },
  servicioNombre: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
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
    backgroundColor: '#e7f3ff',
  },
  tagLaborOnly: {
    backgroundColor: '#fff3cd',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#495057',
  },
  servicioPrecio: {
    fontSize: 14,
    fontWeight: '600',
    color: '#28a745',
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
    color: '#6c757d',
    fontWeight: '500',
  },
  scheduleValue: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '600',
  },
  totalSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28a745',
  },
  notasText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  motivoRechazo: {
    fontSize: 14,
    color: '#dc3545',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#28a745',
  },
  rejectButton: {
    backgroundColor: '#dc3545',
  },
  startButton: {
    backgroundColor: '#007bff',
  },
  completeButton: {
    backgroundColor: '#6f42c1',
  },
  actionButtonText: {
    color: '#ffffff',
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
    color: '#6c757d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    marginBottom: 20,
  },
  procesandoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  procesandoText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 12,
  },
}); 