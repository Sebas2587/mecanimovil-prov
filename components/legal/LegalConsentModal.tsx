import React, { useCallback, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { AppHeader } from '@/app/design-system/components/AppHeader';
import { Card } from '@/app/design-system/components';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import LegalDocumentView from '@/components/legal/LegalDocumentView';
import { registerLegalConsent } from '@/services/privacyService';
import { COLORS, SPACING, BORDERS, withOpacity } from '@/app/design-system/tokens';
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
          <Card elevated padding={0} style={styles.card}>
            <InstitutionalText role="h4" style={styles.title}>
              Actualización legal
            </InstitutionalText>
            <InstitutionalText role="body" color="body" style={styles.body}>
              Para seguir operando en MecaniMóvil Proveedores debes aceptar los Términos y la
              Política de Privacidad vigentes (Ley 21.719).
            </InstitutionalText>

            <InstitutionalButton
              label="Ver términos"
              variant="outlineAccent"
              onPress={() => setPreview('terms')}
              style={styles.actionBtn}
            />
            <InstitutionalButton
              label="Ver política de privacidad"
              variant="outlineAccent"
              onPress={() => setPreview('privacy')}
              style={styles.actionBtn}
            />
            <InstitutionalButton
              label="Acepto términos y privacidad"
              variant="primary"
              onPress={handleAccept}
              loading={loading}
              disabled={loading}
              style={styles.acceptBtn}
            />
          </Card>
        </View>
      </Modal>

      <Modal visible={!!preview} animationType="slide" onRequestClose={() => setPreview(null)}>
        <View style={styles.previewRoot}>
          <AppHeader
            title={previewDoc?.title ?? ''}
            showBack
            onBackPress={() => setPreview(null)}
          />
          {previewDoc ? (
            <View style={styles.previewBody}>
              <LegalDocumentView
                meta={previewDoc.meta}
                sections={previewDoc.sections}
                footer={previewDoc.footer}
                embedded
              />
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const C = COLORS;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: withOpacity(C.institutional.ink, 0.45),
    justifyContent: 'center',
    padding: SPACING.fixed.lg,
  },
  card: {
    padding: SPACING.fixed.lg,
    gap: SPACING.fixed.sm,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    borderRadius: BORDERS.radius.xl,
  },
  title: {
    marginBottom: SPACING.fixed.xs,
  },
  body: {
    marginBottom: SPACING.fixed.sm,
  },
  actionBtn: {
    width: '100%',
  },
  acceptBtn: {
    marginTop: SPACING.fixed.xs,
    width: '100%',
  },
  previewRoot: {
    flex: 1,
    backgroundColor: C.background.default,
  },
  previewBody: {
    flex: 1,
    minHeight: 0,
  },
});
