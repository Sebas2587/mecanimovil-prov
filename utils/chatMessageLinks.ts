import { Linking, Platform } from 'react-native';

const URL_RE = /https?:\/\/[^\s<>"'`]+/gi;

const TRAILING_PUNCT = /[),.;:!?¿¡…》」』】\]]+$/;

export type ChatLinkKind = 'maps' | 'generic';

export type ChatTextPart =
  | { type: 'text'; value: string }
  | { type: 'url'; value: string };

export function normalizeExtractedUrl(raw: string): string {
  let url = (raw || '').trim().replace(TRAILING_PUNCT, '');
  while (url.endsWith(')') && (url.match(/\(/g) || []).length < (url.match(/\)/g) || []).length) {
    url = url.slice(0, -1);
  }
  return url;
}

export function extractChatUrls(text: string): string[] {
  if (!text) return [];
  const found = text.match(URL_RE) || [];
  const unique: string[] = [];
  for (const raw of found) {
    const url = normalizeExtractedUrl(raw);
    if (url.length < 8) continue;
    if (!unique.includes(url)) unique.push(url);
  }
  return unique;
}

export function splitTextWithUrls(text: string): ChatTextPart[] {
  if (!text) return [];
  const parts: ChatTextPart[] = [];
  const re = new RegExp(URL_RE.source, 'gi');
  let last = 0;
  let match: RegExpExecArray | null = re.exec(text);
  while (match) {
    if (match.index > last) {
      parts.push({ type: 'text', value: text.slice(last, match.index) });
    }
    const url = normalizeExtractedUrl(match[0]);
    parts.push({ type: 'url', value: url });
    last = match.index + match[0].length;
    match = re.exec(text);
  }
  if (last < text.length) {
    parts.push({ type: 'text', value: text.slice(last) });
  }
  return parts.length ? parts : [{ type: 'text', value: text }];
}

export function isUrlOnlyMessage(text: string): boolean {
  const urls = extractChatUrls(text);
  if (!urls.length) return false;
  const leftover = text.replace(URL_RE, '').replace(/\s+/g, '').replace(TRAILING_PUNCT, '');
  return leftover.length === 0;
}

export function chatLinkKind(url: string): ChatLinkKind {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const path = new URL(url).pathname.toLowerCase();
    if (
      host === 'maps.app.goo.gl'
      || host === 'goo.gl'
      || host.endsWith('maps.google.com')
      || host === 'maps.google.cl'
      || ((host === 'www.google.com' || host === 'google.com' || host.endsWith('.google.cl'))
        && path.startsWith('/maps'))
      || host === 'waze.com'
      || host.endsWith('.waze.com')
      || host === 'maps.apple.com'
    ) {
      return 'maps';
    }
  } catch {
    return 'generic';
  }
  return 'generic';
}

export function chatLinkFallbackLabel(url: string): { title: string; subtitle: string } {
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    // keep url
  }
  if (chatLinkKind(url) === 'maps') {
    return { title: 'Ubicación en Maps', subtitle: host };
  }
  return { title: 'Abrir enlace', subtitle: host };
}

export async function openChatUrl(url: string): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
    return;
  }
  await Linking.openURL(url);
}
