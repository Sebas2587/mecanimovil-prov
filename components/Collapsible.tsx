import { PropsWithChildren, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { IconSymbol } from '@/components/ui/IconSymbol';

const I = COLORS.institutional;

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View>
      <TouchableOpacity
        style={styles.heading}
        onPress={() => setIsOpen((value) => !value)}
        activeOpacity={0.8}
      >
        <IconSymbol
          name="chevron.right"
          size={18}
          weight="medium"
          color={I.muted}
          style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
        />
        <InstitutionalText role="bodyBold">{title}</InstitutionalText>
      </TouchableOpacity>
      {isOpen ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
  },
  content: {
    marginTop: SPACING.fixed.xs,
    marginLeft: SPACING.fixed.lg,
  },
});
