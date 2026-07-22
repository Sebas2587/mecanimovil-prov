import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Share,
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
import {
  ClienteCanalPickerSection,
  type ClienteModo,
  type ContactoCanal,
} from '@/components/chats/ClienteCanalPickerSection';
import cotizacionCanalService, { type CotizacionCanal } from '@/services/cotizacionCanalService';
import { consultarPatente } from '@/services/vehiculoService';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { showAlert } from '@/utils/platformAlert';
import { withWebLineHeight } from '@/utils/webTypography';
import {
  extraerNueveDigitosDesdeGuardado,
  normalizarTelefonoChileParaGuardar,
} from '@/utils/chilePhone';
import { cilindrajeEfectivo } from '@/utils/extraerCilindrajeDesdeTexto';
import { esErrorCuota, mensajeCuotaError } from '@/utils/cuotaError';
import { UpsellCuotaModal } from '@/components/suscripciones/UpsellCuotaModal';

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
};

export function CotizacionLibreModal({ visible, onClose, onEnviada }: Props) {
  const insets = useSafeAreaInsets();

  const [clienteModo, setClienteModo] = useState<ClienteModo>('mensajes');
  const [contactoSeleccionado, setContactoSeleccionado] = useState<ContactoCanal | null>(null);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');

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
  const [direccion, setDireccion] = useState('');
  const [direccionValidada, setDireccionValidada] = useState<ChileFormattedAddress | null>(null);
  const [buscandoPatente, setBuscandoPatente] = useState(false);
  const [patenteHint, setPatenteHint] = useState<string | null>(null);
  const [generandoIa, setGenerandoIa] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [upsellCuota, setUpsellCuota] = useState<{ visible: boolean; mensaje: string }>({
    visible: false,
    mensaje: '',
  });
  const [errorIa, setErrorIa] = useState<string | null>(null);
  const [cotizacion, setCotizacion] = useState<CotizacionCanal | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const conversationId = contactoSeleccionado?.conversationId ?? null;
  const esEnvioCanal = Boolean(conversationId);

  const vehiculoPayload = useMemo(
    () => ({
      marca: vehiculoMarca.trim(),
      modelo: vehiculoModelo.trim(),
      patente: vehiculoPatente.trim().toUpperCase(),
      anio: vehiculoAnio.trim() ? parseInt(vehiculoAnio.trim(), 10) : undefined,
      cilindraje: cilindrajeEfectivo(vehiculoCilindraje, vehiculoMarca, vehiculoModelo),
      vin: vehiculoVin.trim().toUpperCase(),
    }),
    [vehiculoMarca, vehiculoModelo, vehiculoPatente, vehiculoAnio, vehiculoCilindraje, vehiculoVin],
  );

  const resetForm = useCallback(() => {
    setClienteModo('mensajes');
    setContactoSeleccionado(null);
    setClienteNombre('');
    setClienteTelefono('');
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
    setDireccion('');
    setDireccionValidada(null);
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
  }, []);

  const limpiarContacto = useCallback(() => {
    setContactoSeleccionado(null);
  }, []);

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
      setVehiculoCilindraje(
        cilindrajeEfectivo(
          data.cilindraje,
          data.marca_nombre,
          data.modelo_nombre,
        ),
      );
      setVehiculoDesdePatente(true);
      setPatenteHint('Datos del vehículo cargados desde la patente.');
    } catch (err) {
      setVehiculoDesdePatente(false);
      if (esErrorCuota(err)) {
        setPatenteHint(mensajeCuotaError(err, 'Necesitás una suscripción activa para consultar patentes.'));
        setUpsellCuota({
          visible: true,
          mensaje: mensajeCuotaError(err, 'Necesitás una suscripción activa para consultar patentes.'),
        });
      } else {
        setPatenteHint('No se encontró la patente. Completa marca y modelo manualmente.');
      }
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
    vehiculoMarca,
    vehiculoModelo,
    servicioNombre,
    modalidad,
    direccion,
    direccionValidada,
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
        direccion_servicio:
          modalidad === 'domicilio'
            ? (direccionValidada?.line ?? direccion).trim()
            : '',
        vehiculo: vehiculoPayload,
      });
      if (!res.disponible || !res.cotizacion) {
        setErrorIa(res.error || 'No se pudo generar la cotización con IA.');
        return;
      }
      setCotizacion(res.cotizacion);
    } catch (err) {
      if (esErrorCuota(err)) {
        setUpsellCuota({ visible: true, mensaje: mensajeCuotaError(err) });
        return;
      }
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
    direccion,
    direccionValidada,
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

  const footerPrimaryLabel = !cotizacion
    ? (generandoIa ? 'Generando…' : 'Generar cotización con IA')
    : cotizacion.estado === 'borrador'
      ? (enviando ? 'Enviando…' : enviarLabel)
      : 'Listo';

  const footerPrimaryAction = !cotizacion
    ? () => void handleGenerarIa()
    : cotizacion.estado === 'borrador'
      ? () => void handleEnviar()
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
              <Text style={styles.title}>Nueva cotización</Text>
              <Text style={styles.subtitle}>
                {esEnvioCanal
                  ? 'Se enviará al cliente por su canal de mensajes'
                  : 'Link público para compartir, o elige un cliente de tus mensajes'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
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
                  />
                </View>

                <InstitutionalSectionHeader title="Vehículo" />
                <View style={styles.section}>
                  <InstitutionalField
                    label="Patente"
                    hint="Consulta el registro al salir del campo. Si existe, autocompleta y bloquea los datos del vehículo."
                    value={vehiculoPatente}
                    onChangeText={handlePatenteChange}
                    placeholder="ABCD12"
                    autoCapitalize="characters"
                    onBlur={() => void handlePatenteBlur()}
                    editable={!buscandoPatente}
                  />
                  {buscandoPatente ? (
                    <View style={styles.patenteLoading}>
                      <ActivityIndicator size="small" color={I.primary} />
                      <Text style={styles.patenteHint}>Consultando patente…</Text>
                    </View>
                  ) : patenteHint ? (
                    <Text style={styles.patenteHint}>{patenteHint}</Text>
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
                        label="Dirección del cliente *"
                        hint="Busca una dirección real en Chile y elige un resultado."
                        value={direccion}
                        validated={direccionValidada}
                        onChangeText={setDireccion}
                        onValidatedChange={setDireccionValidada}
                        placeholder="Ej: Av. Providencia 1200, Providencia"
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
                  </View>
                </View>

                {errorIa ? <Text style={styles.errorBanner}>{errorIa}</Text> : null}
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
            <InstitutionalButton
              label="Cancelar"
              variant="outline"
              size="default"
              onPress={handleClose}
              disabled={generandoIa || enviando}
              style={styles.footerBtnSecondary}
            />
            <InstitutionalButton
              label={footerPrimaryLabel}
              variant="primary"
              size="default"
              onPress={footerPrimaryAction}
              disabled={generandoIa || enviando}
              loading={generandoIa || enviando}
              leading={
                !cotizacion ? (
                  <Sparkles size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                ) : undefined
              }
              style={styles.footerBtnPrimary}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
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
  footerBtnSecondary: { flex: 1 },
  footerBtnPrimary: { flex: 1.4 },
});

export default CotizacionLibreModal;
