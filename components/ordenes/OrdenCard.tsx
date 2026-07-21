import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  platformShadow,
} from '@/app/design-system/tokens';
import { Card } from '@/app/design-system/components';
import {
  institutionalStatusColors,
  type InstitutionalStatusTone,
} from '@/app/design-system/styles/institutionalSemantic';
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
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;

const neutralStatus = institutionalStatusColors('neutral');
const successStatus = institutionalStatusColors('success');
const warningStatus = institutionalStatusColors('warning');
const errorStatus = institutionalStatusColors('error');
const infoStatus = institutionalStatusColors('info');

interface OrdenConChecklist extends Orden {
  checklist_instance?: ChecklistInstance;
  requiere_checklist?: boolean;
}

interface OrdenCardProps {
  orden: Orden;
  onPress: () => void;
  onUpdate?: () => void; // Para recargar datos cuando se actualice el checklist
  showChecklistButtons?: boolean; // 🔄 NUEVA PROP para controlar botones de checklist
  permitirAceptarRechazar?: boolean;
}

export const OrdenCard: React.FC<OrdenCardProps> = ({
  orden,
  onPress,
  onUpdate,
  showChecklistButtons = true,
  permitirAceptarRechazar = true,
}) => {
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

  const getChecklistEstado = (): {
    texto: string;
    tone: InstitutionalStatusTone;
    icon: string;
  } => {
    if (!ordenConChecklist.requiere_checklist) {
      return { texto: 'No requiere', tone: 'neutral', icon: 'remove-circle' };
    }
    
    if (!ordenConChecklist.checklist_instance) {
      return { texto: 'Pendiente', tone: 'warning', icon: 'pending' };
    }
    
    switch (ordenConChecklist.checklist_instance.estado) {
      case 'PENDIENTE':
        return { texto: 'Pendiente', tone: 'warning', icon: 'pending' };
      case 'EN_PROGRESO':
        return { texto: 'En Progreso', tone: 'info', icon: 'hourglass-empty' };
      case 'COMPLETADO':
        return { texto: 'Completado', tone: 'success', icon: 'check-circle' };
      default:
        return { texto: 'Desconocido', tone: 'neutral', icon: 'help' };
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
        tone: 'success' as InstitutionalStatusTone,
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
        tone: 'primary' as InstitutionalStatusTone,
        icon: 'play-arrow',
        onPress: () => setShowChecklistContainer(true)
      };
    }

    // Si está en progreso
    if (ordenConChecklist.checklist_instance.estado === 'EN_PROGRESO') {
      console.log('✅ OrdenCard - Botón: Continuar Checklist para orden', orden.id);
      return {
        texto: 'Continuar Checklist',
        tone: 'warning' as InstitutionalStatusTone,
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
  const checklistStatusColors = institutionalStatusColors(estadoChecklist.tone);
  
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
      <Card
        onPress={onPress}
        style={[
          styles.card,
          necesitaChecklistUrgente && styles.cardUrgente,
          puedeSerCerrada && styles.cardCompletable,
        ]}
        elevated
      >
        {/* Header con estado y urgencia */}
        <View style={styles.header}>
          <View style={[styles.estadoBadge, { backgroundColor: colorEstado }]}>
            <Text style={styles.estadoTexto}>{orden.estado_display}</Text>
          </View>
          {esUrgente && (
            <View style={styles.urgenteBadge}>
              <IconSymbol name="exclamationmark.triangle.fill" size={12} color={I.onPrimary} />
              <Text style={styles.urgenteTexto}>URGENTE</Text>
            </View>
          )}
        </View>

        {/* Información del cliente con protección */}
        <View style={styles.clienteInfo}>
          <IconSymbol name="person.fill" size={16} color={I.muted} />
          <Text style={styles.clienteNombre}>
            {nombreCliente}
          </Text>
          {!clienteEsCompleto && (
            <View style={styles.protectedBadge}>
              <InstitutionalIcon name="security" size={12} color={I.accentYellow} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
          )}
          <IconSymbol name="phone.fill" size={14} color={I.muted} />
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
            <InstitutionalIcon name="info" size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.restriccionTexto}>{mensajeRestriccion}</Text>
          </View>
        )}

        {/* Información del vehículo */}
        <View style={styles.vehiculoInfo}>
          <IconSymbol name="car.fill" size={16} color={I.muted} />
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
              color={I.muted} 
            />
            <Text style={styles.ubicacionTexto}>
              {orden.ubicacion_servicio_segura}
            </Text>
            {!clienteEsCompleto && orden.tipo_servicio === 'domicilio' && (
              <View style={styles.locationProtectedBadge}>
                <InstitutionalIcon name="location-off" size={12} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
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
                <InstitutionalIcon
                  name={(estadoChecklist?.icon as string) || 'assignment'}
                  size={18}
                  color={checklistStatusColors.icon}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
                <Text style={[styles.checklistEstadoTexto, { color: checklistStatusColors.text }]}>
                  Checklist: {estadoChecklist?.texto || 'Requerido'}
                </Text>
              </View>
              
              {ordenConChecklist.checklist_instance?.estado === 'COMPLETADO' && (
                <View style={styles.checklistCompletedBadge}>
                  <InstitutionalIcon name="check-circle" size={12} color={I.semanticUp} strokeWidth={ICON_STROKE_WIDTH} />
                  <Text style={styles.checklistCompletedText}>✓</Text>
                </View>
              )}
            </View>

            {/* Alerta urgente si necesita checklist */}
            {necesitaChecklistUrgente && (
              <View style={styles.alertaUrgente}>
                <InstitutionalIcon name="warning" size={14} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
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
            <IconSymbol name="calendar" size={14} color={I.muted} />
            <Text style={styles.fechaTexto}>
              {ordenesProveedorService.formatearFecha(orden.fecha_servicio)}
            </Text>
            <IconSymbol name="clock" size={14} color={I.muted} />
            <Text style={styles.horaTexto}>
              {ordenesProveedorService.formatearHora(orden.hora_servicio)}
            </Text>
          </View>
          <Text style={styles.totalTexto}>${orden.total}</Text>
        </View>

        {/* Botones de acción */}
        <View style={styles.accionesContainer}>
          {/* Botones de aceptar/rechazar para órdenes pendientes */}
          {permitirAceptarRechazar && orden.estado === 'pendiente_aceptacion_proveedor' && orden.puede_gestionar && (
            <View style={styles.botonesQuickAction}>
              <TouchableOpacity
                style={[styles.botonAccion, styles.botonRechazar]}
                onPress={() => handleQuickAction('rechazar')}
              >
                <IconSymbol name="xmark" size={16} color={I.onPrimary} />
                <Text style={styles.botonTexto}>Rechazar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.botonAccion, styles.botonAceptar]}
                onPress={() => handleQuickAction('aceptar')}
              >
                <IconSymbol name="checkmark" size={16} color={I.onPrimary} />
                <Text style={styles.botonTexto}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Botón de checklist */}
          {showChecklistButtons && botonChecklist && (
            <TouchableOpacity
              style={[
                styles.checklistButton, 
                { backgroundColor: institutionalStatusColors(botonChecklist.tone).icon },
                botonChecklist.texto === 'Iniciar Checklist' && styles.checklistButtonUrgente
              ]}
              onPress={botonChecklist.onPress}
            >
              <InstitutionalIcon name={botonChecklist.icon as string} size={16} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.checklistButtonText}>{botonChecklist.texto}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tiempo restante para responder */}
        {orden.tiempo_respuesta_requerido && (
          <View style={styles.tiempoContainer}>
            <IconSymbol name="clock.fill" size={12} color={I.semanticDown} />
            <Text style={styles.tiempoTexto}>
              {ordenesProveedorService.formatearTiempoRestante(orden.tiempo_respuesta_requerido)}
            </Text>
          </View>
        )}
      </Card>

      {/* Modal para checklist completado */}
      <ChecklistCompletedView
        visible={showChecklistButtons && showCompletedChecklist}
        onClose={() => setShowCompletedChecklist(false)}
        ordenId={orden.id}
      />
    </>
  );
};

const FS = TYPOGRAPHY.fontSize;

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.fixed.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.fixed.sm,
  },
  estadoBadge: {
    paddingHorizontal: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.xxs,
    borderRadius: SPACING.fixed.sm,
  },
  estadoTexto: {
    color: I.onPrimary,
    fontSize: FS.sm,
    fontWeight: '600',
  },
  urgenteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: I.semanticDown,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: SPACING.fixed.xs,
    gap: SPACING.fixed.xxs,
  },
  urgenteTexto: {
    color: I.onPrimary,
    fontSize: FS.xs,
    fontWeight: '700',
  },
  clienteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.fixed.xs,
    gap: SPACING.fixed.xs,
  },
  clienteNombre: {
    fontSize: FS.lg,
    fontWeight: '600',
    color: I.ink,
    flex: 1,
  },
  clienteTelefono: {
    fontSize: FS.base,
    color: I.muted,
  },
  protectedBadge: {
    backgroundColor: warningStatus.bg,
    borderRadius: SPACING.fixed.xs,
    padding: 2,
  },
  protectedText: {
    fontStyle: 'italic',
    color: warningStatus.text,
  },
  restriccionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: infoStatus.bg,
    padding: SPACING.fixed.xs,
    borderRadius: 6,
    marginBottom: SPACING.fixed.xs,
    gap: 6,
  },
  restriccionTexto: {
    fontSize: FS.sm,
    color: infoStatus.text,
    flex: 1,
  },
  vehiculoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.fixed.sm,
    gap: SPACING.fixed.xs,
  },
  vehiculoTexto: {
    fontSize: FS.base,
    color: I.body,
    flex: 1,
  },
  placaContainer: {
    backgroundColor: I.surfaceStrong,
    borderWidth: 1,
    borderColor: I.primary,
    borderRadius: SPACING.fixed.xxs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  placaTexto: {
    fontSize: FS.sm,
    fontWeight: 'bold',
    color: I.primary,
  },
  ubicacionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.fixed.sm,
    gap: SPACING.fixed.xs,
  },
  ubicacionTexto: {
    fontSize: FS.base,
    color: I.body,
    flex: 1,
  },
  locationProtectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: errorStatus.bg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: SPACING.fixed.xxs,
    gap: SPACING.fixed.xxs,
  },
  protectedLocationText: {
    fontSize: FS.xs,
    color: errorStatus.text,
  },
  serviciosContainer: {
    marginBottom: SPACING.fixed.sm,
  },
  serviciosLabel: {
    fontSize: FS.base,
    fontWeight: '600',
    color: I.body,
    marginBottom: SPACING.fixed.xxs,
  },
  servicioItem: {
    fontSize: FS.md,
    color: I.muted,
    marginLeft: SPACING.fixed.xs,
  },
  masServicios: {
    fontSize: FS.md,
    color: I.primary,
    fontStyle: 'italic',
    marginLeft: SPACING.fixed.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.fixed.sm,
    borderTopWidth: 1,
    borderTopColor: I.hairline,
  },
  fechaHoraContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fechaTexto: {
    fontSize: FS.md,
    color: I.muted,
  },
  horaTexto: {
    fontSize: FS.md,
    color: I.muted,
    fontWeight: '500',
  },
  totalTexto: {
    fontSize: FS.xl,
    fontWeight: '700',
    color: I.semanticUp,
  },
  accionesContainer: {
    flexDirection: 'row',
    gap: SPACING.fixed.xs,
    marginTop: SPACING.fixed.sm,
  },
  botonesQuickAction: {
    flexDirection: 'row',
    gap: SPACING.fixed.xs,
    flex: 1,
  },
  botonAccion: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.fixed.xs,
    borderRadius: SPACING.fixed.xs,
    gap: SPACING.fixed.xxs,
  },
  botonAceptar: {
    backgroundColor: I.semanticUp,
  },
  botonRechazar: {
    backgroundColor: I.semanticDown,
  },
  botonTexto: {
    color: I.onPrimary,
    fontSize: FS.base,
    fontWeight: '600',
  },
  tiempoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.fixed.xs,
    padding: SPACING.fixed.xs,
    backgroundColor: errorStatus.bg,
    borderRadius: 6,
    gap: SPACING.fixed.xxs,
  },
  tiempoTexto: {
    fontSize: FS.sm,
    color: I.semanticDown,
    fontWeight: '500',
  },
  cardUrgente: {
    borderLeftWidth: 4,
    borderLeftColor: I.semanticDown,
  },
  cardCompletable: {
    borderLeftWidth: 4,
    borderLeftColor: I.semanticUp,
  },
  checklistSection: {
    backgroundColor: neutralStatus.bg,
    padding: SPACING.fixed.sm,
    borderRadius: SPACING.fixed.xs,
    marginBottom: SPACING.fixed.sm,
  },
  checklistSectionUrgente: {
    backgroundColor: warningStatus.bg,
    borderWidth: 1,
    borderColor: warningStatus.border,
  },
  checklistSectionCompletado: {
    backgroundColor: successStatus.bg,
    borderWidth: 1,
    borderColor: successStatus.border,
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.fixed.xs,
  },
  checklistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checklistEstadoTexto: {
    fontSize: FS.md,
    fontWeight: '600',
  },
  checklistCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: successStatus.bg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: SPACING.fixed.sm,
  },
  checklistCompletedText: {
    fontSize: FS.xs,
    fontWeight: '600',
    color: successStatus.text,
    marginLeft: SPACING.fixed.xxs,
  },
  alertaUrgente: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: errorStatus.bg,
    padding: 6,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: errorStatus.border,
  },
  alertaUrgenteTexto: {
    fontSize: FS.xs,
    color: errorStatus.text,
    marginLeft: SPACING.fixed.xxs,
    flex: 1,
  },
  progresoContainer: {
    marginBottom: 6,
  },
  progresoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.fixed.xxs,
  },
  progresoTexto: {
    fontSize: FS.xs,
    color: I.muted,
  },
  progresoPercentage: {
    fontSize: FS.xs,
    fontWeight: '600',
    color: I.body,
  },
  progresoBar: {
    height: 3,
    backgroundColor: I.hairline,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progresoFill: {
    height: '100%',
    backgroundColor: I.accentYellow,
    borderRadius: 2,
  },
  checklistButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.fixed.xs,
    borderRadius: SPACING.fixed.xs,
    gap: SPACING.fixed.xxs,
    marginTop: SPACING.fixed.xs,
  },
  checklistButtonUrgente: {
    ...platformShadow({
      shadowColor: I.semanticDown,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    }),
  },
  checklistButtonText: {
    color: I.onPrimary,
    fontSize: FS.md,
    fontWeight: '600',
  },
}); 