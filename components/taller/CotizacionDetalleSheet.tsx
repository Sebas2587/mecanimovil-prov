import React, { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck,
  Check,
  FileText,
  MessageCircle,
  Phone,
  RotateCcw,
  X,
} from 'lucide-react-native';
import { BottomSheet } from '@/design-system/components/BottomSheet';
import { InstitutionalText } from '@/design-system/components/InstitutionalText';
import { BORDERS, COLORS, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/design-system/iconography';
import cotizacionCanalService, { type CotizacionCanal } from '@/services/cotizacionCanalService';
import { useCotizacionCanalDetalleQuery, COTIZACION_CANAL_DETALLE_QUERY_KEY } from '@/hooks/useCotizacionCanalDetalleQuery';
import { COTIZACIONES_CANAL_QUERY_KEY } from '@/hooks/useCotizacionesCanalTallerQuery';
import { PIPELINE_COMERCIAL_QUERY_KEY } from '@/hooks/usePipelineComercialQuery';
import { CotizacionEstadoBadge } from '@/components/taller/CotizacionEstadoBadge';
import { omnichannelChatHref } from '@/utils/chatRoutes';
import {
  abrirWhatsAppCotizacion,
  mensajeCotizacionParaCliente,
} from '@/utils/compartirCotizacionCliente';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { showAlert, showAlertButtons } from '@/utils/platformAlert';
import {
  estadoCotizacionVista,
  etiquetaEstadoCotizacion,
  fechaCortaCotizacion,
  fechaLargaCotizacion,
  lineasDesgloseCotizacion,
  montoCotizacion,
} from '@/utils/cotizacionPresentacion';

const I = COLORS.institutional;

type Props = {
  cotizacionId: number | null;
  onClose: () => void;
};

function CotizacionDetalleSheetInner({ cotizacionId, onClose }: Props) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const detalleQuery = useCotizacionCanalDetalleQuery(cotizacionId, cotizacionId != null);
  const cotizacion = detalleQuery.data;

  const refrescar = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [COTIZACIONES_CANAL_QUERY_KEY] }),
      queryClient.invalidateQueries({ queryKey: [PIPELINE_COMERCIAL_QUERY_KEY] }),
      cotizacionId
        ? queryClient.invalidateQueries({ queryKey: [COTIZACION_CANAL_DETALLE_QUERY_KEY, cotizacionId] })
        : Promise.resolve(),
    ]);
  }, [cotizacionId, queryClient]);

  const abrirDocumento = useCallback(() => {
    if (!cotizacionId) return;
    onClose();
    router.push(`/cotizacion-canal/${cotizacionId}`);
  }, [cotizacionId, onClose]);

  const agendar = useCallback(() => {
    if (!cotizacion) return;
    const citaId = cotizacion.cita_ultima_id || cotizacion.cita_personal_id || cotizacion.cita_origen_id;
    onClose();
    if (citaId) {
      router.push(`/cita-agenda-personal/${citaId}`);
      return;
    }
    router.push(`/cotizacion-canal/${cotizacion.id}`);
  }, [cotizacion, onClose]);

  const aceptar = useCallback(async () => {
    if (!cotizacionId) return;
    setBusy(true);
    try {
      await cotizacionCanalService.marcarAceptada(cotizacionId);
      await refrescar();
    } catch {
      showAlert('No se pudo aceptar', 'Solo una cotización enviada puede marcarse como aceptada.');
    } finally {
      setBusy(false);
    }
  }, [cotizacionId, refrescar]);

  const rechazar = useCallback(() => {
    if (!cotizacionId) return;
    showAlertButtons(
      'El cliente no aceptó',
      'La cotización queda en el historial y se puede reabrir desde el documento.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'No aceptó',
          style: 'destructive',
          onPress: () => {
            setBusy(true);
            void cotizacionCanalService.marcarPerdida(cotizacionId)
              .then(() => refrescar())
              .catch(() => {
                showAlert('No se pudo cerrar', 'Revisa la cotización e inténtalo de nuevo.');
              })
              .finally(() => setBusy(false));
          },
        },
      ],
    );
  }, [cotizacionId, refrescar]);

  const llamar = useCallback(() => {
    const tel = (cotizacion?.cliente_telefono || '').replace(/\s/g, '');
    if (!tel) return;
    void Linking.openURL(`tel:${tel}`);
  }, [cotizacion?.cliente_telefono]);

  const whatsapp = useCallback(() => {
    if (!cotizacion) return;
    const url = cotizacion.share_url || cotizacion.url_publica || '';
    const primero = (cotizacion.cliente_nombre || '').trim().split(/\s+/)[0];
    const saludo = primero ? `Hola ${primero}` : 'Hola';
    const mensaje = url
      ? mensajeCotizacionParaCliente({
        clienteNombre: cotizacion.cliente_nombre,
        numeroPublico: cotizacion.numero_publico,
        servicio: cotizacion.servicio_nombre,
        totalClp: cotizacion.total_clp,
        url,
      })
      : `${saludo}, te escribimos por tu cotización${cotizacion.numero_publico ? ` ${cotizacion.numero_publico}` : ''}.`;
    void abrirWhatsAppCotizacion({
      telefono: cotizacion.cliente_telefono,
      url,
      mensaje,
    });
  }, [cotizacion]);

  const abrirChat = useCallback(() => {
    if (!cotizacion?.conversation) return;
    onClose();
    router.push(omnichannelChatHref(cotizacion.conversation, {
      name: cotizacion.cliente_nombre,
      phone: cotizacion.cliente_telefono,
    }));
  }, [cotizacion, onClose]);

  const estado = cotizacion ? estadoCotizacionVista(cotizacion) : null;
  const lineas = useMemo(
    () => (cotizacion ? lineasDesgloseCotizacion(cotizacion) : []),
    [cotizacion],
  );
  const vehiculo = cotizacion
    ? [cotizacion.vehiculo_marca, cotizacion.vehiculo_modelo, cotizacion.vehiculo_anio]
      .filter(Boolean)
      .join(' ')
    : '';
  const enviadaEn = cotizacion?.enviada_en || cotizacion?.creado_en;

  return (
    <BottomSheet
      visible={cotizacionId != null}
      onClose={onClose}
      stickyFooter
      style={styles.sheet}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!cotizacion ? (
          <View style={styles.cargando}>
            <ActivityIndicator color={I.primary} />
          </View>
        ) : (
          <View style={styles.cuerpo}>
            <View style={styles.cabecera}>
              <View style={styles.cabeceraCopy}>
                <InstitutionalText role="caption" color="body">
                  {cotizacion.numero_publico || `Cotización ${cotizacion.id}`}
                </InstitutionalText>
                <InstitutionalText role="caption" color="body">
                  {enviadaEn ? `Enviada el ${fechaCortaCotizacion(enviadaEn)}` : 'Todavía no se envía'}
                </InstitutionalText>
              </View>
              <CotizacionEstadoBadge
                estado={estado || 'enviada'}
                label={etiquetaEstadoCotizacion(cotizacion)}
                suave
              />
            </View>

            <View style={styles.hero}>
              <InstitutionalText role="h3">
                {cotizacion.servicio_nombre?.trim() || 'Servicio'}
              </InstitutionalText>
              <InstitutionalText role="caption" color="body">
                {[vehiculo, cotizacion.vehiculo_patente ? `Patente ${cotizacion.vehiculo_patente}` : '']
                  .filter(Boolean)
                  .join(' · ')}
              </InstitutionalText>
            </View>

            <View style={styles.cliente}>
              <View style={styles.clienteCopy}>
                <InstitutionalText role="bodyBold" numberOfLines={1}>
                  {cotizacion.cliente_nombre?.trim() || 'Cliente'}
                </InstitutionalText>
                <InstitutionalText role="caption" color="body" numberOfLines={1}>
                  {cotizacion.cliente_telefono || 'Sin teléfono'}
                </InstitutionalText>
              </View>
              <IconoCircular
                label={`Llamar a ${cotizacion.cliente_nombre || 'cliente'}`}
                onPress={llamar}
                disabled={!cotizacion.cliente_telefono}
              >
                <Phone size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
              </IconoCircular>
              <IconoCircular
                label="Enviar por WhatsApp"
                onPress={whatsapp}
                disabled={!cotizacion.cliente_telefono}
              >
                <MessageCircle size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
              </IconoCircular>
            </View>

            {cotizacion.conversation ? (
              <Pressable onPress={abrirChat} style={styles.chat} accessibilityRole="button">
                <MessageCircle size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <InstitutionalText role="captionBold" color="primary">
                  Abrir chat de la cotización
                </InstitutionalText>
              </Pressable>
            ) : null}

            {estado === 'agendada' && cotizacion.fecha_agendada ? (
              <View style={styles.cita}>
                <View style={styles.citaIcono}>
                  <CalendarCheck size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                </View>
                <View style={styles.clienteCopy}>
                  <InstitutionalText role="bodyBold">
                    {fechaLargaCotizacion(cotizacion.fecha_agendada)}
                  </InstitutionalText>
                  <InstitutionalText role="caption" color="body">
                    {[cotizacion.hora_agendada?.slice(0, 5), cotizacion.modalidad === 'domicilio' ? 'A domicilio' : 'Recepción en taller']
                      .filter(Boolean)
                      .join(' · ')}
                  </InstitutionalText>
                </View>
              </View>
            ) : null}

            <View style={styles.bloque}>
              <InstitutionalText role="bodyBold">Desglose</InstitutionalText>
              {lineas.length === 0 ? (
                <InstitutionalText role="caption" color="body">
                  El detalle de piezas y mano de obra está en el documento.
                </InstitutionalText>
              ) : (
                lineas.map((linea) => (
                  <View key={linea.id} style={styles.linea}>
                    <InstitutionalText role="caption" color="body" style={styles.lineaLabel}>
                      {linea.label}{linea.cantidad > 1 ? ` × ${linea.cantidad}` : ''}
                    </InstitutionalText>
                    <InstitutionalText role="caption">{formatearMontoCLP(linea.monto)}</InstitutionalText>
                  </View>
                ))
              )}
              {(cotizacion.descuento_clp || 0) > 0 ? (
                <View style={styles.linea}>
                  <InstitutionalText role="caption" color="body">Descuento</InstitutionalText>
                  <InstitutionalText role="caption">−{formatearMontoCLP(cotizacion.descuento_clp)}</InstitutionalText>
                </View>
              ) : null}
              <View style={styles.total}>
                <InstitutionalText role="bodyBold">Total</InstitutionalText>
                <InstitutionalText role="bodyBold">{formatearMontoCLP(montoCotizacion(cotizacion))}</InstitutionalText>
              </View>
            </View>

            <Seguimiento cotizacion={cotizacion} />

            {cotizacion.notas_internas?.trim() ? (
              <View style={styles.notas}>
                <InstitutionalText role="caption" color="body">
                  {cotizacion.notas_internas.trim()}
                </InstitutionalText>
              </View>
            ) : null}

            <Pressable onPress={abrirDocumento} style={styles.documento} accessibilityRole="button">
              <FileText size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
              <InstitutionalText role="captionBold">Abrir documento completo</InstitutionalText>
            </Pressable>
          </View>
        )}
      </ScrollView>
      {cotizacion && estado ? (
        <Acciones
          estado={estado}
          busy={busy}
          onAceptar={() => void aceptar()}
          onRechazar={rechazar}
          onAgendar={agendar}
          onAbrir={abrirDocumento}
        />
      ) : null}
    </BottomSheet>
  );
}

