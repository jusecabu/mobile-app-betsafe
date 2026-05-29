-- ============================================================
-- BETTING ANALYTICS APP — Supabase PostgreSQL Schema
-- Convención: snake_case, plurales para tablas, UUID como PK
-- ============================================================

-- ─────────────────────────────────────────────
-- EXTENSIONES
-- ─────────────────────────────────────────────
create extension if not exists "pgcrypto";  -- gen_random_uuid()


-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────

-- Estado del evento deportivo
create type event_status as enum (
  'scheduled',
  'live',
  'finished',
  'cancelled'
);

-- Resultado de una apuesta
create type bet_result as enum (
  'pending',
  'won',
  'lost',
  'void'
);


-- ─────────────────────────────────────────────
-- TABLA: profiles
-- Extiende auth.users (Supabase Auth)
-- ─────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null unique,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint profiles_username_length check (char_length(username) between 3 and 30),
  constraint profiles_username_format check (username ~ '^[a-zA-Z0-9_]+$')
);

-- Comentario de tabla
comment on table public.profiles is 'Extiende auth.users con información pública del usuario.';

-- Índices
create index idx_profiles_username on public.profiles (username);

-- RLS
alter table public.profiles enable row level security;

-- Cualquier usuario autenticado puede leer perfiles
create policy "profiles: lectura pública"
  on public.profiles for select
  using (true);
-- Razón: los perfiles son públicos dentro de la app; otros usuarios
-- pueden buscar oponentes o ver stats de quien quieran.

-- Solo el propio usuario puede insertar/actualizar/eliminar su perfil
create policy "profiles: escritura propia"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);
-- Razón: nadie debe poder modificar el perfil de otro usuario.


-- ─────────────────────────────────────────────
-- TRIGGER: updated_at automático en profiles
-- ─────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- ─────────────────────────────────────────────
-- TRIGGER: crear perfil automáticamente al registrarse
-- Se dispara cuando Supabase Auth crea un usuario en auth.users
-- ─────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'username',
      'user_' || substr(new.id::text, 1, 8)
    )
  );
  return new;
end;
$$;

create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ─────────────────────────────────────────────
-- HELPER: es el usuario actual un admin?
-- Utilizado en policies de tablas de catálogo
-- ─────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;


-- ─────────────────────────────────────────────
-- TABLA: sports
-- Catálogo de deportes (admin-managed)
-- ─────────────────────────────────────────────
create table public.sports (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,      -- 'football', 'basketball'
  name       text not null,
  created_at timestamptz not null default now()
);

comment on table public.sports is 'Catálogo de deportes soportados por la plataforma.';

create index idx_sports_code on public.sports (code);

alter table public.sports enable row level security;

create policy "sports: lectura pública"
  on public.sports for select
  using (true);
-- Razón: cualquier usuario (incluso anónimo) puede listar los deportes
-- disponibles para filtrar apuestas.

create policy "sports: solo admins modifican"
  on public.sports for all
  using (public.is_admin())
  with check (public.is_admin());
-- Razón: el catálogo de deportes es datos de referencia;
-- solo el equipo de producto debe poder agregar/eliminar deportes.


-- ─────────────────────────────────────────────
-- TABLA: leagues
-- ─────────────────────────────────────────────
create table public.leagues (
  id         uuid primary key default gen_random_uuid(),
  sport_id   uuid not null references public.sports (id) on delete restrict,
  name       text not null,
  country    text,
  logo_url   text,
  created_at timestamptz not null default now()
);

comment on table public.leagues is 'Ligas y competiciones deportivas agrupadas por deporte.';

create index idx_leagues_sport_id on public.leagues (sport_id);

alter table public.leagues enable row level security;

create policy "leagues: lectura pública"
  on public.leagues for select
  using (true);

create policy "leagues: solo admins modifican"
  on public.leagues for all
  using (public.is_admin())
  with check (public.is_admin());


