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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  User,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  LogOut,
  CreditCard,
  Wallet,
  Headphones,
  FileText,
  MessageCircle,
  Camera,
  Bookmark,
  Users,
  Clock,
  type LucideIcon,
} from 'lucide-react-native';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import Header from '@/components/Header';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
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

const I = COLORS.institutional;

function SectionKicker({ label }: { label: string }) {
  return (
    <View style={styles.sectionKickerWrap}>
      <Text style={styles.sectionKickerText}>{label}</Text>
    </View>
  );
}

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
      return `Índice del taller en Mecanimovil (últimos ${d} días). Posiciona tu negocio en la app de clientes.`;
    }
    if (kpisResumen.loading) {
      return `Últimos ${kpisResumen.ventanaDiasMostrada} días con actividad · cargando…`;
    }
    if (kpisResumen.error) {
      return 'No se pudo cargar. Entra para reintentar.';
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
    router.push('/creditos?tab=rendimiento');
  }, []);

  const handleRecargarCreditos = useCallback(() => {
    router.push('/creditos?tab=tienda');
  }, []);

  const handleFinanzasCardPress = useCallback(() => {
    router.push('/creditos?tab=saldo');
  }, []);

  const handlePressPlanSuscripcion = useCallback(() => {
    router.push('/creditos?tab=suscripcion');
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
    // Servicios vive en el tab inferior (Activas / Completadas / Rechazadas).
    // Bandeja comercial: card en Hoy — no duplicar aquí.
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

  // Airbnb Hosts: Dinero separado de herramientas de operación.
  const dineroRows: SettingRow[] = useMemo(() => {
    if (esSupervisor || esMecanicoEquipo) return [];
    return [
      {
        Icon: CreditCard,
        title: 'Finanzas',
        subtitle: 'Plan, créditos y rendimiento',
        onPress: () => router.push('/creditos?tab=saldo'),
      },
      {
        Icon: Wallet,
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

  const renderSettingGroup = (rows: SettingRow[]) => (
    <View style={[styles.groupCard, SHADOWS.editorial]}>
      {rows.map((item, index) => (
        <TouchableOpacity
          key={`${item.title}-${index}`}
          style={[
            styles.settingRow,
            index < rows.length - 1 && {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: I.hairline,
            },
          ]}
          onPress={item.onPress}
          activeOpacity={0.88}
        >
          <View style={[styles.rowIconPlate, { backgroundColor: I.surfaceSoft }]}>
            <item.Icon size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.settingTitle, { color: I.ink }]}>{item.title}</Text>
            <Text style={[styles.settingSubtitle, { color: I.body }]}>{item.subtitle}</Text>
          </View>
          <ChevronRight size={20} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
        </TouchableOpacity>
      ))}
    </View>
  );

  const infoRows = useMemo(() => {
    const rows: { Icon: LucideIcon; label: string; value: string }[] = [
      { Icon: User, label: 'Usuario', value: usuario?.username ? `@${usuario.username}` : 'Sin usuario' },
      { Icon: Mail, label: 'Email', value: usuario?.email || 'Sin email' },
    ];
    const tel = estadoProveedor?.datos_proveedor?.telefono;
    if (tel) rows.push({ Icon: Phone, label: 'Teléfono', value: tel });
    const datos = estadoProveedor?.datos_proveedor as
      | { direccion_fisica?: { direccion_completa?: string }; direccion?: string }
      | undefined;
    const dir = datos?.direccion_fisica?.direccion_completa || datos?.direccion;
    if (dir) rows.push({ Icon: MapPin, label: 'Dirección', value: dir });
    return rows;
  }, [estadoProveedor?.datos_proveedor, usuario?.email, usuario?.username]);

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

  const estadoTag = getEstadoTag();

  return (
    <TabScreenWrapper>
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header
          title="Menú"
          rightComponent={
            esSupervisor || esMecanicoEquipo ? undefined : (
              <InstitutionalButton
                label="Gestionar perfil"
                variant="tertiary"
                onPress={() => router.push('/configuracion-perfil')}
                accessibilityLabel="Gestionar perfil"
              />
            )
          }
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: SPACING['2xl'] }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Identidad — misma superficie paper que insights (Airbnb Host Menu) */}
          <View style={styles.profileCard}>
            <View style={styles.profileIdentityRow}>
              <View style={styles.avatarWrap}>
                {fotoProveedor ? (
                  <Image source={{ uri: fotoProveedor }} style={[styles.avatar, { borderColor: I.hairline }]} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: I.surfaceSoft, borderColor: I.hairline }]}>
                    <User size={28} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                  </View>
                )}
                {esMecanicoEquipo ? (
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
                {rolTaller === 'mandante' ? (
                  <InstitutionalTag
                    label={estadoTag.label}
                    variant={estadoTag.variant}
                    size="md"
                    style={styles.statusTag}
                  />
                ) : null}
              </View>
            </View>
            {etiquetasPerfil.length > 0 ? (
              <View style={styles.badgesRow}>
                {etiquetasPerfil.map((badge) => (
                  <InstitutionalTag
                    key={badge.label}
                    label={badge.label}
                    variant={perfilBadgeToTag(badge.variant)}
                    size="sm"
                  />
                ))}
              </View>
            ) : null}
          </View>

          <View style={{ paddingHorizontal: SPACING.container.horizontal }}>
            {!esMecanicoEquipo ? (
              <>
            {/* 1. Insights del negocio */}
            {cuentaAprobadaPorAdmin ? (
              <>
                <SectionKicker label="TU NEGOCIO" />
                <View style={styles.tuNegocioStack}>
                  <PerformanceWidget
                    progress={kpisResumen.progress}
                    targetTierName={kpisResumen.targetTierName}
                    periodSubtitle={rendimientoWidgetPeriod}
                    isLoading={kpisResumen.loading && !kpisResumen.hasData}
                    onPress={handlePerformanceWidgetPress}
                  />
                  {showFinanzasCard ? (
                    saldoCreditos ? (
                      <FinanzasTallerCard
                        ganancias={gananciasResumen}
                        saldoCreditos={saldoCreditos}
                        suscripcion={suscripcion}
                        esSupervisor={esSupervisor}
                        isLoadingGanancias={gananciasQuery.loading && !gananciasResumen}
                        isLoadingCreditos={saldoCreditosQuery.loading && !saldoCreditos}
                        warningEmphasis={warningEmphasis}
                        onPress={handleFinanzasCardPress}
                        onRecargarCreditos={handleRecargarCreditos}
                        onPressPlan={handlePressPlanSuscripcion}
                      />
                    ) : (
                      <FinanzasTallerCardSkeleton />
                    )
                  ) : null}
                </View>
              </>
            ) : null}

            {/* 2. Operar el taller */}
            {gestionRows.length > 0 ? (
              <>
                <SectionKicker label="OPERAR" />
                {renderSettingGroup(gestionRows)}
              </>
            ) : null}

            {/* 3. Dinero */}
            {dineroRows.length > 0 ? (
              <>
                <SectionKicker label="DINERO" />
                {renderSettingGroup(dineroRows)}
              </>
            ) : null}

            {/* 4. Herramientas / ajustes */}
            {herramientasRows.length > 0 ? (
              <>
                <SectionKicker label="HERRAMIENTAS" />
                <View style={[styles.groupCard, SHADOWS.editorial]}>
                  {herramientasRows.map((item, index) => (
                    <TouchableOpacity
                      key={`${item.title}-${index}`}
                      style={[
                        styles.settingRow,
                        index < herramientasRows.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: I.hairline,
                        },
                      ]}
                      onPress={item.onPress}
                      activeOpacity={0.88}
                    >
                      <View style={[styles.rowIconPlate, { backgroundColor: I.surfaceSoft }]}>
                        <item.Icon size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                      </View>
                      <View style={styles.rowText}>
                        <Text style={[styles.settingTitle, { color: I.ink }]}>{item.title}</Text>
                        <Text style={[styles.settingSubtitle, { color: I.body }]}>{item.subtitle}</Text>
                      </View>
                      <ChevronRight size={20} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                    </TouchableOpacity>
                  ))}
                  <WebPushSettingsRow showTopBorder={herramientasRows.length > 0} />
                </View>
              </>
            ) : null}

            {/* 5. Datos de cuenta (referencia, abajo) */}
            <SectionKicker label="CUENTA" />
            <View style={[styles.groupCard, SHADOWS.editorial]}>
              {infoRows.map((item, index) => (
                <View
                  key={`${item.label}-${index}`}
                  style={[
                    styles.infoRow,
                    index < infoRows.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: I.hairline,
                    },
                  ]}
                >
                  <View style={[styles.rowIconPlate, { backgroundColor: I.surfaceSoft }]}>
                    <item.Icon size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.infoFieldLabel, { color: I.muted }]}>{item.label}</Text>
                    <Text style={[styles.infoFieldValue, { color: I.ink }]} numberOfLines={4}>
                      {item.value}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
              </>
            ) : (
              <>
                <SectionKicker label="HERRAMIENTAS" />
                <View style={[styles.groupCard, SHADOWS.editorial]}>
                  <TouchableOpacity
                    style={styles.settingRow}
                    onPress={() => router.push('/guias-reparacion' as never)}
                    activeOpacity={0.88}
                  >
                    <View style={[styles.rowIconPlate, { backgroundColor: I.surfaceSoft }]}>
                      <Bookmark size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={[styles.settingTitle, { color: I.ink }]}>Guías de reparación</Text>
                      <Text style={[styles.settingSubtitle, { color: I.body }]}>
                        Procedimientos guardados por marca y modelo
                      </Text>
                    </View>
                    <ChevronRight size={20} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            <View style={[styles.footerBlock, { borderTopColor: I.hairline }]}>
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

              <TouchableOpacity style={styles.privacyRow} onPress={handleContactarSoporte} activeOpacity={0.88}>
                <FileText size={14} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={[styles.privacyText, { color: I.muted }]}>
                  {esMecanicoEquipo ? 'Contacto soporte' : 'Privacidad y política · contacto'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </TabScreenWrapper>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background.default },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: SPACING.xs },
  centeredContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
  },
  sectionKickerWrap: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sectionKickerText: {
    fontSize: TYPOGRAPHY.styles.h6.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    fontWeight: '500',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
    color: I.muted,
  },
  profileCard: {
    marginHorizontal: SPACING.container.horizontal,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: COLORS.background.paper,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    ...SHADOWS.editorial,
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
  statusTag: {
    marginTop: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: SPACING.sm,
  },
  tuNegocioStack: {
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  groupCard: {
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.background.paper,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  rowIconPlate: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0 },
  infoFieldLabel: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoFieldValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    lineHeight: 22,
  },
  settingTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
  },
  settingSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    marginTop: 2,
    lineHeight: 18,
  },
  footerBlock: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  logoutText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
  },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  privacyText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    flex: 1,
  },
});
