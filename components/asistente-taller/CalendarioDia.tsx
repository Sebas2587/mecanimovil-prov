import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { X } from 'lucide-react-native';
import { HostAvatar, InstitutionalText } from '@/app/design-system/components';
import { COLORS, SHADOWS, SPACING, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { EventoAgendaUnificado } from '@/services/agendaProveedorService';
import { isSameDay, parseFechaLocal } from '@/utils/fechaLocal';

const I = COLORS.institutional;
const ETIQUETAS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'] as const;

type Props = {
  fecha: Date;
  eventos: EventoAgendaUnificado[];
  filtroMecanico?: string | null;
  onCambiarDia: (fecha: Date) => void;
  onCerrar: () => void;
  onPressEvento: (evento: EventoAgendaUnificado) => void;
};

function horaCorta(hora: string | undefined): string {
  return (hora || '').slice(0, 5);
}

function sumarMinutos(hora: string, minutos: number): string {
  const [h, m] = horaCorta(hora).split(':').map((parte) => Number(parte));
  if (Number.isNaN(h) || Number.isNaN(m)) return horaCorta(hora);
  const total = h * 60 + m + minutos;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function cerrado(estado: string): boolean {
  const p = estado.toLowerCase();
  return p.includes('cerrad') || p.includes('complet');
}

function inicioSemana(fecha: Date): Date {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

const DiaSemana = React.memo(function DiaSemana({
  fecha,
  seleccionado,
  tieneCita,
  onPress,
}: {
  fecha: Date;
  seleccionado: boolean;
  tieneCita: boolean;
  onPress: (fecha: Date) => void;
}) {
  const handlePress = useCallback(() => onPress(fecha), [fecha, onPress]);
  return (
    <Pressable onPress={handlePress} style={styles.dia} accessibilityRole="button">
      <InstitutionalText role="caption" color="muted">
        {ETIQUETAS[fecha.getDay()]}
      </InstitutionalText>
      <View style={[styles.numero, seleccionado && styles.numeroOn]}>
        <InstitutionalText role="captionBold" color={seleccionado ? 'onPrimary' : 'ink'}>
          {fecha.getDate()}
        </InstitutionalText>
      </View>
      <View style={[styles.punto, tieneCita && styles.puntoOn]} />
    </Pressable>
  );
});

const BloqueCita = React.memo(function BloqueCita({
  evento,
  acento,
  onPress,
}: {
  evento: EventoAgendaUnificado;
  acento: boolean;
  onPress: (evento: EventoAgendaUnificado) => void;
}) {
  const handlePress = useCallback(() => onPress(evento), [evento, onPress]);
  const inicio = horaCorta(evento.hora_servicio);
  const fin = evento.duracion_minutos ? sumarMinutos(inicio, evento.duracion_minutos) : '';
  const rango = fin ? `${inicio}–${fin}` : inicio;
  const mecanico = (evento.mecanico_nombre || '').trim() || 'Tú';
  const patente = (evento.vehiculo_patente || '').trim();
  const cliente = (evento.cliente_nombre || '').trim();
  const meta = [cliente, patente].filter(Boolean).join(' · ');
  const apagado = cerrado(evento.estado);

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.bloque, acento && styles.bloqueAcento, apagado && styles.bloqueApagado]}
      accessibilityRole="button"
    >
      <InstitutionalText role="caption" color={acento ? 'onPrimary' : 'muted'}>
        {inicio}
      </InstitutionalText>
      <InstitutionalText role="bodyBold" color={acento ? 'onPrimary' : 'ink'} numberOfLines={2}>
        {evento.servicio_nombre || evento.etiqueta}
      </InstitutionalText>
      <InstitutionalText role="caption" color={acento ? 'onPrimary' : 'body'}>
        {rango}
      </InstitutionalText>
      <View style={styles.meta}>
        <InstitutionalText role="caption" color={acento ? 'onPrimary' : 'body'} numberOfLines={1} style={styles.metaTexto}>
          {meta}
        </InstitutionalText>
        <HostAvatar name={mecanico} size="sm" />
      </View>
    </Pressable>
  );
});

export function CalendarioDia({
  fecha,
  eventos,
  filtroMecanico,
  onCambiarDia,
  onCerrar,
  onPressEvento,
}: Props) {
  const semana = useMemo(() => {
    const inicio = inicioSemana(fecha);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return d;
    });
  }, [fecha]);

  const diasConCita = useMemo(() => {
    const set = new Set<string>();
    for (const evento of eventos) {
      const d = parseFechaLocal(evento.fecha_servicio);
      if (d) set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
    return set;
  }, [eventos]);

  const delDia = useMemo(() => {
    const filtro = (filtroMecanico || '').trim().toLowerCase();
    return eventos
      .filter((evento) => {
        const d = parseFechaLocal(evento.fecha_servicio);
        if (!d || !isSameDay(d, fecha)) return false;
        if (!filtro) return true;
        return (evento.mecanico_nombre || '').toLowerCase().includes(filtro);
      })
      .sort((a, b) => horaCorta(a.hora_servicio).localeCompare(horaCorta(b.hora_servicio)));
  }, [eventos, fecha, filtroMecanico]);

  const acentoId = delDia.find((evento) => !cerrado(evento.estado))?.id ?? delDia[0]?.id;
  const titulo = fecha.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <InstitutionalText role="bodyBold" style={styles.titulo}>
          {titulo}
        </InstitutionalText>
        <Pressable onPress={onCerrar} accessibilityRole="button" accessibilityLabel="Cerrar día" hitSlop={12}>
          <X size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
        </Pressable>
      </View>
      <View style={styles.semana}>
        {semana.map((dia) => {
          const key = `${dia.getFullYear()}-${dia.getMonth()}-${dia.getDate()}`;
          return (
            <DiaSemana
              key={key}
              fecha={dia}
              seleccionado={isSameDay(dia, fecha)}
              tieneCita={diasConCita.has(key)}
              onPress={onCambiarDia}
            />
          );
        })}
      </View>
      {delDia.length === 0 ? (
        <InstitutionalText role="body" color="muted">
          Nada agendado.
        </InstitutionalText>
      ) : (
        delDia.map((evento) => (
          <BloqueCita
            key={`${evento.origen}-${evento.id}`}
            evento={evento}
            acento={evento.id === acentoId}
            onPress={onPressEvento}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.fixed.md,
    borderRadius: BORDERS.radius.xl,
    backgroundColor: I.paper,
    gap: SPACING.fixed.sm,
    ...SHADOWS.editorial,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  titulo: {
    flex: 1,
    textTransform: 'capitalize',
  },
  semana: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dia: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  numero: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroOn: {
    backgroundColor: I.primary,
  },
  punto: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  puntoOn: {
    backgroundColor: I.primary,
  },
  bloque: {
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.lg,
    gap: 2,
  },
  bloqueAcento: {
    backgroundColor: I.primary,
    borderColor: I.primary,
  },
  bloqueApagado: {
    opacity: 0.55,
  },
  meta: {
    marginTop: SPACING.fixed.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  metaTexto: {
    flex: 1,
  },
});
