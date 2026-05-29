import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { services } from '@/lib/container';
import { BetResult, BetWithRelations, EventWithTeams } from '@/lib/db_types';
import { useAuthStore } from '@/store/auth_store';

type FinalStatus = 'finished' | 'cancelled' | '';

export default function HistoryDetailScreen() {
    const user = useAuthStore((state) => state.user);
    const params = useLocalSearchParams<{ id?: string | string[] }>();
    const eventId = Array.isArray(params.id) ? params.id[0] : params.id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [event, setEvent] = useState<EventWithTeams | null>(null);
    const [bets, setBets] = useState<BetWithRelations[]>([]);
    const [finalStatus, setFinalStatus] = useState<FinalStatus>('');
    const [betResults, setBetResults] = useState<
        Record<string, BetResult | ''>
    >({});

    useEffect(() => {
        let active = true;

        const loadDetail = async () => {
            if (!user || !eventId) {
                if (active) {
                    setLoading(false);
                }
                return;
            }

            try {
                const [eventData, betData] = await Promise.all([
                    services.event.getEvent(user.id, eventId),
                    services.bet.getBets(user.id, {
                        event_id: eventId,
                        limit: 200,
                    }),
                ]);

                if (!active) {
                    return;
                }

                setEvent(eventData);
                setBets(betData.data);
                setFinalStatus(
                    eventData.status === 'finished' ||
                        eventData.status === 'cancelled'
                        ? eventData.status
                        : '',
                );
                setBetResults(
                    Object.fromEntries(
                        betData.data.map((bet) => [
                            bet.id,
                            bet.result === 'pending' ? '' : bet.result,
                        ]),
                    ),
                );
            } catch (error) {
                if (active) {
                    Alert.alert(
                        'No se pudo cargar el historial',
                        error instanceof Error
                            ? error.message
                            : 'Intenta de nuevo.',
                    );
                    router.back();
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        void loadDetail();

        return () => {
            active = false;
        };
    }, [eventId, user]);

    const canEdit = event?.status === 'scheduled';

    const selectedCount = useMemo(() => {
        return Object.values(betResults).filter(Boolean).length;
    }, [betResults]);

    const handleConclude = async () => {
        if (!user || !event || !eventId) {
            return;
        }

        if (!canEdit) {
            Alert.alert(
                'Evento cerrado',
                'Este historial ya no se puede modificar.',
            );
            return;
        }

        if (!finalStatus) {
            Alert.alert(
                'Falta el estado final',
                'Selecciona si terminó o fue cancelado.',
            );
            return;
        }

        if (selectedCount !== bets.length) {
            Alert.alert(
                'Faltan apuestas',
                'Debes decidir el estado de cada apuesta.',
            );
            return;
        }

        setSaving(true);

        try {
            await Promise.all(
                bets.map((bet) =>
                    services.bet.updateBet(bet.id, {
                        result: betResults[bet.id] as BetResult,
                    }),
                ),
            );

            await services.event.updateEvent(user.id, eventId, {
                status: finalStatus,
            });

            Alert.alert(
                'Historial guardado',
                'El evento y sus apuestas quedaron cerrados.',
            );
            router.replace('/history');
        } catch (error) {
            Alert.alert(
                'No se pudo concluir',
                error instanceof Error ? error.message : 'Intenta de nuevo.',
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#101828" />
                    <Text style={styles.loadingText}>
                        Cargando historial...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!event) {
        return null;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen
                options={{
                    title: 'Detalle del evento',
                    headerShown: true,
                }}
            />
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.headerCard}>
                    <Text style={styles.title}>Detalle del evento</Text>
                    <Text style={styles.subtitle}>
                        {event.league.name} · {event.sport.name}
                    </Text>

                    <Text style={styles.eventTeams}>
                        {event.home_team?.name ?? 'Local'} vs{' '}
                        {event.away_team?.name ?? 'Visitante'}
                    </Text>

                    <Text style={styles.eventMeta}>
                        {new Date(event.starts_at).toLocaleString()}
                    </Text>

                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Estado actual</Text>
                        <Text
                            style={[
                                styles.statusBadge,
                                statusStyle(event.status),
                            ]}
                        >
                            {event.status}
                        </Text>
                    </View>
                </View>

                {canEdit ? (
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Cerrar evento</Text>
                        <Text style={styles.sectionSubtitle}>
                            Primero selecciona si el evento terminó o fue
                            cancelado. Luego marca el resultado de cada apuesta.
                        </Text>

                        <View style={styles.choiceRow}>
                            <Pressable
                                style={[
                                    styles.choiceButton,
                                    finalStatus === 'finished' &&
                                        styles.choiceButtonActive,
                                ]}
                                onPress={() => setFinalStatus('finished')}
                            >
                                <Text
                                    style={[
                                        styles.choiceButtonText,
                                        finalStatus === 'finished' &&
                                            styles.choiceButtonTextActive,
                                    ]}
                                >
                                    Terminó
                                </Text>
                            </Pressable>

                            <Pressable
                                style={[
                                    styles.choiceButton,
                                    finalStatus === 'cancelled' &&
                                        styles.choiceButtonActive,
                                ]}
                                onPress={() => setFinalStatus('cancelled')}
                            >
                                <Text
                                    style={[
                                        styles.choiceButtonText,
                                        finalStatus === 'cancelled' &&
                                            styles.choiceButtonTextActive,
                                    ]}
                                >
                                    Cancelado
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                ) : null}

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Apuestas</Text>
                    <Text style={styles.sectionSubtitle}>
                        {canEdit
                            ? 'Selecciona ganada o perdida para cada apuesta antes de concluir.'
                            : 'Este evento ya está cerrado. La información queda solo en vista.'}
                    </Text>

                    {bets.length > 0 ? (
                        bets.map((bet) => {
                            const selected = betResults[bet.id];
                            const locked = !canEdit;

                            return (
                                <View key={bet.id} style={styles.betCard}>
                                    <Text style={styles.betTitle}>
                                        {bet.market?.name ?? 'Mercado'} ·{' '}
                                        {bet.selection?.name ?? 'Selección'}
                                    </Text>
                                    <Text style={styles.betMeta}>
                                        Cuota {bet.odds} · Stake {bet.stake}
                                    </Text>

                                    <View style={styles.choiceRow}>
                                        <Pressable
                                            style={[
                                                styles.choiceButton,
                                                selected === 'won' &&
                                                    styles.choiceButtonWon,
                                                locked &&
                                                    styles.choiceButtonLocked,
                                            ]}
                                            disabled={locked}
                                            onPress={() =>
                                                setBetResults((current) => ({
                                                    ...current,
                                                    [bet.id]: 'won',
                                                }))
                                            }
                                        >
                                            <Text
                                                style={[
                                                    styles.choiceButtonText,
                                                    selected === 'won' &&
                                                        styles.choiceButtonTextWon,
                                                ]}
                                            >
                                                Ganó
                                            </Text>
                                        </Pressable>

                                        <Pressable
                                            style={[
                                                styles.choiceButton,
                                                selected === 'lost' &&
                                                    styles.choiceButtonLost,
                                                locked &&
                                                    styles.choiceButtonLocked,
                                            ]}
                                            disabled={locked}
                                            onPress={() =>
                                                setBetResults((current) => ({
                                                    ...current,
                                                    [bet.id]: 'lost',
                                                }))
                                            }
                                        >
                                            <Text
                                                style={[
                                                    styles.choiceButtonText,
                                                    selected === 'lost' &&
                                                        styles.choiceButtonTextLost,
                                                ]}
                                            >
                                                Perdió
                                            </Text>
                                        </Pressable>
                                    </View>

                                    {!canEdit ? (
                                        <Text style={styles.resultText}>
                                            Resultado guardado: {bet.result}
                                            {bet.profit !== null
                                                ? ` · Profit ${bet.profit}`
                                                : ''}
                                        </Text>
                                    ) : null}
                                </View>
                            );
                        })
                    ) : (
                        <Text style={styles.sectionSubtitle}>
                            No hay apuestas asociadas a este evento.
                        </Text>
                    )}
                </View>

                {canEdit ? (
                    <Pressable
                        style={({ pressed }) => [
                            styles.concludeButton,
                            pressed && styles.concludeButtonPressed,
                            saving && styles.concludeButtonDisabled,
                        ]}
                        disabled={saving}
                        onPress={handleConclude}
                    >
                        {saving ? (
                            <ActivityIndicator color="#F5F7FA" />
                        ) : (
                            <Text style={styles.concludeButtonText}>
                                Concluir
                            </Text>
                        )}
                    </Pressable>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}

function statusStyle(status: EventWithTeams['status']) {
    if (status === 'scheduled') return styles.statusScheduled;
    if (status === 'finished') return styles.statusFinished;
    if (status === 'cancelled') return styles.statusCancelled;
    return styles.statusLive;
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F3F5F9',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        color: '#344054',
        fontSize: 15,
        fontWeight: '600',
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
    sectionCard: {
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
        fontSize: 30,
        fontWeight: '800',
    },
    subtitle: {
        color: '#5B6472',
        fontSize: 15,
        lineHeight: 22,
    },
    eventTeams: {
        color: '#101828',
        fontSize: 20,
        fontWeight: '800',
    },
    eventMeta: {
        color: '#667085',
        fontSize: 13,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    statusLabel: {
        color: '#344054',
        fontSize: 14,
        fontWeight: '700',
    },
    statusBadge: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        overflow: 'hidden',
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
    sectionTitle: {
        color: '#101828',
        fontSize: 20,
        fontWeight: '800',
    },
    sectionSubtitle: {
        color: '#5B6472',
        fontSize: 14,
        lineHeight: 20,
    },
    choiceRow: {
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
    },
    choiceButton: {
        backgroundColor: '#F8FAFC',
        borderColor: '#D0D5DD',
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    choiceButtonActive: {
        backgroundColor: '#101828',
        borderColor: '#101828',
    },
    choiceButtonWon: {
        backgroundColor: '#D1FADF',
        borderColor: '#12B76A',
    },
    choiceButtonLost: {
        backgroundColor: '#FEE4E2',
        borderColor: '#F04438',
    },
    choiceButtonLocked: {
        opacity: 0.55,
    },
    choiceButtonText: {
        color: '#344054',
        fontSize: 14,
        fontWeight: '700',
    },
    choiceButtonTextActive: {
        color: '#F5F7FA',
    },
    choiceButtonTextWon: {
        color: '#027A48',
    },
    choiceButtonTextLost: {
        color: '#B42318',
    },
    betCard: {
        backgroundColor: '#F8FAFC',
        borderColor: '#EAECF0',
        borderRadius: 18,
        borderWidth: 1,
        gap: 10,
        padding: 16,
    },
    betTitle: {
        color: '#101828',
        fontSize: 15,
        fontWeight: '800',
    },
    betMeta: {
        color: '#667085',
        fontSize: 13,
    },
    resultText: {
        color: '#667085',
        fontSize: 13,
    },
    concludeButton: {
        alignItems: 'center',
        backgroundColor: '#101828',
        borderRadius: 14,
        justifyContent: 'center',
        minHeight: 52,
        paddingHorizontal: 16,
    },
    concludeButtonPressed: {
        opacity: 0.9,
    },
    concludeButtonDisabled: {
        opacity: 0.7,
    },
    concludeButtonText: {
        color: '#F5F7FA',
        fontSize: 16,
        fontWeight: '700',
    },
});
