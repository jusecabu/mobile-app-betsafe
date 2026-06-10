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
import {
    PerformanceByCategory,
    PerformanceByLeague,
    PerformanceByMarket,
    PerformanceByOddsRange,
    PerformanceByTeam,
} from '@/lib/db_types';
import { useAuthStore } from '@/store/auth_store';

type AnalysisDimension = 'category' | 'league' | 'market' | 'team' | 'odds';

type DetailItem = {
    code: string;
    name: string;
    total_bets: number;
    winrate_pct: number | null;
    roi_pct: number | null;
    total_profit: number;
};

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

function pickByRoi(items: DetailItem[]) {
    const ranked = items.filter(
        (item) => item.roi_pct !== null && item.total_bets > 0,
    );
    if (ranked.length === 0) return { best: null, worst: null };

    const sorted = [...ranked].sort(
        (a, b) => (b.roi_pct ?? 0) - (a.roi_pct ?? 0),
    );
    return {
        best: sorted[0] ?? null,
        worst: sorted[sorted.length - 1] ?? null,
    };
}

function pickByWinrate(items: DetailItem[]) {
    const ranked = items.filter(
        (item) => item.winrate_pct !== null && item.total_bets > 0,
    );
    if (ranked.length === 0) return { best: null, worst: null };

    const sorted = [...ranked].sort(
        (a, b) => (b.winrate_pct ?? 0) - (a.winrate_pct ?? 0),
    );
    return {
        best: sorted[0] ?? null,
        worst: sorted[sorted.length - 1] ?? null,
    };
}

function sectionLabel(dimension: AnalysisDimension) {
    switch (dimension) {
        case 'category':
            return 'Categoría';
        case 'league':
            return 'Liga';
        case 'market':
            return 'Mercado';
        case 'team':
            return 'Equipo';
        case 'odds':
            return 'Rango de odds';
    }
}

function itemLabel(dimension: AnalysisDimension) {
    switch (dimension) {
        case 'category':
            return 'categoría';
        case 'league':
            return 'liga';
        case 'market':
            return 'mercado';
        case 'team':
            return 'equipo';
        case 'odds':
            return 'rango de odds';
    }
}

