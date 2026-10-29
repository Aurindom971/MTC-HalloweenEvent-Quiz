/* =========================================================
   Easter eggs — secrets for the curious (see README).
   1. ↑ ↑ ↓ ↓ ← → ← → B A     the blood moon rises
   2. type  boo                 a ghost answers
   3. type  mtc                 the club logo is cursed too
   4. click the moon 3×         something walks across it
   5. click the lit window      someone is home
   6. click the eye 7× (when the wheel can't spin)   it weeps blood
   7. poke your soul's portrait 5×   it does NOT like that
   8. triple-click the title    it isn't the title any more
   9. visit between 12 and 1 AM  the witching hour
   10. leave the page alone for 3 minutes   something checks on you

   BONUS POINTS (saved to the team, shown on the judges' board):
   six hidden pumpkins between words around the site, the blood
   moon (1), poking the moon (4), and the word hidden in the page
   source (a riddle in the comment at the top of index.html).
   ========================================================= */

(function () {
  "use strict";

  // switched off for now (CURSE_DATA.eggsEnabled in js/data.js)
  if (!window.CURSE_DATA || !window.CURSE_DATA.eggsEnabled) return;

  function S() { return window.Sound || {}; }
  function C() { return window.Creatures || { show: function () {} }; }

  /* ---------- a whisper of text ---------- */
  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "egg-toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.remove("show"); void toastEl.offsetWidth; toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 3800);
  }

  function inField(e) {
    var t = e.target;
    return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
  }

  /* ---------- typed secrets ---------- */
  /* ---------- bonus points ---------- */
  function claim(id) { return window.App ? window.App.claimEgg(id) : "no-app"; }

  // hidden pumpkins, tucked between words all over the site
  document.addEventListener("click", function (e) {
    var p = e.target.closest && e.target.closest(".egg");
    if (!p) return;
    e.preventDefault();
    e.stopPropagation();
    var r = claim(p.getAttribute("data-egg"));
    if (r === "ok" || r === "dupe") p.classList.add("taken");
  }, true);
  // pumpkins this team already found stay gone
  setTimeout(function () {
    Array.prototype.forEach.call(document.querySelectorAll(".egg"), function (p) {
      if (window.App && window.App.hasEgg(p.getAttribute("data-egg"))) p.style.display = "none";
    });
  }, 1500);

  var KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  var keys = [], typed = "", longTyped = "";
  // fingerprint of the word hidden in the page source (see the comment at the top of index.html)
  var SOURCE_WORD = "w50x59gmzj";

  document.addEventListener("keydown", function (e) {
    if (inField(e)) return;
    var k = (e.key || "").toLowerCase();
    keys.push(k); if (keys.length > KONAMI.length) keys.shift();
    if (keys.join(",") === KONAMI.join(",")) { keys = []; bloodMoon(); claim("konami"); return; }
    if (k.length === 1) {
      longTyped = (longTyped + k).slice(-9);
      if (longTyped.length === 9 && window.Store && window.Store.secret(longTyped) === SOURCE_WORD) {
        longTyped = "";
        if (S().farBell) S().farBell();
        if (S().laugh) S().laugh(true);
        C().show("flyers");
        claim("source");
      }
      typed = (typed + k).slice(-6);
      if (/boo$/.test(typed)) { typed = ""; C().show("pass"); if (S().whisper) S().whisper(); toast("…boo yourself."); }
      if (/mtc$/.test(typed)) { typed = ""; cursedLogo(); }
    }
  });

  function bloodMoon() {
    if (document.body.classList.contains("blood-moon")) return;
    document.body.classList.add("blood-moon");
    toast("The blood moon rises…");
    if (S().dread) S().dread();
    if (S().laugh) setTimeout(function () { S().laugh(true); }, 1800);
    setTimeout(function () { C().show("moon"); }, 1200);
    setTimeout(function () { document.body.classList.remove("blood-moon"); }, 15000);
  }

  function cursedLogo() {
    var mark = document.querySelector(".brand-mark");
    if (!mark) return;
    mark.classList.add("cursed");
    toast("The club is cursed too.");
    if (S().theremin) S().theremin();
    setTimeout(function () { mark.classList.remove("cursed"); }, 8000);
  }

  /* ---------- clicks on the scenery ---------- */
  // The scenery ignores the pointer (so it never blocks the game), so we
  // check whether a click on empty space landed on the moon or the window.
  var moonClicks = [];
  function within(r, x, y, pad) { return r && x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad; }

  document.addEventListener("click", function (e) {
    if (e.target.closest("button, a, input, label, .panel, .modal, .reveal, .gate")) return;
    var x = e.clientX, y = e.clientY;
    var moon = document.querySelector(".moon");
    if (moon && within(moon.getBoundingClientRect(), x, y, 0)) {
      var now = Date.now();
      moonClicks = moonClicks.filter(function (t) { return now - t < 2500; });
      moonClicks.push(now);
      if (moonClicks.length >= 3) {
        moonClicks = [];
        C().show("moon");
        if (claim("moon") !== "ok") toast("Stop poking the moon. It pokes back.");
      }
      return;
    }
    var win = document.querySelector(".graveyard .windows");
    if (win && within(win.getBoundingClientRect(), x, y, 10)) {
      C().show("window");
      if (S().creak) S().creak();
      toast("Someone is home.");
    }
  });

  /* ---------- the eye weeps ---------- */
  // (a disabled button swallows clicks, so the hub lets them fall through to
  // the wheel and we check whether they landed on the eye)
  var eyeClicks = [];
  var stage = document.getElementById("wheelStage");
  if (stage) stage.addEventListener("click", function (e) {
    var hub = document.getElementById("hub");
    if (!hub || !hub.disabled) return;
    var r = hub.getBoundingClientRect();
    var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    if (Math.sqrt(dx * dx + dy * dy) > r.width / 2) return;
    var now = Date.now();
    eyeClicks = eyeClicks.filter(function (t) { return now - t < 3000; });
    eyeClicks.push(now);
    if (eyeClicks.length >= 7) {
      eyeClicks = [];
      hub.classList.add("weeping");
      toast("Stop staring at me.");
      if (S().whisper) S().whisper();
      setTimeout(function () { hub.classList.remove("weeping"); }, 9000);
    }
  });

  /* ---------- don't poke the soul ---------- */
  var pokes = [];
  var face = document.getElementById("spinnerFace");
  if (face) face.addEventListener("click", function () {
    var now = Date.now();
    pokes = pokes.filter(function (t) { return now - t < 3000; });
    pokes.push(now);
    face.classList.remove("poked"); void face.offsetWidth; face.classList.add("poked");
    if (pokes.length >= 5) {
      pokes = [];
      var line = document.getElementById("spinnerLine");
      if (line) line.textContent = "Poke me again. I dare you.";
      if (S().groan) S().groan(0);
      if (S().dread) S().dread();
      document.body.classList.add("quake");
      setTimeout(function () { document.body.classList.remove("quake"); }, 600);
    }
  });

  /* ---------- the title changes ---------- */
  var title = document.querySelector(".title");
  if (title) title.addEventListener("click", function (e) {
    if (e.detail !== 3 || title.classList.contains("help")) return;
    title.classList.add("help");
    if (S().radio) S().radio();
    setTimeout(function () { title.classList.remove("help"); }, 2600);
  });

  /* ---------- the witching hour ---------- */
  if (new Date().getHours() === 0) {
    document.body.classList.add("witching");
    setTimeout(function () { toast("It's the witching hour. Everything is awake."); }, 6000);
  }

  /* ---------- are you still there? ---------- */
  var lastAct = Date.now(), asked = false;
  ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, function () { lastAct = Date.now(); asked = false; }, { passive: true });
  });
  setInterval(function () {
    if (asked || document.hidden || Date.now() - lastAct < 180000) return;
    asked = true;
    var w = document.createElement("div");
    w.className = "still-there";
    w.textContent = "…are you still there?";
    document.body.appendChild(w);
    if (S().breath) S().breath();
    setTimeout(function () { w.remove(); }, 7000);
  }, 5000);

  window.Eggs = { toast: toast };
})();
