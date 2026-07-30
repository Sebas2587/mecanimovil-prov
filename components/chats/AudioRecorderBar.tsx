import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Check, Mic, Trash2 } from 'lucide-react-native';
import { BORDERS, COLORS, SPACING, TYPOGRAPHY } from '@/design-system/tokens';

export type RecordedAttachment = {
  uri: string;
  type: 'audio';
  name: string;
  mime?: string;
  mimeType?: string;
};

type Props = {
  onRecorded: (attachment: RecordedAttachment) => void;
  onRecordingChange?: (isRecording: boolean) => void;
  disabled?: boolean;
  variant?: 'inline' | 'full';
};

export function AudioRecorderBar({
  onRecorded,
  onRecordingChange,
  disabled,
  variant = 'inline',
}: Props) {
  const isWeb = Platform.OS === 'web';
  
  // Guard Expo Audio hook for Web platform
  const recorder = !isWeb ? useAudioRecorder(RecordingPresets.HIGH_QUALITY) : null;
  const state = !isWeb && recorder ? useAudioRecorderState(recorder, 200) : { isRecording: false, durationMillis: 0 };
  
  const [isRecording, setIsRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [webDuration, setWebDuration] = useState(0);
  const activeRef = useRef(false);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    onRecordingChange?.(isRecording);
  }, [isRecording, onRecordingChange]);

  const startRecording = useCallback(async () => {
    if (disabled || starting || activeRef.current) return;
    setStarting(true);
    try {
      if (isWeb) {
        if (!navigator.mediaDevices?.getUserMedia) {
          Alert.alert('No soportado', 'Tu navegador no permite grabación de audio.');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new (window as any).MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event: any) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start(200);
        activeRef.current = true;
        setIsRecording(true);
        setWebDuration(0);
        timerRef.current = setInterval(() => {
          setWebDuration((prev) => prev + 1);
        }, 1000);
      } else {
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) {
          Alert.alert('Permiso denegado', 'Se requiere acceso al micrófono para grabar mensajes de voz.');
          return;
        }

        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });

        activeRef.current = true;
        setIsRecording(true);

        if (recorder) {
          await recorder.prepareToRecordAsync();
          recorder.record();
        }
      }
    } catch (e) {
      console.warn('startRecording failed', e);
      activeRef.current = false;
      setIsRecording(false);
      Alert.alert('Error', 'No se pudo iniciar la grabación.');
    } finally {
      setStarting(false);
    }
  }, [disabled, starting, recorder, isWeb]);

  const cancelRecording = useCallback(async () => {
    try {
      if (isWeb) {
        if (timerRef.current) clearInterval(timerRef.current);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream?.getTracks()?.forEach((t: any) => t.stop());
        }
      } else if (recorder) {
        if (recorder.getStatus?.()?.isRecording || state.isRecording) {
          await recorder.stop();
        }
      }
    } catch {
      // ignore
    } finally {
      activeRef.current = false;
      setIsRecording(false);
    }
  }, [recorder, state.isRecording, isWeb]);

  const finishRecording = useCallback(async () => {
    if (!activeRef.current) return;
    try {
      if (isWeb) {
        if (timerRef.current) clearInterval(timerRef.current);
        const mediaRecorder = mediaRecorderRef.current;
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const uri = URL.createObjectURL(blob);
            mediaRecorder.stream?.getTracks()?.forEach((t: any) => t.stop());
            onRecorded({
              uri,
              type: 'audio',
              name: `audio_${Date.now()}.webm`,
              mime: 'audio/webm',
            });
          };
          mediaRecorder.stop();
        }
      } else if (recorder) {
        await recorder.stop();
        const uri = recorder.uri;
        if (uri) {
          onRecorded({
            uri,
            type: 'audio',
            name: `audio_${Date.now()}.m4a`,
            mime: 'audio/m4a',
          });
        }
      }
    } catch (e) {
      console.warn('finishRecording failed', e);
      Alert.alert('Error', 'No se pudo guardar el audio.');
    } finally {
      activeRef.current = false;
      setIsRecording(false);
    }
  }, [recorder, onRecorded, isWeb]);

  const durationSec = isWeb ? webDuration : Math.floor((state.durationMillis || 0) / 1000);
  const mm = String(Math.floor(durationSec / 60)).padStart(2, '0');
  const ss = String(durationSec % 60).padStart(2, '0');

  if (!isRecording) {
    return (
      <TouchableOpacity
        style={[styles.micBtn, disabled && styles.micBtnDisabled]}
        onPress={startRecording}
        disabled={disabled || starting}
        accessibilityLabel="Grabar audio"
      >
        {starting ? (
          <ActivityIndicator size="small" color={COLORS.brand.magenta} />
        ) : (
          <Mic size={20} color={COLORS.brand.magenta} strokeWidth={2} />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.recordingContainer}>
      <TouchableOpacity style={styles.cancelBtn} onPress={cancelRecording}>
        <Trash2 size={18} color={COLORS.danger?.main || '#d93049'} />
      </TouchableOpacity>

      <View style={styles.timerWrap}>
        <View style={styles.dotPulse} />
        <Text style={styles.timerText}>{`${mm}:${ss}`}</Text>
      </View>

      <TouchableOpacity style={styles.sendAudioBtn} onPress={finishRecording}>
        <Check size={18} color={COLORS.base.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnDisabled: {
    opacity: 0.5,
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDERS.radius.full || 999,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    gap: SPACING.xs,
  },
  cancelBtn: {
    padding: 6,
    borderRadius: 16,
  },
  timerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  dotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger?.main || '#d93049',
  },
  timerText: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  sendAudioBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.brand.magenta,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AudioRecorderBar;
