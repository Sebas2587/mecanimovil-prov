import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import {
  Animated,
  Easing,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarCheck,
  CarFront,
  BadgeCheck,
  CircleCheck,
  CircleX,
  Layers,
  Search,
  Send,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { InstitutionalText } from '@/design-system/components/InstitutionalText';
import { BORDERS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/design-system/iconography';
import { useQueryClient } from '@tanstack/react-query';
import { useCotizacionesCanalTallerQuery } from '@/hooks/useCotizacionesCanalTallerQuery';
import { PIPELINE_COMERCIAL_QUERY_KEY } from '@/hooks/usePipelineComercialQuery';
import { useTallerShell } from '@/components/navigation/TallerShellContext';
import type { CotizacionCanal } from '@/services/cotizacionCanalService';
import { CotizacionDetalleSheet } from '@/components/taller/CotizacionDetalleSheet';
import { CotizacionEstadoBadge } from '@/components/taller/CotizacionEstadoBadge';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { showAlert, showConfirm } from '@/utils/platformAlert';
import { limpiarVistaTaller, ocultarFichaTaller } from '@/services/vistaTallerService';
import {
  estadoCotizacionVista,
  etiquetaEstadoCotizacion,
  fechaCortaCotizacion,
  montoCotizacion,
  type EstadoCotizacionVista,
} from '@/utils/cotizacionPresentacion';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

type Filtro = 'todas' | EstadoCotizacionVista;

const FILTROS: { value: Filtro; label: string; icon: LucideIcon }[] = [
  { value: 'todas', label: 'Todas', icon: Layers },
  { value: 'enviada', label: 'Enviadas', icon: Send },
  { value: 'aceptada', label: 'Aceptadas', icon: CircleCheck },
  { value: 'agendada', label: 'Agendadas', icon: CalendarCheck },
  { value: 'entregada', label: 'Terminadas', icon: BadgeCheck },
  { value: 'rechazada', label: 'Rechazadas', icon: CircleX },
];

type Props = {
  estadoInicial?: string | null;
};

export function CotizacionesVista({ estadoInicial }: Props) {
  const insets = useSafeAreaInsets();
  const { ocupaTope, accionFlotante } = useTallerShell();
  const { width } = useWindowDimensions();
  const ancha = width >= 768;
  const columnas = width >= 1100 ? 3 : width >= 720 ? 2 : 1;
  const [filtro, setFiltro] = useState<Filtro>(filtroInicial(estadoInicial));
  useEffect(() => {
    setFiltro(filtroInicial(estadoInicial));
  }, [estadoInicial]);
  const [busqueda, setBusqueda] = useState('');
  const [buscadorEnfocado, setBuscadorEnfocado] = useState(false);
  const [abiertaId, setAbiertaId] = useState<number | null>(null);
  const progresoBuscador = useRef(new Animated.Value(1)).current;
  const offsetAnterior = useRef(0);
  const buscadorVisible = useRef(true);
  const query = useCotizacionesCanalTallerQuery();
  const queryClient = useQueryClient();
  const cotizaciones = query.data ?? [];

  const conteos = useMemo(() => {
    const base: Record<Filtro, number> = {
      todas: cotizaciones.length,
      borrador: 0,
      enviada: 0,
      aceptada: 0,
      agendada: 0,
      entregada: 0,
      rechazada: 0,
    };
    for (const cotizacion of cotizaciones) {
      const estado = estadoCotizacionVista(cotizacion);
      base[estado] = (base[estado] ?? 0) + 1;
    }
    return base;
  }, [cotizaciones]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return cotizaciones.filter((cotizacion) => {
      if (filtro !== 'todas' && estadoCotizacionVista(cotizacion) !== filtro) return false;
      if (!q) return true;
      return [
        cotizacion.cliente_nombre,
        cotizacion.cliente_telefono,
        cotizacion.numero_publico,
        cotizacion.servicio_nombre,
        cotizacion.vehiculo_marca,
        cotizacion.vehiculo_modelo,
        cotizacion.vehiculo_patente,
      ].some((campo) => (campo || '').toLowerCase().includes(q));
    });
  }, [busqueda, cotizaciones, filtro]);

  const esperando = cotizaciones
    .filter((cotizacion) => estadoCotizacionVista(cotizacion) === 'enviada')
    .reduce((sum, cotizacion) => sum + montoCotizacion(cotizacion), 0);
  const aceptado = cotizaciones
    .filter((cotizacion) => {
      const estado = estadoCotizacionVista(cotizacion);
      return estado === 'aceptada' || estado === 'agendada' || estado === 'entregada';
    })
    .reduce((sum, cotizacion) => sum + montoCotizacion(cotizacion), 0);

  const abrir = useCallback((id: number) => setAbiertaId(id), []);
  const agendar = useCallback((cotizacion: CotizacionCanal) => {
    const citaId = cotizacion.cita_personal_id || cotizacion.cita_origen_id;
    if (citaId) {
      router.push(`/cita-agenda-personal/${citaId}`);
      return;
    }
    router.push(`/cotizacion-canal/${cotizacion.id}`);
  }, []);
  const cerrar = useCallback(() => setAbiertaId(null), []);
  const limpiar = useCallback(() => setBusqueda(''), []);
  const puedeLimpiarLista = filtro === 'rechazada' || filtro === 'entregada';
  const limpiarLista = useCallback(() => {
    if (!puedeLimpiarLista) return;
    const ambito = filtro === 'rechazada' ? 'cotizaciones_rechazadas' : 'cotizaciones_terminadas';
    const titulo = filtro === 'rechazada' ? 'Limpiar rechazadas' : 'Limpiar terminadas';
    showConfirm(
      titulo,
      'Salen de Cotizaciones. El chat y lo que el agente de cotizaciones ya aprendió se conservan.',
      {
        confirmText: 'Quitar de la lista',
        onConfirm: async () => {
          try {
            const ocultos = await limpiarVistaTaller(ambito);
            await query.refetch();
            await queryClient.invalidateQueries({ queryKey: [PIPELINE_COMERCIAL_QUERY_KEY] });
            showAlert(
              'Lista al día',
              ocultos > 0 ? `Quitamos ${ocultos} de la lista.` : 'No había fichas para quitar.',
            );
          } catch {
            showAlert('No se pudo limpiar', 'Intenta de nuevo.');
          }
        },
      },
    );
  }, [filtro, puedeLimpiarLista, query, queryClient]);
  const quitarCotizacion = useCallback((cotizacion: CotizacionCanal) => {
    showConfirm(
      'Quitar de la lista',
      'Esta ficha sale de Cotizaciones. El chat y el aprendizaje del agente se conservan.',
      {
        confirmText: 'Quitar',
        onConfirm: async () => {
          try {
            await ocultarFichaTaller('cotizacion', cotizacion.id);
            await query.refetch();
            await queryClient.invalidateQueries({ queryKey: [PIPELINE_COMERCIAL_QUERY_KEY] });
          } catch {
            showAlert('No se pudo quitar', 'Solo se pueden quitar rechazadas o terminadas.');
          }
        },
      },
    );
  }, [query, queryClient]);
  const mostrarBuscador = useCallback((visible: boolean) => {
    if (buscadorVisible.current === visible) return;
    buscadorVisible.current = visible;
    Animated.timing(progresoBuscador, {
      toValue: visible ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progresoBuscador]);
  const onScrollLista = useCallback((evento: { nativeEvent: { contentOffset: { y: number } } }) => {
    if (buscadorEnfocado || busqueda.trim()) {
      mostrarBuscador(true);
      offsetAnterior.current = evento.nativeEvent.contentOffset.y;
      return;
    }
    const y = evento.nativeEvent.contentOffset.y;
    const delta = y - offsetAnterior.current;
    if (y < 12) mostrarBuscador(true);
    else if (delta > 8) mostrarBuscador(false);
    else if (delta < -8) mostrarBuscador(true);
    offsetAnterior.current = y;
  }, [buscadorEnfocado, busqueda, mostrarBuscador]);
  const altoBuscador = progresoBuscador.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 76],
  });
  const opacidadBuscador = progresoBuscador.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View style={[styles.screen, { paddingTop: ocupaTope ? SPACING.fixed.sm : insets.top }]}>
      <Animated.View
        style={[
          styles.buscadorWrap,
          ancha && styles.cabeceraAncha,
          { height: altoBuscador, opacity: opacidadBuscador },
        ]}
      >
        <View style={styles.buscador}>
          <View style={styles.buscadorCopy}>
            <InstitutionalText role="captionBold">¿A quién buscas?</InstitutionalText>
            <TextInput
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder="Cliente, patente, folio o servicio"
              placeholderTextColor={I.muted}
              style={styles.input}
              autoCorrect={false}
              autoCapitalize="none"
              onFocus={() => {
                setBuscadorEnfocado(true);
                mostrarBuscador(true);
              }}
              onBlur={() => setBuscadorEnfocado(false)}
              accessibilityLabel="Buscar cotizaciones"
            />
          </View>
          {busqueda ? (
            <Pressable onPress={limpiar} style={styles.buscarBtn} accessibilityLabel="Limpiar búsqueda">
              <X size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            </Pressable>
          ) : (
            <View style={[styles.buscarBtn, styles.buscarBtnOn]}>
              <Search size={16} color={I.onPrimary} strokeWidth={2.25} />
            </View>
          )}
        </View>
      </Animated.View>
      <View style={[styles.cabecera, ancha && styles.cabeceraAncha]}>
        {ancha ? (
          <View style={[styles.filtros, styles.filtrosCentro]}>
            {FILTROS.map((item) => (
              <FiltroChip
                key={item.value}
                item={item}
                activo={filtro === item.value}
                conteo={conteos[item.value]}
                onPress={setFiltro}
              />
            ))}
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtros}
            style={styles.filtrosScroll}
          >
            {FILTROS.map((item) => (
              <FiltroChip
                key={item.value}
                item={item}
                activo={filtro === item.value}
                conteo={conteos[item.value]}
                onPress={setFiltro}
              />
            ))}
          </ScrollView>
        )}
      </View>

      <FlatList
        key={columnas}
        data={visibles}
        keyExtractor={(item) => String(item.id)}
        numColumns={columnas}
        columnWrapperStyle={columnas > 1 ? styles.fila : undefined}
        contentContainerStyle={[styles.lista, { paddingBottom: accionFlotante ? 150 : 120 }]}
        onScroll={onScrollLista}
        scrollEventThrottle={16}
        refreshControl={(
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor={I.primary}
          />
        )}
        ListHeaderComponent={(
          <View style={styles.resumenBloque}>
            {filtro !== 'todas' ? (
              <InstitutionalText role="h4">{TITULO_FILTRO[filtro]}</InstitutionalText>
            ) : null}
            <InstitutionalText role="caption" color="body" style={styles.resumen}>
              {formatearMontoCLP(esperando)} esperando respuesta · {formatearMontoCLP(aceptado)} aceptado
            </InstitutionalText>
            {puedeLimpiarLista && visibles.length > 0 ? (
              <Pressable
                onPress={limpiarLista}
                style={styles.limpiar}
                accessibilityRole="button"
                accessibilityLabel="Limpiar esta lista"
              >
                <InstitutionalText role="captionBold">Limpiar esta lista</InstitutionalText>
              </Pressable>
            ) : null}
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.vacio}>
            <InstitutionalText role="bodyBold">
              {query.isPending ? 'Cargando cotizaciones' : 'Sin resultados'}
            </InstitutionalText>
            <InstitutionalText role="caption" color="body">
              {query.isPending
                ? 'Estamos trayendo las cotizaciones del taller.'
                : 'No hay cotizaciones que coincidan con tu búsqueda o filtro.'}
            </InstitutionalText>
          </View>
        )}
        renderItem={({ item }) => (
          <CotizacionCard
            cotizacion={item}
            onOpen={abrir}
            onAgendar={agendar}
            onQuitar={quitarCotizacion}
          />
        )}
      />

      <CotizacionDetalleSheet cotizacionId={abiertaId} onClose={cerrar} />
    </View>
  );
}

