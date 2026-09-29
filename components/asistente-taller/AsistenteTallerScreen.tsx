import React, { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { HostAvatar, InstitutionalButton, InstitutionalText } from '@/app/design-system/components';
import { COLORS, SHADOWS, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { useAlerts } from '@/context/AlertsContext';
import { useAuth } from '@/context/AuthContext';
import { useAgendaCalendarioQuery } from '@/hooks/useAgendaCalendarioQuery';
import { usePipelineComercialQuery } from '@/hooks/usePipelineComercialQuery';
import type { EventoAgendaUnificado } from '@/services/agendaProveedorService';
import type { PipelineComercialItem } from '@/services/pipelineComercialService';
import { ComposerAsistente } from '@/components/asistente-taller/ComposerAsistente';
import { FraseDia } from '@/components/asistente-taller/FraseDia';
import { ejecutarVerbo } from '@/components/asistente-taller/ejecutarVerbo';
import { FilaLeads } from '@/components/asistente-taller/FilaLeads';
import { openCitaPersonalDetalle, openOfertaDetalle } from '@/utils/navigateProveedorDetalle';
import { fraseDelDia } from '@/utils/asistenteTaller/fraseDia';
import { HiloAgente, type HiloResumen, type TurnoAgente } from '@/components/asistente-taller/HiloAgente';
import {
  filasRendimiento,
  fraseHaciendo,
  planificarConsulta,
} from '@/utils/asistenteTaller/agenteConsulta';
import { decisionesDePipeline, type LeadDecision } from '@/utils/asistenteTaller/verboLead';
import { kpisProveedorService } from '@/services/kpisProveedorService';
import agenteIaService from '@/services/agenteIaService';
import { abrirWhatsAppCotizacion } from '@/utils/compartirCotizacionCliente';

const I = COLORS.institutional;

type Burbuja = {
  id: string;
  rol: 'asistente' | 'dueno';
  texto: string;
};

type DiaProps = {
  fecha: Date;
  eventos: EventoAgendaUnificado[];
  filtroMecanico?: string | null;
  onCambiarDia: (fecha: Date) => void;
  onCerrar: () => void;
  onPressEvento: (evento: EventoAgendaUnificado) => void;
};

type Props = {
  enabled: boolean;
  alertas: number;
};

function idMensaje(): string {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const PreguntaDos = React.memo(function PreguntaDos({
  ids,
  leads,
  onElegir,
}: {
  ids: string[];
  leads: LeadDecision[];
  onElegir: (id: string) => void;
}) {
  return (
    <View style={styles.pregunta}>
      {ids.map((id) => {
        const lead = leads.find((item) => item.id === id);
        if (!lead) return null;
        return (
          <Pressable key={id} onPress={() => onElegir(id)} style={styles.opcion}>
            <InstitutionalText role="captionBold">
              {lead.quien}{lead.auto ? ` · ${lead.auto}` : ''}
            </InstitutionalText>
          </Pressable>
        );
      })}
    </View>
  );
});

export function AsistenteTallerScreen({ enabled, alertas }: Props) {
  const queryClient = useQueryClient();
  const { usuario, obtenerNombreProveedor } = useAuth();
  const { saludSuscripcion } = useAlerts();
  const hiloRef = useRef<ScrollView>(null);
  const [mes, setMes] = useState(() => new Date());
  const [anclaId, setAnclaId] = useState<string | null>(null);
  const [diaAbierto, setDiaAbierto] = useState<Date | null>(null);
  const [filtroMecanico, setFiltroMecanico] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Burbuja[]>([]);
  const [chatAbierto, setChatAbierto] = useState(false);
  const [turnos, setTurnos] = useState<TurnoAgente[]>([]);
  const [memoriaIds, setMemoriaIds] = useState<string[]>([]);
  const [hilos, setHilos] = useState<HiloResumen[]>([]);
  const [hiloId, setHiloId] = useState<number | null>(null);
  const chatListo = useRef(false);
  const [preguntaIds, setPreguntaIds] = useState<string[] | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [Dia, setDia] = useState<React.ComponentType<DiaProps> | null>(null);

  const pipeline = usePipelineComercialQuery(
    { limite: 100, fetchAllEstados: true },
    { enabled },
  );
  const agenda = useAgendaCalendarioQuery({
    mesActual: mes,
    miembroFiltro: null,
    enabled,
  });

  const leads = useMemo(
    () => decisionesDePipeline(pipeline.data?.results ?? []),
    [pipeline.data?.results],
  );
  const porId = useMemo(() => {
    const map = new Map<string, PipelineComercialItem>();
    for (const item of pipeline.data?.results ?? []) map.set(item.entidad_id, item);
    return map;
  }, [pipeline.data?.results]);

  const frase = useMemo(() => fraseDelDia(agenda.eventos), [agenda.eventos]);
  const ancla = leads.find((lead) => lead.id === anclaId) ?? null;

  const decir = useCallback((rol: Burbuja['rol'], texto: string) => {
    const id = idMensaje();
    setMensajes((prev) => (
      prev.some((mensaje) => mensaje.id === id)
        ? prev
        : [...prev, { id, rol, texto }]
    ));
  }, []);

  const abrirDia = useCallback((fecha: Date, mecanico?: string) => {
    setDiaAbierto(fecha);
    setFiltroMecanico(mecanico ?? null);
    setMes((prev) => (
      prev.getFullYear() === fecha.getFullYear() && prev.getMonth() === fecha.getMonth()
        ? prev
        : new Date(fecha.getFullYear(), fecha.getMonth(), 1)
    ));
  }, []);

  useEffect(() => {
    if (!diaAbierto || Dia) return;
    let vivo = true;
    void import('@/components/asistente-taller/CalendarioDia').then((mod) => {
      if (vivo) setDia(() => mod.CalendarioDia);
    });
    return () => {
      vivo = false;
    };
  }, [Dia, diaAbierto]);

  const correrVerbo = useCallback(async (lead: LeadDecision, verbo = lead.verbo) => {
    const item = porId.get(lead.id);
    if (!item) {
      decir('asistente', 'Ese caso ya no está en la fila.');
      return;
    }
    setOcupado(true);
    try {
      const resultado = await ejecutarVerbo(verbo, item, queryClient);
      decir('asistente', resultado.texto);
      if (resultado.abrirDia) abrirDia(new Date());
      void queryClient.invalidateQueries({ queryKey: ['pipeline-comercial'] });
    } catch {
      decir('asistente', `No pude completar el paso de ${lead.quien}.`);
    } finally {
      setOcupado(false);
    }
  }, [abrirDia, decir, porId, queryClient]);

  const onAnclar = useCallback((id: string) => {
    const lead = leads.find((item) => item.id === id);
    setAnclaId(id);
    setPreguntaIds(null);
    if (lead) void correrVerbo(lead);
  }, [correrVerbo, leads]);

  const onSoltarAncla = useCallback(() => setAnclaId(null), []);

  const onAbrirChat = useCallback(() => {
    if (chatListo.current) return;
    chatListo.current = true;
    startTransition(() => setChatAbierto(true));
  }, []);

  const cargarHilos = useCallback(async () => {
    try {
      const lista = await agenteIaService.listarHilosDueno();
      setHilos(lista.map((hilo) => ({ id: hilo.id, titulo: hilo.titulo })));
    } catch {
      setHilos([]);
    }
  }, []);

  useEffect(() => {
    if (!chatAbierto) return;
    void cargarHilos();
  }, [cargarHilos, chatAbierto]);

  const onCerrarChat = useCallback(() => {
    chatListo.current = false;
    setChatAbierto(false);
    setTurnos([]);
    setHiloId(null);
  }, []);

  const onNuevaConversacion = useCallback(() => {
    setHiloId(null);
    setTurnos([]);
    setMemoriaIds([]);
  }, []);

  const onElegirHilo = useCallback(async (id: number) => {
    setHiloId(id);
    try {
      const hilo = await agenteIaService.obtenerHiloDueno(id);
      const siguientes: TurnoAgente[] = [];
      let pregunta = '';
      for (const mensaje of hilo.mensajes) {
        if (mensaje.rol === 'dueno') {
          if (pregunta) {
            siguientes.push({ id: `h-${mensaje.id}`, pregunta, haciendo: null, resultado: null });
          }
          pregunta = mensaje.texto;
          continue;
        }
        const vista = mensaje.vista;
        siguientes.push({
          id: `h-${mensaje.id}`,
          pregunta: pregunta || mensaje.texto,
          haciendo: null,
          resultado: vista && (vista.titulo || vista.resumen)
            ? {
              titulo: vista.titulo || 'Agente del taller',
              resumen: vista.resumen || mensaje.texto,
              filas: vista.filas || [],
            }
            : {
              titulo: 'Agente del taller',
              resumen: mensaje.texto,
              filas: [],
            },
        });
        pregunta = '';
      }
      if (pregunta) {
        siguientes.push({ id: `h-abierto-${id}`, pregunta, haciendo: null, resultado: null });
      }
      setTurnos(siguientes);
    } catch {
      setTurnos([]);
    }
  }, []);

  const onSubmit = useCallback(async (texto: string) => {
    chatListo.current = true;
    setChatAbierto(true);
    const id = idMensaje();
    setTurnos((prev) => [...prev, {
      id,
      pregunta: texto,
      haciendo: fraseHaciendo(texto),
      resultado: null,
    }]);
    const items = pipeline.data?.results ?? [];
    const historial = turnos.slice(-8).flatMap((turno) => {
      const filas = [{ rol: 'dueno' as const, texto: turno.pregunta }];
      if (turno.resultado?.resumen) {
        filas.push({ rol: 'agente' as const, texto: turno.resultado.resumen });
      }
      return filas;
    });
    try {
      const remoto = await agenteIaService.consultarDueno({
        texto,
        historial,
        hilo_id: hiloId,
      });
      if (remoto.ok) {
        if (remoto.hilo_id) setHiloId(remoto.hilo_id);
        void cargarHilos();
        setMemoriaIds(remoto.memoria_ids || []);
        setTurnos((prev) => prev.map((turno) => (
          turno.id === id
            ? {
              ...turno,
              haciendo: null,
              resultado: {
                titulo: remoto.titulo,
                resumen: remoto.resumen,
                filas: remoto.filas || [],
              },
            }
            : turno
        )));
        return;
      }
    } catch {
      /* El agente remoto no respondió: se usa el contexto que ya está en el teléfono. */
    }
    const plan = planificarConsulta({
      texto,
      items,
      eventos: agenda.eventos,
      memoriaIds,
    });
    let resultado = plan.resultado;
    if (plan.pideRendimiento) {
      setOcupado(true);
      try {
        const respuesta = await kpisProveedorService.obtenerResumen(30);
        resultado = respuesta.success && respuesta.data
          ? {
            titulo: 'Rendimiento del taller',
            resumen: `Score ${respuesta.data.score_rendimiento}% en los últimos ${respuesta.data.ventana_dias} días.`,
            filas: filasRendimiento(respuesta.data),
          }
          : {
            titulo: 'Rendimiento del taller',
            resumen: 'No pude leer el rendimiento ahora.',
            filas: [],
          };
      } finally {
        setOcupado(false);
      }
    }
    const accion = plan.accion;
    if (accion?.tipo === 'mensaje') {
      const item = items.find((row) => `${row.tipo_entidad}:${row.entidad_id}` === accion.id);
      if (item?.cliente_telefono) {
        await abrirWhatsAppCotizacion({
          telefono: item.cliente_telefono,
          mensaje: accion.texto,
          url: '',
        });
      }
    }
    if (accion?.tipo === 'agendar' && accion.ids[0]) {
      const lead = leads.find((item) => item.id === accion.ids[0]);
      if (lead) void correrVerbo(lead, 'agendar');
    }
    setMemoriaIds(plan.memoriaIds);
    setTurnos((prev) => prev.map((turno) => (
      turno.id === id ? { ...turno, haciendo: null, resultado } : turno
    )));
  }, [agenda.eventos, cargarHilos, correrVerbo, hiloId, leads, memoriaIds, pipeline.data?.results]);

  const onSinVoz = useCallback(() => {
    decir('asistente', 'En este teléfono escribe el pedido. El micrófono transcribe cuando el navegador puede escucharte.');
  }, [decir]);

  const onElegirPregunta = useCallback((id: string) => {
    const lead = leads.find((item) => item.id === id);
    setPreguntaIds(null);
    if (!lead) return;
    setAnclaId(id);
    void correrVerbo(lead);
  }, [correrVerbo, leads]);

  const onPressEvento = useCallback((evento: EventoAgendaUnificado) => {
    if (evento.origen === 'personal') {
      openCitaPersonalDetalle(router, queryClient, Number(evento.id));
      return;
    }
    if (evento.oferta_proveedor_id) {
      openOfertaDetalle(router, queryClient, evento.oferta_proveedor_id);
    } else if (evento.orden_id) {
      router.push(`/orden-detalle/${evento.orden_id}`);
    }
  }, [queryClient]);

  const onAbrirHoy = useCallback(() => abrirDia(new Date()), [abrirDia]);
  const onCambiarDia = useCallback((fecha: Date) => {
    abrirDia(fecha, filtroMecanico ?? undefined);
  }, [abrirDia, filtroMecanico]);

  const placeholder = chatAbierto
    ? 'Sigue sobre este resultado'
    : 'Pregunta o pide algo del taller';
  const nombreTaller = obtenerNombreProveedor();
  const fotoPerfil = (usuario as { foto_perfil?: string } | null)?.foto_perfil;
  const saludoHora = (() => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return 'Buenos días';
    if (hora >= 12 && hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
  })();
  const avisoSuscripcion = Boolean(
    saludSuscripcion
    && saludSuscripcion.estado_salud !== 'ok'
    && saludSuscripcion.estado_salud !== 'sin_suscripcion'
    && saludSuscripcion.mensaje,
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      hiloRef.current?.scrollToEnd({ animated: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [mensajes, diaAbierto, preguntaIds]);

  const aviso = avisoSuscripcion ? (
    <Pressable
      onPress={() => {
        if (saludSuscripcion?.accion) router.push(saludSuscripcion.accion as never);
      }}
      accessibilityRole="button"
    >
      <InstitutionalText role="caption" color="muted" style={styles.centrado}>
        {saludSuscripcion?.mensaje}
      </InstitutionalText>
    </Pressable>
  ) : null;

  const anclaBar = ancla ? (
    <Animated.View
      entering={FadeInDown.duration(280)}
      exiting={FadeOut.duration(160)}
      layout={LinearTransition.duration(280)}
      style={styles.ancla}
    >
      <View style={styles.anclaTexto}>
        <InstitutionalText role="bodyBold">{ancla.quien}</InstitutionalText>
        {ancla.telefono && ancla.telefono !== ancla.quien ? (
          <InstitutionalText role="caption" color="muted">
            {ancla.telefono}
          </InstitutionalText>
        ) : null}
        {ancla.auto ? (
          <InstitutionalText role="caption">{ancla.auto}</InstitutionalText>
        ) : null}
        {ancla.pedido ? (
          <InstitutionalText role="caption" color="muted" numberOfLines={2}>
            {ancla.pedido}
          </InstitutionalText>
        ) : null}
      </View>
      <Pressable
        onPress={() => void correrVerbo(ancla)}
        disabled={ocupado}
        style={({ pressed }) => [styles.verboAncla, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <InstitutionalText role="captionBold" color="primary">
          {ancla.verboLabel}
        </InstitutionalText>
      </Pressable>
      <Pressable
        onPress={onSoltarAncla}
        style={({ pressed }) => [styles.cerrar, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Soltar caso"
        hitSlop={8}
      >
        <X size={16} color={I.body} strokeWidth={ICON_STROKE_WIDTH} />
      </Pressable>
    </Animated.View>
  ) : null;

  const leadsCargando = pipeline.isPending && !pipeline.data;
  const fila = (
    <FilaLeads
      leads={leads}
      anclaId={anclaId}
      onAnclar={onAnclar}
      compacta={Boolean(ancla)}
      cargando={leadsCargando}
    />
  );
  const composer = (
    <ComposerAsistente
      placeholder={placeholder}
      disabled={ocupado}
      onSubmit={onSubmit}
      onSinVoz={onSinVoz}
      onInteract={onAbrirChat}
    />
  );

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.top}>
        <View style={styles.header}>
          <HostAvatar name={nombreTaller} uri={fotoPerfil} size="lg" />
          <View style={styles.headerTexto}>
            <InstitutionalText role="caption" color="muted">
              {saludoHora}
            </InstitutionalText>
            <InstitutionalText role="h4" numberOfLines={1}>
              {nombreTaller}
            </InstitutionalText>
          </View>
          <Pressable
            onPress={() => router.push('/notificaciones')}
            accessibilityRole="button"
            accessibilityLabel="Avisos"
            style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
          >
            <Bell size={20} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            {alertas > 0 ? <View style={styles.dot} /> : null}
          </Pressable>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.cuerpo}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={chatAbierto ? styles.barraArriba : styles.barraAbajo}>
          {composer}
        </View>
        <View style={chatAbierto ? styles.zonaChat : styles.zona}>
          {chatAbierto ? (
            <HiloAgente
              turnos={turnos}
              hilos={hilos}
              hiloId={hiloId}
              onCerrar={onCerrarChat}
              onNueva={onNuevaConversacion}
              onElegir={(id) => { void onElegirHilo(id); }}
            />
          ) : (
        <ScrollView
          ref={hiloRef}
          style={styles.flex}
          contentContainerStyle={styles.hilo}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {agenda.loading && agenda.eventos.length === 0 && !frase ? (
            <ActivityIndicator color={I.muted} />
          ) : null}
          {!diaAbierto && frase ? <FraseDia frase={frase} onPress={onAbrirHoy} /> : null}
          <InstitutionalButton
            label="Nueva cotización"
            onPress={() => router.push('/cotizar-ia')}
          />
          <View style={styles.seccion}>
            <InstitutionalText role="caption" color="muted">
              {leads.length === 0 ? 'Leads' : `Leads · ${leads.length}`}
            </InstitutionalText>
          </View>
          {leadsCargando ? fila : leads.length === 0 ? (
            <InstitutionalText role="body" color="muted">
              Sin leads abiertos.
            </InstitutionalText>
          ) : fila}
          {aviso}
          {diaAbierto && Dia ? (
            <Animated.View entering={FadeIn.duration(280)} exiting={FadeOut.duration(180)}>
              <Dia
                fecha={diaAbierto}
                eventos={agenda.eventos}
                filtroMecanico={filtroMecanico}
                onCambiarDia={onCambiarDia}
                onCerrar={() => setDiaAbierto(null)}
                onPressEvento={onPressEvento}
              />
            </Animated.View>
          ) : null}
          {diaAbierto && !Dia ? <ActivityIndicator color={I.muted} /> : null}
          {mensajes.map((mensaje) => (
            <Animated.View
              key={mensaje.id}
              entering={FadeIn.duration(220)}
              style={mensaje.rol === 'dueno' ? styles.dueno : styles.asistente}
            >
              <InstitutionalText role="body">
                {mensaje.texto}
              </InstitutionalText>
            </Animated.View>
          ))}
          {preguntaIds ? (
            <PreguntaDos ids={preguntaIds} leads={leads} onElegir={onElegirPregunta} />
          ) : null}
          {anclaBar}
        </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: I.canvas,
  },
  flex: {
    flex: 1,
    minHeight: 0,
  },
  top: {
    flexShrink: 0,
    zIndex: 2,
    backgroundColor: I.canvas,
  },
  header: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    minHeight: 56,
    paddingHorizontal: SPACING.fixed.lg,
    paddingBottom: SPACING.fixed.sm,
  },
  headerTexto: {
    flex: 1,
    gap: 0,
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.surfaceStrong,
  },
  dot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: I.primary,
  },
  hilo: {
    paddingHorizontal: SPACING.fixed.lg,
    paddingTop: SPACING.fixed.md,
    paddingBottom: SPACING.fixed.lg,
    gap: SPACING.fixed.md,
  },
  centrado: {
    textAlign: 'center',
  },
  seccion: {
    marginTop: SPACING.fixed.xs,
  },
  cuerpo: {
    flex: 1,
    minHeight: 0,
  },
  zona: {
    flex: 1,
    minHeight: 0,
    order: 1,
  },
  zonaChat: {
    flex: 1,
    minHeight: 0,
    order: 2,
    backgroundColor: I.paper,
  },
  barraAbajo: {
    order: 2,
    flexShrink: 0,
    paddingHorizontal: SPACING.fixed.lg,
    paddingTop: SPACING.fixed.xs,
    paddingBottom: SPACING.fixed.sm,
    backgroundColor: I.canvas,
  },
  barraArriba: {
    order: 1,
    flexShrink: 0,
    zIndex: 3,
    paddingHorizontal: SPACING.fixed.lg,
    paddingTop: SPACING.fixed.sm,
    paddingBottom: SPACING.fixed.sm,
    backgroundColor: I.paper,
  },
  asistente: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
  },
  dueno: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    backgroundColor: I.surfaceSoft,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  pressed: {
    opacity: 0.85,
  },
  pregunta: {
    gap: SPACING.fixed.sm,
  },
  opcion: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
    borderRadius: 999,
    backgroundColor: I.surfaceSoft,
  },
  ancla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: 16,
    backgroundColor: I.paper,
    ...SHADOWS.editorial,
  },
  anclaTexto: {
    flex: 1,
    gap: 2,
  },
  verboAncla: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  cerrar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
