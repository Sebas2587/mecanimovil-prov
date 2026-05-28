import { useMemo } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { appendOnboardingParams } from '@/utils/onboardingNavigation';

/**
 * Ruta legada: redirige a cobertura-marcas sin usar router en useEffect
 * (evita "navigate before mounting Root Layout").
 */
export default function MarcasRedirectScreen() {
  const params = useLocalSearchParams();

  const href = useMemo(() => {
    const search = new URLSearchParams();
    appendOnboardingParams(search, params as Record<string, string | string[] | undefined>);
    const qs = search.toString();
    return qs ? `/(onboarding)/cobertura-marcas?${qs}` : '/(onboarding)/cobertura-marcas';
  }, [params]);

  return <Redirect href={href} />;
}
