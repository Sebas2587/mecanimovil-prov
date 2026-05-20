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

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

const DAY_CHIP_W = 72;
const TIME_CHIP_W = 64;
const DAYS_AHEAD = 21;
const SIN_HORA = '__sin_hora__';

export function formatDateApi(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseReferenciaDate(fecha?: string, hora?: string | null): Date {
  const base = new Date();
  base.setHours(8, 0, 0, 0);
  if (fecha?.trim()) {
    const parts = fecha.trim().split('-').map((p) => parseInt(p, 10));
    if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
      base.setFullYear(parts[0], parts[1] - 1, parts[2]);
    }
  }
  if (hora) {
    const [h, min] = String(hora).substring(0, 5).split(':').map((p) => parseInt(p, 10));
    if (!Number.isNaN(h)) {
      base.setHours(h, Number.isNaN(min) ? 0 : min, 0, 0);
    }
  }
  return base;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

function buildDayOptions(): Date[] {
  const hoy = startOfDay(new Date());
  const out: Date[] = [];
  for (let i = 0; i < DAYS_AHEAD; i += 1) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    out.push(d);
  }
  return out;
}

export function resolveInitialPickerValue(
  fechaReferencia?: string,
  horaReferencia?: string | null,
): CatalogoFechaHoraValue {
  const ref = parseReferenciaDate(fechaReferencia, horaReferencia);
  const options = buildDayOptions();
  let fecha = options[0];
  for (const d of options) {
    if (isSameDay(d, ref)) {
      fecha = d;
    }
  }
  const last = options[options.length - 1];
  if (startOfDay(ref) > startOfDay(last)) {
    fecha = last;
  }
  const hora = horaReferencia ? String(horaReferencia).substring(0, 5) : null;
  return { fecha, hora };
}

function buildTimeSlots(): string[] {
  const slots: string[] = [SIN_HORA];
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
  hora: string | null;
};

type Props = {
  value: CatalogoFechaHoraValue;
  onChange: (next: CatalogoFechaHoraValue) => void;
};

export function CatalogoFechaHoraPickers({ value, onChange }: Props) {
  const dayScrollRef = useRef<ScrollView>(null);
  const timeScrollRef = useRef<ScrollView>(null);
  const dayOptions = useMemo(() => buildDayOptions(), []);
  const timeSlots = useMemo(() => buildTimeSlots(), []);
  const horaKey = value.hora ?? SIN_HORA;

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
    const timeIdx = timeSlots.indexOf(horaKey);
    if (timeIdx >= 0 && timeScrollRef.current) {
      requestAnimationFrame(() => {
        timeScrollRef.current?.scrollTo({
          x: Math.max(0, timeIdx * (TIME_CHIP_W + SPACING.fixed.xs) - SPACING.fixed.md),
          animated: false,
        });
      });
    }
  }, [timeSlots, horaKey]);

  const selectDay = (d: Date) => {
    onChange({ fecha: d, hora: value.hora });
  };

  const selectHora = (slot: string) => {
    onChange({ fecha: value.fecha, hora: slot === SIN_HORA ? null : slot });
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
          return (
            <TouchableOpacity
              key={d.toISOString()}
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

      <View style={[styles.sectionHead, styles.sectionHeadSpaced]}>
        <InstitutionalIcon name="time" size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
        <Text style={styles.sectionLabel}>Hora (opcional)</Text>
      </View>
      <ScrollView
        ref={timeScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        decelerationRate="fast"
        snapToInterval={TIME_CHIP_W + SPACING.fixed.xs}
      >
        {timeSlots.map((slot) => {
          const selected = slot === horaKey;
          const label = slot === SIN_HORA ? 'Sin hora' : slot;
          return (
            <TouchableOpacity
              key={slot}
              style={[styles.timeChip, selected && styles.chipSelected]}
              onPress={() => selectHora(slot)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.timeChipText, selected && styles.chipTextOn]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
  chipTextMutedOn: {
    color: withOpacity(I.onPrimary, 0.85),
  },
});
