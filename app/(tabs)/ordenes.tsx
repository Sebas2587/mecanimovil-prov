import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ordenesProveedorService, type Orden, obtenerNombreSeguro, esClienteCompleto } from '@/services/ordenesProveedor';
import { obtenerMisOfertas, type OfertaProveedor } from '@/services/solicitudesService';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import { OfertaCard } from '@/components/solicitudes/OfertaCard';
import { EstadoBanner } from '@/components/solicitudes/EstadoBanner';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';
import Header from '@/components/Header';

type TabType = 'activas' | 'completadas';

// Estados activos: enviada, vista, en_chat, aceptada, pendiente_pago, pagada, en_ejecucion
const ESTADOS_ACTIVOS = ['enviada', 'vista', 'en_chat', 'aceptada', 'pendiente_pago', 'pagada', 'en_ejecucion'];
// Estados completados: completada, rechazada, retirada, expirada
const ESTADOS_COMPLETADOS = ['completada', 'rechazada', 'retirada', 'expirada'];

export default function OrdenesScreen() {
  // Hook del sistema de diseño - acceso seguro a tokens
  const theme = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();
  
  const { estadoProveedor } = useAuth();
  // Si viene el parámetro tab='completadas', iniciar con ese tab
  const [tabActivo, setTabActivo] = useState<TabType>(
    params.tab === 'completadas' ? 'completadas' : 'activas'
  );
  
  // Órdenes tradicionales
  const [ordenesCompletas, setOrdenesCompletas] = useState<Orden[]>([]);
  
  // Ofertas enviadas
  const [ofertas, setOfertas] = useState<OfertaProveedor[]>([]);
  const [ofertasActivas, setOfertasActivas] = useState<OfertaProveedor[]>([]);
  const [ofertasCompletadas, setOfertasCompletadas] = useState<OfertaProveedor[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Obtener valores seguros del tema con fallbacks
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

  // Cargar datos cuando la pantalla recibe foco
  useFocusEffect(
    React.useCallback(() => {
      if (estadoProveedor?.verificado) {
        cargarDatos();
      }
    }, [estadoProveedor?.verificado])
  );

  useEffect(() => {
    if (estadoProveedor?.verificado) {
      cargarDatos();
    }
  }, [estadoProveedor]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      // Log solo en desarrollo (__DEV__), nunca en producción (APK)
      if (__DEV__) {
        console.log('🔄 Iniciando carga de datos (órdenes y ofertas)...');
      }
      
      // Cargar órdenes tradicionales y ofertas en paralelo
      const [ordenesRes, ofertasRes] = await Promise.all([
        cargarOrdenes(),
        cargarOfertas(),
      ]);
      
      if (__DEV__) {
        console.log('✅ Carga de datos completada');
      }
    } catch (error) {
      // Log solo en desarrollo
      if (__DEV__) {
        console.error('❌ Error cargando datos (detalles solo en desarrollo):', error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cargarOrdenes = async () => {
    try {
      // Cargar todas las órdenes: pendientes, activas, completadas, canceladas
      const [pendientesRes, activasRes, completadasRes, canceladasRes] = await Promise.all([
        ordenesProveedorService.obtenerPendientes(),
        ordenesProveedorService.obtenerActivas(),
        ordenesProveedorService.obtenerCompletadas(),
        ordenesProveedorService.obtenerTodas({ estado: 'cancelado' }),
      ]);

      const todasLasOrdenes: Orden[] = [];

      // Combinar todas las órdenes
      if (pendientesRes.success && Array.isArray(pendientesRes.data)) {
        todasLasOrdenes.push(...pendientesRes.data);
      }
      if (activasRes.success && Array.isArray(activasRes.data)) {
        todasLasOrdenes.push(...activasRes.data);
      }
      if (completadasRes.success && Array.isArray(completadasRes.data)) {
        todasLasOrdenes.push(...completadasRes.data);
      }
      if (canceladasRes.success && Array.isArray(canceladasRes.data)) {
        todasLasOrdenes.push(...canceladasRes.data);
      }

      // Eliminar duplicados y ordenar por fecha más reciente
      const ordenesUnicas = todasLasOrdenes.filter((orden, index, self) => 
        index === self.findIndex((o) => o.id === orden.id)
      );

      ordenesUnicas.sort((a, b) => 
        new Date(b.fecha_hora_solicitud).getTime() - new Date(a.fecha_hora_solicitud).getTime()
      );

      setOrdenesCompletas(ordenesUnicas);
    } catch (error) {
      // Log solo en desarrollo
      if (__DEV__) {
        console.error('Error cargando órdenes (detalles solo en desarrollo):', error);
      }
    }
  };

  const cargarOfertas = async () => {
    try {
      // Log solo en desarrollo (__DEV__), nunca en producción (APK)
      if (__DEV__) {
        console.log('🔄 Cargando ofertas...');
      }
      const response = await obtenerMisOfertas();
      
      if (response.success && response.data) {
        const ofertasData = Array.isArray(response.data) ? response.data : [];
        
        // Debug: Log detallado solo en desarrollo
        if (__DEV__) {
          console.log(`✅ ${ofertasData.length} ofertas cargadas desde el backend`);
          ofertasData.forEach((oferta, index) => {
            console.log(`Oferta ${index + 1}:`, {
              id: oferta.id,
              estado: oferta.estado,
              solicitud_estado: oferta.solicitud_estado,
              es_oferta_secundaria: oferta.es_oferta_secundaria,
              fecha_envio: oferta.fecha_envio
            });
          });
        }
        
        // Ordenar por fecha más reciente
        ofertasData.sort((a, b) => 
          new Date(b.fecha_envio || 0).getTime() - new Date(a.fecha_envio || 0).getTime()
        );
        
        setOfertas(ofertasData);
        
        // Separar ofertas activas y completadas
        // ✅ Ofertas activas: estado activo Y solicitud NO cancelada/expirada
        // IMPORTANTE: Si solicitud_estado es undefined/null, considerar válida (compatibilidad)
        const activas = ofertasData.filter(oferta => {
          const estadoActivo = ESTADOS_ACTIVOS.includes(oferta.estado);
          // Si no hay solicitud_estado, asumir que es válida (para ofertas antiguas o compatibilidad)
          if (!oferta.solicitud_estado) {
            return estadoActivo;
          }
          const solicitudValida = oferta.solicitud_estado !== 'cancelada' && 
                                  oferta.solicitud_estado !== 'expirada';
          const esActiva = estadoActivo && solicitudValida;
          return esActiva;
        });
        
        // ✅ Ofertas completadas: estado completado O solicitud cancelada/expirada
        const completadas = ofertasData.filter(oferta => {
          const estadoCompletado = ESTADOS_COMPLETADOS.includes(oferta.estado);
          // Si hay solicitud_estado, verificar si está cancelada/expirada
          const solicitudCancelada = oferta.solicitud_estado === 'cancelada' || 
                                     oferta.solicitud_estado === 'expirada';
          const esCompletada = estadoCompletado || solicitudCancelada;
          return esCompletada;
        });
        
        // Log resumen solo en desarrollo
        if (__DEV__) {
          console.log(`✅ RESUMEN - Ofertas activas: ${activas.length}, Completadas: ${completadas.length}, Total: ${ofertasData.length}`);
        }
        
        setOfertasActivas(activas);
        setOfertasCompletadas(completadas);
      } else {
        // Log solo en desarrollo
        if (__DEV__) {
          console.error('❌ Error en respuesta de obtenerMisOfertas (detalles solo en desarrollo):', response.error);
        }
        // ✅ NO vaciar los estados si hay error - mantener datos anteriores
      }
    } catch (error) {
      // Log solo en desarrollo
      if (__DEV__) {
        console.error('❌ Error cargando ofertas (detalles solo en desarrollo):', error);
      }
      // ✅ NO vaciar los estados si hay error - mantener datos anteriores
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatos();
  };

  const handleOrdenPress = (orden: Orden) => {
    // Si la orden tiene una oferta asociada, siempre navegar a oferta-detalle
    // (independientemente del estado, porque el checklist se maneja desde la oferta)
    if (orden.oferta_proveedor_id) {
      console.log('🔄 Navegando a oferta-detalle porque la orden tiene oferta asociada:', orden.oferta_proveedor_id);
      router.push(`/oferta-detalle/${orden.oferta_proveedor_id}`);
    } else {
      router.push(`/servicio-detalle/${orden.id}`);
    }
  };

  const handleOfertaPress = (oferta: OfertaProveedor) => {
    // TODO: Crear pantalla de detalle de oferta
    router.push(`/oferta-detalle/${oferta.id}`);
  };

  // Función para obtener el color del estado según el tipo de orden - usando sistema de diseño
  const getColorEstado = (estado: string): string => {
    // Acceso seguro usando type assertion para evitar errores de sintaxis
    const warningObj = safeColors?.warning as any;
    const infoObj = safeColors?.info as any;
    const successObj = safeColors?.success as any;
    const errorObj = safeColors?.error as any;
    const primaryObj = safeColors?.primary as any;
    const accentObj = safeColors?.accent as any;
    const neutralGray = safeColors?.neutral?.gray as any;
    
    const warningColor = warningObj?.main || warningObj?.['500'] || '#FFB84D';
    const infoColor = infoObj?.main || infoObj?.['500'] || accentObj?.['500'] || '#068FFF';
    const successColor = successObj?.main || successObj?.['500'] || '#3DB6B1';
    const errorColor = errorObj?.main || errorObj?.['500'] || '#FF5555';
    const primaryColor = primaryObj?.['500'] || accentObj?.['500'] || '#4E4FEB';
    const neutralColor = neutralGray?.[700] || safeColors?.text?.tertiary || '#666666';
    
    switch (estado) {
      case 'pendiente_aceptacion_proveedor':
        return warningColor;
      case 'aceptada_por_proveedor':
        return successColor;
      case 'en_proceso':
      case 'checklist_en_progreso':
      case 'servicio_iniciado':
        return primaryColor;
      case 'cancelado':
      case 'rechazada_por_proveedor':
        return errorColor;
      case 'completado':
        return successColor;
      default:
        return neutralColor;
    }
  };

  // Función para obtener el texto del estado
  const getTextoEstado = (orden: Orden): string => {
    return orden.estado_display || orden.estado.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatearHora = (hora: string) => {
    if (!hora) return '';
    return hora.substring(0, 5); // HH:MM
  };

  const formatearPrecio = (precio: string | number) => {
    try {
      const num = typeof precio === 'string' 
        ? parseFloat(precio.toString().replace(/[^0-9.-]+/g, ''))
        : precio;
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num);
    } catch {
      return `$${precio}`;
    }
  };

  // Función para obtener color del estado de oferta usando sistema de diseño
  const getColorEstadoOferta = (estado: string): string => {
    const warningObj = safeColors?.warning as any;
    const infoObj = safeColors?.info as any;
    const successObj = safeColors?.success as any;
    const errorObj = safeColors?.error as any;
    const primaryObj = safeColors?.primary as any;
    const neutralGray = safeColors?.neutral?.gray as any;
    
    const warningColor = warningObj?.main || warningObj?.['500'] || '#FFB84D';
    const infoColor = infoObj?.main || infoObj?.['500'] || '#068FFF';
    const successColor = successObj?.main || successObj?.['500'] || '#3DB6B1';
    const errorColor = errorObj?.main || errorObj?.['500'] || '#FF5555';
    const primaryColor = primaryObj?.['500'] || '#4E4FEB';
    const neutralColor = neutralGray?.[700] || safeColors?.text?.tertiary || '#666666';
    
    switch (estado) {
      case 'enviada':
        return infoColor;
      case 'vista':
        return primaryColor;
      case 'en_chat':
        return warningColor;
      case 'aceptada':
        return successColor;
      case 'pendiente_pago':
        return warningColor;
      case 'pagada':
        return successColor;
      case 'rechazada':
      case 'retirada':
      case 'expirada':
        return errorColor;
      default:
        return neutralColor;
    }
  };

  // Función para obtener texto del estado de oferta
  const getTextoEstadoOferta = (estado: string): string => {
    const estados: { [key: string]: string } = {
      'enviada': 'Enviada',
      'vista': 'Vista',
      'en_chat': 'En Conversación',
      'aceptada': 'Aceptada',
      'pendiente_pago': 'Pendiente Pago',
      'pagada': 'Pagada',
      'rechazada': 'Rechazada',
      'retirada': 'Retirada',
      'expirada': 'Expirada',
    };
    return estados[estado] || estado;
  };

  // Función para renderizar card de oferta con diseño orderListCard
  const renderOfertaCard = (oferta: OfertaProveedor) => {
    const colorEstado = getColorEstadoOferta(oferta.estado);
    const textoEstado = getTextoEstadoOferta(oferta.estado);
    const clienteFoto = oferta.solicitud_detail?.cliente_foto;
    const nombreCliente = oferta.solicitud_detail?.cliente_nombre || 'Cliente';
    const vehiculo = oferta.solicitud_detail?.vehiculo;
    
    // Obtener nombres de servicios desde solicitud_detail
    const serviciosNombres = oferta.solicitud_detail?.servicios_solicitados?.map(s => s.nombre) || [];
    const nombreServicio = serviciosNombres.length > 0 
      ? (serviciosNombres.length === 1 
          ? serviciosNombres[0] 
          : serviciosNombres.join(', '))
      : 'Servicio';
    
    const precioFormateado = formatearPrecio(oferta.precio_total_ofrecido);
    const fechaDisponible = oferta.fecha_disponible 
      ? new Date(oferta.fecha_disponible).toLocaleDateString('es-CL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      : '';
    
    return (
      <TouchableOpacity
        key={oferta.id}
        style={styles.orderListCard}
        onPress={() => handleOfertaPress(oferta)}
        activeOpacity={0.8}
      >
        {/* Tag de estado en esquina superior derecha */}
        <View style={[styles.orderListCardTag, { backgroundColor: colorEstado }]}>
          <Text style={styles.orderListCardTagText}>{textoEstado}</Text>
        </View>
        
        {/* Badge para ofertas secundarias */}
        {oferta.es_oferta_secundaria && (
          <View style={styles.orderListCardSecundariaBadge}>
            <MaterialIcons name="add-circle" size={10} color={COLORS?.base?.white || '#FFFFFF'} />
            <Text style={styles.orderListCardSecundariaText}>ADICIONAL</Text>
          </View>
        )}
        
        {/* Contenido principal */}
        <View style={[
          styles.orderListCardContent,
          oferta.es_oferta_secundaria && styles.orderListCardContentWithBadge
        ]}>
          {/* Título: Nombre del servicio - debe resaltar */}
          <Text style={styles.orderListCardTitle} numberOfLines={2}>
            {nombreServicio}
          </Text>
          
          {/* Fecha */}
          <Text style={styles.orderListCardDate}>
            {fechaDisponible || formatearFecha(oferta.fecha_envio)}
            {oferta.hora_disponible && ` • ${oferta.hora_disponible.substring(0, 5)}`}
          </Text>

          {/* Información del usuario */}
          <View style={styles.orderListCardUserSection}>
            {/* Foto del usuario (más pequeña, solo informativa) */}
            {clienteFoto ? (
              <Image 
                source={{ uri: clienteFoto }} 
                style={styles.orderListCardUserPhoto}
                onError={() => console.log('Error cargando foto del cliente')}
              />
            ) : (
              <View style={styles.orderListCardUserPhotoPlaceholder}>
                <MaterialIcons name="person" size={16} color={COLORS?.base?.white || '#FFFFFF'} />
              </View>
            )}
            
            {/* Nombre y vehículo */}
            <View style={styles.orderListCardUserInfo}>
              <Text style={styles.orderListCardUserName} numberOfLines={1}>
                {nombreCliente}
              </Text>
              {/* Marca, modelo, año del auto debajo del nombre */}
              {vehiculo && (
                <Text style={styles.orderListCardVehicle} numberOfLines={1}>
                  {vehiculo.marca} {vehiculo.modelo}
                  {vehiculo.año && ` (${vehiculo.año})`}
                </Text>
              )}
              {oferta.incluye_repuestos && (
                <View style={styles.orderListCardRepuestosBadge}>
                  <MaterialIcons name="build-circle" size={10} color={(safeColors?.success as any)?.['500'] || '#3DB6B1'} />
                  <Text style={styles.orderListCardRepuestosText}>Incluye repuestos</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Lado derecho: Estado de pago y Precio (alineados al final) */}
        <View style={styles.orderListCardRight}>
          {/* Estado de pago (si aplica) */}
          {(oferta.estado === 'aceptada' || oferta.estado === 'pendiente_pago' || oferta.estado === 'pagada') && (
            <View style={[
              styles.orderListCardEstadoPagoBadge,
              oferta.estado === 'pagada' 
                ? { backgroundColor: (safeColors?.success as any)?.['50'] || '#E6F7F5', borderColor: (safeColors?.success as any)?.['200'] || '#3DB6B1' }
                : { backgroundColor: (safeColors?.warning as any)?.['50'] || '#FFF8E6', borderColor: (safeColors?.warning as any)?.['200'] || '#FFB84D' }
            ]}>
              <MaterialIcons 
                name={oferta.estado === 'pagada' ? 'check-circle' : 'info'} 
                size={10} 
                color={oferta.estado === 'pagada' 
                  ? ((safeColors?.success as any)?.['700'] || '#3DB6B1')
                  : ((safeColors?.warning as any)?.['700'] || '#FFB84D')
                } 
              />
              <Text style={[
                styles.orderListCardEstadoPagoText,
                { color: oferta.estado === 'pagada' 
                  ? ((safeColors?.success as any)?.['700'] || '#3DB6B1')
                  : ((safeColors?.warning as any)?.['700'] || '#FFB84D')
                }
              ]}>
                {oferta.estado === 'pagada' ? 'Pagada' : 'Pendiente'}
              </Text>
            </View>
          )}
          
          {/* Precio (abajo, debe resaltar) */}
          {precioFormateado && (
            <Text style={styles.orderListCardPrice}>{precioFormateado}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Función para renderizar card de orden con diseño orderListCard
  const renderOrdenCard = (orden: Orden) => {
    const colorEstado = getColorEstado(orden.estado);
    const textoEstado = getTextoEstado(orden);
    const clienteFoto = (orden.cliente_detail as any)?.foto_perfil;
    const nombreCompleto = obtenerNombreCompleto(orden.cliente_detail);
    const esClienteCompletoFlag = esClienteCompleto(orden.cliente_detail);
    const tieneRepuestos = orden.lineas?.some(linea => linea.con_repuestos) || false;
    const urgencia = ordenesProveedorService.esOrdenUrgente(orden);
    
    // Obtener nombres de servicios - usar todos los servicios de las líneas
    const serviciosNombres = orden.lineas?.map(linea => linea.servicio_nombre) || [];
    const nombreServicio = serviciosNombres.length > 0 
      ? (serviciosNombres.length === 1 
          ? serviciosNombres[0] 
          : serviciosNombres.join(', '))
      : 'Servicio';
    
    const precioFormateado = formatearPrecio(orden.total);
    
    return (
      <TouchableOpacity
        key={orden.id}
        style={styles.orderListCard}
        onPress={() => handleOrdenPress(orden)}
        activeOpacity={0.8}
      >
        {/* Tag de estado en esquina superior derecha */}
        <View style={[styles.orderListCardTag, { backgroundColor: colorEstado }]}>
          <Text style={styles.orderListCardTagText}>{textoEstado}</Text>
        </View>
        
        {/* Contenido principal */}
        <View style={styles.orderListCardContent}>
          {/* Título: Nombre del servicio - debe resaltar */}
          <Text style={styles.orderListCardTitle} numberOfLines={2}>
            {nombreServicio}
          </Text>
          
          {/* Fecha */}
          <Text style={styles.orderListCardDate}>
            {formatearFecha(orden.fecha_servicio || orden.fecha_hora_solicitud)}
            {orden.hora_servicio && ` • ${formatearHora(orden.hora_servicio)}`}
          </Text>

          {/* Información del usuario */}
          <View style={styles.orderListCardUserSection}>
            {/* Foto del usuario (más pequeña, solo informativa) */}
            {clienteFoto ? (
              <Image 
                source={{ uri: clienteFoto }} 
                style={styles.orderListCardUserPhoto}
                onError={() => console.log('Error cargando foto del cliente')}
              />
            ) : (
              <View style={styles.orderListCardUserPhotoPlaceholder}>
                <MaterialIcons name="person" size={16} color={COLORS?.base?.white || '#FFFFFF'} />
              </View>
            )}
            
            {/* Nombre y vehículo */}
            <View style={styles.orderListCardUserInfo}>
              <View style={styles.orderListCardUserNameRow}>
                <Text style={styles.orderListCardUserName} numberOfLines={1}>
                  {nombreCompleto}
                </Text>
                {urgencia && (
                  <View style={styles.orderListCardUrgenteBadge}>
                    <MaterialIcons name="warning" size={10} color={COLORS?.base?.white || '#FFFFFF'} />
                  </View>
                )}
                {!esClienteCompletoFlag && (
                  <View style={styles.orderListCardProtegidoBadge}>
                    <MaterialIcons name="security" size={10} color={(safeColors?.warning as any)?.['500'] || '#FFB84D'} />
                  </View>
                )}
              </View>
              {/* Marca, modelo, año del auto debajo del nombre */}
              <Text style={styles.orderListCardVehicle} numberOfLines={1}>
                {orden.vehiculo_detail?.marca} {orden.vehiculo_detail?.modelo}
                {orden.vehiculo_detail?.año && ` (${orden.vehiculo_detail.año})`}
              </Text>
              {tieneRepuestos && (
                <View style={styles.orderListCardRepuestosBadge}>
                  <MaterialIcons name="build-circle" size={10} color={(safeColors?.success as any)?.['500'] || '#3DB6B1'} />
                  <Text style={styles.orderListCardRepuestosText}>Incluye repuestos</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Lado derecho: Tipo de servicio y Precio (alineados al final) */}
        <View style={styles.orderListCardRight}>
          {/* Tipo de servicio (texto simple, arriba) */}
          <Text style={styles.orderListCardServiceType}>
            {orden.tipo_servicio === 'domicilio' ? 'A domicilio' : 'En taller'}
          </Text>
          
          {/* Método de pago (si existe) */}
          {orden.metodo_pago && (
            <View style={styles.orderListCardPagoBadge}>
              <MaterialIcons 
                name={orden.metodo_pago === 'transferencia' ? 'account-balance' : 'money'} 
                size={10} 
                color={(safeColors?.text?.tertiary || (safeColors?.neutral?.gray as any)?.[700] || '#666666')} 
              />
              <Text style={styles.orderListCardPagoText}>
                {orden.metodo_pago === 'transferencia' ? 'Transferencia' : 
                 orden.metodo_pago === 'efectivo' ? 'Efectivo' : 
                 orden.metodo_pago}
              </Text>
            </View>
          )}
          
          {/* Precio (abajo, debe resaltar) */}
          {precioFormateado && (
            <Text style={styles.orderListCardPrice}>{precioFormateado}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Obtener nombre completo del cliente
  const obtenerNombreCompleto = (cliente: any): string => {
    if (cliente?.nombre && cliente?.apellido) {
      return `${cliente.nombre} ${cliente.apellido}`.trim();
    }
    if (cliente?.nombre) {
      return cliente.nombre;
    }
    return obtenerNombreSeguro(cliente);
  };

  // Calcular órdenes y ofertas para cada tab (independiente del tab activo)
  const ordenesActivas = ordenesCompletas.filter(o => !['completado', 'cancelado', 'rechazada_por_proveedor'].includes(o.estado));
  const ordenesCompletadasTab = ordenesCompletas.filter(o => ['completado', 'cancelado', 'rechazada_por_proveedor'].includes(o.estado));
  
  // Contadores para badges (independientes del tab activo)
  const activasCount = ordenesActivas.length + ofertasActivas.length;
  const completadasCount = ordenesCompletadasTab.length + ofertasCompletadas.length;
  
  // Obtener datos según el tab activo para mostrar en el contenido
  const ordenesMostrar = tabActivo === 'activas' ? ordenesActivas : ordenesCompletadasTab;
  const ofertasMostrar = tabActivo === 'activas' ? ofertasActivas : ofertasCompletadas;
  const tieneDatos = ordenesMostrar.length > 0 || ofertasMostrar.length > 0;

  // Si no está verificado, mostrar mensaje
  if (!estadoProveedor?.verificado) {
    return (
      <TabScreenWrapper>
      <View style={styles.container}>
        {/* Header consistente del sistema de diseño */}
        <Header title="Órdenes y Ofertas" />
          <View style={styles.noVerificadoContainer}>
            <MaterialIcons name="verified-user" size={64} color={(safeColors?.neutral?.gray as any)?.[700] || safeColors?.text?.tertiary || '#666666'} />
            <Text style={styles.noVerificadoTitle}>Perfil en Verificación</Text>
            <Text style={styles.noVerificadoMessage}>
              Tu perfil de proveedor está siendo revisado. Una vez verificado podrás gestionar órdenes y ofertas.
            </Text>
          </View>
        </View>
      </TabScreenWrapper>
    );
  }
  
  return (
    <TabScreenWrapper>
      <View style={styles.container}>
        {/* Header consistente del sistema de diseño */}
        <Header title="Órdenes y Ofertas" />

        {/* Tabs - Diseño moderno con indicador underline */}
        <View style={styles.tabsContainer}>
          <View style={styles.tabsWrapper}>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => setTabActivo('activas')}
              activeOpacity={0.7}
            >
              <View style={styles.tabContent}>
                <Text style={[styles.tabText, tabActivo === 'activas' && styles.tabTextActive]}>
                  Activas
                </Text>
                {activasCount > 0 && (
                  <View style={[
                    styles.tabBadge,
                    tabActivo === 'activas' && styles.tabBadgeActive
                  ]}>
                    <Text style={[
                      styles.tabBadgeText,
                      tabActivo === 'activas' && styles.tabBadgeTextActive
                    ]}>
                      {activasCount}
                    </Text>
                  </View>
                )}
              </View>
              {tabActivo === 'activas' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.tab}
              onPress={() => setTabActivo('completadas')}
              activeOpacity={0.7}
            >
              <View style={styles.tabContent}>
                <Text style={[styles.tabText, tabActivo === 'completadas' && styles.tabTextActive]}>
                  Completadas
                </Text>
                {completadasCount > 0 && (
                  <View style={[
                    styles.tabBadge,
                    tabActivo === 'completadas' && styles.tabBadgeActive
                  ]}>
                    <Text style={[
                      styles.tabBadgeText,
                      tabActivo === 'completadas' && styles.tabBadgeTextActive
                    ]}>
                      {completadasCount}
                    </Text>
                  </View>
                )}
              </View>
              {tabActivo === 'completadas' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Contenido */}
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={(safeColors?.primary as any)?.['500'] || safeColors?.accent?.['500'] || '#4E4FEB'} />
              <Text style={styles.loadingText}>Cargando...</Text>
            </View>
          ) : tieneDatos ? (
            <View style={styles.content}>
              {/* Debug info - temporal para diagnóstico */}
              {__DEV__ && (
                <View style={{ padding: 10, backgroundColor: '#f0f0f0', marginBottom: 10 }}>
                  <Text style={{ fontSize: 12, color: '#666' }}>
                    DEBUG: Tab={tabActivo}, Órdenes={ordenesMostrar.length}, Ofertas={ofertasMostrar.length}
                  </Text>
                </View>
              )}
              
              {/* Banner informativo para ofertas activas */}
              {tabActivo === 'activas' && ofertasMostrar.length > 0 && (
                <View style={styles.bannerContainer}>
                  {ofertasMostrar.some(o => o.estado === 'aceptada' || o.estado === 'pendiente_pago') && (
                    <EstadoBanner
                      type="warning"
                      title="⚠️ Importante: Esperando Confirmación de Pago"
                      message="Si una oferta está 'Aceptada' o 'Cliente Pagando', NO te dirijas al servicio hasta que veas el estado 'Pagada'. Te notificaremos cuando puedas ir."
                      icon="info"
                    />
                  )}
                  {ofertasMostrar.some(o => o.estado === 'pagada') && (
                    <EstadoBanner
                      type="success"
                      title="✅ Tienes Servicios Listos para Realizar"
                      message="Las ofertas con estado 'Pagada' están confirmadas. Revisa la fecha y hora para dirigirte al servicio."
                      icon="check-circle"
                    />
                  )}
                </View>
              )}

              {/* Ofertas enviadas */}
              {ofertasMostrar.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Ofertas Enviadas</Text>
                  {ofertasMostrar.map((oferta) => renderOfertaCard(oferta))}
                </View>
              )}

              {/* Órdenes tradicionales */}
              {ordenesMostrar.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Órdenes de Servicio</Text>
                  {ordenesMostrar.map((orden) => renderOrdenCard(orden))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons 
                name={tabActivo === 'activas' ? 'inbox' : 'check-circle'} 
                size={64} 
                color={(safeColors?.neutral?.gray as any)?.[700] || safeColors?.text?.tertiary || '#5D6F75'} 
              />
              <Text style={styles.emptyStateText}>
                {tabActivo === 'activas' 
                  ? 'No hay órdenes o ofertas activas' 
                  : 'No hay órdenes o ofertas completadas'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </TabScreenWrapper>
  );
}

// Función para crear estilos usando tokens del sistema de diseño
const createStyles = () => {
  // Valores seguros con fallbacks
  const bgPaper = COLORS?.background?.paper || COLORS?.base?.white || '#FFFFFF';
  const textPrimary = COLORS?.text?.primary || COLORS?.neutral?.inkBlack || '#000000';
  const textSecondary = COLORS?.text?.secondary || COLORS?.neutral?.gray?.[700] || '#666666';
  const textTertiary = COLORS?.text?.tertiary || COLORS?.neutral?.gray?.[700] || '#666666';
  const borderLight = COLORS?.border?.light || COLORS?.neutral?.gray?.[200] || '#EEEEEE';
  const borderMain = COLORS?.border?.main || COLORS?.neutral?.gray?.[300] || '#D0D0D0';
  const borderWidth = BORDERS?.width?.thin || 1;
  const primaryObj = COLORS?.primary as any;
  const accentObj = COLORS?.accent as any;
  const neutralGrayObj = COLORS?.neutral?.gray as any;
  
  // Safe colors para usar en estilos
  const safeColorsLocal = COLORS || {};
  const errorObj = COLORS?.error as any;
  const warningObj = COLORS?.warning as any;
  
  const primary500 = primaryObj?.['500'] || accentObj?.['500'] || '#4E4FEB';
  const primaryLight = (primaryObj as any)?.['50'] || (accentObj as any)?.['50'] || '#F0F7FF';
  const errorColor = errorObj?.main || errorObj?.['500'] || '#FF5555';
  const warningColor = warningObj?.main || warningObj?.['500'] || '#FFB84D';
  
  const spacingXs = SPACING?.xs || 4;
  const spacingSm = SPACING?.sm || 8;
  const spacingMd = SPACING?.md || 16;
  const spacingLg = SPACING?.lg || 24;
  const spacingXl = SPACING?.xl || 32;
  
  // Espaciado optimizado para contenido y containers
  const containerHorizontal = SPACING?.container?.horizontal || SPACING?.content?.horizontal || 18;
  const containerVertical = SPACING?.container?.vertical || SPACING?.content?.vertical || 20;
  const cardPadding = SPACING?.cardPadding || spacingMd;
  const cardGap = SPACING?.cardGap || spacingSm;
  const cardMargin = SPACING?.cardMargin || spacingSm;
  
  const fontSizeSm = TYPOGRAPHY?.fontSize?.sm || 12;
  const fontSizeBase = TYPOGRAPHY?.fontSize?.base || 14;
  const fontSizeMd = TYPOGRAPHY?.fontSize?.md || 16;
  const fontSizeLg = TYPOGRAPHY?.fontSize?.lg || 18;
  const fontSizeXl = TYPOGRAPHY?.fontSize?.xl || 20;
  const fontSize3xl = TYPOGRAPHY?.fontSize?.['3xl'] || 28;
  
  const fontWeightSemibold = TYPOGRAPHY?.fontWeight?.semibold || '600';
  const fontWeightBold = TYPOGRAPHY?.fontWeight?.bold || '700';
  
  const radiusSm = BORDERS?.radius?.sm || 4;
  const radiusLg = BORDERS?.radius?.lg || 12;
  const cardRadius = BORDERS?.radius?.card?.md || radiusLg;
  
  const shadowSm = SHADOWS?.sm || { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 };
  const shadowMd = SHADOWS?.md || { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 };
  
  // Valores adicionales para orderListCard
  const radiusXl = BORDERS?.radius?.xl || 16;
  const fontSize2xl = TYPOGRAPHY?.fontSize?.['2xl'] || 24;
  const fontWeightMedium = TYPOGRAPHY?.fontWeight?.medium || '500';
  const successObj = COLORS?.success as any;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bgPaper,
    },
    title: {
      fontSize: fontSize3xl,
      fontWeight: fontWeightBold,
      color: textPrimary,
    },
    tabsContainer: {
      backgroundColor: bgPaper,
      borderBottomWidth: borderWidth,
      borderBottomColor: borderLight,
    },
    tabsWrapper: {
      flexDirection: 'row',
      paddingHorizontal: containerHorizontal,
      paddingTop: spacingMd,
      gap: spacingXs,
    },
    tab: {
      flex: 1,
      position: 'relative',
      paddingBottom: spacingSm + 4, // 12
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacingXs + 1, // 5
    },
    tabIndicator: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: primary500,
      borderRadius: radiusSm,
    },
    tabText: {
      fontSize: fontSizeMd,
      fontWeight: fontWeightSemibold,
      color: textTertiary,
      letterSpacing: 0.2,
    },
    tabTextActive: {
      color: primary500,
      fontWeight: fontWeightBold,
    },
    tabBadge: {
      backgroundColor: neutralGrayObj?.[200] || COLORS?.neutral?.gray?.[200] || '#EEEEEE',
      borderRadius: radiusLg,
      minWidth: 20,
      height: 20,
      paddingHorizontal: spacingXs + 2, // 6
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabBadgeActive: {
      backgroundColor: primary500,
    },
    tabBadgeText: {
      color: textTertiary,
      fontSize: fontSizeSm - 1, // 11
      fontWeight: fontWeightSemibold,
    },
    tabBadgeTextActive: {
      color: COLORS?.base?.white || '#FFFFFF',
    },
    scrollContainer: {
      flex: 1,
    },
    content: {
      paddingHorizontal: containerHorizontal,
      paddingVertical: containerVertical,
    },
    bannerContainer: {
      marginBottom: spacingMd,
    },
    section: {
      marginBottom: spacingLg,
    },
    sectionTitle: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightSemibold,
      color: textPrimary,
      marginBottom: spacingSm + 4, // 12
    },
    loadingContainer: {
      padding: spacingXl * 1.25, // 40
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginTop: spacingSm + 4, // 12
      fontSize: fontSizeBase,
      color: textTertiary,
    },
    emptyState: {
      padding: spacingXl * 1.25, // 40
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyStateText: {
      marginTop: spacingMd,
      fontSize: fontSizeMd,
      color: textTertiary,
      textAlign: 'center',
    },
    ordenCard: {
      backgroundColor: bgPaper,
      borderRadius: cardRadius,
      padding: cardPadding,
      marginBottom: cardGap,
      marginHorizontal: 0,
      ...shadowSm,
      borderWidth: 1,
      borderColor: borderLight,
    },
    cardHeader: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacingXs + 1, // 5
      marginBottom: spacingMd,
    },
    estadoBadgeCard: {
      paddingHorizontal: spacingSm + 2, // 10
      paddingVertical: spacingXs + 1, // 5
      borderRadius: radiusLg,
    },
    estadoBadgeCardText: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightSemibold,
      color: COLORS?.base?.white || '#FFFFFF',
    },
    urgenteBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: (safeColorsLocal?.error as any)?.['500'] || errorColor,
      paddingHorizontal: spacingXs + 2, // 6
      paddingVertical: spacingXs,
      borderRadius: radiusSm,
      gap: spacingXs / 2, // 2
    },
    urgenteBadgeText: {
      fontSize: fontSizeSm - 1, // 11
      fontWeight: fontWeightBold,
      color: COLORS?.base?.white || '#FFFFFF',
    },
    protegidoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: ((safeColorsLocal?.warning as any)?.['50'] || (safeColorsLocal?.warning as any)?.light),
      paddingHorizontal: spacingXs + 2, // 6
      paddingVertical: spacingXs,
      borderRadius: radiusSm,
      gap: spacingXs / 2, // 2
      borderWidth: 1,
      borderColor: ((safeColorsLocal?.warning as any)?.['200'] || warningColor),
    },
    protegidoBadgeText: {
      fontSize: fontSizeSm - 1, // 11
      fontWeight: fontWeightSemibold,
      color: ((safeColorsLocal?.warning as any)?.['700'] || (safeColorsLocal?.warning as any)?.text || COLORS?.text?.onWarning),
    },
    clienteVehiculoSection: {
      marginBottom: spacingMd,
      paddingBottom: spacingMd,
      borderBottomWidth: 1,
      borderBottomColor: borderLight,
    },
    clienteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm + 2, // 10
    },
    clienteAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: (neutralGrayObj?.[200]) || COLORS?.neutral?.gray?.[200] || '#EEEEEE',
    },
    clienteAvatarPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: primary500,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clienteInfoContainer: {
      flex: 1,
    },
    clienteNombre: {
      fontSize: fontSizeMd + 1, // 17
      fontWeight: fontWeightBold,
      color: textPrimary,
      marginBottom: spacingXs / 2, // 2
    },
    vehiculoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingXs / 2, // 2
      marginTop: 2,
    },
    vehiculoTexto: {
      fontSize: fontSizeBase,
      color: textTertiary,
      flex: 1,
    },
    servicioInfoRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacingMd,
      marginBottom: spacingSm + 2, // 10
    },
    servicioInfoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingXs / 2, // 2
    },
    servicioInfoText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      color: (safeColorsLocal?.primary as any)?.['500'] || primary500,
    },
    ubicacionText: {
      fontSize: fontSizeBase,
      color: textTertiary,
      flex: 1,
      maxWidth: 200,
    },
    serviciosRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacingXs + 1, // 5
      marginBottom: spacingSm + 2, // 10
    },
    serviciosInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacingXs,
    },
    serviciosText: {
      fontSize: fontSizeBase,
      color: textPrimary,
      flex: 1,
    },
    repuestosBadgeSmall: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: (successObj?.['50'] || successObj?.light || COLORS?.background?.success),
      paddingHorizontal: spacingXs + 1, // 5
      paddingVertical: 2,
      borderRadius: radiusSm,
      gap: spacingXs / 2, // 2
    },
    repuestosTextSmall: {
      fontSize: fontSizeSm - 2 || 10,
      fontWeight: fontWeightSemibold,
      color: (successObj?.['700'] || successObj?.text || COLORS?.text?.onSuccess),
    },
    fechaHoraRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacingMd,
      marginBottom: spacingMd,
    },
    fechaHoraItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingXs / 2, // 2
    },
    fechaHoraText: {
      fontSize: fontSizeBase,
      color: textTertiary,
    },
    divider: {
      height: 1,
      backgroundColor: borderLight,
      marginVertical: spacingMd,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    footerLeft: {
      flex: 1,
    },
    pagoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingXs / 2, // 2
      alignSelf: 'flex-start',
    },
    pagoText: {
      fontSize: fontSizeSm,
      color: textTertiary,
    },
    footerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingXs,
    },
    precioTexto: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
      color: textPrimary,
    },
    noVerificadoContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacingXl * 1.25, // 40
    },
    noVerificadoTitle: {
      fontSize: fontSizeXl,
      fontWeight: fontWeightSemibold,
      color: textPrimary,
      marginTop: spacingMd,
      marginBottom: spacingSm,
    },
    noVerificadoMessage: {
      fontSize: fontSizeBase,
      color: textTertiary,
      textAlign: 'center',
      lineHeight: 20,
    },
    // Estilos para Order List Cards (mismo diseño que index.tsx)
    orderListCard: {
      backgroundColor: bgPaper,
      borderRadius: radiusXl,
      padding: spacingMd,
      marginBottom: spacingMd,
      ...shadowSm,
      borderWidth: 1,
      borderColor: borderLight,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacingMd,
      position: 'relative',
    },
    orderListCardTag: {
      position: 'absolute',
      top: spacingMd,
      right: spacingMd,
      paddingHorizontal: spacingSm,
      paddingVertical: spacingXs / 2,
      borderRadius: radiusLg,
      zIndex: 1,
      maxWidth: 120, // Limitar ancho máximo del tag
    },
    orderListCardTagText: {
      fontSize: fontSizeSm - 1, // 11
      fontWeight: fontWeightSemibold,
      color: COLORS?.base?.white || '#FFFFFF',
    },
    orderListCardSecundariaBadge: {
      position: 'absolute',
      top: spacingMd,
      left: spacingMd,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: (COLORS?.accent as any)?.['500'] || accentObj?.['500'] || '#FF6B00',
      paddingHorizontal: spacingXs + 1,
      paddingVertical: 2,
      borderRadius: radiusSm,
      gap: spacingXs / 2,
      zIndex: 1,
      maxWidth: 100, // Limitar ancho máximo del badge
    },
    orderListCardSecundariaText: {
      fontSize: fontSizeSm - 2, // 10
      fontWeight: fontWeightBold,
      color: COLORS?.base?.white || '#FFFFFF',
      letterSpacing: 0.5,
    },
    orderListCardContent: {
      flex: 1,
      gap: spacingSm,
      minWidth: 0,
      paddingTop: spacingMd + spacingXs, // Espacio para el tag (aumentado)
      paddingRight: spacingSm, // Espacio a la derecha para evitar solapamiento con tag
      paddingLeft: 0, // Sin padding izquierdo por defecto
    },
    orderListCardContentWithBadge: {
      paddingLeft: spacingMd + spacingSm + 4, // Espacio adicional cuando hay badge "ADICIONAL"
    },
    orderListCardTitle: {
      fontSize: fontSizeLg + 2, // 20
      fontWeight: fontWeightBold,
      color: textPrimary,
      marginBottom: spacingXs / 2,
      lineHeight: (fontSizeLg + 2) * 1.3,
      paddingRight: spacingMd, // Espacio adicional a la derecha para evitar solapamiento
    },
    orderListCardDate: {
      fontSize: fontSizeSm,
      color: textTertiary,
      marginBottom: spacingSm,
    },
    orderListCardUserSection: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacingSm,
      marginTop: spacingXs,
    },
    orderListCardUserPhoto: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: borderLight,
      flexShrink: 0,
    },
    orderListCardUserPhotoPlaceholder: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: primary500,
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 0,
    },
    orderListCardUserInfo: {
      flex: 1,
      gap: 2,
    },
    orderListCardUserNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingXs / 2,
      flexWrap: 'wrap',
    },
    orderListCardUserName: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightMedium,
      color: textPrimary,
    },
    orderListCardUrgenteBadge: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: errorColor,
      justifyContent: 'center',
      alignItems: 'center',
    },
    orderListCardProtegidoBadge: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: (warningObj?.['50'] || warningObj?.light || COLORS?.warning?.light),
      borderWidth: 1,
      borderColor: (warningObj?.['200'] || warningColor),
      justifyContent: 'center',
      alignItems: 'center',
    },
    orderListCardVehicle: {
      fontSize: fontSizeSm,
      color: textTertiary,
    },
    orderListCardRepuestosBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: (successObj?.['50'] || successObj?.light || COLORS?.background?.success),
      paddingHorizontal: spacingXs,
      paddingVertical: 2,
      borderRadius: radiusSm,
      gap: spacingXs / 2,
      marginTop: spacingXs / 2,
    },
    orderListCardRepuestosText: {
      fontSize: fontSizeSm - 2, // 10
      fontWeight: fontWeightSemibold,
      color: (successObj?.['700'] || successObj?.text || COLORS?.text?.onSuccess),
    },
    orderListCardRight: {
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      gap: spacingXs + 2,
      minWidth: 100,
      flexShrink: 0,
      paddingTop: spacingXs, // Espacio para el tag
    },
    orderListCardServiceType: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightMedium,
      color: textTertiary,
      textAlign: 'right',
    },
    orderListCardPagoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: (neutralGrayObj?.[50] || COLORS?.neutral?.gray?.[50] || '#F9F9F9'),
      paddingHorizontal: spacingXs,
      paddingVertical: 2,
      borderRadius: radiusSm,
      gap: spacingXs / 2,
      borderWidth: 1,
      borderColor: borderLight,
    },
    orderListCardPagoText: {
      fontSize: fontSizeSm - 2, // 10
      fontWeight: fontWeightMedium,
      color: textTertiary,
    },
    orderListCardEstadoPagoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacingXs,
      paddingVertical: 2,
      borderRadius: radiusSm,
      gap: spacingXs / 2,
      borderWidth: 1,
    },
    orderListCardEstadoPagoText: {
      fontSize: fontSizeSm - 2, // 10
      fontWeight: fontWeightSemibold,
    },
    orderListCardPrice: {
      fontSize: fontSizeLg + 2, // 20
      fontWeight: fontWeightBold,
      color: textPrimary,
      textAlign: 'right',
    },
  });
};

// Crear estilos usando la función
const styles = createStyles();
