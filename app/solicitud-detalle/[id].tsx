import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';
import solicitudesService, { type SolicitudPublica, type OfertaProveedor, type MotivoRechazo } from '@/services/solicitudesService';
import { RechazarSolicitudModal } from '@/components/solicitudes/RechazarSolicitudModal';

export default function SolicitudDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  // Obtener valores del sistema de diseño
  const safeColors = useMemo(() => {
    return theme?.colors || COLORS || {};
  }, [theme]);
  
  const safeSpacing = useMemo(() => {
    return theme?.spacing || SPACING || {};
  }, [theme]);
  
  const safeTypography = useMemo(() => {
    return theme?.typography || TYPOGRAPHY || {};
  }, [theme]);
  
  const safeShadows = useMemo(() => {
    return theme?.shadows || SHADOWS || {};
  }, [theme]);
  
  const safeBorders = useMemo(() => {
    return theme?.borders || BORDERS || {};
  }, [theme]);
  
  // Colores seguros con fallbacks
  const primaryObj = safeColors?.primary as any;
  const accentObj = safeColors?.accent as any;
  const successObj = safeColors?.success as any;
  const warningObj = safeColors?.warning as any;
  const infoObj = safeColors?.info as any;
  const errorObj = safeColors?.error as any;
  const neutralGrayObj = safeColors?.neutral?.gray as any;
  
  const primary500 = primaryObj?.['500'] || '#4E4FEB';
  const accent500 = accentObj?.['500'] || '#FF6B00';
  const success500 = successObj?.main || successObj?.['500'] || '#3DB6B1';
  const warningColor = warningObj?.main || warningObj?.['500'] || '#FFB84D';
  const infoColor = infoObj?.main || infoObj?.['500'] || '#068FFF';
  const errorColor = errorObj?.main || errorObj?.['500'] || '#FF5555';
  
  const bgPaper = safeColors?.background?.paper || COLORS?.base?.white || '#FFFFFF';
  const bgDefault = safeColors?.background?.default || '#EEEEEE';
  const textPrimary = safeColors?.text?.primary || COLORS?.neutral?.inkBlack || '#000000';
  const textSecondary = safeColors?.text?.secondary || neutralGrayObj?.[700] || '#666666';
  const textTertiary = safeColors?.text?.tertiary || neutralGrayObj?.[700] || '#666666';
  const borderLight = safeColors?.border?.light || neutralGrayObj?.[200] || '#EEEEEE';
  const borderMain = safeColors?.border?.main || neutralGrayObj?.[300] || '#D0D0D0';

  const [solicitud, setSolicitud] = useState<SolicitudPublica | null>(null);
  const [miOferta, setMiOferta] = useState<OfertaProveedor | null>(null);
  const [ofertasSecundarias, setOfertasSecundarias] = useState<OfertaProveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarModalRechazo, setMostrarModalRechazo] = useState(false);
  const [rechazando, setRechazando] = useState(false);

  useEffect(() => {
    if (id) {
      cargarDatos();
    }
  }, [id]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const result = await solicitudesService.obtenerDetalleSolicitud(id);
      
      if (result.success && result.data) {
        setSolicitud(result.data);
        
        // Buscar si el proveedor ya tiene una oferta
        if (result.data.ofertas && result.data.ofertas.length > 0) {
          const misOfertas = await solicitudesService.obtenerMisOfertas();
          if (misOfertas.success && misOfertas.data) {
            const ofertaEnSolicitud = misOfertas.data.find(
              o => o.solicitud === id && !o.es_oferta_secundaria
            );
            if (ofertaEnSolicitud) {
              setMiOferta(ofertaEnSolicitud);
              
              // Cargar ofertas secundarias si la oferta está aceptada y pagada
              if (ofertaEnSolicitud.estado === 'aceptada' || ofertaEnSolicitud.estado === 'pagada') {
                const ofertasSecResult = await solicitudesService.obtenerOfertasSecundarias(ofertaEnSolicitud.id);
                if (ofertasSecResult.success && ofertasSecResult.data) {
                  setOfertasSecundarias(ofertasSecResult.data);
                }
              }
            }
          }
        }
        
        // También cargar ofertas secundarias desde la solicitud si vienen
        if (result.data.ofertas_secundarias && result.data.ofertas_secundarias.length > 0) {
          setOfertasSecundarias(result.data.ofertas_secundarias);
        }
      } else {
        Alert.alert('Error', result.error || 'No se pudo cargar la solicitud');
        router.back();
      }
    } catch (error) {
      console.error('Error cargando detalle de solicitud:', error);
      Alert.alert('Error', 'No se pudo cargar la solicitud');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatearHora = (hora: string | null) => {
    if (!hora) return 'No especificada';
    return hora.substring(0, 5);
  };

  // Función para determinar si un servicio es de diagnóstico
  const esServicioDiagnostico = (nombreServicio: string): boolean => {
    const nombreLower = nombreServicio.toLowerCase();
    const palabrasDiagnostico = [
      'diagnostico', 'diagnóstico', 'revision', 'revisión', 
      'inspeccion', 'inspección', 'evaluacion', 'evaluación',
      'scanner', 'computadora', 'obd'
    ];
    return palabrasDiagnostico.some(palabra => nombreLower.includes(palabra));
  };

  // Determinar si la solicitud realmente requiere repuestos
  // Considera: campo requiere_repuestos Y si todos los servicios son de diagnóstico
  const determinarRequiereRepuestos = (): boolean => {
    // Si explícitamente es false, no requiere
    if (solicitud.requiere_repuestos === false) {
      return false;
    }
    
    // Verificar si todos los servicios son de diagnóstico
    // Si todos son diagnóstico, NO requiere repuestos (incluso si el campo es true)
    // Esto es porque el backend tiene default=True, pero servicios de diagnóstico no requieren repuestos
    if (solicitud.servicios_solicitados_detail && solicitud.servicios_solicitados_detail.length > 0) {
      const todosSonDiagnostico = solicitud.servicios_solicitados_detail.every(
        servicio => esServicioDiagnostico(servicio.nombre)
      );
      
      // Si todos son diagnóstico, no requiere repuestos (independientemente del campo)
      if (todosSonDiagnostico) {
        return false;
      }
    }
    
    // Si explícitamente es true Y no todos son diagnóstico, requiere
    if (solicitud.requiere_repuestos === true) {
      return true;
    }
    
    // Si es undefined/null y no todos son diagnóstico, asumir que no requiere
    // (más seguro que asumir que requiere, especialmente para casos donde no se seleccionó opción)
    return false;
  };

  const handleRechazar = async (motivo: MotivoRechazo, detalle: string) => {
    try {
      setRechazando(true);
      const result = await solicitudesService.rechazarSolicitud(id, motivo, detalle);
      
      if (result.success) {
        Alert.alert(
          'Solicitud Rechazada',
          'La solicitud ha sido rechazada exitosamente. El cliente será notificado.',
          [
            {
              text: 'OK',
              onPress: () => {
                setMostrarModalRechazo(false);
                router.back();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'No se pudo rechazar la solicitud');
      }
    } catch (error) {
      console.error('Error rechazando solicitud:', error);
      Alert.alert('Error', 'Ocurrió un error al rechazar la solicitud');
    } finally {
      setRechazando(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bgPaper }]}>
        <Stack.Screen
          options={{
            title: 'Detalle de Solicitud',
            headerStyle: { backgroundColor: bgPaper },
            headerTintColor: textPrimary,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primary500} />
          <Text style={[styles.loadingText, { color: textPrimary }]}>
            Cargando...
          </Text>
        </View>
      </View>
    );
  }

  if (!solicitud) {
    return (
      <View style={[styles.container, { backgroundColor: bgPaper }]}>
        <Stack.Screen
          options={{
            title: 'Detalle de Solicitud',
            headerStyle: { backgroundColor: bgPaper },
            headerTintColor: textPrimary,
          }}
        />
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: textPrimary }]}>
            Solicitud no encontrada
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgDefault }]}>
      <Stack.Screen
        options={{
          title: 'Detalle de Solicitud',
          headerStyle: { backgroundColor: bgPaper },
          headerTintColor: textPrimary,
        }}
      />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 75 + (insets.bottom || 16) } // Espacio para botones + área segura inferior
        ]}
      >
        {/* Badges de urgencia, repuestos y duración */}
        <View style={styles.badgesContainer}>
          <View style={[
            styles.urgenciaBadge, 
            solicitud.urgencia === 'urgente' 
              ? { backgroundColor: errorColor } 
              : { backgroundColor: neutralGrayObj?.[200] || '#E5E5E5' }
          ]}>
            <MaterialIcons 
              name={solicitud.urgencia === 'urgente' ? 'priority-high' : 'schedule'} 
              size={16} 
              color={solicitud.urgencia === 'urgente' ? '#FFFFFF' : textSecondary} 
            />
            <Text style={[
              styles.urgenciaText,
              { color: solicitud.urgencia === 'urgente' ? '#FFFFFF' : textSecondary }
            ]}>
              {solicitud.urgencia === 'urgente' ? 'URGENTE' : 'NORMAL'}
            </Text>
          </View>
          
          {/* Badge de repuestos */}
          {(() => {
            // Determinar si requiere repuestos usando la función que considera servicios de diagnóstico
            const requiereRepuestos = determinarRequiereRepuestos();
            
            return (
              <View style={[
                styles.repuestosBadge,
                requiereRepuestos
                  ? { backgroundColor: infoObj?.light || infoObj?.['50'] || '#E6F5FF' }
                  : { backgroundColor: warningColor }
              ]}>
                <MaterialIcons 
                  name={requiereRepuestos ? 'build' : 'build-circle'} 
                  size={16} 
                  color={requiereRepuestos ? infoColor : '#FFFFFF'} 
                />
                <Text style={[
                  styles.repuestosText,
                  { color: requiereRepuestos ? infoColor : '#FFFFFF' }
                ]}>
                  {requiereRepuestos ? 'CON REPUESTOS' : 'SIN REPUESTOS'}
                </Text>
              </View>
            );
          })()}
          
          {solicitud.tiempo_restante && (
            <View style={[styles.tiempoBadge, { backgroundColor: neutralGrayObj?.[200] || '#E5E5E5' }]}>
              <MaterialIcons name="access-time" size={16} color={textSecondary} />
              <Text style={[styles.tiempoText, { color: textSecondary }]}>{solicitud.tiempo_restante}</Text>
            </View>
          )}
        </View>

        {/* SECCIÓN 1: INFORMACIÓN DEL CLIENTE */}
        <View style={styles.section}>
          {/*<Text style={styles.sectionTitle}>Cliente</Text>*/}
          
          {/* Información del usuario */}
          <View style={styles.clienteContainer}>
            <View style={[styles.clienteAvatar, { backgroundColor: neutralGrayObj?.[100] || '#F5F5F5' }]}>
              {solicitud.cliente_info?.foto_perfil ? (
                <Image 
                  source={{ uri: solicitud.cliente_info.foto_perfil }} 
                  style={styles.avatarImage}
                />
              ) : (
                <MaterialIcons name="person" size={40} color={textTertiary} />
              )}
            </View>
            <Text style={[styles.clienteNombre, { color: textPrimary }]}>
              {solicitud.cliente_info?.nombre || solicitud.cliente_nombre || 'Cliente'}
            </Text>
          </View>

          {/* Card del vehículo */}
          <View style={[styles.vehiculoCard, { 
            backgroundColor: neutralGrayObj?.[50] || '#F9F9F9',
            borderColor: borderLight 
          }]}>
            <View style={styles.vehiculoHeader}>
              <MaterialIcons name="directions-car" size={24} color={primary500} />
              <Text style={[styles.vehiculoTitle, { color: textPrimary }]}>Vehículo</Text>
            </View>
            
            {/* Marca, Modelo y Patente destacados */}
            <View style={styles.vehiculoMarcaModelo}>
              <View style={styles.vehiculoMarcaModeloContainer}>
                <Text style={[styles.vehiculoMarcaModeloText, { color: textPrimary }]}>
                  {solicitud.vehiculo_info.marca} {solicitud.vehiculo_info.modelo}
                </Text>
                {solicitud.vehiculo_info.patente && (
                  <View style={[styles.vehiculoPatenteInline, { 
                    backgroundColor: infoObj?.light || infoObj?.['50'] || '#E6F5FF',
                    borderColor: infoColor 
                  }]}>
                    <MaterialIcons name="badge" size={14} color={infoColor} />
                    <Text style={[styles.vehiculoPatenteInlineText, { color: infoColor }]}>
                      {solicitud.vehiculo_info.patente}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Grid de 2 columnas: Primera fila - Año y Kilometraje */}
            <View style={styles.vehiculoGrid}>
              {/* Columna 1: Año */}
              <View style={[styles.vehiculoGridItem, { 
                backgroundColor: bgPaper,
                borderColor: borderLight 
              }]}>
                <View style={styles.vehiculoGridItemHeader}>
                  <MaterialIcons name="calendar-today" size={18} color={infoColor} />
                  <Text style={[styles.vehiculoGridItemLabel, { color: textSecondary }]}>Año</Text>
                </View>
                <Text style={[styles.vehiculoGridItemValue, { color: textPrimary }]}>
                  {solicitud.vehiculo_info.año || solicitud.vehiculo_info.anio || 'N/A'}
                </Text>
              </View>

              {/* Columna 2: Kilometraje */}
              <View style={[styles.vehiculoGridItem, { 
                backgroundColor: bgPaper,
                borderColor: borderLight 
              }]}>
                <View style={styles.vehiculoGridItemHeader}>
                  <MaterialIcons name="speed" size={18} color={primary500} />
                  <Text style={[styles.vehiculoGridItemLabel, { color: textSecondary }]}>Kilometraje</Text>
                </View>
                <Text style={[styles.vehiculoGridItemValue, { color: textPrimary }]}>
                  {solicitud.vehiculo_info.kilometraje 
                    ? `${solicitud.vehiculo_info.kilometraje.toLocaleString('es-CL')} km`
                    : 'N/A'}
                </Text>
              </View>
            </View>

            {/* Grid de 2 columnas: Segunda fila - Tipo de Motor y Cilindraje */}
            <View style={styles.vehiculoGrid}>
              {/* Columna 1: Tipo de Motor */}
              <View style={[styles.vehiculoGridItem, { 
                backgroundColor: bgPaper,
                borderColor: borderLight 
              }]}>
                <View style={styles.vehiculoGridItemHeader}>
                  <MaterialIcons name="settings" size={18} color={success500} />
                  <Text style={[styles.vehiculoGridItemLabel, { color: textSecondary }]}>Motor</Text>
                </View>
                <Text style={[styles.vehiculoGridItemValue, { color: textPrimary }]}>
                  {solicitud.vehiculo_info.tipo_motor || 'N/A'}
                </Text>
              </View>

              {/* Columna 2: Cilindraje */}
              <View style={[styles.vehiculoGridItem, { 
                backgroundColor: bgPaper,
                borderColor: borderLight 
              }]}>
                <View style={styles.vehiculoGridItemHeader}>
                  <MaterialIcons name="tune" size={18} color={warningColor} />
                  <Text style={[styles.vehiculoGridItemLabel, { color: textSecondary }]}>Cilindraje</Text>
                </View>
                <Text style={[styles.vehiculoGridItemValue, { color: textPrimary }]}>
                  {solicitud.vehiculo_info.cilindraje || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* SECCIÓN 2: SERVICIO Y DESCRIPCIÓN */}
        <View style={styles.section}>
          {/* Card de Servicios Solicitados */}
          <View style={[styles.serviciosCard, { 
            backgroundColor: neutralGrayObj?.[50] || '#F9F9F9',
            borderColor: borderLight 
          }]}>
            <View style={styles.serviciosCardHeader}>
              <MaterialIcons name="build-circle" size={24} color={primary500} />
              <Text style={[styles.serviciosCardTitle, { color: textPrimary }]}>Servicios Solicitados</Text>
            </View>

            {/* Servicios en grid */}
            {solicitud.servicios_solicitados_detail && solicitud.servicios_solicitados_detail.length > 0 ? (
              <View style={styles.serviciosGrid}>
                {solicitud.servicios_solicitados_detail.map((servicio, index) => (
                  <View key={servicio.id || index} style={[styles.servicioCard, { 
                    backgroundColor: bgPaper,
                    borderColor: borderLight 
                  }]}>
                    <View style={styles.servicioCardHeader}>
                      <MaterialIcons name="build" size={20} color={primary500} />
                    </View>
                    <Text style={[styles.servicioCardNombre, { color: textPrimary }]} numberOfLines={2}>
                      {servicio.nombre}
                    </Text>
                    <Text style={[styles.servicioCardCategoria, { color: textSecondary }]} numberOfLines={1}>
                      {servicio.categoria || 'Sin categoría'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.serviciosEmpty}>
                <Text style={[styles.serviciosEmptyText, { color: textSecondary }]}>
                  No hay servicios especificados
                </Text>
              </View>
            )}

            {/* Descripción del problema */}
            <View style={[styles.descripcionCard, { 
              backgroundColor: infoObj?.light || infoObj?.['50'] || '#E6F5FF',
              borderColor: infoColor 
            }]}>
              <View style={styles.descripcionCardHeader}>
                <MaterialIcons name="description" size={18} color={infoColor} />
                <Text style={[styles.descripcionCardLabel, { color: infoColor }]}>Descripción del Problema</Text>
              </View>
              <Text style={[styles.descripcionCardTexto, { color: textPrimary }]}>
                {solicitud.descripcion_problema}
              </Text>
            </View>
          </View>
        </View>

        {/* SECCIÓN 3: FECHA Y HORA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fecha y Hora Preferida</Text>
          
          <View style={styles.fechaHoraContainer}>
            <View style={styles.fechaHoraItem}>
              <MaterialIcons name="calendar-today" size={20} color={primary500} />
              <View style={styles.fechaHoraTextos}>
                <Text style={[styles.fechaHoraLabel, { color: textSecondary }]}>Fecha</Text>
                <Text style={[styles.fechaHoraValue, { color: textPrimary }]}>{formatearFecha(solicitud.fecha_preferida)}</Text>
              </View>
            </View>
            
            <View style={[styles.fechaHoraDivider, { backgroundColor: borderLight }]} />
            
            <View style={styles.fechaHoraItem}>
              <MaterialIcons name="access-time" size={20} color={primary500} />
              <View style={styles.fechaHoraTextos}>
                <Text style={[styles.fechaHoraLabel, { color: textSecondary }]}>Hora</Text>
                <Text style={[styles.fechaHoraValue, { color: textPrimary }]}>{formatearHora(solicitud.hora_preferida)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* SECCIÓN 4: UBICACIÓN */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ubicación del Servicio</Text>
          
          <View style={styles.ubicacionContainer}>
            <MaterialIcons name="location-on" size={24} color={errorColor} />
            <View style={styles.ubicacionTextos}>
              <Text style={[styles.ubicacionDireccion, { color: textPrimary }]}>{solicitud.direccion_servicio_texto}</Text>
              {solicitud.detalles_ubicacion && (
                <Text style={[styles.ubicacionDetalles, { color: textSecondary }]}>{solicitud.detalles_ubicacion}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Estado de mi oferta */}
        {miOferta && (
          <View style={styles.section}>
            <View style={[styles.ofertaStatusCard, { 
              backgroundColor: primaryObj?.['50'] || primaryObj?.['100'] || '#F0F0FF' 
            }]}>
              <View style={styles.ofertaStatusHeader}>
                <MaterialIcons name="local-offer" size={24} color={primary500} />
                <Text style={[styles.ofertaStatusTitle, { color: textPrimary }]}>
                  Mi Oferta
                </Text>
              </View>
              <Text style={[styles.ofertaStatusTexto, { color: textPrimary }]}>
                Estado: {miOferta.estado === 'enviada' ? 'Enviada' : 
                         miOferta.estado === 'vista' ? 'Vista por Cliente' :
                         miOferta.estado === 'aceptada' ? 'Aceptada' :
                         miOferta.estado === 'pagada' ? 'Pagada' :
                         miOferta.estado === 'rechazada' ? 'Rechazada' : miOferta.estado}
              </Text>
              <Text style={[styles.ofertaPrecio, { color: primary500 }]}>
                ${parseFloat(miOferta.precio_total_ofrecido).toLocaleString('es-CL')}
              </Text>
              {(miOferta.estado === 'aceptada' || miOferta.estado === 'pagada') && (
                <TouchableOpacity
                  style={[styles.chatButton, { backgroundColor: primary500 }]}
                  onPress={() => router.push(`/chat-oferta/${miOferta.id}`)}
                >
                  <MaterialIcons name="chat" size={20} color="#FFFFFF" />
                  <Text style={styles.chatButtonText}>Ver Chat</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Sección de Servicios Adicionales */}
        {miOferta && (miOferta.estado === 'aceptada' || miOferta.estado === 'pagada') && solicitud.estado === 'pagada' && (
          <View style={styles.section}>
            <View style={styles.serviciosAdicionalesHeader}>
              <MaterialIcons name="add-circle-outline" size={24} color={primary500} />
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>Servicios Adicionales</Text>
            </View>
            <Text style={[styles.serviciosAdicionalesDescripcion, { color: textSecondary }]}>
              Si durante el servicio descubres problemas adicionales, puedes crear ofertas para servicios adicionales.
            </Text>
            
            {ofertasSecundarias.length > 0 && (
              <View style={styles.ofertasSecundariasList}>
                {ofertasSecundarias.map((ofertaSec) => (
                  <View key={ofertaSec.id} style={[styles.ofertaSecundariaCard, {
                    backgroundColor: neutralGrayObj?.[50] || '#F9F9F9',
                    borderColor: borderLight
                  }]}>
                    <View style={styles.ofertaSecundariaHeader}>
                      <View style={styles.ofertaSecundariaInfo}>
                        <Text style={[styles.ofertaSecundariaPrecio, { color: primary500 }]}>
                          ${parseFloat(ofertaSec.precio_total_ofrecido).toLocaleString('es-CL')}
                        </Text>
                        <Text style={[styles.ofertaSecundariaEstado, { color: textSecondary }]}>
                          {ofertaSec.estado === 'enviada' ? 'Enviada' : 
                           ofertaSec.estado === 'aceptada' ? 'Aceptada' :
                           ofertaSec.estado === 'pagada' ? 'Pagada' :
                           ofertaSec.estado === 'rechazada' ? 'Rechazada' : ofertaSec.estado}
                        </Text>
                      </View>
                      <View style={[
                        styles.ofertaSecundariaBadge,
                        ofertaSec.estado === 'aceptada' || ofertaSec.estado === 'pagada' 
                          ? { backgroundColor: success500 }
                          : { backgroundColor: warningColor }
                      ]}>
                        <Text style={styles.ofertaSecundariaBadgeText}>
                          {ofertaSec.estado === 'aceptada' || ofertaSec.estado === 'pagada' ? '✓' : '⏳'}
                        </Text>
                      </View>
                    </View>
                    {ofertaSec.motivo_servicio_adicional && (
                      <Text style={[styles.ofertaSecundariaMotivo, { color: textSecondary }]} numberOfLines={2}>
                        {ofertaSec.motivo_servicio_adicional}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
            
            <TouchableOpacity
              style={[styles.agregarServicioButton, {
                borderColor: primary500,
                backgroundColor: primaryObj?.['50'] || primaryObj?.['100'] || '#F0F7FF'
              }]}
              onPress={() => {
                if (miOferta) {
                  router.push(`/crear-oferta-secundaria/${solicitud.id}/${miOferta.id}`);
                }
              }}
            >
              <MaterialIcons name="add-circle" size={24} color={primary500} />
              <Text style={[styles.agregarServicioButtonText, { color: primary500 }]}>Agregar Servicio Adicional</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* BOTONES INFERIORES */}
      {!miOferta && (
        <View style={[styles.botonesContainer, { 
          paddingBottom: insets.bottom || 16,
          backgroundColor: bgPaper,
          borderTopColor: borderLight
        }]}>
          {/* Botón Rechazar (izquierda) */}
          <TouchableOpacity
            style={[styles.rechazarButton, {
              borderColor: errorColor,
              backgroundColor: bgPaper
            }]}
            onPress={() => setMostrarModalRechazo(true)}
          >
            <MaterialIcons name="cancel" size={20} color={errorColor} />
            <Text style={[styles.rechazarButtonText, { color: errorColor }]}>Rechazar oferta</Text>
          </TouchableOpacity>

          {/* Botón Crear Oferta (derecha, más grande) */}
          <TouchableOpacity
            style={[styles.crearOfertaButton, { backgroundColor: primary500 }]}
            onPress={() => router.push(`/crear-oferta/${solicitud.id}`)}
          >
            <MaterialIcons name="add-circle" size={24} color="#FFFFFF" />
            <Text style={styles.crearOfertaButtonText}>Crear Oferta</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Modal de rechazo */}
      <RechazarSolicitudModal
        visible={mostrarModalRechazo}
        onClose={() => setMostrarModalRechazo(false)}
        onConfirm={handleRechazar}
        loading={rechazando}
      />
    </View>
  );
}

// Función para crear estilos usando tokens del sistema de diseño
const createStyles = () => {
  // Valores seguros con fallbacks
  const bgPaper = COLORS?.background?.paper || COLORS?.base?.white || '#FFFFFF';
  const bgDefault = COLORS?.background?.default || '#EEEEEE';
  const textPrimary = COLORS?.text?.primary || COLORS?.neutral?.inkBlack || '#000000';
  const textSecondary = COLORS?.text?.secondary || COLORS?.neutral?.gray?.[700] || '#666666';
  const neutralGrayObj = COLORS?.neutral?.gray as any;
  const textTertiary = COLORS?.text?.tertiary || neutralGrayObj?.[700] || '#666666';
  const borderLight = COLORS?.border?.light || COLORS?.neutral?.gray?.[200] || '#EEEEEE';
  const borderMain = COLORS?.border?.main || COLORS?.neutral?.gray?.[300] || '#D0D0D0';
  
  // Acceso seguro a propiedades numéricas usando type assertion
  const primaryObj = COLORS?.primary as any;
  const accentObj = COLORS?.accent as any;
  const successObj = COLORS?.success as any;
  const warningObj = COLORS?.warning as any;
  const infoObj = COLORS?.info as any;
  const errorObj = COLORS?.error as any;
  
  const primary500 = primaryObj?.['500'] || '#4E4FEB';
  const accent500 = accentObj?.['500'] || '#FF6B00';
  const success500 = successObj?.main || successObj?.['500'] || '#3DB6B1';
  const warningColor = warningObj?.main || warningObj?.['500'] || '#FFB84D';
  const infoColor = infoObj?.main || infoObj?.['500'] || '#068FFF';
  const errorColor = errorObj?.main || errorObj?.['500'] || '#FF5555';
  
  const spacingXs = SPACING?.xs || 4;
  const spacingSm = SPACING?.sm || 8;
  const spacingMd = SPACING?.md || 16;
  const spacingLg = SPACING?.lg || 24;
  const spacingXl = SPACING?.xl || 32;
  
  const fontSizeXs = TYPOGRAPHY?.fontSize?.xs || 10;
  const fontSizeSm = TYPOGRAPHY?.fontSize?.sm || 12;
  const fontSizeBase = TYPOGRAPHY?.fontSize?.base || 14;
  const fontSizeMd = TYPOGRAPHY?.fontSize?.md || 16;
  const fontSizeLg = TYPOGRAPHY?.fontSize?.lg || 18;
  const fontSizeXl = TYPOGRAPHY?.fontSize?.xl || 20;
  
  const fontWeightRegular = TYPOGRAPHY?.fontWeight?.regular || '400';
  const fontWeightMedium = TYPOGRAPHY?.fontWeight?.medium || '500';
  const fontWeightSemibold = TYPOGRAPHY?.fontWeight?.semibold || '600';
  const fontWeightBold = TYPOGRAPHY?.fontWeight?.bold || '700';
  
  const radiusSm = BORDERS?.radius?.sm || 4;
  const radiusMd = BORDERS?.radius?.md || 8;
  const radiusLg = BORDERS?.radius?.lg || 12;
  const radiusXl = BORDERS?.radius?.xl || 16;
  const radius2xl = BORDERS?.radius?.['2xl'] || 20;
  const radiusFull = BORDERS?.radius?.full || 9999;
  
  const shadowSm = SHADOWS?.sm || { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 };
  const shadowMd = SHADOWS?.md || { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 };

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: spacingSm + 4,
      fontSize: fontSizeMd,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: fontSizeMd,
      color: textSecondary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacingMd,
      paddingTop: spacingSm + 4,
      // paddingBottom se maneja dinámicamente con insets.bottom
    },

    // Badges de urgencia y duración
    badgesContainer: {
      flexDirection: 'row',
      gap: spacingSm + 4,
      marginBottom: spacingMd + 4,
    },
    urgenciaBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacingMd,
      paddingVertical: spacingSm,
      borderRadius: radius2xl,
      gap: 6,
    },
    urgenciaText: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightBold,
      letterSpacing: 0.5,
    },
    tiempoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacingMd,
      paddingVertical: spacingSm,
      borderRadius: radius2xl,
      gap: 6,
    },
    tiempoText: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightSemibold,
    },
    repuestosBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacingMd,
      paddingVertical: spacingSm,
      borderRadius: radius2xl,
      gap: 6,
    },
    repuestosText: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightBold,
      letterSpacing: 0.5,
    },

    // Secciones
    section: {
      backgroundColor: bgPaper,
      borderRadius: radiusXl,
      padding: spacingMd + 4,
      marginBottom: spacingMd,
      ...shadowSm,
    },
    sectionTitle: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
      color: textPrimary,
      marginBottom: spacingMd,
    },

    // Cliente
    clienteContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacingMd + 4,
      gap: spacingMd,
    },
    clienteAvatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: 64,
      height: 64,
    },
    clienteNombre: {
      fontSize: fontSizeXl,
      fontWeight: fontWeightSemibold,
      flex: 1,
    },

    // Vehículo Card
    vehiculoCard: {
      borderRadius: radiusLg,
      padding: spacingMd,
      borderWidth: 1,
      gap: spacingMd,
    },
    vehiculoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm,
    },
    vehiculoTitle: {
      fontSize: fontSizeMd,
      fontWeight: fontWeightSemibold,
    },
    vehiculoMarcaModelo: {
      marginTop: spacingXs,
      marginBottom: spacingSm,
    },
    vehiculoMarcaModeloContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm,
      flexWrap: 'wrap',
    },
    vehiculoMarcaModeloText: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
      letterSpacing: 0.3,
      flex: 1,
      minWidth: 0,
    },
    vehiculoPatenteInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingXs,
      paddingVertical: spacingXs + 2,
      paddingHorizontal: spacingSm + 4,
      borderRadius: radiusMd,
      borderWidth: 1,
    },
    vehiculoPatenteInlineText: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightBold,
      letterSpacing: 0.5,
    },
    vehiculoGrid: {
      flexDirection: 'row',
      gap: spacingSm,
      marginTop: spacingXs,
    },
    vehiculoGridItem: {
      flex: 1,
      borderRadius: radiusMd,
      padding: spacingMd,
      borderWidth: 1,
      gap: spacingSm,
    },
    vehiculoGridItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingXs,
    },
    vehiculoGridItemLabel: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightMedium,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    vehiculoGridItemValue: {
      fontSize: fontSizeXl,
      fontWeight: fontWeightBold,
      marginTop: spacingXs,
    },
    vehiculoPatente: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacingSm,
      paddingVertical: spacingSm + 2,
      paddingHorizontal: spacingMd,
      borderRadius: radiusMd,
      borderWidth: 1,
      marginTop: spacingXs,
    },
    vehiculoPatenteText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightBold,
      letterSpacing: 1,
    },

    // Servicios Card
    serviciosCard: {
      borderRadius: radiusLg,
      padding: spacingMd,
      borderWidth: 1,
      gap: spacingMd,
    },
    serviciosCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm,
    },
    serviciosCardTitle: {
      fontSize: fontSizeMd,
      fontWeight: fontWeightSemibold,
    },
    serviciosGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacingSm,
    },
    servicioCard: {
      flex: 1,
      minWidth: '47%', // Para que quepan 2 por fila con gap
      borderRadius: radiusMd,
      padding: spacingMd,
      borderWidth: 1,
      gap: spacingSm,
      alignItems: 'center',
    },
    servicioCardHeader: {
      marginBottom: spacingXs,
    },
    servicioCardNombre: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
      textAlign: 'center',
      marginBottom: spacingXs,
    },
    servicioCardCategoria: {
      fontSize: fontSizeBase,
      textAlign: 'center',
      fontWeight: fontWeightMedium,
    },
    serviciosEmpty: {
      paddingVertical: spacingMd,
      alignItems: 'center',
    },
    serviciosEmptyText: {
      fontSize: fontSizeBase,
      fontStyle: 'italic',
    },
    descripcionCard: {
      borderRadius: radiusMd,
      padding: spacingMd,
      borderWidth: 1,
      gap: spacingSm,
      marginTop: spacingXs,
    },
    descripcionCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingXs,
    },
    descripcionCardLabel: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightSemibold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    descripcionCardTexto: {
      fontSize: fontSizeMd,
      lineHeight: 24,
      marginTop: spacingXs,
    },

    // Fecha y Hora
    fechaHoraContainer: {
      flexDirection: 'row',
      gap: spacingMd,
    },
    fechaHoraItem: {
      flex: 1,
      flexDirection: 'row',
      gap: spacingSm + 4,
    },
    fechaHoraTextos: {
      flex: 1,
      gap: 4,
    },
    fechaHoraLabel: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightSemibold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    fechaHoraValue: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
    },
    fechaHoraDivider: {
      width: 1,
    },

    // Ubicación
    ubicacionContainer: {
      flexDirection: 'row',
      gap: spacingSm + 4,
    },
    ubicacionTextos: {
      flex: 1,
      gap: 6,
    },
    ubicacionDireccion: {
      fontSize: fontSizeBase + 1,
      fontWeight: fontWeightSemibold,
      lineHeight: 22,
    },
    ubicacionDetalles: {
      fontSize: fontSizeBase,
      fontStyle: 'italic',
    },

    // Estado de oferta
    ofertaStatusCard: {
      borderRadius: radiusLg,
      padding: spacingMd,
    },
    ofertaStatusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacingSm + 4,
      gap: spacingSm,
    },
    ofertaStatusTitle: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightSemibold,
    },
    ofertaStatusTexto: {
      fontSize: fontSizeBase,
      marginBottom: spacingSm,
    },
    ofertaPrecio: {
      fontSize: fontSizeXl + 4,
      fontWeight: fontWeightBold,
      marginBottom: spacingSm + 4,
    },
    chatButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacingSm + 4,
      borderRadius: radiusSm,
      gap: spacingSm,
    },
    chatButtonText: {
      color: '#FFFFFF',
      fontSize: fontSizeMd,
      fontWeight: fontWeightSemibold,
    },

    // Botones inferiores
    botonesContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      gap: spacingSm + 4,
      paddingHorizontal: spacingMd,
      paddingTop: spacingSm + 4,
      // paddingBottom se maneja dinámicamente con insets.bottom
      borderTopWidth: 1,
      ...shadowMd,
    },
    rechazarButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacingSm + 6,
      borderRadius: radiusLg,
      borderWidth: 1,
      gap: 6,
    },
    rechazarButtonText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
    },
    crearOfertaButton: {
      flex: 1.5,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacingMd,
      borderRadius: radiusLg,
      gap: spacingSm,
    },
    crearOfertaButtonText: {
      fontSize: fontSizeMd,
      fontWeight: fontWeightBold,
      color: '#FFFFFF',
    },

    // Servicios Adicionales
    serviciosAdicionalesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm,
      marginBottom: spacingSm + 4,
    },
    serviciosAdicionalesDescripcion: {
      fontSize: fontSizeBase,
      lineHeight: 20,
      marginBottom: spacingMd,
    },
    ofertasSecundariasList: {
      gap: spacingSm + 4,
      marginBottom: spacingMd,
    },
    ofertaSecundariaCard: {
      borderRadius: radiusLg,
      padding: spacingMd,
      borderWidth: 1,
    },
    ofertaSecundariaHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacingSm,
    },
    ofertaSecundariaInfo: {
      flex: 1,
    },
    ofertaSecundariaPrecio: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
      marginBottom: 4,
    },
    ofertaSecundariaEstado: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightMedium,
    },
    ofertaSecundariaBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    ofertaSecundariaBadgeText: {
      color: '#FFFFFF',
      fontSize: fontSizeMd,
      fontWeight: fontWeightBold,
    },
    ofertaSecundariaMotivo: {
      fontSize: fontSizeBase - 1,
      fontStyle: 'italic',
      marginTop: spacingSm,
    },
    agregarServicioButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacingSm + 6,
      borderRadius: radiusLg,
      borderWidth: 2,
      borderStyle: 'dashed',
      gap: spacingSm,
    },
    agregarServicioButtonText: {
      fontSize: fontSizeBase + 1,
      fontWeight: fontWeightSemibold,
    },
  });
};

// Crear estilos usando la función
const styles = createStyles();
