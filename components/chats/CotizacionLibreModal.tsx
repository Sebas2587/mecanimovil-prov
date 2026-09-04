import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link2, Sparkles, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import { getChilePhoneError } from '@/components/forms/ChilePhoneField';
import ChileAddressField from '@/components/forms/ChileAddressField';
import type { ChileFormattedAddress } from '@/utils/chileAddressSearch';
import { CotizacionIaEditor } from '@/components/chats/CotizacionIaEditor';
import { ConfirmarPreciosSheet } from '@/components/cotizacion/ConfirmarPreciosSheet';
import { lineaPendientePrecio } from '@/components/cotizacion/repuestoCerteza';
import { useProveedoresRepuestosQuery } from '@/hooks/useProveedoresRepuestosQuery';
import { VistaPreviaCotizacionClienteModal } from '@/components/chats/VistaPreviaCotizacionClienteModal';
import {
  ClienteCanalPickerSection,
  type ClienteModo,
  type ContactoCanal,
} from '@/components/chats/ClienteCanalPickerSection';
import {
  VehiculoPatenteSection,
  type VehiculoPatenteState,
  VEHICULO_PATENTE_VACIO,
} from '@/components/chats/VehiculoPatenteSection';
import { nombreContactoAgendable } from '@/utils/nombreContactoAgendable';
import type { ChannelSlug } from '@/utils/channelVisuals';
import { channelRespondLabel } from '@/components/chats/ChannelBadge';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { showAlert, showAlertButtons, showConfirm } from '@/utils/platformAlert';
import { withWebLineHeight } from '@/utils/webTypography';
import {
  extraerNueveDigitosDesdeGuardado,
  normalizarTelefonoChileParaGuardar,
} from '@/utils/chilePhone';
import cotizacionCanalService, {
  cotizacionEsActualizacion,
  cotizacionPermiteEdicionCompleta,
  cotizacionPermiteEnviar,
  errorEnvioFirme,
  fusionarRepuestosEnviados,
  payloadEdicionCotizacion,
  type CotizacionCanal,
  type CotizacionPlantilla,
  type GenerarCotizacionIaPayload,
} from '@/services/cotizacionCanalService';
import { cilindrajeEfectivo } from '@/utils/extraerCilindrajeDesdeTexto';
import {
  abrirWhatsAppCotizacion,
  mensajeCotizacionParaCliente,
  nombresTrabajosCotizacion,
} from '@/utils/compartirCotizacionCliente';
import {
  CLIPBOARD_MENSAJE_COPIADO,
  cuerpoEnvioExitoso,
  requiereCompartirWhatsApp,
  tituloEnvioExitoso,
} from '@/utils/entregaCotizacionCopy';
import { esErrorCuota, mensajeCuotaError } from '@/utils/cuotaError';
import { UpsellCuotaModal } from '@/components/suscripciones/UpsellCuotaModal';
import { useCotizacionPlantillasQuery } from '@/hooks/useCotizacionPlantillasQuery';
import { PlantillaCotizacionRow } from '@/components/chats/PlantillaCotizacionRow';

function suggestTelefono(channel: ChannelSlug | undefined, phone: string | null | undefined): string {
  if (!phone?.trim()) return '';
  if (channel === 'whatsapp') {
    return extraerNueveDigitosDesdeGuardado(phone);
  }
  return '';
}

const MODALIDAD_TABS = [
  { key: 'taller' as const, label: 'En taller' },
  { key: 'domicilio' as const, label: 'A domicilio' },
];

function extractApiError(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: unknown } }).response?.data;
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object') {
      const first = Object.values(data as Record<string, unknown>)[0];
      if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
      if (typeof first === 'string') return first;
    }
  }
  return fallback;
}

const I = COLORS.institutional;
const SHEET_TITLE = withWebLineHeight(TYPOGRAPHY.styles.h3);
const SHEET_SUBTITLE = withWebLineHeight(TYPOGRAPHY.styles.caption);

type Props = {
  visible: boolean;
  onClose: () => void;
  onEnviada?: () => void;
  /** Prefill desde chat omnicanal */
  conversationId?: string;
  channel?: ChannelSlug;
  contactName?: string;
  contactPhone?: string | null;
  channelDisconnectedReason?: string | null;
  /** Ventana de 24 h cerrada (WhatsApp / IG / Messenger). No bloquea cotizar. */
  channelWindowClosedReason?: string | null;
};

