import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  User,
  ChevronRight,
  LogOut,
  CreditCard,
  Wallet,
  History,
  TrendingUp,
  Landmark,
  Headphones,
  FileText,
  MessageCircle,
  Bot,
  Camera,
  Bookmark,
  Users,
  Clock,
  Wrench,
  Tags,
  MapPinned,
  type LucideIcon,
} from 'lucide-react-native';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import Header from '@/components/Header';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import {
  Card,
  HostSectionKicker,
  hostScreenStyles,
} from '@/app/design-system/components';
import type { InstitutionalTagVariant } from '@/app/design-system/styles/institutionalTags';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { showAlert, showConfirm } from '@/utils/platformAlert';
import { WebPushSettingsRow } from '@/components/push/WebPushPermissionBanner';
import { equipoTallerService, type MiembroTaller } from '@/services/equipoTallerService';
import {
  obtenerEtiquetasPerfil,
  obtenerNombreDisplayPerfil,
  obtenerSubtituloTallerPerfil,
  type PerfilBadgeVariant,
} from '@/utils/perfilSesionDisplay';
import { PerformanceWidget } from '@/components/dashboard/PerformanceWidget';
import { FinanzasTallerCard } from '@/components/dashboard/FinanzasTallerCard';
import { FinanzasTallerCardSkeleton } from '@/components/dashboard/FinanzasTallerCardSkeleton';
import { useProveedorKpisResumen } from '@/hooks/useProveedorKpisResumen';
import {
  useSaldoCreditosQuery,
  useGananciasResumenQuery,
  useSuscripcionProveedorQuery,
  invalidateDashboardFinanzasQueries,
} from '@/hooks/useDashboardFinanzas';
import { navegarServiciosCompletados } from '@/utils/navegarServiciosCompletados';

const I = COLORS.institutional;

function perfilBadgeToTag(variant: PerfilBadgeVariant): InstitutionalTagVariant {
  switch (variant) {
    case 'warning':
      return 'warning';
    case 'primary':
      return 'primary';
    case 'success':
      return 'success';
    default:
      return 'neutral';
  }
}

