import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Play, Pause } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, withOpacity } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;

const formatDuration = (seconds: number) => {
  if (!seconds || Number.isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

type Props = {
  uri: string;
  esPropio: boolean;
};

export function AudioMessageBubble({ uri, esPropio }: Props) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const togglePlay = useCallback(() => {
    if (status.playing) player.pause();
    else player.play();
  }, [player, status.playing]);

  const duration = status.duration || 0;
  const current = status.currentTime || 0;
  const progress = duration > 0 ? Math.min(current / duration, 1) : 0;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[styles.playBtn, esPropio ? styles.playBtnOwn : styles.playBtnOther]}
        onPress={togglePlay}
      >
        {status.playing ? (
          <Pause size={16} color={esPropio ? I.onPrimary : I.primary} fill={esPropio ? I.onPrimary : I.primary} strokeWidth={ICON_STROKE_WIDTH} />
        ) : (
          <Play size={16} color={esPropio ? I.onPrimary : I.primary} fill={esPropio ? I.onPrimary : I.primary} strokeWidth={ICON_STROKE_WIDTH} />
        )}
      </TouchableOpacity>
      <View style={styles.trackCol}>
        <View style={[styles.track, esPropio ? styles.trackOwn : styles.trackOther]}>
          <View style={[styles.fill, esPropio ? styles.fillOwn : styles.fillOther, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={[styles.time, esPropio ? styles.timeOwn : styles.timeOther]}>
          {status.playing ? formatDuration(current) : formatDuration(duration)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minWidth: 180, paddingVertical: 4 },
  playBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  playBtnOwn: { backgroundColor: withOpacity(I.onPrimary, 0.2) },
  playBtnOther: { backgroundColor: I.surfaceStrong },
  trackCol: { flex: 1, gap: 4 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  trackOwn: { backgroundColor: withOpacity(I.onPrimary, 0.25) },
  trackOther: { backgroundColor: I.hairline },
  fill: { height: '100%', borderRadius: 2 },
  fillOwn: { backgroundColor: I.onPrimary },
  fillOther: { backgroundColor: I.primary },
  time: { fontSize: TYPOGRAPHY.styles.caption.fontSize, fontFamily: TYPOGRAPHY.fontFamily.sansRegular },
  timeOwn: { color: withOpacity(I.onPrimary, 0.75) },
  timeOther: { color: I.muted },
});
