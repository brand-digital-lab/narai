-- Current live RLS behavior
create table if not exists public.tracker_store (
  id text primary key,
  entries jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.tracker_store enable row level security;
drop policy if exists "Allow public read tracker" on public.tracker_store;
drop policy if exists "Allow public insert tracker" on public.tracker_store;
drop policy if exists "Allow public update tracker" on public.tracker_store;
create policy "Allow public read tracker" on public.tracker_store
for select to anon using (id = 'main');
create policy "Allow public insert tracker" on public.tracker_store
for insert to anon with check (id = 'main');
create policy "Allow public update tracker" on public.tracker_store
for update to anon using (id = 'main') with check (id = 'main');
