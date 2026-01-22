import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ordenesProveedorService, obtenerNombreSeguro, obtenerTelefonoSeguro, esClienteCompleto, type ClienteCompleto } from '@/services/ordenesProveedor';
import { checklistService, type ChecklistInstance } from '@/services/checklistService';
import { ChecklistContainer } from '@/components/checklist/ChecklistContainer';
import { ChecklistCompletedView } from '@/components/checklist/ChecklistCompletedView';

export default function ServicioDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [orden, setOrden] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  
  // Estados para checklist
  const [checklistInstance, setChecklistInstance] = useState<ChecklistInstance | null>(null);
  const [showChecklistContainer, setShowChecklistContainer] = useState(false);
  const [showCompletedChecklist, setShowCompletedChecklist] = useState(false);

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
        // redirigir a la pantalla de oferta en lugar de mostrar servicio-detalle
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
        
        console.log('📋 lineas_detail completo:', JSON.stringify((ordenData as any).lineas_detail, null, 2));
        if ((ordenData as any).lineas_detail && (ordenData as any).lineas_detail.length > 0) {
          console.log('🔧 Repuestos en primera línea:', JSON.stringify((ordenData as any).lineas_detail[0].oferta_servicio_detail?.repuestos_seleccionados, null, 2));
        }
        
        // Debug: Verificar foto_perfil del cliente
        const clienteDetail = (ordenData as any).cliente_detail;
        console.log('👤 Cliente detail completo:', JSON.stringify(clienteDetail, null, 2));
        console.log('📸 foto_perfil del cliente:', clienteDetail?.foto_perfil);
        console.log('📸 Keys en cliente_detail:', clienteDetail ? Object.keys(clienteDetail) : 'null');
        
        setOrden(ordenData);
        
        // Cargar checklist si la orden lo requiere (solo si NO tiene oferta asociada)
        // ✅ Solo intentar cargar si el estado requiere checklist
        if (estadosConChecklist.includes(ordenData.estado) && 
            (ordenData.tipo_servicio === 'domicilio' || ordenData.tipo_servicio === 'taller')) {
          try {
            const checklistResult = await checklistService.getInstanceByOrder(ordenData.id);
            if (checklistResult.success && checklistResult.data) {
              setChecklistInstance(checklistResult.data);
            } else {
              // ✅ No hay checklist disponible - esto es normal, no es un error
              setChecklistInstance(null);
              console.log('ℹ️ No hay checklist disponible para orden:', ordenData.id);
            }
          } catch (error) {
            // ✅ Manejar error sin mostrar al usuario - simplemente no hay checklist
            console.log('ℹ️ No se encontró checklist para orden:', ordenData.id);
            setChecklistInstance(null);
          }
        }
      } else {
        Alert.alert('Error', response.message || 'No se pudo cargar el servicio');
        router.back();
      }
    } catch (error) {
      console.error('Error inesperado cargando servicio:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatearHora = (hora: string) => {
    return hora.substring(0, 5); // HH:MM
  };

  const handleLlamarCliente = () => {
    const telefono = obtenerTelefonoSeguro(orden?.cliente_detail);
    if (telefono) {
      Linking.openURL(`tel:${telefono}`);
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
      'Aceptar Servicio',
      '¿Estás seguro de que quieres aceptar este servicio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar',
          onPress: async () => {
            try {
              setProcesando(true);
              const response = await ordenesProveedorService.aceptarOrden(orden.id, {});
              
              if (response.success) {
                Alert.alert('Éxito', 'Servicio aceptado correctamente', [
                  {
                    text: 'OK',
                    onPress: () => router.back()
                  }
                ]);
              } else {
                Alert.alert('Error', response.message || 'No se pudo aceptar el servicio');
              }
            } catch (error) {
              console.error('Error inesperado aceptando servicio:', error);
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
      'Rechazar Servicio',
      'Por favor, indica el motivo del rechazo:',
      async (motivo) => {
        if (motivo && motivo.trim()) {
          try {
            setProcesando(true);
            const response = await ordenesProveedorService.rechazarOrden(orden.id, {
              motivo_rechazo: motivo.trim(),
            });
            
            if (response.success) {
              Alert.alert('Servicio rechazado', 'El servicio ha sido rechazado', [
                {
                  text: 'OK',
                  onPress: () => router.back()
                }
              ]);
            } else {
              Alert.alert('Error', response.message || 'No se pudo rechazar el servicio');
            }
          } catch (error) {
            console.error('Error inesperado rechazando servicio:', error);
            Alert.alert('Error', 'Ocurrió un error inesperado');
          } finally {
            setProcesando(false);
          }
        } else {
          Alert.alert('Motivo requerido', 'Debes proporcionar un motivo para el rechazo');
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
              const resultado = await ordenesProveedorService.iniciarServicio(orden.id);
              
              if (resultado.success && resultado.data) {
                // Recargar orden para obtener el estado actualizado
                await cargarOrden();
                
                const responseData = resultado.data as any;
                const tieneChecklist = responseData.checklist_creado || responseData.tiene_checklist;
                const avisoChecklist = responseData.aviso;
                
                if (tieneChecklist) {
                  Alert.alert(
                    'Servicio Iniciado',
                    avisoChecklist || 'El servicio ha sido iniciado. Debe completar el checklist asociado al servicio antes de continuar.',
                    [
                      {
                        text: 'Ver Checklist',
                        onPress: () => {
                          setShowChecklistContainer(true);
                        }
                      },
                      {
                        text: 'Más tarde',
                        style: 'cancel'
                      }
                    ]
                  );
                } else {
                  Alert.alert(
                    'Servicio Iniciado',
                    'El servicio ha sido iniciado exitosamente.'
                  );
                }
              } else {
                Alert.alert('Error', resultado.message || 'No se pudo iniciar el servicio');
              }
            } catch (error) {
              console.error('Error inesperado iniciando servicio:', error);
              Alert.alert('Error', 'Error inesperado al iniciar el servicio');
            } finally {
              setProcesando(false);
            }
          },
        },
      ]
    );
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
              setProcesando(true);
              const resultado = await ordenesProveedorService.finalizarServicio(orden.id);
              
              if (resultado.success) {
                Alert.alert(
                  'Servicio Finalizado',
                  'El servicio ha sido completado exitosamente.',
                  [
                    {
                      text: 'OK',
                      onPress: () => router.back()
                    }
                  ]
                );
              } else {
                Alert.alert('Error', resultado.message || 'No se pudo finalizar el servicio');
              }
            } catch (error) {
              console.error('Error inesperado finalizando servicio:', error);
              Alert.alert('Error', 'Error inesperado al finalizar el servicio');
            } finally {
              setProcesando(false);
            }
          },
        },
      ]
    );
  };

  const handleChecklistComplete = () => {
    Alert.alert(
      'Checklist Completado',
      'El checklist ha sido finalizado exitosamente',
      [
        {
          text: 'OK',
          onPress: () => {
            setShowChecklistContainer(false);
            cargarOrden(); // Recargar para actualizar estados
          },
        },
      ]
    );
  };

  const handleChecklistCancel = () => {
    setShowChecklistContainer(false);
  };

  // Función para determinar qué botón mostrar según el estado
  const getBotonAccion = () => {
    if (!orden) return null;

    // 1. Orden pendiente → Aceptar/Rechazar (ya implementado)
    if (orden.estado === 'pendiente_aceptacion_proveedor') {
      return null; // Ya se maneja en los botones existentes
    }

    // 2. Orden aceptada → Iniciar Servicio
    if (orden.estado === 'aceptada_por_proveedor') {
      return {
        texto: 'Iniciar Servicio',
        color: '#28a745',
        icon: 'play-arrow',
        onPress: handleIniciarServicio
      };
    }

    // 3. Servicio iniciado o checklist en progreso → Botones de checklist
    // ✅ Solo mostrar si realmente hay checklist disponible
    if (orden.estado === 'servicio_iniciado' || orden.estado === 'checklist_en_progreso') {
      // ✅ Si no hay checklistInstance, no mostrar botón (el servicio no tiene checklist configurado)
      if (!checklistInstance) {
        return null; // No mostrar botón si no hay checklist disponible
      }

      if (checklistInstance.estado === 'PENDIENTE') {
        return {
          texto: 'Iniciar Checklist',
          color: '#007bff',
          icon: 'assignment',
          onPress: () => setShowChecklistContainer(true)
        };
      }

      if (checklistInstance.estado === 'EN_PROGRESO') {
        return {
          texto: 'Continuar Checklist',
          color: '#ffc107',
          icon: 'edit',
          onPress: () => setShowChecklistContainer(true)
        };
      }
    }

    // 4. Checklist completado → Finalizar Servicio
    if (orden.estado === 'checklist_completado' || 
        (orden.estado === 'en_proceso' && checklistInstance?.estado === 'COMPLETADO')) {
      return {
        texto: 'Finalizar Servicio',
        color: '#28a745',
        icon: 'done-all',
        onPress: handleFinalizarServicio
      };
    }

    // 5. Servicio completado → Ver Checklist (si existe)
    if (orden.estado === 'completado') {
      if (checklistInstance) {
        return {
          texto: 'Ver Checklist Completado',
          color: '#619FF0',
          icon: 'assignment-turned-in',
          onPress: () => setShowCompletedChecklist(true)
        };
      }
    }

    return null;
  };

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
          <ActivityIndicator size="large" color="#2A4065" />
          <Text style={styles.loadingText}>Cargando servicio...</Text>
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
          <Text style={styles.errorText}>No se pudo cargar el servicio</Text>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.back()}>
            <Text style={styles.actionButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Si está mostrando checklist, renderizar ChecklistContainer
  if (showChecklistContainer && orden) {
    return (
      <ChecklistContainer
        ordenId={orden.id}
        onComplete={handleChecklistComplete}
        onCancel={handleChecklistCancel}
      />
    );
  }

  const botonAccion = getBotonAccion();

  return (
    <View style={styles.container}>
      {/* Header minimalista */}
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#212529" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Detalle de Orden</Text>
            <Text style={styles.subtitle}>Orden #{orden.id}</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
      >
        {/* PRIMERA SECCIÓN: Información del cliente con foto real - Card destacada */}
        <View style={styles.clientCard}>
          <View style={styles.clientSection}>
            {(orden.cliente_detail as any)?.foto_perfil ? (
              <Image 
                source={{ uri: (orden.cliente_detail as any).foto_perfil }} 
                style={styles.clientPhoto}
                onError={(error) => {
                  console.error('❌ Error cargando foto del cliente:', error);
                }}
              />
            ) : (
              <View style={styles.clientPhotoPlaceholder}>
                <MaterialIcons name="person" size={32} color="#6c757d" />
              </View>
            )}
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>
                {obtenerNombreSeguro(orden.cliente_detail)}
              </Text>
              
              {/* Información del cliente según estado de la orden */}
              {orden.estado === 'pendiente_aceptacion_proveedor' ? (
                // Orden pendiente - información puede estar protegida
                <View style={styles.clientDataContainer}>
                  {obtenerTelefonoSeguro(orden.cliente_detail) && (
                    <TouchableOpacity 
                      style={styles.contactRow}
                      onPress={orden.informacion_disponible?.puede_contactar ? handleLlamarCliente : undefined}
                      disabled={!orden.informacion_disponible?.puede_contactar}
                    >
                      <MaterialIcons 
                        name="phone" 
                        size={18} 
                        color={orden.informacion_disponible?.puede_contactar ? "#212529" : "#6c757d"} 
                      />
                      <Text style={[
                        styles.contactText,
                        !orden.informacion_disponible?.puede_contactar && styles.contactTextDisabled
                      ]}>
                        {obtenerTelefonoSeguro(orden.cliente_detail)}
                      </Text>
                      {!orden.informacion_disponible?.puede_contactar && (
                        <MaterialIcons name="lock" size={14} color="#6c757d" />
                      )}
                    </TouchableOpacity>
                  )}
                  {orden.informacion_disponible?.nivel_acceso === 'parcial' && (
                    <View style={styles.infoRestrictionBadge}>
                      <MaterialIcons name="info" size={14} color="#ffc107" />
                      <Text style={styles.infoRestrictionText}>
                        Información completa disponible después de aceptar
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                // Orden aceptada - información completa
                <View style={styles.clientDataContainer}>
                  {obtenerTelefonoSeguro(orden.cliente_detail) && (
                    <TouchableOpacity 
                      style={styles.contactRow}
                      onPress={handleLlamarCliente}
                    >
                      <MaterialIcons name="phone" size={18} color="#212529" />
                      <Text style={styles.contactText}>
                        {obtenerTelefonoSeguro(orden.cliente_detail)}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {esClienteCompleto(orden.cliente_detail) && (orden.cliente_detail as ClienteCompleto).email && (
                    <View style={styles.contactRow}>
                      <MaterialIcons name="email" size={18} color="#212529" />
                      <Text style={styles.contactText}>
                        {(orden.cliente_detail as ClienteCompleto).email}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* SEGUNDA SECCIÓN: Información del vehículo - Card destacada */}
        {orden.vehiculo_detail && (
          <View style={styles.vehicleCard}>
            <Text style={styles.vehicleLabel}>Vehículo</Text>
            <View style={styles.infoCardRow}>
              <MaterialIcons name="directions-car" size={24} color="#212529" />
              <View style={styles.infoCardContent}>
                <Text style={styles.vehicleBrand}>
                  {orden.vehiculo_detail.marca || 'N/A'} {orden.vehiculo_detail.modelo || ''}
                </Text>
                <Text style={styles.vehicleDetails}>
                  {(orden.vehiculo_detail as any).year || orden.vehiculo_detail.año || 'N/A'} • {(orden.vehiculo_detail as any).color || 'Sin color'}
                  {((orden.vehiculo_detail as any).patente || orden.vehiculo_detail.placa) && ` • ${(orden.vehiculo_detail as any).patente || orden.vehiculo_detail.placa}`}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* TERCERA SECCIÓN: Detalle del servicio y repuestos (sin total) */}
        {orden.lineas_detail && orden.lineas_detail.length > 0 && (
          <View style={styles.serviceDetailSection}>
            <Text style={styles.sectionMainTitle}>Detalle del Servicio</Text>
            {orden.lineas_detail.map((linea: any, index: number) => {
              // Obtener repuestos desde lineas_detail (estructura completa)
              // Los repuestos pueden estar en: repuestos_seleccionados, configuracion_repuestos, o repuestos_incluidos
              let repuestos: any[] = [];
              
              // Intentar obtener repuestos desde diferentes ubicaciones
              if (linea.oferta_servicio_detail?.repuestos_seleccionados && Array.isArray(linea.oferta_servicio_detail.repuestos_seleccionados)) {
                repuestos = linea.oferta_servicio_detail.repuestos_seleccionados;
              } else if (linea.configuracion_repuestos && Array.isArray(linea.configuracion_repuestos)) {
                repuestos = linea.configuracion_repuestos;
              } else if (linea.repuestos_incluidos && Array.isArray(linea.repuestos_incluidos)) {
                repuestos = linea.repuestos_incluidos;
              } else if (linea.repuestos_servicio && Array.isArray(linea.repuestos_servicio)) {
                repuestos = linea.repuestos_servicio;
              } else if (linea.repuestos_info && Array.isArray(linea.repuestos_info)) {
                repuestos = linea.repuestos_info;
              }
              
              return (
                <View key={index} style={styles.serviceDetailItem}>
                  <View style={styles.serviceDetailInfo}>
                    <Text style={styles.serviceDetailName}>{linea.servicio_nombre || 'Servicio sin nombre'}</Text>
                    
                    {/* Mostrar repuestos como etiquetas */}
                    {linea.con_repuestos && repuestos.length > 0 ? (
                      <View style={styles.repuestosTagsContainer}>
                        {repuestos.map((repuesto: any, repIndex: number) => {
                          // Intentar obtener el nombre del repuesto desde diferentes estructuras
                          const nombreRepuesto = repuesto.nombre 
                            || repuesto.repuesto_info?.nombre
                            || repuesto.repuesto?.nombre
                            || 'Repuesto';
                          const cantidad = repuesto.cantidad || repuesto.repuesto?.cantidad || 1;
                          
                          return (
                            <View key={repIndex} style={styles.repuestoTag}>
                              <MaterialIcons name="build" size={14} color="#28a745" />
                              <Text style={styles.repuestoTagText}>
                                {nombreRepuesto}
                                {cantidad > 1 ? ` (${cantidad})` : ''}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    ) : linea.con_repuestos ? (
                      <View style={styles.repuestosTagsContainer}>
                        <View style={styles.repuestoTag}>
                          <MaterialIcons name="check-circle" size={14} color="#28a745" />
                          <Text style={styles.repuestoTagText}>Con repuestos</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.repuestosTagsContainer}>
                        <View style={[styles.repuestoTag, styles.repuestoTagDisabled]}>
                          <MaterialIcons name="cancel" size={14} color="#6c757d" />
                          <Text style={[styles.repuestoTagText, styles.repuestoTagTextDisabled]}>Sin repuestos</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Fecha y hora */}
        {orden.fecha_servicio && orden.hora_servicio && (
          <View style={styles.infoCard}>
            <View style={styles.infoCardRow}>
              <MaterialIcons name="calendar-today" size={20} color="#212529" />
              <View style={styles.infoCardContent}>
                <Text style={styles.infoLabel}>Fecha</Text>
                <Text style={styles.infoValue}>
                  {formatearFecha(orden.fecha_servicio)}
                </Text>
              </View>
            </View>
            <View style={[styles.infoCardRow, styles.infoCardRowSecond]}>
              <MaterialIcons name="schedule" size={20} color="#212529" />
              <View style={styles.infoCardContent}>
                <Text style={styles.infoLabel}>Hora</Text>
                <Text style={styles.infoValue}>
                  {formatearHora(orden.hora_servicio)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Ubicación del servicio - SOLO mostrar si la orden está aceptada */}
        {orden.tipo_servicio === 'domicilio' && (
          <View style={styles.infoCard}>
            {orden.estado !== 'pendiente_aceptacion_proveedor' && orden.ubicacion_servicio ? (
              // Orden aceptada - mostrar dirección completa
              <TouchableOpacity 
                style={styles.infoCardRow} 
                onPress={handleAbrirMapa}
              >
                <MaterialIcons name="location-on" size={20} color="#212529" />
                <View style={styles.infoCardContent}>
                  <Text style={styles.infoLabel}>Dirección</Text>
                  <Text style={[styles.infoValue, styles.linkText]}>
                    {orden.ubicacion_servicio}
                  </Text>
                </View>
                <MaterialIcons name="open-in-new" size={16} color="#6c757d" />
              </TouchableOpacity>
            ) : (
              // Orden pendiente - no mostrar dirección (dato sensible)
              <View style={styles.infoCardRow}>
                <MaterialIcons name="location-on" size={20} color="#6c757d" />
                <View style={styles.infoCardContent}>
                  <Text style={styles.infoLabel}>Dirección</Text>
                  <Text style={[styles.infoValue, styles.infoValueDisabled]}>
                    No disponible
                  </Text>
                  <Text style={styles.infoHint}>
                    La dirección se mostrará después de aceptar el servicio
                  </Text>
                </View>
                <MaterialIcons name="lock" size={16} color="#6c757d" />
              </View>
            )}
          </View>
        )}

        {/* Notas */}
        {orden.notas_cliente && (
          <View style={styles.infoCard}>
            <View style={styles.infoCardRow}>
              <MaterialIcons name="note" size={20} color="#212529" />
              <View style={styles.infoCardContent}>
                <Text style={styles.infoLabel}>Notas del Cliente</Text>
                <Text style={styles.notasText}>{orden.notas_cliente}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Total al final - Card destacada con desglose completo */}
        <View style={styles.totalCard}>
          <Text style={styles.totalCardTitle}>Resumen de Precios</Text>
          
          {/* Calcular desglose desde lineas_detail */}
          {(() => {
            // Sumar todos los desgloses de las líneas
            let costoTotalSinIva = 0;
            let ivaTotal = 0;
            let precioFinalCliente = 0;
            let comisionTotal = 0;
            let ivaComisionTotal = 0;
            let gananciaNetaTotal = 0;

            if (orden.lineas_detail && Array.isArray(orden.lineas_detail)) {
              orden.lineas_detail.forEach((linea: any) => {
                const desglose = linea.oferta_servicio_detail?.desglose_precios;
                if (desglose) {
                  costoTotalSinIva += parseFloat(desglose.costo_total_sin_iva || 0);
                  ivaTotal += parseFloat(desglose.iva_19_porciento || 0);
                  precioFinalCliente += parseFloat(desglose.precio_final_cliente || 0);
                  comisionTotal += parseFloat(desglose.comision_mecanmovil_20_porciento || 0);
                  ivaComisionTotal += parseFloat(desglose.iva_sobre_comision || 0);
                  gananciaNetaTotal += parseFloat(desglose.ganancia_neta_proveedor || 0);
                } else {
                  // Si no hay desglose, calcular desde el precio
                  const precioLinea = parseFloat(linea.precio_final || 0);
                  precioFinalCliente += precioLinea;
                  // Calcular aproximado si no hay desglose
                  const costoAprox = precioLinea / 1.19; // Descontar IVA aproximado
                  costoTotalSinIva += costoAprox;
                  ivaTotal += precioLinea - costoAprox;
                  comisionTotal += costoAprox * 0.20;
                  ivaComisionTotal += (costoAprox * 0.20) * 0.19;
                  gananciaNetaTotal += costoAprox - (costoAprox * 0.20);
                }
              });
            }

            return (
              <View style={styles.desgloseContainer}>
                {/* Precio del servicio + IVA */}
                <View style={styles.desgloseRow}>
                  <Text style={styles.desgloseLabel}>Precio del servicio (sin IVA)</Text>
                  <Text style={styles.desgloseValue}>
                    ${Math.round(costoTotalSinIva).toLocaleString('es-CL')}
                  </Text>
                </View>
                <View style={styles.desgloseRow}>
                  <Text style={styles.desgloseLabel}>IVA (19%)</Text>
                  <Text style={styles.desgloseValue}>
                    ${Math.round(ivaTotal).toLocaleString('es-CL')}
                  </Text>
                </View>
                <View style={[styles.desgloseRow, styles.desgloseRowHighlight]}>
                  <Text style={[styles.desgloseLabel, styles.desgloseLabelBold]}>
                    Precio final al cliente
                  </Text>
                  <Text style={[styles.desgloseValue, styles.desgloseValueBold]}>
                    ${Math.round(precioFinalCliente).toLocaleString('es-CL')}
                  </Text>
                </View>

                <View style={styles.desgloseSeparator} />

                {/* Deducciones */}
                <View style={styles.desgloseRow}>
                  <Text style={styles.desgloseLabel}>Comisión MecaniMóvil (20%)</Text>
                  <Text style={[styles.desgloseValue, styles.desgloseValueNegative]}>
                    -${Math.round(comisionTotal).toLocaleString('es-CL')}
                  </Text>
                </View>
                <View style={styles.desgloseRow}>
                  <Text style={styles.desgloseLabel}>IVA sobre comisión</Text>
                  <Text style={[styles.desgloseValue, styles.desgloseValueNegative]}>
                    -${Math.round(ivaComisionTotal).toLocaleString('es-CL')}
                  </Text>
                </View>

                <View style={styles.desgloseSeparator} />

                {/* Ganancia real */}
                <View style={[styles.desgloseRow, styles.desgloseRowFinal]}>
                  <Text style={[styles.desgloseLabel, styles.desgloseLabelBold]}>
                    Ganancia real del proveedor
                  </Text>
                  <Text style={[styles.desgloseValue, styles.desgloseValueFinal]}>
                    ${Math.round(gananciaNetaTotal).toLocaleString('es-CL')}
                  </Text>
                </View>
              </View>
            );
          })()}
        </View>
      </ScrollView>

      {/* Botones de acción */}
      {orden.estado === 'pendiente_aceptacion_proveedor' && (
        <View style={styles.actionsContainer}>
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
        </View>
      )}

      {/* Botón de acción según estado de la orden */}
      {botonAccion && orden.estado !== 'pendiente_aceptacion_proveedor' && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: botonAccion.color }, botonAccion.disabled && styles.actionButtonDisabled]}
            onPress={botonAccion.onPress}
            disabled={procesando || botonAccion.disabled}
          >
            <MaterialIcons name={botonAccion.icon as any} size={20} color="#fff" />
            <Text style={styles.actionButtonText}>{botonAccion.texto}</Text>
          </TouchableOpacity>
        </View>
      )}

      {procesando && (
        <View style={styles.procesandoOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.procesandoText}>Procesando...</Text>
        </View>
      )}

      {/* Modal para checklist completado */}
      <ChecklistCompletedView
        visible={showCompletedChecklist}
        onClose={() => {
          setShowCompletedChecklist(false);
        }}
        ordenId={orden?.id || 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    paddingTop: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
  },
  // Primera sección: Detalle del servicio y repuestos
  serviceDetailSection: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  sectionMainTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
  },
  serviceDetailItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  serviceDetailInfo: {
    flex: 1,
  },
  serviceDetailName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  repuestosTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  repuestoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  repuestoTagDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  repuestoTagText: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: '500',
  },
  repuestoTagTextDisabled: {
    color: '#6c757d',
  },
  // Card destacada del vehículo
  vehicleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  totalPriceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalPriceLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  totalPriceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
  },
  // Card destacada del total
  totalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  totalCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
  },
  desgloseContainer: {
    gap: 12,
  },
  desgloseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  desgloseRowHighlight: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 12,
    marginTop: 4,
  },
  desgloseRowFinal: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 12,
    marginTop: 4,
  },
  desgloseLabel: {
    fontSize: 14,
    color: '#6c757d',
    flex: 1,
  },
  desgloseLabelBold: {
    fontWeight: '600',
    color: '#212529',
  },
  desgloseValue: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '500',
  },
  desgloseValueBold: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#007bff',
  },
  desgloseValueNegative: {
    color: '#dc3545',
  },
  desgloseValueFinal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#28a745',
  },
  desgloseSeparator: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 8,
  },
  // Card destacada del cliente
  clientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  clientSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  clientPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  clientPhotoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 12,
  },
  clientDataContainer: {
    gap: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '500',
    flex: 1,
  },
  contactTextDisabled: {
    color: '#6c757d',
    fontStyle: 'italic',
  },
  infoRestrictionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff3cd',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  infoRestrictionText: {
    fontSize: 12,
    color: '#856404',
    flex: 1,
  },
  // Cards de información minimalistas
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  infoCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoCardRowSecond: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  infoCardContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#212529',
    fontWeight: '500',
  },
  infoValueDisabled: {
    color: '#6c757d',
    fontStyle: 'italic',
  },
  vehicleLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vehicleBrand: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    color: '#6c757d',
  },
  linkText: {
    color: '#212529',
    textDecorationLine: 'underline',
  },
  notasText: {
    fontSize: 14,
    color: '#212529',
    lineHeight: 20,
    marginTop: 4,
  },
  infoHint: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 4,
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
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#28a745',
  },
  rejectButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonDisabled: {
    opacity: 0.6,
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

