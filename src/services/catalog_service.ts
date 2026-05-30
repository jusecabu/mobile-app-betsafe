// ============================================================
// catalog.service.ts
// Caché en memoria para catálogos estáticos que cambian raramente.
// TTL de 5 minutos; suficiente para mobile sin consumir storage.
// ============================================================

import {
    BetCategory,
    BetMarket,
    BetSelection,
    League,
    Sport,
    Team,
} from '@/lib/db_types';
import { CatalogRepository } from '@/repositories/catalog_repository';

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000; // 5 minutos

export class CatalogService {
    private cache = new Map<string, CacheEntry<unknown>>();

    constructor(private readonly catalogRepo: CatalogRepository) {}

    // ── Helpers de caché ───────────────────────────────────────

    private getCached<T>(key: string): T | null {
        const entry = this.cache.get(key) as CacheEntry<T> | undefined;
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }

    private setCached<T>(key: string, data: T): void {
        this.cache.set(key, { data, expiresAt: Date.now() + TTL_MS });
    }

    clearCache(): void {
        this.cache.clear();
    }

    // ── Sports ─────────────────────────────────────────────────

    async getSports(): Promise<Sport[]> {
        const key = 'sports';
        const cached = this.getCached<Sport[]>(key);
        if (cached) return cached;

        const data = await this.catalogRepo.getSports();
        this.setCached(key, data);
        return data;
    }

    async getSportByCode(code: string): Promise<Sport> {
        const sports = await this.getSports();
        const sport = sports.find((s) => s.code === code);
        if (!sport) throw new Error(`Deporte '${code}' no encontrado`);
        return sport;
    }

    // ── Leagues ────────────────────────────────────────────────

    async getLeagues(sportId?: string): Promise<League[]> {
        const key = `leagues:${sportId ?? 'all'}`;
        const cached = this.getCached<League[]>(key);
        if (cached) return cached;

        const data = await this.catalogRepo.getLeagues(sportId);
        this.setCached(key, data);
        return data;
    }

    async getLeagueById(id: string): Promise<League> {
        const league = await this.catalogRepo.getLeagueById(id);
        if (!league) throw new Error('Liga no encontrada');
        return league;
    }

    // ── Teams ──────────────────────────────────────────────────

    async getTeams(leagueId?: string): Promise<Team[]> {
        const key = `teams:${leagueId ?? 'all'}`;
        const cached = this.getCached<Team[]>(key);
        if (cached) return cached;

        const data = await this.catalogRepo.getTeams(leagueId);
        this.setCached(key, data);
        return data;
    }

    async searchTeams(name: string): Promise<Team[]> {
        if (name.trim().length < 2) {
            throw new Error('La búsqueda debe tener al menos 2 caracteres');
        }
        // No cachear búsquedas — son dinámicas
        return this.catalogRepo.searchTeams(name.trim());
    }

    // ── Bet categories ─────────────────────────────────────────

    async getCategories(sportId?: string): Promise<BetCategory[]> {
        const key = `bet_categories:${sportId ?? 'all'}`;
        const cached = this.getCached<BetCategory[]>(key);
        if (cached) return cached;

        const data = await this.catalogRepo.getCategories(sportId);
        this.setCached(key, data);
        return data;
    }

    // ── Bet markets ────────────────────────────────────────────

    async getMarkets(categoryId?: string): Promise<BetMarket[]> {
        const key = `bet_markets:${categoryId ?? 'all'}`;
        const cached = this.getCached<BetMarket[]>(key);
        if (cached) return cached;

        const data = await this.catalogRepo.getMarkets(categoryId);
        this.setCached(key, data);
        return data;
    }

    async getCategoryMarketId(
        categoryId: string,
        marketId: string,
    ): Promise<string | null> {
        return this.catalogRepo.getCategoryMarketId(categoryId, marketId);
    }

    // ── Bet selections ─────────────────────────────────────────

    async getSelections(categoryMarketId?: string): Promise<BetSelection[]> {
        const key = `bet_selections:${categoryMarketId ?? 'all'}`;
        const cached = this.getCached<BetSelection[]>(key);
        if (cached) return cached;

        const data = await this.catalogRepo.getSelections(categoryMarketId);
        this.setCached(key, data);
        return data;
    }

    // ── Todo junto (carga inicial de la app) ──────────────────

    async getAll(): Promise<{
        sports: Sport[];
        categories: BetCategory[];
        markets: BetMarket[];
        selections: BetSelection[];
    }> {
        const [sports, categories, markets, selections] = await Promise.all([
            this.getSports(),
            this.getCategories(),
            this.getMarkets(),
            this.getSelections(),
        ]);

        return { sports, categories, markets, selections };
    }
}
