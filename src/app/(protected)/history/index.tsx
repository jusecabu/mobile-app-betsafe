import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { services } from '@/lib/container';
import { BetWithRelations, EventWithTeams } from '@/lib/db_types';
import { useAuthStore } from '@/store/auth_store';

type EventSummary = {
    event: EventWithTeams;
    bets: BetWithRelations[];
};

export default function HistoryScreen() {
    const user = useAuthStore((state) => state.user);

    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<EventWithTeams[]>([]);
    const [bets, setBets] = useState<BetWithRelations[]>([]);

    useEffect(() => {
        let active = true;

        const loadHistory = async () => {
            if (!user) {
                if (active) {
                    setEvents([]);
                    setBets([]);
                    setLoading(false);
                }
                return;
            }

            try {
                const [eventList, betList] = await Promise.all([
                    services.event.getEvents(user.id, {}),
                    services.bet.getBets(user.id, { limit: 200 }),
                ]);

                if (!active) {
                    return;
                }

                setEvents(eventList);
                setBets(betList.data);
            } catch {
                if (active) {
                    setEvents([]);
                    setBets([]);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        void loadHistory();

        return () => {
            active = false;
        };
    }, [user]);

    const summaries = useMemo<EventSummary[]>(() => {
        return events.map((event) => ({
            event,
            bets: bets.filter((bet) => bet.event_id === event.id),
        }));
    }, [bets, events]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.headerCard}>
                    <Text style={styles.title}>Historial</Text>
                    <Text style={styles.subtitle}>
                        Eventos y apuestas guardadas por perfil.
                    </Text>
                </View>

                {loading ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>
                            Cargando historial...
                        </Text>
                    </View>
                ) : summaries.length > 0 ? (
                    summaries.map(({ event, bets: eventBets }) => (
                        <Pressable
                            key={event.id}
                            style={styles.eventCard}
                            onPress={() => router.push(`/history/${event.id}`)}
                        >
                            <View style={styles.eventTopRow}>
                                <Text style={styles.eventLeague}>
                                    {event.league.name}
                                </Text>
                                <Text
                                    style={[
                                        styles.statusBadge,
                                        event.status === 'scheduled' &&
                                            styles.statusScheduled,
                                        event.status === 'finished' &&
                                            styles.statusFinished,
                                        event.status === 'cancelled' &&
                                            styles.statusCancelled,
                                        event.status === 'live' &&
                                            styles.statusLive,
                                    ]}
                                >
                                    {event.status}
                                </Text>
                            </View>

                            <Text style={styles.eventTeams}>
                                {event.home_team?.name ?? 'Local'} vs{' '}
                                {event.away_team?.name ?? 'Visitante'}
                            </Text>

                            <Text style={styles.eventMeta}>
                                {new Date(event.starts_at).toLocaleString()}
                            </Text>

                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryText}>
                                    {eventBets.length} apuesta
                                    {eventBets.length === 1 ? '' : 's'}
                                </Text>
                                <Text style={styles.summaryText}>
                                    {
                                        eventBets.filter(
                                            (bet) => bet.result === 'won',
                                        ).length
                                    }{' '}
                                    ganadas
                                </Text>
                                <Text style={styles.summaryText}>
                                    {
                                        eventBets.filter(
                                            (bet) => bet.result === 'lost',
                                        ).length
                                    }{' '}
                                    perdidas
                                </Text>
                            </View>

                            <View style={styles.betPreviewList}>
                                {eventBets.slice(0, 3).map((bet) => (
                                    <View
                                        key={bet.id}
                                        style={styles.betPreview}
                                    >
                                        <Text style={styles.betPreviewTitle}>
                                            {bet.market?.name ?? 'Mercado'} ·{' '}
                                            {bet.selection?.name ?? 'Selección'}
                                        </Text>
                                        <Text style={styles.betPreviewMeta}>
                                            Cuota {bet.odds} · Stake {bet.stake}
                                        </Text>
                                    </View>
                                ))}
                                {eventBets.length > 3 ? (
                                    <Text style={styles.moreText}>
                                        +{eventBets.length - 3} apuestas más
                                    </Text>
                                ) : null}
                            </View>
                        </Pressable>
                    ))
                ) : (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>
                            Todavía no hay eventos para mostrar.
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
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        gap: 12,
        shadowColor: '#101828',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 4,
    },
    title: {
        color: '#101828',
        fontSize: 32,
        fontWeight: '800',
    },
    subtitle: {
        color: '#5B6472',
        fontSize: 16,
        lineHeight: 22,
    },
    emptyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#101828',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 4,
    },
    emptyText: {
        color: '#667085',
        fontSize: 14,
    },
    eventCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        gap: 12,
        shadowColor: '#101828',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 4,
    },
    eventTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    eventLeague: {
        color: '#101828',
        fontSize: 18,
        fontWeight: '800',
        flex: 1,
    },
    statusBadge: {
        overflow: 'hidden',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        color: '#101828',
        backgroundColor: '#F2F4F7',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    statusScheduled: {
        backgroundColor: '#FEF0C7',
        color: '#B54708',
    },
    statusFinished: {
        backgroundColor: '#D1FADF',
        color: '#027A48',
    },
    statusCancelled: {
        backgroundColor: '#FEE4E2',
        color: '#B42318',
    },
    statusLive: {
        backgroundColor: '#D0D5FF',
        color: '#3538CD',
    },
    eventTeams: {
        color: '#344054',
        fontSize: 16,
        fontWeight: '700',
    },
    eventMeta: {
        color: '#667085',
        fontSize: 13,
    },
    summaryRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    summaryText: {
        color: '#344054',
        fontSize: 13,
        fontWeight: '600',
    },
    betPreviewList: {
        gap: 8,
    },
    betPreview: {
        backgroundColor: '#F8FAFC',
        borderColor: '#EAECF0',
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        gap: 4,
    },
    betPreviewTitle: {
        color: '#101828',
        fontSize: 14,
        fontWeight: '700',
    },
    betPreviewMeta: {
        color: '#667085',
        fontSize: 12,
    },
    moreText: {
        color: '#667085',
        fontSize: 12,
        fontStyle: 'italic',
    },
});
