import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { BottomSheet } from '@/design-system/components/BottomSheet';
import { InstitutionalText } from '@/design-system/components/InstitutionalText';
import { BORDERS, COLORS, SPACING } from '@/app/design-system/tokens';
import { useEquipoTallerQuery } from '@/hooks/useEquipoTallerQuery';
import { PIPELINE_COMERCIAL_QUERY_KEY } from '@/hooks/usePipelineComercialQuery';
import { COTIZACIONES_CANAL_QUERY_KEY } from '@/hooks/useCotizacionesCanalTallerQuery';
import cotizacionCanalService from '@/services/cotizacionCanalService';
import {
  agendaProveedorService,
  type CitaAgendaPersonal,
} from '@/services/agendaProveedorService';
import {
  obtenerDisponibilidadConDuracion,
  obtenerDiasDisponiblesAgenda,
  parseDisponibilidadRangoAgenda,
} from '@/services/disponibilidadProveedorService';
import {
  mecanicoCompatibleConTipoServicio,
  type MiembroTaller,
} from '@/services/equipoTallerService';
import {
  calcularDuracionMinutos,
  slotsDespuesDe,
  sumarMinutosAHora,
} from '@/utils/citaPersonalHorario';
import { parseFechaLocal } from '@/utils/fechaLocal';
import { formatDateApi } from '@/components/solicitudes/CatalogoFechaHoraPickers';
import { fechaLargaCotizacion } from '@/utils/cotizacionPresentacion';
import { showAlert } from '@/utils/platformAlert';

const I = COLORS.institutional;
const TALLER = -1;

type Props = {
  visible: boolean;
  citaId?: number | null;
  cotizacionId?: number | null;
  nombre?: string;
  servicio?: string;
  onClose: () => void;
};

const HORAS_BASE = ['09:00', '10:00', '11:00', '12:00', '13:00', '15:00', '16:00', '17:00', '18:00'];

function horaCorta(hora: string): string {
  return hora.slice(0, 5);
}

function sugerirFin(grilla: string[], inicio: string, duracion: number): string | null {
  const objetivo = sumarMinutosAHora(inicio, duracion);
  const posteriores = slotsDespuesDe(inicio, grilla);
  return posteriores.find((slot) => slot >= objetivo) ?? posteriores[posteriores.length - 1] ?? null;
}

function horasVisibles(grilla: string[]): string[] {
  const enPunto = grilla.filter((slot) => horaCorta(slot).endsWith(':00'));
  return enPunto.length >= 4 ? enPunto : grilla;
}

