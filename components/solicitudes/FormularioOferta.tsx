import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
// DateTimePicker removido - ahora usamos modales personalizados
import { SolicitudPublica, ServicioSolicitado, DetalleServicioOferta } from '@/services/solicitudesService';
import { serviciosProveedorAPI, ServicioConfiguradoParaOferta, RepuestoDetallado } from '@/services/serviciosApi';
import { ServicioConfiguradoSelector } from './ServicioConfiguradoSelector';
import { RepuestosLista } from './RepuestosLista';
import {COLORS, withOpacity, SPACING, TYPOGRAPHY, BORDERS, SHADOWS, platformShadow} from '@/app/design-system/tokens';
import { useAuth } from '@/context/AuthContext';
import { useAlerts } from '@/context/AlertsContext';
import { obtenerEstadoCuenta } from '@/services/mercadoPagoProveedorService';
import serviceAreasApi from '@/services/serviceAreasApi';
import type { VerificacionCreditosOferta } from '@/services/creditosService';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { SafeAreaView } from 'react-native-safe-area-context';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;
const hx = SPACING.container.horizontal;
const lh = (fontSize: number, lineHeightMult: number) => Math.round(fontSize * lineHeightMult);
const PLACEHOLDER_INPUT = I.mutedSoft;

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
    es_fecha_alternativa?: boolean;
    motivo_fecha_alternativa?: string;
    // Campos de desglose para pagos separados
    costo_repuestos?: string;
    costo_mano_obra?: string;
    foto_cotizacion_repuestos?: string;
  }) => void;
  onCancel?: () => void;
  loading?: boolean;
  bottomInset?: number;
  esOfertaSecundaria?: boolean; // Nueva prop para ofertas secundarias
  /** Saldo vs créditos requeridos (solo oferta principal); se muestra como badge en la cabecera */
  verificacionCreditos?: VerificacionCreditosOferta | null;
  verificandoCreditos?: boolean;
  onPressComprarCreditos?: () => void;
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
  /** Si true, no se muestra el card "servicio configurado" (el usuario eligió crear manualmente). */
  omitirSelectorServicioConfigurado?: boolean;
}

