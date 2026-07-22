import React, { memo, useState, type ReactNode } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { Paperclip, ArrowUp } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { HOST_GUTTER } from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { AudioRecorderBar, type RecordedAttachment } from '@/components/chats/AudioRecorderBar';

const I = COLORS.institutional;
const T = TYPOGRAPHY.styles;

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttachPress: () => void;
  onAudioRecorded?: (attachment: RecordedAttachment) => void;
  placeholder?: string;
  disabledPlaceholder?: string;
  editable?: boolean;
  sending?: boolean;
  hasAttachment?: boolean;
  paddingBottom?: number;
  stripAttached?: boolean;
  attachmentPreview?: ReactNode;
  footerAction?: ReactNode;
};

/**
 * Composer Airbnb + slots usuarios (adjuntar | input | mic/send).
 * El mic no cambia de índice al grabar (evita cortar la sesión).
 */
function ChatMessageComposerComponent({
  value,
  onChangeText,
  onSend,
  onAttachPress,
  onAudioRecorded,
  placeholder = 'Escribe un mensaje…',
  disabledPlaceholder = 'Envío deshabilitado',
  editable = true,
  sending = false,
  hasAttachment = false,
  paddingBottom = SPACING.sm,
  stripAttached = false,
  attachmentPreview,
  footerAction,
}: Props) {
  const [voiceRecording, setVoiceRecording] = useState(false);
  const canInteract = editable && !sending;
  const canSend = canInteract && (Boolean(value.trim()) || hasAttachment);
  const showPlaceholder = canInteract ? placeholder : disabledPlaceholder;
  const showMic = Boolean(onAudioRecorded) && canInteract && !canSend;

  return (
    <View
      style={[
        styles.sheet,
        stripAttached && styles.sheetAttached,
        { paddingBottom },
      ]}
    >
      {attachmentPreview}
      <View style={styles.inputRow}>
        <View style={[styles.attachSlot, voiceRecording && styles.slotCollapsed]}>
          {!voiceRecording ? (
            <TouchableOpacity
              style={styles.attachBtn}
              onPress={onAttachPress}
              accessibilityLabel="Adjuntar"
              disabled={!canInteract}
            >
              <Paperclip
                size={20}
                color={canInteract ? I.muted : I.mutedSoft}
                strokeWidth={ICON_STROKE_WIDTH}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={[styles.mainSlot, voiceRecording && styles.slotCollapsed]}>
          {!voiceRecording ? (
            <TextInput
              style={styles.textInput}
              value={value}
              onChangeText={onChangeText}
              placeholder={showPlaceholder}
              placeholderTextColor={I.muted}
              multiline={canInteract}
              maxLength={500}
              editable={canInteract}
              blurOnSubmit={false}
              returnKeyType="send"
              onSubmitEditing={Platform.OS !== 'web' && canInteract ? onSend : undefined}
              onKeyPress={
                Platform.OS === 'web' && canInteract
                  ? (e: {
                      nativeEvent: { key: string; shiftKey?: boolean };
                      preventDefault?: () => void;
                    }) => {
                      if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                        e.preventDefault?.();
                        onSend();
                      }
                    }
                  : undefined
              }
            />
          ) : null}
        </View>

        <View
          style={[
            voiceRecording ? styles.recordingSlot : styles.trailingSlot,
            canSend && !voiceRecording ? styles.slotCollapsed : null,
          ]}
        >
          {onAudioRecorded && (showMic || voiceRecording) ? (
            <AudioRecorderBar
              variant="inline"
              disabled={sending || !canInteract || (canSend && !voiceRecording)}
              onRecordingChange={setVoiceRecording}
              onRecorded={onAudioRecorded}
            />
          ) : null}
        </View>

        {canSend && !voiceRecording ? (
          <TouchableOpacity
            style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
            onPress={onSend}
            disabled={sending}
            accessibilityLabel="Enviar"
          >
            {sending ? (
              <ActivityIndicator size="small" color={I.onPrimary} />
            ) : (
              <ArrowUp size={16} color={I.onPrimary} strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        ) : null}
      </View>
      {footerAction}
    </View>
  );
}

export const ChatMessageComposer = memo(ChatMessageComposerComponent);

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: I.canvas,
    borderTopLeftRadius: BORDERS.radius.xl,
    borderTopRightRadius: BORDERS.radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    paddingHorizontal: HOST_GUTTER,
    paddingTop: SPACING.fixed.md,
  },
  sheetAttached: {
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingTop: SPACING.fixed.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    minHeight: 44,
  },
  attachSlot: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  attachBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainSlot: {
    flex: 1,
    minWidth: 0,
  },
  trailingSlot: {
    flexShrink: 0,
  },
  recordingSlot: {
    flex: 1,
    minWidth: 0,
  },
  slotCollapsed: {
    width: 0,
    overflow: 'hidden',
    opacity: 0,
    pointerEvents: 'none',
  },
  textInput: {
    width: '100%',
    backgroundColor: 'transparent',
    paddingHorizontal: SPACING.fixed.xs,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    fontSize: T.body.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    lineHeight: Math.round(T.body.fontSize * T.body.lineHeight),
    maxHeight: 100,
    color: I.ink,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: I.ink,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: {
    opacity: 0.7,
  },
});

export const chatComposerAttachPreviewStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceStrong,
  },
  label: {
    ...T.caption,
    color: I.body,
    flex: 1,
  },
  remove: {
    marginLeft: SPACING.sm,
    width: 28,
    height: 28,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
