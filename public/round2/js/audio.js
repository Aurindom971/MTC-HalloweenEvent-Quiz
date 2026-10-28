/* =========================================================
   Procedural sound — no audio files, all WebAudio.
   • Background: a warped music-box lullaby in A minor over a
     low drone and wind, drenched in a cavernous reverb.
   • Effects: peg ticks, thunder, reveal stings, screams for
     jump scares, zombie groans, whispers, door creaks, and a
     heartbeat for the final minute before the twist.
   Browsers only allow audio after a tap, so the splash screen's
   "Enter" button is what switches it on.
   ========================================================= */

(function () {
  "use strict";

  var Ctx = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, fxBus = null, musicBus = null, reverb = null, noiseBuf = null;
  var enabled = false;
  // Local testing only: ?silent=1 mutes sound; ?silent=off unmutes.
  // By default sound is enabled whenever the user clicks Enter or Sound On.
  var SILENT = (function () {
    var m = /[?&]silent(?:=([^&]*))?/.exec(location.search);
    if (!m) return false;
    var on = m[1] !== "off" && m[1] !== "0";
    try {
      if (on) localStorage.setItem("woc.silent", "1");
      else localStorage.removeItem("woc.silent");
      return on;
    } catch (e) { return on; }
  })();
  var droneNodes = null, musicTimer = null, heartTimer = null;

  /* ---------- setup ---------- */

  function makeImpulse(seconds, decay) {
    var rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    var buf = ctx.createBuffer(2, len, rate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  // Just the AudioContext: enough to ask whether sound may start yet.
  function makeCtx() {
    if (ctx || !Ctx) return !!ctx;
    try {
      // iPhones: play even with the ring/silent switch on
      try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
      ctx = new Ctx();
    } catch (e) { ctx = null; }
    return !!ctx;
  }

  // The whole sound engine. Built only when sound is switched on, so a phone
  // isn't busy making reverb while the page is still loading.
  function init() {
    if (master) return true;
    if (!makeCtx()) return false;
    try {
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      master = ctx.createGain(); master.gain.value = SILENT ? 0 : 0.9;
      master.connect(comp); comp.connect(ctx.destination);

      reverb = ctx.createConvolver();
      reverb.buffer = makeImpulse(3.4, 2.6);
      var wet = ctx.createGain(); wet.gain.value = 0.55;
      reverb.connect(wet); wet.connect(master);

      fxBus = ctx.createGain(); fxBus.gain.value = 1;
      fxBus.connect(master);
      var fxSend = ctx.createGain(); fxSend.gain.value = 0.25;
      fxBus.connect(fxSend); fxSend.connect(reverb);

      musicBus = ctx.createGain(); musicBus.gain.value = 0;
      musicBus.connect(master);
      var musicSend = ctx.createGain(); musicSend.gain.value = 0.9;
      musicBus.connect(musicSend); musicSend.connect(reverb);

      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      var nd = noiseBuf.getChannelData(0);
      for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    } catch (e) { master = null; return false; }
    return true;
  }

  function noise(loop) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = !!loop;
    return src;
  }
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function panner(x) {
    if (!ctx.createStereoPanner) return ctx.createGain();
    var p = ctx.createStereoPanner(); p.pan.value = x; return p;
  }
  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  /* ---------- drone + wind ---------- */

  function startDrone() {
    if (droneNodes) return;
    var t = ctx.currentTime;
    var out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.055, t + 5);
    var lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 220; lp.Q.value = 7;
    var lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
    lfo.frequency.value = 0.05; lfoGain.gain.value = 120;
    lfo.connect(lfoGain); lfoGain.connect(lp.frequency);
    var oscs = [55, 55.45, 82.1, 77.8].map(function (f, i) {
      var o = ctx.createOscillator();
      o.type = i < 2 ? "sawtooth" : "triangle";
      o.frequency.value = f;
      var g = ctx.createGain(); g.gain.value = i < 2 ? 0.5 : 0.14; // 77.8 vs 82.1 = a sour semitone
      o.connect(g); g.connect(lp); o.start();
      return o;
    });
    var wind = noise(true), wf = ctx.createBiquadFilter(), wg = ctx.createGain();
    wf.type = "bandpass"; wf.frequency.value = 450; wf.Q.value = 0.8; wg.gain.value = 0.35;
    var wl = ctx.createOscillator(), wlg = ctx.createGain();
    wl.frequency.value = 0.09; wlg.gain.value = 300; wl.connect(wlg); wlg.connect(wf.frequency);
    wind.connect(wf); wf.connect(wg); wg.connect(out);
    wind.start(); wl.start(); lfo.start();
    lp.connect(out); out.connect(master);
    var send = ctx.createGain(); send.gain.value = 0.3; out.connect(send); send.connect(reverb);
    droneNodes = { out: out, lp: lp, stop: oscs.concat([lfo, wind, wl]) };
  }

  function stopDrone() {
    if (!droneNodes) return;
    var n = droneNodes, t = ctx.currentTime;
    droneNodes = null;
    n.out.gain.cancelScheduledValues(t);
    n.out.gain.setValueAtTime(n.out.gain.value, t);
    n.out.gain.linearRampToValueAtTime(0, t + 0.8);
    setTimeout(function () { n.stop.forEach(function (o) { try { o.stop(); } catch (e) {} }); }, 900);
  }

  /* ---------- the music box ---------- */

  // A creepy lullaby in A harmonic minor. null = rest. Each step is an eighth note.
  var MELODY = [
    69, null, 72, 76, 75, 76, 72, null,   69, 71, 72, 71, 68, null, 64, null,
    69, null, 72, 76, 77, 76, 75, null,   76, 74, 72, 71, 72, 69, null, null,
    81, null, 79, 77, 76, null, 77, 76,   75, null, 72, 74, 71, null, 68, null,
    69, 72, 71, 68, 69, null, 64, null,   65, 64, 63, 64, 69, null, null, null
  ];
  // one bass note per bar (8 steps): Am  E  Am  F  | F  E  Dm  E/Am
  var BASS = [45, 40, 45, 41, 41, 40, 38, 45];
  var step = 0, nextTime = 0, tempo = 0.36, windDown = 0;

  function musicBoxNote(freq, t, vel) {
    var cents = (Math.random() - 0.5) * 14;
    var f = freq * Math.pow(2, cents / 1200);
    var out = ctx.createGain();
    env(out, t, 0.004, 0.16 * vel, 1.9);
    var pan = panner((Math.random() - 0.5) * 0.6);
    // tape-warble shared by every partial
    var vib = ctx.createOscillator(), vg = ctx.createGain();
    vib.frequency.value = 5.5; vg.gain.value = f * 0.004;
    vib.connect(vg);
    [[1, 1], [2, 0.32], [3.01, 0.14], [4.2, 0.05]].forEach(function (p) {
      var o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(f * p[0], t);
      vg.connect(o.frequency);
      var g = ctx.createGain(); g.gain.value = p[1];
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + 2.1);
    });
    out.connect(pan); pan.connect(musicBus);
    vib.start(t); vib.stop(t + 2.1);
  }

  function bassNote(freq, t, len) {
    var o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = "triangle"; o.frequency.value = freq;
    o2.type = "sine"; o2.frequency.value = freq * 0.5;
    lp.type = "lowpass"; lp.frequency.value = 420;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.11, t + 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(musicBus);
    o.start(t); o2.start(t); o.stop(t + len + 0.1); o2.stop(t + len + 0.1);
  }

  function scheduler() {
    while (nextTime < ctx.currentTime + 0.4) {
      var i = step % MELODY.length;
      // every 4th loop the music box winds down on its last phrase, then snaps back
      var loop = Math.floor(step / MELODY.length);
      var dying = loop % 4 === 3 && i >= 48;
      var stepLen = tempo * (dying ? 1 + (i - 48) * 0.09 : 1);
      if (MELODY[i] != null) musicBoxNote(midi(MELODY[i]) * (dying ? 1 - (i - 48) * 0.004 : 1), nextTime, i % 8 === 0 ? 1 : 0.75);
      if (i % 8 === 0) bassNote(midi(BASS[(i / 8) % BASS.length]), nextTime, tempo * 8 * 1.1);
      nextTime += stepLen;
      step++;
    }
  }

  function startMusic() {
    if (musicTimer) return;
    var t = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(musicBus.gain.value, t);
    musicBus.gain.linearRampToValueAtTime(0.75, t + 3);
    nextTime = t + 0.4;
    scheduler();
    musicTimer = setInterval(scheduler, 120);
  }

  function stopMusic() {
    if (!musicTimer) return;
    clearInterval(musicTimer); musicTimer = null;
    var t = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(musicBus.gain.value, t);
    musicBus.gain.linearRampToValueAtTime(0, t + 0.6);
  }

  /* ---------- heartbeat ---------- */

  function thump(t, strength) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.16);
    env(g, t, 0.01, 0.55 * strength, 0.22);
    o.connect(g); g.connect(fxBus); o.start(t); o.stop(t + 0.3);
  }

  /* ---------- the laugh (assets/audio/creepy-laugh.mp3) ---------- */

  // The file holds ten separate laughs; we only ever play ONE of them.
  var LAUGH_URL = "assets/audio/creepy-laugh.mp3";
  var LAUGHS = [[0.05, 3.65], [5.3, 9.65], [10.6, 14.9], [15.9, 19.55], [21.25, 24.65],
                [27.55, 32.7], [34.5, 38.6], [41.15, 44.45], [48.15, 52.85], [55.45, 59.95]];
  var laughBuf = null, laughEl = null, lastLaugh = -1, laughLoading = false, laughQueued = false;

  // Start downloading the laugh as soon as the page itself has loaded, so the
  // very first laugh (right as you enter the crypt) isn't lost waiting for the
  // network, without the 650 KB file slowing the page down on a phone.
  var laughBytes = null, laughFetched = false;
  function fetchLaugh() {
    if (laughFetched) return;
    laughFetched = true;
    try {
      fetch(LAUGH_URL).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(function (ab) { laughBytes = ab; if (ctx) loadLaugh(); })
        .catch(function () { laughBytes = false; if (ctx) loadLaugh(); });
    } catch (e) { laughBytes = false; }
  }
  if (document.readyState === "complete") fetchLaugh();
  else window.addEventListener("load", fetchLaugh, { once: true });

  function loadLaugh() {
    fetchLaugh(); // sound switched on before the page finished loading
    if (laughBuf || laughLoading || laughBytes === null) return;
    laughLoading = true;
    if (laughBytes) {
      // decoded through WebAudio when served over http(s)…
      new Promise(function (res, rej) { ctx.decodeAudioData(laughBytes.slice(0), res, rej); })
        .then(function (b) { laughBuf = b; if (laughQueued) { laughQueued = false; Sound.laugh(true); } })
        .catch(useElement);
    } else {
      useElement();
    }
  }
  // …or a plain <audio> element when opened straight from disk (file://)
  function useElement() {
    laughEl = new Audio(LAUGH_URL);
    laughEl.preload = "auto";
    laughEl.muted = SILENT;
    if (laughQueued) { laughQueued = false; setTimeout(function () { Sound.laugh(true); }, 300); }
  }

  function pickLaugh() {
    var i;
    do { i = Math.floor(Math.random() * LAUGHS.length); } while (i === lastLaugh && LAUGHS.length > 1);
    lastLaugh = i;
    return LAUGHS[i];
  }

  /* ---------- the analog monster theme ---------- */

  // A warped VHS-horror synth stinger: detuned saws on a minor chord with a
  // flat second, tape wow, a slow filter swell, crackle and a sub drop.
  function analogTheme() {
    var t = ctx.currentTime, dur = 6.5;
    duckMusic(dur);
    var out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.16, t + 1.2);
    out.gain.setValueAtTime(0.16, t + dur - 2);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.Q.value = 9;
    lp.frequency.setValueAtTime(180, t);
    lp.frequency.exponentialRampToValueAtTime(1600, t + 2.6);
    lp.frequency.exponentialRampToValueAtTime(300, t + dur);
    var wow = ctx.createOscillator(), wowG = ctx.createGain();
    wow.frequency.value = 0.6; wowG.gain.value = 9; wow.connect(wowG);
    var roots = [[45, 48, 52, 46], [41, 44, 48, 42], [43, 46, 50, 44]][Math.floor(Math.random() * 3)];
    var oscs = [wow];
    roots.forEach(function (m, i) {
      [-7, 7].forEach(function (cents) {
        var o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = midi(m + 12);
        o.detune.value = cents;
        wowG.connect(o.detune);
        var g = ctx.createGain(); g.gain.value = i === 3 ? 0.35 : 0.5;
        o.connect(g); g.connect(lp);
        oscs.push(o);
      });
    });
    // falling arpeggio on top
    var arp = [76, 72, 69, 68, 64];
    arp.forEach(function (m, i) {
      var st = t + 1.4 + i * 0.42;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square"; o.frequency.value = midi(m);
      wowG.connect(o.detune);
      env(g, st, 0.01, 0.05, 0.6);
      var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1800;
      o.connect(f); f.connect(g); g.connect(out);
      o.start(st); o.stop(st + 0.7);
    });
    // tape crackle
    var cr = noise(true), crf = ctx.createBiquadFilter(), crg = ctx.createGain();
    crf.type = "highpass"; crf.frequency.value = 3000; crg.gain.value = 0.05;
    cr.connect(crf); crf.connect(crg); crg.connect(out);
    oscs.push(cr);
    // sub drop
    var sub = ctx.createOscillator(), sg = ctx.createGain();
    sub.frequency.setValueAtTime(80, t); sub.frequency.exponentialRampToValueAtTime(30, t + 2.5);
    env(sg, t, 0.05, 0.4, 2.6);
    sub.connect(sg); sg.connect(fxBus); sub.start(t); sub.stop(t + 3);
    lp.connect(out); out.connect(fxBus);
    oscs.forEach(function (o) { o.start(t); o.stop(t + dur + 0.1); });
  }

  // quiet the music box while something else has the stage
  function duckMusic(sec) {
    if (!musicBus) return;
    var t = ctx.currentTime, g = musicBus.gain;
    var target = musicTimer ? 0.75 : 0;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(target * 0.15, t + 0.4);
    g.setValueAtTime(target * 0.15, t + sec);
    g.linearRampToValueAtTime(target, t + sec + 2);
  }

  /* ---------- odd noises for the random haunting ---------- */

  function knock() {
    var t = ctx.currentTime;
    var gaps = Math.random() < 0.5 ? [0, 0.32, 0.64] : [0, 0.3, 0.6, 1.5];
    gaps.forEach(function (gap) {
      var st = t + gap;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(140, st); o.frequency.exponentialRampToValueAtTime(70, st + 0.08);
      env(g, st, 0.002, 0.6, 0.12);
      var n = noise(false), bp = ctx.createBiquadFilter(), ng = ctx.createGain();
      bp.type = "bandpass"; bp.frequency.value = 900; bp.Q.value = 2;
      env(ng, st, 0.001, 0.25, 0.05);
      var p = panner(-0.6);
      o.connect(g); g.connect(p); n.connect(bp); bp.connect(ng); ng.connect(p); p.connect(fxBus);
      o.start(st); o.stop(st + 0.2); n.start(st); n.stop(st + 0.1);
    });
  }

  function chains() {
    var t = ctx.currentTime, p = panner((Math.random() - 0.5) * 1.6);
    for (var i = 0; i < 14; i++) {
      var st = t + i * (0.05 + Math.random() * 0.09);
      [2300, 3700, 5200].forEach(function (f) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine"; o.frequency.value = f * (0.95 + Math.random() * 0.1);
        env(g, st, 0.002, 0.03, 0.25);
        o.connect(g); g.connect(p); o.start(st); o.stop(st + 0.3);
      });
    }
    p.connect(fxBus);
  }

  function breath() {
    var t = ctx.currentTime;
    [0, 1.5].forEach(function (off, i) {
      var st = t + off;
      var n = noise(false), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      bp.type = "bandpass"; bp.Q.value = 1;
      bp.frequency.setValueAtTime(i ? 900 : 600, st); bp.frequency.linearRampToValueAtTime(i ? 500 : 1100, st + 1.1);
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.22, st + 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 1.2);
      n.connect(bp); bp.connect(g); g.connect(fxBus);
      n.start(st); n.stop(st + 1.3);
    });
  }

  function scrape() {
    var t = ctx.currentTime, dur = 2.2;
    var n = noise(true), bp = ctx.createBiquadFilter(), g = ctx.createGain(), p = panner(0.7);
    bp.type = "bandpass"; bp.Q.value = 12;
    bp.frequency.setValueAtTime(1400, t); bp.frequency.linearRampToValueAtTime(2600, t + dur);
    var am = ctx.createOscillator(), amg = ctx.createGain();
    am.frequency.value = 17; amg.gain.value = 0.12; am.connect(amg); amg.connect(g.gain);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(bp); bp.connect(g); g.connect(p); p.connect(fxBus);
    n.start(t); am.start(t); n.stop(t + dur); am.stop(t + dur);
  }

  function distantScream() {
    var t = ctx.currentTime;
    var o = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), p = panner(Math.random() < 0.5 ? -0.9 : 0.9);
    o.type = "sawtooth"; o2.type = "sawtooth";
    o.frequency.setValueAtTime(700, t); o.frequency.linearRampToValueAtTime(1100, t + 0.4); o.frequency.linearRampToValueAtTime(600, t + 1.6);
    o2.frequency.setValueAtTime(712, t); o2.frequency.linearRampToValueAtTime(1080, t + 0.4); o2.frequency.linearRampToValueAtTime(590, t + 1.6);
    lp.type = "lowpass"; lp.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(p); p.connect(reverb);
    o.start(t); o2.start(t); o.stop(t + 1.8); o2.stop(t + 1.8);
  }

  /* ---------- analog oddities ---------- */

  // the classic 1950s horror wail: a sine sliding between notes with heavy vibrato
  function theremin() {
    var t = ctx.currentTime, dur = 3.6;
    var o = ctx.createOscillator(), g = ctx.createGain(), p = panner((Math.random() - 0.5) * 1.2);
    o.type = "sine";
    var notes = [midi(69), midi(74), midi(72), midi(68)];
    o.frequency.setValueAtTime(notes[0] * 0.9, t);
    o.frequency.exponentialRampToValueAtTime(notes[1], t + 0.9);
    o.frequency.exponentialRampToValueAtTime(notes[2], t + 1.8);
    o.frequency.exponentialRampToValueAtTime(notes[3], t + 2.8);
    var vib = ctx.createOscillator(), vg = ctx.createGain();
    vib.frequency.value = 6.2; vg.gain.value = 9; vib.connect(vg); vg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.6);
    g.gain.setValueAtTime(0.12, t + dur - 1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var send = ctx.createGain(); send.gain.value = 0.7;
    o.connect(g); g.connect(p); p.connect(fxBus); g.connect(send); send.connect(reverb);
    o.start(t); vib.start(t); o.stop(t + dur); vib.stop(t + dur);
  }

  // an old radio drifting between stations — static, a squeal, a voice-like murmur
  function radio() {
    var t = ctx.currentTime, dur = 3.2;
    var n = noise(true), bp = ctx.createBiquadFilter(), g = ctx.createGain(), p = panner((Math.random() - 0.5) * 1.4);
    bp.type = "bandpass"; bp.Q.value = 2;
    bp.frequency.setValueAtTime(800, t); bp.frequency.linearRampToValueAtTime(2600, t + 1.2); bp.frequency.linearRampToValueAtTime(1100, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.2); g.gain.setValueAtTime(0.09, t + dur - 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(bp); bp.connect(g); g.connect(p); p.connect(fxBus);
    // heterodyne whistle as the dial sweeps
    var w = ctx.createOscillator(), wg = ctx.createGain();
    w.frequency.setValueAtTime(3400, t + 0.6); w.frequency.exponentialRampToValueAtTime(600, t + 1.6);
    env(wg, t + 0.6, 0.05, 0.03, 0.9);
    w.connect(wg); wg.connect(p);
    // a "voice" — formant-filtered buzz, too garbled to understand
    var v = ctx.createOscillator(), f1 = ctx.createBiquadFilter(), vgain = ctx.createGain();
    v.type = "sawtooth"; v.frequency.setValueAtTime(130, t + 1.6); v.frequency.linearRampToValueAtTime(105, t + 2.8);
    f1.type = "bandpass"; f1.Q.value = 5; f1.frequency.setValueAtTime(700, t + 1.6); f1.frequency.linearRampToValueAtTime(1100, t + 2.2); f1.frequency.linearRampToValueAtTime(500, t + 2.8);
    var am = ctx.createOscillator(), amg = ctx.createGain(); am.frequency.value = 4.5; amg.gain.value = 0.04;
    am.connect(amg); amg.connect(vgain.gain);
    vgain.gain.setValueAtTime(0.0001, t); vgain.gain.setValueAtTime(0.0001, t + 1.6); vgain.gain.linearRampToValueAtTime(0.05, t + 1.8); vgain.gain.linearRampToValueAtTime(0.0001, t + 2.9);
    v.connect(f1); f1.connect(vgain); vgain.connect(p);
    n.start(t); n.stop(t + dur); w.start(t + 0.6); w.stop(t + 1.7); v.start(t + 1.6); v.stop(t + 3); am.start(t + 1.6); am.stop(t + 3);
  }

  // VHS tape: mains hum, crackle, then the tape stretches and warps down
  function tape() {
    var t = ctx.currentTime, dur = 2.8;
    var hum = ctx.createOscillator(), hg = ctx.createGain();
    hum.type = "sawtooth"; hum.frequency.value = 50;
    var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 400;
    hg.gain.setValueAtTime(0.0001, t); hg.gain.exponentialRampToValueAtTime(0.06, t + 0.3); hg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    hum.connect(lp); lp.connect(hg); hg.connect(fxBus);
    var tone = ctx.createOscillator(), tg = ctx.createGain();
    tone.type = "triangle";
    tone.frequency.setValueAtTime(midi(76), t + 0.5); tone.frequency.exponentialRampToValueAtTime(midi(52), t + 2.4);
    env(tg, t + 0.5, 0.05, 0.06, 1.9);
    tone.connect(tg); tg.connect(fxBus);
    var cr = noise(false), crf = ctx.createBiquadFilter(), crg = ctx.createGain();
    crf.type = "highpass"; crf.frequency.value = 2500; env(crg, t, 0.05, 0.05, dur - 0.2);
    cr.connect(crf); crf.connect(crg); crg.connect(fxBus);
    hum.start(t); hum.stop(t + dur); tone.start(t + 0.5); tone.stop(t + 2.5); cr.start(t); cr.stop(t + dur);
  }

  // a low analog synth pulse, like something approaching
  function dread() {
    var t = ctx.currentTime;
    duckMusic(5);
    for (var i = 0; i < 8; i++) {
      var st = t + i * 0.55 * (1 - i * 0.04);
      var o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = "sawtooth"; o.frequency.value = i % 4 === 3 ? 46.25 : 43.65; // F1 with a sour step
      lp.type = "lowpass"; lp.Q.value = 10;
      lp.frequency.setValueAtTime(120 + i * 40, st); lp.frequency.exponentialRampToValueAtTime(70, st + 0.4);
      env(g, st, 0.01, 0.22 + i * 0.02, 0.45);
      o.connect(lp); lp.connect(g); g.connect(fxBus);
      o.start(st); o.stop(st + 0.5);
    }
  }

  // the music box hiccups: a few notes, wrong and slowing
  function boxGlitch() {
    var t = ctx.currentTime;
    [81, 80, 76, 75, 69].forEach(function (m, i) {
      musicBoxNote(midi(m) * (1 - i * 0.012), t + i * (0.22 + i * 0.07), 0.9);
    });
  }

  // a church bell somewhere far away
  function farBell() {
    var t = ctx.currentTime;
    [0, 2.4, 4.8].forEach(function (off) {
      [98, 196 * 1.2, 294 * 1.08, 392 * 1.42].forEach(function (f, i) {
        var o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
        o.type = "sine"; o.frequency.value = f;
        lp.type = "lowpass"; lp.frequency.value = 900;
        env(g, t + off, 0.01, 0.07 / (i + 1), 3.5);
        o.connect(lp); lp.connect(g); g.connect(reverb);
        o.start(t + off); o.stop(t + off + 3.8);
      });
    });
  }

  // every so often, something unseen makes a noise…
  var hauntTimer = null, laughTimer = null, tension = 0, lastLaughAt = 0;
  function haunt() {
    clearTimeout(hauntTimer);
    if (!enabled) return;
    var wait = (tension ? 15000 : 24000) + Math.random() * (tension ? 20000 : 30000);
    hauntTimer = setTimeout(function () {
      if (enabled && !document.hidden) {
        var pool = [knock, chains, breath, scrape, distantScream, Sound.whisper, Sound.creak,
                    theremin, radio, tape, dread, boxGlitch, farBell, theremin, radio, tape];
        pool[Math.floor(Math.random() * pool.length)]();
      }
      haunt();
    }, wait);
  }
  // …and something out there keeps laughing — one random laugh at a time
  function laughLoop() {
    clearTimeout(laughTimer);
    if (!enabled) return;
    var wait = (tension ? 18000 : 25000) + Math.random() * (tension ? 22000 : 30000);
    laughTimer = setTimeout(function () {
      if (enabled && !document.hidden) Sound.laugh();
      laughLoop();
    }, wait);
  }

  /* ---------- public API ---------- */

  var Sound = {
    get enabled() { return enabled; },
    /** True in a browser muted for local testing (see SILENT): media elements stay muted too. */
    get silent() { return SILENT; },

    /** True when this browser lets the page make sound before anyone has tapped. */
    canAutoplay: function () {
      if (navigator.getAutoplayPolicy) {
        try { return navigator.getAutoplayPolicy("audiocontext") === "allowed"; } catch (e) {}
      }
      return makeCtx() && ctx.state === "running";
    },

    setEnabled: function (on) {
      if (on && !init()) return false;
      enabled = !!on;
      if (enabled) {
        if (ctx.state === "suspended") ctx.resume();
        startDrone();
        startMusic();
        loadLaugh();
        if (laughEl) { laughEl.muted = true; laughEl.play().then(function () { laughEl.pause(); laughEl.muted = SILENT; }).catch(function () {}); }
        haunt();
        laughLoop();
      } else if (ctx) {
        stopDrone();
        stopMusic();
        clearTimeout(hauntTimer);
        clearTimeout(laughTimer);
        this.heartbeat(0);
      }
      return enabled;
    },

    /** One random laugh from the clip — never the whole file. */
    laugh: function (force) {
      if (!enabled) return;
      // never two laughs on top of each other
      if (!force && Date.now() - lastLaughAt < 20000) return;
      if (!laughBuf && !laughEl) { laughQueued = true; loadLaugh(); return; }
      lastLaughAt = Date.now();
      var seg = pickLaugh(), len = seg[1] - seg[0];
      duckMusic(len);
      if (laughBuf) {
        var t = ctx.currentTime;
        var src = ctx.createBufferSource(), g = ctx.createGain(), p = panner((Math.random() - 0.5) * 1.4);
        src.buffer = laughBuf;
        src.playbackRate.value = 0.86 + Math.random() * 0.14; // a touch lower and slower = creepier
        var real = len / src.playbackRate.value;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.85, t + 0.08);
        g.gain.setValueAtTime(0.85, t + real - 0.4);
        g.gain.exponentialRampToValueAtTime(0.0001, t + real);
        var send = ctx.createGain(); send.gain.value = 0.5;
        src.connect(g); g.connect(p); p.connect(fxBus); g.connect(send); send.connect(reverb);
        src.start(t, seg[0], len);
      } else if (laughEl) {
        try {
          laughEl.currentTime = seg[0];
          laughEl.volume = 0.85;
          laughEl.play().catch(function () {});
          setTimeout(function () { laughEl.pause(); }, len * 1000);
        } catch (e) {}
      }
    },

    /** Analog horror-synth theme for when a monster shows up. */
    monsterTheme: function () { if (enabled) analogTheme(); },

    /** 0 = calm, 1 = the twist wheel is chained: noises come more often. */
    setTension: function (v) { var changed = tension !== v; tension = v; if (changed && enabled) { haunt(); laughLoop(); } },

    knock: function () { if (enabled) knock(); },
    breath: function () { if (enabled) breath(); },
    theremin: function () { if (enabled) theremin(); },
    radio: function () { if (enabled) radio(); },
    tape: function () { if (enabled) tape(); },
    dread: function () { if (enabled) dread(); },
    farBell: function () { if (enabled) farBell(); },
    chains: function () { if (enabled) chains(); },

    tick: function (speed) {
      if (!enabled) return;
      var t = ctx.currentTime;
      // a wooden clack — brighter when the wheel is fast
      var n = noise(false), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      bp.type = "bandpass"; bp.frequency.value = 1800 + 1800 * (speed || 0); bp.Q.value = 4;
      env(g, t, 0.001, 0.5, 0.035);
      n.connect(bp); bp.connect(g); g.connect(fxBus);
      n.start(t); n.stop(t + 0.06);
    },

    thunder: function () {
      if (!enabled) return;
      var t = ctx.currentTime + 0.25 + Math.random() * 0.6;
      var n = noise(true), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      lp.type = "lowpass"; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(60, t + 3);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.6, t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
      n.connect(lp); lp.connect(g); g.connect(fxBus);
      n.start(t); n.stop(t + 3.8);
    },

    reveal: function () {
      if (!enabled) return;
      var t = ctx.currentTime;
      [110, 116.5, 155.6, 233].forEach(function (f, i) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = i % 2 ? "sawtooth" : "triangle";
        o.frequency.setValueAtTime(f, t);
        o.frequency.linearRampToValueAtTime(f * 1.012, t + 1.6);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.07, t + 0.5);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
        var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1300;
        o.connect(lp); lp.connect(g); g.connect(fxBus);
        o.start(t); o.stop(t + 2.5);
      });
      thump(t, 1.2);
    },

    bell: function () {
      if (!enabled) return;
      var t = ctx.currentTime;
      [0, 1.6].forEach(function (off) {
        [110, 220 * 1.19, 330 * 1.07, 440 * 1.41, 660 * 1.18].forEach(function (f, i) {
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.type = "sine"; o.frequency.value = f;
          env(g, t + off, 0.005, 0.22 / (i + 1), 4 - i * 0.5);
          o.connect(g); g.connect(fxBus); o.start(t + off); o.stop(t + off + 4.5);
        });
      });
    },

    whoosh: function () {
      if (!enabled) return;
      var t = ctx.currentTime;
      var n = noise(false), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      bp.type = "bandpass"; bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(2400, t + 0.35);
      env(g, t, 0.12, 0.3, 0.3);
      n.connect(bp); bp.connect(g); g.connect(fxBus); n.start(t); n.stop(t + 0.6);
    },

    // a spider's hiss
    hiss: function () {
      if (!enabled) return;
      var t = ctx.currentTime;
      var n = noise(false), hp = ctx.createBiquadFilter(), g = ctx.createGain();
      hp.type = "highpass"; hp.frequency.setValueAtTime(2600, t); hp.frequency.linearRampToValueAtTime(4200, t + 0.6);
      env(g, t, 0.02, 0.32, 0.7);
      n.connect(hp); hp.connect(g); g.connect(fxBus); n.start(t); n.stop(t + 0.9);
    },

    // jump-scare shriek
    scream: function () {
      if (!enabled) return;
      var t = ctx.currentTime;
      var shaper = ctx.createWaveShaper(), curve = new Float32Array(1024);
      for (var i = 0; i < 1024; i++) { var x = i / 512 - 1; curve[i] = Math.tanh(x * 6); }
      shaper.curve = curve;
      var out = ctx.createGain();
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(0.45, t + 0.03);
      out.gain.setValueAtTime(0.45, t + 0.5);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
      [620, 655, 910, 1240].forEach(function (f) {
        var o = ctx.createOscillator(); o.type = "sawtooth";
        o.frequency.setValueAtTime(f * 0.7, t);
        o.frequency.exponentialRampToValueAtTime(f * 1.35, t + 0.25);
        o.frequency.exponentialRampToValueAtTime(f * 0.9, t + 1.2);
        var vib = ctx.createOscillator(), vg = ctx.createGain();
        vib.frequency.value = 11 + Math.random() * 6; vg.gain.value = f * 0.05;
        vib.connect(vg); vg.connect(o.frequency);
        var g = ctx.createGain(); g.gain.value = 0.18;
        o.connect(g); g.connect(shaper);
        o.start(t); vib.start(t); o.stop(t + 1.35); vib.stop(t + 1.35);
      });
      var n = noise(false), bp = ctx.createBiquadFilter(), ng = ctx.createGain();
      bp.type = "bandpass"; bp.frequency.setValueAtTime(1200, t); bp.frequency.exponentialRampToValueAtTime(3500, t + 0.3); bp.Q.value = 1.5;
      ng.gain.value = 0.5;
      n.connect(bp); bp.connect(ng); ng.connect(shaper);
      n.start(t); n.stop(t + 1.3);
      shaper.connect(out); out.connect(fxBus);
      thump(t, 1.6);
    },

    // the face at the door: a slam, strings bowed far too hard, and a shriek, all at once
    stinger: function () {
      if (!enabled) return;
      var t = ctx.currentTime;
      // the slam: a sub drop under a burst of noise
      var o = ctx.createOscillator(), og = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(28, t + 0.9);
      env(og, t, 0.005, 0.9, 1.1);
      o.connect(og); og.connect(fxBus); o.start(t); o.stop(t + 1.2);
      var n = noise(false), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
      nf.type = "lowpass"; nf.frequency.setValueAtTime(6000, t); nf.frequency.exponentialRampToValueAtTime(180, t + 0.6);
      env(ng, t, 0.003, 0.7, 0.7);
      n.connect(nf); nf.connect(ng); ng.connect(fxBus); n.start(t); n.stop(t + 0.8);
      // the strings: a clashing cluster, each one sliding flat as it dies
      var shaper = ctx.createWaveShaper(), curve = new Float32Array(1024);
      for (var i = 0; i < 1024; i++) { var x = i / 512 - 1; curve[i] = Math.tanh(x * 4); }
      shaper.curve = curve;
      var hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 500;
      var out = ctx.createGain();
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(0.5, t + 0.012);
      out.gain.setValueAtTime(0.5, t + 0.7);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      [1046, 1109, 1175, 1568, 1661, 2217].forEach(function (f, k) {
        var s = ctx.createOscillator(); s.type = "sawtooth";
        s.frequency.setValueAtTime(f * 1.06, t);
        s.frequency.exponentialRampToValueAtTime(f, t + 0.08);
        s.frequency.exponentialRampToValueAtTime(f * 0.94, t + 2.1);
        var vib = ctx.createOscillator(), vg = ctx.createGain();
        vib.frequency.value = 14 + Math.random() * 9; vg.gain.value = f * 0.025;
        vib.connect(vg); vg.connect(s.frequency);
        var g = ctx.createGain(); g.gain.value = 0.09;
        var p = panner(k % 2 ? 0.45 : -0.45);
        s.connect(g); g.connect(p); p.connect(shaper);
        s.start(t); vib.start(t); s.stop(t + 2.25); vib.stop(t + 2.25);
      });
      shaper.connect(hp); hp.connect(out); out.connect(fxBus);
      this.scream();
      thump(t, 1.8);
    },

    // "uuuurrrgh"
    groan: function (pan) {
      if (!enabled) return;
      var t = ctx.currentTime, dur = 1.6 + Math.random() * 0.8;
      var o = ctx.createOscillator(); o.type = "sawtooth";
      var base = 75 + Math.random() * 30;
      o.frequency.setValueAtTime(base * 1.2, t);
      o.frequency.linearRampToValueAtTime(base, t + dur);
      var vib = ctx.createOscillator(), vg = ctx.createGain();
      vib.frequency.value = 7; vg.gain.value = 4; vib.connect(vg); vg.connect(o.frequency);
      var f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter();
      f1.type = "bandpass"; f1.Q.value = 6; f1.frequency.setValueAtTime(380, t); f1.frequency.linearRampToValueAtTime(600, t + dur * 0.6);
      f2.type = "bandpass"; f2.Q.value = 8; f2.frequency.setValueAtTime(900, t); f2.frequency.linearRampToValueAtTime(1150, t + dur * 0.6);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      var p = panner(pan || 0);
      o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(p); p.connect(fxBus);
      o.start(t); vib.start(t); o.stop(t + dur + 0.1); vib.stop(t + dur + 0.1);
    },

    whisper: function () {
      if (!enabled) return;
      var t = ctx.currentTime;
      var p = panner(Math.random() < 0.5 ? -0.9 : 0.9);
      for (var k = 0; k < 3 + Math.floor(Math.random() * 3); k++) {
        var st = t + k * (0.18 + Math.random() * 0.12);
        var n = noise(false), hp = ctx.createBiquadFilter(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
        hp.type = "highpass"; hp.frequency.value = 1800;
        bp.type = "bandpass"; bp.Q.value = 3; bp.frequency.setValueAtTime(2500 + Math.random() * 2500, st);
        bp.frequency.linearRampToValueAtTime(1800 + Math.random() * 2000, st + 0.2);
        env(g, st, 0.04, 0.12, 0.18);
        n.connect(hp); hp.connect(bp); bp.connect(g); g.connect(p);
        n.start(st); n.stop(st + 0.3);
      }
      p.connect(fxBus);
    },

    creak: function () {
      if (!enabled) return;
      var t = ctx.currentTime, dur = 1.4;
      var o = ctx.createOscillator(); o.type = "sawtooth";
      o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(110, t + dur);
      var am = ctx.createOscillator(), amg = ctx.createGain(), g = ctx.createGain();
      am.type = "square"; am.frequency.setValueAtTime(22, t); am.frequency.linearRampToValueAtTime(38, t + dur);
      amg.gain.value = 0.5; g.gain.value = 0.5;
      am.connect(amg); amg.connect(g.gain);
      var bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 900; bp.Q.value = 5;
      var out = ctx.createGain(); env(out, t, 0.1, 0.35, dur);
      o.connect(bp); bp.connect(g); g.connect(out); out.connect(fxBus);
      o.start(t); am.start(t); o.stop(t + dur + 0.2); am.stop(t + dur + 0.2);
    },

    /** bpm 0 = stop. Used for the last minute before the twist. */
    heartbeat: function (bpm) {
      if (heartTimer) { clearTimeout(heartTimer); heartTimer = null; }
      if (!enabled || !bpm) return;
      function beat() {
        var t = ctx.currentTime;
        thump(t, 0.9); thump(t + 0.24, 0.6);
        heartTimer = setTimeout(beat, 60000 / bpm);
      }
      beat();
    },

    /* ---------- The Other Side: Cutscene Synthesizers ---------- */

    cutsceneFleshRip: function () {
      if (!enabled || !ctx || !noiseBuf) return;
      var t = ctx.currentTime;
      var src = ctx.createBufferSource(); src.buffer = noiseBuf;
      var bp = ctx.createBiquadFilter(); bp.type = "bandpass";
      bp.frequency.setValueAtTime(350, t);
      bp.frequency.exponentialRampToValueAtTime(1400, t + 0.18);
      bp.frequency.exponentialRampToValueAtTime(180, t + 0.6);
      bp.Q.value = 4.5;

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.7, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

      // Low squelch body
      var osc = ctx.createOscillator(); osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.5);
      var og = ctx.createGain();
      og.gain.setValueAtTime(0.5, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      src.connect(bp); bp.connect(g); g.connect(fxBus);
      osc.connect(og); og.connect(fxBus);
      src.start(t); src.stop(t + 0.7);
      osc.start(t); osc.stop(t + 0.55);
    },

    cutsceneDemonicScreech: function () {
      if (!enabled || !ctx) return;
      var t = ctx.currentTime;
      var osc1 = ctx.createOscillator(); osc1.type = "sawtooth";
      var osc2 = ctx.createOscillator(); osc2.type = "sine";
      osc1.frequency.setValueAtTime(580, t);
      osc1.frequency.exponentialRampToValueAtTime(1650, t + 0.6);
      osc1.frequency.exponentialRampToValueAtTime(420, t + 1.4);

      osc2.frequency.setValueAtTime(592, t); // sour beating dissonance
      osc2.frequency.exponentialRampToValueAtTime(1680, t + 0.6);
      osc2.frequency.exponentialRampToValueAtTime(430, t + 1.4);

      var lfo = ctx.createOscillator(); lfo.frequency.value = 14;
      var lfoGain = ctx.createGain(); lfoGain.gain.value = 90;
      lfo.connect(lfoGain); lfoGain.connect(osc1.frequency);

      var filter = ctx.createBiquadFilter(); filter.type = "bandpass";
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.exponentialRampToValueAtTime(2200, t + 0.6);
      filter.frequency.exponentialRampToValueAtTime(600, t + 1.4);
      filter.Q.value = 5;

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.38, t + 0.2);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.45);

      osc1.connect(filter); osc2.connect(filter);
      filter.connect(g); g.connect(fxBus);
      osc1.start(t); osc2.start(t); lfo.start(t);
      osc1.stop(t + 1.5); osc2.stop(t + 1.5); lfo.stop(t + 1.5);
    },

    cutsceneClawGrab: function () {
      if (!enabled || !ctx) return;
      var t = ctx.currentTime;
      // High-impact transient bone crunch
      var osc = ctx.createOscillator(); osc.type = "sawtooth";
      osc.frequency.setValueAtTime(3200, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.12);

      var bp = ctx.createBiquadFilter(); bp.type = "bandpass";
      bp.frequency.setValueAtTime(2800, t); bp.Q.value = 4;

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.65, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(bp); bp.connect(g); g.connect(fxBus);
      osc.start(t); osc.stop(t + 0.15);

      // Sub-bass heavy screen thud
      var sub = ctx.createOscillator(); sub.type = "sine";
      sub.frequency.setValueAtTime(120, t);
      sub.frequency.exponentialRampToValueAtTime(32, t + 0.38);

      var subG = ctx.createGain();
      subG.gain.setValueAtTime(0.85, t);
      subG.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      sub.connect(subG); subG.connect(fxBus);
      sub.start(t); sub.stop(t + 0.42);
    },

    cutsceneGlassCrack: function () {
      if (!enabled || !ctx || !noiseBuf) return;
      var t = ctx.currentTime;
      var src = ctx.createBufferSource(); src.buffer = noiseBuf;
      var hp = ctx.createBiquadFilter(); hp.type = "highpass";
      hp.frequency.value = 4800;

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.55, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

      src.connect(hp); hp.connect(g); g.connect(fxBus);
      src.start(t); src.stop(t + 0.1);
    },

    cutsceneDragRoar: function () {
      if (!enabled || !ctx || !noiseBuf) return;
      var t = ctx.currentTime;
      var src = ctx.createBufferSource(); src.buffer = noiseBuf;
      var lp = ctx.createBiquadFilter(); lp.type = "lowpass";
      lp.frequency.setValueAtTime(100, t);
      lp.frequency.exponentialRampToValueAtTime(1100, t + 0.6);
      lp.frequency.exponentialRampToValueAtTime(70, t + 1.5);
      lp.Q.value = 5.5;

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.01, t);
      g.gain.linearRampToValueAtTime(0.8, t + 0.45);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);

      // Low frequency sub-rumble
      var sub = ctx.createOscillator(); sub.type = "triangle";
      sub.frequency.setValueAtTime(65, t);
      sub.frequency.exponentialRampToValueAtTime(25, t + 1.5);
      var subG = ctx.createGain();
      subG.gain.setValueAtTime(0.01, t);
      subG.gain.linearRampToValueAtTime(0.7, t + 0.35);
      subG.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

      src.connect(lp); lp.connect(g); g.connect(fxBus);
      sub.connect(subG); subG.connect(fxBus);
      src.start(t); src.stop(t + 1.65);
      sub.start(t); sub.stop(t + 1.6);
    },

    cutsceneWarpEngine: function (on) {
      if (!enabled || !ctx) return;
      if (!on) {
        if (Sound._warpNodes) {
          Sound._warpNodes.forEach(function (n) { try { n.stop(); n.disconnect(); } catch (e) {} });
          Sound._warpNodes = null;
        }
        return;
      }
      if (Sound._warpNodes) return;
      var t = ctx.currentTime;
      var osc = ctx.createOscillator(); osc.type = "sawtooth";
      osc.frequency.setValueAtTime(75, t);
      osc.frequency.exponentialRampToValueAtTime(2100, t + 2.8);

      var lfo = ctx.createOscillator(); lfo.frequency.setValueAtTime(5, t);
      lfo.frequency.linearRampToValueAtTime(32, t + 2.8);
      var lfoGain = ctx.createGain(); lfoGain.gain.value = 50;
      lfo.connect(lfoGain); lfoGain.connect(osc.frequency);

      var filter = ctx.createBiquadFilter(); filter.type = "bandpass";
      filter.frequency.setValueAtTime(220, t);
      filter.frequency.exponentialRampToValueAtTime(2800, t + 2.8);
      filter.Q.value = 6;

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.65, t + 0.5);

      osc.connect(filter); filter.connect(g); g.connect(fxBus);
      osc.start(t); lfo.start(t);
      Sound._warpNodes = [osc, lfo, g, filter];
    },

    cutsceneFlashBang: function () {
      if (!enabled || !ctx) return;
      var t = ctx.currentTime;
      var osc = ctx.createOscillator(); osc.type = "triangle";
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(26, t + 1.8);

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.95, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);

      osc.connect(g); g.connect(fxBus);
      osc.start(t); osc.stop(t + 2.2);
      if (Sound.thunder) Sound.thunder();
    },

    cutsceneVortexHum: function (on) {
      if (!enabled || !ctx) return;
      if (!on) {
        if (Sound._vortexOscs) {
          Sound._vortexOscs.forEach(function (n) { try { n.stop(); n.disconnect(); } catch (e) {} });
          Sound._vortexOscs = null;
        }
        return;
      }
      if (Sound._vortexOscs) return;
      var t = ctx.currentTime;
      var sub = ctx.createOscillator(); sub.type = "sawtooth";
      sub.frequency.setValueAtTime(42, t);
      sub.frequency.exponentialRampToValueAtTime(110, t + 2.5);

      var lfo = ctx.createOscillator(); lfo.frequency.value = 6;
      var lfoGain = ctx.createGain(); lfoGain.gain.value = 18;
      lfo.connect(lfoGain); lfoGain.connect(sub.frequency);

      var filter = ctx.createBiquadFilter(); filter.type = "lowpass";
      filter.frequency.setValueAtTime(120, t);
      filter.frequency.exponentialRampToValueAtTime(1400, t + 2.5);
      filter.Q.value = 6;

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.4, t + 0.5);

      sub.connect(filter); filter.connect(g); g.connect(fxBus);
      sub.start(t); lfo.start(t);
      Sound._vortexOscs = [sub, lfo, g, filter];
    },

    cutsceneTypeTick: function () {
      if (!enabled || !ctx) return;
      var t = ctx.currentTime;
      var osc = ctx.createOscillator(); osc.type = "sine";
      osc.frequency.setValueAtTime(2200 + Math.random() * 800, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.025);

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.07, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);

      osc.connect(g); g.connect(fxBus);
      osc.start(t); osc.stop(t + 0.03);
    },

    cutsceneBloodDripTick: function () {
      if (!enabled || !ctx) return;
      var t = ctx.currentTime;
      var osc = ctx.createOscillator(); osc.type = "sine";
      var f0 = 980 + (Math.random() * 320 - 160);
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(160, t + 0.042);

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.038, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);

      osc.connect(g); g.connect(fxBus);
      osc.start(t); osc.stop(t + 0.048);
    },

    cutsceneHeartbeat: function (intensity) {
      if (!enabled || !ctx) return;
      var t = ctx.currentTime;
      var lvl = intensity || 1;
      var osc = ctx.createOscillator(); osc.type = "sine";
      osc.frequency.setValueAtTime(62, t);
      osc.frequency.exponentialRampToValueAtTime(28, t + 0.22);

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.12 * lvl, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);

      osc.connect(g); g.connect(fxBus);
      osc.start(t); osc.stop(t + 0.28);
    },

    cutsceneAlarm: function () {
      if (!enabled || !ctx) return;
      var t = ctx.currentTime;
      [0, 0.28, 0.56, 0.84].forEach(function (off, i) {
        var freq = i % 2 === 0 ? 880 : 620; // Tritone alarm
        var osc = ctx.createOscillator(); osc.type = "square";
        osc.frequency.setValueAtTime(freq, t + off);

        var bp = ctx.createBiquadFilter(); bp.type = "bandpass";
        bp.frequency.value = freq; bp.Q.value = 4;

        var g = ctx.createGain();
        g.gain.setValueAtTime(0.001, t + off);
        g.gain.linearRampToValueAtTime(0.22, t + off + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.22);

        osc.connect(bp); bp.connect(g); g.connect(fxBus);
        osc.start(t + off); osc.stop(t + off + 0.24);
      });
    },

    cutsceneStaticBurst: function () {
      if (!enabled || !ctx || !noiseBuf) return;
      var t = ctx.currentTime;
      var src = ctx.createBufferSource(); src.buffer = noiseBuf;
      var bp = ctx.createBiquadFilter(); bp.type = "bandpass";
      bp.frequency.setValueAtTime(1400, t);
      bp.frequency.exponentialRampToValueAtTime(3800, t + 0.15);
      bp.Q.value = 5;

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.35, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);

      src.connect(bp); bp.connect(g); g.connect(fxBus);
      src.start(t); src.stop(t + 0.18);
    },

    cutsceneImpact: function () {
      if (!enabled || !ctx) return;
      var t = ctx.currentTime;
      var osc = ctx.createOscillator(); osc.type = "triangle";
      osc.frequency.setValueAtTime(130, t);
      osc.frequency.exponentialRampToValueAtTime(32, t + 1.8);

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.85, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);

      osc.connect(g); g.connect(fxBus);
      osc.start(t); osc.stop(t + 2.3);
      if (Sound.thunder) Sound.thunder();
    },

    startClockTick: function () {
      if (!enabled || !ctx || Sound._clockInterval) return;
      function tick() {
        if (!enabled || !ctx) return;
        var t = ctx.currentTime;
        var osc = ctx.createOscillator(); osc.type = "triangle";
        osc.frequency.setValueAtTime(1400, t);
        osc.frequency.exponentialRampToValueAtTime(320, t + 0.018);

        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        // Low volume so teams can easily talk
        g.gain.linearRampToValueAtTime(0.02, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);

        osc.connect(g); g.connect(fxBus);
        osc.start(t); osc.stop(t + 0.025);
      }
      tick();
      Sound._clockInterval = setInterval(tick, 1000);
    },

    stopClockTick: function () {
      if (Sound._clockInterval) {
        clearInterval(Sound._clockInterval);
        Sound._clockInterval = null;
      }
    },

    // browsers suspend audio in background tabs; resume on return
    wake: function () { if (ctx && enabled && ctx.state === "suspended") ctx.resume(); }
  };

  document.addEventListener("visibilitychange", function () {
    if (!ctx || !enabled) return;
    if (document.hidden) ctx.suspend(); else Sound.wake();
  });
  window.Sound = Sound;
})();
