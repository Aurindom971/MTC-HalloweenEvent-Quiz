/* =========================================================
   Ledger — every team and how far it has got.

   Two backends with the same interface:
   • cloud — Supabase, shared by every phone. Teams live in the
     r2_teams table (see supabase/r2-setup.sql). Phones never write
     to it directly: they call r2_* database functions with this
     phone's random device token, and a team row only accepts
     changes from the phone that registered it.
   • local — localStorage on this device only (no config set).

   The game reads the cached ledger synchronously (to draw the
   wheels) and writes through async calls.
   ========================================================= */

(function () {
  "use strict";

  var SDK = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js";
  var mock = /[?&]mockcloud\b/.test(location.search);
  // ?mockcloud always uses the fake crypt, never the real project
  var cfg = mock ? { url: "https://mock-crypt.invalid", key: "mock", bucket: "r2-submissions" } : window.SUPABASE_CONFIG;
  var Store = window.Store;

  // ?phone=A / ?phone=B tabs act as separate phones (same as js/store.js)
  var phone = (location.search.match(/[?&]phone=([\w-]+)/) || [])[1];
  var ns = phone ? "." + phone : "";
  var DEVICE_KEY = "r2.device" + ns, HOST_KEY = "r2.host" + ns;

  var listeners = [];
  var state = {
    mode: cfg ? "cloud" : "local",
    status: cfg ? "connecting" : "local", // connecting | online | offline | error | local
    error: "",
    entries: [],
    teams: {},
    config: {},
    user: null,
    isHost: false
  };
  // pairs this device has learned are taken before the live feed caught up
  var takenHints = {};

  var client = null, readyResolve, readyPromise = new Promise(function (r) { readyResolve = r; });

  function emit() {
    listeners.forEach(function (fn) { try { fn(state); } catch (e) { console.error(e); } });
  }

  function pairId(charId, problem) { return charId + "__" + problem; }

  /** A URL-safe key for a team name. "The Ghouls!" → "the-ghouls" */
  function teamKey(name) {
    var base = name.trim().toLowerCase();
    try { base = base.normalize("NFKD").replace(/[̀-ͯ]/g, ""); } catch (e) {}
    var key = base.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!key) key = "t-" + Array.from(name.trim().toLowerCase()).map(function (c) { return c.codePointAt(0).toString(36); }).join("-");
    return key.slice(0, 120);
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        setTimeout(function () { var e = new Error("The Other Side didn't answer. Check the internet connection and try again."); e.code = "timeout"; reject(e); }, ms);
      })
    ]);
  }

  function friendly(err) {
    var code = (err && err.code) || "";
    if (code === "timeout") return err.message;
    if (code === "unavailable" || !navigator.onLine) return "No connection to The Other Side. Check the internet and try again.";
    if (code === "permission-denied") return "The Other Side refused that action (permission denied).";
    if (code.indexOf("auth/") === 0) {
      if (code === "auth/invalid-credential") return "Wrong host email or password.";
      return "Sign-in failed (" + code + ").";
    }
    return (err && err.message) || "Something went wrong in The Other Side.";
  }

  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { window.localStorage.removeItem(k); } catch (e) {} }

  /** This phone's secret. Only its hash ("owner") is ever stored in the ledger. */
  var memoryDevice = null;
  function deviceToken() {
    var t = lsGet(DEVICE_KEY) || memoryDevice;
    if (!t) {
      var bytes = new Uint8Array(32);
      window.crypto.getRandomValues(bytes);
      t = Array.from(bytes).map(function (b) { return (b < 16 ? "0" : "") + b.toString(16); }).join("");
      memoryDevice = t;
      lsSet(DEVICE_KEY, t);
    }
    return t;
  }

  /* =========================================================
     CLOUD
     ========================================================= */

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src; s.async = false;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("Couldn't load " + src)); };
      document.head.appendChild(s);
    });
  }

  function loadSdk() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return loadScript(mock ? "tests/mock-supabase.js" : SDK);
  }

  /** Supabase answers { data, error }; turn an error into one the game understands. */
  function toErr(e) {
    var err = new Error(e.message || "Something went wrong in The Other Side.");
    if (e.code === "42501") err.code = "permission-denied";
    else if (!e.code || /fetch|network|load failed/i.test(e.message || "")) err.code = "unavailable";
    else err.code = e.code;
    return err;
  }
  function isNetwork(err) { return err && (err.code === "unavailable" || err.code === "timeout"); }

  function rpc(name, args) {
    return client.rpc(name, args).then(function (r) {
      if (r.error) throw toErr(r.error);
      return r.data;
    });
  }

  function rowToTeam(r) {
    return Object.assign({}, r.data || {}, { key: r.key, name: r.name, uid: r.owner, at: Date.parse(r.created_at) || Date.now() });
  }
  function rowToConfig(r) {
    var out = {};
    if (r && r.delay_minutes != null) out.delayMinutes = Number(r.delay_minutes);
    if (r && typeof r.round2_unlocked === "boolean") out.round2Unlocked = r.round2_unlocked;
    return out;
  }

  /** Who is this phone, and is a host signed in on it? */
  function hello() {
    return rpc("r2_hello", { p_device: deviceToken(), p_host: lsGet(HOST_KEY) }).then(function (me) {
      if (!me.host) lsDel(HOST_KEY);
      state.user = { uid: me.owner, email: me.host || "", isAnonymous: !me.host };
      state.isHost = !!me.host;
    });
  }

  /** Reload everything (first load, catching up after a dropped connection, polling). */
  function refresh() {
    return Promise.all([
      client.from("r2_teams").select("key,name,owner,data,created_at"),
      client.from("r2_config").select("delay_minutes, round2_unlocked").eq("id", "event").maybeSingle()
    ]).then(function (res) {
      if (res[0].error) throw toErr(res[0].error);
      var t = {};
      res[0].data.forEach(function (r) { t[r.key] = rowToTeam(r); });
      // keep this phone's unsaved progress on top of what the server sent
      Object.keys(pending).forEach(function (k) { if (t[k]) Object.assign(t[k], pending[k]); });
      state.teams = t;
      if (!res[1].error && res[1].data) {
        state.config = Object.assign(state.config || {}, rowToConfig(res[1].data));
      }
      fetch("/api/round2/state").then(function (r) { return r.json(); }).then(function (d) {
        if (d && typeof d.round2Unlocked === "boolean") {
          state.config = Object.assign(state.config || {}, {
            round2Unlocked: d.round2Unlocked,
            delayMinutes: typeof d.delayMinutes === "number" ? d.delayMinutes : ((state.config && state.config.delayMinutes) || 15)
          });
          emit();
        }
      }).catch(function () {});
      state.status = "online";
      state.error = "";
      emit();
    }).catch(function (err) {
      state.status = isNetwork(err) ? "offline" : "error";
      state.error = friendly(err);
      emit();
      throw err;
    });
  }

  var live = false, channel = null;

  function subscribe() {
    if (channel) return;
    channel = client.channel("r2-ledger")
      .on("postgres_changes", { event: "*", schema: "public", table: "r2_teams" }, function (p) {
        if (p.eventType === "DELETE") {
          if (p.old && p.old.key) delete state.teams[p.old.key];
        } else if (p.new && p.new.key) {
          var t = rowToTeam(p.new);
          if (pending[t.key]) Object.assign(t, pending[t.key]);
          state.teams[t.key] = t;
        }
        emit();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "r2_config" }, function (p) {
        if (p.new && p.new.id === "event") { state.config = rowToConfig(p.new); emit(); }
      })
      .subscribe(function (status) {
        if (status === "SUBSCRIBED") {
          live = true;
          // anything that changed while the feed was down
          refresh().catch(function () {});
          flushAll();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          live = false;
        }
      });
  }

  var connected = false;
  function connect() {
    loadSdk().then(function () {
      if (!client) {
        client = window.supabase.createClient(cfg.url, cfg.key, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        });
      }
      return hello();
    }).then(refresh).then(function () {
      connected = true;
      readyResolve();
      subscribe();
    }).catch(function (err) {
      if (state.status === "connecting") { state.status = isNetwork(err) ? "offline" : "error"; state.error = friendly(err); emit(); }
      console.warn("Ledger connection failed, retrying", err);
      setTimeout(connect, 8000);
    });
  }

  function initCloud() {
    connect();

    // don't keep the room waiting forever if the network is bad
    setTimeout(function () {
      if (!connected) { if (state.status === "connecting") state.status = "offline"; emit(); readyResolve(); }
    }, 9000);

    // if the live feed is down, keep the ledger fresh by asking every 15 s
    setInterval(function () { if (connected && !live) refresh().then(flushAll, function () {}); }, 15000);
    // phones sleep: catch up as soon as the screen comes back
    document.addEventListener("visibilitychange", function () {
      if (connected && document.visibilityState === "visible") refresh().then(flushAll, function () {});
    });
    window.addEventListener("online", function () { if (connected) refresh().then(flushAll, function () {}); else emit(); });
    window.addEventListener("offline", function () { state.status = "offline"; emit(); });
  }

  function needUser() {
    if (!client || !state.user) {
      var e = new Error(state.error || "Still connecting to The Other Side — try again in a moment.");
      e.code = "timeout";
      throw e;
    }
  }

  /* Progress saves are merged per team and retried, so a phone that drops
     off the network for a moment still gets its progress to the ledger. */
  var pending = {}, flushing = {};

  function queueSave(key, patch) {
    pending[key] = Object.assign(pending[key] || {}, patch);
    return flush(key);
  }

  function flush(key) {
    var chain = (flushing[key] || Promise.resolve()).then(function () {
      var patch = pending[key];
      if (!patch || !client || !state.user) return;
      delete pending[key];
      return sendSave(key, patch, 0);
    });
    flushing[key] = chain;
    return chain;
  }

  function flushAll() { Object.keys(pending).forEach(flush); }

  function sendBackendSave(key, patch) {
    try {
      var teamObj = state.teams[key] || {};
      return fetch("/api/round2/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          action: "save_progress",
          teamKey: key,
          teamName: teamObj.name || key,
          patch: patch
        })
      }).then(function (r) { return r.ok; }).catch(function () { return false; });
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  function sendSave(key, patch, attempt) {
    sendBackendSave(key, patch);
    return withTimeout(rpc("r2_save", { p_device: deviceToken(), p_key: key, p_patch: patch }), 12000).then(function (ok) {
      if (!ok) {
        // Device token changed (e.g., team switched from phone to laptop) — backend save_progress already persisted it!
        return true;
      }
    }, function (err) {
      if (isNetwork(err) && attempt < 2) {
        return new Promise(function (r) { setTimeout(r, 2000 * (attempt + 1)); }).then(function () { return sendSave(key, patch, attempt + 1); });
      }
      if (isNetwork(err)) {
        // keep it for the next reconnect; newer changes win
        pending[key] = Object.assign({}, patch, pending[key] || {});
      }
      console.warn("Progress save failed", err);
    });
  }

  function hostToken() { return lsGet(HOST_KEY); }

  var cloud = {
    registerTeam: async function (name, meta) {
      var key = teamKey(name);
      var details = {};
      if (meta && meta.leader) details.leader = meta.leader;
      if (meta && meta.members) details.members = meta.members;

      // Also sync with unified backend (/api/round2/state) so Round 1 + Round 2 stay linked
      try {
        var bRes = await fetch("/api/round2/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "register_or_resume",
            teamName: name.trim(),
            leader: details.leader || null,
            members: details.members || []
          })
        });
        if (bRes.ok) {
          var bData = await bRes.json();
          if (bData && bData.teamKey) {
            var restoredData = Object.assign({}, details, bData.r2 || {}, {
              key: key,
              name: bData.teamName || name.trim(),
              leader: bData.leader || details.leader || null,
              members: bData.members || details.members || [],
              at: Date.now()
            });
            state.teams[key] = Object.assign({}, state.teams[key] || {}, restoredData);
          }
        }
      } catch (e) {
        // Continue with direct Supabase RPC fallback
      }

      if (client && state.user) {
        try {
          var ok = await withTimeout(rpc("r2_register", { p_device: deviceToken(), p_key: key, p_name: name, p_meta: details }), 12000);
          if (!ok && state.teams[key]) {
            // Team already exists in r2_teams (e.g. from Round 1 or another device) — allow seamless resume!
            emit();
            return { ok: true, key: key, resumed: true, teamRecord: state.teams[key] };
          }
        } catch (rpcErr) {
          if (state.teams[key]) {
            emit();
            return { ok: true, key: key, resumed: true, teamRecord: state.teams[key] };
          }
        }
      }

      state.teams[key] = Object.assign({}, state.teams[key] || {}, details, {
        key: key,
        name: name.trim(),
        uid: (state.user && state.user.uid) || "server",
        at: (state.teams[key] && state.teams[key].at) || Date.now()
      });
      emit();
      return { ok: true, key: key, teamRecord: state.teams[key] };
    },

    // curses are no longer exclusive, so nothing is claimed in the shared ledger
    claim: async function () { return null; },
    update: async function () {},
    release: async function () {},

    uploadZip: function (key, file, onProgress) {
      var safeName = (file.name || "source.zip").replace(/[^a-zA-Z0-9._-]/g, "_");
      var path = "submissions/" + key + "/" + Date.now() + "_" + safeName;
      if (mock) return window.supabase.mockUpload(path, file, onProgress);
      return new Promise(function (resolve) {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", cfg.url + "/storage/v1/object/" + cfg.bucket + "/" + path);
        xhr.setRequestHeader("apikey", cfg.key);
        xhr.setRequestHeader("Authorization", "Bearer " + cfg.key);
        xhr.setRequestHeader("x-upsert", "false");
        xhr.setRequestHeader("Content-Type", "application/zip");
        if (typeof onProgress === "function") {
          xhr.upload.onprogress = function (e) { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)); };
        }
        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ url: cfg.url + "/storage/v1/object/public/" + cfg.bucket + "/" + path, name: file.name, size: file.size, path: path });
          } else {
            console.warn("ZIP upload refused (" + xhr.status + "):", xhr.responseText);
            resolve(null);
          }
        };
        xhr.onerror = function () { console.warn("ZIP upload failed (network)"); resolve(null); };
        xhr.send(file);
      });
    },

    saveProgress: function (key, patch) {
      if (!key) return Promise.resolve();
      if (state.teams[key]) { Object.assign(state.teams[key], patch); emit(); }
      return queueSave(key, Object.assign({}, patch));
    },

    wipe: async function () {
      needUser();
      await withTimeout(rpc("r2_host_wipe", { p_token: hostToken() }), 15000);
      state.teams = {};
      emit();
    },

    setDelay: async function (min) {
      needUser();
      await withTimeout(rpc("r2_host_set_delay", { p_token: hostToken(), p_minutes: min }), 12000);
      state.config = { delayMinutes: min };
      emit();
    },

    signInHost: async function (email, password) {
      needUser();
      var token = await withTimeout(rpc("r2_host_login", { p_email: email, p_password: password }), 15000);
      if (!token) { var e = new Error("Wrong host email or password."); e.code = "auth/invalid-credential"; throw e; }
      lsSet(HOST_KEY, token);
      await hello();
      emit();
    },

    signOutHost: async function () {
      var token = hostToken();
      lsDel(HOST_KEY);
      state.isHost = false;
      if (state.user) state.user = { uid: state.user.uid, email: "", isAnonymous: true };
      emit();
      if (token && client) { try { await rpc("r2_host_logout", { p_token: token }); } catch (e) {} }
    }
  };

  /* =========================================================
     LOCAL (single device)
     ========================================================= */

  function refreshLocal() {
    state.entries = Store.ledger().slice().sort(function (a, b) { return a.at - b.at; });
    var t = {};
    var progress = Store.prefs().progress || {};
    var teamDetails = Store.prefs().teamDetails || {};
    function add(name, at) {
      var key = teamKey(name);
      if (!t[key]) t[key] = Object.assign({ key: key, name: name, at: at || 0 }, teamDetails[key] || {}, progress[key] || {});
    }
    (Store.prefs().teams || []).forEach(function (n) { add(n); });
    state.entries.forEach(function (e) { add(e.team, e.at); });
    state.teams = t;
    emit();
  }

  var local = {
    registerTeam: async function (name, meta) {
      var key = teamKey(name);
      refreshLocal();
      if (state.teams[key]) return { ok: false, error: "That name is already written in the ledger. Choose another." };
      var names = Store.prefs().teams || [];
      names.push(name);
      Store.setPref("teams", names);
      if (meta) {
        var teamDetails = Store.prefs().teamDetails || {};
        teamDetails[key] = Object.assign({ key: key, name: name }, meta);
        Store.setPref("teamDetails", teamDetails);
      }
      refreshLocal();
      return { ok: true, key: key };
    },
    claim: async function (team, key, charId, problem) {
      var e = Store.claim(team, charId, problem);
      if (e) Store.updateEntry(e.id, { teamKey: key });
      refreshLocal();
      return e;
    },
    update: async function (id, patch) { Store.updateEntry(id, patch); refreshLocal(); },
    saveProgress: async function (key, patch) {
      var all = Store.prefs().progress || {};
      all[key] = Object.assign(all[key] || {}, patch, { updatedAt: Date.now() });
      Store.setPref("progress", all);
      refreshLocal();
    },
    release: async function (id) { Store.removeEntry(id); refreshLocal(); },
    uploadZip: async function () { return null; },
    wipe: async function () { Store.wipe(); Store.setPref("teams", []); Store.setPref("progress", {}); Store.setPref("teamDetails", {}); refreshLocal(); },
    setDelay: async function (min) { Store.setPref("delay", min); emit(); },
    signInHost: async function () {},
    signOutHost: async function () {}
  };

  var impl = state.mode === "cloud" ? cloud : local;

  /* =========================================================
     PUBLIC API
     ========================================================= */

  var Ledger = {
    get mode() { return state.mode; },
    get status() { return state.status; },
    get error() { return state.error; },
    get isHost() { return state.mode === "local" || state.isHost; },
    get hostEmail() { return state.user && !state.user.isAnonymous ? state.user.email : ""; },

    ready: function () { return readyPromise; },
    onChange: function (fn) { listeners.push(fn); },

    entries: function () { return state.entries; },
    teamKey: teamKey,
    teamExists: function (name) { return !!state.teams[teamKey(name)]; },

    /** Every registered team with its saved progress, oldest first. */
    teams: function () {
      return Object.keys(state.teams).map(function (k) { return state.teams[k]; })
        .sort(function (a, b) { return (a.at || 0) - (b.at || 0); });
    },

    /** The team this phone registered (shared mode only). */
    myTeam: function () {
      if (state.mode !== "cloud" || !state.user || state.isHost) return null;
      var uid = state.user.uid;
      return this.teams().filter(function (t) { return t.uid === uid; }).pop() || null;
    },

    saveProgress: function (key, patch) { return impl.saveProgress(key, patch); },

    usedProblems: function (charId) {
      var used = {};
      state.entries.forEach(function (e) { if (e.charId === charId && typeof e.problem === "number") used[e.problem] = true; });
      Object.keys(takenHints).forEach(function (id) {
        var parts = id.split("__");
        if (parts[0] === charId) used[+parts[1]] = true;
      });
      return used;
    },

    delayMinutes: function (fallback) {
      var c = state.config && state.config.delayMinutes;
      if (state.mode === "cloud" && typeof c === "number") return Math.max(0, c);
      var p = Store.prefs().delay;
      return Math.max(0, typeof p === "number" ? p : fallback);
    },

    isUnlocked: function () {
      if (state.config && typeof state.config.round2Unlocked === "boolean") {
        return state.config.round2Unlocked;
      }
      return true;
    },

    registerTeam: function (name, meta) { return impl.registerTeam(name, meta); },
    claim: function (team, key, charId, problem) { return impl.claim(team, key, charId, problem); },
    update: function (id, patch) { return impl.update(id, patch); },
    uploadZip: function (key, file, onProgress) { return impl.uploadZip ? impl.uploadZip(key, file, onProgress) : Promise.resolve(null); },
    release: function (id) { return impl.release(id); },
    wipe: function () { return impl.wipe(); },
    setDelay: function (m) { return impl.setDelay(m); },
    signInHost: function (e, p) { return impl.signInHost(e, p); },
    signOutHost: function () { return impl.signOutHost(); },

    // local mode only — combine ledgers exported from other devices
    merge: function (list) { var r = Store.merge(list); refreshLocal(); return r; },

    friendly: friendly
  };

  if (state.mode === "cloud") {
    initCloud();
  } else {
    refreshLocal();
    window.addEventListener("storage", function (e) { if (e.key && e.key.indexOf("woc.") === 0) refreshLocal(); });
    readyResolve();
  }

  window.Ledger = Ledger;
})();
