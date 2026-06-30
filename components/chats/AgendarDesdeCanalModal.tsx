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
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import { ChilePhoneField, getChilePhoneError } from '@/components/forms/ChilePhoneField';
import ChileAddressField from '@/components/forms/ChileAddressField';
import type { ChileFormattedAddress } from '@/utils/chileAddressSearch';
import {
  CatalogoFechaHoraPickers,
  formatDateApi,
  resolveInitialPickerValue,
  type CatalogoFechaHoraValue,
} from '@/components/solicitudes/CatalogoFechaHoraPickers';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { InstitutionalScreenTabs } from '@/app/design-system/components/InstitutionalScreenTabs';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  agendaProveedorService,
  type CitaAgendaPersonalCreatePayload,
} from '@/services/agendaProveedorService';
import { consultarPatente } from '@/services/vehiculoService';
import {
  extraerNueveDigitosDesdeGuardado,
  normalizarTelefonoChileParaGuardar,
} from '@/utils/chilePhone';
import { esRangoHorarioValido, calcularDuracionMinutos } from '@/utils/citaPersonalHorario';
import { useAuth } from '@/context/AuthContext';
import type { ChannelSlug } from '@/utils/channelVisuals';
import { channelRespondLabel } from '@/components/chats/ChannelBadge';
import { showAlert } from '@/utils/platformAlert';
import { withWebLineHeight } from '@/utils/webTypography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { nombreContactoAgendable } from '@/utils/nombreContactoAgendable';
import { parseReferenciaDate } from '@/utils/fechaLocal';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const SHEET_TITLE = withWebLineHeight(TYPOGRAPHY.styles.h3);
const SHEET_SUBTITLE = withWebLineHeight(TYPOGRAPHY.styles.caption);
const SPEC_LABEL = withWebLineHeight(TYPOGRAPHY.styles.caption);
const SPEC_VALUE = withWebLineHeight(TYPOGRAPHY.styles.body);

const TIPO_SERVICIO_TABS = [
  { key: 'taller' as const, label: 'En taller' },
  { key: 'domicilio' as const, label: 'A domicilio' },
];

function VehiculoSpecItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.vehiculoGridItem}>
      <Text style={styles.vehiculoGridItemLabel}>{label}</Text>
      <Text style={styles.vehiculoGridItemValue} numberOfLines={2}>
        {valorSpec(value)}
      </Text>
    </View>
  );
}

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Omnicanal: prefill y subtítulo del canal */
  channel?: ChannelSlug;
  contactName?: string;
  contactPhone?: string | null;
  /** Agenda: fecha preseleccionada (YYYY-MM-DD) */
  initialFecha?: string;
  /** Subtítulo del sheet; si no se indica, se infiere del canal o la fecha */
  subtitle?: string;
};

function suggestTelefono(channel: ChannelSlug | undefined, phone: string | null | undefined): string {
  if (!phone?.trim()) return '';
  if (channel === 'whatsapp') {
    return extraerNueveDigitosDesdeGuardado(phone);
  }
  return '';
}

function subtitleDesdeFecha(fechaApi?: string): string | null {
  if (!fechaApi?.trim()) return null;
  const fecha = parseReferenciaDate(fechaApi);
  if (!fecha) return null;
  const label = fecha.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `Cita para ${label}`;
}

function limpiarVehiculo(): {
  marca: string;
  modelo: string;
  anio: string;
  color: string;
  vin: string;
  cilindraje: string;
} {
  return {
    marca: '',
    modelo: '',
    anio: '',
    color: '',
    vin: '',
    cilindraje: '',
  };
}

function valorSpec(text: string): string {
  return text.trim() || 'N/A';
}

