import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { FileText, Shield, Trash2 } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import {
  deleteAccount,
  exportMyData,
  getDeleteAccountStatus,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/services/privacyService';
import { useAuth } from '@/context/AuthContext';

export default function PrivacidadDatosScreen() {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  const [password, setPassword] = useState('');
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
    try {
      const data = await exportMyData();
      const json = JSON.stringify(data, null, 2);
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(json);
        Alert.alert('Export listo', 'Tus datos quedaron en el portapapeles (JSON).');
      } else {
        Alert.alert('Export listo', 'Datos preparados. Revisa la consola de desarrollo.');
        console.log('[privacy-export-prov]', data);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'No se pudo exportar.');
    }
  }, []);

  const togglePref = useCallback(async (key: keyof typeof prefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      await updateNotificationPreferences({ [key]: value });
    } catch {
      setPrefs(prefs);
      Alert.alert('Error', 'No se pudieron guardar las preferencias.');
    }
  }, [prefs]);

  const handleDelete = useCallback(() => {
    if (blockMessage) {
      Alert.alert('Baja asistida', blockMessage);
      return;
    }
    if (!password.trim()) {
      Alert.alert('Contraseña requerida', 'Ingresa tu contraseña actual.');
      return;
    }
    Alert.alert(
      'Eliminar cuenta',
      'Esta acción anonimiza tus datos personales. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount(password.trim());
              await logout();
              Alert.alert('Cuenta eliminada', 'Tus datos personales fueron anonimizados.');
              router.replace('/(auth)/login');
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.error || 'No se pudo eliminar la cuenta.');
            }
          },
        },
      ],
    );
  }, [blockMessage, password, logout]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary[500]} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Privacidad y datos', headerShown: true }} />
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/politica-privacidad')}>
          <Shield size={18} color={COLORS.text.secondary} />
          <Text style={styles.linkText}>Política de privacidad</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/terminos')}>
          <FileText size={18} color={COLORS.text.secondary} />
          <Text style={styles.linkText}>Términos de uso</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleExport}>
          <Text style={styles.actionBtnText}>Exportar mis datos (JSON)</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Preferencias</Text>
        {(['push_operativo', 'push_marketing', 'email_marketing'] as const).map((key) => (
          <View key={key} style={styles.prefRow}>
            <Text style={styles.prefLabel}>{key.replace(/_/g, ' ')}</Text>
            <Switch value={prefs[key]} onValueChange={(v) => togglePref(key, v)} />
          </View>
        ))}

        <Text style={styles.sectionTitle}>Eliminar cuenta</Text>
        {blockMessage ? <Text style={styles.block}>{blockMessage}</Text> : null}
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="Contraseña actual"
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Trash2 size={16} color="#fff" />
          <Text style={styles.deleteBtnText}>Eliminar mi cuenta</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.container.horizontal, paddingBottom: SPACING.xl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  linkText: { fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.text.primary },
  actionBtn: {
    marginVertical: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontFamily: TYPOGRAPHY.fontFamily.sansMedium },
  sectionTitle: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  prefLabel: { color: COLORS.text.primary, textTransform: 'capitalize' },
  block: { color: COLORS.warning?.main, marginBottom: SPACING.sm, fontSize: TYPOGRAPHY.fontSize.sm },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border?.default,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  deleteBtn: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error?.main || '#DC2626',
    padding: SPACING.md,
    borderRadius: BORDERS.radius.md,
  },
  deleteBtnText: { color: '#fff', fontFamily: TYPOGRAPHY.fontFamily.sansMedium },
});
