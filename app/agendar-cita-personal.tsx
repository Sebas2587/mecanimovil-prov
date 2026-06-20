import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Header from '@/components/Header';
import { EstadoBanner } from '@/components/solicitudes/EstadoBanner';
import {
  CatalogoFechaHoraPickers,
  formatDateApi,
  resolveInitialPickerValue,
  type CatalogoFechaHoraValue,
} from '@/components/solicitudes/CatalogoFechaHoraPickers';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS, withOpacity } from '@/app/design-system/tokens';
import { agendaProveedorService, type CitaAgendaPersonalCreatePayload } from '@/services/agendaProveedorService';
import { serviciosProveedorAPI, type ServicioOferta } from '@/services/serviciosApi';
import { useAuth } from '@/context/AuthContext';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const hx = SPACING.container.horizontal;

type ModoServicio = 'catalogo' | 'manual';

export default function AgendarCitaPersonalScreen() {
  const insets = useSafeAreaInsets();
  const { estadoProveedor } = useAuth();

  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [vehiculoMarca, setVehiculoMarca] = useState('');
  const [vehiculoModelo, setVehiculoModelo] = useState('');
  const [vehiculoPatente, setVehiculoPatente] = useState('');
  const [vehiculoAnio, setVehiculoAnio] = useState('');
  const [modoServicio, setModoServicio] = useState<ModoServicio>('catalogo');
  const [servicioManual, setServicioManual] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precioReferencia, setPrecioReferencia] = useState('');
  const [tipoServicio, setTipoServicio] = useState<'taller' | 'domicilio'>('taller');
  const [fechaHora, setFechaHora] = useState<CatalogoFechaHoraValue>(() =>
    resolveInitialPickerValue(),
  );

  const [serviciosCatalogo, setServiciosCatalogo] = useState<ServicioOferta[]>([]);
  const [ofertaSeleccionada, setOfertaSeleccionada] = useState<number | null>(null);
  const [loadingServicios, setLoadingServicios] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const esMecanico = useMemo(
    () => estadoProveedor?.tipo_proveedor === 'mecanico',
    [estadoProveedor],
  );

  useEffect(() => {
    if (esMecanico) {
      setTipoServicio('domicilio');
    }
  }, [esMecanico]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingServicios(true);
      try {
        const lista = await serviciosProveedorAPI.obtenerMisServicios();
        if (mounted) {
          setServiciosCatalogo(lista.filter((s: ServicioOferta) => s.disponible));
        }
      } catch {
        if (mounted) setServiciosCatalogo([]);
      } finally {
        if (mounted) setLoadingServicios(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const validarFormulario = useCallback((): string | null => {
    if (!clienteNombre.trim()) return 'Ingresa el nombre del cliente.';
    if (!clienteTelefono.trim()) return 'Ingresa el teléfono del cliente.';
    if (!vehiculoMarca.trim()) return 'Ingresa la marca del vehículo.';
    if (!vehiculoModelo.trim()) return 'Ingresa el modelo del vehículo.';
    if (tipoServicio === 'domicilio' && !direccion.trim()) {
      return 'Ingresa la dirección para servicio a domicilio.';
    }
    if (modoServicio === 'catalogo' && !ofertaSeleccionada) {
      return 'Selecciona un servicio de tu catálogo.';
    }
    if (modoServicio === 'manual' && !servicioManual.trim()) {
      return 'Ingresa el nombre del servicio.';
    }
    if (!fechaHora.hora) return 'Selecciona una hora para la cita.';
    return null;
  }, [
    clienteNombre,
    clienteTelefono,
    vehiculoMarca,
    vehiculoModelo,
    tipoServicio,
    direccion,
    modoServicio,
    ofertaSeleccionada,
    servicioManual,
    fechaHora.hora,
  ]);

  const construirPayload = useCallback((): CitaAgendaPersonalCreatePayload => {
    const detalle: CitaAgendaPersonalCreatePayload['detalle'] = {
      cliente_nombre: clienteNombre.trim(),
      cliente_telefono: clienteTelefono.trim(),
      vehiculo_marca: vehiculoMarca.trim(),
      vehiculo_modelo: vehiculoModelo.trim(),
    };

    if (vehiculoPatente.trim()) detalle.vehiculo_patente = vehiculoPatente.trim();

    if (vehiculoAnio.trim()) {
      const anio = parseInt(vehiculoAnio.trim(), 10);
      if (!Number.isNaN(anio)) detalle.vehiculo_anio = anio;
    }

    if (tipoServicio === 'domicilio') {
      detalle.direccion = direccion.trim();
    }

    if (modoServicio === 'catalogo' && ofertaSeleccionada) {
      detalle.oferta_servicio_id = ofertaSeleccionada;
    } else {
      detalle.servicio_nombre = servicioManual.trim();
    }

    if (descripcion.trim()) detalle.descripcion = descripcion.trim();

    if (precioReferencia.trim()) {
      const precio = parseFloat(precioReferencia.replace(/[^0-9.,]/g, '').replace(',', '.'));
      if (!Number.isNaN(precio)) detalle.precio_referencia = precio;
    }

    return {
      fecha_servicio: formatDateApi(fechaHora.fecha),
      hora_servicio: `${fechaHora.hora}:00`,
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
    tipoServicio,
    direccion,
    modoServicio,
    ofertaSeleccionada,
    servicioManual,
    descripcion,
    precioReferencia,
    fechaHora,
  ]);

  const handleGuardar = useCallback(async () => {
    const error = validarFormulario();
    if (error) {
      Alert.alert('Datos incompletos', error);
      return;
    }

    const payload = construirPayload();
    setGuardando(true);

    const validacion = await agendaProveedorService.validarSlot(payload);
    if (!validacion.success || !validacion.data?.valido) {
      setGuardando(false);
      Alert.alert(
        'Horario no disponible',
        validacion.data?.error || validacion.message || 'El horario seleccionado no está disponible.',
      );
      return;
    }

    const res = await agendaProveedorService.crearCita(payload);
    setGuardando(false);

    if (res.success && res.data) {
      Alert.alert('Cita agendada', 'La cita personal fue creada correctamente.', [
        {
          text: 'Ver detalle',
          onPress: () => router.replace(`/cita-agenda-personal/${res.data!.id}`),
        },
      ]);
    } else {
      Alert.alert('Error', res.message || 'No se pudo crear la cita.');
    }
  }, [validarFormulario, construirPayload]);

  const toggleOferta = useCallback((id: number) => {
    setOfertaSeleccionada((prev) => (prev === id ? null : id));
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Header
        title="Agendar cita personal"
        showBack
        onBackPress={() => router.back()}
        backgroundColor={I.canvas}
        titleColor={I.ink}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            paddingHorizontal: hx,
            paddingBottom: insets.bottom + SPACING.fixed.xl,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.bannerWrap}>
            <EstadoBanner
              type="info"
              title="¿Cliente externo a Mecanimovil?"
              message="Recomienda la app Mecanimovil Usuarios para reservas con pago, historial y seguimiento del servicio."
              icon="smartphone"
            />
          </View>

          <Section title="Cliente">
            <Field label="Nombre *" value={clienteNombre} onChangeText={setClienteNombre} placeholder="Nombre completo" />
            <Field
              label="Teléfono *"
              value={clienteTelefono}
              onChangeText={setClienteTelefono}
              placeholder="+56 9 1234 5678"
              keyboardType="phone-pad"
            />
          </Section>

          <Section title="Vehículo">
            <Field label="Marca *" value={vehiculoMarca} onChangeText={setVehiculoMarca} placeholder="Toyota" />
            <Field label="Modelo *" value={vehiculoModelo} onChangeText={setVehiculoModelo} placeholder="Corolla" />
            <View style={styles.rowFields}>
              <View style={styles.halfField}>
                <Field label="Patente" value={vehiculoPatente} onChangeText={setVehiculoPatente} placeholder="AA1234" autoCapitalize="characters" />
              </View>
              <View style={styles.halfField}>
                <Field label="Año" value={vehiculoAnio} onChangeText={setVehiculoAnio} placeholder="2020" keyboardType="number-pad" />
              </View>
            </View>
          </Section>

          <Section title="Tipo de servicio">
            <View style={styles.segmentRow}>
              {!esMecanico && (
                <SegmentButton
                  label="En taller"
                  selected={tipoServicio === 'taller'}
                  onPress={() => setTipoServicio('taller')}
                />
              )}
              <SegmentButton
                label="A domicilio"
                selected={tipoServicio === 'domicilio'}
                onPress={() => setTipoServicio('domicilio')}
              />
            </View>
            {tipoServicio === 'domicilio' && (
              <Field
                label="Dirección *"
                value={direccion}
                onChangeText={setDireccion}
                placeholder="Calle, número, comuna"
                multiline
              />
            )}
          </Section>

          <Section title="Servicio">
            <View style={styles.segmentRow}>
              <SegmentButton
                label="Catálogo"
                selected={modoServicio === 'catalogo'}
                onPress={() => setModoServicio('catalogo')}
              />
              <SegmentButton
                label="Manual"
                selected={modoServicio === 'manual'}
                onPress={() => setModoServicio('manual')}
              />
            </View>

            {modoServicio === 'catalogo' ? (
              loadingServicios ? (
                <ActivityIndicator color={I.primary} style={styles.loader} />
              ) : serviciosCatalogo.length === 0 ? (
                <Text style={styles.helperText}>
                  No tienes servicios disponibles en catálogo. Usa modo manual o crea servicios en Mis Servicios.
                </Text>
              ) : (
                <View style={styles.catalogoList}>
                  {serviciosCatalogo.map((s) => {
                    const selected = ofertaSeleccionada === s.id;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.catalogoItem, selected && styles.catalogoItemSelected]}
                        onPress={() => toggleOferta(s.id)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.catalogoItemTitle, selected && styles.catalogoItemTitleOn]}>
                          {s.servicio_info?.nombre || 'Servicio'}
                        </Text>
                        {selected && (
                          <InstitutionalIcon name="check-circle" size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )
            ) : (
              <Field
                label="Nombre del servicio *"
                value={servicioManual}
                onChangeText={setServicioManual}
                placeholder="Ej. Cambio de aceite"
              />
            )}

            <Field
              label="Descripción (opcional)"
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="Notas adicionales del servicio"
              multiline
            />
            <Field
              label="Precio referencia (opcional)"
              value={precioReferencia}
              onChangeText={setPrecioReferencia}
              placeholder="Ej. 45000"
              keyboardType="numeric"
            />
          </Section>

          <Section title="Fecha y hora">
            <CatalogoFechaHoraPickers value={fechaHora} onChange={setFechaHora} />
            {!fechaHora.hora && (
              <Text style={styles.helperTextWarn}>Selecciona una hora para confirmar la cita.</Text>
            )}
          </Section>

          <TouchableOpacity
            style={[styles.submitBtn, guardando && styles.submitBtnDisabled]}
            onPress={handleGuardar}
            disabled={guardando}
            activeOpacity={0.88}
          >
            {guardando ? (
              <ActivityIndicator color={I.onPrimary} />
            ) : (
              <>
                <InstitutionalIcon name="calendar" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.submitBtnText}>Agendar cita</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad' | 'numeric';
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={I.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize ?? 'sentences'}
      />
    </View>
  );
}

function SegmentButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.segmentBtn, selected && styles.segmentBtnSelected]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.segmentBtnText, selected && styles.segmentBtnTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  bannerWrap: {
    marginTop: SPACING.fixed.md,
    marginBottom: SPACING.fixed.sm,
  },
  section: {
    marginTop: SPACING.fixed.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.fixed.xs,
    marginLeft: SPACING.fixed.xxs,
  },
  sectionCard: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.card.xl,
    padding: SPACING.fixed.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    ...SHADOWS.editorial,
    gap: SPACING.fixed.sm,
  },
  fieldWrap: {
    gap: SPACING.fixed.xxs,
  },
  fieldLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.body,
  },
  input: {
    backgroundColor: I.surfaceStrong,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    paddingHorizontal: SPACING.fixed.sm + 4,
    paddingVertical: SPACING.fixed.sm,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.ink,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  rowFields: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
  },
  halfField: {
    flex: 1,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: SPACING.fixed.xs,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceStrong,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    alignItems: 'center',
  },
  segmentBtnSelected: {
    backgroundColor: I.primary,
    borderColor: I.primary,
  },
  segmentBtnText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.body,
  },
  segmentBtnTextOn: {
    color: I.onPrimary,
  },
  catalogoList: {
    gap: SPACING.fixed.xs,
  },
  catalogoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.sm + 4,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceStrong,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  catalogoItemSelected: {
    backgroundColor: I.primary,
    borderColor: I.primary,
  },
  catalogoItemTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansMedium,
    color: I.ink,
  },
  catalogoItemTitleOn: {
    color: I.onPrimary,
  },
  loader: {
    paddingVertical: SPACING.fixed.md,
  },
  helperText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.sm * 1.45),
  },
  helperTextWarn: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.accentYellow,
    marginTop: SPACING.fixed.xxs,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.sm,
    backgroundColor: I.primary,
    borderRadius: BORDERS.radius.lg,
    paddingVertical: SPACING.fixed.md,
    marginTop: SPACING.fixed.lg,
    ...SHADOWS.editorial,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.sansSemiBold,
    color: I.onPrimary,
  },
});
