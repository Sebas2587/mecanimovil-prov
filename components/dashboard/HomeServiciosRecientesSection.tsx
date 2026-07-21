import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { ChevronRight, ClipboardList } from 'lucide-react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useOrdenesUnificadas } from '@/hooks/useOrdenesUnificadas';
import {
  navigateToOrdenActiva,
  estadoUnificadoLabel,
  type OrdenActivaItem,
} from '@/utils/ordenProveedorUnificada';
import { nombreServicioCita } from '@/services/agendaProveedorService';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { institutionalCardStyles } from '@/app/design-system/styles/institutionalSemantic';
import { OrigenOrdenBadge } from '@/components/ordenes/OrigenOrdenBadge';

const I = COLORS.institutional;
const T = TYPOGRAPHY.styles;
const FF = TYPOGRAPHY.fontFamily;
const PREVIEW_LIMIT = 5;

/**
 * Prioridad Hoy (Airbnb Today): lo que necesita acción del taller primero.
 * 0 = acción del taller · 1 = en ejecución · 2 = esperando cliente · 3 = resto activo
 */
function prioridadHoy(estado: string, origen: OrdenActivaItem['origen']): number {
  if (origen === 'personal') return 1;

  const accionTaller = new Set([
    'pendiente_aceptacion_proveedor',
    'pendiente_confirmacion',
    'pendiente_creditos',
    'en_chat',
    'enviada',
    'vista',
  ]);
  if (accionTaller.has(estado)) return 0;

  const enEjecucion = new Set([
    'en_ejecucion',
    'en_proceso',
    'servicio_iniciado',
    'checklist_en_progreso',
    'checklist_completado',
    'aceptada_por_proveedor',
    'pagada',
    'pagada_parcialmente',
  ]);
  if (enEjecucion.has(estado)) return 1;

  const esperaCliente = new Set(['aceptada', 'pendiente_pago']);
  if (esperaCliente.has(estado)) return 2;

  return 3;
}

