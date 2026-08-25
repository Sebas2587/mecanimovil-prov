import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Link2, MessageCircle, Trash2 } from 'lucide-react-native';
import Header from '@/components/Header';
import { CotizacionIaEditor } from '@/components/chats/CotizacionIaEditor';
import { InstitutionalButton } from '@/design-system/components/InstitutionalButton';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { hostScreenStyles } from '@/app/design-system/components';
import {
  useCotizacionCanalDetalleQuery,
  COTIZACION_CANAL_DETALLE_QUERY_KEY,
} from '@/hooks/useCotizacionCanalDetalleQuery';
import { AGENTE_IA_BORRADORES_KEY } from '@/hooks/useAgenteIaQueries';
import { COTIZACIONES_CANAL_QUERY_KEY } from '@/hooks/useCotizacionesCanalTallerQuery';
import cotizacionCanalService, {
  adicionalRequiereFecha,
  cotizacionPermiteEdicionCompleta,
  payloadEdicionCotizacion,
  type CotizacionCanal,
} from '@/services/cotizacionCanalService';
import { invalidateProveedorComercialQueries } from '@/utils/invalidateProveedorComercial';
import { showAlert, showAlertButtons, showConfirm } from '@/utils/platformAlert';
import { omnichannelChatHref } from '@/utils/chatRoutes';
import {
  abrirWhatsAppCotizacion,
  mensajeCotizacionParaCliente,
} from '@/utils/compartirCotizacionCliente';

const I = COLORS.institutional;

function snapshot(c: CotizacionCanal): string {
  return JSON.stringify({
    servicio_nombre: c.servicio_nombre,
    descripcion_problema: c.descripcion_problema,
    modalidad: c.modalidad,
    direccion_servicio: c.direccion_servicio,
    cliente_nombre: c.cliente_nombre,
    cliente_telefono: c.cliente_telefono,
    repuestos: c.repuestos,
    mano_obra_clp: c.mano_obra_clp,
    notas_internas: c.notas_internas,
    politicas_cotizacion: c.politicas_cotizacion,
    duracion_minutos_estimada: c.duracion_minutos_estimada,
    ejecucion_adicional: c.ejecucion_adicional,
    fecha_propuesta: c.fecha_propuesta,
    hora_propuesta: c.hora_propuesta,
  });
}

