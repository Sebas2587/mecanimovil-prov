import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type MarcaMetaDraft = { id: number; nombre: string };

export type ServicioSeleccionadoDraft = { marcaId: number; servicioId: number };

export type OnboardingDraft = {
  tipo: 'taller' | 'mecanico' | null;
  nombre: string;
  descripcion: string;
  telefono: string;
  rut: string;
  dni: string;
  direccion: string;
  direccion_lat: string;
  direccion_lng: string;
  comuna: string;
  region: string;
  experiencia_anos: string;
  /** null = aún no elige cobertura */
  es_multimarca: boolean | null;
  marcas: number[];
  marcas_meta: MarcaMetaDraft[];
  servicios_seleccionados: ServicioSeleccionadoDraft[];
  especialidades: number[];
};

export const INITIAL_ONBOARDING_DRAFT: OnboardingDraft = {
  tipo: null,
  nombre: '',
  descripcion: '',
  telefono: '',
  rut: '',
  dni: '',
  direccion: '',
  direccion_lat: '',
  direccion_lng: '',
  comuna: '',
  region: '',
  experiencia_anos: '',
  es_multimarca: null,
  marcas: [],
  marcas_meta: [],
  servicios_seleccionados: [],
  especialidades: [],
};

type OnboardingDraftContextValue = {
  draft: OnboardingDraft;
  patchDraft: (partial: Partial<OnboardingDraft>) => void;
  resetDraft: () => void;
};

const OnboardingDraftContext = createContext<OnboardingDraftContextValue | null>(null);

export function OnboardingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(INITIAL_ONBOARDING_DRAFT);

  const patchDraft = useCallback((partial: Partial<OnboardingDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(INITIAL_ONBOARDING_DRAFT);
  }, []);

  const value = useMemo(
    () => ({ draft, patchDraft, resetDraft }),
    [draft, patchDraft, resetDraft],
  );

  return (
    <OnboardingDraftContext.Provider value={value}>{children}</OnboardingDraftContext.Provider>
  );
}

export function useOnboardingDraft(): OnboardingDraftContextValue {
  const ctx = useContext(OnboardingDraftContext);
  if (!ctx) {
    throw new Error('useOnboardingDraft debe usarse dentro de OnboardingDraftProvider');
  }
  return ctx;
}