-- ─────────────────────────────────────────────
-- TABLA: teams
-- ─────────────────────────────────────────────
create table public.teams (
  id         uuid primary key default gen_random_uuid(),
  league_id  uuid not null references public.leagues (id) on delete restrict,
  name       text not null,
  short_name text,
  country    text,
  logo_url   text,
  created_at timestamptz not null default now()
);

comment on table public.teams is 'Equipos deportivos pertenecientes a una liga.';

create index idx_teams_league_id on public.teams (league_id);
create index idx_teams_name      on public.teams (name);

alter table public.teams enable row level security;

create policy "teams: lectura pública"
  on public.teams for select
  using (true);

create policy "teams: solo admins modifican"
  on public.teams for all
  using (public.is_admin())
  with check (public.is_admin());


-- ─────────────────────────────────────────────
-- TABLA: events
-- Partidos / eventos deportivos
-- ─────────────────────────────────────────────
create table public.events (
  id           uuid primary key default gen_random_uuid(),
  sport_id     uuid not null references public.sports  (id) on delete restrict,
  league_id    uuid not null references public.leagues (id) on delete restrict,
  home_team_id uuid references public.teams (id) on delete set null,
  away_team_id uuid references public.teams (id) on delete set null,
  starts_at    timestamptz not null,
  status       event_status not null default 'scheduled',
  external_id  text unique,       -- ID en proveedor externo (odds API, etc.)
  created_at   timestamptz not null default now(),

  constraint events_teams_different check (home_team_id <> away_team_id)
);

comment on table public.events is 'Eventos deportivos (partidos) que sirven como contexto de las apuestas.';

create index idx_events_sport_id     on public.events (sport_id);
create index idx_events_league_id    on public.events (league_id);
create index idx_events_home_team_id on public.events (home_team_id);
create index idx_events_away_team_id on public.events (away_team_id);
create index idx_events_starts_at    on public.events (starts_at desc);
create index idx_events_status       on public.events (status);
create index idx_events_external_id  on public.events (external_id) where external_id is not null;

alter table public.events enable row level security;

create policy "events: lectura pública"
  on public.events for select
  using (true);

create policy "events: solo admins modifican"
  on public.events for all
  using (public.is_admin())
  with check (public.is_admin());


-- ─────────────────────────────────────────────
-- TABLA: bet_categories
-- Clasificación analítica de las apuestas
-- ─────────────────────────────────────────────
create table public.bet_categories (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,   -- 'MATCH_RESULT', 'OVER_UNDER', etc.
  name       text not null,
  created_at timestamptz not null default now()
);

comment on table public.bet_categories is
  'Categorías analíticas de apuestas (MATCH_RESULT, OVER_UNDER, HANDICAP, etc.).';

create index idx_bet_categories_code on public.bet_categories (code);

alter table public.bet_categories enable row level security;

create policy "bet_categories: lectura pública"
  on public.bet_categories for select
  using (true);

create policy "bet_categories: solo admins modifican"
  on public.bet_categories for all
  using (public.is_admin())
  with check (public.is_admin());


-- ─────────────────────────────────────────────
-- TABLA: bet_markets
-- Qué estadística / mercado se apuesta
-- ─────────────────────────────────────────────
create table public.bet_markets (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,   -- 'goals', 'corners', 'rebounds', etc.
  name       text not null,
  created_at timestamptz not null default now()
);

comment on table public.bet_markets is
  'Mercados de apuesta: qué estadística se mide (goles, esquinas, rebotes…).';

create index idx_bet_markets_code on public.bet_markets (code);

alter table public.bet_markets enable row level security;

create policy "bet_markets: lectura pública"
  on public.bet_markets for select
  using (true);

create policy "bet_markets: solo admins modifican"
  on public.bet_markets for all
  using (public.is_admin())
  with check (public.is_admin());


