import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Car, ClipboardList } from 'lucide-react-native';
import {
  HostEmptyState,
  HostPaperSection,
  HostSectionKicker,
  hostIconPlateStyle,
} from '@/app/design-system/components';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { useHistorialRedQuery } from '@/hooks/useHistorialRedQuery';
import { patenteHistorialValida, type HistorialRedEvento } from '@/services/vehiculoService';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

const I = COLORS.institutional;

function anioDeFecha(fecha: string | null): string {
  if (!fecha) return 'Sin fecha';
  const anio = fecha.slice(0, 4);
  return /^\d{4}$/.test(anio) ? anio : 'Sin fecha';
}

function formatearFechaEvento(fecha: string | null): string {
  if (!fecha) return 'Fecha no registrada';
  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return fecha.slice(0, 10);
  return parsed.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function metaEvento(evento: HistorialRedEvento): string {
  const partes: string[] = [];
  if (evento.kilometraje != null && evento.kilometraje > 0) {
    partes.push(`${evento.kilometraje.toLocaleString('es-CL')} km`);
  }
  if (evento.taller_es_propio) {
    partes.push(
      evento.monto_clp != null && evento.monto_clp > 0
        ? formatearMontoCLP(evento.monto_clp)
        : 'Sin cobro registrado',
    );
  } else if (
    evento.rango_mercado_clp
    && evento.rango_mercado_clp.min != null
    && evento.rango_mercado_clp.max != null
  ) {
    partes.push(
      `En la red: ${formatearMontoCLP(evento.rango_mercado_clp.min)} – ${formatearMontoCLP(evento.rango_mercado_clp.max)}`,
    );
  }
  return partes.join(' · ');
}

export const EventoTimelineRow = React.memo(function EventoTimelineRow({
  evento,
  last,
}: {
  evento: HistorialRedEvento;
  last?: boolean;
}) {
  const meta = metaEvento(evento);

  return (
    <View style={styles.eventoRow}>
      <View style={styles.rail}>
        <View style={[styles.dot, evento.taller_es_propio ? styles.dotPropio : styles.dotRed]} />
        {last ? null : <View style={styles.stem} />}
      </View>
      <View style={[styles.eventoBody, !last && styles.eventoBodyBorder]}>
        <View style={styles.eventoTop}>
          <InstitutionalText role="captionBold" color="ink">
            {formatearFechaEvento(evento.fecha)}
          </InstitutionalText>
          <InstitutionalTag
            label={evento.taller_es_propio ? 'Tu taller' : evento.taller_nombre || 'Taller de la red'}
            variant={evento.taller_es_propio ? 'success' : 'neutral'}
            size="sm"
          />
        </View>
        <InstitutionalText role="h5" color="ink">
          {evento.servicio_nombre || 'Servicio'}
        </InstitutionalText>
        {meta ? (
          <InstitutionalText role="caption" color="muted">
            {meta}
          </InstitutionalText>
        ) : null}
      </View>
    </View>
  );
});

type Props = {
  patente: string;
  enabled?: boolean;
  /** En sheet el fondo ya es paper: sin cards anidadas. En pantalla, papers sobre canvas. */
  superficie?: 'canvas' | 'sheet';
};

function IdentidadHistorial({
  vehiculoTxt,
  total,
  tonal,
}: {
  vehiculoTxt: string;
  total: number;
  tonal?: boolean;
}) {
  const conteo = total === 1
    ? '1 servicio registrado en la red'
    : `${total} servicios registrados en la red`;

  return (
    <View style={[styles.identidad, tonal && styles.identidadTonal]}>
      <View style={hostIconPlateStyle}>
        <Car size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
      </View>
      <View style={styles.identidadCopy}>
        <InstitutionalText role="label" color="muted">
          FICHA DEL AUTO
        </InstitutionalText>
        <InstitutionalText role="h5" color="ink" numberOfLines={2}>
          {vehiculoTxt || 'Vehículo de esta patente'}
        </InstitutionalText>
        <InstitutionalText role="caption" color="muted">
          {conteo}
        </InstitutionalText>
      </View>
    </View>
  );
}

/** Historial clínico de la red por patente: misma fuente en pantalla y sheet. */
export function HistorialRedContenido({
  patente,
  enabled = true,
  superficie = 'canvas',
}: Props) {
  const valida = patenteHistorialValida(patente);
  const { data, isPending, isError, refetch } = useHistorialRedQuery(
    valida && enabled ? patente : undefined,
  );

  const grupos = useMemo(() => {
    const eventos = data?.eventos || [];
    const map = new Map<string, HistorialRedEvento[]>();
    for (const evento of eventos) {
      const anio = anioDeFecha(evento.fecha);
      const lista = map.get(anio) || [];
      lista.push(evento);
      map.set(anio, lista);
    }
    return Array.from(map.entries());
  }, [data?.eventos]);

  const vehiculoTxt = [data?.vehiculo?.marca, data?.vehiculo?.modelo, data?.vehiculo?.anio]
    .filter(Boolean)
    .join(' ')
    .trim();
  const total = data?.eventos?.length ?? 0;
  const enSheet = superficie === 'sheet';

  if (!valida) {
    return (
      <View style={styles.centered}>
        <InstitutionalText role="h5">Indica una patente válida</InstitutionalText>
        <InstitutionalText role="caption" color="muted">
          El historial de la red se consulta con una patente chilena (5 a 8 caracteres).
        </InstitutionalText>
      </View>
    );
  }

  if (isPending && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={I.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <InstitutionalText role="h5">No pudimos cargar el historial</InstitutionalText>
        <InstitutionalButton
          label="Reintentar"
          variant="outline"
          size="compact"
          onPress={() => void refetch()}
        />
      </View>
    );
  }

  const identidad = (
    <IdentidadHistorial vehiculoTxt={vehiculoTxt} total={total} tonal={enSheet} />
  );

  const timeline = grupos.length === 0 ? (
    <HostEmptyState
      icon={ClipboardList}
      title="Sin servicios de la red"
      description="Aún no hay servicios de la red para esta patente."
    />
  ) : (
    grupos.map(([anio, eventos]) => {
      const filas = eventos.map((evento, idx) => (
        <EventoTimelineRow
          key={evento.evento_id}
          evento={evento}
          last={idx === eventos.length - 1}
        />
      ));
      return (
        <View key={anio} style={styles.anioBlock}>
          <HostSectionKicker label={anio} style={styles.anioKicker} />
          {enSheet ? <View>{filas}</View> : <HostPaperSection>{filas}</HostPaperSection>}
        </View>
      );
    })
  );

  return (
    <View style={styles.lista}>
      {enSheet ? identidad : <HostPaperSection>{identidad}</HostPaperSection>}
      {timeline}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: {
    gap: SPACING.fixed.md,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.sm,
    padding: SPACING.fixed.lg,
    minHeight: 160,
  },
  identidad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  identidadTonal: {
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.sm,
  },
  identidadCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  anioBlock: {
    gap: SPACING.fixed.xs,
  },
  anioKicker: {
    marginTop: 0,
    marginBottom: 0,
  },
  eventoRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.fixed.sm,
  },
  rail: {
    width: 12,
    alignItems: 'center',
    paddingTop: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotPropio: {
    backgroundColor: I.ink,
  },
  dotRed: {
    backgroundColor: I.muted,
  },
  stem: {
    flex: 1,
    width: 1,
    marginTop: 4,
    backgroundColor: I.hairline,
  },
  eventoBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    paddingBottom: SPACING.fixed.md,
  },
  eventoBodyBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    marginBottom: SPACING.fixed.sm,
  },
  eventoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
});

export default HistorialRedContenido;