function tituloCliente(item: OrdenActivaItem): string {
  if (item.origen === 'personal') {
    return item.cita.detalle?.cliente_nombre?.trim() || 'Cita personal';
  }
  if (item.orden?.cliente_detail) {
    const c = item.orden.cliente_detail as {
      nombre?: string;
      apellido?: string;
      first_name?: string;
      last_name?: string;
    };
    const nombre =
      [c.nombre, c.apellido].filter(Boolean).join(' ').trim()
      || [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
    if (nombre) return nombre;
  }
  return item.oferta?.solicitud_detail?.cliente_nombre?.trim() || 'Cliente';
}

function servicioSnippet(item: OrdenActivaItem): string {
  if (item.origen === 'personal') {
    return nombreServicioCita(item.cita) || 'Cita personal';
  }
  const servicios = item.oferta?.solicitud_detail?.servicios_solicitados;
  const servicio =
    servicios?.[0]?.nombre
    || item.oferta?.descripcion_oferta?.trim()
    || item.oferta?.solicitud_detail?.descripcion_problema?.trim()
    || '';
  if (servicio) return servicio;
  const vehiculo = item.oferta?.solicitud_detail?.vehiculo;
  const vehLabel = vehiculo
    ? [vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ')
    : '';
  return vehLabel || 'Servicio';
}

function estadoLabel(item: OrdenActivaItem): string {
  if (item.origen === 'personal') {
    return estadoUnificadoLabel(item.estadoEfectivo, 'personal');
  }
  return estadoUnificadoLabel(item.estadoEfectivo, 'mecanimovil', item.orden);
}

function estadoTagVariant(
  item: OrdenActivaItem,
): 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info' {
  const e = item.estadoEfectivo;
  if (['completada', 'cerrada', 'completado'].includes(e)) return 'success';
  if (['cancelada', 'rechazada', 'rechazado'].includes(e)) return 'error';
  if (
    [
      'en_ejecucion',
      'en_proceso',
      'checklist_en_progreso',
      'servicio_iniciado',
    ].includes(e)
  ) {
    return 'info';
  }
  if (
    [
      'pendiente_aceptacion_proveedor',
      'pendiente_confirmacion',
      'pendiente_pago',
      'enviada',
      'vista',
    ].includes(e)
  ) {
    return 'warning';
  }
  if (e === 'activa' || item.origen === 'personal') return 'primary';
  return 'neutral';
}

function fotoCliente(item: OrdenActivaItem): string | null {
  if (item.origen === 'personal') return null;
  const fromOrden = (item.orden?.cliente_detail as { foto_perfil?: string } | undefined)?.foto_perfil;
  if (fromOrden) return fromOrden;
  return item.oferta?.solicitud_detail?.cliente_foto || null;
}

function inicialCliente(nombre: string): string {
  const t = nombre.trim();
  return t ? t.charAt(0).toUpperCase() : '?';
}

function AvatarSoft({ name, uri }: { name: string; uri: string | null }) {
  if (uri) {
    return <Image source={{ uri }} style={styles.avatar} accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={styles.avatarSoft}>
      <Text style={styles.avatarSoftText}>{inicialCliente(name)}</Text>
    </View>
  );
}

export type HomeServiciosRecientesSectionProps = {
  enabled: boolean;
};

function HomeServiciosRecientesSectionInner({ enabled }: HomeServiciosRecientesSectionProps) {
  const queryClient = useQueryClient();
  const { activas, loading, counts } = useOrdenesUnificadas(enabled);

  /** Solo activas (nunca completadas/rechazadas). Orden: acción taller → ejecución → espera cliente. */
  const preview = useMemo(() => {
    return [...activas]
      .sort((a, b) => {
        const pa = prioridadHoy(a.estadoEfectivo, a.origen);
        const pb = prioridadHoy(b.estadoEfectivo, b.origen);
        if (pa !== pb) return pa - pb;
        return 0;
      })
      .slice(0, PREVIEW_LIMIT);
  }, [activas]);

  const totalActivas = counts.activas;

  const handleVerTodas = useCallback(() => {
    router.push('/(tabs)/ordenes');
  }, []);

  const handlePress = useCallback(
    (item: OrdenActivaItem) => {
      navigateToOrdenActiva(router, queryClient, item);
    },
    [queryClient],
  );

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Órdenes del taller</Text>
            {totalActivas > 0 ? (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {totalActivas > 99 ? '99+' : totalActivas}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.subtitle}>
            Trabajo activo: ofertas, órdenes y citas
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerLink}
          onPress={handleVerTodas}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Ver todos los servicios"
        >
          <Text style={styles.headerLinkText}>Ver todos</Text>
          <ChevronRight size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
        </TouchableOpacity>
      </View>

      {loading && preview.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={I.primary} />
        </View>
      ) : preview.length === 0 ? (
        <View style={[institutionalCardStyles.surface, institutionalCardStyles.surfacePadding, styles.emptyCard]}>
          <ClipboardList size={20} color={I.mutedSoft} strokeWidth={ICON_STROKE_WIDTH} />
          <View style={styles.emptyTextCol}>
            <Text style={styles.emptyTitle}>Sin trabajo activo</Text>
            <Text style={styles.emptySub}>
              Cuando aceptes o agendes un servicio, las órdenes del día aparecerán aquí.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.list}>
          {preview.map((item) => {
            const cliente = tituloCliente(item);
            const snippet = servicioSnippet(item);
            const estado = estadoLabel(item);
            return (
              <TouchableOpacity
                key={item.key}
                style={[institutionalCardStyles.surface, styles.card]}
                onPress={() => handlePress(item)}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel={`Abrir servicio de ${cliente}`}
              >
                <View style={styles.cardTop}>
                  <InstitutionalTag
                    label={estado}
                    variant={estadoTagVariant(item)}
                    size="sm"
                  />
                  <OrigenOrdenBadge origen={item.origen} />
                  <View style={styles.cardTopSpacer} />
                </View>

                <Text style={styles.cardTitle} numberOfLines={2}>
                  {snippet}
                </Text>

                <View style={styles.cardMeta}>
                  <AvatarSoft name={cliente} uri={fotoCliente(item)} />
                  <View style={styles.cardMetaTextCol}>
                    <Text style={styles.cardClient} numberOfLines={1}>
                      {cliente}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={I.mutedSoft} strokeWidth={ICON_STROKE_WIDTH} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

export const HomeServiciosRecientesSection = memo(HomeServiciosRecientesSectionInner);

const styles = StyleSheet.create({
  section: {
    gap: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  headerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
    flexShrink: 0,
  },
  headerLinkText: {
    fontSize: T.captionBold.fontSize,
    fontFamily: FF.sansSemiBold,
    fontWeight: '600',
    color: I.primary,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    fontSize: T.h3.fontSize,
    lineHeight: Math.round(T.h3.fontSize * T.h3.lineHeight),
    fontFamily: FF.sansSemiBold,
    fontWeight: '600',
    color: I.ink,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: FF.sansSemiBold,
    fontWeight: '600',
    color: I.onPrimary,
  },
  subtitle: {
    fontSize: T.caption.fontSize,
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  list: {
    gap: SPACING.sm,
  },
  card: {
    padding: SPACING.fixed.md,
    gap: SPACING.fixed.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
  },
  cardTopSpacer: { flex: 1, minWidth: 8 },
  cardTitle: {
    fontFamily: FF.sansSemiBold,
    fontSize: T.h4.fontSize,
    color: I.ink,
    lineHeight: Math.round(T.h4.fontSize * 1.3),
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
  },
  avatarSoft: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: I.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
  },
  avatarSoftText: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  cardMetaTextCol: { flex: 1, minWidth: 0, gap: 2 },
  cardClient: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  centered: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  emptyTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  emptyTitle: {
    fontSize: T.h5.fontSize,
    fontFamily: FF.sansSemiBold,
    fontWeight: '600',
    color: I.ink,
  },
  emptySub: {
    fontSize: T.small.fontSize,
    lineHeight: Math.round(T.small.fontSize * T.small.lineHeight),
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
});
