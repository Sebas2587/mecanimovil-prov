import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CheckCheck, Check, FileText } from 'lucide-react-native';
import { MensajeChat } from '@/services/solicitudesService';
import ServerConfig from '@/services/serverConfig';
import {
  isChatAttachmentAudio,
  isChatAttachmentImage,
  isChatAttachmentVideo,
  resolveChatAttachmentUri,
  getMessageAttachmentUri,
  getMessageAttachmentMeta,
  normalizeMessageText,
} from '@/utils/chatAttachmentMedia';
import { AudioMessageBubble } from '@/components/chats/AudioMessageBubble';
import { VideoMessageBubble } from '@/components/chats/VideoMessageBubble';
import { HostAvatar } from '@/app/design-system/components';
import { COLORS, TYPOGRAPHY, BORDERS, SPACING, withOpacity } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;
const T = TYPOGRAPHY.styles;
const FF = TYPOGRAPHY.fontFamily;

function isUglySenderLabel(label?: string | null): boolean {
  if (!label) return true;
  const t = label.trim();
  if (t.length < 2) return true;
  // IDs / teléfonos crudos no van como “nombre” Host.
  if (/^\+?\d[\d\s\-()]{5,}$/.test(t)) return true;
  if (/^\d{8,}$/.test(t.replace(/\s/g, ''))) return true;
  return false;
}

const TEXT_COLLAPSE_CHARS = 220;
const TEXT_COLLAPSE_LINES = 5;

