import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  Pressable,
  AppState,
  Platform,
} from 'react-native';
import { showAlert, showAlertButtons } from '@/utils/platformAlert';
import { Stack, router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, withOpacity, SPACING, TYPOGRAPHY, SHADOWS, BORDERS, platformShadow, noShadow } from '@/app/design-system/tokens';
import solicitudesService, { type SolicitudPublica, type OfertaProveedor, type MotivoRechazo, type DetalleServicioOferta, type MiembroTallerResumen } from '@/services/solicitudesService';
import equipoTallerService, { type MiembroTaller, mecanicoCompatibleConTipoServicio } from '@/services/equipoTallerService';
import { RechazarSolicitudModal } from '@/components/solicitudes/RechazarSolicitudModal';
import { ProponerFechaCatalogoModal } from '@/components/solicitudes/ProponerFechaCatalogoModal';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;
const hx = SPACING.container.horizontal;
const lh = (fontSize: number, lineHeightMult: number) => Math.round(fontSize * lineHeightMult);

const shadowFooter = platformShadow({
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 8,
});

function textoEstadoOferta(estado: string): string {
  switch (estado) {
    case 'pendiente_confirmacion':
      return 'Pendiente tu confirmación';
    case 'enviada':
      return 'Enviada';
    case 'vista':
      return 'Vista por cliente';
    case 'en_chat':
      return 'En conversación';
    case 'pendiente_creditos':
      return 'Pendiente créditos';
    case 'aceptada':
      return 'Aceptada';
    case 'pendiente_pago':
      return 'Cliente pagando…';
    case 'pagada':
      return 'Pagada';
    case 'en_ejecucion':
      return 'En ejecución';
    case 'completada':
      return 'Completada';
    case 'rechazada':
      return 'Rechazada';
    case 'retirada':
      return 'Retirada';
    case 'expirada':
      return 'Expirada';
    case 'pagada_parcialmente':
      return 'Pago parcial';
    default:
      return estado;
  }
}

