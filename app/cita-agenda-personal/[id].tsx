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
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Header from '@/components/Header';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS, withOpacity } from '@/app/design-system/tokens';
import {
  agendaProveedorService,
  nombreServicioCita,
  type CitaAgendaPersonal,
  type CitaAgendaPersonalCreatePayload,
} from '@/services/agendaProveedorService';
import {
  CatalogoFechaHoraPickers,
  formatDateApi,
  resolveInitialPickerValue,
  type CatalogoFechaHoraValue,
} from '@/components/solicitudes/CatalogoFechaHoraPickers';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const hx = SPACING.container.horizontal;

function estadoLabel(estado: string): string {
  switch (estado) {
    case 'activa':
      return 'Activa';
    case 'cerrada':
      return 'Completada';
    case 'cancelada':
      return 'Cancelada';
    default:
      return estado;
  }
}

function estadoColors(estado: string) {
  switch (estado) {
    case 'activa':
      return { bg: withOpacity(I.primary, 0.1), text: I.primaryActive, dot: I.primary };
    case 'cerrada':
      return { bg: withOpacity(I.semanticUp, 0.12), text: I.semanticUp, dot: I.semanticUp };
    case 'cancelada':
      return { bg: withOpacity(I.semanticDown, 0.1), text: I.semanticDown, dot: I.semanticDown };
    default:
      return { bg: I.surfaceStrong, text: I.body, dot: I.muted };
  }
}

