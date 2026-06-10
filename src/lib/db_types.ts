// ============================================================
// database.types.ts
// Tipos TypeScript espejo del schema PostgreSQL.
// Generados a mano; si usas Supabase CLI puedes reemplazar
// con: `supabase gen types typescript --local > database.types.ts`
// ============================================================

export type EventStatus = 'scheduled' | 'live' | 'finished' | 'cancelled';
export type BetResult = 'pending' | 'won' | 'lost' | 'void';

// ── Tablas ───────────────────────────────────────────────────

export interface Profile {
    id: string;
    username: string;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface Sport {
    id: string;
    code: string;
    name: string;
    created_at: string;
}

export interface League {
    id: string;
    sport_id: string;
    name: string;
    country: string | null;
    logo_url: string | null;
    created_at: string;
}

export interface Team {
    id: string;
    league_id: string;
    name: string;
    short_name: string | null;
    country: string | null;
    logo_url: string | null;
    created_at: string;
}

export interface Event {
    id: string;
    profile_id: string;
    sport_id: string;
    league_id: string;
    home_team_id: string | null;
    away_team_id: string | null;
    starts_at: string;
    status: EventStatus;
    external_id: string | null;
    created_at: string;
}

export interface UpdateEvent {
    status: EventStatus;
}

export interface BetCategory {
    id: string;
    sport_id: string | null;
    code: string;
    name: string;
    created_at: string;
}

export interface BetMarket {
    id: string;
    code: string;
    name: string;
    created_at: string;
}

export interface BetSelection {
    id: string;
    code: string;
    name: string;
    created_at: string;
}

export interface BetCategoryMarket {
    category_id: string;
    market_id: string;
    created_at: string;
}

export interface BetMarketSelection {
    market_id: string;
    selection_id: string;
    created_at: string;
}

export interface BetMetadata {
    line?: number;
    period?: string;
    handicap?: number;
    [key: string]: unknown;
}

export interface Bet {
    id: string;
    profile_id: string;
    event_id: string | null;
    category_id: string | null;
    market_id: string | null;
    selection_id: string | null;
    odds: number;
    stake: number;
    result: BetResult;
    profit: number | null;
    bookmaker: string | null;
    metadata: BetMetadata;
    placed_at: string;
    created_at: string;
    updated_at: string;
}

// ── Vistas analíticas ────────────────────────────────────────

export interface UserPerformance {
    profile_id: string;
    total_bets: number;
    won: number;
    lost: number;
    void: number;
    pending: number;
    winrate_pct: number | null;
    total_staked: number;
    total_profit: number;
    roi_pct: number | null;
}

export interface PerformanceByCategory {
    profile_id: string;
    category_code: string;
    category_name: string;
    total_bets: number;
    won: number;
    lost: number;
    void: number;
    pending: number;
    winrate_pct: number | null;
    total_staked: number;
    total_profit: number;
    roi_pct: number | null;
}

export interface PerformanceByMarket {
    profile_id: string;
    market_code: string;
    market_name: string;
    total_bets: number;
    won: number;
    lost: number;
    void: number;
    pending: number;
    winrate_pct: number | null;
    total_staked: number;
    total_profit: number;
    roi_pct: number | null;
}

export interface PerformanceByLeague {
    profile_id: string;
    league_id: string;
    league_name: string;
    sport_name: string;
    total_bets: number;
    won: number;
    lost: number;
    void: number;
    pending: number;
    winrate_pct: number | null;
    total_staked: number;
    total_profit: number;
    roi_pct: number | null;
}

export interface PerformanceByTeam {
    profile_id: string;
    team_id: string;
    team_name: string;
    total_bets: number;
    won: number;
    lost: number;
    void: number;
    pending: number;
    winrate_pct: number | null;
    total_staked: number;
    total_profit: number;
    roi_pct: number | null;
}

export interface PerformanceByOddsRange {
    profile_id: string;
    odds_range: string;
    total_bets: number;
    won: number;
    lost: number;
    void: number;
    pending: number;
    winrate_pct: number | null;
    total_staked: number;
    total_profit: number;
    roi_pct: number | null;
}

// ── Tipos enriquecidos (joins comunes) ───────────────────────

export interface EventWithTeams extends Event {
    home_team: Team | null;
    away_team: Team | null;
    league: League;
    sport: Sport;
}

export type InsertEvent = Omit<Event, 'id' | 'created_at'>;

export interface BetWithRelations extends Bet {
    event: EventWithTeams | null;
    category: BetCategory | null;
    market: BetMarket | null;
    selection: BetSelection | null;
}

// ── Helpers de insert/update (omiten campos auto-generados) ──

export type InsertBet = Omit<Bet, 'id' | 'created_at' | 'updated_at'>;

export type UpdateBet = Partial<
    Omit<Bet, 'id' | 'profile_id' | 'created_at' | 'updated_at'>
>;

export type UpdateProfile = Partial<
    Omit<Profile, 'id' | 'created_at' | 'updated_at'>
>;

// ── Filtros para consultas ───────────────────────────────────

export interface BetFilters {
    result?: BetResult;
    category_id?: string;
    market_id?: string;
    selection_id?: string;
    event_id?: string;
    bookmaker?: string;
    odds_min?: number;
    odds_max?: number;
    from?: string; // ISO date
    to?: string; // ISO date
    limit?: number;
    offset?: number;
}

export interface EventFilters {
    profile_id?: string;
    sport_id?: string;
    league_id?: string;
    status?: EventStatus;
    from?: string;
    to?: string;
}
