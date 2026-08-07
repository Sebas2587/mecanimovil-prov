import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, withOpacity } from '@/app/design-system/tokens';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  formatDateApi,
  parseReferenciaDate,
  startOfDay,
  isSameDay,
} from '@/utils/fechaLocal';
import {
  calcularDuracionMinutos,
  esRangoHorarioValido,
  parseHoraMinutos,
  slotsDespuesDe,
  sumarMinutosAHora,
} from '@/utils/citaPersonalHorario';

export { formatDateApi, parseReferenciaDate } from '@/utils/fechaLocal';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

const DAY_CHIP_W = 72;
const TIME_CHIP_W = 64;
const DAYS_AHEAD = 21;
const SIN_HORA = '__sin_hora__';

export function resolveInitialPickerValue(
  fechaReferencia?: string,
  horaReferencia?: string | null,
  duracionMinutos?: number,
): CatalogoFechaHoraValue {
  const ref = parseReferenciaDate(fechaReferencia, horaReferencia);
  const options = buildDayOptions(
    fechaReferencia ? startOfDay(ref) : undefined,
  );
  let fecha = options[0];
  for (const d of options) {
    if (isSameDay(d, ref)) {
      fecha = d;
      break;
    }
  }
  const last = options[options.length - 1];
  if (startOfDay(ref) > startOfDay(last)) {
    fecha = last;
  }
  const hora = horaReferencia ? String(horaReferencia).substring(0, 5) : null;
  let horaFin: string | null = null;
  if (hora && duracionMinutos && duracionMinutos > 0) {
    horaFin = sumarMinutosAHora(hora, duracionMinutos);
  }
  return { fecha, hora, horaFin };
}

function buildDayOptions(minDate?: Date, fechasPermitidas?: string[] | null): Date[] {
  const hoy = startOfDay(new Date());
  const inicio = minDate && startOfDay(minDate) >= hoy ? startOfDay(minDate) : hoy;
  const out: Date[] = [];
  for (let i = 0; i < DAYS_AHEAD; i += 1) {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    if (fechasPermitidas != null) {
      if (!fechasPermitidas.includes(formatDateApi(d))) continue;
    }
    out.push(d);
  }
  return out;
}

