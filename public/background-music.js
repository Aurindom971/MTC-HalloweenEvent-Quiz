// Background music adapted from the supplied MTC Round 2 reference:
// https://github.com/Ishit-Aggarwal/mtc-halloween-event (js/audio.js)
// Music-box lullaby, drone, wind and reverb only; quiz effects remain separate.
(function () {
  'use strict';
  const Ctx = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, fxBus = null, musicBus = null, reverb = null, noiseBuf = null;
  let droneNodes = null, musicTimer = null;
  const SILENT = false;
  let enabled = false;
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
    out.gain.linearRampToValueAtTime(0.055, t + 0.2);
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
    // A brief anti-click fade, rather than several seconds of near silence.
    musicBus.gain.linearRampToValueAtTime(0.75, t + 0.08);
    nextTime = t + 0.02;
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


  window.BackgroundMusic = {
    async setEnabled(value) {
      enabled = value;
      if (!value) {
        if (musicTimer) clearInterval(musicTimer);
        musicTimer = null;
        if (ctx) await ctx.suspend();
        return;
      }
      if (!init()) throw new Error('Web Audio unavailable');
      await ctx.resume();
      if (!enabled || document.hidden) { await ctx.suspend(); return; }
      startDrone();
      startMusic();
    }
  };
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !enabled) return;
    if (document.hidden) {
      if (musicTimer) clearInterval(musicTimer);
      musicTimer = null;
      ctx.suspend().catch(() => {});
    } else {
      window.BackgroundMusic.setEnabled(true).catch(() => {});
    }
  });
})();
