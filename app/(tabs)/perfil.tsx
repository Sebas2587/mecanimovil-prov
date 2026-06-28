import React, { useState, useMemo } from 'react';
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
import { useAuth } from '@/context/AuthContext';
import { router, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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
  type LucideIcon,
} from 'lucide-react-native';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import Header from '@/components/Header';
import { BLANK_GLASS, GLASS_INSET } from '@/app/design-system/blankGlass';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { institutionalStatusColors } from '@/app/design-system/styles/institutionalSemantic';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { showAlert, showConfirm } from '@/utils/platformAlert';

const I = COLORS.institutional;
const warningStatus = institutionalStatusColors('warning');
const primaryStatus = institutionalStatusColors('primary');
const successStatus = institutionalStatusColors('success');

function SectionKicker({ label }: { label: string }) {
  return (
    <View style={styles.sectionKickerWrap}>
      <View style={[styles.sectionPill, { backgroundColor: I.surfaceStrong }]}>
        <Text style={[styles.sectionPillText, { color: I.muted }]}>{label}</Text>
      </View>
    </View>
  );
}

export default function PerfilScreen() {
  const {
    isLoading,
    estadoProveedor,
    usuario,
    logout,
    obtenerNombreProveedor,
    esSupervisor,
  } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const fotoProveedor = useMemo(() => {
    const fotoDesdeDatos = (estadoProveedor?.datos_proveedor as { foto_perfil?: string } | undefined)?.foto_perfil;
    if (fotoDesdeDatos) return fotoDesdeDatos;
    if (usuario?.foto_perfil) return usuario.foto_perfil;
    return null;
  }, [estadoProveedor?.datos_proveedor, usuario?.foto_perfil]);

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

  const getEstadoInk = () => {
    if (estadoProveedor?.verificado) return I.semanticUp;
    if (estadoProveedor?.estado_verificacion === 'aprobado' && !estadoProveedor?.verificado) return I.primary;
    switch (estadoProveedor?.estado_verificacion) {
      case 'pendiente':
        return I.accentYellow;
      case 'en_revision':
        return I.primary;
      case 'rechazado':
        return I.semanticDown;
      default:
        return I.muted;
    }
  };

  const getEstadoTexto = () => {
    if (estadoProveedor?.verificado) return 'Verificado';
    if (estadoProveedor?.estado_verificacion === 'aprobado' && !estadoProveedor?.verificado) {
      return 'Validando documentación';
    }
    switch (estadoProveedor?.estado_verificacion) {
      case 'pendiente':
        return 'Pendiente de revisión';
      case 'en_revision':
        return 'En revisión';
      case 'rechazado':
        return 'Rechazado';
      default:
        return 'Sin estado';
    }
  };

  type SettingRow = {
    Icon: LucideIcon;
    title: string;
    subtitle: string;
    onPress: () => void;
  };

  // El supervisor no gestiona suscripción ni la cuenta de Mercado Pago (módulos del dueño).
  const settingsRows: SettingRow[] = [
    ...(esSupervisor
      ? []
      : [
          { Icon: CreditCard, title: 'Suscripción', subtitle: 'Plan y créditos', onPress: () => router.push('/creditos') },
          {
            Icon: Wallet,
            title: 'Mercado Pago',
            subtitle: 'Cobros y cuenta',
            onPress: () => router.push('/configuracion-mercadopago'),
          },
          {
            Icon: MessageCircle,
            title: 'Canales de mensajería',
            subtitle: 'WhatsApp, Facebook e Instagram',
            onPress: () => router.push('/configuracion-canales' as never),
          },
        ] as SettingRow[]),
    {
      Icon: Headphones,
      title: 'Soporte',
      subtitle: 'Ayuda por WhatsApp',
      onPress: handleContactarSoporte,
    },
  ];

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
        <LinearGradient
          style={styles.gradient}
          colors={BLANK_GLASS.gradient}
          locations={BLANK_GLASS.gradientLocations}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        >
          <View style={styles.centeredContainer}>
            <ActivityIndicator size="large" color={I.primary} />
            <Text style={[styles.loadingText, { color: I.body }]}>Cargando configuración…</Text>
          </View>
        </LinearGradient>
      </TabScreenWrapper>
    );
  }

  const estadoInk = getEstadoInk();

  return (
    <TabScreenWrapper>
      <LinearGradient
        style={styles.gradient}
        colors={BLANK_GLASS.gradient}
        locations={BLANK_GLASS.gradientLocations}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <Header
          title="Configuración"
          rightComponent={
            esSupervisor ? undefined : (
              <TouchableOpacity
                onPress={() => router.push('/configuracion-perfil')}
                style={styles.buttonTertiaryText}
                activeOpacity={0.65}
                accessibilityRole="button"
                accessibilityLabel="Gestionar perfil"
              >
                <Text style={[styles.buttonTertiaryTextLabel, { color: I.primary }]}>Gestionar perfil</Text>
              </TouchableOpacity>
            )
          }
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: SPACING['2xl'] }]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.profileCard,
              { backgroundColor: I.canvas, borderColor: I.hairline },
              SHADOWS.editorial,
            ]}
          >
            <View style={styles.avatarWrap}>
              {fotoProveedor ? (
                <Image source={{ uri: fotoProveedor }} style={[styles.avatar, { borderColor: I.hairline }]} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: I.surfaceSoft, borderColor: I.hairline }]}>
                  <User size={36} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                </View>
              )}
            </View>
            <Text style={[styles.profileName, { color: I.ink }]}>{obtenerNombreProveedor() || 'Proveedor'}</Text>
            <View style={[styles.statusPill, { backgroundColor: I.surfaceStrong }]}>
              <View style={[styles.statusDot, { backgroundColor: estadoInk }]} />
              <Text style={[styles.statusLabel, { color: estadoInk }]}>{getEstadoTexto()}</Text>
            </View>
            {/* Fila de badges: tipo proveedor + cobertura de marcas */}
            <View style={styles.badgesRow}>
              {esSupervisor ? (
                <View style={[styles.tipoProveedorPill, { backgroundColor: warningStatus.bg }]}>
                  <Text style={[styles.tipoProveedorPillText, { color: warningStatus.text }]}>SUPERVISOR</Text>
                </View>
              ) : null}
              {estadoProveedor?.tipo_proveedor ? (
                <View style={[styles.tipoProveedorPill, { backgroundColor: I.surfaceStrong }]}>
                  <Text style={[styles.tipoProveedorPillText, { color: I.muted }]}>
                    {estadoProveedor.tipo_proveedor === 'taller' ? 'TALLER MECÁNICO' : 'MECÁNICO A DOMICILIO'}
                  </Text>
                </View>
              ) : null}
              {(() => {
                const cobertura = estadoProveedor?.tipo_cobertura_marca
                  || (estadoProveedor?.datos_proveedor as any)?.tipo_cobertura_marca;
                if (!cobertura) return null;
                const isMultimarca = cobertura === 'multimarca';
                return (
                  <View style={[
                    styles.coberturaPill,
                    {
                      backgroundColor: isMultimarca ? primaryStatus.bg : successStatus.bg,
                      borderColor: isMultimarca ? primaryStatus.border : successStatus.border,
                    }
                  ]}>
                    <Text style={[styles.coberturaPillText, { color: isMultimarca ? I.primary : I.semanticUp }]}>
                      {isMultimarca ? '🌐 MULTIMARCA' : '⭐ ESPECIALISTA'}
                    </Text>
                  </View>
                );
              })()}
            </View>
          </View>

          <View style={{ paddingHorizontal: GLASS_INSET }}>
            <SectionKicker label="CUENTA" />
            <View
              style={[
                styles.groupCard,
                { backgroundColor: I.canvas, borderColor: I.hairline },
                SHADOWS.editorial,
              ]}
            >
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
                  <View style={[styles.rowIconPlate, { backgroundColor: I.surfaceStrong }]}>
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

            <SectionKicker label="GESTIÓN" />
            <View
              style={[
                styles.groupCard,
                { backgroundColor: I.canvas, borderColor: I.hairline },
                SHADOWS.editorial,
              ]}
            >
              {settingsRows.map((item, index) => (
                <TouchableOpacity
                  key={`${item.title}-${index}`}
                  style={[
                    styles.settingRow,
                    index < settingsRows.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: I.hairline,
                    },
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.88}
                >
                  <View style={[styles.rowIconPlate, { backgroundColor: I.surfaceStrong }]}>
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
                <Text style={[styles.privacyText, { color: I.muted }]}>Privacidad y política · contacto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </TabScreenWrapper>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: SPACING.xs },
  centeredContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
  },
  /**
   * Coinbase-style `button-tertiary-text`: sin fill ni borde; copy en `primary`;
   * tipografía CTA (`TYPOGRAPHY.styles.button`); área mínima 44pt (DESIGN_PROVEEDORES_INSTITUCIONAL).
   */
  buttonTertiaryText: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    minHeight: 44,
    minWidth: 44,
    paddingVertical: 10,
    paddingHorizontal: SPACING.xs,
  },
  buttonTertiaryTextLabel: {
    fontSize: TYPOGRAPHY.styles.button.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.styles.button.fontWeight as '600',
    lineHeight: Math.round(
      TYPOGRAPHY.styles.button.fontSize * TYPOGRAPHY.styles.button.lineHeight
    ),
  },
  sectionKickerWrap: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sectionPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
  },
  sectionPillText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
  },
  profileCard: {
    marginHorizontal: GLASS_INSET,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    borderRadius: BORDERS.radius.xl,
    borderWidth: BORDERS.width.thin,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  avatarWrap: { marginBottom: SPACING.sm },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: BORDERS.width.thin,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: BORDERS.width.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.pill,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: SPACING.sm,
  },
  /** Misma semántica que `sectionPill` / kicker: etiqueta pequeña mayúsculas */
  tipoProveedorPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
  },
  tipoProveedorPillText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
  },
  coberturaPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
    borderWidth: 1,
  },
  coberturaPillText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
  },
  groupCard: {
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
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
