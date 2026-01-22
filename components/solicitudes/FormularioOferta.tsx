import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
// DateTimePicker removido - ahora usamos modales personalizados
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SolicitudPublica, ServicioSolicitado, DetalleServicioOferta } from '@/services/solicitudesService';
import { serviciosProveedorAPI, ServicioConfiguradoParaOferta, RepuestoDetallado } from '@/services/serviciosApi';
import { ServicioConfiguradoSelector } from './ServicioConfiguradoSelector';
import { RepuestosLista } from './RepuestosLista';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { useAuth } from '@/context/AuthContext';
import { useAlerts } from '@/context/AlertsContext';
import { obtenerEstadoCuenta } from '@/services/mercadoPagoProveedorService';
import { serviceAreasApi } from '@/services/serviceAreasApi';

interface FormularioOfertaProps {
  solicitud: SolicitudPublica;
  onSubmit: (datosOferta: {
    servicios_ofertados: number[];
    detalles_servicios: DetalleServicioOferta[];
    precio_total_ofrecido: string;
    incluye_repuestos: boolean;
    tiempo_estimado_total: string;
    descripcion_oferta: string;
    garantia_ofrecida?: string;
    fecha_disponible: string;
    hora_disponible: string;
    // Campos de desglose para pagos separados
    costo_repuestos?: string;
    costo_mano_obra?: string;
    foto_cotizacion_repuestos?: string;
  }) => void;
  onCancel?: () => void;
  loading?: boolean;
  bottomInset?: number;
  esOfertaSecundaria?: boolean; // Nueva prop para ofertas secundarias
}

interface RepuestoEditable extends RepuestoDetallado {
  cantidad: number;
}

interface ServicioOferta {
  servicio: ServicioSolicitado;
  precio: string; // Precio según lo que solicita el cliente (con o sin repuestos)
  tiempo_estimado: string;
  notas: string;
  // Nuevos campos para servicios configurados
  servicioConfigurado: ServicioConfiguradoParaOferta | null;
  usandoServicioConfigurado: boolean;
  costoManoObra: string;
  repuestos: RepuestoEditable[];
  tipoServicio: 'con_repuestos' | 'sin_repuestos';
  loadingServicioConfigurado: boolean;
}

