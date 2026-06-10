import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { services } from '@/lib/container';
import { CategoryAnalyticsDetail } from '@/services/analytics_service';
import { useAuthStore } from '@/store/auth_store';

const moneyFormatter = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

function formatMoney(value: number) {
    return moneyFormatter.format(value);
}

function formatPercent(value: number | null) {
    if (value === null || Number.isNaN(value)) return '—';
    return `${percentFormatter.format(value)}%`;
}

function InsightBlock({
    title,
    items,
    tone,
}: {
    title: string;
    items: string[];
    tone: 'good' | 'bad';
}) {
    return (
        <View
            style={[
                styles.insightCard,
                tone === 'good' ? styles.goodCard : styles.badCard,
            ]}
        >
            <Text style={styles.insightTitle}>{title}</Text>
            {items.length > 0 ? (
                items.map((item) => (
                    <Text key={item} style={styles.insightText}>
                        <Text
                            style={
                                tone === 'good'
                                    ? styles.goodSpan
                                    : styles.badSpan
                            }
                        >
                            {tone === 'good'
                                ? 'Lo que más te beneficia: '
                                : 'Lo que menos te beneficia: '}
                        </Text>
                        {item}
                    </Text>
                ))
            ) : (
                <Text style={styles.insightText}>
                    Todavía no hay suficiente muestra para sacar una conclusión.
                </Text>
            )}
        </View>
    );
}

