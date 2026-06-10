// ============================================================
// analytics.service.ts
// ============================================================

import {
    BetWithRelations,
    PerformanceByCategory,
    PerformanceByLeague,
    PerformanceByMarket,
    PerformanceByOddsRange,
    PerformanceByTeam,
    UserPerformance,
} from '@/lib/db_types';
import { BetRepository } from '@/repositories/bet_repository';

export interface FullDashboard {
    performance: UserPerformance | null;
    byCategory: PerformanceByCategory[];
    byMarket: PerformanceByMarket[];
    byLeague: PerformanceByLeague[];
    byTeam: PerformanceByTeam[];
    byOddsRange: PerformanceByOddsRange[];
}

export interface CategoryAnalyticsDetail {
    categoryCode: string;
    categoryName: string;
    performance: PerformanceByCategory;
    bestMarket: PerformanceByMarket | null;
    worstMarket: PerformanceByMarket | null;
    bestLeague: PerformanceByLeague | null;
    worstLeague: PerformanceByLeague | null;
    bestTeam: PerformanceByTeam | null;
    worstTeam: PerformanceByTeam | null;
    bestOddsRange: PerformanceByOddsRange | null;
    worstOddsRange: PerformanceByOddsRange | null;
    positiveInsights: string[];
    negativeInsights: string[];
}

type Totals = {
    total_bets: number;
    won: number;
    lost: number;
    void: number;
    pending: number;
    total_staked: number;
    total_profit: number;
};

type OddsBucket = {
    label: string;
    min: number;
    max: number | null;
};

const ODDS_BUCKETS: OddsBucket[] = [
    { label: '1.00 - 1.49', min: 1, max: 1.49 },
    { label: '1.50 - 1.99', min: 1.5, max: 1.99 },
    { label: '2.00 - 2.99', min: 2, max: 2.99 },
    { label: '3.00 - 4.99', min: 3, max: 4.99 },
    { label: '5.00 - 9.99', min: 5, max: 9.99 },
    { label: '10.00+', min: 10, max: null },
];

export class AnalyticsService {
    constructor(private readonly betRepo: BetRepository) {}

    private async getBets(profileId: string): Promise<BetWithRelations[]> {
        return this.betRepo.findAllByProfile(profileId);
    }

    private static sumTotals(bets: BetWithRelations[]): Totals {
        return bets.reduce<Totals>(
            (acc, bet) => ({
                total_bets: acc.total_bets + 1,
                won: acc.won + (bet.result === 'won' ? 1 : 0),
                lost: acc.lost + (bet.result === 'lost' ? 1 : 0),
                void: acc.void + (bet.result === 'void' ? 1 : 0),
                pending: acc.pending + (bet.result === 'pending' ? 1 : 0),
                total_staked: acc.total_staked + bet.stake,
                total_profit: acc.total_profit + (bet.profit ?? 0),
            }),
            {
                total_bets: 0,
                won: 0,
                lost: 0,
                void: 0,
                pending: 0,
                total_staked: 0,
                total_profit: 0,
            },
        );
    }

    private static winRate(totals: Totals): number | null {
        const resolved = totals.won + totals.lost;
        if (resolved === 0) return null;
        return Number(((totals.won / resolved) * 100).toFixed(2));
    }

    private static roi(totals: Totals): number | null {
        if (totals.total_staked === 0) return null;
        return Number(
            ((totals.total_profit / totals.total_staked) * 100).toFixed(2),
        );
    }

    private static roundMoney(value: number): number {
        return Number(value.toFixed(2));
    }

    private static buildUserPerformance(
        profileId: string,
        bets: BetWithRelations[],
    ): UserPerformance | null {
        if (bets.length === 0) return null;

        const totals = AnalyticsService.sumTotals(bets);

        return {
            profile_id: profileId,
            total_bets: totals.total_bets,
            won: totals.won,
            lost: totals.lost,
            void: totals.void,
            pending: totals.pending,
            winrate_pct: AnalyticsService.winRate(totals),
            total_staked: AnalyticsService.roundMoney(totals.total_staked),
            total_profit: AnalyticsService.roundMoney(totals.total_profit),
            roi_pct: AnalyticsService.roi(totals),
        };
    }

