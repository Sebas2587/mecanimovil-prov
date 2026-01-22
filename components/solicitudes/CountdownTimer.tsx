import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '@/app/design-system/tokens';

interface CountdownTimerProps {
    targetDate: string;
    onExpire?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate, onExpire }) => {
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

            const hours = Math.floor((difference / (1000 * 60 * 60)));
            const minutes = Math.floor((difference / 1000 / 60) % 60);
            const seconds = Math.floor((difference / 1000) % 60);

            if (hours < 1) {
                setIsUrgent(true);
            } else {
                setIsUrgent(false);
            }

            if (hours > 24) {
                const days = Math.floor(hours / 24);
                setTimeLeft(`${days}d ${hours % 24}h`);
            } else if (hours > 0) {
                setTimeLeft(`${hours}h ${minutes}m`);
            } else {
                // Show seconds only when less than 1 hour remains for urgency
                setTimeLeft(`${minutes}m ${seconds}s`);
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [targetDate]);

    // Safe color access
    const errorColor = COLORS?.error?.main || '#FF5555';
    const warningColor = COLORS?.warning?.main || '#FFB84D';
    const successColor = COLORS?.success?.main || '#3DB6B1';
    const grayColor = COLORS?.text?.tertiary || '#666666';

    if (isExpired) {
        return (
            <View style={[styles.container, { backgroundColor: COLORS?.neutral?.gray?.[100] || '#F3F4F6' }]}>
                <MaterialIcons name="timer-off" size={14} color={grayColor} />
                <Text style={[styles.text, { color: grayColor }]}>Expirada</Text>
            </View>
        );
    }

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: isUrgent
                    ? (COLORS?.error?.light || '#FEE2E2')
                    : (COLORS?.info?.light || '#EFF6FF'),
                borderColor: isUrgent
                    ? (COLORS?.error?.main || '#EF4444')
                    : (COLORS?.info?.main || '#3B82F6')
            }
        ]}>
            <MaterialIcons
                name="timer"
                size={14}
                color={isUrgent ? (COLORS?.error?.main || '#EF4444') : (COLORS?.info?.main || '#3B82F6')}
            />
            <Text style={[
                styles.text,
                {
                    color: isUrgent ? (COLORS?.error?.main || '#EF4444') : (COLORS?.info?.main || '#3B82F6'),
                    fontWeight: isUrgent ? '700' : '600'
                }
            ]}>
                {timeLeft}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    text: {
        fontSize: 12,
        fontVariant: ['tabular-nums'], // Helps prevent jitter when numbers change
    }
});