const TITULO_FILTRO: Record<Exclude<Filtro, 'todas'>, string> = {
  borrador: 'Por revisar',
  enviada: 'Esperando respuesta',
  aceptada: 'Por agendar',
  agendada: 'En agenda',
  entregada: 'Terminadas',
  rechazada: 'Rechazadas',
};

function filtroInicial(value: string | null | undefined): Filtro {
  if (
    value === 'borrador'
    || value === 'enviada'
    || value === 'aceptada'
    || value === 'agendada'
    || value === 'entregada'
    || value === 'rechazada'
  ) {
    return value;
  }
  return 'todas';
}

const FiltroChip = memo(function FiltroChip({
  item,
  activo,
  conteo,
  onPress,
}: {
  item: (typeof FILTROS)[number];
  activo: boolean;
  conteo: number;
  onPress: (value: Filtro) => void;
}) {
  const handlePress = useCallback(() => onPress(item.value), [item.value, onPress]);
  const Icono = item.icon;
  return (
    <Pressable
      onPress={handlePress}
      style={[styles.filtro, activo && styles.filtroOn]}
      accessibilityRole="tab"
      accessibilityState={{ selected: activo }}
    >
      <Icono size={22} color={activo ? I.ink : I.muted} strokeWidth={1.5} />
      <InstitutionalText role="captionBold" color={activo ? 'ink' : 'body'}>
        {item.label} ({conteo})
      </InstitutionalText>
    </Pressable>
  );
});

