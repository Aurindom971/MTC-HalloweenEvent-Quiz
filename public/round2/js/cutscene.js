/* =========================================================
   OtherSideCutscene — The Other Side Horror Sequence
   MTC Halloween Build · Round 2
   Cinematic 60fps browser-driven horror sequence:
   1. Bloody Portal Tear & Pulse (flesh rip, organic rift)
   2. Anatomically Realistic Demonic Hands Emerge in 3D (reaching & gripping screen edges)
   3. Violent Viewport Drag-In Plunge (glass fractures, camera shudder)
   4. Hyperspeed 3D Wormhole Tunnel Warp (ZERO LAG, batched 60fps rendering)
   5. Crash Landing into The Other Side (dark void with spooky figures, drifting mist, glowing eyes, and BIG glowing narrative typography)
   6. Mission 02 End Card: Website Resurrection
   ========================================================= */

(function () {
  "use strict";

  var NARRATIVE_LINES_ENTRY = [
    "Welcome to the Other Side.",
    "A world that exists between reality and the network.",
    "Here, nightmares have identities. Monsters have memories. Villains have entire worlds of their own.",
    "But the corruption has spread.",
    "Their homes are gone. Their systems are broken. Their stories are disappearing.",
    "And the Phantom is still out there.",
    "Your mission is no longer to destroy the corruption.",
    "It is to rebuild what has been lost."
  ];

  var NARRATIVE_LINES_HEX = [
    "Digital Exorcists, your assignments have been revealed.",
    "You know your characters. You know the ui. Think about their problems. Now it is time to build.",
    "Your mission is to create a website that belongs in this world — one that is creative, visually compelling, intuitive, and functional.",
    "You may use your approved tools and technologies. You may use AI assistance according to the event rules. But remember: the final result is yours to explain and demonstrate.",
    "Judges will evaluate your storyline and creativity, your UI/UX, and how effectively your website solves the assigned problem.",
    "You have -- minutes.",
    "The timer begins in three...",
    "Two...",
    "One...",
    "LET THE HAUNT BEGIN!"
  ];

  var NARRATIVE_LINES_CORRUPTION = [
    "You are rebuilding my world.",
    "How... inconvenient.",
    "Let's see what happens when your perfect little systems stop behaving.",
    "Emergency protocol initiated.",
    "Few minutes remain.",
    "Don't disappoint me."
  ];

  var NARRATIVE_LINES_FIVE_MIN = [
    "Five minutes, exorcists. Five minutes until the system shuts down.",
    "Check your links. Check your interactions. Make sure your website actually works.",
    "A terrifying design is great. A terrifying design that crashes is less great.",
    "Five minutes. Finish strong."
  ];

  var NARRATIVE_LINES_ALLIANCE = [
    "Digital Exorcists… the Phantom has intercepted our system again.",
    "A new transmission has appeared. Your mission isn't just to rebuild the Other Side anymore. You must now establish an alliance.",
    "Introducing the ALLIANCE PROTOCOL.",
    "Your website must now include a creative integration of our official sponsor, KAPIDHWAJ.",
    "But here's the catch: a boring logo in the footer won't save your website. The sponsor must become a meaningful part of your world.",
    "Your task is to creatively integrate the official Kapidhwaj Instagram page into your website in a way that fits your assigned character, your chosen problem statement, and your UI/UX aesthetic.",
    "You have 35 minutes remaining. The Phantom is watching. Your interface must evolve.",
    "MISSION UPDATE: ALLIANCE PROTOCOL ACTIVATED.",
    "Make the sponsor part of the story. Make the integration part of the experience. Now get back to building!"
  ];

  // Canvas Modes
  var MODE = {
    PORTAL: 1,
    WARP_TUNNEL: 2,
    DARK_VOID: 3
  };

  var FOCAL_LENGTH = 340;

  var Cutscene = {
    isActive: false,
    cutsceneType: "entry", // "entry" or "hex"
    timerIds: [],
    animFrame: null,
    canvasMode: MODE.PORTAL,
    startTime: 0,
    warpSpeed: 1,
    targetWarpSpeed: 1,

    // High-performance Particle / Fog Buffers
    warpCrimson: [],
    warpAmber: [],
    warpWhite: [],
    warpRings: [],
    bloodDrips: [],
    ashParticles: [],
    fogSheets: [],

    init: function () {
      this.layer = document.getElementById("cutsceneLayer");
      this.rig = document.getElementById("cutsceneRig");
      this.canvas = document.getElementById("cutsceneCanvas");
      this.vortex = document.getElementById("cutsceneVortex");
      this.chroma = document.getElementById("cutsceneChroma");
      this.clawsLayer = document.getElementById("cutsceneClawsLayer");
      this.clawLeft = document.getElementById("clawLeft");
      this.clawRight = document.getElementById("clawRight");
      this.clawTop = document.getElementById("clawTop");
      this.clawCenter = document.getElementById("clawCenter");
      this.glass = document.getElementById("cutsceneGlass");
      this.glassLeft = document.getElementById("glassImpactLeft");
      this.glassRight = document.getElementById("glassImpactRight");
      this.flash = document.getElementById("cutsceneFlash");
      this.portalVideo = document.getElementById("cutscenePortalVideo");

      // Spooky Void & Cinema Typography Elements
      this.voidFigures = document.getElementById("voidFigures");
      this.cinemaWrap = document.getElementById("cutsceneCinemaWrap");
      this.cinemaTextKicker = document.getElementById("cinemaTextKicker");
      this.cinemaTextLine = document.getElementById("cinemaTextLine");
      this.endcard = document.getElementById("cutsceneEndcard");
      this.endcardKicker = document.getElementById("endcardKicker");
      this.endcardTitle = document.getElementById("endcardTitle");
      this.endcardDesc = document.getElementById("endcardDesc");
      this.proceedBtnText = document.getElementById("cutsceneProceedBtnText");

      this.skipBtn = document.getElementById("cutsceneSkipBtn");
      this.proceedBtn = document.getElementById("cutsceneProceedBtn");
      this.replayBtn = document.getElementById("cutsceneReplayBtn");

      if (!this.layer) return;

      this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
      this.bindEvents();
      this.prepareZombieHands();
      this.initWarpBuffers();
      this.initVoidAtmosphere();
    },

    // ----------------------------------------------------
    // ZOMBIE HAND TEXTURES
    // The black backgrounds are already cut out (the old in-browser pass,
    // baked into assets/figures/zombie-hand-*.webp so phones don't freeze
    // doing it on load). Browsers without WebP get the PNG copy.
    // ----------------------------------------------------
    prepareZombieHands: function () {
      ["handLeftImg", "handRightImg", "handCenterImg"].forEach(function (id) {
        var img = document.getElementById(id);
        if (!img) return;
        function fallback() {
          img.removeEventListener("error", fallback);
          img.src = img.getAttribute("src").replace(/\.webp$/, ".png");
        }
        if (img.complete && !img.naturalWidth) fallback();
        else img.addEventListener("error", fallback);
      });
    },

    bindEvents: function () {
      var self = this;
      if (this.skipBtn) {
        this.skipBtn.addEventListener("click", function () { self.exit(true); });
      }
      if (this.proceedBtn) {
        this.proceedBtn.addEventListener("click", function () { self.exit(false); });
      }
      if (this.replayBtn) {
        this.replayBtn.addEventListener("click", function () { self.play(); });
      }
      window.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && self.isActive) {
          self.exit(true);
        }
      });
      window.addEventListener("resize", function () {
        if (self.isActive) self.resizeCanvas();
      });
    },

    // ----------------------------------------------------
    // PRE-ALLOCATED ZERO-LAG PARTICLE POOLS
    // ----------------------------------------------------
    initWarpBuffers: function () {
      this.warpCrimson = [];
      this.warpAmber = [];
      this.warpWhite = [];

      function createStreak(distRange) {
        var angle = Math.random() * Math.PI * 2;
        var dist = distRange[0] + Math.random() * distRange[1];
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          z: 40 + Math.random() * 1200,
          len: 1.2 + Math.random() * 2.0
        };
      }

      // Crimson streaks batch (220 particles)
      for (var i = 0; i < 220; i++) {
        this.warpCrimson.push(createStreak([40, 800]));
      }
      // Amber streaks batch (160 particles)
      for (var j = 0; j < 160; j++) {
        this.warpAmber.push(createStreak([30, 700]));
      }
      // Core White streaks batch (90 particles)
      for (var k = 0; k < 90; k++) {
        this.warpWhite.push(createStreak([20, 600]));
      }

      // 6 Concentric Runic Warp Rings
      this.warpRings = [];
      for (var r = 0; r < 6; r++) {
        this.warpRings.push({
          z: 160 + r * 180,
          radius: 260 + (r % 3) * 70,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.03
        });
      }
    },

    initVoidAtmosphere: function () {
      // Floating Upside-Down Ash Spores (drifting upward)
      this.ashParticles = [];
      for (var i = 0; i < 75; i++) {
        this.ashParticles.push({
          x: Math.random(),
          y: Math.random(),
          size: 1.2 + Math.random() * 2.8,
          speedY: 0.0004 + Math.random() * 0.0009,
          swaySpeed: 1 + Math.random() * 2,
          swayWidth: 15 + Math.random() * 25,
          alpha: 0.3 + Math.random() * 0.6
        });
      }

      // Drifting Volumetric Fog Sheets
      this.fogSheets = [
        { x: 0, y: 0.70, width: 1.6, height: 0.35, speed: 0.00015, alpha: 0.32 },
        { x: -0.4, y: 0.55, width: 1.8, height: 0.45, speed: 0.00022, alpha: 0.25 },
        { x: 0.2, y: 0.78, width: 1.5, height: 0.30, speed: 0.00018, alpha: 0.28 }
      ];
    },

    resizeCanvas: function () {
      if (!this.canvas || !this.ctx) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = Math.floor(this.width * dpr);
      this.canvas.height = Math.floor(this.height * dpr);
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    },

    resetVisuals: function () {
      if (this.layer) {
        this.layer.classList.remove("corruption-mode", "shutdown-mode", "alliance-mode");
      }
      if (this.rig) {
        this.rig.className = "cutscene-rig";
      }
      if (this.vortex) {
        this.vortex.classList.remove("pull");
        this.vortex.style.opacity = "";
      }
      if (this.chroma) {
        this.chroma.classList.remove("glitching");
      }
      [this.clawLeft, this.clawRight, this.clawTop, this.clawCenter].forEach(function (claw) {
        if (claw) {
          claw.classList.remove("emerge", "lunge", "gripping");
        }
      });
      if (this.glassLeft) this.glassLeft.hidden = true;
      if (this.glassRight) this.glassRight.hidden = true;
      if (this.flash) {
        this.flash.classList.remove("bang", "fade");
      }
      if (this.voidFigures) {
        this.voidFigures.hidden = true;
        this.voidFigures.classList.remove("revealed");
      }
      if (this.cinemaWrap) {
        this.cinemaWrap.hidden = true;
      }
      if (this.cinemaTextKicker) {
        this.cinemaTextKicker.textContent = "";
        this.cinemaTextKicker.hidden = true;
      }
      if (this.cinemaTextLine) {
        this.cinemaTextLine.textContent = "";
        this.cinemaTextLine.className = "cinema-text-line";
      }
      if (this.portalVideo) {
        this.portalVideo.pause();
        this.portalVideo.currentTime = 0;
        this.portalVideo.classList.remove("is-playing", "is-fading");
        this.portalVideo.hidden = true;
        this.portalVideo.onended = null;
        this.portalVideo.ontimeupdate = null;
        this.portalVideo.onplaying = null;
      }
      if (this.endcard) this.endcard.hidden = true;

      this.bloodDrips = [];
      this.warpSpeed = 1;
      this.targetWarpSpeed = 1;
    },

    play: function (type) {
      this.cutsceneType = (type === "hex" || type === "corruption" || type === "fiveMin" || type === "zeroHour" || type === "alliance") ? type : "entry";
      this.isActive = true;
      this.clearTimers();
      if (!this.layer) this.init();
      if (!this.layer) return;

      this.layer.hidden = false;
      void this.layer.offsetWidth;
      this.layer.classList.add("is-active");

      this.resizeCanvas();
      this.resetVisuals();
      this.startTime = performance.now();

      var S = window.Sound || {};
      var self = this;

      if (this.cutsceneType === "hex") {
        // ========================================================
        // HEX CUTSCENE: PURE DARK VOID & BLOOD-INSCRIBED TEXT
        // (No portal, hands, or wormhole — opens straight into dark void)
        // ========================================================
        this.canvasMode = MODE.DARK_VOID;
        this.startRenderLoop();

        // Reveal spooky figures lurking in the shadows & glowing eyes
        if (this.voidFigures) {
          this.voidFigures.hidden = false;
          void this.voidFigures.offsetWidth;
          this.voidFigures.classList.add("revealed");
        }

        if (S.whisper) S.whisper();

        // Begin narrative text right away (after brief 650ms atmospheric settle)
        this.delay(function () {
          if (!self.isActive) return;
          if (self.cinemaWrap) self.cinemaWrap.hidden = false;
          self.playCinematicNarrative();
        }, 650);

        return;
      }

      if (this.cutsceneType === "corruption") {
        // ========================================================
        // CORRUPTION CUTSCENE: 15-MIN TIMEOUT EMERGENCY RED ALERT
        // (Freezes timer, red strobe ambience, emergency sirens, Phantom dialogue)
        // ========================================================
        this.canvasMode = MODE.DARK_VOID;
        if (this.layer) this.layer.classList.add("corruption-mode");
        this.startRenderLoop();

        if (this.voidFigures) {
          this.voidFigures.hidden = false;
          void this.voidFigures.offsetWidth;
          this.voidFigures.classList.add("revealed");
        }

        if (this.cinemaTextKicker) {
          this.cinemaTextKicker.hidden = false;
          this.cinemaTextKicker.textContent = "🚨 EMERGENCY PROTOCOL INITIATED // SYSTEM COMPROMISED 🚨";
        }

        if (S.cutsceneStaticBurst) S.cutsceneStaticBurst();
        if (S.cutsceneAlarm) S.cutsceneAlarm();
        if (S.whisper) S.whisper();

        this.delay(function () {
          if (!self.isActive) return;
          if (self.cinemaWrap) self.cinemaWrap.hidden = false;
          self.playCinematicNarrative();
        }, 600);

        return;
      }

      if (this.cutsceneType === "fiveMin") {
        // ========================================================
        // FIVE-MINUTE CUTSCENE: SYSTEM SHUTDOWN WARNING IN 05:00
        // (Ambient ticking begins, urgent siren alert, final sprint warning)
        // ========================================================
        this.canvasMode = MODE.DARK_VOID;
        if (this.layer) this.layer.classList.add("shutdown-mode");
        this.startRenderLoop();

        if (this.voidFigures) {
          this.voidFigures.hidden = false;
          void this.voidFigures.offsetWidth;
          this.voidFigures.classList.add("revealed");
        }

        if (this.cinemaTextKicker) {
          this.cinemaTextKicker.hidden = false;
          this.cinemaTextKicker.textContent = "⚠️ CRITICAL WARNING · 05:00 REMAINING ⚠️";
        }

        if (S.cutsceneAlarm) S.cutsceneAlarm();
        if (S.startClockTick) S.startClockTick();

        this.delay(function () {
          if (!self.isActive) return;
          if (self.cinemaWrap) self.cinemaWrap.hidden = false;
          self.playCinematicNarrative();
        }, 600);

        return;
      }

      if (this.cutsceneType === "zeroHour") {
        // ========================================================
        // ZERO HOUR: BUILD WINDOW CLOSED! SUBMISSIONS LOCKED!
        // ========================================================
        this.canvasMode = MODE.DARK_VOID;
        if (this.layer) this.layer.classList.add("shutdown-mode");
        this.startRenderLoop();

        if (S.stopClockTick) S.stopClockTick();
        if (S.cutsceneFlashBang) S.cutsceneFlashBang();
        if (S.cutsceneImpact) S.cutsceneImpact();

        if (this.flash) {
          this.flash.classList.add("bang");
          setTimeout(function () {
            if (self.flash) {
              self.flash.classList.remove("bang");
              self.flash.classList.add("fade");
            }
          }, 120);
        }

        this.showEndCard();
        return;
      }

      if (this.cutsceneType === "alliance") {
        // ========================================================
        // ALLIANCE PROTOCOL CUTSCENE: COMPULSORY SPONSOR TRANSMISSION
        // ========================================================
        this.canvasMode = MODE.DARK_VOID;
        if (this.layer) this.layer.classList.add("alliance-mode");
        this.startRenderLoop();

        if (this.voidFigures) {
          this.voidFigures.hidden = false;
          void this.voidFigures.offsetWidth;
          this.voidFigures.classList.add("revealed");
        }

        if (this.cinemaTextKicker) {
          this.cinemaTextKicker.hidden = false;
          this.cinemaTextKicker.textContent = "🌀 SYSTEM TRANSMISSION · THE ALLIANCE PROTOCOL";
        }

        if (S.cutsceneImpact) S.cutsceneImpact();
        if (S.whisper) S.whisper();

        this.delay(function () {
          if (!self.isActive) return;
          if (self.cinemaWrap) self.cinemaWrap.hidden = false;
          self.playCinematicNarrative();
        }, 650);

        return;
      }

      // ========================================================
      // ENTRY CUTSCENE: PORTAL VIDEO -> SUPERFAST WORMHOLE WARP PIPELINE
      // (Replaces former procedural canvas portal & zombie hands dragging)
      // ========================================================
      this.canvasMode = null;
      if (this.ctx) {
        this.ctx.fillStyle = "#020002";
        this.ctx.fillRect(0, 0, this.width, this.height);
      }

      var transitioned = false;

      function transitionToWormhole() {
        if (transitioned || !self.isActive) return;
        transitioned = true;

        // Dispel portal vortex & chromatic aberration overlay so wormhole has 100% clear view
        if (self.vortex) {
          self.vortex.classList.remove("pull");
          self.vortex.style.opacity = "0";
        }
        if (self.chroma) {
          self.chroma.classList.remove("glitching");
        }

        // 1. Seamless forward-scale crossfade of portal video into wormhole
        if (self.portalVideo) {
          self.portalVideo.classList.add("is-fading");
        }

        // 2. Start Wormhole Sound & Warp Tunnel Canvas
        if (S.cutsceneWarpEngine) S.cutsceneWarpEngine(true);

        if (self.ctx) {
          self.ctx.fillStyle = "#020002";
          self.ctx.fillRect(0, 0, self.width, self.height);
        }

        self.canvasMode = MODE.WARP_TUNNEL;
        self.warpSpeed = 1.0;
        self.targetWarpSpeed = 2.0;
        self.startRenderLoop();

        // 3. Smooth acceleration ramps (existing superfast wormhole travel)
        self.delay(function () {
          if (self.isActive) self.targetWarpSpeed = 4.5;
        }, 700);

        self.delay(function () {
          if (self.isActive) self.targetWarpSpeed = 8.5;
        }, 1600);

        // 4. Supernova Flashbang & Crash Landing into Dark Void (after 2.6s of wormhole travel)
        self.delay(function () {
          if (!self.isActive) return;
          if (S.cutsceneWarpEngine) S.cutsceneWarpEngine(false);
          if (S.cutsceneFlashBang) S.cutsceneFlashBang();

          if (self.portalVideo) {
            self.portalVideo.pause();
            self.portalVideo.hidden = true;
            self.portalVideo.classList.remove("is-playing", "is-fading");
          }

          if (self.flash) {
            self.flash.classList.add("bang");
            setTimeout(function () {
              if (self.flash) {
                self.flash.classList.remove("bang");
                self.flash.classList.add("fade");
              }
            }, 100);
          }

          // Switch to Dark Void Mode with Spooky Figures & Drifting Mist
          self.canvasMode = MODE.DARK_VOID;

          // Reveal spooky figures lurking in the shadows & glowing eyes
          if (self.voidFigures) {
            self.voidFigures.hidden = false;
            void self.voidFigures.offsetWidth;
            self.voidFigures.classList.add("revealed");
          }
        }, 2600);

        // 5. Big Cinematic Glowing Narrative Text (after crash landing)
        self.delay(function () {
          if (!self.isActive) return;
          if (self.cinemaWrap) self.cinemaWrap.hidden = false;
          self.playCinematicNarrative();
        }, 3400);
      }

      // Play the portal animation video
      var videoStarted = false;
      var transitionTimer = null;

      function scheduleTransitionTimer(delayMs) {
        if (transitionTimer) clearTimeout(transitionTimer);
        transitionTimer = setTimeout(function () {
          transitionToWormhole();
        }, delayMs);
        self.timerIds.push(transitionTimer);
      }

      if (this.portalVideo) {
        var isMuted = !window.Sound || !window.Sound.enabled || !!window.Sound.silent;
        this.portalVideo.muted = isMuted;
        this.portalVideo.volume = 1.0;
        this.portalVideo.currentTime = 0;
        this.portalVideo.hidden = false;
        this.portalVideo.classList.remove("is-fading");
        this.portalVideo.classList.add("is-playing");

        this.portalVideo.onplaying = function () {
          videoStarted = true;
          // Video is playing! Duration is 10.0s, begin wormhole transition at 9.3s
          scheduleTransitionTimer(9300);
        };
        this.portalVideo.onended = function () {
          transitionToWormhole();
        };
        this.portalVideo.ontimeupdate = function () {
          if (self.portalVideo && self.portalVideo.currentTime >= 9.3) {
            transitionToWormhole();
          }
        };

        var playPromise = this.portalVideo.play();
        if (playPromise && playPromise.catch) {
          playPromise.catch(function () {
            if (self.portalVideo) {
              self.portalVideo.muted = true;
              self.portalVideo.play().catch(function () {});
            }
          });
        }
      }

      // Safety fallback: if video stalls or fails to fire events, transition at 12s anyway
      this.delay(function () {
        if (!videoStarted) transitionToWormhole();
      }, 12000);
    },

    startRenderLoop: function () {
      var self = this;
      if (!this.ctx) return;

      function render(now) {
        if (!self.isActive) return;
        // the first frame can be stamped a hair before startTime; a negative
        // time made the portal's radius negative, threw, and froze the canvas
        var elapsed = Math.max(0, (now - self.startTime) * 0.001);
        // ask for the next frame first, so one bad frame can't stop the loop
        self.animFrame = requestAnimationFrame(render);

        if (self.canvasMode === MODE.PORTAL) {
          self.drawBloodyPortalFrame(elapsed);
        } else if (self.canvasMode === MODE.WARP_TUNNEL) {
          self.drawWarpTunnelFrame(elapsed);
        } else if (self.canvasMode === MODE.DARK_VOID) {
          self.drawDarkVoidAtmosphereFrame(elapsed);
        }
      }

      if (this.animFrame) cancelAnimationFrame(this.animFrame);
      this.animFrame = requestAnimationFrame(render);
    },

    // ----------------------------------------------------
    // RENDER ROUTINE 1: ORGANIC BLOODY PORTAL
    // ----------------------------------------------------
    drawBloodyPortalFrame: function (time) {
      var ctx = this.ctx, w = this.width, h = this.height;
      var cx = w * 0.5, cy = h * 0.5;

      ctx.fillStyle = "rgba(3, 0, 2, 0.42)";
      ctx.fillRect(0, 0, w, h);

      var portalGrowth = Math.min(time * 0.65, 1.0);
      var baseR = Math.min(w, h) * 0.38 * portalGrowth;

      // 1. Central Abyssal Singularity
      var voidGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.35);
      voidGrad.addColorStop(0, "rgba(2, 0, 1, 1)");
      voidGrad.addColorStop(0.35, "rgba(25, 2, 6, 0.96)");
      voidGrad.addColorStop(0.72, "rgba(200, 24, 18, 0.65)");
      voidGrad.addColorStop(1, "transparent");

      ctx.fillStyle = voidGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // 2. Swirling Logarithmic Inward Blood Filaments
      ctx.save();
      ctx.translate(cx, cy);
      for (var f = 0; f < 12; f++) {
        var baseAngle = (f / 12) * Math.PI * 2 + time * 0.8;
        ctx.strokeStyle = f % 2 === 0 ? "rgba(255, 34, 22, 0.5)" : "rgba(180, 10, 12, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (var step = 0; step < 26; step++) {
          var tFrac = step / 26;
          var r = (1 - tFrac) * baseR * 1.25;
          var a = baseAngle + tFrac * 2.5;
          var px = Math.cos(a) * r;
          var py = Math.sin(a) * r;
          if (step === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.restore();

      // 3. Multi-Harmonic Organic Flesh Ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      var numPoints = 64;
      for (var i = 0; i <= numPoints; i++) {
        var theta = (i / numPoints) * Math.PI * 2;
        var deform = 1.0
          + 0.12 * Math.sin(theta * 4 + time * 3.4)
          + 0.08 * Math.cos(theta * 7 - time * 2.2)
          + 0.05 * Math.sin(theta * 11 + time * 4.8);
        var rad = baseR * deform;
        var x = Math.cos(theta) * rad;
        var y = Math.sin(theta) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.lineWidth = 6 + Math.sin(time * 6) * 2;
      ctx.strokeStyle = "#ff2216";
      ctx.stroke();
      ctx.restore();

      // 4. Dripping Blood Droplets
      ctx.fillStyle = "#ff1e14";
      for (var d = 0; d < this.bloodDrips.length; d++) {
        var drop = this.bloodDrips[d];
        drop.y += drop.vy;
        if (drop.y > h + 20) {
          drop.y = cy + (Math.random() - 0.2) * (baseR * 0.8);
          drop.x = cx + (Math.random() - 0.5) * (baseR * 1.6);
        }
        ctx.beginPath();
        ctx.ellipse(drop.x, drop.y, drop.r, drop.r * (drop.length * 0.2), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    // ----------------------------------------------------
    // RENDER ROUTINE 2: 3D WORMHOLE TUNNEL (ZERO-LAG 60FPS BATCHED)
    // ----------------------------------------------------
    drawWarpTunnelFrame: function (time) {
      var ctx = this.ctx, w = this.width, h = this.height;
      if (!ctx || !w || !h) return;

      var cx = w * 0.5 + Math.sin(time * 2.5) * 20;
      var cy = h * 0.5 + Math.cos(time * 2.8) * 14;

      // Smooth speed interpolation (eliminates discrete stutter jumps)
      this.warpSpeed += (this.targetWarpSpeed - this.warpSpeed) * 0.08;
      var speedMult = this.warpSpeed;

      // Trailing clear (gives smooth motion blur without heavy composite filters)
      ctx.fillStyle = "rgba(4, 0, 4, 0.28)";
      ctx.fillRect(0, 0, w, h);

      // Central Singularity Glow
      var coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 140);
      coreGrad.addColorStop(0, "rgba(255, 235, 220, 0.95)");
      coreGrad.addColorStop(0.2, "rgba(255, 60, 30, 0.65)");
      coreGrad.addColorStop(0.5, "rgba(180, 10, 15, 0.25)");
      coreGrad.addColorStop(1, "transparent");
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 140, 0, Math.PI * 2);
      ctx.fill();

      // Batch streak renderer (eliminates erratic lines and prevents cross-screen jumps)
      function drawStreakBatch(streaks, color, lineWidth, speedFactor, distMin, distMax) {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        var step = 34 * speedMult * speedFactor;
        for (var i = 0; i < streaks.length; i++) {
          var p = streaks[i];
          p.z -= step;
          if (p.z <= 16) {
            p.z = 1000 + Math.random() * 200;
            var angle = Math.random() * Math.PI * 2;
            var dist = distMin + Math.random() * (distMax - distMin);
            p.x = Math.cos(angle) * dist;
            p.y = Math.sin(angle) * dist;
            continue; // Skip drawing on the teleport frame so no crazy lines appear!
          }
          var tailZ = p.z + step * 1.5;
          var s0 = FOCAL_LENGTH / tailZ;
          var s1 = FOCAL_LENGTH / p.z;
          var x0 = cx + p.x * s0;
          var y0 = cy + p.y * s0;
          var x1 = cx + p.x * s1;
          var y1 = cy + p.y * s1;
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
        }
        ctx.stroke();
      }

      // --- BATCH 1: CRIMSON VELOCITY STREAKS ---
      drawStreakBatch(this.warpCrimson, "rgba(255, 34, 22, 0.95)", 2.4, 1.0, 40, 800);

      // --- BATCH 2: AMBER / EMBER STREAKS ---
      drawStreakBatch(this.warpAmber, "rgba(255, 130, 35, 0.92)", 1.8, 1.1, 30, 700);

      // --- BATCH 3: CORE WHITE STREAKS ---
      drawStreakBatch(this.warpWhite, "rgba(255, 245, 240, 0.98)", 1.4, 1.25, 20, 550);

      // --- Concentric Occult Warp Rings ---
      for (var r = 0; r < this.warpRings.length; r++) {
        var ring = this.warpRings[r];
        ring.z -= 16 * speedMult;
        ring.rot += ring.rotSpeed;
        if (ring.z <= 16) {
          ring.z = 1200;
          ring.rot = Math.random() * Math.PI * 2;
          continue;
        }

        var scale = FOCAL_LENGTH / ring.z;
        var rx = ring.radius * scale;
        var alpha = Math.min((1200 - ring.z) / 400, 1.0) * Math.min(ring.z / 120, 1.0);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ring.rot);
        ctx.strokeStyle = "rgba(255, 45, 25, " + (alpha * 0.85) + ")";
        ctx.lineWidth = Math.max(1, 3.2 * scale);
        ctx.beginPath();
        ctx.arc(0, 0, rx, 0, Math.PI * 1.85);
        ctx.stroke();
        ctx.restore();
      }
    },

    // ----------------------------------------------------
    // RENDER ROUTINE 3: DARK VOID ATMOSPHERE (MIST & ASH PARTICLES)
    // ----------------------------------------------------
    drawDarkVoidAtmosphereFrame: function (time) {
      var ctx = this.ctx, w = this.width, h = this.height;

      // Pure deep atmospheric dark void
      ctx.fillStyle = "#030002";
      ctx.fillRect(0, 0, w, h);

      // Subtle ambient red vignette in lower background
      var ambGrad = ctx.createRadialGradient(w * 0.5, h * 0.75, 10, w * 0.5, h * 0.75, Math.max(w, h) * 0.7);
      ambGrad.addColorStop(0, "rgba(50, 6, 10, 0.45)");
      ambGrad.addColorStop(0.5, "rgba(20, 2, 4, 0.35)");
      ambGrad.addColorStop(1, "transparent");
      ctx.fillStyle = ambGrad;
      ctx.fillRect(0, 0, w, h);

      // 1. Drifting Volumetric Fog Sheets
      for (var f = 0; f < this.fogSheets.length; f++) {
        var sheet = this.fogSheets[f];
        sheet.x += sheet.speed;
        if (sheet.x > 1.2) sheet.x = -0.8;

        var fx = (sheet.x + Math.sin(time * 0.4 + f) * 0.05) * w;
        var fy = sheet.y * h;
        var fw = sheet.width * w;
        var fh = sheet.height * h;

        var fogGrad = ctx.createRadialGradient(fx + fw * 0.5, fy + fh * 0.5, 10, fx + fw * 0.5, fy + fh * 0.5, fw * 0.5);
        fogGrad.addColorStop(0, "rgba(35, 4, 8, " + sheet.alpha + ")");
        fogGrad.addColorStop(0.5, "rgba(22, 2, 5, " + (sheet.alpha * 0.6) + ")");
        fogGrad.addColorStop(1, "transparent");

        ctx.fillStyle = fogGrad;
        ctx.fillRect(fx, fy, fw, fh);
      }

      // 2. Upside Down Floating Ash & Spore Particles (drifting steadily upwards)
      for (var a = 0; a < this.ashParticles.length; a++) {
        var p = this.ashParticles[a];
        p.y -= p.speedY;
        if (p.y < -0.05) {
          p.y = 1.05;
          p.x = Math.random();
        }

        var px = (p.x * w) + Math.sin(time * p.swaySpeed + a) * p.swayWidth;
        var py = p.y * h;

        ctx.fillStyle = a % 3 === 0 ? "rgba(255, 60, 40, " + p.alpha + ")" : "rgba(240, 220, 215, " + (p.alpha * 0.7) + ")";
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    // ----------------------------------------------------
    // SPOOKY BLOOD-INSCRIBED LETTER-BY-LETTER NARRATIVE CONTROLLER
    // ----------------------------------------------------
    playCinematicNarrative: function () {
      var self = this;
      var lineIdx = 0;
      var textEl = this.cinemaTextLine;
      var stageEl = this.cinemaWrap;
      if (!textEl) return;

      var currentTypeTimer = null;
      var isTyping = false;
      var pendingChars = [];
      var lines = NARRATIVE_LINES_ENTRY;
      if (this.cutsceneType === "hex") lines = NARRATIVE_LINES_HEX;
      else if (this.cutsceneType === "corruption") lines = NARRATIVE_LINES_CORRUPTION;
      else if (this.cutsceneType === "fiveMin") lines = NARRATIVE_LINES_FIVE_MIN;
      else if (this.cutsceneType === "alliance") lines = NARRATIVE_LINES_ALLIANCE;

      function escapeHtml(str) {
        return String(str || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      function buildLineMarkup(text) {
        var words = text.split(" ");
        return words.map(function (word) {
          var charsHtml = word.split("").map(function (ch) {
            var lower = ch.toLowerCase();
            // Drop a blood drip on punctuation ('.', '!', '?') or descenders with low probability
            var isPunct = (ch === "." || ch === "!" || ch === "?");
            var hasDescender = ("ypgjqdltr".indexOf(lower) !== -1);
            var shouldDrip = isPunct || (hasDescender && Math.random() < 0.14);
            var dripClass = shouldDrip ? " has-drip" : "";
            return '<span class="blood-char pending' + dripClass + '" data-char="' + escapeHtml(ch) + '">' + escapeHtml(ch) + '</span>';
          }).join("");
          return '<span class="blood-word">' + charsHtml + '</span>';
        }).join(" ");
      }

      function showLine() {
        if (!self.isActive) return;

        if (lineIdx >= lines.length) {
          // All lines completed! Linger on final sentence, then dissolve into End Card
          self.delay(function () {
            if (!self.isActive) return;
            textEl.classList.add("exit");
            self.delay(function () {
              if (!self.isActive) return;
              self.showEndCard();
            }, 650);
          }, 2400);
          return;
        }

        var text = lines[lineIdx];
        lineIdx++;

        // Step 1: Liquefied blood dissolve of previous line
        textEl.classList.add("exit");

        self.delay(function () {
          if (!self.isActive) return;

          // Clear any specialized classes from prior line
          textEl.className = "cinema-text-line";

          var isCountdown = (text === "Two..." || text === "One..." || text === "The timer begins in three...");
          var isClimax = (text === "LET THE HAUNT BEGIN!" || text === "Don't disappoint me." || text === "Five minutes. Finish strong.");

          if (text === "Emergency protocol initiated.") {
            if (window.Sound && window.Sound.cutsceneAlarm) {
              window.Sound.cutsceneAlarm();
            }
          }

          if (text === "Two..." || text === "One...") {
            textEl.classList.add("countdown-num");
            if (window.Sound && window.Sound.cutsceneHeartbeat) {
              window.Sound.cutsceneHeartbeat(text === "One..." ? 1.8 : 1.4);
            }
          } else if (text === "The timer begins in three...") {
            if (window.Sound && window.Sound.cutsceneHeartbeat) {
              window.Sound.cutsceneHeartbeat(1.0);
            }
          }

          if (isClimax) {
            // CLIMAX EXPLOSION!
            textEl.classList.add("haunt-climax");
            textEl.innerHTML = buildLineMarkup(text);
            void textEl.offsetWidth;

            // Instantly burst all characters into bright arterial crimson
            var chars = textEl.querySelectorAll(".blood-char");
            chars.forEach(function (c) {
              c.classList.remove("pending");
              c.classList.add("bleeding");
            });

            // Violent camera tremor, lightning flash, and thunderous roar
            if (self.rig) {
              self.rig.classList.remove("claw-slam-shake");
              void self.rig.offsetWidth;
              self.rig.classList.add("claw-slam-shake");
            }
            if (self.flash) {
              self.flash.classList.add("bang");
              setTimeout(function () {
                if (self.flash) {
                  self.flash.classList.remove("bang");
                  self.flash.classList.add("fade");
                }
              }, 140);
            }

            var S = window.Sound || {};
            if (S.cutsceneImpact) S.cutsceneImpact();
            if (S.cutsceneDragRoar) S.cutsceneDragRoar();
            if (S.thunder) S.thunder();

            // Hold climax for 3.2 seconds, then transition to End Card
            self.delay(function () {
              if (!self.isActive) return;
              textEl.classList.add("exit");
              self.delay(function () {
                if (!self.isActive) return;
                self.showEndCard();
              }, 600);
            }, 3200);
            return;
          }

          // Render new sentence with all characters in pending (invisible) state
          textEl.classList.remove("exit");
          textEl.innerHTML = buildLineMarkup(text);
          void textEl.offsetWidth;

          if (window.Sound && window.Sound.whisper && lineIdx % 2 === 1 && !isCountdown) {
            window.Sound.whisper();
          }

          var charEls = Array.prototype.slice.call(textEl.querySelectorAll(".blood-char"));
          var charIdx = 0;
          isTyping = true;
          pendingChars = charEls;

          // Letter-by-letter blood emergence with natural spooky cadence
          function revealNextChar() {
            if (!self.isActive) {
              isTyping = false;
              return;
            }
            if (charIdx >= charEls.length) {
              isTyping = false;
              // Finished writing current line! Linger for reading
              var lingerTime = (text === "Two..." || text === "One...") ? 1300 : (text.length > 55 ? 2600 : 2100);
              self.delay(showLine, lingerTime);
              return;
            }

            var el = charEls[charIdx];
            charIdx++;
            el.classList.remove("pending");
            el.classList.add("bleeding");

            // Play visceral blood inscribe / drip audio
            var Sound = window.Sound || {};
            if (Sound.cutsceneBloodDripTick && (charIdx % 2 === 1 || el.classList.contains("has-drip"))) {
              Sound.cutsceneBloodDripTick();
            }

            var ch = el.getAttribute("data-char") || "";
            var delayMs = 38;
            if (ch === "." || ch === "!" || ch === "?") {
              delayMs = isCountdown ? 180 : 280; // Dramatic pause on punctuation
            } else if (ch === "," || ch === ";") {
              delayMs = 150;
            } else {
              delayMs = 32 + Math.floor(Math.random() * 14);
            }

            currentTypeTimer = self.delay(revealNextChar, delayMs);
          }

          revealNextChar();
        }, 580);
      }

      // Fast-forward line on click (if user clicks screen, immediately finish writing current line)
      if (stageEl && !stageEl._clickBound) {
        stageEl._clickBound = true;
        stageEl.addEventListener("click", function () {
          if (isTyping && pendingChars.length > 0) {
            if (currentTypeTimer) clearTimeout(currentTypeTimer);
            pendingChars.forEach(function (el) {
              el.classList.remove("pending");
              el.classList.add("bleeding");
            });
            isTyping = false;
            self.delay(showLine, 2100);
          }
        });
      }

      showLine();
    },

    showEndCard: function () {
      if (this.cinemaWrap) this.cinemaWrap.hidden = true;
      if (this.endcard) {
        if (this.cutsceneType === "hex") {
          if (this.endcardKicker) this.endcardKicker.textContent = "Microsoft Tech Community · Round 02";
          if (this.endcardTitle) this.endcardTitle.innerHTML = 'THE HAUNT IS LIVE<br><span class="highlight-glitch">LET THE HAUNT BEGIN</span>';
          if (this.endcardDesc) this.endcardDesc.innerHTML = 'Your assignments have been sealed in blood. The timer has begun.<br>Build a digital experience worthy of this realm before time expires.';
          if (this.proceedBtnText) this.proceedBtnText.textContent = "START BUILDING NOW →";
        } else if (this.cutsceneType === "corruption") {
          if (this.endcardKicker) this.endcardKicker.textContent = "CRITICAL ALERT · 15 MINUTES ELAPSED";
          if (this.endcardTitle) this.endcardTitle.innerHTML = 'SYSTEM CORRUPTION ACTIVE<br><span class="highlight-glitch">THE TWIST AWAKENS</span>';
          if (this.endcardDesc) this.endcardDesc.innerHTML = 'The Phantom has breached your build environment. An unexpected corruption has surfaced.<br>Face the Twist Wheel and accept your team\'s new handicap.';
          if (this.proceedBtnText) this.proceedBtnText.textContent = "FACE THE TWIST →";
        } else if (this.cutsceneType === "fiveMin") {
          if (this.endcardKicker) this.endcardKicker.textContent = "FINAL COUNTDOWN · 05:00 REMAINING";
          if (this.endcardTitle) this.endcardTitle.innerHTML = 'SYSTEM SHUTDOWN IN 05:00<br><span class="highlight-glitch">SUBMISSION WINDOW CLOSING</span>';
          if (this.endcardDesc) this.endcardDesc.innerHTML = 'Check your links. Check your interactions. Make sure your website actually works.<br>Five minutes remaining. Finish strong.';
          if (this.proceedBtnText) this.proceedBtnText.textContent = "RETURN TO SUBMISSIONS →";
        } else if (this.cutsceneType === "alliance") {
          if (this.endcardKicker) this.endcardKicker.textContent = "🌀 COMPULSORY SPONSOR TWIST · ROUND 2 BUILD";
          if (this.endcardTitle) this.endcardTitle.innerHTML = 'THE ALLIANCE PROTOCOL<br><span class="highlight-glitch">KAPIDHWAJ INTEGRATION</span>';
          if (this.endcardDesc) {
            this.endcardDesc.innerHTML =
              '<div class="endcard-sponsor-badge">' +
                '<img src="assets/sponsor/kapidhwaj.png" alt="Kapidhwaj Logo" class="endcard-sponsor-logo sponsor-logo">' +
                '<div class="endcard-sponsor-info">' +
                  '<strong>Official Sponsor: KAPIDHWAJ</strong>' +
                  '<p>A boring footer logo won\'t save your website. Creatively integrate Kapidhwaj\'s official Instagram into your character\'s world.</p>' +
                  '<a href="https://www.instagram.com/kapidhwaj.innovations/" target="_blank" rel="noopener" class="endcard-ig-link">📸 View @kapidhwaj.innovations on Instagram ↗</a>' +
                '</div>' +
              '</div>' +
              '<div class="endcard-sponsor-rules">' +
                '<strong>Rules of the Alliance:</strong>' +
                '<ul>' +
                  '<li>1. Feature the official Kapidhwaj Instagram account.</li>' +
                  '<li>2. Include a clickable link to @kapidhwaj.innovations.</li>' +
                  '<li>3. Visually match your website\'s aesthetic & character theme.</li>' +
                  '<li>4. Must feel intentional and creative — not an unrelated ad.</li>' +
                '</ul>' +
              '</div>';
          }
          if (this.proceedBtnText) this.proceedBtnText.textContent = "ENTER MISSION WORKSPACE →";
        } else if (this.cutsceneType === "zeroHour") {
          if (this.endcardKicker) this.endcardKicker.textContent = "DEADLINE REACHED · WINDOW CLOSED";
          if (this.endcardTitle) this.endcardTitle.innerHTML = 'BUILD WINDOW CLOSED!<br><span class="highlight-glitch">SUBMISSIONS LOCKED!</span>';
          if (this.endcardDesc) this.endcardDesc.innerHTML = 'The digital veil has permanently sealed. No further submissions will be accepted.<br>The judges are now reviewing your creations.';
          if (this.proceedBtnText) this.proceedBtnText.textContent = "VIEW LOCKED RECORD →";
        } else {
          if (this.endcardKicker) this.endcardKicker.textContent = "Microsoft Tech Community · Round 02";
          if (this.endcardTitle) this.endcardTitle.innerHTML = 'MISSION 02<br><span class="highlight-glitch">WEBSITE RESURRECTION</span>';
          if (this.endcardDesc) this.endcardDesc.innerHTML = 'The realms have collapsed. Their digital homes have vanished.<br>Your purpose is no longer destruction. <strong>It is resurrection.</strong>';
          if (this.proceedBtnText) this.proceedBtnText.textContent = "PROCEED TO THE WHEEL OF EVIL →";
        }

        this.endcard.hidden = false;
        void this.endcard.offsetWidth;
      }
      var S = window.Sound || {};
      if (S.cutsceneImpact) S.cutsceneImpact();
    },

    // ----------------------------------------------------
    // CLEAN DISMISSAL & HANDOFF
    // ----------------------------------------------------
    exit: function (skipped) {
      this.isActive = false;
      this.clearTimers();
      if (this.animFrame) cancelAnimationFrame(this.animFrame);

      var S = window.Sound || {};
      if (S.cutsceneVortexHum) S.cutsceneVortexHum(false);
      if (S.cutsceneWarpEngine) S.cutsceneWarpEngine(false);

      if (this.portalVideo) {
        this.portalVideo.pause();
        this.portalVideo.currentTime = 0;
        this.portalVideo.classList.remove("is-playing", "is-fading");
        this.portalVideo.hidden = true;
        this.portalVideo.onended = null;
        this.portalVideo.ontimeupdate = null;
        this.portalVideo.onplaying = null;
      }

      var self = this;
      if (this.layer) {
        this.layer.classList.remove("is-active");
      }

      var completedType = this.cutsceneType;

      // Persist seen status in preferences
      try {
        if (window.Store && window.Store.setPref) {
          if (completedType === "hex") window.Store.setPref("hexCutsceneSeen", true);
          else if (completedType === "entry") window.Store.setPref("cutsceneSeen", true);
        }
      } catch (e) {}

      setTimeout(function () {
        if (self.layer) self.layer.hidden = true;
        self.resetVisuals();

        if (completedType === "hex") {
          // Hex Cutscene completed: smooth handoff to Mission Workspace
          if (window.App && typeof window.App.onHexCutsceneComplete === "function") {
            window.App.onHexCutsceneComplete();
          } else {
            var tabMission = document.getElementById("tabMission");
            if (tabMission) tabMission.click();
            var submissionCard = document.getElementById("submissionCard");
            if (submissionCard) submissionCard.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        } else if (completedType === "corruption") {
          // Corruption Cutscene completed: awaken the Twist Wheel!
          if (window.App && typeof window.App.onCorruptionCutsceneComplete === "function") {
            window.App.onCorruptionCutsceneComplete();
          } else {
            var tabWheel = document.getElementById("tabWheel");
            if (tabWheel) tabWheel.click();
          }
        } else if (completedType === "fiveMin") {
          // 5-Min Cutscene completed: handoff to persistent banner & submission focus
          if (window.App && typeof window.App.onFiveMinCutsceneComplete === "function") {
            window.App.onFiveMinCutsceneComplete();
          } else {
            var banner = document.getElementById("systemShutdownBanner");
            if (banner) banner.hidden = false;
            var tabMission2 = document.getElementById("tabMission");
            if (tabMission2) tabMission2.click();
          }
        } else if (completedType === "alliance") {
          // Alliance Protocol completed: smooth handoff to Mission Workspace
          if (window.App && typeof window.App.onAllianceCutsceneComplete === "function") {
            window.App.onAllianceCutsceneComplete();
          } else {
            var tabMissionA = document.getElementById("tabMission");
            if (tabMissionA) tabMissionA.click();
            var allianceCard = document.getElementById("allianceProtocolCard");
            if (allianceCard) allianceCard.scrollIntoView({ behavior: "smooth", block: "start" });
            else {
              var submissionCardA = document.getElementById("submissionCard");
              if (submissionCardA) submissionCardA.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }
        } else if (completedType === "zeroHour") {
          // Zero Hour completed: lock down submissions permanently
          if (window.App && typeof window.App.onZeroHourComplete === "function") {
            window.App.onZeroHourComplete();
          }
        } else {
          // Entry Cutscene completed: handoff to main altar gate dismissal & Creatures.opening()
          var gate = document.getElementById("gate");
          if (gate) gate.classList.add("gone");
          if (window.Creatures && window.Creatures.opening) {
            window.Creatures.opening();
          }
        }
      }, 450);
    },

    playEntryCutscene: function () {
      this.play("entry");
    },

    playHexCutscene: function () {
      this.play("hex");
    },

    playCorruptionCutscene: function () {
      this.play("corruption");
    },

    playFiveMinCutscene: function () {
      this.play("fiveMin");
    },

    playZeroHourCutscene: function () {
      this.play("zeroHour");
    },

    playAllianceCutscene: function () {
      this.play("alliance");
    },

    delay: function (fn, ms) {
      var id = setTimeout(fn, ms);
      this.timerIds.push(id);
      return id;
    },

    clearTimers: function () {
      this.timerIds.forEach(function (id) { clearTimeout(id); });
      this.timerIds = [];
    }
  };

  window.OtherSideCutscene = Cutscene;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { Cutscene.init(); });
  } else {
    Cutscene.init();
  }
})();
