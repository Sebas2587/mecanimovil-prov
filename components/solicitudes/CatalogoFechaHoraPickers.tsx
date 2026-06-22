import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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

function buildDayOptions(minDate?: Date): Date[] {
  const hoy = startOfDay(new Date());
  const inicio = minDate && startOfDay(minDate) >= hoy ? startOfDay(minDate) : hoy;
  const out: Date[] = [];
  for (let i = 0; i < DAYS_AHEAD; i += 1) {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
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
};

export function CatalogoFechaHoraPickers({
  value,
  onChange,
  minDate,
  modo = 'simple',
}: Props) {
  const esRango = modo === 'rango';
  const dayScrollRef = useRef<ScrollView>(null);
  const timeScrollRef = useRef<ScrollView>(null);
  const dayOptions = useMemo(() => buildDayOptions(minDate), [minDate]);
  const timeSlots = useMemo(() => buildTimeSlots(!esRango), [esRango]);
  const horaInicioKey = value.hora ?? (esRango ? '' : SIN_HORA);
  const slotsRango = useMemo(
    () => timeSlots.filter((s) => s !== SIN_HORA),
    [timeSlots],
  );
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
    if (!value.hora) return 'Toca la hora de inicio en la línea de tiempo.';
    if (!value.horaFin) return 'Ahora toca la hora de término (misma línea).';
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
      ? (value.hora ?? value.horaFin ?? slots[0])
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
  }, [timeSlots, slotsRango, horaInicioKey, esRango, value.hora, value.horaFin]);

  const selectDay = (d: Date) => {
    onChange({ ...value, fecha: startOfDay(d) });
  };

  const selectHoraRango = (slot: string) => {
    const t = parseHoraMinutos(slot);
    const inicio = value.hora ? parseHoraMinutos(value.hora) : null;

    if (inicio === null) {
      onChange({ ...value, hora: slot, horaFin: null });
      return;
    }

    if (!value.horaFin) {
      if (t <= inicio) {
        onChange({ ...value, hora: slot, horaFin: null });
        return;
      }
      if (t - inicio >= 15) {
        onChange({ ...value, hora: value.hora, horaFin: slot });
      }
      return;
    }

    onChange({ ...value, hora: slot, horaFin: null });
  };

  const selectHoraSimple = (slot: string) => {
    onChange({ ...value, hora: slot === SIN_HORA ? null : slot });
  };

  const chipRangoStyle = (slot: string) => {
    if (!value.hora) return null;
    const t = parseHoraMinutos(slot);
    const ini = parseHoraMinutos(value.hora);
    const fin = value.horaFin ? parseHoraMinutos(value.horaFin) : null;

    if (slot === value.hora) return 'start';
    if (value.horaFin && slot === value.horaFin) return 'end';
    if (fin !== null && t > ini && t < fin) return 'between';
    return null;
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.sectionHead}>
        <InstitutionalIcon name="calendar" size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
        <Text style={styles.sectionLabel}>Fecha propuesta</Text>
      </View>
      <ScrollView
        ref={dayScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
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
      <ScrollView
        ref={timeScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        decelerationRate="fast"
        snapToInterval={TIME_CHIP_W + SPACING.fixed.xs}
      >
        {(esRango ? slotsRango : timeSlots).map((slot) => {
          const rango = esRango ? chipRangoStyle(slot) : null;
          const selected = esRango
            ? rango === 'start' || rango === 'end'
            : slot === horaInicioKey;
          const label = slot === SIN_HORA ? 'Sin hora' : slot;
          return (
            <TouchableOpacity
              key={slot}
              style={[
                styles.timeChip,
                rango === 'between' && styles.timeChipInRange,
                selected && styles.chipSelected,
              ]}
              onPress={() => (esRango ? selectHoraRango(slot) : selectHoraSimple(slot))}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text
                style={[
                  styles.timeChipText,
                  rango === 'between' && styles.chipTextInRange,
                  selected && styles.chipTextOn,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {esRango ? (
        <>
          {duracionLabel ? (
            <Text style={styles.durationHint}>{duracionLabel}</Text>
          ) : value.hora && !value.horaFin ? (
            <Text style={styles.durationWarn}>Selecciona la hora de término en la misma línea.</Text>
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
    backgroundColor: withOpacity(I.primary, 0.18),
    borderColor: withOpacity(I.primary, 0.35),
  },
  rangoHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.body,
    marginBottom: SPACING.fixed.xxs,
  },
  chipSelected: {
    backgroundColor: I.primary,
    borderColor: I.primary,
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
    color: I.primaryActive,
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
});
