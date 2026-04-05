import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CheckCheck, Check } from 'lucide-react-native';
import { MensajeChat } from '@/services/solicitudesService';
import ServerConfig from '@/services/serverConfig';

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

  const resolveImageUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('file://')) return url;
    const baseUrl = ServerConfig.getInstance().getMediaURLSync();
    if (baseUrl) return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    return url;
  };

  return (
    <View style={[styles.container, esPropio ? styles.containerPropio : styles.containerOtro]}>
      <View style={[styles.bubble, esPropio ? styles.bubblePropio : styles.bubbleOtro]}>
        {!esPropio && (mensaje.nombre_remitente || mensaje.enviado_por_nombre) && (
          <Text style={styles.senderName}>
            {mensaje.nombre_remitente || mensaje.enviado_por_nombre}
          </Text>
        )}

        {mensaje.archivo_adjunto && (
          <View style={styles.imageWrap}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onImagePress?.(resolveImageUrl(mensaje.archivo_adjunto))}
              disabled={!onImagePress}
            >
              <Image
                source={{ uri: resolveImageUrl(mensaje.archivo_adjunto) }}
                style={styles.attachedImage}
                resizeMode="cover"
                onLoadStart={() => setLoadingImage(true)}
                onLoadEnd={() => setLoadingImage(false)}
              />
              {loadingImage && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="small" color={esPropio ? '#FFFFFF' : '#3B82F6'} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {mensaje.mensaje ? (
          <Text style={[styles.messageText, esPropio ? styles.textPropio : styles.textOtro]}>
            {mensaje.mensaje}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Text style={[styles.timestamp, esPropio ? styles.timestampPropio : styles.timestampOtro]}>
            {formatTime(mensaje.fecha_envio)}
          </Text>
          {esPropio && (
            mensaje.leido ? (
              <CheckCheck size={14} color="rgba(255,255,255,0.7)" />
            ) : (
              <Check size={14} color="rgba(255,255,255,0.5)" />
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
    paddingHorizontal: 12,
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
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    maxWidth: '100%',
  },
  bubblePropio: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 6,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleOtro: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 3,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  textPropio: {
    color: '#FFFFFF',
  },
  textOtro: {
    color: '#1F2937',
  },
  imageWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  attachedImage: {
    width: 200,
    height: 150,
    backgroundColor: '#F3F4F6',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  timestamp: {
    fontSize: 11,
  },
  timestampPropio: {
    color: 'rgba(255,255,255,0.7)',
  },
  timestampOtro: {
    color: '#9CA3AF',
  },
});
