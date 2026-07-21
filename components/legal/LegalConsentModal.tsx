import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import LegalDocumentView from '@/components/legal/LegalDocumentView';
import { registerLegalConsent } from '@/services/privacyService';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import {
  TERMS_META,
  TERMS_SECTIONS,
  TERMS_FOOTER,
} from '@/content/legal/termsOfUseContent';
import {
  PRIVACY_META,
  PRIVACY_SECTIONS,
  PRIVACY_FOOTER,
} from '@/content/legal/privacyPolicyContent';

const LEGAL_DOCS = {
  terms: {
    title: 'Términos de uso',
    meta: TERMS_META,
    sections: TERMS_SECTIONS,
    footer: TERMS_FOOTER,
  },
  privacy: {
    title: 'Política de privacidad',
    meta: PRIVACY_META,
    sections: PRIVACY_SECTIONS,
    footer: PRIVACY_FOOTER,
  },
} as const;

type PreviewKey = keyof typeof LEGAL_DOCS;

type Props = {
  visible: boolean;
  onAccepted: () => void;
};

export default function LegalConsentModal({ visible, onAccepted }: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewKey | null>(null);

  const handleAccept = useCallback(async () => {
    setLoading(true);
    try {
      await registerLegalConsent();
      onAccepted();
    } catch {
      /* keep open */
    } finally {
      setLoading(false);
    }
  }, [onAccepted]);

  if (!visible && !preview) return null;

  const previewDoc = preview ? LEGAL_DOCS[preview] : null;

  return (
    <>
      <Modal visible={visible && !preview} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>Actualización legal</Text>
            <Text style={styles.body}>
              Para seguir operando en MecaniMóvil Proveedores debes aceptar los Términos y la
              Política de Privacidad vigentes (Ley 21.719).
            </Text>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setPreview('terms')}>
              <Text style={styles.outlineBtnText}>Ver términos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setPreview('privacy')}>
              <Text style={styles.outlineBtnText}>Ver política de privacidad</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.disabled]}
              onPress={handleAccept}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.institutional.onPrimary} />
              ) : (
                <Text style={styles.primaryBtnText}>Acepto términos y privacidad</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!preview} animationType="slide" onRequestClose={() => setPreview(null)}>
        <View style={[styles.previewRoot, { paddingTop: insets.top }]}>
          <Stack.Screen options={{ headerShown: false }} />
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={() => setPreview(null)} style={styles.backBtn}>
              <ChevronLeft size={22} color={COLORS.institutional.ink} />
              <Text style={styles.backText}>Volver</Text>
            </TouchableOpacity>
            <Text style={styles.previewTitle}>{previewDoc?.title}</Text>
          </View>
          {previewDoc ? (
            <LegalDocumentView
              meta={previewDoc.meta}
              sections={previewDoc.sections}
              footer={previewDoc.footer}
              embedded
            />
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.lg,
    gap: SPACING.sm,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text.primary,
  },
  body: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 20,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: COLORS.institutional.primary,
    borderRadius: BORDERS.radius.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  outlineBtnText: {
    color: COLORS.institutional.primary,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  primaryBtn: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.institutional.primary,
    borderRadius: BORDERS.radius.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: COLORS.institutional.onPrimary,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
  },
  disabled: { opacity: 0.7 },
  previewRoot: { flex: 1, backgroundColor: COLORS.background.default },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.container.horizontal,
    paddingVertical: SPACING.sm,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.border?.default,
    backgroundColor: COLORS.background.paper,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  backText: {
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.institutional.ink,
  },
  previewTitle: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
  },
});
