-- OPTIONAL: run only AFTER frontend Auth is working.
begin;
drop policy if exists "Allow public read tracker" on public.tracker_store;
drop policy if exists "Allow public insert tracker" on public.tracker_store;
drop policy if exists "Allow public update tracker" on public.tracker_store;
drop policy if exists "Authenticated users can read tracker" on public.tracker_store;
drop policy if exists "Authenticated users can insert tracker" on public.tracker_store;
drop policy if exists "Authenticated users can update tracker" on public.tracker_store;
create policy "Authenticated users can read tracker" on public.tracker_store
for select to authenticated using (id = 'main');
create policy "Authenticated users can insert tracker" on public.tracker_store
for insert to authenticated with check (id = 'main');
create policy "Authenticated users can update tracker" on public.tracker_store
for update to authenticated using (id = 'main') with check (id = 'main');
commit;