const CotizacionCard = memo(function CotizacionCard({
  cotizacion,
  onOpen,
  onAgendar,
  onQuitar,
}: {
  cotizacion: CotizacionCanal;
  onOpen: (id: number) => void;
  onAgendar: (cotizacion: CotizacionCanal) => void;
  onQuitar: (cotizacion: CotizacionCanal) => void;
}) {
  const estado = estadoCotizacionVista(cotizacion);
  const handlePress = useCallback(() => onOpen(cotizacion.id), [cotizacion.id, onOpen]);
  const handleAgendar = useCallback(() => onAgendar(cotizacion), [cotizacion, onAgendar]);
  const handleQuitar = useCallback(() => onQuitar(cotizacion), [cotizacion, onQuitar]);
  const vehiculo = [
    cotizacion.vehiculo_marca,
    cotizacion.vehiculo_modelo,
    cotizacion.vehiculo_anio,
  ].filter(Boolean).join(' ');
  const fecha = fechaCortaCotizacion(cotizacion.enviada_en || cotizacion.creado_en || cotizacion.actualizado_en);
  const nombre = cotizacion.cliente_nombre?.trim() || 'Cliente';
  return (
    <View style={styles.card}>
      <View style={styles.cardMedia}>
        <Pressable
          onPress={handlePress}
          style={styles.cardFondo}
          accessibilityRole="button"
          accessibilityLabel={`Abrir cotización de ${nombre}`}
        />
        <View pointerEvents="none" style={styles.cardIcono}>
          <CarFront size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
        </View>
        <View pointerEvents="none" style={styles.badgePos}>
          <CotizacionEstadoBadge estado={estado} label={etiquetaEstadoCotizacion(cotizacion)} />
        </View>
        {estado === 'aceptada' ? (
          <Pressable
            onPress={handleAgendar}
            style={styles.cardAccion}
            accessibilityRole="button"
            accessibilityLabel={`Agendar a ${nombre}`}
          >
            <CalendarCheck size={14} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
            <InstitutionalText role="captionBold" color="onPrimary">Agendar</InstitutionalText>
          </Pressable>
        ) : null}
        {estado === 'rechazada' || estado === 'entregada' ? (
          <Pressable
            onPress={handleQuitar}
            style={styles.cardQuitar}
            accessibilityRole="button"
            accessibilityLabel={`Quitar a ${nombre} de la lista`}
          >
            <InstitutionalText role="captionBold">Quitar</InstitutionalText>
          </Pressable>
        ) : null}
        {estado === 'agendada' && cotizacion.fecha_agendada ? (
          <View pointerEvents="none" style={styles.cardFecha}>
            <InstitutionalText role="captionBold">
              {fechaCortaCotizacion(cotizacion.fecha_agendada)}
              {cotizacion.hora_agendada ? ` · ${cotizacion.hora_agendada.slice(0, 5)}` : ''}
            </InstitutionalText>
          </View>
        ) : null}
        {estado === 'borrador' ? (
          <View pointerEvents="none" style={styles.cardFecha}>
            <InstitutionalText role="captionBold">Continuar</InstitutionalText>
          </View>
        ) : null}
      </View>
      <Pressable onPress={handlePress} style={styles.cardCopy} accessibilityRole="button">
        <View style={styles.cardTitulo}>
          <InstitutionalText role="bodyBold" numberOfLines={1} style={styles.flex}>
            {nombre}
          </InstitutionalText>
          <InstitutionalText role="caption" color="body">
            {cotizacion.numero_publico || ''}
          </InstitutionalText>
        </View>
        <InstitutionalText role="caption" color="body" numberOfLines={2}>
          {[cotizacion.servicio_nombre, vehiculo, cotizacion.vehiculo_patente].filter(Boolean).join(' · ')}
        </InstitutionalText>
        {fecha ? (
          <InstitutionalText role="caption" color="body">
            {cotizacion.enviada_en ? `Enviada el ${fecha}` : `Creada el ${fecha}`}
          </InstitutionalText>
        ) : null}
        <InstitutionalText role="bodyBold">{formatearMontoCLP(montoCotizacion(cotizacion))}</InstitutionalText>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: I.canvas,
  },
  buscadorWrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.fixed.md,
    backgroundColor: I.canvas,
  },
  cabecera: {
    alignItems: 'center',
    paddingTop: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    backgroundColor: I.canvas,
    zIndex: 2,
  },
  cabeceraAncha: {
    paddingHorizontal: 40,
  },
  buscador: {
    width: '100%',
    maxWidth: 576,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.paper,
    paddingLeft: 20,
    paddingRight: 6,
    paddingVertical: 8,
    ...SHADOWS.editorial,
  },
  buscadorCopy: {
    flex: 1,
    minWidth: 0,
  },
  input: {
    fontFamily: FF.sansRegular,
    fontSize: 14,
    color: I.ink,
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    borderWidth: 0,
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
          boxShadow: 'none',
        } as object)
      : null),
  },
  buscarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.surfaceSoft,
  },
  buscarBtnOn: {
    backgroundColor: I.primary,
  },
  filtrosScroll: {
    alignSelf: 'stretch',
    flexGrow: 0,
  },
  filtros: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 28,
    paddingHorizontal: SPACING.fixed.md,
  },
  filtrosCentro: {
    justifyContent: 'center',
    gap: 40,
    paddingHorizontal: 0,
  },
  filtro: {
    alignItems: 'center',
    gap: 6,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filtroOn: {
    borderBottomColor: I.ink,
  },
  lista: {
    padding: SPACING.fixed.md,
    gap: SPACING.fixed.md,
    paddingBottom: 120,
  },
  fila: {
    gap: SPACING.fixed.md,
  },
  resumenBloque: {
    gap: SPACING.fixed.xs,
    marginBottom: SPACING.fixed.sm,
  },
  resumen: {
    marginBottom: 0,
  },
  limpiar: {
    alignSelf: 'flex-start',
    marginTop: SPACING.fixed.xs,
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  vacio: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.fixed.xl,
    alignItems: 'center',
    gap: SPACING.fixed.xs,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.xl,
    backgroundColor: I.paper,
    padding: SPACING.fixed.sm,
    gap: SPACING.fixed.sm,
    ...SHADOWS.editorial,
  },
  cardMedia: {
    minHeight: 132,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.surfaceSoft,
    padding: SPACING.fixed.md,
    justifyContent: 'space-between',
    position: 'relative',
  },
  cardFondo: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  badgePos: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  cardIcono: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: I.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAccion: {
    position: 'absolute',
    zIndex: 1,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cardQuitar: {
    position: 'absolute',
    zIndex: 1,
    right: 12,
    bottom: 12,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cardFecha: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.paper,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cardCopy: {
    gap: 2,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  cardTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  flex: {
    flex: 1,
  },
});
