import React, { memo, type ReactNode } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { Paperclip, Send } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;
const T = TYPOGRAPHY.styles;

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttachPress: () => void;
  placeholder?: string;
  disabledPlaceholder?: string;
  editable?: boolean;
  sending?: boolean;
  hasAttachment?: boolean;
  paddingBottom?: number;
  stripAttached?: boolean;
  attachmentPreview?: ReactNode;
  voiceSlot?: ReactNode;
};

function ChatMessageComposerComponent({
  value,
  onChangeText,
  onSend,
  onAttachPress,
  placeholder = 'Escribe un mensaje…',
  disabledPlaceholder = 'Envío deshabilitado',
  editable = true,
  sending = false,
  hasAttachment = false,
  paddingBottom = SPACING.sm,
  stripAttached = false,
  attachmentPreview,
  voiceSlot,
}: Props) {
  const canInteract = editable && !sending;
  const canSend = canInteract && (Boolean(value.trim()) || hasAttachment);
  const showVoice = canInteract && !canSend && voiceSlot;
  const showPlaceholder = canInteract ? placeholder : disabledPlaceholder;

  return (
    <View
      style={[
        styles.inputBar,
        stripAttached && styles.inputBarAttached,
        { paddingBottom },
      ]}
    >
      {attachmentPreview}
      <View style={styles.inputRow}>
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
              ? (e: { nativeEvent: { key: string; shiftKey?: boolean }; preventDefault?: () => void }) => {
                  if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                    e.preventDefault?.();
                    onSend();
                  }
                }
              : undefined
          }
        />
        {showVoice ? (
          voiceSlot
        ) : (
          <TouchableOpacity
            style={[styles.sendBtn, (!canSend || sending) && styles.sendBtnDisabled]}
            onPress={onSend}
            disabled={!canSend || sending}
            accessibilityLabel="Enviar"
          >
            {sending ? (
              <ActivityIndicator size="small" color={I.onPrimary} />
            ) : (
              <Send size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export const ChatMessageComposer = memo(ChatMessageComposerComponent);

const styles = StyleSheet.create({
  inputBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    backgroundColor: I.canvas,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm + 2,
    ...SHADOWS.editorial,
  },
  inputBarAttached: {
    borderTopWidth: 0,
    paddingTop: SPACING.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  attachBtn: {
    padding: 6,
    flexShrink: 0,
  },
  textInput: {
    flex: 1,
    minWidth: 0,
    backgroundColor: I.surfaceStrong,
    borderRadius: BORDERS.radius.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: T.body.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontWeight: T.body.fontWeight as '400',
    lineHeight: Math.round(T.body.fontSize * T.body.lineHeight),
    maxHeight: 120,
    color: I.ink,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: {
    backgroundColor: I.primaryDisabled,
    opacity: 0.85,
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
