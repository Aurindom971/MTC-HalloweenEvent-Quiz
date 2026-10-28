/* =========================================================
   Creatures — shadow figures, seen mostly in the lightning.
   • when the lightning cracks, figures stand silhouetted on
     the hill — gone when the flash dies
   • sometimes one comes closer with every flash
   • a reaper glides across the sky
   • a zombie crosses in front of the moon
   • someone stands in the haunted-house window
   Big moments: opening(), impatience(), jumpscare(), awaken().
   setMood("tense") (twist wheel chained) = more often.

   The art is CC0 silhouette clipart from openclipart.org, in
   assets/figures/ and listed in CURSE_DATA.shadowFigures
   (js/data.js). Every figure is drawn pure black, so any
   transparent PNG/SVG can be swapped in.
   ========================================================= */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var front, back, mood = "calm", scaresOn = true, isBusy = function () { return false; };
  var peekTimer = null, scareTimer = null, lastPeek = "";

  /* ---------- the figures ---------- */

  var F = (window.CURSE_DATA && window.CURSE_DATA.shadowFigures) || {};
  var GROUND = F.ground || [], SKY = F.sky || [];
  function fig(name) {
    var all = GROUND.concat(SKY);
    for (var i = 0; i < all.length; i++) if (all[i].name === name) return all[i];
    return all[0];
  }
  // who looms when a character loses patience (anything not listed: a random one)
  var LOOMS = {
    keeper: "contorted", victor: "nosferatu-stand", monster: "zombie-shambler",
    zombie: "zombie-shambler", mummy: "zombie-shambler", reaper: "reaper", ghost: "contorted",
    skeleton: "crawler", invisible: "nosferatu-stand", witch: "contorted", scarecrow: "contorted"
  };
  var CLOSE_UP = ["nosferatu-reach", "nosferatu-stand", "contorted", "zombie-shambler"];

  /* ---------- helpers ---------- */

  function figEl(cls, f) {
    var d = document.createElement("div");
    d.className = "creature figure " + cls;
    var i = document.createElement("img");
    i.src = f.src; i.alt = ""; i.decoding = "async"; i.draggable = false;
    d.appendChild(i);
    return d;
  }
  function spawn(host, node, ms) {
    host.appendChild(node);
    setTimeout(function () { node.remove(); }, ms);
    return node;
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function S() { return window.Sound || {}; }
  function strike() { if (window.FX && window.FX.strike) window.FX.strike(true); }
  function preload() { GROUND.concat(SKY).forEach(function (f) { var i = new Image(); i.src = f.src; }); }

  /* ---------- the lightning reveal ---------- */

  // Figures standing in the graveyard. They're always pitch black, so they
  // can only be seen while the flash lights the sky behind them (--lit).
  function revealInFlash(min, max) {
    var horde = document.getElementById("horde") || front;
    if (!horde || reduceMotion || !GROUND.length) return;
    var n = min + Math.floor(Math.random() * (max - min + 1));
    var slots = [];
    for (var i = 0; i < n; i++) {
      var x;
      do { x = rnd(2, 88); } while (slots.some(function (s) { return Math.abs(s - x) < 10; }) && slots.length < 7);
      slots.push(x);
      var f = pick(GROUND);
      var node = figEl("flashed" + (Math.random() < 0.5 ? " flip" : ""), f);
      node.style.setProperty("--x", x + "vw");
      node.style.setProperty("--h", (rnd(16, 30) * (f.scale || 1)) + "vh");
      node.style.setProperty("--b", rnd(5, 13) + "vh");
      spawn(horde, node, 1200);
    }
  }
  window.addEventListener("woc:lightning", function () {
    if (Math.random() < 0.85) revealInFlash(2, 5);
  });

  /* ---------- appearances ---------- */

  var peeks = {
    // a reaper glides across the sky
    flyers: function () {
      if (!SKY.length) return;
      var rtl = Math.random() < 0.5;
      var n = Math.random() < 0.25 ? 2 : 1;
      for (var i = 0; i < n; i++) {
        var w = figEl("flyer" + (rtl ? " rtl" : ""), pick(SKY));
        w.style.setProperty("--y", rnd(6, 26) + "vh");
        w.style.setProperty("--fh", rnd(70, 120) + "px");
        w.style.setProperty("--d", rnd(13, 19) + "s");
        w.style.animationDelay = (i * rnd(1.2, 2.4)) + "s";
        spawn(front, w, 24000);
      }
      if (S().whisper) setTimeout(function () { S().whisper(); }, 1200);
    },
    // a zombie crosses in front of the moon
    moon: function () {
      var m = document.querySelector(".moon");
      var r = m && m.getBoundingClientRect();
      if (!r || r.width < 40) return peeks.flyers();
      var z = figEl("moonwalker", fig("zombie-shambler"));
      z.style.top = (r.top + r.height * 0.32) + "px";
      z.style.left = (r.left - r.width * 0.3) + "px";
      z.style.height = (r.height * 0.78) + "px";
      z.style.setProperty("--w", (r.width * 1.6) + "px");
      spawn(front, z, 20000);
      if (S().groan) setTimeout(function () { S().groan(0.7); }, 3000);
    },
    // someone is standing in the lit window of the haunted house
    window: function () {
      var w = document.querySelector(".graveyard .w1");
      var r = w && w.getBoundingClientRect();
      if (!r || r.width < 2) return peeks.flyers();
      var box = document.createElement("div");
      box.className = "creature in-window";
      box.style.left = r.left + "px"; box.style.top = r.top + "px";
      box.style.width = r.width + "px"; box.style.height = r.height + "px";
      box.appendChild(figEl("", fig("nosferatu-stand")));
      spawn(back, box, 9000);
      if (S().theremin) setTimeout(function () { S().theremin(); }, 600);
    },
    // flash… it's on the hill. Flash… it's closer. Flash… it's HERE.
    approach: function () {
      var horde = document.getElementById("horde");
      if (!horde || !GROUND.length) return;
      var f = fig(pick(CLOSE_UP));
      var x = rnd(12, 70), flip = Math.random() < 0.5 ? " flip" : "";
      [[16, 12, 0], [34, 4, 1500], [80, -14, 2800]].forEach(function (s, i) {
        setTimeout(function () {
          if (document.hidden) return;
          strike();
          var node = figEl("flashed near" + flip, f);
          node.style.setProperty("--x", (x - i * 6) + "vw");
          node.style.setProperty("--h", s[0] * (f.scale || 1) + "vh");
          node.style.setProperty("--b", s[1] + "vh");
          spawn(horde, node, 1000);
        }, s[2]);
      });
      if (S().breath) setTimeout(function () { S().breath(); }, 3300);
    },
    // a sudden flash out of nowhere — and they're standing there
    lightning: function () {
      if (window.FX && window.FX.strike) window.FX.strike();
    }
  };
  var WEIGHTS = ["flyers", "lightning", "lightning", "approach", "moon", "window"];

  function peek() {
    if (document.hidden || isBusy()) return;
    var names = WEIGHTS.filter(function (n) { return n !== lastPeek; });
    if (reduceMotion) names = ["window"];
    var name = pick(names);
    lastPeek = name;
    peeks[name]();
  }

  function schedulePeek() {
    clearTimeout(peekTimer);
    var wait = mood === "tense" ? rnd(12000, 24000) : rnd(18000, 34000);
    peekTimer = setTimeout(function () { peek(); schedulePeek(); }, wait);
  }

  function scheduleScare() {
    clearTimeout(scareTimer);
    if (mood !== "tense") return;
    scareTimer = setTimeout(function () {
      if (!document.hidden && !isBusy()) Creatures.jumpscare();
      scheduleScare();
    }, rnd(240000, 420000));
  }

  /* ---------- lights ---------- */

  function blackout(pattern, cb) {
    var b = document.createElement("div");
    b.className = "blackout";
    document.body.appendChild(b);
    var i = 0;
    (function next() {
      if (i >= pattern.length) { b.remove(); if (cb) cb(); return; }
      b.style.opacity = pattern[i][0];
      setTimeout(next, pattern[i++][1]);
    })();
    return b;
  }
  function flash() {
    var f = document.createElement("div");
    f.className = "scare-flash";
    document.body.appendChild(f);
    setTimeout(function () { f.remove(); }, 700);
  }
  function shake() {
    document.body.classList.remove("quake"); void document.body.offsetWidth;
    document.body.classList.add("quake");
    setTimeout(function () { document.body.classList.remove("quake"); }, 600);
  }

  // A full-screen dark stage for the big moments: grain, a cold light from
  // below, and one figure that the code moves closer step by step.
  function stage(color) {
    var st = document.createElement("div");
    st.className = "scare-stage";
    st.style.setProperty("--c", color || "#ff9a85");
    st.innerHTML = '<div class="scare-light"></div><div class="scare-grain"></div>';
    document.body.appendChild(st);
    return st;
  }
  // The face at the door (CURSE_DATA.welcomeScare). Loaded and decoded while
  // the gate is still up, so it is on screen the very frame it hits.
  var FACE = (window.CURSE_DATA && window.CURSE_DATA.welcomeScare) || "";
  var faceImg = null;
  if (FACE) {
    faceImg = new Image();
    faceImg.src = FACE; faceImg.alt = ""; faceImg.draggable = false;
    if (faceImg.decode) faceImg.decode().catch(function () {});
  }
  function buzz(pattern) {
    try {
      var ua = navigator.userActivation;   // phones refuse to buzz before the first tap
      if (navigator.vibrate && (!ua || ua.hasBeenActive)) navigator.vibrate(pattern);
    } catch (e) {}
  }

  // place the figure: h = height in vh, y = how far its feet sit below the screen
  function pose(node, h, x, y, blur) {
    node.style.setProperty("--h", h + "vh");
    node.style.setProperty("--x", x + "vw");
    node.style.setProperty("--y", y + "vh");
    node.style.setProperty("--blur", (blur || 0) + "px");
  }

  /* ---------- SOUL JUMPSCARE VIDEOS & HELPERS ---------- */

  /**
   * Map of character IDs to their jumpscare video assets in 'soul jumpscares/'
   */
  var CHARACTER_SCARE_VIDEOS = {
    "annabelle": "soul jumpscares/ANNABELLE.mp4",
    "deadpool": "soul jumpscares/DEADPOOL.mp4",
    "kirmada": "soul jumpscares/KIRMADA.mp4",
    "manjulika": "soul jumpscares/MONJULIKA.mp4",
    "monjulika": "soul jumpscares/MONJULIKA.mp4",
    "pennywise": "soul jumpscares/PENNYWISE.mp4",
    "spiderman": "soul jumpscares/SPIDERMAN.mp4",
    "stree": "soul jumpscares/STREE.mp4",
    "thanos": "soul jumpscares/VALAK.mp4",
    "valak": "soul jumpscares/VALAK.mp4",
    "voldemort": "soul jumpscares/VOLDEMORT.mp4",
    "wednesday": "soul jumpscares/WEDNESDAY.mp4"
  };

  function getScareVideo(ch) {
    if (!ch) return null;
    if (ch.video) return ch.video;
    var cfg = ((window.CURSE_DATA && window.CURSE_DATA.characterScares) || {})[ch.id] || {};
    if (cfg.video) return cfg.video;
    var normId = String(ch.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return CHARACTER_SCARE_VIDEOS[normId] || CHARACTER_SCARE_VIDEOS[ch.id] || null;
  }

  var preloadedCharId = null;
  function preloadScare(ch) {
    if (!ch || !scaresOn || reduceMotion) return;
    var videoSrc = getScareVideo(ch);
    if (!videoSrc) return;
    try {
      var video = document.getElementById("scareVideoPlayer");
      if (video && preloadedCharId !== ch.id) {
        preloadedCharId = ch.id;
        video.src = encodeURI(videoSrc);
        video.preload = "auto";
        video.load();
      }
    } catch (e) {
      console.warn("Preload scare video error:", e);
    }
  }

  function legacyCharacterScare(ch, done) {
    done = done || function () {};
    var cfg = ((window.CURSE_DATA && window.CURSE_DATA.characterScares) || {})[ch.id] || {};
    var st = stage(ch.color);

    var eyes = document.createElement("div");
    eyes.className = "char-eyes";
    eyes.innerHTML = "<i></i><i></i>";

    var face = document.createElement("div");
    face.className = "char-face";
    if (cfg.image) {
      var im = document.createElement("img");
      im.src = cfg.image; im.alt = ""; im.draggable = false;
      face.appendChild(im);
    } else {
      var g = document.createElement("span");
      g.textContent = ch.glyph;
      face.appendChild(g);
    }
    function size(s, blur) { face.style.setProperty("--s", s); face.style.setProperty("--blur", (blur || 0) + "px"); }
    size(0.16, 3);

    var cap = document.createElement("div");
    cap.className = "char-line";
    var nm = document.createElement("b"); nm.textContent = ch.name;
    var ln = document.createElement("span"); ln.textContent = cfg.line || "";
    cap.appendChild(nm); cap.appendChild(ln);

    st.appendChild(eyes); st.appendChild(face); st.appendChild(cap);
    st.classList.add("on", "cut");
    if (S().breath) S().breath();

    var t = 0;
    function at(ms, fn) { t += ms; setTimeout(fn, t); }
    at(500, function () { eyes.classList.add("show"); });
    at(900, function () { eyes.classList.remove("show"); face.classList.add("show"); st.classList.remove("cut"); });
    at(700, function () { st.classList.add("cut"); });
    at(90, function () { size(0.5, 1); st.classList.remove("cut"); });
    at(650, function () { st.classList.add("cut"); });
    at(100, function () {
      st.classList.remove("cut");
      face.classList.add("lunge");
      st.classList.add("hit");
      var snd = S()[cfg.sound] || S().scream;
      if (snd) snd.call(window.Sound);
      if (cfg.sound && cfg.sound !== "scream" && S().scream) setTimeout(function () { S().scream(); }, 120);
      flash(); shake();
    });
    at(300, function () { cap.classList.add("show"); });
    at(1500, function () { st.classList.add("out"); });
    at(420, function () { st.remove(); done(); });
  }

  function playVideoScare(ch, done) {
    done = done || function () {};
    if (typeof ch === "string") {
      var cList = (window.CURSE_DATA && window.CURSE_DATA.characters) || [];
      var found = null;
      for (var i = 0; i < cList.length; i++) {
        if (cList[i].id === ch) { found = cList[i]; break; }
      }
      ch = found || { id: ch, name: ch, color: "#c1121f" };
    }
    if (!ch) { done(); return; }

    var videoSrc = getScareVideo(ch);
    if (!videoSrc) {
      legacyCharacterScare(ch, done);
      return;
    }

    var layer = document.getElementById("scareVideoLayer");
    var video = document.getElementById("scareVideoPlayer");
    var skipBtn = document.getElementById("scareVideoSkip");

    if (!layer || !video) {
      legacyCharacterScare(ch, done);
      return;
    }

    layer.style.setProperty("--scare-accent", ch.color || "#c1121f");

    var isFinished = false;
    var safetyTimer = null;
    var keyListener = null;

    function cleanup() {
      if (keyListener) {
        document.removeEventListener("keydown", keyListener);
        keyListener = null;
      }
      if (skipBtn) skipBtn.onclick = null;
      if (layer) layer.onclick = null;
      if (safetyTimer) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
      }
      video.onended = null;
      video.onerror = null;
    }

    function finish() {
      if (isFinished) return;
      isFinished = true;
      cleanup();

      shake();
      if (window.FX && window.FX.strike) window.FX.strike();

      layer.classList.remove("impact");
      layer.classList.add("fade-out");

      setTimeout(function () {
        try {
          video.pause();
          video.currentTime = 0;
          video.removeAttribute("src");
          video.load();
        } catch (e) {}

        layer.hidden = true;
        layer.classList.remove("is-active", "fade-out");
        preloadedCharId = null;

        done();
      }, 300);
    }

    if (skipBtn) {
      skipBtn.onclick = function (e) {
        e.stopPropagation();
        finish();
      };
    }

    keyListener = function (e) {
      if (e.key === "Escape" || e.key === " " || e.code === "Space") {
        e.preventDefault();
        finish();
      }
    };
    document.addEventListener("keydown", keyListener);

    layer.onclick = function (e) {
      if (e.target !== skipBtn && !skipBtn.contains(e.target)) {
        finish();
      }
    };

    var encodedSrc = encodeURI(videoSrc);
    if (!video.src || !video.src.includes(encodedSrc)) {
      video.src = encodedSrc;
      video.preload = "auto";
      video.load();
    }

    var soundEnabled = (!window.Sound || window.Sound.enabled !== false);
    video.muted = !soundEnabled;
    video.volume = 1.0;

    video.onended = function () {
      finish();
    };

    video.onerror = function (err) {
      console.warn("Jumpscare video error, falling back to legacy DOM scare:", err);
      cleanup();
      layer.hidden = true;
      layer.classList.remove("is-active");
      legacyCharacterScare(ch, done);
    };

    layer.hidden = false;
    layer.classList.remove("fade-out");
    void layer.offsetWidth;
    layer.classList.add("is-active", "impact");

    shake();
    if (window.Sound && window.Sound.cutsceneImpact) {
      window.Sound.cutsceneImpact();
    }

    var playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(function (err) {
        console.warn("Autoplay with audio blocked, fallback to muted video + WebAudio scream:", err);
        video.muted = true;
        video.play().catch(function (err2) {
          console.error("Playback failed entirely:", err2);
          finish();
        });
        if (window.Sound && window.Sound.scream) {
          window.Sound.scream();
        }
      });
    }

    // Safety timeout: all videos are 8-10s
    safetyTimer = setTimeout(function () {
      finish();
    }, 11500);
  }

  /* ---------- the big moments ---------- */

  var Creatures = {
    init: function (opts) {
      front = document.getElementById("creatures");
      back = document.getElementById("shadows");
      if (opts && opts.isBusy) isBusy = opts.isBusy;
      preload();
      schedulePeek();
    },

    setScares: function (on) { scaresOn = !!on; },
    get scaresOn() { return scaresOn; },

    setMood: function (m) {
      if (m === mood) return;
      mood = m;
      schedulePeek();
      scheduleScare();
    },

    peek: peek,
    show: function (name) { if (peeks[name]) peeks[name](); },

    /** On entering: a laugh in the dark, the lights stutter, lightning — and they're out there. */
    opening: function () {
      if (S().laugh) S().laugh(true);
      if (reduceMotion) { peeks.window(); return; }
      blackout([[0.95, 140], [0.3, 110], [0.97, 200], [0.4, 90], [0.98, 380], [0, 10]], function () {
        strike();
        revealInFlash(4, 6);
      });
      setTimeout(peeks.flyers, 2600);
      setTimeout(peeks.window, 4200);
    },

    /**
     * The team's soul has had enough. The lights die, its shadow stands in
     * the dark… the lights stutter and it's closer… then it lunges, and spins.
     * who = { id, color } from the spinner.
     */
    impatience: function (who, done) {
      if (reduceMotion) { if (done) done(); return; }
      who = who || {};
      var f = fig(LOOMS[who.id] || pick(CLOSE_UP));
      var st = stage(who.color);
      var node = figEl("loomer" + (Math.random() < 0.5 ? " flip" : ""), f);
      var sc = f.scale || 1;
      pose(node, 34 * sc, 50, -2, 1);
      st.appendChild(node);
      if (S().monsterTheme) S().monsterTheme();
      if (S().breath) S().breath();

      var t = 0;
      function at(ms, fn) { t += ms; setTimeout(fn, t); }
      at(60, function () { st.classList.add("on"); node.classList.add("seen"); });
      at(900, function () { st.classList.add("cut"); });                        // lights die…
      at(140, function () { pose(node, 70 * sc, rnd(42, 58), 8, 2); st.classList.remove("cut"); });
      at(700, function () { st.classList.add("cut"); });
      at(110, function () {
        pose(node, 140 * sc, 50, 32, 5);
        st.classList.remove("cut");
        node.classList.add("lunge");
        if (scaresOn) { shake(); if (S().laugh) S().laugh(true); }
      });
      at(560, function () { st.classList.add("out"); });
      at(420, function () { st.remove(); if (done) done(); });
    },

    /** Lights out… it's out there… it's closer… it's RIGHT HERE. */
    jumpscare: function () {
      if (!scaresOn || reduceMotion) { peek(); return; }
      var f = fig(pick(CLOSE_UP)), sc = f.scale || 1;
      var st = stage("#ffb3a3");
      var node = figEl("loomer" + (Math.random() < 0.5 ? " flip" : ""), f);
      var x = rnd(25, 75);
      pose(node, 22 * sc, x, -6, 0);
      st.appendChild(node);
      st.classList.add("on", "cut");
      if (S().breath) S().breath();

      var t = 0;
      function at(ms, fn) { t += ms; setTimeout(fn, t); }
      function glimpse() { st.classList.remove("cut"); node.classList.add("seen"); }
      function dark() { st.classList.add("cut"); }
      at(1300, glimpse);                                                      // far away
      at(110, dark);
      at(800, function () { pose(node, 58 * sc, (x + 50) / 2, 4, 1); glimpse(); });  // closer
      at(90, dark);
      at(650, function () {                                                   // here
        pose(node, 150 * sc, 50, 36, 6);
        glimpse();
        node.classList.add("lunge");
        st.classList.add("hit");
        if (S().scream) S().scream();
        flash(); shake();
      });
      at(900, function () { st.classList.add("out"); });
      at(420, function () { st.remove(); });
    },

    /**
     * The welcome. Out of nowhere the face is right against the screen with
     * a shriek: the frame tears, the lights stutter, it stares and creeps
     * closer… then it's gone. Calls done() when it is over.
     * Reduced motion still gets the face, just without the shake and zoom.
     */
    welcome: function (done) {
      done = done || function () {};
      if (!scaresOn || !faceImg) { done(); return; }
      // on a slow connection the picture may still be on its way: hit the moment it lands
      if (!faceImg.complete) {
        var go = function () { faceImg.onload = faceImg.onerror = null; Creatures.welcome(done); };
        faceImg.onload = faceImg.onerror = go;
        return;
      }
      if (!faceImg.naturalWidth) { done(); return; }
      var st = document.createElement("div");
      st.className = "face-scare";
      st.setAttribute("aria-hidden", "true");
      st.innerHTML = '<div class="fs-face"></div><div class="fs-vignette"></div><div class="scare-grain"></div><div class="fs-flash"></div>';
      var face = st.firstChild;
      face.appendChild(faceImg);
      // two colour-split copies of it, for the instant the frame tears
      ["fs-ghost fs-r", "fs-ghost fs-c"].forEach(function (cls) {
        var g = faceImg.cloneNode(false); g.className = cls; face.appendChild(g);
      });
      document.body.appendChild(st);
      void st.offsetWidth;

      // HERE
      st.classList.add("on", "hit");
      if (S().stinger) S().stinger();
      if (S().scream) S().scream();
      buzz([450, 70, 250, 70, 600]);

      var t = 0;
      function at(ms, fn) { t += ms; setTimeout(fn, t); }
      function dark() { st.classList.add("cut"); }
      function lit() { st.classList.remove("cut"); }
      at(170, dark);                                                   // the lights stutter
      at(55, lit);
      at(120, dark);
      at(45, function () { lit(); st.classList.remove("hit"); });
      at(1050, dark);                                                  // it stares… and creeps closer
      at(70, lit);
      at(160, dark);
      at(80, lit);
      at(140, function () { dark(); st.classList.add("out"); });       // gone, and the dark lifts
      at(650, function () { st.remove(); done(); });
    },

    /**
     * A jump scare themed on the character a team just got (Wheel I).
     * Plays high-impact seamless cinematic jumpscare video from 'soul jumpscares/'.
     * Falls back to legacy DOM character lunge if video is unavailable.
     */
    characterScare: function (ch, done) {
      done = done || function () {};
      if (!ch || !scaresOn || reduceMotion) { done(); return; }

      var videoSrc = getScareVideo(ch);
      if (videoSrc) {
        playVideoScare(ch, done);
        return;
      }

      legacyCharacterScare(ch, done);
    },

    preloadScare: preloadScare,
    playVideoScare: playVideoScare,

    /** The twist wakes: the lights stutter, lightning, and a zombie crosses the moon. */
    awaken: function () {
      if (reduceMotion) return;
      blackout([[0.9, 120], [0.1, 100], [0.95, 250], [0, 10]], function () {
        strike();
        revealInFlash(3, 5);
      });
      setTimeout(peeks.moon, 900);
    }
  };

  window.Creatures = Creatures;
})();