interface ChatBubbleProps {
  mensaje: MensajeChat;
  esPropio: boolean;
  onImagePress?: (imageUrl: string) => void;
  tone?: 'brand' | 'host';
  showReadReceipt?: boolean;
  /** Nombre limpio del contacto (tone host, burbujas entrantes). */
  peerName?: string;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  mensaje,
  esPropio,
  onImagePress,
  tone = 'brand',
  showReadReceipt = false,
  peerName,
}) => {
  const [loadingImage, setLoadingImage] = useState(false);
  const [textExpanded, setTextExpanded] = useState(false);
  const host = tone === 'host';

  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  };

  const attachmentRaw = getMessageAttachmentUri(mensaje);
  const { mime, name } = getMessageAttachmentMeta(mensaje);
  const imageUri = resolveChatAttachmentUri(attachmentRaw, () =>
    ServerConfig.getInstance().getMediaURLSync()
  );
  const showImage = !!attachmentRaw && isChatAttachmentImage(attachmentRaw, mime, name);
  const showVideo = !!attachmentRaw && !showImage && isChatAttachmentVideo(attachmentRaw, mime, name);
  const showAudio = !!attachmentRaw && !showImage && !showVideo && isChatAttachmentAudio(attachmentRaw, mime, name);
  const showFileLink = !!attachmentRaw && !showImage && !showVideo && !showAudio && !!imageUri;
  const messageText = normalizeMessageText(mensaje.mensaje);
  const timeLabel = formatTime(mensaje.fecha_envio);
  const rawSender = mensaje.nombre_remitente || mensaje.enviado_por_nombre;
  const senderLabel = peerName || (!isUglySenderLabel(rawSender) ? rawSender : null);
  const textNeedsExpand =
    messageText.length > TEXT_COLLAPSE_CHARS || messageText.split(/\n/).length > TEXT_COLLAPSE_LINES;

  const bubbleBody = (
    <View
      style={[
        styles.bubble,
        host ? styles.bubbleHost : null,
        esPropio
          ? host
            ? styles.bubblePropioHost
            : styles.bubblePropio
          : host
            ? styles.bubbleOtroHost
            : styles.bubbleOtro,
      ]}
    >
      {!host && !esPropio && senderLabel ? (
        <Text style={styles.senderName}>{senderLabel}</Text>
      ) : null}

      {showImage && imageUri ? (
        <View style={styles.imageWrap}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onImagePress?.(imageUri)}
            disabled={!onImagePress}
          >
            <Image
              source={{ uri: imageUri }}
              style={styles.attachedImage}
              resizeMode="cover"
              onLoadStart={() => setLoadingImage(true)}
              onLoadEnd={() => setLoadingImage(false)}
            />
            {loadingImage && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator
                  size="small"
                  color={esPropio ? I.onPrimary : I.primary}
                />
              </View>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {showVideo && imageUri ? <VideoMessageBubble uri={imageUri} esPropio={esPropio} /> : null}
      {showAudio && imageUri ? <AudioMessageBubble uri={imageUri} esPropio={esPropio} /> : null}

      {showFileLink ? (
        <View style={styles.mediaLink}>
          <FileText
            size={16}
            color={esPropio ? I.onPrimary : I.ink}
            strokeWidth={ICON_STROKE_WIDTH}
          />
          <Text style={[styles.mediaLinkText, esPropio ? styles.textPropio : styles.textOtro]}>
            Ver archivo
          </Text>
        </View>
      ) : null}

      {messageText ? (
        <>
          <Text
            style={[
              styles.messageText,
              esPropio
                ? host
                  ? styles.textPropioHost
                  : styles.textPropio
                : styles.textOtro,
            ]}
            numberOfLines={textNeedsExpand && !textExpanded ? TEXT_COLLAPSE_LINES : undefined}
          >
            {messageText}
          </Text>
          {textNeedsExpand ? (
            <TouchableOpacity
              onPress={() => setTextExpanded((v) => !v)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={textExpanded ? 'Ver menos' : 'Ver más'}
            >
              <Text
                style={[
                  styles.expandLink,
                  esPropio
                    ? host
                      ? styles.expandLinkOwnHost
                      : styles.expandLinkOwn
                    : styles.expandLinkOther,
                ]}
              >
                {textExpanded ? 'Ver menos' : 'Ver más'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </>
      ) : null}

      {!host ? (
        <View style={styles.footer}>
          <Text
            style={[
              styles.timestamp,
              esPropio ? styles.timestampPropio : styles.timestampOtro,
            ]}
          >
            {timeLabel}
          </Text>
          {esPropio ? (
            mensaje.leido ? (
              <CheckCheck
                size={14}
                color={withOpacity(I.onPrimary, 0.72)}
                strokeWidth={ICON_STROKE_WIDTH}
              />
            ) : (
              <Check
                size={14}
                color={withOpacity(I.onPrimary, 0.55)}
                strokeWidth={ICON_STROKE_WIDTH}
              />
            )
          ) : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, esPropio ? styles.containerPropio : styles.containerOtro]}>
      {host && timeLabel ? (
        <Text style={[styles.metaTime, esPropio ? styles.metaTimeOwn : styles.metaTimeOther]}>
          {timeLabel}
        </Text>
      ) : null}

      {host && !esPropio ? (
        <View style={styles.incomingRow}>
          <HostAvatar name={senderLabel || peerName || '?'} size={28} />
          {bubbleBody}
        </View>
      ) : (
        bubbleBody
      )}

      {host && esPropio && showReadReceipt ? (
        <Text style={styles.readReceipt}>{mensaje.leido ? 'Leído' : 'Enviado'}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    paddingHorizontal: SPACING.md,
    maxWidth: '92%',
  },
  containerPropio: {
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
  },
  containerOtro: {
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
  },
  metaTime: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansRegular,
    color: I.muted,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  metaTimeOwn: {
    alignSelf: 'flex-end',
  },
  metaTimeOther: {
    alignSelf: 'flex-start',
    marginLeft: 36,
  },
  incomingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.fixed.xs + 2,
    maxWidth: '100%',
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    maxWidth: '100%',
  },
  bubbleHost: {
    borderRadius: 18,
  },
  bubblePropio: {
    backgroundColor: I.primary,
    borderBottomRightRadius: 6,
  },
  bubblePropioHost: {
    backgroundColor: I.ink,
    borderBottomRightRadius: 6,
  },
  bubbleOtro: {
    backgroundColor: I.canvas,
    borderBottomLeftRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
  },
  bubbleOtroHost: {
    backgroundColor: I.surfaceStrong,
    borderBottomLeftRadius: 6,
    flexShrink: 1,
  },
  senderName: {
    fontSize: T.captionBold.fontSize,
    fontFamily: FF.sansSemiBold,
    color: I.primary,
    marginBottom: SPACING.xs,
  },
  messageText: {
    fontSize: T.body.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: Math.round(T.body.fontSize * 1.35),
  },
  expandLink: {
    marginTop: 4,
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    textDecorationLine: 'underline',
  },
  expandLinkOwn: {
    color: withOpacity(I.onPrimary, 0.9),
  },
  expandLinkOwnHost: {
    color: 'rgba(255,255,255,0.9)',
  },
  expandLinkOther: {
    color: I.primary,
  },
  textPropio: {
    color: I.onPrimary,
  },
  textPropioHost: {
    color: '#FFFFFF',
  },
  textOtro: {
    color: I.ink,
  },
  imageWrap: {
    borderRadius: BORDERS.radius.md,
    overflow: 'hidden',
    marginBottom: 4,
    backgroundColor: I.surfaceStrong,
  },
  attachedImage: {
    width: 200,
    height: 150,
    backgroundColor: I.surfaceStrong,
  },
  mediaLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    paddingVertical: 4,
  },
  mediaLinkText: {
    fontSize: T.body.fontSize,
    fontFamily: FF.sansSemiBold,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: withOpacity(I.ink, 0.06),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  timestamp: {
    fontSize: T.caption.fontSize,
    fontFamily: FF.sansRegular,
  },
  timestampPropio: {
    color: withOpacity(I.onPrimary, 0.72),
  },
  timestampOtro: {
    color: I.muted,
  },
  readReceipt: {
    marginTop: 4,
    paddingHorizontal: 4,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansRegular,
    color: I.muted,
    alignSelf: 'flex-end',
  },
});
