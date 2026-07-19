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
import { COLORS, TYPOGRAPHY, SHADOWS, BORDERS, SPACING, withOpacity } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;
const T = TYPOGRAPHY.styles;

interface ChatBubbleProps {
  mensaje: MensajeChat;
  esPropio: boolean;
  onImagePress?: (imageUrl: string) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ mensaje, esPropio, onImagePress }) => {
  const [loadingImage, setLoadingImage] = useState(false);

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

  return (
    <View style={[styles.container, esPropio ? styles.containerPropio : styles.containerOtro]}>
      <View style={[styles.bubble, esPropio ? styles.bubblePropio : styles.bubbleOtro]}>
        {!esPropio && (mensaje.nombre_remitente || mensaje.enviado_por_nombre) && (
          <Text style={styles.senderName}>
            {mensaje.nombre_remitente || mensaje.enviado_por_nombre}
          </Text>
        )}

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
                  <ActivityIndicator size="small" color={esPropio ? I.onPrimary : I.primary} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {showVideo && imageUri ? (
          <VideoMessageBubble uri={imageUri} esPropio={esPropio} />
        ) : null}

        {showAudio && imageUri ? (
          <AudioMessageBubble uri={imageUri} esPropio={esPropio} />
        ) : null}

        {showFileLink ? (
          <View style={styles.mediaLink}>
            <FileText size={16} color={esPropio ? I.onPrimary : I.primary} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={[styles.mediaLinkText, esPropio ? styles.textPropio : styles.textOtro]}>
              Ver archivo
            </Text>
          </View>
        ) : null}

        {messageText ? (
          <Text style={[styles.messageText, esPropio ? styles.textPropio : styles.textOtro]}>
            {messageText}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Text style={[styles.timestamp, esPropio ? styles.timestampPropio : styles.timestampOtro]}>
            {formatTime(mensaje.fecha_envio)}
          </Text>
          {esPropio && (
            mensaje.leido ? (
              <CheckCheck size={14} color={withOpacity(I.onPrimary, 0.72)} strokeWidth={ICON_STROKE_WIDTH} />
            ) : (
              <Check size={14} color={withOpacity(I.onPrimary, 0.55)} strokeWidth={ICON_STROKE_WIDTH} />
            )
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 3,
    paddingHorizontal: SPACING.md,
    maxWidth: '82%',
  },
  containerPropio: {
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
  },
  containerOtro: {
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.sm + 6,
    borderRadius: BORDERS.radius.lg,
    maxWidth: '100%',
  },
  bubblePropio: {
    backgroundColor: I.primary,
    borderBottomRightRadius: 8,
    ...SHADOWS.editorial,
  },
  bubbleOtro: {
    backgroundColor: I.canvas,
    borderBottomLeftRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    ...SHADOWS.editorial,
  },
  senderName: {
    fontSize: T.captionBold.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: T.captionBold.fontWeight as '600',
    lineHeight: Math.round(T.captionBold.fontSize * T.captionBold.lineHeight),
    color: I.primary,
    marginBottom: SPACING.xs,
  },
  messageText: {
    fontSize: T.body.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontWeight: T.body.fontWeight as '400',
    lineHeight: Math.round(T.body.fontSize * T.body.lineHeight),
  },
  textPropio: {
    color: I.onPrimary,
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
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: '600',
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
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontWeight: T.caption.fontWeight as '400',
    lineHeight: Math.round(T.caption.fontSize * T.caption.lineHeight),
  },
  timestampPropio: {
    color: withOpacity(I.onPrimary, 0.72),
  },
  timestampOtro: {
    color: I.muted,
  },
});
