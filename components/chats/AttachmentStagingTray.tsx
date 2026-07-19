import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { CircleX, FileText, Music } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;

export type StagedAttachment = {
  uri: string;
  type: 'image' | 'video' | 'audio' | 'document';
  name: string;
  mime?: string;
};

type Props = {
  attachments: StagedAttachment[];
  onRemove: (index: number) => void;
};

export function AttachmentStagingTray({ attachments, onRemove }: Props) {
  if (!attachments.length) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {attachments.map((item, index) => (
          <View key={`${item.uri}-${index}`} style={styles.chip}>
            {item.type === 'image' || item.type === 'video' ? (
              <Image source={{ uri: item.uri }} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={styles.docThumb}>
                {item.type === 'audio' ? <Music size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} /> : null}
                {item.type === 'document' ? <FileText size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} /> : null}
                <Text style={styles.docName} numberOfLines={1}>{item.name}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(index)} hitSlop={8}>
              <CircleX size={18} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    backgroundColor: I.canvas,
  },
  scroll: { paddingHorizontal: SPACING.md, gap: SPACING.sm },
  chip: {
    position: 'relative',
    borderRadius: BORDERS.radius.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    backgroundColor: I.surfaceStrong,
  },
  thumb: { width: 64, height: 64 },
  docThumb: {
    width: 120,
    height: 64,
    paddingHorizontal: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docName: { ...TYPOGRAPHY.styles.caption, color: I.body, flex: 1 },
  removeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: I.canvas,
    borderRadius: 10,
  },
});
