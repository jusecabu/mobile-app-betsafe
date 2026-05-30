// src/features/bets/constants/bet-metadata.ts

import { z } from 'zod';

export const PERIOD_OPTIONS = ['first_half', 'second_half'] as const;

export const TEAM_SCOPE_OPTIONS = ['home_team', 'away_team'] as const;

export type FieldType = 'number' | 'select';

export interface MetadataField {
    key: string;
    label: string;
    type: FieldType;
    required: boolean;
    options?: readonly string[];
    description?: string;
}

export interface MetadataDefinition {
    fields: readonly MetadataField[];
    schema: z.ZodType;
}

export const BET_METADATA = {
    MATCH_RESULT: {
        winner: {
            fields: [],
            schema: z.object({}),
        },
    },

    PERIOD_RESULT: {
        winner: {
            fields: [
                {
                    key: 'period',
                    label: 'Periodo',
                    type: 'select',
                    required: true,
                    options: PERIOD_OPTIONS,
                },
            ],

            schema: z.object({
                period: z.enum(PERIOD_OPTIONS),
            }),
        },
    },

    OVER_UNDER: {
        goals: createLineDefinition(),
        corners: createLineDefinition(),
        cards: createLineDefinition(),
        shots: createLineDefinition(),
        shots_on_target: createLineDefinition(),
        fouls: createLineDefinition(),
    },

    HANDICAP: {
        goals: {
            fields: [
                {
                    key: 'handicap',
                    label: 'Handicap',
                    type: 'number',
                    required: true,
                },
            ],

            schema: z.object({
                handicap: z.number(),
            }),
        },
    },

    TEAM_PROP: {
        goals: createTeamLineDefinition(),
        corners: createTeamLineDefinition(),
        cards: createTeamLineDefinition(),
        shots: createTeamLineDefinition(),
        shots_on_target: createTeamLineDefinition(),
        fouls: createTeamLineDefinition(),
    },

    BOTH_TEAMS_SCORE: {
        goals: {
            fields: [],
            schema: z.object({}),
        },
    },

    CORRECT_SCORE: {
        goals: {
            fields: [
                {
                    key: 'home_score',
                    label: 'Goles Local',
                    type: 'number',
                    required: true,
                },
                {
                    key: 'away_score',
                    label: 'Goles Visitante',
                    type: 'number',
                    required: true,
                },
            ],

            schema: z.object({
                home_score: z.number().int().min(0),
                away_score: z.number().int().min(0),
            }),
        },
    },
} as const;

export function getMetadataDefinition(
    categoryCode?: string,
    marketCode?: string,
) {
    if (!categoryCode || !marketCode) {
        return null;
    }

    const categoryEntry = (
        BET_METADATA as unknown as Record<
            string,
            Record<string, MetadataDefinition>
        >
    )[categoryCode];
    if (!categoryEntry) {
        return null;
    }

    return categoryEntry[marketCode] ?? null;
}

function createLineDefinition(): MetadataDefinition {
    return {
        fields: [
            {
                key: 'line',
                label: 'Línea',
                type: 'number',
                required: true,
            },
        ],

        schema: z.object({
            line: z.number().positive(),
        }),
    };
}

function createTeamLineDefinition(): MetadataDefinition {
    return {
        fields: [
            {
                key: 'scope',
                label: 'Equipo',
                type: 'select',
                required: true,
                options: TEAM_SCOPE_OPTIONS,
            },
            {
                key: 'line',
                label: 'Línea',
                type: 'number',
                required: true,
            },
        ],

        schema: z.object({
            scope: z.enum(TEAM_SCOPE_OPTIONS),
            line: z.number().positive(),
        }),
    };
}
