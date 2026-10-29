/* =========================================================
   DEV ONLY — a tiny stand-in for supabase-js, used when the site is
   opened with ?mockcloud. Every ?phone=A / ?phone=B tab acts as a
   separate phone; they share one fake database through localStorage.
   Lets you rehearse the shared-ledger flow without touching the real
   project. Add &lag=800 to simulate a slow network.

   It implements only what js/ledger.js uses. The r2_* functions copy
   the checks in supabase/r2-setup.sql (owner, host, field whitelist).
   The mock host is any email with the password "host".
   ========================================================= */

(function () {
  "use strict";

  var KEY = "mocksb.db";
  var lag = +(new URLSearchParams(location.search).get("lag") || 120);
  var TEAM_FIELDS = ["stage", "charId", "problem", "hex", "hexAt", "unlockAt", "twist", "twistText", "twistExtra",
    "eggs", "submissionUrl", "repoUrl", "zipUrl", "zipName", "zipSize", "zipCloudUrl", "submittedAt", "leader", "members"];

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(db, changes) {
    localStorage.setItem(KEY, JSON.stringify(db));
    localStorage.setItem(KEY + ".changes", JSON.stringify({ at: Math.random(), list: changes }));
    deliver(changes);
  }
  function teams(db) { return db.teams || (db.teams = {}); }
  function wait() { return new Promise(function (r) { setTimeout(r, lag); }); }
  function hash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return "h" + h.toString(16);
  }
  function fail(code, message) { return { data: null, error: { code: code, message: message } }; }
  function hostOf(db, token) { return token && (db.hosts || {})[hash(token)] || null; }

  var fns = {
    r2_hello: function (db, a) { return { data: { owner: hash(a.p_device), host: hostOf(db, a.p_host) } }; },
    r2_register: function (db, a) {
      var t = teams(db);
      if (t[a.p_key]) return { data: false };
      var row = { key: a.p_key, name: a.p_name.trim(), owner: hash(a.p_device), data: a.p_meta || {}, created_at: new Date().toISOString() };
      t[a.p_key] = row;
      save(db, [{ table: "r2_teams", eventType: "INSERT", new: row }]);
      return { data: true };
    },
    r2_save: function (db, a) {
      var bad = Object.keys(a.p_patch).filter(function (k) { return k !== "updatedAt" && TEAM_FIELDS.indexOf(k) < 0; });
      if (bad.length) return fail("22023", "Bad progress update.");
      var row = teams(db)[a.p_key];
      if (!row || row.owner !== hash(a.p_device)) return { data: false };
      Object.assign(row.data, a.p_patch, { updatedAt: Date.now() });
      save(db, [{ table: "r2_teams", eventType: "UPDATE", new: row }]);
      return { data: true };
    },
    r2_host_login: function (db, a) {
      if (a.p_password !== "host") return { data: null };
      var token = "tok-" + Math.random().toString(36).slice(2);
      db.hosts = db.hosts || {};
      db.hosts[hash(token)] = a.p_email.toLowerCase();
      save(db, []);
      return { data: token };
    },
    r2_host_logout: function (db, a) { if (db.hosts) delete db.hosts[hash(a.p_token || "")]; save(db, []); return { data: null }; },
    r2_host_set_delay: function (db, a) {
      if (!hostOf(db, a.p_token)) return fail("42501", "Only the host can do that.");
      db.config = { id: "event", delay_minutes: a.p_minutes };
      save(db, [{ table: "r2_config", eventType: "UPDATE", new: db.config }]);
      return { data: null };
    },
    r2_host_wipe: function (db, a) {
      if (!hostOf(db, a.p_token)) return fail("42501", "Only the host can do that.");
      var gone = Object.keys(teams(db)).map(function (k) { return { table: "r2_teams", eventType: "DELETE", old: { key: k } }; });
      db.teams = {};
      save(db, gone);
      return { data: null };
    }
  };

  /* ---------- realtime ---------- */
  var handlers = [];
  function deliver(changes) {
    setTimeout(function () {
      changes.forEach(function (c) {
        handlers.forEach(function (h) { if (h.table === c.table) h.fn({ eventType: c.eventType, new: c.new || {}, old: c.old || {} }); });
      });
    }, lag);
  }
  window.addEventListener("storage", function (e) {
    if (e.key === KEY + ".changes" && e.newValue) deliver(JSON.parse(e.newValue).list);
  });

  function Query(table) { this.table = table; this.one = false; }
  Query.prototype.select = function () { return this; };
  Query.prototype.eq = function () { return this; };
  Query.prototype.maybeSingle = function () { this.one = true; return this; };
  Query.prototype.then = function (ok, bad) {
    var self = this;
    return wait().then(function () {
      var db = load();
      if (self.table === "r2_teams") return { data: Object.keys(teams(db)).map(function (k) { return db.teams[k]; }), error: null };
      if (self.table === "r2_config") return { data: db.config || { id: "event", delay_minutes: null }, error: null };
      return fail("42P01", "no table " + self.table);
    }).then(ok, bad);
  };

  window.supabase = {
    createClient: function () {
      return {
        rpc: function (name, args) {
          return wait().then(function () { return fns[name] ? fns[name](load(), args) : fail("42883", "no function " + name); });
        },
        from: function (table) { return new Query(table); },
        channel: function () {
          var ch = {
            on: function (_, filter, fn) { handlers.push({ table: filter.table, fn: fn }); return ch; },
            subscribe: function (cb) { setTimeout(function () { cb("SUBSCRIBED"); }, lag); return ch; }
          };
          return ch;
        }
      };
    },
    // pretend upload with progress; the "URL" is only good for showing that it worked
    mockUpload: function (path, file, onProgress) {
      return new Promise(function (resolve) {
        var pct = 0;
        var timer = setInterval(function () {
          pct = Math.min(100, pct + 25);
          if (onProgress) onProgress(pct);
          if (pct === 100) { clearInterval(timer); resolve({ url: "https://mock-crypt.invalid/storage/" + path, name: file.name, size: file.size, path: path }); }
        }, lag);
      });
    }
  };
})();
