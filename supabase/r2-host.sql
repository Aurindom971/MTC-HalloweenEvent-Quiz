-- =========================================================
-- Round 2 — set the host password. Run after r2-setup.sql.
--
-- Replace PUT-YOUR-HOST-PASSWORD-HERE with the password you want
-- (keep the quotes), run it, then clear it from the editor. Only a
-- bcrypt hash is stored. Running it again changes the password.
-- Add another line with a different email for a co-host.
-- =========================================================

insert into public.r2_hosts (email, pass_hash)
values ('ishit2807@gmail.com', extensions.crypt('PUT-YOUR-HOST-PASSWORD-HERE', extensions.gen_salt('bf')))
on conflict (email) do update set pass_hash = excluded.pass_hash;