export const CotizacionDetalleSheet = memo(CotizacionDetalleSheetInner);

function Seguimiento({ cotizacion }: { cotizacion: CotizacionCanal }) {
  const estado = estadoCotizacionVista(cotizacion);
  const enviada = Boolean(cotizacion.enviada_en);
  const pasos = [
    {
      label: enviada ? 'Cotización enviada' : 'Borrador por revisar',
      fecha: fechaCortaCotizacion(cotizacion.enviada_en || cotizacion.creado_en) || 'Pendiente',
      hecho: enviada || estado !== 'borrador',
    },
    {
      label: cotizacion.visto_en ? 'El cliente la abrió' : 'Esperando que la abra',
      fecha: cotizacion.visto_en ? fechaCortaCotizacion(cotizacion.visto_en) : 'Sin apertura',
      hecho: Boolean(cotizacion.visto_en),
    },
    {
      label: estado === 'rechazada' ? 'Cliente no aceptó' : 'Cliente aceptó',
      fecha: estado === 'rechazada'
        ? (fechaCortaCotizacion(cotizacion.rechazada_en) || 'Cerrada')
        : (fechaCortaCotizacion(cotizacion.aceptada_en) || 'Esperando respuesta'),
      hecho: estado === 'aceptada' || estado === 'agendada' || estado === 'entregada' || estado === 'rechazada',
    },
  ];
  if (estado !== 'rechazada') {
    pasos.push({
      label: estado === 'entregada' ? 'Trabajo terminado' : 'Cita agendada',
      fecha: estado === 'entregada'
        ? 'El cliente ya firmó'
        : cotizacion.fecha_agendada
          ? `${fechaCortaCotizacion(cotizacion.fecha_agendada)}${cotizacion.hora_agendada ? ` · ${cotizacion.hora_agendada.slice(0, 5)}` : ''}`
          : 'Pendiente',
      hecho: estado === 'agendada' || estado === 'entregada',
    });
  }

  return (
    <View style={styles.bloque}>
      <InstitutionalText role="bodyBold">Seguimiento</InstitutionalText>
      {pasos.map((paso, index) => (
        <View key={paso.label} style={styles.paso}>
          <View style={styles.pasoMarca}>
            <View style={[styles.pasoPunto, paso.hecho && styles.pasoPuntoHecho]} />
            {index < pasos.length - 1 ? <View style={styles.pasoLinea} /> : null}
          </View>
          <View style={styles.pasoCopy}>
            <InstitutionalText role={paso.hecho ? 'captionBold' : 'caption'} color={paso.hecho ? 'ink' : 'body'}>
              {paso.label}
            </InstitutionalText>
            <InstitutionalText role="caption" color="body">{paso.fecha}</InstitutionalText>
          </View>
        </View>
      ))}
    </View>
  );
}

