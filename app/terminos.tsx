import LegalDocumentView from '@/components/legal/LegalDocumentView';
import { TERMS_META, TERMS_SECTIONS } from '@/content/legal/termsOfUseContent';

export default function TerminosScreen() {
  return <LegalDocumentView meta={TERMS_META} sections={TERMS_SECTIONS} />;
}