/** Evita desfase por zona horaria con fechas YYYY-MM-DD del API. */
function parseFechaLocal(fecha: string | null | undefined): Date | null {
  if (!fecha) return null;
  const iso = String(fecha).split('T')[0];
  const [y, m, d] = iso.split('-').map((p) => parseInt(p, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function normalizarFechaApi(fecha: string | null | undefined): string {
  if (!fecha) return '';
  return String(fecha).split('T')[0];
}

function resolverFechaHoraPantalla(
  solicitud: SolicitudPublica | null,
  miOferta: OfertaProveedor | null,
): { fecha: string; hora: string | null; propuestaPendiente: boolean } {
  if (!solicitud) {
    return { fecha: '', hora: null, propuestaPendiente: false };
  }
  if (miOferta?.es_fecha_alternativa && miOferta.fecha_disponible) {
    return {
      fecha: normalizarFechaApi(miOferta.fecha_disponible),
      hora: miOferta.hora_disponible ?? null,
      propuestaPendiente: true,
    };
  }
  return {
    fecha: normalizarFechaApi(solicitud.fecha_preferida),
    hora: solicitud.hora_preferida ?? null,
    propuestaPendiente: false,
  };
}

export default function SolicitudDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const invalidateOrdenesYOfertas = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['ordenes-proveedor'] });
    queryClient.invalidateQueries({ queryKey: ['ofertas-proveedor'] });
  }, [queryClient]);

  const [solicitud, setSolicitud] = useState<SolicitudPublica | null>(null);
  const [miOferta, setMiOferta] = useState<OfertaProveedor | null>(null);
  const [ofertasSecundarias, setOfertasSecundarias] = useState<OfertaProveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarModalRechazo, setMostrarModalRechazo] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [confirmandoCatalogo, setConfirmandoCatalogo] = useState(false);
  const [mostrarModalFecha, setMostrarModalFecha] = useState(false);
  const [proponiendoFecha, setProponiendoFecha] = useState(false);
  const [fotoAmpliadaUrl, setFotoAmpliadaUrl] = useState<string | null>(null);
  const [mecanicosEquipo, setMecanicosEquipo] = useState<MiembroTaller[]>([]);

  const cargarDatos = useCallback(async (opts?: { silent?: boolean }) => {
    if (!id) return;
    try {
      if (!opts?.silent) {
        setLoading(true);
      }
      const result = await solicitudesService.obtenerDetalleSolicitud(id);

      if (result.success && result.data) {
        setSolicitud(result.data);

        // El detalle de solicitud no incluye `ofertas` para proveedores (solo cliente/admin).
        // La oferta de catálogo sí viene en oferta_seleccionada_detail; si no, buscar en mis ofertas.
        const ofertaSeleccionada = result.data.oferta_seleccionada_detail as OfertaProveedor | null | undefined;
        let ofertaPropia: OfertaProveedor | null = null;

        if (ofertaSeleccionada && !ofertaSeleccionada.es_oferta_secundaria) {
          ofertaPropia = ofertaSeleccionada;
        } else {
          const misOfertas = await solicitudesService.obtenerMisOfertas();
          if (misOfertas.success && misOfertas.data) {
            ofertaPropia =
              misOfertas.data.find((o) => o.solicitud === id && !o.es_oferta_secundaria) ?? null;
          }
        }

        if (ofertaPropia) {
          setMiOferta(ofertaPropia);

          if (ofertaPropia.estado === 'aceptada' || ofertaPropia.estado === 'pagada') {
            const ofertasSecResult = await solicitudesService.obtenerOfertasSecundarias(ofertaPropia.id);
            if (ofertasSecResult.success && ofertasSecResult.data) {
              setOfertasSecundarias(ofertasSecResult.data);
            }
          }
        }

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
  }, [id]);

  const hasLoadedOnceRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      cargarDatos({ silent: hasLoadedOnceRef.current });
      hasLoadedOnceRef.current = true;
    }, [id, cargarDatos]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && id && hasLoadedOnceRef.current) {
        cargarDatos({ silent: true });
      }
    });
    return () => sub.remove();
  }, [id, cargarDatos]);

  const fechaHoraPantalla = useMemo(
    () => resolverFechaHoraPantalla(solicitud, miOferta),
    [solicitud, miOferta],
  );

  const tecnicoSolicitud = useMemo((): MiembroTallerResumen | null => {
    if (miOferta?.miembro_taller_detail) return miOferta.miembro_taller_detail;
    if (miOferta?.es_fecha_alternativa && miOferta.miembro_taller_detail) {
      return miOferta.miembro_taller_detail;
    }
    return solicitud?.miembro_taller_preferido_detail ?? null;
  }, [solicitud, miOferta]);

  const miembroInicialPropuesta = useMemo(() => {
    return (
      miOferta?.miembro_taller_asignado
      ?? solicitud?.miembro_taller_preferido
      ?? tecnicoSolicitud?.id
      ?? null
    );
  }, [miOferta, solicitud, tecnicoSolicitud]);

  const formatearFecha = (fecha: string) => {
    const parsed = parseFechaLocal(fecha);
    if (!parsed) return '—';
    return parsed.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatearHora = (hora: string | null) => {
    if (!hora) return 'No especificada';
    return String(hora).substring(0, 5);
  };

  const esServicioDiagnostico = (nombreServicio: string): boolean => {
    const nombreLower = nombreServicio.toLowerCase();
    const palabrasDiagnostico = [
      'diagnostico',
      'diagnóstico',
      'revision',
      'revisión',
      'inspeccion',
      'inspección',
      'evaluacion',
      'evaluación',
      'scanner',
      'computadora',
      'obd',
    ];
    return palabrasDiagnostico.some((palabra) => nombreLower.includes(palabra));
  };

  const determinarRequiereRepuestos = (): boolean => {
    if (!solicitud) return false;
    if (solicitud.requiere_repuestos === false) {
      return false;
    }

    if (solicitud.servicios_solicitados_detail && solicitud.servicios_solicitados_detail.length > 0) {
      const todosSonDiagnostico = solicitud.servicios_solicitados_detail.every((servicio) =>
        esServicioDiagnostico(servicio.nombre)
      );
      if (todosSonDiagnostico) {
        return false;
      }
    }

    if (solicitud.requiere_repuestos === true) {
      return true;
    }

    return false;
  };

  const esAsignacionCatalogo =
    miOferta?.origen === 'catalogo' && solicitud?.estado === 'pendiente_confirmacion';

  const puedeGestionarCatalogo =
    esAsignacionCatalogo && miOferta?.estado === 'pendiente_confirmacion';

  const puedeChatCatalogo =
    esAsignacionCatalogo &&
    (miOferta?.estado === 'pendiente_confirmacion' || miOferta?.estado === 'en_chat');

  useEffect(() => {
    if (!esAsignacionCatalogo) {
      setMecanicosEquipo([]);
      return;
    }
    let mounted = true;
    equipoTallerService
      .listar({ rol: 'mecanico', activo: true })
      .then((equipo) => {
        if (!mounted) return;
        const tipoServicio = miOferta?.tipo_proveedor === 'mecanico' ? 'domicilio' : 'taller';
        setMecanicosEquipo(
          equipo.filter((m) => mecanicoCompatibleConTipoServicio(m, tipoServicio)),
        );
      })
      .catch(() => {
        if (mounted) setMecanicosEquipo([]);
      });
    return () => {
      mounted = false;
    };
  }, [esAsignacionCatalogo, miOferta?.tipo_proveedor]);

  const ejecutarConfirmarCatalogo = async () => {
    if (!miOferta?.id) return;
    setConfirmandoCatalogo(true);
    try {
      const result = await solicitudesService.confirmarCatalogo(miOferta.id);
      if (result.success) {
        const estado = (result.data as { estado_resultado?: string })?.estado_resultado;
        showAlert(
          estado === 'esperando_creditos_proveedor'
            ? 'Créditos insuficientes'
            : 'Asignación confirmada',
          estado === 'esperando_creditos_proveedor'
            ? 'Debes acreditar créditos antes de que el cliente pueda pagar.'
            : 'El cliente fue notificado y puede proceder al pago.',
        );
        invalidateOrdenesYOfertas();
        cargarDatos();
      } else {
        showAlert('Error', result.error || 'No se pudo confirmar');
      }
    } finally {
      setConfirmandoCatalogo(false);
    }
  };

  const handleConfirmarCatalogo = () => {
    if (!miOferta?.id || confirmandoCatalogo || rechazando) return;
    showAlertButtons(
      'Confirmar asignación',
      'Al confirmar adjudicarás la orden y se descontarán créditos de tu cuenta. El cliente podrá pagar. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => void ejecutarConfirmarCatalogo() },
      ],
    );
  };

  const handleProponerFechaCatalogo = async (
    fecha: string,
    hora: string,
    motivo: string,
    miembroTallerId?: number | null,
  ) => {
    if (!miOferta?.id) return;
    setProponiendoFecha(true);
    try {
      const result = await solicitudesService.proponerFechaCatalogo(
        miOferta.id,
        fecha,
        hora || undefined,
        motivo,
        miembroTallerId,
      );
      if (result.success) {
        const payload = result.data as {
          fecha_disponible?: string;
          hora_disponible?: string | null;
          es_fecha_alternativa?: boolean;
        } | undefined;
        setMiOferta((prev) =>
          prev
            ? {
                ...prev,
                estado: 'en_chat',
                fecha_disponible: payload?.fecha_disponible ?? fecha,
                hora_disponible: payload?.hora_disponible ?? (hora || prev.hora_disponible),
                es_fecha_alternativa: true,
                motivo_fecha_alternativa: motivo || prev.motivo_fecha_alternativa,
              }
            : prev,
        );
        setMostrarModalFecha(false);
        invalidateOrdenesYOfertas();
        cargarDatos({ silent: true });
        Alert.alert(
          'Fecha enviada',
          'El cliente fue notificado. Podrá aceptarla desde su solicitud.',
        );
      } else {
        Alert.alert('Error', result.error || 'No se pudo proponer la fecha');
      }
    } finally {
      setProponiendoFecha(false);
    }
  };

  const ejecutarRechazarCatalogo = async () => {
    if (!miOferta?.id) return;
    setRechazando(true);
    try {
      const result = await solicitudesService.rechazarCatalogo(miOferta.id);
      if (result.success) {
        showAlert('Rechazada', 'La solicitud fue cancelada.');
        router.back();
      } else {
        showAlert('Error', result.error || 'No se pudo rechazar');
      }
    } finally {
      setRechazando(false);
    }
  };

  const handleRechazarCatalogo = () => {
    if (!miOferta?.id || rechazando || confirmandoCatalogo) return;
    showAlertButtons(
      'Rechazar asignación',
      'El cliente será notificado. ¿Seguro que no puedes realizar este servicio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Rechazar', style: 'destructive', onPress: () => void ejecutarRechazarCatalogo() },
      ],
    );
  };

  const handleRechazar = async (motivo: MotivoRechazo, detalle: string) => {
    if (!id) return;
    try {
      setRechazando(true);
      const result = await solicitudesService.rechazarSolicitud(id, motivo, detalle);

      if (result.success) {
        Alert.alert('Solicitud Rechazada', 'La solicitud ha sido rechazada exitosamente. El cliente será notificado.', [
          {
            text: 'OK',
            onPress: () => {
              setMostrarModalRechazo(false);
              router.back();
            },
          },
        ]);
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

  const detallesOfertaPorServicio = useMemo(() => {
    const map = new Map<number, DetalleServicioOferta>();
    (miOferta?.detalles_servicios_detail ?? []).forEach((detalle) => {
      if (detalle.servicio != null) {
        map.set(Number(detalle.servicio), detalle);
      }
    });
    return map;
  }, [miOferta?.detalles_servicios_detail]);

  const fmtRepuestoLinea = (rep: {
    precio?: number;
    precio_referencia?: number;
    cantidad?: number;
  }) => {
    const unit = Number(rep.precio ?? rep.precio_referencia ?? 0);
    const qty = Number(rep.cantidad ?? 1);
    return (unit * qty).toLocaleString('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    });
  };

  const tienePieDecisionCatalogo = puedeGestionarCatalogo;
  const footerReserve =
    (tienePieDecisionCatalogo ? 72 : SPACING.fixed.lg) + (insets.bottom || 0);
  const repuestosSegunOferta = (oferta: OfertaProveedor | null): boolean => {
    if (!oferta) return false;
    if (!oferta.incluye_repuestos) return false;
    const costoRep = parseFloat(String(oferta.costo_repuestos ?? '0')) || 0;
    if (costoRep <= 0) return false;
    return true;
  };

  /** Si ya hay oferta del proveedor, la pill refleja su catálogo (no solo la preferencia del cliente). */
  const requiereRepuestos = solicitud
    ? (miOferta != null
      ? repuestosSegunOferta(miOferta)
      : determinarRequiereRepuestos())
    : false;

  const stackOptions = {
    title: 'Detalle de Solicitud',
    headerBackTitle: '',
    headerBackTitleVisible: false as const,
    headerShadowVisible: false,
    headerStyle: {
      backgroundColor: I.canvas,
      borderBottomWidth: 0,
      ...noShadow,
    },
    headerTintColor: I.ink,
  };

  const footerBottomPad = Math.max(insets.bottom, Platform.OS === 'web' ? 12 : 0);

  const renderFooterActions = (
    primary: {
      label: string;
      icon: string;
      onPress: () => void;
      loading?: boolean;
      disabled?: boolean;
    },
    secondary: {
      label: string;
      icon: string;
      onPress: () => void;
      loading?: boolean;
      disabled?: boolean;
    },
  ) => (
    <View style={[styles.fixedActionsContainer, { paddingBottom: footerBottomPad }]}>
      <View style={styles.fixedActionsRow}>
        <Pressable
          style={({ pressed }) => [
            styles.footerBtnOutline,
            (pressed || secondary.loading) && styles.footerBtnPressed,
            (secondary.disabled || secondary.loading) && styles.footerBtnDisabled,
          ]}
          onPress={secondary.onPress}
          disabled={secondary.disabled || secondary.loading}
          accessibilityRole="button"
        >
          {secondary.loading ? (
            <ActivityIndicator color={I.semanticDown} size="small" />
          ) : (
            <>
              <InstitutionalIcon name={secondary.icon} size={20} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.footerBtnOutlineText} numberOfLines={1}>
                {secondary.label}
              </Text>
            </>
          )}
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.footerBtnPrimary,
            (pressed || primary.loading) && styles.footerBtnPressed,
            (primary.disabled || primary.loading) && styles.footerBtnDisabled,
          ]}
          onPress={primary.onPress}
          disabled={primary.disabled || primary.loading}
          accessibilityRole="button"
        >
          {primary.loading ? (
            <ActivityIndicator color={I.onPrimary} size="small" />
          ) : (
            <>
              <InstitutionalIcon name={primary.icon} size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.footerBtnPrimaryText} numberOfLines={1}>
                {primary.label}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={stackOptions} />
        <View style={styles.screenRoot}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={I.primary} />
            <Text style={styles.loadingText}>Cargando…</Text>
          </View>
        </View>
      </View>
    );
  }

  if (!solicitud) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={stackOptions} />
        <View style={styles.screenRoot}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Solicitud no encontrada</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={stackOptions} />

      <View style={styles.screenRoot}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: hx, paddingBottom: footerReserve + SPACING.fixed.md },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.badgesContainer}>
            <View
              style={[
                styles.metaBadge,
                solicitud.urgencia === 'urgente'
                  ? {
                      backgroundColor: withOpacity(I.semanticDown, 0.12),
                      borderColor: withOpacity(I.semanticDown, 0.35),
                    }
                  : {
                      backgroundColor: I.surfaceStrong,
                      borderColor: I.hairline,
                    },
              ]}
            >
              <InstitutionalIcon
                name={solicitud.urgencia === 'urgente' ? 'priority-high' : 'schedule'}
                size={16}
                color={solicitud.urgencia === 'urgente' ? I.semanticDown : I.muted}
                strokeWidth={ICON_STROKE_WIDTH}
              />
              <Text
                style={[
                  styles.metaBadgeText,
                  { color: solicitud.urgencia === 'urgente' ? I.semanticDown : I.muted },
                ]}
              >
                {solicitud.urgencia === 'urgente' ? 'Urgente' : 'Normal'}
              </Text>
            </View>

            <View
              style={[
                styles.metaBadge,
                requiereRepuestos
                  ? {
                      backgroundColor: withOpacity(I.primary, 0.1),
                      borderColor: withOpacity(I.primary, 0.28),
                    }
                  : {
                      backgroundColor: withOpacity(I.accentYellow, 0.14),
                      borderColor: withOpacity(I.accentYellow, 0.45),
                    },
              ]}
            >
              <InstitutionalIcon
                name={requiereRepuestos ? 'build' : 'build-circle'}
                size={16}
                color={requiereRepuestos ? I.primary : I.body}
                strokeWidth={ICON_STROKE_WIDTH}
              />
              <Text style={[styles.metaBadgeText, { color: requiereRepuestos ? I.primary : I.body }]}>
                {requiereRepuestos ? 'Con repuestos' : 'Sin repuestos'}
              </Text>
            </View>

            {solicitud.tiempo_restante ? (
              <View style={[styles.metaBadge, styles.metaBadgeNeutral]}>
                <InstitutionalIcon name="access-time" size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={[styles.metaBadgeText, { color: I.muted }]}>{solicitud.tiempo_restante}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeaderTitle}>Cliente y vehículo</Text>
            <View style={styles.clientInfoContainer}>
              <View style={styles.clientAvatarWrap}>
                {solicitud.cliente_info?.foto_perfil ? (
                  <Image source={{ uri: solicitud.cliente_info.foto_perfil }} style={styles.clientAvatar} />
                ) : (
                  <View style={styles.clientAvatarPlaceholder}>
                    <InstitutionalIcon name="person" size={36} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                  </View>
                )}
              </View>
              <Text style={styles.clientName} numberOfLines={2}>
                {solicitud.cliente_info?.nombre || solicitud.cliente_nombre || 'Cliente'}
              </Text>
            </View>

            <View style={styles.vehicleCard}>
              <View style={styles.vehicleCardHeader}>
                <InstitutionalIcon name="directions-car" size={20} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.vehicleCardTitle}>Vehículo</Text>
              </View>
              <View style={styles.vehicleTitleRow}>
                <Text style={styles.vehicleMarcaModelo} numberOfLines={2}>
                  <Text style={styles.vehicleHighlight}>{solicitud.vehiculo_info.marca}</Text>{' '}
                  {solicitud.vehiculo_info.modelo}
                </Text>
                {solicitud.vehiculo_info.patente ? (
                  <View style={styles.patentePill}>
                    <InstitutionalIcon name="badge" size={14} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.patentePillText}>{solicitud.vehiculo_info.patente}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.vehiculoGrid}>
                <View style={styles.vehiculoGridItem}>
                  <View style={styles.vehiculoGridItemHeader}>
                    <InstitutionalIcon name="calendar-today" size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.vehiculoGridItemLabel}>Año</Text>
                  </View>
                  <Text style={styles.vehiculoGridItemValue}>
                    {solicitud.vehiculo_info.año || solicitud.vehiculo_info.anio || 'N/A'}
                  </Text>
                </View>
                <View style={styles.vehiculoGridItem}>
                  <View style={styles.vehiculoGridItemHeader}>
                    <InstitutionalIcon name="speed" size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.vehiculoGridItemLabel}>Kilometraje</Text>
                  </View>
                  <Text style={styles.vehiculoGridItemValue}>
                    {solicitud.vehiculo_info.kilometraje
                      ? `${solicitud.vehiculo_info.kilometraje.toLocaleString('es-CL')} km`
                      : 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.vehiculoGrid}>
                <View style={styles.vehiculoGridItem}>
                  <View style={styles.vehiculoGridItemHeader}>
                    <InstitutionalIcon name="settings" size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.vehiculoGridItemLabel}>Motor</Text>
                  </View>
                  <Text style={styles.vehiculoGridItemValue}>{solicitud.vehiculo_info.tipo_motor || 'N/A'}</Text>
                </View>
                <View style={styles.vehiculoGridItem}>
                  <View style={styles.vehiculoGridItemHeader}>
                    <InstitutionalIcon name="tune" size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.vehiculoGridItemLabel}>Cilindraje</Text>
                  </View>
                  <Text style={styles.vehiculoGridItemValue}>{solicitud.vehiculo_info.cilindraje || 'N/A'}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeaderTitle}>Servicios solicitados</Text>
            {solicitud.servicios_solicitados_detail && solicitud.servicios_solicitados_detail.length > 0 ? (
              <View style={styles.serviciosListaDetalle}>
                {solicitud.servicios_solicitados_detail.map((servicio, index) => {
                  const detalle = detallesOfertaPorServicio.get(Number(servicio.id));
                  const repuestos = detalle?.repuestos_info ?? [];
                  return (
                    <View key={servicio.id || index} style={styles.servicioDetalleCard}>
                      <Text style={styles.servicioDetalleNombre} numberOfLines={3}>
                        {servicio.nombre}
                      </Text>
                      {repuestos.length > 0 ? (
                        <View style={styles.repuestosOfertaBlock}>
                          <Text style={styles.repuestosOfertaLabel}>Repuestos incluidos</Text>
                          {repuestos.map((rep, repIdx) => (
                            <View
                              key={String(rep.id ?? repIdx)}
                              style={styles.repuestoOfertaRow}
                            >
                              <Text style={styles.repuestoOfertaNombre} numberOfLines={2}>
                                {rep.nombre}
                                {(rep.cantidad ?? 1) > 1 ? ` × ${rep.cantidad}` : ''}
                              </Text>
                              <Text style={styles.repuestoOfertaPrecio}>
                                {fmtRepuestoLinea(rep)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.serviciosEmptyText}>No hay servicios especificados</Text>
            )}

            <View style={styles.descripcionBlock}>
              <View style={styles.descripcionBlockHeader}>
                <InstitutionalIcon name="description" size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.descripcionBlockLabel}>Descripción del problema</Text>
              </View>
              <Text style={styles.descriptionText}>{solicitud.descripcion_problema}</Text>
            </View>

            {Array.isArray(solicitud.fotos_necesidad) && solicitud.fotos_necesidad.length > 0 ? (
              <View style={styles.fotosClienteSection}>
                <View style={styles.descripcionBlockHeader}>
                  <InstitutionalIcon name="image" size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                  <Text style={styles.descripcionBlockLabel}>Fotos del cliente</Text>
                </View>
                <Text style={styles.fotosClienteHint}>Toca una imagen para verla en grande.</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.fotosClienteRow}
                >
                  {solicitud.fotos_necesidad.map((foto) => {
                    const url = foto?.imagen_url;
                    if (!url) return null;
                    return (
                      <TouchableOpacity
                        key={foto.id || url}
                        onPress={() => setFotoAmpliadaUrl(url)}
                        activeOpacity={0.85}
                        style={styles.fotosClienteThumbWrap}
                      >
                        <Image source={{ uri: url }} style={styles.fotosClienteThumb} resizeMode="cover" />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}
          </View>

          {tecnicoSolicitud ? (
            <View style={styles.section}>
              <Text style={styles.sectionHeaderTitle}>Técnico preferido</Text>
              <View style={styles.tecnicoCard}>
                {tecnicoSolicitud.foto_url ? (
                  <Image source={{ uri: tecnicoSolicitud.foto_url }} style={styles.tecnicoAvatar} />
                ) : (
                  <View style={styles.tecnicoAvatarPlaceholder}>
                    <InstitutionalIcon name="person" size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                  </View>
                )}
                <View style={styles.tecnicoInfo}>
                  <Text style={styles.tecnicoNombre}>{tecnicoSolicitud.nombre}</Text>
                  {tecnicoSolicitud.modalidad_display ? (
                    <Text style={styles.tecnicoSub}>{tecnicoSolicitud.modalidad_display}</Text>
                  ) : null}
                  {tecnicoSolicitud.especialidades?.length ? (
                    <Text style={styles.tecnicoSub} numberOfLines={2}>
                      {tecnicoSolicitud.especialidades.map((e) => e.nombre).join(' · ')}
                    </Text>
                  ) : null}
                  {miOferta?.es_cambio_tecnico ? (
                    <Text style={styles.tecnicoCambio}>Cambio de técnico propuesto al cliente</Text>
                  ) : null}
                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionHeaderTitle}>Fecha y hora preferida</Text>
            {fechaHoraPantalla.propuestaPendiente ? (
              <View style={styles.fechaPropuestaBanner}>
                <InstitutionalIcon name="schedule" size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.fechaPropuestaBannerText}>
                  Propuesta enviada — el cliente aún no la ha confirmado
                </Text>
              </View>
            ) : null}
            <View style={styles.dateTimeRow}>
              <InstitutionalIcon name="calendar-today" size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
              <View style={styles.dateTimeTextos}>
                <Text style={styles.dateTimeLabel}>Fecha</Text>
                <Text style={styles.dateTimeValue}>{formatearFecha(fechaHoraPantalla.fecha)}</Text>
              </View>
            </View>
            <View style={styles.dateTimeDivider} />
            <View style={styles.dateTimeRow}>
              <InstitutionalIcon name="access-time" size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
              <View style={styles.dateTimeTextos}>
                <Text style={styles.dateTimeLabel}>Hora</Text>
                <Text style={styles.dateTimeValue}>{formatearHora(fechaHoraPantalla.hora)}</Text>
              </View>
            </View>
            {puedeGestionarCatalogo ? (
              <TouchableOpacity
                style={styles.fechaProponerLink}
                onPress={() => setMostrarModalFecha(true)}
                activeOpacity={0.75}
              >
                <InstitutionalIcon name="event" size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.fechaProponerLinkText}>Proponer otra fecha al cliente</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeaderTitle}>Ubicación del servicio</Text>
            <View style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <InstitutionalIcon name="location-on" size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <View style={styles.addressContent}>
                  <Text style={styles.addressText}>{solicitud.direccion_servicio_texto}</Text>
                  {solicitud.detalles_ubicacion ? (
                    <Text style={styles.addressDetailsText}>{solicitud.detalles_ubicacion}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          </View>

          {miOferta ? (
            <View style={styles.section}>
              <View style={styles.ofertaHighlightCard}>
                <View style={styles.ofertaStatusHeader}>
                  <InstitutionalIcon name="local-offer" size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                  <Text style={styles.ofertaStatusTitle}>
                    {esAsignacionCatalogo ? 'Asignación desde catálogo' : 'Mi oferta'}
                  </Text>
                </View>
                {esAsignacionCatalogo ? (
                  <Text style={styles.catalogoContextHint}>
                    {puedeGestionarCatalogo
                      ? 'El cliente eligió tu servicio publicado. Revisa los datos, conversa si necesitas aclarar algo y luego acepta o rechaza.'
                      : 'Esperando que el cliente confirme la fecha que propusiste.'}
                  </Text>
                ) : null}
                <View style={styles.estadoOfertaRow}>
                  <View style={[styles.estadoOfertaPill, { backgroundColor: withOpacity(I.primary, 0.12) }]}>
                    <Text style={[styles.estadoOfertaPillText, { color: I.primary }]}>
                      {textoEstadoOferta(miOferta.estado)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.ofertaPrecio}>
                  {parseFloat(miOferta.precio_total_ofrecido).toLocaleString('es-CL', {
                    style: 'currency',
                    currency: 'CLP',
                    minimumFractionDigits: 0,
                  })}
                </Text>
                {puedeChatCatalogo ||
                miOferta.estado === 'aceptada' ||
                miOferta.estado === 'pagada' ? (
                  <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => router.push(`/chat-oferta/${miOferta.id}`)}
                    activeOpacity={0.85}
                  >
                    <InstitutionalIcon name="chat" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.chatButtonText}>Ver chat con cliente</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : null}

          {miOferta &&
          (miOferta.estado === 'aceptada' || miOferta.estado === 'pagada') &&
          solicitud.estado === 'pagada' ? (
            <View style={styles.section}>
              <View style={styles.serviciosAdicionalesHeader}>
                <InstitutionalIcon name="add-circle-outline" size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.sectionHeaderTitleInline}>Servicios adicionales</Text>
              </View>
              <Text style={styles.serviciosAdicionalesDescripcion}>
                Si durante el servicio descubres problemas adicionales, puedes crear ofertas para servicios adicionales.
              </Text>

              {ofertasSecundarias.length > 0 ? (
                <View style={styles.ofertasSecundariasList}>
                  {ofertasSecundarias.map((ofertaSec) => {
                    const ok = ofertaSec.estado === 'aceptada' || ofertaSec.estado === 'pagada';
                    return (
                      <View key={ofertaSec.id} style={styles.ofertaSecundariaCard}>
                        <View style={styles.ofertaSecundariaHeader}>
                          <View style={styles.ofertaSecundariaInfo}>
                            <Text style={styles.ofertaSecundariaPrecio}>
                              {parseFloat(ofertaSec.precio_total_ofrecido).toLocaleString('es-CL', {
                                style: 'currency',
                                currency: 'CLP',
                                minimumFractionDigits: 0,
                              })}
                            </Text>
                            <Text style={styles.ofertaSecundariaEstado}>{textoEstadoOferta(ofertaSec.estado)}</Text>
                          </View>
                          <View
                            style={[
                              styles.ofertaSecundariaBadge,
                              {
                                backgroundColor: ok ? I.semanticUp : withOpacity(I.accentYellow, 0.35),
                                borderColor: ok ? withOpacity(I.semanticUp, 0.4) : I.accentYellow,
                              },
                            ]}
                          >
                            <InstitutionalIcon
                              name={ok ? 'check' : 'hourglass-empty'}
                              size={18}
                              color={ok ? I.onPrimary : I.ink}
                              strokeWidth={ICON_STROKE_WIDTH}
                            />
                          </View>
                        </View>
                        {ofertaSec.motivo_servicio_adicional ? (
                          <Text style={styles.ofertaSecundariaMotivo} numberOfLines={3}>
                            {ofertaSec.motivo_servicio_adicional}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.agregarServicioButton}
                onPress={() => {
                  router.push(`/crear-oferta-secundaria/${solicitud.id}/${miOferta.id}`);
                }}
                activeOpacity={0.85}
              >
                <InstitutionalIcon name="add-circle" size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.agregarServicioButtonText}>Agregar servicio adicional</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>

        {tienePieDecisionCatalogo
          ? renderFooterActions(
              {
                label: 'Aceptar asignación',
                icon: 'check-circle',
                onPress: handleConfirmarCatalogo,
                loading: confirmandoCatalogo,
                disabled: rechazando,
              },
              {
                label: 'Rechazar',
                icon: 'cancel',
                onPress: handleRechazarCatalogo,
                loading: rechazando,
                disabled: confirmandoCatalogo,
              },
            )
          : null}

        {!miOferta && solicitud.estado !== 'pendiente_confirmacion'
          ? renderFooterActions(
              {
                label: 'Crear oferta',
                icon: 'add-circle',
                onPress: () => router.push(`/crear-oferta/${solicitud.id}`),
              },
              {
                label: 'Rechazar oferta',
                icon: 'cancel',
                onPress: () => setMostrarModalRechazo(true),
                loading: rechazando,
              },
            )
          : null}

        <RechazarSolicitudModal
          visible={mostrarModalRechazo}
          onClose={() => setMostrarModalRechazo(false)}
          onConfirm={handleRechazar}
          loading={rechazando}
        />

        <ProponerFechaCatalogoModal
          visible={mostrarModalFecha}
          fechaReferencia={fechaHoraPantalla.fecha || solicitud?.fecha_preferida}
          horaReferencia={fechaHoraPantalla.hora ?? solicitud?.hora_preferida}
          loading={proponiendoFecha}
          mecanicos={mecanicosEquipo.map((m) => ({
            id: m.id,
            nombre: m.nombre,
            foto_url: m.foto_url,
            modalidad_display: m.modalidad_tecnico_display,
          }))}
          miembroInicial={miembroInicialPropuesta}
          onClose={() => setMostrarModalFecha(false)}
          onConfirm={handleProponerFechaCatalogo}
        />

        <Modal visible={!!fotoAmpliadaUrl} transparent animationType="fade" onRequestClose={() => setFotoAmpliadaUrl(null)}>
          <Pressable style={styles.fotoLightboxBackdrop} onPress={() => setFotoAmpliadaUrl(null)}>
            {fotoAmpliadaUrl ? (
              <Image source={{ uri: fotoAmpliadaUrl }} style={styles.fotoLightboxImage} resizeMode="contain" />
            ) : null}
          </Pressable>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  screenRoot: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: SPACING.fixed.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.fixed.sm,
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    color: I.ink,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.fixed.xl,
  },
  emptyText: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    color: I.ink,
    textAlign: 'center',
  },

  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.md,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
  },
  metaBadgeNeutral: {
    backgroundColor: I.surfaceStrong,
    borderColor: I.hairline,
  },
  metaBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
  },

  section: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.fixed.md,
    marginBottom: SPACING.fixed.md,
    ...SHADOWS.editorial,
  },
  sectionHeaderTitle: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    letterSpacing: TS.h4.letterSpacing,
    color: I.ink,
    marginBottom: SPACING.fixed.sm,
  },
  sectionHeaderTitleInline: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    letterSpacing: TS.h4.letterSpacing,
    color: I.ink,
    marginBottom: 0,
    flex: 1,
  },

  clientInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.md,
  },
  clientAvatarWrap: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  clientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: I.surfaceStrong,
  },
  clientAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: withOpacity(I.primary, 0.12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientName: {
    flex: 1,
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    color: I.ink,
  },

  vehicleCard: {
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.sm + 2,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    gap: SPACING.fixed.sm,
  },
  vehicleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  vehicleCardTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.muted,
  },
  vehicleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
  },
  vehicleMarcaModelo: {
    flex: 1,
    minWidth: 0,
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    color: I.ink,
  },
  vehicleHighlight: {
    fontFamily: FF.sansSemiBold,
    color: I.primary,
  },
  patentePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: withOpacity(I.primary, 0.1),
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.primary, 0.25),
  },
  patentePillText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.primary,
    letterSpacing: 0.4,
  },
  vehiculoGrid: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
  },
  vehiculoGridItem: {
    flex: 1,
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.sm + 2,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  vehiculoGridItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  vehiculoGridItemLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    lineHeight: lh(TYPOGRAPHY.fontSize.xs, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
  },
  vehiculoGridItemValue: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.ink,
  },

  serviciosListaDetalle: {
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.md,
  },
  servicioDetalleCard: {
    backgroundColor: I.surfaceStrong,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.sm + 2,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  servicioDetalleNombre: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.ink,
  },
  repuestosOfertaBlock: {
    marginTop: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.sm,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
    gap: 6,
  },
  repuestosOfertaLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.xs, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
  },
  repuestoOfertaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
  repuestoOfertaNombre: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.ink,
  },
  repuestoOfertaPrecio: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.primary,
    fontVariant: ['tabular-nums'],
  },
  serviciosBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.md,
  },
  servicioBadge: {
    backgroundColor: I.surfaceStrong,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    maxWidth: '100%',
  },
  servicioBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.ink,
  },
  serviciosEmptyText: {
    fontSize: TS.small.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.small.fontSize, TS.small.lineHeight),
    color: I.muted,
    fontStyle: 'italic',
    marginBottom: SPACING.fixed.md,
  },
  descripcionBlock: {
    marginTop: SPACING.fixed.xs,
    paddingTop: SPACING.fixed.md,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
  },
  descripcionBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    marginBottom: SPACING.fixed.sm,
  },
  descripcionBlockLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  descriptionText: {
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    color: I.ink,
  },
  fotosClienteSection: {
    marginTop: SPACING.fixed.md,
    paddingTop: SPACING.fixed.md,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
  },
  fotosClienteHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
    marginBottom: SPACING.fixed.sm,
  },
  fotosClienteRow: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
    paddingVertical: 4,
  },
  fotosClienteThumbWrap: {
    borderRadius: BORDERS.radius.md,
    overflow: 'hidden',
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  fotosClienteThumb: {
    width: 96,
    height: 96,
  },
  fotoLightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.fixed.md,
  },
  fotoLightboxImage: {
    width: '100%' as const,
    height: '100%' as const,
    maxHeight: 640,
  },

  tecnicoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.fixed.md,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.canvas,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    gap: SPACING.fixed.sm,
  },
  tecnicoAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  tecnicoAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: I.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tecnicoInfo: {
    flex: 1,
    gap: 2,
  },
  tecnicoNombre: {
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  tecnicoSub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.body,
  },
  tecnicoCambio: {
    marginTop: 4,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    color: I.primary,
  },

  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
  },
  dateTimeTextos: {
    flex: 1,
    gap: 2,
  },
  dateTimeLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  dateTimeValue: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.ink,
  },
  dateTimeDivider: {
    height: BORDERS.width.thin,
    backgroundColor: I.hairline,
    marginVertical: SPACING.fixed.sm,
  },

  addressCard: {
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.fixed.md,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
  },
  addressContent: {
    flex: 1,
  },
  addressText: {
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansMedium,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    color: I.ink,
  },
  addressDetailsText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
    marginTop: SPACING.fixed.xs,
  },

  ofertaHighlightCard: {
    backgroundColor: withOpacity(I.primary, 0.06),
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.md,
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.primary, 0.2),
  },
  ofertaStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  ofertaStatusTitle: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    color: I.ink,
  },
  estadoOfertaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  estadoOfertaPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
  },
  estadoOfertaPillText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
  },
  ofertaPrecio: {
    fontSize: TS.numberDisplay.fontSize,
    fontFamily: FF.monoMedium,
    lineHeight: lh(TS.numberDisplay.fontSize, TS.numberDisplay.lineHeight),
    color: I.primary,
    marginBottom: SPACING.fixed.md,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.sm,
    backgroundColor: I.primary,
    borderRadius: BORDERS.radius.pill,
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
    ...SHADOWS.editorial,
  },
  chatButtonText: {
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.button.fontSize, TS.button.lineHeight),
    color: I.onPrimary,
  },

  serviciosAdicionalesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.xs,
  },
  serviciosAdicionalesDescripcion: {
    fontSize: TS.small.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.small.fontSize, TS.small.lineHeight),
    color: I.body,
    marginBottom: SPACING.fixed.md,
  },
  ofertasSecundariasList: {
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.md,
  },
  ofertaSecundariaCard: {
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.surfaceSoft,
  },
  ofertaSecundariaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ofertaSecundariaInfo: {
    flex: 1,
    marginRight: SPACING.fixed.sm,
  },
  ofertaSecundariaPrecio: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.monoMedium,
    lineHeight: lh(TYPOGRAPHY.fontSize.lg, TS.numberDisplay.lineHeight),
    color: I.primary,
    marginBottom: 4,
  },
  ofertaSecundariaEstado: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
  },
  ofertaSecundariaBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: BORDERS.width.thin,
  },
  ofertaSecundariaMotivo: {
    fontSize: TS.small.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.small.fontSize, TS.small.lineHeight),
    color: I.body,
    marginTop: SPACING.fixed.sm,
  },
  agregarServicioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.fixed.sm + 2,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderStyle: 'dashed',
    borderColor: I.primary,
    backgroundColor: withOpacity(I.primary, 0.06),
    gap: SPACING.fixed.sm,
  },
  agregarServicioButtonText: {
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.button.fontSize, TS.button.lineHeight),
    color: I.primary,
  },

  catalogoContextHint: {
    fontSize: TS.caption.fontSize,
    fontFamily: FF.sansRegular,
    color: I.body,
    lineHeight: lh(TS.caption.fontSize, TS.caption.lineHeight),
    marginBottom: SPACING.fixed.sm,
  },
  fechaPropuestaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    marginTop: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.xs + 2,
    paddingHorizontal: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.md,
    backgroundColor: withOpacity(I.primary, 0.08),
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.primary, 0.22),
  },
  fechaPropuestaBannerText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.body,
  },
  fechaProponerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    marginTop: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.xs,
    alignSelf: 'flex-start',
  },
  fechaProponerLinkText: {
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.button.fontSize, TS.button.lineHeight),
    color: I.primary,
  },
  fixedActionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: I.canvas,
    paddingHorizontal: hx,
    paddingTop: SPACING.fixed.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    ...(Platform.OS === 'web'
      ? { zIndex: 40 }
      : shadowFooter),
  },
  fixedActionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.fixed.sm,
    maxWidth: Platform.OS === 'web' ? 480 : undefined,
    width: '100%',
    alignSelf: 'center',
  },
  footerBtnOutline: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.xs,
    paddingVertical: 10,
    paddingHorizontal: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.canvas,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  footerBtnOutlineText: {
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.button.fontSize, TS.button.lineHeight),
    color: I.semanticDown,
  },
  footerBtnPrimary: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.xs,
    paddingVertical: 10,
    paddingHorizontal: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.primary,
    borderWidth: BORDERS.width.thin,
    borderColor: I.primary,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  footerBtnPrimaryText: {
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.button.fontSize, TS.button.lineHeight),
    color: I.onPrimary,
  },
  footerBtnPressed: {
    opacity: 0.88,
  },
  footerBtnDisabled: {
    opacity: 0.55,
  },
});
