import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Network from 'expo-network';

/**
 * Señal del dispositivo. `null` mientras no se sabe: no se anuncia «sin señal».
 * No usa el radar de oportunidades ni encola envíos.
 */
export function useSenalRed(): boolean | null {
  const [enLinea, setEnLinea] = useState<boolean | null>(null);

  useEffect(() => {
    let vivo = true;
    const publicar = (valor: boolean | null) => {
      if (vivo) setEnLinea(valor);
    };
    const leer = async () => {
      try {
        if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
          publicar(navigator.onLine);
          return;
        }
        const state = await Network.getNetworkStateAsync();
        const cortada = state.isConnected === false || state.isInternetReachable === false;
        publicar(!cortada);
      } catch {
        publicar(null);
      }
    };
    void leer();
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void leer();
    });
    const timer = setInterval(() => { void leer(); }, 8000);
    const alCambiar = () => publicar(navigator.onLine);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('online', alCambiar);
      window.addEventListener('offline', alCambiar);
    }
    return () => {
      vivo = false;
      sub.remove();
      clearInterval(timer);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('online', alCambiar);
        window.removeEventListener('offline', alCambiar);
      }
    };
  }, []);

  return enLinea;
}
