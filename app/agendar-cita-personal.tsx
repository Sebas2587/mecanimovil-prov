import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Header from '@/components/Header';
import { EstadoBanner } from '@/components/solicitudes/EstadoBanner';
import { InstitutionalField } from '@/components/forms/InstitutionalField';
import { MontoCLPField, parsePrecioReferencia } from '@/components/forms/MontoCLPField';
import { ChilePhoneField, getChilePhoneError } from '@/components/forms/ChilePhoneField';
import ChileAddressField from '@/components/forms/ChileAddressField';
import type { ChileFormattedAddress } from '@/utils/chileAddressSearch';
import { extraerNueveDigitosDesdeGuardado, normalizarTelefonoChileParaGuardar } from '@/utils/chilePhone';
import { esRangoHorarioValido, calcularDuracionMinutos } from '@/utils/citaPersonalHorario';
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
import equipoTallerService, { type MiembroTaller } from '@/services/equipoTallerService';
import { useAuth } from '@/context/AuthContext';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const hx = SPACING.container.horizontal;

type ModoServicio = 'catalogo' | 'manual';

export default function AgendarCitaPersonalScreen() {
  const insets = useSafeAreaInsets();
  const { estadoProveedor } = useAuth();
  const { fecha: fechaParam } = useLocalSearchParams<{ fecha?: string }>();

  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [direccionValidada, setDireccionValidada] = useState<ChileFormattedAddress | null>(null);
  const [vehiculoMarca, setVehiculoMarca] = useState('');
  const [vehiculoModelo, setVehiculoModelo] = useState('');
  const [vehiculoPatente, setVehiculoPatente] = useState('');
  const [vehiculoAnio, setVehiculoAnio] = useState('');
  const [modoServicio, setModoServicio] = useState<ModoServicio>('catalogo');
  const [servicioManual, setServicioManual] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precioReferencia, setPrecioReferencia] = useState('');
  const [tipoServicio, setTipoServicio] = useState<'taller' | 'domicilio'>('taller');
  const [mecanicos, setMecanicos] = useState<MiembroTaller[]>([]);
  const [miembroSeleccionado, setMiembroSeleccionado] = useState<number | null>(null);
  const [fechaHora, setFechaHora] = useState<CatalogoFechaHoraValue>(() =>
    resolveInitialPickerValue(typeof fechaParam === 'string' ? fechaParam : undefined),
  );

  useEffect(() => {
    if (typeof fechaParam === 'string' && fechaParam.trim()) {
      setFechaHora(resolveInitialPickerValue(fechaParam));
    }
  }, [fechaParam]);

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
    equipoTallerService
      .listar({ rol: 'mecanico' })
      .then((equipo) => {
        if (mounted) setMecanicos(equipo);
      })
      .catch(() => {
        if (mounted) setMecanicos([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

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
    const telError = getChilePhoneError(extraerNueveDigitosDesdeGuardado(clienteTelefono), true);
    if (telError) return telError;
    if (!vehiculoMarca.trim()) return 'Ingresa la marca del vehículo.';
    if (!vehiculoModelo.trim()) return 'Ingresa el modelo del vehículo.';
    if (tipoServicio === 'domicilio') {
      if (!direccion.trim()) return 'Ingresa la dirección para servicio a domicilio.';
      if (!direccionValidada) return 'Selecciona una dirección válida de la lista de sugerencias.';
    }
    if (modoServicio === 'catalogo' && !ofertaSeleccionada) {
      return 'Selecciona un servicio de tu catálogo.';
    }
    if (modoServicio === 'manual' && !servicioManual.trim()) {
      return 'Ingresa el nombre del servicio.';
    }
    if (!fechaHora.hora || !fechaHora.horaFin) {
      return 'Selecciona hora de inicio y término para la cita.';
    }
    if (!esRangoHorarioValido(fechaHora.hora, fechaHora.horaFin)) {
      return 'La hora de término debe ser al menos 15 minutos después del inicio.';
    }
    return null;
  }, [
    clienteNombre,
    clienteTelefono,
    vehiculoMarca,
    vehiculoModelo,
    tipoServicio,
    direccion,
    direccionValidada,
    modoServicio,
    ofertaSeleccionada,
    servicioManual,
    fechaHora,
  ]);

  const construirPayload = useCallback((): CitaAgendaPersonalCreatePayload => {
    const detalle: CitaAgendaPersonalCreatePayload['detalle'] = {
      cliente_nombre: clienteNombre.trim(),
      cliente_telefono: normalizarTelefonoChileParaGuardar(clienteTelefono),
      vehiculo_marca: vehiculoMarca.trim(),
      vehiculo_modelo: vehiculoModelo.trim(),
    };

    if (vehiculoPatente.trim()) detalle.vehiculo_patente = vehiculoPatente.trim();

    if (vehiculoAnio.trim()) {
      const anio = parseInt(vehiculoAnio.trim(), 10);
      if (!Number.isNaN(anio)) detalle.vehiculo_anio = anio;
    }

    if (tipoServicio === 'domicilio') {
      detalle.direccion = (direccionValidada?.line ?? direccion).trim();
    }

    if (modoServicio === 'catalogo' && ofertaSeleccionada) {
      detalle.oferta_servicio_id = ofertaSeleccionada;
    } else {
      detalle.servicio_nombre = servicioManual.trim();
    }

    if (descripcion.trim()) detalle.descripcion = descripcion.trim();

    if (precioReferencia.trim()) {
      const precio = parsePrecioReferencia(precioReferencia);
      if (precio != null) detalle.precio_referencia = precio;
    }

    return {
      fecha_servicio: formatDateApi(fechaHora.fecha),
      hora_servicio: `${fechaHora.hora}:00`,
      duracion_minutos: calcularDuracionMinutos(fechaHora.hora!, fechaHora.horaFin!),
      tipo_servicio: tipoServicio,
      miembro_taller: miembroSeleccionado,
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
    direccionValidada,
    modoServicio,
    ofertaSeleccionada,
    servicioManual,
    descripcion,
    precioReferencia,
    fechaHora,
    miembroSeleccionado,
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
      const fechaGuardada = formatDateApi(fechaHora.fecha);
      Alert.alert('Cita agendada', 'La cita personal fue creada correctamente.', [
        {
          text: 'Ver calendario',
          onPress: () =>
            router.replace({
              pathname: '/(tabs)/calendario',
              params: { fecha: fechaGuardada },
            }),
        },
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
            <InstitutionalField
              label="Nombre *"
              value={clienteNombre}
              onChangeText={setClienteNombre}
              placeholder="Nombre completo"
            />
            <ChilePhoneField value={clienteTelefono} onChangeValue={setClienteTelefono} />
          </Section>

          <Section title="Vehículo">
            <InstitutionalField label="Marca *" value={vehiculoMarca} onChangeText={setVehiculoMarca} placeholder="Toyota" />
            <InstitutionalField label="Modelo *" value={vehiculoModelo} onChangeText={setVehiculoModelo} placeholder="Corolla" />
            <View style={styles.rowFields}>
              <View style={styles.halfField}>
                <InstitutionalField
                  label="Patente"
                  value={vehiculoPatente}
                  onChangeText={setVehiculoPatente}
                  placeholder="AA1234"
                  autoCapitalize="characters"
                />
              </View>
              <View style={styles.halfField}>
                <InstitutionalField
                  label="Año"
                  value={vehiculoAnio}
                  onChangeText={setVehiculoAnio}
                  placeholder="2020"
                  keyboardType="number-pad"
                />
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
              <ChileAddressField
                label="Dirección del servicio *"
                hint="Busca una dirección real en Chile. Escribe al menos 4 caracteres y elige un resultado."
                value={direccion}
                validated={direccionValidada}
                onChangeText={setDireccion}
                onValidatedChange={setDireccionValidada}
                placeholder="Ej: Av. Providencia 1200, Providencia"
              />
            )}
          </Section>

          {mecanicos.length > 0 && (
            <Section title="Mecánico asignado">
              <Text style={styles.helperText}>
                Déjalo en automático para que el sistema asigne al mejor mecánico disponible, o elige uno específico.
              </Text>
              <View style={styles.catalogoList}>
                <TouchableOpacity
                  style={[styles.catalogoItem, miembroSeleccionado === null && styles.catalogoItemSelected]}
                  onPress={() => setMiembroSeleccionado(null)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.catalogoItemTitle, miembroSeleccionado === null && styles.catalogoItemTitleOn]}>
                    Automático
                  </Text>
                  {miembroSeleccionado === null && (
                    <InstitutionalIcon name="check-circle" size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                  )}
                </TouchableOpacity>
                {mecanicos.map((m) => {
                  const selected = miembroSeleccionado === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.catalogoItem, selected && styles.catalogoItemSelected]}
                      onPress={() => setMiembroSeleccionado(m.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.catalogoItemTitle, selected && styles.catalogoItemTitleOn]}>{m.nombre}</Text>
                      {selected && (
                        <InstitutionalIcon name="check-circle" size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Section>
          )}

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
              <InstitutionalField
                label="Nombre del servicio *"
                value={servicioManual}
                onChangeText={setServicioManual}
                placeholder="Ej. Cambio de aceite"
              />
            )}

            <InstitutionalField
              label="Descripción (opcional)"
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="Notas adicionales del servicio"
              multiline
            />
            <MontoCLPField value={precioReferencia} onChangeValue={setPrecioReferencia} />
          </Section>

          <Section title="Fecha y hora">
            <CatalogoFechaHoraPickers value={fechaHora} onChange={setFechaHora} modo="rango" />
            {(!fechaHora.hora || !fechaHora.horaFin) && (
              <Text style={styles.helperTextWarn}>Selecciona hora de inicio y término para confirmar la cita.</Text>
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
    gap: SPACING.fixed.md,
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
    backgroundColor: I.canvas,
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
    backgroundColor: I.canvas,
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
