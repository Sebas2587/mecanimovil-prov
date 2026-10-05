import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import { CotizacionesVista } from '@/components/taller/CotizacionesVista';

export default function CotizacionesScreen() {
  const params = useLocalSearchParams<{ estado?: string | string[] }>();
  const estado = Array.isArray(params.estado) ? params.estado[0] : params.estado;

  return (
    <TabScreenWrapper>
      <CotizacionesVista estadoInicial={estado ?? null} />
    </TabScreenWrapper>
  );
}