function Acciones({
  estado,
  busy,
  onAceptar,
  onRechazar,
  onAgendar,
  onAbrir,
}: {
  estado: ReturnType<typeof estadoCotizacionVista>;
  busy: boolean;
  onAceptar: () => void;
  onRechazar: () => void;
  onAgendar: () => void;
  onAbrir: () => void;
}) {
  if (busy) {
    return (
      <View style={styles.acciones}>
        <ActivityIndicator color={I.primary} />
      </View>
    );
  }
  if (estado === 'borrador') {
    return (
      <View style={styles.acciones}>
        <Boton label="Continuar cotización" onPress={onAbrir} primario icon={FileText} />
      </View>
    );
  }
  if (estado === 'enviada') {
    return (
      <View style={styles.accionesFila}>
        <Boton label="No aceptó" onPress={onRechazar} icon={X} />
        <Boton label="Cliente aceptó" onPress={onAceptar} primario icon={Check} flex={2} />
      </View>
    );
  }
  if (estado === 'entregada') {
    return (
      <View style={styles.acciones}>
        <Boton label="Ver el trabajo" onPress={onAgendar} icon={CalendarCheck} />
      </View>
    );
  }
  if (estado === 'aceptada' || estado === 'agendada') {
    return (
      <View style={styles.acciones}>
        <Boton
          label={estado === 'agendada' ? 'Reprogramar cita' : 'Agendar cita'}
          onPress={onAgendar}
          primario={estado === 'aceptada'}
          icon={CalendarCheck}
        />
      </View>
    );
  }
  return (
    <View style={styles.acciones}>
      <Boton label="Reabrir en el documento" onPress={onAbrir} icon={RotateCcw} />
    </View>
  );
}