export default function AnalyticsCategoryDetailScreen() {
    const user = useAuthStore((state) => state.user);
    const params = useLocalSearchParams<{ categoryCode?: string | string[] }>();
    const categoryCode = Array.isArray(params.categoryCode)
        ? params.categoryCode[0]
        : params.categoryCode;

    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState<CategoryAnalyticsDetail | null>(null);

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (!user || !categoryCode) {
                if (active) {
                    setDetail(null);
                    setLoading(false);
                }
                return;
            }

            try {
                const data = await services.analytics.getCategoryDetail(
                    user.id,
                    categoryCode,
                );

                if (active) {
                    setDetail(data);
                }
            } catch {
                if (active) {
                    setDetail(null);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, [categoryCode, user]);

    const headerTone = useMemo(() => {
        if (!detail) return 'neutral';
        if (
            detail.performance.roi_pct !== null &&
            detail.performance.roi_pct >= 0
        ) {
            return 'good';
        }
        return 'bad';
    }, [detail]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.topRow}>
                    <Pressable
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backButtonText}>Volver</Text>
                    </Pressable>
                </View>

                {loading ? (
                    <View style={styles.loadingCard}>
                        <ActivityIndicator color="#101828" />
                        <Text style={styles.loadingText}>
                            Analizando categoría...
                        </Text>
                    </View>
                ) : detail ? (
                    <>
                        <View
                            style={[
                                styles.heroCard,
                                headerTone === 'good'
                                    ? styles.heroGood
                                    : headerTone === 'bad'
                                      ? styles.heroBad
                                      : null,
                            ]}
                        >
                            <Text style={styles.heroKicker}>
                                {detail.categoryCode}
                            </Text>
                            <Text style={styles.heroTitle}>
                                {detail.categoryName}
                            </Text>
                            <Text style={styles.heroSubtitle}>
                                {detail.performance.total_bets} apuestas ·
                                Winrate{' '}
                                {formatPercent(detail.performance.winrate_pct)}{' '}
                                · ROI{' '}
                                {formatPercent(detail.performance.roi_pct)}
                            </Text>
                        </View>

                        <View style={styles.metricsGrid}>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>Ganadas</Text>
                                <Text style={styles.metricValue}>
                                    {detail.performance.won}
                                </Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>Perdidas</Text>
                                <Text style={styles.metricValue}>
                                    {detail.performance.lost}
                                </Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>Void</Text>
                                <Text style={styles.metricValue}>
                                    {detail.performance.void}
                                </Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>Profit</Text>
                                <Text style={styles.metricValue}>
                                    {formatMoney(
                                        detail.performance.total_profit,
                                    )}
                                </Text>
                            </View>
                        </View>

                        <InsightBlock
                            title="Lo que más le beneficia"
                            items={detail.positiveInsights}
                            tone="good"
                        />
                        <InsightBlock
                            title="Lo que menos le beneficia"
                            items={detail.negativeInsights}
                            tone="bad"
                        />

                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>
                                Mejores contextos
                            </Text>
                            <Text style={styles.sectionText}>
                                Mercado:{' '}
                                {detail.bestMarket?.market_name ?? 'Sin datos'}{' '}
                                · Liga:{' '}
                                {detail.bestLeague?.league_name ?? 'Sin datos'}{' '}
                                · Equipo:{' '}
                                {detail.bestTeam?.team_name ?? 'Sin datos'} ·
                                Cuotas:{' '}
                                {detail.bestOddsRange?.odds_range ??
                                    'Sin datos'}
                            </Text>
                        </View>

                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>
                                Contextos débiles
                            </Text>
                            <Text style={styles.sectionText}>
                                Mercado:{' '}
                                {detail.worstMarket?.market_name ?? 'Sin datos'}{' '}
                                · Liga:{' '}
                                {detail.worstLeague?.league_name ?? 'Sin datos'}{' '}
                                · Equipo:{' '}
                                {detail.worstTeam?.team_name ?? 'Sin datos'} ·
                                Cuotas:{' '}
                                {detail.worstOddsRange?.odds_range ??
                                    'Sin datos'}
                            </Text>
                        </View>
                    </>
                ) : (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>
                            No hay datos para esta categoría.
                        </Text>
                        <Text style={styles.emptyText}>
                            Revisa que existan apuestas guardadas con esa
                            categoría.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F3F5F9',
    },
    container: {
        padding: 24,
        gap: 16,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
    },
    backButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    backButtonText: {
        color: '#101828',
        fontSize: 13,
        fontWeight: '800',
    },
    loadingCard: {
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        gap: 12,
        padding: 24,
    },
    loadingText: {
        color: '#667085',
        fontSize: 14,
    },
    heroCard: {
        borderRadius: 28,
        gap: 8,
        padding: 24,
    },
    heroGood: {
        backgroundColor: '#101828',
    },
    heroBad: {
        backgroundColor: '#3A1010',
    },
    heroKicker: {
        color: '#A6B2FF',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    heroTitle: {
        color: '#F9FAFB',
        fontSize: 30,
        fontWeight: '900',
        lineHeight: 34,
    },
    heroSubtitle: {
        color: '#D0D5DD',
        fontSize: 15,
        lineHeight: 22,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    metricCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        minWidth: 145,
        padding: 16,
        flexGrow: 1,
        gap: 4,
    },
    metricLabel: {
        color: '#667085',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    metricValue: {
        color: '#101828',
        fontSize: 22,
        fontWeight: '900',
    },
    insightCard: {
        borderRadius: 24,
        gap: 10,
        padding: 20,
    },
    goodCard: {
        backgroundColor: '#ECFDF3',
        borderColor: '#ABEFC6',
        borderWidth: 1,
    },
    badCard: {
        backgroundColor: '#FEF3F2',
        borderColor: '#FECDCA',
        borderWidth: 1,
    },
    insightTitle: {
        color: '#101828',
        fontSize: 18,
        fontWeight: '900',
    },
    insightText: {
        color: '#344054',
        fontSize: 14,
        lineHeight: 21,
    },
    goodSpan: {
        color: '#027A48',
        fontWeight: '800',
    },
    badSpan: {
        color: '#B42318',
        fontWeight: '800',
    },
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        gap: 8,
        padding: 20,
    },
    sectionTitle: {
        color: '#101828',
        fontSize: 18,
        fontWeight: '900',
    },
    sectionText: {
        color: '#344054',
        fontSize: 14,
        lineHeight: 21,
    },
    emptyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        gap: 8,
    },
    emptyTitle: {
        color: '#101828',
        fontSize: 18,
        fontWeight: '800',
    },
    emptyText: {
        color: '#667085',
        fontSize: 14,
        lineHeight: 20,
    },
});