    private static buildCategoryRows(
        profileId: string,
        bets: BetWithRelations[],
    ): PerformanceByCategory[] {
        const groups = new Map<
            string,
            {
                categoryCode: string;
                categoryName: string;
                bets: BetWithRelations[];
            }
        >();

        for (const bet of bets) {
            const category = bet.category;
            if (!category) continue;

            const current = groups.get(category.id) ?? {
                categoryCode: category.code,
                categoryName: category.name,
                bets: [],
            };

            current.bets.push(bet);
            groups.set(category.id, current);
        }

        return [...groups.values()]
            .map(({ categoryCode, categoryName, bets: groupBets }) => {
                const totals = AnalyticsService.sumTotals(groupBets);
                return {
                    profile_id: profileId,
                    category_code: categoryCode,
                    category_name: categoryName,
                    total_bets: totals.total_bets,
                    won: totals.won,
                    lost: totals.lost,
                    void: totals.void,
                    pending: totals.pending,
                    winrate_pct: AnalyticsService.winRate(totals),
                    total_staked: AnalyticsService.roundMoney(
                        totals.total_staked,
                    ),
                    total_profit: AnalyticsService.roundMoney(
                        totals.total_profit,
                    ),
                    roi_pct: AnalyticsService.roi(totals),
                };
            })
            .sort((a, b) => b.total_bets - a.total_bets);
    }

    private static buildMarketRows(
        profileId: string,
        bets: BetWithRelations[],
    ): PerformanceByMarket[] {
        const groups = new Map<
            string,
            { marketCode: string; marketName: string; bets: BetWithRelations[] }
        >();

        for (const bet of bets) {
            const market = bet.market;
            if (!market) continue;

            const current = groups.get(market.id) ?? {
                marketCode: market.code,
                marketName: market.name,
                bets: [],
            };

            current.bets.push(bet);
            groups.set(market.id, current);
        }

        return [...groups.values()]
            .map(({ marketCode, marketName, bets: groupBets }) => {
                const totals = AnalyticsService.sumTotals(groupBets);
                return {
                    profile_id: profileId,
                    market_code: marketCode,
                    market_name: marketName,
                    total_bets: totals.total_bets,
                    won: totals.won,
                    lost: totals.lost,
                    void: totals.void,
                    pending: totals.pending,
                    winrate_pct: AnalyticsService.winRate(totals),
                    total_staked: AnalyticsService.roundMoney(
                        totals.total_staked,
                    ),
                    total_profit: AnalyticsService.roundMoney(
                        totals.total_profit,
                    ),
                    roi_pct: AnalyticsService.roi(totals),
                };
            })
            .sort((a, b) => b.total_bets - a.total_bets);
    }

    private static buildLeagueRows(
        profileId: string,
        bets: BetWithRelations[],
    ): PerformanceByLeague[] {
        const groups = new Map<
            string,
            {
                leagueId: string;
                leagueName: string;
                sportName: string;
                bets: BetWithRelations[];
            }
        >();

        for (const bet of bets) {
            const league = bet.event?.league;
            const sport = bet.event?.sport;
            if (!league || !sport) continue;

            const current = groups.get(league.id) ?? {
                leagueId: league.id,
                leagueName: league.name,
                sportName: sport.name,
                bets: [],
            };

            current.bets.push(bet);
            groups.set(league.id, current);
        }

        return [...groups.values()]
            .map(({ leagueId, leagueName, sportName, bets: groupBets }) => {
                const totals = AnalyticsService.sumTotals(groupBets);
                return {
                    profile_id: profileId,
                    league_id: leagueId,
                    league_name: leagueName,
                    sport_name: sportName,
                    total_bets: totals.total_bets,
                    won: totals.won,
                    lost: totals.lost,
                    void: totals.void,
                    pending: totals.pending,
                    winrate_pct: AnalyticsService.winRate(totals),
                    total_staked: AnalyticsService.roundMoney(
                        totals.total_staked,
                    ),
                    total_profit: AnalyticsService.roundMoney(
                        totals.total_profit,
                    ),
                    roi_pct: AnalyticsService.roi(totals),
                };
            })
            .sort((a, b) => b.total_bets - a.total_bets);
    }

