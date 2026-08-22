import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Share,
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
  payloadEdicionCotizacion,
  type CotizacionCanal,
} from '@/services/cotizacionCanalService';
import { invalidateProveedorComercialQueries } from '@/utils/invalidateProveedorComercial';
import { showAlert, showConfirm } from '@/utils/platformAlert';
import { omnichannelChatHref } from '@/utils/chatRoutes';

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
  const [reabriendo, setReabriendo] = useState(false);
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

  const editable = draft?.estado === 'borrador' || draft?.estado === 'aceptada';
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
  }, [draft, invalidateAll]);

  const reabrir = useCallback(async () => {
    if (!draft?.id) return;
    setReabriendo(true);
    try {
      const actualizada = await cotizacionCanalService.reabrir(draft.id);
      setDraft({ ...actualizada });
      await invalidateAll();
    } catch (err: unknown) {
      showAlert('Error', (err as Error)?.message || 'No se pudo reabrir la cotización.');
    } finally {
      setReabriendo(false);
    }
  }, [draft?.id, invalidateAll]);

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
      if (hayCambios || draft.estado === 'borrador') {
        if (hayCambios) {
          await cotizacionCanalService.actualizar(draft.id, payloadEdicionCotizacion(draft));
        }
      }
      if (draft.estado === 'borrador' || data?.estado === 'borrador') {
        const res = await cotizacionCanalService.enviar(draft.id);
        const url = res.share_url || res.cotizacion.share_url || res.cotizacion.url_publica;
        const entrega = res.entrega_via || res.cotizacion.metadata?.entrega_canal;
        await invalidateAll();
        await refetch();
        if (entrega === 'link_publico') {
          showAlert(
            'Cotización lista para compartir',
            res.entrega_mensaje
              || 'El canal no permite enviarla en el chat (ventana de 24 h). Comparte el link con el cliente.',
          );
          if (url) {
            setDraft({ ...res.cotizacion });
          }
          return;
        }
        showAlert(
          'Cotización enviada',
          res.entrega_mensaje
            || 'El cliente puede ver el mismo enlace y aceptar o rechazar.',
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
  }, [data?.estado, draft, hayCambios, invalidateAll, refetch]);

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
    if (!url) return;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        showAlert('Link copiado', 'Pégalo en WhatsApp u otro canal.');
        return;
      }
      await Share.share({ message: url, url });
    } catch {
      showAlert('Link de cotización', url);
    }
  }, [draft]);

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

  const titulo = draft.es_cotizacion_adicional ? 'Trabajo adicional' : 'Cotización';

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
        />

        {draft.estado === 'enviada' ? (
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
            variant={draft.estado === 'enviada' ? 'primary' : 'outline'}
            leading={
              <MessageCircle
                size={18}
                color={draft.estado === 'enviada' ? I.onPrimary : I.primary}
                strokeWidth={ICON_STROKE_WIDTH}
              />
            }
            onPress={() => router.push(omnichannelChatHref(draft.conversation as number))}
          />
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.fixed.md) }]}>
        {draft.estado === 'enviada' ? (
          <View style={styles.footerEnviada}>
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
            <InstitutionalButton
              label={reabriendo ? 'Reabriendo…' : 'Actualizar cotización'}
              variant="tertiary"
              size="compact"
              loading={reabriendo}
              onPress={() => void reabrir()}
            />
          </View>
        ) : null}

        {draft.estado === 'borrador' ? (
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.footerGhost}
              onPress={eliminar}
              disabled={eliminando}
              accessibilityLabel="Eliminar"
            >
              <Trash2 size={18} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
            <InstitutionalButton
              label="Guardar"
              variant="outline"
              style={styles.footerMid}
              loading={guardando}
              disabled={!hayCambios || guardando}
              onPress={() => void guardar()}
            />
            <InstitutionalButton
              label="Aprobar y enviar"
              variant="primary"
              style={styles.footerPrimary}
              loading={enviando}
              onPress={() => void enviar()}
            />
          </View>
        ) : null}

        {draft.estado === 'aceptada' ? (
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
  footerEnviada: {
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