export default function CotizacionCanalDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const parsedId = Number(id);
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data, isPending, isError, refetch } = useCotizacionCanalDetalleQuery(
    Number.isFinite(parsedId) ? parsedId : undefined,
  );

  const [draft, setDraft] = useState<CotizacionCanal | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [accionLead, setAccionLead] = useState(false);

  useEffect(() => {
    if (!data) return;
    setDraft((prev) => {
      if (!prev || prev.id !== data.id) return { ...data };
      if (prev.estado !== data.estado) return { ...data };
      return prev;
    });
  }, [data]);

  const editable = Boolean(draft && cotizacionPermiteEdicionCompleta(draft));
  const tieneHorarioAgendado = Boolean(draft?.tiene_horario_agendado);
  const hayCambios = useMemo(() => {
    if (!draft || !data) return false;
    return snapshot(draft) !== snapshot(data);
  }, [draft, data]);

  const invalidateAll = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: [COTIZACION_CANAL_DETALLE_QUERY_KEY, parsedId] });
    await qc.invalidateQueries({ queryKey: [COTIZACIONES_CANAL_QUERY_KEY] });
    qc.invalidateQueries({ queryKey: AGENTE_IA_BORRADORES_KEY });
    invalidateProveedorComercialQueries(qc);
  }, [parsedId, qc]);

  const guardar = useCallback(async () => {
    if (!draft?.id) return;
    setGuardando(true);
    try {
      const actualizada = await cotizacionCanalService.actualizar(
        draft.id,
        payloadEdicionCotizacion(draft),
      );
      setDraft({ ...actualizada });
      await invalidateAll();
      if (actualizada.estado === 'enviada') {
        showAlert(
          'Cotización actualizada',
          'El total subió: el cliente debe confirmar el nuevo monto en el mismo enlace.',
        );
      } else if (data?.estado === 'enviada' && actualizada.estado === 'borrador') {
        showAlert(
          'Listo para reenviar',
          'El cliente deja de poder aceptar hasta que envíes de nuevo esta cotización.',
        );
      } else {
        showAlert('Guardado', 'Cambios guardados.');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { estado?: string[]; detail?: string } } })?.response?.data
        ;
      const texto = Array.isArray(msg?.estado)
        ? msg.estado[0]
        : msg?.detail || (err as Error)?.message || 'No se pudo guardar.';
      showAlert('Error', String(texto));
    } finally {
      setGuardando(false);
    }
  }, [data?.estado, draft, invalidateAll]);

  const compartirConCliente = useCallback(async (
    url: string,
    cot: CotizacionCanal,
    opts?: { actualizada?: boolean; silencioso?: boolean },
  ) => {
    const mensaje = mensajeCotizacionParaCliente({
      clienteNombre: cot.cliente_nombre,
      numeroPublico: cot.numero_publico,
      servicio: cot.servicio_nombre,
      totalClp: cot.total_clp,
      url,
      actualizada: Boolean(opts?.actualizada ?? cot.numero_publico),
    });
    const via = await abrirWhatsAppCotizacion({
      telefono: cot.cliente_telefono,
      mensaje,
      url,
    });
    if (opts?.silencioso) return via;
    if (via === 'clipboard') {
      showAlert('Mensaje copiado', 'Pégalo en WhatsApp del cliente. El chat conectado no puede enviarlo.');
    }
    return via;
  }, []);

  const ofrecerEnvioWhatsAppPersonal = useCallback((
    url: string,
    cot: CotizacionCanal,
    entregaMensaje?: string,
  ) => {
    const tieneTel = Boolean(cot.cliente_telefono?.trim());
    showAlertButtons(
      'El chat conectado no puede enviarla',
      entregaMensaje
        || 'Pasaron más de 24 h y WhatsApp bloquea el canal. Ábrelo con el link actualizado para que el cliente lo reciba.',
      [
        { text: 'Ahora no', style: 'cancel' },
        {
          text: tieneTel ? 'Abrir WhatsApp' : 'Copiar mensaje',
          onPress: () => {
            void compartirConCliente(url, cot, { actualizada: true });
          },
        },
      ],
    );
  }, [compartirConCliente]);

  const enviar = useCallback(async () => {
    if (!draft?.id) return;
    if (adicionalRequiereFecha(draft)) {
      showAlert(
        'Fecha requerida',
        'Indica día y hora acordados con el cliente antes de enviar.',
      );
      return;
    }
    setEnviando(true);
    try {
      let estadoActual = draft.estado;
      if (hayCambios) {
        const actualizada = await cotizacionCanalService.actualizar(
          draft.id,
          payloadEdicionCotizacion(draft),
        );
        setDraft({ ...actualizada });
        estadoActual = actualizada.estado;
      } else if (draft.estado === 'enviada') {
        const actualizada = await cotizacionCanalService.reabrir(draft.id);
        setDraft({ ...actualizada });
        estadoActual = actualizada.estado;
      }
      if (estadoActual === 'borrador') {
        const res = await cotizacionCanalService.enviar(draft.id);
        const cotEnviada = res.cotizacion;
        const url = res.share_url || cotEnviada.share_url || cotEnviada.url_publica;
        const entrega = res.entrega_via || cotEnviada.metadata?.entrega_canal;
        setDraft({ ...cotEnviada });
        await invalidateAll();
        await refetch();
        if (!url) {
          showAlert('Cotización lista', 'Se guardó, pero no hay link para compartir.');
          return;
        }
        if (entrega === 'link_publico' || entrega === 'whatsapp_template') {
          ofrecerEnvioWhatsAppPersonal(url, cotEnviada, res.entrega_mensaje);
          return;
        }
        showAlert(
          'Cotización enviada',
          res.entrega_mensaje
            || 'El cliente la recibió en el chat y puede aceptar o rechazar.',
        );
        return;
      }
      await invalidateAll();
      await refetch();
      showAlert(
        'Cotización enviada',
        'El cliente puede ver el mismo enlace y aceptar o rechazar.',
      );
    } catch {
      showAlert('Error', 'No se pudo enviar la cotización.');
    } finally {
      setEnviando(false);
    }
  }, [data?.estado, draft, hayCambios, invalidateAll, ofrecerEnvioWhatsAppPersonal, refetch]);

  const eliminar = useCallback(() => {
    if (!draft?.id) return;
    showConfirm('Eliminar cotización', 'Se cancelará y saldrá de pendientes.', {
      confirmText: 'Eliminar',
      onConfirm: async () => {
        setEliminando(true);
        try {
          await cotizacionCanalService.cancelar(draft.id);
          await invalidateAll();
          router.back();
        } catch {
          showAlert('Error', 'No se pudo eliminar.');
        } finally {
          setEliminando(false);
        }
      },
    });
  }, [draft?.id, invalidateAll]);

  const compartir = useCallback(async () => {
    const url = draft?.share_url || draft?.url_publica;
    if (!url || !draft) return;
    await compartirConCliente(url, draft, { actualizada: draft.estado !== 'borrador' });
  }, [compartirConCliente, draft]);

  const marcarAceptada = useCallback(async () => {
    if (!draft?.id) return;
    setAccionLead(true);
    try {
      const actualizada = await cotizacionCanalService.marcarAceptada(draft.id);
      setDraft({ ...actualizada });
      await invalidateAll();
      showAlert('Cotización aceptada', 'El caso quedó marcado como aceptado. Confirma el horario en Bandeja.');
    } catch {
      showAlert('Error', 'Solo cotizaciones enviadas pueden marcarse como aceptadas.');
    } finally {
      setAccionLead(false);
    }
  }, [draft?.id, invalidateAll]);

  const cerrarCaso = useCallback(() => {
    if (!draft?.id) return;
    showConfirm('Cerrar caso', 'El lead pasará a Perdidos. Podrás seguir viéndolo en ese filtro.', {
      confirmText: 'Cerrar caso',
      onConfirm: async () => {
        setAccionLead(true);
        try {
          await cotizacionCanalService.marcarPerdida(draft.id);
          await invalidateAll();
          router.back();
        } catch {
          showAlert('Error', 'No se pudo cerrar el caso.');
        } finally {
          setAccionLead(false);
        }
      },
    });
  }, [draft?.id, invalidateAll]);

  if (!Number.isFinite(parsedId) || isPending) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="Cotización" showBack onBackPress={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={I.primary} />
        </View>
      </View>
    );
  }

  if (isError || !draft) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="Cotización" showBack onBackPress={() => router.back()} />
        <View style={styles.center}>
          <InstitutionalText role="body">No encontramos esta cotización.</InstitutionalText>
        </View>
      </View>
    );
  }

  const titulo =
    (draft.servicio_nombre || '').trim()
    || (draft.es_cotizacion_adicional ? 'Trabajo adicional' : 'Cotización');

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title={titulo} showBack onBackPress={() => router.back()} />

      <ScrollView
        style={hostScreenStyles.scroll}
        contentContainerStyle={[
          hostScreenStyles.scrollInner,
          styles.scrollInner,
          { paddingBottom: Math.max(insets.bottom, SPACING.fixed.md) + 96 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <CotizacionIaEditor
          cotizacion={draft}
          onChange={setDraft}
          readonly={!editable}
          hideSendActions
          compactHeader
        />

        {tieneHorarioAgendado ? (
          <InstitutionalText role="caption" color="body">
            Esta cotización ya tiene un horario agendado. Los ítems extra van en un trabajo
            adicional: puede ser un servicio nuevo o solo repuestos, sin mano de obra.
          </InstitutionalText>
        ) : null}

        {draft.estado === 'enviada' && editable ? (
          <InstitutionalText role="caption" color="body">
            Si el cliente no respondió, escribe o cierra el caso. Si aceptó por teléfono, márcala aceptada.
          </InstitutionalText>
        ) : null}

        {(draft.share_url || draft.url_publica) ? (
          <InstitutionalButton
            label="Compartir link"
            variant="outline"
            leading={<Link2 size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />}
            onPress={() => void compartir()}
          />
        ) : null}

        {draft.conversation ? (
          <InstitutionalButton
            label="Ver conversación"
            variant="outline"
            leading={
              <MessageCircle
                size={18}
                color={I.primary}
                strokeWidth={ICON_STROKE_WIDTH}
              />
            }
            onPress={() => router.push(omnichannelChatHref(draft.conversation as number))}
          />
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.fixed.md) }]}>
        {tieneHorarioAgendado && draft.cita_personal_id ? (
          <InstitutionalButton
            label="Agregar ítems o servicio adicional"
            variant="primary"
            onPress={() => router.push(`/agregar-servicio-adicional/${draft.cita_personal_id}`)}
          />
        ) : null}

        {editable && (draft.estado === 'borrador' || draft.estado === 'enviada') ? (
          <View style={styles.footerBorrador}>
            {draft.numero_publico ? (
              <InstitutionalText role="caption" color="muted">
                Si pasaron más de 24 h, el chat conectado no puede enviarla. Al enviar se abre WhatsApp con el link actualizado.
              </InstitutionalText>
            ) : null}
            <View style={styles.footerRow}>
            {draft.estado === 'borrador' ? (
              <TouchableOpacity
                style={styles.footerGhost}
                onPress={eliminar}
                disabled={eliminando}
                accessibilityLabel="Eliminar"
              >
                <Trash2 size={18} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
              </TouchableOpacity>
            ) : null}
            <InstitutionalButton
              label="Guardar"
              variant="outline"
              style={styles.footerMid}
              loading={guardando}
              disabled={!hayCambios || guardando}
              onPress={() => void guardar()}
            />
            <InstitutionalButton
              label={draft.numero_publico ? 'Enviar al cliente' : 'Aprobar y enviar'}
              variant="primary"
              style={styles.footerPrimary}
              loading={enviando}
              onPress={() => void enviar()}
            />
            </View>
            {draft.estado === 'enviada' ? (
              <View style={styles.footerRow}>
                <InstitutionalButton
                  label="Cerrar caso"
                  variant="destructiveOutline"
                  size="compact"
                  loading={accionLead}
                  style={styles.footerFlex}
                  onPress={cerrarCaso}
                />
                <InstitutionalButton
                  label="Marcar aceptada"
                  variant="success"
                  size="compact"
                  loading={accionLead}
                  style={styles.footerFlexGrow}
                  onPress={() => void marcarAceptada()}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {editable && draft.estado === 'aceptada' ? (
          <View style={styles.footerRow}>
            <InstitutionalButton
              label="Guardar cambios"
              variant="primary"
              style={{ flex: 1 }}
              loading={guardando}
              disabled={!hayCambios || guardando}
              onPress={() => void guardar()}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.fixed.lg,
  },
  scrollInner: {
    gap: SPACING.fixed.md,
    paddingTop: SPACING.fixed.sm,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    backgroundColor: COLORS.background.paper,
    paddingHorizontal: SPACING.fixed.lg,
    paddingTop: SPACING.fixed.md,
    gap: SPACING.fixed.sm,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  footerBorrador: {
    gap: SPACING.fixed.xs,
  },
  footerFlex: { flex: 1 },
  footerFlexGrow: { flex: 1.2 },
  footerGhost: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerMid: { flex: 1 },
  footerPrimary: { flex: 1.4 },
});
