import { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  findInboxItemByConversationId,
  useChatInboxQuery,
} from '@/hooks/useChatInboxQuery';
import type { ChannelSlug } from '@/utils/channelVisuals';
import { nombreContactoAgendable } from '@/utils/nombreContactoAgendable';

function parseParam(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return String(raw[0] || '').trim();
  return String(raw || '').trim();
}

export type OmnichannelConversationMeta = {
  channel: ChannelSlug;
  contactName: string;
  contactPhone: string | null;
  solicitudVinculada: string | null;
  displayName: string;
  nombreAgendable: string;
  hasKnownChannel: boolean;
  isMetaPending: boolean;
};

function formatDisplayName(name: string): string {
  const trimmed = name.trim() || 'Contacto';
  const digitsOnly = trimmed.replace(/\s/g, '');
  if (digitsOnly.length > 12 && /^\d+$/.test(digitsOnly)) {
    return `Cliente ···${digitsOnly.slice(-6)}`;
  }
  return trimmed;
}

export function useOmnichannelConversationMeta(conversationId: string): OmnichannelConversationMeta {
  const params = useLocalSearchParams<{
    channel?: string | string[];
    name?: string | string[];
    phone?: string | string[];
    solicitudId?: string | string[];
  }>();

  const urlChannel = parseParam(params.channel);
  const urlName = parseParam(params.name);
  const urlPhone = parseParam(params.phone);
  const urlSolicitudId = parseParam(params.solicitudId);

  const { data: inbox, isPending, isFetching } = useChatInboxQuery(Boolean(conversationId));

  return useMemo(() => {
    const fromInbox = findInboxItemByConversationId(inbox, conversationId);
    const channel = (urlChannel || fromInbox?.channel || '') as ChannelSlug;
    const contactName = urlName || fromInbox?.otra_persona?.nombre || 'Contacto';
    const contactPhone = urlPhone || fromInbox?.otra_persona?.telefono || null;
    const solicitudVinculada = urlSolicitudId || fromInbox?.solicitud_id || null;
    const hasKnownChannel = Boolean(urlChannel || fromInbox?.channel);
    const nombreAgendable = nombreContactoAgendable(urlName, fromInbox?.otra_persona?.nombre, contactName);

    return {
      channel: hasKnownChannel ? channel : ('' as ChannelSlug),
      contactName,
      contactPhone,
      solicitudVinculada,
      displayName: formatDisplayName(contactName),
      nombreAgendable,
      hasKnownChannel,
      isMetaPending: (isPending || isFetching) && !hasKnownChannel && !urlName,
    };
  }, [
    conversationId,
    inbox,
    isPending,
    isFetching,
    urlChannel,
    urlName,
    urlPhone,
    urlSolicitudId,
  ]);
}
