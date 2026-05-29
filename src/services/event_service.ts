// ============================================================
// event.service.ts
// ============================================================

import {
    CreateEventInput,
    CreateEventSchema,
    EventFiltersInput,
    EventFiltersSchema,
    UpdateEventInput,
    UpdateEventSchema,
} from '@/lib/db_schemas';
import { EventWithTeams } from '@/lib/db_types';
import { EventRepository } from '@/repositories/event_repository';

export class EventService {
    constructor(private readonly eventRepo: EventRepository) {}

    async createEvent(
        profileId: string,
        input: CreateEventInput,
    ): Promise<EventWithTeams> {
        const parsed = CreateEventSchema.parse(input);

        const event = await this.eventRepo.create({
            profile_id: profileId,
            sport_id: parsed.sport_id,
            league_id: parsed.league_id,
            home_team_id: parsed.home_team_id,
            away_team_id: parsed.away_team_id,
            starts_at: parsed.starts_at ?? new Date().toISOString(),
            status: parsed.status,
            external_id: parsed.external_id ?? null,
        });

        return this.getEvent(profileId, event.id);
    }

    async getEvent(profileId: string, id: string): Promise<EventWithTeams> {
        const event = await this.eventRepo.findById(profileId, id);
        if (!event) throw new Error('Evento no encontrado');
        return event;
    }

    async updateEvent(
        profileId: string,
        id: string,
        input: UpdateEventInput,
    ): Promise<EventWithTeams> {
        const parsed = UpdateEventSchema.parse(input);
        const current = await this.getEvent(profileId, id);

        if (current.status !== 'scheduled') {
            throw new Error('Solo se pueden modificar eventos scheduled');
        }

        await this.eventRepo.update(profileId, id, {
            status: parsed.status,
        });

        return this.getEvent(profileId, id);
    }

    async getEvents(
        profileId: string,
        filtersInput: EventFiltersInput = {},
    ): Promise<EventWithTeams[]> {
        const filters = EventFiltersSchema.parse(filtersInput);
        return this.eventRepo.findMany({ ...filters, profile_id: profileId });
    }

    async getUpcomingEvents(
        profileId: string,
        sportId?: string,
    ): Promise<EventWithTeams[]> {
        return this.eventRepo.findMany({
            profile_id: profileId,
            status: 'scheduled',
            sport_id: sportId,
            from: new Date().toISOString(),
        });
    }

    async getLiveEvents(profileId: string): Promise<EventWithTeams[]> {
        return this.eventRepo.findMany({
            profile_id: profileId,
            status: 'live',
        });
    }

    async searchEvents(
        profileId: string,
        query: string,
    ): Promise<EventWithTeams[]> {
        if (query.trim().length < 2) {
            throw new Error('La búsqueda debe tener al menos 2 caracteres');
        }
        return this.eventRepo.search(profileId, query.trim());
    }

    async getEventByExternalId(
        profileId: string,
        externalId: string,
    ): Promise<EventWithTeams | null> {
        const event = await this.eventRepo.findByExternalId(
            profileId,
            externalId,
        );
        if (!event) return null;
        return this.eventRepo.findById(profileId, event.id);
    }
}
