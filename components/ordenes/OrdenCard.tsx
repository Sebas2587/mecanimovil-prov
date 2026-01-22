import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { 
  ordenesProveedorService, 
  type Orden, 
  obtenerNombreSeguro, 
  obtenerTelefonoSeguro, 
  puedeContactarCliente,
  esClienteCompleto 
} from '@/services/ordenesProveedor';
import { checklistService, type ChecklistInstance } from '@/services/checklistService';
import { ChecklistCompletedView } from '@/components/checklist/ChecklistCompletedView';
import { ChecklistContainer } from '@/components/checklist/ChecklistContainer';

interface OrdenConChecklist extends Orden {
  checklist_instance?: ChecklistInstance;
  requiere_checklist?: boolean;
}

interface OrdenCardProps {
  orden: Orden;
  onPress: () => void;
  onUpdate?: () => void; // Para recargar datos cuando se actualice el checklist
  showChecklistButtons?: boolean; // 🔄 NUEVA PROP para controlar botones de checklist
}

export const OrdenCard: React.FC<OrdenCardProps> = ({ orden, onPress, onUpdate, showChecklistButtons = true }) => {
  const colorScheme = useColorScheme();
  const [ordenConChecklist, setOrdenConChecklist] = useState<OrdenConChecklist>(orden);
  const [loading, setLoading] = useState(false);
  
  // Estados para modales de checklist
  const [showCompletedChecklist, setShowCompletedChecklist] = useState(false);
  const [showChecklistContainer, setShowChecklistContainer] = useState(false);

  const colorEstado = ordenesProveedorService.obtenerColorEstado(orden.estado);
  const esUrgente = ordenesProveedorService.esOrdenUrgente(orden);
  
  // Verificar información de cliente
  const clienteEsCompleto = esClienteCompleto(orden.cliente_detail);
  const nombreCliente = obtenerNombreSeguro(orden.cliente_detail);
  const telefonoCliente = obtenerTelefonoSeguro(orden.cliente_detail);
  const puedeContactar = puedeContactarCliente(orden);
  const mensajeRestriccion = ordenesProveedorService.obtenerMensajeRestriccion(orden);

  useEffect(() => {
    // Solo cargar checklist si la orden podría tener uno Y si se deben mostrar botones de checklist
    if (showChecklistButtons && puedeRequerirChecklist(orden)) {
      cargarDatosChecklist();
    } else {
      // Para órdenes que nunca requieren checklist o cuando no se deben mostrar botones
      setOrdenConChecklist({
        ...orden,
        requiere_checklist: false,
      });
    }
  }, [orden.id, orden.estado, showChecklistButtons]);

  // Función más conservadora para determinar si una orden puede requerir checklist
  const puedeRequerirChecklist = (orden: Orden): boolean => {
    // Estados que nunca requieren checklist
    const estadosSinChecklist = ['cancelado', 'rechazado_por_proveedor'];
    
    if (estadosSinChecklist.includes(orden.estado)) {
      return false;
    }
    
    // Estados que DEFINITIVAMENTE requieren checklist
    const estadosConChecklistSeguro = [
      'aceptada_por_proveedor', 
      'checklist_en_progreso', 
      'checklist_completado'
    ];
    
    // Estados que PUEDEN tener checklist pero no siempre
    const estadosPosibleChecklist = [
      'en_proceso'
    ];
    
    // Para estados seguros, siempre intentar
    if (estadosConChecklistSeguro.includes(orden.estado)) {
      return true;
    }
    
    // Para estados posibles, ser más conservador
    if (estadosPosibleChecklist.includes(orden.estado)) {
      return true;
    }
    
    // ✅ CORRECCIÓN: Para "completado", SIEMPRE intentar cargar el checklist
    // Si existe, lo mostrará. Si no existe, no mostrará el botón.
    if (orden.estado === 'completado') {
      console.log('📋 Orden completada - Intentando cargar checklist para orden:', orden.id);
      return true; // Siempre intentar para órdenes completadas
    }
    
    return false;
  };

  const cargarDatosChecklist = async () => {
    try {
      setLoading(true);
      console.log('🔍 OrdenCard - Cargando datos checklist para orden:', orden.id, 'estado:', orden.estado);
      
      // Intentar obtener el checklist instance (cache integrado en el servicio)
      const checklistResult = await checklistService.getInstanceByOrder(orden.id);
      console.log('📋 OrdenCard - Resultado checklist para orden', orden.id, ':', checklistResult.success ? 'SUCCESS' : 'FAIL');
      
      // Determinar si requiere checklist
      const tienechecklistInstance = !!(checklistResult.success && checklistResult.data);
      const requiere_checklist = 
        ['aceptada_por_proveedor', 'checklist_en_progreso', 'checklist_completado', 'en_proceso'].includes(orden.estado) ||
        tienechecklistInstance;

      console.log('✅ OrdenCard - Checklist encontrado para orden', orden.id, '- ID:', checklistResult.data?.id, 'Estado:', checklistResult.data?.estado);

      setOrdenConChecklist({
        ...orden,
        checklist_instance: tienechecklistInstance ? checklistResult.data : undefined,
        requiere_checklist,
      });
    } catch (error) {
      console.log('❌ OrdenCard - Error cargando checklist para orden', orden.id, ':', error);
      
      // Para cualquier error, marcar como no requiere checklist
      setOrdenConChecklist({
        ...orden,
        requiere_checklist: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const getChecklistEstado = () => {
    if (!ordenConChecklist.requiere_checklist) {
      return { texto: 'No requiere', color: '#6c757d', icon: 'remove-circle' };
    }
    
    if (!ordenConChecklist.checklist_instance) {
      return { texto: 'Pendiente', color: '#ffc107', icon: 'pending' };
    }
    
    switch (ordenConChecklist.checklist_instance.estado) {
      case 'PENDIENTE':
        return { texto: 'Pendiente', color: '#ffc107', icon: 'pending' };
      case 'EN_PROGRESO':
        return { texto: 'En Progreso', color: '#17a2b8', icon: 'hourglass-empty' };
      case 'COMPLETADO':
        return { texto: 'Completado', color: '#28a745', icon: 'check-circle' };
      default:
        return { texto: 'Desconocido', color: '#6c757d', icon: 'help' };
    }
  };

  const getBotonChecklist = () => {
    console.log('🔍 OrdenCard - getBotonChecklist - Orden:', orden.id, 'Estado orden:', orden.estado, 'Checklist instance:', ordenConChecklist.checklist_instance?.estado);
    
    // Si no se deben mostrar botones de checklist, no devolver ningún botón
    if (!showChecklistButtons) {
      console.log('❌ OrdenCard - No mostrar botones checklist');
      return null;
    }

    // Si tiene un checklist completado, SIEMPRE permitir verlo
    if (ordenConChecklist.checklist_instance && ordenConChecklist.checklist_instance.estado === 'COMPLETADO') {
      console.log('✅ OrdenCard - Botón: Ver Checklist para orden', orden.id);
      return {
        texto: 'Ver Checklist',
        color: '#28a745',
        icon: 'visibility',
        onPress: () => setShowCompletedChecklist(true)
      };
    }

    // Para el resto de casos, verificar que requiera checklist
    if (!ordenConChecklist.requiere_checklist) {
      console.log('⚠️ OrdenCard - No requiere checklist para orden', orden.id);
      return null;
    }

    // Si no tiene instancia o está pendiente
    if (!ordenConChecklist.checklist_instance || ordenConChecklist.checklist_instance.estado === 'PENDIENTE') {
      console.log('✅ OrdenCard - Botón: Iniciar Checklist para orden', orden.id);
      return {
        texto: 'Iniciar Checklist',
        color: '#007bff',
        icon: 'play-arrow',
        onPress: () => setShowChecklistContainer(true)
      };
    }

    // Si está en progreso
    if (ordenConChecklist.checklist_instance.estado === 'EN_PROGRESO') {
      console.log('✅ OrdenCard - Botón: Continuar Checklist para orden', orden.id);
      return {
        texto: 'Continuar Checklist',
        color: '#ffc107',
        icon: 'play-arrow',
        onPress: () => setShowChecklistContainer(true)
      };
    }

    console.log('❌ OrdenCard - No se encontró botón apropiado para orden:', orden.id);
    return null;
  };

  const handleQuickAction = async (action: 'aceptar' | 'rechazar') => {
    if (action === 'aceptar') {
      Alert.alert(
        'Aceptar Orden',
        '¿Estás seguro de que quieres aceptar esta orden?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Aceptar',
            onPress: async () => {
              try {
                await ordenesProveedorService.aceptarOrden(orden.id, {});
                Alert.alert('Éxito', 'Orden aceptada correctamente');
                onUpdate?.();
              } catch (error) {
                Alert.alert('Error', 'No se pudo aceptar la orden');
              }
            },
          },
        ]
      );
    } else {
      Alert.prompt(
        'Rechazar Orden',
        'Por favor, indica el motivo del rechazo:',
        async (motivo) => {
          if (motivo && motivo.trim()) {
            try {
              await ordenesProveedorService.rechazarOrden(orden.id, {
                motivo_rechazo: motivo.trim(),
              });
              Alert.alert('Orden rechazada', 'La orden ha sido rechazada');
              onUpdate?.();
            } catch (error) {
              Alert.alert('Error', 'No se pudo rechazar la orden');
            }
          }
        },
        'plain-text',
        '',
        'default'
      );
    }
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
            cargarDatosChecklist(); // Recargar datos del checklist
            onUpdate?.(); // Notificar al padre para recargar
          },
        },
      ]
    );
  };

  const handleChecklistCancel = () => {
    setShowChecklistContainer(false);
  };

  // Determinar estados visuales
  const estadoChecklist = getChecklistEstado();
  const botonChecklist = getBotonChecklist();
  
  const necesitaChecklistUrgente = (
    orden.estado === 'aceptada_por_proveedor' && 
    (!ordenConChecklist.checklist_instance || ordenConChecklist.checklist_instance.estado === 'PENDIENTE')
  );

  const puedeSerCerrada = (
    orden.estado === 'en_proceso' && 
    ordenConChecklist.checklist_instance && 
    ordenConChecklist.checklist_instance.estado === 'COMPLETADO'
  );

  // Calcular progreso
  let progresoReal = 0;
  if (ordenConChecklist.checklist_instance) {
    if (ordenConChecklist.checklist_instance.progreso_porcentaje > 0) {
      progresoReal = ordenConChecklist.checklist_instance.progreso_porcentaje;
    } else if (ordenConChecklist.checklist_instance.respuestas && ordenConChecklist.checklist_instance.respuestas.length > 0) {
      const totalPreguntas = 4;
      const respuestasCompletadas = ordenConChecklist.checklist_instance.respuestas.filter(r => r.completado).length;
      progresoReal = Math.round((respuestasCompletadas / totalPreguntas) * 100);
    }
  }

  // Si está mostrando checklist, renderizar ChecklistContainer
  if (showChecklistContainer && showChecklistButtons) {
    return (
      <ChecklistContainer
        ordenId={orden.id}
        onComplete={handleChecklistComplete}
        onCancel={handleChecklistCancel}
      />
    );
  }

  return (
    <>
      <TouchableOpacity 
        style={[
          styles.card,
          necesitaChecklistUrgente && styles.cardUrgente,
          puedeSerCerrada && styles.cardCompletable
        ]} 
        onPress={onPress}
      >
        {/* Header con estado y urgencia */}
        <View style={styles.header}>
          <View style={[styles.estadoBadge, { backgroundColor: colorEstado }]}>
            <Text style={styles.estadoTexto}>{orden.estado_display}</Text>
          </View>
          {esUrgente && (
            <View style={styles.urgenteBadge}>
              <IconSymbol name="exclamationmark.triangle.fill" size={12} color="#fff" />
              <Text style={styles.urgenteTexto}>URGENTE</Text>
            </View>
          )}
        </View>

        {/* Información del cliente con protección */}
        <View style={styles.clienteInfo}>
          <IconSymbol name="person.fill" size={16} color="#6c757d" />
          <Text style={styles.clienteNombre}>
            {nombreCliente}
          </Text>
          {!clienteEsCompleto && (
            <View style={styles.protectedBadge}>
              <MaterialIcons name="security" size={12} color="#ffc107" />
            </View>
          )}
          <IconSymbol name="phone.fill" size={14} color="#6c757d" />
          <Text style={[
            styles.clienteTelefono,
            !clienteEsCompleto && styles.protectedText
          ]}>
            {telefonoCliente}
          </Text>
        </View>

        {/* Mensaje de restricción de información */}
        {mensajeRestriccion && (
          <View style={styles.restriccionInfo}>
            <MaterialIcons name="info" size={16} color="#17a2b8" />
            <Text style={styles.restriccionTexto}>{mensajeRestriccion}</Text>
          </View>
        )}

        {/* Información del vehículo */}
        <View style={styles.vehiculoInfo}>
          <IconSymbol name="car.fill" size={16} color="#6c757d" />
          <Text style={styles.vehiculoTexto}>
            {orden.vehiculo_detail.marca} {orden.vehiculo_detail.modelo} ({orden.vehiculo_detail.año})
          </Text>
          {orden.vehiculo_detail.placa && (
            <View style={styles.placaContainer}>
              <Text style={styles.placaTexto}>{orden.vehiculo_detail.placa}</Text>
            </View>
          )}
        </View>

        {/* Ubicación segura */}
        {orden.ubicacion_servicio_segura && (
          <View style={styles.ubicacionInfo}>
            <IconSymbol 
              name={orden.tipo_servicio === 'domicilio' ? 'house.fill' : 'building.2.fill'} 
              size={16} 
              color="#6c757d" 
            />
            <Text style={styles.ubicacionTexto}>
              {orden.ubicacion_servicio_segura}
            </Text>
            {!clienteEsCompleto && orden.tipo_servicio === 'domicilio' && (
              <View style={styles.locationProtectedBadge}>
                <MaterialIcons name="location-off" size={12} color="#dc3545" />
                <Text style={styles.protectedLocationText}>Dirección completa al aceptar</Text>
              </View>
            )}
          </View>
        )}

        {/* Sección de checklist integrada */}
        {showChecklistButtons && (ordenConChecklist.checklist_instance || necesitaChecklistUrgente) && (
          <View style={[
            styles.checklistSection,
            necesitaChecklistUrgente && styles.checklistSectionUrgente,
            ordenConChecklist.checklist_instance?.estado === 'COMPLETADO' && styles.checklistSectionCompletado
          ]}>
            <View style={styles.checklistHeader}>
              <View style={styles.checklistInfo}>
                <MaterialIcons 
                  name={estadoChecklist?.icon as any || 'assignment'} 
                  size={18} 
                  color={estadoChecklist?.color || '#6c757d'} 
                />
                <Text style={[styles.checklistEstadoTexto, { color: estadoChecklist?.color || '#6c757d' }]}>
                  Checklist: {estadoChecklist?.texto || 'Requerido'}
                </Text>
              </View>
              
              {ordenConChecklist.checklist_instance?.estado === 'COMPLETADO' && (
                <View style={styles.checklistCompletedBadge}>
                  <MaterialIcons name="check-circle" size={12} color="#28a745" />
                  <Text style={styles.checklistCompletedText}>✓</Text>
                </View>
              )}
            </View>

            {/* Alerta urgente si necesita checklist */}
            {necesitaChecklistUrgente && (
              <View style={styles.alertaUrgente}>
                <MaterialIcons name="warning" size={14} color="#dc3545" />
                <Text style={styles.alertaUrgenteTexto}>
                  Completar checklist para iniciar servicio
                </Text>
              </View>
            )}

            {/* Progreso del checklist */}
            {ordenConChecklist.checklist_instance && progresoReal > 0 && progresoReal < 100 && (
              <View style={styles.progresoContainer}>
                <View style={styles.progresoHeader}>
                  <Text style={styles.progresoTexto}>Progreso</Text>
                  <Text style={styles.progresoPercentage}>{progresoReal}%</Text>
                </View>
                <View style={styles.progresoBar}>
                  <View 
                    style={[
                      styles.progresoFill, 
                      { width: `${progresoReal}%` }
                    ]} 
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {/* Servicios */}
        <View style={styles.serviciosContainer}>
          <Text style={styles.serviciosLabel}>Servicios:</Text>
          {orden.lineas.slice(0, 2).map((linea, index) => (
            <Text key={index} style={styles.servicioItem}>
              • {linea.servicio_nombre} {linea.con_repuestos ? '(con repuestos)' : '(sin repuestos)'}
            </Text>
          ))}
          {orden.lineas.length > 2 && (
            <Text style={styles.masServicios}>
              +{orden.lineas.length - 2} servicio{orden.lineas.length - 2 > 1 ? 's' : ''} más
            </Text>
          )}
        </View>

        {/* Footer con fecha, hora y total */}
        <View style={styles.footer}>
          <View style={styles.fechaHoraContainer}>
            <IconSymbol name="calendar" size={14} color="#6c757d" />
            <Text style={styles.fechaTexto}>
              {ordenesProveedorService.formatearFecha(orden.fecha_servicio)}
            </Text>
            <IconSymbol name="clock" size={14} color="#6c757d" />
            <Text style={styles.horaTexto}>
              {ordenesProveedorService.formatearHora(orden.hora_servicio)}
            </Text>
          </View>
          <Text style={styles.totalTexto}>${orden.total}</Text>
        </View>

        {/* Botones de acción */}
        <View style={styles.accionesContainer}>
          {/* Botones de aceptar/rechazar para órdenes pendientes */}
          {orden.estado === 'pendiente_aceptacion_proveedor' && orden.puede_gestionar && (
            <View style={styles.botonesQuickAction}>
              <TouchableOpacity
                style={[styles.botonAccion, styles.botonRechazar]}
                onPress={() => handleQuickAction('rechazar')}
              >
                <IconSymbol name="xmark" size={16} color="#fff" />
                <Text style={styles.botonTexto}>Rechazar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.botonAccion, styles.botonAceptar]}
                onPress={() => handleQuickAction('aceptar')}
              >
                <IconSymbol name="checkmark" size={16} color="#fff" />
                <Text style={styles.botonTexto}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Botón de checklist */}
          {showChecklistButtons && botonChecklist && (
            <TouchableOpacity
              style={[
                styles.checklistButton, 
                { backgroundColor: botonChecklist.color },
                botonChecklist.texto === 'Iniciar Checklist' && styles.checklistButtonUrgente
              ]}
              onPress={botonChecklist.onPress}
            >
              <MaterialIcons name={botonChecklist.icon as any} size={16} color="#fff" />
              <Text style={styles.checklistButtonText}>{botonChecklist.texto}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tiempo restante para responder */}
        {orden.tiempo_respuesta_requerido && (
          <View style={styles.tiempoContainer}>
            <IconSymbol name="clock.fill" size={12} color="#dc3545" />
            <Text style={styles.tiempoTexto}>
              {ordenesProveedorService.formatearTiempoRestante(orden.tiempo_respuesta_requerido)}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Modal para checklist completado */}
      <ChecklistCompletedView
        visible={showChecklistButtons && showCompletedChecklist}
        onClose={() => setShowCompletedChecklist(false)}
        ordenId={orden.id}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  urgenteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc3545',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  urgenteTexto: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  clienteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  clienteNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A4065',
    flex: 1,
  },
  clienteTelefono: {
    fontSize: 14,
    color: '#6c757d',
  },
  protectedBadge: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 2,
  },
  protectedText: {
    fontStyle: 'italic',
    color: '#856404',
  },
  restriccionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1ecf1',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    gap: 6,
  },
  restriccionTexto: {
    fontSize: 12,
    color: '#0c5460',
    flex: 1,
  },
  vehiculoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  vehiculoTexto: {
    fontSize: 14,
    color: '#495057',
    flex: 1,
  },
  placaContainer: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#2A4065',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  placaTexto: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2A4065',
  },
  ubicacionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  ubicacionTexto: {
    fontSize: 14,
    color: '#495057',
    flex: 1,
  },
  locationProtectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8d7da',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  protectedLocationText: {
    fontSize: 10,
    color: '#721c24',
  },
  serviciosContainer: {
    marginBottom: 12,
  },
  serviciosLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4,
  },
  servicioItem: {
    fontSize: 13,
    color: '#6c757d',
    marginLeft: 8,
  },
  masServicios: {
    fontSize: 13,
    color: '#007bff',
    fontStyle: 'italic',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  fechaHoraContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fechaTexto: {
    fontSize: 13,
    color: '#6c757d',
  },
  horaTexto: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: '500',
  },
  totalTexto: {
    fontSize: 18,
    fontWeight: '700',
    color: '#28a745',
  },
  accionesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  botonesQuickAction: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  botonAccion: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  botonAceptar: {
    backgroundColor: '#28a745',
  },
  botonRechazar: {
    backgroundColor: '#dc3545',
  },
  botonTexto: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  tiempoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff5f5',
    borderRadius: 6,
    gap: 4,
  },
  tiempoTexto: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '500',
  },
  // Estilos para checklist
  cardUrgente: {
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  cardCompletable: {
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  checklistSection: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  checklistSectionUrgente: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  checklistSectionCompletado: {
    backgroundColor: '#d4edda',
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  checklistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checklistEstadoTexto: {
    fontSize: 13,
    fontWeight: '600',
  },
  checklistCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d4edda',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  checklistCompletedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#155724',
    marginLeft: 4,
  },
  alertaUrgente: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8d7da',
    padding: 6,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  alertaUrgenteTexto: {
    fontSize: 11,
    color: '#721c24',
    marginLeft: 4,
    flex: 1,
  },
  progresoContainer: {
    marginBottom: 6,
  },
  progresoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progresoTexto: {
    fontSize: 11,
    color: '#6c757d',
  },
  progresoPercentage: {
    fontSize: 11,
    fontWeight: '600',
    color: '#495057',
  },
  progresoBar: {
    height: 3,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progresoFill: {
    height: '100%',
    backgroundColor: '#ffc107',
    borderRadius: 2,
  },
  checklistButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    marginTop: 8,
  },
  checklistButtonUrgente: {
    elevation: 2,
    shadowColor: '#dc3545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  checklistButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
}); 