// Componente DatePicker moderno con modal personalizado
const ModernDatePicker = ({
  value,
  onDateChange,
  label,
  primaryColor = '#003459'
}: {
  value: Date;
  onDateChange: (date: Date) => void;
  label: string;
  primaryColor?: string;
}) => {
  const [showModal, setShowModal] = useState(false);
  const theme = useTheme();
  const bgDefault = theme.colors?.background?.default || '#F5F7F8';
  const textPrimary = theme.colors?.text?.primary || '#00171F';
  const textSecondary = theme.colors?.text?.secondary || '#666E7A';
  const borderLight = theme.colors?.border?.light || '#D7DFE3';
  const spacingMd = theme.spacing?.md || 16;
  const spacingSm = theme.spacing?.sm || 8;
  const spacingLg = theme.spacing?.lg || 24;
  const cardRadius = theme.borders?.radius?.lg || 12;
  const fontSizeBase = theme.typography?.fontSize?.base || 14;
  const fontSizeLg = theme.typography?.fontSize?.lg || 18;
  const fontWeightSemibold = theme.typography?.fontWeight?.semibold || '600';
  const fontWeightBold = theme.typography?.fontWeight?.bold || '700';

  // Generar opciones de fecha (próximos 60 días)
  const generarOpcionesFecha = (): Date[] => {
    const opciones: Date[] = [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (let i = 0; i < 60; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + i);
      opciones.push(fecha);
    }
    return opciones;
  };

  const opcionesFecha = generarOpcionesFecha();

  // Formatear fecha para comparación
  const fechaFormateada = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Formatear fecha para mostrar
  const formatearFechaDisplay = (date: Date): string => {
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Obtener día de la semana
  const obtenerDiaSemana = (date: Date): string => {
    return date.toLocaleDateString('es-ES', { weekday: 'short' });
  };

  const fechaSeleccionada = fechaFormateada(value);

  return (
    <View style={{ marginBottom: spacingMd }}>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: bgDefault,
          borderRadius: cardRadius / 2,
          padding: spacingMd - 2,
          borderWidth: 1,
          borderColor: borderLight,
        }}
        onPress={() => setShowModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="calendar" size={20} color={primaryColor} />
        <Text style={{
          fontSize: fontSizeBase,
          fontWeight: fontWeightSemibold,
          color: textPrimary,
          flex: 1,
          marginHorizontal: spacingMd,
        }}>
          {formatearFechaDisplay(value)}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#666E7A" />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-end',
          }}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: bgDefault,
              borderTopLeftRadius: cardRadius,
              borderTopRightRadius: cardRadius,
              height: 500,
              minHeight: '50%',
              maxHeight: '75%',
            }}
          >
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: spacingMd,
              paddingTop: spacingMd,
              paddingBottom: spacingSm,
              borderBottomWidth: 1,
              borderBottomColor: borderLight,
            }}>
              <Text style={{
                fontSize: fontSizeLg,
                fontWeight: fontWeightBold,
                color: textPrimary,
              }}>
                Seleccionar Fecha
              </Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={{
                  padding: spacingSm,
                }}
              >
                <Ionicons name="close" size={24} color={textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Lista de opciones */}
            <ScrollView
              style={{
                height: 400,
              }}
              contentContainerStyle={{
                paddingVertical: spacingSm,
              }}
              showsVerticalScrollIndicator={true}
            >
              <View style={{
                paddingHorizontal: spacingMd,
              }}>
                {opcionesFecha.map((opcion, index) => {
                  const estaSeleccionada = fechaFormateada(opcion) === fechaSeleccionada;
                  const diaSemana = obtenerDiaSemana(opcion);
                  const fechaDisplay = formatearFechaDisplay(opcion);

                  return (
                    <TouchableOpacity
                      key={index}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: spacingSm + 4,
                        paddingHorizontal: spacingMd,
                        marginVertical: 1,
                        borderRadius: cardRadius / 2,
                        backgroundColor: estaSeleccionada ? primaryColor : 'transparent',
                        borderWidth: estaSeleccionada ? 0 : 1,
                        borderColor: borderLight,
                      }}
                      onPress={() => {
                        const newDate = new Date(opcion);
                        // Mantener la hora actual
                        newDate.setHours(value.getHours(), value.getMinutes(), 0, 0);
                        onDateChange(newDate);
                        setShowModal(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={{
                          width: 50,
                          alignItems: 'center',
                          marginRight: spacingMd,
                        }}>
                          <Text style={{
                            fontSize: 10,
                            fontWeight: fontWeightSemibold,
                            color: estaSeleccionada ? '#FFFFFF' : textSecondary,
                            textTransform: 'uppercase',
                          }}>
                            {diaSemana}
                          </Text>
                        </View>
                        <Text style={{
                          fontSize: fontSizeBase,
                          fontWeight: estaSeleccionada ? fontWeightBold : fontWeightSemibold,
                          color: estaSeleccionada ? '#FFFFFF' : textPrimary,
                        }}>
                          {fechaDisplay}
                        </Text>
                      </View>
                      {estaSeleccionada && (
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// Componente TimePicker moderno
const ModernTimePicker = ({
  value,
  onTimeChange,
  label,
  primaryColor = '#003459'
}: {
  value: Date;
  onTimeChange: (date: Date) => void;
  label: string;
  primaryColor?: string;
}) => {
  const [showModal, setShowModal] = useState(false);
  const theme = useTheme();
  const bgDefault = theme.colors?.background?.default || '#F5F7F8';
  const textPrimary = theme.colors?.text?.primary || '#00171F';
  const textSecondary = theme.colors?.text?.secondary || '#666E7A';
  const borderLight = theme.colors?.border?.light || '#D7DFE3';
  const spacingMd = theme.spacing?.md || 16;
  const spacingSm = theme.spacing?.sm || 8;
  const spacingLg = theme.spacing?.lg || 24;
  const cardRadius = theme.borders?.radius?.lg || 12;
  const fontSizeBase = theme.typography?.fontSize?.base || 14;
  const fontSizeLg = theme.typography?.fontSize?.lg || 18;
  const fontWeightSemibold = theme.typography?.fontWeight?.semibold || '600';
  const fontWeightBold = theme.typography?.fontWeight?.bold || '700';

  // Generar opciones de hora cada 15 minutos (00, 15, 30, 45)
  const generarOpcionesHora = (): string[] => {
    const opciones: string[] = [];
    for (let hora = 0; hora < 24; hora++) {
      for (let minuto = 0; minuto < 60; minuto += 15) {
        const horaStr = hora.toString().padStart(2, '0');
        const minutoStr = minuto.toString().padStart(2, '0');
        opciones.push(`${horaStr}:${minutoStr}`);
      }
    }
    return opciones;
  };

  const opcionesHora = generarOpcionesHora();

  // Convertir Date a string HH:MM
  const dateToString = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Convertir string HH:MM a Date (manteniendo la fecha original)
  const stringToDate = (timeString: string, baseDate: Date): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const newDate = new Date(baseDate);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
  };

  const horaActual = dateToString(value);

  return (
    <View style={{ marginBottom: spacingMd }}>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: bgDefault,
          borderRadius: cardRadius / 2,
          padding: spacingMd - 2,
          borderWidth: 1,
          borderColor: borderLight,
        }}
        onPress={() => setShowModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="time" size={20} color={primaryColor} />
        <Text style={{
          fontSize: fontSizeBase,
          fontWeight: fontWeightSemibold,
          color: textPrimary,
          flex: 1,
          marginHorizontal: spacingMd,
          textAlign: 'left',
          minWidth: 60,
        }}
          numberOfLines={1}
        >
          {horaActual}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#666E7A" />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-end',
          }}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: bgDefault,
              borderTopLeftRadius: cardRadius,
              borderTopRightRadius: cardRadius,
              height: 500,
              minHeight: '50%',
              maxHeight: '75%',
            }}
          >
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: spacingMd,
              paddingTop: spacingMd,
              paddingBottom: spacingSm,
              borderBottomWidth: 1,
              borderBottomColor: borderLight,
            }}>
              <Text style={{
                fontSize: fontSizeLg,
                fontWeight: fontWeightBold,
                color: textPrimary,
              }}>
                Seleccionar Hora
              </Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={{
                  padding: spacingSm,
                }}
              >
                <Ionicons name="close" size={24} color={textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Lista de opciones - Optimizada */}
            <ScrollView
              style={{
                height: 400,
              }}
              contentContainerStyle={{
                paddingVertical: spacingSm,
              }}
              showsVerticalScrollIndicator={true}
            >
              <View style={{
                paddingHorizontal: spacingMd,
              }}>
                {opcionesHora.map((opcion) => {
                  const estaSeleccionada = opcion === horaActual;
                  return (
                    <TouchableOpacity
                      key={opcion}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: spacingSm + 4,
                        paddingHorizontal: spacingMd,
                        marginVertical: 1,
                        borderRadius: cardRadius / 2,
                        backgroundColor: estaSeleccionada ? primaryColor : 'transparent',
                        borderWidth: estaSeleccionada ? 0 : 1,
                        borderColor: borderLight,
                      }}
                      onPress={() => {
                        const newDate = stringToDate(opcion, value);
                        onTimeChange(newDate);
                        setShowModal(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{
                        fontSize: fontSizeBase,
                        fontWeight: estaSeleccionada ? fontWeightBold : fontWeightSemibold,
                        color: estaSeleccionada ? '#FFFFFF' : textPrimary,
                      }}>
                        {opcion}
                      </Text>
                      {estaSeleccionada && (
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export const FormularioOferta: React.FC<FormularioOfertaProps> = ({
  solicitud,
  onSubmit,
  onCancel,
  loading = false,
  bottomInset = 16,
  esOfertaSecundaria = false,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const theme = useTheme();
  const primaryColor = theme.colors?.primary?.[500] || '#003459';
  const { estadoProveedor } = useAuth();
  const { agregarAlerta } = useAlerts();

  const [serviciosOferta, setServiciosOferta] = useState<ServicioOferta[]>([]);
  const [puedeFechaSolicitada, setPuedeFechaSolicitada] = useState(!esOfertaSecundaria); // En secundarias, siempre usar fecha alternativa
  const [fechaAlternativa, setFechaAlternativa] = useState(new Date());
  const [horaAlternativa, setHoraAlternativa] = useState(new Date());
  const [razonCambioFecha, setRazonCambioFecha] = useState('');
  // State variables removed - ModernDatePicker y ModernTimePicker manejan su propia visibilidad
  const [descripcionOferta, setDescripcionOferta] = useState('');
  const [garantiaOfrecida, setGarantiaOfrecida] = useState('');
  const [costoGestionCompra, setCostoGestionCompra] = useState('');

  // Estados para ofertas secundarias
  const [serviciosDisponibles, setServiciosDisponibles] = useState<Array<{ id: number; nombre: string; descripcion?: string }>>([]);
  const [cargandoServicios, setCargandoServicios] = useState(false);
  const [mostrarSelectorServicios, setMostrarSelectorServicios] = useState(false);

  // Recalcular precios cuando cambia el costo de gestión de compra
  useEffect(() => {
    if (costoGestionCompra !== undefined && costoGestionCompra !== '') {
      setServiciosOferta(prev => {
        const nuevos = [...prev];
        let hayCambios = false;

        nuevos.forEach((servicio, index) => {
          // Solo recalcular si tiene repuestos
          if (servicio.tipoServicio === 'con_repuestos' && servicio.repuestos.length > 0) {
            const costoManoObra = parseFloat(servicio.costoManoObra || '0');
            const costoRepuestos = servicio.repuestos.reduce((total, rep) => {
              const precioUnitario = rep.precio !== undefined && rep.precio !== null ? rep.precio : (rep.precio_referencia || 0);
              return total + (rep.cantidad || 0) * precioUnitario;
            }, 0);
            const gestionCompra = parseFloat(costoGestionCompra || '0');
            const costoTotalSinIva = costoManoObra + costoRepuestos + gestionCompra;
            const iva = costoTotalSinIva * 0.19;
            const precioTotal = costoTotalSinIva + iva;

            const nuevoPrecio = precioTotal.toFixed(2);
            if (servicio.precio !== nuevoPrecio) {
              nuevos[index].precio = nuevoPrecio;
              hayCambios = true;
            }
          }
        });

        return hayCambios ? nuevos : prev;
      });
    }
  }, [costoGestionCompra]);

  // Cargar servicios disponibles del proveedor para ofertas secundarias
  useEffect(() => {
    if (esOfertaSecundaria && solicitud.vehiculo_info?.marca) {
      const cargarServiciosDisponibles = async () => {
        try {
          setCargandoServicios(true);
          // Obtener el ID de la marca desde el vehículo
          // Usar catalogosAPI que maneja correctamente la respuesta
          const { catalogosAPI } = await import('@/services/serviciosApi');
          const { serviciosAPI } = await import('@/services/api');

          // Primero obtener todas las marcas para encontrar el ID
          const marcasResponse: any = await catalogosAPI.obtenerMarcas();
          // Asegurarse de que sea un array
          const marcas = Array.isArray(marcasResponse)
            ? marcasResponse
            : (marcasResponse?.results || marcasResponse?.data || []);

          const marcaEncontrada = marcas.find((m: any) =>
            m.nombre?.toLowerCase() === solicitud.vehiculo_info.marca?.toLowerCase() ||
            m.id === solicitud.vehiculo_info.marca
          );

          if (marcaEncontrada) {
            // Obtener servicios del proveedor filtrados por marca
            const serviciosResponse = await serviciosAPI.obtenerServiciosPorMarca(marcaEncontrada.id);
            // Asegurarse de que sea un array
            const servicios = Array.isArray(serviciosResponse)
              ? serviciosResponse
              : (serviciosResponse?.results || serviciosResponse?.data || []);

            // Convertir a formato ServicioSolicitado
            const serviciosFormateados = servicios.map((s: any) => ({
              id: s.servicio_info?.id || s.servicio || s.id,
              nombre: s.servicio_info?.nombre || s.nombre,
              descripcion: s.servicio_info?.descripcion || s.descripcion,
              categoria: s.servicio_info?.categoria || s.categoria,
            }));
            setServiciosDisponibles(serviciosFormateados);
          } else {
            console.warn('No se encontró la marca del vehículo:', solicitud.vehiculo_info.marca);
            setServiciosDisponibles([]);
          }
        } catch (error) {
          console.error('Error cargando servicios disponibles:', error);
          setServiciosDisponibles([]);
        } finally {
          setCargandoServicios(false);
        }
      };

      cargarServiciosDisponibles();
    }
  }, [esOfertaSecundaria, solicitud.vehiculo_info?.marca]);

  // Inicializar servicios con todos preseleccionados (solo para ofertas originales)
  useEffect(() => {
    if (!esOfertaSecundaria && solicitud.servicios_solicitados_detail) {
      // Si la solicitud no requiere repuestos, forzar tipoServicio a 'sin_repuestos'
      const tipoServicioInicial: 'con_repuestos' | 'sin_repuestos' = solicitud.requiere_repuestos === false ? 'sin_repuestos' : 'con_repuestos';
      const servicios = solicitud.servicios_solicitados_detail.map(servicio => ({
        servicio,
        precio: '',
        tiempo_estimado: '',
        notas: '',
        servicioConfigurado: null,
        usandoServicioConfigurado: false,
        costoManoObra: '',
        repuestos: [],
        tipoServicio: tipoServicioInicial,
        loadingServicioConfigurado: false,
      }));
      setServiciosOferta(servicios);
    } else if (esOfertaSecundaria) {
      // Para ofertas secundarias, empezar con lista vacía
      setServiciosOferta([]);
    }
  }, [solicitud, esOfertaSecundaria]);

  // Cargar servicios configurados después de inicializar servicios
  // NOTA: Solo para ofertas originales, no para ofertas secundarias
  useEffect(() => {
    // No cargar servicios configurados para ofertas secundarias
    if (esOfertaSecundaria) {
      return;
    }

    // Esperar a que serviciosOferta esté completamente inicializado
    if (serviciosOferta.length === 0 || !solicitud.id) {
      return;
    }

    // Verificar que todos los servicios tengan estructura válida
    const serviciosValidos = serviciosOferta.every(s =>
      s &&
      s.servicio &&
      s.servicio.id !== undefined &&
      s.servicio.id !== null &&
      typeof s.servicio.id === 'number'
    );

    if (!serviciosValidos) {
      console.error('❌ Algunos servicios no tienen estructura válida:',
        serviciosOferta.map((s, idx) => ({
          index: idx,
          tieneServicio: !!s?.servicio,
          servicioId: s?.servicio?.id,
          tipoId: typeof s?.servicio?.id
        }))
      );
      return;
    }

    console.log('🔄 Iniciando carga de servicios configurados...', {
      cantidadServicios: serviciosOferta.length,
      solicitudId: solicitud.id,
      servicios: serviciosOferta.map((s, idx) => ({
        index: idx,
        nombre: s.servicio.nombre,
        servicioId: s.servicio.id,
        tipoId: typeof s.servicio.id
      }))
    });

    const cargarServicios = async () => {
      for (let index = 0; index < serviciosOferta.length; index++) {
        // Obtener el servicio actual del estado en cada iteración
        const servicio = serviciosOferta[index];

        // Verificar que el servicio tenga estructura válida
        if (!servicio || !servicio.servicio || servicio.servicio.id === undefined || servicio.servicio.id === null) {
          console.error(`❌ Servicio ${index} no tiene estructura válida:`, servicio);
          continue;
        }

        console.log(`📋 Servicio ${index}:`, {
          nombre: servicio.servicio.nombre,
          servicioId: servicio.servicio.id,
          tipoId: typeof servicio.servicio.id,
          tieneConfigurado: !!servicio.servicioConfigurado,
          estaCargando: servicio.loadingServicioConfigurado
        });

        if (!servicio.servicioConfigurado && !servicio.loadingServicioConfigurado) {
          console.log(`🚀 Cargando servicio configurado para índice ${index}...`);
          await cargarServicioConfigurado(index);
        }
      }
    };

    // Pequeño delay para asegurar que el estado esté completamente actualizado
    const timeoutId = setTimeout(() => {
      cargarServicios();
    }, 100);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviciosOferta.length, solicitud.id, esOfertaSecundaria]);

  // Función para cargar servicio configurado
  const cargarServicioConfigurado = React.useCallback(async (index: number) => {
    if (!solicitud.id) {
      console.warn('⚠️ No hay solicitud.id disponible');
      return;
    }

    // Obtener el servicio actual del estado directamente
    const servicioActual = serviciosOferta[index];

    if (!servicioActual) {
      console.error(`❌ No existe servicio en índice ${index}. Total servicios: ${serviciosOferta.length}`);
      return;
    }

    if (servicioActual.loadingServicioConfigurado) {
      console.warn(`⚠️ Servicio ${index} ya está cargando`);
      return;
    }

    // Verificar que el servicio tenga la estructura correcta
    if (!servicioActual.servicio) {
      console.error(`❌ Servicio en índice ${index} no tiene estructura válida:`, servicioActual);
      return;
    }

    // Asegurar que servicioId sea un número
    const rawId = servicioActual.servicio.id;

    if (rawId === undefined || rawId === null) {
      console.error(`❌ servicio.id es undefined o null:`, {
        servicio: servicioActual.servicio,
        rawId,
        tipo: typeof rawId,
        servicioCompleto: servicioActual
      });
      return;
    }

    const servicioId = typeof rawId === 'number' ? rawId : parseInt(String(rawId), 10);

    if (isNaN(servicioId)) {
      console.error(`❌ servicioId no es un número válido:`, {
        rawId,
        tipo: typeof rawId,
        servicioCompleto: servicioActual.servicio
      });
      return;
    }

    console.log(`✅ servicioId válido obtenido: ${servicioId} (tipo: ${typeof servicioId})`);

    // Marcar como cargando
    setServiciosOferta(prev => {
      const nuevos = [...prev];
      if (nuevos[index]) {
        nuevos[index].loadingServicioConfigurado = true;
      }
      return nuevos;
    });

    try {
      console.log(`🔍 Buscando servicio configurado:`, {
        solicitudId: solicitud.id,
        servicioId: servicioId,
        servicioNombre: servicioActual.servicio.nombre,
        vehiculoMarca: solicitud.vehiculo_info?.marca,
        vehiculoModelo: solicitud.vehiculo_info?.modelo
      });

      // Buscar servicio configurado
      const servicioConfigurado = await serviciosProveedorAPI.obtenerServicioParaSolicitud(
        solicitud.id,
        servicioId
      );

      console.log(`📦 Resultado para servicio ${servicioId}:`, {
        encontrado: !!servicioConfigurado,
        nombre: servicioConfigurado?.servicio_info?.nombre,
        tipo: servicioConfigurado?.tipo_servicio,
        marca: servicioConfigurado?.marca_vehiculo_info?.nombre,
        debug_info: servicioConfigurado ? null : 'Revisar logs del backend para más detalles'
      });

      // Actualizar con servicio configurado encontrado
      setServiciosOferta(prev => {
        const nuevos = [...prev];
        if (!nuevos[index]) return prev;

        nuevos[index].servicioConfigurado = servicioConfigurado;
        nuevos[index].loadingServicioConfigurado = false;

        // NO activar automáticamente - dejar que el usuario decida
        // Si se encontró un servicio configurado, solo guardarlo pero no activarlo
        // El usuario puede elegir usarlo o crear manualmente

        return nuevos;
      });
    } catch (error) {
      console.error(`❌ Error cargando servicio configurado para servicio ${index}:`, error);
      setServiciosOferta(prev => {
        const nuevos = [...prev];
        if (!nuevos[index]) return prev;
        nuevos[index].loadingServicioConfigurado = false;
        return nuevos;
      });
    }
  }, [solicitud.id, serviciosOferta]);

  // Función para usar servicio configurado
  const usarServicioConfigurado = (index: number) => {
    const servicio = serviciosOferta[index];
    if (!servicio.servicioConfigurado) return;

    const nuevos = [...serviciosOferta];
    const configurado = servicio.servicioConfigurado;

    // Pre-cargar información del servicio configurado
    nuevos[index].usandoServicioConfigurado = true;

    // Si la solicitud no requiere repuestos, forzar tipoServicio a 'sin_repuestos'
    // NOTA: Esta validación NO aplica para ofertas secundarias
    if (!esOfertaSecundaria && solicitud.requiere_repuestos === false) {
      nuevos[index].tipoServicio = 'sin_repuestos';
      nuevos[index].repuestos = [];
    } else {
      nuevos[index].tipoServicio = configurado.tipo_servicio;

      // Pre-cargar repuestos solo si la solicitud requiere repuestos o es oferta secundaria
      if (configurado.repuestos_info_detallado && configurado.repuestos_info_detallado.length > 0) {
        nuevos[index].repuestos = configurado.repuestos_info_detallado.map(rep => ({
          ...rep,
          cantidad: rep.cantidad_estimada || 1,
        }));
      }
    }

    nuevos[index].costoManoObra = configurado.costo_mano_de_obra_sin_iva || '0';

    // Calcular precio total inicial
    const costoManoObra = parseFloat(configurado.costo_mano_de_obra_sin_iva || '0');
    // Solo incluir repuestos si la solicitud los requiere o es oferta secundaria
    const costoRepuestos = (!esOfertaSecundaria && solicitud.requiere_repuestos === false) ? 0 : parseFloat(configurado.costo_repuestos_sin_iva || '0');
    // Incluir gestión de compra si hay repuestos
    const gestionCompra = (nuevos[index].tipoServicio === 'con_repuestos' && nuevos[index].repuestos.length > 0)
      ? parseFloat(costoGestionCompra || '0')
      : 0;
    const costoTotalSinIva = costoManoObra + costoRepuestos + gestionCompra;
    const iva = costoTotalSinIva * 0.19;
    const precioTotal = costoTotalSinIva + iva;

    nuevos[index].precio = precioTotal.toFixed(2);

    // Pre-cargar tiempo estimado desde duracion_estimada (formato HH:MM:SS o HH:MM)
    if (configurado.duracion_estimada) {
      const tiempoParts = configurado.duracion_estimada.split(':');
      if (tiempoParts.length >= 2) {
        const horas = parseFloat(tiempoParts[0]) || 0;
        const minutos = parseFloat(tiempoParts[1]) || 0;
        const tiempoEnHoras = horas + (minutos / 60);
        nuevos[index].tiempo_estimado = tiempoEnHoras.toFixed(1);
      }
    }

    // Pre-cargar descripción si existe
    if (configurado.detalles_adicionales && !descripcionOferta) {
      setDescripcionOferta(configurado.detalles_adicionales);
    }

    setServiciosOferta(nuevos);
  };

  // Función para cambiar a modo manual
  const cambiarAModoManual = (index: number) => {
    const nuevos = [...serviciosOferta];
    nuevos[index].usandoServicioConfigurado = false;

    // Si la solicitud no requiere repuestos, forzar tipoServicio a 'sin_repuestos' y limpiar repuestos
    // NOTA: Esta validación NO aplica para ofertas secundarias
    if (!esOfertaSecundaria && solicitud.requiere_repuestos === false) {
      nuevos[index].tipoServicio = 'sin_repuestos';
      nuevos[index].repuestos = [];
    }

    setServiciosOferta(nuevos);
  };

  // Actualizar costo de mano de obra
  const actualizarCostoManoObra = (index: number, valor: string) => {
    const nuevos = [...serviciosOferta];
    nuevos[index].costoManoObra = valor;

    // SIEMPRE recalcular precio total automáticamente
    const costoManoObra = parseFloat(valor || '0');
    const costoRepuestos = nuevos[index].repuestos.reduce((total, rep) => {
      // CORRECCIÓN: Usar precio personalizado del proveedor si existe, sino usar precio_referencia del catálogo
      const precioUnitario = rep.precio !== undefined && rep.precio !== null ? rep.precio : (rep.precio_referencia || 0);
      return total + (rep.cantidad || 0) * precioUnitario;
    }, 0);
    // Incluir gestión de compra si hay repuestos
    const gestionCompra = nuevos[index].tipoServicio === 'con_repuestos' && nuevos[index].repuestos.length > 0
      ? parseFloat(costoGestionCompra || '0')
      : 0;
    const costoTotalSinIva = costoManoObra + costoRepuestos + gestionCompra;
    const iva = costoTotalSinIva * 0.19;
    const precioTotal = costoTotalSinIva + iva;

    nuevos[index].precio = precioTotal.toFixed(2);
    setServiciosOferta(nuevos);
  };

  // Actualizar repuestos
  const actualizarRepuestos = (index: number, repuestos: RepuestoEditable[]) => {
    // En ofertas secundarias, permitir repuestos libremente
    // En ofertas originales, respetar requiere_repuestos
    if (!esOfertaSecundaria && solicitud.requiere_repuestos === false && repuestos.length > 0) {
      Alert.alert(
        'No se permiten repuestos',
        'Esta solicitud solo requiere mano de obra. No se pueden agregar repuestos.'
      );
      return;
    }

    const nuevos = [...serviciosOferta];
    nuevos[index].repuestos = repuestos;

    // SIEMPRE recalcular precio total automáticamente
    const costoManoObra = parseFloat(nuevos[index].costoManoObra || '0');
    const costoRepuestos = repuestos.reduce((total, rep) => {
      // CORRECCIÓN: Usar precio personalizado del proveedor si existe, sino usar precio_referencia del catálogo
      const precioUnitario = rep.precio !== undefined && rep.precio !== null ? rep.precio : (rep.precio_referencia || 0);
      return total + (rep.cantidad || 0) * precioUnitario;
    }, 0);
    // Incluir gestión de compra si hay repuestos
    const gestionCompra = nuevos[index].tipoServicio === 'con_repuestos' && repuestos.length > 0
      ? parseFloat(costoGestionCompra || '0')
      : 0;
    const costoTotalSinIva = costoManoObra + costoRepuestos + gestionCompra;
    const iva = costoTotalSinIva * 0.19;
    const precioTotal = costoTotalSinIva + iva;

    nuevos[index].precio = precioTotal.toFixed(2);
    setServiciosOferta(nuevos);
  };

  // Actualizar precio - Ya no se usa porque el precio es automático
  // Mantenemos la función por compatibilidad pero no debería ser llamada
  const actualizarPrecio = (index: number, valor: string) => {
    // El precio ahora es calculado automáticamente, no se puede editar manualmente
    // Esta función se mantiene por compatibilidad pero no hace nada
  };

  // Actualizar tiempo estimado
  const actualizarTiempoEstimado = (index: number, valor: string) => {
    const nuevos = [...serviciosOferta];
    nuevos[index].tiempo_estimado = valor;
    setServiciosOferta(nuevos);
  };

  // Recalcular precios cuando cambia el costo de gestión de compra
  useEffect(() => {
    if (costoGestionCompra) {
      const nuevos = [...serviciosOferta];
      let hayCambios = false;

      nuevos.forEach((servicio, index) => {
        // Solo recalcular si tiene repuestos
        if (servicio.tipoServicio === 'con_repuestos' && servicio.repuestos.length > 0) {
          const costoManoObra = parseFloat(servicio.costoManoObra || '0');
          const costoRepuestos = servicio.repuestos.reduce((total, rep) => {
            const precioUnitario = rep.precio !== undefined && rep.precio !== null ? rep.precio : (rep.precio_referencia || 0);
            return total + (rep.cantidad || 0) * precioUnitario;
          }, 0);
          const gestionCompra = parseFloat(costoGestionCompra || '0');
          const costoTotalSinIva = costoManoObra + costoRepuestos + gestionCompra;
          const iva = costoTotalSinIva * 0.19;
          const precioTotal = costoTotalSinIva + iva;

          const nuevoPrecio = precioTotal.toFixed(2);
          if (servicio.precio !== nuevoPrecio) {
            nuevos[index].precio = nuevoPrecio;
            hayCambios = true;
          }
        }
      });

      if (hayCambios) {
        setServiciosOferta(nuevos);
      }
    }
  }, [costoGestionCompra]);

  // Actualizar notas
  const actualizarNotas = (index: number, valor: string) => {
    const nuevos = [...serviciosOferta];
    nuevos[index].notas = valor;
    setServiciosOferta(nuevos);
  };

  // Verificar si el proveedor tiene servicio configurado con repuestos
  const tieneServicioConfiguradoConRepuestos = (index: number): boolean => {
    const servicio = serviciosOferta[index];
    return !!(
      servicio.servicioConfigurado &&
      servicio.servicioConfigurado.tipo_servicio === 'con_repuestos' &&
      servicio.servicioConfigurado.repuestos_info_detallado &&
      servicio.servicioConfigurado.repuestos_info_detallado.length > 0
    );
  };

  // Agregar servicio desde lista disponible (solo para ofertas secundarias)
  const agregarServicioDesdeLista = (servicio: { id: number; nombre: string; descripcion?: string }) => {
    // Verificar que no esté ya agregado
    if (serviciosOferta.some(s => s.servicio.id === servicio.id)) {
      Alert.alert('Servicio ya agregado', 'Este servicio ya está en la lista');
      return;
    }

    const nuevoServicio: ServicioOferta = {
      servicio: {
        id: servicio.id,
        nombre: servicio.nombre,
        descripcion: servicio.descripcion,
        categoria: undefined,
      },
      precio: '',
      tiempo_estimado: '',
      notas: '',
      servicioConfigurado: null,
      usandoServicioConfigurado: false,
      costoManoObra: '',
      repuestos: [],
      tipoServicio: 'con_repuestos', // Por defecto con repuestos, el usuario puede cambiar
      loadingServicioConfigurado: false,
    };

    // Actualizar el estado - el useEffect existente se encargará de cargar la configuración
    setServiciosOferta(prev => [...prev, nuevoServicio]);
    setMostrarSelectorServicios(false);
  };

  // Agregar servicio manualmente (solo para ofertas secundarias)
  const agregarServicioManual = () => {
    Alert.prompt(
      'Agregar Servicio Manual',
      'Ingresa el nombre del servicio:',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Agregar',
          onPress: (nombre: string | undefined) => {
            if (!nombre || nombre.trim() === '') {
              Alert.alert('Error', 'Debes ingresar un nombre para el servicio');
              return;
            }

            const nuevoServicio: ServicioOferta = {
              servicio: {
                id: Date.now(), // ID temporal para servicios manuales
                nombre: nombre.trim(),
                descripcion: undefined,
                categoria: undefined,
              },
              precio: '',
              tiempo_estimado: '',
              notas: '',
              servicioConfigurado: null,
              usandoServicioConfigurado: false,
              costoManoObra: '',
              repuestos: [],
              tipoServicio: 'con_repuestos',
              loadingServicioConfigurado: false,
            };

            setServiciosOferta([...serviciosOferta, nuevoServicio]);
          },
        },
      ],
      'plain-text'
    );
  };

  // Eliminar servicio (solo para ofertas secundarias)
  const eliminarServicio = (index: number) => {
    Alert.alert(
      'Eliminar Servicio',
      `¿Estás seguro de que deseas eliminar "${serviciosOferta[index].servicio.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const nuevos = serviciosOferta.filter((_, i) => i !== index);
            setServiciosOferta(nuevos);
          },
        },
      ]
    );
  };

  // Calcular precio total
  const calcularPrecioTotal = (): number => {
    const precioServicios = serviciosOferta.reduce((total, s) => {
      const precio = parseFloat(s.precio || '0');
      return total + precio;
    }, 0);

    return precioServicios;
  };

  // Calcular costo total de repuestos (sin IVA)
  const calcularCostoRepuestos = (): number => {
    const total = serviciosOferta.reduce((total, s) => {
      if (s.tipoServicio !== 'con_repuestos') return total;

      const costoRepuestos = s.repuestos.reduce((subtotal, rep) => {
        // CORRECCIÓN: Usar precio personalizado del proveedor si existe, sino usar precio_referencia del catálogo
        const precioUnitario = rep.precio !== undefined && rep.precio !== null ? rep.precio : (rep.precio_referencia || 0);
        return subtotal + (precioUnitario * (rep.cantidad || 1));
      }, 0);
      return total + costoRepuestos;
    }, 0);

    return total;
  };

  // Calcular costo total de mano de obra (sin IVA)
  const calcularCostoManoObra = (): number => {
    const total = serviciosOferta.reduce((total, s) => {
      const costoManoObra = parseFloat(s.costoManoObra || '0');
      return total + costoManoObra;
    }, 0);

    return total;
  };

  // Calcular tiempo total estimado (en horas)
  const calcularTiempoTotal = (): string => {
    const totalHoras = serviciosOferta.reduce((total, s) => {
      const horas = parseFloat(s.tiempo_estimado || '0');
      return total + horas;
    }, 0);

    if (totalHoras < 1) {
      return `${Math.round(totalHoras * 60)} minutos`;
    } else if (totalHoras < 24) {
      return `${totalHoras.toFixed(1)} horas`;
    } else {
      const dias = Math.floor(totalHoras / 24);
      const horas = totalHoras % 24;
      return `${dias} día${dias !== 1 ? 's' : ''} ${horas > 0 ? `${Math.round(horas)} hora${horas !== 1 ? 's' : ''}` : ''}`;
    }
  };

  // Validar formulario
  const validarFormulario = (): boolean => {
    // Validar que si la solicitud no requiere repuestos, no haya repuestos en ningún servicio
    // NOTA: Esta validación NO aplica para ofertas secundarias, donde el proveedor tiene libertad total
    if (!esOfertaSecundaria && solicitud.requiere_repuestos === false) {
      for (const servicio of serviciosOferta) {
        if (servicio.repuestos && servicio.repuestos.length > 0) {
          Alert.alert(
            'Error',
            'Esta solicitud no requiere repuestos. Solo se permite ofertar mano de obra. Por favor, elimina todos los repuestos de la oferta.'
          );
          return false;
        }
        if (servicio.tipoServicio === 'con_repuestos') {
          Alert.alert(
            'Error',
            'Esta solicitud no requiere repuestos. Solo se permite ofertar mano de obra.'
          );
          return false;
        }
      }
    }

    for (const servicio of serviciosOferta) {
      if (!servicio.precio || parseFloat(servicio.precio) <= 0) {
        Alert.alert('Error', `Debes ingresar un precio válido para ${servicio.servicio.nombre}`);
        return false;
      }

      if (!servicio.tiempo_estimado || parseFloat(servicio.tiempo_estimado) <= 0) {
        Alert.alert('Error', `Debes ingresar el tiempo estimado para ${servicio.servicio.nombre}`);
        return false;
      }
    }

    if (!descripcionOferta.trim()) {
      Alert.alert('Error', 'Debes ingresar una descripción de la oferta');
      return false;
    }

    // Validar disponibilidad alternativa si no puede en la fecha solicitada
    // NOTA: Esta validación NO aplica para ofertas secundarias, donde el proveedor elige libremente la fecha
    if (!esOfertaSecundaria && !puedeFechaSolicitada && !razonCambioFecha.trim()) {
      Alert.alert('Error', 'Debes indicar por qué no puedes atender en la fecha solicitada');
      return false;
    }

    return true;
  };

  // Enviar oferta
  const handleSubmit = () => {
    if (!validarFormulario()) return;

    const detallesServicios: DetalleServicioOferta[] = serviciosOferta.map(s => {
      const tiempoHoras = parseFloat(s.tiempo_estimado || '0');

      // Preparar repuestos seleccionados en formato para backend
      // IMPORTANTE: Incluir el precio personalizado del proveedor si existe
      const repuestosSeleccionados = s.repuestos.map(rep => ({
        id: rep.id,
        cantidad: rep.cantidad || 1,
        precio: rep.precio !== undefined && rep.precio !== null ? rep.precio : rep.precio_referencia,
      }));

      return {
        servicio: s.servicio.id,
        precio_servicio: s.precio,
        tiempo_estimado_horas: tiempoHoras,
        notas: s.notas || undefined,
        repuestos_seleccionados: repuestosSeleccionados.length > 0 ? repuestosSeleccionados : undefined,
      };
    });

    // Usar fecha solicitada del cliente o la alternativa
    let fechaFormateada: string;
    let horaFormateada: string;

    // Para ofertas secundarias, siempre usar fecha alternativa (el proveedor elige libremente)
    if (esOfertaSecundaria || !puedeFechaSolicitada) {
      // Usar fecha alternativa del proveedor
      fechaFormateada = fechaAlternativa.toISOString().split('T')[0];
      horaFormateada = horaAlternativa.toTimeString().split(' ')[0].substring(0, 5);
    } else {
      // Usar la fecha que el cliente solicitó (solo para ofertas originales)
      fechaFormateada = solicitud.fecha_preferida;
      horaFormateada = solicitud.hora_preferida || '10:00';
    }

    // Calcular tiempo total en formato Duration (HH:MM:SS)
    const tiempoTotalHoras = serviciosOferta.reduce((total, s) => {
      return total + parseFloat(s.tiempo_estimado || '0');
    }, 0);
    const horas = Math.floor(tiempoTotalHoras);
    const minutos = Math.round((tiempoTotalHoras - horas) * 60);
    const tiempoEstimadoTotal = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:00`;

    // Determinar si incluye repuestos (si al menos un servicio tiene repuestos)
    const incluyeRepuestos = serviciosOferta.some(
      s => s.usandoServicioConfigurado && s.tipoServicio === 'con_repuestos' && s.repuestos.length > 0
    ) || serviciosOferta.some(s => !s.usandoServicioConfigurado && parseFloat(s.precio || '0') > 0);

    // Calcular costos de desglose
    let costoRepuestos = calcularCostoRepuestos();
    let costoManoObra = calcularCostoManoObra();
    const precioTotalCalculado = calcularPrecioTotal();

    // FIX: Si hay repuestos pero costoManoObra es 0, calcular automáticamente el desglose
    // basándose en el precio total ingresado por el proveedor
    if (incluyeRepuestos && costoManoObra === 0 && precioTotalCalculado > 0) {
      // El precio total incluye IVA, calculamos el precio sin IVA
      const precioSinIva = precioTotalCalculado / 1.19;

      // Si hay repuestos calculados, usar ese valor
      // Si no, asumir que el 60% es mano de obra y 40% repuestos (proporción típica)
      if (costoRepuestos > 0) {
        // costoManoObra = precioSinIva - costoRepuestos
        costoManoObra = Math.max(0, precioSinIva - costoRepuestos);
      } else {
        // No hay repuestos calculados pero incluye_repuestos es true
        // Usar proporción estimada: 60% mano de obra, 40% repuestos
        costoManoObra = precioSinIva * 0.6;
        costoRepuestos = precioSinIva * 0.4;
      }

      console.log('📊 FormularioOferta: Calculando desglose automático:', {
        precioTotalCalculado,
        precioSinIva,
        costoRepuestosCalculado: costoRepuestos,
        costoManoObraCalculado: costoManoObra,
      });
    }

    // Obtener el costo de gestión de compra (solo aplica si incluye repuestos)
    const gestionCompra = incluyeRepuestos ? parseFloat(costoGestionCompra || '0') : 0;

    // Calcular precio total final incluyendo gestión de compra
    // precioTotalCalculado ya incluye IVA de (mano de obra + repuestos)
    // Ahora agregamos gestión de compra con su IVA
    const gestionCompraConIva = gestionCompra * 1.19;
    const precioTotalFinal = precioTotalCalculado + gestionCompraConIva;

    onSubmit({
      servicios_ofertados: serviciosOferta.map(s => s.servicio.id),
      detalles_servicios: detallesServicios,
      precio_total_ofrecido: precioTotalFinal.toFixed(2),
      incluye_repuestos: incluyeRepuestos,
      tiempo_estimado_total: tiempoEstimadoTotal,
      descripcion_oferta: descripcionOferta,
      garantia_ofrecida: garantiaOfrecida || undefined,
      fecha_disponible: fechaFormateada,
      hora_disponible: horaFormateada,
      // Campos de desglose para ofertas con repuestos
      costo_repuestos: incluyeRepuestos ? costoRepuestos.toFixed(2) : '0',
      costo_mano_obra: costoManoObra.toFixed(2),
      costo_gestion_compra: incluyeRepuestos ? gestionCompra.toFixed(2) : '0',
    });
  };

  const precioTotalServicios = calcularPrecioTotal();
  const tiempoTotal = calcularTiempoTotal();

  // Calcular precio total REAL incluyendo gestión de compra con IVA
  const gestionCompraValor = parseFloat(costoGestionCompra || '0');
  const tieneRepuestos = serviciosOferta.some(s => s.tipoServicio === 'con_repuestos');
  const gestionCompraConIva = tieneRepuestos ? gestionCompraValor * 1.19 : 0;
  const precioTotal = precioTotalServicios + gestionCompraConIva;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 75 + bottomInset }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header minimalista */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>
                Nueva Oferta
              </Text>
              <Text style={styles.headerSubtitle}>
                Completa la información para enviar tu oferta
              </Text>
            </View>
          </View>
        </View>

        {/* Servicios solicitados - Sin checkboxes, todos incluidos */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionTitle}>
              {esOfertaSecundaria ? 'Servicios Adicionales' : 'Servicios Solicitados'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {esOfertaSecundaria
                ? 'Selecciona o agrega servicios adicionales para esta oferta'
                : 'Completa los precios y tiempos para cada servicio'}
            </Text>
          </View>

          {/* Selector de servicios para ofertas secundarias */}
          {esOfertaSecundaria && (
            <>
              <View style={styles.agregarServiciosContainer}>
                <TouchableOpacity
                  style={styles.agregarServicioButton}
                  onPress={() => setMostrarSelectorServicios(!mostrarSelectorServicios)}
                >
                  <MaterialIcons name="add-circle" size={20} color="#0061FF" />
                  <Text style={styles.agregarServicioButtonText}>
                    Agregar Servicio
                  </Text>
                  <MaterialIcons
                    name={mostrarSelectorServicios ? "expand-less" : "expand-more"}
                    size={20}
                    color="#0061FF"
                  />
                </TouchableOpacity>

                {mostrarSelectorServicios && (
                  <View style={styles.selectorServiciosContainer}>
                    {cargandoServicios ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#0061FF" />
                        <Text style={styles.loadingText}>Cargando servicios...</Text>
                      </View>
                    ) : serviciosDisponibles.length > 0 ? (
                      <>
                        <Text style={styles.selectorServiciosTitle}>
                          Servicios Disponibles ({serviciosDisponibles.length})
                        </Text>
                        <View style={styles.serviciosGrid}>
                          {serviciosDisponibles.map((servicio) => {
                            const yaAgregado = serviciosOferta.some(s => s.servicio.id === servicio.id);
                            return (
                              <TouchableOpacity
                                key={servicio.id}
                                style={[
                                  styles.servicioCardSelector,
                                  yaAgregado && styles.servicioCardSelectorDisabled
                                ]}
                                onPress={() => !yaAgregado && agregarServicioDesdeLista(servicio)}
                                disabled={yaAgregado}
                              >
                                <View style={styles.servicioCardSelectorContent}>
                                  {yaAgregado ? (
                                    <View style={styles.servicioCardSelectorCheck}>
                                      <MaterialIcons name="check-circle" size={24} color="#10B981" />
                                    </View>
                                  ) : (
                                    <View style={styles.servicioCardSelectorIcon}>
                                      <MaterialIcons name="build" size={24} color="#0061FF" />
                                    </View>
                                  )}
                                  <Text
                                    style={[
                                      styles.servicioCardSelectorNombre,
                                      yaAgregado && styles.servicioCardSelectorNombreDisabled
                                    ]}
                                    numberOfLines={2}
                                  >
                                    {servicio.nombre}
                                  </Text>
                                  {servicio.descripcion && (
                                    <Text
                                      style={styles.servicioCardSelectorDescripcion}
                                      numberOfLines={2}
                                    >
                                      {servicio.descripcion}
                                    </Text>
                                  )}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    ) : (
                      <View style={styles.emptyServiciosContainer}>
                        <Text style={styles.emptyServiciosText}>
                          No hay servicios disponibles para esta marca
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Botón de agregar servicio manualmente - Fuera del desplegable, solo para ofertas secundarias */}
              <TouchableOpacity
                style={styles.agregarManualButtonOuter}
                onPress={agregarServicioManual}
              >
                <MaterialIcons name="edit" size={20} color="#666" />
                <Text style={styles.agregarManualButtonTextOuter}>
                  Agregar Servicio Manualmente
                </Text>
              </TouchableOpacity>
            </>
          )}

          {serviciosOferta.length === 0 && esOfertaSecundaria ? (
            <View style={styles.emptyServiciosMessage}>
              <MaterialIcons name="info-outline" size={24} color="#666" />
              <Text style={styles.emptyServiciosMessageText}>
                Agrega al menos un servicio para continuar
              </Text>
            </View>
          ) : (
            serviciosOferta.map((item, index) => {
              return (
                <View
                  key={`${item.servicio.id}-${index}`}
                  style={styles.servicioCard}
                >
                  <View style={styles.servicioHeader}>
                    <Text style={styles.servicioNombre}>
                      {item.servicio.nombre}
                    </Text>
                    {esOfertaSecundaria && (
                      <TouchableOpacity
                        onPress={() => eliminarServicio(index)}
                        style={styles.eliminarServicioButton}
                      >
                        <MaterialIcons name="delete-outline" size={20} color="#DC3545" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Selector de servicio configurado - Solo para ofertas originales, no para secundarias */}
                  {!esOfertaSecundaria && !item.usandoServicioConfigurado && (
                    <View style={styles.selectorContainer}>
                      <ServicioConfiguradoSelector
                        servicioConfigurado={item.servicioConfigurado}
                        loading={item.loadingServicioConfigurado}
                        onUsarServicioConfigurado={() => usarServicioConfigurado(index)}
                        onCrearManual={() => {
                          // Cambiar a modo manual: permitir edición directa del precio
                          const nuevos = [...serviciosOferta];
                          nuevos[index].usandoServicioConfigurado = false;
                          nuevos[index].precio = '';
                          nuevos[index].tiempo_estimado = '';
                          nuevos[index].costoManoObra = '';
                          nuevos[index].repuestos = [];
                          setServiciosOferta(nuevos);
                        }}
                        usandoServicioConfigurado={item.usandoServicioConfigurado}
                      />
                    </View>
                  )}

                  {/* Campos manuales - Mostrar cuando NO está usando servicio configurado */}
                  {!item.usandoServicioConfigurado && (
                    <View style={styles.servicioDetalles}>
                      {/* Mensaje informativo si la solicitud no requiere repuestos (solo para ofertas originales) */}
                      {!esOfertaSecundaria && solicitud.requiere_repuestos === false && (
                        <View style={styles.infoBox}>
                          <MaterialIcons name="info-outline" size={20} color="#FF9800" />
                          <Text style={styles.infoBoxText}>
                            Esta solicitud solo requiere mano de obra. No se pueden agregar repuestos.
                          </Text>
                        </View>
                      )}

                      {/* Tipo de servicio - Libre en ofertas secundarias */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>
                          Tipo de Servicio
                        </Text>
                        <View style={styles.tipoServicioContainer}>
                          <TouchableOpacity
                            style={[
                              styles.tipoServicioButton,
                              item.tipoServicio === 'con_repuestos' && styles.tipoServicioButtonSelected,
                              !esOfertaSecundaria && solicitud.requiere_repuestos === false && styles.tipoServicioButtonDisabled
                            ]}
                            onPress={() => {
                              if (!esOfertaSecundaria && solicitud.requiere_repuestos === false) return;
                              const nuevos = [...serviciosOferta];
                              nuevos[index].tipoServicio = 'con_repuestos';
                              setServiciosOferta(nuevos);
                            }}
                            disabled={!esOfertaSecundaria && solicitud.requiere_repuestos === false}
                          >
                            <Text style={[
                              styles.tipoServicioText,
                              item.tipoServicio === 'con_repuestos' && styles.tipoServicioTextSelected,
                              !esOfertaSecundaria && solicitud.requiere_repuestos === false && styles.tipoServicioTextDisabled
                            ]}>
                              Con Repuestos
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.tipoServicioButton,
                              item.tipoServicio === 'sin_repuestos' && styles.tipoServicioButtonSelected,
                              !esOfertaSecundaria && solicitud.requiere_repuestos === false && styles.tipoServicioButtonDisabled
                            ]}
                            onPress={() => {
                              if (!esOfertaSecundaria && solicitud.requiere_repuestos === false) return;
                              const nuevos = [...serviciosOferta];
                              nuevos[index].tipoServicio = 'sin_repuestos';
                              nuevos[index].repuestos = [];
                              setServiciosOferta(nuevos);
                              actualizarRepuestos(index, []);
                            }}
                            disabled={!esOfertaSecundaria && solicitud.requiere_repuestos === false}
                          >
                            <Text style={[
                              styles.tipoServicioText,
                              item.tipoServicio === 'sin_repuestos' && styles.tipoServicioTextSelected,
                              !esOfertaSecundaria && solicitud.requiere_repuestos === false && styles.tipoServicioTextDisabled
                            ]}>
                              Sin Repuestos
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Costo de mano de obra */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>
                          Costo Mano de Obra (sin IVA)
                        </Text>
                        <View style={styles.inputContainer}>
                          <Text style={styles.currencySymbol}>$</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="0"
                            placeholderTextColor="#999"
                            value={item.costoManoObra}
                            onChangeText={(text) => actualizarCostoManoObra(index, text)}
                            keyboardType="decimal-pad"
                          />
                        </View>
                      </View>

                      {/* Lista de repuestos - Solo si está configurado o es oferta secundaria */}
                      {item.tipoServicio === 'con_repuestos' && (esOfertaSecundaria || solicitud.requiere_repuestos !== false) && (
                        <View style={styles.inputGroup}>
                          {tieneServicioConfiguradoConRepuestos(index) || esOfertaSecundaria ? (
                            <RepuestosLista
                              repuestos={item.repuestos}
                              onRepuestosChange={(repuestos) => actualizarRepuestos(index, repuestos)}
                              editable={true}
                              mostrarTotal={true}
                              servicioId={esOfertaSecundaria ? item.servicio.id : undefined}
                            />
                          ) : (
                            <View style={styles.warningContainer}>
                              <MaterialIcons name="warning" size={40} color="#FFA000" />
                              <Text style={styles.warningTitle}>
                                Servicio sin repuestos configurados
                              </Text>
                              <Text style={styles.warningText}>
                                El cliente solicitó este servicio con repuestos, pero no tienes un servicio configurado con repuestos para {item.servicio.nombre}.
                              </Text>
                              <Text style={styles.warningSubtext}>
                                Tus opciones:
                              </Text>
                              <View style={styles.optionsList}>
                                <View style={styles.optionItem}>
                                  <Text style={styles.optionNumber}>1.</Text>
                                  <Text style={styles.optionText}>
                                    Cambia el selector arriba a "Sin repuestos" si puedes realizar el servicio sin materiales
                                  </Text>
                                </View>
                                <View style={styles.optionItem}>
                                  <Text style={styles.optionNumber}>2.</Text>
                                  <Text style={styles.optionText}>
                                    Ve a la pantalla de Servicios y configura este servicio con repuestos antes de enviar esta oferta
                                  </Text>
                                </View>
                              </View>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Precio Total - Automático */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>
                          Precio Total (con IVA)
                        </Text>
                        <View style={[styles.inputContainer, { backgroundColor: '#F5F5F5' }]}>
                          <Text style={styles.currencySymbol}>$</Text>
                          <TextInput
                            style={[styles.input, { color: '#666' }]}
                            placeholder="0"
                            placeholderTextColor="#999"
                            value={item.precio}
                            editable={false}
                            keyboardType="decimal-pad"
                          />
                        </View>
                        <Text style={styles.precioInfo}>
                          Calculado automáticamente (Mano de obra + Repuestos + Gestión de compra + IVA 19%)
                        </Text>
                      </View>

                      {/* Tiempo estimado y Notas - En modo manual también */}
                      <View style={styles.infoGroup}>
                        {/* Tiempo estimado */}
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>
                            Tiempo estimado (horas)
                          </Text>
                          <View style={styles.inputContainer}>
                            <TextInput
                              style={styles.input}
                              placeholder="Ej: 2.5"
                              placeholderTextColor="#999"
                              value={item.tiempo_estimado}
                              onChangeText={(text) => actualizarTiempoEstimado(index, text)}
                              keyboardType="decimal-pad"
                            />
                            <Text style={styles.unitText}>hrs</Text>
                          </View>
                        </View>

                        {/* Notas adicionales */}
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>
                            Notas adicionales (opcional)
                          </Text>
                          <TextInput
                            style={styles.textArea}
                            placeholder="Detalles o aclaraciones sobre este servicio..."
                            placeholderTextColor="#999"
                            value={item.notas}
                            onChangeText={(text) => actualizarNotas(index, text)}
                            multiline
                            numberOfLines={2}
                          />
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Indicador cuando se usa servicio configurado */}
                  {item.usandoServicioConfigurado && (
                    <View style={styles.configuradoBadge}>
                      <MaterialIcons name="check-circle" size={16} color="#10B981" />
                      <Text style={styles.configuradoText}>
                        Usando servicio configurado
                      </Text>
                      <TouchableOpacity
                        onPress={() => cambiarAModoManual(index)}
                        style={styles.cambiarLink}
                      >
                        <Text style={styles.cambiarLinkText}>Cambiar</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Campos cuando está usando servicio configurado */}
                  {item.usandoServicioConfigurado && (
                    <View style={styles.servicioDetalles}>
                      {/* Mensaje informativo si la solicitud no requiere repuestos (solo para ofertas originales) */}
                      {!esOfertaSecundaria && solicitud.requiere_repuestos === false && (
                        <View style={styles.infoBox}>
                          <MaterialIcons name="info-outline" size={20} color="#FF9800" />
                          <Text style={styles.infoBoxText}>
                            Esta solicitud solo requiere mano de obra. No se pueden agregar repuestos.
                          </Text>
                        </View>
                      )}

                      {/* Tipo de servicio - Libre en ofertas secundarias */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>
                          Tipo de Servicio
                        </Text>
                        <View style={styles.tipoServicioContainer}>
                          <TouchableOpacity
                            style={[
                              styles.tipoServicioButton,
                              item.tipoServicio === 'con_repuestos' && styles.tipoServicioButtonSelected,
                              !esOfertaSecundaria && solicitud.requiere_repuestos === false && styles.tipoServicioButtonDisabled
                            ]}
                            onPress={() => {
                              if (!esOfertaSecundaria && solicitud.requiere_repuestos === false) return;
                              const nuevos = [...serviciosOferta];
                              nuevos[index].tipoServicio = 'con_repuestos';
                              setServiciosOferta(nuevos);
                            }}
                            disabled={!esOfertaSecundaria && solicitud.requiere_repuestos === false}
                          >
                            <Text style={[
                              styles.tipoServicioText,
                              item.tipoServicio === 'con_repuestos' && styles.tipoServicioTextSelected,
                              !esOfertaSecundaria && solicitud.requiere_repuestos === false && styles.tipoServicioTextDisabled
                            ]}>
                              Con Repuestos
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.tipoServicioButton,
                              item.tipoServicio === 'sin_repuestos' && styles.tipoServicioButtonSelected,
                              !esOfertaSecundaria && solicitud.requiere_repuestos === false && styles.tipoServicioButtonDisabled
                            ]}
                            onPress={() => {
                              if (!esOfertaSecundaria && solicitud.requiere_repuestos === false) return;
                              const nuevos = [...serviciosOferta];
                              nuevos[index].tipoServicio = 'sin_repuestos';
                              nuevos[index].repuestos = [];
                              setServiciosOferta(nuevos);
                              actualizarRepuestos(index, []);
                            }}
                            disabled={!esOfertaSecundaria && solicitud.requiere_repuestos === false}
                          >
                            <Text style={[
                              styles.tipoServicioText,
                              item.tipoServicio === 'sin_repuestos' && styles.tipoServicioTextSelected,
                              !esOfertaSecundaria && solicitud.requiere_repuestos === false && styles.tipoServicioTextDisabled
                            ]}>
                              Sin Repuestos
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Lista de repuestos - Libre en ofertas secundarias */}
                      {item.tipoServicio === 'con_repuestos' && (esOfertaSecundaria || solicitud.requiere_repuestos !== false) && (
                        <View style={styles.inputGroup}>
                          <RepuestosLista
                            repuestos={item.repuestos}
                            onRepuestosChange={(repuestos) => actualizarRepuestos(index, repuestos)}
                            editable={true}
                            mostrarTotal={true}
                            servicioId={esOfertaSecundaria ? item.servicio.id : undefined}
                          />
                        </View>
                      )}

                      {/* Grupo de Precios - Costo Mano de Obra y Precio Total juntos */}
                      <View style={styles.preciosGroup}>
                        <Text style={styles.groupTitle}>Precios</Text>

                        {/* Costo de mano de obra */}
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>
                            Costo Mano de Obra (sin IVA)
                          </Text>
                          <View style={styles.inputContainer}>
                            <Text style={styles.currencySymbol}>$</Text>
                            <TextInput
                              style={styles.input}
                              placeholder="0"
                              placeholderTextColor="#999"
                              value={item.costoManoObra}
                              onChangeText={(text) => actualizarCostoManoObra(index, text)}
                              keyboardType="decimal-pad"
                            />
                          </View>
                        </View>

                        {/* Precio Total (calculado automáticamente) */}
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>
                            Precio Total (con IVA)
                          </Text>
                          <View style={[styles.inputContainer, { backgroundColor: '#F5F5F5' }]}>
                            <Text style={styles.currencySymbol}>$</Text>
                            <TextInput
                              style={[styles.input, { color: '#666' }]}
                              placeholder="0"
                              placeholderTextColor="#999"
                              value={item.precio}
                              editable={false}
                              keyboardType="decimal-pad"
                            />
                          </View>
                          <Text style={styles.precioInfo}>
                            Calculado automáticamente (Mano de obra + Repuestos + Gestión de compra + IVA 19%)
                          </Text>
                        </View>
                      </View>

                      {/* Tiempo estimado y Notas - Dentro de cada servicio */}
                      <View style={styles.infoGroup}>
                        {/* Tiempo estimado */}
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>
                            Tiempo estimado (horas)
                          </Text>
                          <View style={styles.inputContainer}>
                            <TextInput
                              style={styles.input}
                              placeholder="Ej: 2.5"
                              placeholderTextColor="#999"
                              value={item.tiempo_estimado}
                              onChangeText={(text) => actualizarTiempoEstimado(index, text)}
                              keyboardType="decimal-pad"
                            />
                            <Text style={styles.unitText}>hrs</Text>
                          </View>
                        </View>

                        {/* Notas adicionales */}
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>
                            Notas adicionales (opcional)
                          </Text>
                          <TextInput
                            style={styles.textArea}
                            placeholder="Detalles o aclaraciones sobre este servicio..."
                            placeholderTextColor="#999"
                            value={item.notas}
                            onChangeText={(text) => actualizarNotas(index, text)}
                            multiline
                            numberOfLines={2}
                          />
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Grupo de Información Adicional - Disponibilidad, Garantía, Descripción */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Información Adicional
          </Text>

          {/* Disponibilidad */}
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>
              {esOfertaSecundaria ? 'Fecha y Hora de Atención' : 'Disponibilidad'}
            </Text>
            {!esOfertaSecundaria && (
              <Text style={styles.sectionSubtitle}>
                Fecha solicitada: {new Date(solicitud.fecha_preferida).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
                {solicitud.hora_preferida && ` a las ${solicitud.hora_preferida}`}
              </Text>
            )}

            {esOfertaSecundaria ? (
              // En ofertas secundarias, siempre mostrar selector de fecha/hora moderno
              <View style={styles.fechaAlternativaContainer}>
                <Text style={styles.inputLabel}>Fecha de atención</Text>
                <ModernDatePicker
                  value={fechaAlternativa}
                  onDateChange={setFechaAlternativa}
                  label="Fecha de atención"
                  primaryColor={primaryColor}
                />

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Hora de atención</Text>
                <ModernTimePicker
                  value={horaAlternativa}
                  onTimeChange={setHoraAlternativa}
                  label="Hora de atención"
                  primaryColor={primaryColor}
                />
              </View>
            ) : (
              <>
                <View style={styles.disponibilidadOptions}>
                  <TouchableOpacity
                    style={[
                      styles.disponibilidadButton,
                      puedeFechaSolicitada && styles.disponibilidadButtonSelected
                    ]}
                    onPress={() => setPuedeFechaSolicitada(true)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.radioButton,
                      puedeFechaSolicitada && styles.radioButtonSelected
                    ]}>
                      {puedeFechaSolicitada && <View style={styles.radioButtonInner} />}
                    </View>
                    <Text style={styles.disponibilidadText}>
                      Sí, puedo atender en esa fecha
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.disponibilidadButton,
                      !puedeFechaSolicitada && styles.disponibilidadButtonSelected
                    ]}
                    onPress={() => setPuedeFechaSolicitada(false)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.radioButton,
                      !puedeFechaSolicitada && styles.radioButtonSelected
                    ]}>
                      {!puedeFechaSolicitada && <View style={styles.radioButtonInner} />}
                    </View>
                    <Text style={styles.disponibilidadText}>
                      No, necesito proponer otra fecha
                    </Text>
                  </TouchableOpacity>
                </View>

                {!puedeFechaSolicitada && (
                  <View style={styles.fechaAlternativaContainer}>
                    <Text style={styles.inputLabel}>Fecha alternativa</Text>
                    <ModernDatePicker
                      value={fechaAlternativa}
                      onDateChange={setFechaAlternativa}
                      label="Fecha alternativa"
                      primaryColor={primaryColor}
                    />

                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>Hora alternativa</Text>
                    <ModernTimePicker
                      value={horaAlternativa}
                      onTimeChange={setHoraAlternativa}
                      label="Hora alternativa"
                      primaryColor={primaryColor}
                    />

                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>Razón del cambio</Text>
                    <TextInput
                      style={styles.textArea}
                      placeholder="Explica por qué no puedes en la fecha solicitada..."
                      placeholderTextColor="#999"
                      value={razonCambioFecha}
                      onChangeText={setRazonCambioFecha}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                )}
              </>
            )}

            {/* Los pickers modernos ya están integrados arriba - no se necesitan componentes adicionales */}
          </View>

          {/* Descripción de la oferta */}
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>
              Descripción de la Oferta
            </Text>
            <Text style={styles.sectionSubtitle}>
              Explica cómo realizarás el trabajo, qué incluye, materiales que usarás, etc.
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe tu propuesta en detalle..."
              placeholderTextColor="#999"
              value={descripcionOferta}
              onChangeText={setDescripcionOferta}
              multiline
              numberOfLines={4}
            />
            <Text style={styles.characterCount}>
              {descripcionOferta.length} caracteres
            </Text>
          </View>

          {/* Garantía */}
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>
              Garantía Ofrecida
            </Text>
            <Text style={styles.sectionSubtitle}>
              Opcional - Agrega valor a tu oferta
            </Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="shield" size={20} color="#666" />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Ej: 6 meses o 10,000 km"
                placeholderTextColor="#999"
                value={garantiaOfrecida}
                onChangeText={setGarantiaOfrecida}
              />
            </View>
          </View>

          {/* Gestión de Compra de Repuestos - Solo visible cuando hay repuestos */}
          {serviciosOferta.some(s => s.tipoServicio === 'con_repuestos') && (
            <View style={styles.subsection}>
              <View style={styles.gestionCompraHeader}>
                <MaterialIcons name="local-shipping" size={22} color="#FF9800" />
                <Text style={styles.subsectionTitle}>
                  Gestión de Compra
                </Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Costo del traslado para comprar los repuestos. Ajústalo según la ubicación del cliente.
              </Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Ej: 15000"
                  placeholderTextColor="#999"
                  value={costoGestionCompra}
                  onChangeText={setCostoGestionCompra}
                  keyboardType="decimal-pad"
                />
              </View>
              <Text style={styles.gestionCompraInfo}>
                💡 Este valor se suma al precio de los repuestos cuando el cliente paga por adelantado
              </Text>
            </View>
          )}
        </View>

        {/* Resumen con desglose */}
        {serviciosOferta.length > 0 && precioTotal > 0 && (
          <View style={styles.resumenCard}>
            <Text style={styles.resumenTitle}>
              Resumen de tu Oferta
            </Text>

            <View style={styles.resumenDivider} />

            <View style={styles.resumenContent}>
              <View style={styles.resumenRow}>
                <Text style={styles.resumenLabel}>Servicios incluidos</Text>
                <Text style={styles.resumenValue}>
                  {serviciosOferta.length}
                </Text>
              </View>

              <View style={styles.resumenRow}>
                <Text style={styles.resumenLabel}>Tiempo total estimado</Text>
                <Text style={styles.resumenValue}>
                  {tiempoTotal}
                </Text>
              </View>

              {/* Desglose de costos */}
              {serviciosOferta.some(s => s.tipoServicio === 'con_repuestos' && s.repuestos.length > 0) && (
                <>
                  <View style={styles.resumenDivider} />
                  <Text style={styles.desgloseTitle}>
                    <MaterialIcons name="receipt-long" size={16} color="#666" /> Desglose de Costos
                  </Text>

                  <View style={styles.resumenRow}>
                    <Text style={styles.resumenLabel}>📦 Repuestos (sin IVA)</Text>
                    <Text style={styles.resumenValue}>
                      ${calcularCostoRepuestos().toLocaleString('es-CL')}
                    </Text>
                  </View>

                  <View style={styles.resumenRow}>
                    <Text style={styles.resumenLabel}>🔧 Mano de obra (sin IVA)</Text>
                    <Text style={styles.resumenValue}>
                      ${calcularCostoManoObra().toLocaleString('es-CL')}
                    </Text>
                  </View>

                  {gestionCompraValor > 0 && (
                    <View style={styles.resumenRow}>
                      <Text style={styles.resumenLabel}>🚚 Gestión de compra (sin IVA)</Text>
                      <Text style={styles.resumenValue}>
                        ${gestionCompraValor.toLocaleString('es-CL')}
                      </Text>
                    </View>
                  )}

                  <View style={[styles.resumenRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E0E0E0' }]}>
                    <Text style={[styles.resumenLabel, { fontWeight: '600' }]}>Subtotal (sin IVA)</Text>
                    <Text style={[styles.resumenValue, { fontWeight: '600' }]}>
                      ${(calcularCostoRepuestos() + calcularCostoManoObra() + gestionCompraValor).toLocaleString('es-CL')}
                    </Text>
                  </View>

                  <View style={styles.resumenRow}>
                    <Text style={styles.resumenLabel}>📋 IVA (19%)</Text>
                    <Text style={styles.resumenValue}>
                      ${Math.round((calcularCostoRepuestos() + calcularCostoManoObra() + gestionCompraValor) * 0.19).toLocaleString('es-CL')}
                    </Text>
                  </View>

                  <View style={styles.infoBoxDesglose}>
                    <MaterialIcons name="info-outline" size={16} color="#0061FF" />
                    <Text style={styles.infoBoxDesgloseText}>
                      El cliente podrá elegir pagar los repuestos por adelantado o pagar todo junto.
                    </Text>
                  </View>
                </>
              )}

              <View style={styles.resumenDivider} />

              <View style={[styles.resumenRow, styles.resumenPrecioRow]}>
                <Text style={styles.resumenPrecioLabel}>Precio Total</Text>
                <Text style={styles.resumenPrecioValue}>
                  ${precioTotal.toLocaleString('es-CL')}
                </Text>
              </View>
            </View>
          </View>
        )}

      </ScrollView>

      {/* Botones Fijos */}
      <View style={[styles.buttonsContainer, { paddingBottom: bottomInset }]}>
        {onCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={loading}
            activeOpacity={0.7}
          >
            <MaterialIcons name="cancel" size={20} color="#DC3545" />
            <Text style={styles.cancelButtonText}>
              Cancelar
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (loading || precioTotal === 0) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={loading || precioTotal === 0}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <MaterialIcons name="add-circle" size={24} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                Enviar Oferta
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 120, // Espacio para botones fijos + safe area
  },

  // Header minimalista
  headerCard: {
    marginBottom: 32,
  },
  headerRow: {
    marginBottom: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },

  // Secciones
  section: {
    marginBottom: 24,
  },
  subsection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  preciosGroup: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  infoGroup: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 12,
  },
  sectionHeaderContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },

  // Tarjetas de servicio minimalistas
  servicioCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  servicioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  servicioNombre: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  eliminarServicioButton: {
    padding: 4,
  },
  servicioDetalles: {
    gap: 16,
  },

  // Inputs minimalistas
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    padding: 0,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  unitText: {
    fontSize: 14,
    color: '#666',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: '#000',
    minHeight: 80,
    textAlignVertical: 'top',
    lineHeight: 22,
    backgroundColor: '#FFF',
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'right',
  },

  // Gestión de compra
  gestionCompraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  gestionCompraInfo: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 16,
  },

  // Card informativo
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F8F8F8',
    padding: 14,
    borderRadius: 8,
    marginBottom: 32,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },

  // Disponibilidad
  disponibilidadOptions: {
    gap: 12,
    marginTop: 16,
  },
  disponibilidadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  disponibilidadButtonSelected: {
    borderColor: '#000',
    backgroundColor: '#FAFAFA',
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#000',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#000',
  },
  disponibilidadText: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  fechaAlternativaContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  datePickerText: {
    flex: 1,
    fontSize: 15,
    color: '#000',
  },

  // Resumen minimalista
  resumenCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  resumenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  resumenDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginBottom: 16,
  },
  resumenContent: {
    gap: 12,
  },
  resumenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  resumenLabel: {
    fontSize: 15,
    color: '#666',
  },
  resumenValue: {
    fontSize: 15,
    color: '#000',
    fontWeight: '600',
  },
  resumenPrecioRow: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  resumenPrecioLabel: {
    fontSize: 16,
    color: '#000',
    fontWeight: '700',
  },
  resumenPrecioValue: {
    fontSize: 32,
    color: '#000',
    fontWeight: '800',
  },

  // Estilos para desglose de costos
  desgloseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  infoBoxDesglose: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    marginTop: 8,
  },
  infoBoxDesgloseText: {
    flex: 1,
    fontSize: 13,
    color: '#0061FF',
    lineHeight: 18,
  },

  // Botones minimalistas
  // Botones inferiores (fijos)
  buttonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    // paddingBottom se maneja dinámicamente con bottomInset
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DC3545',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC3545',
  },
  submitButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#0061FF',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Nuevos estilos para servicios configurados
  selectorContainer: {
    marginBottom: 16,
  },
  configuradoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  configuradoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  cambiarLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cambiarLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0061FF',
    textDecorationLine: 'underline',
  },
  tipoServicioContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  tipoServicioButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  tipoServicioButtonSelected: {
    borderColor: '#0061FF',
    backgroundColor: '#F0F7FF',
  },
  tipoServicioButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#F5F5F5',
  },
  tipoServicioText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tipoServicioTextSelected: {
    color: '#0061FF',
  },
  tipoServicioTextDisabled: {
    color: '#999',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    marginBottom: 16,
    gap: 8,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    fontWeight: '500',
  },
  precioInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
  // Estilos para ofertas secundarias
  agregarServiciosContainer: {
    marginBottom: 16,
  },
  agregarServicioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBDEFB',
    gap: 8,
  },
  agregarServicioButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0061FF',
  },
  selectorServiciosContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  selectorServiciosTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  serviciosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  servicioCardSelector: {
    width: '48%', // 2 columnas con espacio entre ellas
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 12,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  servicioCardSelectorDisabled: {
    opacity: 0.6,
    backgroundColor: '#F5F5F5',
    borderColor: '#D1D5DB',
  },
  servicioCardSelectorContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  servicioCardSelectorIcon: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
  },
  servicioCardSelectorCheck: {
    marginBottom: 8,
  },
  servicioCardSelectorNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 4,
  },
  servicioCardSelectorNombreDisabled: {
    color: '#999',
  },
  servicioCardSelectorDescripcion: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  // Estilos antiguos mantenidos para compatibilidad (no se usan en ofertas secundarias)
  serviciosLista: {
    maxHeight: 200,
  },
  servicioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  servicioItemDisabled: {
    opacity: 0.5,
    backgroundColor: '#F5F5F5',
  },
  servicioItemContent: {
    flex: 1,
    marginRight: 12,
  },
  servicioItemNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  servicioItemNombreDisabled: {
    color: '#999',
  },
  servicioItemDescripcion: {
    fontSize: 13,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 12,
  },
  agregarManualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
    gap: 8,
  },
  agregarManualButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  agregarManualButtonOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
    marginTop: 12,
    gap: 10,
  },
  agregarManualButtonTextOuter: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  emptyServiciosContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyServiciosText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyServiciosMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    gap: 12,
  },
  emptyServiciosMessageText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  // Estilos para mensajes de advertencia de repuestos
  warningContainer: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000',
    borderRadius: 12,
    padding: 20,
    marginVertical: 12,
    alignItems: 'center',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E65100',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  warningSubtext: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  optionsList: {
    width: '100%',
    marginTop: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  optionNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFA000',
    marginRight: 8,
    marginTop: 2,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});

