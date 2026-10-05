import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FilePenLine,
  MessageCircle,
  Send,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { usePipelineComercialQuery } from '@/hooks/usePipelineComercialQuery';
import { useCotizacionesCanalTallerQuery } from '@/hooks/useCotizacionesCanalTallerQuery';
import { useAgenteBorradoresPendientesQuery } from '@/hooks/useAgenteIaQueries';
import { CHAT_INBOX_QUERY_KEY, useChatInboxQuery } from '@/hooks/useChatInboxQuery';
import { invalidateProveedorComercialQueries } from '@/utils/invalidateProveedorComercial';
import websocketService from '@/app/services/websocketService';
import { InstitutionalText } from '@/design-system/components/InstitutionalText';
import { BORDERS, COLORS, SHADOWS, SPACING, TYPOGRAPHY, withOpacity } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/design-system/iconography';
import type { PipelineComercialItem } from '@/services/pipelineComercialService';
import type { CotizacionCanal } from '@/services/cotizacionCanalService';
import type { InboxChatItem } from '@/services/omnichannelService';
import { obtenerNombreSeguro } from '@/services/ordenesProveedor';
import { navegarAtencionHoy } from '@/utils/navegarCasoPipeline';
import { pasoDeCaso } from '@/utils/pasoComercial';
import { estadoCotizacionVista } from '@/utils/cotizacionPresentacion';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import {
  HOME_DECISIONES_QUERY_KEY,
  resumenDecision,
  tituloDecision,
  useHomeDecisionesQuery,
  type Decision,
} from './HomeDecisionesMarketplace';

const I = COLORS.institutional;
const WIDE_METRICS = 720;
const WIDE_SPLIT = 960;

interface HomeAttentionFeedProps {
  enabled?: boolean;
  refreshing?: boolean;
  onRefreshFeed?: () => void;
  onAgendar?: () => void;
}

type VerboAccion = 'Agendar' | 'Revisar' | 'Aceptar' | 'Seguir';

type AccionHoy = {
  id: string;
  titulo: string;
  meta: string;
  verbo: VerboAccion;
  icono: 'agenda' | 'revisar' | 'aceptar' | 'seguir';
};

type ActividadHoy = {
  id: string;
  nombre: string;
  detalle: string;
  folio: string;
};

type MetricaHoy = {
  id: string;
  label: string;
  value: number;
  icon: LucideIcon;
  accent: boolean;
  href: Href;
};

const ORDEN_VERBO: Record<VerboAccion, number> = {
  Agendar: 0,
  Aceptar: 1,
  Revisar: 2,
  Seguir: 3,
};

function saludo(nombre: string): string {
  const hora = new Date().getHours();
  const momento = hora >= 5 && hora < 12
    ? 'Buenos días'
    : hora >= 12 && hora < 19
      ? 'Buenas tardes'
      : 'Buenas noches';
  const limpio = nombre.trim();
  return limpio ? `${momento}, ${limpio}` : momento;
}

function fechaLarga(ahora = new Date()): string {
  const texto = ahora.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }).replace('.', '');
}

function unirMeta(partes: Array<string | null | undefined>): string {
  return partes.map((parte) => parte?.trim()).filter(Boolean).join(' · ');
}

function metaCaso(row: PipelineComercialItem, extra?: string): string {
  const monto = row.monto_clp != null && row.monto_clp > 0 ? formatearMontoCLP(row.monto_clp) : '';
  return unirMeta([row.servicio_resumen, row.vehiculo_resumen, monto, extra]);
}

function chatEsperaCliente(chat: InboxChatItem): boolean {
  if (chat.contacto_rol === 'casa_repuestos' || chat.contacto_rol === 'otro') return false;
  return Boolean(chat.cliente_sin_responder) || (chat.mensajes_no_leidos || 0) > 0;
}

