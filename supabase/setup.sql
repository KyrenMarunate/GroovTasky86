-- Run once in the SQL editor of your own Supabase project.
-- The project stores one validated workspace snapshot per authenticated user.
create table if not exists public.groov_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision integer not null default 1 check (revision >= 1),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.groov_workspaces enable row level security;
revoke all on public.groov_workspaces from anon;
grant select, insert, update, delete on public.groov_workspaces to authenticated;
drop policy if exists "Users read own workspace" on public.groov_workspaces;
create policy "Users read own workspace" on public.groov_workspaces for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users create own workspace" on public.groov_workspaces;
create policy "Users create own workspace" on public.groov_workspaces for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users update own workspace" on public.groov_workspaces;
create policy "Users update own workspace" on public.groov_workspaces for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users delete own workspace" on public.groov_workspaces;
create policy "Users delete own workspace" on public.groov_workspaces for delete to authenticated using (auth.uid() = user_id);
