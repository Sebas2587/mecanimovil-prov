import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, CarFront, Clock } from 'lucide-react-native';
import { InstitutionalText } from '@/design-system/components/InstitutionalText';
import { BORDERS, COLORS, SHADOWS, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/design-system/iconography';
import { useCotizacionesCanalTallerQuery } from '@/hooks/useCotizacionesCanalTallerQuery';
import { AgendarCitaSheet } from '@/components/taller/AgendarCitaSheet';
import { useAgendaCalendarioQuery } from '@/hooks/useAgendaCalendarioQuery';
import type { EventoAgendaUnificado } from '@/services/agendaProveedorService';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { estadoCotizacionVista, fechaCortaCotizacion, fechaLargaCotizacion } from '@/utils/cotizacionPresentacion';
import type { CotizacionCanal } from '@/services/cotizacionCanalService';
import { parseFechaLocal, startOfDay } from '@/utils/fechaLocal';
import { openCitaPersonalDetalle, openOfertaDetalle } from '@/utils/navigateProveedorDetalle';

function eventoDeCotizacionAgendada(cotizacion: CotizacionCanal): EventoAgendaUnificado | null {
  if (estadoCotizacionVista(cotizacion) !== 'agendada') return null;
  const fecha = (cotizacion.fecha_agendada || '').slice(0, 10);
  return {
    id: String(cotizacion.cita_personal_id ?? `cot-${cotizacion.id}`),
    origen: 'personal',
    etiqueta: cotizacion.servicio_nombre || 'Cita',
    fecha_servicio: fecha,
    hora_servicio: cotizacion.hora_agendada || '',
    estado: 'activa',
    editable: true,
    tiene_checklist: false,
    cliente_nombre: cotizacion.cliente_nombre,
    vehiculo_marca: cotizacion.vehiculo_marca,
    vehiculo_modelo: cotizacion.vehiculo_modelo,
    vehiculo_patente: cotizacion.vehiculo_patente,
    servicio_nombre: cotizacion.servicio_nombre,
  };
}

const I = COLORS.institutional;
const CANCELADOS = new Set(['cancelada', 'cancelado', 'rechazada', 'rechazado']);

type PendienteAgenda = {
  key: string;
  nombre: string;
  meta: string;
  cuando: string;
  citaId: number | null;
  cotizacionId: number | null;
};

export function AgendaComercial() {
  const { width } = useWindowDimensions();
  const ancha = width >= 768;
  const params = useLocalSearchParams<{ vista?: string | string[] }>();
  const vistaParam = Array.isArray(params.vista) ? params.vista[0] : params.vista;
  const soloPorAgendar = vistaParam === 'por_agendar';
  const soloEnAgenda = vistaParam === 'en_agenda';
  const queryClient = useQueryClient();
  const [agenda, setAgenda] = useState<{
    citaId?: number | null;
    cotizacionId?: number | null;
    nombre?: string;
    servicio?: string;
  } | null>(null);
  const hoy = useMemo(() => new Date(), []);
  const mesSiguiente = useMemo(
    () => new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1),
    [hoy],
  );
  const cotizaciones = useCotizacionesCanalTallerQuery();
  const mesActual = useAgendaCalendarioQuery({ mesActual: hoy, miembroFiltro: null });
  const mesProx = useAgendaCalendarioQuery({ mesActual: mesSiguiente, miembroFiltro: null });

  const porAgendar = useMemo(() => {
    return (cotizaciones.data ?? [])
      .filter((cotizacion) => estadoCotizacionVista(cotizacion) === 'aceptada')
      .map((cotizacion): PendienteAgenda => ({
        key: `cot-${cotizacion.id}`,
        nombre: cotizacion.cliente_nombre?.trim() || 'Cliente',
        meta: [
          cotizacion.servicio_nombre,
          [cotizacion.vehiculo_marca, cotizacion.vehiculo_modelo, cotizacion.vehiculo_patente].filter(Boolean).join(' '),
          cotizacion.total_clp ? formatearMontoCLP(cotizacion.total_clp) : '',
        ].filter(Boolean).join(' · '),
        cuando: cotizacion.aceptada_en ? `Aceptada el ${fechaCortaCotizacion(cotizacion.aceptada_en)}` : '',
        citaId: cotizacion.cita_personal_id ?? null,
        cotizacionId: cotizacion.id,
      }));
  }, [cotizaciones.data]);

  const citasAgendadas = useMemo(
    () => (cotizaciones.data ?? []).flatMap((cotizacion) => {
      const evento = eventoDeCotizacionAgendada(cotizacion);
      return evento ? [evento] : [];
    }),
    [cotizaciones.data],
  );

  const porDia = useMemo(() => {
    const vistos = new Set<string>();
    const base = soloEnAgenda
      ? citasAgendadas
      : [...mesActual.eventos, ...mesProx.eventos, ...citasAgendadas];
    const eventos = base.filter((evento) => {
      if (vistos.has(`${evento.origen}-${evento.id}`)) return false;
      vistos.add(`${evento.origen}-${evento.id}`);
      if (CANCELADOS.has(String(evento.estado || '').toLowerCase())) return false;
      if (soloEnAgenda) return true;
      const dia = parseFechaLocal(evento.fecha_servicio);
      return dia != null && dia.getTime() >= startOfDay(hoy).getTime();
    });
    eventos.sort((a, b) => `${a.fecha_servicio}${a.hora_servicio}`.localeCompare(`${b.fecha_servicio}${b.hora_servicio}`));
    const grupos = new Map<string, EventoAgendaUnificado[]>();
    for (const evento of eventos) {
      const lista = grupos.get(evento.fecha_servicio) ?? [];
      lista.push(evento);
      grupos.set(evento.fecha_servicio, lista);
    }
    return Array.from(grupos.entries());
  }, [citasAgendadas, hoy, mesActual.eventos, mesProx.eventos, soloEnAgenda]);

  const agendar = useCallback((row: PendienteAgenda) => {
    if (row.citaId || row.cotizacionId) {
      setAgenda({
        citaId: row.citaId,
        cotizacionId: row.cotizacionId,
        nombre: row.nombre,
        servicio: row.meta,
      });
      return;
    }
    router.push('/(tabs)/cotizaciones?estado=aceptada');
  }, []);
  const cerrarAgenda = useCallback(() => setAgenda(null), []);

  const abrirEvento = useCallback((evento: EventoAgendaUnificado) => {
    if (String(evento.id).startsWith('cot-')) {
      router.push(`/cotizacion-canal/${String(evento.id).slice(4)}`);
      return;
    }
    if (evento.origen === 'personal') {
      openCitaPersonalDetalle(router, queryClient, Number(evento.id));
      return;
    }
    if (evento.oferta_proveedor_id) {
      openOfertaDetalle(router, queryClient, evento.oferta_proveedor_id);
      return;
    }
    if (evento.orden_id) {
      router.push(`/servicio-detalle/${evento.orden_id}`);
      return;
    }
    router.push('/(tabs)/calendario');
  }, [queryClient]);

  return (
    <View style={styles.wrap}>
      <View style={styles.intro}>
        <InstitutionalText role="h1">Agenda</InstitutionalText>
        <InstitutionalText role="caption" color="body">
          Cotizaciones aceptadas y citas programadas en el taller
        </InstitutionalText>
      </View>

      {!soloEnAgenda ? <View style={styles.bloque}>
        <View style={styles.bloqueHead}>
          <InstitutionalText role="h4">Por agendar</InstitutionalText>
          <InstitutionalText role="caption" color="body">{porAgendar.length} aceptadas</InstitutionalText>
        </View>
        {porAgendar.length === 0 ? (
          <View style={styles.vacio}>
            <InstitutionalText role="caption" color="body">
              Todas las cotizaciones aceptadas ya tienen fecha. Buen trabajo.
            </InstitutionalText>
          </View>
        ) : ancha ? (
          <View style={styles.grilla}>
            {porAgendar.map((row) => (
              <PendienteCard key={row.key} row={row} onAgendar={agendar} ancha />
            ))}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carrusel}>
            {porAgendar.map((row) => (
              <PendienteCard key={row.key} row={row} onAgendar={agendar} ancha={false} />
            ))}
          </ScrollView>
        )}
      </View> : null}

      {!soloPorAgendar ? <View style={styles.bloque}>
        <InstitutionalText role="h4">{soloEnAgenda ? 'En agenda' : 'Próximas citas'}</InstitutionalText>
        {porDia.length === 0 ? (
          <View style={styles.vacio}>
            <InstitutionalText role="caption" color="body">
              {soloEnAgenda ? 'No hay citas en la agenda.' : 'Aún no hay citas programadas.'}
            </InstitutionalText>
          </View>
        ) : (
          porDia.map(([fecha, eventos]) => (
            <View key={fecha} style={styles.dia}>
              <InstitutionalText role="captionBold" color="body">
                {fechaLargaCotizacion(fecha)}
              </InstitutionalText>
              {eventos.map((evento) => (
                <CitaFila key={`${evento.origen}-${evento.id}`} evento={evento} onPress={abrirEvento} />
              ))}
            </View>
          ))
        )}
      </View> : null}

      <AgendarCitaSheet
        visible={agenda != null}
        citaId={agenda?.citaId}
        cotizacionId={agenda?.cotizacionId}
        nombre={agenda?.nombre}
        servicio={agenda?.servicio}
        onClose={cerrarAgenda}
      />
    </View>
  );
}

