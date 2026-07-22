/**
 * Pantalla unificada de Suscripciones & Créditos — MecaniMovil Proveedores
 *
 * Tabs principales e historial con `InstitutionalScreenTabs` (design system):
 *   1. Saldo        – balance, estadísticas del mes, avisos de recarga / insignia KPI
 *   2. Suscripción  – planes MP + suscripción activa
 *   3. Tienda       – compra de créditos a medida (requiere MP conectado; no exige suscripción)
 *   4. Historial    – compras y consumos (sub-tabs Compras / Consumos con el mismo estilo)
 *
 * Reglas de negocio:
 *  - KPIs (Rendimiento) y finanzas/saldo se pueden VER sin Mercado Pago
 *  - Conectar MP es obligatorio para comprar créditos, suscribirse y recibir pagos / postular
 *  - Suscripción mensual → créditos recurrentes + elegibilidad de insignia KPI en app usuarios
 *  - Créditos sueltos (Tienda) → postular según saldo sin necesidad de plan activo
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Wallet,
  CreditCard,
  Store,
  History,
  Receipt,
  ScrollText,
  TrendingUp,
  Info,
} from 'lucide-react-native';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, withOpacity, BORDERS } from '@/app/design-system/tokens';
import { InstitutionalScreenTabs } from '@/app/design-system/components/InstitutionalScreenTabs';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { Card, hostScreenStyles, HOST_GUTTER } from '@/app/design-system/components';
import {
  hostIconPlateColor,
  hostIconPlateStyle,
  institutionalStatusColors,
} from '@/app/design-system/styles/institutionalSemantic';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { router, useLocalSearchParams } from 'expo-router';

import creditosService, {
  type CreditoProveedor,
  type PaqueteCreditos,
  type EstadisticasCreditos,
  type CompraCreditos,
  type ConsumoCredito,
} from '@/services/creditosService';
import suscripcionesService, {
  type PlanSuscripcion,
  type SuscripcionProveedor,
  type CobroMP,
} from '@/services/suscripcionesService';
import mercadoPagoProveedorService, { type EstadisticasPagosMP } from '@/services/mercadoPagoProveedorService';
import { kpisProveedorService } from '@/services/kpisProveedorService';
import {
  SaldoCreditos,
  PaqueteCard,
  HistorialCompras,
  HistorialConsumos,
  TablaServiciosCreditosModal,
} from '@/components/creditos';
import { InteractiveStatsChart } from '@/components/creditos/InteractiveStatsChart';
import FinanzasLiquidacionSection from '@/components/creditos/FinanzasLiquidacionSection';
import { SaldoBenefitGrid } from '@/components/creditos/SaldoBenefitGrid';
import MercadoPagoWebViewModal from '@/components/creditos/MercadoPagoWebViewModal';
import Header from '@/components/Header';
import { FALLBACK_PRECIO_CREDITO_BRUTO_CLP } from '@/constants/mercadoPagoPricing';
import { RendimientoKpisContent } from '@/components/rendimiento';

const I_TAB = COLORS.institutional;
const PAPER = COLORS.background.paper;
const CANVAS = COLORS.background.default;
const HX = HOST_GUTTER;

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────
type TabType = 'saldo' | 'suscripcion' | 'tienda' | 'historial' | 'rendimiento';
type HistorialSubTabType = 'compras' | 'consumos';

interface ModalSuscripcion {
  visible: boolean;
  checkoutUrl: string;
  suscripcionId: number;
}

function clpPorCreditoEnPlan(plan: PlanSuscripcion): number {
  return Math.round(Number(plan.precio) / Math.max(1, plan.creditos_mensuales));
}

function formatCLP(n: number): string {
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

/** Orientativo: en docs, cada postulación puede gastar ~5–10 créditos según el servicio. */
function rangoPostulacionesAprox(creditosMensuales: number): { min: number; max: number } {
  const max = Math.max(0, Math.floor(creditosMensuales / 5));
  const min = Math.max(0, Math.floor(creditosMensuales / 10));
  return { min, max };
}

/**
 * Ahorro vs precio tienda como fracción 0–1 (sin redondear a entero).
 * Redondear solo a entero hacía que planes con distinto $/crédito mostraran el mismo "~N%" (p. ej. 238 vs 240).
 */
function fraccionAhorroVsTienda(
  precioCreditoPlan: number,
  precioTiendaPorCredito: number
): number | null {
  if (precioTiendaPorCredito <= 0) return null;
  if (precioCreditoPlan >= precioTiendaPorCredito) return null;
  const f = 1 - precioCreditoPlan / precioTiendaPorCredito;
  if (f <= 0) return null;
  return Math.min(0.999, f);
}

/** Porcentaje con un decimal para la UI (ej. 53,8% vs 54,2%). */
function porcentajeAhorroVsTiendaUnDecimal(fraccion: number): number {
  return Math.round(fraccion * 1000) / 10;
}

function withOpacitySafe(hex: string, opacity: number): string {
  try {
    return withOpacity(hex, opacity);
  } catch {
    return `rgba(0, 52, 89, ${opacity})`;
  }
}

// ─────────────────────────────────────────────────────────────
// Intro “Planes mensuales” — glass, estilo tabla de precios
// ─────────────────────────────────────────────────────────────
interface PlanesMensualesGlassIntroProps {
  precioTiendaPorCredito: number;
  onVerTablaServicios: () => void;
  /** Sin card exterior ni título (p. ej. dentro de un disclosure) */
  embedded?: boolean;
}

const PlanesMensualesGlassIntro = React.memo(
  ({ precioTiendaPorCredito, onVerTablaServicios, embedded = false }: PlanesMensualesGlassIntroProps) => {
    const hairline = StyleSheet.hairlineWidth;
    const I = COLORS.institutional;
    const panelBg = I.surfaceSoft;
    const rowBorder = I.hairline;

    const inner = (
      <>
        {!embedded ? (
          <>
            <View style={styles.planIntroKickerPill}>
              <Text style={styles.planIntroKickerPillText}>SUSCRIPCIÓN</Text>
            </View>
            <Text style={[styles.planIntroTitle, { color: I.ink }]}>Planes mensuales</Text>
          </>
        ) : null}
        <Text style={[styles.planIntroLead, { color: I.body }]}>
          Un cobro al mes. Los créditos se acreditan cuando Mercado Pago confirma el pago.
        </Text>

        <View style={[styles.pTableWrap, { backgroundColor: panelBg, borderColor: rowBorder }]}>
          <View style={[styles.pTableHead, { borderBottomColor: rowBorder, borderBottomWidth: hairline }]}>
            <Text style={[styles.pTableHeadText, { color: I.muted }]}>REFERENCIA</Text>
          </View>
          <View style={[styles.pTableRow, { borderBottomColor: rowBorder, borderBottomWidth: hairline }]}>
            <Text style={[styles.pTableLabel, { color: I.body }]}>Crédito en Tienda</Text>
            <Text style={[styles.pTableValue, { color: I.ink, fontFamily: TYPOGRAPHY.fontFamily.monoMedium }]}>
              {formatCLP(precioTiendaPorCredito)} c/u
            </Text>
          </View>
          <View style={[styles.pTableRow, { borderBottomColor: rowBorder, borderBottomWidth: hairline }]}>
            <Text style={[styles.pTableLabel, { color: I.body }]}>Planes</Text>
            <Text style={[styles.pTableValueStrong, { color: I.primary }]}>Mejor valor por crédito ↓</Text>
          </View>
          <View style={styles.pTableFoot}>
            <InstitutionalIcon name="info-outline" size={14} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={[styles.pTableFootText, { color: I.body }]}>
              Cada trabajo consume distintos créditos. Revisá la tabla de servicios.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.planIntroCtaSecondary, { backgroundColor: I.surfaceStrong }]}
          onPress={onVerTablaServicios}
          activeOpacity={0.88}
        >
          <InstitutionalIcon name="table-chart" size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={[styles.planIntroCtaSecondaryText, { color: I.ink }]}>Servicios y créditos</Text>
        </TouchableOpacity>
      </>
    );

    if (embedded) {
      return <View style={styles.planIntroEmbeddedRoot}>{inner}</View>;
    }

    return (
      <Card elevated padding={0} style={styles.planIntroOuter}>
        <View style={styles.planIntroInner}>{inner}</View>
      </Card>
    );
  }
);
PlanesMensualesGlassIntro.displayName = 'PlanesMensualesGlassIntro';

// ─────────────────────────────────────────────────────────────
// PlanCard — paper Host + tabla de precios + % por crédito
// ─────────────────────────────────────────────────────────────
interface PlanCardProps {
  plan: PlanSuscripcion;
  suscripcionActual: SuscripcionProveedor | null;
  onSuscribirse: (plan: PlanSuscripcion) => void;
  cargando: boolean;
  precioRecargaPorCredito: number;
}

