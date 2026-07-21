import { useCallback, useRef, useState } from 'react';
import {
  getLocationConsentStatus,
  registerLocationConsent,
} from '@/services/privacyService';

/**
 * Gate in-app antes de solicitar GPS del SO (Ley 21.719 — consentimiento ubicación).
 * Uso: `const ok = await ensureLocationConsent(); if (!ok) return;`
 */
export function useLocationConsentGate() {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const resolveRef = useRef<((accepted: boolean) => void) | null>(null);
  const cachedOk = useRef<boolean | null>(null);

  const ensureLocationConsent = useCallback(async (): Promise<boolean> => {
    if (cachedOk.current === true) return true;
    try {
      const status = await getLocationConsentStatus();
      if (status?.tiene_consentimiento_ubicacion) {
        cachedOk.current = true;
        return true;
      }
    } catch {
      /* mostrar modal igualmente */
    }

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setModalVisible(true);
    });
  }, []);

  const accept = useCallback(async () => {
    setLoading(true);
    try {
      await registerLocationConsent();
      cachedOk.current = true;
      setModalVisible(false);
      resolveRef.current?.(true);
      resolveRef.current = null;
    } catch {
      resolveRef.current?.(false);
      resolveRef.current = null;
      setModalVisible(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const decline = useCallback(() => {
    setModalVisible(false);
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  return {
    modalVisible,
    loading,
    ensureLocationConsent,
    accept,
    decline,
  };
}
