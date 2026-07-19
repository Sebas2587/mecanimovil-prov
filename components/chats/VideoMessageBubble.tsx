import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Play, X } from 'lucide-react-native';
import { COLORS, BORDERS, withOpacity } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;

type Props = {
  uri: string;
  esPropio: boolean;
};

export function VideoMessageBubble({ uri, esPropio }: Props) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(open ? uri : null, (p) => {
    p.loop = false;
  });

  return (
    <>
      <TouchableOpacity style={styles.thumbWrap} onPress={() => setOpen(true)} activeOpacity={0.9}>
        <View style={styles.thumbPlaceholder} />
        <View style={styles.playOverlay}>
          <View style={[styles.playCircle, esPropio ? styles.playCircleOwn : styles.playCircleOther]}>
            <Play size={20} color={esPropio ? I.onPrimary : I.primary} fill={esPropio ? I.onPrimary : I.primary} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
        </View>
        <Text style={[styles.label, esPropio ? styles.labelOwn : styles.labelOther]}>Video</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <TouchableOpacity style={[styles.closeBtn, { top: insets.top + 12 }]} onPress={() => setOpen(false)}>
            <X size={24} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
          <VideoView style={styles.video} player={player} allowsFullscreen nativeControls />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  thumbWrap: { borderRadius: BORDERS.radius.md, overflow: 'hidden', width: 200, height: 140, backgroundColor: I.surfaceStrong },
  thumbPlaceholder: { width: '100%', height: '100%', backgroundColor: I.surfaceStrong },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: withOpacity(I.ink, 0.25) },
  playCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  playCircleOwn: { backgroundColor: withOpacity(I.onPrimary, 0.3) },
  playCircleOther: { backgroundColor: withOpacity(I.canvas, 0.9) },
  label: { position: 'absolute', bottom: 8, left: 8, fontSize: 11, fontWeight: '600' },
  labelOwn: { color: I.onPrimary },
  labelOther: { color: I.ink },
  modalRoot: { flex: 1, backgroundColor: withOpacity(I.ink, 0.95), justifyContent: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  closeBtn: { position: 'absolute', right: 16, zIndex: 10, padding: 8, backgroundColor: withOpacity(I.canvas, 0.15), borderRadius: 20 },
  video: { width: '100%', height: 280 },
});
