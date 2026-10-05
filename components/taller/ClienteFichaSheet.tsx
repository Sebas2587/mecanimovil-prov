import React, { memo, useCallback } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { MessageCircle, Phone } from 'lucide-react-native';
import { BottomSheet } from '@/design-system/components/BottomSheet';
import { InstitutionalText } from '@/design-system/components/InstitutionalText';
import { BORDERS, COLORS, SHADOWS, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/design-system/iconography';
import { usePipelineClienteDetalleQuery } from '@/hooks/usePipelineClientesQuery';
import type { PipelineClienteCaso } from '@/services/pipelineComercialService';
import { CotizacionEstadoBadge } from '@/components/taller/CotizacionEstadoBadge';
import { abrirWhatsAppCotizacion } from '@/utils/compartirCotizacionCliente';
import { omnichannelChatHref } from '@/utils/chatRoutes';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { fechaCortaCotizacion, type EstadoCotizacionVista } from '@/utils/cotizacionPresentacion';
import { PASO_ETIQUETA, pasoDeCaso, type PasoComercial } from '@/utils/pasoComercial';

const I = COLORS.institutional;

type Props = {
  clienteKey: string | null;
  onClose: () => void;
  onOpenCotizacion: (cotizacionId: number) => void;
};

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('');
}

function estadoDePaso(paso: PasoComercial): EstadoCotizacionVista {
  if (paso === 'por_enviar') return 'borrador';
  if (paso === 'esperando') return 'enviada';
  if (paso === 'por_agendar') return 'aceptada';
  if (paso === 'en_agenda') return 'agendada';
  return 'borrador';
}

