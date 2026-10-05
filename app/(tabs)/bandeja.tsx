import React, { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import { ClientesVista } from '@/components/taller/ClientesVista';
import { esPasoComercial } from '@/utils/pasoComercial';

export default function BandejaTabScreen() {
  const params = useLocalSearchParams<{
    filtro?: string | string[];
    q?: string | string[];
    paso?: string | string[];
  }>();

  const filtroParam = Array.isArray(params.filtro) ? params.filtro[0] : params.filtro;
  const qParam = Array.isArray(params.q) ? params.q[0] : params.q;
  const pasoParam = Array.isArray(params.paso) ? params.paso[0] : params.paso;

  const paso = useMemo(() => {
    if (esPasoComercial(pasoParam)) return pasoParam;
    if (filtroParam === 'por_agendar') return 'por_agendar';
    if (filtroParam === 'esperando_24h') return 'esperando';
    return null;
  }, [filtroParam, pasoParam]);

  return (
    <TabScreenWrapper>
      <ClientesVista pasoInicial={paso} busquedaInicial={qParam ?? null} />
    </TabScreenWrapper>
  );
}
