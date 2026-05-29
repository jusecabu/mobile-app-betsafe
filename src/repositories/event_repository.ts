// ============================================================
// event.repository.ts
// ============================================================

import {
    Event,
    EventFilters,
    EventWithTeams,
    InsertEvent,
    UpdateEvent,
} from '@/lib/db_types';
import { handlePostgrestError } from '@/repositories/base_repository';
import { SupabaseClient } from '@supabase/supabase-js';

const EVENT_WITH_TEAMS = `
  *,
  sport:sports (*),
  league:leagues (*),
  home_team:teams!events_home_team_id_fkey (*),
  away_team:teams!events_away_team_id_fkey (*)
` as const;

export class EventRepository {
    constructor(private readonly db: SupabaseClient) {}

    async create(payload: InsertEvent): Promise<Event> {
        const { data, error } = await this.db
            .from('events')
            .insert(payload)
            .select('*')
            .single();

        if (error) handlePostgrestError(error);
        return data;
    }

    async update(
        profileId: string,
        id: string,
        payload: UpdateEvent,
    ): Promise<Event> {
        const { data, error } = await this.db
            .from('events')
            .update(payload)
            .eq('profile_id', profileId)
            .eq('id', id)
            .select('*')
            .single();

        if (error) handlePostgrestError(error);
        return data;
    }

    async findById(
        profileId: string,
        id: string,
    ): Promise<EventWithTeams | null> {
        const { data, error } = await this.db
            .from('events')
            .select(EVENT_WITH_TEAMS)
            .eq('profile_id', profileId)
            .eq('id', id)
            .maybeSingle();

        if (error) handlePostgrestError(error);
        return data as EventWithTeams | null;
    }

    async findMany(filters: EventFilters = {}): Promise<EventWithTeams[]> {
        let query = this.db
            .from('events')
            .select(EVENT_WITH_TEAMS)
            .order('starts_at', { ascending: false });

        if (filters.profile_id)
            query = query.eq('profile_id', filters.profile_id);
        if (filters.sport_id) query = query.eq('sport_id', filters.sport_id);
        if (filters.league_id) query = query.eq('league_id', filters.league_id);
        if (filters.status) query = query.eq('status', filters.status);
        if (filters.from) query = query.gte('starts_at', filters.from);
        if (filters.to) query = query.lte('starts_at', filters.to);

        const { data, error } = await query;
        if (error) handlePostgrestError(error);
        return (data ?? []) as EventWithTeams[];
    }

    async findByExternalId(
        profileId: string,
        externalId: string,
    ): Promise<Event | null> {
        const { data, error } = await this.db
            .from('events')
            .select('*')
            .eq('profile_id', profileId)
            .eq('external_id', externalId)
            .maybeSingle();

        if (error) handlePostgrestError(error);
        return data;
    }

    async search(profileId: string, query: string): Promise<EventWithTeams[]> {
        // Búsqueda por nombre de equipo local o visitante (ilike)
        const { data, error } = await this.db
            .from('events')
            .select(EVENT_WITH_TEAMS)
            .eq('profile_id', profileId)
            .or(
                `home_team.name.ilike.%${query}%,away_team.name.ilike.%${query}%`,
            )
            .order('starts_at', { ascending: false })
            .limit(20);

        if (error) handlePostgrestError(error);
        return (data ?? []) as EventWithTeams[];
    }
}
