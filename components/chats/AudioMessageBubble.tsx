import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
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
  const player = useAudioPlayer(uri || null);
  const status = useAudioPlayerStatus(player);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoadError(false);
  }, [uri]);

  useEffect(() => {
    // expo-audio marca isBuffering/isLoaded; si nunca carga tras un rato, mostrar error.
    if (!uri || status.isLoaded || status.playing) return undefined;
    const t = setTimeout(() => {
      if (!status.isLoaded && (status.duration || 0) <= 0) {
        setLoadError(true);
      }
    }, 8000);
    return () => clearTimeout(t);
  }, [uri, status.isLoaded, status.duration, status.playing]);

  const togglePlay = useCallback(() => {
    if (!player || loadError) return;
    try {
      if (status.playing) player.pause();
      else player.play();
    } catch {
      setLoadError(true);
    }
  }, [player, status.playing, loadError]);

  const duration = status.duration || 0;
  const current = status.currentTime || 0;
  const progress = duration > 0 ? Math.min(current / duration, 1) : 0;
  const buffering = Boolean(uri && !status.isLoaded && !loadError && !status.playing);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[styles.playBtn, esPropio ? styles.playBtnOwn : styles.playBtnOther]}
        onPress={togglePlay}
        disabled={loadError || buffering}
      >
        {buffering ? (
          <ActivityIndicator size="small" color={esPropio ? I.onPrimary : I.primary} />
        ) : status.playing ? (
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
          {loadError
            ? 'Audio no disponible'
            : status.playing
              ? formatDuration(current)
              : formatDuration(duration)}
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