export default function CitaAgendaPersonalDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const citaId = Number(id);

  const [cita, setCita] = useState<CitaAgendaPersonal | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [editando, setEditando] = useState(false);

  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [vehiculoMarca, setVehiculoMarca] = useState('');
  const [vehiculoModelo, setVehiculoModelo] = useState('');
  const [vehiculoPatente, setVehiculoPatente] = useState('');
  const [servicioNombre, setServicioNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precioReferencia, setPrecioReferencia] = useState('');
  const [tipoServicio, setTipoServicio] = useState<'taller' | 'domicilio'>('taller');
  const [fechaHora, setFechaHora] = useState<CatalogoFechaHoraValue>(() =>
    resolveInitialPickerValue(),
  );

  const cargarCita = useCallback(async () => {
    if (!citaId || Number.isNaN(citaId)) return;
    setLoading(true);
    const res = await agendaProveedorService.obtenerCita(citaId);
    if (res.success && res.data) {
      setCita(res.data);
      poblarFormulario(res.data);
    } else {
      Alert.alert('Error', res.message || 'No se pudo cargar la cita.');
      router.back();
    }
    setLoading(false);
  }, [citaId]);

  const poblarFormulario = (data: CitaAgendaPersonal) => {
    const det = data.detalle;
    setClienteNombre(det.cliente_nombre || '');
    setClienteTelefono(det.cliente_telefono || '');
    setDireccion(det.direccion || '');
    setVehiculoMarca(det.vehiculo_marca || '');
    setVehiculoModelo(det.vehiculo_modelo || '');
    setVehiculoPatente(det.vehiculo_patente || '');
    setServicioNombre(det.servicio_nombre || det.servicio_nombre_resuelto || '');
    setDescripcion(det.descripcion || '');
    setPrecioReferencia(
      det.precio_referencia != null ? String(det.precio_referencia) : '',
    );
    setTipoServicio(data.tipo_servicio);
    setFechaHora(
      resolveInitialPickerValue(data.fecha_servicio, data.hora_servicio),
    );
  };

  useEffect(() => {
    cargarCita();
  }, [cargarCita]);

  const esActiva = cita?.estado === 'activa';
  const esCancelada = cita?.estado === 'cancelada';

  const estadoStyle = useMemo(
    () => (cita ? estadoColors(cita.estado) : estadoColors('activa')),
    [cita],
  );

  const handleLlamar = useCallback(() => {
    const tel = cita?.detalle.cliente_telefono;
    if (tel) Linking.openURL(`tel:${tel}`);
  }, [cita]);

  const handleCerrar = useCallback(() => {
    Alert.alert('Cerrar cita', '¿Marcar esta cita como completada?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Completar',
        onPress: async () => {
          setProcesando(true);
          const res = await agendaProveedorService.cerrarCita(citaId);
          setProcesando(false);
          if (res.success) {
            await cargarCita();
            setEditando(false);
          } else {
            Alert.alert('Error', res.message || 'No se pudo cerrar la cita.');
          }
        },
      },
    ]);
  }, [citaId, cargarCita]);

  const handleCancelar = useCallback(() => {
    Alert.alert('Cancelar cita', '¿Confirmas que deseas cancelar esta cita?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          setProcesando(true);
          const res = await agendaProveedorService.cancelarCita(citaId);
          setProcesando(false);
          if (res.success) {
            await cargarCita();
            setEditando(false);
          } else {
            Alert.alert('Error', res.message || 'No se pudo cancelar la cita.');
          }
        },
      },
    ]);
  }, [citaId, cargarCita]);

  const handleEliminar = useCallback(() => {
    Alert.alert('Eliminar cita', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setProcesando(true);
          const res = await agendaProveedorService.eliminarCita(citaId);
          setProcesando(false);
          if (res.success) {
            router.back();
          } else {
            Alert.alert('Error', res.message || 'No se pudo eliminar la cita.');
          }
        },
      },
    ]);
  }, [citaId]);

  const handleGuardarEdicion = useCallback(async () => {
    if (!fechaHora.hora) {
      Alert.alert('Datos incompletos', 'Selecciona una hora para la cita.');
      return;
    }

    const detalle: CitaAgendaPersonalCreatePayload['detalle'] = {
      cliente_nombre: clienteNombre.trim(),
      cliente_telefono: clienteTelefono.trim(),
      vehiculo_marca: vehiculoMarca.trim(),
      vehiculo_modelo: vehiculoModelo.trim(),
      servicio_nombre: servicioNombre.trim(),
    };

    if (vehiculoPatente.trim()) detalle.vehiculo_patente = vehiculoPatente.trim();
    if (descripcion.trim()) detalle.descripcion = descripcion.trim();

    if (tipoServicio === 'domicilio') {
      detalle.direccion = direccion.trim();
    }

    if (precioReferencia.trim()) {
      const precio = parseFloat(precioReferencia.replace(/[^0-9.,]/g, '').replace(',', '.'));
      if (!Number.isNaN(precio)) detalle.precio_referencia = precio;
    }

    const payload: CitaAgendaPersonalCreatePayload = {
      fecha_servicio: formatDateApi(fechaHora.fecha),
      hora_servicio: `${fechaHora.hora}:00`,
      tipo_servicio: tipoServicio,
      detalle,
    };

    setProcesando(true);
    const validacion = await agendaProveedorService.validarSlot({
      ...payload,
      excluir_cita_id: citaId,
    });
    if (!validacion.success || !validacion.data?.valido) {
      setProcesando(false);
      Alert.alert(
        'Horario no disponible',
        validacion.data?.error || validacion.message || 'El horario seleccionado no está disponible.',
      );
      return;
    }

    const res = await agendaProveedorService.actualizarCita(citaId, payload);
    setProcesando(false);

    if (res.success) {
      setEditando(false);
      await cargarCita();
      Alert.alert('Guardado', 'Los cambios fueron guardados.');
    } else {
      Alert.alert('Error', res.message || 'No se pudo actualizar la cita.');
    }
  }, [
    citaId,
    clienteNombre,
    clienteTelefono,
    vehiculoMarca,
    vehiculoModelo,
    vehiculoPatente,
    servicioNombre,
    descripcion,
    precioReferencia,
    tipoServicio,
    direccion,
    fechaHora,
    cargarCita,
  ]);

  const formatearFecha = (fecha: string) =>
    new Date(fecha).toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const formatearHora = (hora: string) => hora.substring(0, 5);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <Header title="Cita personal" showBack onBackPress={() => router.back()} backgroundColor={I.canvas} titleColor={I.ink} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={I.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!cita) return null;

  const nombreServicio = nombreServicioCita(cita);
  const precio = cita.detalle.precio_referencia
    ? formatearMontoCLP(cita.detalle.precio_referencia)
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Header
        title="Cita personal"
        showBack
        onBackPress={() => router.back()}
        backgroundColor={I.canvas}
        titleColor={I.ink}
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingHorizontal: hx, paddingBottom: insets.bottom + SPACING.fixed.xl }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={[styles.origenBadge, { backgroundColor: withOpacity(I.primary, 0.12) }]}>
                <Text style={[styles.origenBadgeText, { color: I.primaryActive }]}>Personal</Text>
              </View>
              <View style={[styles.estadoBadge, { backgroundColor: estadoStyle.bg }]}>
                <View style={[styles.estadoDot, { backgroundColor: estadoStyle.dot }]} />
                <Text style={[styles.estadoText, { color: estadoStyle.text }]}>
                  {estadoLabel(cita.estado)}
                </Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>{nombreServicio}</Text>

            <View style={styles.heroMeta}>
              <InstitutionalIcon name="calendar" size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.heroMetaText}>
                {formatearFecha(cita.fecha_servicio)} · {formatearHora(cita.hora_servicio)}
              </Text>
            </View>

            <View style={styles.heroMeta}>
              <InstitutionalIcon name="build" size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.heroMetaText}>
                {cita.tipo_servicio === 'domicilio' ? 'A domicilio' : 'En taller'}
              </Text>
            </View>

            {precio ? (
              <Text style={styles.heroPrice}>{precio}</Text>
            ) : null}
          </View>

          {editando && esActiva ? (
            <>
              <EditSection title="Cliente">
                <EditField label="Nombre" value={clienteNombre} onChangeText={setClienteNombre} />
                <EditField label="Teléfono" value={clienteTelefono} onChangeText={setClienteTelefono} keyboardType="phone-pad" />
              </EditSection>
              <EditSection title="Vehículo">
                <EditField label="Marca" value={vehiculoMarca} onChangeText={setVehiculoMarca} />
                <EditField label="Modelo" value={vehiculoModelo} onChangeText={setVehiculoModelo} />
                <EditField label="Patente" value={vehiculoPatente} onChangeText={setVehiculoPatente} autoCapitalize="characters" />
              </EditSection>
              {tipoServicio === 'domicilio' && (
                <EditSection title="Dirección">
                  <EditField label="Dirección" value={direccion} onChangeText={setDireccion} multiline />
                </EditSection>
              )}
              <EditSection title="Servicio">
                <EditField label="Nombre servicio" value={servicioNombre} onChangeText={setServicioNombre} />
                <EditField label="Descripción" value={descripcion} onChangeText={setDescripcion} multiline />
                <EditField label="Precio referencia" value={precioReferencia} onChangeText={setPrecioReferencia} keyboardType="numeric" />
              </EditSection>
              <EditSection title="Fecha y hora">
                <CatalogoFechaHoraPickers value={fechaHora} onChange={setFechaHora} />
              </EditSection>
            </>
          ) : (
            <>
              <InfoSection title="Cliente">
                <InfoRow icon="person" label={cita.detalle.cliente_nombre} />
                <InfoRow icon="call" label={cita.detalle.cliente_telefono} onPress={handleLlamar} />
                {cita.detalle.direccion ? (
                  <InfoRow icon="location" label={cita.detalle.direccion} />
                ) : null}
              </InfoSection>

              <InfoSection title="Vehículo">
                <InfoRow
                  icon="car"
                  label={`${cita.detalle.vehiculo_marca} ${cita.detalle.vehiculo_modelo}${
                    cita.detalle.vehiculo_anio ? ` (${cita.detalle.vehiculo_anio})` : ''
                  }`}
                />
                {cita.detalle.vehiculo_patente ? (
                  <InfoRow icon="document" label={cita.detalle.vehiculo_patente} />
                ) : null}
              </InfoSection>

              {cita.detalle.descripcion ? (
                <InfoSection title="Notas">
                  <Text style={styles.notesText}>{cita.detalle.descripcion}</Text>
                </InfoSection>
              ) : null}
            </>
          )}

          <View style={styles.actions}>
            {esActiva && !editando && (
              <>
                <ActionButton label="Editar" icon="create" variant="secondary" onPress={() => setEditando(true)} disabled={procesando} />
                <ActionButton label="Completar" icon="check-circle" variant="success" onPress={handleCerrar} disabled={procesando} />
                <ActionButton label="Cancelar cita" icon="close-circle" variant="danger" onPress={handleCancelar} disabled={procesando} />
              </>
            )}

            {esActiva && editando && (
              <>
                <ActionButton label="Guardar cambios" icon="save" variant="primary" onPress={handleGuardarEdicion} disabled={procesando} />
                <ActionButton
                  label="Descartar"
                  icon="close"
                  variant="secondary"
                  onPress={() => {
                    poblarFormulario(cita);
                    setEditando(false);
                  }}
                  disabled={procesando}
                />
              </>
            )}

            {esCancelada && (
              <ActionButton label="Eliminar" icon="trash" variant="danger" onPress={handleEliminar} disabled={procesando} />
            )}
          </View>

          {procesando && (
            <ActivityIndicator color={I.primary} style={styles.processing} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.infoSection}>
      <Text style={styles.infoSectionTitle}>{title}</Text>
      <View style={styles.infoCard}>{children}</View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.infoRow}>
      <InstitutionalIcon name={icon} size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
      <Text style={[styles.infoRowText, onPress && styles.infoRowLink]}>{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

function EditSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.infoSection}>
      <Text style={styles.infoSectionTitle}>{title}</Text>
      <View style={styles.infoCard}>{children}</View>
    </View>
  );
}

