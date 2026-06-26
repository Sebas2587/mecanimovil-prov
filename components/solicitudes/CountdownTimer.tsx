import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SPACING, BORDERS } from '@/app/design-system/tokens';
import { institutionalStatusColors } from '@/app/design-system/styles/institutionalSemantic';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const urgentStatus = institutionalStatusColors('error');
const normalStatus = institutionalStatusColors('info');
const expiredStatus = institutionalStatusColors('neutral');

interface CountdownTimerProps {
  targetDate: string;
  onExpire?: () => void;
  compact?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetDate,
  onExpire,
  compact = false,
}) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();

      if (difference <= 0) {
        setTimeLeft('Expirada');
        setIsExpired(true);
        if (onExpire) onExpire();
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setIsUrgent(hours < 1);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${days}d ${hours % 24}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onExpire]);

  if (isExpired) {
    return (
      <View
        style={[
          compact ? styles.containerCompact : styles.container,
          { backgroundColor: expiredStatus.bg },
        ]}
      >
        <InstitutionalIcon
          name="timer-off"
          size={compact ? 11 : 14}
          color={expiredStatus.icon}
          strokeWidth={ICON_STROKE_WIDTH}
        />
        <InstitutionalText
          role={compact ? 'small' : 'caption'}
          color={expiredStatus.text}
          style={styles.tabular}
        >
          Expirada
        </InstitutionalText>
      </View>
    );
  }

  const status = isUrgent ? urgentStatus : normalStatus;

  return (
    <View
      style={[
        compact ? styles.containerCompact : styles.container,
        {
          backgroundColor: status.bg,
          borderColor: status.border,
        },
      ]}
    >
      <InstitutionalIcon
        name="timer"
        size={compact ? 11 : 14}
        color={status.icon}
        strokeWidth={ICON_STROKE_WIDTH}
      />
      <InstitutionalText
        role={compact ? 'small' : 'caption'}
        color={status.text}
        style={[styles.tabular, isUrgent && styles.urgentText]}
      >
        {timeLeft}
      </InstitutionalText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xxs,
    paddingHorizontal: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.xxs,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
  },
  containerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    flexShrink: 0,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  urgentText: {
    fontFamily: undefined,
    fontWeight: '700',
  },
});
