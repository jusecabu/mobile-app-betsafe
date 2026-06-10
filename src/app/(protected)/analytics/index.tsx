import { router } from 'expo-router';
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
import { PerformanceByTeam } from '@/lib/db_types';
import { useAuthStore } from '@/store/auth_store';

type SummaryItem = {
    code: string;
    name: string;
    total_bets: number;
    winrate_pct: number | null;
    roi_pct: number | null;
    total_profit: number;
};

type SectionConfig = {
    key: 'category' | 'league' | 'market' | 'team' | 'odds';
    title: string;
    subtitle: string;
    items: SummaryItem[];
    routePrefix: string;
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

function toSummaryItem(
    code: string,
    name: string,
    total_bets: number,
    winrate_pct: number | null,
    roi_pct: number | null,
    total_profit: number,
): SummaryItem {
    return {
        code,
        name,
        total_bets,
        winrate_pct,
        roi_pct,
        total_profit,
    };
}

function SectionCard({ section }: { section: SectionConfig }) {
    const best = section.items[0] ?? null;
    const worst = section.items[section.items.length - 1] ?? null;

    return (
        <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderText}>
                    <Text style={styles.sectionKicker}>{section.title}</Text>
                    <Text style={styles.sectionSubtitle}>
                        {section.subtitle}
                    </Text>
                </View>
            </View>

            <View style={styles.insightRow}>
                <Text style={styles.insightText}>
                    <Text style={styles.goodSpan}>Ganas más con </Text>
                    {best?.name ?? 'sin datos'}
                </Text>
                <Text style={styles.insightText}>
                    <Text style={styles.badSpan}>Pierdes más con </Text>
                    {worst?.name ?? 'sin datos'}
                </Text>
            </View>

            {section.items.slice(0, 3).map((item, index) => (
                <Pressable
                    key={`${section.key}-${item.code}`}
                    style={styles.itemCard}
                    onPress={() =>
                        router.push(
                            `/analytics/${section.routePrefix}/${encodeURIComponent(item.code)}`,
                        )
                    }
                >
                    <View style={styles.itemRow}>
                        <View style={styles.itemTitleBlock}>
                            <Text style={styles.itemTitle}>
                                {index + 1}. {item.name}
                            </Text>
                            <Text style={styles.itemMeta}>
                                {item.total_bets} apuestas · Winrate{' '}
                                {formatPercent(item.winrate_pct)}
                            </Text>
                        </View>
                        <View style={styles.roiBadge}>
                            <Text
                                style={[
                                    styles.roiBadgeText,
                                    (item.roi_pct ?? 0) >= 0
                                        ? styles.roiBadgeGood
                                        : styles.roiBadgeBad,
                                ]}
                            >
                                ROI {formatPercent(item.roi_pct)}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.profitText}>
                        Profit {formatMoney(item.total_profit)}
                    </Text>
                </Pressable>
            ))}
        </View>
    );
}

