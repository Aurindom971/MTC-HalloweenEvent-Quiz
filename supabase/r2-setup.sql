-- =========================================================
-- Round 2 (the wheel) — Supabase setup. Run ONCE in the SQL Editor.
--
-- Everything here is new and starts with r2_ (the storage bucket is
-- r2-submissions). It does not read, change or drop anything that
-- belongs to the registration or Round 1 sites, and it changes no
-- project settings (no Auth providers are switched on).
--
-- What it creates:
--   r2_teams            one row per team (readable by anyone)
--   r2_config           event settings, e.g. the twist delay (readable)
--   r2_hosts            host email + password hash (private)
--   r2_host_sessions    signed-in host phones (private)
--   r2_* functions      the only way the site writes anything
--   r2-submissions      storage bucket for the teams' ZIP files
--
-- Phones never write to the tables directly. Each phone keeps a random
-- device token; a team row stores only a hash of it ("owner"), and the
-- r2_save function checks the token before changing that row.
--
-- If a statement fails, nothing is created (it all runs in one
-- transaction). To undo everything later, run r2-remove.sql.
-- =========================================================

begin;

create extension if not exists pgcrypto with schema extensions;

-- ---------- tables ----------

create table public.r2_teams (
  key        text primary key check (key ~ '^[a-z0-9-]{1,120}$'),
  name       text not null check (char_length(btrim(name)) between 2 and 40),
  owner      text not null,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.r2_config (
  id            text primary key,
  delay_minutes numeric check (delay_minutes >= 0 and delay_minutes <= 600),
  updated_at    timestamptz not null default now()
);
insert into public.r2_config (id) values ('event');

create table public.r2_hosts (
  email     text primary key,
  pass_hash text not null
);

create table public.r2_host_sessions (
  token_hash text primary key,
  email      text not null references public.r2_hosts (email) on delete cascade,
  expires_at timestamptz not null
);

alter table public.r2_teams         enable row level security;
alter table public.r2_config        enable row level security;
alter table public.r2_hosts         enable row level security;
alter table public.r2_host_sessions enable row level security;

revoke all on public.r2_teams, public.r2_config, public.r2_hosts, public.r2_host_sessions from anon, authenticated;
grant select on public.r2_teams, public.r2_config to anon, authenticated;

create policy "r2 teams are readable" on public.r2_teams for select to anon, authenticated using (true);
create policy "r2 config is readable" on public.r2_config for select to anon, authenticated using (true);
-- no insert/update/delete policies: writes only go through the functions below

-- ---------- helpers (not callable from the site) ----------

create function public.r2_hash(p_secret text) returns text
language sql immutable set search_path = '' as $$
  select encode(extensions.digest(p_secret, 'sha256'), 'hex')
$$;

create function public.r2_host_email(p_token text) returns text
language sql stable security definer set search_path = '' as $$
  select s.email from public.r2_host_sessions s
  where s.token_hash = public.r2_hash(coalesce(p_token, '')) and s.expires_at > now()
$$;

create function public.r2_require_host(p_token text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.r2_host_email(p_token) is null then
    raise exception 'Only the host can do that.' using errcode = '42501';
  end if;
end $$;

create function public.r2_now_ms() returns bigint
language sql stable set search_path = '' as $$
  select (extract(epoch from now()) * 1000)::bigint
$$;

-- ---------- called by the site ----------

-- who is this phone? returns its owner hash, and the host email if a host is signed in on it
create function public.r2_hello(p_device text, p_host text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_device is null or char_length(p_device) not between 20 and 100 then
    raise exception 'Bad device token.' using errcode = '22023';
  end if;
  return jsonb_build_object('owner', public.r2_hash(p_device), 'host', public.r2_host_email(p_host));
end $$;

-- register a team name; false if the name is already taken
create function public.r2_register(p_device text, p_key text, p_name text, p_meta jsonb default '{}'::jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(p_meta, '{}'::jsonb);
begin
  if p_device is null or char_length(p_device) not between 20 and 100 then
    raise exception 'Bad device token.' using errcode = '22023';
  end if;
  if jsonb_typeof(meta) <> 'object'
     or exists (select 1 from jsonb_object_keys(meta) k where k not in ('leader', 'members'))
     or octet_length(meta::text) > 8000 then
    raise exception 'Bad team details.' using errcode = '22023';
  end if;
  insert into public.r2_teams (key, name, owner, data)
  values (p_key, btrim(p_name), public.r2_hash(p_device), meta)
  on conflict (key) do nothing;
  return found;
end $$;

-- save the phone's own team progress (only whitelisted fields); false if it isn't this phone's team
create function public.r2_save(p_device text, p_key text, p_patch jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  patch jsonb := coalesce(p_patch, '{}'::jsonb) - 'updatedAt';
begin
  if jsonb_typeof(patch) <> 'object'
     or exists (select 1 from jsonb_object_keys(patch) k where k not in (
          'stage', 'charId', 'problem', 'hex', 'hexAt', 'unlockAt', 'twist', 'twistText', 'twistExtra',
          'eggs', 'submissionUrl', 'repoUrl', 'zipUrl', 'zipName', 'zipSize', 'zipCloudUrl', 'submittedAt',
          'leader', 'members'))
     or octet_length(patch::text) > 16000 then
    raise exception 'Bad progress update.' using errcode = '22023';
  end if;
  update public.r2_teams
     set data = data || patch || jsonb_build_object('updatedAt', public.r2_now_ms()),
         updated_at = now()
   where key = p_key and owner = public.r2_hash(coalesce(p_device, ''));
  return found;
end $$;

-- host sign-in: returns a session token, or null if the email/password is wrong
create function public.r2_host_login(p_email text, p_password text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  h text;
  token text;
begin
  select pass_hash into h from public.r2_hosts where email = lower(btrim(p_email));
  if h is null or extensions.crypt(coalesce(p_password, ''), h) <> h then
    return null;
  end if;
  delete from public.r2_host_sessions where expires_at < now();
  token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.r2_host_sessions (token_hash, email, expires_at)
  values (public.r2_hash(token), lower(btrim(p_email)), now() + interval '24 hours');
  return token;
end $$;

create function public.r2_host_logout(p_token text) returns void
language sql security definer set search_path = '' as $$
  delete from public.r2_host_sessions where token_hash = public.r2_hash(coalesce(p_token, ''))
$$;

create function public.r2_host_set_delay(p_token text, p_minutes numeric) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.r2_require_host(p_token);
  update public.r2_config set delay_minutes = p_minutes, updated_at = now() where id = 'event';
end $$;

-- erases every Round 2 team (only r2_teams; ZIPs in the bucket stay until deleted in Storage)
create function public.r2_host_wipe(p_token text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.r2_require_host(p_token);
  delete from public.r2_teams where true;
end $$;

-- functions are executable by everyone by default: lock them down, then open only the site's ones
revoke execute on function
  public.r2_hash(text), public.r2_host_email(text), public.r2_require_host(text), public.r2_now_ms(),
  public.r2_hello(text, text), public.r2_register(text, text, text, jsonb), public.r2_save(text, text, jsonb),
  public.r2_host_login(text, text), public.r2_host_logout(text),
  public.r2_host_set_delay(text, numeric), public.r2_host_wipe(text)
  from public, anon, authenticated;
grant execute on function
  public.r2_hello(text, text), public.r2_register(text, text, text, jsonb), public.r2_save(text, text, jsonb),
  public.r2_host_login(text, text), public.r2_host_logout(text),
  public.r2_host_set_delay(text, numeric), public.r2_host_wipe(text)
  to anon, authenticated;

-- ---------- live updates (only our two tables are added) ----------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime' and not puballtables) then
    alter publication supabase_realtime add table public.r2_teams, public.r2_config;
  end if;
end $$;

-- ---------- ZIP uploads ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('r2-submissions', 'r2-submissions', true, 52428800,
        array['application/zip', 'application/x-zip-compressed', 'application/x-zip', 'multipart/x-zip', 'application/octet-stream']);

-- phones may add new files under submissions/ in this bucket only (no overwriting, listing or deleting)
create policy "r2 zip uploads" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'r2-submissions' and (storage.foldername(name))[1] = 'submissions');

commit;
