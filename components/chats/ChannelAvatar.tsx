import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { User } from 'lucide-react-native';
import { BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { getChannelVisual, type ChannelSlug } from '@/utils/channelVisuals';
import { ChannelBrandIcon, ChannelBrandGlyph } from '@/components/chats/ChannelBrandIcon';

type Props = {
  channel?: ChannelSlug | null;
  photoUrl?: string | null;
  size?: number;
  showChannelRing?: boolean;
};

export function ChannelAvatar({
  channel,
  photoUrl,
  size = 48,
  showChannelRing = true,
}: Props) {
  const visual = getChannelVisual(channel);
  const radius = size / 2;

  if (photoUrl) {
    return (
      <View style={[styles.wrap, { width: size, height: size }]}>
        <Image source={{ uri: photoUrl }} style={[styles.photo, { width: size, height: size, borderRadius: radius }]} />
        {showChannelRing && channel && channel !== 'app' ? (
          <View style={[styles.chip, { backgroundColor: visual.brandBackground, borderColor: visual.backgroundColor }]}>
            <ChannelBrandGlyph channel={channel} size={10} color={visual.iconOnBrand} />
          </View>
        ) : null}
      </View>
    );
  }

  if (channel && channel !== 'app') {
    return <ChannelBrandIcon channel={channel} size={size} />;
  }

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: visual.backgroundColor,
          borderColor: visual.borderColor,
        },
      ]}
    >
      <User size={size * 0.42} color={visual.color} strokeWidth={ICON_STROKE_WIDTH} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  photo: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chip: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: BORDERS.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