function ClienteFichaSheetInner({ clienteKey, onClose, onOpenCotizacion }: Props) {
  const { data, isPending } = usePipelineClienteDetalleQuery(clienteKey ?? undefined);
  const nombre = data?.cliente_nombre?.trim() || 'Cliente';
  const telefono = data?.cliente_telefono?.trim() || '';
  const casos = (data?.vehiculos ?? []).flatMap((vehiculo) => vehiculo.casos ?? []);

  const llamar = useCallback(() => {
    if (!telefono) return;
    void Linking.openURL(`tel:${telefono.replace(/\s/g, '')}`);
  }, [telefono]);

  const whatsapp = useCallback(() => {
    const primero = nombre.split(' ')[0] || '';
    void abrirWhatsAppCotizacion({
      telefono,
      url: '',
      mensaje: primero ? `Hola ${primero}, te escribimos del taller.` : 'Hola, te escribimos del taller.',
    });
  }, [nombre, telefono]);

  const abrirChat = useCallback(() => {
    if (!data?.conversation_id) return;
    onClose();
    router.push(omnichannelChatHref(data.conversation_id, {
      name: data.cliente_nombre,
      phone: data.cliente_telefono,
    }));
  }, [data, onClose]);

  const abrirCaso = useCallback((caso: PipelineClienteCaso) => {
    if (caso.cotizacion_id) {
      onOpenCotizacion(caso.cotizacion_id);
      return;
    }
    onClose();
    if (caso.cita_id) {
      router.push(`/cita-agenda-personal/${caso.cita_id}`);
      return;
    }
    if (caso.solicitud_id) {
      router.push(`/solicitud-detalle/${caso.solicitud_id}`);
      return;
    }
    if (caso.orden_id) {
      router.push(`/orden-detalle/${caso.orden_id}`);
    }
  }, [onClose, onOpenCotizacion]);

  return (
    <BottomSheet visible={Boolean(clienteKey)} onClose={onClose} stickyFooter style={styles.sheet}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isPending && !data ? (
          <View style={styles.cargando}>
            <ActivityIndicator color={I.primary} />
          </View>
        ) : (
          <View style={styles.cuerpo}>
            <View style={styles.identidad}>
              <View style={styles.avatar}>
                <InstitutionalText role="h3" color="onPrimary">{iniciales(nombre) || 'C'}</InstitutionalText>
              </View>
              <InstitutionalText role="h4">{nombre}</InstitutionalText>
              <InstitutionalText role="caption" color="body">{telefono || 'Sin teléfono'}</InstitutionalText>
              <View style={styles.acciones}>
                <Accion label="Llamar" onPress={llamar} disabled={!telefono} icon={Phone} />
                <Accion label="WhatsApp" onPress={whatsapp} disabled={!telefono} icon={MessageCircle} />
              </View>
              {data?.conversation_id ? (
                <Pressable onPress={abrirChat} accessibilityRole="button">
                  <InstitutionalText role="captionBold" color="primary">Abrir chat</InstitutionalText>
                </Pressable>
              ) : null}
            </View>

            {(data?.vehiculos.length ?? 0) > 0 ? (
              <View style={styles.bloque}>
                <InstitutionalText role="bodyBold">Vehículos</InstitutionalText>
                <View style={styles.chips}>
                  {data?.vehiculos.map((vehiculo) => (
                    <View key={vehiculo.key} style={styles.chip}>
                      <InstitutionalText role="caption">
                        {vehiculo.resumen || 'Vehículo'}
                        {vehiculo.patente ? ` · ${vehiculo.patente}` : ''}
                      </InstitutionalText>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.bloque}>
              <InstitutionalText role="bodyBold">Cotizaciones enviadas</InstitutionalText>
              {casos.length === 0 ? (
                <InstitutionalText role="caption" color="body">Todavía no hay cotizaciones de este cliente.</InstitutionalText>
              ) : (
                casos.map((caso) => (
                  <CasoFila key={`${caso.tipo_entidad}-${caso.entidad_id}`} caso={caso} onPress={abrirCaso} />
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

export const ClienteFichaSheet = memo(ClienteFichaSheetInner);

const CasoFila = memo(function CasoFila({
  caso,
  onPress,
}: {
  caso: PipelineClienteCaso;
  onPress: (caso: PipelineClienteCaso) => void;
}) {
  const handlePress = useCallback(() => onPress(caso), [caso, onPress]);
  const paso = pasoDeCaso(caso);
  const meta = [
    caso.numero_publico,
    fechaCortaCotizacion(caso.fecha_referencia),
    caso.monto_clp != null ? formatearMontoCLP(caso.monto_clp) : '',
  ].filter(Boolean).join(' · ');
  return (
    <Pressable onPress={handlePress} style={styles.caso} accessibilityRole="button">
      <View style={styles.casoCopy}>
        <InstitutionalText role="bodyBold" numberOfLines={1}>
          {caso.servicio_resumen || 'Cotización'}
        </InstitutionalText>
        {meta ? (
          <InstitutionalText role="caption" color="body" numberOfLines={1}>{meta}</InstitutionalText>
        ) : null}
      </View>
      <CotizacionEstadoBadge estado={estadoDePaso(paso)} label={PASO_ETIQUETA[paso]} suave />
    </Pressable>
  );
});

function Accion({
  label,
  onPress,
  disabled,
  icon: Icono,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon: typeof Phone;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.accion, disabled && styles.accionOff]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icono size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
      <InstitutionalText role="captionBold">{label}</InstitutionalText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: {
    maxWidth: 520,
  },
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  content: {
    paddingBottom: SPACING.fixed.lg,
  },
  cargando: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuerpo: {
    gap: SPACING.fixed.lg,
  },
  identidad: {
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    borderRadius: BORDERS.radius.xl,
    backgroundColor: I.paper,
    padding: SPACING.fixed.lg,
    ...SHADOWS.editorial,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: I.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.fixed.xs,
  },
  acciones: {
    flexDirection: 'row',
    gap: SPACING.fixed.xs,
    alignSelf: 'stretch',
    marginTop: SPACING.fixed.sm,
  },
  accion: {
    flex: 1,
    minHeight: 44,
    borderRadius: BORDERS.radius.md,
    borderWidth: 1,
    borderColor: I.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  accionOff: {
    opacity: 0.35,
  },
  bloque: {
    gap: SPACING.fixed.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  caso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    paddingVertical: SPACING.fixed.sm,
  },
  casoCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