function EditField({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad' | 'numeric';
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={styles.editField}>
      <Text style={styles.editLabel}>{label}</Text>
      <TextInput
        style={[styles.editInput, multiline && styles.editInputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={I.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize ?? 'sentences'}
      />
    </View>
  );
}

function ActionButton({
  label,
  icon,
  variant,
  onPress,
  disabled,
}: {
  label: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'success' | 'danger';
  onPress: () => void;
  disabled?: boolean;
}) {
  const variantStyle = {
    primary: { bg: I.primary, text: I.onPrimary, border: I.primary },
    secondary: { bg: I.canvas, text: I.ink, border: I.hairline },
    success: { bg: I.semanticUp, text: I.onPrimary, border: I.semanticUp },
    danger: { bg: withOpacity(I.semanticDown, 0.1), text: I.semanticDown, border: withOpacity(I.semanticDown, 0.25) },
  }[variant];

  return (
    <TouchableOpacity
      style={[
        styles.actionBtn,
        { backgroundColor: variantStyle.bg, borderColor: variantStyle.border },
        disabled && styles.actionBtnDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <InstitutionalIcon name={icon} size={18} color={variantStyle.text} strokeWidth={ICON_STROKE_WIDTH} />
      <Text style={[styles.actionBtnText, { color: variantStyle.text }]}>{label}</Text>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    marginTop: SPACING.fixed.md,
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.card.xl,
    padding: SPACING.fixed.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    ...SHADOWS.editorial,
    gap: SPACING.fixed.sm,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
  },
  origenBadge: {
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xxs,
    borderRadius: BORDERS.radius.pill,
  },
  origenBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xxs,
    borderRadius: BORDERS.radius.pill,
  },
  estadoDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  estadoText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
  },
  heroTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.xl * 1.25),
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
  },
  heroMetaText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.body,
    flex: 1,
    textTransform: 'capitalize',
  },
  heroPrice: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontFamily: FF.monoMedium,
    color: I.ink,
    marginTop: SPACING.fixed.xxs,
  },
  infoSection: {
    marginTop: SPACING.fixed.md,
  },
  infoSectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.fixed.xxs,
    marginLeft: SPACING.fixed.xxs,
  },
  infoCard: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.card.xl,
    padding: SPACING.fixed.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    ...SHADOWS.editorial,
    gap: SPACING.fixed.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  infoRowText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.ink,
  },
  infoRowLink: {
    color: I.primaryActive,
    fontFamily: FF.sansMedium,
  },
  notesText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.body,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.base * 1.45),
  },
  editField: {
    gap: SPACING.fixed.xxs,
  },
  editLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.body,
  },
  editInput: {
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
  editInputMulti: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  actions: {
    marginTop: SPACING.fixed.lg,
    gap: SPACING.fixed.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.sm + 4,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
  },
  processing: {
    marginTop: SPACING.fixed.md,
  },
});
