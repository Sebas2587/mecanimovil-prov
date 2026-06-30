import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import omnichannelService, {
  type CanalSlug,
  type ConexionCanal,
} from '@/services/omnichannelService';

export const OMNICHANNEL_CONNECTIONS_QUERY_KEY = ['omnichannel-connections'] as const;

export type OmnichannelConnectionMap = Record<CanalSlug, ConexionCanal | undefined>;

export function useOmnichannelConnections(enabled = true) {
  return useQuery({
    queryKey: OMNICHANNEL_CONNECTIONS_QUERY_KEY,
    queryFn: () => omnichannelService.obtenerEstadoCanales(),
    enabled,
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  });
}

export function useOmnichannelConnectionMap(enabled = true) {
  const query = useOmnichannelConnections(enabled);

  const map = useMemo<OmnichannelConnectionMap>(() => {
    const connections = query.data?.connections ?? [];
    return {
      whatsapp: connections.find((c) => c.channel_slug === 'whatsapp'),
      messenger: connections.find((c) => c.channel_slug === 'messenger'),
      instagram: connections.find((c) => c.channel_slug === 'instagram'),
    };
  }, [query.data?.connections]);

  return {
    ...query,
    map,
    featureEnabled: query.data?.enabled ?? false,
  };
}