export function CotizacionLibreModal({
  visible,
  onClose,
  onEnviada,
  conversationId: conversationIdProp,
  channel,
  contactName = '',
  contactPhone = null,
  channelDisconnectedReason = null,
  channelWindowClosedReason = null,
}: Props) {
  const insets = useSafeAreaInsets();

  const [clienteModo, setClienteModo] = useState<ClienteModo>('mensajes');
  const [contactoSeleccionado, setContactoSeleccionado] = useState<ContactoCanal | null>(null);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');

  const [vehiculo, setVehiculo] = useState<VehiculoPatenteState>(VEHICULO_PATENTE_VACIO);
  const [servicioNombre, setServicioNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [modalidad, setModalidad] = useState<'taller' | 'domicilio'>('taller');
  const [direccion, setDireccion] = useState('');
  const [direccionValidada, setDireccionValidada] = useState<ChileFormattedAddress | null>(null);
  const [buscandoPatente, setBuscandoPatente] = useState(false);
  const [patenteHint, setPatenteHint] = useState<string | null>(null);
  const [generandoIa, setGenerandoIa] = useState(false);
  const [creandoManual, setCreandoManual] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [descartando, setDescartando] = useState(false);
  const [upsellCuota, setUpsellCuota] = useState<{ visible: boolean; mensaje: string }>({
    visible: false,
    mensaje: '',
  });
  const [errorIa, setErrorIa] = useState<string | null>(null);
  const [cotizacion, setCotizacion] = useState<CotizacionCanal | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [confirmarPreciosVisible, setConfirmarPreciosVisible] = useState(false);
  const [precioBusy, setPrecioBusy] = useState(false);
  const tipoEnvioRef = useRef<'estimacion' | 'cotizacion'>('cotizacion');
  const persistSeqRef = useRef(0);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef<CotizacionCanal | null>(null);

  const conversationId = contactoSeleccionado?.conversationId ?? (
    conversationIdProp ? parseInt(conversationIdProp, 10) : null
  );
  const esEnvioCanal = Boolean(contactoSeleccionado?.conversationId ?? conversationIdProp);

  const sheetSubtitle = useMemo(() => {
    if (esEnvioCanal) {
      const label = channel ? channelRespondLabel(channel) : 'mensajes';
      return `Se enviará al cliente por ${label}`;
    }
    return 'Link público para compartir, o elige un cliente de tus mensajes';
  }, [esEnvioCanal, channel]);

  const vehiculoPayload = useMemo(
    () => ({
      marca: vehiculo.marca.trim(),
      modelo: vehiculo.modelo.trim(),
      patente: vehiculo.patente.trim().toUpperCase(),
      anio: vehiculo.anio.trim() ? parseInt(vehiculo.anio.trim(), 10) : undefined,
      cilindraje: cilindrajeEfectivo(vehiculo.cilindraje, vehiculo.marca, vehiculo.modelo),
      vin: vehiculo.vin.trim().toUpperCase(),
    }),
    [vehiculo],
  );

  const filtroPlantillas = useMemo(() => {
    if (!vehiculoPayload.marca || !vehiculoPayload.modelo) return null;
    return {
      marca: vehiculoPayload.marca,
      modelo: vehiculoPayload.modelo,
      cilindraje: vehiculoPayload.cilindraje || undefined,
    };
  }, [vehiculoPayload.marca, vehiculoPayload.modelo, vehiculoPayload.cilindraje]);

  const { plantillas: plantillasVehiculo } = useCotizacionPlantillasQuery(
    filtroPlantillas,
    Boolean(visible && filtroPlantillas && !cotizacion),
  );

  const plantillasSugeridas = useMemo(() => {
    if (!plantillasVehiculo.length) return [] as CotizacionPlantilla[];
    const servTokens = new Set(
      servicioNombre
        .toLowerCase()
        .split(/[^a-záéíóúñ0-9]+/i)
        .filter((t) => t.length > 2),
    );
    const scored = plantillasVehiculo.map((p) => {
      const nombre = (p.servicio_nombre || p.titulo || '').toLowerCase();
      let score = 0;
      if (servTokens.size) {
        for (const t of servTokens) {
          if (nombre.includes(t)) score += 1;
        }
      }
      if (p.aprendizaje_auto) score += 0.25;
      return { p, score };
    });
    scored.sort((a, b) => b.score - a.score || b.p.uso_count - a.p.uso_count);
    // Si hay servicio escrito, prioriza matches; si no, muestra las del auto.
    const filtradas = servTokens.size
      ? scored.filter((s) => s.score >= 1).map((s) => s.p)
      : scored.map((s) => s.p);
    return (filtradas.length ? filtradas : scored.map((s) => s.p)).slice(0, 4);
  }, [plantillasVehiculo, servicioNombre]);

  const resetForm = useCallback(() => {
    setClienteModo(conversationIdProp ? 'mensajes' : 'manual');
    setContactoSeleccionado(null);
    setClienteNombre('');
    setClienteTelefono('');
    setVehiculo(VEHICULO_PATENTE_VACIO);
    setServicioNombre('');
    setDescripcion('');
    setModalidad('taller');
    setDireccion('');
    setDireccionValidada(null);
    setPatenteHint(null);
    setErrorIa(null);
    setGenerandoIa(false);
    setCreandoManual(false);
    setCotizacion(null);
    setShareUrl(null);
    setPreviewVisible(false);
  }, [conversationIdProp]);

  useEffect(() => {
    if (!visible) {
      resetForm();
      return;
    }
    const nombre = nombreContactoAgendable(contactName);
    const telefono = suggestTelefono(channel, contactPhone);
    setClienteNombre(nombre);
    setClienteTelefono(telefono);
    if (conversationIdProp) {
      const id = parseInt(conversationIdProp, 10);
      if (!Number.isNaN(id)) {
        setClienteModo('mensajes');
        setContactoSeleccionado({
          conversationId: id,
          nombre: nombre || '',
          telefono: telefono || null,
          canal: (channel || 'whatsapp') as ChannelSlug,
        });
      }
    }
  }, [visible, conversationIdProp, contactName, contactPhone, channel, resetForm]);

  const cerrarModal = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const descartarBorrador = useCallback(async (id: number) => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    persistSeqRef.current += 1;
    setDescartando(true);
    try {
      await cotizacionCanalService.cancelar(id);
    } catch {
      showAlert(
        'No se pudo descartar',
        'El borrador puede seguir en Por revisar. Ábrelo y elimínalo desde el detalle.',
      );
    } finally {
      setDescartando(false);
    }
    onEnviada?.();
  }, [onEnviada]);

  const handleClose = useCallback(() => {
    const actual = draftRef.current || cotizacion;
    if (actual?.id && actual.estado === 'borrador') {
      showConfirm(
        '¿Descartar este borrador?',
        'Todavía no se envió al cliente. Si lo descartas, sale de Por revisar. Si lo dejas, puedes terminarlo después.',
        {
          confirmText: 'Descartar',
          cancelText: 'Dejar para revisar',
          onConfirm: async () => {
            await descartarBorrador(actual.id);
            cerrarModal();
          },
          onCancel: () => {
            onEnviada?.();
            cerrarModal();
          },
        },
      );
      return;
    }
    cerrarModal();
  }, [cerrarModal, cotizacion, descartarBorrador, onEnviada]);

  const seleccionarContacto = useCallback((c: ContactoCanal) => {
    setContactoSeleccionado(c);
    setClienteNombre(nombreContactoAgendable(c.nombre));
    setClienteTelefono(c.telefono || '');
    setErrorIa(null);
  }, []);

  const limpiarContacto = useCallback(() => {
    setContactoSeleccionado(null);
  }, []);

  const nombreClienteEfectivo = useMemo(() => {
    if (clienteModo === 'mensajes' && contactoSeleccionado) {
      const fromContact = nombreContactoAgendable(contactoSeleccionado.nombre);
      const manual = clienteNombre.trim();
      return nombreContactoAgendable(fromContact || manual);
    }
    return nombreContactoAgendable(clienteNombre);
  }, [clienteModo, contactoSeleccionado, clienteNombre]);

  const telefonoClienteEfectivo = useMemo(() => {
    if (clienteModo === 'mensajes' && contactoSeleccionado) {
      return contactoSeleccionado.telefono || '';
    }
    const digits = extraerNueveDigitosDesdeGuardado(clienteTelefono);
    if (!digits) return '';
    return normalizarTelefonoChileParaGuardar(clienteTelefono);
  }, [clienteModo, contactoSeleccionado, clienteTelefono]);

  const validarAntesGenerar = useCallback((): string | null => {
    if (clienteModo === 'mensajes' && !contactoSeleccionado) {
      return 'Elige un cliente de tus mensajes o cambia a “Cliente nuevo”.';
    }
    if (!nombreClienteEfectivo) return 'Ingresa el nombre del cliente.';
    if (clienteModo === 'manual') {
      const telErr = getChilePhoneError(
        extraerNueveDigitosDesdeGuardado(clienteTelefono),
        false,
      );
      if (telErr) return telErr;
    }
    if (!vehiculo.marca.trim() || !vehiculo.modelo.trim()) {
      return 'Completa los datos del vehículo (patente o marca y modelo).';
    }
    if (!servicioNombre.trim()) return 'Ingresa el nombre del servicio.';
    if (modalidad === 'domicilio') {
      if (!direccion.trim()) return 'Ingresa la dirección para servicio a domicilio.';
      if (!direccionValidada) {
        return 'Selecciona una dirección válida de la lista de sugerencias.';
      }
    }
    return null;
  }, [
    clienteModo,
    contactoSeleccionado,
    nombreClienteEfectivo,
    clienteTelefono,
    vehiculo,
    servicioNombre,
    modalidad,
    direccion,
    direccionValidada,
  ]);

  const payloadIntake = useCallback((): GenerarCotizacionIaPayload => ({
    conversation_id:
      clienteModo === 'mensajes' && conversationId != null ? conversationId : null,
    cliente_nombre: nombreClienteEfectivo,
    cliente_telefono: telefonoClienteEfectivo,
    servicio_nombre: servicioNombre.trim(),
    descripcion_problema: descripcion.trim(),
    modalidad,
    direccion_servicio:
      modalidad === 'domicilio'
        ? (direccionValidada?.line ?? direccion).trim()
        : '',
    vehiculo: vehiculoPayload,
  }), [
    clienteModo,
    conversationId,
    nombreClienteEfectivo,
    telefonoClienteEfectivo,
    servicioNombre,
    descripcion,
    modalidad,
    direccion,
    direccionValidada,
    vehiculoPayload,
  ]);

  const handleCrearBorrador = useCallback(async () => {
    const err = validarAntesGenerar();
    if (err) {
      setErrorIa(err);
      return;
    }
    setErrorIa(null);
    setCreandoManual(true);
    try {
      const res = await cotizacionCanalService.crearBorrador(payloadIntake());
      if (!res.cotizacion) {
        setErrorIa('No se pudo crear la cotización.');
        return;
      }
      setCotizacion(res.cotizacion);
    } catch (err) {
      setErrorIa(extractApiError(err, 'Error al crear la cotización. Intenta de nuevo.'));
    } finally {
      setCreandoManual(false);
    }
  }, [validarAntesGenerar, payloadIntake]);

  const handleGenerarIa = useCallback(async (plantillaId?: number) => {
    const err = validarAntesGenerar();
    if (err) {
      setErrorIa(err);
      return;
    }
    setErrorIa(null);
    setGenerandoIa(true);
    try {
      const res = await cotizacionCanalService.generarIa({
        ...payloadIntake(),
        ...(plantillaId ? { plantilla_id: plantillaId } : {}),
      });
      if (!res.disponible || !res.cotizacion) {
        setErrorIa(res.error || 'No se pudo generar la cotización con IA.');
        return;
      }
      setCotizacion(res.cotizacion);
      if (res.desde_plantilla && res.cotizacion.servicio_nombre) {
        setServicioNombre(res.cotizacion.servicio_nombre);
      }
    } catch (err) {
      if (esErrorCuota(err)) {
        setUpsellCuota({ visible: true, mensaje: mensajeCuotaError(err) });
        return;
      }
      const ax = err as {
        code?: string;
        message?: string;
        response?: { status?: number; data?: { error?: string; detail?: string } };
      };
      const timedOut =
        ax?.code === 'ECONNABORTED'
        || (typeof ax?.message === 'string' && ax.message.toLowerCase().includes('timeout'));
      const serverMsg = ax?.response?.data?.error || ax?.response?.data?.detail;
      setErrorIa(
        timedOut
          ? 'La generación tardó demasiado. Espera unos segundos y vuelve a intentar; no pulses varias veces seguidas.'
          : (typeof serverMsg === 'string' && serverMsg.trim())
            ? serverMsg
            : plantillaId
              ? 'Error al aplicar la plantilla. Intenta de nuevo.'
              : 'Error al generar cotización. Intenta de nuevo.',
      );
    } finally {
      setGenerandoIa(false);
    }
  }, [validarAntesGenerar, payloadIntake]);

  const handleUsarPlantilla = useCallback(
    (plantilla: CotizacionPlantilla) => {
      const serv = (plantilla.servicio_nombre || '').trim();
      if (serv && !servicioNombre.trim()) {
        setServicioNombre(serv);
      }
      void handleGenerarIa(plantilla.id);
    },
    [handleGenerarIa, servicioNombre],
  );

  const payloadEdicion = useCallback((next: CotizacionCanal) => payloadEdicionCotizacion(next), []);

  const ejecutarPersist = useCallback(async (next: CotizacionCanal, seq: number) => {
    if (!cotizacionPermiteEdicionCompleta(next) || !next.id) return next;
    try {
      const patch = payloadEdicion(next);
      // El endpoint cotizar-items ya persistió las líneas; un PATCH con el
      // snapshot local pisa precios/fuentes que la búsqueda web acaba de llenar.
      if (next.metadata?.busqueda_web_estado === 'pendiente') {
        delete patch.repuestos;
      }
      const saved = await cotizacionCanalService.actualizar(next.id, patch);
      const merged = {
        ...saved,
        repuestos: fusionarRepuestosEnviados(
          next.repuestos,
          saved.repuestos,
        ),
      };
      if (seq === persistSeqRef.current) {
        setCotizacion(merged);
        return merged;
      }
      return next;
    } catch {
      return next;
    }
  }, [payloadEdicion]);

  const persistirCotizacion = useCallback(async (next: CotizacionCanal, immediate = false) => {
    setCotizacion(next);
    draftRef.current = next;
    if (!cotizacionPermiteEdicionCompleta(next) || !next.id) return next;

    const seq = ++persistSeqRef.current;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);

    if (immediate) {
      return ejecutarPersist(next, seq);
    }

    return new Promise<CotizacionCanal>((resolve) => {
      persistTimerRef.current = setTimeout(async () => {
        const result = await ejecutarPersist(draftRef.current || next, seq);
        resolve(result);
      }, 600);
    });
  }, [ejecutarPersist]);

  const compartirLink = useCallback(async (url: string, cot?: CotizacionCanal | null) => {
    const fuente = cot || cotizacion;
    if (!fuente) {
      showAlert('Link de cotización', url);
      return;
    }
    const mensaje = mensajeCotizacionParaCliente({
      clienteNombre: fuente.cliente_nombre,
      numeroPublico: fuente.numero_publico,
      servicio: fuente.servicio_nombre,
      totalClp: fuente.total_clp,
      url,
      actualizada: Boolean(fuente.numero_publico),
      trabajos: nombresTrabajosCotizacion(fuente),
    });
    const via = await abrirWhatsAppCotizacion({
      telefono: fuente.cliente_telefono,
      mensaje,
      url,
    });
    if (via === 'clipboard') {
      showAlert('Mensaje copiado', CLIPBOARD_MENSAJE_COPIADO);
    }
  }, [cotizacion]);

  const { data: proveedores = [] } = useProveedoresRepuestosQuery(Boolean(cotizacion?.id));

  const abrirVistaPrevia = useCallback(async (tipo?: 'estimacion' | 'cotizacion') => {
    const fuente = draftRef.current || cotizacion;
    if (!fuente?.id || !cotizacionPermiteEnviar(fuente)) return;
    tipoEnvioRef.current = tipo
      || (fuente.puede_enviar_firme ? 'cotizacion' : 'estimacion');
    setErrorIa(null);
    try {
      await persistirCotizacion(fuente, true);
      setPreviewVisible(true);
    } catch (err) {
      setErrorIa(extractApiError(err, 'No se pudo armar la vista previa.'));
    }
  }, [cotizacion, persistirCotizacion]);

  const handleEnviar = useCallback(async (tipo?: 'estimacion' | 'cotizacion') => {
    const fuente = draftRef.current || cotizacion;
    if (!fuente?.id || !cotizacionPermiteEnviar(fuente)) return;
    const tipoDoc = tipo || tipoEnvioRef.current;
    tipoEnvioRef.current = tipoDoc;
    setEnviando(true);
    setErrorIa(null);
    try {
      const eraUpdate = Boolean(fuente.numero_publico);
      const saved = await persistirCotizacion(fuente, true);
      const res = await cotizacionCanalService.enviar(saved.id, tipoDoc);
      const url = res.share_url || res.cotizacion.share_url || res.cotizacion.url_publica || null;
      setCotizacion(res.cotizacion);
      setShareUrl(url);
      setPreviewVisible(false);
      onEnviada?.();
      const entrega = res.entrega_via || res.cotizacion.metadata?.entrega_canal;
      const cotEnviada = res.cotizacion;
      const folio = cotEnviada.numero_publico;
      const requiereWhatsAppPersonal = (
        requiereCompartirWhatsApp(entrega)
        || Boolean(channelWindowClosedReason)
      );
      if (requiereWhatsAppPersonal && url) {
        const tieneTel = Boolean(cotEnviada.cliente_telefono?.trim());
        showAlertButtons(
          tituloEnvioExitoso(folio, { actualizada: eraUpdate }),
          cuerpoEnvioExitoso({
            entregaVia: entrega || 'link_publico',
            numeroPublico: folio,
            channelDisconnected: Boolean(channelDisconnectedReason),
            actualizada: eraUpdate,
          }),
          [
            { text: 'Ahora no', style: 'cancel' },
            {
              text: tieneTel ? 'Abrir WhatsApp' : 'Copiar mensaje',
              onPress: () => {
                void compartirLink(url, cotEnviada);
              },
            },
          ],
        );
      } else if (res.cotizacion.conversation || res.message_id) {
        const canalExterno = channel && channel !== 'app';
        if (canalExterno && channelDisconnectedReason) {
          showAlert(
            tituloEnvioExitoso(folio, { actualizada: eraUpdate }),
            cuerpoEnvioExitoso({
              entregaVia: entrega,
              numeroPublico: folio,
              channelDisconnected: true,
              actualizada: eraUpdate,
            }),
          );
          if (url) await compartirLink(url);
        } else {
          showAlert(
            tituloEnvioExitoso(folio, { actualizada: eraUpdate }),
            cuerpoEnvioExitoso({
              entregaVia: entrega || 'sesion_meta',
              numeroPublico: folio,
              actualizada: eraUpdate,
            }),
          );
        }
      } else if (url) {
        showAlert(
          tituloEnvioExitoso(folio, { actualizada: eraUpdate }),
          cuerpoEnvioExitoso({
            entregaVia: entrega,
            numeroPublico: folio,
            esLibre: true,
            actualizada: eraUpdate,
          }),
        );
        await compartirLink(url);
      } else {
        showAlert(
          tituloEnvioExitoso(folio, { actualizada: eraUpdate }),
          cuerpoEnvioExitoso({ numeroPublico: folio, esLibre: true, actualizada: eraUpdate }),
        );
      }
    } catch (err) {
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
                void handleEnviar('estimacion');
              },
            },
            {
              text: 'Confirmar precios',
              onPress: () => setConfirmarPreciosVisible(true),
            },
          ],
        );
        return;
      }
      setErrorIa(extractApiError(err, 'No se pudo enviar la cotización.'));
    } finally {
      setEnviando(false);
    }
  }, [cotizacion, persistirCotizacion, compartirLink, onEnviada, channel, channelDisconnectedReason, channelWindowClosedReason]);

  const ocupado = generandoIa || creandoManual || enviando || descartando;

  const enviarLabel = esEnvioCanal || Boolean(cotizacion?.conversation)
    ? 'Enviar al cliente'
    : 'Generar link y compartir';

  const puedeEnviar = Boolean(
    cotizacion
    && cotizacionPermiteEnviar(cotizacion),
  );

  const pendientesPrecio = cotizacion
    ? (cotizacion.lineas_pendientes_precio?.length
      ?? (cotizacion.repuestos ?? []).filter(lineaPendientePrecio).length)
    : 0;
  const puedeEnviarFirme = cotizacion?.puede_enviar_firme ?? pendientesPrecio === 0;

  const footerPrimaryLabel = puedeEnviar
    ? (enviando
      ? 'Enviando…'
      : (puedeEnviarFirme
        ? (cotizacionEsActualizacion(cotizacion) ? 'Enviar cotización firme' : enviarLabel)
        : 'Confirmar precios'))
    : 'Listo';

  const footerPrimaryAction = puedeEnviar
    ? (puedeEnviarFirme
      ? () => void abrirVistaPrevia('cotizacion')
      : () => setConfirmarPreciosVisible(true))
    : handleClose;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={2}>
                {(cotizacion?.servicio_nombre || '').trim() || 'Nueva cotización'}
              </Text>
              <Text style={styles.subtitle}>{sheetSubtitle}</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              disabled={ocupado}
              style={styles.closeBtn}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <X size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!cotizacion ? (
              <>
                <InstitutionalSectionHeader title="Cliente" />
                <View style={styles.section}>
                  <ClienteCanalPickerSection
                    enabled={visible}
                    clienteModo={clienteModo}
                    onClienteModoChange={(modo) => {
                      setClienteModo(modo);
                      setErrorIa(null);
                    }}
                    contactoSeleccionado={contactoSeleccionado}
                    onSeleccionarContacto={seleccionarContacto}
                    onLimpiarContacto={limpiarContacto}
                    clienteNombre={clienteNombre}
                    onClienteNombreChange={setClienteNombre}
                    clienteTelefono={clienteTelefono}
                    onClienteTelefonoChange={setClienteTelefono}
                    manualFooterHint="Sin chat vinculado se genera un link público para compartir."
                    contextoChat={Boolean(conversationIdProp)}
                  />
                </View>

                <InstitutionalSectionHeader title="Vehículo" />
                <View style={styles.section}>
                  <VehiculoPatenteSection
                    value={vehiculo}
                    onChange={setVehiculo}
                    buscandoPatente={buscandoPatente}
                    onBuscandoPatenteChange={setBuscandoPatente}
                    patenteHint={patenteHint}
                    onPatenteHintChange={setPatenteHint}
                    onCuotaError={(mensaje) => setUpsellCuota({ visible: true, mensaje })}
                    resumenVariant="compact"
                    stripNonAlphanumeric
                  />
                </View>

                <InstitutionalSectionHeader title="Servicio" />
                <View style={styles.section}>
                  <View style={styles.choiceBlock}>
                    <InstitutionalText role="captionBold" color="ink">
                      1. Lugar del servicio
                    </InstitutionalText>
                    <InstitutionalText role="caption" color="muted">
                      ¿Dónde se realizará el trabajo?
                    </InstitutionalText>
                    <View style={styles.underlineTabs}>
                      {MODALIDAD_TABS.map((tab) => {
                        const active = modalidad === tab.key;
                        return (
                          <TouchableOpacity
                            key={tab.key}
                            style={[styles.underlineTab, active && styles.underlineTabActive]}
                            onPress={() => {
                              setModalidad(tab.key);
                              if (tab.key === 'taller') {
                                setDireccion('');
                                setDireccionValidada(null);
                              }
                            }}
                            activeOpacity={0.75}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: active }}
                          >
                            <InstitutionalText
                              role={active ? 'captionBold' : 'caption'}
                              color={active ? 'ink' : 'muted'}
                            >
                              {tab.label}
                            </InstitutionalText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {modalidad === 'domicilio' ? (
                      <ChileAddressField
                        label="Comuna o dirección del cliente *"
                        hint="Para cotizar basta con comuna verificada; puedes usar dirección completa si la tienes."
                        acceptLevel="comuna"
                        value={direccion}
                        validated={direccionValidada}
                        onChangeText={setDireccion}
                        onValidatedChange={setDireccionValidada}
                        placeholder="Ej: Providencia o Av. Providencia 1200, Providencia"
                      />
                    ) : null}
                  </View>

                  <View style={styles.choiceBlockSeparated}>
                    <InstitutionalText role="captionBold" color="ink">
                      2. Qué cotizar
                    </InstitutionalText>
                    <InstitutionalField
                      label="Nombre del servicio *"
                      value={servicioNombre}
                      onChangeText={setServicioNombre}
                      placeholder="Ej. Cambio de aceite y filtros"
                    />
                    <InstitutionalField
                      label="Detalle del problema"
                      value={descripcion}
                      onChangeText={setDescripcion}
                      placeholder="Opcional"
                      multiline
                    />
                    {plantillasSugeridas.length > 0 ? (
                      <View style={styles.plantillasBox}>
                        <InstitutionalText role="captionBold" color="ink">
                          Plantillas para este vehículo
                        </InstitutionalText>
                        <InstitutionalText role="caption" color="muted">
                          Incluye las generadas por el agente al enviar. Úsalas para no
                          regenerar desde cero.
                        </InstitutionalText>
                        <View style={styles.plantillasPaper}>
                          {plantillasSugeridas.map((p, idx) => (
                            <PlantillaCotizacionRow
                              key={p.id}
                              plantilla={p}
                              onPress={handleUsarPlantilla}
                              last={idx === plantillasSugeridas.length - 1}
                              disabled={ocupado}
                            />
                          ))}
                        </View>
                      </View>
                    ) : null}
                  </View>
                </View>

                {errorIa ? <Text style={styles.errorBanner}>{errorIa}</Text> : null}
              </>
            ) : (
              <>
                <CotizacionIaEditor
                  cotizacion={cotizacion}
                  onChange={(next) => void persistirCotizacion(next)}
                  hideSendActions
                  readonly={!cotizacionPermiteEdicionCompleta(cotizacion)}
                  compactHeader
                />

                {shareUrl ? (
                  <View style={styles.shareBox}>
                    <View style={styles.shareHeader}>
                      <Link2 size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                      <InstitutionalText role="h5">Link público</InstitutionalText>
                    </View>
                    <InstitutionalText role="caption" color="muted" selectable>
                      {shareUrl}
                    </InstitutionalText>
                    <InstitutionalButton
                      label="Copiar link"
                      variant="outline"
                      onPress={() => void compartirLink(shareUrl)}
                    />
                  </View>
                ) : null}

                {errorIa ? <Text style={styles.errorBanner}>{errorIa}</Text> : null}
              </>
            )}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
            {!cotizacion ? (
              <>
                <InstitutionalButton
                  label={generandoIa ? 'Generando…' : 'Generar con IA'}
                  variant="outline"
                  size="default"
                  onPress={() => void handleGenerarIa()}
                  disabled={ocupado}
                  loading={generandoIa}
                  leading={(
                    <Sparkles size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                  )}
                  style={styles.footerBtnPair}
                />
                <InstitutionalButton
                  label={creandoManual ? 'Creando…' : 'Crear en blanco'}
                  variant="primary"
                  size="default"
                  onPress={() => void handleCrearBorrador()}
                  disabled={ocupado}
                  loading={creandoManual}
                  style={styles.footerBtnPair}
                />
              </>
            ) : puedeEnviar ? (
              <>
                <InstitutionalButton
                  label="Descartar"
                  variant="destructiveOutline"
                  size="default"
                  onPress={handleClose}
                  disabled={ocupado}
                  loading={descartando}
                  style={styles.footerBtnSecondary}
                />
                <View style={{ flex: 1, gap: SPACING.fixed.xs }}>
                  {pendientesPrecio > 0 ? (
                    <InstitutionalText role="caption" color="muted">
                      Faltan {pendientesPrecio} precios por confirmar
                    </InstitutionalText>
                  ) : null}
                  <InstitutionalButton
                    label={footerPrimaryLabel}
                    variant="primary"
                    size="default"
                    onPress={footerPrimaryAction}
                    disabled={ocupado}
                    loading={enviando}
                  />
                  {!puedeEnviarFirme ? (
                    <InstitutionalButton
                      label="Enviar como estimación"
                      variant="tertiary"
                      size="default"
                      onPress={() => void abrirVistaPrevia('estimacion')}
                      disabled={ocupado}
                    />
                  ) : null}
                </View>
              </>
            ) : (
              <InstitutionalButton
                label="Listo"
                variant="primary"
                size="default"
                onPress={handleClose}
                disabled={ocupado}
                style={styles.footerBtnGrow}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
      <VistaPreviaCotizacionClienteModal
        visible={previewVisible}
        cotizacionId={cotizacion?.id}
        esActualizacion={cotizacionEsActualizacion(cotizacion)}
        puedeEnviar={puedeEnviar}
        enviando={enviando}
        onClose={() => setPreviewVisible(false)}
        onEnviar={() => void handleEnviar(tipoEnvioRef.current)}
      />
      <ConfirmarPreciosSheet
        visible={confirmarPreciosVisible}
        onClose={() => setConfirmarPreciosVisible(false)}
        cotizacion={cotizacion || { id: 0, repuestos: [], estado: 'borrador' } as CotizacionCanal}
        proveedores={proveedores}
        loading={precioBusy}
        onAsumir={async (ids) => {
          if (!cotizacion?.id) return;
          setPrecioBusy(true);
          try {
            const res = await cotizacionCanalService.asumirPrecioRepuesto(cotizacion.id, ids);
            setCotizacion(res.cotizacion);
            setConfirmarPreciosVisible(false);
          } catch (err) {
            setErrorIa(extractApiError(err, 'No se pudo asumir el techo.'));
          } finally {
            setPrecioBusy(false);
          }
        }}
        onEspecificacion={async (repuestoId, spec) => {
          if (!cotizacion?.id) return;
          setPrecioBusy(true);
          try {
            const res = await cotizacionCanalService.definirEspecificacion(cotizacion.id, {
              repuesto_id: String(repuestoId),
              especificacion: spec,
            });
            setCotizacion(res.cotizacion);
          } catch (err) {
            setErrorIa(extractApiError(err, 'No se pudo guardar la especificación.'));
          } finally {
            setPrecioBusy(false);
          }
        }}
        onAbrirDetalle={() => setConfirmarPreciosVisible(false)}
      />
      <UpsellCuotaModal
        visible={upsellCuota.visible}
        mensaje={upsellCuota.mensaje}
        onClose={() => setUpsellCuota({ visible: false, mensaje: '' })}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background.default,
    ...(Platform.OS === 'web' ? { minHeight: '100vh' as unknown as number } : null),
  },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    backgroundColor: COLORS.background.paper,
    gap: SPACING.sm,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.xs,
  },
  title: {
    ...SHEET_TITLE,
    color: I.ink,
    fontWeight: '600',
  },
  subtitle: {
    ...SHEET_SUBTITLE,
    color: I.muted,
  },
  closeBtn: {
    width: 44,
    height: 44,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceStrong,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  section: {
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  choiceBlock: {
    gap: SPACING.sm,
  },
  choiceBlockSeparated: {
    gap: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  fieldHalf: { flex: 1, minWidth: 0 },
  patenteLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  patenteHint: {
    ...SHEET_SUBTITLE,
    color: I.muted,
    marginTop: SPACING.xs,
  },
  vehiculoResumen: {
    gap: SPACING.xs,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceSoft,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  underlineTabs: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  underlineTab: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm,
    paddingTop: SPACING.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -StyleSheet.hairlineWidth,
  },
  underlineTabActive: {
    borderBottomColor: I.ink,
  },
  plantillasBox: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  plantillasPaper: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    paddingHorizontal: SPACING.fixed.md,
    overflow: 'hidden',
  },
  errorBanner: {
    ...TYPOGRAPHY.styles.caption,
    color: I.semanticDown,
    backgroundColor: I.surfaceSoft,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.md,
    marginTop: SPACING.sm,
  },
  shareBox: {
    marginTop: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    gap: SPACING.sm,
  },
  shareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    backgroundColor: COLORS.background.paper,
  },
  footerBtnPair: {
    flex: 1,
    minWidth: 0,
  },
  footerBtnSecondary: {
    flex: 1,
    minWidth: 0,
  },
  footerBtnPrimary: {
    flex: 2,
    minWidth: 0,
  },
  footerBtnGrow: {
    flex: 1,
    minWidth: 0,
  },
});

export default CotizacionLibreModal;