const PendienteCard = memo(function PendienteCard({
  row,
  onAgendar,
  ancha,
}: {
  row: PendienteAgenda;
  onAgendar: (row: PendienteAgenda) => void;
  ancha: boolean;
}) {
  const handlePress = useCallback(() => onAgendar(row), [onAgendar, row]);
  return (
    <View style={[styles.pendiente, ancha && styles.pendienteAncha]}>
      <View style={styles.pendienteMedia}>
        <CarFront size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
      </View>
      <View style={styles.pendienteCopy}>
        <InstitutionalText role="bodyBold" numberOfLines={1}>{row.nombre}</InstitutionalText>
        <InstitutionalText role="caption" color="body" numberOfLines={2}>{row.meta}</InstitutionalText>
        {row.cuando ? (
          <InstitutionalText role="caption" color="body">{row.cuando}</InstitutionalText>
        ) : null}
        <Pressable onPress={handlePress} style={styles.agendar} accessibilityRole="button">
          <CalendarCheck size={16} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
          <InstitutionalText role="captionBold" color="onPrimary">Agendar cita</InstitutionalText>
        </Pressable>
      </View>
    </View>
  );
});

const CitaFila = memo(function CitaFila({
  evento,
  onPress,
}: {
  evento: EventoAgendaUnificado;
  onPress: (evento: EventoAgendaUnificado) => void;
}) {
  const handlePress = useCallback(() => onPress(evento), [evento, onPress]);
  const vehiculo = [evento.vehiculo_marca, evento.vehiculo_modelo, evento.vehiculo_patente]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable onPress={handlePress} style={styles.cita} accessibilityRole="button">
      <View style={styles.hora}>
        <Clock size={14} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
        <InstitutionalText role="captionBold">{(evento.hora_servicio || '').slice(0, 5)}</InstitutionalText>
      </View>
      <View style={styles.citaCopy}>
        <InstitutionalText role="bodyBold" numberOfLines={1}>
          {evento.cliente_nombre || 'Cliente'}
        </InstitutionalText>
        <InstitutionalText role="caption" color="body" numberOfLines={1}>
          {evento.servicio_nombre || evento.etiqueta}
        </InstitutionalText>
        {vehiculo ? (
          <InstitutionalText role="caption" color="body" numberOfLines={1}>{vehiculo}</InstitutionalText>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: SPACING.fixed.xl,
    paddingTop: SPACING.fixed.md,
  },
  intro: {
    gap: 4,
  },
  grilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.md,
  },
  pendienteAncha: {
    width: '48%',
    flexGrow: 1,
  },
  bloque: {
    gap: SPACING.fixed.sm,
  },
  bloqueHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  vacio: {
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.surfaceSoft,
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.lg,
  },
  carrusel: {
    gap: SPACING.fixed.sm,
    paddingRight: SPACING.fixed.md,
  },
  pendiente: {
    width: 280,
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.paper,
    overflow: 'hidden',
    ...SHADOWS.editorial,
  },
  pendienteMedia: {
    height: 88,
    backgroundColor: I.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendienteCopy: {
    gap: SPACING.fixed.sm,
    padding: SPACING.fixed.md,
  },
  agendar: {
    minHeight: 44,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dia: {
    gap: SPACING.fixed.sm,
  },
  cita: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.paper,
    padding: SPACING.fixed.sm,
  },
  hora: {
    width: 64,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: SPACING.fixed.sm,
  },
  citaCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
