// ============================================================
// analytics.service.ts
// ============================================================

import {
    PerformanceByCategory,
    PerformanceByLeague,
    PerformanceByMarket,
    PerformanceByOddsRange,
    UserPerformance,
} from '@/lib/db_types';
import { AnalyticsRepository } from '@/repositories/analytics_repository';

export interface FullDashboard {
    performance: UserPerformance | null;
    byCategory: PerformanceByCategory[];
    byMarket: PerformanceByMarket[];
    byLeague: PerformanceByLeague[];
    byOddsRange: PerformanceByOddsRange[];
}

export class AnalyticsService {
    constructor(private readonly analyticsRepo: AnalyticsRepository) {}

    async getPerformance(profileId: string): Promise<UserPerformance | null> {
        return this.analyticsRepo.getUserPerformance(profileId);
    }

    async getByCategory(profileId: string): Promise<PerformanceByCategory[]> {
        return this.analyticsRepo.getPerformanceByCategory(profileId);
    }

    async getByMarket(profileId: string): Promise<PerformanceByMarket[]> {
        return this.analyticsRepo.getPerformanceByMarket(profileId);
    }

    async getByLeague(profileId: string): Promise<PerformanceByLeague[]> {
        return this.analyticsRepo.getPerformanceByLeague(profileId);
    }

    async getByOddsRange(profileId: string): Promise<PerformanceByOddsRange[]> {
        return this.analyticsRepo.getPerformanceByOddsRange(profileId);
    }

    async getDashboard(profileId: string): Promise<FullDashboard> {
        return this.analyticsRepo.getFullDashboard(profileId);
    }

    // ── Helper: mejor categoría por ROI ───────────────────────

    async getBestCategory(
        profileId: string,
    ): Promise<PerformanceByCategory | null> {
        const data =
            await this.analyticsRepo.getPerformanceByCategory(profileId);
        if (data.length === 0) return null;

        return (
            data
                .filter((c) => c.roi_pct !== null && c.total_bets >= 5)
                .sort((a, b) => (b.roi_pct ?? 0) - (a.roi_pct ?? 0))[0] ?? null
        );
    }

    // ── Helper: mejor rango de cuotas ─────────────────────────

    async getBestOddsRange(
        profileId: string,
    ): Promise<PerformanceByOddsRange | null> {
        const data =
            await this.analyticsRepo.getPerformanceByOddsRange(profileId);
        if (data.length === 0) return null;

        return (
            data
                .filter((r) => r.winrate_pct !== null && r.total_bets >= 5)
                .sort(
                    (a, b) => (b.winrate_pct ?? 0) - (a.winrate_pct ?? 0),
                )[0] ?? null
        );
    }
}