const PlanCard: React.FC<PlanCardProps> = React.memo(
  ({ plan, suscripcionActual, onSuscribirse, cargando, precioRecargaPorCredito }) => {
    const I = COLORS.institutional;
    const hairlineW = StyleSheet.hairlineWidth;
    const featured = plan.destacado;
    const ink = I.ink;
    const body = I.body;
    const muted = I.muted;
    const line = I.hairline;
    const panelBg = I.surfaceSoft;
    const pctBg = COLORS.selection.background;
    const pctBorder = COLORS.selection.border;
    const neutralPanel = I.surfaceSoft;

    const esPlanActual =
      suscripcionActual?.plan?.id === plan.id &&
      ['activa', 'pendiente'].includes(suscripcionActual?.estado ?? '');

    const estaEnCualquierPlan =
      suscripcionActual !== null &&
      ['activa', 'pendiente'].includes(suscripcionActual?.estado ?? '');

    const precioCreditoPlan = clpPorCreditoEnPlan(plan);
    const fraccionAhorro = fraccionAhorroVsTienda(precioCreditoPlan, precioRecargaPorCredito);
    const pctAhorroUnDec =
      fraccionAhorro != null ? porcentajeAhorroVsTiendaUnDecimal(fraccionAhorro) : null;
    const { min: estMin, max: estMax } = rangoPostulacionesAprox(plan.creditos_mensuales);

    const textoPostulaciones =
      estMax <= 0
        ? 'Postulaciones según tipo de trabajo.'
        : estMin <= 0
          ? `Hasta ~${estMax} postulaciones/mes · orientativo`
          : `~${estMin}–${estMax} postulaciones/mes · orientativo`;

    const ctaDisabled = cargando || esPlanActual || (estaEnCualquierPlan && !esPlanActual);
    const ctaPrimaryBg = I.primary;
    const ctaSecondaryBg = I.surfaceSoft;
    const ctaSecondaryText = I.ink;

    return (
      <Card
        elevated
        padding="host"
        style={[
          styles.planTierOuter,
          {
            borderColor: featured ? I.primary : line,
          },
        ]}
      >
        <View style={styles.planTierInner}>
          {featured || esPlanActual ? (
            <View style={styles.planTierHeaderRow}>
              {featured ? (
                <View
                  style={[
                    styles.planTierKicker,
                    { backgroundColor: COLORS.selection.background, borderColor: COLORS.selection.border },
                  ]}
                >
                  <Text style={[styles.planTierKickerText, { color: COLORS.selection.text }]}>
                    DESTACADO
                  </Text>
                </View>
              ) : (
                <View style={{ flex: 1 }} />
              )}
              {esPlanActual ? (
                <View
                  style={[
                    styles.planTierBadgeTuPlan,
                    { backgroundColor: I.surfaceSoft, borderColor: I.hairline },
                  ]}
                >
                  <Text style={[styles.planTierBadgeTuPlanText, { color: I.semanticUp }]}>TU PLAN</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <Text style={[styles.planTierName, { color: ink }]}>{plan.nombre}</Text>

          <View style={[styles.planTierTable, { backgroundColor: panelBg, borderColor: line }]}>
            <View style={[styles.planTableRow, { borderBottomColor: line, borderBottomWidth: hairlineW }]}>
              <Text style={[styles.planTableLabel, { color: muted }]}>Cuota mensual</Text>
              <View style={styles.planTableValueRight}>
                <Text style={[styles.planTablePriceMain, { color: ink, fontFamily: TYPOGRAPHY.fontFamily.monoMedium }]}>
                  {formatCLP(Math.round(plan.precio))}
                </Text>
                <Text style={[styles.planTablePriceSub, { color: body }]}>/ mes</Text>
              </View>
            </View>
            <View style={[styles.planTableRow, { borderBottomColor: line, borderBottomWidth: hairlineW }]}>
              <Text style={[styles.planTableLabel, { color: muted }]}>Créditos</Text>
              <Text style={[styles.planTableEmphasis, { color: ink, fontFamily: TYPOGRAPHY.fontFamily.monoMedium }]}>
                {plan.creditos_mensuales} / mes
              </Text>
            </View>
            <View style={styles.planTableRow}>
              <Text style={[styles.planTableLabel, { color: muted }]}>Por crédito</Text>
              <View style={styles.planTableValueRight}>
                <Text style={[styles.planTableEmphasis, { color: ink, fontFamily: TYPOGRAPHY.fontFamily.monoMedium }]}>
                  {formatCLP(precioCreditoPlan)}
                </Text>
                <View style={styles.planTableStrikeRow}>
                  <Text style={[styles.planTableStrike, { color: muted }]}>Tienda {formatCLP(precioRecargaPorCredito)}</Text>
                </View>
              </View>
            </View>
          </View>

          {pctAhorroUnDec != null && pctAhorroUnDec > 0 ? (
            <View style={[styles.planPctHero, { borderColor: pctBorder, backgroundColor: pctBg }]}>
              <View style={styles.planPctHeroLeft}>
                <Text style={[styles.planPctHeroNumber, { color: COLORS.selection.text }]}>
                  ~
                  {pctAhorroUnDec.toLocaleString('es-CL', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                  %
                </Text>
                <Text style={[styles.planPctHeroCaption, { color: ink }]}>menos por crédito vs Tienda</Text>
                <Text style={[styles.planPctHeroSub, { color: body }]}>
                  Mismo crédito, mejor precio unitario en el plan.
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.planPctNeutral, { backgroundColor: neutralPanel, borderColor: line }]}>
              <Text style={[styles.planPctNeutralText, { color: body }]}>
                Mismo precio por crédito que la Tienda en este plan.
              </Text>
            </View>
          )}

          <Text style={[styles.planFootnote, { color: body }]}>{textoPostulaciones}</Text>
          <Text style={[styles.planFootnoteFine, { color: muted }]}>
            Pagos de clientes a tu Mercado Pago · visibilidad en app · créditos al confirmar cobro.
          </Text>

          <TouchableOpacity
            style={[
              styles.planTierCta,
              {
                backgroundColor: esPlanActual || (estaEnCualquierPlan && !esPlanActual) ? ctaSecondaryBg : ctaPrimaryBg,
                borderWidth: esPlanActual || (estaEnCualquierPlan && !esPlanActual) ? BORDERS.width.thin : 0,
                borderColor: I.hairline,
                opacity: ctaDisabled && !esPlanActual ? 0.55 : 1,
              },
            ]}
            onPress={() => onSuscribirse(plan)}
            disabled={ctaDisabled}
            activeOpacity={0.88}
          >
            {cargando ? (
              <ActivityIndicator
                size="small"
                color={esPlanActual || (estaEnCualquierPlan && !esPlanActual) ? I.primary : I.onPrimary}
              />
            ) : (
              <Text
                style={[
                  styles.planTierCtaText,
                  {
                    color:
                      esPlanActual || (estaEnCualquierPlan && !esPlanActual) ? ctaSecondaryText : I.onPrimary,
                  },
                ]}
              >
                {esPlanActual
                  ? 'Plan activo'
                  : estaEnCualquierPlan
                    ? 'Cancelá tu plan actual para cambiar'
                    : 'Suscribirme'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </Card>
    );
  }
);
PlanCard.displayName = 'PlanCard';

interface SuscripcionDisclosureSectionProps {
  title: string;
  summary: string;
  expanded: boolean;
  onToggle: () => void;
  kicker?: string;
  children: React.ReactNode;
}

/** Encabezado tocable + cuerpo opcional: reduce ruido en el tab Suscripción */
function SuscripcionDisclosureSection({
  title,
  summary,
  expanded,
  onToggle,
  kicker,
  children,
}: SuscripcionDisclosureSectionProps) {
  const I = COLORS.institutional;
  return (
    <Card elevated padding={0} style={styles.suscripcionDisclosureCard}>
      <TouchableOpacity
        style={styles.suscripcionDisclosureHeader}
        onPress={onToggle}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}. ${expanded ? 'Contraer sección' : 'Expandir sección'}`}
      >
        <View style={styles.suscripcionDisclosureHeaderText}>
          {kicker ? (
            <View style={[styles.badgePillKicker, { backgroundColor: I.surfaceStrong, marginBottom: 6 }]}>
              <Text style={[styles.badgePillKickerText, { color: I.muted }]}>{kicker}</Text>
            </View>
          ) : null}
          <Text style={[styles.suscripcionDisclosureTitle, { color: I.ink }]}>{title}</Text>
          <Text style={[styles.suscripcionDisclosureSummary, { color: I.body }]} numberOfLines={2}>
            {summary}
          </Text>
        </View>
        <InstitutionalIcon
          name={expanded ? 'expand-less' : 'chevron-down'}
          size={22}
          color={I.muted}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </TouchableOpacity>
      {expanded ? (
        <View style={[styles.suscripcionDisclosureBody, { borderTopColor: I.hairline }]}>{children}</View>
      ) : null}
    </Card>
  );
}

/** Fondo Host: canvas sólido (sin glass). */
function CreditosScreenBackground({ children }: { children: React.ReactNode }) {
  return <View style={[styles.screenFill, { backgroundColor: CANVAS }]}>{children}</View>;
}

// ─────────────────────────────────────────────────────────────
// Pantalla principal
// ─────────────────────────────────────────────────────────────
export default function CreditosScreen() {
  const theme = useTheme();
  const colors = theme?.colors ?? COLORS ?? {};
  const insets = useSafeAreaInsets();

  /** Tokens Host / Tinder */
  const textPrimary = I_TAB.ink;
  const textSecondary = I_TAB.body;
  const primaryColor = I_TAB.primary;
  const backgroundDefault = CANVAS;
  const backgroundPaper = PAPER;
  const borderMain = I_TAB.hairline;

  const warningStatus = institutionalStatusColors('warning');

  const scrollBottomPad = useMemo(() => Math.max(32, insets.bottom + 24), [insets.bottom]);

  // ── Estado de UI ──────────────────────────────────────────
  const { tab, minCreditos: minCreditosParam } = useLocalSearchParams<{
    tab: TabType;
    minCreditos?: string;
  }>();
  const [activeTab, setActiveTab] = useState<TabType>('saldo');
  const [historialSubTab, setHistorialSubTab] = useState<HistorialSubTabType>('compras');

  // Manejar cambio de pestaña por parámetros (navegación profunda)
  useEffect(() => {
    if (tab && ['saldo', 'suscripcion', 'tienda', 'historial', 'rendimiento'].includes(tab)) {
      setActiveTab(tab as TabType);
    }
  }, [tab]);

  const minCreditosDesdeRuta = useMemo(() => {
    const n = parseInt(String(minCreditosParam ?? ''), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [minCreditosParam]);

  useEffect(() => {
    if (minCreditosDesdeRuta != null) {
      setCantidadComprar((prev) => Math.max(prev, minCreditosDesdeRuta));
    }
  }, [minCreditosDesdeRuta]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cargandoSuscripcion, setCargandoSuscripcion] = useState(false);
  const [cargandoSincronizar, setCargandoSincronizar] = useState(false);
  const [modalSuscripcion, setModalSuscripcion] = useState<ModalSuscripcion>({
    visible: false,
    checkoutUrl: '',
    suscripcionId: 0,
  });
  const [modalTablaServiciosVisible, setModalTablaServiciosVisible] = useState(false);
  const [guiaPlanesMensualesExpanded, setGuiaPlanesMensualesExpanded] = useState(false);
  const [cobrosRecurrentesExpanded, setCobrosRecurrentesExpanded] = useState(false);

  // ── Datos ─────────────────────────────────────────────────
  const [mpConectado, setMpConectado] = useState<boolean | null>(null); // null = cargando
  const [saldo, setSaldo] = useState<CreditoProveedor | null>(null);
  const [estadisticas, setEstadisticas] = useState<EstadisticasCreditos | null>(null);
  const [compras, setCompras] = useState<CompraCreditos[]>([]);
  const [consumos, setConsumos] = useState<ConsumoCredito[]>([]);
  const [suscripcion, setSuscripcion] = useState<SuscripcionProveedor | null>(null);
  const [planes, setPlanes] = useState<PlanSuscripcion[]>([]);
  const [estadisticasMP, setEstadisticasMP] = useState<EstadisticasPagosMP | null>(null);
  const [cantidadComprar, setCantidadComprar] = useState<number>(5);
  const [cobrosMP, setCobrosMP] = useState<CobroMP[]>([]);
  const [cargandoCobros, setCargandoCobros] = useState(false);
  const [kpiSugerenciaInsignia, setKpiSugerenciaInsignia] = useState<{
    mostrar: boolean;
    mensaje: string | null;
  }>({ mostrar: false, mensaje: null });

  // ── Computed ──────────────────────────────────────────────
  const tieneSuscripcionActiva = useMemo(
    () => suscripcion !== null && ['activa', 'pendiente'].includes(suscripcion?.estado ?? ''),
    [suscripcion]
  );
  const saldoCero = useMemo(
    () => saldo !== null && saldo.saldo_creditos === 0,
    [saldo]
  );
  const saldoBajo = useMemo(
    () => saldo !== null && saldo.saldo_creditos > 0 && saldo.saldo_creditos <= 5,
    [saldo]
  );
  const mostrarBannerComprarCreditos = saldoCero || saldoBajo;

  const tabsVisibles: TabType[] = useMemo(
    () => ['saldo', 'suscripcion', 'tienda', 'historial', 'rendimiento'],
    []
  );

  const precioTopUpClp = useMemo(
    () => Math.round(Number(estadisticas?.precio_credito_unitario_clp ?? FALLBACK_PRECIO_CREDITO_BRUTO_CLP)),
    [estadisticas?.precio_credito_unitario_clp]
  );

  const planesOrdenadosComparativa = useMemo(
    () => [...planes].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.precio - b.precio),
    [planes]
  );

  const requireMercadoPago = useCallback(
    (accion: string): boolean => {
      if (mpConectado) return true;
      Alert.alert(
        'Mercado Pago requerido',
        `Para ${accion} necesitas conectar tu cuenta de Mercado Pago.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Conectar',
            onPress: () => router.push('/configuracion-mercadopago'),
          },
        ],
      );
      return false;
    },
    [mpConectado],
  );

  // ── Carga de datos ────────────────────────────────────────
  const cargarDatos = useCallback(async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);

      // 1. Estado MP (no bloquea lectura de KPIs / finanzas)
      const mpResult = await mercadoPagoProveedorService.obtenerEstadoCuenta();
      const conectada = mpResult.success && mpResult.data?.estado === 'conectada';
      setMpConectado(conectada);

      // 2. Datos de lectura siempre disponibles
      const [
        saldoResult,
        estadisticasResult,
        comprasResult,
        consumosResult,
        suscripcionResult,
        planesResult,
        cobrosResult,
        kpisResumenResult,
      ] = await Promise.all([
        creditosService.obtenerSaldo(),
        creditosService.obtenerEstadisticas(),
        creditosService.obtenerHistorialCompras(50),
        creditosService.obtenerHistorialConsumos(50),
        suscripcionesService.obtenerMiSuscripcion(),
        suscripcionesService.obtenerPlanes(),
        suscripcionesService.obtenerHistorialCobros(),
        kpisProveedorService.obtenerResumen(30),
      ]);

      if (saldoResult.success && saldoResult.data) setSaldo(saldoResult.data);
      if (estadisticasResult.success && estadisticasResult.data) setEstadisticas(estadisticasResult.data);
      if (comprasResult.success && comprasResult.data) setCompras(comprasResult.data);
      if (consumosResult.success && consumosResult.data) setConsumos(consumosResult.data);
      if (suscripcionResult.success) setSuscripcion(suscripcionResult.suscripcion);
      if (planesResult.success) setPlanes(planesResult.planes);
      if (cobrosResult?.success) {
        setCobrosMP(cobrosResult.cobros);
      }
      if (kpisResumenResult.success && kpisResumenResult.data) {
        setKpiSugerenciaInsignia({
          mostrar: !!kpisResumenResult.data.sugerencia_suscripcion_para_insignia,
          mensaje: kpisResumenResult.data.mensaje_sugerencia_suscripcion ?? null,
        });
      } else {
        setKpiSugerenciaInsignia({ mostrar: false, mensaje: null });
      }

      // 3. Estadísticas de pagos MP solo si hay cuenta conectada
      if (conectada) {
        const estadisticasMPResult = await mercadoPagoProveedorService.obtenerEstadisticasPagos();
        if (estadisticasMPResult?.success && estadisticasMPResult.data) {
          setEstadisticasMP(estadisticasMPResult.data);
        }
      } else {
        setEstadisticasMP(null);
      }
    } catch (err: any) {
      console.error('[CreditosScreen] Error cargando datos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    cargarDatos(true);
  }, [cargarDatos]);

  // ── Handlers suscripción ──────────────────────────────────
  const handleSuscribirse = useCallback(async (plan: PlanSuscripcion) => {
    if (!requireMercadoPago('suscribirte a un plan')) return;
    setCargandoSuscripcion(true);
    try {
      const resultado = await suscripcionesService.suscribirse(plan.id);
      if (!resultado.success || !resultado.data) {
        Alert.alert('Error', resultado.error ?? 'No se pudo iniciar la suscripción.');
        return;
      }
      const { init_point, suscripcion_id } = resultado.data;
      if (!init_point) {
        Alert.alert('Error', 'MercadoPago no retornó una URL de pago válida.');
        return;
      }
      setModalSuscripcion({ visible: true, checkoutUrl: init_point, suscripcionId: suscripcion_id });
    } catch {
      Alert.alert('Error', 'Ocurrió un error inesperado. Intenta nuevamente.');
    } finally {
      setCargandoSuscripcion(false);
    }
  }, [requireMercadoPago]);

  const handleCancelarSuscripcion = useCallback(() => {
    Alert.alert(
      'Cancelar Suscripción',
      '¿Estás seguro de que quieres cancelar tu suscripción mensual? Perderás los créditos automáticos al finalizar el mes.',
      [
        { text: 'No, mantener', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            const resultado = await suscripcionesService.cancelarSuscripcion();
            if (resultado.success) {
              Alert.alert('Cancelada', resultado.mensaje ?? 'Tu suscripción fue cancelada.');
              setSuscripcion(null);
            } else {
              Alert.alert('Error', resultado.error ?? 'No se pudo cancelar.');
            }
          },
        },
      ]
    );
  }, []);

  const handleSincronizarSuscripcion = useCallback(async () => {
    setCargandoSincronizar(true);
    try {
      const resultado = await suscripcionesService.sincronizarSuscripcion();
      console.log('[handleSincronizarSuscripcion] Resultado:', JSON.stringify(resultado, null, 2));

      if (resultado.success && resultado.sincronizado) {
        // Verificar si se acreditaron cobros
        const cobrosProcesados = (resultado as any).cobros_procesados || [];
        const acreditados = cobrosProcesados.filter((c: any) => c.acreditado);

        let mensajeExito = resultado.mensaje ?? 'Tu suscripción fue sincronizada con Mercado Pago.';

        if (acreditados.length > 0) {
          const totalCreditos = acreditados.reduce((acc: number, c: any) => acc + (c.creditos || 0), 0);
          mensajeExito = `¡Éxito! Se detectaron y acreditaron ${totalCreditos} créditos de tu suscripción.`;

          Alert.alert(
            '¡Créditos Acreditados!',
            mensajeExito,
            [{ text: 'Excelente', onPress: () => cargarDatos() }]
          );
        } else if (resultado.estado === 'activa') {
          Alert.alert(
            'Suscripción Activa',
            mensajeExito + (cobrosProcesados.length > 0 ? '\n\nLos cobros ya habían sido acreditados anteriormente.' : ''),
            [{ text: 'OK', onPress: () => cargarDatos() }]
          );
        } else {
          Alert.alert(
            'Verificado',
            mensajeExito,
            [{ text: 'OK', onPress: () => cargarDatos() }]
          );
        }
      } else {
        Alert.alert('No encontrado', resultado.error || 'No se encontró una suscripción autorizada en Mercado Pago para tu cuenta.');
      }
    } catch (error) {
      console.error('[handleSincronizarSuscripcion] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al verificar. Intenta nuevamente.');
    } finally {
      setCargandoSincronizar(false);
    }
  }, [cargarDatos]);

  const handlePaymentSuccess = useCallback((_msg: string) => {
    setModalSuscripcion({ visible: false, checkoutUrl: '', suscripcionId: 0 });
    // Inactivar el modal antes de disparar la alerta para evitar bloqueos
    handleSincronizarSuscripcion();
  }, [handleSincronizarSuscripcion]);

  const handlePaymentFailure = useCallback((_msg: string) => {
    setModalSuscripcion({ visible: false, checkoutUrl: '', suscripcionId: 0 });
    Alert.alert('No Completado', 'No se pudo procesar la autorización. Intenta nuevamente.');
  }, []);

  const handlePaymentPending = useCallback(() => {
    setModalSuscripcion({ visible: false, checkoutUrl: '', suscripcionId: 0 });
    // Probar sincronización por si el pago fue aprobado pero el WebView no se enteró
    handleSincronizarSuscripcion();
  }, [handleSincronizarSuscripcion]);

  const handleModalClose = useCallback(() => {
    setModalSuscripcion({ visible: false, checkoutUrl: '', suscripcionId: 0 });
    handleSincronizarSuscripcion();
  }, [handleSincronizarSuscripcion]);

  const handleComprarPaquete = useCallback(
    (paquete: PaqueteCreditos) => {
      if (!requireMercadoPago('comprar créditos')) return;
      router.push({ pathname: '/creditos/comprar', params: { paqueteId: paquete.id.toString() } });
    },
    [requireMercadoPago],
  );

  // ── Loading inicial ───────────────────────────────────────
  if (loading || mpConectado === null) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <CreditosScreenBackground>
          <Header title="Suscripción & Créditos" showBack onBackPress={() => router.back()} />
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={primaryColor} />
            <Text style={[styles.loadingText, { color: textSecondary }]}>Cargando...</Text>
          </View>
        </CreditosScreenBackground>
      </SafeAreaView>
    );
  }

  // Aviso MP: solo en tabs donde bloquea una acción (Suscripción / Tienda) — no en
  // Saldo, Historial ni Rendimiento, que se pueden ver sin conectar. Estilo inline,
  // no bloque de color, para no competir con el contenido de cada tab.
  const mpNoticeTone = institutionalStatusColors('info');
  const mostrarMpBanner =
    mpConectado === false && (activeTab === 'suscripcion' || activeTab === 'tienda');
  const mpBannerAccion = activeTab === 'suscripcion' ? 'suscribirte' : 'comprar créditos';
  const mpBanner = mostrarMpBanner ? (
    <Pressable
      onPress={() => router.push('/configuracion-mercadopago')}
      style={({ pressed }) => [
        styles.mpBanner,
        { backgroundColor: mpNoticeTone.bg, borderColor: mpNoticeTone.border },
        pressed && styles.mpBannerPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Conectar Mercado Pago"
    >
      <Info size={16} color={mpNoticeTone.icon} strokeWidth={ICON_STROKE_WIDTH} />
      <Text style={[styles.mpBannerText, { color: textSecondary }]} numberOfLines={2}>
        Conecta Mercado Pago para {mpBannerAccion}.{' '}
        <Text style={[styles.mpBannerLink, { color: mpNoticeTone.text }]}>Conectar</Text>
      </Text>
    </Pressable>
  ) : null;

  // ── Contenido por tab ─────────────────────────────────────
  const scrollInnerStyle = [hostScreenStyles.scrollInner, { paddingBottom: scrollBottomPad }];

  const renderTabSaldo = () => (
    <ScrollView
      style={hostScreenStyles.scroll}
      contentContainerStyle={scrollInnerStyle}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
    >
      {saldo && (
        <SaldoCreditos
          saldo={saldo.saldo_creditos}
          titulo={suscripcion?.plan.nombre}
          creditosPlanMensuales={suscripcion?.plan.creditos_mensuales}
          fechaUltimoConsumo={saldo.fecha_ultimo_consumo}
          fechaUltimaCompra={saldo.fecha_ultima_compra}
          fechaProximaRecarga={
            tieneSuscripcionActiva ? suscripcion?.fecha_proximo_cobro ?? null : null
          }
          mesStats={
            estadisticas
              ? {
                  consumidos: estadisticas.creditos_consumidos_mes,
                  comprados: estadisticas.creditos_comprados_mes,
                  expirados: estadisticas.creditos_expirados,
                  ingresosMPClp: Math.round(estadisticasMP?.total_recibido_mes ?? 0),
                }
              : undefined
          }
          disabled={true}
        />
      )}

      <FinanzasLiquidacionSection />

      {/* Gráfica interactiva */}
      <InteractiveStatsChart consumos={consumos} precioCreditoReferenciaClp={precioTopUpClp} />

      {/* Saldo en cero o bajo (sin plan) → Tienda / compra a medida */}
      {mostrarBannerComprarCreditos && (
        <Card
          elevated
          padding={0}
          style={[
            styles.saldoBanner,
            {
              backgroundColor: withOpacitySafe(I_TAB.accentYellow, 0.14),
              borderColor: I_TAB.hairline,
            },
          ]}
          onPress={() => setActiveTab('tienda')}
        >
          <View style={styles.saldoBannerIconPlate}>
            <InstitutionalIcon
              name="lightning-bolt"
              size={20}
              color={hostIconPlateColor}
              strokeWidth={ICON_STROKE_WIDTH}
            />
          </View>
          <View style={styles.saldoBannerTextCol}>
            <Text style={[styles.saldoBannerTitle, { color: I_TAB.ink }]}>
              {saldoCero ? 'Sin créditos disponibles' : 'Te quedan pocos créditos'}
            </Text>
            <Text style={[styles.saldoBannerSub, { color: I_TAB.body }]}>
              {saldoCero
                ? 'Comprá en la pestaña Tienda para seguir postulando.'
                : 'Recargá en Tienda antes de quedarte sin saldo.'}
            </Text>
          </View>
          <InstitutionalIcon
            name="chevron-right"
            size={22}
            color={I_TAB.muted}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </Card>
      )}

      {kpiSugerenciaInsignia.mostrar && kpiSugerenciaInsignia.mensaje ? (
        <Card
          elevated
          padding={0}
          style={styles.saldoBanner}
          onPress={() => setActiveTab('suscripcion')}
        >
          <View style={styles.saldoBannerIconPlate}>
            <InstitutionalIcon
              name="star-circle-outline"
              size={20}
              color={hostIconPlateColor}
              strokeWidth={ICON_STROKE_WIDTH}
            />
          </View>
          <View style={styles.saldoBannerTextCol}>
            <Text style={[styles.saldoBannerTitle, { color: I_TAB.ink }]}>Destacá tu perfil</Text>
            <Text style={[styles.saldoBannerSub, { color: I_TAB.body }]}>
              {kpiSugerenciaInsignia.mensaje}
            </Text>
          </View>
          <InstitutionalIcon
            name="chevron-right"
            size={20}
            color={I_TAB.muted}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </Card>
      ) : null}

      {/* Guía educativa al final: ya viste números y gráfico */}
      <SaldoBenefitGrid />
    </ScrollView>
  );

  const renderTabSuscripcion = () => (
    <ScrollView
      style={hostScreenStyles.scroll}
      contentContainerStyle={scrollInnerStyle}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
    >
      {/* Sincronizar — button-secondary-light (Coinbase / institucional) */}
      <TouchableOpacity
        style={[styles.syncButtonSecondary, { opacity: cargandoSincronizar ? 0.75 : 1 }]}
        onPress={handleSincronizarSuscripcion}
        disabled={cargandoSincronizar}
        activeOpacity={0.88}
      >
        {cargandoSincronizar ? (
          <ActivityIndicator size="small" color={I_TAB.ink} />
        ) : (
          <>
            <InstitutionalIcon name="sync" size={18} color={I_TAB.ink} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.syncButtonSecondaryText}>¿Suscripción no aparece? Sincronizar</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Suscripción actual — product-ui-card-light */}
      {suscripcion && ['activa', 'pendiente', 'pausada'].includes(suscripcion.estado) && (
        <Card elevated padding={0} style={styles.suscripcionActualCardInst}>
          <View style={styles.suscripcionActualTopRow}>
            <View style={[styles.suscripcionIconPlate, { backgroundColor: I_TAB.surfaceStrong }]}>
              <InstitutionalIcon
                name={suscripcion.esta_activa ? 'check-decagram' : 'clock-outline'}
                size={22}
                color={suscripcion.esta_activa ? I_TAB.semanticUp : I_TAB.accentYellow}
                strokeWidth={ICON_STROKE_WIDTH}
              />
            </View>
            <View style={styles.suscripcionActualTitleCol}>
              <View style={styles.suscripcionStatusKickerRow}>
                <View style={[styles.badgePillKicker, { backgroundColor: I_TAB.surfaceStrong }]}>
                  <Text style={[styles.badgePillKickerText, { color: I_TAB.muted }]}>
                    {suscripcion.esta_activa ? 'ACTIVA' : suscripcion.estado === 'pendiente' ? 'PENDIENTE' : 'PAUSADA'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.suscripcionActualHeadline, { color: I_TAB.ink }]}>
                {suscripcion.esta_activa ? 'Tu suscripción' : 'Estado del plan'}
              </Text>
            </View>
          </View>

          <Text style={[styles.suscripcionPlanName, { color: I_TAB.ink }]}>{suscripcion.plan.nombre}</Text>
          <Text
            style={[
              styles.suscripcionDetailMono,
              { color: I_TAB.body, fontFamily: TYPOGRAPHY.fontFamily.monoMedium },
            ]}
          >
            {suscripcion.plan.creditos_mensuales} créditos/mes · {formatCLP(Math.round(suscripcion.plan.precio))}/mes
          </Text>
          {suscripcion.fecha_proximo_cobro && (
            <Text style={[styles.suscripcionDetailSecondary, { color: I_TAB.muted }]}>
              Próximo cobro:{' '}
              {new Date(suscripcion.fecha_proximo_cobro).toLocaleDateString('es-CL', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          )}
          {suscripcion.estado === 'pendiente' && (
            <View style={styles.suscripcionPendienteBlock}>
              <Text style={[styles.pendienteNotaInst, { color: I_TAB.body }]}>
                ¿Ya autorizaste el pago en Mercado Pago y sigue pendiente? Verificá el estado.
              </Text>
              <TouchableOpacity
                style={[styles.syncButtonSecondary, styles.suscripcionInlineSecondaryBtn]}
                onPress={handleSincronizarSuscripcion}
                disabled={cargandoSincronizar}
                activeOpacity={0.88}
              >
                {cargandoSincronizar ? (
                  <ActivityIndicator size="small" color={I_TAB.ink} />
                ) : (
                  <>
                    <InstitutionalIcon name="sync" size={18} color={I_TAB.ink} strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.syncButtonSecondaryText}>Verificar con Mercado Pago</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity
            style={[styles.botonCancelarInst, { borderColor: I_TAB.hairline }]}
            onPress={handleCancelarSuscripcion}
            activeOpacity={0.88}
          >
            <Text style={[styles.botonCancelarInstTexto, { color: I_TAB.semanticDown }]}>
              Cancelar suscripción
            </Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Protagonistas: planes primero; guía y cobros van colapsados debajo */}
      {planes.length > 0 ? (
        <View style={styles.suscripcionPlanosHeroHeader}>
          <Text style={[styles.suscripcionPlanosHeroTitle, { color: I_TAB.ink }]}>Elegí tu plan</Text>
          <Text style={[styles.suscripcionPlanosHeroSub, { color: I_TAB.body }]}>
            Compará cuota, créditos y ahorro vs la Tienda. Más contexto en las secciones desplegables.
          </Text>
        </View>
      ) : null}

      <View style={{ marginTop: planes.length > 0 ? SPACING.sm : 0 }}>
        {planes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <InstitutionalIcon name="package-variant-closed" size={48} color={textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={[styles.emptyText, { color: textSecondary }]}>
              No hay planes disponibles en este momento.
            </Text>
          </View>
        ) : (
          planesOrdenadosComparativa.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              suscripcionActual={suscripcion}
              onSuscribirse={handleSuscribirse}
              cargando={cargandoSuscripcion}
              precioRecargaPorCredito={precioTopUpClp}
            />
          ))
        )}
      </View>

      {planesOrdenadosComparativa.length > 0 ? (
        <SuscripcionDisclosureSection
          title="Cómo funcionan los planes mensuales"
          summary={`Referencia: crédito en Tienda ${formatCLP(precioTopUpClp)} / u · tocá para ver tabla y servicios`}
          expanded={guiaPlanesMensualesExpanded}
          onToggle={() => setGuiaPlanesMensualesExpanded((v) => !v)}
          kicker="GUÍA"
        >
          <PlanesMensualesGlassIntro
            precioTiendaPorCredito={precioTopUpClp}
            onVerTablaServicios={() => setModalTablaServiciosVisible(true)}
            embedded
          />
        </SuscripcionDisclosureSection>
      ) : null}

      {suscripcion && suscripcion.estado === 'activa' ? (
        <SuscripcionDisclosureSection
          title="Pagos recurrentes"
          summary={
            cobrosMP.length === 0
              ? 'Sin cobros en el resumen aún · el historial completo está en el tab Historial'
              : `${cobrosMP.length} ${cobrosMP.length === 1 ? 'movimiento reciente' : 'movimientos recientes'} · más detalle en Historial`
          }
          expanded={cobrosRecurrentesExpanded}
          onToggle={() => setCobrosRecurrentesExpanded((v) => !v)}
          kicker="MERCADO PAGO"
        >
          <Text style={[styles.cobrosDisclosureLead, { color: I_TAB.body }]}>
            Resumen de cobros del plan. Para compras Top-Up y más movimientos usá el tab Historial.
          </Text>
          {cobrosMP.length === 0 ? (
            <View style={[styles.cobrosEmptyInst, { backgroundColor: I_TAB.surfaceSoft }]}>
              <InstitutionalIcon name="info-outline" size={18} color={I_TAB.muted} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={[styles.cobrosEmptyTextInst, { color: I_TAB.body }]}>
                No hay cobros recurrentes registrados aún. Los créditos se acreditan cuando MP confirma el pago.
              </Text>
            </View>
          ) : (
            <View style={[styles.cobrosListWrap, { borderColor: I_TAB.hairline }]}>
              {cobrosMP.map((cobro, index) => {
                const isApproved = ['approved', 'authorized', 'processed'].includes(cobro.status);
                const isRejected = ['rejected', 'cancelled'].includes(cobro.status);
                const statusColor = cobro.verificado
                  ? I_TAB.semanticUp
                  : isApproved
                    ? I_TAB.semanticUp
                    : isRejected
                      ? I_TAB.semanticDown
                      : I_TAB.accentYellow;
                const statusLabel = cobro.verificado
                  ? 'Cobro verificado'
                  : isApproved
                    ? 'Cobro aprobado'
                    : isRejected
                      ? 'Cobro rechazado'
                      : `Estado: ${cobro.status}`;

                return (
                  <View
                    key={cobro.id}
                    style={[
                      styles.cobroRowInst,
                      index < cobrosMP.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: I_TAB.hairline,
                      },
                    ]}
                  >
                    <View style={styles.cobroRowInstLeft}>
                      <View style={[styles.cobroIconPlate, { backgroundColor: I_TAB.surfaceStrong }]}>
                        <InstitutionalIcon
                          name={
                            cobro.verificado ? 'verified' : isApproved ? 'check-circle' : isRejected ? 'cancel' : 'schedule'
                          }
                          size={18}
                          color={statusColor}
                          strokeWidth={ICON_STROKE_WIDTH}
                        />
                      </View>
                      <View style={styles.cobroRowInstText}>
                        <Text style={[styles.cobroStatusInst, { color: statusColor }]}>{statusLabel}</Text>
                        {cobro.fecha && (
                          <Text style={[styles.cobroDateInst, { color: I_TAB.muted }]}>
                            {new Date(cobro.fecha).toLocaleDateString('es-CL', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </Text>
                        )}
                        {cobro.verificado && cobro.card_last_four && (
                          <Text style={[styles.cobroDateInst, { color: I_TAB.muted }]}>
                            {cobro.payment_method === 'debit_card'
                              ? 'Débito'
                              : cobro.payment_method === 'credit_card'
                                ? 'Crédito'
                                : 'Tarjeta'}{' '}
                            ****{cobro.card_last_four}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.cobroRowInstRight}>
                      {cobro.monto != null && (
                        <Text style={[styles.cobroMontoInst, { color: I_TAB.ink }]}>
                          {formatCLP(Math.round(cobro.monto))}
                        </Text>
                      )}
                      {cobro.verificado && cobro.net_received != null && (
                        <Text style={[styles.cobroNetInst, { color: I_TAB.muted }]}>
                          Neto {formatCLP(Math.round(cobro.net_received))}
                        </Text>
                      )}
                      {cobro.acreditado && (
                        <View style={[styles.cobroTagPill, { backgroundColor: I_TAB.surfaceStrong }]}>
                          <Text style={[styles.cobroTagPillText, { color: I_TAB.semanticUp }]}>Acreditado</Text>
                        </View>
                      )}
                      {cobro.verificado && !cobro.acreditado && (
                        <View style={[styles.cobroTagPill, { backgroundColor: I_TAB.surfaceStrong }]}>
                          <Text style={[styles.cobroTagPillText, { color: I_TAB.accentYellow }]}>Pendiente</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </SuscripcionDisclosureSection>
      ) : null}

      <View
        style={[
          styles.notaContainerInst,
          { backgroundColor: I_TAB.surfaceSoft, borderColor: I_TAB.hairline, marginTop: SPACING.md },
        ]}
      >
        <InstitutionalIcon name="info-outline" size={16} color={I_TAB.muted} strokeWidth={ICON_STROKE_WIDTH} />
        <Text style={[styles.notaTextoInst, { color: I_TAB.body }]}>
          Los créditos mensuales son adicionales a tus recargas manuales. Los créditos de compras únicas (Top-Up) no se ven afectados por la suscripción.
        </Text>
      </View>
    </ScrollView>
  );

  const renderTabTienda = () => {
    // Mismo criterio que backend `comprar_creditos`: total = round(cantidad * precio_unitario_exacto).
    // No redondear el unitario antes de multiplicar (evita 520×25 vs 519.72×25 en MP).
    const precioUnitarioBruto = Number(
      estadisticas?.precio_credito_unitario_clp ?? FALLBACK_PRECIO_CREDITO_BRUTO_CLP
    );
    const PRECIO_TOTAL = Math.round(cantidadComprar * precioUnitarioBruto);
    const precioFormateado = new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(PRECIO_TOTAL);

    const creditosDisponibles = saldo?.saldo_creditos || 0;
    const restringirCompra = tieneSuscripcionActiva && creditosDisponibles > 5;

    return (
      <ScrollView
        style={hostScreenStyles.scroll}
        contentContainerStyle={scrollInnerStyle}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
      >
        {/* Banner si saldo = 0 */}
        {saldoCero && (
          <View
            style={[
              styles.bannerAlerta,
              {
                backgroundColor: warningStatus.bg,
                borderColor: warningStatus.border,
                marginBottom: 12,
              },
            ]}
          >
            <InstitutionalIcon
              name="lightning-bolt"
              size={20}
              color={warningStatus.icon}
              strokeWidth={ICON_STROKE_WIDTH}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <InstitutionalText role="body" color={warningStatus.text} style={styles.bannerTitulo}>
                Sin créditos disponibles
              </InstitutionalText>
              <InstitutionalText role="caption" color={warningStatus.text} style={styles.bannerSubtitulo}>
                Comprá créditos para seguir postulando a los trabajos disponibles.
              </InstitutionalText>
            </View>
          </View>
        )}

        {minCreditosDesdeRuta != null && (
          <View
            style={[
              styles.bannerAlerta,
              {
                backgroundColor: COLORS.selection.background,
                borderColor: COLORS.selection.border,
                marginBottom: 12,
              },
            ]}
          >
            <InstitutionalIcon name="info-outline" size={20} color={primaryColor}  strokeWidth={ICON_STROKE_WIDTH} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.bannerTitulo, { color: textPrimary }]}>Mínimo sugerido</Text>
              <Text style={[styles.bannerSubtitulo, { color: textSecondary }]}>
                Para confirmar la adjudicación necesitás al menos {minCreditosDesdeRuta} crédito
                {minCreditosDesdeRuta !== 1 ? 's' : ''}. Ajustamos la cantidad a comprar si hacía falta.
              </Text>
            </View>
          </View>
        )}

        {restringirCompra ? (
          <Card elevated padding="host" style={[styles.planCard, { alignItems: 'center', paddingVertical: SPACING['2xl'] }]}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: withOpacitySafe(I_TAB.semanticUp, 0.12), alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md }}>
              <InstitutionalIcon name="shield-check" size={32} color={I_TAB.semanticUp} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <Text style={[styles.planNombre, { color: textPrimary, textAlign: 'center', marginBottom: SPACING.sm }]}>
              Todo en orden
            </Text>
            <Text style={[styles.planDescripcion, { color: textSecondary, textAlign: 'center' }]}>
              Ya posees una suscripción activa y {creditosDisponibles} créditos disponibles. Podrás comprar más créditos de recarga cuando te queden 5 o menos créditos.
            </Text>
          </Card>
        ) : (
          <Card elevated padding="host" style={styles.planCard}>
            <Text style={[styles.planNombre, { color: textPrimary, textAlign: 'center', marginBottom: SPACING.md }]}>
              Comprar Créditos
            </Text>
            <Text style={[styles.planDescripcion, { color: textSecondary, textAlign: 'center', marginBottom: SPACING.xl }]}>
              Ingresa la cantidad exacta de créditos que necesitas. Precio vigente:{' '}
              {new Intl.NumberFormat('es-CL', {
                style: 'currency',
                currency: 'CLP',
                maximumFractionDigits: 2,
                minimumFractionDigits: 0,
              }).format(precioUnitarioBruto)}{' '}
              por crédito (total redondeado a peso, igual que en Mercado Pago).
            </Text>

            <View style={styles.counterContainer}>
              <TouchableOpacity
                style={[styles.counterButton, { backgroundColor: backgroundDefault, borderColor: borderMain }]}
                onPress={() => setCantidadComprar(prev => Math.max(1, prev - 1))}
              >
                <InstitutionalIcon name="remove" size={24} color={textPrimary}  strokeWidth={ICON_STROKE_WIDTH} />
              </TouchableOpacity>

              <View style={styles.counterValueContainer}>
                <Text style={[styles.counterValue, { color: primaryColor }]}>{cantidadComprar}</Text>
                <Text style={[styles.counterLabel, { color: textSecondary }]}>créditos</Text>
              </View>

              <TouchableOpacity
                style={[styles.counterButton, { backgroundColor: backgroundDefault, borderColor: borderMain }]}
                onPress={() => setCantidadComprar(prev => prev + 1)}
              >
                <InstitutionalIcon name="add" size={24} color={textPrimary}  strokeWidth={ICON_STROKE_WIDTH} />
              </TouchableOpacity>
            </View>

            <View style={styles.quickSelectContainer}>
              {[5, 10, 20, 50].map((val) => {
                const active = cantidadComprar === val;
                return (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.quickSelectButton,
                      active
                        ? {
                            backgroundColor: COLORS.selection.background,
                            borderColor: I_TAB.primary,
                          }
                        : { backgroundColor: PAPER, borderColor: borderMain },
                    ]}
                    onPress={() => setCantidadComprar(val)}
                  >
                    <Text
                      style={[
                        styles.quickSelectText,
                        active ? { color: COLORS.selection.text } : { color: textPrimary },
                      ]}
                    >
                      +{val}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.separador, { backgroundColor: borderMain }]} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md }}>
              <Text style={{ fontSize: TYPOGRAPHY.fontSize.lg, color: textSecondary, fontWeight: '600' }}>Total a pagar:</Text>
              <Text style={{ fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: 'bold', color: textPrimary }}>{precioFormateado}</Text>
            </View>

            <InstitutionalButton
              label="Continuar"
              variant="primary"
              size="compact"
              onPress={() => {
                if (!requireMercadoPago('comprar créditos')) return;
                router.push(`/creditos/comprar?cantidadCreditos=${cantidadComprar}`);
              }}
              style={styles.botonSuscribirse}
            />
          </Card>
        )}
      </ScrollView>
    );
  };

  const renderTabHistorial = () => (
    <View style={styles.historialContainer}>
      <View style={[styles.tabsOuter, { paddingHorizontal: HX }]}>
        <InstitutionalScreenTabs
          activeKey={historialSubTab}
          onChange={setHistorialSubTab}
          tabs={[
            {
              key: 'compras',
              label: 'Compras',
              leading: (
                <Receipt
                  size={14}
                  color={historialSubTab === 'compras' ? I_TAB.onPrimary : I_TAB.muted}
                />
              ),
              badge: compras.length > 0 ? compras.length : undefined,
            },
            {
              key: 'consumos',
              label: 'Consumos',
              leading: (
                <ScrollText
                  size={14}
                  color={historialSubTab === 'consumos' ? I_TAB.onPrimary : I_TAB.muted}
                />
              ),
              badge: consumos.length > 0 ? consumos.length : undefined,
            },
          ]}
        />
      </View>
      <View style={{ flex: 1 }}>
        {historialSubTab === 'compras' ? (
          <HistorialCompras compras={compras} onRefresh={onRefresh} refreshing={refreshing} />
        ) : (
          <HistorialConsumos consumos={consumos} onRefresh={onRefresh} refreshing={refreshing} />
        )}
      </View>
    </View>
  );

  const renderTabRendimiento = () => (
    <View style={styles.rendimientoContainer}>
      <RendimientoKpisContent />
    </View>
  );

  const tabPillsConfig: Record<TabType, { label: string; Icon: typeof Wallet }> = {
    saldo: { label: 'Saldo', Icon: Wallet },
    suscripcion: { label: 'Suscripción', Icon: CreditCard },
    tienda: { label: 'Tienda', Icon: Store },
    historial: { label: 'Historial', Icon: History },
    rendimiento: { label: 'Rendimiento', Icon: TrendingUp },
  };

  const historialItemsCount = compras.length + consumos.length;

  const badgeCountForMainTab = (t: TabType): number | null => {
    if (t === 'historial' && historialItemsCount > 0) return historialItemsCount;
    return null;
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <>
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <CreditosScreenBackground>
      <Header title="Suscripción & Créditos" showBack onBackPress={() => router.back()} />

      <View style={[styles.tabsOuter, { paddingHorizontal: HX }]}>
        <InstitutionalScreenTabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabs={tabsVisibles.map((tabKey) => {
            const cfg = tabPillsConfig[tabKey];
            const Icon = cfg.Icon;
            const active = activeTab === tabKey;
            const count = badgeCountForMainTab(tabKey);
            return {
              key: tabKey,
              label: cfg.label,
              leading: <Icon size={14} color={active ? I_TAB.onPrimary : I_TAB.muted} />,
              badge: count != null && count > 0 ? count : undefined,
            };
          })}
        />
      </View>

      {mpBanner}

      {/* Contenido */}
      {activeTab === 'saldo' && renderTabSaldo()}
      {activeTab === 'suscripcion' && renderTabSuscripcion()}
      {activeTab === 'tienda' && renderTabTienda()}
      {activeTab === 'historial' && renderTabHistorial()}
      {activeTab === 'rendimiento' && renderTabRendimiento()}
      </CreditosScreenBackground>

      {/* Modal MP Suscripción (fuera del gradiente para capa completa) */}
      {modalSuscripcion.visible && (
        <MercadoPagoWebViewModal
          visible={modalSuscripcion.visible}
          checkoutUrl={modalSuscripcion.checkoutUrl}
          compraId={modalSuscripcion.suscripcionId}
          suscripcionId={modalSuscripcion.suscripcionId}
          verificarSuscripcion={suscripcionesService.verificarSuscripcion}
          onClose={handleModalClose}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailure={handlePaymentFailure}
          onPaymentPending={handlePaymentPending}
        />
      )}
    </SafeAreaView>

    <TablaServiciosCreditosModal
      visible={modalTablaServiciosVisible}
      onClose={() => setModalTablaServiciosVisible(false)}
    />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CANVAS },
  screenFill: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  loadingText: { marginTop: SPACING.sm, fontSize: TYPOGRAPHY.fontSize.md },

  mpBanner: {
    marginHorizontal: SPACING.container.horizontal,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  mpBannerPressed: {
    opacity: 0.92,
  },
  mpBannerText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    lineHeight: 16,
  },
  mpBannerLink: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
  },

  // ─── Bloqueo MP (legacy styles retained) ───────────────────
  bloqueoCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
    maxWidth: 340,
    width: '100%',
  },
  bloqueoTitulo: { fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: '800', textAlign: 'center' },
  bloqueoDescripcion: { fontSize: TYPOGRAPHY.fontSize.sm, textAlign: 'center', lineHeight: 22 },
  botonBloqueo: {
    marginTop: SPACING.sm,
    alignSelf: 'stretch',
    width: '100%',
  },

  /** Contenedor horizontal para `InstitutionalScreenTabs` */
  tabsOuter: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },

  // ─── Banners (tab Saldo — Host paper via Card) ──────────
  saldoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.sm,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  saldoBannerIconPlate: {
    ...hostIconPlateStyle,
  },
  saldoBannerTextCol: { flex: 1, minWidth: 0 },
  saldoBannerTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
  },
  saldoBannerSub: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    marginTop: 2,
    lineHeight: 18,
  },
  bannerAlerta: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    marginBottom: SPACING.md,
  },
  bannerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    marginBottom: SPACING.md,
  },
  bannerTitulo: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '700' },
  bannerSubtitulo: { fontSize: TYPOGRAPHY.fontSize.xs, marginTop: 2 },
  suscripcionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    marginBottom: SPACING.md,
  },
  bannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  suscripcionBannerTitulo: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '700' },
  suscripcionBannerSubtitulo: { fontSize: TYPOGRAPHY.fontSize.xs, marginTop: 1 },

  // ─── Suscripción tab (institucional / Coinbase pricing) ───
  syncButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    backgroundColor: COLORS.institutional.surfaceStrong,
    borderColor: COLORS.institutional.hairline,
  },
  syncButtonSecondaryText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    color: COLORS.institutional.ink,
  },
  suscripcionActualCardInst: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  suscripcionActualTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  suscripcionIconPlate: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suscripcionActualTitleCol: { flex: 1, minWidth: 0 },
  suscripcionStatusKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: 4,
  },
  badgePillKicker: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
  },
  badgePillKickerText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
  },
  suscripcionActualHeadline: {
    fontSize: TYPOGRAPHY.styles.h3.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    lineHeight: TYPOGRAPHY.styles.h3.lineHeight * TYPOGRAPHY.styles.h3.fontSize,
  },
  suscripcionPlanName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    marginTop: 2,
  },
  suscripcionDetailMono: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginTop: 6,
    lineHeight: 20,
  },
  suscripcionDetailSecondary: { fontSize: TYPOGRAPHY.fontSize.xs, marginTop: 4, lineHeight: 18 },
  suscripcionPendienteBlock: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.institutional.hairline,
  },
  pendienteNotaInst: { fontSize: TYPOGRAPHY.fontSize.sm, lineHeight: 20, marginBottom: SPACING.sm },
  suscripcionInlineSecondaryBtn: { marginTop: 0, alignSelf: 'flex-start' },
  botonCancelarInst: {
    marginTop: SPACING.md,
    borderWidth: BORDERS.width.thin,
    borderRadius: BORDERS.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  botonCancelarInstTexto: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
  },
  cobrosSectionInst: {
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cobrosHeadBlock: { marginBottom: SPACING.md, gap: 6 },
  cobrosTitleInst: {
    fontSize: TYPOGRAPHY.styles.h3.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    marginTop: SPACING.xs,
  },
  cobrosSubtitleInst: { fontSize: TYPOGRAPHY.fontSize.sm, lineHeight: 20, marginTop: 4 },
  cobrosEmptyInst: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.md,
  },
  cobrosEmptyTextInst: { fontSize: TYPOGRAPHY.fontSize.sm, flex: 1, lineHeight: 20 },
  cobrosListWrap: {
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    overflow: 'hidden',
  },
  cobroRowInst: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  cobroRowInstLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1, minWidth: 0 },
  cobroIconPlate: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cobroRowInstText: { flex: 1, minWidth: 0 },
  cobroStatusInst: { fontSize: TYPOGRAPHY.fontSize.sm, fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold, fontWeight: '600' },
  cobroDateInst: { fontSize: TYPOGRAPHY.fontSize.xs, marginTop: 2 },
  cobroRowInstRight: { alignItems: 'flex-end', marginLeft: SPACING.sm, gap: 4 },
  cobroMontoInst: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.monoMedium,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
  },
  cobroNetInst: { fontSize: TYPOGRAPHY.fontSize.xs },
  cobroTagPill: {
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDERS.radius.pill,
  },
  cobroTagPillText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
  },
  planIntroOuter: {
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  planIntroInner: { padding: SPACING.md },
  planIntroKickerPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: COLORS.institutional.surfaceStrong,
    marginBottom: SPACING.xs,
  },
  planIntroKickerPillText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    color: COLORS.institutional.muted,
  },
  planIntroCtaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: SPACING.md,
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.institutional.hairline,
  },
  planIntroCtaSecondaryText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
  },
  planTierOuter: {
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  planTierInner: { padding: SPACING.md },
  planTierHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  planTierKicker: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.sm,
    borderWidth: BORDERS.width.thin,
  },
  planTierKickerText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
  },
  planTierBadgeTuPlan: {
    paddingHorizontal: 10,
    borderWidth: BORDERS.width.thin,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.sm,
  },
  planTierBadgeTuPlanText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: 0.4,
  },
  planTierName: {
    fontSize: TYPOGRAPHY.styles.h3.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontWeight: TYPOGRAPHY.fontWeight.regular as '400',
    letterSpacing: TYPOGRAPHY.styles.h3.letterSpacing,
    marginBottom: SPACING.sm,
  },
  planTierTable: {
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    overflow: 'hidden',
  },
  planTierCta: {
    marginTop: SPACING.md,
    minHeight: 44,
    borderRadius: BORDERS.radius.pill,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTierCtaText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
  },
  notaContainerInst: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: BORDERS.width.thin,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  notaTextoInst: { fontSize: TYPOGRAPHY.fontSize.sm, flex: 1, lineHeight: 20 },

  planIntroEmbeddedRoot: {
    paddingTop: SPACING.xs,
  },
  suscripcionPlanosHeroHeader: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  suscripcionPlanosHeroTitle: {
    fontSize: TYPOGRAPHY.styles.h2.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: TYPOGRAPHY.styles.h2.letterSpacing,
  },
  suscripcionPlanosHeroSub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 20,
    marginTop: 6,
  },
  suscripcionDisclosureCard: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
    overflow: 'hidden',
  },
  suscripcionDisclosureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  suscripcionDisclosureHeaderText: { flex: 1, minWidth: 0 },
  suscripcionDisclosureTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
  },
  suscripcionDisclosureSummary: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 20,
    marginTop: 4,
  },
  suscripcionDisclosureBody: {
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cobrosDisclosureLead: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },

  // ─── PlanCard — tabla de precios + % ahorro ─────────────────
  planTablePanel: {
    marginTop: SPACING.xs,
    borderRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    overflow: 'hidden',
  },
  planTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: SPACING.sm,
    gap: SPACING.xs,
  },
  planTableLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium as '500',
    flexShrink: 0,
  },
  planTableValueRight: { alignItems: 'flex-end', flex: 1, minWidth: 0 },
  planTablePriceMain: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    fontWeight: '800',
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
    lineHeight: TYPOGRAPHY.fontSize['3xl'] * 1.1,
  },
  planTablePriceSub: { fontSize: TYPOGRAPHY.fontSize.xs, marginTop: 2 },
  planTableEmphasis: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    textAlign: 'right',
    flexShrink: 1,
  },
  planTableStrikeRow: { marginTop: 4 },
  planTableStrike: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    textAlign: 'right',
    textDecorationLine: 'line-through',
    opacity: 0.85,
  },
  planPctHero: {
    marginTop: SPACING.xs,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  planPctHeroLeft: { alignItems: 'flex-start' },
  planPctHeroNumber: {
    fontSize: TYPOGRAPHY.fontSize['4xl'],
    fontWeight: '900',
    letterSpacing: TYPOGRAPHY.letterSpacing.tighter,
    lineHeight: TYPOGRAPHY.fontSize['4xl'] * 1.05,
  },
  planPctHeroCaption: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    marginTop: 2,
  },
  planPctHeroSub: { fontSize: TYPOGRAPHY.fontSize.xs, marginTop: 6, lineHeight: 16 },
  planPctNeutral: {
    marginTop: SPACING.xs,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  planPctNeutralText: { fontSize: TYPOGRAPHY.fontSize.sm, textAlign: 'center', lineHeight: 20 },
  planFootnote: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    marginTop: SPACING.xs,
    lineHeight: 16,
    fontWeight: '500',
    paddingHorizontal: 2,
  },
  planFootnoteFine: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    marginTop: 4,
    lineHeight: 15,
    opacity: 0.9,
    paddingHorizontal: 2,
  },
  // ─── PlanCard (tienda / fallback sólido) ─────────────────
  planCard: {
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  badgeDestacado: {
    position: 'absolute', top: 0, right: 0,
    paddingHorizontal: 12, paddingVertical: 5, borderBottomLeftRadius: 12,
  },
  badgeActual: {
    position: 'absolute', top: 0, left: 0,
    paddingHorizontal: 12, paddingVertical: 5, borderBottomRightRadius: 12,
  },
  badgeSmallText: { color: COLORS.institutional.onPrimary, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  planNombre: { fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: '800', marginTop: SPACING.md },
  planDescripcion: { fontSize: TYPOGRAPHY.fontSize.sm, marginTop: 4, lineHeight: 20 },
  precioContainer: { flexDirection: 'row', alignItems: 'flex-end', marginTop: SPACING.md, gap: 2 },
  precioCurrency: { fontSize: 22, fontWeight: '700', paddingBottom: 4 },
  precioValor: { fontSize: 40, fontWeight: '900', lineHeight: 44 },
  precioPeriodo: { fontSize: TYPOGRAPHY.fontSize.md, paddingBottom: 6 },
  creditosRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: SPACING.md },
  creditosTexto: { fontSize: TYPOGRAPHY.fontSize.md },
  separador: { height: 1, marginVertical: SPACING.sm },
  botonSuscribirse: {
    marginTop: SPACING.sm,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  botonSuscribirseBleed: {
    marginHorizontal: -HX,
  },
  botonSuscribirseTexto: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: '700' },

  // ─── Nota / Empty ─────────────────────────────────────────
  notaContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  planIntroKicker: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: '800',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    marginBottom: 2,
  },
  planIntroTitle: {
    fontSize: TYPOGRAPHY.styles.h2.fontSize,
    fontWeight: TYPOGRAPHY.styles.h2.fontWeight as '700',
    letterSpacing: TYPOGRAPHY.styles.h2.letterSpacing,
    lineHeight: TYPOGRAPHY.styles.h2.lineHeight * TYPOGRAPHY.styles.h2.fontSize,
  },
  planIntroLead: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 19,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  pTableWrap: {
    borderRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    overflow: 'hidden',
  },
  pTableHead: {
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  pTableHeadText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: '800',
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  pTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: SPACING.sm,
    gap: SPACING.xs,
  },
  pTableLabel: { fontSize: TYPOGRAPHY.fontSize.sm, flex: 1, fontWeight: '500' },
  pTableValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 0,
    maxWidth: '52%',
  },
  pTableValueStrong: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '800',
    textAlign: 'right',
    flexShrink: 1,
    maxWidth: '52%',
  },
  pTableFoot: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  pTableFootText: { flex: 1, fontSize: TYPOGRAPHY.fontSize.xs, lineHeight: 17 },
  /** Secundario / outline: no competir con CTA primario de suscripción */
  planIntroCtaOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: BORDERS.radius.button.md,
    borderWidth: BORDERS.width.thin,
    paddingVertical: 10,
    paddingHorizontal: SPACING.sm,
    marginTop: SPACING.sm,
  },
  planIntroCtaOutlineText: {
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  notaTexto: { fontSize: TYPOGRAPHY.fontSize.xs, flex: 1, lineHeight: 18 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: TYPOGRAPHY.fontSize.md, textAlign: 'center' },

  // ─── Historial ────────────────────────────────────────────
  historialContainer: { flex: 1 },
  rendimientoContainer: { flex: 1 },
  botonVerificar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
  },
  botonVerificarTexto: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '600' },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  syncButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '500',
  },
  topSyncContainer: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  topSyncContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.institutional.canvas,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.institutional.hairline,
  },
  topSyncText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: '600',
  },
  // ─── Custom Counter ────────────────────────────────────────
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.lg,
  },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValueContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  counterValue: {
    fontSize: 48,
    fontWeight: '900',
    lineHeight: 52,
  },
  counterLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  quickSelectContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  quickSelectButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BORDERS.radius.sm,
    borderWidth: BORDERS.width.thin,
  },
  quickSelectText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: '600',
  },

  // ─── Cobros MP ─────────────────────────────────────────────
  cobrosSection: {
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cobrosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },
  cobrosTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: '700',
  },
  cobrosEmpty: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: SPACING.sm,
    backgroundColor: COLORS.institutional.surfaceSoft,
    borderRadius: 10,
  },
  cobrosEmptyText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    flex: 1,
    lineHeight: 18,
  },
  cobroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.sm,
    marginBottom: 8,
  },
  cobroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cobroStatus: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600',
  },
  cobroDate: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    marginTop: 2,
  },
  cobroRight: {
    alignItems: 'flex-end',
    marginLeft: SPACING.sm,
  },
  cobroMonto: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: '700',
  },
  cobroAcreditadoBadge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
});
