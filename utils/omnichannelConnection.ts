import type { CanalSlug, ConexionCanal } from '@/services/omnichannelService';
import { getChannelVisual } from '@/utils/channelVisuals';

export function isChannelReadyForMessaging(
  connection: ConexionCanal | undefined,
  featureEnabled: boolean,
): boolean {
  if (!featureEnabled) return false;
  if (!connection) return false;
  return connection.status === 'conectada' && connection.enabled;
}

export type ChannelDisconnectedTone = 'inbox' | 'banner';

export function getChannelDisconnectedReason(
  connection: ConexionCanal | undefined,
  channel: CanalSlug | string,
  featureEnabled: boolean,
  tone: ChannelDisconnectedTone = 'banner',
): string | null {
  if (isChannelReadyForMessaging(connection, featureEnabled)) return null;

  const label = getChannelVisual(channel).label;

  if (!featureEnabled) {
    return tone === 'inbox' ? 'Canal no disponible' : 'Canal no disponible';
  }
  if (!connection || connection.status === 'no_configurada') {
    return tone === 'inbox' ? `${label} sin configurar` : `${label} sin configurar`;
  }
  if (connection.status === 'desconectada' || connection.status === 'error') {
    return tone === 'inbox' ? `${label} desconectado` : `${label} desconectado`;
  }
  if (connection.status === 'pendiente') {
    return tone === 'inbox' ? `${label} pendiente` : `${label} pendiente de conexión`;
  }
  if (connection.status === 'conectada' && !connection.enabled) {
    return tone === 'inbox' ? `${label} desactivado` : `${label} desactivado`;
  }
  return tone === 'inbox' ? `${label} no disponible` : `${label} no disponible`;
}
