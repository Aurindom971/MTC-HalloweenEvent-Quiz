-- =========================================================
-- Round 2 — remove everything r2-setup.sql created, and nothing else.
-- This DELETES all Round 2 teams. ZIP files in the r2-submissions
-- bucket must be emptied first in Storage (Supabase won't drop a
-- bucket that still has files).
-- =========================================================

begin;

drop policy if exists "r2 zip uploads" on storage.objects;
delete from storage.buckets where id = 'r2-submissions';

do $$
begin
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'r2_teams') then
    alter publication supabase_realtime drop table public.r2_teams, public.r2_config;
  end if;
end $$;

drop function if exists
  public.r2_hello(text, text), public.r2_register(text, text, text, jsonb), public.r2_save(text, text, jsonb),
  public.r2_host_login(text, text), public.r2_host_logout(text),
  public.r2_host_set_delay(text, numeric), public.r2_host_wipe(text),
  public.r2_require_host(text), public.r2_host_email(text), public.r2_now_ms(), public.r2_hash(text);

drop table if exists public.r2_host_sessions, public.r2_hosts, public.r2_config, public.r2_teams;

commit;
