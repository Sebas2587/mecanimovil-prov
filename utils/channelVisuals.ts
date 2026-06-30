export type ChannelSlug = 'whatsapp' | 'messenger' | 'instagram' | 'app' | string;

export type ChannelVisual = {
  slug: string;
  label: string;
  /** Color de acento (badges, texto) */
  color: string;
  /** Fondo suave (badges) */
  backgroundColor: string;
  borderColor: string;
  /** Fondo sólido de marca (iconos grandes) */
  brandBackground: string;
  /** Color del glifo sobre fondo de marca */
  iconOnBrand: string;
  /** Gradiente Instagram */
  instagramGradient: [string, string, ...string[]];
};

const CHANNEL_MAP: Record<string, Omit<ChannelVisual, 'slug'>> = {
  whatsapp: {
    label: 'WhatsApp',
    color: '#128C7E',
    backgroundColor: '#DCF8E8',
    borderColor: '#25D36655',
    brandBackground: '#25D366',
    iconOnBrand: '#FFFFFF',
    instagramGradient: ['#25D366', '#128C7E'],
  },
  messenger: {
    label: 'Messenger',
    color: '#0084FF',
    backgroundColor: '#E7F3FF',
    borderColor: '#0084FF55',
    brandBackground: '#1877F2',
    iconOnBrand: '#FFFFFF',
    instagramGradient: ['#1877F2', '#0084FF'],
  },
  instagram: {
    label: 'Instagram',
    color: '#C13584',
    backgroundColor: '#FCE7F3',
    borderColor: '#E4405F55',
    brandBackground: '#E4405F',
    iconOnBrand: '#FFFFFF',
    instagramGradient: ['#F58529', '#DD2A7B', '#8134AF'],
  },
  app: {
    label: 'App',
    color: '#0052FF',
    backgroundColor: '#EEF2FF',
    borderColor: '#0052FF33',
    brandBackground: '#0052FF',
    iconOnBrand: '#FFFFFF',
    instagramGradient: ['#0052FF', '#003BB5'],
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
