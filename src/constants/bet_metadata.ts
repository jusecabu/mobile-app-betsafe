export type BetMetadataField = {
    key: string;
    label: string;
    description?: string;
    type: 'text' | 'number' | 'boolean';
};

export const MARKET_METADATA_FIELDS: Record<string, BetMetadataField[]> = {
    goals: [
        { key: 'line', label: 'Línea', type: 'number' },
        { key: 'period', label: 'Periodo', type: 'text' },
    ],
    corners: [{ key: 'line', label: 'Línea', type: 'number' }],
    cards: [{ key: 'line', label: 'Línea', type: 'number' }],
    shots: [{ key: 'line', label: 'Línea', type: 'number' }],
    rebounds: [{ key: 'line', label: 'Línea', type: 'number' }],
    assists: [{ key: 'line', label: 'Línea', type: 'number' }],
    points: [{ key: 'line', label: 'Línea', type: 'number' }],
    fouls: [{ key: 'line', label: 'Línea', type: 'number' }],
};

export const SELECTION_METADATA_FIELDS: Record<string, BetMetadataField[]> = {
    OVER: [{ key: 'handicap', label: 'Handicap', type: 'number' }],
    UNDER: [{ key: 'handicap', label: 'Handicap', type: 'number' }],
    HOME: [{ key: 'team', label: 'Equipo', type: 'text' }],
    AWAY: [{ key: 'team', label: 'Equipo', type: 'text' }],
    DRAW: [{ key: 'note', label: 'Nota', type: 'text' }],
    YES: [{ key: 'note', label: 'Nota', type: 'text' }],
    NO: [{ key: 'note', label: 'Nota', type: 'text' }],
};

export function getMetadataFieldHints(
    marketCode?: string,
    selectionCode?: string,
) {
    return {
        marketFields: marketCode
            ? (MARKET_METADATA_FIELDS[marketCode] ?? [])
            : [],
        selectionFields: selectionCode
            ? (SELECTION_METADATA_FIELDS[selectionCode] ?? [])
            : [],
    };
}