function Boton({
  label,
  onPress,
  primario = false,
  icon: Icono,
  flex = 1,
}: {
  label: string;
  onPress: () => void;
  primario?: boolean;
  icon: typeof Check;
  flex?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.boton, primario ? styles.botonPrimario : styles.botonSecundario, { flex }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icono size={16} color={primario ? I.onPrimary : I.ink} strokeWidth={ICON_STROKE_WIDTH} />
      <InstitutionalText role="captionBold" color={primario ? 'onPrimary' : 'ink'}>
        {label}
      </InstitutionalText>
    </Pressable>
  );
}

function IconoCircular({
  children,
  onPress,
  label,
  disabled,
}: {
  children: React.ReactNode;
  onPress: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.icono, disabled && styles.iconoOff]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: {
    maxWidth: 560,
  },
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.fixed.md,
  },
  cargando: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuerpo: {
    gap: SPACING.fixed.md,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
  cabeceraCopy: {
    flex: 1,
    gap: 2,
  },
  hero: {
    gap: 4,
  },
  cliente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    paddingVertical: SPACING.fixed.md,
  },
  clienteCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  icono: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: I.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoOff: {
    opacity: 0.35,
  },
  chat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    minHeight: 44,
  },
  cita: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.surfaceSoft,
    padding: SPACING.fixed.md,
  },
  citaIcono: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: I.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloque: {
    gap: SPACING.fixed.sm,
  },
  linea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.fixed.md,
  },
  lineaLabel: {
    flex: 1,
  },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    paddingTop: SPACING.fixed.sm,
  },
  paso: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
  },
  pasoMarca: {
    alignItems: 'center',
    width: 14,
  },
  pasoPunto: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: I.muted,
    marginTop: 4,
  },
  pasoPuntoHecho: {
    borderColor: I.ink,
    backgroundColor: I.ink,
  },
  pasoLinea: {
    width: 1,
    flex: 1,
    backgroundColor: I.hairline,
    minHeight: 16,
  },
  pasoCopy: {
    flex: 1,
    paddingBottom: SPACING.fixed.sm,
    gap: 2,
  },
  notas: {
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.surfaceSoft,
    padding: SPACING.fixed.md,
  },
  documento: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    minHeight: 44,
  },
  acciones: {
    paddingTop: SPACING.fixed.sm,
  },
  accionesFila: {
    flexDirection: 'row',
    gap: SPACING.fixed.xs,
    paddingTop: SPACING.fixed.sm,
  },
  boton: {
    minHeight: 48,
    borderRadius: BORDERS.radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: SPACING.fixed.sm,
  },
  botonPrimario: {
    backgroundColor: I.primary,
  },
  botonSecundario: {
    borderWidth: 1,
    borderColor: I.hairline,
    backgroundColor: I.surfaceSoft,
  },
});