    private static buildTeamRows(
        profileId: string,
        bets: BetWithRelations[],
    ): PerformanceByTeam[] {
        const groups = new Map<
            string,
            { teamName: string; bets: BetWithRelations[] }
        >();

        for (const bet of bets) {
            if (bet.category?.code !== 'MATCH_RESULT') continue;
            if (bet.market?.code !== 'winner') continue;

            const scope = (bet.metadata as Record<string, unknown> | null)
                ?.scope;
            if (scope !== 'home_team' && scope !== 'away_team') continue;

            const team =
                scope === 'home_team'
                    ? bet.event?.home_team
                    : bet.event?.away_team;

            if (!team) continue;

            const current = groups.get(team.id) ?? {
                teamName: team.name,
                bets: [],
            };

            current.bets.push(bet);
            groups.set(team.id, current);
        }

        return [...groups.entries()]
            .map(([teamId, { teamName, bets: groupBets }]) => {
                const totals = AnalyticsService.sumTotals(groupBets);
                return {
                    profile_id: profileId,
                    team_id: teamId,
                    team_name: teamName,
                    total_bets: totals.total_bets,
                    won: totals.won,
                    lost: totals.lost,
                    void: totals.void,
                    pending: totals.pending,
                    winrate_pct: AnalyticsService.winRate(totals),
                    total_staked: AnalyticsService.roundMoney(
                        totals.total_staked,
                    ),
                    total_profit: AnalyticsService.roundMoney(
                        totals.total_profit,
                    ),
                    roi_pct: AnalyticsService.roi(totals),
                };
            })
            .sort((a, b) => b.total_bets - a.total_bets);
    }

    private static buildOddsRows(
        profileId: string,
        bets: BetWithRelations[],
    ): PerformanceByOddsRange[] {
        return ODDS_BUCKETS.map((bucket) => {
            const bucketBets = bets.filter(
                (bet) =>
                    bet.odds >= bucket.min &&
                    (bucket.max === null || bet.odds <= bucket.max),
            );
            const totals = AnalyticsService.sumTotals(bucketBets);

            return {
                profile_id: profileId,
                odds_range: bucket.label,
                total_bets: totals.total_bets,
                won: totals.won,
                lost: totals.lost,
                void: totals.void,
                pending: totals.pending,
                winrate_pct: AnalyticsService.winRate(totals),
                total_staked: AnalyticsService.roundMoney(totals.total_staked),
                total_profit: AnalyticsService.roundMoney(totals.total_profit),
                roi_pct: AnalyticsService.roi(totals),
            };
        });
    }

    async getPerformance(profileId: string): Promise<UserPerformance | null> {
        const bets = await this.getBets(profileId);
        return AnalyticsService.buildUserPerformance(profileId, bets);
    }

    async getByCategory(profileId: string): Promise<PerformanceByCategory[]> {
        const bets = await this.getBets(profileId);
        return AnalyticsService.buildCategoryRows(profileId, bets);
    }

    async getByMarket(profileId: string): Promise<PerformanceByMarket[]> {
        const bets = await this.getBets(profileId);
        return AnalyticsService.buildMarketRows(profileId, bets);
    }

    async getByLeague(profileId: string): Promise<PerformanceByLeague[]> {
        const bets = await this.getBets(profileId);
        return AnalyticsService.buildLeagueRows(profileId, bets);
    }

    async getByTeam(profileId: string): Promise<PerformanceByTeam[]> {
        const bets = await this.getBets(profileId);
        return AnalyticsService.buildTeamRows(profileId, bets);
    }

    async getByOddsRange(profileId: string): Promise<PerformanceByOddsRange[]> {
        const bets = await this.getBets(profileId);
        return AnalyticsService.buildOddsRows(profileId, bets);
    }

    async getDashboard(profileId: string): Promise<FullDashboard> {
        const bets = await this.getBets(profileId);

        return {
            performance: AnalyticsService.buildUserPerformance(profileId, bets),
            byCategory: AnalyticsService.buildCategoryRows(profileId, bets),
            byMarket: AnalyticsService.buildMarketRows(profileId, bets),
            byLeague: AnalyticsService.buildLeagueRows(profileId, bets),
            byTeam: AnalyticsService.buildTeamRows(profileId, bets),
            byOddsRange: AnalyticsService.buildOddsRows(profileId, bets),
        };
    }

