import { useEffect, useState } from 'react';
import { getConsentStatus } from '@/services/privacyService';

export function useLegalConsentGate(isAuthenticated: boolean) {
  const [needsConsent, setNeedsConsent] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!isAuthenticated) {
      setNeedsConsent(false);
      return undefined;
    }
    (async () => {
      try {
        const status = await getConsentStatus();
        if (mounted) setNeedsConsent(!!status?.requiere_consentimiento);
      } catch {
        if (mounted) setNeedsConsent(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  return { needsConsent, clearNeedsConsent: () => setNeedsConsent(false) };
}
