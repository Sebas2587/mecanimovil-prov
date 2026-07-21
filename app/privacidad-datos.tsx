import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ChevronRight, FileText, Headphones, Shield, Share2, Trash2 } from 'lucide-react-native';
import { AppHeader } from '@/app/design-system/components/AppHeader';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import {
  Card,
  HostSectionKicker,
  hostScreenStyles,
} from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import {
  deleteAccount,
  exportMyData,
  getDeleteAccountStatus,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/services/privacyService';
import { useAuth } from '@/context/AuthContext';
import { showAlert, showConfirm } from '@/utils/platformAlert';

const I = COLORS.institutional;
const SUPPORT_WA =
  'https://wa.me/56995945258?text=' +
  encodeURIComponent(
    'Hola, soy proveedor de MecaniMóvil y quiero solicitar la baja de mi cuenta / taller (Ley 21.719).',
  );

export default function PrivacidadDatosScreen() {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [exporting, setExporting] = useState(false);
  const [prefs, setPrefs] = useState({
    push_operativo: true,
    push_marketing: false,
    email_marketing: false,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [status, prefData] = await Promise.all([
          getDeleteAccountStatus(),
          getNotificationPreferences(),
        ]);
        if (mounted) {
          if (!status?.puede_eliminar) setBlockMessage(status?.mensaje || null);
          setPrefs({
            push_operativo: prefData.push_operativo !== false,
            push_marketing: !!prefData.push_marketing,
            email_marketing: !!prefData.email_marketing,
          });
        }
      } catch {
        /* defaults */
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const data = await exportMyData();
      const json = JSON.stringify(data, null, 2);
      try {
        await Share.share({
          title: 'Mis datos MecaniMóvil',
          message: json,
        });
      } catch {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(json);
          showAlert('Export listo', 'Tus datos quedaron en el portapapeles (JSON).');
        } else {
          showAlert('Export listo', 'Datos preparados. Revisa la consola de desarrollo.');
          console.log('[privacy-export-prov]', data);
        }
      }
    } catch (e: any) {
      showAlert('Error', e?.response?.data?.error || 'No se pudo exportar.');
    } finally {
      setExporting(false);
    }
  }, []);

  const togglePref = useCallback(
    async (key: keyof typeof prefs, value: boolean) => {
      const prev = prefs;
      const next = { ...prefs, [key]: value };
      setPrefs(next);
      try {
        await updateNotificationPreferences({ [key]: value });
      } catch {
        setPrefs(prev);
        showAlert('Error', 'No se pudieron guardar las preferencias.');
      }
    },
    [prefs],
  );

  const handleSolicitarBaja = useCallback(() => {
    Linking.openURL(SUPPORT_WA).catch(() => {
      showAlert('Error', 'No se pudo abrir WhatsApp.');
    });
  }, []);

  const handleDelete = useCallback(() => {
    if (blockMessage) {
      showConfirm(
        'Baja asistida',
        `${blockMessage}\n\n¿Quieres contactar a soporte para gestionar la baja del taller?`,
        {
          confirmText: 'Contactar soporte',
          onConfirm: handleSolicitarBaja,
        },
      );
      return;
    }
    if (!password.trim()) {
      showAlert('Contraseña requerida', 'Ingresa tu contraseña actual.');
      return;
    }
    showConfirm(
      'Eliminar cuenta',
      'Anonimizaremos tus datos personales. Historiales fiscales y órdenes se conservan sin PII.',
      {
        confirmText: 'Eliminar',
        onConfirm: async () => {
          try {
            await deleteAccount(password.trim());
            await logout();
            showAlert('Cuenta eliminada', 'Tus datos personales fueron anonimizados.');
            router.replace('/(auth)/login');
          } catch (e: any) {
            showAlert('Error', e?.response?.data?.error || 'No se pudo eliminar la cuenta.');
          }
        },
      },
    );
  }, [blockMessage, password, logout, handleSolicitarBaja]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={I.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader title="Privacidad y datos" showBack onBackPress={() => router.back()} />

      <ScrollView
        style={hostScreenStyles.scroll}
        contentContainerStyle={[hostScreenStyles.scrollInner, { paddingBottom: SPACING['2xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        <HostSectionKicker label="Documentos" />
        <Card elevated padding={0}>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/politica-privacidad')} activeOpacity={0.88}>
            <View style={styles.iconPlate}>
              <Shield size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <InstitutionalText role="body" style={styles.rowTitle}>
              Política de privacidad
            </InstitutionalText>
            <ChevronRight size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.row} onPress={() => router.push('/terminos')} activeOpacity={0.88}>
            <View style={styles.iconPlate}>
              <FileText size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <InstitutionalText role="body" style={styles.rowTitle}>
              Términos de uso
            </InstitutionalText>
            <ChevronRight size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        </Card>

        <HostSectionKicker label="Portabilidad" />
        <Card elevated padding="host" style={styles.paddedCard}>
          <InstitutionalText role="caption" color="body" style={styles.helper}>
            Descarga o comparte un JSON con tu perfil, preferencias y registros asociados (ARCOP).
          </InstitutionalText>
          <InstitutionalButton
            label="Exportar mis datos"
            variant="primary"
            onPress={() => void handleExport()}
            loading={exporting}
            leading={<Share2 size={16} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />}
          />
        </Card>

        <HostSectionKicker label="Comunicaciones" />
        <Card elevated padding={0}>
          {(
            [
              ['push_operativo', 'Notificaciones operativas'],
              ['push_marketing', 'Ofertas y novedades (push)'],
              ['email_marketing', 'Correos comerciales'],
            ] as const
          ).map(([key, label], index, arr) => (
            <View key={key}>
              <View style={styles.prefRow}>
                <Text style={styles.prefLabel}>{label}</Text>
                <Switch
                  value={prefs[key]}
                  onValueChange={(v) => void togglePref(key, v)}
                  trackColor={{ false: I.hairline, true: I.primaryDisabled }}
                  thumbColor={prefs[key] ? I.primary : I.surfaceStrong}
                />
              </View>
              {index < arr.length - 1 ? <View style={styles.rowDivider} /> : null}
            </View>
          ))}
        </Card>

        <HostSectionKicker label="Baja de cuenta" />
        <Card elevated padding="host" style={styles.paddedCard}>
          {blockMessage ? (
            <>
              <InstitutionalText role="caption" color="body" style={styles.helper}>
                {blockMessage}
              </InstitutionalText>
              <InstitutionalText role="caption" color="muted" style={styles.helper}>
                Talleres con Mercado Pago, liquidaciones o documentación fiscal requieren baja
                asistida. Conservamos datos contables el plazo legal (hasta 5 años) sin PII de
                contacto.
              </InstitutionalText>
              <InstitutionalButton
                label="Solicitar baja por WhatsApp"
                variant="outlineAccent"
                onPress={handleSolicitarBaja}
                leading={<Headphones size={16} color={COLORS.brand.orange} strokeWidth={ICON_STROKE_WIDTH} />}
              />
            </>
          ) : (
            <>
              <InstitutionalText role="caption" color="body" style={styles.helper}>
                Anonimiza tus datos personales. Confirma con tu contraseña actual.
              </InstitutionalText>
              <TextInput
                style={styles.input}
                secureTextEntry
                placeholder="Contraseña actual"
                placeholderTextColor={I.muted}
                value={password}
                onChangeText={setPassword}
              />
              <InstitutionalButton
                label="Eliminar mi cuenta"
                variant="destructiveOutline"
                onPress={handleDelete}
                leading={<Trash2 size={16} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />}
              />
            </>
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background.default },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.default,
  },
  paddedCard: {
    gap: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: 56,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: I.hairline,
  },
  iconPlate: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: I.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { flex: 1 },
  helper: { marginBottom: SPACING.xs },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  prefLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.ink,
  },
  input: {
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.ink,
    backgroundColor: I.surfaceSoft,
  },
});
