import { Phone, MessageSquare, Camera, MessageCircle, type LucideIcon } from 'lucide-react-native';

export type ChannelSlug = 'whatsapp' | 'messenger' | 'instagram' | 'app' | string;

export type ChannelVisual = {
  slug: string;
  label: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  Icon: LucideIcon;
};

const CHANNEL_MAP: Record<string, Omit<ChannelVisual, 'slug'>> = {
  whatsapp: {
    label: 'WhatsApp',
    color: '#128C7E',
    backgroundColor: '#DCF8E8',
    borderColor: '#25D36655',
    Icon: Phone,
  },
  messenger: {
    label: 'Messenger',
    color: '#0084FF',
    backgroundColor: '#E7F3FF',
    borderColor: '#0084FF55',
    Icon: MessageSquare,
  },
  instagram: {
    label: 'Instagram',
    color: '#C13584',
    backgroundColor: '#FCE7F3',
    borderColor: '#E4405F55',
    Icon: Camera,
  },
  app: {
    label: 'App',
    color: '#0052FF',
    backgroundColor: '#EEF2FF',
    borderColor: '#0052FF33',
    Icon: MessageCircle,
  },
};

export function getChannelVisual(channel: ChannelSlug | null | undefined): ChannelVisual {
  const slug = (channel || 'app').toLowerCase();
  const base = CHANNEL_MAP[slug] || CHANNEL_MAP.app;
  return { slug, ...base };
}

export function channelRespondLabel(channel: ChannelSlug | null | undefined): string {
  return getChannelVisual(channel).label;
}
