import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { useTheme } from '@/app/design-system/theme/useTheme';

interface ChartDataPoint {
    value: number;
    label: string;
    dataPointText?: string;
}

interface InteractiveStatsChartProps {
    ingresos: any[]; // Historial de pagos recibidos (ganancias)
    consumos: any[]; // Historial de créditos consumidos
    currentMonth?: number;
    currentYear?: number;
}

export const InteractiveStatsChart: React.FC<InteractiveStatsChartProps> = ({
    ingresos = [],
    consumos = [],
    currentMonth = new Date().getMonth(),
    currentYear = new Date().getFullYear(),
}) => {
    const theme = useTheme();
    const colors = theme?.colors || {};

    const primaryColor = colors?.primary?.['500'] || '#4E4FEB';
    const successColor = colors?.success?.main || '#22C55E';
    const textSecondary = colors?.text?.secondary || '#666';
    const backgroundPaper = colors?.background?.paper || '#fff';

    // Procesar datos para la gráfica
    const {
        lineData1,
        lineData2,
        maxValue,
        chartCalculatedWidth,
        chartSpacing,
        chartInitialSpacing
    } = useMemo(() => {
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const dailyIngresos: Record<number, number> = {};
        const dailyConsumos: Record<number, number> = {};

        // Inicializar con 0
        for (let i = 1; i <= daysInMonth; i++) {
            dailyIngresos[i] = 0;
            dailyConsumos[i] = 0;
        }

        // Poblar ingresos
        ingresos.forEach(item => {
            const date = new Date(item.fecha);
            if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                const day = date.getDate();
                dailyIngresos[day] += item.monto || 0;
            }
        });

        // Poblar consumos
        consumos.forEach(item => {
            const date = new Date(item.fecha_consumo);
            if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                const day = date.getDate();
                dailyConsumos[day] += item.creditos_consumidos || 0;
            }
        });

        const data1: ChartDataPoint[] = []; // Ganancias
        const data2: ChartDataPoint[] = []; // Créditos

        // Formatear para la gráfica (mostramos puntos cada 5 días para no saturar etiquetas)
        for (let i = 1; i <= daysInMonth; i++) {
            data1.push({
                value: dailyIngresos[i],
                label: i % 5 === 0 || i === 1 || i === daysInMonth ? i.toString() : '',
            });
            data2.push({
                value: dailyConsumos[i] * 500, // Escalar créditos para que sean visibles comparados con $ (ajuste visual)
                label: i % 5 === 0 || i === 1 || i === daysInMonth ? i.toString() : '',
            });
        }

        const maxVal = Math.max(...Object.values(dailyIngresos), ...Object.values(dailyConsumos).map(v => v * 500), 1000);

        // Cálculos dinámicos de espacio para evitar desbordamiento
        const cardPadding = SPACING.md; // 16
        const yAxisWidth = 45;
        // Restar un poco más de espacio (35 en lugar de 25) para asegurar que no toque el borde derecho
        const availableWidth = Dimensions.get('window').width - (cardPadding * 2) - yAxisWidth - 35;
        const initialSpacing = 15;
        const calculatedSpacing = (availableWidth - initialSpacing) / (daysInMonth - 1);

        return {
            lineData1: data1,
            lineData2: data2,
            maxValue: maxVal,
            chartCalculatedWidth: availableWidth,
            chartSpacing: calculatedSpacing,
            chartInitialSpacing: initialSpacing
        };
    }, [ingresos, consumos, currentMonth, currentYear]);

    return (
        <View style={[styles.card, { backgroundColor: backgroundPaper }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors?.text?.primary }]}>Rendimiento Diario</Text>
                <View style={styles.legend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.dot, { backgroundColor: successColor }]} />
                        <Text style={[styles.legendText, { color: textSecondary }]}>Ganancias</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.dot, { backgroundColor: primaryColor }]} />
                        <Text style={[styles.legendText, { color: textSecondary }]}>Créditos (Consumo)</Text>
                    </View>
                </View>
            </View>

            <View style={styles.chartContainer}>
                <LineChart
                    data={lineData1}
                    data2={lineData2}
                    height={180}
                    width={chartCalculatedWidth}
                    initialSpacing={chartInitialSpacing}
                    spacing={chartSpacing}
                    color1={successColor}
                    color2={primaryColor}
                    thickness={1.5} // Línea más delgada y elegante
                    hideDataPoints
                    noOfSections={4}
                    yAxisColor={'transparent'}
                    yAxisThickness={0}
                    xAxisColor={'transparent'}
                    xAxisThickness={0} // Ocultar línea del eje X que suele desbordar
                    yAxisTextStyle={{ color: textSecondary, fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: textSecondary, fontSize: 10 }}
                    yAxisLabelWidth={45} // Ancho fijo para las etiquetas del eje Y para evitar recortes
                    yAxisSide={0} // Izquierda
                    maxValue={maxValue}
                    hideRules
                    showVerticalLines
                    verticalLinesColor="rgba(0,0,0,0.05)"
                    pointerConfig={{
                        pointerStripUptoDataPoint: true,
                        pointerStripColor: 'lightgray',
                        pointerStripWidth: 2,
                        strokeDashArray: [2, 5],
                        radius: 4,
                        shiftPointerLabelX: -50,
                        shiftPointerLabelY: -10,
                        pointerLabelComponent: (items: any) => {
                            if (!items || items.length < 2) return null;
                            return (
                                <View style={[styles.pointerLabel, { backgroundColor: backgroundPaper, ...SHADOWS.md }]}>
                                    <View style={styles.pointerHeader}>
                                        <MaterialCommunityIcons name="calendar-today" size={10} color={textSecondary} />
                                        <Text style={styles.pointerTextDay}>Día {items[0].label || '?'}</Text>
                                    </View>
                                    <Text style={[styles.pointerTextValue, { color: successColor }]}>
                                        ${Math.round(items[0].value).toLocaleString('es-CL')}
                                    </Text>
                                    <Text style={[styles.pointerTextValue, { color: primaryColor }]}>
                                        {Math.round(items[1].value / 500)} créditos
                                    </Text>
                                </View>
                            );
                        },
                    }}
                />
            </View>

            <View style={styles.footer}>
                <MaterialCommunityIcons name="information-outline" size={14} color={textSecondary} />
                <Text style={[styles.footerText, { color: textSecondary }]}>
                    Ganancias vs Consumo de créditos aproximado por día.
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        padding: SPACING.md,
        borderRadius: BORDERS.radius.lg,
        marginBottom: SPACING.md,
        ...SHADOWS.md,
        overflow: 'hidden', // Evitar que la gráfica se salga de los bordes redondeados
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    title: {
        fontSize: TYPOGRAPHY.fontSize.md,
        fontWeight: '700',
    },
    legend: {
        flexDirection: 'column',
        gap: 4,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 10,
        fontWeight: '500',
    },
    chartContainer: {
        marginTop: 10,
        alignItems: 'flex-start', // Alinear al inicio para que el eje Y esté pegado a la izquierda
        paddingLeft: 0,
    },
    pointerLabel: {
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eee',
        minWidth: 110,
    },
    pointerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    pointerTextDay: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#000',
    },
    pointerTextValue: {
        fontSize: 12,
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    footerText: {
        fontSize: 10,
    },
});
