-- Esquema de Grimhold DM Dashboard.
-- Ejecutar en el SQL Editor de Supabase. Requiere habilitar
-- "Anonymous Sign-Ins" en Supabase Auth antes de abrir la aplicación.
--
-- Versión 2: un solo campo JSONB "data" con TODO el estado de la campaña
-- (monstruos, hechizos, NPCs, combate y notas), para que nada se pierda
-- entre dispositivos. La columna antigua "monsters" se migra si existe.

create table if not exists public.dm_campaigns (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  monsters jsonb,                                  -- legacy: se migra y se deja nula
  notes text,                                      -- legacy: se migra y se deja nula
  updated_at timestamptz not null default now()
);

alter table public.dm_campaigns enable row level security;

-- Trigger para que updated_at se refresque en cada UPDATE.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_dm_campaigns_updated_at on public.dm_campaigns;
create trigger set_dm_campaigns_updated_at
  before update on public.dm_campaigns
  for each row execute function public.set_updated_at();

-- RLS: cada usuario anónimo solo ve y edita su propia fila.
drop policy if exists "Campaign owner can read" on public.dm_campaigns;
drop policy if exists "Campaign owner can insert" on public.dm_campaigns;
drop policy if exists "Campaign owner can update" on public.dm_campaigns;

create policy "Campaign owner can read" on public.dm_campaigns
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Campaign owner can insert" on public.dm_campaigns
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Campaign owner can update" on public.dm_campaigns
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.dm_campaigns to authenticated;
