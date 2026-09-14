import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { CotizacionIaEditor, type CotizacionIaEditorHandle } from '@/components/chats/CotizacionIaEditor';
import { CotizacionIaProgreso } from '@/components/chats/CotizacionIaProgreso';
import { CotizacionEnviadaSiguientePaso } from '@/components/cotizacion/CotizacionEnviadaSiguientePaso';
import { RegistrarCompraCard } from '@/components/cotizacion/RegistrarCompraCard';
import { lineaPendientePrecio } from '@/components/cotizacion/repuestoCerteza';
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
import { VistaPreviaCotizacionClienteModal } from '@/components/chats/VistaPreviaCotizacionClienteModal';
import cotizacionCanalService, {
  adicionalRequiereFecha,
  cotizacionEsActualizacion,
  cotizacionPermiteEdicionCompleta,
  cotizacionPermiteEnviar,
  errorEnvioFirme,
  mergeRepuestosPreservandoEdicion,
  payloadEdicionCotizacion,
  type CotizacionCanal,
} from '@/services/cotizacionCanalService';
import { shouldHoldRevealForPrecios } from '@/utils/cotizacionPreciosWeb';
import { invalidateProveedorComercialQueries } from '@/utils/invalidateProveedorComercial';
import { showAlert, showAlertButtons, showConfirm } from '@/utils/platformAlert';
import {
  CLIPBOARD_MENSAJE_COPIADO,
  cuerpoEnvioExitoso,
  requiereCompartirWhatsApp,
  tituloEnvioExitoso,
} from '@/utils/entregaCotizacionCopy';
import { omnichannelChatHref } from '@/utils/chatRoutes';
import {
  abrirWhatsAppCotizacion,
  mensajeCotizacionParaCliente,
  mensajeSeguimientoCotizacion,
  nombresTrabajosCotizacion,
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
    mano_obra_lineas: c.mano_obra_lineas ?? c.metadata?.servicios_lineas ?? [],
    mano_obra_clp: c.mano_obra_clp,
    descuento_tipo: c.descuento_tipo || '',
    descuento_alcance: c.descuento_alcance || 'mano_obra',
    descuento_valor: c.descuento_valor ?? 0,
    notas_internas: c.notas_internas,
    politicas_cotizacion: c.politicas_cotizacion,
    dias_validez: c.dias_validez ?? 30,
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
  const [previewVisible, setPreviewVisible] = useState(false);
  const editorRef = useRef<CotizacionIaEditorHandle>(null);
  const tipoEnvioRef = useRef<'estimacion' | 'cotizacion'>('cotizacion');
  const [holdExpired, setHoldExpired] = useState(false);

  useEffect(() => {
    if (!data) return;
    setDraft((prev) => {
      if (!prev || prev.id !== data.id) return { ...data };
      if (prev.estado !== data.estado) return { ...data };
      const prevWeb = prev.metadata?.busqueda_web_estado;
      const nextWeb = data.metadata?.busqueda_web_estado;
      if (prevWeb === 'pendiente' && nextWeb && nextWeb !== 'pendiente') {
        return {
          ...data,
          repuestos: mergeRepuestosPreservandoEdicion(prev.repuestos ?? [], data.repuestos ?? []),
        };
      }
      return prev;
    });
  }, [data]);

  const holdPrecios = shouldHoldRevealForPrecios(data) && !holdExpired;
  useEffect(() => {
    if (!shouldHoldRevealForPrecios(data)) {
      setHoldExpired(false);
      return;
    }
    const timer = setTimeout(() => setHoldExpired(true), 70_000);
    return () => clearTimeout(timer);
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
      const patch = payloadEdicionCotizacion(draft);
      if (draft.metadata?.busqueda_web_estado === 'pendiente') {
        delete patch.repuestos;
      }
      const actualizada = await cotizacionCanalService.actualizar(draft.id, patch);
      setDraft({
        ...actualizada,
        repuestos: mergeRepuestosPreservandoEdicion(
          draft.repuestos ?? [],
          actualizada.repuestos ?? [],
        ),
      });
      await invalidateAll();
      if (actualizada.numero_publico) {
        setPreviewVisible(true);
        return;
      }
      showAlert('Guardado', 'Cambios guardados.');
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
      trabajos: nombresTrabajosCotizacion(cot),
    });
    const via = await abrirWhatsAppCotizacion({
      telefono: cot.cliente_telefono,
      mensaje,
      url,
    });
    if (opts?.silencioso) return via;
    if (via === 'clipboard') {
      showAlert('Mensaje copiado', CLIPBOARD_MENSAJE_COPIADO);
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
      tituloEnvioExitoso(cot.numero_publico, { actualizada: Boolean(cot.numero_publico) }),
      entregaMensaje
        || cuerpoEnvioExitoso({
          entregaVia: 'link_publico',
          numeroPublico: cot.numero_publico,
          actualizada: Boolean(cot.numero_publico),
        }),
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

  const persistirSiHayCambios = useCallback(async () => {
    if (!draft?.id) return draft;
    if (!hayCambios) return draft;
    const patch = payloadEdicionCotizacion(draft);
    if (draft.metadata?.busqueda_web_estado === 'pendiente') {
      delete patch.repuestos;
    }
    const actualizada = await cotizacionCanalService.actualizar(draft.id, patch);
    setDraft({
      ...actualizada,
      repuestos: mergeRepuestosPreservandoEdicion(
        draft.repuestos ?? [],
        actualizada.repuestos ?? [],
      ),
    });
    await invalidateAll();
    return actualizada;
  }, [draft, hayCambios, invalidateAll]);

  const abrirVistaPrevia = useCallback(async (tipo?: 'estimacion' | 'cotizacion') => {
    if (!draft?.id) return;
    if (adicionalRequiereFecha(draft)) {
      showAlert(
        'Fecha requerida',
        'Indica día y hora acordados con el cliente antes de enviar.',
      );
      return;
    }
    tipoEnvioRef.current = tipo
      || (draft.puede_enviar_firme ? 'cotizacion' : 'estimacion');
    setGuardando(true);
    try {
      await persistirSiHayCambios();
      setPreviewVisible(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { estado?: string[]; detail?: string } } })?.response?.data;
      const texto = Array.isArray(msg?.estado)
        ? msg.estado[0]
        : msg?.detail || (err as Error)?.message || 'No se pudo guardar.';
      showAlert('Error', String(texto));
    } finally {
      setGuardando(false);
    }
  }, [draft, persistirSiHayCambios]);

  const enviar = useCallback(async (tipo?: 'estimacion' | 'cotizacion') => {
    if (!draft?.id) return;
    if (adicionalRequiereFecha(draft)) {
      showAlert(
        'Fecha requerida',
        'Indica día y hora acordados con el cliente antes de enviar.',
      );
      return;
    }
    const tipoDoc = tipo || tipoEnvioRef.current;
    tipoEnvioRef.current = tipoDoc;
    setEnviando(true);
    try {
      const persistida = await persistirSiHayCambios();
      const eraUpdate = Boolean(persistida?.numero_publico || draft.numero_publico);
      const res = await cotizacionCanalService.enviar(persistida?.id || draft.id, tipoDoc);
      const cotEnviada = res.cotizacion;
      const url = res.share_url || cotEnviada.share_url || cotEnviada.url_publica;
      const entrega = res.entrega_via || cotEnviada.metadata?.entrega_canal;
      setDraft({ ...cotEnviada });
      setPreviewVisible(false);
      await invalidateAll();
      await refetch();
      if (!url) {
        showAlert('Cotización lista', 'Se guardó, pero no hay link para compartir.');
        return;
      }
      if (requiereCompartirWhatsApp(entrega)) {
        ofrecerEnvioWhatsAppPersonal(
          url,
          cotEnviada,
          cuerpoEnvioExitoso({
            entregaVia: entrega,
            numeroPublico: cotEnviada.numero_publico,
            actualizada: eraUpdate,
          }),
        );
        return;
      }
      showAlert(
        tituloEnvioExitoso(cotEnviada.numero_publico, { actualizada: eraUpdate }),
        cuerpoEnvioExitoso({
          entregaVia: entrega,
          numeroPublico: cotEnviada.numero_publico,
          actualizada: eraUpdate,
        }),
      );
    } catch (err: unknown) {
      const gate = errorEnvioFirme(err);
      if (gate) {
        showAlertButtons(
          'Faltan precios por confirmar',
          'Puedes confirmar los precios o enviar una estimación al cliente.',
          [
            { text: 'Ahora no', style: 'cancel' },
            {
              text: 'Enviar como estimación',
              onPress: () => {
                void enviar('estimacion');
              },
            },
            {
              text: 'Confirmar precios',
              onPress: () => editorRef.current?.abrirConfirmarPrecios(),
            },
          ],
        );
        return;
      }
      const msg =
        (err as { response?: { data?: { estado?: string[]; detail?: string } } })?.response?.data;
      const texto = Array.isArray(msg?.estado)
        ? msg.estado[0]
        : msg?.detail || (err as Error)?.message || 'No se pudo enviar la cotización.';
      showAlert('Error', String(texto));
    } finally {
      setEnviando(false);
    }
  }, [draft, invalidateAll, ofrecerEnvioWhatsAppPersonal, persistirSiHayCambios, refetch]);

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

  const recordarWhatsApp = useCallback(async () => {
    const url = draft?.share_url || draft?.url_publica;
    if (!url || !draft) return;
    const mensaje = mensajeSeguimientoCotizacion({
      clienteNombre: draft.cliente_nombre,
      numeroPublico: draft.numero_publico,
      servicio: draft.servicio_nombre,
      url,
    });
    const via = await abrirWhatsAppCotizacion({
      telefono: draft.cliente_telefono,
      mensaje,
      url,
    });
    if (via === 'clipboard') {
      showAlert('Mensaje copiado', CLIPBOARD_MENSAJE_COPIADO);
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

  if (!Number.isFinite(parsedId) || isPending || holdPrecios) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="Cotización" showBack onBackPress={() => router.back()} />
        <View style={styles.center}>
          {holdPrecios ? (
            <View style={styles.holdProgreso}>
              <CotizacionIaProgreso
                fase="precios"
                progreso={data?.metadata?.busqueda_web_progreso}
              />
            </View>
          ) : (
            <ActivityIndicator color={I.primary} />
          )}
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
  const pendientesPrecio = draft.lineas_pendientes_precio?.length
    ?? (draft.repuestos ?? []).filter(lineaPendientePrecio).length;
  const puedeEnviarFirme = draft.puede_enviar_firme ?? pendientesPrecio === 0;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header
        title={titulo}
        titleRole="h4"
        showBack
        onBackPress={() => router.back()}
        rightComponent={
          editable && draft.estado === 'borrador' ? (
            <TouchableOpacity
              onPress={eliminar}
              disabled={eliminando}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Eliminar cotización"
            >
              <Trash2 size={20} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView
        style={hostScreenStyles.scroll}
        contentContainerStyle={[
          hostScreenStyles.scrollInner,
          styles.scrollInner,
          { paddingBottom: Math.max(insets.bottom, SPACING.fixed.md) + 72 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <CotizacionIaEditor
          ref={editorRef}
          cotizacion={draft}
          onChange={setDraft}
          readonly={!editable}
          hideSendActions
          compactHeader
        />

        {draft.estado === 'aceptada' ? (
          <RegistrarCompraCard cotizacion={draft} />
        ) : null}

        {tieneHorarioAgendado ? (
          <InstitutionalText role="caption" color="body">
            Esta cotización ya tiene un horario agendado. Los ítems extra van en un trabajo
            adicional: puede ser un servicio nuevo o solo repuestos, sin mano de obra.
          </InstitutionalText>
        ) : null}

        {draft.estado === 'enviada' && editable ? (
          <CotizacionEnviadaSiguientePaso
            cotizacion={draft}
            loading={accionLead}
            onEscribir={
              draft.conversation
                ? () => router.push(omnichannelChatHref(draft.conversation as number))
                : undefined
            }
            onRecordarWhatsApp={
              (draft.share_url || draft.url_publica) && !draft.entrega_pendiente_compartir
                ? () => void recordarWhatsApp()
                : undefined
            }
            onMarcarAceptada={() => void marcarAceptada()}
            onCerrarCaso={cerrarCaso}
          />
        ) : null}

        {(draft.share_url || draft.url_publica) ? (
          <InstitutionalButton
            label="Compartir link"
            variant="outline"
            leading={<Link2 size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />}
            onPress={() => void compartir()}
          />
        ) : null}

        {draft.id && (draft.numero_publico || draft.estado !== 'borrador' || draft.emision_pendiente) ? (
          <InstitutionalButton
            label="Ver como el cliente"
            variant="outline"
            onPress={() => void abrirVistaPrevia()}
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

        {editable && draft.estado === 'borrador' ? (
          <View style={styles.footerBorrador}>
            {draft.emision_pendiente || (draft.numero_publico && draft.estado === 'borrador') ? (
              <InstitutionalText role="caption" color="muted">
                El cliente sigue viendo la versión anterior hasta que envíes esta actualización.
              </InstitutionalText>
            ) : draft.entrega_pendiente_compartir ? (
              <InstitutionalText role="caption" color="muted">
                Pendiente de compartir: el documento ya existe. Usa Compartir link para que el cliente lo reciba.
              </InstitutionalText>
            ) : draft.visto_en ? (
              <InstitutionalText role="caption" color="muted">
                El cliente abrió el enlace.
              </InstitutionalText>
            ) : pendientesPrecio > 0 ? (
              <InstitutionalText role="caption" color="muted">
                {pendientesPrecio === 1
                  ? 'Falta 1 precio por confirmar'
                  : `Faltan ${pendientesPrecio} precios por confirmar`}
              </InstitutionalText>
            ) : null}
            <View style={styles.footerRow}>
              {!puedeEnviarFirme ? (
                <InstitutionalButton
                  label="Enviar como estimación"
                  variant="outline"
                  size="compact"
                  style={styles.footerMid}
                  disabled={!cotizacionPermiteEnviar(draft) || enviando || guardando}
                  onPress={() => void abrirVistaPrevia('estimacion')}
                />
              ) : null}
              {puedeEnviarFirme ? (
                <InstitutionalButton
                  label="Enviar cotización firme"
                  variant="primary"
                  size="compact"
                  style={styles.footerPrimary}
                  loading={enviando || guardando}
                  disabled={!cotizacionPermiteEnviar(draft) || enviando || guardando}
                  onPress={() => void abrirVistaPrevia('cotizacion')}
                />
              ) : (
                <InstitutionalButton
                  label="Confirmar precios"
                  variant="primary"
                  size="compact"
                  style={styles.footerPrimary}
                  loading={enviando || guardando}
                  disabled={enviando || guardando}
                  onPress={() => editorRef.current?.abrirConfirmarPrecios()}
                />
              )}
            </View>
            {hayCambios ? (
              <InstitutionalButton
                label="Guardar cambios"
                variant="outline"
                size="compact"
                loading={guardando}
                disabled={guardando}
                onPress={() => void guardar()}
              />
            ) : null}
          </View>
        ) : null}

        {editable && draft.estado === 'enviada' && (hayCambios || draft.emision_pendiente) ? (
          <View style={styles.footerBorrador}>
            {draft.emision_pendiente ? (
              <InstitutionalText role="caption" color="muted">
                El cliente sigue viendo la versión anterior hasta que envíes esta actualización.
              </InstitutionalText>
            ) : draft.entrega_pendiente_compartir ? (
              <InstitutionalText role="caption" color="muted">
                El cliente aún no la recibió por el chat. Usa Compartir link.
              </InstitutionalText>
            ) : draft.visto_en ? (
              <InstitutionalText role="caption" color="muted">
                El cliente abrió el enlace.
              </InstitutionalText>
            ) : null}
            <View style={styles.footerRow}>
              <InstitutionalButton
                label="Guardar"
                variant="outline"
                style={styles.footerMid}
                loading={guardando}
                disabled={!hayCambios || guardando}
                onPress={() => void guardar()}
              />
              <InstitutionalButton
                label={puedeEnviarFirme ? 'Enviar cotización firme' : 'Enviar como estimación'}
                variant="primary"
                style={styles.footerPrimary}
                loading={enviando || guardando}
                disabled={(!hayCambios && !draft.emision_pendiente) || enviando || guardando}
                onPress={() => void abrirVistaPrevia(puedeEnviarFirme ? 'cotizacion' : 'estimacion')}
              />
            </View>
          </View>
        ) : null}

        {editable && draft.estado === 'aceptada' ? (
          <View style={styles.footerBorrador}>
            {draft.emision_pendiente ? (
              <InstitutionalText role="caption" color="muted">
                El cliente sigue viendo la versión anterior hasta que envíes esta actualización.
              </InstitutionalText>
            ) : null}
            <View style={styles.footerRow}>
              <InstitutionalButton
                label="Guardar cambios"
                variant={draft.emision_pendiente && !hayCambios ? 'outline' : 'primary'}
                style={styles.footerMid}
                loading={guardando}
                disabled={!hayCambios || guardando}
                onPress={() => void guardar()}
              />
              {draft.emision_pendiente ? (
                <InstitutionalButton
                  label="Revisar y enviar"
                  variant="primary"
                  style={styles.footerPrimary}
                  loading={enviando || guardando}
                  disabled={enviando || guardando}
                  onPress={() => void abrirVistaPrevia(puedeEnviarFirme ? 'cotizacion' : 'estimacion')}
                />
              ) : null}
            </View>
          </View>
        ) : null}
      </View>

      <VistaPreviaCotizacionClienteModal
        visible={previewVisible}
        cotizacionId={draft.id}
        esActualizacion={cotizacionEsActualizacion(draft)}
        puedeEnviar={cotizacionPermiteEnviar(draft) || Boolean(draft.emision_pendiente)}
        enviando={enviando}
        onClose={() => setPreviewVisible(false)}
        onEnviar={() => void enviar(tipoEnvioRef.current)}
      />

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
    gap: SPACING.fixed.md,
  },
  holdHint: {
    textAlign: 'center',
  },
  holdProgreso: {
    alignSelf: 'stretch',
    width: '100%',
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
    paddingTop: SPACING.fixed.sm,
    gap: SPACING.fixed.xs,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
    gap: SPACING.fixed.sm,
  },
  footerBorrador: {
    gap: SPACING.fixed.xs,
  },
  footerMid: { flex: 1, minWidth: 0 },
  footerPrimary: { flex: 1.15, minWidth: 0 },
});
