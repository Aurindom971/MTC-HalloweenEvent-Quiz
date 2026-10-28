/* =========================================================
   Judges' Board — every team's soul, curse, hex and twist,
   live from the shared ledger (or this browser in local mode).
   ========================================================= */

(function () {
  "use strict";

  var D = window.CURSE_DATA, L = window.Ledger;
  var $ = function (id) { return document.getElementById(id); };
  var filter = "all", query = "";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function charById(id) { return D.characters.filter(function (c) { return c.id === id; })[0] || null; }
  function fmt(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000)), m = Math.floor(s / 60); s %= 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }
  function time(ms) { return ms ? new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""; }

  /** Merge team progress with the claim ledger into one record per team. */
  function collect() {
    var byKey = {};
    L.teams().forEach(function (t) { byKey[t.key] = Object.assign({}, t); });
    L.entries().forEach(function (e) {
      var key = e.teamKey || L.teamKey(e.team || "");
      var t = byKey[key] || (byKey[key] = { key: key, name: e.team, at: e.at });
      if (!t.charId) t.charId = e.charId;
      if (typeof t.problem !== "number") t.problem = e.problem;
      if (typeof t.hex !== "number" && typeof e.hex === "number") { t.hex = e.hex; t.hexAt = e.hexAt; }
      if (typeof t.twist !== "number" && typeof e.twist === "number") { t.twist = e.twist; t.twistText = e.twistText; }
      if (!t.submissionUrl && e.submissionUrl) {
        t.submissionUrl = e.submissionUrl;
        t.repoUrl = e.repoUrl;
        t.submittedAt = e.submittedAt;
      }
      if (!t.zipUrl && e.zipUrl) t.zipUrl = e.zipUrl;
      if (!t.zipName && e.zipName) t.zipName = e.zipName;
      if (!t.zipCloudUrl && e.zipCloudUrl) t.zipCloudUrl = e.zipCloudUrl;
    });
    return Object.keys(byKey).map(function (k) { return byKey[k]; })
      .sort(function (a, b) { return (a.at || 0) - (b.at || 0); });
  }

  function statusOf(t) {
    if (t.submissionUrl) return "submitted";
    if (typeof t.twist === "number") return "done";
    if (typeof t.hex === "number") return "waiting";
    return "spinning";
  }

  function card(t, n) {
    var c = charById(t.charId);
    var p = c && typeof t.problem === "number" ? c.problems[t.problem] : null;
    var h = typeof t.hex === "number" ? D.uiCurses[t.hex] : null;
    var tw = typeof t.twist === "number" ? D.twists[t.twist] : null;
    var st = statusOf(t);
    var badge = st === "submitted" ? "Submitted"
      : st === "done" ? "Twist revealed"
      : st === "waiting" ? (t.unlockAt && t.unlockAt > Date.now() ? "Twist in " + fmt(t.unlockAt - Date.now()) : "Twist awake")
      : c ? "Spinning…" : "Signed in";

    function row(cls, label, title, text, glyph, extra) {
      return '<div class="trow ' + cls + '"><span class="trow-label">' + label + "</span><div>" +
        (title ? '<p class="trow-title">' + (glyph ? '<span class="g">' + esc(glyph) + "</span>" : "") + esc(title) + "</p>" : '<p class="trow-title pending">Not spun yet</p>') +
        (text ? '<p class="trow-text">' + esc(text) + "</p>" : "") +
        (extra ? extra : "") +
        "</div></div>";
    }

    var rosterHtml = "";
    if (t.leader && t.leader.name) {
      var ldrMeta = [t.leader.year, t.leader.branch].filter(Boolean).map(esc).join(" · ");
      var ldrStr = esc(t.leader.name) + (ldrMeta ? ' <span class="roster-meta">[' + ldrMeta + "]</span>" : "");
      var memStrs = (t.members || []).map(function (m) {
        var mMeta = [m.year, m.branch].filter(Boolean).map(esc).join(" · ");
        return esc(m.name) + (mMeta ? ' <span class="roster-meta">[' + mMeta + "]</span>" : "");
      });
      rosterHtml = '<div class="trow roster"><span class="trow-label">Roster</span><div>' +
        '<p class="trow-title"><span class="g">👑</span>' + ldrStr + '</p>' +
        (memStrs.length ? '<p class="trow-text roster-members"><span class="g">👥</span>' + memStrs.join(" · ") + '</p>' : "") +
        '</div></div>';
    }

    return '<article class="tcard" style="--c:' + (c ? c.color : "#bf9f93") + '">' +
      '<header class="tcard-head"><span class="tcard-num">#' + n + '</span><h2 class="tcard-name">' + esc(t.name) + '</h2><span class="badge ' + st + '">' + esc(badge) + "</span></header>" +
      rosterHtml +
      row("soul", "Soul", c && c.name, c && c.lore, c && c.glyph) +
      row("curse", "Curse", p && p.t, p && p.d) +
      row("hex", "Hex", h && h.t, h && h.d, h && h.glyph, h && h.mustHave ? '<div class="hex-must-have-badge"><strong>Must-Have:</strong> ' + esc(h.mustHave) + '</div>' : '') +
      (typeof t.twist === "number" ?
        (row("twist", "Twist 1 (Wheel)", tw && tw.t, tw && (t.twistText || tw.d), tw && tw.glyph) +
         row("twist-sponsor", "Twist 2 (Sponsor)", "🌀 The Alliance Protocol · KAPIDHWAJ", "Compulsory: Creatively integrate @kapidhwaj.innovations on Instagram into the world & theme.", "🌀")) :
        row("twist", "Twist", null, null, null)) +
      (t.submissionUrl ? '<div class="trow submission"><span class="trow-label">Project</span><div>' +
        '<a class="judge-live-btn" href="' + esc(t.submissionUrl) + '" target="_blank" rel="noopener">🌐 Open Live Website ↗</a>' +
        (t.repoUrl ? ' <a class="judge-repo-btn" href="' + esc(t.repoUrl) + '" target="_blank" rel="noopener">📁 GitHub ↗</a>' : "") +
        (t.zipUrl ? ' <a class="judge-zip-btn" href="' + esc(t.zipUrl) + '" target="_blank" rel="noopener" download="' + esc(t.zipName || "project-source.zip") + '">📦 Source ZIP ⤓</a>' : "") +
        (t.zipCloudUrl ? ' <a class="judge-zip-cloud-btn" href="' + esc(t.zipCloudUrl) + '" target="_blank" rel="noopener">☁️ Cloud ZIP ↗</a>' : "") +
        (t.submittedAt ? '<span class="judge-sub-time">Submitted ' + time(t.submittedAt) + (t.zipName ? ' · ' + esc(t.zipName) : '') + '</span>' : "") +
        '</div></div>' : (st === "done" ? '<div class="trow submission pending"><span class="trow-label">Project</span><p class="trow-title pending">Awaiting submission…</p></div>' : "")) +
      (!D.eggsEnabled ? "" : (function () {
        var eggs = (t.eggs || []).filter(function (id) { return D.eggs && D.eggs[id]; });
        var total = Object.keys(D.eggs || {}).length;
        return '<div class="trow bonus"><span class="trow-label">Bonus</span><div><p class="trow-title"><span class="g">🎃</span>' + eggs.length + " / " + total + " hidden pumpkins</p>" +
          (eggs.length ? '<p class="trow-text">' + eggs.map(function (id) { return esc(D.eggs[id]); }).join(" · ") + "</p>" : "") + "</div></div>";
      })()) +
      '<div class="tcard-foot">Signed in ' + time(t.at) + (t.hexAt ? " · hex " + time(t.hexAt) : "") + "</div>" +
      "</article>";
  }

  function render() {
    var teams = collect();
    var counts = { all: teams.length, spinning: 0, waiting: 0, done: 0, submitted: 0 };
    teams.forEach(function (t) { counts[statusOf(t)]++; });
    $("stats").innerHTML =
      '<div class="bstat"><b>' + counts.all + "</b><span>Teams</span></div>" +
      '<div class="bstat"><b>' + counts.spinning + "</b><span>Still spinning</span></div>" +
      '<div class="bstat"><b>' + counts.waiting + "</b><span>Twist chained</span></div>" +
      '<div class="bstat"><b>' + counts.done + "</b><span>Twist revealed</span></div>" +
      '<div class="bstat"><b>' + counts.submitted + "</b><span>Submitted</span></div>";

    var q = query.toLowerCase();
    var html = teams.map(function (t, i) { return { t: t, n: i + 1 }; }).filter(function (x) {
      if (filter !== "all" && statusOf(x.t) !== filter) return false;
      if (!q) return true;
      var c = charById(x.t.charId) || {};
      var p = c.problems && typeof x.t.problem === "number" ? c.problems[x.t.problem] : {};
      var ldr = x.t.leader ? [x.t.leader.name, x.t.leader.year, x.t.leader.branch].join(" ") : "";
      var mems = (x.t.members || []).map(function (m) { return [m.name, m.year, m.branch].join(" "); }).join(" ");
      var hay = [x.t.name, ldr, mems, c.name, p && p.t, typeof x.t.hex === "number" ? D.uiCurses[x.t.hex].t : "", typeof x.t.twist === "number" ? D.twists[x.t.twist].t : ""].join(" ").toLowerCase();
      return hay.indexOf(q) >= 0;
    }).map(function (x) { return card(x.t, x.n); }).join("");

    $("grid").innerHTML = html;
    $("empty").hidden = teams.length > 0;
    $("boardSub").textContent = L.mode === "cloud"
      ? "Every team's soul, curse, hex and twist — updated live from every phone."
      : "Single-device mode: showing the teams that spun on this browser only.";
  }

  function renderStatus() {
    var crypt = $("crypt");
    crypt.hidden = L.mode !== "cloud";
    crypt.setAttribute("data-state", L.status);
    $("cryptText").textContent = { connecting: "Summoning The Other Side…", online: "Live", offline: "Offline — reconnecting", error: "The Other Side Unreachable" }[L.status] || L.status;
  }

  var queued = false;
  L.onChange(function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; renderStatus(); if (unlocked()) render(); });
  });

  $("search").addEventListener("input", function () { query = this.value.trim(); render(); });
  $("chips").addEventListener("click", function (e) {
    var b = e.target.closest("[data-filter]");
    if (!b) return;
    filter = b.getAttribute("data-filter");
    Array.prototype.forEach.call(this.querySelectorAll(".chip"), function (c) { c.classList.toggle("is-on", c === b); });
    render();
  });
  $("printBtn").addEventListener("click", function () { window.print(); });

  // keep the "twist in mm:ss" badges ticking
  setInterval(function () { if (!document.hidden && unlocked()) render(); }, 5000);

  /* ---------- the sealed door ---------- */
  function unlocked() { return window.Store.judgePass() === D.judgeKey; }
  var lock = $("judgeLock");
  if (!unlocked()) {
    lock.hidden = false;
    $("grid").innerHTML = "";
    setTimeout(function () { $("judgeLockInput").focus(); }, 50);
  }
  $("judgeLockForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (window.Store.secret($("judgeLockInput").value) !== D.judgeKey) {
      $("judgeLockErr").textContent = "The door does not move.";
      $("judgeLockInput").select();
      return;
    }
    window.Store.setJudgePass(D.judgeKey);
    lock.hidden = true;
    render();
  });

  renderStatus();
  if (unlocked()) render();
})();
