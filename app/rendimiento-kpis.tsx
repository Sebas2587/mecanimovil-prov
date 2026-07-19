import { Redirect } from 'expo-router';

/**
 * Deep link legacy → hub unificado de Finanzas (tab Rendimiento).
 */
export default function RendimientoKpisScreen() {
  return <Redirect href="/creditos?tab=rendimiento" />;
}