    async getCategoryDetail(
        profileId: string,
        categoryCode: string,
    ): Promise<CategoryAnalyticsDetail | null> {
        const bets = (await this.getBets(profileId)).filter(
            (bet) => bet.category?.code === categoryCode,
        );

        if (bets.length === 0) return null;

        const category = bets[0].category;
        if (!category) return null;

        const performance = AnalyticsService.buildCategoryRows(
            profileId,
            bets,
        )[0];
        if (!performance) return null;

        const byMarket = AnalyticsService.buildMarketRows(profileId, bets);
        const byLeague = AnalyticsService.buildLeagueRows(profileId, bets);
        const byTeam = AnalyticsService.buildTeamRows(profileId, bets);
        const byOddsRange = AnalyticsService.buildOddsRows(profileId, bets);

        const bestMarket = AnalyticsService.pickByRoi(byMarket, true);
        const worstMarket = AnalyticsService.pickByRoi(byMarket, false);
        const bestLeague = AnalyticsService.pickByRoi(byLeague, true);
        const worstLeague = AnalyticsService.pickByRoi(byLeague, false);
        const bestTeam = AnalyticsService.pickByRoi(byTeam, true);
        const worstTeam = AnalyticsService.pickByRoi(byTeam, false);
        const bestOddsRange = AnalyticsService.pickByWinrate(byOddsRange, true);
        const worstOddsRange = AnalyticsService.pickByWinrate(
            byOddsRange,
            false,
        );

        const positiveInsights: string[] = [];
        const negativeInsights: string[] = [];

        if (performance.roi_pct !== null && performance.roi_pct > 0) {
            positiveInsights.push(
                `La categoría mantiene un ROI positivo de ${performance.roi_pct.toFixed(2)}%.`,
            );
        } else if (performance.roi_pct !== null) {
            negativeInsights.push(
                `La categoría todavía no devuelve rentabilidad: ROI ${performance.roi_pct.toFixed(2)}%.`,
            );
        }

        if (bestMarket) {
            positiveInsights.push(
                `El mercado ${bestMarket.market_name} es el que más te beneficia con ROI ${bestMarket.roi_pct?.toFixed(2) ?? '0.00'}%.`,
            );
        }

        if (bestLeague) {
            positiveInsights.push(
                `La liga ${bestLeague.league_name} es tu mejor contexto con ROI ${bestLeague.roi_pct?.toFixed(2) ?? '0.00'}%.`,
            );
        }

        if (bestTeam) {
            positiveInsights.push(
                `El equipo ${bestTeam.team_name} es donde mejor te va con ROI ${bestTeam.roi_pct?.toFixed(2) ?? '0.00'}%.`,
            );
        }

        if (bestOddsRange) {
            positiveInsights.push(
                `El rango de cuotas ${bestOddsRange.odds_range} tiene tu mejor winrate (${bestOddsRange.winrate_pct?.toFixed(2) ?? '0.00'}%).`,
            );
        }

        if (worstMarket) {
            negativeInsights.push(
                `El mercado ${worstMarket.market_name} es el que menos te favorece con ROI ${worstMarket.roi_pct?.toFixed(2) ?? '0.00'}%.`,
            );
        }

        if (worstLeague) {
            negativeInsights.push(
                `La liga ${worstLeague.league_name} es tu punto más débil con ROI ${worstLeague.roi_pct?.toFixed(2) ?? '0.00'}%.`,
            );
        }

        if (worstTeam) {
            negativeInsights.push(
                `El equipo ${worstTeam.team_name} es donde peor te ha ido con ROI ${worstTeam.roi_pct?.toFixed(2) ?? '0.00'}%.`,
            );
        }

        if (worstOddsRange) {
            negativeInsights.push(
                `El rango de cuotas ${worstOddsRange.odds_range} tiene el winrate más bajo (${worstOddsRange.winrate_pct?.toFixed(2) ?? '0.00'}%).`,
            );
        }

        return {
            categoryCode: category.code,
            categoryName: category.name,
            performance,
            bestMarket,
            worstMarket,
            bestLeague,
            worstLeague,
            bestTeam,
            worstTeam,
            bestOddsRange,
            worstOddsRange,
            positiveInsights,
            negativeInsights,
        };
    }

    private static pickByRoi<
        T extends { roi_pct: number | null; total_bets: number },
    >(items: T[], descending: boolean): T | null {
        const ranked = items.filter(
            (item) => item.roi_pct !== null && item.total_bets >= 2,
        );

        if (ranked.length === 0) return null;

        return (
            [...ranked].sort((a, b) => {
                const delta = (a.roi_pct ?? 0) - (b.roi_pct ?? 0);
                return descending ? -delta : delta;
            })[0] ?? null
        );
    }

    private static pickByWinrate<
        T extends { winrate_pct: number | null; total_bets: number },
    >(items: T[], descending: boolean): T | null {
        const ranked = items.filter(
            (item) => item.winrate_pct !== null && item.total_bets >= 2,
        );

        if (ranked.length === 0) return null;

        return (
            [...ranked].sort((a, b) => {
                const delta = (a.winrate_pct ?? 0) - (b.winrate_pct ?? 0);
                return descending ? -delta : delta;
            })[0] ?? null
        );
    }

    // ── Helper: mejor categoría por ROI ───────────────────────

    async getBestCategory(
        profileId: string,
    ): Promise<PerformanceByCategory | null> {
        const data = await this.getByCategory(profileId);
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
        const data = await this.getByOddsRange(profileId);
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