function fraseMensajes(cantidad: number): string {
  if (cantidad <= 0) {
    return 'Nadie está esperando respuesta. Cuando un cliente escriba, la IA arma el borrador y tú lo revisas antes de enviarlo.';
  }
  if (cantidad === 1) {
    return 'Hay 1 cliente esperando. Responde en el chat y la IA actualizará su cotización.';
  }
  return `Hay ${cantidad} clientes esperando. Responde en el chat y la IA actualizará su cotización.`;
}

function idDecision(item: Decision): string {
  return item.kind === 'orden' ? `aceptar-orden-${item.orden.id}` : `aceptar-oferta-${item.oferta.id}`;
}

export function HomeAttentionFeed({
  enabled = true,
  refreshing = false,
  onRefreshFeed,
}: HomeAttentionFeedProps) {
  const { width } = useWindowDimensions();
  const metricasAnchadas = width >= WIDE_METRICS;
  const columnas = width >= WIDE_SPLIT;
  const queryClient = useQueryClient();
  const { obtenerNombreProveedor } = useAuth();
  const accionesRef = useRef<Map<string, () => void>>(new Map());

  const pipelineQuery = usePipelineComercialQuery(
    { limite: 100, fetchAllEstados: true },
    { enabled },
  );
  const cotizacionesQuery = useCotizacionesCanalTallerQuery(enabled);
  const borradoresQuery = useAgenteBorradoresPendientesQuery(enabled);
  const decisionesQuery = useHomeDecisionesQuery(enabled);
  const chatsQuery = useChatInboxQuery(enabled);

  const modelo = useMemo(() => {
    const accionesMapa = new Map<string, () => void>();
    const acciones: AccionHoy[] = [];
    const filas = pipelineQuery.data?.results ?? [];
    const cotizacionesEnPipeline = new Set(
      filas.map((row) => row.cotizacion_id).filter((id): id is number => id != null),
    );

    const cotizaciones = cotizacionesQuery.data ?? [];
    let porRevisar = cotizaciones.filter((cotizacion) => estadoCotizacionVista(cotizacion) === 'borrador').length;
    let esperando = cotizaciones.filter((cotizacion) => estadoCotizacionVista(cotizacion) === 'enviada').length;
    const porAgendar = cotizaciones.filter((cotizacion) => estadoCotizacionVista(cotizacion) === 'aceptada').length;
    const enAgenda = cotizaciones.filter((cotizacion) => estadoCotizacionVista(cotizacion) === 'agendada').length;

    for (const row of filas) {
      const paso = pasoDeCaso(row);
      const nombre = row.cliente_nombre?.trim() || 'Cliente';
      if (paso === 'por_agendar') {
        const id = `agendar-${row.tipo_entidad}-${row.entidad_id}`;
        accionesMapa.set(id, () => navegarAtencionHoy(row));
        acciones.push({
          id,
          titulo: `Agendar a ${nombre}`,
          meta: metaCaso(row),
          verbo: 'Agendar',
          icono: 'agenda',
        });
        continue;
      }
      if (paso === 'por_enviar') {
        const id = `revisar-${row.tipo_entidad}-${row.entidad_id}`;
        accionesMapa.set(id, () => navegarAtencionHoy(row));
        acciones.push({
          id,
          titulo: `Revisar cotización para ${nombre}`,
          meta: metaCaso(row, fechaCorta(row.fecha_referencia) ? `creada ${fechaCorta(row.fecha_referencia)}` : ''),
          verbo: 'Revisar',
          icono: 'revisar',
        });
        continue;
      }
      if (paso === 'esperando') {
        const enviada = row.estado_normalizado === 'cotizacion_enviada'
          || row.estado_normalizado === 'en_negociacion';
        if (!enviada) continue;
        if (row.esperando_respuesta_24h || row.demorado_48h) {
          const id = `seguir-${row.tipo_entidad}-${row.entidad_id}`;
          accionesMapa.set(id, () => navegarAtencionHoy(row));
          acciones.push({
            id,
            titulo: `Dar seguimiento a ${nombre}`,
            meta: metaCaso(row),
            verbo: 'Seguir',
            icono: 'seguir',
          });
        }
        continue;
      }
    }

    for (const cotizacion of cotizaciones) {
      if (cotizacion.estado !== 'borrador' || !cotizacion.id) continue;
      if (cotizacionesEnPipeline.has(cotizacion.id)) continue;
      const id = `enviar-${cotizacion.id}`;
      const cotizacionId = cotizacion.id;
      accionesMapa.set(id, () => {
        router.push(`/cotizacion-canal/${cotizacionId}`);
      });
      acciones.push({
        id,
        titulo: `Revisar cotización para ${cotizacion.cliente_nombre?.trim() || 'el cliente'}`,
        meta: metaCotizacion(cotizacion),
        verbo: 'Revisar',
        icono: 'revisar',
      });
    }

    for (const decision of decisionesQuery.data ?? []) {
      const id = idDecision(decision);
      accionesMapa.set(id, () => abrirDecision(decision));
      const cliente = clienteDecision(decision);
      acciones.push({
        id,
        titulo: cliente ? `Aceptar pedido de ${cliente}` : `Aceptar ${tituloDecision(decision)}`,
        meta: resumenDecision(decision) || tituloDecision(decision),
        verbo: 'Aceptar',
        icono: 'aceptar',
      });
    }

    acciones.sort((a, b) => ORDEN_VERBO[a.verbo] - ORDEN_VERBO[b.verbo]);

    const actividad: ActividadHoy[] = [...filas]
      .sort((a, b) => (b.fecha_referencia || '').localeCompare(a.fecha_referencia || ''))
      .slice(0, 3)
      .map((row) => {
        const id = `actividad-${row.tipo_entidad}-${row.entidad_id}`;
        accionesMapa.set(id, () => navegarAtencionHoy(row));
        return {
          id,
          nombre: row.cliente_nombre?.trim() || 'Cliente',
          detalle: unirMeta([row.servicio_resumen, row.vehiculo_resumen]) || 'Cotización',
          folio: row.numero_publico?.trim() || 'Ver caso',
        };
      });

    const chatsPendientes = (chatsQuery.data ?? []).filter(chatEsperaCliente).length;

    return {
      acciones: acciones.slice(0, 6),
      accionesMapa,
      actividad,
      chatsPendientes,
      metricas: [
        {
          id: 'revisar',
          label: 'Por revisar',
          value: porRevisar,
          icon: FilePenLine,
          accent: porRevisar > 0,
          href: '/(tabs)/cotizaciones?estado=borrador' as Href,
        },
        {
          id: 'esperando',
          label: 'Esperando respuesta',
          value: esperando,
          icon: Clock3,
          accent: false,
          href: '/(tabs)/cotizaciones?estado=enviada' as Href,
        },
        {
          id: 'agendar',
          label: 'Por agendar',
          value: porAgendar,
          icon: CalendarClock,
          accent: porAgendar > 0,
          href: '/(tabs)/calendario?vista=por_agendar' as Href,
        },
        {
          id: 'agenda',
          label: 'En agenda',
          value: enAgenda,
          icon: CheckCircle2,
          accent: false,
          href: '/(tabs)/calendario?vista=en_agenda' as Href,
        },
      ] satisfies MetricaHoy[],
    };
  }, [chatsQuery.data, cotizacionesQuery.data, decisionesQuery.data, pipelineQuery.data?.results]);

  accionesRef.current = modelo.accionesMapa;

  const onPressAccion = useCallback((id: string) => {
    accionesRef.current.get(id)?.();
  }, []);

  const verCotizaciones = useCallback(() => {
    router.push('/(tabs)/cotizaciones');
  }, []);

  const verMensajes = useCallback(() => {
    router.push('/(tabs)/chats');
  }, []);

  const refreshAll = useCallback(async () => {
    invalidateProveedorComercialQueries(queryClient);
    await Promise.all([
      pipelineQuery.refetch(),
      cotizacionesQuery.refetch(),
      borradoresQuery.refetch(),
      decisionesQuery.refetch(),
      chatsQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: HOME_DECISIONES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: CHAT_INBOX_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ['agenda-calendario'] }),
    ]);
    onRefreshFeed?.();
  }, [
    borradoresQuery,
    chatsQuery,
    cotizacionesQuery,
    decisionesQuery,
    onRefreshFeed,
    pipelineQuery,
    queryClient,
  ]);

  useEffect(() => {
    if (refreshing) {
      void refreshAll();
    }
  }, [refreshing, refreshAll]);

  useEffect(() => {
    if (!enabled) return;

    const unsubIa = websocketService.onAgenteIaEvent(() => {
      invalidateProveedorComercialQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: CHAT_INBOX_QUERY_KEY });
    });
    const unsubMensaje = websocketService.onNuevoMensajeChat?.(() => {
      invalidateProveedorComercialQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: CHAT_INBOX_QUERY_KEY });
    });
    const unsubSolicitud = websocketService.onNuevaSolicitud(() => {
      invalidateProveedorComercialQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: HOME_DECISIONES_QUERY_KEY });
    });

    return () => {
      unsubIa();
      unsubMensaje?.();
      unsubSolicitud();
    };
  }, [enabled, queryClient]);

  if (!enabled) return null;

  const nombre = obtenerNombreProveedor() || 'taller';

  return (
    <View style={styles.feed}>
      <View style={[styles.hero, columnas && styles.heroRow]}>
        <View style={styles.heroCopy}>
          <InstitutionalText role="captionBold" color="primary">
            {fechaLarga()}
          </InstitutionalText>
          <InstitutionalText role="h1" style={styles.saludo}>
            {saludo(nombre)}
          </InstitutionalText>
          <InstitutionalText role="body" color="body">
            Esto es lo que necesita tu atención hoy.
          </InstitutionalText>
        </View>
      </View>

      <View style={styles.metricas}>
        {modelo.metricas.map((metrica) => (
          <MetricaCard
            key={metrica.id}
            metrica={metrica}
            ancha={metricasAnchadas}
          />
        ))}
      </View>

      <View style={[styles.split, columnas && styles.splitRow]}>
        <View style={styles.splitMain}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionCopy}>
              <InstitutionalText role="h3">Siguiente acción</InstitutionalText>
              <InstitutionalText role="caption" color="body">
                Un vistazo rápido para no dejar nada pendiente.
              </InstitutionalText>
            </View>
            <Pressable
              onPress={verCotizaciones}
              style={styles.link}
              accessibilityRole="button"
              accessibilityLabel="Ver cotizaciones"
            >
              <InstitutionalText role="captionBold" color="primary">
                Ver cotizaciones
              </InstitutionalText>
              <ArrowRight size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
            </Pressable>
          </View>

          {modelo.acciones.length === 0 ? (
            <View style={styles.vacio}>
              <InstitutionalText role="body" color="body">
                Nada pendiente. Cuando entre una cotización o una aceptación, aparece aquí.
              </InstitutionalText>
            </View>
          ) : (
            <View style={styles.acciones}>
              {modelo.acciones.map((accion) => (
                <AccionRow key={accion.id} accion={accion} onPress={onPressAccion} />
              ))}
            </View>
          )}
        </View>

        <View style={[styles.aside, columnas && styles.asideWide]}>
          <View style={styles.asideIcono}>
            <MessageCircle size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
          <InstitutionalText role="h3" color={I.onDark} style={styles.asideTitulo}>
            Mensajes que requieren respuesta
          </InstitutionalText>
          <InstitutionalText role="body" color={I.onDarkSoft}>
            {fraseMensajes(modelo.chatsPendientes)}
          </InstitutionalText>
          <Pressable
            onPress={verMensajes}
            style={styles.asideCta}
            accessibilityRole="button"
            accessibilityLabel="Ver mensajes"
          >
            <MessageCircle size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            <InstitutionalText role="bodyBold">Ver mensajes</InstitutionalText>
          </Pressable>
        </View>
      </View>

      <View style={styles.actividad}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionCopy}>
            <InstitutionalText role="h4">Actividad reciente</InstitutionalText>
            <InstitutionalText role="caption" color="body">
              Tus clientes y sus cotizaciones, en un solo lugar.
            </InstitutionalText>
          </View>
          <Users size={20} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
        </View>
        {modelo.actividad.length === 0 ? (
          <InstitutionalText role="body" color="body">
            Todavía no hay cotizaciones en el taller.
          </InstitutionalText>
        ) : (
          <View style={styles.actividadGrid}>
            {modelo.actividad.map((item) => (
              <ActividadCard
                key={item.id}
                item={item}
                ancha={metricasAnchadas}
                onPress={onPressAccion}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function metaCotizacion(cotizacion: CotizacionCanal): string {
  const vehiculo = unirMeta([
    [cotizacion.vehiculo_marca, cotizacion.vehiculo_modelo].filter(Boolean).join(' '),
    cotizacion.vehiculo_patente,
  ]);
  return unirMeta([
    cotizacion.servicio_nombre,
    vehiculo,
    fechaCreada(cotizacion),
  ]);
}

function fechaCreada(cotizacion: CotizacionCanal): string {
  const corta = fechaCorta(cotizacion.creado_en || cotizacion.actualizado_en);
  return corta ? `creada ${corta}` : '';
}

function clienteDecision(decision: Decision): string {
  if (decision.kind === 'orden') return obtenerNombreSeguro(decision.orden.cliente_detail);
  return decision.oferta.solicitud_detail?.cliente_nombre?.trim() || '';
}

function abrirDecision(decision: Decision) {
  if (decision.kind === 'orden') {
    router.push(`/orden-detalle/${decision.orden.id}`);
    return;
  }
  router.push(`/solicitud-detalle/${decision.oferta.solicitud}`);
}

const ICONO_ACCION: Record<AccionHoy['icono'], LucideIcon> = {
  agenda: CalendarClock,
  revisar: Send,
  aceptar: ClipboardList,
  seguir: Clock3,
};

const AccionRow = memo(function AccionRow({
  accion,
  onPress,
}: {
  accion: AccionHoy;
  onPress: (id: string) => void;
}) {
  const handlePress = useCallback(() => onPress(accion.id), [accion.id, onPress]);
  const Icono = ICONO_ACCION[accion.icono];
  const acento = accion.icono === 'agenda';
  return (
    <Pressable
      onPress={handlePress}
      style={styles.accion}
      accessibilityRole="button"
      accessibilityLabel={`${accion.verbo}. ${accion.titulo}`}
    >
      <View style={[styles.accionIcono, acento ? styles.accionIconoAcento : styles.accionIconoNeutro]}>
        <Icono
          size={20}
          color={acento ? I.primary : I.ink}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </View>
      <View style={styles.accionCopy}>
        <InstitutionalText role="bodyBold" numberOfLines={1}>
          {accion.titulo}
        </InstitutionalText>
        {accion.meta ? (
          <InstitutionalText role="caption" color="body" numberOfLines={1}>
            {accion.meta}
          </InstitutionalText>
        ) : null}
      </View>
      <InstitutionalText role="captionBold" color="primary">
        {accion.verbo}
      </InstitutionalText>
    </Pressable>
  );
});

const MetricaCard = memo(function MetricaCard({
  metrica,
  ancha,
}: {
  metrica: MetricaHoy;
  ancha: boolean;
}) {
  const handlePress = useCallback(() => {
    router.push(metrica.href);
  }, [metrica.href]);
  const Icono = metrica.icon;
  return (
    <Pressable
      onPress={handlePress}
      style={[styles.metrica, ancha ? styles.metricaAncha : styles.metricaEstrecha]}
      accessibilityRole="button"
      accessibilityLabel={`${metrica.value} ${metrica.label}`}
    >
      <Icono
        size={20}
        color={metrica.accent ? I.primary : I.muted}
        strokeWidth={ICON_STROKE_WIDTH}
      />
      <InstitutionalText role="h2" style={styles.metricaValor}>
        {String(metrica.value)}
      </InstitutionalText>
      <InstitutionalText role="caption" color="body" numberOfLines={2}>
        {metrica.label}
      </InstitutionalText>
    </Pressable>
  );
});

const ActividadCard = memo(function ActividadCard({
  item,
  ancha,
  onPress,
}: {
  item: ActividadHoy;
  ancha: boolean;
  onPress: (id: string) => void;
}) {
  const handlePress = useCallback(() => onPress(item.id), [item.id, onPress]);
  return (
    <Pressable
      onPress={handlePress}
      style={[styles.actividadCard, ancha ? styles.actividadAncha : styles.actividadEstrecha]}
      accessibilityRole="button"
      accessibilityLabel={`${item.nombre}. ${item.detalle}`}
    >
      <InstitutionalText role="bodyBold" numberOfLines={1}>
        {item.nombre}
      </InstitutionalText>
      <InstitutionalText role="caption" color="body" numberOfLines={2}>
        {item.detalle}
      </InstitutionalText>
      <InstitutionalText role="captionBold" color="primary" numberOfLines={1}>
        {item.folio}
      </InstitutionalText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  feed: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    gap: SPACING.fixed.xl,
  },
  hero: {
    gap: SPACING.fixed.md,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.fixed.xs,
  },
  saludo: {
    letterSpacing: TYPOGRAPHY.styles.h1.letterSpacing,
  },
  metricas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
  },
  metrica: {
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.paper,
    padding: SPACING.fixed.md,
    gap: SPACING.fixed.xxs,
    ...SHADOWS.editorial,
  },
  metricaEstrecha: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  metricaAncha: {
    flexBasis: '22%',
    flexGrow: 1,
  },
  metricaValor: {
    marginTop: SPACING.fixed.sm,
  },
  split: {
    gap: SPACING.fixed.lg,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  splitMain: {
    flex: 1.4,
    minWidth: 0,
    gap: SPACING.fixed.sm,
  },
  sectionHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
  sectionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
  },
  acciones: {
    gap: SPACING.fixed.sm,
  },
  accion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.md,
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.paper,
    padding: SPACING.fixed.md,
    ...SHADOWS.editorial,
  },
  accionIcono: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accionIconoAcento: {
    backgroundColor: withOpacity(I.primary, 0.1),
  },
  accionIconoNeutro: {
    backgroundColor: I.surfaceSoft,
  },
  accionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  vacio: {
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.paper,
    padding: SPACING.fixed.md,
  },
  aside: {
    borderRadius: BORDERS.radius.xl,
    backgroundColor: I.surfaceDark,
    padding: SPACING.fixed.lg,
    gap: SPACING.fixed.sm,
  },
  asideWide: {
    flex: 0.85,
    minWidth: 260,
  },
  asideIcono: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.primary,
  },
  asideTitulo: {
    marginTop: SPACING.fixed.xs,
  },
  asideCta: {
    marginTop: SPACING.fixed.sm,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    minHeight: 44,
    paddingHorizontal: SPACING.fixed.md,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.paper,
  },
  actividad: {
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.xl,
    backgroundColor: I.paper,
    padding: SPACING.fixed.lg,
    gap: SPACING.fixed.md,
  },
  actividadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
  },
  actividadCard: {
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.surfaceSoft,
    padding: SPACING.fixed.md,
    gap: SPACING.fixed.xxs,
    minHeight: 96,
  },
  actividadEstrecha: {
    flexBasis: '100%',
  },
  actividadAncha: {
    flexBasis: '31%',
    flexGrow: 1,
  },
});

export default HomeAttentionFeed;