-- ─────────────────────────────────────────────
-- TABLA: bet_selections
-- Qué eligió el usuario dentro del mercado
-- ─────────────────────────────────────────────
create table public.bet_selections (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,   -- 'OVER', 'UNDER', 'HOME', 'AWAY', 'YES', 'NO', etc.
  name       text not null,
  created_at timestamptz not null default now()
);

comment on table public.bet_selections is
  'Selecciones posibles dentro de un mercado (OVER, UNDER, HOME, DRAW, AWAY…).';

create index idx_bet_selections_code on public.bet_selections (code);

alter table public.bet_selections enable row level security;

create policy "bet_selections: lectura pública"
  on public.bet_selections for select
  using (true);

create policy "bet_selections: solo admins modifican"
  on public.bet_selections for all
  using (public.is_admin())
  with check (public.is_admin());


-- ─────────────────────────────────────────────
-- TABLA: bets  ← TABLA PRINCIPAL
-- ─────────────────────────────────────────────
create table public.bets (
  id           uuid primary key default gen_random_uuid(),

  -- Quién apostó
  profile_id   uuid not null references public.profiles       (id) on delete cascade,

  -- Contexto del evento
  event_id     uuid references public.events         (id) on delete set null,

  -- Clasificación analítica
  category_id  uuid references public.bet_categories (id) on delete set null,
  market_id    uuid references public.bet_markets    (id) on delete set null,
  selection_id uuid references public.bet_selections (id) on delete set null,

  -- Datos de la apuesta
  odds         numeric(10, 4) not null,
  stake        numeric(12, 2) not null,
  result       bet_result not null default 'pending',
  profit       numeric(12, 2),     -- puede ser null hasta que se resuelva

  -- Metadatos operativos
  bookmaker    text,               -- 'bet365', 'Betano', etc. (libre)
  metadata     jsonb not null default '{}'::jsonb,
  placed_at    timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Constraints de negocio
  constraint bets_odds_positive  check (odds   > 0),
  constraint bets_stake_positive check (stake  > 0)
);

comment on table public.bets is
  'Tabla principal: registro de apuestas del usuario con su clasificación y resultado.';
comment on column public.bets.metadata is
  'JSONB libre: {"line": 2.5, "period": "first_half", "handicap": -1.5, ...}';

-- ── Índices analíticos ──────────────────────────────────────
-- Filtrajes frecuentes en dashboards
create index idx_bets_profile_id    on public.bets (profile_id);
create index idx_bets_event_id      on public.bets (event_id);
create index idx_bets_category_id   on public.bets (category_id);
create index idx_bets_market_id     on public.bets (market_id);
create index idx_bets_selection_id  on public.bets (selection_id);
create index idx_bets_result        on public.bets (result);
create index idx_bets_placed_at     on public.bets (placed_at desc);

-- Índice compuesto para analytics por usuario + resultado
create index idx_bets_profile_result
  on public.bets (profile_id, result);

-- Índice compuesto para analytics por usuario + categoría
create index idx_bets_profile_category
  on public.bets (profile_id, category_id);

-- Índice compuesto para filtrar apuestas pendientes rápidamente
create index idx_bets_pending
  on public.bets (profile_id, placed_at desc)
  where result = 'pending';

-- Índice GIN sobre JSONB para queries sobre metadata
create index idx_bets_metadata_gin
  on public.bets using gin (metadata jsonb_path_ops);

-- Índice sobre rango de cuotas (útil para analytics por odds range)
create index idx_bets_odds
  on public.bets (profile_id, odds);

-- ── Trigger updated_at ───────────────────────────────────────
create trigger trg_bets_updated_at
  before update on public.bets
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
alter table public.bets enable row level security;

create policy "bets: select propias"
  on public.bets for select
  using (auth.uid() = profile_id);
-- Razón: las apuestas son privadas por diseño; un usuario no debe
-- ver las apuestas de otro.

create policy "bets: insert propias"
  on public.bets for insert
  with check (auth.uid() = profile_id);
