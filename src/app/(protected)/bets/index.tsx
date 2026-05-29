import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { services } from '@/lib/container';
import { EventWithTeams } from '@/lib/db_types';
import { useAuthStore } from '@/store/auth_store';

export default function BetsScreen() {
    const user = useAuthStore((state) => state.user);
    const [recentEvents, setRecentEvents] = useState<EventWithTeams[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        const loadEvents = async () => {
            if (!user) {
                setRecentEvents([]);
                setLoading(false);
                return;
            }

            try {
                const events = await services.event.getEvents(user.id, {
                    status: 'scheduled',
                });

                if (active) {
                    setRecentEvents(events.slice(0, 5));
                }
            } catch {
                if (active) {
                    setRecentEvents([]);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        void loadEvents();

        return () => {
            active = false;
        };
    }, [user]);

    const handleUseEvent = (eventId: string) => {
        router.push({
            pathname: '/bets/create',
            params: { eventId },
        });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.title}>Apuestas</Text>
                    <Text style={styles.subtitle}>
                        Sección simple para revisar y crear apuestas del
                        prototipo.
                    </Text>

                    <Pressable
                        style={styles.button}
                        onPress={() => router.push('/bets/create')}
                    >
                        <Text style={styles.buttonText}>Nueva apuesta</Text>
                    </Pressable>
                </View>

                <View style={styles.recentCard}>
                    <Text style={styles.sectionTitle}>Recientes</Text>
                    <Text style={styles.sectionSubtitle}>
                        Toca un evento para abrir la creación con liga y equipos
                        bloqueados.
                    </Text>

                    {loading ? (
                        <Text style={styles.emptyText}>
                            Cargando eventos...
                        </Text>
                    ) : recentEvents.length > 0 ? (
                        recentEvents.map((event) => (
                            <Pressable
                                key={event.id}
                                style={styles.eventCard}
                                onPress={() => handleUseEvent(event.id)}
                            >
                                <Text style={styles.eventLeague}>
                                    {event.league.name}
                                </Text>
                                <Text style={styles.eventTeams}>
                                    {event.home_team?.name ?? 'Local'} vs{' '}
                                    {event.away_team?.name ?? 'Visitante'}
                                </Text>
                                <Text style={styles.eventMeta}>
                                    {new Date(event.starts_at).toLocaleString()}
                                </Text>
                            </Pressable>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>
                            No hay eventos recientes todavía.
                        </Text>
                    )}
                </View>
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
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        gap: 16,
        shadowColor: '#101828',
        shadowOffset: {
            width: 0,
            height: 12,
        },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 4,
    },
    recentCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        gap: 12,
        shadowColor: '#101828',
        shadowOffset: {
            width: 0,
            height: 12,
        },
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
    button: {
        alignItems: 'center',
        backgroundColor: '#101828',
        borderRadius: 14,
        justifyContent: 'center',
        minHeight: 52,
        paddingHorizontal: 16,
    },
    buttonText: {
        color: '#F5F7FA',
        fontSize: 16,
        fontWeight: '700',
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
    emptyText: {
        color: '#667085',
        fontSize: 14,
    },
    eventCard: {
        backgroundColor: '#F8FAFC',
        borderColor: '#EAECF0',
        borderRadius: 18,
        borderWidth: 1,
        gap: 6,
        padding: 16,
    },
    eventLeague: {
        color: '#101828',
        fontSize: 15,
        fontWeight: '700',
    },
    eventTeams: {
        color: '#344054',
        fontSize: 14,
        fontWeight: '600',
    },
    eventMeta: {
        color: '#667085',
        fontSize: 12,
    },
});
