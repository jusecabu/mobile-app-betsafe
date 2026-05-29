// ============================================================
// container.ts
// Punto de entrada único: crea y conecta repos + servicios.
// Importa `services` desde cualquier parte de la app.
//
// Uso:
//   import { services } from '@/lib/container';
//   const bets = await services.bet.getBets(userId, { result: 'pending' });
// ============================================================

import { supabase } from './supabase'; // tu cliente Supabase existente

// Repositorios
import { AnalyticsRepository } from '@/repositories/analytics_repository';
import { BetRepository } from '@/repositories/bet_repository';
import { CatalogRepository } from '@/repositories/catalog_repository';
import { EventRepository } from '@/repositories/event_repository';
import { ProfileRepository } from '@/repositories/profile_repository';

// Servicios
import { AnalyticsService } from '@/services/analytics_service';
import { AuthService } from '@/services/auth_service';
import { BetService } from '@/services/bet_service';
import { CatalogService } from '@/services/catalog_service';
import { EventService } from '@/services/event_service';
import { ProfileService } from '@/services/profile_service';

// ── Repositorios ─────────────────────────────────────────────
const profileRepo = new ProfileRepository(supabase);
const betRepo = new BetRepository(supabase);
const eventRepo = new EventRepository(supabase);
const catalogRepo = new CatalogRepository(supabase);
const analyticsRepo = new AnalyticsRepository(supabase);

// ── Servicios ─────────────────────────────────────────────────
export const services = {
    auth: new AuthService(supabase),
    profile: new ProfileService(profileRepo),
    bet: new BetService(betRepo),
    event: new EventService(eventRepo),
    catalog: new CatalogService(catalogRepo),
    analytics: new AnalyticsService(analyticsRepo),
} as const;

// Tipos exportados para uso en hooks / stores
export type Services = typeof services;
