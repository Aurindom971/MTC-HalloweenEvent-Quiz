# Shared ledger on Supabase

Round 2 keeps its teams in the same Supabase project as the registration and Round 1 sites. Everything it needs is in its own `r2_` tables, `r2_*` functions and the `r2-submissions` storage bucket, so it can't change or read anything belonging to the other two sites. It also needs no project settings changed: no Auth providers, no API settings.

## 1. Create the Round 2 tables (once)
1. Open the project in the Supabase dashboard → **SQL Editor** → **New query**.
2. Paste all of [`supabase/r2-setup.sql`](supabase/r2-setup.sql) and press **Run**. It should end with "Success. No rows returned".
   - If it fails, nothing was created (it runs as one transaction). Send the error message to whoever maintains this site.

## 2. Set the host password (once)
1. New query → paste [`supabase/r2-host.sql`](supabase/r2-host.sql).
2. Replace `PUT-YOUR-HOST-PASSWORD-HERE` with the password you want (keep the quotes) → **Run**.
3. Delete the query text afterwards. Only a bcrypt hash is stored. Run it again any time to change the password.

The host signs in from the host ledger with that email and password. The session lasts 24 hours on that phone.

## 3. Point the site at the project
`js/supabase-config.js` holds the Project URL and the **publishable** key (Project Settings → API Keys). Both are meant to be public. Never put the secret / `service_role` key in the site.

## Checking it
- **Table Editor → r2_teams**: one row per team. `data` holds the team's progress (soul, curse, hex, twist, submission).
- **Storage → r2-submissions**: ZIPs teams uploaded, under `submissions/<team-key>/`. The free plan stores 1 GB in total for the whole project (all three sites) and accepts files up to 50 MB.
- Open the site with `?mockcloud` to rehearse with a fake database instead (add `&phone=A` / `&phone=B` in two tabs to act as two phones; the mock host password is `host`).

## Wiping or removing
- **Wipe** in the host ledger deletes every Round 2 team (only `r2_teams`). Uploaded ZIPs stay in the bucket until you delete them in Storage.
- [`supabase/r2-remove.sql`](supabase/r2-remove.sql) removes everything step 1 created, and nothing else. Empty the `r2-submissions` bucket in Storage first.
