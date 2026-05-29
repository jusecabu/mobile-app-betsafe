// ============================================================
// schemas.ts
// Schemas Zod para validación en servicios.
// Cada schema valida entradas del usuario (forms, API inputs).
// Los schemas de respuesta DB no son necesarios porque
// TypeScript + Supabase ya garantizan la forma.
// ============================================================

import { z } from 'zod';

// ── Primitivos reutilizables ─────────────────────────────────

const uuid = z.string().uuid('UUID inválido');
const isoDate = z.string().datetime({ message: 'Fecha ISO 8601 requerida' });

// ── Enums ────────────────────────────────────────────────────

export const EventStatusSchema = z.enum(
    ['scheduled', 'live', 'finished', 'cancelled'],
    { message: 'Estado de evento inválido' },
);

export const CreateEventSchema = z
    .object({
        sport_id: uuid,
        league_id: uuid,
        home_team_id: uuid,
        away_team_id: uuid,
        starts_at: isoDate.optional(),
        status: EventStatusSchema.default('scheduled'),
        external_id: z.string().nullable().optional(),
    })
    .refine((data) => data.home_team_id !== data.away_team_id, {
        message: 'El equipo local y visitante deben ser distintos',
        path: ['away_team_id'],
    });
export type CreateEventInput = z.infer<typeof CreateEventSchema>;

export const UpdateEventSchema = z.object({
    status: EventStatusSchema,
});
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;

export const BetResultSchema = z.enum(['pending', 'won', 'lost', 'void'], {
    message: 'Resultado inválido',
});

// ── Profile ──────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
    username: z
        .string()
        .min(3, 'Mínimo 3 caracteres')
        .max(30, 'Máximo 30 caracteres')
        .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guión bajo')
        .optional(),
    avatar_url: z.string().url('URL inválida').nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

// ── Bet — crear ──────────────────────────────────────────────

export const BetMetadataSchema = z.record(z.string(), z.unknown()).default({});

export const CreateBetSchema = z.object({
    event_id: uuid.nullable().optional(),
    category_id: uuid.nullable().optional(),
    market_id: uuid.nullable().optional(),
    selection_id: uuid.nullable().optional(),
    odds: z
        .number('La cuota debe ser un número')
        .positive('La cuota debe ser mayor a 0')
        .max(10000, 'Cuota demasiado alta'),
    stake: z
        .number('El stake debe ser un número')
        .positive('El stake debe ser mayor a 0')
        .max(1_000_000, 'Stake demasiado alto'),
    result: BetResultSchema.default('pending'),
    profit: z.number().nullable().optional(),
    bookmaker: z.string().max(100).nullable().optional(),
    metadata: BetMetadataSchema,
    placed_at: isoDate.optional(),
});
export type CreateBetInput = z.infer<typeof CreateBetSchema>;

// ── Bet — actualizar ─────────────────────────────────────────

export const UpdateBetSchema = z
    .object({
        event_id: uuid.nullable().optional(),
        category_id: uuid.nullable().optional(),
        market_id: uuid.nullable().optional(),
        selection_id: uuid.nullable().optional(),
        odds: z
            .number()
            .positive('La cuota debe ser mayor a 0')
            .max(10000)
            .optional(),
        stake: z
            .number()
            .positive('El stake debe ser mayor a 0')
            .max(1_000_000)
            .optional(),
        result: BetResultSchema.optional(),
        profit: z.number().nullable().optional(),
        bookmaker: z.string().max(100).nullable().optional(),
        metadata: BetMetadataSchema.optional(),
        placed_at: isoDate.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'Debes enviar al menos un campo para actualizar',
    });
export type UpdateBetInput = z.infer<typeof UpdateBetSchema>;

// ── Filtros de apuestas ──────────────────────────────────────

export const BetFiltersSchema = z
    .object({
        result: BetResultSchema.optional(),
        category_id: uuid.optional(),
        market_id: uuid.optional(),
        selection_id: uuid.optional(),
        event_id: uuid.optional(),
        bookmaker: z.string().optional(),
        odds_min: z.number().positive().optional(),
        odds_max: z.number().positive().optional(),
        from: isoDate.optional(),
        to: isoDate.optional(),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
    })
    .refine(
        (data) => {
            if (data.odds_min !== undefined && data.odds_max !== undefined) {
                return data.odds_min <= data.odds_max;
            }
            return true;
        },
        {
            message: 'odds_min debe ser menor o igual a odds_max',
            path: ['odds_min'],
        },
    );
export type BetFiltersInput = z.infer<typeof BetFiltersSchema>;

// ── Filtros de eventos ───────────────────────────────────────

export const EventFiltersSchema = z.object({
    profile_id: uuid.optional(),
    sport_id: uuid.optional(),
    league_id: uuid.optional(),
    status: EventStatusSchema.optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
});
export type EventFiltersInput = z.infer<typeof EventFiltersSchema>;

// ── Auth ─────────────────────────────────────────────────────

export const SignUpSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z
        .string()
        .min(8, 'Mínimo 8 caracteres')
        .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
        .regex(/[0-9]/, 'Debe contener al menos un número'),
    username: z
        .string()
        .min(3, 'Mínimo 3 caracteres')
        .max(30, 'Máximo 30 caracteres')
        .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guión bajo'),
});
export type SignUpInput = z.infer<typeof SignUpSchema>;

export const SignInSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Contraseña requerida'),
});
export type SignInInput = z.infer<typeof SignInSchema>;

export const ResetPasswordSchema = z.object({
    email: z.string().email('Email inválido'),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const UpdatePasswordSchema = z
    .object({
        password: z
            .string()
            .min(8, 'Mínimo 8 caracteres')
            .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
            .regex(/[0-9]/, 'Debe contener al menos un número'),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Las contraseñas no coinciden',
        path: ['confirmPassword'],
    });
export type UpdatePasswordInput = z.infer<typeof UpdatePasswordSchema>;