function buildTimeSlots(includeSinHora: boolean): string[] {
  const slots: string[] = includeSinHora ? [SIN_HORA] : [];
  for (let h = 7; h <= 20; h += 1) {
    for (const m of [0, 15, 30, 45]) {
      if (h === 20 && m > 0) break;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}

export type CatalogoFechaHoraValue = {
  fecha: Date;
  /** Hora de inicio */
  hora: string | null;
  /** Hora de término (modo rango) */
  horaFin?: string | null;
};

type Props = {
  value: CatalogoFechaHoraValue;
  onChange: (next: CatalogoFechaHoraValue) => void;
  /** Solo fechas >= hoy (default). Pasar fecha concreta para preselección desde calendario. */
  minDate?: Date;
  /** simple: una hora opcional; rango: inicio + fin obligatorios */
  modo?: 'simple' | 'rango';
  /** Horas reales del proveedor; undefined = slots genéricos 7:00–20:00 */
  horasDisponibles?: string[] | null;
  /** Grilla completa de la jornada (modo rango); prioridad sobre horasDisponibles */
  grillaHoraria?: string[] | null;
  cargandoHoras?: boolean;
  mensajeSinHoras?: string;
  /** Fechas YYYY-MM-DD con agenda; null = aún no aplica filtro */
  fechasDisponibles?: string[] | null;
  cargandoFechas?: boolean;
  mensajeSinFechas?: string;
  /** Inset del contenedor padre: permite scroll horizontal edge-to-edge dentro de padding. */
  horizontalInset?: number;
};

export function CatalogoFechaHoraPickers({
  value,
  onChange,
  minDate,
  modo = 'simple',
  horasDisponibles,
  grillaHoraria = null,
  cargandoHoras = false,
  mensajeSinHoras,
  fechasDisponibles = null,
  cargandoFechas = false,
  mensajeSinFechas,
  horizontalInset = 0,
}: Props) {
  const esRango = modo === 'rango';
  const dayScrollRef = useRef<ScrollView>(null);
  const timeScrollRef = useRef<ScrollView>(null);
  const finScrollRef = useRef<ScrollView>(null);
  const dayOptions = useMemo(
    () => buildDayOptions(minDate, fechasDisponibles),
    [minDate, fechasDisponibles],
  );
  const timeSlots = useMemo(() => {
    if (fechasDisponibles === null || (horasDisponibles === null && grillaHoraria === null)) {
      return [];
    }
    const base = buildTimeSlots(!esRango);
    if (esRango) {
      if (grillaHoraria != null && grillaHoraria.length > 0) {
        return grillaHoraria;
      }
      if (horasDisponibles != null && horasDisponibles.length > 0) {
        return horasDisponibles;
      }
      if (horasDisponibles === undefined) {
        return base.filter((s) => s !== SIN_HORA);
      }
      return [];
    }
    if (horasDisponibles === undefined) {
      return base;
    }
    return [SIN_HORA, ...horasDisponibles];
  }, [esRango, horasDisponibles, grillaHoraria, fechasDisponibles]);
  const horaInicioKey = value.hora ?? (esRango ? '' : SIN_HORA);
  const slotsRango = useMemo(
    () => timeSlots.filter((s) => s !== SIN_HORA),
    [timeSlots],
  );
  const slotsFin = useMemo(() => {
    if (!esRango || !value.hora) return [];
    return slotsDespuesDe(value.hora, slotsRango);
  }, [esRango, value.hora, slotsRango]);
  const sinHorariosCargados = useMemo(() => {
    if (esRango) {
      if (grillaHoraria != null) return grillaHoraria.length === 0;
      if (horasDisponibles != null) return horasDisponibles.length === 0;
      return false;
    }
    return horasDisponibles !== undefined && horasDisponibles !== null && horasDisponibles.length === 0;
  }, [esRango, grillaHoraria, horasDisponibles]);
  const duracionLabel = useMemo(() => {
    if (!esRango || !esRangoHorarioValido(value.hora, value.horaFin ?? null)) return null;
    const mins = calcularDuracionMinutos(value.hora!, value.horaFin!);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `Duración: ${h} h ${m} min`;
    if (h > 0) return `Duración: ${h} h`;
    return `Duración: ${m} min`;
  }, [esRango, value.hora, value.horaFin]);

  const rangoHint = useMemo(() => {
    if (!esRango) return null;
    if (!value.hora) return 'Elige la hora de inicio.';
    if (!value.horaFin) return 'Ahora elige la hora de término.';
    return `${value.hora} – ${value.horaFin}`;
  }, [esRango, value.hora, value.horaFin]);

  useEffect(() => {
    const dayIdx = dayOptions.findIndex((d) => isSameDay(d, value.fecha));
    if (dayIdx >= 0 && dayScrollRef.current) {
      requestAnimationFrame(() => {
        dayScrollRef.current?.scrollTo({
          x: Math.max(0, dayIdx * (DAY_CHIP_W + SPACING.fixed.xs) - SPACING.fixed.md),
          animated: false,
        });
      });
    }
  }, [dayOptions, value.fecha]);

  useEffect(() => {
    const slots = esRango ? slotsRango : timeSlots;
    const scrollKey = esRango
      ? (value.hora ?? slots[0])
      : horaInicioKey;
    const timeIdx = slots.indexOf(scrollKey);
    if (timeIdx >= 0 && timeScrollRef.current) {
      requestAnimationFrame(() => {
        timeScrollRef.current?.scrollTo({
          x: Math.max(0, timeIdx * (TIME_CHIP_W + SPACING.fixed.xs) - SPACING.fixed.md),
          animated: false,
        });
      });
    }
  }, [timeSlots, slotsRango, horaInicioKey, esRango, value.hora]);

  useEffect(() => {
    if (!esRango || !value.horaFin) return;
    const finIdx = slotsFin.indexOf(value.horaFin);
    if (finIdx >= 0 && finScrollRef.current) {
      requestAnimationFrame(() => {
        finScrollRef.current?.scrollTo({
          x: Math.max(0, finIdx * (TIME_CHIP_W + SPACING.fixed.xs) - SPACING.fixed.md),
          animated: false,
        });
      });
    }
  }, [esRango, value.horaFin, slotsFin]);

  const selectDay = (d: Date) => {
    onChange({ ...value, fecha: startOfDay(d) });
  };

  const selectInicioRango = (slot: string) => {
    onChange({ ...value, hora: slot, horaFin: null });
  };

  const selectFinRango = (slot: string) => {
    if (!value.hora) return;
    if (parseHoraMinutos(slot) - parseHoraMinutos(value.hora) >= 15) {
      onChange({ ...value, horaFin: slot });
    }
  };

  const selectHoraSimple = (slot: string) => {
    onChange({ ...value, hora: slot === SIN_HORA ? null : slot });
  };

  const horizontalBleed = horizontalInset > 0
    ? { marginHorizontal: -horizontalInset }
    : undefined;
  const chipsRowStyle = horizontalInset > 0
    ? [
        styles.chipsRow,
        {
          paddingLeft: horizontalInset,
          paddingRight: horizontalInset + SPACING.fixed.md,
        },
      ]
    : styles.chipsRow;

  return (
    <View style={styles.wrap}>
      <View style={styles.sectionHead}>
        <InstitutionalIcon name="calendar" size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
        <Text style={styles.sectionLabel}>Fecha propuesta</Text>
      </View>
      {cargandoFechas ? (
        <View style={styles.horasLoading}>
          <ActivityIndicator color={I.primary} />
          <Text style={styles.horasLoadingText}>Cargando fechas disponibles…</Text>
        </View>
      ) : fechasDisponibles != null && dayOptions.length === 0 ? (
        <Text style={styles.sinHorasText}>
          {mensajeSinFechas || 'No hay fechas disponibles en las próximas semanas.'}
        </Text>
      ) : fechasDisponibles === null ? (
        <Text style={styles.sinHorasText}>
          {mensajeSinFechas || 'Selecciona modalidad y servicio para ver fechas disponibles.'}
        </Text>
      ) : (
      <ScrollView
        ref={dayScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={horizontalBleed}
        contentContainerStyle={chipsRowStyle}
        decelerationRate="fast"
        snapToInterval={DAY_CHIP_W + SPACING.fixed.xs}
      >
        {dayOptions.map((d) => {
          const selected = isSameDay(d, value.fecha);
          const weekday = d.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', '');
          const dayNum = d.getDate();
          const month = d.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '');
          const dateKey = formatDateApi(d);
          return (
            <TouchableOpacity
              key={dateKey}
              style={[styles.dayChip, selected && styles.chipSelected]}
              onPress={() => selectDay(d)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.dayWeek, selected && styles.chipTextOn]}>{weekday}</Text>
              <Text style={[styles.dayNum, selected && styles.chipTextOn]}>{dayNum}</Text>
              <Text style={[styles.dayMonth, selected && styles.chipTextMutedOn]}>{month}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      )}

      <Text style={styles.selectedDateHint}>
        {value.fecha.toLocaleDateString('es-CL', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </Text>

      <View style={[styles.sectionHead, styles.sectionHeadSpaced]}>
        <InstitutionalIcon name="time" size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
        <Text style={styles.sectionLabel}>{esRango ? 'Horario' : 'Hora (opcional)'}</Text>
      </View>
      {esRango && rangoHint ? (
        <Text style={styles.rangoHint}>{rangoHint}</Text>
      ) : null}
      {cargandoHoras ? (
        <View style={styles.horasLoading}>
          <ActivityIndicator color={I.primary} />
          <Text style={styles.horasLoadingText}>Cargando horarios…</Text>
        </View>
      ) : sinHorariosCargados ? (
        <Text style={styles.sinHorasText}>
          {mensajeSinHoras || 'No hay horarios disponibles para esta fecha.'}
        </Text>
      ) : null}
      {!cargandoHoras && esRango ? (
        <>
          <Text style={styles.rangoSubLabel}>Inicio</Text>
          <ScrollView
            ref={timeScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={horizontalBleed}
            contentContainerStyle={chipsRowStyle}
            decelerationRate="fast"
            snapToInterval={TIME_CHIP_W + SPACING.fixed.xs}
          >
            {slotsRango.map((slot) => {
              const selected = slot === value.hora;
              return (
                <TouchableOpacity
                  key={`inicio-${slot}`}
                  style={[styles.timeChip, selected && styles.chipSelected]}
                  onPress={() => selectInicioRango(slot)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.timeChipText, selected && styles.chipTextOn]}>{slot}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {value.hora ? (
            <>
              <Text style={styles.rangoSubLabel}>Término</Text>
              <ScrollView
                ref={finScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={horizontalBleed}
                contentContainerStyle={chipsRowStyle}
                decelerationRate="fast"
                snapToInterval={TIME_CHIP_W + SPACING.fixed.xs}
              >
                {slotsFin.map((slot) => {
                  const selected = slot === value.horaFin;
                  return (
                    <TouchableOpacity
                      key={`fin-${slot}`}
                      style={[styles.timeChip, selected && styles.chipSelected]}
                      onPress={() => selectFinRango(slot)}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.timeChipText, selected && styles.chipTextOn]}>{slot}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          ) : null}
        </>
      ) : null}
      {!cargandoHoras && !esRango ? (
      <ScrollView
        ref={timeScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={horizontalBleed}
        contentContainerStyle={chipsRowStyle}
        decelerationRate="fast"
        snapToInterval={TIME_CHIP_W + SPACING.fixed.xs}
      >
        {timeSlots.map((slot) => {
          const selected = slot === horaInicioKey;
          const label = slot === SIN_HORA ? 'Sin hora' : slot;
          return (
            <TouchableOpacity
              key={slot}
              style={[styles.timeChip, selected && styles.chipSelected]}
              onPress={() => selectHoraSimple(slot)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.timeChipText, selected && styles.chipTextOn]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      ) : null}

      {esRango ? (
        <>
          {duracionLabel ? (
            <Text style={styles.durationHint}>{duracionLabel}</Text>
          ) : value.hora && !value.horaFin ? (
            <Text style={styles.durationWarn}>Selecciona la hora de término.</Text>
          ) : value.hora && value.horaFin && !esRangoHorarioValido(value.hora, value.horaFin) ? (
            <Text style={styles.durationWarn}>La hora de término debe ser al menos 15 min después del inicio.</Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: SPACING.fixed.xs,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    marginTop: SPACING.fixed.xs,
  },
  sectionHeadSpaced: {
    marginTop: SPACING.fixed.sm,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  selectedDateHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.body,
    textTransform: 'capitalize',
    marginTop: SPACING.fixed.xxs,
  },
  chipsRow: {
    paddingVertical: SPACING.fixed.xs,
    gap: SPACING.fixed.xs,
    paddingRight: SPACING.fixed.md,
  },
  dayChip: {
    width: DAY_CHIP_W,
    alignItems: 'center',
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.xs,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.canvas,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  timeChip: {
    minWidth: TIME_CHIP_W,
    paddingVertical: SPACING.fixed.sm + 2,
    paddingHorizontal: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.canvas,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChipInRange: {
    backgroundColor: I.surfaceSoft,
    borderColor: I.hairline,
  },
  rangoHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.body,
    marginBottom: SPACING.fixed.xxs,
  },
  rangoSubLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    color: I.muted,
    marginTop: SPACING.fixed.xxs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  /** Selección Airbnb Calendar: disco ink, no magenta de selección. */
  chipSelected: {
    backgroundColor: I.ink,
    borderColor: I.ink,
  },
  dayWeek: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    color: I.muted,
    textTransform: 'capitalize',
  },
  dayNum: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.monoMedium,
    color: I.ink,
    marginVertical: 2,
  },
  dayMonth: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansRegular,
    color: I.muted,
    textTransform: 'capitalize',
  },
  timeChipText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.monoMedium,
    color: I.ink,
  },
  chipTextOn: {
    color: I.onPrimary,
  },
  chipTextInRange: {
    color: I.ink,
    fontFamily: FF.sansSemiBold,
  },
  chipTextMutedOn: {
    color: withOpacity(I.onPrimary, 0.85),
  },
  durationHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.body,
    marginTop: SPACING.fixed.xxs,
  },
  durationWarn: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.accentYellow,
    marginTop: SPACING.fixed.xxs,
  },
  horasLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xs,
  },
  horasLoadingText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.body,
  },
  sinHorasText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.muted,
    paddingVertical: SPACING.fixed.xs,
  },
});
