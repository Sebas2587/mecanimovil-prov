/**
 * Helpers para pasar parámetros entre pantallas del onboarding (expo-router).
 */
export function appendOnboardingParams(
  params: URLSearchParams,
  raw: Record<string, string | string[] | undefined>
): void {
  Object.entries(raw).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const valueStr = Array.isArray(value) ? value[0] : value;
    if (valueStr) params.append(key, String(valueStr));
  });
}

export function onboardingStepsForPath(esMultimarca: boolean): { current: number; total: number } {
  if (esMultimarca) {
    return { current: 0, total: 5 };
  }
  return { current: 0, total: 6 };
}

/** Paso de catálogo de servicios según tipo de cobertura. */
export function catalogoStep(esMultimarca: boolean): { current: number; total: number } {
  return esMultimarca ? { current: 4, total: 5 } : { current: 5, total: 6 };
}

/** Paso de finalizar onboarding básico. */
export function finalizarBasicoStep(esMultimarca: boolean): { current: number; total: number } {
  return esMultimarca ? { current: 5, total: 5 } : { current: 6, total: 6 };
}
