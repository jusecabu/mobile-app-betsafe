// ============================================================
// analytics.repository.ts
// Consulta las vistas analíticas del schema.
// RLS hereda de la tabla bets — solo devuelve datos del usuario autenticado.
// ============================================================

import {
    PerformanceByCategory,
    PerformanceByLeague,
    PerformanceByMarket,
    PerformanceByOddsRange,
    UserPerformance,
} from '@/lib/db_types';
import { handlePostgrestError } from '@/repositories/base_repository';
import { SupabaseClient } from '@supabase/supabase-js';

export class AnalyticsRepository {
    constructor(private readonly db: SupabaseClient) {}

    async getUserPerformance(
        profileId: string,
    ): Promise<UserPerformance | null> {
        const { data, error } = await this.db
            .from('v_user_performance')
            .select('*')
            .eq('profile_id', profileId)
            .maybeSingle();

        if (error) handlePostgrestError(error);
        return data;
    }

    async getPerformanceByCategory(
        profileId: string,
    ): Promise<PerformanceByCategory[]> {
        const { data, error } = await this.db
            .from('v_performance_by_category')
            .select('*')
            .eq('profile_id', profileId)
            .order('total_bets', { ascending: false });

        if (error) handlePostgrestError(error);
        return data ?? [];
    }

    async getPerformanceByMarket(
        profileId: string,
    ): Promise<PerformanceByMarket[]> {
        const { data, error } = await this.db
            .from('v_performance_by_market')
            .select('*')
            .eq('profile_id', profileId)
            .order('total_bets', { ascending: false });

        if (error) handlePostgrestError(error);
        return data ?? [];
    }

    async getPerformanceByLeague(
        profileId: string,
    ): Promise<PerformanceByLeague[]> {
        const { data, error } = await this.db
            .from('v_performance_by_league')
            .select('*')
            .eq('profile_id', profileId)
            .order('total_bets', { ascending: false });

        if (error) handlePostgrestError(error);
        return data ?? [];
    }

    async getPerformanceByOddsRange(
        profileId: string,
    ): Promise<PerformanceByOddsRange[]> {
        const { data, error } = await this.db
            .from('v_performance_by_odds_range')
            .select('*')
            .eq('profile_id', profileId)
            .order('odds_range');

        if (error) handlePostgrestError(error);
        return data ?? [];
    }

    // ── Dashboard compuesto ──────────────────────────────────────
    // Ejecuta todas las queries en paralelo para un dashboard completo

    async getFullDashboard(profileId: string) {
        const [performance, byCategory, byMarket, byLeague, byOddsRange] =
            await Promise.all([
                this.getUserPerformance(profileId),
                this.getPerformanceByCategory(profileId),
                this.getPerformanceByMarket(profileId),
                this.getPerformanceByLeague(profileId),
                this.getPerformanceByOddsRange(profileId),
            ]);

        return {
            performance,
            byCategory,
            byMarket,
            byLeague,
            byOddsRange,
        };
    }
}