export default function AnalyticsDetailScreen() {
    const user = useAuthStore((state) => state.user);
    const params = useLocalSearchParams<{
        dimension?: string | string[];
        code?: string | string[];
    }>();
    const dimension = (
        Array.isArray(params.dimension) ? params.dimension[0] : params.dimension
    ) as AnalysisDimension | undefined;
    const code = Array.isArray(params.code) ? params.code[0] : params.code;

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<DetailItem[]>([]);

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (!user || !dimension || !code) {
                if (active) {
                    setItems([]);
                    setLoading(false);
                }
                return;
            }

            try {
                const dashboard = await services.analytics.getDashboard(
                    user.id,
                );
                let source: DetailItem[] = [];

                switch (dimension) {
                    case 'category':
                        source = dashboard.byCategory.map(
                            (item: PerformanceByCategory) => ({
                                code: item.category_code,
                                name: item.category_name,
                                total_bets: item.total_bets,
                                winrate_pct: item.winrate_pct,
                                roi_pct: item.roi_pct,
                                total_profit: item.total_profit,
                            }),
                        );
                        break;
                    case 'league':
                        source = dashboard.byLeague.map(
                            (item: PerformanceByLeague) => ({
                                code: item.league_id,
                                name: item.league_name,
                                total_bets: item.total_bets,
                                winrate_pct: item.winrate_pct,
                                roi_pct: item.roi_pct,
                                total_profit: item.total_profit,
                            }),
                        );
                        break;
                    case 'market':
                        source = dashboard.byMarket.map(
                            (item: PerformanceByMarket) => ({
                                code: item.market_code,
                                name: item.market_name,
                                total_bets: item.total_bets,
                                winrate_pct: item.winrate_pct,
                                roi_pct: item.roi_pct,
                                total_profit: item.total_profit,
                            }),
                        );
                        break;
                    case 'team':
                        source = dashboard.byTeam.map(
                            (item: PerformanceByTeam) => ({
                                code: item.team_id,
                                name: item.team_name,
                                total_bets: item.total_bets,
                                winrate_pct: item.winrate_pct,
                                roi_pct: item.roi_pct,
                                total_profit: item.total_profit,
                            }),
                        );
                        break;
                    case 'odds':
                        source = dashboard.byOddsRange.map(
                            (item: PerformanceByOddsRange) => ({
                                code: item.odds_range,
                                name: item.odds_range,
                                total_bets: item.total_bets,
                                winrate_pct: item.winrate_pct,
                                roi_pct: item.roi_pct,
                                total_profit: item.total_profit,
                            }),
                        );
                        break;
                }

                if (active) {
                    setItems(source);
                }
            } catch {
                if (active) {
                    setItems([]);
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
    }, [code, dimension, user]);

    const selected = useMemo(
        () => items.find((item) => item.code === code) ?? null,
        [code, items],
    );

    const analysis = useMemo(() => {
        if (!user || !dimension || !code) return null;

        return {
            title: selected?.name ?? 'Sin datos',
            label: sectionLabel(dimension),
            selected,
        };
    }, [code, dimension, selected, user]);

    const positives = useMemo(() => {
        if (!user || !dimension || !code) return [];

        const byRoi = pickByRoi(items);
        const byWinrate = pickByWinrate(items);

        const messages: string[] = [];

        if (dimension === 'odds') {
            if (byWinrate.best) {
                messages.push(
                    `Ganas más con rango de odds ${byWinrate.best.name}.`,
                );
            }
        } else {
            if (byRoi.best) {
                messages.push(
                    `Ganas más con ${itemLabel(dimension)} ${byRoi.best.name}.`,
                );
            }
        }

        return messages;
    }, [code, dimension, items, user]);

    const negatives = useMemo(() => {
        if (!user || !dimension || !code) return [];

        const byRoi = pickByRoi(items);
        const byWinrate = pickByWinrate(items);

        const messages: string[] = [];

        if (dimension === 'odds') {
            if (byWinrate.worst) {
                messages.push(
                    `Pierdes más con rango de odds ${byWinrate.worst.name}.`,
                );
            }
        } else {
            if (byRoi.worst) {
                messages.push(
                    `Pierdes más con ${itemLabel(dimension)} ${byRoi.worst.name}.`,
                );
            }
        }

        return messages;
    }, [code, dimension, items, user]);

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
                            Analizando{' '}
                            {sectionLabel(
                                dimension ?? 'category',
                            ).toLowerCase()}
                            ...
                        </Text>
                    </View>
                ) : analysis?.selected ? (
                    <>
                        <View style={styles.heroCard}>
                            <Text style={styles.heroKicker}>
                                {analysis.label}
                            </Text>
                            <Text style={styles.heroTitle}>
                                {analysis.title}
                            </Text>
                            <Text style={styles.heroSubtitle}>
                                {analysis.selected.total_bets} apuestas ·
                                Winrate{' '}
                                {formatPercent(analysis.selected.winrate_pct)} ·
                                ROI {formatPercent(analysis.selected.roi_pct)}
                            </Text>
                            {dimension === 'team' ? (
                                <Text style={styles.heroNote}>
                                    Este análisis solo considera apuestas de
                                    MATCH_RESULT con el mercado winner y el
                                    scope home_team / away_team.
                                </Text>
                            ) : null}
                        </View>

                        <View style={styles.metricsGrid}>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>Apuestas</Text>
                                <Text style={styles.metricValue}>
                                    {analysis.selected.total_bets}
                                </Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>Winrate</Text>
                                <Text style={styles.metricValue}>
                                    {formatPercent(
                                        analysis.selected.winrate_pct,
                                    )}
                                </Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>ROI</Text>
                                <Text style={styles.metricValue}>
                                    {formatPercent(analysis.selected.roi_pct)}
                                </Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>Profit</Text>
                                <Text style={styles.metricValue}>
                                    {formatMoney(
                                        analysis.selected.total_profit,
                                    )}
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.insightCard, styles.goodCard]}>
                            <Text style={styles.insightTitle}>
                                Lo que más te beneficia
                            </Text>
                            {positives.length > 0 ? (
                                positives.map((text) => (
                                    <Text key={text} style={styles.insightText}>
                                        <Text style={styles.goodSpan}>
                                            Ganas más con{' '}
                                        </Text>
                                        {text.replace('Ganas más con ', '')}
                                    </Text>
                                ))
                            ) : (
                                <Text style={styles.insightText}>
                                    Todavía no hay suficiente muestra para sacar
                                    una conclusión.
                                </Text>
                            )}
                        </View>

                        <View style={[styles.insightCard, styles.badCard]}>
                            <Text style={styles.insightTitle}>
                                Lo que menos te beneficia
                            </Text>
                            {negatives.length > 0 ? (
                                negatives.map((text) => (
                                    <Text key={text} style={styles.insightText}>
                                        <Text style={styles.badSpan}>
                                            Pierdes más con{' '}
                                        </Text>
                                        {text.replace('Pierdes más con ', '')}
                                    </Text>
                                ))
                            ) : (
                                <Text style={styles.insightText}>
                                    Todavía no hay suficiente muestra para sacar
                                    una conclusión.
                                </Text>
                            )}
                        </View>
                    </>
                ) : (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>
                            No hay datos para este análisis.
                        </Text>
                        <Text style={styles.emptyText}>
                            Revisa que existan apuestas guardadas para esta{' '}
                            {itemLabel(dimension ?? 'category')}.
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
        backgroundColor: '#101828',
        borderRadius: 28,
        gap: 8,
        padding: 24,
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
    heroNote: {
        color: '#98A2B3',
        fontSize: 12,
        lineHeight: 18,
        marginTop: 4,
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
