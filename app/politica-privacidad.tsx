import LegalDocumentView from '@/components/legal/LegalDocumentView';
import {
  PRIVACY_FOOTER,
  PRIVACY_META,
  PRIVACY_SECTIONS,
} from '@/content/legal/privacyPolicyContent';

export default function PoliticaPrivacidadScreen() {
  return (
    <LegalDocumentView meta={PRIVACY_META} sections={PRIVACY_SECTIONS} footer={PRIVACY_FOOTER} />
  );
}
