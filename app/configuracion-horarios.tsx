import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { Stack, router } from 'expo-router';
import { horariosAPI, type HorarioProveedor, type ConfiguracionSemanal } from '@/services/api';
import { navigateBack } from '@/utils/navigateBack';
import {
  normalizarActivo,
  parseHorariosApiResponse,
  proveedorTieneHorariosActivos,
  normalizarEstadoAgendaApi,
  type EstadoAgendaProveedor,
} from '@/utils/horariosProveedor';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS, withOpacity } from '@/app/design-system/tokens';
import Header from '@/components/Header';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import equipoTallerService, { type MiembroTaller } from '@/services/equipoTallerService';
import { showAlert, showConfirm } from '@/utils/platformAlert';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;
const hx = SPACING.container.horizontal;
const lh = (fontSize: number, lineHeightMult: number) => Math.round(fontSize * lineHeightMult);

/** Bottom sheets de hora / número (misma piel que el resto de la app) */
const pickerModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: withOpacity(I.surfaceDark, 0.45),
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: I.canvas,
    borderTopLeftRadius: BORDERS.radius.xl,
    borderTopRightRadius: BORDERS.radius.xl,
    maxHeight: '75%',
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: hx,
    paddingTop: SPACING.fixed.md,
    paddingBottom: SPACING.fixed.sm,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: I.hairline,
    backgroundColor: I.canvas,
  },
  sheetTitle: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    letterSpacing: TS.h4.letterSpacing,
    color: I.ink,
    flex: 1,
    marginRight: SPACING.fixed.sm,
  },
  sheetClose: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetScroll: {
    maxHeight: 400,
    backgroundColor: I.surfaceSoft,
  },
  sheetScrollContent: {
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: hx,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.fixed.sm + 4,
    paddingHorizontal: SPACING.fixed.md,
    marginVertical: 2,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.canvas,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  optionRowSelected: {
    backgroundColor: I.primary,
    borderColor: I.primary,
  },
  optionText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.monoMedium,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.numberDisplay.lineHeight),
    color: I.ink,
  },
  optionTextSelected: {
    fontFamily: FF.monoMedium,
    color: I.onPrimary,
  },
  /** Valor mostrado en el campo (hora / minutos) — tabular mono (DESIGN_PROVEEDORES_INSTITUCIONAL) */
  fieldTriggerValue: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.monoMedium,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.numberDisplay.lineHeight),
    color: I.ink,
    flex: 1,
    marginHorizontal: SPACING.fixed.md,
    textAlign: 'left',
    minWidth: 60,
  },
  fieldTriggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.sm + 2,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    ...SHADOWS.editorial,
  },
});

interface HorarioDia extends HorarioProveedor {
  editado?: boolean;
}

interface ModalEditarDia {
  visible: boolean;
  diaIndex: number;
  horario: HorarioDia | null;
}

