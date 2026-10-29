/* =========================================================
   Store — the ledger of claimed (character, problem) pairs
   and the current team's in-progress session.

   Everything lives in localStorage on this device. Two teams
   can share a character, but a (character, problem) pair can
   only ever be claimed once per ledger. Ledgers from several
   devices can be merged from the host panel.
   ========================================================= */

(function () {
  "use strict";

  // Testing aid: ?phone=A / ?phone=B lets two tabs on one computer act as
  // two separate phones (each keeps its own team session).
  var phone = (location.search.match(/[?&]phone=([\w-]+)/) || [])[1];
  var ns = phone ? "." + phone : "";

  // v2 = fresh ledger for the real event: every team registered during
  // testing (ledger, phone locks, sessions, progress) is dropped below.
  var LEDGER_KEY = "woc.ledger.v2" + ns;
  var SESSION_KEY = "woc.session.v2" + ns;
  var PREFS_KEY = "woc.prefs.v2" + ns;
  try {
    for (var k = window.localStorage.length - 1; k >= 0; k--) {
      var old = window.localStorage.key(k);
      if (/^woc\.(ledger|session|prefs|device)\.v1(\.|$)/.test(old)) window.localStorage.removeItem(old);
    }
  } catch (e) { /* storage blocked: nothing to clear */ }

  // In-memory fallback for private mode / blocked storage.
  var memory = {};

  function read(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (raw == null) raw = memory[key];
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      return memory[key] != null ? JSON.parse(memory[key]) : fallback;
    }
  }

  function write(key, value) {
    var raw = JSON.stringify(value);
    memory[key] = raw;
    try { window.localStorage.setItem(key, raw); } catch (e) { /* memory only */ }
  }

  function remove(key) {
    delete memory[key];
    try { window.localStorage.removeItem(key); } catch (e) {}
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // A small non-reversible fingerprint (cyrb53) — lets the code check a secret
  // phrase without the phrase itself appearing anywhere in the source.
  function cyrb53(str, seed) {
    var h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (var i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }

  var DEVICE_KEY = "woc.device.v2" + ns;
  var JUDGE_KEY = "woc.judge.v1";

  var Store = {
    sessionKey: SESSION_KEY,

    /** Fingerprint of a phrase; ignores case, spaces and punctuation. */
    secret: function (phrase) {
      return cyrb53(String(phrase || "").toLowerCase().replace(/[^a-z0-9]/g, ""), 1031).toString(36);
    },

    /* ---------- one registration per phone ---------- */
    deviceTeam: function () { return read(DEVICE_KEY, null); },
    lockDevice: function (team, key, meta) { write(DEVICE_KEY, Object.assign({ team: team, key: key, at: Date.now() }, meta || {})); },
    unlockDevice: function () { remove(DEVICE_KEY); },

    /* ---------- judges' pass (kept for this browser) ---------- */
    judgePass: function () { return read(JUDGE_KEY, null); },
    setJudgePass: function (k) { write(JUDGE_KEY, k); },

    /* ---------- ledger ---------- */
    ledger: function () {
      var l = read(LEDGER_KEY, []);
      return Array.isArray(l) ? l : [];
    },

    saveLedger: function (list) { write(LEDGER_KEY, list); },

    /** Set of problem indexes already claimed for a character. */
    usedProblems: function (charId) {
      var used = {};
      this.ledger().forEach(function (e) {
        if (e.charId === charId && typeof e.problem === "number") used[e.problem] = true;
      });
      return used;
    },

    /**
     * Claim a (character, problem) pair. Re-reads storage right before
     * writing so two tabs on one device can't grab the same pair.
     * Returns the entry, or null if the pair was taken meanwhile.
     */
    claim: function (team, charId, problem) {
      var list = this.ledger();
      var taken = list.some(function (e) { return e.charId === charId && e.problem === problem; });
      if (taken) return null;
      var entry = { id: uid(), team: team, charId: charId, problem: problem, at: Date.now() };
      list.push(entry);
      this.saveLedger(list);
      return entry;
    },

    updateEntry: function (id, patch) {
      var list = this.ledger();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) {
          for (var k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) list[i][k] = patch[k];
          this.saveLedger(list);
          return list[i];
        }
      }
      return null;
    },

    removeEntry: function (id) {
      this.saveLedger(this.ledger().filter(function (e) { return e.id !== id; }));
    },

    teamExists: function (name) {
      var n = name.trim().toLowerCase();
      return this.ledger().some(function (e) { return (e.team || "").trim().toLowerCase() === n; });
    },

    /**
     * Merge another device's ledger. Entries are matched by id; if two
     * devices claimed the same (character, problem) pair, the earlier
     * claim wins and the clash is reported so the host can re-spin.
     */
    merge: function (incoming) {
      if (!Array.isArray(incoming)) throw new Error("That file isn't a ledger.");
      var list = this.ledger();
      var byId = {};
      list.forEach(function (e) { byId[e.id] = true; });
      var added = 0, clashes = [];
      incoming.forEach(function (e) {
        if (!e || typeof e.charId !== "string" || typeof e.problem !== "number" || byId[e.id]) return;
        var clash = list.filter(function (x) { return x.charId === e.charId && x.problem === e.problem; })[0];
        if (clash) {
          clashes.push({ kept: clash.at <= e.at ? clash : e, dropped: clash.at <= e.at ? e : clash });
          if (e.at < clash.at) { list.splice(list.indexOf(clash), 1); list.push(e); }
          return;
        }
        list.push(e); byId[e.id] = true; added++;
      });
      list.sort(function (a, b) { return a.at - b.at; });
      this.saveLedger(list);
      return { added: added, clashes: clashes };
    },

    wipe: function () { remove(LEDGER_KEY); remove(SESSION_KEY); remove(DEVICE_KEY); },

    /* ---------- current team session ---------- */
    session: function () { return read(SESSION_KEY, null); },
    saveSession: function (s) { write(SESSION_KEY, s); },
    clearSession: function () { remove(SESSION_KEY); },

    /* ---------- device prefs ---------- */
    prefs: function () { return read(PREFS_KEY, {}) || {}; },
    setPref: function (k, v) { var p = this.prefs(); p[k] = v; write(PREFS_KEY, p); },

    /* ---------- indexeddb for source code zip files ---------- */
    saveZipFile: function (key, file) {
      return getDb().then(function (db) {
        return new Promise(function (resolve, reject) {
          try {
            var tx = db.transaction(IDB_STORE, "readwrite");
            var store = tx.objectStore(IDB_STORE);
            var record = {
              key: key,
              name: file.name,
              size: file.size,
              type: file.type || "application/zip",
              blob: file,
              savedAt: Date.now()
            };
            var req = store.put(record);
            req.onsuccess = function () { resolve(record); };
            req.onerror = function (e) { reject(e.target.error); };
          } catch (err) { reject(err); }
        });
      });
    },

    getZipFile: function (key) {
      return getDb().then(function (db) {
        return new Promise(function (resolve, reject) {
          try {
            var tx = db.transaction(IDB_STORE, "readonly");
            var store = tx.objectStore(IDB_STORE);
            var req = store.get(key);
            req.onsuccess = function (e) { resolve(e.target.result || null); };
            req.onerror = function (e) { reject(e.target.error); };
          } catch (err) { reject(err); }
        });
      }).catch(function () { return null; });
    },

    removeZipFile: function (key) {
      return getDb().then(function (db) {
        return new Promise(function (resolve, reject) {
          try {
            var tx = db.transaction(IDB_STORE, "readwrite");
            var store = tx.objectStore(IDB_STORE);
            var req = store.delete(key);
            req.onsuccess = function () { resolve(); };
            req.onerror = function (e) { reject(e.target.error); };
          } catch (err) { reject(err); }
        });
      }).catch(function () {});
    }
  };

  /* IndexedDB helper for storing local binaries */
  var IDB_NAME = "woc_storage_v1";
  var IDB_STORE = "zips";
  function getDb() {
    return new Promise(function (resolve, reject) {
      if (typeof window === "undefined" || !window.indexedDB) return reject(new Error("IndexedDB not available"));
      var req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: "key" });
        }
      };
      req.onsuccess = function (e) { resolve(e.target.result); };
      req.onerror = function (e) { reject(e.target.error); };
    });
  }

  window.Store = Store;
})();
