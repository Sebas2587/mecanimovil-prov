import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, CarFront, Clock } from 'lucide-react-native';
import { InstitutionalText } from '@/design-system/components/InstitutionalText';
import { BORDERS, COLORS, SHADOWS, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/design-system/iconography';
import { useCotizacionesCanalTallerQuery } from '@/hooks/useCotizacionesCanalTallerQuery';
import { AgendarCitaSheet } from '@/components/taller/AgendarCitaSheet';
import { useAgendaCalendarioQuery } from '@/hooks/useAgendaCalendarioQuery';
import type { CitaAgendaPersonal, EventoAgendaUnificado } from '@/services/agendaProveedorService';
import { agendaProveedorService } from '@/services/agendaProveedorService';
import { carrilDeCita } from '@/utils/tableroTaller';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { estadoCotizacionVista, fechaCortaCotizacion, fechaLargaCotizacion } from '@/utils/cotizacionPresentacion';
import type { CotizacionCanal } from '@/services/cotizacionCanalService';
import { openCitaPersonalDetalle, openOfertaDetalle } from '@/utils/navigateProveedorDetalle';

function eventoDeCita(cita: CitaAgendaPersonal): EventoAgendaUnificado {
  const detalle = cita.detalle;
  return {
    id: String(cita.id),
    origen: 'personal',
    etiqueta: detalle?.servicio_nombre || 'Cita',
    fecha_servicio: (cita.fecha_servicio || '').slice(0, 10),
    hora_servicio: (cita.hora_servicio || '').slice(0, 5),
    estado: cita.estado,
    editable: cita.estado === 'activa',
    tiene_checklist: Boolean(cita.checklist_id),
    checklist_id: cita.checklist_id ?? null,
    checklist_estado: cita.checklist_estado ?? null,
    cliente_nombre: detalle?.cliente_nombre,
    cliente_telefono: detalle?.cliente_telefono,
    vehiculo_marca: detalle?.vehiculo_marca,
    vehiculo_modelo: detalle?.vehiculo_modelo,
    vehiculo_patente: detalle?.vehiculo_patente,
    vehiculo_anio: detalle?.vehiculo_anio,
    servicio_nombre: detalle?.servicio_nombre,
    descripcion: detalle?.descripcion,
  };
}

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
  const citasActivas = useQuery({
    queryKey: ['citas-activas-proveedor'],
    queryFn: async () => {
      const result = await agendaProveedorService.obtenerCitasActivas();
      if (!result.success || !result.data) return [];
      return result.data;
    },
  });

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

  const listas = useMemo(() => {
    const desdeCitas = (citasActivas.data ?? [])
      .filter((cita) => !cita.horario_por_confirmar)
      .map(eventoDeCita);
    const clavesPersonales = new Set(desdeCitas.map((evento) => `personal-${evento.id}`));
    const calendario = new Map<string, EventoAgendaUnificado>();
    for (const evento of [...mesActual.eventos, ...mesProx.eventos]) {
      calendario.set(`${evento.origen}-${evento.id}`, evento);
    }
    const comerciales = citasActivas.isSuccess
      ? desdeCitas
      : citasAgendadas.map((evento) => {
        const cal = calendario.get(`${evento.origen}-${evento.id}`);
        const checklistId = cal?.checklist_id ?? null;
        const estadoCita = (cal?.estado || '').toLowerCase();
        if (estadoCita === 'cerrada' || CANCELADOS.has(estadoCita)) return null;
        return {
          ...evento,
          fecha_servicio: evento.fecha_servicio || cal?.fecha_servicio || '',
          hora_servicio: evento.hora_servicio || cal?.hora_servicio || '',
          checklist_id: checklistId,
          checklist_estado: cal?.checklist_estado ?? null,
          tiene_checklist: Boolean(checklistId),
        };
      }).filter((evento): evento is EventoAgendaUnificado => evento != null);
    const clavesComerciales = new Set(comerciales.map((evento) => `${evento.origen}-${evento.id}`));
    const extras = soloEnAgenda
      ? []
      : [...mesActual.eventos, ...mesProx.eventos].filter((evento) => {
        const clave = `${evento.origen}-${evento.id}`;
        if (clavesComerciales.has(clave) || clavesPersonales.has(clave)) return false;
        return evento.origen !== 'personal';
      });

    const proximas: EventoAgendaUnificado[] = [];
    const pasaron: EventoAgendaUnificado[] = [];
    const esperandoFirma: EventoAgendaUnificado[] = [];
    const enTaller: EventoAgendaUnificado[] = [];
    for (const evento of [...comerciales, ...extras]) {
      const carril = carrilDeCita({
        estado: evento.estado,
        fecha: evento.fecha_servicio,
        checklistId: evento.checklist_id,
        checklistEstado: evento.checklist_estado,
        hoy,
      });
      if (carril === 'esperando_firma') esperandoFirma.push(evento);
      else if (carril === 'en_taller') enTaller.push(evento);
      else if (carril === 'sin_registro') pasaron.push(evento);
      else if (carril === 'proxima') proximas.push(evento);
    }
    const porFecha = (a: EventoAgendaUnificado, b: EventoAgendaUnificado) => {
      const fa = a.fecha_servicio || '9999-99-99';
      const fb = b.fecha_servicio || '9999-99-99';
      return `${fa}${a.hora_servicio}`.localeCompare(`${fb}${b.hora_servicio}`);
    };
    proximas.sort(porFecha);
    pasaron.sort((a, b) => porFecha(b, a));
    esperandoFirma.sort((a, b) => porFecha(b, a));
    enTaller.sort((a, b) => porFecha(b, a));
    const agrupar = (eventos: EventoAgendaUnificado[]) => {
      const grupos = new Map<string, EventoAgendaUnificado[]>();
      for (const evento of eventos) {
        const lista = grupos.get(evento.fecha_servicio) ?? [];
        lista.push(evento);
        grupos.set(evento.fecha_servicio, lista);
      }
      return Array.from(grupos.entries());
    };
    return {
      proximas: agrupar(proximas),
      pasaron: agrupar(pasaron),
      esperandoFirma: agrupar(esperandoFirma),
      enTaller: agrupar(enTaller),
    };
  }, [citasActivas.data, citasActivas.isSuccess, citasAgendadas, hoy, mesActual.eventos, mesProx.eventos, soloEnAgenda]);

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

      {!soloPorAgendar && listas.esperandoFirma.length > 0 ? (
        <View style={styles.bloque}>
          <InstitutionalText role="h4">Esperando firma del cliente</InstitutionalText>
          <InstitutionalText role="caption" color="body">
            El trabajo ya está registrado. Envía el enlace: la cita se cierra cuando el cliente firma.
          </InstitutionalText>
          {listas.esperandoFirma.map(([fecha, eventos]) => (
            <View key={`firma-${fecha}`} style={styles.dia}>
              <InstitutionalText role="captionBold" color="body">
                {fecha ? fechaLargaCotizacion(fecha) : 'Día por confirmar'}
              </InstitutionalText>
              {eventos.map((evento) => (
                <CitaFila
                  key={`${evento.origen}-${evento.id}`}
                  evento={evento}
                  marca="Falta la firma"
                  onPress={abrirEvento}
                />
              ))}
            </View>
          ))}
        </View>
      ) : null}

      {!soloPorAgendar && listas.enTaller.length > 0 ? (
        <View style={styles.bloque}>
          <InstitutionalText role="h4">En el taller</InstitutionalText>
          <InstitutionalText role="caption" color="body">
            El servicio ya empezó y sigue abierto, aunque el día de la cita haya pasado.
          </InstitutionalText>
          {listas.enTaller.map(([fecha, eventos]) => (
            <View key={`taller-${fecha}`} style={styles.dia}>
              <InstitutionalText role="captionBold" color="body">
                {fecha ? fechaLargaCotizacion(fecha) : 'Día por confirmar'}
              </InstitutionalText>
              {eventos.map((evento) => (
                <CitaFila
                  key={`${evento.origen}-${evento.id}`}
                  evento={evento}
                  marca={evento.checklist_estado === 'PENDIENTE_FIRMA_SUPERVISOR' ? 'Falta la revisión' : 'En el taller'}
                  onPress={abrirEvento}
                />
              ))}
            </View>
          ))}
        </View>
      ) : null}

      {!soloPorAgendar && listas.pasaron.length > 0 ? (
        <View style={styles.bloque}>
          <InstitutionalText role="h4">Pasaron sin registro</InstitutionalText>
          <InstitutionalText role="caption" color="body">
            El día ya pasó y el servicio no se inició. El cliente todavía no tiene un informe que firmar.
          </InstitutionalText>
          {listas.pasaron.map(([fecha, eventos]) => (
            <View key={`paso-${fecha}`} style={styles.dia}>
              <InstitutionalText role="captionBold" color="body">
                {fecha ? fechaLargaCotizacion(fecha) : 'Día por confirmar'}
              </InstitutionalText>
              {eventos.map((evento) => (
                <CitaFila
                  key={`${evento.origen}-${evento.id}`}
                  evento={evento}
                  marca="Pasó sin registro"
                  onPress={abrirEvento}
                />
              ))}
            </View>
          ))}
        </View>
      ) : null}

      {!soloPorAgendar && listas.proximas.length > 0 ? <View style={styles.bloque}>
        <InstitutionalText role="h4">{soloEnAgenda ? 'En agenda' : 'Próximas citas'}</InstitutionalText>
        {listas.proximas.map(([fecha, eventos]) => (
          <View key={fecha || 'sin-dia'} style={styles.dia}>
            <InstitutionalText role="captionBold" color="body">
              {fecha ? fechaLargaCotizacion(fecha) : 'Día por confirmar'}
            </InstitutionalText>
            {eventos.map((evento) => (
              <CitaFila key={`${evento.origen}-${evento.id}`} evento={evento} onPress={abrirEvento} />
            ))}
          </View>
        ))}
      </View> : null}

      {!soloPorAgendar && listas.proximas.length === 0 && listas.pasaron.length === 0 && listas.enTaller.length === 0 && listas.esperandoFirma.length === 0 ? (
        <View style={styles.bloque}>
          <InstitutionalText role="h4">{soloEnAgenda ? 'En agenda' : 'Próximas citas'}</InstitutionalText>
          <View style={styles.vacio}>
            <InstitutionalText role="caption" color="body">
              {soloEnAgenda ? 'No hay citas en la agenda.' : 'Aún no hay citas programadas.'}
            </InstitutionalText>
          </View>
        </View>
      ) : null}

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
  marca,
}: {
  evento: EventoAgendaUnificado;
  onPress: (evento: EventoAgendaUnificado) => void;
  marca?: string;
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
        {marca ? (
          <InstitutionalText role="captionBold" color="muted">{marca}</InstitutionalText>
        ) : null}
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