// TimePicker — tokens institucionales (sin useTheme)
const TimePicker = ({
  value,
  onTimeChange,
  label: _label,
  primaryColor = I.primary,
}: {
  value: string;
  onTimeChange: (time: string) => void;
  label: string;
  primaryColor?: string;
}) => {
  const insets = useSafeAreaInsets();
  const [showModal, setShowModal] = useState(false);

  // Generar opciones de hora cada 15 minutos (00, 15, 30, 45)
  const generarOpcionesHora = (): string[] => {
    const opciones: string[] = [];
    for (let hora = 0; hora < 24; hora++) {
      for (let minuto = 0; minuto < 60; minuto += 15) {
        const horaStr = hora.toString().padStart(2, '0');
        const minutoStr = minuto.toString().padStart(2, '0');
        opciones.push(`${horaStr}:${minutoStr}`);
      }
    }
    return opciones;
  };

  const opcionesHora = generarOpcionesHora();

  const formatDisplayTime = (time: string) => {
    if (!time || time.trim() === '') {
      return '08:00';
    }

    try {
      const parts = time.split(':');
      if (parts.length !== 2) {
        return '08:00';
      }

      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);

      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return '08:00';
      }

      const hoursStr = hours.toString().padStart(2, '0');
      const minutesStr = minutes.toString().padStart(2, '0');

      return `${hoursStr}:${minutesStr}`;
    } catch (error) {
      return '08:00';
    }
  };

  const horaActual = formatDisplayTime(value || '08:00');

  return (
    <View style={{ marginBottom: SPACING.fixed.md }}>
      <TouchableOpacity
        style={pickerModalStyles.fieldTriggerRow}
        onPress={() => setShowModal(true)}
        activeOpacity={0.88}
      >
        <InstitutionalIcon name="time" size={20} color={primaryColor} />
        <Text style={pickerModalStyles.fieldTriggerValue} numberOfLines={1}>
          {horaActual}
        </Text>
        <InstitutionalIcon name="chevron-down" size={20} color={I.muted} />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <TouchableOpacity style={pickerModalStyles.overlay} activeOpacity={1} onPress={() => setShowModal(false)}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[pickerModalStyles.sheet, { paddingBottom: Math.max(insets.bottom, SPACING.fixed.md) }]}
          >
            <View style={pickerModalStyles.sheetHeader}>
              <Text style={pickerModalStyles.sheetTitle}>Seleccionar hora</Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={pickerModalStyles.sheetClose}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <InstitutionalIcon name="close" size={22} color={I.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={pickerModalStyles.sheetScroll}
              contentContainerStyle={pickerModalStyles.sheetScrollContent}
              showsVerticalScrollIndicator
            >
              {opcionesHora.map((opcion) => {
                const estaSeleccionada = opcion === horaActual;
                return (
                  <TouchableOpacity
                    key={opcion}
                    style={[pickerModalStyles.optionRow, estaSeleccionada && pickerModalStyles.optionRowSelected]}
                    onPress={() => {
                      onTimeChange(opcion);
                      setShowModal(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        pickerModalStyles.optionText,
                        estaSeleccionada && pickerModalStyles.optionTextSelected,
                      ]}
                    >
                      {opcion}
                    </Text>
                    {estaSeleccionada ? (
                      <InstitutionalIcon name="checkmark-circle" size={18} color={I.onPrimary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const NumberPicker = ({
  value,
  onValueChange,
  label,
  unit,
  options,
  primaryColor = I.primary,
}: {
  value: number;
  onValueChange: (value: number) => void;
  label: string;
  unit: string;
  options: number[];
  primaryColor?: string;
}) => {
  const insets = useSafeAreaInsets();
  const [showModal, setShowModal] = useState(false);

  return (
    <View style={{ marginBottom: SPACING.fixed.md }}>
      <TouchableOpacity
        style={pickerModalStyles.fieldTriggerRow}
        onPress={() => setShowModal(true)}
        activeOpacity={0.88}
      >
        <InstitutionalIcon name="timer" size={20} color={primaryColor} />
        <Text style={pickerModalStyles.fieldTriggerValue} numberOfLines={1}>
          {value} {unit}
        </Text>
        <InstitutionalIcon name="chevron-down" size={20} color={I.muted} />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <TouchableOpacity style={pickerModalStyles.overlay} activeOpacity={1} onPress={() => setShowModal(false)}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[pickerModalStyles.sheet, { paddingBottom: Math.max(insets.bottom, SPACING.fixed.md) }]}
          >
            <View style={pickerModalStyles.sheetHeader}>
              <Text style={pickerModalStyles.sheetTitle}>{label}</Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={pickerModalStyles.sheetClose}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <InstitutionalIcon name="close" size={22} color={I.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={pickerModalStyles.sheetScroll}
              contentContainerStyle={pickerModalStyles.sheetScrollContent}
              showsVerticalScrollIndicator
            >
              {options.map((option) => {
                const estaSeleccionada = option === value;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[pickerModalStyles.optionRow, estaSeleccionada && pickerModalStyles.optionRowSelected]}
                    onPress={() => {
                      onValueChange(option);
                      setShowModal(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        pickerModalStyles.optionText,
                        estaSeleccionada && pickerModalStyles.optionTextSelected,
                      ]}
                    >
                      {option} {unit}
                    </Text>
                    {estaSeleccionada ? (
                      <InstitutionalIcon name="checkmark-circle" size={18} color={I.onPrimary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default function ConfiguracionHorariosScreen() {
  const { estadoProveedor } = useAuth();
  const insets = useSafeAreaInsets();

  // Estados principales
  const [horarios, setHorarios] = useState<HorarioDia[]>([]);
  // Agenda por mecánico: null => horario general del taller (fallback)
  const [mecanicos, setMecanicos] = useState<MiembroTaller[]>([]);
  const [miembroSeleccionado, setMiembroSeleccionado] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  /** Sin registros en BD para la agenda seleccionada (general o mecánico). */
  const [sinHorariosEnServidor, setSinHorariosEnServidor] = useState(false);
  /** Resumen global: horario general del taller + mecánicos con agenda propia. */
  const [estadoAgenda, setEstadoAgenda] = useState<EstadoAgendaProveedor | null>(null);

  // Estados para modal de edición
  const [modalEditarDia, setModalEditarDia] = useState<ModalEditarDia>({
    visible: false,
    diaIndex: -1,
    horario: null,
  });
  const [horariosTemp, setHorariosTemp] = useState({
    hora_inicio: '',
    hora_fin: '',
    duracion_slot: 60,
    tiempo_descanso: 0,
  });

  const diasSemana = [
    { id: 0, nombre: 'Lunes', corto: 'Lun' },
    { id: 1, nombre: 'Martes', corto: 'Mar' },
    { id: 2, nombre: 'Miércoles', corto: 'Mié' },
    { id: 3, nombre: 'Jueves', corto: 'Jue' },
    { id: 4, nombre: 'Viernes', corto: 'Vie' },
    { id: 5, nombre: 'Sábado', corto: 'Sáb' },
    { id: 6, nombre: 'Domingo', corto: 'Dom' },
  ];

  const horariosPreset = {
    comercial: {
      hora_inicio: '08:00',
      hora_fin: '18:00',
      dias: [0, 1, 2, 3, 4], // Lunes a Viernes
      duracion_slot: 60,
      tiempo_descanso: 0,
    },
    extendido: {
      hora_inicio: '07:00',
      hora_fin: '19:00',
      dias: [0, 1, 2, 3, 4, 5], // Lunes a Sábado
      duracion_slot: 60,
      tiempo_descanso: 0,
    },
    completo: {
      hora_inicio: '08:00',
      hora_fin: '17:00',
      dias: [0, 1, 2, 3, 4, 5, 6], // Todos los días
      duracion_slot: 60,
      tiempo_descanso: 0,
    },
  };

  useEffect(() => {
    if (estadoProveedor?.estado_verificacion !== 'aprobado') {
      Alert.alert(
        'Acceso Restringido',
        'Solo los proveedores con cuenta aprobada pueden configurar sus horarios.',
        [{ text: 'Entendido', onPress: () => navigateBack('/(tabs)') }]
      );
      return;
    }

    cargarHorarios();
    cargarMecanicos();
    cargarEstadoAgenda();
  }, [estadoProveedor]);

  const cargarEstadoAgenda = async () => {
    try {
      const estado = await horariosAPI.obtenerEstadoConfiguracion();
      setEstadoAgenda(normalizarEstadoAgendaApi(estado));
    } catch {
      setEstadoAgenda(null);
    }
  };

  // Recargar la agenda al cambiar de mecánico (o volver al horario general)
  useEffect(() => {
    if (estadoProveedor?.estado_verificacion === 'aprobado') {
      cargarHorarios();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [miembroSeleccionado]);

  const cargarMecanicos = async () => {
    try {
      const equipo = await equipoTallerService.listar({ rol: 'mecanico' });
      setMecanicos(equipo);
    } catch (error) {
      // El proveedor puede no ser taller o no tener equipo: silencioso
      setMecanicos([]);
    }
  };

  const formatearHoraApi = (hora: string | undefined, fallback: string): string => {
    if (!hora) return fallback;
    const s = String(hora).trim();
    if (s.includes(':') && s.split(':').length >= 2) {
      const [h, m] = s.split(':');
      return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    }
    return fallback;
  };

  const cargarHorarios = async () => {
    try {
      setLoading(true);
      const raw = await horariosAPI.obtenerMisHorarios(miembroSeleccionado);
      const horariosData = parseHorariosApiResponse(raw);
      const necesitaConfigurar = !proveedorTieneHorariosActivos(horariosData);
      setSinHorariosEnServidor(necesitaConfigurar);

      const horariosCompletos: HorarioDia[] = diasSemana.map((dia) => {
        const horarioExistente = horariosData.find((h) => h.dia_semana === dia.id);
        if (!horarioExistente) {
          return {
            dia_semana: dia.id,
            dia_nombre: dia.nombre,
            activo: false,
            hora_inicio: '08:00',
            hora_fin: '18:00',
            duracion_slot: 60,
            tiempo_descanso: 0,
            editado: false,
          };
        }
        return {
          ...horarioExistente,
          dia_nombre: dia.nombre,
          activo: normalizarActivo(horarioExistente.activo),
          hora_inicio: formatearHoraApi(horarioExistente.hora_inicio, '08:00'),
          hora_fin: formatearHoraApi(horarioExistente.hora_fin, '18:00'),
          duracion_slot: horarioExistente.duracion_slot ?? 60,
          tiempo_descanso: horarioExistente.tiempo_descanso ?? 0,
          editado: false,
        };
      });
      setHorarios(horariosCompletos);
    } catch (error) {
      console.error('Error cargando horarios:', error);
      showAlert('Error', 'No se pudieron cargar los horarios configurados.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarHorarios();
    cargarEstadoAgenda();
  };


  const toggleDiaActivo = (diaIndex: number) => {
    const nuevosHorarios = [...horarios];
    nuevosHorarios[diaIndex] = {
      ...nuevosHorarios[diaIndex],
      activo: !normalizarActivo(nuevosHorarios[diaIndex].activo),
      editado: true,
    };
    setHorarios(nuevosHorarios);
    setHasChanges(true);
  };

  const abrirModalEditarDia = (diaIndex: number) => {
    const horario = horarios[diaIndex];
    // Asegurar que las horas tengan formato válido
    const horaInicio = horario.hora_inicio && horario.hora_inicio.trim() !== ''
      ? horario.hora_inicio
      : '08:00';
    const horaFin = horario.hora_fin && horario.hora_fin.trim() !== ''
      ? horario.hora_fin
      : '18:00';

    setHorariosTemp({
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      duracion_slot: horario.duracion_slot || 60,
      tiempo_descanso: horario.tiempo_descanso || 0,
    });
    setModalEditarDia({
      visible: true,
      diaIndex,
      horario,
    });
  };

  const cerrarModalEditarDia = () => {
    setModalEditarDia({
      visible: false,
      diaIndex: -1,
      horario: null,
    });
  };

  const guardarCambiosDia = () => {
    if (modalEditarDia.diaIndex === -1) return;

    // Validar horarios
    if (horariosTemp.hora_inicio >= horariosTemp.hora_fin) {
      showAlert('Error', 'La hora de inicio debe ser menor que la hora de fin.');
      return;
    }

    const nuevosHorarios = [...horarios];
    nuevosHorarios[modalEditarDia.diaIndex] = {
      ...nuevosHorarios[modalEditarDia.diaIndex],
      hora_inicio: horariosTemp.hora_inicio,
      hora_fin: horariosTemp.hora_fin,
      duracion_slot: horariosTemp.duracion_slot,
      tiempo_descanso: horariosTemp.tiempo_descanso,
      editado: true,
    };

    setHorarios(nuevosHorarios);
    setHasChanges(true);
    cerrarModalEditarDia();
  };

  const construirConfiguracionSemanal = (lista: HorarioDia[]): ConfiguracionSemanal | null => {
    const diasActivos = lista.filter((h) => h.activo);
    if (diasActivos.length === 0) return null;

    const configuracion: ConfiguracionSemanal = {
      hora_inicio_global: lista[0]?.hora_inicio || '08:00',
      hora_fin_global: lista[0]?.hora_fin || '18:00',
      duracion_slot_global: lista[0]?.duracion_slot || 60,
      tiempo_descanso_global: lista[0]?.tiempo_descanso || 0,
      dias_habilitados: diasActivos.map((h) => h.dia_semana),
      eliminar_existente: true,
    };

    const configuracionPorDia: { [key: string]: {
      hora_inicio: string;
      hora_fin: string;
      duracion_slot: number;
      tiempo_descanso: number;
    } } = {};
    diasActivos.forEach((horario) => {
      configuracionPorDia[horario.dia_semana.toString()] = {
        hora_inicio: horario.hora_inicio,
        hora_fin: horario.hora_fin,
        duracion_slot: horario.duracion_slot,
        tiempo_descanso: horario.tiempo_descanso,
      };
    });
    configuracion.configuracion_por_dia = configuracionPorDia;
    return configuracion;
  };

  const persistirHorarios = async (lista: HorarioDia[]): Promise<boolean> => {
    const configuracion = construirConfiguracionSemanal(lista);
    if (!configuracion) {
      showAlert(
        'Selecciona al menos un día',
        'Activa los días en que atiendes y define el horario de cada uno antes de guardar.',
      );
      return false;
    }

    try {
      setSaving(true);
      const resultado = await horariosAPI.configurarSemanaCompleta(configuracion, miembroSeleccionado);
      setHorarios(lista);
      setHasChanges(false);
      setSinHorariosEnServidor(false);
      showAlert(
        'Horarios guardados',
        `Tus horarios han sido actualizados correctamente. ${resultado.dias_activos} días activos configurados.`,
      );
      await cargarHorarios();
      await cargarEstadoAgenda();
      return true;
    } catch (error: unknown) {
      console.error('Error guardando horarios:', error);
      const err = error as { response?: { data?: { error?: string } } };
      showAlert(
        'Error',
        err.response?.data?.error || 'No se pudieron guardar los horarios. Intenta nuevamente.',
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const presetLabels: Record<keyof typeof horariosPreset, string> = {
    comercial: 'Comercial',
    extendido: 'Extendido',
    completo: '7 días',
  };

  const aplicarPreset = (presetName: keyof typeof horariosPreset) => {
    const preset = horariosPreset[presetName];
    const ambito =
      miembroSeleccionado === null
        ? 'taller (general)'
        : mecanicos.find((m) => m.id === miembroSeleccionado)?.nombre || 'este mecánico';

    showConfirm(
      'Aplicar configuración rápida',
      `¿Aplicar "${presetLabels[presetName]}" en la agenda de ${ambito}? Se guardará de inmediato y reemplazará la configuración actual de esa agenda.`,
      {
        confirmText: 'Aplicar y guardar',
        onConfirm: async () => {
          const nuevosHorarios = horarios.map((horario) => ({
            ...horario,
            activo: preset.dias.includes(horario.dia_semana),
            hora_inicio: preset.hora_inicio,
            hora_fin: preset.hora_fin,
            duracion_slot: preset.duracion_slot,
            tiempo_descanso: preset.tiempo_descanso,
            editado: true,
          }));
          await persistirHorarios(nuevosHorarios);
        },
      },
    );
  };

  const formatearHora = (hora: string) => {
    try {
      return new Date(`2023-01-01T${hora}`).toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return hora;
    }
  };

  const guardarCambios = async () => {
    await persistirHorarios(horarios);
  };

  const renderDiaConfig = (horario: HorarioDia, index: number) => {
    const dia = diasSemana[index];
    const diaActivo = normalizarActivo(horario.activo);

    return (
      <View
        key={dia.id}
        style={[styles.modernDiaCard, diaActivo && styles.modernDiaCardActive]}
      >
        <View style={styles.modernDiaHeader}>
          <View style={styles.modernDiaInfo}>
            <View style={[styles.modernDiaIconContainer, diaActivo ? styles.modernDiaIconOn : styles.modernDiaIconOff]}>
              <InstitutionalIcon name="event" size={16} color={diaActivo ? I.onPrimary : I.body} />
            </View>
            <View style={styles.modernDiaTexto}>
              <Text style={[styles.modernDiaNombre, diaActivo && styles.modernDiaNombreActive]}>{dia.corto}</Text>
            </View>
          </View>

          <View style={styles.modernSwitchContainer}>
            <Switch
              value={diaActivo}
              onValueChange={() => toggleDiaActivo(index)}
              trackColor={{ false: I.hairline, true: I.primary }}
              thumbColor={I.canvas}
              style={styles.modernSwitch}
            />
          </View>
        </View>

        {!diaActivo ? (
          <View style={styles.modernDiaInactiveBanner}>
            <Text style={styles.modernDiaInactiveLabel}>Día deshabilitado</Text>
            <Text style={styles.modernDiaInactiveHint}>Activa el interruptor para configurar el horario</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.modernHorariosConfig}
            onPress={() => abrirModalEditarDia(index)}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={`Editar horario del ${dia.nombre}`}
          >
            <View style={styles.modernTiemposContainer}>
              <View style={styles.modernTiempoCard}>
                <InstitutionalIcon name="play" size={14} color={I.semanticUp} />
                <Text style={styles.modernTiempoValue}>{formatearHora(horario.hora_inicio)}</Text>
              </View>

              <InstitutionalIcon name="arrow-forward" size={12} color={I.muted} />

              <View style={styles.modernTiempoCard}>
                <InstitutionalIcon name="stop" size={14} color={I.semanticDown} />
                <Text style={styles.modernTiempoValue}>{formatearHora(horario.hora_fin)}</Text>
              </View>
            </View>

            <View style={styles.modernConfigSlots}>
              <Text style={styles.modernSlotInfo}>
                {horario.duracion_slot} min
                {horario.tiempo_descanso > 0 && ` • ${horario.tiempo_descanso} min desc`}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderModalEditarDia = () => (
    <Modal visible={modalEditarDia.visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modernModalContainer} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.modernModalHeader}>
          <View style={styles.modernModalHeaderSlot}>
            <TouchableOpacity
              onPress={cerrarModalEditarDia}
              style={styles.modernModalClosePill}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Cerrar sin guardar"
            >
              <InstitutionalIcon name="close" size={22} color={I.ink} />
            </TouchableOpacity>
          </View>
          <View style={styles.modernModalHeaderCenter}>
            <Text style={styles.modernModalTitle} numberOfLines={2}>
              {modalEditarDia.horario?.dia_nombre || 'Día'}
            </Text>
            <Text style={styles.modernModalSubtitle}>Ajusta horario y citas para este día</Text>
          </View>
          <View style={[styles.modernModalHeaderSlot, styles.modernModalHeaderSlotEnd]}>
            <TouchableOpacity
              onPress={guardarCambiosDia}
              style={styles.modernModalSavePill}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Guardar cambios del día"
            >
              <Text style={styles.modernModalSavePillText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.modernModalScroll}
          contentContainerStyle={[
            styles.modernModalScrollContent,
            { paddingBottom: insets.bottom + SPACING.fixed['2xl'] },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.modernModalSection}>
            <Text style={styles.modernModalSectionTitle}>Horarios de atención</Text>
            <View style={styles.modernModalRow}>
              <View style={styles.modernModalCol}>
                <Text style={styles.modernModalLabel}>Hora de inicio</Text>
                <TimePicker
                  value={horariosTemp.hora_inicio || '08:00'}
                  onTimeChange={(time) => {
                    setHorariosTemp((prev) => ({ ...prev, hora_inicio: time }));
                  }}
                  label="Hora de inicio"
                />
              </View>
              <View style={styles.modernModalCol}>
                <Text style={styles.modernModalLabel}>Hora de fin</Text>
                <TimePicker
                  value={horariosTemp.hora_fin || '18:00'}
                  onTimeChange={(time) => {
                    setHorariosTemp((prev) => ({ ...prev, hora_fin: time }));
                  }}
                  label="Hora de fin"
                />
              </View>
            </View>
          </View>

          <View style={styles.modernModalSection}>
            <Text style={styles.modernModalSectionTitle}>Configuración de citas</Text>
            <View style={styles.modernModalRow}>
              <View style={styles.modernModalCol}>
                <Text style={styles.modernModalLabel}>Duración por cita</Text>
                <NumberPicker
                  value={horariosTemp.duracion_slot}
                  onValueChange={(value) => setHorariosTemp((prev) => ({ ...prev, duracion_slot: value }))}
                  label="Duración por cita"
                  unit="min"
                  options={[30, 45, 60, 90, 120]}
                />
              </View>
              <View style={styles.modernModalCol}>
                <Text style={styles.modernModalLabel}>Tiempo de descanso</Text>
                <NumberPicker
                  value={horariosTemp.tiempo_descanso}
                  onValueChange={(value) => setHorariosTemp((prev) => ({ ...prev, tiempo_descanso: value }))}
                  label="Tiempo de descanso"
                  unit="min"
                  options={[0, 5, 10, 15, 20, 30]}
                />
              </View>
            </View>
          </View>

          <View style={styles.modernModalSection}>
            <Text style={styles.modernModalSectionTitle}>Vista previa</Text>
            <View style={styles.modernPreviewContainer}>
              <View style={styles.modernPreviewRow}>
                <InstitutionalIcon name="time" size={18} color={I.primary} />
                <Text style={styles.modernPreviewText}>
                  Horario: {formatearHora(horariosTemp.hora_inicio)} - {formatearHora(horariosTemp.hora_fin)}
                </Text>
              </View>
              <View style={styles.modernPreviewRow}>
                <InstitutionalIcon name="calendar" size={18} color={I.semanticUp} />
                <Text style={styles.modernPreviewText}>Duración por cita: {horariosTemp.duracion_slot} minutos</Text>
              </View>
              {horariosTemp.tiempo_descanso > 0 ? (
                <View style={styles.modernPreviewRow}>
                  <InstitutionalIcon name="pause" size={18} color={I.primary} />
                  <Text style={styles.modernPreviewText}>
                    Tiempo de descanso: {horariosTemp.tiempo_descanso} minutos
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <Stack.Screen options={{ title: 'Horarios de trabajo', headerShown: false }} />
        <Header
          title="Horarios de trabajo"
          showBack
          onBackPress={() => navigateBack('/(tabs)')}
          backgroundColor={I.canvas}
          titleColor={I.ink}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={I.primary} />
          <Text style={styles.loadingText}>Cargando horarios…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: 'Horarios de trabajo', headerShown: false }} />
      <Header
        title="Horarios de trabajo"
        showBack
        onBackPress={() => navigateBack('/(tabs)')}
        backgroundColor={I.canvas}
        titleColor={I.ink}
      />

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={I.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + (hasChanges ? 100 : 20) }}
      >
        <View style={[styles.content, { paddingHorizontal: hx }]}>
          {mecanicos.length > 0 && (
            <View style={styles.uiCard}>
              <Text style={styles.sectionTitle}>Agenda de</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mecanicoSelectorRow}>
                <TouchableOpacity
                  style={[styles.mecanicoChip, miembroSeleccionado === null && styles.mecanicoChipActive]}
                  onPress={() => setMiembroSeleccionado(null)}
                  activeOpacity={0.85}
                >
                  <InstitutionalIcon
                    name="business"
                    size={16}
                    color={miembroSeleccionado === null ? I.onPrimary : I.body}
                  />
                  <Text style={[styles.mecanicoChipText, miembroSeleccionado === null && styles.mecanicoChipTextActive]}>
                    Taller (general)
                  </Text>
                  {estadoAgenda?.tiene_horario_general ? (
                    <View style={[styles.mecanicoChipDot, miembroSeleccionado === null && styles.mecanicoChipDotOn]} />
                  ) : null}
                </TouchableOpacity>
                {mecanicos.map((m) => {
                  const activo = miembroSeleccionado === m.id;
                  const tieneAgendaPropia = estadoAgenda?.mecanicos_con_horario_ids.includes(m.id) ?? false;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.mecanicoChip, activo && styles.mecanicoChipActive]}
                      onPress={() => setMiembroSeleccionado(m.id)}
                      activeOpacity={0.85}
                    >
                      <InstitutionalIcon name="person" size={16} color={activo ? I.onPrimary : I.body} />
                      <Text style={[styles.mecanicoChipText, activo && styles.mecanicoChipTextActive]}>{m.nombre}</Text>
                      {tieneAgendaPropia ? (
                        <View style={[styles.mecanicoChipDot, activo && styles.mecanicoChipDotOn]} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={styles.mecanicoSelectorHint}>
                {miembroSeleccionado === null
                  ? 'Horario base del taller. Los mecánicos sin agenda propia lo heredan al agendar.'
                  : estadoAgenda?.mecanicos_con_horario_ids.includes(miembroSeleccionado)
                    ? 'Agenda individual de este mecánico (tiene prioridad sobre el horario general).'
                    : estadoAgenda?.tiene_horario_general
                      ? 'Este mecánico aún no tiene agenda propia; heredará el horario general del taller.'
                      : 'Configura la agenda de este mecánico o define primero el horario general del taller.'}
              </Text>
              {estadoAgenda && !estadoAgenda.agenda_configurada ? (
                <Text style={styles.mecanicoSelectorWarning}>
                  Aún no hay horario general ni de ningún mecánico. Los clientes no podrán agendar hasta que guardes al menos una agenda activa.
                </Text>
              ) : null}
            </View>
          )}

          <View style={[styles.uiCard, sinHorariosEnServidor && styles.uiCardHighlight]}>
            <View style={styles.infoCardContent}>
              <InstitutionalIcon
                name={sinHorariosEnServidor ? 'alert-circle' : 'information-circle'}
                size={20}
                color={sinHorariosEnServidor ? I.accentYellow : I.primary}
              />
              <Text style={styles.infoText}>
                {sinHorariosEnServidor
                  ? miembroSeleccionado === null
                    ? 'Aún no has configurado el horario general del taller. Activa los días que atiendes y pulsa «Guardar cambios».'
                    : 'Este mecánico no tiene agenda propia. Configúrala aquí o usa el horario general del taller como respaldo.'
                  : miembroSeleccionado === null
                    ? 'Horario general del taller. Los mecánicos sin agenda propia lo heredan.'
                    : 'Agenda individual del mecánico. Tiene prioridad sobre el horario general del taller.'}
              </Text>
            </View>
          </View>

          <View style={styles.uiCard}>
            <Text style={styles.sectionTitle}>Configuraciones rápidas</Text>
            <View style={styles.modernPresetsGrid}>
              <TouchableOpacity
                style={styles.modernPresetCard}
                onPress={() => aplicarPreset('comercial')}
                activeOpacity={0.88}
              >
                <InstitutionalIcon name="business" size={20} color={I.primary} />
                <Text style={styles.modernPresetTitle}>Comercial</Text>
                <Text style={styles.modernPresetSubtitle}>Lun–Vie</Text>
                <Text style={styles.modernPresetTimePrimary}>8:00–18:00</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modernPresetCard}
                onPress={() => aplicarPreset('extendido')}
                activeOpacity={0.88}
              >
                <InstitutionalIcon name="time" size={20} color={I.semanticUp} />
                <Text style={styles.modernPresetTitle}>Extendido</Text>
                <Text style={styles.modernPresetSubtitle}>Lun–Sáb</Text>
                <Text style={styles.modernPresetTimeAccent}>7:00–19:00</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modernPresetCard}
                onPress={() => aplicarPreset('completo')}
                activeOpacity={0.88}
              >
                <InstitutionalIcon name="calendar" size={20} color={I.primary} />
                <Text style={styles.modernPresetTitle}>7 días</Text>
                <Text style={styles.modernPresetSubtitle}>Toda la semana</Text>
                <Text style={styles.modernPresetTimePrimary}>8:00–17:00</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.uiCard}>
            <Text style={styles.sectionTitle}>Configuración por día</Text>
            <View style={styles.modernDiasGrid}>{horarios.map(renderDiaConfig)}</View>
          </View>

          <View style={styles.uiCard}>
            <Text style={styles.sectionTitle}>Resumen</Text>
            <View style={styles.modernResumenContent}>
              <View style={styles.modernResumenItem}>
                <InstitutionalIcon name="checkmark-circle" size={18} color={I.semanticUp} />
                <Text style={styles.modernResumenText}>
                  Días activos: {horarios.filter((h) => h.activo).length}/7
                </Text>
              </View>
              <View style={styles.modernResumenItem}>
                <InstitutionalIcon name="time" size={18} color={I.primary} />
                <Text style={styles.modernResumenText}>
                  Horario común: {horarios.find((h) => h.activo)?.hora_inicio || '--'} -{' '}
                  {horarios.find((h) => h.activo)?.hora_fin || '--'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {hasChanges || sinHorariosEnServidor ? (
        <SafeAreaView style={styles.modernActionButtonsContainer} edges={['bottom']}>
          <TouchableOpacity
            style={[styles.modernSaveButton, saving && styles.modernSaveButtonDisabled]}
            onPress={guardarCambios}
            disabled={saving}
            activeOpacity={0.88}
          >
            {saving ? (
              <ActivityIndicator size="small" color={I.onPrimary} />
            ) : (
              <InstitutionalIcon name="checkmark" size={20} color={I.onPrimary} />
            )}
            <Text style={styles.modernSaveButtonText}>{saving ? 'Guardando…' : 'Guardar cambios'}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      ) : null}

      {renderModalEditarDia()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    paddingVertical: SPACING.fixed.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: I.surfaceSoft,
  },
  loadingText: {
    marginTop: SPACING.fixed.md,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  uiCard: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.xl,
    padding: SPACING.fixed.md,
    marginBottom: SPACING.fixed.md,
    ...SHADOWS.editorial,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  uiCardHighlight: {
    borderColor: withOpacity(I.accentYellow, 0.55),
    backgroundColor: withOpacity(I.accentYellow, 0.08),
  },
  infoCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.md,
  },
  infoText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.base * TYPOGRAPHY.lineHeight.normal),
    color: I.body,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.sansSemiBold,
    marginBottom: SPACING.fixed.md,
    color: I.ink,
  },

  mecanicoSelectorRow: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xxs,
  },
  mecanicoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.xs + 2,
    paddingHorizontal: SPACING.fixed.md,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  mecanicoChipActive: {
    backgroundColor: I.primary,
    borderColor: I.primary,
  },
  mecanicoChipText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.body,
  },
  mecanicoChipTextActive: {
    color: I.onPrimary,
  },
  mecanicoChipDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: I.semanticUp,
  },
  mecanicoChipDotOn: {
    backgroundColor: I.onPrimary,
  },
  mecanicoSelectorHint: {
    marginTop: SPACING.fixed.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  mecanicoSelectorWarning: {
    marginTop: SPACING.fixed.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.accentYellow,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.sm * 1.4),
  },
  modernPresetsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.fixed.xs,
  },
  modernPresetCard: {
    flex: 1,
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.fixed.md,
    ...SHADOWS.editorial,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    alignItems: 'center',
  },
  modernPresetTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    marginTop: SPACING.fixed.sm,
    textAlign: 'center',
    color: I.ink,
  },
  modernPresetSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    marginTop: SPACING.fixed.xxs,
    textAlign: 'center',
    color: I.muted,
  },
  modernPresetTimePrimary: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.monoMedium,
    marginTop: SPACING.fixed.xxs,
    textAlign: 'center',
    color: I.primary,
  },
  modernPresetTimeAccent: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.monoMedium,
    marginTop: SPACING.fixed.xxs,
    textAlign: 'center',
    color: I.semanticUp,
  },

  modernDiasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modernDiaCard: {
    width: '48%',
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.fixed.md,
    marginBottom: SPACING.fixed.md,
    ...SHADOWS.editorial,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    minHeight: 120,
  },
  modernDiaCardActive: {
    backgroundColor: withOpacity(I.primary, 0.06),
    borderColor: withOpacity(I.primary, 0.22),
  },
  modernDiaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.fixed.sm,
  },
  modernDiaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modernDiaIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.fixed.sm,
  },
  modernDiaIconOn: {
    backgroundColor: I.primary,
  },
  modernDiaIconOff: {
    backgroundColor: I.surfaceStrong,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  modernDiaTexto: {
    flex: 1,
  },
  modernDiaNombre: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.body,
  },
  modernDiaNombreActive: {
    color: I.primary,
  },
  modernDiaInactiveBanner: {
    backgroundColor: I.surfaceStrong,
    borderRadius: BORDERS.radius.md,
    paddingVertical: SPACING.fixed.xs + 2,
    paddingHorizontal: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  modernDiaInactiveLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  modernDiaInactiveHint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansRegular,
    color: I.muted,
    marginTop: 2,
  },
  modernSwitchContainer: {
    alignItems: 'center',
  },
  modernSwitch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  modernHorariosConfig: {
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
    paddingTop: SPACING.fixed.sm,
    marginTop: SPACING.fixed.sm,
  },
  modernTiemposContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.fixed.sm,
    gap: SPACING.xs,
  },
  modernTiempoCard: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.sm,
    alignItems: 'center',
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    gap: 2,
  },
  modernTiempoValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.monoMedium,
    color: I.ink,
  },
  modernTiempoCardInactive: {
    backgroundColor: I.surfaceStrong,
    borderColor: I.hairline,
  },
  modernTiempoValueInactive: {
    color: I.body,
  },
  modernConfigSlots: {
    alignItems: 'center',
  },
  modernSlotInfo: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    textAlign: 'center',
    color: I.muted,
  },
  modernSlotInfoInactive: {
    color: I.body,
  },

  modernResumenContent: {
    gap: SPACING.fixed.sm,
  },
  modernResumenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  modernResumenText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    flex: 1,
    color: I.body,
  },

  modernActionButtonsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: I.canvas,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
    paddingHorizontal: hx,
    paddingTop: SPACING.fixed.md,
    ...SHADOWS.editorial,
  },
  modernSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.fixed.md,
    paddingHorizontal: SPACING.fixed.lg,
    borderRadius: BORDERS.radius.pill,
    gap: SPACING.fixed.sm,
    backgroundColor: I.primary,
    ...SHADOWS.editorial,
  },
  modernSaveButtonDisabled: {
    opacity: 0.55,
  },
  modernSaveButtonText: {
    color: I.onPrimary,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
  },

  modernModalContainer: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  modernModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: hx,
    paddingTop: SPACING.fixed.sm,
    paddingBottom: SPACING.fixed.md,
    backgroundColor: I.canvas,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: I.hairline,
    ...SHADOWS.editorial,
    gap: SPACING.fixed.xs,
  },
  modernModalHeaderSlot: {
    flex: 1,
    minWidth: 72,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: SPACING.fixed.xxs,
  },
  modernModalHeaderSlotEnd: {
    alignItems: 'flex-end',
  },
  modernModalHeaderCenter: {
    flex: 2.2,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: SPACING.fixed.xs,
  },
  modernModalTitle: {
    fontSize: TS.h3.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h3.fontSize, TS.h3.lineHeight),
    letterSpacing: TS.h3.letterSpacing,
    color: I.ink,
    textAlign: 'center',
    width: '100%',
  },
  modernModalSubtitle: {
    marginTop: SPACING.fixed.xxs,
    fontSize: TS.caption.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.caption.fontSize, TS.caption.lineHeight),
    letterSpacing: TS.caption.letterSpacing,
    color: I.muted,
    textAlign: 'center',
    width: '100%',
  },
  modernModalClosePill: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernModalSavePill: {
    paddingVertical: SPACING.fixed.xs + 2,
    paddingHorizontal: SPACING.fixed.md,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.primary,
    ...SHADOWS.editorial,
  },
  modernModalSavePillText: {
    color: I.onPrimary,
    fontSize: TS.button.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.button.fontSize, TS.button.lineHeight),
    letterSpacing: TS.button.letterSpacing,
  },
  modernModalScroll: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  modernModalScrollContent: {
    paddingHorizontal: hx,
    paddingTop: SPACING.fixed.md,
  },
  modernModalSection: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.fixed.md,
    marginBottom: SPACING.fixed.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    ...SHADOWS.editorial,
  },
  modernModalSectionTitle: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    letterSpacing: TS.h4.letterSpacing,
    marginBottom: SPACING.fixed.md,
    color: I.ink,
  },
  modernModalRow: {
    flexDirection: 'row',
    gap: SPACING.fixed.md,
  },
  modernModalCol: {
    flex: 1,
  },
  modernModalLabel: {
    fontSize: TS.captionBold.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.captionBold.fontSize, TS.captionBold.lineHeight),
    letterSpacing: TS.captionBold.letterSpacing,
    marginBottom: SPACING.fixed.sm,
    color: I.muted,
    textTransform: 'uppercase',
  },
  modernPreviewContainer: {
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  modernPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.fixed.sm,
  },
  modernPreviewText: {
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    letterSpacing: TS.body.letterSpacing,
    marginLeft: SPACING.fixed.sm,
    color: I.ink,
    flex: 1,
  },
});