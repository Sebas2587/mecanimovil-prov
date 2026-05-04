import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import {
  resetRadarOportunidadesGate,
  setRadarOportunidadesPreferencia,
} from '@/utils/radarOportunidadesGate';

const STORAGE_KEY = 'proveedor_radar_oportunidades_activo_v1';

async function readStored(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    if (v === null) return true;
    return v === '1' || v === 'true';
  } catch {
    return true;
  }
}

type RadarOportunidadesContextValue = {
  radarOportunidadesActivo: boolean;
  radarPreferenciaCargada: boolean;
  setRadarOportunidadesActivo: (activo: boolean) => Promise<void>;
};

const RadarOportunidadesContext = createContext<RadarOportunidadesContextValue | null>(null);

export function RadarOportunidadesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [radarActivo, setRadarActivoState] = useState(true);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      resetRadarOportunidadesGate();
      setCargado(false);
      setRadarActivoState(true);
      return;
    }
    let alive = true;
    (async () => {
      const v = await readStored();
      if (!alive) return;
      setRadarOportunidadesPreferencia(v, true);
      setRadarActivoState(v);
      setCargado(true);
    })();
    return () => {
      alive = false;
    };
  }, [isAuthenticated]);

  const setRadarOportunidadesActivo = useCallback(async (activo: boolean) => {
    setRadarActivoState(activo);
    setRadarOportunidadesPreferencia(activo, true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, activo ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<RadarOportunidadesContextValue>(
    () => ({
      radarOportunidadesActivo: radarActivo,
      radarPreferenciaCargada: !isAuthenticated || cargado,
      setRadarOportunidadesActivo,
    }),
    [radarActivo, cargado, isAuthenticated, setRadarOportunidadesActivo]
  );

  return (
    <RadarOportunidadesContext.Provider value={value}>{children}</RadarOportunidadesContext.Provider>
  );
}

export function useRadarOportunidades(): RadarOportunidadesContextValue {
  const ctx = useContext(RadarOportunidadesContext);
  if (!ctx) {
    throw new Error('useRadarOportunidades debe usarse dentro de RadarOportunidadesProvider');
  }
  return ctx;
}
