import React, { useCallback } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ExternalLink, MapPinned } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import chatService, { type ChatLinkPreviewPayload } from '@/services/chatService';
import {
  chatLinkFallbackLabel,
  chatLinkKind,
  openChatUrl,
} from '@/utils/chatMessageLinks';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, withOpacity } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

type Props = {
  url: string;
  esPropio: boolean;
  host?: boolean;
};

export const ChatLinkPreview = React.memo(function ChatLinkPreview({
  url,
  esPropio,
  host = false,
}: Props) {
  const kind = chatLinkKind(url);
  const fallback = chatLinkFallbackLabel(url);
  const query = useQuery({
    queryKey: ['chat-link-preview', url],
    queryFn: () => chatService.getLinkPreview(url),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 0,
    refetchOnWindowFocus: false,
  });

  const data: ChatLinkPreviewPayload | undefined = query.data;
  const title = (data?.title || '').trim() || fallback.title;
  const description = (data?.description || '').trim();
  const site = (data?.site_name || '').trim() || fallback.subtitle;
  const image = (data?.image || '').trim();

  const onPress = useCallback(() => {
    void openChatUrl(url);
  }, [url]);

  const own = esPropio;
  const Icon = kind === 'maps' ? MapPinned : ExternalLink;
  const iconColor = own && host ? I.onPrimary : I.primary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${title}. Abrir enlace`}
      style={({ pressed }) => [
        styles.card,
        own && host ? styles.cardOwnHost : own ? styles.cardOwn : styles.cardOther,
        pressed && styles.pressed,
      ]}
    >
      {image ? (
        <Image source={{ uri: image }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.iconWrap, own && host ? styles.iconWrapOwn : null]}>
          <Icon size={18} color={iconColor} strokeWidth={ICON_STROKE_WIDTH} />
        </View>
      )}
      <View style={styles.copy}>
        <Text
          style={[styles.title, own ? styles.titleOwn : styles.titleOther]}
          numberOfLines={2}
        >
          {title}
        </Text>
        {description ? (
          <Text
            style={[styles.desc, own ? styles.descOwn : styles.descOther]}
            numberOfLines={2}
          >
            {description}
          </Text>
        ) : null}
        <Text
          style={[styles.site, own ? styles.siteOwn : styles.siteOther]}
          numberOfLines={1}
        >
          {site}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: BORDERS.radius.md,
    overflow: 'hidden',
    minHeight: 64,
    maxWidth: 280,
  },
  cardOther: {
    backgroundColor: I.canvas,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
  },
  cardOwn: {
    backgroundColor: withOpacity(I.onPrimary, 0.12),
  },
  cardOwnHost: {
    backgroundColor: withOpacity(I.onPrimary, 0.12),
  },
  pressed: { opacity: 0.88 },
  thumb: {
    width: 64,
    minHeight: 64,
    backgroundColor: I.surfaceStrong,
  },
  iconWrap: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.surfaceSoft,
  },
  iconWrapOwn: {
    backgroundColor: withOpacity(I.onPrimary, 0.08),
  },
  copy: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: SPACING.sm,
    justifyContent: 'center',
    gap: 2,
    minWidth: 0,
  },
  title: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  titleOther: { color: I.ink },
  titleOwn: { color: I.onPrimary },
  desc: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  descOther: { color: I.body },
  descOwn: { color: withOpacity(I.onPrimary, 0.86) },
  site: {
    fontFamily: FF.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  siteOther: { color: I.primary },
  siteOwn: { color: withOpacity(I.onPrimary, 0.78) },
});
