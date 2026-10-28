/* =========================================================
   FX — stars, trees, fence, drifting motes, bats, lightning,
   the flashlight and the watching eye. All decorative, all
   paused when the tab is hidden, toned down on small devices.
   ========================================================= */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  var lowPower = coarse || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  var finePointer = window.matchMedia && window.matchMedia("(hover: hover)").matches;
  if (lowPower) document.documentElement.classList.add("low-power");
  var SVGNS = "http://www.w3.org/2000/svg";

  /* ---------- full-screen covers ---------- */
  // While the entry gate is up, or the cutscene has faded in over everything,
  // the page behind can't be seen: <html> gets behind-gate / behind-cutscene and
  // css/creepy.css stops painting and animating it. Our own loops check covered().
  var root = document.documentElement;
  function covered() { return root.classList.contains("behind-gate") || root.classList.contains("behind-cutscene"); }
  function watchCovers() {
    var gate = document.getElementById("gate"), cut = document.getElementById("cutsceneLayer"), cutTimer = null, gateTimer = null;
    function sync() {
      var gateUp = !!gate && !gate.classList.contains("gone");
      root.classList.toggle("behind-gate", gateUp);
      // once the gate has faded out (1.1s), it leaves the page for good (gate-closed)
      if (gateUp) { clearTimeout(gateTimer); gateTimer = null; root.classList.remove("gate-closed"); }
      else if (gate && !gateTimer && !root.classList.contains("gate-closed")) {
        gateTimer = setTimeout(function () { gateTimer = null; root.classList.add("gate-closed"); }, 1300);
      }
      var cutOn = !!cut && !cut.hidden && cut.classList.contains("is-active");
      if (!cutOn) {
        clearTimeout(cutTimer); cutTimer = null;
        root.classList.remove("behind-cutscene");
      } else if (!cutTimer && !root.classList.contains("behind-cutscene")) {
        // only once its 0.6s fade-in is over, so nothing vanishes while it's see-through
        cutTimer = setTimeout(function () { cutTimer = null; root.classList.add("behind-cutscene"); }, 700);
      }
    }
    sync();
    if (!window.MutationObserver) return;
    var mo = new MutationObserver(sync);
    if (gate) mo.observe(gate, { attributes: true, attributeFilter: ["class"] });
    if (cut) mo.observe(cut, { attributes: true, attributeFilter: ["class", "hidden"] });
  }

  // seeded RNG so the graveyard looks the same on every load
  function rng(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
  }

  /* ---------- stars ---------- */
  function makeStars() {
    var host = document.getElementById("stars");
    if (!host) return;
    var r = rng(7), a = [], b = [];
    var count = lowPower ? 70 : 140;
    for (var i = 0; i < count; i++) {
      var x = (r() * 100).toFixed(2), y = (Math.pow(r(), 1.6) * 62).toFixed(2);
      var size = r() < 0.12 ? 1 : 0;
      var alpha = (0.35 + r() * 0.6).toFixed(2);
      var tone = r() < 0.2 ? "255,170,140" : "255,232,222";
      (i % 2 ? a : b).push(x + "vw " + y + "vh 0 " + size + "px rgba(" + tone + "," + alpha + ")");
    }
    host.style.boxShadow = a.join(",");
    var alt = host.cloneNode(false);
    alt.removeAttribute("id");
    alt.className = "stars alt";
    alt.style.boxShadow = b.join(",");
    host.parentNode.insertBefore(alt, host.nextSibling);
  }

  /* ---------- dead trees ---------- */
  function growTree(r, x, y, len, ang, depth, w, buckets) {
    if (depth === 0 || len < 2) return;
    var x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    // slight crook
    var mx = (x + x2) / 2 + (r() - 0.5) * len * 0.25, my = (y + y2) / 2 + (r() - 0.5) * len * 0.25;
    var key = Math.max(0.6, Math.round(w * 2) / 2);
    (buckets[key] = buckets[key] || []).push("M" + x.toFixed(1) + " " + y.toFixed(1) + "Q" + mx.toFixed(1) + " " + my.toFixed(1) + " " + x2.toFixed(1) + " " + y2.toFixed(1));
    var kids = depth > 4 ? 2 : (r() < 0.5 ? 2 : 3);
    for (var k = 0; k < kids; k++) {
      var spread = 0.35 + r() * 0.55;
      var na = ang + (k - (kids - 1) / 2) * spread + (r() - 0.5) * 0.4;
      growTree(r, x2, y2, len * (0.62 + r() * 0.16), na, depth - 1, w * 0.62, buckets);
    }
  }

  // The hill path (absolute M/L/C/Z only) as a fine polyline: [x, y, lengthSoFar, ...].
  function flattenPath(d) {
    var tok = d.match(/[MLCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi), i = 0, cmd = "", out = [], x = 0, y = 0, sx = 0, sy = 0, len = 0;
    if (!tok) return null;
    function num() { return parseFloat(tok[i++]); }
    function to(nx, ny) { len += Math.sqrt((nx - x) * (nx - x) + (ny - y) * (ny - y)); x = nx; y = ny; out.push(x, y, len); }
    while (i < tok.length) {
      if (/[a-z]/i.test(tok[i])) cmd = tok[i++];
      if (cmd === "M") { x = sx = num(); y = sy = num(); out.push(x, y, len); cmd = "L"; }
      else if (cmd === "L") to(num(), num());
      else if (cmd === "C") {
        var x0 = x, y0 = y, x1 = num(), y1 = num(), x2 = num(), y2 = num(), x3 = num(), y3 = num();
        for (var s = 1; s <= 64; s++) {
          var t = s / 64, u = 1 - t;
          to(u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
             u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3);
        }
      }
      else if (cmd === "Z" || cmd === "z") { to(sx, sy); cmd = ""; }
      else return null; // anything else: let the browser measure it
    }
    return out;
  }

  function topEdge(path, width) {
    // sample the hill path every 4 units along its length to know where its top edge sits
    var ys = new Array(Math.ceil(width / 10) + 1);
    function sample(px, py) {
      var b = Math.round(px / 10);
      if (b >= 0 && b < ys.length && (ys[b] === undefined || py < ys[b])) ys[b] = py;
    }
    try {
      // worked out here rather than with getPointAtLength(), which phones
      // took a second or two to answer hundreds of times on load
      var pts = flattenPath(path.getAttribute("d") || "");
      if (pts && pts.length > 3) {
        var L = pts[pts.length - 1], k = 0;
        for (var d = 0; d < L; d += 4) {
          while (k + 5 < pts.length && pts[k + 5] < d) k += 3;
          var seg = pts[k + 5] - pts[k + 2], f = seg > 0 ? (d - pts[k + 2]) / seg : 0;
          sample(pts[k] + (pts[k + 3] - pts[k]) * f, pts[k + 1] + (pts[k + 4] - pts[k + 1]) * f);
        }
      } else {
        var Lb = path.getTotalLength();
        for (var db = 0; db < Lb; db += 4) { var p = path.getPointAtLength(db); sample(p.x, p.y); }
      }
    } catch (e) {}
    return function (x) { var v = ys[Math.round(x / 10)]; return v === undefined ? 300 : v; };
  }

  function makeTrees() {
    var svg = document.querySelector(".graveyard");
    if (!svg) return;
    var hills = svg.querySelectorAll(":scope > path");
    var far = topEdge(hills[0], 1440), near = topEdge(hills[1], 1440);
    var r = rng(13);

    function plant(groupId, spots, edge, scale) {
      var g = document.getElementById(groupId), buckets = {};
      spots.forEach(function (s) {
        var y = edge(s[0]) + 4;
        growTree(r, s[0], y, s[1] * scale, -Math.PI / 2 + (r() - 0.5) * 0.2, 6, s[2] * scale, buckets);
      });
      Object.keys(buckets).forEach(function (w) {
        var p = document.createElementNS(SVGNS, "path");
        p.setAttribute("d", buckets[w].join(""));
        p.setAttribute("stroke-width", w);
        g.appendChild(p);
      });
    }

    plant("treesFar", [[90, 34, 7], [420, 30, 6], [770, 38, 7], [1040, 30, 6], [1390, 34, 6]], far, 1);
    plant("treesNear", [[30, 62, 13], [330, 46, 10], [700, 54, 11], [1130, 50, 11], [1420, 60, 12]], near, 1);

    // fence posts with spear tips
    var posts = document.getElementById("fencePosts"), d = "";
    for (var x = 6; x < 1440; x += 24) {
      d += "M" + x + " 360V322h4V360z M" + (x - 2) + " 323l4-11 4 11z ";
    }
    var fp = document.createElementNS(SVGNS, "path");
    fp.setAttribute("d", d);
    posts.appendChild(fp);
  }

  /* ---------- drifting motes / embers ---------- */
  function makeMotes() {
    var c = document.getElementById("motes");
    if (!c || reduceMotion) { if (c) c.style.display = "none"; return; }
    var ctx = c.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var W, H, parts = [];
    var palette = ["255,140,60", "255,90,60", "255,55,35", "255,190,130"];

    // Pre-rendered offscreen stamps (eliminates ~2,700 dynamic gradient allocations/sec)
    var stamps = palette.map(function (cStr) {
      var sc = document.createElement("canvas");
      sc.width = 32;
      sc.height = 32;
      var sctx = sc.getContext("2d");
      var sg = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      sg.addColorStop(0, "rgba(" + cStr + ",1)");
      sg.addColorStop(0.35, "rgba(" + cStr + ",0.7)");
      sg.addColorStop(1, "rgba(" + cStr + ",0)");
      sctx.fillStyle = sg;
      sctx.beginPath();
      sctx.arc(16, 16, 16, 0, Math.PI * 2);
      sctx.fill();
      return sc;
    });

    function size() {
      W = window.innerWidth; H = window.innerHeight;
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var target = Math.round(Math.min(lowPower ? 22 : 46, Math.max(12, (W * H) / 32000)));
      while (parts.length < target) parts.push(spawn(true));
      parts.length = target;
    }
    function spawn(anywhere) {
      return {
        x: Math.random() * W,
        y: anywhere ? Math.random() * H : H + 10,
        r: 0.6 + Math.random() * 1.8,
        vy: 0.12 + Math.random() * 0.35,
        sway: Math.random() * Math.PI * 2,
        sw: 0.004 + Math.random() * 0.01,
        cIdx: (Math.random() * palette.length) | 0,
        life: 0.4 + Math.random() * 0.6
      };
    }
    var last = 0;
    function frame(t) {
      requestAnimationFrame(frame);
      if (document.hidden || covered()) { last = 0; return; } // nothing to see behind the gate

      // Yield 100% GPU/CPU during cutscenes or jumpscares
      var cutsceneActive = window.OtherSideCutscene && window.OtherSideCutscene.isActive;
      var scareActive = document.getElementById("scareVideoLayer") && !document.getElementById("scareVideoLayer").hidden;
      if (cutsceneActive || scareActive) {
        ctx.clearRect(0, 0, W, H);
        return;
      }

      if (t - last < 32) return; // Cap background motes at ~30fps on all devices to free GPU for wheel & UI
      var dt = last ? Math.min((t - last) / 16.7, 3) : 1;
      last = t;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y -= p.vy * dt;
        p.sway += p.sw * dt;
        p.x += Math.sin(p.sway) * 0.3 * dt;
        if (p.y < -10) parts[i] = p = spawn(false);
        var fade = Math.min(1, (H - p.y) / (H * 0.25)) * Math.min(1, p.y / (H * 0.3));
        var a = Math.max(0, fade * p.life);
        ctx.globalAlpha = a;
        var sz = p.r * 8;
        ctx.drawImage(stamps[p.cIdx], p.x - sz * 0.5, p.y - sz * 0.5, sz, sz);
      }
      ctx.globalAlpha = 1;
    }
    size();
    window.addEventListener("resize", size);
    requestAnimationFrame(frame);
  }

  /* ---------- bats ---------- */
  var BAT_SVG =
    '<svg viewBox="0 0 100 50"><g fill="#050207">' +
    '<path class="wing l" d="M50 22 C40 8 26 6 6 12 C14 16 16 22 14 28 C22 24 28 28 30 34 C36 28 44 28 50 30Z"/>' +
    '<path class="wing r" d="M50 22 C60 8 74 6 94 12 C86 16 84 22 86 28 C78 24 72 28 70 34 C64 28 56 28 50 30Z"/>' +
    '<ellipse cx="50" cy="27" rx="6" ry="9"/><path d="M45 19 l2 -6 3 5 3 -5 2 6z"/></g>' +
    '<circle cx="48" cy="22" r="1" fill="#ff3b3b"/><circle cx="52" cy="22" r="1" fill="#ff3b3b"/></svg>';

  function spawnBat(host) {
    var b = document.createElement("div");
    b.className = "bat" + (Math.random() < 0.4 ? " rtl" : "");
    var s = 26 + Math.random() * 34;
    b.style.setProperty("--s", s + "px");
    b.style.setProperty("--y", (6 + Math.random() * 40) + "%");
    b.style.setProperty("--d", (7 + Math.random() * 6) + "s");
    b.innerHTML = BAT_SVG;
    b.addEventListener("animationend", function (e) { if (e.target === b) b.remove(); });
    host.appendChild(b);
  }

  function makeBats() {
    var host = document.getElementById("bats");
    if (!host || reduceMotion) return;
    function loop() {
      if (!document.hidden && !covered()) {
        var flock = Math.random() < 0.3 ? 3 : 1;
        for (var i = 0; i < flock; i++) setTimeout(function () { spawnBat(host); }, i * 260);
      }
      setTimeout(loop, 7000 + Math.random() * 9000);
    }
    setTimeout(loop, 2500);
  }

  /* ---------- lightning ---------- */
  // A strike is a few hard flickers, not one smooth fade. Each step is
  // [brightness 0–1, ms]. Everything that reacts to the flash (the sky, the
  // hills, the figures on the hill, the bolt) reads the --lit variable.
  var FLICKERS = [
    [[1, 55], [0.12, 45], [0.85, 40], [0, 150], [0.5, 45], [0.15, 60]],
    [[0.6, 35], [0, 70], [1, 75], [0.3, 45], [0.7, 40], [0.1, 70]],
    [[1, 90], [0.25, 55], [0.6, 45], [0.1, 80]],
    [[0.9, 45], [0, 110], [0.95, 50], [0.2, 40], [0.45, 35], [0, 160], [0.3, 40], [0.08, 60]]
  ];
  var striking = false;

  // a jagged bolt with a few forks, behind the hills
  function makeBolt() {
    var atmo = document.querySelector(".atmo"), hills = document.querySelector(".graveyard");
    if (!atmo || !hills) return null;
    var W = window.innerWidth, H = window.innerHeight;
    var x = W * (0.12 + Math.random() * 0.76), y = -10, end = H * (0.6 + Math.random() * 0.15);
    var main = "M" + x.toFixed(1) + " " + y, forks = "";
    while (y < end) {
      y += 12 + Math.random() * 26;
      x += (Math.random() - 0.5) * 46;
      main += "L" + x.toFixed(1) + " " + y.toFixed(1);
      if (Math.random() < 0.16) {
        var fx = x, fy = y, dir = Math.random() < 0.5 ? -1 : 1, n = 3 + Math.floor(Math.random() * 6);
        forks += "M" + fx.toFixed(1) + " " + fy.toFixed(1);
        for (var i = 0; i < n; i++) {
          fx += dir * (6 + Math.random() * 20); fy += 8 + Math.random() * 20;
          forks += "L" + fx.toFixed(1) + " " + fy.toFixed(1);
        }
      }
    }
    var svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("class", "bolt");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.innerHTML = "<path class=\"bolt-fork\" d=\"" + forks + "\"/><path class=\"bolt-core\" d=\"" + main + "\"/>";
    atmo.insertBefore(svg, hills);
    return svg;
  }

  // noReveal: the caller shows its own figures in this flash
  // Everything that reads --lit lives inside .atmo, so it's set there: set on
  // <html> it made phones restyle the whole page on every flicker. The page
  // on top dims a little in the flash (the same calc as body.lit .altar in
  // css/creepy.css), written straight onto those three elements for the same reason.
  function setLit(atmo, dimmed, v) {
    atmo.style.setProperty("--lit", v);
    dimmed.forEach(function (d) { d.style.opacity = v === null ? "" : String(1 - v * 0.55); d.style.transition = v === null ? "" : "none"; });
  }
  function strike(noReveal) {
    if (reduceMotion || striking || !document.getElementById("lightning")) return;
    striking = true;
    var atmo = document.querySelector(".atmo");
    var dimmed = Array.prototype.slice.call(document.querySelectorAll(".altar, .site-foot, .topbar"));
    var steps = FLICKERS[Math.floor(Math.random() * FLICKERS.length)];
    var bolt = Math.random() < 0.8 ? makeBolt() : null;
    document.body.classList.add("lit");
    var i = 0;
    (function next() {
      if (i >= steps.length) {
        setLit(atmo, dimmed, null);
        atmo.style.setProperty("--lit", "0");
        document.body.classList.remove("lit");
        if (bolt) bolt.remove();
        striking = false;
        return;
      }
      var s = steps[i++];
      setLit(atmo, dimmed, s[0]);
      if (bolt && i > 3) bolt.style.opacity = "0"; // the bolt is only in the first flickers
      setTimeout(next, s[1]);
    })();
    if (window.Sound) window.Sound.thunder();
    // shadow figures can only be seen in the flash
    if (noReveal !== true) { try { window.dispatchEvent(new Event("woc:lightning")); } catch (e) {} }
  }
  function makeLightning() {
    if (reduceMotion) return;
    function loop() {
      var gate = document.getElementById("gate");
      if (!document.hidden && !(gate && !gate.classList.contains("gone"))) strike();
      setTimeout(loop, 12000 + Math.random() * 16000);
    }
    setTimeout(loop, 8000 + Math.random() * 5000);
  }

  /* ---------- flashlight + watching eye ---------- */
  function makeTracking() {
    var torch = document.querySelector(".flashlight");
    var iris = document.getElementById("iris");
    var hub = document.getElementById("hub");
    var px = window.innerWidth / 2, py = window.innerHeight * 0.4, queued = false;
    var cachedHubRect = null, lastRectAt = 0;

    function invalidateHubRect() { cachedHubRect = null; }
    window.addEventListener("resize", invalidateHubRect, { passive: true });
    window.addEventListener("scroll", invalidateHubRect, { passive: true });

    function apply() {
      queued = false;
      if (torch && finePointer) torch.style.transform = "translate3d(" + px + "px," + py + "px,0)";
      if (iris && hub && hub.offsetParent) {
        var now = Date.now();
        if (!cachedHubRect || now - lastRectAt > 600) {
          cachedHubRect = hub.getBoundingClientRect();
          lastRectAt = now;
        }
        var r = cachedHubRect;
        var dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2);
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        var k = Math.min(1, dist / 300) * 13;
        iris.setAttribute("transform", "translate(" + (dx / dist * k).toFixed(2) + " " + (dy / dist * k * 0.6).toFixed(2) + ")");
      }
    }
    function move(e) {
      px = e.clientX; py = e.clientY;
      if (!queued) { queued = true; requestAnimationFrame(apply); }
    }
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", move, { passive: true });

    // on touch screens the eye glances around on its own
    if (coarse) {
      setInterval(function () {
        if (document.hidden) return;
        px = window.innerWidth * (0.15 + Math.random() * 0.7);
        py = window.innerHeight * (0.15 + Math.random() * 0.7);
        apply();
      }, 2600);
    }
  }

  function makeBlink() {
    var lids = document.getElementById("lids");
    if (!lids) return;
    function blink() {
      lids.classList.add("blink");
      setTimeout(function () { lids.classList.remove("blink"); }, 140);
      if (Math.random() < 0.25) setTimeout(function () {
        lids.classList.add("blink");
        setTimeout(function () { lids.classList.remove("blink"); }, 120);
      }, 300);
      setTimeout(blink, 2500 + Math.random() * 5000);
    }
    setTimeout(blink, 2000);
  }

  /* ---------- the spider ---------- */
  // Click it and it jumps at your face (or just scuttles off when jump
  // scares are turned off).

  // a big hairy spider, seen from above, head up
  function bigSpider() {
    var legs = "", joints = "";
    // bristles: short strokes sticking out along a line, leaning toward its end
    function bristles(p, q, w) {
      var dx = q[0] - p[0], dy = q[1] - p[1], len = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / len, uy = dy / len, n = Math.round(len / 5), d = "";
      for (var b = 0; b < n; b++) {
        var s = (b + 0.5) / n, side = b % 2 ? 1 : -1, h = w * 0.5 + 3 + Math.random() * 5;
        var x = p[0] + dx * s + -uy * side * w * 0.4, y = p[1] + dy * s + ux * side * w * 0.4;
        d += "M" + x.toFixed(1) + " " + y.toFixed(1) + "l" + ((-uy * side + ux * 0.8) * h).toFixed(1) + " " + ((ux * side + uy * 0.8) * h).toFixed(1);
      }
      return "<path d=\"" + d + "\" stroke-width=\"1.3\"/>";
    }
    // fur around an ellipse
    function fur(cx, cy, rx, ry, n) {
      var d = "";
      for (var b = 0; b < n; b++) {
        var a = b / n * Math.PI * 2 + Math.random() * 0.05, h = 4 + Math.random() * 6;
        var x = cx + Math.cos(a) * rx * 0.97, y = cy + Math.sin(a) * ry * 0.97;
        d += "M" + x.toFixed(1) + " " + y.toFixed(1) + "l" + (Math.cos(a) * h).toFixed(1) + " " + (Math.sin(a) * h + 1.5).toFixed(1);
      }
      return "<path d=\"" + d + "\" stroke=\"#140b07\" stroke-width=\"1.4\" stroke-linecap=\"round\" fill=\"none\"/>";
    }
    var ANG = [-58, -22, 16, 50], LEN = [1.18, 1, 0.92, 1.08];
    [-1, 1].forEach(function (side) {
      ANG.forEach(function (a, i) {
        var k = LEN[i], ax = side * 22, ay = -20 + i * 9;
        function step(x, y, len, deg) { var r = deg * Math.PI / 180; return [x + side * Math.cos(r) * len, y + Math.sin(r) * len]; }
        var p1 = step(ax, ay, 62 * k, a * 0.55 - 12);
        var p2 = step(p1[0], p1[1], 78 * k, a * 1.05);
        var p3 = step(p2[0], p2[1], 46 * k, a * 1.5 + (a < 0 ? -10 : 14));
        var seg = function (p, q, w) { return "<path d=\"M" + p[0].toFixed(1) + " " + p[1].toFixed(1) + "L" + q[0].toFixed(1) + " " + q[1].toFixed(1) + "\" stroke-width=\"" + w + "\"/>"; };
        legs += "<g class=\"sleg\" style=\"--d:" + (i * 0.07 + (side > 0 ? 0.04 : 0)).toFixed(2) + "s;transform-origin:" + ax + "px " + ay + "px\">" +
          seg([ax, ay], p1, 12) + seg(p1, p2, 9) + seg(p2, p3, 5) +
          bristles([ax, ay], p1, 12) + bristles(p1, p2, 9) + bristles(p2, p3, 5) + "</g>";
        joints += "<circle cx=\"" + p1[0].toFixed(1) + "\" cy=\"" + p1[1].toFixed(1) + "\" r=\"6\"/><circle cx=\"" + p2[0].toFixed(1) + "\" cy=\"" + p2[1].toFixed(1) + "\" r=\"4.2\"/>";
      });
    });
    return "<svg viewBox=\"-230 -230 460 460\" xmlns=\"http://www.w3.org/2000/svg\">" +
      "<defs><radialGradient id=\"spAbd\" cx=\".42\" cy=\".35\" r=\".7\"><stop offset=\"0\" stop-color=\"#3b2618\"/><stop offset=\".55\" stop-color=\"#1a0f0a\"/><stop offset=\"1\" stop-color=\"#070403\"/></radialGradient>" +
      "<radialGradient id=\"spEye\" cx=\".35\" cy=\".3\" r=\".7\"><stop offset=\"0\" stop-color=\"#ff6a5a\"/><stop offset=\".35\" stop-color=\"#7a0008\"/><stop offset=\"1\" stop-color=\"#120001\"/></radialGradient>" +
      "<filter id=\"spHair\" x=\"-10%\" y=\"-10%\" width=\"120%\" height=\"120%\"><feTurbulence type=\"fractalNoise\" baseFrequency=\".9\" numOctaves=\"2\" seed=\"4\"/><feDisplacementMap in=\"SourceGraphic\" scale=\"5\"/></filter></defs>" +
      "<g filter=\"url(#spHair)\">" +
        "<g stroke=\"#120a07\" stroke-linecap=\"round\" fill=\"none\">" + legs + "</g>" +
        "<g fill=\"#0c0705\">" + joints + "</g>" +
        // pedipalps + fangs
        "<g stroke=\"#120a07\" stroke-linecap=\"round\" fill=\"none\"><path d=\"M-10 -42 Q-22 -54 -17 -68\" stroke-width=\"9\"/><path d=\"M10 -42 Q22 -54 17 -68\" stroke-width=\"9\"/></g>" +
        "<path d=\"M-11 -50 q-3 14 5 22 l4 -16z M11 -50 q3 14 -5 22 l-4 -16z\" fill=\"#1d0d08\"/>" +
        // abdomen with chevrons, then the head
        fur(0, 52, 46, 64, 90) + "<ellipse cx=\"0\" cy=\"52\" rx=\"46\" ry=\"64\" fill=\"url(#spAbd)\"/>" +
        "<path d=\"M-20 30 L0 44 L20 30 M-24 58 L0 74 L24 58 M-20 86 L0 100 L20 86\" stroke=\"#4a2c1a\" stroke-width=\"4\" fill=\"none\" opacity=\".3\"/>" +
        fur(0, -14, 30, 34, 60) + "<ellipse cx=\"0\" cy=\"-14\" rx=\"30\" ry=\"34\" fill=\"url(#spAbd)\"/>" +
      "</g>" +
      // eight eyes, two big ones in front
      "<g fill=\"url(#spEye)\"><circle cx=\"-6.5\" cy=\"-38\" r=\"6\"/><circle cx=\"6.5\" cy=\"-38\" r=\"6\"/>" +
        "<circle cx=\"-16\" cy=\"-33\" r=\"3.4\"/><circle cx=\"16\" cy=\"-33\" r=\"3.4\"/><circle cx=\"-9\" cy=\"-27\" r=\"2.6\"/><circle cx=\"9\" cy=\"-27\" r=\"2.6\"/><circle cx=\"-19\" cy=\"-25\" r=\"2.2\"/><circle cx=\"19\" cy=\"-25\" r=\"2.2\"/></g>" +
      "<g fill=\"#fff\" opacity=\".8\"><circle cx=\"-8.5\" cy=\"-40\" r=\"1.6\"/><circle cx=\"4.5\" cy=\"-40\" r=\"1.6\"/></g>" +
      "</svg>";
  }

  function spiderJump(sp) {
    var r = sp.querySelector(".spider-body").getBoundingClientRect();
    var big = document.createElement("div");
    big.className = "spider-jump";
    big.innerHTML = bigSpider();
    document.body.appendChild(big);
    var size = big.getBoundingClientRect().width || 600;
    var sx = r.left + r.width / 2 - window.innerWidth / 2, sy = r.top + r.height / 2 - window.innerHeight / 2;
    var s0 = (r.width * 1.6) / size;
    var dim = document.createElement("div");
    dim.className = "spider-dim";
    document.body.appendChild(dim);
    if (window.Sound) { window.Sound.whoosh(); if (window.Sound.hiss) window.Sound.hiss(); }
    var anim = big.animate([
      { transform: "translate(" + sx + "px," + sy + "px) scale(" + s0 + ") rotate(-20deg)", offset: 0 },
      { transform: "translate(" + (sx * 0.5) + "px," + (sy * 0.5 - 90) + "px) scale(.45) rotate(8deg)", offset: 0.16 },
      { transform: "translate(0,0) scale(1.12) rotate(-4deg)", offset: 0.3 },
      { transform: "translate(0,10px) scale(1) rotate(2deg)", offset: 0.38 },
      { transform: "translate(6px,4px) scale(1.02) rotate(-2deg)", offset: 0.75 },
      { transform: "translate(0,130vh) scale(1.1) rotate(30deg)", offset: 1 }
    ], { duration: 2400, easing: "ease-in-out", fill: "forwards" });
    setTimeout(function () {
      document.body.classList.remove("quake"); void document.body.offsetWidth; document.body.classList.add("quake");
      setTimeout(function () { document.body.classList.remove("quake"); }, 600);
      if (window.Sound && window.Sound.scream) window.Sound.scream();
      big.classList.add("landed");
    }, 700);
    anim.onfinish = function () { big.remove(); dim.remove(); };
    setTimeout(function () { dim.classList.add("out"); }, 1900);
  }

  function makeSpider() {
    var sp = document.getElementById("spider");
    if (!sp) return;
    sp.addEventListener("click", function () {
      if (sp.classList.contains("flee")) return;
      var scares = !window.Creatures || window.Creatures.scaresOn;
      var jump = scares && !reduceMotion;
      if (jump) spiderJump(sp); else if (window.Sound) window.Sound.whoosh();
      sp.classList.add("flee");
      if (jump) sp.classList.add("leapt");
      setTimeout(function () { sp.classList.remove("flee", "leapt"); }, 25000);
    });
  }

  /* ---------- the poster's pixel jack-o'-lantern ---------- */
  // O = skin, E = the burning face, S = stem
  var PUMPKIN = [
    ".......SS......",
    "......SS.......",
    "...OOOOOOOOO...",
    ".OOOOOOOOOOOOO.",
    "OOEOOOOOOOOOEOO",
    "OOEEEEOOOEEEEOO",
    "OOOOOOOEOOOOOOO",
    "OOEOOOOOOOOOEOO",
    "OOEEEOEEEOEEEOO",
    ".OOEEEEEEEEEOO.",
    "..OOOOOOOOOOO..",
    "....OOOOOOO...."
  ];
  function makePixelPumpkins() {
    var svgs = document.querySelectorAll("[data-pixel-pumpkin]");
    if (!svgs.length) return;
    var skin = "", dark = "", face = "", stem = "";
    PUMPKIN.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) {
        var ch = row[x], px = "M" + x + " " + (y + 1) + "h1v1h-1z";
        if (ch === "S") stem += px;
        else if (ch === "E") face += px;
        else if (ch === "O") {
          // the ribs and the rim sit in shadow
          var edge = row[x - 1] !== "O" && row[x - 1] !== "E" || row[x + 1] !== "O" && row[x + 1] !== "E";
          if (edge || x === 4 || x === 10 || y === PUMPKIN.length - 1) dark += px; else skin += px;
        }
      }
    });
    var markup =
      "<path d=\"" + stem + "\" fill=\"#5a2a12\"/>" +
      "<path d=\"" + dark + "\" fill=\"#b8360c\"/>" +
      "<path d=\"" + skin + "\" fill=\"#ff6a1a\"/>" +
      "<path class=\"pk-face\" d=\"" + face + "\" fill=\"#ffd84a\"/>";
    Array.prototype.forEach.call(svgs, function (s) { s.innerHTML = markup; });
  }

  /* ---------- ransom-note lettering ---------- */
  function makeRansom() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-ransom]"), function (host) {
      var text = host.textContent.trim(), n = 0;
      host.setAttribute("aria-label", text);
      host.textContent = "";
      text.split(/\s+/).forEach(function (word) {
        var w = document.createElement("span");
        w.className = "w";
        w.setAttribute("aria-hidden", "true");
        for (var i = 0; i < word.length; i++, n++) {
          var l = document.createElement("span"), k = (n * 7 + word.charCodeAt(i)) % 13;
          // mostly bare cut-out letters; now and then one on a scrap of paper
          l.className = "l f" + (k % 5) + (k === 1 ? " b1" : k === 5 || k === 9 ? " b2" : k === 3 || k === 11 ? " b3" : "") +
            " t" + (n % 4) + (k % 4 === 0 ? " s1" : k === 7 ? " s0" : "");
          l.textContent = word[i];
          w.appendChild(l);
        }
        host.appendChild(w);
      });
    });
  }

  /* ---------- --vh fallback for older mobile browsers ---------- */
  function vhFix() {
    if (window.CSS && CSS.supports && CSS.supports("height", "1dvh")) return;
    function set() { document.documentElement.style.setProperty("--vh", (window.innerHeight / 100) + "px"); }
    set();
    window.addEventListener("resize", set);
  }

  window.FX = { strike: strike };

  function start() {
    watchCovers();
    vhFix();
    makePixelPumpkins();
    makeRansom();
    makeStars();
    makeTrees();
    makeMotes();
    makeBats();
    makeLightning();
    makeTracking();
    makeBlink();
    makeSpider();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
