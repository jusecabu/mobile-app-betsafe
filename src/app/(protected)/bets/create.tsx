import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getMetadataDefinition } from '@/constants/bet_metadata';
import { services } from '@/lib/container';
import {
    BetCategory,
    BetMarket,
    BetSelection,
    EventWithTeams,
    League,
    Team,
} from '@/lib/db_types';
import { useAuthStore } from '@/store/auth_store';

type ChoiceGridProps<T extends { id: string }> = {
    title: string;
    description?: string;
    items: T[];
    selectedId: string;
    onSelect: (item: T) => void;
    renderTitle: (item: T) => string;
    renderSubtitle?: (item: T) => string | undefined;
    disabled?: boolean;
    emptyLabel?: string;
};

export default function CreateBetScreen() {
    const user = useAuthStore((state) => state.user);
    const params = useLocalSearchParams<{ eventId?: string | string[] }>();

    const eventIdParam = Array.isArray(params.eventId)
        ? params.eventId[0]
        : params.eventId;

    const [loadingInitial, setLoadingInitial] = useState(true);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [loadingMarkets, setLoadingMarkets] = useState(false);
    const [loadingSelections, setLoadingSelections] = useState(false);
    const [saving, setSaving] = useState(false);

    const [categories, setCategories] = useState<BetCategory[]>([]);
    const [markets, setMarkets] = useState<BetMarket[]>([]);
    const [selections, setSelections] = useState<BetSelection[]>([]);
    const [leagues, setLeagues] = useState<League[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [recentEvents, setRecentEvents] = useState<EventWithTeams[]>([]);

    const [selectedEvent, setSelectedEvent] = useState<EventWithTeams | null>(
        null,
    );
    const [selectedSportId, setSelectedSportId] = useState('');
    const [selectedLeagueId, setSelectedLeagueId] = useState('');
    const [selectedHomeTeamId, setSelectedHomeTeamId] = useState('');
    const [selectedAwayTeamId, setSelectedAwayTeamId] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedMarketId, setSelectedMarketId] = useState('');
    const [selectedCategoryMarketId, setSelectedCategoryMarketId] =
        useState('');
    const [selectedSelectionId, setSelectedSelectionId] = useState('');
    const [odds, setOdds] = useState('');
    const [stake, setStake] = useState('');
    const [bookmaker, setBookmaker] = useState('');
    const [metadataValues, setMetadataValues] = useState<
        Record<string, string>
    >({});
    const [loadingTeams, setLoadingTeams] = useState(false);

    const selectedCategory = categories.find(
        (item) => item.id === selectedCategoryId,
    );
    const selectedMarket = markets.find((item) => item.id === selectedMarketId);
    const metadataDefinition = getMetadataDefinition(
        selectedCategory?.code,
        selectedMarket?.code,
    );

    const updateMetadataValue = (key: string, value: string) => {
        setMetadataValues((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const readMetadataValue = (key: string) => metadataValues[key] ?? '';

    const buildMetadataObject = () => {
        if (!metadataDefinition) {
            return {};
        }

        const rawMetadata: Record<string, unknown> = {};

        metadataDefinition.fields.forEach((field) => {
            const value = readMetadataValue(field.key).trim();

            if (!value) {
                if (field.required) {
                    throw new Error(`El campo ${field.label} es requerido`);
                }
                return;
            }

            if (field.type === 'number') {
                const parsed = Number(value);
                if (!Number.isFinite(parsed)) {
                    throw new Error(
                        `El campo ${field.label} debe ser numérico`,
                    );
                }
                rawMetadata[field.key] = parsed;
                return;
            }

            if (field.type === 'select' && field.options?.length) {
                if (!field.options.includes(value)) {
                    throw new Error(`El valor de ${field.label} no es válido`);
                }
            }

            rawMetadata[field.key] = value;
        });

        return metadataDefinition.schema.parse(rawMetadata) as Record<
            string,
            unknown
        >;
    };

    const clearEventSelection = () => {
        setSelectedEvent(null);
        setSelectedSportId('');
        setSelectedLeagueId('');
        setSelectedHomeTeamId('');
        setSelectedAwayTeamId('');
        setTeams([]);
    };

    const clearDependentCatalogSelection = () => {
        setSelectedCategoryId('');
        setSelectedMarketId('');
        setSelectedCategoryMarketId('');
        setSelectedSelectionId('');
        setMarkets([]);
        setSelections([]);
        setMetadataValues({});
    };

    const applySelectedEvent = (event: EventWithTeams) => {
        setSelectedEvent(event);
        setSelectedSportId(event.sport_id);
        setSelectedLeagueId(event.league_id);
        setSelectedHomeTeamId(event.home_team_id ?? '');
        setSelectedAwayTeamId(event.away_team_id ?? '');
        setTeams([]);
    };

    useEffect(() => {
        let active = true;

        const loadInitialData = async () => {
            if (!user) {
                if (active) {
                    setLoadingInitial(false);
                }
                return;
            }

            try {
                const [leagueList, eventList] = await Promise.all([
                    services.catalog.getLeagues(),
                    services.event.getEvents(user.id, { status: 'scheduled' }),
                ]);

                if (!active) {
                    return;
                }

                setLeagues(leagueList);
                setRecentEvents(eventList.slice(0, 5));

                if (eventIdParam) {
                    const selected = await services.event.getEvent(
                        user.id,
                        eventIdParam,
                    );
                    if (!active) {
                        return;
                    }

                    applySelectedEvent(selected);
                }
            } catch (error) {
                if (active) {
                    Alert.alert(
                        'No se pudieron cargar los datos',
                        error instanceof Error
                            ? error.message
                            : 'Intenta de nuevo.',
                    );
                }
            } finally {
                if (active) {
                    setLoadingInitial(false);
                }
            }
        };

        void loadInitialData();

        return () => {
            active = false;
        };
    }, [eventIdParam, user]);

    useEffect(() => {
        let active = true;

        const loadCategories = async () => {
            if (!selectedSportId) {
                setCategories([]);
                clearDependentCatalogSelection();
                setLoadingCategories(false);
                return;
            }

            setLoadingCategories(true);
            clearDependentCatalogSelection();

            try {
                const data =
                    await services.catalog.getCategories(selectedSportId);

                if (active) {
                    setCategories(data);
                }
            } catch {
                if (active) {
                    setCategories([]);
                }
            } finally {
                if (active) {
                    setLoadingCategories(false);
                }
            }
        };

        void loadCategories();

        return () => {
            active = false;
        };
    }, [selectedSportId]);

    useEffect(() => {
        let active = true;

        const loadMarkets = async () => {
            if (!selectedCategoryId) {
                setMarkets([]);
                setSelectedMarketId('');
                setSelectedCategoryMarketId('');
                setSelections([]);
                setSelectedSelectionId('');
                setLoadingMarkets(false);
                return;
            }

            setLoadingMarkets(true);
            setSelectedMarketId('');
            setSelectedCategoryMarketId('');
            setSelections([]);
            setSelectedSelectionId('');

            try {
                const data =
                    await services.catalog.getMarkets(selectedCategoryId);

                if (active) {
                    setMarkets(data);
                }
            } catch {
                if (active) {
                    setMarkets([]);
                }
            } finally {
                if (active) {
                    setLoadingMarkets(false);
                }
            }
        };

        void loadMarkets();

        return () => {
            active = false;
        };
    }, [selectedCategoryId]);

    useEffect(() => {
        let active = true;

        const loadSelections = async () => {
            if (!selectedMarketId) {
                setSelections([]);
                setSelectedSelectionId('');
                setMetadataValues({});
                setSelectedCategoryMarketId('');
                setLoadingSelections(false);
                return;
            }

            setLoadingSelections(true);
            setSelectedSelectionId('');
            setMetadataValues({});

            try {
                const categoryMarketId =
                    await services.catalog.getCategoryMarketId(
                        selectedCategoryId,
                        selectedMarketId,
                    );

                if (!active) {
                    return;
                }

                setSelectedCategoryMarketId(categoryMarketId ?? '');

                const data = await services.catalog.getSelections(
                    categoryMarketId ?? undefined,
                );

                if (active) {
                    setSelections(data);
                }
            } catch {
                if (active) {
                    setSelections([]);
                    setSelectedCategoryMarketId('');
                }
            } finally {
                if (active) {
                    setLoadingSelections(false);
                }
            }
        };

        void loadSelections();

        return () => {
            active = false;
        };
    }, [selectedCategoryId, selectedMarketId]);

    useEffect(() => {
        let active = true;

        const loadTeams = async () => {
            if (!selectedLeagueId || selectedEvent) {
                setTeams([]);
                return;
            }

            setLoadingTeams(true);

            try {
                const leagueTeams =
                    await services.catalog.getTeams(selectedLeagueId);

                if (active) {
                    setTeams(leagueTeams);
                }
            } catch {
                if (active) {
                    setTeams([]);
                }
            } finally {
                if (active) {
                    setLoadingTeams(false);
                }
            }
        };

        void loadTeams();

        return () => {
            active = false;
        };
    }, [selectedLeagueId, selectedEvent]);

    const handleLeagueSelect = (league: League) => {
        clearEventSelection();
        clearDependentCatalogSelection();
        setSelectedLeagueId(league.id);
        setSelectedSportId(league.sport_id);
    };

    const handleCreate = async () => {
        if (!user) {
            Alert.alert('Sesión requerida', 'Necesitas iniciar sesión.');
            return;
        }

        const parsedOdds = Number(odds);
        const parsedStake = Number(stake);

        if (!selectedCategoryId || !selectedMarketId || !selectedSelectionId) {
            Alert.alert(
                'Faltan datos',
                'Selecciona categoría, mercado y selección.',
            );
            return;
        }

        if (!Number.isFinite(parsedOdds) || !Number.isFinite(parsedStake)) {
            Alert.alert('Datos inválidos', 'Cuota y stake deben ser números.');
            return;
        }

        setSaving(true);

        try {
            let parsedMetadata: Record<string, unknown> = {};

            try {
                parsedMetadata = buildMetadataObject();
            } catch (error) {
                Alert.alert(
                    'Metadatos inválidos',
                    error instanceof Error
                        ? error.message
                        : 'Revisa los campos de metadatos.',
                );
                return;
            }

            let eventId = selectedEvent?.id ?? '';

            if (!eventId) {
                if (
                    !selectedLeagueId ||
                    !selectedSportId ||
                    !selectedHomeTeamId ||
                    !selectedAwayTeamId
                ) {
                    Alert.alert(
                        'Falta el evento',
                        'Selecciona liga, equipo local y visitante.',
                    );
                    return;
                }

                const league = leagues.find(
                    (item) => item.id === selectedLeagueId,
                );
                if (!league) {
                    Alert.alert('Liga inválida', 'Selecciona una liga válida.');
                    return;
                }

                const createdEvent = await services.event.createEvent(user.id, {
                    sport_id: league.sport_id,
                    league_id: league.id,
                    home_team_id: selectedHomeTeamId,
                    away_team_id: selectedAwayTeamId,
                    status: 'scheduled',
                });

                eventId = createdEvent.id;
            }

            await services.bet.createBet(user.id, {
                event_id: eventId,
                category_id: selectedCategoryId,
                market_id: selectedMarketId,
                selection_id: selectedSelectionId,
                odds: parsedOdds,
                stake: parsedStake,
                result: 'pending',
                bookmaker: bookmaker.trim() || undefined,
                metadata: parsedMetadata,
            });

            Alert.alert(
                'Apuesta creada',
                'La apuesta y su evento quedaron registrados.',
            );
            router.replace('/bets');
        } catch (error) {
            Alert.alert(
                'No se pudo crear la apuesta',
                error instanceof Error ? error.message : 'Intenta de nuevo.',
            );
        } finally {
            setSaving(false);
        }
    };

    if (loadingInitial) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#101828" />
                    <Text style={styles.loadingText}>
                        Cargando datos de la apuesta...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.title}>Nueva apuesta</Text>
                    <Text style={styles.subtitle}>
                        Selecciona primero el evento o crea uno nuevo desde esta
                        pantalla.
                    </Text>

                    {selectedEvent ? (
                        <View style={styles.eventSummary}>
                            <Text style={styles.eventSummaryLabel}>
                                Evento seleccionado
                            </Text>
                            <Text style={styles.eventSummaryTitle}>
                                {selectedEvent.league.name}
                            </Text>
                            <Text style={styles.eventSummaryTeams}>
                                {selectedEvent.home_team?.name ?? 'Local'} vs{' '}
                                {selectedEvent.away_team?.name ?? 'Visitante'}
                            </Text>
                            <Text style={styles.eventSummaryMeta}>
                                ID: {selectedEvent.id}
                            </Text>
                            <Pressable
                                style={styles.secondaryButton}
                                onPress={clearEventSelection}
                            >
                                <Text style={styles.secondaryButtonText}>
                                    Usar otro evento
                                </Text>
                            </Pressable>
                        </View>
                    ) : null}
                </View>
                <ChoiceGrid
                    title="Liga"
                    description={
                        selectedEvent
                            ? 'Bloqueada porque el evento ya existe.'
                            : 'Selecciona la liga para crear el evento.'
                    }
                    items={leagues}
                    selectedId={selectedLeagueId}
                    onSelect={handleLeagueSelect}
                    renderTitle={(item) => item.name}
                    renderSubtitle={(item) => item.country ?? item.sport_id}
                    disabled={!!selectedEvent}
                    emptyLabel="No hay ligas disponibles."
                />

                <ChoiceGrid
                    title="Equipo local"
                    description={
                        selectedEvent
                            ? 'Bloqueado por el evento existente.'
                            : loadingTeams
                              ? 'Cargando equipos de la liga...'
                              : 'Selecciona el equipo local.'
                    }
                    items={teams}
                    selectedId={selectedHomeTeamId}
                    onSelect={(item) => setSelectedHomeTeamId(item.id)}
                    renderTitle={(item) => item.name}
                    renderSubtitle={(item) =>
                        item.short_name ?? item.country ?? undefined
                    }
                    disabled={
                        !!selectedEvent || loadingTeams || !selectedLeagueId
                    }
                    emptyLabel={
                        selectedLeagueId
                            ? 'No hay equipos para esta liga.'
                            : 'Primero selecciona una liga.'
                    }
                />

                <ChoiceGrid
                    title="Equipo visitante"
                    description={
                        selectedEvent
                            ? 'Bloqueado por el evento existente.'
                            : loadingTeams
                              ? 'Cargando equipos de la liga...'
                              : 'Selecciona el equipo visitante.'
                    }
                    items={teams}
                    selectedId={selectedAwayTeamId}
                    onSelect={(item) => setSelectedAwayTeamId(item.id)}
                    renderTitle={(item) => item.name}
                    renderSubtitle={(item) =>
                        item.short_name ?? item.country ?? undefined
                    }
                    disabled={
                        !!selectedEvent || loadingTeams || !selectedLeagueId
                    }
                    emptyLabel={
                        selectedLeagueId
                            ? 'No hay equipos para esta liga.'
                            : 'Primero selecciona una liga.'
                    }
                />

                <ChoiceGrid
                    title="Categoría"
                    description={
                        loadingCategories
                            ? 'Cargando categorías...'
                            : 'Clasificación principal de la apuesta.'
                    }
                    items={categories}
                    selectedId={selectedCategoryId}
                    onSelect={(item) => setSelectedCategoryId(item.id)}
                    renderTitle={(item) => item.name}
                    renderSubtitle={(item) => item.code}
                    disabled={!selectedSportId || loadingCategories}
                    emptyLabel={
                        !selectedSportId
                            ? 'Selecciona una liga para ver las categorías.'
                            : 'No hay categorías disponibles.'
                    }
                />

                <ChoiceGrid
                    title="Mercado"
                    description={
                        loadingMarkets
                            ? 'Cargando mercados...'
                            : 'Mercado sobre el que se apuesta.'
                    }
                    items={markets}
                    selectedId={selectedMarketId}
                    onSelect={(item) => setSelectedMarketId(item.id)}
                    renderTitle={(item) => item.name}
                    renderSubtitle={(item) => item.code}
                    disabled={!selectedCategoryId || loadingMarkets}
                    emptyLabel={
                        !selectedCategoryId
                            ? 'Selecciona una categoría para ver mercados.'
                            : 'No hay mercados disponibles.'
                    }
                />

                <ChoiceGrid
                    title="Selección"
                    description={
                        loadingSelections
                            ? 'Cargando selecciones...'
                            : 'Resultado o selección concreta.'
                    }
                    items={selections}
                    selectedId={selectedSelectionId}
                    onSelect={(item) => setSelectedSelectionId(item.id)}
                    renderTitle={(item) => item.name}
                    renderSubtitle={(item) => item.code}
                    disabled={!selectedMarketId || loadingSelections}
                    emptyLabel={
                        !selectedMarketId
                            ? 'Selecciona un mercado para ver selecciones.'
                            : 'No hay selecciones disponibles.'
                    }
                />

                <View style={styles.card}>
                    <View style={styles.field}>
                        <Text style={styles.label}>Cuota</Text>
                        <TextInput
                            keyboardType="decimal-pad"
                            placeholder="Ej. 1.85"
                            placeholderTextColor="#8A8F98"
                            style={styles.input}
                            value={odds}
                            onChangeText={setOdds}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Stake</Text>
                        <TextInput
                            keyboardType="decimal-pad"
                            placeholder="Ej. 10"
                            placeholderTextColor="#8A8F98"
                            style={styles.input}
                            value={stake}
                            onChangeText={setStake}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Bookmaker</Text>
                        <TextInput
                            autoCapitalize="words"
                            placeholder="Ej. Bet365"
                            placeholderTextColor="#8A8F98"
                            style={styles.input}
                            value={bookmaker}
                            onChangeText={setBookmaker}
                        />
                    </View>

                    {metadataDefinition ? (
                        <View style={styles.metadataGroup}>
                            <Text style={styles.label}>Metadatos</Text>
                            {metadataDefinition.fields.map((field) => (
                                <View
                                    key={`meta-${field.key}`}
                                    style={styles.field}
                                >
                                    <Text style={styles.subLabel}>
                                        {field.label}
                                        {field.required ? ' *' : ''}
                                    </Text>

                                    {field.type === 'select' &&
                                    field.options ? (
                                        <View style={styles.optionsRow}>
                                            {field.options.map((option) => {
                                                const selected =
                                                    readMetadataValue(
                                                        field.key,
                                                    ) === option;

                                                return (
                                                    <Pressable
                                                        key={`${field.key}-${option}`}
                                                        style={[
                                                            styles.optionChip,
                                                            selected &&
                                                                styles.optionChipSelected,
                                                        ]}
                                                        onPress={() =>
                                                            updateMetadataValue(
                                                                field.key,
                                                                option,
                                                            )
                                                        }
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.optionChipText,
                                                                selected &&
                                                                    styles.optionChipTextSelected,
                                                            ]}
                                                        >
                                                            {option}
                                                        </Text>
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    ) : (
                                        <TextInput
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            keyboardType={
                                                field.type === 'number'
                                                    ? 'decimal-pad'
                                                    : 'default'
                                            }
                                            placeholder={
                                                field.description ?? field.label
                                            }
                                            placeholderTextColor="#8A8F98"
                                            style={styles.input}
                                            value={readMetadataValue(field.key)}
                                            onChangeText={(value) =>
                                                updateMetadataValue(
                                                    field.key,
                                                    value,
                                                )
                                            }
                                        />
                                    )}
                                </View>
                            ))}
                        </View>
                    ) : null}

                    <Pressable
                        style={({ pressed }) => [
                            styles.button,
                            pressed && styles.buttonPressed,
                            saving && styles.buttonDisabled,
                        ]}
                        disabled={saving}
                        onPress={handleCreate}
                    >
                        {saving ? (
                            <ActivityIndicator color="#F5F7FA" />
                        ) : (
                            <Text style={styles.buttonText}>
                                Registrar apuesta
                            </Text>
                        )}
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function ChoiceGrid<T extends { id: string }>({
    title,
    description,
    items,
    selectedId,
    onSelect,
    renderTitle,
    renderSubtitle,
    disabled,
    emptyLabel,
}: ChoiceGridProps<T>) {
    return (
        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {description ? (
                <Text style={styles.sectionSubtitle}>{description}</Text>
            ) : null}

            {items.length > 0 ? (
                <View style={styles.chipsContainer}>
                    {items.map((item) => {
                        const isSelected = selectedId === item.id;

                        return (
                            <Pressable
                                key={item.id}
                                style={({ pressed }) => [
                                    styles.chip,
                                    isSelected && styles.chipSelected,
                                    pressed && styles.chipPressed,
                                    disabled && styles.chipDisabled,
                                ]}
                                disabled={disabled}
                                onPress={() => onSelect(item)}
                            >
                                <Text
                                    style={[
                                        styles.chipTitle,
                                        isSelected && styles.chipTitleSelected,
                                    ]}
                                >
                                    {renderTitle(item)}
                                </Text>
                                {renderSubtitle ? (
                                    <Text
                                        style={[
                                            styles.chipSubtitle,
                                            isSelected &&
                                                styles.chipSubtitleSelected,
                                        ]}
                                    >
                                        {renderSubtitle(item)}
                                    </Text>
                                ) : null}
                            </Pressable>
                        );
                    })}
                </View>
            ) : (
                <Text style={styles.emptyText}>
                    {emptyLabel ?? 'Sin opciones disponibles.'}
                </Text>
            )}
        </View>
    );
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
    sectionCard: {
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
    eventSummary: {
        backgroundColor: '#F8FAFC',
        borderColor: '#EAECF0',
        borderRadius: 18,
        borderWidth: 1,
        gap: 8,
        padding: 16,
    },
    eventSummaryLabel: {
        color: '#667085',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    eventSummaryTitle: {
        color: '#101828',
        fontSize: 18,
        fontWeight: '800',
    },
    eventSummaryTeams: {
        color: '#344054',
        fontSize: 14,
        fontWeight: '600',
    },
    eventSummaryMeta: {
        color: '#667085',
        fontSize: 12,
    },
    secondaryButton: {
        alignSelf: 'flex-start',
        borderColor: '#D0D5DD',
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    secondaryButtonText: {
        color: '#101828',
        fontSize: 14,
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
    helperText: {
        color: '#667085',
        fontSize: 12,
        lineHeight: 18,
    },
    metadataGroup: {
        gap: 12,
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    optionChip: {
        borderColor: '#D0D5DD',
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#F8FAFC',
    },
    optionChipSelected: {
        backgroundColor: '#101828',
        borderColor: '#101828',
    },
    optionChipText: {
        color: '#344054',
        fontSize: 13,
        fontWeight: '600',
    },
    optionChipTextSelected: {
        color: '#F5F7FA',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        backgroundColor: '#F8FAFC',
        borderColor: '#D0D5DD',
        borderRadius: 16,
        borderWidth: 1,
        minWidth: 120,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 4,
    },
    chipSelected: {
        backgroundColor: '#101828',
        borderColor: '#101828',
    },
    chipPressed: {
        opacity: 0.9,
    },
    chipDisabled: {
        opacity: 0.55,
    },
    chipTitle: {
        color: '#101828',
        fontSize: 14,
        fontWeight: '700',
    },
    chipTitleSelected: {
        color: '#F5F7FA',
    },
    chipSubtitle: {
        color: '#667085',
        fontSize: 12,
    },
    chipSubtitleSelected: {
        color: '#D0D5DD',
    },
    emptyText: {
        color: '#667085',
        fontSize: 14,
    },
    field: {
        gap: 8,
    },
    label: {
        color: '#344054',
        fontSize: 14,
        fontWeight: '600',
    },
    subLabel: {
        color: '#475467',
        fontSize: 13,
        fontWeight: '600',
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderColor: '#D0D5DD',
        borderRadius: 14,
        borderWidth: 1,
        color: '#101828',
        fontSize: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    textArea: {
        minHeight: 120,
        textAlignVertical: 'top',
    },
    button: {
        alignItems: 'center',
        backgroundColor: '#101828',
        borderRadius: 14,
        justifyContent: 'center',
        minHeight: 52,
        paddingHorizontal: 16,
    },
    buttonPressed: {
        opacity: 0.9,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#F5F7FA',
        fontSize: 16,
        fontWeight: '700',
    },
});
