/* =========================================================
   Shared ledger switch.

   With this set, every phone shares one ledger in Supabase (see
   SETUP-SUPABASE.md). Set it to null to run in single-device mode,
   where the ledger lives only in this browser.

   The publishable key is meant to be public. Never put the secret
   (service_role) key here. What protects the data is the r2_*
   functions and row-level security in supabase/r2-setup.sql.
   ========================================================= */

window.SUPABASE_CONFIG = {
  url: "https://fnubekbfadspsctsmdwl.supabase.co",
  key: "sb_publishable_5vreosDTOyRbjei7Ja2CWQ_oTaJ6MF_",
  bucket: "r2-submissions"
};
