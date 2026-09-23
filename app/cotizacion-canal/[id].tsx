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
import { Calendar, Check, Eye, Link2, MessageCircle, Package, Phone, Trash2, Wrench, X } from 'lucide-react-native';
import Header from '@/components/Header';
import { CotizacionIaEditor, type CotizacionIaEditorHandle } from '@/components/chats/CotizacionIaEditor';
import { CotizacionIaProgreso } from '@/components/chats/CotizacionIaProgreso';
import { CotizacionEnviadaSiguientePaso } from '@/components/cotizacion/CotizacionEnviadaSiguientePaso';
import { RegistrarCompraCard } from '@/components/cotizacion/RegistrarCompraCard';
import { CotizacionBorradorAcciones } from '@/components/cotizacion/CotizacionBorradorAcciones';
import { CotizacionEditorFab, type CotizacionFabAction } from '@/components/cotizacion/CotizacionEditorFab';
import { COPY_PRECIO_TALLER, lineaPendientePrecio } from '@/components/cotizacion/repuestoCerteza';
import { InstitutionalButton } from '@/design-system/components/InstitutionalButton';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { useWebVisualViewport, webFooterBottom } from '@/hooks/useWebVisualViewport';
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
import { HOLD_REVEAL_PRECIOS_MS, shouldHoldRevealForPrecios } from '@/utils/cotizacionPreciosWeb';
import { invalidateProveedorComercialQueries } from '@/utils/invalidateProveedorComercial';
import { showAlert, showAlertButtons, showConfirm } from '@/utils/platformAlert';
import {
  CLIPBOARD_MENSAJE_COPIADO,
  cuerpoEnvioExitoso,
  folioCotizacionLabel,
  requiereEntregaManual,
  tituloEnvioExitoso,
} from '@/utils/entregaCotizacionCopy';
import { omnichannelChatHref } from '@/utils/chatRoutes';
import {
  abrirWhatsAppCotizacion,
  mensajeSeguimientoCotizacion,
} from '@/utils/compartirCotizacionCliente';
import {
  avisarCopiaLink,
  compartirCotizacionPorWhatsApp,
  ofrecerEntregaCotizacionEnviada,
} from '@/utils/ofrecerEntregaCotizacion';

