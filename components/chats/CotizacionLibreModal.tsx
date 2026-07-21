import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { ChevronDown, Link2, Search, Sparkles, UserRound, X } from 'lucide-react-native';
import { BottomSheet } from '@/app/design-system/components/BottomSheet';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { hostIconPlateStyle } from '@/app/design-system/styles/institutionalSemantic';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import { ChilePhoneField, getChilePhoneError } from '@/components/forms/ChilePhoneField';
import { CotizacionIaEditor } from '@/components/chats/CotizacionIaEditor';
import { ChannelBadge } from '@/components/chats/ChannelBadge';
import cotizacionCanalService, { type CotizacionCanal } from '@/services/cotizacionCanalService';
import { consultarPatente } from '@/services/vehiculoService';
import { useChatInboxQuery } from '@/hooks/useChatInboxQuery';
import type { InboxChatItem } from '@/services/omnichannelService';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { showAlert } from '@/utils/platformAlert';
import { getChannelVisual, type ChannelSlug } from '@/utils/channelVisuals';
import {
  extraerNueveDigitosDesdeGuardado,
  normalizarTelefonoChileParaGuardar,
} from '@/utils/chilePhone';

const CLIENTE_TABS = [
  { key: 'mensajes' as const, label: 'Desde mensajes' },
  { key: 'manual' as const, label: 'Cliente nuevo' },
];

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
const FF = TYPOGRAPHY.fontFamily;

type ClienteModo = 'mensajes' | 'manual';

type ContactoCanal = {
  conversationId: number;
  nombre: string;
  telefono: string | null;
  canal: ChannelSlug;
};

function contactosDesdeInbox(items: InboxChatItem[]): ContactoCanal[] {
  const seen = new Set<string>();
  const out: ContactoCanal[] = [];
  for (const item of items) {
    if (item.kind !== 'omnichannel' || !item.conversation_id) continue;
    const key = String(item.conversation_id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      conversationId: Number(item.conversation_id),
      nombre: item.otra_persona?.nombre?.trim() || 'Cliente',
      telefono: item.otra_persona?.telefono ?? null,
      canal: (item.channel || 'whatsapp') as ChannelSlug,
    });
  }
  return out;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onEnviada?: () => void;
};

