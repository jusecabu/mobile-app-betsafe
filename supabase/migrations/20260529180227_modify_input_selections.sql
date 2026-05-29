-- ============================================================
-- Catálogo dependiente: categorías -> mercados -> selecciones
-- Las categorías ahora pueden depender de un deporte.
-- ============================================================

alter table public.bet_categories
	add column if not exists sport_id uuid references public.sports (id) on delete set null;

create index if not exists idx_bet_categories_sport_id
	on public.bet_categories (sport_id);

update public.bet_categories
set sport_id = (select id from public.sports where code = 'football')
where code in ('MATCH_RESULT', 'BOTH_TEAMS_SCORE', 'MATCH_EVENTS', 'CORRECT_SCORE');

update public.bet_categories
set sport_id = (select id from public.sports where code = 'basketball')
where code in ('PLAYER_PROP', 'TEAM_PROP');

create table if not exists public.bet_category_markets (
	category_id uuid not null references public.bet_categories (id) on delete cascade,
	market_id uuid not null references public.bet_markets (id) on delete cascade,
	created_at timestamptz not null default now(),
	primary key (category_id, market_id)
);

create table if not exists public.bet_market_selections (
	market_id uuid not null references public.bet_markets (id) on delete cascade,
	selection_id uuid not null references public.bet_selections (id) on delete cascade,
	created_at timestamptz not null default now(),
	primary key (market_id, selection_id)
);

create index if not exists idx_bet_category_markets_category_id
	on public.bet_category_markets (category_id);

create index if not exists idx_bet_category_markets_market_id
	on public.bet_category_markets (market_id);

create index if not exists idx_bet_market_selections_market_id
	on public.bet_market_selections (market_id);

create index if not exists idx_bet_market_selections_selection_id
	on public.bet_market_selections (selection_id);

alter table public.bet_category_markets enable row level security;
alter table public.bet_market_selections enable row level security;

drop policy if exists "bet_category_markets: lectura pública" on public.bet_category_markets;
drop policy if exists "bet_category_markets: solo admins modifican" on public.bet_category_markets;
drop policy if exists "bet_market_selections: lectura pública" on public.bet_market_selections;
drop policy if exists "bet_market_selections: solo admins modifican" on public.bet_market_selections;

create policy "bet_category_markets: lectura pública"
	on public.bet_category_markets for select
	using (true);

create policy "bet_category_markets: solo admins modifican"
	on public.bet_category_markets for all
	using (public.is_admin())
	with check (public.is_admin());

create policy "bet_market_selections: lectura pública"
	on public.bet_market_selections for select
	using (true);

create policy "bet_market_selections: solo admins modifican"
	on public.bet_market_selections for all
	using (public.is_admin())
	with check (public.is_admin());

insert into public.bet_category_markets (category_id, market_id)
select c.id, m.id
from public.bet_categories c
join public.bet_markets m on m.code in ('goals', 'cards', 'fouls')
where c.code = 'MATCH_RESULT'
on conflict do nothing;

insert into public.bet_category_markets (category_id, market_id)
select c.id, m.id
from public.bet_categories c
join public.bet_markets m on m.code in ('goals', 'corners', 'cards', 'shots', 'rebounds', 'assists', 'points', 'fouls')
where c.code = 'OVER_UNDER'
on conflict do nothing;

insert into public.bet_category_markets (category_id, market_id)
select c.id, m.id
from public.bet_categories c
join public.bet_markets m on m.code in ('goals', 'points', 'shots', 'rebounds', 'assists', 'fouls')
where c.code = 'HANDICAP'
on conflict do nothing;

insert into public.bet_category_markets (category_id, market_id)
select c.id, m.id
from public.bet_categories c
join public.bet_markets m on m.code in ('goals')
where c.code = 'BOTH_TEAMS_SCORE'
on conflict do nothing;

insert into public.bet_category_markets (category_id, market_id)
select c.id, m.id
from public.bet_categories c
join public.bet_markets m on m.code in ('shots', 'assists', 'points', 'rebounds')
where c.code = 'PLAYER_PROP'
on conflict do nothing;

insert into public.bet_category_markets (category_id, market_id)
select c.id, m.id
from public.bet_categories c
join public.bet_markets m on m.code in ('corners', 'cards', 'fouls', 'shots')
where c.code = 'TEAM_PROP'
on conflict do nothing;

insert into public.bet_category_markets (category_id, market_id)
select c.id, m.id
from public.bet_categories c
join public.bet_markets m on m.code in ('cards', 'fouls', 'corners')
where c.code = 'MATCH_EVENTS'
on conflict do nothing;

insert into public.bet_category_markets (category_id, market_id)
select c.id, m.id
from public.bet_categories c
join public.bet_markets m on m.code in ('goals', 'points')
where c.code = 'CORRECT_SCORE'
on conflict do nothing;

insert into public.bet_market_selections (market_id, selection_id)
select m.id, s.id
from public.bet_markets m
join public.bet_selections s on s.code in ('OVER', 'UNDER')
where m.code in ('goals', 'corners', 'cards', 'shots', 'rebounds', 'assists', 'points', 'fouls')
on conflict do nothing;