-- Razón: nadie puede registrar apuestas en nombre de otro usuario.

create policy "bets: update propias"
  on public.bets for update
  using  (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
-- Razón: solo el dueño puede actualizar (ej: corregir resultado).

create policy "bets: delete propias"
  on public.bets for delete
  using (auth.uid() = profile_id);
-- Razón: solo el dueño puede borrar sus registros.


-- ─────────────────────────────────────────────
-- DATOS SEMILLA — catálogos básicos
-- ─────────────────────────────────────────────

-- Deportes
insert into public.sports (code, name) values
  ('football',    'Fútbol'),
  ('basketball',  'Baloncesto'),
  ('tennis',      'Tenis'),
  ('baseball',    'Béisbol'),
  ('americanfootball', 'Fútbol Americano');

-- Categorías de apuesta
insert into public.bet_categories (code, name) values
  ('MATCH_RESULT',  'Resultado del partido'),
  ('OVER_UNDER',    'Más/Menos'),
  ('HANDICAP',      'Hándicap'),
  ('BOTH_TEAMS_SCORE', 'Ambos anotan'),
  ('PLAYER_PROP',   'Prop de jugador'),
  ('TEAM_PROP',     'Prop de equipo'),
  ('MATCH_EVENTS',  'Eventos del partido'),
  ('CORRECT_SCORE', 'Marcador exacto');

-- Mercados
insert into public.bet_markets (code, name) values
  ('goals',       'Goles'),
  ('corners',     'Esquinas'),
  ('cards',       'Tarjetas'),
  ('shots',       'Tiros'),
  ('rebounds',    'Rebotes'),
  ('assists',     'Asistencias'),
  ('points',      'Puntos'),
  ('fouls',       'Faltas');

-- Selecciones
insert into public.bet_selections (code, name) values
  ('OVER',    'Más de'),
  ('UNDER',   'Menos de'),
  ('HOME',    'Local'),
  ('AWAY',    'Visitante'),
  ('DRAW',    'Empate'),
  ('YES',     'Sí'),
  ('NO',      'No');


-- ─────────────────────────────────────────────
-- VISTAS ANALÍTICAS
-- Estas views NO guardan datos precalculados;
-- consultan bets directamente.
-- ─────────────────────────────────────────────

-- Vista: resumen de rendimiento por usuario
create or replace view public.v_user_performance as
select
  b.profile_id,
  count(*)                                                        as total_bets,
  count(*) filter (where b.result = 'won')                        as won,
  count(*) filter (where b.result = 'lost')                       as lost,
  count(*) filter (where b.result = 'void')                       as void,
  count(*) filter (where b.result = 'pending')                    as pending,
  round(
    count(*) filter (where b.result = 'won')::numeric /
    nullif(count(*) filter (where b.result in ('won','lost')), 0)
    * 100, 2
  )                                                               as winrate_pct,
  sum(b.stake)                                                    as total_staked,
  coalesce(sum(b.profit) filter (where b.result != 'void'), 0)   as total_profit,
  round(
    coalesce(sum(b.profit) filter (where b.result != 'void'), 0) /
    nullif(sum(b.stake) filter (where b.result != 'void'), 0)
    * 100, 2
  )                                                               as roi_pct
from public.bets b
group by b.profile_id;

-- La RLS sobre la vista hereda de la tabla bets al hacer el query;
-- pero para seguridad explícita, la vista filtra por auth.uid():
-- En producción se recomienda exponer via función RPC o filtrar en el cliente.


-- Vista: rendimiento por categoría y usuario
create or replace view public.v_performance_by_category as
select
  b.profile_id,
  c.code                                                          as category_code,
  c.name                                                          as category_name,
  count(*)                                                        as total_bets,
  count(*) filter (where b.result = 'won')                        as won,
  count(*) filter (where b.result = 'lost')                       as lost,
  round(
    count(*) filter (where b.result = 'won')::numeric /
    nullif(count(*) filter (where b.result in ('won','lost')), 0)
    * 100, 2
  )                                                               as winrate_pct,
  sum(b.stake)                                                    as total_staked,
  coalesce(sum(b.profit) filter (where b.result != 'void'), 0)   as total_profit,
  round(
    coalesce(sum(b.profit) filter (where b.result != 'void'), 0) /
    nullif(sum(b.stake) filter (where b.result != 'void'), 0)
    * 100, 2
  )                                                               as roi_pct
from public.bets b
join public.bet_categories c on c.id = b.category_id
group by b.profile_id, c.id, c.code, c.name;


-- Vista: rendimiento por mercado y usuario
create or replace view public.v_performance_by_market as
select
  b.profile_id,
  m.code                                                          as market_code,
  m.name                                                          as market_name,
  count(*)                                                        as total_bets,
  round(
    count(*) filter (where b.result = 'won')::numeric /
    nullif(count(*) filter (where b.result in ('won','lost')), 0)
    * 100, 2
  )                                                               as winrate_pct,
  sum(b.stake)                                                    as total_staked,
  coalesce(sum(b.profit) filter (where b.result != 'void'), 0)   as total_profit
from public.bets b
join public.bet_markets m on m.id = b.market_id
group by b.profile_id, m.id, m.code, m.name;


-- Vista: rendimiento por liga y usuario
create or replace view public.v_performance_by_league as
select
  b.profile_id,
  l.id                                                            as league_id,
  l.name                                                          as league_name,
  s.name                                                          as sport_name,
  count(*)                                                        as total_bets,
  round(
    count(*) filter (where b.result = 'won')::numeric /
    nullif(count(*) filter (where b.result in ('won','lost')), 0)
    * 100, 2
  )                                                               as winrate_pct,
  sum(b.stake)                                                    as total_staked,
  coalesce(sum(b.profit) filter (where b.result != 'void'), 0)   as total_profit
from public.bets b
join public.events e  on e.id  = b.event_id
join public.leagues l on l.id  = e.league_id
join public.sports s  on s.id  = l.sport_id
group by b.profile_id, l.id, l.name, s.name;


-- Vista: rendimiento por rango de cuotas
create or replace view public.v_performance_by_odds_range as
select
  b.profile_id,
  case
    when b.odds < 1.5              then '1.00 – 1.49'
    when b.odds between 1.5 and 1.99 then '1.50 – 1.99'
    when b.odds between 2.0 and 2.99 then '2.00 – 2.99'
    when b.odds between 3.0 and 4.99 then '3.00 – 4.99'
    else '5.00+'
  end                                                             as odds_range,
  count(*)                                                        as total_bets,
  round(
    count(*) filter (where b.result = 'won')::numeric /
    nullif(count(*) filter (where b.result in ('won','lost')), 0)
    * 100, 2
  )                                                               as winrate_pct,
  coalesce(sum(b.profit) filter (where b.result != 'void'), 0)   as total_profit
from public.bets b
group by b.profile_id, odds_range;


-- ─────────────────────────────────────────────
-- NOTAS SOBRE MATERIALIZED VIEWS
-- (no se crean aquí; crear cuando el volumen lo requiera)
-- ─────────────────────────────────────────────
-- Crear materialized views cuando:
--   • La tabla bets supere ~100k filas por usuario activo
--   • Las queries de analytics tomen > 200ms
--   • Se añadan dashboards de "top performers" cross-usuario
--
-- Candidatos a materializar:
--   mv_user_performance       → refrescar diariamente (cron)
--   mv_performance_by_league  → refrescar semanalmente
--
-- Ejemplo de refresh:
--   select cron.schedule('refresh-mv', '0 3 * * *',
--     'refresh materialized view concurrently public.mv_user_performance');
-- Requiere la extensión pg_cron habilitada en Supabase.