export function CotizacionLibreModal({ visible, onClose, onEnviada }: Props) {
  const { data: inbox = [], isPending: inboxLoading } = useChatInboxQuery(visible);
  const contactos = useMemo(() => contactosDesdeInbox(inbox), [inbox]);

  const [clienteModo, setClienteModo] = useState<ClienteModo>('mensajes');
  const [contactoSeleccionado, setContactoSeleccionado] = useState<ContactoCanal | null>(null);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [busquedaContacto, setBusquedaContacto] = useState('');
  const [filtroCanal, setFiltroCanal] = useState<'todos' | ChannelSlug>('todos');

  const [vehiculoPatente, setVehiculoPatente] = useState('');
  const [vehiculoMarca, setVehiculoMarca] = useState('');
  const [vehiculoModelo, setVehiculoModelo] = useState('');
  const [vehiculoAnio, setVehiculoAnio] = useState('');
  const [vehiculoCilindraje, setVehiculoCilindraje] = useState('');
  const [vehiculoVin, setVehiculoVin] = useState('');
  const [vehiculoDesdePatente, setVehiculoDesdePatente] = useState(false);
  const [servicioNombre, setServicioNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [modalidad, setModalidad] = useState<'taller' | 'domicilio'>('taller');
  const [buscandoPatente, setBuscandoPatente] = useState(false);
  const [patenteHint, setPatenteHint] = useState<string | null>(null);
  const [generandoIa, setGenerandoIa] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorIa, setErrorIa] = useState<string | null>(null);
  const [cotizacion, setCotizacion] = useState<CotizacionCanal | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const conversationId = contactoSeleccionado?.conversationId ?? null;
  const esEnvioCanal = Boolean(conversationId);

  const canalesDisponibles = useMemo(() => {
    const set = new Set<ChannelSlug>();
    for (const c of contactos) set.add(c.canal);
    return Array.from(set);
  }, [contactos]);

  const contactosFiltrados = useMemo(() => {
    const q = busquedaContacto.trim().toLowerCase();
    return contactos.filter((c) => {
      if (filtroCanal !== 'todos' && c.canal !== filtroCanal) return false;
      if (!q) return true;
      const blob = `${c.nombre} ${c.telefono || ''} ${c.canal}`.toLowerCase();
      return blob.includes(q);
    });
  }, [contactos, busquedaContacto, filtroCanal]);

  const vehiculoPayload = useMemo(
    () => ({
      marca: vehiculoMarca.trim(),
      modelo: vehiculoModelo.trim(),
      patente: vehiculoPatente.trim().toUpperCase(),
      anio: vehiculoAnio.trim() ? parseInt(vehiculoAnio.trim(), 10) : undefined,
      cilindraje: vehiculoCilindraje.trim(),
      vin: vehiculoVin.trim().toUpperCase(),
    }),
    [vehiculoMarca, vehiculoModelo, vehiculoPatente, vehiculoAnio, vehiculoCilindraje, vehiculoVin],
  );

  const resetForm = useCallback(() => {
    setClienteModo('mensajes');
    setContactoSeleccionado(null);
    setClienteNombre('');
    setClienteTelefono('');
    setPickerVisible(false);
    setBusquedaContacto('');
    setFiltroCanal('todos');
    setVehiculoPatente('');
    setVehiculoMarca('');
    setVehiculoModelo('');
    setVehiculoAnio('');
    setVehiculoCilindraje('');
    setVehiculoVin('');
    setVehiculoDesdePatente(false);
    setServicioNombre('');
    setDescripcion('');
    setModalidad('taller');
    setPatenteHint(null);
    setErrorIa(null);
    setCotizacion(null);
    setShareUrl(null);
  }, []);

  useEffect(() => {
    if (!visible) resetForm();
  }, [visible, resetForm]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const seleccionarContacto = useCallback((c: ContactoCanal) => {
    setContactoSeleccionado(c);
    setClienteNombre(c.nombre);
    setClienteTelefono(c.telefono || '');
    setErrorIa(null);
    setPickerVisible(false);
    setBusquedaContacto('');
  }, []);

  const limpiarContacto = useCallback(() => {
    setContactoSeleccionado(null);
  }, []);

  const abrirPicker = useCallback(() => {
    setBusquedaContacto('');
    setFiltroCanal('todos');
    setPickerVisible(true);
  }, []);

  const cerrarPicker = useCallback(() => {
    setPickerVisible(false);
    setBusquedaContacto('');
  }, []);

  const renderContactoItem = useCallback(
    ({ item }: { item: ContactoCanal }) => (
      <TouchableOpacity
        style={styles.contactoRow}
        onPress={() => seleccionarContacto(item)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Elegir ${item.nombre}`}
      >
        <View style={styles.contactoText}>
          <InstitutionalText role="h5" numberOfLines={1}>
            {item.nombre}
          </InstitutionalText>
          {item.telefono ? (
            <InstitutionalText role="caption" color="muted" numberOfLines={1}>
              {item.telefono}
            </InstitutionalText>
          ) : null}
        </View>
        <ChannelBadge channel={item.canal} compact />
      </TouchableOpacity>
    ),
    [seleccionarContacto],
  );

  const handlePatenteChange = useCallback((text: string) => {
    const next = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setVehiculoPatente(next);
    if (vehiculoDesdePatente) {
      setVehiculoDesdePatente(false);
      setVehiculoMarca('');
      setVehiculoModelo('');
      setVehiculoAnio('');
      setVehiculoCilindraje('');
      setVehiculoVin('');
      setPatenteHint(null);
    }
  }, [vehiculoDesdePatente]);

  const handlePatenteBlur = useCallback(async () => {
    const patente = vehiculoPatente.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (patente.length < 5) {
      setPatenteHint(null);
      return;
    }
    setBuscandoPatente(true);
    setPatenteHint(null);
    try {
      const data = await consultarPatente(patente);
      setVehiculoPatente(data.patente || patente);
      setVehiculoMarca(data.marca_nombre?.trim() || '');
      setVehiculoModelo(data.modelo_nombre?.trim() || '');
      setVehiculoAnio(data.year ? String(data.year) : '');
      setVehiculoVin(data.vin?.trim() || '');
      setVehiculoCilindraje(data.cilindraje?.trim() || '');
      setVehiculoDesdePatente(true);
      setPatenteHint('Datos del vehículo cargados desde la patente.');
    } catch {
      setVehiculoDesdePatente(false);
      setPatenteHint('No se encontró la patente. Completa marca y modelo manualmente.');
    } finally {
      setBuscandoPatente(false);
    }
  }, [vehiculoPatente]);

  const nombreClienteEfectivo = useMemo(() => {
    if (clienteModo === 'mensajes' && contactoSeleccionado) {
      return contactoSeleccionado.nombre;
    }
    return clienteNombre.trim();
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
    if (!vehiculoMarca.trim() || !vehiculoModelo.trim()) {
      return 'Completa los datos del vehículo (patente o marca y modelo).';
    }
    if (!servicioNombre.trim()) return 'Ingresa el nombre del servicio.';
    return null;
  }, [
    clienteModo,
    contactoSeleccionado,
    nombreClienteEfectivo,
    clienteTelefono,
    vehiculoMarca,
    vehiculoModelo,
    servicioNombre,
  ]);

  const handleGenerarIa = useCallback(async () => {
    const err = validarAntesGenerar();
    if (err) {
      setErrorIa(err);
      return;
    }
    setErrorIa(null);
    setGenerandoIa(true);
    try {
      const res = await cotizacionCanalService.generarIa({
        conversation_id:
          clienteModo === 'mensajes' && conversationId != null ? conversationId : null,
        cliente_nombre: nombreClienteEfectivo,
        cliente_telefono: telefonoClienteEfectivo,
        servicio_nombre: servicioNombre.trim(),
        descripcion_problema: descripcion.trim(),
        modalidad,
        vehiculo: vehiculoPayload,
      });
      if (!res.disponible || !res.cotizacion) {
        setErrorIa(res.error || 'No se pudo generar la cotización con IA.');
        return;
      }
      setCotizacion(res.cotizacion);
    } catch {
      setErrorIa('Error al generar cotización. Intenta de nuevo.');
    } finally {
      setGenerandoIa(false);
    }
  }, [
    validarAntesGenerar,
    clienteModo,
    conversationId,
    nombreClienteEfectivo,
    telefonoClienteEfectivo,
    servicioNombre,
    descripcion,
    modalidad,
    vehiculoPayload,
  ]);

  const persistirCotizacion = useCallback(async (next: CotizacionCanal) => {
    setCotizacion(next);
    if (next.estado !== 'borrador' || !next.id) return next;
    try {
      const saved = await cotizacionCanalService.actualizar(next.id, {
        repuestos: next.repuestos,
        mano_obra_clp: next.mano_obra_clp,
        servicio_nombre: next.servicio_nombre,
        descripcion_problema: next.descripcion_problema,
        duracion_minutos_estimada: next.duracion_minutos_estimada,
      });
      setCotizacion(saved);
      return saved;
    } catch {
      return next;
    }
  }, []);

  const compartirLink = useCallback(async (url: string) => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        showAlert('Link copiado', 'Pégalo en WhatsApp u otro canal para el cliente.');
        return;
      }
      await Share.share({ message: url, url });
    } catch {
      showAlert('Link de cotización', url);
    }
  }, []);

  const handleEnviar = useCallback(async () => {
    if (!cotizacion?.id) return;
    setEnviando(true);
    setErrorIa(null);
    try {
      const saved = await persistirCotizacion(cotizacion);
      const res = await cotizacionCanalService.enviar(saved.id);
      const url = res.share_url || res.cotizacion.share_url || res.cotizacion.url_publica || null;
      setCotizacion(res.cotizacion);
      setShareUrl(url);
      onEnviada?.();
      if (res.cotizacion.conversation || res.message_id) {
        showAlert(
          'Cotización enviada',
          'El cliente la recibió en su canal y puede aceptarla o rechazarla desde la pantalla de cotización.',
        );
      } else if (url) {
        await compartirLink(url);
      } else {
        showAlert('Cotización enviada', 'Se generó la cotización.');
      }
    } catch (err) {
      setErrorIa(extractApiError(err, 'No se pudo enviar la cotización.'));
    } finally {
      setEnviando(false);
    }
  }, [cotizacion, persistirCotizacion, compartirLink, onEnviada]);

  const enviarLabel = esEnvioCanal || Boolean(cotizacion?.conversation)
    ? 'Enviar al cliente'
    : 'Generar link y compartir';

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <InstitutionalText role="h4" style={styles.title}>
            Nueva cotización
          </InstitutionalText>
          <InstitutionalText role="caption" color="muted" style={styles.subtitle}>
            {esEnvioCanal
              ? 'Se enviará al cliente por su canal de mensajes'
              : 'Link público para compartir, o elige un cliente de tus mensajes'}
          </InstitutionalText>
        </View>
        <TouchableOpacity onPress={handleClose} accessibilityLabel="Cerrar">
          <X size={22} color={I.muted} />
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
            <View style={styles.section}>
              <InstitutionalSectionHeader title="Cliente" />
              <View style={styles.underlineTabs}>
                {CLIENTE_TABS.map((tab) => {
                  const active = clienteModo === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[styles.underlineTab, active && styles.underlineTabActive]}
                      onPress={() => {
                        setClienteModo(tab.key);
                        if (tab.key === 'manual') limpiarContacto();
                        setErrorIa(null);
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

              {clienteModo === 'mensajes' ? (
                <>
                  {contactoSeleccionado ? (
                    <View style={styles.selectedContact}>
                      <View style={styles.selectedContactMain}>
                        <View style={hostIconPlateStyle}>
                          <UserRound size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                        </View>
                        <View style={styles.selectedContactText}>
                          <InstitutionalText role="h5" numberOfLines={1}>
                            {contactoSeleccionado.nombre}
                          </InstitutionalText>
                          {contactoSeleccionado.telefono ? (
                            <InstitutionalText role="caption" color="muted" numberOfLines={1}>
                              {contactoSeleccionado.telefono}
                            </InstitutionalText>
                          ) : null}
                        </View>
                        <ChannelBadge channel={contactoSeleccionado.canal} compact />
                      </View>
                      <TouchableOpacity onPress={abrirPicker} hitSlop={8}>
                        <InstitutionalText role="captionBold" color="primary">
                          Cambiar
                        </InstitutionalText>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.pickerTrigger}
                      onPress={abrirPicker}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel="Elegir cliente de mensajes"
                    >
                      <View style={styles.pickerTriggerLeft}>
                        <View style={hostIconPlateStyle}>
                          <Search size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                        </View>
                        <View style={styles.pickerTriggerText}>
                          <InstitutionalText role="h5">Elegir cliente</InstitutionalText>
                          <InstitutionalText role="caption" color="muted" numberOfLines={1}>
                            {inboxLoading
                              ? 'Cargando contactos…'
                              : contactos.length > 0
                                ? `${contactos.length} contactos en Mensajes`
                                : 'Sin contactos de canal aún'}
                          </InstitutionalText>
                        </View>
                      </View>
                      <ChevronDown size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                    </TouchableOpacity>
                  )}
                  {!inboxLoading && contactos.length === 0 ? (
                    <InstitutionalText role="caption" color="muted">
                      No hay contactos de canal. Usa “Cliente nuevo” o espera un mensaje.
                    </InstitutionalText>
                  ) : null}
                </>
              ) : (
                <>
                  <InstitutionalField
                    label="Nombre *"
                    value={clienteNombre}
                    onChangeText={setClienteNombre}
                    placeholder="Nombre del cliente"
                  />
                  <ChilePhoneField
                    label="Teléfono"
                    hint="Opcional. Indicativo +56; ingresa 9 dígitos comenzando en 9."
                    value={clienteTelefono}
                    onChangeValue={setClienteTelefono}
                    required={false}
                  />
                  <InstitutionalText role="caption" color="muted">
                    Sin chat vinculado se genera un link público para compartir.
                  </InstitutionalText>
                </>
              )}
            </View>

            <View style={styles.section}>
              <InstitutionalSectionHeader title="Vehículo" />
              <InstitutionalField
                label="Patente"
                hint="Consulta el registro al salir del campo. Si existe, autocompleta marca y modelo."
                value={vehiculoPatente}
                onChangeText={handlePatenteChange}
                placeholder="ABCD12"
                autoCapitalize="characters"
                onBlur={() => void handlePatenteBlur()}
                editable={!buscandoPatente}
              />
              {buscandoPatente ? (
                <View style={styles.patenteLoading}>
                  <ActivityIndicator size="small" color={I.ink} />
                  <InstitutionalText role="caption" color="muted">
                    Consultando patente…
                  </InstitutionalText>
                </View>
              ) : patenteHint ? (
                <InstitutionalText role="caption" color="muted">
                  {patenteHint}
                </InstitutionalText>
              ) : null}

              {vehiculoDesdePatente ? (
                <View style={styles.vehiculoResumen}>
                  <InstitutionalText role="h5">
                    {[vehiculoMarca, vehiculoModelo].filter(Boolean).join(' ')}
                    {vehiculoAnio ? ` · ${vehiculoAnio}` : ''}
                  </InstitutionalText>
                  {vehiculoCilindraje || vehiculoVin ? (
                    <InstitutionalText role="caption" color="muted">
                      {[vehiculoCilindraje, vehiculoVin].filter(Boolean).join(' · ')}
                    </InstitutionalText>
                  ) : null}
                </View>
              ) : (
                <View style={styles.fieldRow}>
                  <View style={styles.fieldHalf}>
                    <InstitutionalField
                      label="Marca *"
                      value={vehiculoMarca}
                      onChangeText={setVehiculoMarca}
                      placeholder="Ej. Toyota"
                    />
                  </View>
                  <View style={styles.fieldHalf}>
                    <InstitutionalField
                      label="Modelo *"
                      value={vehiculoModelo}
                      onChangeText={setVehiculoModelo}
                      placeholder="Ej. Corolla"
                    />
                  </View>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <InstitutionalSectionHeader title="Servicio" />
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
              <View style={styles.underlineTabs}>
                {MODALIDAD_TABS.map((tab) => {
                  const active = modalidad === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[styles.underlineTab, active && styles.underlineTabActive]}
                      onPress={() => setModalidad(tab.key)}
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
            </View>

            {errorIa ? (
              <InstitutionalText role="caption" color="semanticDown">
                {errorIa}
              </InstitutionalText>
            ) : null}

            <InstitutionalButton
              label={generandoIa ? 'Generando…' : 'Generar cotización con IA'}
              onPress={() => void handleGenerarIa()}
              disabled={generandoIa}
              loading={generandoIa}
              leading={<Sparkles size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />}
            />
          </>
        ) : (
          <>
            <CotizacionIaEditor
              cotizacion={cotizacion}
              onChange={(next) => void persistirCotizacion(next)}
              onEnviar={() => void handleEnviar()}
              enviarLabel={enviarLabel}
              enviando={enviando}
              readonly={cotizacion.estado !== 'borrador'}
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
                  variant="secondary"
                  onPress={() => void compartirLink(shareUrl)}
                />
              </View>
            ) : null}

            {errorIa ? (
              <InstitutionalText role="caption" color="semanticDown">
                {errorIa}
              </InstitutionalText>
            ) : null}
          </>
        )}
      </ScrollView>

      <BottomSheet visible={pickerVisible} onClose={cerrarPicker}>
        <View style={styles.pickerHeader}>
          <View style={styles.headerText}>
            <InstitutionalText role="h4">Elegir cliente</InstitutionalText>
            <InstitutionalText role="caption" color="muted">
              Filtra por canal o busca por nombre
            </InstitutionalText>
          </View>
          <TouchableOpacity onPress={cerrarPicker} accessibilityLabel="Cerrar selector">
            <X size={22} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrap}>
          <Search size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nombre, teléfono…"
            placeholderTextColor={I.mutedSoft}
            value={busquedaContacto}
            onChangeText={setBusquedaContacto}
            autoFocus={Platform.OS === 'web'}
          />
        </View>

        {canalesDisponibles.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.canalChips}
            style={styles.canalChipsScroll}
          >
            <TouchableOpacity
              style={[styles.canalChip, filtroCanal === 'todos' && styles.canalChipActive]}
              onPress={() => setFiltroCanal('todos')}
              accessibilityRole="tab"
              accessibilityState={{ selected: filtroCanal === 'todos' }}
            >
              <InstitutionalText
                role={filtroCanal === 'todos' ? 'captionBold' : 'caption'}
                color={filtroCanal === 'todos' ? 'ink' : 'muted'}
              >
                Todos ({contactos.length})
              </InstitutionalText>
            </TouchableOpacity>
            {canalesDisponibles.map((canal) => {
              const count = contactos.filter((c) => c.canal === canal).length;
              const label = getChannelVisual(canal).label;
              const active = filtroCanal === canal;
              return (
                <TouchableOpacity
                  key={canal}
                  style={[styles.canalChip, active && styles.canalChipActive]}
                  onPress={() => setFiltroCanal(canal)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <InstitutionalText
                    role={active ? 'captionBold' : 'caption'}
                    color={active ? 'ink' : 'muted'}
                  >
                    {label} ({count})
                  </InstitutionalText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        {inboxLoading ? (
          <ActivityIndicator color={I.ink} style={styles.pickerLoader} />
        ) : (
          <FlatList
            data={contactosFiltrados}
            keyExtractor={(item) => String(item.conversationId)}
            renderItem={renderContactoItem}
            style={styles.pickerList}
            contentContainerStyle={
              contactosFiltrados.length === 0 ? styles.pickerListEmpty : undefined
            }
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <InstitutionalText role="caption" color="muted" style={styles.pickerEmpty}>
                Ningún contacto coincide con el filtro.
              </InstitutionalText>
            }
          />
        )}
      </BottomSheet>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.fixed.sm,
  },
  headerText: { flex: 1, paddingRight: SPACING.fixed.sm, gap: 2 },
  title: {},
  subtitle: {},
  scroll: { maxHeight: '85%' },
  scrollContent: {
    paddingBottom: SPACING.fixed.xl,
    gap: SPACING.fixed.lg,
  },
  section: { gap: SPACING.fixed.sm },
  underlineTabs: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    marginBottom: SPACING.fixed.xs,
  },
  underlineTab: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.fixed.sm,
    paddingBottom: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -StyleSheet.hairlineWidth,
  },
  underlineTabActive: {
    borderBottomColor: I.ink,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
  },
  fieldHalf: { flex: 1, minWidth: 0 },
  patenteLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
    padding: SPACING.fixed.md,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    backgroundColor: COLORS.background.paper,
    ...SHADOWS.editorial,
  },
  pickerTriggerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  pickerTriggerText: { flex: 1, minWidth: 0, gap: 2 },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.fixed.sm,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    backgroundColor: I.canvas,
    marginBottom: SPACING.fixed.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.styles.body.fontSize,
    color: I.ink,
    padding: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  canalChipsScroll: { flexGrow: 0, marginBottom: SPACING.fixed.sm },
  canalChips: { gap: SPACING.fixed.xs, paddingRight: SPACING.fixed.sm },
  canalChip: {
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xs,
    borderRadius: BORDERS.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    backgroundColor: I.surfaceSoft,
  },
  canalChipActive: {
    backgroundColor: COLORS.background.paper,
    borderColor: I.ink,
  },
  pickerList: {
    maxHeight: 320,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    overflow: 'hidden',
  },
  pickerListEmpty: {
    paddingVertical: SPACING.fixed.lg,
    paddingHorizontal: SPACING.fixed.md,
  },
  pickerEmpty: { textAlign: 'center' },
  pickerLoader: { marginVertical: SPACING.fixed.lg },
  contactoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    backgroundColor: COLORS.background.paper,
  },
  contactoText: { flex: 1, minWidth: 0, gap: 2 },
  selectedContact: {
    gap: SPACING.fixed.sm,
    padding: SPACING.fixed.md,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    backgroundColor: COLORS.background.paper,
    ...SHADOWS.editorial,
  },
  selectedContactMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  selectedContactText: { flex: 1, minWidth: 0, gap: 2 },
  vehiculoResumen: {
    padding: SPACING.fixed.md,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    gap: 2,
  },
  shareBox: {
    marginTop: SPACING.fixed.sm,
    padding: SPACING.fixed.md,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    gap: SPACING.fixed.sm,
    ...SHADOWS.editorial,
  },
  shareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
  },
});

export default CotizacionLibreModal;
