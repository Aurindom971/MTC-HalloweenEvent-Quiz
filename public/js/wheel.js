/* =========================================================
   Wheel — draws a segmented wheel on <canvas> and spins the
   rotor to a pre-chosen segment, like a casino wheel: a hard
   launch, a long slow crawl, and a flapper arrow that gets
   knocked by every peg. Once it stops it STAYS on the result.
   The outcome is decided before the animation starts, so a
   page refresh can't re-roll it.
   ========================================================= */

(function () {
  "use strict";

  var TAU = Math.PI * 2;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // fast launch, long gentle crawl to a stop
  function easeOut(t) { return 1 - Math.pow(1 - t, 3.2); }
  function mod(a, n) { return ((a % n) + n) % n; }

  function hexToRgb(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h.replace(/./g, "$&$&");
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(hex, a) { var c = hexToRgb(hex); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  var EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Segoe UI Symbol",sans-serif';
  var LABEL_FONT = '"Oswald","Arial Narrow",sans-serif';

  function Wheel(canvas, rotor, pointer) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.rotor = rotor;
    this.pointer = pointer;
    this.segments = [];
    this.theme = {};
    this.angle = 0;       // degrees, clockwise
    this.spinning = false;
    // flapper state (degrees; negative = knocked back against the spin)
    this.flap = 0;
    this.flapVel = 0;
    var self = this, queued = false;
    // Redraw only when the wheel's size really changes. Phones fire "resize" all
    // through a scroll (the address bar), and a full redraw each time is jank.
    function redraw() {
      queued = false;
      var w = self.rotor.clientWidth;
      if (w && w !== self._drawnAt) self.draw();
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(redraw); } }
    if (window.ResizeObserver) new ResizeObserver(queue).observe(rotor);
    else window.addEventListener("resize", queue);
    // labels are drawn in a web font: redraw once it has arrived
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { self.draw(); });
  }

  Wheel.prototype.setSegments = function (segments, theme) {
    this.segments = segments;
    this.theme = theme || {};
    // the app re-sends the same wheel whenever the shared ledger changes;
    // a full redraw is costly on phones, so only draw when something differs
    var sig = JSON.stringify([segments, this.theme]);
    if (sig === this._drawnSig && this.rotor.clientWidth === this._drawnAt) return;
    this._drawnSig = sig;
    this.draw();
  };

  Wheel.prototype.draw = function () {
    var n = this.segments.length;
    if (!n) return; // nothing to draw yet (the fonts arriving before any wheel is set up)
    var cssSize = this.rotor.clientWidth || 400;
    this._drawnAt = this.rotor.clientWidth;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var size = Math.round(cssSize * dpr);
    if (this.canvas.width !== size) { this.canvas.width = size; this.canvas.height = size; }
    var ctx = this.ctx, R = size / 2, cx = R, cy = R;
    var th = this.theme;
    ctx.clearRect(0, 0, size, size);
    if (!n) return;

    var seg = TAU / n;
    var rimIn = R * 0.9, hubR = R * 0.15;

    // ---- outer iron rim ----
    var rim = ctx.createRadialGradient(cx, cy, rimIn, cx, cy, R);
    rim.addColorStop(0, "#030204");
    rim.addColorStop(0.35, "#3d1412");
    rim.addColorStop(0.6, "#180707");
    rim.addColorStop(1, "#030204");
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = rim; ctx.fill();

    // chip pins etched into the rim, like the traces on the poster
    ctx.strokeStyle = "rgba(255,80,60,.28)";
    ctx.lineWidth = Math.max(1, R * 0.007);
    ctx.lineCap = "round";
    for (var q = 0; q < n * 4; q++) {
      if (q % 4 === 0) continue; // the pegs sit there
      var qa = -Math.PI / 2 + q * seg / 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(qa) * R * 0.918, cy + Math.sin(qa) * R * 0.918);
      ctx.lineTo(cx + Math.cos(qa) * R * 0.94, cy + Math.sin(qa) * R * 0.94);
      ctx.stroke();
    }
    // a hot hairline round the outside
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.985, 0, TAU);
    ctx.strokeStyle = "rgba(255,70,45,.35)"; ctx.lineWidth = Math.max(1, R * 0.006); ctx.stroke();

    // ---- segments ----
    for (var i = 0; i < n; i++) {
      var s = this.segments[i];
      var a0 = -Math.PI / 2 + i * seg, a1 = a0 + seg;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, rimIn, a0, a1);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? (th.a || "#1c0708") : (th.b || "#110405");
      ctx.fill();

      var tint = s.color || th.accent || "#c4161c";
      var g = ctx.createRadialGradient(cx, cy, hubR, cx, cy, rimIn);
      if (s.disabled) {
        g.addColorStop(0, "rgba(0,0,0,.65)"); g.addColorStop(1, "rgba(0,0,0,.8)");
      } else {
        g.addColorStop(0, "rgba(0,0,0,.6)");
        g.addColorStop(0.65, rgba(tint, i % 2 ? 0.08 : 0.13));
        g.addColorStop(1, rgba(tint, i % 2 ? 0.26 : 0.34));
      }
      ctx.fillStyle = g; ctx.fill();

      if (!s.disabled) {
        ctx.beginPath();
        ctx.arc(cx, cy, rimIn - R * 0.012, a0 + 0.01, a1 - 0.01);
        ctx.strokeStyle = rgba(tint, 0.8);
        ctx.lineWidth = R * 0.012;
        ctx.stroke();
      }
    }

    // ---- cobweb: threads strung between the spokes, sagging toward the hub ----
    ctx.strokeStyle = "rgba(244,215,205,.12)";
    ctx.lineWidth = Math.max(1, R * 0.004);
    var rings = [0.36, 0.5, 0.64, 0.79];
    for (i = 0; i < n; i++) {
      var w0 = -Math.PI / 2 + i * seg, w1 = w0 + seg, wm = w0 + seg / 2;
      for (var k = 0; k < rings.length; k++) {
        var wr = rimIn * rings[k] * (1 + (((i * 7 + k * 3) % 5) - 2) * 0.012);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(w0) * wr, cy + Math.sin(w0) * wr);
        ctx.quadraticCurveTo(cx + Math.cos(wm) * wr * 0.9, cy + Math.sin(wm) * wr * 0.9,
                             cx + Math.cos(w1) * wr, cy + Math.sin(w1) * wr);
        ctx.stroke();
      }
    }

    // ---- spokes: circuit traces with a solder dot ----
    for (i = 0; i < n; i++) {
      var a = -Math.PI / 2 + i * seg;
      var ax = Math.cos(a), ay = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(cx + ax * hubR, cy + ay * hubR);
      ctx.lineTo(cx + ax * rimIn, cy + ay * rimIn);
      ctx.strokeStyle = "rgba(0,0,0,.55)"; ctx.lineWidth = Math.max(2, R * 0.014); ctx.stroke();
      ctx.strokeStyle = "rgba(255,90,65,.32)"; ctx.lineWidth = Math.max(1, R * 0.005); ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + ax * R * 0.33, cy + ay * R * 0.33, Math.max(1.5, R * 0.011), 0, TAU);
      ctx.fillStyle = "#140405"; ctx.fill();
      ctx.strokeStyle = "rgba(255,90,65,.5)"; ctx.lineWidth = Math.max(1, R * 0.004); ctx.stroke();
    }

    // ---- pegs on the rim (the flapper clicks against these): hot embers ----
    ctx.save();
    ctx.shadowColor = "rgba(255,60,25,.85)";
    ctx.shadowBlur = R * 0.03;
    for (i = 0; i < n; i++) {
      var ra = -Math.PI / 2 + i * seg;
      var rx = cx + Math.cos(ra) * (R * 0.95), ry = cy + Math.sin(ra) * (R * 0.95);
      var rg = ctx.createRadialGradient(rx - R * 0.006, ry - R * 0.006, 0, rx, ry, R * 0.026);
      rg.addColorStop(0, "#ffe6cf"); rg.addColorStop(0.35, "#ff5a2a"); rg.addColorStop(0.75, "#7a0f08"); rg.addColorStop(1, "#1a0505");
      ctx.beginPath(); ctx.arc(rx, ry, R * 0.024, 0, TAU); ctx.fillStyle = rg; ctx.fill();
    }
    ctx.restore();

    // ---- labels ----
    var labelOuter = rimIn - R * 0.07;
    var labelInner = R * 0.3;
    var maxW = labelOuter - labelInner;
    var arcH = Math.sin(seg / 2) * (labelInner + maxW * 0.55) * 2;
    for (i = 0; i < n; i++) {
      s = this.segments[i];
      var mid = -Math.PI / 2 + (i + 0.5) * seg;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(mid);
      ctx.textBaseline = "middle";
      ctx.textAlign = "right";

      var glyphSize = Math.min(R * 0.1, arcH * 0.62);
      var x = labelOuter;
      if (s.glyph) {
        ctx.font = (s.glyphIsText ? "500 " : "") + glyphSize + "px " + (s.glyphIsText ? LABEL_FONT : EMOJI_FONT);
        ctx.globalAlpha = s.disabled ? 0.25 : 1;
        ctx.fillStyle = s.glyphIsText ? rgba(s.color || th.accent || "#f4e3d7", 1) : "#fff";
        ctx.fillText(s.glyph, x, 0);
        x -= glyphSize * 1.25;
      }

      var fs = Math.min(R * 0.068, arcH * 0.42);
      var text = s.label || "";
      var avail = x - labelInner;
      ctx.font = "500 " + fs + "px " + LABEL_FONT;
      var w = ctx.measureText(text).width;
      if (w > avail) {
        fs = Math.max(fs * (avail / w), R * 0.036);
        ctx.font = "500 " + fs + "px " + LABEL_FONT;
        while (ctx.measureText(text).width > avail && text.length > 3) text = text.slice(0, -2) + "…";
      }
      ctx.globalAlpha = s.disabled ? 0.3 : 1;
      ctx.fillStyle = s.disabled ? "#8f7068" : "#f4e3d7";
      ctx.shadowColor = "rgba(0,0,0,.95)";
      ctx.shadowBlur = R * 0.02;
      ctx.fillText(text, x, 0);
      ctx.shadowBlur = 0;

      if (s.disabled) {
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = "#ff3326";
        ctx.lineWidth = Math.max(1.5, R * 0.008);
        ctx.beginPath();
        ctx.moveTo(labelInner - R * 0.02, 0);
        ctx.lineTo(labelOuter, 0);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ---- inner rings ----
    ctx.beginPath(); ctx.arc(cx, cy, hubR * 1.25, 0, TAU);
    ctx.strokeStyle = "rgba(240,115,90,.35)"; ctx.lineWidth = Math.max(1, R * 0.006); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, hubR * 1.25 + R * 0.025, 0, TAU);
    ctx.setLineDash([R * 0.012, R * 0.02]);
    ctx.strokeStyle = "rgba(255,80,60,.22)"; ctx.lineWidth = Math.max(1, R * 0.006); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(cx, cy, rimIn, 0, TAU);
    ctx.strokeStyle = "rgba(0,0,0,.85)"; ctx.lineWidth = R * 0.012; ctx.stroke();

    // ---- grime + sheen ----
    var sheen = ctx.createLinearGradient(0, 0, size, size);
    sheen.addColorStop(0, "rgba(255,200,180,.05)");
    sheen.addColorStop(0.5, "rgba(255,255,255,0)");
    sheen.addColorStop(1, "rgba(0,0,0,.35)");
    ctx.beginPath(); ctx.arc(cx, cy, rimIn, 0, TAU); ctx.fillStyle = sheen; ctx.fill();
  };

  Wheel.prototype._apply = function () {
    this.rotor.style.transform = "rotate(" + this.angle.toFixed(3) + "deg)";
  };

  Wheel.prototype._applyFlap = function () {
    if (this.pointer) this.pointer.style.transform = "translateX(-50%) rotate(" + this.flap.toFixed(2) + "deg)";
  };

  /** Index of the segment currently under the pointer. */
  Wheel.prototype.indexAt = function (angle) {
    var n = this.segments.length;
    if (!n) return -1;
    return Math.floor(mod(-angle, 360) / (360 / n)) % n;
  };

  /** Which peg (segment boundary) the pointer has passed — counts up forever. */
  Wheel.prototype._pegCount = function (angle) {
    return Math.floor(angle / (360 / this.segments.length));
  };

  /**
   * Spin so that `target` ends under the pointer and stays there.
   * opts.onTick(speed01) fires each time a peg hits the flapper.
   */
  Wheel.prototype.spin = function (target, opts) {
    opts = opts || {};
    var self = this;
    var n = this.segments.length;
    var segDeg = 360 / n;
    var duration = opts.duration || (reduceMotion ? 1600 : 8200);
    var turns = reduceMotion ? 1 : 5 + Math.floor(Math.random() * 3);
    // land inside the segment, comfortably away from the pegs
    var jitter = (Math.random() - 0.5) * segDeg * 0.56;
    var base = mod(-((target + 0.5) * segDeg + jitter), 360);
    var start = this.angle;
    var end = start - mod(start, 360) + base + turns * 360;
    if (end - start < turns * 360) end += 360;
    var delta = end - start;

    this.spinning = true;
    var lastPeg = this._pegCount(start);

    return new Promise(function (resolve) {
      var t0 = null, prevNow = null, prevAngle = start;
      function frame(now) {
        if (t0 === null) { t0 = now; prevNow = now; }
        var t = Math.min(1, (now - t0) / duration);
        var dt = Math.min(0.05, (now - prevNow) / 1000) || 0.016;
        prevNow = now;

        self.angle = start + delta * easeOut(t);
        self._apply();

        // degrees per second right now → 0..1
        var speed = Math.min(1, Math.abs(self.angle - prevAngle) / dt / 1400);
        prevAngle = self.angle;

        var peg = self._pegCount(self.angle);
        if (peg !== lastPeg) {
          lastPeg = peg;
          // a peg slaps the flapper back; harder when slow (more contact time)
          self.flapVel -= 260 + (1 - speed) * 380;
          if (opts.onTick) opts.onTick(speed);
        }
        // damped spring pulls the flapper back to centre
        var k = 520, c = 18;
        self.flapVel += (-k * self.flap - c * self.flapVel) * dt;
        self.flap += self.flapVel * dt;
        if (self.flap < -32) { self.flap = -32; self.flapVel = Math.max(0, self.flapVel); }
        self._applyFlap();

        if (t < 1) { requestAnimationFrame(frame); return; }
        self.spinning = false;
        self._settleFlap();
        resolve(self.indexAt(self.angle));
      }
      requestAnimationFrame(frame);
    });
  };

  // let the flapper wobble to rest after the wheel stops
  Wheel.prototype._settleFlap = function () {
    var self = this, prev = null;
    function frame(now) {
      if (self.spinning) return;
      var dt = prev ? Math.min(0.05, (now - prev) / 1000) : 0.016;
      prev = now;
      self.flapVel += (-520 * self.flap - 14 * self.flapVel) * dt;
      self.flap += self.flapVel * dt;
      self._applyFlap();
      if (Math.abs(self.flap) > 0.05 || Math.abs(self.flapVel) > 0.5) requestAnimationFrame(frame);
      else { self.flap = 0; self.flapVel = 0; self._applyFlap(); }
    }
    requestAnimationFrame(frame);
  };

  /** Snap (no animation) so that `target` sits under the pointer. */
  Wheel.prototype.show = function (target) {
    if (target < 0) return;
    var segDeg = 360 / this.segments.length;
    this.angle = mod(-((target + 0.5) * segDeg), 360);
    this._apply();
  };

  window.Wheel = Wheel;
})();