export function AgendarCitaSheet({
  visible,
  citaId,
  cotizacionId,
  nombre,
  servicio: servicioProp,
  onClose,
}: Props) {
  const queryClient = useQueryClient();
  const equipo = useEquipoTallerQuery(visible);
  const diasIniciales = useMemo(() => diasLocales(), []);
  const [cita, setCita] = useState<CitaAgendaPersonal | null>(null);
  const [dias, setDias] = useState<string[]>(diasIniciales);
  const [fecha, setFecha] = useState<string | null>(diasIniciales[0] ?? null);
  const [mecanicoId, setMecanicoId] = useState<number | null>(null);
  const [grillas, setGrillas] = useState<Record<number, string[]>>({});
  const [grillaTaller, setGrillaTaller] = useState<string[]>(HORAS_BASE);
  const [inicio, setInicio] = useState<string | null>(null);
  const [fin, setFin] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [duracion, setDuracion] = useState(60);

  const mecanicos = useMemo(() => {
    const tipo = cita?.tipo_servicio === 'domicilio' ? 'domicilio' : 'taller';
    return (equipo.data?.miembros ?? []).filter(
      (miembro) => miembro.rol === 'mecanico'
        && miembro.activo
        && mecanicoCompatibleConTipoServicio(miembro, tipo),
    );
  }, [cita?.tipo_servicio, equipo.data?.miembros]);

  const hayEquipo = mecanicos.length > 0;
  const grillaMecanico = mecanicoId != null && mecanicoId > 0 ? grillas[mecanicoId] : undefined;
  const grillaActiva = !hayEquipo || mecanicoId === TALLER || mecanicoId == null
    ? grillaTaller
    : (grillaMecanico && grillaMecanico.length > 0 ? grillaMecanico : grillaTaller);
  const horas = horasVisibles(grillaActiva);
  const finSugerido = inicio ? sugerirFin(grillaActiva, inicio, duracion) : null;
  const servicio = cita?.detalle.servicio_nombre
    || cita?.detalle.servicio_nombre_resuelto
    || servicioProp
    || 'el trabajo';
  const tituloCliente = cita?.detalle.cliente_nombre || nombre || 'Cliente';

  useEffect(() => {
    if (!visible) return;
    const locales = diasLocales();
    setDias(locales);
    setFecha(locales[0] ?? null);
    setCita(null);
    setMecanicoId(null);
    setInicio(null);
    setFin(null);
    setGrillas({});
    setGrillaTaller(HORAS_BASE);

    let cancelado = false;
    void (async () => {
      try {
        let id = citaId ?? null;
        let duracionCotizacion: number | null = null;
        if (cotizacionId) {
          const cotizacion = await cotizacionCanalService.obtener(cotizacionId);
          duracionCotizacion = cotizacion.duracion_minutos_estimada ?? null;
          if (!id) id = cotizacion.cita_personal_id ?? null;
        }
        if (!id && cotizacionId) {
          const activas = await agendaProveedorService.obtenerCitasActivas();
          id = activas.data?.find((item) => item.cotizacion_canal_origen_id === cotizacionId)?.id ?? null;
        }
        if (cancelado) return;
        if (duracionCotizacion) setDuracion(Math.max(30, duracionCotizacion));
        if (!id) return;
        const respuesta = await agendaProveedorService.obtenerCita(id);
        if (cancelado || !respuesta.success || !respuesta.data) return;
        setCita(respuesta.data);
        if (respuesta.data.duracion_minutos) {
          setDuracion(Math.max(30, respuesta.data.duracion_minutos));
        }
      } catch {
        /* El calendario local sigue usable mientras tanto. */
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [citaId, cotizacionId, visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelado = false;
    const modalidad = cita?.tipo_servicio === 'domicilio' ? 'a_domicilio' as const : 'en_taller' as const;
    void obtenerDiasDisponiblesAgenda({
      ofertaServicioId: cita?.detalle.oferta_servicio_id ?? undefined,
      modalidad,
      dias: 21,
      contexto: 'agenda_personal',
    }).then((data) => {
      if (cancelado) return;
      const fechas = (data.fechas_disponibles ?? []).slice().sort();
      if (fechas.length === 0) return;
      setDias(fechas);
      setFecha((actual) => (actual && fechas.includes(actual) ? actual : fechas[0]));
    }).catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [cita?.detalle.oferta_servicio_id, cita?.tipo_servicio, visible]);

  useEffect(() => {
    setInicio(null);
    setFin(null);
  }, [fecha]);

  useEffect(() => {
    if (!visible || !fecha) return;
    let cancelado = false;
    const modalidad = cita?.tipo_servicio === 'domicilio' ? 'a_domicilio' as const : 'en_taller' as const;
    const oferta = cita?.detalle.oferta_servicio_id ?? undefined;
    void (async () => {
      try {
        const taller = await obtenerDisponibilidadConDuracion({
          fecha,
          ofertaServicioId: oferta,
          modalidad,
          contexto: 'agenda_personal',
        });
        if (cancelado) return;
        const grilla = parseDisponibilidadRangoAgenda(taller).grillaHoraria;
        if (grilla.length > 0) setGrillaTaller(grilla);
        if (mecanicos.length === 0) return;
        const filas = await Promise.all(mecanicos.map(async (miembro) => {
          const data = await obtenerDisponibilidadConDuracion({
            fecha,
            ofertaServicioId: oferta,
            modalidad,
            miembroTallerId: miembro.id,
            contexto: 'agenda_personal',
          });
          return [miembro.id, parseDisponibilidadRangoAgenda(data).grillaHoraria] as const;
        }));
        if (!cancelado) setGrillas(Object.fromEntries(filas));
      } catch {
        /* Se mantiene la grilla que ya está en pantalla. */
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [cita?.detalle.oferta_servicio_id, cita?.tipo_servicio, fecha, mecanicos, visible]);

  const elegirInicio = useCallback((slot: string) => {
    const sugerido = sugerirFin(grillaActiva, slot, duracion);
    setInicio(slot);
    setFin(sugerido);
  }, [duracion, grillaActiva]);

  const confirmar = useCallback(async () => {
    if (!fecha || !inicio || !fin) return;
    setGuardando(true);
    try {
      let citaLista = cita;
      if (!citaLista) {
        let id = citaId ?? null;
        if (!id && cotizacionId) {
          const cotizacion = await cotizacionCanalService.obtener(cotizacionId);
          id = cotizacion.cita_personal_id ?? null;
        }
        if (!id && cotizacionId) {
          const activas = await agendaProveedorService.obtenerCitasActivas();
          id = activas.data?.find((item) => item.cotizacion_canal_origen_id === cotizacionId)?.id ?? null;
        }
        if (!id) {
          showAlert('Todavía no se puede confirmar', 'Abre la cotización aceptada y vuelve a agendar desde ahí.');
          return;
        }
        const respuestaCita = await agendaProveedorService.obtenerCita(id);
        if (!respuestaCita.success || !respuestaCita.data) {
          showAlert('No se pudo agendar', 'No encontramos la cita de esta cotización.');
          return;
        }
        citaLista = respuestaCita.data;
      }
      const payload = {
        fecha_servicio: fecha,
        hora_servicio: inicio.length === 5 ? `${inicio}:00` : inicio,
        duracion_minutos: calcularDuracionMinutos(inicio, fin),
        tipo_servicio: citaLista.tipo_servicio,
        miembro_taller: mecanicoId != null && mecanicoId > 0 ? mecanicoId : null,
        detalle: {
          cliente_nombre: citaLista.detalle.cliente_nombre,
          cliente_telefono: citaLista.detalle.cliente_telefono,
          vehiculo_marca: citaLista.detalle.vehiculo_marca,
          vehiculo_modelo: citaLista.detalle.vehiculo_modelo,
          vehiculo_patente: citaLista.detalle.vehiculo_patente,
          servicio_nombre: citaLista.detalle.servicio_nombre || citaLista.detalle.servicio_nombre_resuelto,
          descripcion: citaLista.detalle.descripcion,
          direccion: citaLista.detalle.direccion,
          precio_referencia: citaLista.detalle.precio_referencia,
          oferta_servicio_id: citaLista.detalle.oferta_servicio_id,
        },
      };
      const validacion = await agendaProveedorService.validarSlot({
        ...payload,
        excluir_cita_id: citaLista.id,
      });
      if (!validacion.success || !validacion.data?.valido) {
        showAlert('Horario no disponible', validacion.data?.error || validacion.message || 'Elige otro horario.');
        return;
      }
      const respuesta = await agendaProveedorService.actualizarCita(citaLista.id, payload);
      if (!respuesta.success || !respuesta.data) {
        showAlert('No se pudo agendar', respuesta.message || 'Revisa el horario e inténtalo de nuevo.');
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['agenda-calendario'] }),
        queryClient.invalidateQueries({ queryKey: [PIPELINE_COMERCIAL_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: [COTIZACIONES_CANAL_QUERY_KEY] }),
      ]);
      onClose();
    } catch {
      showAlert('No se pudo agendar', 'Revisa el horario e inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  }, [cita, citaId, cotizacionId, fecha, fin, inicio, mecanicoId, onClose, queryClient]);

  const resumen = inicio && fin && fecha
    ? `${fechaLargaCotizacion(fecha)}, ${horaCorta(inicio)}–${horaCorta(fin)}`
    : 'Elige un horario';

  return (
    <BottomSheet visible={visible} onClose={onClose} stickyFooter style={styles.sheet}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.cuerpo} showsVerticalScrollIndicator={false}>
        <View>
          <InstitutionalText role="h3">Agendar cita</InstitutionalText>
          <InstitutionalText role="caption" color="body">
            {[tituloCliente, cita?.numero_publico].filter(Boolean).join(' · ')}
          </InstitutionalText>
        </View>

        <>
            <View style={styles.bloque}>
              <InstitutionalText role="bodyBold">¿Qué día?</InstitutionalText>
              <View
                style={styles.dias}
                {...(Platform.OS === 'web'
                  ? {
                      onWheel: (event: { currentTarget: unknown; nativeEvent: { deltaX?: number; deltaY?: number } }) => {
                        const nodo = event.currentTarget as { scrollLeft: number };
                        const vertical = event.nativeEvent.deltaY ?? 0;
                        const horizontal = event.nativeEvent.deltaX ?? 0;
                        if (Math.abs(vertical) > Math.abs(horizontal)) nodo.scrollLeft += vertical;
                      },
                    }
                  : null)}
              >
                {dias.map((iso) => {
                  const dia = parseFechaLocal(iso);
                  const activo = iso === fecha;
                  return (
                    <Pressable
                      key={iso}
                      onPress={() => setFecha(iso)}
                      style={[styles.dia, activo && styles.diaOn]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: activo }}
                    >
                      <InstitutionalText role="caption" color={activo ? 'onPrimary' : 'body'}>
                        {dia ? nombreDia(dia) : ''}
                      </InstitutionalText>
                      <InstitutionalText role="h4" color={activo ? 'onPrimary' : 'ink'}>
                        {dia ? String(dia.getDate()) : ''}
                      </InstitutionalText>
                      <InstitutionalText role="caption" color={activo ? 'onPrimary' : 'body'}>
                        {dia ? nombreMes(dia) : ''}
                      </InstitutionalText>
                  </Pressable>
                );
                })}
              </View>
            </View>

            {hayEquipo ? (
              <View style={styles.bloque}>
                <InstitutionalText role="bodyBold">¿Quién lo atiende?</InstitutionalText>
                <InstitutionalText role="caption" color="body">
                  Para {servicio}. Se muestran los mecánicos con agenda libre ese día y habilidades afines.
                </InstitutionalText>
                {mecanicos.length === 0 ? (
                  <InstitutionalText role="caption" color="body">
                    No hay mecánicos con agenda para este servicio. Se usa la agenda del taller.
                  </InstitutionalText>
                ) : (
                  <View style={styles.mecanicos}>
                    {mecanicos.map((miembro) => (
                      <MecanicoChip
                        key={miembro.id}
                        miembro={miembro}
                        activo={mecanicoId === miembro.id}
                        onPress={setMecanicoId}
                      />
                    ))}
                  </View>
                )}
                {grillaTaller.length > 0 ? (
                  <Pressable onPress={() => setMecanicoId(TALLER)} accessibilityRole="button">
                    <InstitutionalText role="captionBold" color={mecanicoId === TALLER ? 'ink' : 'primary'}>
                      Usar la agenda del taller
                    </InstitutionalText>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <View style={styles.bloque}>
                <View style={styles.bloqueHead}>
                  <InstitutionalText role="bodyBold">¿A qué hora?</InstitutionalText>
                  {fecha ? (
                    <InstitutionalText role="caption" color="body">{fechaLargaCotizacion(fecha)}</InstitutionalText>
                  ) : null}
                </View>
                {horas.length === 0 ? (
                  <InstitutionalText role="caption" color="body">No hay horarios libres este día.</InstitutionalText>
                ) : (
                  <View style={styles.horas}>
                    {horas.map((slot) => {
                      const activo = horaCorta(slot) === horaCorta(inicio || '');
                      return (
                        <Pressable
                          key={slot}
                          onPress={() => elegirInicio(horaCorta(slot))}
                          style={[styles.hora, activo && styles.horaOn]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: activo }}
                        >
                          <InstitutionalText role="captionBold" color={activo ? 'onPrimary' : 'ink'}>
                            {horaCorta(slot)}
                          </InstitutionalText>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                {inicio && finSugerido ? (
                  <InstitutionalText role="caption" color="body">
                    Sugerido para este trabajo: {horaCorta(inicio)}–{horaCorta(finSugerido)} ({duracion} min). Puedes alargar el término.
                  </InstitutionalText>
                ) : null}
                {inicio ? (
                  <View style={styles.horas}>
                    {slotsDespuesDe(inicio, horas).map((slot) => {
                      const activo = horaCorta(slot) === horaCorta(fin || '');
                      return (
                        <Pressable
                          key={`fin-${slot}`}
                          onPress={() => setFin(horaCorta(slot))}
                          style={[styles.hora, activo && styles.horaOn]}
                          accessibilityRole="button"
                        >
                          <InstitutionalText role="captionBold" color={activo ? 'onPrimary' : 'ink'}>
                            hasta {horaCorta(slot)}
                          </InstitutionalText>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
            </View>
        </>
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.footerCopy}>
          <InstitutionalText role="captionBold" numberOfLines={2}>{resumen}</InstitutionalText>
          <InstitutionalText role="caption" color="body" numberOfLines={1}>{servicio}</InstitutionalText>
        </View>
        <Pressable
          onPress={() => void confirmar()}
          disabled={!inicio || !fin || guardando}
          style={[styles.confirmar, (!inicio || !fin || guardando) && styles.confirmarOff]}
          accessibilityRole="button"
          accessibilityLabel="Confirmar cita"
        >
          {guardando ? (
            <ActivityIndicator color={I.onPrimary} />
          ) : (
            <InstitutionalText role="captionBold" color="onPrimary">Confirmar</InstitutionalText>
          )}
        </Pressable>
      </View>
    </BottomSheet>
  );
}

function diasLocales(): string[] {
  const dias: string[] = [];
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  while (dias.length < 14) {
    if (cursor.getDay() !== 0) dias.push(formatDateApi(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

function nombreDia(dia: Date): string {
  return dia.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', '');
}

function nombreMes(dia: Date): string {
  return dia.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '');
}

const MecanicoChip = React.memo(function MecanicoChip({
  miembro,
  activo,
  onPress,
}: {
  miembro: MiembroTaller;
  activo: boolean;
  onPress: (id: number) => void;
}) {
  const handlePress = useCallback(() => onPress(miembro.id), [miembro.id, onPress]);
  const habilidades = (miembro.especialidades_detalle ?? []).map((item) => item.nombre).slice(0, 3).join(' · ');
  return (
    <Pressable
      onPress={handlePress}
      style={[styles.mecanico, activo && styles.mecanicoOn]}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
    >
      <InstitutionalText role="captionBold" color={activo ? 'onPrimary' : 'ink'}>
        {miembro.nombre}
      </InstitutionalText>
      {habilidades ? (
        <InstitutionalText role="caption" color={activo ? 'onPrimary' : 'body'} numberOfLines={2}>
          {habilidades}
        </InstitutionalText>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  sheet: {
    maxWidth: 560,
  },
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  cuerpo: {
    gap: SPACING.fixed.lg,
    paddingBottom: SPACING.fixed.md,
  },
  bloque: {
    gap: SPACING.fixed.sm,
  },
  bloqueHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
  dias: {
    flexDirection: 'row',
    gap: SPACING.fixed.xs,
    paddingBottom: 4,
    ...(Platform.OS === 'web'
      ? ({
          overflowX: 'auto',
          overflowY: 'hidden',
          width: '100%',
          maxWidth: '100%',
        } as object)
      : null),
  },
  dia: {
    width: 64,
    flexShrink: 0,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.lg,
    paddingVertical: 12,
  },
  diaOn: {
    backgroundColor: I.ink,
    borderColor: I.ink,
  },
  mecanicos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
  },
  mecanico: {
    minWidth: 140,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.fixed.sm,
    gap: 2,
  },
  mecanicoOn: {
    backgroundColor: I.ink,
    borderColor: I.ink,
  },
  horas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
  },
  hora: {
    minWidth: 88,
    minHeight: 48,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horaOn: {
    backgroundColor: I.ink,
    borderColor: I.ink,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.sm,
  },
  footerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  confirmar: {
    minHeight: 48,
    paddingHorizontal: SPACING.fixed.lg,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmarOff: {
    opacity: 0.4,
  },
});
