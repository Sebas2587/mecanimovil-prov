/**
 * URLs de adjuntos de chat (R2 presigned, cPanel legacy o file:// local).
 */

import { Platform } from 'react-native';

export function normalizeMessageText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '[object Object]') return '';
    return trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export function normalizeAttachmentRef(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '[object Object]') return null;
    return trimmed;
  }
  if (typeof value === 'object') {
    const candidate =
      (value as { url?: string; uri?: string; href?: string; attachment?: string; archivo_adjunto?: string })
        .url ||
      (value as { uri?: string }).uri ||
      (value as { href?: string }).href ||
      (value as { attachment?: string }).attachment ||
      (value as { archivo_adjunto?: string }).archivo_adjunto;
    return typeof candidate === 'string' ? candidate.trim() || null : null;
  }
  return null;
}

export function resolveChatAttachmentUri(
  uri: string | null | undefined,
  getMediaBase?: () => string | null | undefined
): string {
  const normalized = normalizeAttachmentRef(uri);
  if (!normalized) return '';
  if (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('file://') ||
    normalized.startsWith('blob:')
  ) {
    return normalized;
  }
  const base = getMediaBase?.();
  if (base) {
    const root = base.replace(/\/$/, '');
    return `${root}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
  }
  return normalized;
}

export function isChatAttachmentDocument(
  uri: string | null | undefined,
  hintMime?: string | null,
  hintName?: string | null
): boolean {
  if (hintMime) {
    if (
      hintMime === 'application/pdf' ||
      hintMime.includes('msword') ||
      hintMime.includes('officedocument') ||
      hintMime.includes('spreadsheet') ||
      hintMime.includes('presentation') ||
      hintMime === 'text/plain' ||
      hintMime === 'text/csv' ||
      hintMime === 'application/zip' ||
      hintMime === 'application/x-zip-compressed'
    ) {
      return true;
    }
  }
  const name = hintName || '';
  const path = (normalizeAttachmentRef(uri) || '').split('?')[0];
  const DOC_EXT = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|rar|rtf)$/i;
  return DOC_EXT.test(name) || DOC_EXT.test(path);
}

export function isChatAttachmentImage(
  uri: string | null | undefined,
  hintMime?: string | null,
  hintName?: string | null
): boolean {
  if (hintMime?.startsWith('image/')) return true;
  if (isChatAttachmentDocument(uri, hintMime, hintName)) return false;
  if (hintMime?.startsWith('video/') || hintMime?.startsWith('audio/')) return false;

  const normalized = normalizeAttachmentRef(uri);
  if (!normalized) return false;

  const IMAGE_EXT = /\.(jpeg|jpg|png|gif|webp|bmp|heic)$/i;
  const path = normalized.split('?')[0];
  const name = hintName || path.split('/').pop() || '';

  if (IMAGE_EXT.test(path) || IMAGE_EXT.test(name)) return true;

  if (normalized.startsWith('blob:') || normalized.startsWith('file://')) {
    if (hintMime?.startsWith('image/')) return true;
    if (hintMime && !hintMime.startsWith('image/')) return false;
    if (name) return IMAGE_EXT.test(name);
    return true;
  }

  if (/chat_(solicitudes|attachments)\//i.test(normalized)) {
    const DOC_EXT = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|rar|rtf)$/i;
    if (DOC_EXT.test(path) || DOC_EXT.test(name)) return false;
    if (/\.(mp4|mov|m4a|mp3|wav|aac|ogg|webm)$/i.test(path)) return false;
    if (/\.[a-z0-9]{2,5}$/i.test(path) && !IMAGE_EXT.test(path)) return false;
    if (!/\.[a-z0-9]{2,5}$/i.test(path)) return true;
  }

  return false;
}

export function isChatAttachmentVideo(
  uri: string | null | undefined,
  hintMime?: string | null,
  hintName?: string | null
): boolean {
  if (hintMime?.startsWith('video/')) return true;
  const normalized = normalizeAttachmentRef(uri);
  if (!normalized) return false;
  const path = normalized.split('?')[0];
  if (/\.(mp4|mov|webm|3gp|m4v)$/i.test(path)) return true;
  if (hintName && /\.(mp4|mov|webm|3gp|m4v)$/i.test(hintName)) return true;
  return false;
}

export function isChatAttachmentAudio(
  uri: string | null | undefined,
  hintMime?: string | null,
  hintName?: string | null
): boolean {
  if (hintMime?.startsWith('audio/')) return true;
  const normalized = normalizeAttachmentRef(uri);
  if (!normalized) return false;
  const path = normalized.split('?')[0];
  if (/\.(mp3|m4a|ogg|wav|aac|caf)$/i.test(path)) return true;
  if (hintName && (/\.(mp3|m4a|ogg|wav|aac|caf)$/i.test(hintName) || /^voice_/i.test(hintName))) {
    return true;
  }
  if (/voice_/i.test(path)) return true;
  return false;
}

export function getChatAttachmentKind(
  uri: string | null | undefined,
  hintMime?: string | null,
  hintName?: string | null
): 'image' | 'video' | 'audio' | 'file' {
  const normalized = normalizeAttachmentRef(uri);
  if (!normalized) return 'file';
  if (isChatAttachmentVideo(normalized, hintMime, hintName)) return 'video';
  if (isChatAttachmentAudio(normalized, hintMime, hintName)) return 'audio';
  if (isChatAttachmentDocument(normalized, hintMime, hintName)) return 'file';
  if (isChatAttachmentImage(normalized, hintMime, hintName)) return 'image';
  return 'file';
}

export function attachmentPreviewLabel(
  messageOrKind: string | { attachment?: string | null; archivo_adjunto?: string | null; attachment_mime?: string | null; mime_type?: string | null; attachment_name?: string | null; name?: string | null }
): string {
  const kind =
    typeof messageOrKind === 'string'
      ? messageOrKind
      : getChatAttachmentKind(
          messageOrKind?.attachment || messageOrKind?.archivo_adjunto || null,
          messageOrKind?.attachment_mime || messageOrKind?.mime_type || null,
          messageOrKind?.attachment_name || messageOrKind?.name || null
        );
  switch (kind) {
    case 'image':
      return 'Foto';
    case 'video':
      return 'Video';
    case 'audio':
      return 'Mensaje de voz';
    default:
      return 'Adjunto';
  }
}

export function getMessageAttachmentUri(message: {
  attachment?: string | null;
  archivo_adjunto?: string | null;
  attachment_url?: string | null;
} | null | undefined): string | null {
  return normalizeAttachmentRef(
    message?.attachment || message?.archivo_adjunto || message?.attachment_url
  );
}

export function getMessageAttachmentMeta(message: {
  attachment_mime?: string | null;
  mime_type?: string | null;
  mimeType?: string | null;
  attachment_name?: string | null;
  name?: string | null;
} | null | undefined) {
  return {
    mime: message?.attachment_mime || message?.mime_type || message?.mimeType || null,
    name: message?.attachment_name || message?.name || null,
  };
}

/** Sube archivos de chat correctamente en web (File/Blob) y nativo ({ uri, name, type }). */
export async function appendChatFileToFormData(
  formData: FormData,
  fieldName: string,
  file: { uri: string; name?: string; mimeType?: string; mime?: string; type?: string }
): Promise<FormData> {
  if (!file?.uri) return formData;

  const mimeType = file.mimeType || file.mime || file.type || 'application/octet-stream';
  const fileName = file.name || `${fieldName}_${Date.now()}`;

  if (Platform.OS === 'web') {
    try {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const webFile = new File(
        [blob],
        fileName,
        { type: mimeType || blob.type || 'application/octet-stream' }
      );
      formData.append(fieldName, webFile);
      return formData;
    } catch (e) {
      console.warn('appendChatFileToFormData web fallback', e);
    }
  }

  formData.append(
    fieldName,
    {
      uri: file.uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob
  );
  return formData;
}

export function normalizeChatMessage<T extends Record<string, unknown>>(raw: T = {} as T) {
  const { mime, name } = getMessageAttachmentMeta(raw as Parameters<typeof getMessageAttachmentMeta>[0]);
  const attachment = getMessageAttachmentUri(raw as Parameters<typeof getMessageAttachmentUri>[0]);
  return {
    ...raw,
    content: normalizeMessageText(raw.content ?? raw.mensaje ?? raw.message),
    mensaje: normalizeMessageText(raw.mensaje ?? raw.content ?? raw.message),
    attachment,
    archivo_adjunto: attachment,
    attachment_mime: mime || (attachment && /\.m4a$/i.test(attachment) ? 'audio/m4a' : null),
    attachment_name: name,
  };
}

/** Agrupa mensajes de imagen consecutivos del mismo remitente (ventana ~3s, sin texto). */
export function groupConsecutiveImageMessages<T extends {
  sender_id?: number;
  sender?: { id?: number };
  enviado_por?: number;
  content?: string;
  mensaje?: string;
  message?: string;
  attachment?: string | null;
  archivo_adjunto?: string | null;
  attachment_mime?: string | null;
  attachment_name?: string | null;
  timestamp?: string;
  fecha_envio?: string;
}>(messages: T[], currentUserId: number | undefined) {
  if (!Array.isArray(messages) || messages.length === 0) return [];

  const groups: Array<{
    type: 'single' | 'gallery';
    messages: T[];
    senderId?: number;
    isMe?: boolean;
  }> = [];
  let i = 0;

  while (i < messages.length) {
    const msg = messages[i];
    const senderId = msg.sender_id ?? msg.sender?.id ?? msg.enviado_por;
    const attachmentUri = getMessageAttachmentUri(msg);
    const { mime, name } = getMessageAttachmentMeta(msg);
    const hasText = !!normalizeMessageText(msg.content || msg.mensaje || msg.message)?.trim?.();
    const isImageOnly =
      attachmentUri && isChatAttachmentImage(attachmentUri, mime, name) && !hasText;

    if (!isImageOnly) {
      groups.push({ type: 'single', messages: [msg] });
      i += 1;
      continue;
    }

    const gallery = [msg];
    let j = i + 1;
    const baseTime = new Date(msg.timestamp || msg.fecha_envio || 0).getTime();

    while (j < messages.length) {
      const next = messages[j];
      const nextSender = next.sender_id ?? next.sender?.id ?? next.enviado_por;
      const nextUri = getMessageAttachmentUri(next);
      const nextMeta = getMessageAttachmentMeta(next);
      const nextHasText = !!normalizeMessageText(next.content || next.mensaje || next.message)?.trim?.();
      const nextIsImageOnly =
        nextUri && isChatAttachmentImage(nextUri, nextMeta.mime, nextMeta.name) && !nextHasText;
      const nextTime = new Date(next.timestamp || next.fecha_envio || 0).getTime();

      if (
        nextSender === senderId &&
        nextIsImageOnly &&
        Math.abs(nextTime - baseTime) <= 3000
      ) {
        gallery.push(next);
        j += 1;
      } else {
        break;
      }
    }

    groups.push({
      type: gallery.length > 1 ? 'gallery' : 'single',
      messages: gallery,
      senderId,
      isMe: senderId === currentUserId,
    });
    i = j;
  }

  return groups;
}
