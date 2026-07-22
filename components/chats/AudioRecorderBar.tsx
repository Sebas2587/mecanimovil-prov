import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { Mic, Square, X } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, withOpacity } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { PrimaryGradientFill } from '@/app/design-system/components/PrimaryGradientFill';

const I = COLORS.institutional;

export type RecordedAttachment = {
  uri: string;
  type: 'audio';
  name: string;
  mime: string;
  /** Alias usuarios app */
  mimeType?: string;
};

type Props = {
  onRecorded: (attachment: RecordedAttachment) => void;
  onRecordingChange?: (recording: boolean) => void;
  disabled?: boolean;
  /** `inline` = mic en composer (patrón mecanimovil-usuarios). */
  variant?: 'default' | 'inline';
};

const formatMs = (ms: number) => {
  const total = Math.floor((ms || 0) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * Grabación de voz — alineado a mecanimovil-usuarios/AudioRecorderBar.
 */
export function AudioRecorderBar({
  onRecorded,
  onRecordingChange,
  disabled,
  variant = 'inline',
}: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 200);
  const [isRecording, setIsRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const activeRef = useRef(false);
  const isInline = variant === 'inline';

  useEffect(() => {
    onRecordingChange?.(isRecording);
  }, [isRecording, onRecordingChange]);

  const startRecording = useCallback(async () => {
    if (disabled || starting || activeRef.current) return;
    setStarting(true);
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permiso denegado', 'Se requiere acceso al micrófono para grabar mensajes de voz.');
        return;
      }

      if (Platform.OS !== 'web') {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
      }

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
          mimeType: 'audio/m4a',
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
        style={[
          isInline ? styles.micBtnInline : styles.micBtn,
          (disabled || starting) && styles.micBtnDisabled,
        ]}
        onPress={startRecording}
        disabled={disabled || starting}
        accessibilityLabel="Grabar mensaje de voz"
      >
        <Mic
          size={isInline ? 18 : 20}
          color={disabled || starting ? I.mutedSoft : I.muted}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.recordingBar, isInline && styles.recordingBarInline]}>
      <TouchableOpacity onPress={cancelRecording} style={styles.iconBtn} hitSlop={8}>
        <X size={20} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
      </TouchableOpacity>
      <View style={styles.dot} />
      <Text style={styles.timer}>{formatMs(state.durationMillis)}</Text>
      <Text style={styles.hint}>Grabando…</Text>
      <TouchableOpacity onPress={finishRecording} style={styles.stopBtn} activeOpacity={0.85}>
        <PrimaryGradientFill style={styles.stopBtnFill}>
          <Square size={14} color={I.onPrimary} fill={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
        </PrimaryGradientFill>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.surfaceStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    flexShrink: 0,
  },
  micBtnInline: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.surfaceStrong,
    flexShrink: 0,
  },
  micBtnDisabled: { opacity: 0.5 },
  recordingBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: withOpacity(I.semanticDown, 0.08),
    borderRadius: 24,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    minHeight: 44,
  },
  recordingBarInline: {
    width: '100%',
    minHeight: 44,
  },
  iconBtn: { padding: 4 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: I.semanticDown,
  },
  timer: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: I.ink,
    minWidth: 36,
  },
  hint: {
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
    flex: 1,
  },
  stopBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  stopBtnFill: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
