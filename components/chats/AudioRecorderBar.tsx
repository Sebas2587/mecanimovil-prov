import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { Mic, Square, X } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;

export type RecordedAttachment = {
  uri: string;
  type: 'audio';
  name: string;
  mime: string;
};

type Props = {
  onRecorded: (attachment: RecordedAttachment) => void;
  onRecordingChange?: (recording: boolean) => void;
  disabled?: boolean;
};

const formatMs = (ms: number) => {
  const total = Math.floor((ms || 0) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export function AudioRecorderBar({ onRecorded, onRecordingChange, disabled }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 200);
  const [isRecording, setIsRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const activeRef = useRef(false);

  React.useEffect(() => {
    onRecordingChange?.(isRecording);
  }, [isRecording, onRecordingChange]);

  const startRecording = useCallback(async () => {
    if (disabled || starting || activeRef.current) return;
    setStarting(true);
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permiso denegado', 'Se requiere acceso al micrófono.');
        return;
      }

      if (Platform.OS !== 'web') {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
      }

      // UI inmediata: el estado nativo puede tardar y un sync prematuro apagaba la barra
      activeRef.current = true;
      setIsRecording(true);

      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      console.warn('startRecording failed', e);
      activeRef.current = false;
      setIsRecording(false);
      Alert.alert('Error', 'No se pudo iniciar la grabación.');
    } finally {
      setStarting(false);
    }
  }, [disabled, starting, recorder]);

  const cancelRecording = useCallback(async () => {
    try {
      if (recorder.getStatus?.()?.isRecording || state.isRecording) {
        await recorder.stop();
      }
    } catch {
      // ignore
    }
    activeRef.current = false;
    setIsRecording(false);
  }, [recorder, state.isRecording]);

  const finishRecording = useCallback(async () => {
    try {
      await recorder.stop();
      const uri = recorder.getStatus()?.url;
      activeRef.current = false;
      setIsRecording(false);
      if (uri) {
        onRecorded({
          uri,
          type: 'audio',
          name: `voice_${Date.now()}.m4a`,
          mime: 'audio/m4a',
        });
      }
    } catch {
      activeRef.current = false;
      setIsRecording(false);
      Alert.alert('Error', 'No se pudo guardar el mensaje de voz.');
    }
  }, [onRecorded, recorder]);

  if (!isRecording) {
    return (
      <TouchableOpacity
        style={[styles.micBtn, (disabled || starting) && styles.micBtnDisabled]}
        onPress={startRecording}
        disabled={disabled || starting}
        accessibilityLabel="Grabar mensaje de voz"
      >
        <Mic
          size={20}
          color={disabled || starting ? I.mutedSoft : I.primary}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.recordingBar}>
      <TouchableOpacity onPress={cancelRecording} hitSlop={8}>
        <X size={18} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
      </TouchableOpacity>
      <View style={styles.dot} />
      <Text style={styles.timer}>{formatMs(state.durationMillis)}</Text>
      <Text style={styles.hint}>Grabando…</Text>
      <TouchableOpacity onPress={finishRecording} style={styles.stopBtn}>
        <Square size={14} color={I.onPrimary} fill={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.surfaceStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    flexShrink: 0,
  },
  micBtnDisabled: { opacity: 0.5 },
  recordingBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: I.surfaceStrong,
    borderRadius: BORDERS.radius.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    minHeight: 40,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: I.semanticDown },
  timer: { ...TYPOGRAPHY.styles.bodyBold, color: I.ink, minWidth: 36 },
  hint: { ...TYPOGRAPHY.styles.caption, color: I.muted, flex: 1 },
  stopBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: I.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
