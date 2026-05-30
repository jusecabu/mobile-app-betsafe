// ============================================================
// catalog.repository.ts
// Repositorio unificado para todas las tablas de catálogo
// (solo lectura desde el cliente; escritura solo admin vía SQL).
// ============================================================

import {
    BetCategory,
    BetMarket,
    BetSelection,
    League,
    Sport,
    Team,
} from '@/lib/db_types';
import { handlePostgrestError } from '@/repositories/base_repository';
import { SupabaseClient } from '@supabase/supabase-js';

export class CatalogRepository {
    constructor(private readonly db: SupabaseClient) {}

    // ── Sports ─────────────────────────────────────────────────

    async getSports(): Promise<Sport[]> {
        const { data, error } = await this.db
            .from('sports')
            .select('*')
            .order('name');

        if (error) handlePostgrestError(error);
        return data ?? [];
    }

    async getSportByCode(code: string): Promise<Sport | null> {
        const { data, error } = await this.db
            .from('sports')
            .select('*')
            .eq('code', code)
            .maybeSingle();

        if (error) handlePostgrestError(error);
        return data;
    }

    // ── Leagues ────────────────────────────────────────────────

    async getLeagues(sportId?: string): Promise<League[]> {
        let query = this.db.from('leagues').select('*').order('name');
        if (sportId) query = query.eq('sport_id', sportId);

        const { data, error } = await query;
        if (error) handlePostgrestError(error);
        return data ?? [];
    }

    async getLeagueById(id: string): Promise<League | null> {
        const { data, error } = await this.db
            .from('leagues')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) handlePostgrestError(error);
        return data;
    }

    // ── Teams ──────────────────────────────────────────────────

    async getTeams(leagueId?: string): Promise<Team[]> {
        let query = this.db.from('teams').select('*').order('name');
        if (leagueId) query = query.eq('league_id', leagueId);

        const { data, error } = await query;
        if (error) handlePostgrestError(error);
        return data ?? [];
    }

    async searchTeams(name: string): Promise<Team[]> {
        const { data, error } = await this.db
            .from('teams')
            .select('*')
            .ilike('name', `%${name}%`)
            .order('name')
            .limit(20);

        if (error) handlePostgrestError(error);
        return data ?? [];
    }

    // ── Bet categories ─────────────────────────────────────────

    async getCategories(sportId?: string): Promise<BetCategory[]> {
        let query = this.db.from('bet_categories').select('*').order('name');

        if (sportId) {
            query = query.or(`sport_id.is.null,sport_id.eq.${sportId}`);
        }

        const { data, error } = await query;

        if (error) handlePostgrestError(error);
        return data ?? [];
    }

    // ── Bet markets ────────────────────────────────────────────

    async getMarkets(categoryId?: string): Promise<BetMarket[]> {
        if (!categoryId) {
            const { data, error } = await this.db
                .from('bet_markets')
                .select('*')
                .order('name');

            if (error) handlePostgrestError(error);
            return data ?? [];
        }

        const { data: linkRows, error: linkError } = await this.db
            .from('category_markets')
            .select('market_id')
            .eq('category_id', categoryId);

        if (linkError) handlePostgrestError(linkError);

        const marketIds = [
            ...new Set((linkRows ?? []).map((row) => row.market_id)),
        ];
        if (marketIds.length === 0) return [];

        const { data, error } = await this.db
            .from('bet_markets')
            .select('*')
            .in('id', marketIds)
            .order('name');

        if (error) handlePostgrestError(error);
        return data ?? [];
    }

    async getCategoryMarketId(
        categoryId: string,
        marketId: string,
    ): Promise<string | null> {
        const { data, error } = await this.db
            .from('category_markets')
            .select('id')
            .eq('category_id', categoryId)
            .eq('market_id', marketId)
            .maybeSingle();

        if (error) handlePostgrestError(error);
        return data?.id ?? null;
    }

    // ── Bet selections ─────────────────────────────────────────

    async getSelections(categoryMarketId?: string): Promise<BetSelection[]> {
        if (!categoryMarketId) {
            const { data, error } = await this.db
                .from('bet_selections')
                .select('*')
                .order('name');

            if (error) handlePostgrestError(error);
            return data ?? [];
        }

        const { data: linkRows, error: linkError } = await this.db
            .from('category_market_selections')
            .select('selection_id')
            .eq('category_market_id', categoryMarketId);

        if (linkError) handlePostgrestError(linkError);

        const selectionIds = [
            ...new Set((linkRows ?? []).map((row) => row.selection_id)),
        ];
        if (selectionIds.length === 0) return [];

        const { data, error } = await this.db
            .from('bet_selections')
            .select('*')
            .in('id', selectionIds)
            .order('name');

        if (error) handlePostgrestError(error);
        return data ?? [];
    }
}
