-- ============================================================
-- Ajuste RLS para events
-- Los eventos pertenecen al perfil que los crea.
-- ============================================================

alter table public.events
    add column if not exists profile_id uuid references public.profiles (id) on delete cascade;

create index if not exists idx_events_profile_id
    on public.events (profile_id);

drop policy if exists "events: lectura pública" on public.events;
drop policy if exists "events: insert autenticados" on public.events;
drop policy if exists "events: solo admins actualizan" on public.events;
drop policy if exists "events: solo admins eliminan" on public.events;
drop policy if exists "events: solo admins modifican" on public.events;

create policy "events: lectura propia"
	on public.events for select
	using (auth.uid() = profile_id);

create policy "events: inserción propia"
	on public.events for insert
	with check (auth.uid() = profile_id);

create policy "events: actualización propia"
	on public.events for update
	using (auth.uid() = profile_id)
	with check (auth.uid() = profile_id);

create policy "events: eliminación propia"
	on public.events for delete
	using (auth.uid() = profile_id);