export function AgendarDesdeCanalModal({
  visible,
  onClose,
  channel,
  contactName = '',
  contactPhone = null,
  initialFecha,
  subtitle,
}: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { puede, esSupervisor } = useAuth();
  const puedeAgendar = !esSupervisor || puede('agenda');

  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [vehiculoMarca, setVehiculoMarca] = useState('');
  const [vehiculoModelo, setVehiculoModelo] = useState('');
  const [vehiculoPatente, setVehiculoPatente] = useState('');
  const [vehiculoAnio, setVehiculoAnio] = useState('');
  const [vehiculoColor, setVehiculoColor] = useState('');
  const [vehiculoVin, setVehiculoVin] = useState('');
  const [vehiculoCilindraje, setVehiculoCilindraje] = useState('');
  const [vehiculoDesdePatente, setVehiculoDesdePatente] = useState(false);
  const [servicioManual, setServicioManual] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipoServicio, setTipoServicio] = useState<'taller' | 'domicilio'>('taller');
  const [direccion, setDireccion] = useState('');
  const [direccionValidada, setDireccionValidada] = useState<ChileFormattedAddress | null>(null);
  const [fechaHora, setFechaHora] = useState<CatalogoFechaHoraValue>(() => resolveInitialPickerValue());
  const [buscandoPatente, setBuscandoPatente] = useState(false);
  const [patenteHint, setPatenteHint] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [descripcionAltura, setDescripcionAltura] = useState(88);

  const channelLabel = useMemo(
    () => (channel ? channelRespondLabel(channel) : null),
    [channel],
  );

  const sheetSubtitle = useMemo(() => {
    if (subtitle?.trim()) return subtitle.trim();
    if (channelLabel) return `Desde ${channelLabel}`;
    const desdeFecha = subtitleDesdeFecha(initialFecha);
    if (desdeFecha) return desdeFecha;
    return 'Agenda personal';
  }, [subtitle, channelLabel, initialFecha]);

  useEffect(() => {
    if (!visible) return;
    setClienteNombre(nombreContactoAgendable(contactName));
    setClienteTelefono(suggestTelefono(channel, contactPhone));
    setVehiculoMarca('');
    setVehiculoModelo('');
    setVehiculoPatente('');
    setVehiculoAnio('');
    setVehiculoColor('');
    setVehiculoVin('');
    setVehiculoCilindraje('');
    setVehiculoDesdePatente(false);
    setServicioManual('');
    setDescripcion('');
    setTipoServicio('taller');
    setDireccion('');
    setDireccionValidada(null);
    setFechaHora(resolveInitialPickerValue(initialFecha));
    setPatenteHint(null);
    setErrorForm(null);
    setGuardando(false);
    setDescripcionAltura(88);
  }, [visible, contactName, contactPhone, channel, initialFecha]);

  const resetVehiculoManual = useCallback(() => {
    const vacio = limpiarVehiculo();
    setVehiculoMarca(vacio.marca);
    setVehiculoModelo(vacio.modelo);
    setVehiculoAnio(vacio.anio);
    setVehiculoColor(vacio.color);
    setVehiculoVin(vacio.vin);
    setVehiculoCilindraje(vacio.cilindraje);
    setVehiculoDesdePatente(false);
    setPatenteHint(null);
  }, []);

  const handlePatenteChange = useCallback(
    (text: string) => {
      setVehiculoPatente(text.toUpperCase());
      if (vehiculoDesdePatente) {
        resetVehiculoManual();
      } else {
        setPatenteHint(null);
      }
    },
    [vehiculoDesdePatente, resetVehiculoManual],
  );

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
      setVehiculoColor(data.color?.trim() || '');
      setVehiculoVin(data.vin?.trim() || '');
      setVehiculoCilindraje(data.cilindraje?.trim() || '');
      setVehiculoDesdePatente(true);
      setPatenteHint('Datos del vehículo cargados desde la patente.');
    } catch {
      resetVehiculoManual();
      setPatenteHint('No se encontró la patente. Completa marca y modelo manualmente.');
    } finally {
      setBuscandoPatente(false);
    }
  }, [vehiculoPatente, resetVehiculoManual]);

  const validarFormulario = useCallback((): string | null => {
    if (!puedeAgendar) {
      return 'No tienes permiso para agendar citas.';
    }
    if (!clienteNombre.trim()) return 'Ingresa el nombre del cliente.';
    const telError = getChilePhoneError(extraerNueveDigitosDesdeGuardado(clienteTelefono), false);
    if (telError) return telError;
    if (!vehiculoMarca.trim()) return 'Ingresa la marca del vehículo.';
    if (!vehiculoModelo.trim()) return 'Ingresa el modelo del vehículo.';
    if (vehiculoAnio.trim()) {
      const anio = parseInt(vehiculoAnio.trim(), 10);
      const maxAnio = new Date().getFullYear() + 1;
      if (Number.isNaN(anio) || anio < 1950 || anio > maxAnio) {
        return `Ingresa un año válido (1950–${maxAnio}).`;
      }
    }
    if (!servicioManual.trim()) return 'Ingresa el nombre del servicio.';
    if (tipoServicio === 'domicilio') {
      if (!direccion.trim()) return 'Ingresa la dirección para servicio a domicilio.';
      if (!direccionValidada) return 'Selecciona una dirección válida de la lista de sugerencias.';
    }
    if (!fechaHora.hora || !fechaHora.horaFin) {
      return 'Selecciona hora de inicio y término para la cita.';
    }
    if (!esRangoHorarioValido(fechaHora.hora, fechaHora.horaFin)) {
      return 'La hora de término debe ser al menos 15 minutos después del inicio.';
    }
    return null;
  }, [
    puedeAgendar,
    clienteNombre,
    clienteTelefono,
    vehiculoMarca,
    vehiculoModelo,
    vehiculoAnio,
    servicioManual,
    tipoServicio,
    direccion,
    direccionValidada,
    fechaHora,
  ]);

  const construirPayload = useCallback((): CitaAgendaPersonalCreatePayload => {
    const detalle: CitaAgendaPersonalCreatePayload['detalle'] = {
      cliente_nombre: clienteNombre.trim(),
      cliente_telefono: normalizarTelefonoChileParaGuardar(clienteTelefono),
      vehiculo_marca: vehiculoMarca.trim(),
      vehiculo_modelo: vehiculoModelo.trim(),
      servicio_nombre: servicioManual.trim(),
    };

    if (vehiculoPatente.trim()) {
      detalle.vehiculo_patente = vehiculoPatente.trim().toUpperCase();
    }
    if (vehiculoAnio.trim()) {
      const anio = parseInt(vehiculoAnio.trim(), 10);
      if (!Number.isNaN(anio)) detalle.vehiculo_anio = anio;
    }
    if (vehiculoColor.trim()) detalle.vehiculo_color = vehiculoColor.trim();
    if (vehiculoCilindraje.trim()) detalle.vehiculo_cilindraje = vehiculoCilindraje.trim();
    if (tipoServicio === 'domicilio') {
      detalle.direccion = (direccionValidada?.line ?? direccion).trim();
    }
    if (descripcion.trim()) detalle.descripcion = descripcion.trim();

    return {
      fecha_servicio: formatDateApi(fechaHora.fecha),
      hora_servicio: `${fechaHora.hora}:00`,
      duracion_minutos: calcularDuracionMinutos(fechaHora.hora!, fechaHora.horaFin!),
      tipo_servicio: tipoServicio,
      detalle,
    };
  }, [
    clienteNombre,
    clienteTelefono,
    vehiculoMarca,
    vehiculoModelo,
    vehiculoPatente,
    vehiculoAnio,
    vehiculoColor,
    vehiculoCilindraje,
    servicioManual,
    descripcion,
    tipoServicio,
    direccion,
    direccionValidada,
    fechaHora,
  ]);

  const handleAgendar = useCallback(async () => {
    setErrorForm(null);
    const validationError = validarFormulario();
    if (validationError) {
      setErrorForm(validationError);
      return;
    }

    const payload = construirPayload();
    setGuardando(true);
    try {
      const validacion = await agendaProveedorService.validarSlot(payload);
      if (!validacion.success || !validacion.data?.valido) {
        setErrorForm(
          validacion.data?.error || validacion.message || 'El horario seleccionado no está disponible.',
        );
        return;
      }

      const res = await agendaProveedorService.crearCita(payload);
      if (!res.success || !res.data) {
        setErrorForm(res.message || 'No se pudo crear la cita.');
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ['agenda-calendario'] });
      await queryClient.invalidateQueries({ queryKey: ['citas-agenda-proveedor'] });

      const mecanico = res.data.mecanico_nombre?.trim();
      const mensaje = mecanico
        ? `Cita creada y asignada a ${mecanico}.`
        : 'La cita fue agendada correctamente.';
      showAlert('Cita agendada', mensaje);
      onClose();
    } catch {
      setErrorForm('Ocurrió un error al agendar. Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  }, [validarFormulario, construirPayload, queryClient, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
        >
          <View style={styles.sheet}>
            <View style={styles.handleBar} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderText}>
                <Text style={styles.sheetTitle}>Agendar cita</Text>
                <Text style={styles.sheetSubtitle}>{sheetSubtitle}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Cerrar">
                <X size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <InstitutionalSectionHeader title="Cliente" />
            <View style={styles.section}>
              <InstitutionalField
                label="Nombre *"
                value={clienteNombre}
                onChangeText={setClienteNombre}
                placeholder="Nombre del cliente"
              />
              <ChilePhoneField
                label="Teléfono"
                hint={
                  channel === 'whatsapp'
                    ? 'Pre-rellenado desde WhatsApp. Puedes editarlo si es necesario.'
                    : channel
                      ? 'Opcional. Ingresa 9 dígitos comenzando en 9.'
                      : 'Opcional. Ingresa 9 dígitos comenzando en 9.'
                }
                value={clienteTelefono}
                onChangeValue={setClienteTelefono}
                required={false}
              />
            </View>

            <InstitutionalSectionHeader title="Vehículo" />
            <View style={styles.section}>
              <View>
                <InstitutionalField
                  label="Patente"
                  hint="Consulta el registro al salir del campo. Si existe, autocompleta y bloquea los datos del vehículo."
                  value={vehiculoPatente}
                  onChangeText={handlePatenteChange}
                  placeholder="ABCD12"
                  autoCapitalize="characters"
                  onBlur={handlePatenteBlur}
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
              </View>
              {vehiculoDesdePatente ? (
                <View style={styles.vehiculoResumen}>
                  <View style={styles.vehiculoGrid}>
                    <VehiculoSpecItem label="Marca" value={vehiculoMarca} />
                    <VehiculoSpecItem label="Modelo" value={vehiculoModelo} />
                  </View>
                  <View style={styles.vehiculoGrid}>
                    <VehiculoSpecItem label="Año" value={vehiculoAnio} />
                    <VehiculoSpecItem label="Color" value={vehiculoColor} />
                  </View>
                  <View style={styles.vehiculoGrid}>
                    <VehiculoSpecItem label="VIN" value={vehiculoVin} />
                    <VehiculoSpecItem label="Cilindraje" value={vehiculoCilindraje} />
                  </View>
                </View>
              ) : (
                <View style={styles.vehiculoManual}>
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
                  <View style={styles.fieldRow}>
                    <View style={styles.fieldHalf}>
                      <InstitutionalField
                        label="Año"
                        value={vehiculoAnio}
                        onChangeText={(text) => setVehiculoAnio(text.replace(/\D/g, '').slice(0, 4))}
                        placeholder="2020"
                        keyboardType="number-pad"
                        maxLength={4}
                      />
                    </View>
                    <View style={styles.fieldHalf} />
                  </View>
                </View>
              )}
            </View>

            <InstitutionalSectionHeader title="Servicio" />
            <View style={styles.section}>
              <InstitutionalScreenTabs
                tabs={TIPO_SERVICIO_TABS}
                activeKey={tipoServicio}
                onChange={setTipoServicio}
              />

              {tipoServicio === 'domicilio' ? (
                <ChileAddressField
                  label="Dirección *"
                  hint="Busca una dirección real en Chile y elige un resultado."
                  value={direccion}
                  validated={direccionValidada}
                  onChangeText={setDireccion}
                  onValidatedChange={setDireccionValidada}
                  placeholder="Ej: Av. Providencia 1200, Providencia"
                />
              ) : null}

              <InstitutionalField
                label="Servicio *"
                value={servicioManual}
                onChangeText={setServicioManual}
                placeholder="Ej. Cambio de aceite"
              />
              <InstitutionalField
                label="Descripción"
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Detalle adicional (opcional)"
                multiline
                inputStyle={{ minHeight: descripcionAltura }}
                textInputProps={{
                  scrollEnabled: false,
                  onContentSizeChange: (event) => {
                    const next = Math.max(88, Math.ceil(event.nativeEvent.contentSize.height) + 12);
                    setDescripcionAltura((prev) => (prev === next ? prev : next));
                  },
                }}
              />
            </View>

            <InstitutionalSectionHeader title="Fecha y hora" />
            <View style={styles.section}>
              <CatalogoFechaHoraPickers
                value={fechaHora}
                onChange={setFechaHora}
                modo="rango"
              />
            </View>

            {errorForm ? <Text style={styles.errorBanner}>{errorForm}</Text> : null}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={guardando}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, guardando && styles.confirmBtnDisabled]}
              onPress={handleAgendar}
              disabled={guardando}
            >
              {guardando ? (
                <ActivityIndicator color={I.onPrimary} size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>Agendar cita</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    width: '100%',
    maxHeight: Platform.OS === 'web' ? '92vh' : '92%',
    ...(Platform.OS === 'web' ? { height: '92vh' } : { flexShrink: 1 }),
  },
  sheet: {
    backgroundColor: I.canvas,
    borderTopLeftRadius: BORDERS.radius.xl,
    borderTopRightRadius: BORDERS.radius.xl,
    width: '100%',
    flex: 1,
    maxHeight: Platform.OS === 'web' ? '92vh' : '92%',
    ...(Platform.OS === 'web' ? { height: '92vh' } : null),
    ...SHADOWS.editorial,
    overflow: 'hidden',
  },
  handleBar: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: BORDERS.radius.full,
    backgroundColor: I.hairline,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    gap: SPACING.sm,
  },
  sheetHeaderText: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.xxs,
    ...(Platform.OS === 'web' ? ({ display: 'flex', flexDirection: 'column' } as object) : null),
  },
  sheetTitle: {
    ...SHEET_TITLE,
    color: I.ink,
    fontWeight: '600',
  },
  sheetSubtitle: {
    ...SHEET_SUBTITLE,
    color: I.muted,
  },
  closeBtn: {
    width: 40,
    height: 40,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flexGrow: 1, flexShrink: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  section: {
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  vehiculoResumen: {
    gap: SPACING.sm,
  },
  vehiculoManual: {
    gap: SPACING.sm,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  fieldHalf: {
    flex: 1,
    minWidth: 0,
  },
  vehiculoGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  vehiculoGridItem: {
    flex: 1,
    minWidth: 0,
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.sm + 2,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    gap: SPACING.xxs,
  },
  vehiculoGridItemLabel: {
    ...SPEC_LABEL,
    color: I.muted,
    fontFamily: FF.sansMedium,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
  },
  vehiculoGridItemValue: {
    ...SPEC_VALUE,
    color: I.ink,
    fontFamily: FF.sansSemiBold,
  },
  patenteLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  patenteHint: {
    ...SPEC_LABEL,
    color: I.muted,
    marginTop: SPACING.xs,
  },
  errorBanner: {
    ...TYPOGRAPHY.styles.caption,
    color: I.semanticDown,
    backgroundColor: I.surfaceSoft,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.md,
    marginTop: SPACING.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: I.hairline,
  },
  cancelBtnText: {
    ...TYPOGRAPHY.styles.button,
    color: I.muted,
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.primary,
    minHeight: 48,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: {
    ...TYPOGRAPHY.styles.button,
    color: I.onPrimary,
    fontWeight: '600',
  },
});