const I = COLORS.institutional;
const STACK_OPTIONS = { headerShown: false } as const;

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
  const webViewport = useWebVisualViewport();
  const footerBottom = webFooterBottom(webViewport, insets.bottom, SPACING.fixed.md);
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
  const [tipoPreview, setTipoPreview] = useState<'estimacion' | 'cotizacion'>('cotizacion');
  const editorRef = useRef<CotizacionIaEditorHandle>(null);
  const tipoEnvioRef = useRef<'estimacion' | 'cotizacion'>('cotizacion');
  const draftRef = useRef<CotizacionCanal | null>(null);
  const persistSeqRef = useRef(0);
  const [holdExpired, setHoldExpired] = useState(false);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    if (!data) return;
    setDraft((prev) => {
      if (!prev || prev.id !== data.id) return { ...data };
      if (prev.estado !== data.estado) return { ...data };
      const prevEn = prev.actualizado_en || '';
      const nextEn = data.actualizado_en || '';
      if (nextEn && prevEn && nextEn < prevEn) return prev;
      const prevWeb = prev.metadata?.busqueda_web_estado;
      const nextWeb = data.metadata?.busqueda_web_estado;
      if (prevWeb === 'pendiente' && nextWeb && nextWeb !== 'pendiente') {
        const prevCount = (prev.repuestos ?? []).length;
        const nextCount = (data.repuestos ?? []).length;
        if (nextCount < prevCount) return prev;
        return {
          ...data,
          repuestos: mergeRepuestosPreservandoEdicion(prev.repuestos ?? [], data.repuestos ?? []),
        };
      }
      if (nextWeb === 'pendiente' && data.metadata) {
        return {
          ...prev,
          metadata: {
            ...(prev.metadata || {}),
            ...data.metadata,
          },
          actualizado_en: nextEn || prevEn,
        };
      }
      return prev;
    });
  }, [data]);

  draftRef.current = draft;

  useEffect(() => {
    setEditando(false);
  }, [parsedId]);

  const holdPrecios = shouldHoldRevealForPrecios(data) && !holdExpired;
  useEffect(() => {
    if (!shouldHoldRevealForPrecios(data)) {
      setHoldExpired(false);
      return;
    }
    const timer = setTimeout(() => setHoldExpired(true), HOLD_REVEAL_PRECIOS_MS);
    return () => clearTimeout(timer);
  }, [data]);

  const editable = Boolean(draft && cotizacionPermiteEdicionCompleta(draft));
  const esEmitida = draft?.estado === 'enviada' || draft?.estado === 'aceptada';
  const modoVista = Boolean(esEmitida && editable && !editando);
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

  const ofrecerEnvioWhatsAppPersonal = useCallback((
    url: string,
    cot: CotizacionCanal,
    entregaMensaje?: string,
    opts?: { actualizada?: boolean; esLibre?: boolean },
  ) => {
    ofrecerEntregaCotizacionEnviada({
      url,
      cotizacion: cot,
      cuerpo: entregaMensaje,
      actualizada: opts?.actualizada,
      esLibre: opts?.esLibre ?? (cot.es_libre || !cot.conversation),
    });
  }, []);

  const persistirSiHayCambios = useCallback(async () => {
    const current = draftRef.current;
    if (!current?.id) return current;
    if (data && snapshot(current) === snapshot(data)) return current;
    const seq = ++persistSeqRef.current;
    const actualizada = await cotizacionCanalService.actualizar(
      current.id,
      payloadEdicionCotizacion(current),
    );
    const aplicar = (prev: CotizacionCanal | null): CotizacionCanal => {
      if (!prev || prev.id !== actualizada.id) return actualizada;
      return {
        ...actualizada,
        repuestos: mergeRepuestosPreservandoEdicion(
          prev.repuestos ?? [],
          actualizada.repuestos ?? [],
        ),
        mano_obra_lineas: prev.mano_obra_lineas ?? actualizada.mano_obra_lineas,
      };
    };
    if (seq !== persistSeqRef.current) {
      return aplicar(draftRef.current);
    }
    let applied = actualizada;
    setDraft((prev) => {
      applied = aplicar(prev);
      draftRef.current = applied;
      return applied;
    });
    await invalidateAll();
    return applied;
  }, [data, invalidateAll]);

  const draftSnap = draft ? snapshot(draft) : '';
  useEffect(() => {
    if (!hayCambios || !editable || enviando || guardando || previewVisible) return;
    const t = setTimeout(() => {
      void persistirSiHayCambios();
    }, 900);
    return () => clearTimeout(t);
  }, [hayCambios, draftSnap, editable, enviando, guardando, previewVisible, persistirSiHayCambios]);

  const abrirVistaPrevia = useCallback(async (tipo?: 'estimacion' | 'cotizacion') => {
    if (!draft?.id) return;
    if (adicionalRequiereFecha(draft)) {
      showAlert(
        'Fecha requerida',
        'Indica día y hora acordados con el cliente antes de enviar.',
      );
      return;
    }
    const nextTipo = tipo
      || (draft.puede_enviar_firme ? 'cotizacion' : 'estimacion');
    tipoEnvioRef.current = nextTipo;
    setTipoPreview(nextTipo);
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
      setEditando(false);
      setPreviewVisible(false);
      await invalidateAll();
      await refetch();
      if (!url) {
        showAlert('Cotización lista', 'Se guardó, pero no hay link para compartir.');
        return;
      }
      const esLibre = Boolean(cotEnviada.es_libre) || !cotEnviada.conversation;
      if (requiereEntregaManual({
        entregaVia: entrega,
        esLibre,
        conversationId: cotEnviada.conversation,
      })) {
        ofrecerEnvioWhatsAppPersonal(
          url,
          cotEnviada,
          cuerpoEnvioExitoso({
            entregaVia: entrega || 'link_publico',
            numeroPublico: cotEnviada.numero_publico,
            esLibre,
            tieneTelefono: Boolean(cotEnviada.cliente_telefono?.trim()),
            actualizada: eraUpdate,
          }),
          { actualizada: eraUpdate, esLibre },
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
          COPY_PRECIO_TALLER.alertaFaltanPrecios,
          [
            { text: 'Ahora no', style: 'cancel' },
            {
              text: 'Enviar estimación',
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
    await compartirCotizacionPorWhatsApp(url, draft, {
      actualizada: draft.estado !== 'borrador',
    });
  }, [draft]);

  const copiarLink = useCallback(() => {
    const url = draft?.share_url || draft?.url_publica;
    if (!url) return;
    void avisarCopiaLink(url);
  }, [draft]);

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

  const corregirCotizacion = useCallback(async () => {
    if (!draft?.id || draft.estado !== 'enviada') return;
    setGuardando(true);
    try {
      const reabierta = await cotizacionCanalService.reabrir(draft.id);
      setDraft({ ...reabierta });
      setEditando(false);
      await invalidateAll();
    } catch {
      showAlert(
        'No se pudo corregir',
        'Solo puedes corregir una cotización enviada que el cliente todavía no acepta.',
      );
    } finally {
      setGuardando(false);
    }
  }, [draft?.estado, draft?.id, invalidateAll]);

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
        <Stack.Screen options={STACK_OPTIONS} />
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
        <Stack.Screen options={STACK_OPTIONS} />
        <Header title="Cotización" showBack onBackPress={() => router.back()} />
        <View style={styles.center}>
          <InstitutionalText role="body">No encontramos esta cotización.</InstitutionalText>
        </View>
      </View>
    );
  }

  const titulo =
    folioCotizacionLabel(draft.numero_publico)
    || (draft.es_cotizacion_adicional ? 'Trabajo adicional' : 'Cotización');
  const pendientesPrecio = draft.lineas_pendientes_precio?.length
    ?? (draft.repuestos ?? []).filter(lineaPendientePrecio).length;
  const puedeEnviarFirme = draft.puede_enviar_firme ?? pendientesPrecio === 0;
  const shareUrl = draft.share_url || draft.url_publica || '';
  const fabActions: CotizacionFabAction[] = [];
  if (draft.estado === 'borrador' || editando) {
    fabActions.push({
      key: 'mano',
      label: 'Mano de obra',
      icon: Wrench,
      onPress: () => editorRef.current?.agregarManoObra(),
    });
    fabActions.push({
      key: 'repuesto',
      label: 'Repuesto',
      icon: Package,
      onPress: () => editorRef.current?.agregarRepuesto(),
    });
  } else {
    if (draft.estado === 'aceptada' && draft.cita_personal_id && !tieneHorarioAgendado) {
      fabActions.push({
        key: 'agendar',
        label: 'Agendar visita',
        icon: Calendar,
        onPress: () => router.push(`/cita-agenda-personal/${draft.cita_personal_id}?agendar=1`),
      });
    }
    if (shareUrl) {
      fabActions.push({
        key: 'copiar',
        label: 'Copiar link',
        icon: Link2,
        onPress: copiarLink,
      });
    }
    if (draft.id && (draft.numero_publico || draft.estado !== 'borrador' || draft.emision_pendiente)) {
      fabActions.push({
        key: 'preview',
        label: 'Ver como el cliente',
        icon: Eye,
        onPress: () => void abrirVistaPrevia(),
      });
    }
    if (draft.conversation) {
      fabActions.push({
        key: 'chat',
        label: 'Ver conversación',
        icon: MessageCircle,
        onPress: () => router.push(omnichannelChatHref(draft.conversation as number)),
      });
    }
    if (shareUrl && draft.estado === 'enviada' && !draft.entrega_pendiente_compartir) {
      fabActions.push({
        key: 'wa',
        label: 'Recordar por WhatsApp',
        icon: Phone,
        onPress: () => void recordarWhatsApp(),
      });
    }
    if (draft.estado === 'enviada') {
      fabActions.push({
        key: 'aceptar',
        label: 'Marcar aceptada',
        icon: Check,
        onPress: () => void marcarAceptada(),
      });
      fabActions.push({
        key: 'cerrar',
        label: 'Cerrar caso',
        icon: X,
        onPress: cerrarCaso,
      });
    }
    if (tieneHorarioAgendado && draft.cita_personal_id) {
      fabActions.push({
        key: 'cita',
        label: 'Ver cita',
        icon: Calendar,
        onPress: () => router.push(`/cita-agenda-personal/${draft.cita_personal_id}`),
      });
    }
  }
  const fabVariant = draft.estado === 'borrador' || editando ? 'plus' : 'more';
  const citaParaAdicional = draft.cita_personal_id || draft.cita_origen_id || null;
  const showFooter = Boolean(
    (tieneHorarioAgendado && draft.cita_personal_id)
    || draft.estado === 'borrador'
    || draft.estado === 'enviada'
    || (draft.estado === 'aceptada' && citaParaAdicional)
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={STACK_OPTIONS} />
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
          ) : editando ? (
            <TouchableOpacity
              onPress={() => {
                if (hayCambios) {
                  showConfirm(
                    'Descartar cambios',
                    'Se perderán los cambios que no hayas enviado al cliente.',
                    {
                      confirmText: 'Descartar',
                      onConfirm: () => {
                        if (data) setDraft({ ...data });
                        setEditando(false);
                      },
                    },
                  );
                  return;
                }
                if (data) setDraft({ ...data });
                setEditando(false);
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Cancelar edición"
            >
              <X size={20} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView
        style={[hostScreenStyles.scroll, styles.scroll]}
        contentContainerStyle={[
          hostScreenStyles.scrollInner,
          styles.scrollInner,
          { paddingBottom: footerBottom + 72 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <CotizacionIaEditor
          ref={editorRef}
          cotizacion={draft}
          onChange={setDraft}
          readonly={!editable || modoVista}
          hideSendActions
          compactHeader
          onEnviarEstimacion={() => void abrirVistaPrevia('estimacion')}
        />

        {draft.estado === 'aceptada' ? (
          <RegistrarCompraCard cotizacion={draft} />
        ) : null}

        {draft.estado === 'aceptada' ? (
          <InstitutionalText role="caption" color="body">
            Esta cotización ya fue aceptada y queda cerrada. Para sumar o cambiar trabajo, crea una cotización adicional.
          </InstitutionalText>
        ) : null}

        {draft.estado === 'enviada' ? (
          <InstitutionalText role="caption" color="body">
            El cliente ya tiene este documento. Si hay que cambiar precios o ítems antes de que acepte, corrígela: vuelve a borrador y confirmas los precios como al crearla.
          </InstitutionalText>
        ) : null}

        {draft.estado === 'enviada' && !editando ? (
          <CotizacionEnviadaSiguientePaso cotizacion={draft} />
        ) : null}
      </ScrollView>

      {showFooter ? (
      <View style={[styles.footer, { paddingBottom: footerBottom }]}>
        {tieneHorarioAgendado && draft.cita_personal_id ? (
          <InstitutionalButton
            label="Agregar ítems o servicio adicional"
            variant="primary"
            onPress={() => router.push(`/agregar-servicio-adicional/${draft.cita_personal_id}`)}
          />
        ) : null}

        {draft.estado === 'borrador' ? (
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
            ) : null}
            <CotizacionBorradorAcciones
              pendientesPrecio={pendientesPrecio}
              puedeEnviarFirme={puedeEnviarFirme}
              enviarFirmeLabel={cotizacionEsActualizacion(draft) ? 'Enviar actualización' : 'Enviar cotización'}
              confirmDisabled={enviando || guardando}
              sendDisabled={!cotizacionPermiteEnviar(draft) || enviando || guardando}
              loading={enviando || guardando}
              onConfirmarPrecios={() => editorRef.current?.abrirConfirmarPrecios()}
              onEnviarFirme={() => void abrirVistaPrevia('cotizacion')}
            />
          </View>
        ) : null}

        {draft.estado === 'enviada' && !editando && draft.entrega_pendiente_compartir && (draft.share_url || draft.url_publica) ? (
          <InstitutionalButton
            label="Compartir por WhatsApp"
            variant="primary"
            leading={<Phone size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />}
            onPress={() => void compartir()}
          />
        ) : null}

        {draft.estado === 'enviada' ? (
          <InstitutionalButton
            label="Corregir cotización"
            variant={draft.entrega_pendiente_compartir ? 'outline' : 'primary'}
            loading={guardando}
            onPress={() => void corregirCotizacion()}
          />
        ) : null}

        {draft.estado === 'aceptada' && citaParaAdicional && !tieneHorarioAgendado ? (
          <InstitutionalButton
            label="Nueva cotización adicional"
            variant="primary"
            onPress={() => router.push(`/agregar-servicio-adicional/${citaParaAdicional}`)}
          />
        ) : null}
      </View>
      ) : null}

      {!previewVisible && fabActions.length > 0 ? (
        <CotizacionEditorFab
          visible
          variant={fabVariant}
          actions={fabActions}
          bottomOffset={
            showFooter
              ? footerBottom + 112
              : footerBottom + SPACING.fixed.lg
          }
        />
      ) : null}

      <VistaPreviaCotizacionClienteModal
        visible={previewVisible}
        cotizacionId={draft.id}
        esActualizacion={cotizacionEsActualizacion(draft)}
        tipoDocumento={tipoPreview}
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
    minHeight: 0,
    backgroundColor: I.surfaceSoft,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
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
    flexShrink: 0,
    zIndex: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    backgroundColor: COLORS.background.paper,
    paddingHorizontal: SPACING.fixed.lg,
    paddingTop: SPACING.fixed.sm,
    gap: SPACING.fixed.xs,
  },
  footerBorrador: {
    gap: SPACING.fixed.xs,
  },
});