export default function AnalyticsScreen() {
    const user = useAuthStore((state) => state.user);
    const [loading, setLoading] = useState(true);
    const [sections, setSections] = useState<SectionConfig[]>([]);

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (!user) {
                if (active) {
                    setSections([]);
                    setLoading(false);
                }
                return;
            }

            try {
                const dashboard = await services.analytics.getDashboard(
                    user.id,
                );

                const categoryItems = [...dashboard.byCategory]
                    .sort((a, b) => b.total_bets - a.total_bets)
                    .map((item) =>
                        toSummaryItem(
                            item.category_code,
                            item.category_name,
                            item.total_bets,
                            item.winrate_pct,
                            item.roi_pct,
                            item.total_profit,
                        ),
                    );

                const leagueItems = [...dashboard.byLeague]
                    .sort((a, b) => b.total_bets - a.total_bets)
                    .map((item) =>
                        toSummaryItem(
                            item.league_id,
                            item.league_name,
                            item.total_bets,
                            item.winrate_pct,
                            item.roi_pct,
                            item.total_profit,
                        ),
                    );

                const marketItems = [...dashboard.byMarket]
                    .sort((a, b) => b.total_bets - a.total_bets)
                    .map((item) =>
                        toSummaryItem(
                            item.market_code,
                            item.market_name,
                            item.total_bets,
                            item.winrate_pct,
                            item.roi_pct,
                            item.total_profit,
                        ),
                    );

                const oddsItems = [...dashboard.byOddsRange]
                    .sort((a, b) => b.total_bets - a.total_bets)
                    .map((item) =>
                        toSummaryItem(
                            item.odds_range,
                            item.odds_range,
                            item.total_bets,
                            item.winrate_pct,
                            item.roi_pct,
                            item.total_profit,
                        ),
                    );

                const teamItems = [...dashboard.byTeam]
                    .sort((a, b) => b.total_bets - a.total_bets)
                    .map((item: PerformanceByTeam) =>
                        toSummaryItem(
                            item.team_id,
                            item.team_name,
                            item.total_bets,
                            item.winrate_pct,
                            item.roi_pct,
                            item.total_profit,
                        ),
                    );

                if (active) {
                    setSections([
                        {
                            key: 'category',
                            title: 'Categorías',
                            subtitle:
                                'Dónde ganas más y dónde pierdes más por tipo de apuesta.',
                            items: categoryItems,
                            routePrefix: 'category',
                        },
                        {
                            key: 'league',
                            title: 'Ligas',
                            subtitle:
                                'Comportamiento de tus apuestas según la liga del evento.',
                            items: leagueItems,
                            routePrefix: 'league',
                        },
                        {
                            key: 'market',
                            title: 'Mercados',
                            subtitle:
                                'Mercados que más te favorecen y los que más castigan.',
                            items: marketItems,
                            routePrefix: 'market',
                        },
                        {
                            key: 'team',
                            title: 'Equipos',
                            subtitle:
                                'Solo apuestas de match_result + winner para saber con qué equipo ganas o pierdes más.',
                            items: teamItems,
                            routePrefix: 'team',
                        },
                        {
                            key: 'odds',
                            title: 'Rangos de odds',
                            subtitle:
                                'Qué rangos de cuota te hacen ganar más y cuáles te hacen perder.',
                            items: oddsItems,
                            routePrefix: 'odds',
                        },
                    ]);
                }
            } catch {
                if (active) {
                    setSections([]);
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
    }, [user]);

    const sectionCount = useMemo(() => sections.length, [sections]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.headerCard}>
                    <Text style={styles.kicker}>Análisis</Text>
                    <Text style={styles.title}>
                        Dónde ganas y dónde pierdes
                    </Text>
                    <Text style={styles.subtitle}>
                        Cuatro lecturas estáticas: categorías, ligas, mercados y
                        rangos de odds.
                    </Text>
                </View>

                {loading ? (
                    <View style={styles.loadingCard}>
                        <ActivityIndicator color="#101828" />
                        <Text style={styles.loadingText}>
                            Calculando métricas...
                        </Text>
                    </View>
                ) : sectionCount > 0 ? (
                    sections.map((section) => (
                        <SectionCard key={section.key} section={section} />
                    ))
                ) : (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>
                            Aún no hay suficientes apuestas.
                        </Text>
                        <Text style={styles.emptyText}>
                            Cuando tengas apuestas guardadas, aquí verás tus
                            análisis por categoría, liga, mercado y odds.
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
    headerCard: {
        backgroundColor: '#101828',
        borderRadius: 28,
        padding: 24,
        gap: 10,
    },
    kicker: {
        color: '#A6B2FF',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.4,
        textTransform: 'uppercase',
    },
    title: {
        color: '#F9FAFB',
        fontSize: 30,
        fontWeight: '900',
        lineHeight: 34,
    },
    subtitle: {
        color: '#D0D5DD',
        fontSize: 15,
        lineHeight: 22,
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
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        gap: 12,
        padding: 20,
        shadowColor: '#101828',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
    },
    sectionHeaderText: {
        flex: 1,
        gap: 4,
    },
    sectionKicker: {
        color: '#101828',
        fontSize: 20,
        fontWeight: '900',
    },
    sectionSubtitle: {
        color: '#667085',
        fontSize: 13,
        lineHeight: 19,
    },
    insightRow: {
        gap: 6,
    },
    insightText: {
        color: '#344054',
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '600',
    },
    goodSpan: {
        color: '#027A48',
        fontWeight: '900',
    },
    badSpan: {
        color: '#B42318',
        fontWeight: '900',
    },
    itemCard: {
        backgroundColor: '#F9FAFB',
        borderColor: '#EAECF0',
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        gap: 8,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
    },
    itemTitleBlock: {
        flex: 1,
        gap: 4,
    },
    itemTitle: {
        color: '#101828',
        fontSize: 16,
        fontWeight: '800',
    },
    itemMeta: {
        color: '#667085',
        fontSize: 13,
        lineHeight: 18,
    },
    roiBadge: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    roiBadgeText: {
        fontSize: 12,
        fontWeight: '900',
    },
    roiBadgeGood: {
        color: '#027A48',
    },
    roiBadgeBad: {
        color: '#B42318',
    },
    profitText: {
        color: '#344054',
        fontSize: 13,
        fontWeight: '700',
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