export default function PerfilScreen() {
  const queryClient = useQueryClient();
  const lastFinanzasInvalidateRef = useRef(0);
  const FINANZAS_INVALIDATE_MIN_MS = 60_000;

  const {
    isAuthenticated,
    isLoading,
    estadoProveedor,
    usuario,
    logout,
    obtenerNombreProveedor,
    esSupervisor,
    esMecanicoEquipo,
    rolTaller,
    miembroId,
    puede,
  } = useAuth();

  const { width: windowWidth } = useWindowDimensions();
  const insightsWide = windowWidth >= 720;

  const cuentaAprobadaPorAdmin = estadoProveedor?.estado_verificacion === 'aprobado';
  const dashboardFinanzasEnabled = Boolean(
    isAuthenticated && cuentaAprobadaPorAdmin && !isLoading,
  );

  const kpisResumen = useProveedorKpisResumen({
    enabled: dashboardFinanzasEnabled && !esMecanicoEquipo,
    dias: 30,
  });

  const rendimientoWidgetPeriod = useMemo(() => {
    if (kpisResumen.data) {
      const d = kpisResumen.data.ventana_dias;
      return `Últimos ${d} días · Toca para ver el índice completo`;
    }
    if (kpisResumen.loading) {
      return `Últimos ${kpisResumen.ventanaDiasMostrada} días · cargando…`;
    }
    if (kpisResumen.error) {
      return 'No se pudo cargar · toca para reintentar';
    }
    return `Últimos ${kpisResumen.ventanaDiasMostrada} días · mismo índice que en detalle`;
  }, [
    kpisResumen.data,
    kpisResumen.loading,
    kpisResumen.error,
    kpisResumen.ventanaDiasMostrada,
  ]);

  const saldoCreditosQuery = useSaldoCreditosQuery(dashboardFinanzasEnabled && puede('finanzas'));
  const gananciasQuery = useGananciasResumenQuery(dashboardFinanzasEnabled && puede('finanzas'));
  const suscripcionQuery = useSuscripcionProveedorQuery(dashboardFinanzasEnabled && !esSupervisor);
  const saldoCreditos = saldoCreditosQuery.data;
  const gananciasResumen = gananciasQuery.data;
  const suscripcion = suscripcionQuery.data;
  const showFinanzasCard = puede('finanzas') && (saldoCreditos || saldoCreditosQuery.loading);
  const warningEmphasis = COLORS.warning.dark;

  const handlePerformanceWidgetPress = useCallback(() => {
    router.push('/rendimiento-kpis');
  }, []);

  const handleRecargarCreditos = useCallback(() => {
    router.push({ pathname: '/creditos', params: { tab: 'tienda' } });
  }, []);

  const handleFinanzasCardPress = useCallback(() => {
    router.push('/creditos/saldo' as never);
  }, []);

  const handleFinanzasCanalPress = useCallback((canal: 'app' | 'propias') => {
    navegarServiciosCompletados(router, { canal, mes: 'actual' });
  }, []);

  const handlePressPlanSuscripcion = useCallback(() => {
    router.push({ pathname: '/creditos', params: { tab: 'suscripcion' } });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated || !cuentaAprobadaPorAdmin) return;
      if (dashboardFinanzasEnabled && puede('finanzas')) {
        const now = Date.now();
        if (now - lastFinanzasInvalidateRef.current >= FINANZAS_INVALIDATE_MIN_MS) {
          lastFinanzasInvalidateRef.current = now;
          invalidateDashboardFinanzasQueries(queryClient);
        }
      }
    }, [
      cuentaAprobadaPorAdmin,
      dashboardFinanzasEnabled,
      isAuthenticated,
      puede,
      queryClient,
    ]),
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [fotoMecanicoUrl, setFotoMecanicoUrl] = useState<string | null>(null);
  const [miembroEquipo, setMiembroEquipo] = useState<MiembroTaller | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const fotoProveedor = useMemo(() => {
    if (esMecanicoEquipo && fotoMecanicoUrl) return fotoMecanicoUrl;
    const fotoDesdeDatos = (estadoProveedor?.datos_proveedor as { foto_perfil?: string } | undefined)?.foto_perfil;
    if (fotoDesdeDatos) return fotoDesdeDatos;
    if (usuario?.foto_perfil) return usuario.foto_perfil;
    return null;
  }, [esMecanicoEquipo, fotoMecanicoUrl, estadoProveedor?.datos_proveedor, usuario?.foto_perfil]);

  const cargarMiembroEquipo = useCallback(async () => {
    if (!esMecanicoEquipo && !esSupervisor) {
      setMiembroEquipo(null);
      return;
    }
    try {
      if (esMecanicoEquipo) {
        if (miembroId) {
          const propio = await equipoTallerService.obtener(miembroId);
          setMiembroEquipo(propio);
          if (propio.foto_url) setFotoMecanicoUrl(propio.foto_url);
          return;
        }
        const miembros = await equipoTallerService.listar({ rol: 'mecanico' });
        const propio =
          miembros.find((m) => m.usuario === usuario?.id)
          ?? miembros[0];
        if (propio) {
          setMiembroEquipo(propio);
          if (propio.foto_url) setFotoMecanicoUrl(propio.foto_url);
        }
        return;
      }
      if (esSupervisor && usuario?.id) {
        const miembros = await equipoTallerService.listar({ rol: 'supervisor' });
        const propio = miembros.find((m) => m.usuario === usuario.id);
        if (propio) setMiembroEquipo(propio);
      }
    } catch {
      // silencioso: las etiquetas usan fallback desde estadoProveedor
    }
  }, [esMecanicoEquipo, esSupervisor, miembroId, usuario?.id]);

  React.useEffect(() => {
    void cargarMiembroEquipo();
  }, [cargarMiembroEquipo]);

  const nombreDisplay = useMemo(
    () =>
      obtenerNombreDisplayPerfil({
        rolTaller,
        estadoProveedor,
        usuario,
        miembroEquipo,
        nombreProveedorFallback: obtenerNombreProveedor(),
      }),
    [rolTaller, estadoProveedor, usuario, miembroEquipo, obtenerNombreProveedor],
  );

  const subtituloTaller = useMemo(
    () => obtenerSubtituloTallerPerfil({ rolTaller, estadoProveedor }),
    [rolTaller, estadoProveedor],
  );

  const etiquetasPerfil = useMemo(
    () => obtenerEtiquetasPerfil({ rolTaller, estadoProveedor, miembroEquipo }),
    [rolTaller, estadoProveedor, miembroEquipo],
  );

  const cambiarFotoMecanico = async () => {
    if (!miembroId) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para cambiar la imagen de perfil.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled || !result.assets[0]) return;
      setSubiendoFoto(true);
      const asset = result.assets[0];
      const actualizado = await equipoTallerService.subirFoto(miembroId, {
        uri: asset.uri,
        type: 'image/jpeg',
        name: `mecanico_${miembroId}.jpg`,
      });
      setFotoMecanicoUrl(actualizado.foto_url || asset.uri);
    } catch {
      Alert.alert('Error', 'No se pudo actualizar la foto de perfil.');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const handleContactarSoporte = () => {
    const phoneNumber = '+56995945258';
    const message =
      'Hola, soy proveedor de la app MecaniMóvil y tengo un problema con la aplicación, pagos o configuración.';
    const url = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (!supported) {
          Alert.alert('Error', 'No se pudo abrir WhatsApp. Verificá que esté instalado.');
        } else return Linking.openURL(url);
      })
      .catch(() => {});
  };

  const handleCerrarSesion = () => {
    showConfirm('Cerrar sesión', '¿Seguro que querés salir?', {
      confirmText: 'Cerrar sesión',
      onConfirm: async () => {
        try {
          setIsLoggingOut(true);
          await logout();
        } catch {
          showAlert('Error', 'No se pudo cerrar la sesión.');
        } finally {
          setIsLoggingOut(false);
        }
      },
    });
  };

  const getEstadoTag = (): { label: string; variant: InstitutionalTagVariant } => {
    if (estadoProveedor?.verificado) return { label: 'Verificado', variant: 'success' };
    if (estadoProveedor?.estado_verificacion === 'aprobado' && !estadoProveedor?.verificado) {
      return { label: 'Validando documentación', variant: 'warning' };
    }
    switch (estadoProveedor?.estado_verificacion) {
      case 'pendiente':
        return { label: 'Pendiente de revisión', variant: 'warning' };
      case 'en_revision':
        return { label: 'En revisión', variant: 'primary' };
      case 'rechazado':
        return { label: 'Rechazado', variant: 'error' };
      default:
        return { label: 'Sin estado', variant: 'neutral' };
    }
  };

  type SettingRow = {
    Icon: LucideIcon;
    title: string;
    subtitle: string;
    onPress: () => void;
  };

  const gestionRows: SettingRow[] = useMemo(() => {
    if (esMecanicoEquipo) return [];
    const rows: SettingRow[] = [];
    // Tab inferior «Servicios» = órdenes operativas. Catálogo/precios vive aquí (Mis servicios).
    if (!esSupervisor || puede('servicios')) {
      rows.push({
        Icon: Wrench,
        title: 'Mis servicios',
        subtitle: 'Catálogo, precios y disponibilidad',
        onPress: () => router.push('/mis-servicios'),
      });
      rows.push({
        Icon: Tags,
        title: 'Especialidades',
        subtitle: 'Marcas que atiendes',
        onPress: () => router.push('/especialidades-marcas'),
      });
    }
    if (!esSupervisor || puede('zonas_cobertura')) {
      rows.push({
        Icon: MapPinned,
        title: 'Zonas de servicio',
        subtitle: 'Cobertura geográfica',
        onPress: () => router.push('/zonas-servicio'),
      });
    }
    if (!esSupervisor || puede('mecanicos')) {
      rows.push({
        Icon: Users,
        title: 'Mi Equipo',
        subtitle: 'Mecánicos y rendimiento',
        onPress: () => router.push('/gestion-equipo'),
      });
    }
    if (!esSupervisor || puede('horarios')) {
      rows.push({
        Icon: Clock,
        title: 'Horarios',
        subtitle: 'Agenda del taller y mecánicos',
        onPress: () => router.push('/configuracion-horarios'),
      });
    }
    return rows;
  }, [esMecanicoEquipo, esSupervisor, puede]);

  // Airbnb Hosts: Dinero — pantallas dedicadas (sin hub saturado).
  const dineroRows: SettingRow[] = useMemo(() => {
    if (esSupervisor || esMecanicoEquipo) return [];
    return [
      {
        Icon: CreditCard,
        title: 'Plan y créditos',
        subtitle: 'Suscripción mensual y tienda',
        onPress: () => router.push('/creditos'),
      },
      {
        Icon: Wallet,
        title: 'Saldo',
        subtitle: 'Créditos, uso del plan y liquidación',
        onPress: () => router.push('/creditos/saldo' as never),
      },
      {
        Icon: History,
        title: 'Historial',
        subtitle: 'Compras y consumos de créditos',
        onPress: () => router.push('/creditos/historial' as never),
      },
      {
        Icon: TrendingUp,
        title: 'Rendimiento',
        subtitle: 'KPIs e insignias del taller',
        onPress: () => router.push('/rendimiento-kpis'),
      },
      {
        Icon: Landmark,
        title: 'Mercado Pago',
        subtitle: 'Cobros y cuenta',
        onPress: () => router.push('/configuracion-mercadopago'),
      },
    ];
  }, [esSupervisor, esMecanicoEquipo]);

  const herramientasRows: SettingRow[] = useMemo(() => {
    const rows: SettingRow[] = [];
    if (!esSupervisor) {
      rows.push({
        Icon: MessageCircle,
        title: 'Canales de mensajería',
        subtitle: 'WhatsApp, Facebook e Instagram',
        onPress: () => router.push('/configuracion-canales' as never),
      });
      rows.push({
        Icon: Bot,
        title: 'Agente IA',
        subtitle: 'Respuestas automáticas y cotizaciones',
        onPress: () => router.push('/configuracion-agente-ia' as never),
      });
    }
    if (!esMecanicoEquipo) {
      rows.push({
        Icon: FileText,
        title: 'Plantillas de cotización',
        subtitle: 'Cotizaciones guardadas por vehículo',
        onPress: () => router.push('/cotizaciones-plantillas' as never),
      });
    }
    rows.push({
      Icon: Headphones,
      title: 'Soporte',
      subtitle: 'Ayuda por WhatsApp',
      onPress: handleContactarSoporte,
    });
    return rows;
  }, [esSupervisor, esMecanicoEquipo]);

  type MenuSection = { kicker: string; rows: SettingRow[] };

  const menuSections = useMemo((): MenuSection[] => {
    const sections: MenuSection[] = [];
    if (gestionRows.length > 0) sections.push({ kicker: 'Operar', rows: gestionRows });
    if (dineroRows.length > 0) sections.push({ kicker: 'Dinero', rows: dineroRows });
    if (herramientasRows.length > 0) sections.push({ kicker: 'Herramientas', rows: herramientasRows });
    return sections;
  }, [gestionRows, dineroRows, herramientasRows]);

  const renderMenuRow = (item: SettingRow, showDivider: boolean, rowKey: string) => (
    <TouchableOpacity
      key={rowKey}
      style={[styles.menuRow, showDivider && styles.menuRowDivider]}
      onPress={item.onPress}
      activeOpacity={0.88}
    >
      <View style={styles.menuIconPlate}>
        <item.Icon size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.menuRowTitle}>{item.title}</Text>
        <Text style={styles.menuRowSubtitle} numberOfLines={2}>
          {item.subtitle}
        </Text>
      </View>
      <View style={styles.menuChevronPlate}>
        <ChevronRight size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
      </View>
    </TouchableOpacity>
  );

  const renderMenuGroup = (section: MenuSection, footer?: React.ReactNode) => (
    <View key={section.kicker} style={styles.menuGroupBlock}>
      <HostSectionKicker label={section.kicker} />
      <Card elevated padding={0} style={styles.groupCard}>
        {section.rows.map((item, index) =>
          renderMenuRow(item, index < section.rows.length - 1, `${section.kicker}-${item.title}`),
        )}
        {footer}
      </Card>
    </View>
  );

  const renderTallerIdentityCard = (showFotoEdit = false) => {
    const tagEstado = getEstadoTag();
    const showGestionarPerfil = !esSupervisor && !esMecanicoEquipo;
    return (
    <Card elevated padding="host" style={styles.surfaceCard}>
      <View style={styles.profileIdentityRow}>
        <View style={styles.avatarWrap}>
          {fotoProveedor ? (
            <Image source={{ uri: fotoProveedor }} style={[styles.avatar, { borderColor: I.hairline }]} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: I.surfaceSoft, borderColor: I.hairline }]}>
              <User size={28} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
          )}
          {showFotoEdit ? (
            <TouchableOpacity
              style={[styles.fotoEditBtn, { backgroundColor: I.primary }]}
              onPress={() => void cambiarFotoMecanico()}
              disabled={subiendoFoto}
              activeOpacity={0.85}
            >
              {subiendoFoto ? (
                <ActivityIndicator size="small" color={I.onPrimary} />
              ) : (
                <Camera size={14} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
              )}
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.profileMeta}>
          <Text style={[styles.profileName, { color: I.ink }]} numberOfLines={2}>
            {nombreDisplay}
          </Text>
          {subtituloTaller ? (
            <Text style={[styles.profileSubtitle, { color: I.muted }]} numberOfLines={1}>
              {subtituloTaller}
            </Text>
          ) : null}
        </View>
      </View>

      {(rolTaller === 'mandante' || etiquetasPerfil.length > 0 || showGestionarPerfil) ? (
        <View style={styles.identityMetaRow}>
          <View style={styles.identityTagsRow}>
            {rolTaller === 'mandante' ? (
              <InstitutionalTag label={tagEstado.label} variant={tagEstado.variant} size="sm" />
            ) : null}
            {etiquetasPerfil.map((badge) => (
              <InstitutionalTag
                key={badge.label}
                label={badge.label}
                variant={perfilBadgeToTag(badge.variant)}
                size="sm"
              />
            ))}
          </View>
          {showGestionarPerfil ? (
            <InstitutionalButton
              label="Gestionar perfil"
              variant="outlineAccent"
              size="compact"
              onPress={() => router.push('/configuracion-perfil')}
              accessibilityLabel="Gestionar perfil"
              style={styles.gestionarPerfilBtn}
            />
          ) : null}
        </View>
      ) : null}
    </Card>
    );
  };

  if (isLoading) {
    return (
      <TabScreenWrapper>
        <View style={styles.screen}>
          <View style={styles.centeredContainer}>
            <ActivityIndicator size="large" color={I.primary} />
            <Text style={[styles.loadingText, { color: I.body }]}>Cargando menú…</Text>
          </View>
        </View>
      </TabScreenWrapper>
    );
  }

  return (
    <TabScreenWrapper>
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="Menú" />

        <ScrollView
          style={hostScreenStyles.scroll}
          contentContainerStyle={[hostScreenStyles.scrollInner, { paddingBottom: SPACING['2xl'] }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={hostScreenStyles.stretch}>
            {!esMecanicoEquipo ? (
              <>
                <HostSectionKicker label="Tu perfil" />
                {renderTallerIdentityCard()}

                {cuentaAprobadaPorAdmin ? (
                  <>
                    <HostSectionKicker label="Tu negocio" />
                    <View style={[styles.insightsStack, insightsWide && styles.insightsStackWide]}>
                      <PerformanceWidget
                        style={insightsWide ? styles.insightHalf : undefined}
                        fill={insightsWide}
                        progress={kpisResumen.progress}
                        targetTierName={kpisResumen.targetTierName}
                        periodSubtitle={rendimientoWidgetPeriod}
                        isLoading={kpisResumen.loading && !kpisResumen.hasData}
                        onPress={handlePerformanceWidgetPress}
                      />
                      {showFinanzasCard ? (
                        saldoCreditos ? (
                          <FinanzasTallerCard
                            style={insightsWide ? styles.insightHalf : undefined}
                            fill={insightsWide}
                            ganancias={gananciasResumen}
                            saldoCreditos={saldoCreditos}
                            suscripcion={suscripcion}
                            esSupervisor={esSupervisor}
                            isLoadingGanancias={gananciasQuery.loading && !gananciasResumen}
                            isLoadingCreditos={saldoCreditosQuery.loading && !saldoCreditos}
                            warningEmphasis={warningEmphasis}
                            onPress={handleFinanzasCardPress}
                            onPressCanal={handleFinanzasCanalPress}
                            onRecargarCreditos={handleRecargarCreditos}
                            onPressPlan={handlePressPlanSuscripcion}
                          />
                        ) : (
                          <FinanzasTallerCardSkeleton
                            fill={insightsWide}
                            style={insightsWide ? styles.insightHalf : undefined}
                          />
                        )
                      ) : null}
                    </View>
                  </>
                ) : null}

                {menuSections.map((section) =>
                  renderMenuGroup(
                    section,
                    section.kicker === 'Herramientas' ? (
                      <WebPushSettingsRow showTopBorder={section.rows.length > 0} />
                    ) : undefined,
                  ),
                )}
              </>
            ) : (
              <>
                <HostSectionKicker label="Tu perfil" />
                {renderTallerIdentityCard(true)}

                <HostSectionKicker label="Herramientas" />
                <Card elevated padding={0} style={styles.groupCard}>
                  {renderMenuRow(
                    {
                      Icon: Bookmark,
                      title: 'Guías de reparación',
                      subtitle: 'Procedimientos guardados por marca y modelo',
                      onPress: () => router.push('/guias-reparacion' as never),
                    },
                    false,
                    'guias-reparacion',
                  )}
                </Card>
              </>
            )}

            <HostSectionKicker label="Cuenta" />
            <Card elevated padding={0} style={styles.groupCard}>
              {renderMenuRow(
                {
                  Icon: FileText,
                  title: 'Privacidad, datos y términos',
                  subtitle: 'Exportar datos, preferencias y baja',
                  onPress: () => router.push('/privacidad-datos'),
                },
                true,
                'privacidad-datos',
              )}
              {renderMenuRow(
                {
                  Icon: Headphones,
                  title: 'Contactar soporte',
                  subtitle: 'Ayuda por WhatsApp',
                  onPress: handleContactarSoporte,
                },
                false,
                'soporte-footer',
              )}
            </Card>

            <TouchableOpacity
              style={[styles.logoutRow, { opacity: isLoggingOut ? 0.55 : 1 }]}
              onPress={handleCerrarSesion}
              disabled={isLoggingOut}
              activeOpacity={0.88}
            >
              <LogOut size={18} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={[styles.logoutText, { color: I.semanticDown }]}>
                {isLoggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
              </Text>
              {isLoggingOut ? (
                <ActivityIndicator size="small" color={I.semanticDown} style={{ marginLeft: SPACING.sm }} />
              ) : null}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </TabScreenWrapper>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background.default },
  centeredContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
  },
  surfaceCard: {
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  insightsStack: {
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  insightsStackWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  insightHalf: {
    flex: 1,
    minWidth: 0,
  },
  menuGroupBlock: {
    marginBottom: SPACING.md,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: 64,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background.paper,
  },
  menuRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  menuIconPlate: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.surfaceSoft,
  },
  menuChevronPlate: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.surfaceSoft,
  },
  menuRowTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    color: I.ink,
  },
  menuRowSubtitle: {
    marginTop: 2,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    lineHeight: 18,
    color: I.body,
  },
  groupCard: {
    overflow: 'hidden',
  },
  hubDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: I.hairline,
    marginVertical: SPACING.sm,
  },
  hubSectionLabel: {
    fontSize: TYPOGRAPHY.styles.h6.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: '600',
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    color: I.ink,
    marginBottom: SPACING.xs,
  },
  profileIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  profileMeta: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  fotoEditBtn: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: I.canvas,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: BORDERS.width.thin,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: BORDERS.width.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: TYPOGRAPHY.styles.h3.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: '600',
    lineHeight: Math.round(TYPOGRAPHY.styles.h3.fontSize * TYPOGRAPHY.styles.h3.lineHeight),
  },
  profileSubtitle: {
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    lineHeight: Math.round(TYPOGRAPHY.styles.caption.fontSize * TYPOGRAPHY.styles.caption.lineHeight),
  },
  identityMetaRow: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  identityTagsRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  gestionarPerfilBtn: {
    flexShrink: 0,
  },
  rowText: { flex: 1, minWidth: 0 },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  logoutText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
  },
});
