// ============================================================
// bet.service.ts
// ============================================================

import {
    BetFiltersInput,
    BetFiltersSchema,
    CreateBetInput,
    CreateBetSchema,
    UpdateBetInput,
    UpdateBetSchema,
} from '@/lib/db_schemas';
import { Bet, BetWithRelations } from '@/lib/db_types';
import { BetRepository } from '@/repositories/bet_repository';

export class BetService {
    constructor(private readonly betRepo: BetRepository) {}

    // ── Consultas ──────────────────────────────────────────────

    async getBet(id: string): Promise<BetWithRelations> {
        const bet = await this.betRepo.findById(id);
        if (!bet) throw new Error('Apuesta no encontrada');
        return bet;
    }

    async getBets(
        profileId: string,
        filtersInput: BetFiltersInput | {} = {},
    ): Promise<{ data: BetWithRelations[]; total: number }> {
        const filters = BetFiltersSchema.parse(filtersInput);

        const [data, total] = await Promise.all([
            this.betRepo.findMany(profileId, filters),
            this.betRepo.count(profileId, filters),
        ]);

        return { data, total };
    }

    async getPendingBets(profileId: string): Promise<Bet[]> {
        return this.betRepo.findPending(profileId);
    }

    // ── Creación ───────────────────────────────────────────────

    async createBet(profileId: string, input: CreateBetInput): Promise<Bet> {
        const parsed = CreateBetSchema.parse(input);

        // Calcular profit si ya viene con resultado resuelto
        const profit = this.calculateProfit(
            parsed.stake,
            parsed.odds,
            parsed.result,
            parsed.profit,
        );

        return this.betRepo.create({
            profile_id: profileId,
            event_id: parsed.event_id ?? null,
            category_id: parsed.category_id ?? null,
            market_id: parsed.market_id ?? null,
            selection_id: parsed.selection_id ?? null,
            odds: parsed.odds,
            stake: parsed.stake,
            result: parsed.result,
            profit,
            bookmaker: parsed.bookmaker ?? null,
            metadata: parsed.metadata ?? {},
            placed_at: parsed.placed_at ?? new Date().toISOString(),
        });
    }

    // ── Actualización ──────────────────────────────────────────

    async updateBet(id: string, input: UpdateBetInput): Promise<Bet> {
        const parsed = UpdateBetSchema.parse(input);

        // Si se cambia resultado/stake/odds, recalcular profit
        if (
            parsed.result ||
            parsed.stake !== undefined ||
            parsed.odds !== undefined
        ) {
            const current = await this.betRepo.findById(id);
            if (!current) throw new Error('Apuesta no encontrada');

            const stake = parsed.stake ?? current.stake;
            const odds = parsed.odds ?? current.odds;
            const result = parsed.result ?? current.result;

            parsed.profit = this.calculateProfit(
                stake,
                odds,
                result,
                parsed.profit,
            );
        }

        return this.betRepo.update(id, parsed);
    }

    // ── Resolución rápida ──────────────────────────────────────

    async resolveBet(id: string, result: Bet['result']): Promise<Bet> {
        const bet = await this.betRepo.findById(id);
        if (!bet) throw new Error('Apuesta no encontrada');
        if (bet.result !== 'pending') {
            throw new Error('Solo se pueden resolver apuestas pendientes');
        }

        const profit = this.calculateProfit(bet.stake, bet.odds, result);

        return this.betRepo.update(id, { result, profit });
    }

    async bulkResolve(ids: string[], result: Bet['result']): Promise<void> {
        if (ids.length === 0) throw new Error('Debes enviar al menos un ID');
        if (ids.length > 100)
            throw new Error('Máximo 100 apuestas por operación');

        await this.betRepo.bulkUpdateResult(ids, result);
    }

    // ── Eliminación ────────────────────────────────────────────

    async deleteBet(id: string): Promise<void> {
        const bet = await this.betRepo.findById(id);
        if (!bet) throw new Error('Apuesta no encontrada');
        await this.betRepo.delete(id);
    }

    // ── Helpers privados ───────────────────────────────────────

    /**
     * Calcula el profit neto de una apuesta.
     *
     * won  → (stake × odds) − stake  = ganancia neta
     * lost → −stake                  = pérdida del stake
     * void → 0                       = se devuelve el stake
     * pending → null                 = sin resolver aún
     *
     * Si el caller ya envía profit explícito se respeta (apuestas importadas).
     */
    private calculateProfit(
        stake: number,
        odds: number,
        result: Bet['result'],
        explicitProfit?: number | null,
    ): number | null {
        if (explicitProfit !== undefined && explicitProfit !== null) {
            return explicitProfit;
        }

        switch (result) {
            case 'won':
                return parseFloat((stake * odds - stake).toFixed(2));
            case 'lost':
                return parseFloat((-stake).toFixed(2));
            case 'void':
                return 0;
            case 'pending':
                return null;
        }
    }
}
