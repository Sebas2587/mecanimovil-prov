import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import { CotizacionesVista } from '@/components/taller/CotizacionesVista';
import { useMarcoListaStyle } from '@/components/navigation/marcoLista';

export default function CotizacionesScreen() {
  const params = useLocalSearchParams<{ estado?: string | string[] }>();
  const estado = Array.isArray(params.estado) ? params.estado[0] : params.estado;
  const marcoLista = useMarcoListaStyle();

  return (
    <TabScreenWrapper style={marcoLista}>
      <CotizacionesVista estadoInicial={estado ?? null} />
    </TabScreenWrapper>
  );
}