// Componente DatePicker moderno con modal personalizado
const ModernDatePicker = ({
  value,
  onDateChange,
  label,
  primaryColor = I.primary
}: {
  value: Date;
  onDateChange: (date: Date) => void;
  label: string;
  primaryColor?: string;
}) => {
  const [showModal, setShowModal] = useState(false);
  const bgDefault = I.surfaceSoft;
  const textPrimary = I.ink;
  const textSecondary = I.muted;
  const borderLight = I.hairline;
  const spacingMd = SPACING.fixed.md;
  const spacingSm = SPACING.fixed.sm;
  const cardRadius = BORDERS.radius.lg;
  const fontSizeBase = TYPOGRAPHY.fontSize.base;
  const fontSizeLg = TYPOGRAPHY.fontSize.lg;
  const fontWeightSemibold = TYPOGRAPHY.fontWeight.semibold;
  const fontWeightBold = TYPOGRAPHY.fontWeight.bold;

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
        <InstitutionalIcon name="calendar" size={20} color={primaryColor}  strokeWidth={ICON_STROKE_WIDTH} />
        <Text style={{
          fontSize: fontSizeBase,
          fontWeight: fontWeightSemibold,
          color: textPrimary,
          flex: 1,
          marginHorizontal: spacingMd,
        }}>
          {formatearFechaDisplay(value)}
        </Text>
        <InstitutionalIcon name="chevron-down" size={20} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
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
                <InstitutionalIcon name="close" size={24} color={textSecondary}  strokeWidth={ICON_STROKE_WIDTH} />
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
                            color: estaSeleccionada ? I.onPrimary : textSecondary,
                            textTransform: 'uppercase',
                          }}>
                            {diaSemana}
                          </Text>
                        </View>
                        <Text style={{
                          fontSize: fontSizeBase,
                          fontWeight: estaSeleccionada ? fontWeightBold : fontWeightSemibold,
                          color: estaSeleccionada ? I.onPrimary : textPrimary,
                        }}>
                          {fechaDisplay}
                        </Text>
                      </View>
                      {estaSeleccionada && (
                        <InstitutionalIcon name="checkmark-circle" size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
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
  primaryColor = I.primary
}: {
  value: Date;
  onTimeChange: (date: Date) => void;
  label: string;
  primaryColor?: string;
}) => {
  const [showModal, setShowModal] = useState(false);
  const bgDefault = I.surfaceSoft;
  const textPrimary = I.ink;
  const textSecondary = I.muted;
  const borderLight = I.hairline;
  const spacingMd = SPACING.fixed.md;
  const spacingSm = SPACING.fixed.sm;
  const cardRadius = BORDERS.radius.lg;
  const fontSizeBase = TYPOGRAPHY.fontSize.base;
  const fontSizeLg = TYPOGRAPHY.fontSize.lg;
  const fontWeightSemibold = TYPOGRAPHY.fontWeight.semibold;
  const fontWeightBold = TYPOGRAPHY.fontWeight.bold;

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
        <InstitutionalIcon name="time" size={20} color={primaryColor}  strokeWidth={ICON_STROKE_WIDTH} />
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
        <InstitutionalIcon name="chevron-down" size={20} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
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
                <InstitutionalIcon name="close" size={24} color={textSecondary}  strokeWidth={ICON_STROKE_WIDTH} />
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
                        color: estaSeleccionada ? I.onPrimary : textPrimary,
                      }}>
                        {opcion}
                      </Text>
                      {estaSeleccionada && (
                        <InstitutionalIcon name="checkmark-circle" size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
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
  verificacionCreditos = null,
  verificandoCreditos = false,
  onPressComprarCreditos,
}) => {
  const primaryColor = I.primary;
  const { estadoProveedor } = useAuth();
  const { agregarAlerta } = useAlerts();

  const [serviciosOferta, setServiciosOferta] = useState<ServicioOferta[]>([]);
  const [puedeFechaSolicitada, setPuedeFechaSolicitada] = useState(!esOfertaSecundaria); // En secundarias, siempre usar fecha alternativa
  const [fechaAlternativa, setFechaAlternativa] = useState(new Date());
  const [horaAlternativa, setHoraAlternativa] = useState(new Date());
  const [razonCambioFecha, setRazonCambioFecha] = useState('');
  // State variables removed - ModernDatePicker y ModernTimePicker manejan su propia visibilidad
  const [descripcionOferta, setDescripcionOferta] = useState('');
  const [garantiaMeses, setGarantiaMeses] = useState('');
  const [garantiaKm, setGarantiaKm] = useState('');
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
      const tipoServicioInicial: 'con_repuestos' | 'sin_repuestos' =
        solicitud.requiere_repuestos === false ? 'sin_repuestos' : 'sin_repuestos';
      const servicios = solicitud.servicios_solicitados_detail.map(servicio => ({
        servicio,
        precio: '',
        tiempo_estimado: '',
        notas: '',
        servicioConfigurado: null,
        usandoServicioConfigurado: false,
        omitirSelectorServicioConfigurado: false,
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

        const tieneRepuestosConfigApi = !!(
          servicioConfigurado &&
          servicioConfigurado.tipo_servicio === 'con_repuestos' &&
          servicioConfigurado.repuestos_info_detallado &&
          servicioConfigurado.repuestos_info_detallado.length > 0
        );
        if (!esOfertaSecundaria && nuevos[index].tipoServicio === 'con_repuestos' && !tieneRepuestosConfigApi) {
          nuevos[index].tipoServicio = 'sin_repuestos';
          nuevos[index].repuestos = [];
        }

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
      const configConRepuestosListos =
        configurado.tipo_servicio === 'con_repuestos' &&
        configurado.repuestos_info_detallado &&
        configurado.repuestos_info_detallado.length > 0;
      nuevos[index].tipoServicio = configConRepuestosListos ? 'con_repuestos' : 'sin_repuestos';
      nuevos[index].repuestos = [];

      if (configConRepuestosListos && configurado.repuestos_info_detallado) {
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

  const itemTieneConfigConRepuestos = (item: ServicioOferta): boolean =>
    !!(
      item.servicioConfigurado &&
      item.servicioConfigurado.tipo_servicio === 'con_repuestos' &&
      item.servicioConfigurado.repuestos_info_detallado &&
      item.servicioConfigurado.repuestos_info_detallado.length > 0
    );

  const puedeElegirConRepuestos = (item: ServicioOferta): boolean =>
    esOfertaSecundaria || itemTieneConfigConRepuestos(item);

  // Función para cambiar a modo manual
  const cambiarAModoManual = (index: number) => {
    const nuevos = [...serviciosOferta];
    nuevos[index].usandoServicioConfigurado = false;
    nuevos[index].omitirSelectorServicioConfigurado = true;

    // Si la solicitud no requiere repuestos, forzar tipoServicio a 'sin_repuestos' y limpiar repuestos
    // NOTA: Esta validación NO aplica para ofertas secundarias
    if (!esOfertaSecundaria && solicitud.requiere_repuestos === false) {
      nuevos[index].tipoServicio = 'sin_repuestos';
      nuevos[index].repuestos = [];
    } else if (!esOfertaSecundaria && !itemTieneConfigConRepuestos(nuevos[index])) {
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
      omitirSelectorServicioConfigurado: false,
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
              omitirSelectorServicioConfigurado: false,
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

    // Un servicio "incluye repuestos" cuando tiene tipoServicio con_repuestos Y al menos un repuesto.
    // Nota: la condición anterior marcaba incorrectamente TODOS los servicios manuales como
    // "con_repuestos" por el operador ||, lo que producía incluye_repuestos=true siempre.
    const incluyeRepuestos = serviciosOferta.some(
      s => s.tipoServicio === 'con_repuestos' && s.repuestos.length > 0
    );

    // Calcular costos de desglose
    let costoRepuestos = calcularCostoRepuestos();
    let costoManoObra = calcularCostoManoObra();
    const precioTotalCalculado = calcularPrecioTotal();

    // Si hay repuestos pero costo_mano_obra es 0, derivarlo del precio total.
    // Esto asegura que el backend puede calcular IVA coherente usando los costos enviados.
    if (incluyeRepuestos && costoManoObra === 0 && precioTotalCalculado > 0) {
      const precioSinIva = precioTotalCalculado / 1.19;
      if (costoRepuestos > 0) {
        costoManoObra = Math.max(0, precioSinIva - costoRepuestos);
      } else {
        costoManoObra = precioSinIva * 0.6;
        costoRepuestos = precioSinIva * 0.4;
      }
    }

    // Si el servicio no tiene repuestos y costo_mano_obra es 0, derivarlo del precio total.
    // Esto garantiza que costo_mano_obra nunca llegue como "0" cuando hay un precio válido.
    if (!incluyeRepuestos && costoManoObra === 0 && precioTotalCalculado > 0) {
      costoManoObra = precioTotalCalculado / 1.19;
    }

    const precioTotalFinal = precioTotalCalculado;
    const gestionCompra = incluyeRepuestos ? parseFloat(costoGestionCompra || '0') : 0;

    const usaFechaAlternativa = esOfertaSecundaria || !puedeFechaSolicitada;
    const garantiaMesesDigits = garantiaMeses.replace(/\D/g, '');
    const garantiaKmDigits = garantiaKm.replace(/\D/g, '');
    const garantiaOfrecidaStr =
      !garantiaMesesDigits && !garantiaKmDigits
        ? undefined
        : [
            garantiaMesesDigits ? `${garantiaMesesDigits} mes(es)` : null,
            garantiaKmDigits
              ? `${parseInt(garantiaKmDigits, 10).toLocaleString('es-CL')} km`
              : null,
          ]
            .filter(Boolean)
            .join(' · ');

    onSubmit({
      servicios_ofertados: serviciosOferta.map(s => s.servicio.id),
      detalles_servicios: detallesServicios,
      precio_total_ofrecido: precioTotalFinal.toFixed(2),
      incluye_repuestos: incluyeRepuestos,
      tiempo_estimado_total: tiempoEstimadoTotal,
      descripcion_oferta: descripcionOferta,
      garantia_ofrecida: garantiaOfrecidaStr,
      fecha_disponible: fechaFormateada,
      hora_disponible: horaFormateada,
      es_fecha_alternativa: usaFechaAlternativa,
      motivo_fecha_alternativa: usaFechaAlternativa ? (razonCambioFecha.trim() || undefined) : undefined,
      // Campos de desglose para ofertas con repuestos
      costo_repuestos: incluyeRepuestos ? costoRepuestos.toFixed(2) : '0',
      costo_mano_obra: costoManoObra.toFixed(2),
      costo_gestion_compra: incluyeRepuestos ? gestionCompra.toFixed(2) : '0',
    });
  };

  const precioTotalServicios = calcularPrecioTotal();
  const tiempoTotal = calcularTiempoTotal();

  // Mismo criterio que al enviar: la gestión ya va dentro del precio de cada servicio con repuestos.
  const precioTotal = precioTotalServicios;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 + bottomInset },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Contexto: solo badge de créditos (principal) o badge de oferta adicional — sin título "Nueva oferta" */}
        <View style={styles.headerCard}>
          <View style={styles.headerBadgeRow}>
            {esOfertaSecundaria ? (
              <View style={[styles.creditosBadge, styles.creditosBadgeNeutral]}>
                <InstitutionalIcon name="layers" size={14} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={[styles.creditosBadgeText, { color: I.body }]}>Oferta adicional</Text>
              </View>
            ) : null}
            {!esOfertaSecundaria && (verificandoCreditos || verificacionCreditos) ? (
              verificandoCreditos ? (
                <View style={[styles.creditosBadge, styles.creditosBadgeNeutral]}>
                  <ActivityIndicator size="small" color={I.primary} />
                </View>
              ) : verificacionCreditos ? (
                <TouchableOpacity
                  activeOpacity={verificacionCreditos.puede_ofertar ? 1 : 0.75}
                  onPress={
                    !verificacionCreditos.puede_ofertar && onPressComprarCreditos
                      ? onPressComprarCreditos
                      : undefined
                  }
                  disabled={verificacionCreditos.puede_ofertar}
                  style={[
                    styles.creditosBadge,
                    verificacionCreditos.puede_ofertar ? styles.creditosBadgeOk : styles.creditosBadgeWarn,
                  ]}
                >
                  <InstitutionalIcon
                    name="account-balance-wallet"
                    size={14}
                    color={verificacionCreditos.puede_ofertar ? I.semanticUp : I.accentYellow}
                    strokeWidth={ICON_STROKE_WIDTH}
                  />
                  <Text
                    style={[
                      styles.creditosBadgeText,
                      { color: verificacionCreditos.puede_ofertar ? I.semanticUp : I.body },
                    ]}
                  >
                    {verificacionCreditos.saldo_actual}/{verificacionCreditos.creditos_necesarios}
                  </Text>
                  {!verificacionCreditos.puede_ofertar && (
                    <InstitutionalIcon name="chevron-right" size={16} color={I.accentYellow} strokeWidth={ICON_STROKE_WIDTH} />
                  )}
                </TouchableOpacity>
              ) : null
            ) : null}
          </View>
          <Text style={styles.headerContextHint}>
            {esOfertaSecundaria
              ? 'Completa precios, plazos y descripción del servicio adicional.'
              : 'Completa precios, plazos y descripción para enviar tu propuesta.'}
          </Text>
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
                  <InstitutionalIcon name="add-circle" size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                  <Text style={styles.agregarServicioButtonText}>
                    Agregar Servicio
                  </Text>
                  <InstitutionalIcon
                    name={mostrarSelectorServicios ? "expand-less" : "expand-more"}
                    size={20}
                    color={I.primary}
                   strokeWidth={ICON_STROKE_WIDTH} />
                </TouchableOpacity>

                {mostrarSelectorServicios && (
                  <View style={styles.selectorServiciosContainer}>
                    {cargandoServicios ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={I.primary} />
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
                                      <InstitutionalIcon name="check-circle" size={24} color={I.semanticUp} strokeWidth={ICON_STROKE_WIDTH} />
                                    </View>
                                  ) : (
                                    <View style={styles.servicioCardSelectorIcon}>
                                      <InstitutionalIcon name="build" size={24} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
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
                <InstitutionalIcon name="edit" size={20} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.agregarManualButtonTextOuter}>
                  Agregar Servicio Manualmente
                </Text>
              </TouchableOpacity>
            </>
          )}

          {serviciosOferta.length === 0 && esOfertaSecundaria ? (
            <View style={styles.emptyServiciosMessage}>
              <InstitutionalIcon name="info-outline" size={24} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
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
                    <Text style={styles.servicioNombre} numberOfLines={4}>
                      {item.servicio.nombre}
                    </Text>
                    {esOfertaSecundaria && (
                      <TouchableOpacity
                        onPress={() => eliminarServicio(index)}
                        style={styles.eliminarServicioButton}
                      >
                        <InstitutionalIcon name="delete-outline" size={20} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Selector de servicio configurado - Solo para ofertas originales, no para secundarias */}
                  {!esOfertaSecundaria &&
                    !item.usandoServicioConfigurado &&
                    !item.omitirSelectorServicioConfigurado && (
                    <View style={styles.selectorContainer}>
                      <ServicioConfiguradoSelector
                        servicioConfigurado={item.servicioConfigurado}
                        loading={item.loadingServicioConfigurado}
                        onUsarServicioConfigurado={() => usarServicioConfigurado(index)}
                        onCrearManual={() => {
                          const nuevos = [...serviciosOferta];
                          nuevos[index].usandoServicioConfigurado = false;
                          nuevos[index].omitirSelectorServicioConfigurado = true;
                          nuevos[index].precio = '';
                          nuevos[index].tiempo_estimado = '';
                          nuevos[index].costoManoObra = '';
                          nuevos[index].repuestos = [];
                          if (!esOfertaSecundaria && !itemTieneConfigConRepuestos(nuevos[index])) {
                            nuevos[index].tipoServicio = 'sin_repuestos';
                          }
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
                          <InstitutionalIcon name="info-outline" size={20} color={I.accentYellow} strokeWidth={ICON_STROKE_WIDTH} />
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
                              (!esOfertaSecundaria && solicitud.requiere_repuestos === false) ||
                                (!esOfertaSecundaria && !puedeElegirConRepuestos(item))
                                ? styles.tipoServicioButtonDisabled
                                : null,
                            ]}
                            onPress={() => {
                              if (!esOfertaSecundaria && solicitud.requiere_repuestos === false) return;
                              if (!esOfertaSecundaria && !puedeElegirConRepuestos(item)) {
                                Alert.alert(
                                  'Configuración requerida',
                                  'Para ofertar con repuestos debes tener este servicio configurado con repuestos para la marca del cliente (Menú Servicios).'
                                );
                                return;
                              }
                              const nuevos = [...serviciosOferta];
                              nuevos[index].tipoServicio = 'con_repuestos';
                              setServiciosOferta(nuevos);
                            }}
                            disabled={
                              (!esOfertaSecundaria && solicitud.requiere_repuestos === false) ||
                              (!esOfertaSecundaria && !puedeElegirConRepuestos(item))
                            }
                          >
                            <Text
                              style={[
                                styles.tipoServicioText,
                                item.tipoServicio === 'con_repuestos' && styles.tipoServicioTextSelected,
                                ((!esOfertaSecundaria && solicitud.requiere_repuestos === false) ||
                                  (!esOfertaSecundaria && !puedeElegirConRepuestos(item))) &&
                                  styles.tipoServicioTextDisabled,
                              ]}
                            >
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
                        {!esOfertaSecundaria &&
                          solicitud.requiere_repuestos !== false &&
                          !puedeElegirConRepuestos(item) && (
                            <Text style={styles.tipoServicioHint}>
                              Configura el servicio con repuestos en el menú Servicios para habilitar la opción con repuestos.
                            </Text>
                          )}
                      </View>

                      <View style={styles.preciosGroup}>
                        <Text style={styles.groupTitle}>Precios</Text>

                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>
                            Costo Mano de Obra (sin IVA)
                          </Text>
                          <View style={styles.inputContainer}>
                            <Text style={styles.currencySymbol}>$</Text>
                            <TextInput
                              style={styles.input}
                              placeholder="0"
                              placeholderTextColor={PLACEHOLDER_INPUT}
                              value={item.costoManoObra}
                              onChangeText={(text) => actualizarCostoManoObra(index, text)}
                              keyboardType="decimal-pad"
                            />
                          </View>
                        </View>

                        {item.tipoServicio === 'con_repuestos' &&
                          (esOfertaSecundaria || solicitud.requiere_repuestos !== false) && (
                          <View style={styles.inputGroup}>
                            <View style={styles.gestionCompraRowEnPrecios}>
                              <InstitutionalIcon name="local-shipping" size={18} color={I.accentYellow} strokeWidth={ICON_STROKE_WIDTH} />
                              <Text style={styles.inputLabel}>Gestión de compra (sin IVA)</Text>
                            </View>
                            <Text style={styles.gestionCompraHintEnPrecios}>
                              Traslado para comprar repuestos. Se suma antes del IVA.
                            </Text>
                            <View style={styles.inputContainer}>
                              <Text style={styles.currencySymbol}>$</Text>
                              <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Ej: 15000"
                                placeholderTextColor={PLACEHOLDER_INPUT}
                                value={costoGestionCompra}
                                onChangeText={setCostoGestionCompra}
                                keyboardType="decimal-pad"
                              />
                            </View>
                          </View>
                        )}

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

                        <View style={styles.precioTotalDestacadoWrap}>
                          <Text style={[styles.precioTotalDestacadoLabel, { color: primaryColor }]}>
                            Precio total (con IVA)
                          </Text>
                          <View
                            style={[
                              styles.precioTotalDestacadoBox,
                              { borderColor: primaryColor },
                            ]}
                          >
                            <Text style={[styles.precioTotalDestacadoSymbol, { color: primaryColor }]}>$</Text>
                            <TextInput
                              style={styles.precioTotalDestacadoInput}
                              placeholder="0"
                              placeholderTextColor={PLACEHOLDER_INPUT}
                              value={item.precio}
                              editable={false}
                              keyboardType="decimal-pad"
                            />
                          </View>
                          <Text style={styles.precioTotalDestacadoHint}>
                            Resultado: mano de obra + repuestos + gestión de compra + IVA 19%
                          </Text>
                        </View>
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
                              placeholderTextColor={PLACEHOLDER_INPUT}
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
                            placeholderTextColor={PLACEHOLDER_INPUT}
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
                      <InstitutionalIcon name="check-circle" size={16} color={I.semanticUp} strokeWidth={ICON_STROKE_WIDTH} />
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
                          <InstitutionalIcon name="info-outline" size={20} color={I.accentYellow} strokeWidth={ICON_STROKE_WIDTH} />
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
                              (!esOfertaSecundaria && solicitud.requiere_repuestos === false) ||
                                (!esOfertaSecundaria && !puedeElegirConRepuestos(item))
                                ? styles.tipoServicioButtonDisabled
                                : null,
                            ]}
                            onPress={() => {
                              if (!esOfertaSecundaria && solicitud.requiere_repuestos === false) return;
                              if (!esOfertaSecundaria && !puedeElegirConRepuestos(item)) {
                                Alert.alert(
                                  'Configuración requerida',
                                  'Para ofertar con repuestos debes tener este servicio configurado con repuestos para la marca del cliente (Menú Servicios).'
                                );
                                return;
                              }
                              const nuevos = [...serviciosOferta];
                              nuevos[index].tipoServicio = 'con_repuestos';
                              setServiciosOferta(nuevos);
                            }}
                            disabled={
                              (!esOfertaSecundaria && solicitud.requiere_repuestos === false) ||
                              (!esOfertaSecundaria && !puedeElegirConRepuestos(item))
                            }
                          >
                            <Text
                              style={[
                                styles.tipoServicioText,
                                item.tipoServicio === 'con_repuestos' && styles.tipoServicioTextSelected,
                                ((!esOfertaSecundaria && solicitud.requiere_repuestos === false) ||
                                  (!esOfertaSecundaria && !puedeElegirConRepuestos(item))) &&
                                  styles.tipoServicioTextDisabled,
                              ]}
                            >
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
                        {!esOfertaSecundaria &&
                          solicitud.requiere_repuestos !== false &&
                          !puedeElegirConRepuestos(item) && (
                            <Text style={styles.tipoServicioHint}>
                              Configura el servicio con repuestos en el menú Servicios para habilitar la opción con repuestos.
                            </Text>
                          )}
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
                              placeholderTextColor={PLACEHOLDER_INPUT}
                              value={item.costoManoObra}
                              onChangeText={(text) => actualizarCostoManoObra(index, text)}
                              keyboardType="decimal-pad"
                            />
                          </View>
                        </View>

                        {item.tipoServicio === 'con_repuestos' &&
                          (esOfertaSecundaria || solicitud.requiere_repuestos !== false) && (
                          <View style={styles.inputGroup}>
                            <View style={styles.gestionCompraRowEnPrecios}>
                              <InstitutionalIcon name="local-shipping" size={18} color={I.accentYellow} strokeWidth={ICON_STROKE_WIDTH} />
                              <Text style={styles.inputLabel}>Gestión de compra (sin IVA)</Text>
                            </View>
                            <Text style={styles.gestionCompraHintEnPrecios}>
                              Traslado para comprar repuestos. Se suma antes del IVA.
                            </Text>
                            <View style={styles.inputContainer}>
                              <Text style={styles.currencySymbol}>$</Text>
                              <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Ej: 15000"
                                placeholderTextColor={PLACEHOLDER_INPUT}
                                value={costoGestionCompra}
                                onChangeText={setCostoGestionCompra}
                                keyboardType="decimal-pad"
                              />
                            </View>
                          </View>
                        )}

                        {/* Precio Total (calculado automáticamente) */}
                        <View style={styles.precioTotalDestacadoWrap}>
                          <Text style={[styles.precioTotalDestacadoLabel, { color: primaryColor }]}>
                            Precio total (con IVA)
                          </Text>
                          <View
                            style={[
                              styles.precioTotalDestacadoBox,
                              { borderColor: primaryColor },
                            ]}
                          >
                            <Text style={[styles.precioTotalDestacadoSymbol, { color: primaryColor }]}>$</Text>
                            <TextInput
                              style={styles.precioTotalDestacadoInput}
                              placeholder="0"
                              placeholderTextColor={PLACEHOLDER_INPUT}
                              value={item.precio}
                              editable={false}
                              keyboardType="decimal-pad"
                            />
                          </View>
                          <Text style={styles.precioTotalDestacadoHint}>
                            Resultado: mano de obra + repuestos + gestión de compra + IVA 19%
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
                              placeholderTextColor={PLACEHOLDER_INPUT}
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
                            placeholderTextColor={PLACEHOLDER_INPUT}
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
                      placeholderTextColor={PLACEHOLDER_INPUT}
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
              placeholderTextColor={PLACEHOLDER_INPUT}
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
              Opcional — solo números (meses y kilómetros)
            </Text>
            <View style={styles.garantiaRow}>
              <View style={[styles.inputContainer, styles.garantiaInputHalf]}>
                <InstitutionalIcon name="calendar-month" size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Meses"
                  placeholderTextColor={PLACEHOLDER_INPUT}
                  value={garantiaMeses}
                  onChangeText={(t) => setGarantiaMeses(t.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.inputContainer, styles.garantiaInputHalf, { marginLeft: 10 }]}>
                <InstitutionalIcon name="speed" size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Km"
                  placeholderTextColor={PLACEHOLDER_INPUT}
                  value={garantiaKm}
                  onChangeText={(t) => setGarantiaKm(t.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>
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
                  <View style={styles.desgloseTitleRow}>
                    <InstitutionalIcon name="receipt-long" size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.desgloseTitle}>Desglose de costos</Text>
                  </View>

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

                  <View style={[styles.resumenRow, styles.resumenRowDivider]}>
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
                    <InstitutionalIcon name="info-outline" size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
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

      {/* Botones fijos — SafeArea inferior + pills institucionales */}
      <SafeAreaView edges={['bottom']} style={styles.buttonsSafe}>
        <View style={styles.buttonsRow}>
          {onCancel ? (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={loading}
              activeOpacity={0.85}
            >
              <InstitutionalIcon name="cancel" size={20} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.cancelButtonText} numberOfLines={1}>
                Cancelar
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[
              styles.submitButton,
              !onCancel && styles.submitButtonFullWidth,
              (loading || precioTotal === 0) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading || precioTotal === 0}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={I.onPrimary} size="small" />
            ) : (
              <>
                <InstitutionalIcon name="add-circle" size={22} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.submitButtonText} numberOfLines={1}>
                  Enviar oferta
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const shadowFooter = platformShadow({
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 8,
});

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: hx,
    paddingTop: SPACING.fixed.sm,
    paddingBottom: SPACING.fixed['2xl'],
  },

  headerCard: {
    marginBottom: SPACING.fixed.md,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  creditosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 5,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    gap: 4,
    flexShrink: 0,
  },
  creditosBadgeNeutral: {
    backgroundColor: I.surfaceStrong,
    borderColor: I.hairline,
    minWidth: 40,
    justifyContent: 'center',
  },
  creditosBadgeOk: {
    backgroundColor: withOpacity(I.semanticUp, 0.12),
    borderColor: withOpacity(I.semanticUp, 0.28),
  },
  creditosBadgeWarn: {
    backgroundColor: withOpacity(I.accentYellow, 0.16),
    borderColor: withOpacity(I.accentYellow, 0.45),
  },
  creditosBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
  },
  headerContextHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.relaxed),
    color: I.muted,
  },

  section: {
    marginBottom: SPACING.fixed.md,
  },
  subsection: {
    marginTop: SPACING.fixed.md,
    paddingTop: SPACING.fixed.md,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
  },
  subsectionTitle: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    color: I.ink,
    marginBottom: 6,
  },
  preciosGroup: {
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.fixed.md,
    marginTop: SPACING.fixed.md,
    marginBottom: SPACING.fixed.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  groupTitle: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    color: I.ink,
    marginBottom: SPACING.fixed.sm,
  },
  precioTotalDestacadoWrap: {
    marginTop: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.md,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
  },
  precioTotalDestacadoLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    marginBottom: SPACING.fixed.sm,
    color: I.ink,
  },
  precioTotalDestacadoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: BORDERS.width.thin,
    borderRadius: BORDERS.radius.md,
    paddingVertical: SPACING.fixed.md,
    paddingHorizontal: SPACING.fixed.md,
    gap: 6,
    backgroundColor: I.canvas,
    borderColor: I.hairline,
    ...SHADOWS.editorial,
  },
  precioTotalDestacadoSymbol: {
    fontSize: TS.numberDisplay.fontSize,
    fontFamily: FF.monoMedium,
    color: I.primary,
  },
  precioTotalDestacadoInput: {
    flex: 1,
    fontSize: TS.numberDisplay.fontSize,
    fontFamily: FF.monoMedium,
    lineHeight: lh(TS.numberDisplay.fontSize, TS.numberDisplay.lineHeight),
    color: I.ink,
    padding: 0,
  },
  precioTotalDestacadoHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
    marginTop: SPACING.fixed.sm,
  },
  infoGroup: {
    marginTop: SPACING.fixed.md,
    paddingTop: SPACING.fixed.md,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
    gap: SPACING.fixed.sm,
  },
  sectionHeaderContainer: {
    marginBottom: SPACING.fixed.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TYPOGRAPHY.lineHeight.normal),
    color: I.body,
    marginBottom: SPACING.fixed.md,
  },

  servicioCard: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.fixed.md,
    marginBottom: SPACING.fixed.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    ...SHADOWS.editorial,
  },
  servicioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.fixed.md,
    paddingBottom: SPACING.fixed.sm,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: I.hairline,
  },
  servicioNombre: {
    fontSize: TS.h3.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h3.fontSize, TS.h3.lineHeight),
    letterSpacing: TS.h3.letterSpacing,
    color: I.ink,
    flex: 1,
    marginRight: SPACING.fixed.sm,
  },
  eliminarServicioButton: {
    padding: 4,
  },
  servicioDetalles: {
    gap: SPACING.fixed.md,
  },

  inputGroup: {
    marginBottom: SPACING.fixed.sm + 2,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    textTransform: 'uppercase',
    color: I.muted,
    marginBottom: SPACING.fixed.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: 14,
    backgroundColor: I.surfaceSoft,
    gap: SPACING.fixed.sm,
  },
  input: {
    flex: 1,
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    color: I.ink,
    padding: 0,
  },
  currencySymbol: {
    fontSize: TS.body.fontSize,
    fontFamily: FF.monoMedium,
    color: I.muted,
  },
  unitText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  textArea: {
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.md,
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    color: I.ink,
    minHeight: 96,
    textAlignVertical: 'top',
    backgroundColor: I.surfaceSoft,
  },
  characterCount: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
    marginTop: SPACING.fixed.sm,
    textAlign: 'right',
  },

  gestionCompraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    marginBottom: 4,
  },
  gestionCompraInfo: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.accentYellow,
    marginTop: SPACING.fixed.sm,
    fontStyle: 'italic',
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
  },
  gestionCompraRowEnPrecios: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    marginBottom: 4,
  },
  gestionCompraHintEnPrecios: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
    marginBottom: SPACING.fixed.sm,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
    backgroundColor: I.surfaceSoft,
    padding: SPACING.fixed.md,
    borderRadius: BORDERS.radius.md,
    marginBottom: SPACING.fixed.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  infoText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TYPOGRAPHY.lineHeight.normal),
    color: I.body,
  },

  disponibilidadOptions: {
    gap: SPACING.fixed.sm,
    marginTop: SPACING.fixed.md,
  },
  disponibilidadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    padding: SPACING.fixed.md,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.canvas,
  },
  disponibilidadButtonSelected: {
    borderColor: I.primary,
    backgroundColor: withOpacity(I.primary, 0.06),
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: I.primary,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: I.primary,
  },
  disponibilidadText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansMedium,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TYPOGRAPHY.lineHeight.normal),
    color: I.ink,
  },
  fechaAlternativaContainer: {
    marginTop: SPACING.fixed.md,
    padding: SPACING.fixed.md,
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    padding: SPACING.fixed.md,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.canvas,
  },
  datePickerText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.ink,
  },

  resumenCard: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.fixed.md,
    marginBottom: SPACING.fixed.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    ...SHADOWS.editorial,
  },
  resumenTitle: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    color: I.ink,
    marginBottom: SPACING.fixed.md,
  },
  resumenDivider: {
    height: BORDERS.width.thin,
    backgroundColor: I.hairline,
    marginBottom: SPACING.fixed.md,
  },
  resumenContent: {
    gap: SPACING.fixed.sm,
  },
  resumenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  resumenLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.body,
  },
  resumenValue: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  resumenPrecioRow: {
    marginTop: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.md,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
  },
  resumenPrecioLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  resumenPrecioValue: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontFamily: FF.monoMedium,
    lineHeight: lh(TYPOGRAPHY.fontSize['2xl'], TS.numberDisplay.lineHeight),
    color: I.primary,
  },

  desgloseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  desgloseTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.muted,
  },
  resumenRowDivider: {
    marginTop: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.sm,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
  },
  infoBoxDesglose: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
    padding: SPACING.fixed.sm,
    backgroundColor: withOpacity(I.primary, 0.08),
    borderRadius: BORDERS.radius.md,
    marginTop: SPACING.fixed.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.primary, 0.22),
  },
  infoBoxDesgloseText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.primary,
  },

  buttonsSafe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: I.canvas,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
    paddingTop: SPACING.fixed.sm,
    paddingHorizontal: hx,
    ...shadowFooter,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.fixed.sm,
  },
  cancelButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.fixed.sm + 2,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: I.semanticDown,
    backgroundColor: I.canvas,
    gap: 6,
  },
  cancelButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.semanticDown,
  },
  submitButton: {
    flex: 1.45,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.fixed.sm + 2,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.primary,
    gap: SPACING.fixed.xs,
    ...SHADOWS.editorial,
  },
  submitButtonFullWidth: {
    flex: 1,
  },
  submitButtonDisabled: {
    backgroundColor: I.primaryDisabled,
    opacity: 0.85,
  },
  submitButtonText: {
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.button.fontSize, TS.button.lineHeight),
    color: I.onPrimary,
  },

  selectorContainer: {
    marginBottom: SPACING.fixed.md,
  },
  configuradoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    padding: SPACING.fixed.sm,
    backgroundColor: withOpacity(I.semanticUp, 0.1),
    borderRadius: BORDERS.radius.md,
    marginBottom: SPACING.fixed.md,
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.semanticUp, 0.35),
  },
  configuradoText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.semanticUp,
  },
  cambiarLink: {
    paddingVertical: 4,
    paddingHorizontal: SPACING.fixed.sm,
  },
  cambiarLinkText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.primary,
    textDecorationLine: 'underline',
  },
  tipoServicioContainer: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
    marginTop: SPACING.fixed.sm,
  },
  tipoServicioButton: {
    flex: 1,
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.canvas,
    alignItems: 'center',
  },
  tipoServicioButtonSelected: {
    borderColor: I.primary,
    backgroundColor: withOpacity(I.primary, 0.08),
  },
  tipoServicioButtonDisabled: {
    opacity: 0.5,
    backgroundColor: I.surfaceStrong,
  },
  tipoServicioText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.body,
  },
  tipoServicioTextSelected: {
    color: I.primary,
  },
  tipoServicioTextDisabled: {
    color: I.mutedSoft,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.fixed.sm,
    backgroundColor: withOpacity(I.accentYellow, 0.14),
    borderRadius: BORDERS.radius.md,
    borderLeftWidth: 3,
    borderLeftColor: I.accentYellow,
    marginBottom: SPACING.fixed.md,
    gap: SPACING.fixed.sm,
  },
  infoBoxText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.body,
  },
  precioInfo: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  agregarServiciosContainer: {
    marginBottom: SPACING.fixed.md,
  },
  agregarServicioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.fixed.md,
    backgroundColor: withOpacity(I.primary, 0.08),
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.primary, 0.22),
    gap: SPACING.fixed.sm,
  },
  agregarServicioButtonText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.primary,
  },
  selectorServiciosContainer: {
    marginTop: SPACING.fixed.sm,
    padding: SPACING.fixed.sm,
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  selectorServiciosTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginBottom: SPACING.fixed.sm,
  },
  serviciosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
  servicioCardSelector: {
    width: '48%',
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.fixed.sm,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.editorial,
  },
  servicioCardSelectorDisabled: {
    opacity: 0.6,
    backgroundColor: I.surfaceStrong,
    borderColor: I.hairline,
  },
  servicioCardSelectorContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  servicioCardSelectorIcon: {
    marginBottom: SPACING.fixed.sm,
    padding: SPACING.fixed.sm,
    backgroundColor: withOpacity(I.primary, 0.1),
    borderRadius: 20,
  },
  servicioCardSelectorCheck: {
    marginBottom: SPACING.fixed.sm,
  },
  servicioCardSelectorNombre: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    textAlign: 'center',
    marginBottom: 4,
  },
  servicioCardSelectorNombreDisabled: {
    color: I.mutedSoft,
  },
  servicioCardSelectorDescripcion: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
    textAlign: 'center',
    marginTop: 4,
  },
  serviciosLista: {
    maxHeight: 200,
  },
  servicioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.fixed.sm,
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.md,
    marginBottom: SPACING.fixed.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  servicioItemDisabled: {
    opacity: 0.5,
    backgroundColor: I.surfaceStrong,
  },
  servicioItemContent: {
    flex: 1,
    marginRight: SPACING.fixed.sm,
  },
  servicioItemNombre: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginBottom: 4,
  },
  servicioItemNombreDisabled: {
    color: I.mutedSoft,
  },
  servicioItemDescripcion: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  divider: {
    height: BORDERS.width.thin,
    backgroundColor: I.hairline,
    marginVertical: SPACING.fixed.sm,
  },
  agregarManualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.fixed.sm,
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    borderStyle: 'dashed',
    gap: SPACING.fixed.sm,
  },
  agregarManualButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansMedium,
    color: I.body,
  },
  agregarManualButtonOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.fixed.md,
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    borderStyle: 'dashed',
    marginTop: SPACING.fixed.sm,
    gap: 10,
  },
  agregarManualButtonTextOuter: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansMedium,
    color: I.body,
  },
  emptyServiciosContainer: {
    padding: SPACING.fixed.md,
    alignItems: 'center',
  },
  emptyServiciosText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.muted,
    marginBottom: SPACING.fixed.md,
    textAlign: 'center',
  },
  emptyServiciosMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.fixed.md,
    backgroundColor: withOpacity(I.accentYellow, 0.12),
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.accentYellow, 0.4),
    gap: SPACING.fixed.sm,
  },
  emptyServiciosMessageText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansMedium,
    color: I.body,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.fixed.md,
    gap: SPACING.fixed.sm,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  warningContainer: {
    backgroundColor: withOpacity(I.accentYellow, 0.14),
    borderLeftWidth: 3,
    borderLeftColor: I.accentYellow,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.fixed.md,
    marginVertical: SPACING.fixed.sm,
    alignItems: 'center',
  },
  warningTitle: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    color: I.body,
    marginTop: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
    textAlign: 'center',
  },
  warningText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
    marginBottom: SPACING.fixed.sm,
    textAlign: 'center',
  },
  warningSubtext: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginTop: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
    textAlign: 'center',
  },
  optionsList: {
    width: '100%',
    marginTop: SPACING.fixed.sm,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.sm,
  },
  optionNumber: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.accentYellow,
    marginRight: SPACING.fixed.sm,
    marginTop: 2,
  },
  optionText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TYPOGRAPHY.lineHeight.normal),
    color: I.body,
  },
  tipoServicioHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
    marginTop: SPACING.fixed.sm,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
  },
  garantiaRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  garantiaInputHalf: {
    flex: 1,
    marginBottom: 0,
  },
});

