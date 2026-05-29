// ============================================================
// bet.repository.ts
// ============================================================

import {
    Bet,
    BetFilters,
    BetWithRelations,
    InsertBet,
    UpdateBet,
} from '@/lib/db_types';
import { handlePostgrestError } from '@/repositories/base_repository';
import { SupabaseClient } from '@supabase/supabase-js';

// Columnas del join estándar para listados
const BET_WITH_RELATIONS = `
  *,
  event:events (
    *,
    sport:sports (*),
    league:leagues (*),
    home_team:teams!events_home_team_id_fkey (*),
    away_team:teams!events_away_team_id_fkey (*)
  ),
  category:bet_categories (*),
  market:bet_markets (*),
  selection:bet_selections (*)
` as const;

export class BetRepository {
    constructor(private readonly db: SupabaseClient) {}

    // ── Lectura ────────────────────────────────────────────────

    async findById(id: string): Promise<BetWithRelations | null> {
        const { data, error } = await this.db
            .from('bets')
            .select(BET_WITH_RELATIONS)
            .eq('id', id)
            .maybeSingle();

        if (error) handlePostgrestError(error);
        return data as BetWithRelations | null;
    }

    async findMany(
        profileId: string,
        filters: BetFilters = {},
    ): Promise<BetWithRelations[]> {
        let query = this.db
            .from('bets')
            .select(BET_WITH_RELATIONS)
            .eq('profile_id', profileId)
            .order('placed_at', { ascending: false });

        if (filters.result) query = query.eq('result', filters.result);
        if (filters.category_id)
            query = query.eq('category_id', filters.category_id);
        if (filters.market_id) query = query.eq('market_id', filters.market_id);
        if (filters.selection_id)
            query = query.eq('selection_id', filters.selection_id);
        if (filters.event_id) query = query.eq('event_id', filters.event_id);
        if (filters.bookmaker) query = query.eq('bookmaker', filters.bookmaker);
        if (filters.odds_min !== undefined)
            query = query.gte('odds', filters.odds_min);
        if (filters.odds_max !== undefined)
            query = query.lte('odds', filters.odds_max);
        if (filters.from) query = query.gte('placed_at', filters.from);
        if (filters.to) query = query.lte('placed_at', filters.to);

        query = query.range(
            filters.offset ?? 0,
            (filters.offset ?? 0) + (filters.limit ?? 50) - 1,
        );

        const { data, error } = await query;
        if (error) handlePostgrestError(error);
        return (data ?? []) as BetWithRelations[];
    }

    async findPending(profileId: string): Promise<Bet[]> {
        const { data, error } = await this.db
            .from('bets')
            .select('*')
            .eq('profile_id', profileId)
            .eq('result', 'pending')
            .order('placed_at', { ascending: false });

        if (error) handlePostgrestError(error);
        return data ?? [];
    }

    async count(profileId: string, filters: BetFilters = {}): Promise<number> {
        let query = this.db
            .from('bets')
            .select('id', { count: 'exact', head: true })
            .eq('profile_id', profileId);

        if (filters.result) query = query.eq('result', filters.result);
        if (filters.from) query = query.gte('placed_at', filters.from);
        if (filters.to) query = query.lte('placed_at', filters.to);

        const { count, error } = await query;
        if (error) handlePostgrestError(error);
        return count ?? 0;
    }

    // ── Escritura ──────────────────────────────────────────────

    async create(payload: InsertBet): Promise<Bet> {
        const { data, error } = await this.db
            .from('bets')
            .insert(payload)
            .select()
            .single();

        if (error) handlePostgrestError(error);
        return data;
    }

    async update(id: string, payload: UpdateBet): Promise<Bet> {
        const { data, error } = await this.db
            .from('bets')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) handlePostgrestError(error);
        return data;
    }

    async delete(id: string): Promise<void> {
        const { error } = await this.db.from('bets').delete().eq('id', id);

        if (error) handlePostgrestError(error);
    }

    // ── Bulk resolve (actualizar resultado de varias apuestas) ─

    async bulkUpdateResult(
        ids: string[],
        result: Bet['result'],
        profit?: number,
    ): Promise<void> {
        const { error } = await this.db
            .from('bets')
            .update({ result, ...(profit !== undefined ? { profit } : {}) })
            .in('id', ids);

        if (error) handlePostgrestError(error);
    }
}
