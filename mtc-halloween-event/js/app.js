/* =========================================================
   App — the ritual: ledger → soul → curse → hex → (wait) → twist
   ========================================================= */

(function () {
  "use strict";

  var D = window.CURSE_DATA;
  var $ = function (id) { return document.getElementById(id); };

  var STAGES = { soul: 1, curse: 2, hex: 3, wait: 4, twist: 4, done: 5 };

  var THEMES = {
    soul:  { a: "#1c0708", b: "#110405", accent: "#c4161c" },
    curse: { a: "#200807", b: "#130404", accent: "#c4161c" },
    hex:   { a: "#200d05", b: "#130703", accent: "#ff7a1a" },
    twist: { a: "#25060a", b: "#150306", accent: "#ff3326" }
  };

  var el = {
    ledgerPanel: $("ledgerPanel"), wheelPanel: $("wheelPanel"),
    form: $("r2QuickEntryForm") || $("ledgerForm"),
    teamInput: $("quickResumeTeamInput") || $("teamInput"),
    teamError: $("teamError"),
    quickResumeBtn: $("quickResumeBtn"),
    quickResumeLabel: $("quickResumeLabel"),
    r2HostLockedCard: $("r2HostLockedCard"),
    r2EnterWrap: $("r2EnterWrap"),
    leaderNameInput: $("leaderNameInput"), leaderYearInput: $("leaderYearInput"), leaderBranchInput: $("leaderBranchInput"),
    leaderPhoneInput: $("leaderPhoneInput"), leaderEmailInput: $("leaderEmailInput"),
    membersContainer: $("membersContainer"), addMemberBtn: $("addMemberBtn"), membersLimitNote: $("membersLimitNote"),
    seals: $("seals"), kicker: $("wheelKicker"), title: $("wheelTitle"), sub: $("wheelSub"),
    stage: $("wheelStage"), rotor: $("wheelRotor"), canvas: $("wheelCanvas"), pointer: $("pointer"),
    hub: $("hub"), chains: $("chains"), countdown: $("countdown"),
    spinBtn: $("spinBtn"), spinLabel: $("spinLabel"), spinHint: $("spinHint"),
    fateList: $("fateList"), grimoireTeam: $("grimoireTeam"), grimoireRoster: $("grimoireRoster"), grimoireFoot: $("grimoireFoot"),
    reveal: $("reveal"), card: $("card"), cardKicker: $("cardKicker"), cardGlyph: $("cardGlyph"),
    cardPortraitFrame: $("cardPortraitFrame"), cardPortraitImg: $("cardPortraitImg"), cardPortraitBadge: $("cardPortraitBadge"),
    cardArchetypeWrap: $("cardArchetypeWrap"), cardArchetypeTag: $("cardArchetypeTag"),
    cardBriefBox: $("cardBriefBox"), cardBriefText: $("cardBriefText"),
    cardQuote: $("cardQuote"), cardQuoteText: $("cardQuoteText"),
    cardName: $("cardName"), cardLore: $("cardLore"), cardDesc: $("cardDesc"),
    cardMustHave: $("cardMustHave"), cardMustHaveText: $("cardMustHaveText"), cardBtn: $("cardBtn"),
    prologueModal: $("prologueModal"), prologueCloseBtn: $("prologueCloseBtn"), prologuePill: $("prologuePill"),
    decreeTopBtn: $("decreeTopBtn"), cutsceneTopBtn: $("cutsceneTopBtn"),
    host: $("hostModal"), announcer: $("announcer"), soundBtn: $("soundBtn"),
    spinner: $("spinner"), spinnerFace: $("spinnerFace"), spinnerName: $("spinnerName"), spinnerLine: $("spinnerLine"),
    gate: $("gate"), scareBtn: $("scareBtn"), cardScope: $("cardScope"),
    submissionCard: $("submissionCard"), subForm: $("submissionForm"),
    subUrl: $("subUrl"), subRepo: $("subRepo"), subError: $("subError"),
    subZipFile: $("subZipFile"), subDropzone: $("subDropzone"),
    subDropzoneContent: $("subDropzoneContent"), subFileChosen: $("subFileChosen"),
    subFileName: $("subFileName"), subFileSize: $("subFileSize"), subFileRemove: $("subFileRemove"),
    subZipLink: $("subZipLink"),
    subSubmitBtn: $("subSubmitBtn"), subSubmitLabel: $("subSubmitLabel"),
    subResult: $("subResult"), subResultTime: $("subResultTime"),
    subLiveLink: $("subLiveLink"), subRepoLink: $("subRepoLink"),
    subZipDownload: $("subZipDownload"), subZipCloudLink: $("subZipCloudLink"),
    subEditBtn: $("subEditBtn"),
    subStatusPill: $("subStatusPill"), subStatusText: $("subStatusText"),
    viewTabs: $("viewTabs"), tabWheel: $("tabWheel"), tabGrimoire: $("tabGrimoire"), tabSubmit: $("tabSubmit"), tabFaqs: $("tabFaqs"),
    paneGrimoire: $("paneGrimoire"), paneSubmit: $("paneSubmit"), paneFaqs: $("paneFaqs"),
    faqCard: $("faqCard"), faqSearchInput: $("faqSearchInput"), faqSearchClear: $("faqSearchClear"),
    faqCategoryChips: $("faqCategoryChips"), faqList: $("faqList"), faqEmpty: $("faqEmpty"), faqResetBtn: $("faqResetBtn"),
    apCopyHandleBtn: $("apCopyHandleBtn"), apIgLink: $("apIgLink"),
    systemShutdownBanner: $("systemShutdownBanner"),
    shutdownCountdown: $("shutdownCountdown"),
    shutdownBannerText: $("shutdownBannerText"),
    topbarTimer: $("topbarTimer"),
    topbarTimerDigits: $("topbarTimerDigits"),
    hostTriggerCorruption: $("hostTriggerCorruption"),
    hostTriggerFiveMin: $("hostTriggerFiveMin"),
    hostTriggerZeroHour: $("hostTriggerZeroHour")
  };

  var wheel = new window.Wheel(el.canvas, el.rotor, el.pointer);

  // Step II isn't a wheel: the team chooses one of its character's problems.
  var picker = document.createElement("div");
  picker.className = "ps-picker";
  picker.id = "psPicker";
  picker.hidden = true;
  el.stage.parentNode.insertBefore(picker, el.stage.nextSibling);
  var wheelActions = el.spinBtn.closest(".wheel-actions");

  var session = window.Store.session();
  var timerId = null, lastBpm = 0;
  var busy = false, replaying = false, cardSeq = 0;
  var activeView = "grimoire";
  var baseTitle = document.title;

  function setView(view, smoothScroll) {
    var isTwistPending = session && (session.stage === "wait" || session.stage === "twist") && typeof session.twist !== "number";
    var validViews = isTwistPending ? ["wheel", "grimoire"] : ["grimoire", "submit", "faqs"];
    if (view === "mission") view = "grimoire";
    if (validViews.indexOf(view) === -1) {
      view = "grimoire";
    }
    activeView = view;
    if (!el.wheelPanel) return;

    el.wheelPanel.classList.toggle("view-wheel", view === "wheel");
    el.wheelPanel.classList.toggle("view-grimoire", view === "grimoire");
    el.wheelPanel.classList.toggle("view-submit", view === "submit");
    el.wheelPanel.classList.toggle("view-faqs", view === "faqs");
    el.wheelPanel.classList.toggle("view-mission", view !== "wheel");

    if (el.tabWheel) el.tabWheel.classList.toggle("is-active", view === "wheel");
    if (el.tabGrimoire) el.tabGrimoire.classList.toggle("is-active", view === "grimoire");
    if (el.tabSubmit) el.tabSubmit.classList.toggle("is-active", view === "submit");
    if (el.tabFaqs) el.tabFaqs.classList.toggle("is-active", view === "faqs");

    if (el.paneGrimoire) el.paneGrimoire.hidden = (view !== "grimoire");
    if (el.paneSubmit) el.paneSubmit.hidden = (view !== "submit");
    if (el.paneFaqs) {
      el.paneFaqs.hidden = (view !== "faqs");
      if (view === "faqs" && typeof initFaqsHub === "function") {
        initFaqsHub();
      }
    }

    if (view === "wheel") {
      requestAnimationFrame(function () {
        if (wheel && typeof wheel.draw === "function") wheel.draw();
      });
    }

    if (view === "submit" && typeof renderSubmissionState === "function") {
      renderSubmissionState();
    }

    if (window.Sound && window.Sound.tick) window.Sound.tick(0.4);

    if (smoothScroll && el.viewTabs) {
      el.viewTabs.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /* ---------- helpers ---------- */

  function rand(n) {
    if (window.crypto && window.crypto.getRandomValues) {
      var a = new Uint32Array(1); window.crypto.getRandomValues(a);
      return a[0] % n;
    }
    return Math.floor(Math.random() * n);
  }
  function pick(list) { return list[rand(list.length)]; }

  function charById(id) {
    if (id === "thanos") id = "valak";
    for (var i = 0; i < D.characters.length; i++) if (D.characters[i].id === id) return D.characters[i];
    return null;
  }

  var pictographic = (function () {
    try { return new RegExp("\\p{Extended_Pictographic}", "u"); } catch (e) { return /[☀-➿]|[\uD83C-\uDBFF]/; }
  })();
  function isEmoji(s) { return pictographic.test(s || ""); }

  function delayMinutes() { return window.Ledger.delayMinutes(D.twistDelayMinutes); }

  function fmt(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000));
    var m = Math.floor(s / 60); s = s % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function fillTwist(text) {
    var c = charById(session.charId);
    var x = session.twistExtra || {};
    return text
      .replace(/\{char\}/g, c ? c.short : "your character")
      .replace(/\{randomChar\}/g, x.randomChar || "another monster")
      .replace(/\{randomCurse\}/g, x.randomCurse || "another hex");
  }

  function announce(msg) { el.announcer.textContent = ""; setTimeout(function () { el.announcer.textContent = msg; }, 50); }

  function save() { window.Store.saveSession(session); }

  /* ---------- wheel configs per stage ---------- */

  // Any number of teams may share a character and a problem, so nothing is ever struck out.
  function soulSegments() {
    return D.characters.map(function (c) {
      return { label: c.short, glyph: c.glyph, color: c.color, disabled: false };
    });
  }
  function curseSegments(c) {
    return c.problems.map(function (p) {
      return { label: p.t, glyph: "", color: c.color, disabled: false };
    });
  }
  function hexSegments() {
    return D.uiCurses.map(function (h, i) {
      return { label: h.t, glyph: h.glyph, glyphIsText: !isEmoji(h.glyph), color: i % 2 ? "#d9480f" : "#ff8a3d" };
    });
  }
  function twistSegments() {
    return D.twists.map(function (t, i) {
      return { label: t.t, glyph: t.glyph, glyphIsText: !isEmoji(t.glyph), color: i % 2 ? "#f0735a" : "#ff3326" };
    });
  }

  /* ---------- rendering ---------- */

  function setSeals(step) {
    var items = el.seals.querySelectorAll("li");
    el.seals.style.setProperty("--p", Math.max(0, Math.min(1, (step - 1) / (items.length - 1))));
    for (var i = 0; i < items.length; i++) {
      var n = i + 1;
      items[i].classList.toggle("is-done", n < step);
      items[i].classList.toggle("is-current", n === step);
    }
  }

  // puts a character's face photo in a glyph box; the emoji shows until (and unless) the photo loads
  function showFace(box, c, glyph) {
    var src = c ? (c.face || ("assets/characters/" + c.id + "-face.jpg")) : "";
    if (src && box.dataset.face === src && box.classList.contains("has-photo")) return;
    box.dataset.face = src;
    box.classList.remove("has-photo");
    box.textContent = glyph;
    if (!src) return;
    var img = new Image();
    img.className = "face-photo";
    img.alt = "";
    img.draggable = false;
    img.onload = function () {
      if (box.dataset.face !== src) return; // something else has been shown since
      box.textContent = ""; box.appendChild(img); box.classList.add("has-photo");
    };
    img.src = src;
  }

  function setFate(slot, data) {
    var li = el.fateList.querySelector('[data-slot="' + slot + '"]');
    var num = li.querySelector(".fate-num"), name = li.querySelector(".fate-name"), desc = li.querySelector(".fate-desc");
    var must = li.querySelector(".fate-must-have");
    var roman = ["I", "II", "III", "IV", "V"][slot - 1];
    li.classList.remove("is-filled", "is-current");
    var filled = !!(data && data.name);
    li.tabIndex = filled ? 0 : -1;
    if (filled) li.title = "Hover or tap to see this card again"; else li.removeAttribute("title");
    if (filled) {
      var wasEmpty = name.textContent === "???";
      li.classList.add("is-filled");
      li.style.setProperty("--c", data.color || "#f4e3d7");
      showFace(num, data.char, data.glyph || roman);
      name.textContent = data.name;
      desc.textContent = data.desc || "";
      if (must) {
        if (data.mustHave) {
          must.hidden = false;
          var textSpan = must.querySelector(".must-text");
          if (textSpan) textSpan.textContent = data.mustHave;
        } else {
          must.hidden = true;
        }
      }
      if (wasEmpty && data.fresh) { li.classList.remove("is-new"); void li.offsetWidth; li.classList.add("is-new"); }
    } else {
      showFace(num, null, roman);
      name.textContent = data && data.pendingName ? data.pendingName : "???";
      desc.textContent = data && data.pendingDesc ? data.pendingDesc : "";
      if (must) must.hidden = true;
      if (data && data.current) li.classList.add("is-current");
    }
  }

  function renderGrimoire(fresh) {
    var s = session || {};
    var c = charById(s.charId);
    var stage = s.stage;
    el.grimoireTeam.textContent = s.team ? "Team · " + s.team : "";
    if (el.grimoireRoster) {
      if (s.leader && s.leader.name) {
        var rText = "👑 " + s.leader.name;
        if (s.leader.branch || s.leader.year) {
          rText += " (" + [s.leader.year, s.leader.branch].filter(Boolean).join(" · ") + ")";
        }
        if (s.members && s.members.length) {
          rText += " · +" + s.members.length + " member" + (s.members.length > 1 ? "s" : "");
        }
        el.grimoireRoster.textContent = rText;
        el.grimoireRoster.hidden = false;
      } else {
        el.grimoireRoster.textContent = "";
        el.grimoireRoster.hidden = true;
      }
    }

    setFate(1, c ? { name: c.name, desc: c.lore, glyph: c.glyph, char: c, color: c.color, fresh: fresh } : { current: stage === "soul" });

    var p = c && typeof s.problem === "number" ? c.problems[s.problem] : null;
    setFate(2, p ? { name: p.t, desc: p.d, glyph: "📜", color: c.color, fresh: fresh } : { current: stage === "curse" });

    var h = typeof s.hex === "number" ? D.uiCurses[s.hex] : null;
    setFate(3, h ? { name: h.t, desc: h.d, mustHave: h.mustHave, glyph: h.glyph, color: "#ff8a3d", fresh: fresh } : { current: stage === "hex" });

    var t = typeof s.twist === "number" ? D.twists[s.twist] : null;
    if (t) setFate(4, { name: t.t, desc: fillTwist(t.d), glyph: t.glyph, color: "#ff5a4a", fresh: fresh });
    else if (stage === "wait") setFate(4, { current: true, pendingName: "Sleeping…", pendingDesc: "Wakes in " + fmt(s.unlockAt - Date.now()) });
    else if (stage === "twist") setFate(4, { current: true, pendingName: "Awake", pendingDesc: "Spin the final wheel." });
    else setFate(4, {});

    var s5 = el.fateList ? el.fateList.querySelector('[data-slot="5"]') : null;
    if (s5) {
      if (typeof s.twist === "number" || stage === "done") {
        s5.hidden = false;
        setFate(5, {
          name: "The Alliance Protocol · KAPIDHWAJ",
          desc: "Creatively integrate official sponsor KAPIDHWAJ's Instagram (@kapidhwaj.innovations) into your character's world.",
          mustHave: "@kapidhwaj.innovations on Instagram + themed integration",
          glyph: "🌀",
          color: "#ffaa00",
          fresh: fresh
        });
      } else {
        s5.hidden = true;
      }
    }

    el.grimoireFoot.hidden = stage !== "done";
    if (stage === "done") renderSubmissionState();
    renderEggs();
  }

  function renderSubmissionState() {
    if (!session || !el.submissionCard) return;
    var hasSub = !!session.submissionUrl;
    el.subResult.hidden = !hasSub;
    el.subForm.hidden = hasSub;
    el.subError.hidden = true;
    el.subError.textContent = "";

    if (el.subStatusPill && el.subStatusText) {
      if (hasSub) {
        el.subStatusPill.classList.add("is-submitted");
        el.subStatusText.textContent = "Project Submitted & Verified ✓";
      } else {
        el.subStatusPill.classList.remove("is-submitted");
        el.subStatusText.textContent = "Awaiting Submission";
      }
    }

    if (hasSub) {
      el.subLiveLink.href = session.submissionUrl;
      var timeStr = session.submittedAt
        ? new Date(session.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";
      el.subResultTime.textContent = timeStr ? "Submitted at " + timeStr : "Submitted";
      if (session.repoUrl) {
        el.subRepoLink.hidden = false;
        el.subRepoLink.href = session.repoUrl;
      } else {
        el.subRepoLink.hidden = true;
      }

      if (session.zipCloudUrl) {
        el.subZipCloudLink.hidden = false;
        el.subZipCloudLink.href = session.zipCloudUrl;
      } else {
        el.subZipCloudLink.hidden = true;
      }

      if (session.zipUrl) {
        el.subZipDownload.hidden = false;
        el.subZipDownload.href = session.zipUrl;
        el.subZipDownload.download = session.zipName || "project-source.zip";
      } else if (session.zipData) {
        el.subZipDownload.hidden = false;
        el.subZipDownload.href = session.zipData;
        el.subZipDownload.download = session.zipName || "project-source.zip";
      } else if (session.zipName) {
        el.subZipDownload.hidden = false;
        el.subZipDownload.download = session.zipName;
        window.Store.getZipFile(session.teamKey).then(function (rec) {
          if (rec && rec.blob) {
            el.subZipDownload.href = URL.createObjectURL(rec.blob);
          }
        });
      } else {
        el.subZipDownload.hidden = true;
      }
    }
  }

  function configureWheel(stage, animate) {
    var c = charById(session.charId);
    var segs, theme, kicker, title, sub;
    switch (stage) {
      case "soul":
        segs = soulSegments(); theme = THEMES.soul;
        kicker = "Wheel I · The Wheel of Evil"; title = "The Wheel of Evil";
        sub = "Every monster has a weakness. The Wheel of Evil decides which dark entity your team must help.";
        break;
      case "curse":
        segs = curseSegments(c); theme = { a: THEMES.curse.a, b: THEMES.curse.b, accent: c.color };
        kicker = "Step II · The Curse"; title = c.short + "'s Curse";
        sub = "Choose the problem your team will build.";
        break;
      case "hex":
        segs = hexSegments(); theme = THEMES.hex;
        kicker = "Wheel III · The Hex"; title = "Hex Your Interface";
        sub = "A rule your UI must obey — no matter what.";
        break;
      default:
        segs = twistSegments(); theme = THEMES.twist;
        kicker = "Wheel IV · The Twist"; title = "The Twist";
        sub = stage === "wait" ? "The final wheel is chained. It wakes when the timer dies."
            : stage === "twist" ? "The chains have broken. Spin, if you dare."
            : "Your fate is sealed.";
    }
    el.kicker.textContent = kicker;
    el.title.textContent = title;
    el.sub.textContent = sub;
    el.stage.style.setProperty("--accent", theme.accent);

    var sig = stage + ":" + (session.charId || "");
    if (wheel._sig !== sig || animate) {
      wheel.setSegments(segs, theme);
      wheel._sig = sig;
      if (animate) { el.rotor.classList.remove("swap"); void el.rotor.offsetWidth; el.rotor.classList.add("swap"); }
    } else {
      wheel.setSegments(segs, theme);
    }
  }

  function setSpinState(stage) {
    var canSpin = !busy && (stage === "soul" || stage === "hex" || stage === "twist");
    var who = spinnerFor(stage);
    el.spinBtn.disabled = !canSpin && stage !== "done";
    el.hub.disabled = !canSpin;
    el.spinHint.style.visibility = canSpin ? "visible" : "hidden";
    if (busy) el.spinLabel.textContent = "The wheel turns…";
    else if (stage === "wait") el.spinLabel.textContent = "Chained · " + fmt(session.unlockAt - Date.now());
    else if (stage === "done") el.spinLabel.textContent = (session && session.submissionUrl) ? "View Submission ↗" : "Submit Project 🚀";
    else if (stage === "soul") el.spinLabel.textContent = "Spin the Wheel";
    else el.spinLabel.textContent = "Let " + who.short + " spin";
  }

  /* ---------- the haunted spinner ---------- */
  // The Eye spins the first wheel; after that the team's own soul spins the rest.

  function spinnerFor(stage) {
    var c = session && charById(session.charId);
    if (stage === "soul" || !c) {
      var k = D.keeper;
      return { id: "keeper", name: k.name, short: k.name, glyph: k.glyph, color: k.color, spin: k.spin, idle: k.idle };
    }
    return { id: c.id, name: c.name, short: c.short, glyph: c.glyph, char: c, color: c.color, spin: c.spin, idle: c.idle };
  }

  var WHEEL_NAMES = { soul: "soul", curse: "curse", hex: "hex", twist: "twist" };

  function updateSpinner(stage, line) {
    var who = spinnerFor(stage);
    el.spinner.style.setProperty("--c", who.color);
    showFace(el.spinnerFace, who.char, who.glyph);
    el.spinnerName.textContent = who.name;
    el.spinner.classList.remove("impatient");
    if (line) { el.spinnerLine.textContent = line; return; }
    if (stage === "soul") el.spinnerLine.textContent = "Spin, and I shall choose which soul you become…";
    else if (stage === "wait") el.spinnerLine.textContent = "The last wheel sleeps… I can hear it breathing.";
    else if (stage === "done") el.spinnerLine.textContent = "Our fate is sealed. Now build… before midnight.";
    else if (stage === "curse") el.spinnerLine.textContent = "Choose my curse wisely… whichever you claim, you must lift.";
    else el.spinnerLine.textContent = "I'll spin your " + WHEEL_NAMES[stage] + " wheel myself. Give the word.";
  }

  /* ---------- impatience: a spirit spins for slow teams ---------- */

  var idleSince = Date.now(), looming = false;
  function resetIdle() { idleSince = Date.now(); }

  setInterval(function () {
    if (!session || busy || !el.reveal.hidden || !el.gate.classList.contains("gone")) return;
    var stage = session.stage;
    // the curse is the team's own choice, so nobody chooses it for them
    if (["soul", "hex", "twist"].indexOf(stage) < 0) return;
    var left = (D.idleSpinSeconds || 60) * 1000 - (Date.now() - idleSince);
    if (left > 15000) return;
    var who = spinnerFor(stage);
    if (left <= 0) {
      if (document.hidden || looming) return; // wait until someone is looking
      // patience gone: the soul's shadow looms over everything… then it spins
      looming = true;
      el.spinnerLine.textContent = who.idle;
      window.Creatures.impatience(who, function () { looming = false; spin(true); });
      return;
    }
    el.spinner.classList.add("impatient");
    el.spinnerLine.innerHTML = "";
    el.spinnerLine.appendChild(document.createTextNode(who.idle + " "));
    var cnt = document.createElement("span");
    cnt.className = "idle-count";
    cnt.textContent = "(" + Math.ceil(left / 1000) + "s)";
    el.spinnerLine.appendChild(cnt);
  }, 1000);

  var isRound2Unlocked = true;

  function updateGateUI() {
    var lockedCard = el.r2HostLockedCard || $("r2HostLockedCard");
    var enterWrap = el.r2EnterWrap || $("r2EnterWrap");
    if (!lockedCard || !enterWrap) return;
    if (!isRound2Unlocked) {
      lockedCard.hidden = false;
      enterWrap.hidden = true;
    } else {
      lockedCard.hidden = true;
      enterWrap.hidden = false;
    }
  }

  async function checkRound2Gate() {
    try {
      var res = await fetch("/api/round2/state");
      if (res.ok) {
        var data = await res.json();
        if (typeof data.round2Unlocked === "boolean") {
          var prev = isRound2Unlocked;
          isRound2Unlocked = data.round2Unlocked;
          if (data.delayMinutes != null && $("rulesDelay")) {
            $("rulesDelay").textContent = data.delayMinutes;
          }
          if (prev !== isRound2Unlocked) {
            updateGateUI();
            if (session) render();
          }
        }
      }
    } catch (e) {}
  }

  function render(animate) {
    document.body.classList.toggle("in-ritual", !!session);
    if (!session) {
      el.ledgerPanel.hidden = false;
      el.wheelPanel.hidden = true;
      if (el.viewTabs) el.viewTabs.hidden = true;
      el.wheelPanel.classList.remove("view-mission", "view-wheel");
      setSeals(0);
      stopTimer();
      stopBuildTimer();
      document.title = baseTitle;
      updateGateUI();
      return;
    }

    if (!isRound2Unlocked) {
      el.ledgerPanel.hidden = false;
      el.wheelPanel.hidden = true;
      if (el.viewTabs) el.viewTabs.hidden = true;
      updateGateUI();
      return;
    }

    el.ledgerPanel.hidden = true;
    el.wheelPanel.hidden = false;
    startBuildTimer();

    var stage = session.stage;
    setSeals(STAGES[stage]);
    configureWheel(stage, animate);
    renderGrimoire(false);
    setSpinState(stage);

    var choosing = stage === "curse";
    el.stage.style.display = choosing ? "none" : "";
    if (wheelActions) wheelActions.style.display = choosing ? "none" : "";
    picker.hidden = !choosing;
    if (choosing) renderPicker();

    var isTwistPending = session && (stage === "wait" || stage === "twist") && typeof session.twist !== "number";

    if (stage === "done") {
      if (el.viewTabs) el.viewTabs.hidden = false;
      if (el.tabWheel) el.tabWheel.hidden = true;
      if (el.tabGrimoire) el.tabGrimoire.hidden = false;
      if (el.tabSubmit) el.tabSubmit.hidden = false;
      if (el.tabFaqs) el.tabFaqs.hidden = false;
      setView(activeView || "grimoire");
    } else if (isTwistPending) {
      if (el.viewTabs) el.viewTabs.hidden = false;
      if (el.tabWheel) el.tabWheel.hidden = false;
      if (el.tabGrimoire) el.tabGrimoire.hidden = false;
      if (el.tabSubmit) el.tabSubmit.hidden = true;
      if (el.tabFaqs) el.tabFaqs.hidden = true;
      setView((activeView === "wheel" || activeView === "grimoire") ? activeView : "grimoire");
    } else {
      if (el.viewTabs) el.viewTabs.hidden = true;
      if (el.tabWheel) el.tabWheel.hidden = true;
      el.wheelPanel.classList.remove("view-mission", "view-grimoire", "view-submit", "view-faqs", "view-wheel");
      if (el.paneGrimoire) el.paneGrimoire.hidden = false;
      if (el.paneSubmit) el.paneSubmit.hidden = true;
      if (el.paneFaqs) el.paneFaqs.hidden = true;
    }

    el.chains.hidden = stage !== "wait";
    el.chains.classList.remove("breaking");
    if (stage === "wait") startTimer(); else stopTimer();
    if (stage === "done" && typeof session.twist === "number") wheel.show(session.twist);
    if (!busy) updateSpinner(stage);
    setMood(stage === "wait");
  }

  function setMood(tense) {
    if (window.Creatures) window.Creatures.setMood(tense ? "tense" : "calm");
    window.Sound.setTension(tense ? 1 : 0);
    if (!tense) { window.Sound.heartbeat(0); lastBpm = 0; }
  }

  /* ---------- timer ---------- */

  function tickTimer() {
    var left = session.unlockAt - Date.now();
    el.countdown.textContent = fmt(left);
    el.spinLabel.textContent = "Chained · " + fmt(left);
    var li = el.fateList.querySelector('[data-slot="4"] .fate-desc');
    if (li) li.textContent = "Wakes in " + fmt(left);
    document.title = "⏳ " + fmt(left) + " · " + baseTitle;
    // the last minute: a heartbeat that speeds up as the twist approaches
    if (left > 0 && left < 60000) {
      var bpm = Math.round((70 + (60000 - left) / 60000 * 80) / 10) * 10;
      if (bpm !== lastBpm) { lastBpm = bpm; window.Sound.heartbeat(bpm); }
    }
    if (left <= 0) {
      window.Sound.heartbeat(0); lastBpm = 0;
      stopTimer();
      if (window.OtherSideCutscene && typeof window.OtherSideCutscene.playCorruptionCutscene === "function") {
        window.OtherSideCutscene.playCorruptionCutscene();
      } else {
        unlockTwist();
      }
    }
  }
  function startTimer() {
    stopTimer();
    tickTimer();
    if (session && session.stage === "wait") timerId = setInterval(tickTimer, 250);
  }
  function stopTimer() { if (timerId) clearInterval(timerId); timerId = null; }

  /* ---------- 60-Minute Build Countdown Timer ---------- */
  var buildTimerInterval = null;
  var BUILD_DURATION_MS = 60 * 60 * 1000; // 60 minutes

  function updateBuildTimer() {
    if (!el.topbarTimer || !el.topbarTimerDigits) return;
    if (!session || !session.startedAt) {
      el.topbarTimer.hidden = true;
      if (buildTimerInterval) { clearInterval(buildTimerInterval); buildTimerInterval = null; }
      return;
    }
    el.topbarTimer.hidden = false;
    var elapsed = Date.now() - session.startedAt;
    var rem = BUILD_DURATION_MS - elapsed;
    var labelEl = el.topbarTimer.querySelector(".topbar-timer-label");

    if (rem <= 0) {
      el.topbarTimerDigits.textContent = "00:00";
      el.topbarTimer.classList.add("is-expired");
      el.topbarTimer.classList.remove("is-warning", "is-critical");
      if (labelEl) labelEl.textContent = "TIME EXPIRED";
      return;
    }

    el.topbarTimer.classList.remove("is-expired");
    if (labelEl) labelEl.textContent = "BUILD TIMER";
    var totalSec = Math.floor(rem / 1000);
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    var mStr = m < 10 ? "0" + m : "" + m;
    var sStr = s < 10 ? "0" + s : "" + s;
    el.topbarTimerDigits.textContent = mStr + ":" + sStr;

    if (m < 5) {
      el.topbarTimer.classList.add("is-critical");
      el.topbarTimer.classList.remove("is-warning");
    } else if (m < 10) {
      el.topbarTimer.classList.add("is-warning");
      el.topbarTimer.classList.remove("is-critical");
    } else {
      el.topbarTimer.classList.remove("is-warning", "is-critical");
    }
  }

  function startBuildTimer() {
    updateBuildTimer();
    if (!buildTimerInterval && session && session.startedAt) {
      buildTimerInterval = setInterval(updateBuildTimer, 1000);
    }
  }

  function stopBuildTimer() {
    if (buildTimerInterval) {
      clearInterval(buildTimerInterval);
      buildTimerInterval = null;
    }
    if (el.topbarTimer) el.topbarTimer.hidden = true;
  }

  function unlockTwist() {
    session.stage = "twist";
    save();
    saveProgress();
    resetIdle();
    document.title = "🔓 The twist awakens · " + baseTitle;
    window.Sound.bell();
    if (window.FX) window.FX.strike();
    window.Creatures.awaken();
    el.chains.classList.add("breaking");
    el.stage.classList.add("shake");
    announce("The twist wheel has awakened. Spin it now.");
    setView("wheel");
    setTimeout(function () {
      el.stage.classList.remove("shake");
      render(false);
    }, 1200);
  }

  /* ---------- spinning ---------- */

  async function chooseOutcome(stage) {
    if (stage === "soul") return { index: rand(D.characters.length) };
    if (stage === "hex") return { index: rand(D.uiCurses.length) };
    if (stage === "twist") return { index: rand(D.twists.length) };
    return { error: "This wheel can't be spun right now." };
  }

  function recordOutcome(stage, idx) {
    if (stage === "soul") {
      session.charId = D.characters[idx].id;
    } else if (stage === "curse") {
      session.problem = idx;
    } else if (stage === "hex") {
      session.hex = idx;
      session.hexAt = Date.now();
      session.unlockAt = session.hexAt + delayMinutes() * 60000;
      // older sessions still have a claim record; new ones keep everything on the team record
      if (session.entryId) window.Ledger.update(session.entryId, { hex: idx, hexAt: session.hexAt });
    } else if (stage === "twist") {
      var me = session.charId, myHex = session.hex;
      var others = D.characters.filter(function (c) { return c.id !== me; });
      var curses = D.uiCurses.filter(function (h, i) { return i !== myHex; });
      session.twistExtra = { randomChar: pick(others).short, randomCurse: pick(curses).t };
      session.twist = idx;
      if (session.entryId) window.Ledger.update(session.entryId, { twist: idx, twistText: fillTwist(D.twists[idx].d), doneAt: Date.now() });
    }
    // the result is locked in *before* the wheel stops — refreshing can't re-roll it
    session.pending = stage;
    save();
    saveProgress();
  }

  /** Mirror the team's whole fate to the shared ledger (judges' board, recovery). */
  function saveProgress() {
    if (!session || !session.teamKey) return;
    var p = { stage: session.pending ? session.pending + "-spun" : session.stage };
    if (session.startedAt) p.startedAt = session.startedAt;
    if (session.leader) p.leader = session.leader;
    if (session.members && session.members.length) p.members = session.members.slice();
    if (session.charId) p.charId = session.charId;
    if (typeof session.problem === "number") p.problem = session.problem;
    if (typeof session.hex === "number") { p.hex = session.hex; p.hexAt = session.hexAt; p.unlockAt = session.unlockAt; }
    if (typeof session.twist === "number") { p.twist = session.twist; p.twistText = fillTwist(D.twists[session.twist].d); p.twistExtra = session.twistExtra; }
    if (session.eggs && session.eggs.length) p.eggs = session.eggs.slice();
    if (session.submissionUrl) {
      p.submissionUrl = session.submissionUrl;
      p.submittedAt = session.submittedAt;
      if (session.repoUrl) p.repoUrl = session.repoUrl;
      if (session.zipUrl) p.zipUrl = session.zipUrl;
      if (session.zipName) p.zipName = session.zipName;
      if (session.zipSize) p.zipSize = session.zipSize;
      if (session.zipCloudUrl) p.zipCloudUrl = session.zipCloudUrl;
    }
    window.Ledger.saveProgress(session.teamKey, p);
  }

  async function spin(auto) {
    if (busy || !session) return;
    var stage = session.stage;
    if (["soul", "hex", "twist"].indexOf(stage) < 0) return;

    busy = true;
    resetIdle();
    var who = spinnerFor(stage);
    updateSpinner(stage, auto === true ? who.idle : who.spin);
    el.spinner.classList.remove("grab"); void el.spinner.offsetWidth; el.spinner.classList.add("grab");
    setSpinState(stage);
    var out = await chooseOutcome(stage);
    if (out.error) {
      busy = false;
      resetIdle();
      updateSpinner(stage);
      setSpinState(stage);
      el.sub.textContent = out.error;
      el.stage.classList.add("shake");
      setTimeout(function () { el.stage.classList.remove("shake"); }, 500);
      return;
    }

    recordOutcome(stage, out.index);
    if (stage === "soul" && window.Creatures && typeof window.Creatures.preloadScare === "function") {
      window.Creatures.preloadScare(charById(session.charId));
    }

    setSpinState(stage);
    el.stage.classList.add("spinning");
    window.Sound.whoosh();
    wheel.spin(out.index, { onTick: function (v) { window.Sound.tick(v); } }).then(function () {
      el.stage.classList.remove("spinning");
      if (stage === "soul" && window.Creatures.scaresOn) {
        // this character's own jump scare first, then reveal the card once it's over
        window.Creatures.characterScare(charById(session.charId), function () { showCard(stage); });
      } else {
        setTimeout(function () { showCard(stage); }, 450);
      }
    });
  }

  /* ---------- choosing the curse ---------- */

  function renderPicker() {
    var c = charById(session.charId);
    if (!c) return;
    picker.style.setProperty("--accent", c.color);
    picker.innerHTML = "";
    c.problems.forEach(function (p, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ps-option";
      b.disabled = busy;
      b.innerHTML = '<span class="ps-num"></span><span class="ps-title"></span><span class="ps-desc"></span><span class="ps-state"></span>';
      b.querySelector(".ps-num").textContent = "PS " + (i + 1);
      b.querySelector(".ps-title").textContent = p.t;
      b.querySelector(".ps-desc").textContent = p.d;
      b.querySelector(".ps-state").textContent = "Choose this curse →";
      b.addEventListener("click", function () { chooseProblem(i); });
      picker.appendChild(b);
    });
  }

  // The choice is saved on the team's own record (saveProgress), which the
  // judges' board and the host ledger read. Other teams may choose it too.
  function chooseProblem(idx) {
    if (busy || !session || session.stage !== "curse") return;
    resetIdle();
    session.entryId = null;
    recordOutcome("curse", idx);
    window.Sound.whoosh();
    showCard("curse");
  }

  /* ---------- reveal card ---------- */

  // opts.replay: re-show a card the team already accepted (from the grimoire);
  // opts.peek: shown on hover only, so it can't be clicked and vanishes on mouse-out.
  function showCard(stage, opts) {
    opts = opts || {};
    replaying = !!opts.replay;
    el.reveal.classList.toggle("replay", replaying);
    el.reveal.classList.toggle("peek", !!opts.peek);
    var c = charById(session.charId);
    var kicker, glyph, name, lore = "", desc = "", brief = "", quote = "", archetype = "", portrait = "", mustHave = "", btn, accent = "#c4161c";
    if (stage === "soul") {
      kicker = "The Wheel of Evil Has Chosen";
      glyph = c.glyph;
      name = c.name;
      lore = c.lore;
      brief = c.brief || "Every monster has a weakness. Your team must build the digital experience that confronts this dilemma.";
      quote = c.quote || c.spin;
      archetype = c.archetype || "Dark Entity";
      portrait = c.avatar || ("assets/characters/" + c.id + ".svg");
      btn = "Accept your destiny";
      accent = c.color;
    } else if (stage === "curse") {
      var p = c.problems[session.problem];
      kicker = c.short + "'s curse"; glyph = c.glyph; name = p.t; desc = p.d; btn = "Accept the curse"; accent = c.color;
    } else if (stage === "hex") {
      var h = D.uiCurses[session.hex];
      kicker = "A hex upon your UI"; glyph = h.glyph; name = h.t; desc = h.d; mustHave = h.mustHave || ""; btn = "Accept the hex"; accent = "#ff7a1a";
    } else if (stage === "sponsor") {
      kicker = "🌀 Compulsory Sponsor Twist";
      glyph = "🌀";
      name = "The Alliance Protocol · KAPIDHWAJ";
      lore = "Official Partner Integration";
      brief = "A boring footer logo won't save your website. Creatively integrate the official Kapidhwaj Instagram page into your character's world, problem statement, and UI aesthetic.";
      quote = "“Make the sponsor part of the story. Make the integration part of the experience.”";
      desc = "RULES OF THE ALLIANCE:\n1. The official Kapidhwaj Instagram account (@kapidhwaj.innovations) must be clearly featured.\n2. Include a clickable link to https://www.instagram.com/kapidhwaj.innovations/ on Instagram.\n3. The integration must visually match your website's theme.\n4. It must feel intentional and creative — not like an unrelated advertisement.";
      mustHave = "Clickable link to @kapidhwaj.innovations on Instagram + Intentional theme integration";
      portrait = "assets/sponsor/kapidhwaj.png";
      btn = "Accept the alliance";
      accent = "#ff4520";
    } else {
      var t = D.twists[session.twist];
      kicker = "The twist"; glyph = t.glyph; name = t.t; desc = fillTwist(t.d); btn = "Seal my fate"; accent = "#ff3326";
    }
    el.cardKicker.textContent = kicker;
    el.cardGlyph.textContent = glyph;
    el.cardGlyph.classList.toggle("text-glyph", !isEmoji(glyph));
    // the curse card shows the character's face in the circle (the emoji stays if the photo is missing)
    el.cardGlyph.classList.remove("has-photo");
    var seq = ++cardSeq;
    if (stage === "curse") {
      var face = document.createElement("img");
      face.className = "card-glyph-photo";
      face.alt = c.name;
      face.draggable = false;
      face.onload = function () {
        if (seq !== cardSeq) return; // another card has been shown since
        el.cardGlyph.textContent = ""; el.cardGlyph.appendChild(face); el.cardGlyph.classList.add("has-photo");
      };
      face.src = c.face || ("assets/characters/" + c.id + "-face.jpg");
    }
    el.cardName.textContent = name;
    el.cardLore.textContent = lore;
    el.cardDesc.textContent = desc;

    // Visual Portrait & Graceful Fallback
    if (el.cardPortraitFrame && el.cardPortraitImg) {
      if ((stage === "soul" || stage === "sponsor") && portrait) {
        el.cardPortraitImg.src = portrait;
        el.cardPortraitImg.alt = name;
        el.cardPortraitFrame.classList.toggle("is-logo", stage === "sponsor");
        el.cardPortraitImg.classList.toggle("sponsor-logo", stage === "sponsor");
        if (el.cardPortraitBadge) el.cardPortraitBadge.textContent = glyph;
        el.cardPortraitFrame.hidden = false;
        el.cardGlyph.hidden = true;
        el.cardPortraitImg.onerror = function () {
          el.cardPortraitFrame.hidden = true;
          el.cardGlyph.hidden = false;
        };
      } else {
        el.cardPortraitFrame.hidden = true;
        el.cardGlyph.hidden = false;
      }
    }

    // Archetype Tag Badge
    if (el.cardArchetypeWrap && el.cardArchetypeTag) {
      if (stage === "soul" && archetype) {
        el.cardArchetypeWrap.hidden = false;
        el.cardArchetypeTag.textContent = archetype;
      } else {
        el.cardArchetypeWrap.hidden = true;
      }
    }

    // Mission Brief Box
    if (el.cardBriefBox && el.cardBriefText) {
      if (stage === "soul" && brief) {
        el.cardBriefBox.hidden = false;
        el.cardBriefText.textContent = brief;
      } else {
        el.cardBriefBox.hidden = true;
      }
    }

    // Voice Line / Quote Block
    if (el.cardQuote && el.cardQuoteText) {
      if (stage === "soul" && quote) {
        el.cardQuote.hidden = false;
        el.cardQuoteText.textContent = "“" + quote + "”";
      } else {
        el.cardQuote.hidden = true;
      }
    }

    if (el.cardMustHave && el.cardMustHaveText) {
      if (mustHave) {
        el.cardMustHave.hidden = false;
        el.cardMustHaveText.textContent = mustHave;
      } else {
        el.cardMustHave.hidden = true;
      }
    }
    el.cardScope.textContent = stage === "curse" ? D.scopeNote : "";
    el.cardBtn.textContent = replaying ? "Close" : btn;
    el.card.querySelector(".card-front").style.setProperty("--accent", accent);
    el.cardGlyph.style.setProperty("--accent", accent);

    el.reveal.hidden = false;
    el.card.style.animation = "none"; void el.card.offsetWidth; el.card.style.animation = "";
    if (opts.peek) return;
    if (!replaying) window.Sound.reveal();
    announce(kicker + ": " + name + ". " + (brief || desc || lore) + (mustHave ? " Must have: " + mustHave : ""));
    setTimeout(function () { el.cardBtn.focus({ preventScroll: true }); }, replaying ? 50 : 900);
  }

  function closeReplay() {
    el.reveal.hidden = true;
    el.reveal.classList.remove("replay", "peek");
    replaying = false;
  }

  /* ---------- the grimoire: hover (or tap) a filled seal to see its card again ---------- */

  var SLOT_STAGE = { 1: "soul", 2: "curse", 3: "hex", 4: "twist", 5: "sponsor" };
  var peekTimer = null;
  var canHover = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function canReplay(li) {
    return !!session && li.classList.contains("is-filled") && el.reveal.hidden && !busy;
  }
  function replayCard(li, peek) {
    showCard(SLOT_STAGE[li.getAttribute("data-slot")], { replay: true, peek: peek });
  }
  Array.prototype.forEach.call(el.fateList.querySelectorAll(".fate"), function (li) {
    if (canHover) {
      li.addEventListener("mouseenter", function () {
        clearTimeout(peekTimer);
        peekTimer = setTimeout(function () { if (canReplay(li)) replayCard(li, true); }, 250);
      });
      li.addEventListener("mouseleave", function () {
        clearTimeout(peekTimer);
        if (replaying && el.reveal.classList.contains("peek")) closeReplay();
      });
    }
    li.addEventListener("click", function (e) {
      if (e.target.closest("button, a")) return;
      clearTimeout(peekTimer);
      // clicking while peeking keeps the card open so it can be read and closed
      if (replaying && el.reveal.classList.contains("peek")) {
        el.reveal.classList.remove("peek");
        el.cardBtn.focus({ preventScroll: true });
      } else if (canReplay(li)) {
        replayCard(li, false);
      }
    });
    li.addEventListener("keydown", function (e) {
      if ((e.key === "Enter" || e.key === " ") && canReplay(li)) { e.preventDefault(); replayCard(li, false); }
    });
  });
  el.reveal.querySelector(".reveal-backdrop").addEventListener("click", function () { if (replaying) closeReplay(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && replaying) closeReplay(); });

  function acceptCard() {
    if (replaying) { closeReplay(); return; }
    el.reveal.hidden = true;
    var stage = session.pending;
    session.pending = null;
    if (stage === "soul") session.stage = "curse";
    else if (stage === "curse") session.stage = "hex";
    else if (stage === "hex") session.stage = Date.now() >= session.unlockAt ? "twist" : "wait";
    else if (stage === "twist") {
      session.stage = "done";
      activeView = "mission";
      save();
      saveProgress();
      busy = false;
      resetIdle();
      render(false);
      renderGrimoire(true);
      // Twist assignments complete! Trigger the compulsory Sponsor Twist: ALLIANCE PROTOCOL
      if (window.OtherSideCutscene && typeof window.OtherSideCutscene.playAllianceCutscene === "function") {
        setTimeout(function () {
          window.OtherSideCutscene.playAllianceCutscene();
        }, 320);
      } else {
        setView("mission");
        setTimeout(function () {
          var apCard = document.getElementById("allianceProtocolCard");
          if (apCard) apCard.scrollIntoView({ behavior: "smooth", block: "start" });
          else if (el.viewTabs) el.viewTabs.scrollIntoView({ behavior: "smooth", block: "start" });
          else el.submissionCard.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
      }
      return;
    }
    save();
    saveProgress();
    busy = false;
    resetIdle();
    render(stage !== "twist");
    renderGrimoire(true);
    if (stage === "hex") {
      // Hex assignments complete! Trigger the "LET THE HAUNT BEGIN" Cutscene
      if (window.OtherSideCutscene && typeof window.OtherSideCutscene.playHexCutscene === "function") {
        setTimeout(function () {
          window.OtherSideCutscene.playHexCutscene();
        }, 320);
      }
    } else if (stage === "twist") {
      setView("mission");
      setTimeout(function () {
        if (el.viewTabs) el.viewTabs.scrollIntoView({ behavior: "smooth", block: "start" });
        else el.submissionCard.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    } else if (window.innerWidth < 980) {
      document.querySelector(".grimoire").scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      el.stage.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  /* ---------- ledger (team sign-in) ---------- */

  function alreadyRegistered() {
    var d = window.Store.deviceTeam();
    return d ? "This phone has already signed the ledger as “" + d.team + "”. Each team gets one registration." : "";
  }

  /* ---------- ledger (team sign-in & roster) ---------- */

  var MAX_TOTAL_MEMBERS = 2; // 1 leader + up to 1 additional member

  function updateAddMemberState() {
    if (!el.membersContainer || !el.addMemberBtn) return;
    var currentCount = el.membersContainer.querySelectorAll(".member-card").length;
    var atLimit = (1 + currentCount) >= MAX_TOTAL_MEMBERS;
    el.addMemberBtn.hidden = atLimit;
    if (el.membersLimitNote) el.membersLimitNote.hidden = !atLimit;
  }

  function addMemberRow() {
    if (!el.membersContainer) return;
    var currentCount = el.membersContainer.querySelectorAll(".member-card").length;
    if (1 + currentCount >= MAX_TOTAL_MEMBERS) return;

    var num = currentCount + 2;
    var card = document.createElement("div");
    card.className = "member-card";
    card.setAttribute("data-member-num", num);
    card.innerHTML =
      '<div class="member-card-head">' +
        '<span class="member-card-title">Member ' + num + '</span>' +
        '<button type="button" class="member-remove-btn" title="Remove member" aria-label="Remove member ' + num + '">✕ Remove</button>' +
      '</div>' +
      '<div class="member-card-body">' +
        '<label class="field">' +
          '<span class="field-label">Member Name</span>' +
          '<input class="member-name-input" type="text" maxlength="50" placeholder="Full name" spellcheck="false" autocapitalize="words" required>' +
        '</label>' +
        '<div class="field-row">' +
          '<label class="field">' +
            '<span class="field-label">Year of College</span>' +
            '<input class="member-year-input" type="text" maxlength="20" placeholder="e.g. 1st, 2nd, 3rd, 4th" spellcheck="false" required>' +
          '</label>' +
          '<label class="field">' +
            '<span class="field-label">Branch</span>' +
            '<input class="member-branch-input" type="text" maxlength="40" placeholder="e.g. CSE, IT, ECE" spellcheck="false" autocapitalize="characters" required>' +
          '</label>' +
        '</div>' +
        '<div class="field-row">' +
          '<label class="field">' +
            '<span class="field-label">Phone Number</span>' +
            '<input class="member-phone-input" type="tel" inputmode="tel" maxlength="16" placeholder="10-digit mobile number" required>' +
          '</label>' +
          '<label class="field">' +
            '<span class="field-label">Email</span>' +
            '<input class="member-email-input" type="email" inputmode="email" maxlength="80" placeholder="name@example.com" spellcheck="false" autocapitalize="off" required>' +
          '</label>' +
        '</div>' +
      '</div>';

    var removeBtn = card.querySelector(".member-remove-btn");
    removeBtn.addEventListener("click", function () {
      card.remove();
      renumberMembers();
      updateAddMemberState();
      if (window.Sound && window.Sound.tick) window.Sound.tick(0.4);
    });

    el.membersContainer.appendChild(card);
    updateAddMemberState();

    var nameInp = card.querySelector(".member-name-input");
    if (nameInp) nameInp.focus();
    if (window.Sound && window.Sound.tick) window.Sound.tick(0.6);
  }

  function renumberMembers() {
    if (!el.membersContainer) return;
    var cards = el.membersContainer.querySelectorAll(".member-card");
    for (var i = 0; i < cards.length; i++) {
      var n = i + 2;
      cards[i].setAttribute("data-member-num", n);
      var title = cards[i].querySelector(".member-card-title");
      if (title) title.textContent = "Member " + n;
      var removeBtn = cards[i].querySelector(".member-remove-btn");
      if (removeBtn) removeBtn.setAttribute("aria-label", "Remove member " + n);
    }
  }

  if (el.addMemberBtn) {
    el.addMemberBtn.addEventListener("click", function () {
      addMemberRow();
    });
  }

  // Phone numbers are stored as plain 10-digit Indian mobile numbers, so they
  // match up however they were typed (+91, spaces, dashes, a leading 0).
  function cleanPhone(raw) {
    var d = String(raw || "").replace(/\D/g, "");
    if (d.length === 12 && d.indexOf("91") === 0) d = d.slice(2);
    else if (d.length === 11 && d.charAt(0) === "0") d = d.slice(1);
    return /^[6-9]\d{9}$/.test(d) ? d : "";
  }
  function cleanEmail(raw) {
    var e = String(raw || "").trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : "";
  }

  function applyRestoredTeamRecord(t, showPrologue) {
    if (!t || (!t.name && !t.teamName)) return false;
    var teamTitle = t.name || t.teamName;
    var key = t.key || t.teamKey || window.Ledger.teamKey(teamTitle);
    var r2Data = Object.assign({}, t.r2 || {}, t);
    var restored = {
      team: teamTitle,
      teamKey: key,
      leader: r2Data.leader || t.leader || null,
      members: r2Data.members || t.members || [],
      startedAt: r2Data.startedAt || t.at || Date.now(),
      stage: r2Data.stage || "soul",
      eggs: (r2Data.eggs || []).slice()
    };
    ["charId", "problem", "hex", "hexAt", "unlockAt", "twist", "twistExtra", "submissionUrl", "repoUrl", "zipUrl", "zipName", "zipSize", "zipCloudUrl", "submittedAt", "leader", "members", "startedAt"].forEach(function (k) {
      if (r2Data[k] != null) restored[k] = r2Data[k];
    });
    var m = /^(soul|curse|hex|twist)-spun$/.exec(restored.stage);
    if (m) { restored.stage = m[1]; restored.pending = m[1]; }
    if (restored.stage === "twist" && restored.unlockAt && Date.now() < restored.unlockAt && typeof restored.twist !== "number") {
      restored.stage = "wait";
    }
    window.Store.lockDevice(teamTitle, key, { leader: restored.leader, members: restored.members });
    session = restored;
    save();
    saveProgress();
    resetIdle();
    if (el.gate) {
      el.gate.classList.add("gone");
      document.documentElement.classList.remove("behind-gate");
      document.documentElement.classList.add("gate-closed");
    }
    render(true);
    resumePending();
    if (showPrologue && restored.stage === "soul" && !restored.charId && el.prologueModal) {
      el.prologueModal.hidden = false;
      if (window.Sound && window.Sound.farBell) window.Sound.farBell();
    }
    announce("Welcome, " + teamTitle + ". Your ritual session is active.");
    return true;
  }

  async function tryResumeByTeamName(rawName) {
    var cleaned = String(rawName || "").replace(/\s+/g, " ").trim();
    if (!cleaned || cleaned.length < 2) return { ok: false, error: "Please enter a valid Team Name (at least 2 characters)." };

    // Secret host / judge passphrases work in Quick Resume too
    if (D.hostKey && window.Store.secret(cleaned) === D.hostKey) {
      openHost();
      return { ok: true, special: true };
    }
    if (window.Store.secret(cleaned) === D.judgeKey) {
      window.Store.setJudgePass(D.judgeKey);
      if (window.Sound && window.Sound.farBell) window.Sound.farBell();
      document.body.classList.add("judge-door");
      setTimeout(function () { location.href = "judges.html"; }, 600);
      return { ok: true, special: true };
    }

    if (!isRound2Unlocked) {
      return { ok: false, error: "Round 2 has not been opened yet by the event host. Wait for access to be granted!" };
    }

    try {
      var bRes = await fetch("/api/round2/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register_or_resume",
          teamName: cleaned
        })
      });
      if (!bRes.ok) {
        var errJson = await bRes.json().catch(function () { return {}; });
        if (errJson && errJson.round2Unlocked === false) {
          isRound2Unlocked = false;
          updateGateUI();
          return { ok: false, error: errJson.error || "Round 2 is currently locked by the event organizers." };
        }
      }
      if (bRes.ok) {
        var bData = await bRes.json();
        if (bData && bData.teamName) {
          // Merge with any live ledger entry if present
          var key = window.Ledger.teamKey(bData.teamName);
          var existingLedger = window.Ledger.teams().filter(function (x) { return x.key === key || (x.name && x.name.toLowerCase() === bData.teamName.toLowerCase()); })[0];
          var merged = Object.assign({}, existingLedger || {}, bData.r2 || {}, {
            name: bData.teamName,
            key: key,
            leader: bData.leader || (existingLedger && existingLedger.leader) || null,
            members: bData.members || (existingLedger && existingLedger.members) || []
          });
          applyRestoredTeamRecord(merged, false);
          return { ok: true };
        }
      }
    } catch (e) {
      // Fallback to client-side ledger lookup
    }

    await window.Ledger.ready();
    var targetKey = window.Ledger.teamKey(cleaned);
    var found = window.Ledger.teams().filter(function (x) {
      return x.key === targetKey || (x.name && x.name.toLowerCase() === cleaned.toLowerCase());
    })[0];
    if (found) {
      applyRestoredTeamRecord(found, false);
      return { ok: true };
    }
    return { ok: false, error: "Could not find Team \"" + cleaned + "\" in the ledger. Sign the ledger below or check spelling." };
  }

  var quickResumeInput = $("quickResumeTeamInput") || el.teamInput;
  var quickResumeBtn = $("quickResumeBtn") || el.quickResumeBtn;
  var quickResumeLabel = $("quickResumeLabel");

  var signing = false;

  async function handleTeamEntry(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (signing || session) return;

    var name = (quickResumeInput ? quickResumeInput.value : "").replace(/\s+/g, " ").trim();

    // Host secret passphrase
    if (D.hostKey && window.Store.secret(name) === D.hostKey) {
      if (quickResumeInput) quickResumeInput.value = "";
      if (el.teamError) el.teamError.textContent = "";
      if (quickResumeInput) quickResumeInput.blur();
      openHost();
      return;
    }

    // Judges secret passphrase
    if (window.Store.secret(name) === D.judgeKey) {
      window.Store.setJudgePass(D.judgeKey);
      if (quickResumeInput) quickResumeInput.value = "";
      if (el.teamError) el.teamError.textContent = "";
      if (window.Sound && window.Sound.farBell) window.Sound.farBell();
      document.body.classList.add("judge-door");
      setTimeout(function () { location.href = "/admin.html"; }, 800);
      return;
    }

    if (!isRound2Unlocked) {
      if (el.teamError) {
        el.teamError.textContent = "Round 2 has not been opened yet by the event host. Please wait for the host to continue.";
        el.teamError.style.color = "#ff7864";
      }
      updateGateUI();
      return;
    }

    if (name.length < 2) {
      if (el.teamError) {
        el.teamError.textContent = "The altar requires a registered Team Name — at least two letters.";
        el.teamError.style.color = "#ff7864";
      }
      if (quickResumeInput) quickResumeInput.focus();
      return;
    }

    signing = true;
    if (quickResumeBtn) quickResumeBtn.disabled = true;
    if (quickResumeLabel) quickResumeLabel.textContent = "Entering Altar…";
    if (el.teamError) el.teamError.textContent = "";

    var out = await tryResumeByTeamName(name);

    signing = false;
    if (quickResumeBtn) quickResumeBtn.disabled = false;
    if (quickResumeLabel) quickResumeLabel.textContent = "Enter the Wheel of Curses →";

    if (!out || !out.ok) {
      if (el.teamError) {
        el.teamError.textContent = (out && out.error) || "Could not find Team \"" + name + "\". Please check spelling or verify your team in Round 1.";
        el.teamError.style.color = "#ff7864";
      }
      if (quickResumeInput) quickResumeInput.focus();
    }
  }

  if (el.form) {
    el.form.addEventListener("submit", handleTeamEntry);
  }
  if (quickResumeBtn && quickResumeBtn !== el.form) {
    quickResumeBtn.addEventListener("click", handleTeamEntry);
  }
  if (quickResumeInput) {
    quickResumeInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleTeamEntry();
      }
    });
    quickResumeInput.addEventListener("input", function () {
      if (el.teamError) el.teamError.textContent = "";
    });
  }

  /* ---------- controls ---------- */

  if (el.tabWheel) {
    el.tabWheel.addEventListener("click", function () {
      setView("wheel", true);
    });
  }
  if (el.tabGrimoire) {
    el.tabGrimoire.addEventListener("click", function () {
      setView("grimoire", true);
    });
  }
  if (el.tabSubmit) {
    el.tabSubmit.addEventListener("click", function () {
      setView("submit", true);
    });
  }
  if (el.tabFaqs) {
    el.tabFaqs.addEventListener("click", function () {
      setView("faqs", true);
    });
  }

  el.spinBtn.addEventListener("click", function () {
    if (session && session.stage === "done") {
      setView("submit", true);
      if (el.subUrl && !session.submissionUrl) {
        setTimeout(function () { el.subUrl.focus(); }, 350);
      }
      return;
    }
    spin(false);
  });
  el.hub.addEventListener("click", function () { spin(false); });
  el.cardBtn.addEventListener("click", acceptCard);

  /* ---------- project submission & zip handling ---------- */

  var attachedZipFile = null;

  function fmtBytes(b) {
    if (!b || b <= 0) return "0 B";
    var k = 1024, s = ["B", "KB", "MB", "GB"], i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(1)) + " " + s[i];
  }

  function handleZipSelection(file) {
    if (!file) return;
    if (!/\.zip$/i.test(file.name) && file.type && !/zip/i.test(file.type)) {
      el.subError.hidden = false;
      el.subError.textContent = "Please select a valid .zip archive file.";
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      el.subError.hidden = false;
      el.subError.textContent = "File is too large (" + fmtBytes(file.size) + "). Maximum allowed is 50MB. Please use the Drive/Cloud ZIP link instead.";
      return;
    }
    el.subError.hidden = true;
    attachedZipFile = file;
    el.subFileName.textContent = file.name;
    el.subFileSize.textContent = fmtBytes(file.size);
    el.subDropzoneContent.hidden = true;
    el.subFileChosen.hidden = false;
  }

  if (el.subDropzone) {
    el.subDropzone.addEventListener("click", function (e) {
      if (e.target && e.target.closest("#subFileRemove")) return;
      el.subZipFile.click();
    });
    el.subDropzone.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        el.subZipFile.click();
      }
    });
    el.subDropzone.addEventListener("dragover", function (e) {
      e.preventDefault();
      el.subDropzone.classList.add("dragover");
    });
    el.subDropzone.addEventListener("dragleave", function (e) {
      e.preventDefault();
      el.subDropzone.classList.remove("dragover");
    });
    el.subDropzone.addEventListener("drop", function (e) {
      e.preventDefault();
      el.subDropzone.classList.remove("dragover");
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleZipSelection(e.dataTransfer.files[0]);
      }
    });
  }

  if (el.subZipFile) {
    el.subZipFile.addEventListener("change", function () {
      if (this.files && this.files[0]) {
        handleZipSelection(this.files[0]);
      }
    });
  }

  if (el.subFileRemove) {
    el.subFileRemove.addEventListener("click", function (e) {
      e.stopPropagation();
      attachedZipFile = null;
      if (el.subZipFile) el.subZipFile.value = "";
      if (session) {
        delete session.zipUrl;
        delete session.zipName;
        delete session.zipSize;
        delete session.zipData;
        if (session.teamKey) window.Store.removeZipFile(session.teamKey);
        save();
        saveProgress();
      }
      el.subDropzoneContent.hidden = false;
      el.subFileChosen.hidden = true;
    });
  }

  el.subForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!session) return;
    var url = (el.subUrl.value || "").trim();
    var repo = (el.subRepo.value || "").trim();
    var zipLink = el.subZipLink ? (el.subZipLink.value || "").trim() : "";

    if (!url) {
      el.subError.hidden = false;
      el.subError.textContent = "Please provide your live hosted website URL.";
      el.subUrl.focus();
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
      el.subUrl.value = url;
    }

    try {
      new URL(url);
    } catch (err) {
      el.subError.hidden = false;
      el.subError.textContent = "Please enter a valid URL (e.g. https://your-team.vercel.app).";
      el.subUrl.focus();
      return;
    }

    if (repo && !/^https?:\/\//i.test(repo)) {
      repo = "https://" + repo;
      el.subRepo.value = repo;
    }
    if (repo) {
      try {
        new URL(repo);
      } catch (err) {
        el.subError.hidden = false;
        el.subError.textContent = "Please enter a valid GitHub repository URL or leave it blank.";
        el.subRepo.focus();
        return;
      }
    }

    if (zipLink && !/^https?:\/\//i.test(zipLink)) {
      zipLink = "https://" + zipLink;
      if (el.subZipLink) el.subZipLink.value = zipLink;
    }
    if (zipLink) {
      try {
        new URL(zipLink);
      } catch (err) {
        el.subError.hidden = false;
        el.subError.textContent = "Please enter a valid Drive/Cloud link or leave it blank.";
        if (el.subZipLink) el.subZipLink.focus();
        return;
      }
    }

    el.subError.hidden = true;
    el.subSubmitBtn.disabled = true;
    var origText = el.subSubmitLabel.textContent;
    el.subSubmitLabel.textContent = attachedZipFile ? "Processing ZIP…" : "Saving…";

    var now = Date.now();
    session.submissionUrl = url;
    session.repoUrl = repo;
    session.zipCloudUrl = zipLink || null;
    session.submittedAt = now;

    if (attachedZipFile) {
      session.zipName = attachedZipFile.name;
      session.zipSize = attachedZipFile.size;
      try {
        await window.Store.saveZipFile(session.teamKey, attachedZipFile);
      } catch (idbErr) {
        console.warn("IndexedDB save error", idbErr);
      }

      if (attachedZipFile.size <= 700000) {
        try {
          session.zipData = await new Promise(function (res, rej) {
            var reader = new FileReader();
            reader.onload = function () { res(reader.result); };
            reader.onerror = rej;
            reader.readAsDataURL(attachedZipFile);
          });
        } catch (b64Err) {
          console.warn("Base64 encode error", b64Err);
        }
      }

      try {
        var upRes = await window.Ledger.uploadZip(session.teamKey, attachedZipFile, function (pct) {
          el.subSubmitLabel.textContent = "Uploading ZIP (" + pct + "%)…";
        });
        if (upRes && upRes.url) {
          session.zipUrl = upRes.url;
        }
      } catch (upErr) {
        console.warn("Cloud Storage upload failed/skipped", upErr);
      }
    }

    save();

    var patch = {
      stage: "done",
      submissionUrl: url,
      repoUrl: repo,
      submittedAt: now
    };
    if (session.charId) patch.charId = session.charId;
    if (typeof session.problem === "number") patch.problem = session.problem;
    if (typeof session.hex === "number") { patch.hex = session.hex; patch.hexAt = session.hexAt; }
    if (typeof session.twist === "number") {
      patch.twist = session.twist;
      patch.twistText = session.twistText || (D.twists[session.twist] ? fillTwist(D.twists[session.twist].d) : "");
      patch.twistExtra = session.twistExtra;
    }
    if (session.eggs && session.eggs.length) patch.eggs = session.eggs.slice();
    if (session.leader) patch.leader = session.leader;
    if (session.members) patch.members = session.members;
    if (session.zipUrl) patch.zipUrl = session.zipUrl;
    if (session.zipName) patch.zipName = session.zipName;
    if (session.zipSize) patch.zipSize = session.zipSize;
    if (session.zipCloudUrl) patch.zipCloudUrl = session.zipCloudUrl;

    try {
      await window.Ledger.saveProgress(session.teamKey, patch);
      if (session.entryId) {
        await window.Ledger.update(session.entryId, patch);
      }
      renderSubmissionState();
      setSpinState(session.stage);
      if (window.Sound && window.Sound.claim) window.Sound.claim();
      announce("Your project has been submitted!");
    } catch (err) {
      console.warn("Cloud sync failed, stored locally", err);
      renderSubmissionState();
    } finally {
      el.subSubmitBtn.disabled = false;
      el.subSubmitLabel.textContent = origText;
    }
  });

  el.subEditBtn.addEventListener("click", function () {
    el.subResult.hidden = true;
    el.subForm.hidden = false;
    el.subUrl.value = session.submissionUrl || "";
    el.subRepo.value = session.repoUrl || "";
    if (el.subZipLink) el.subZipLink.value = session.zipCloudUrl || "";
    if (session.zipName) {
      el.subFileName.textContent = session.zipName;
      el.subFileSize.textContent = session.zipSize ? fmtBytes(session.zipSize) : "Attached";
      el.subDropzoneContent.hidden = true;
      el.subFileChosen.hidden = false;
    } else {
      attachedZipFile = null;
      if (el.subZipFile) el.subZipFile.value = "";
      el.subDropzoneContent.hidden = false;
      el.subFileChosen.hidden = true;
    }
    el.subSubmitLabel.textContent = "Update Submission";
    el.subUrl.focus();
  });

  var replayAllianceBtn = document.getElementById("replayAllianceCutsceneBtn");
  if (replayAllianceBtn) {
    replayAllianceBtn.addEventListener("click", function () {
      if (window.OtherSideCutscene && typeof window.OtherSideCutscene.playAllianceCutscene === "function") {
        window.OtherSideCutscene.playAllianceCutscene();
      }
    });
  }

  /* ---------- hidden bonus points ---------- */

  var EGG_IDS = D.eggsEnabled ? Object.keys(D.eggs || {}) : [];
  document.body.classList.toggle("eggs-on", !!D.eggsEnabled);

  function renderEggs() {
    var box = $("eggCount");
    if (!box) return;
    var n = session && session.eggs ? session.eggs.length : 0;
    box.hidden = !session || !EGG_IDS.length;
    box.textContent = "🎃 Hidden pumpkins: " + n + " / " + EGG_IDS.length;
  }

  /** Called by js/eggs.js when a hidden pumpkin or secret is found. */
  function claimEgg(id) {
    if (!D.eggsEnabled || !D.eggs || !D.eggs[id]) return "unknown";
    if (!session) { window.Eggs && window.Eggs.toast("🎃 Sign the ledger first… then come back for me."); return "no-team"; }
    session.eggs = session.eggs || [];
    if (session.eggs.indexOf(id) >= 0) { window.Eggs && window.Eggs.toast("🎃 Already in your grimoire."); return "dupe"; }
    session.eggs.push(id);
    save();
    saveProgress();
    renderEggs();
    window.Eggs && window.Eggs.toast("🎃 Bonus point! " + D.eggs[id] + " (" + session.eggs.length + "/" + EGG_IDS.length + ")");
    if (window.Sound.bell) window.Sound.bell();
    return "ok";
  }

  var shutdownTimerId = null;
  var shutdownSecondsLeft = 300; // 5 minutes

  function startShutdownCountdown(durationSeconds) {
    if (durationSeconds != null) shutdownSecondsLeft = durationSeconds;
    else if (shutdownSecondsLeft <= 0 || shutdownSecondsLeft > 300) shutdownSecondsLeft = 300;

    if (el.systemShutdownBanner) {
      el.systemShutdownBanner.hidden = false;
    }
    setView("mission", true);
    if (el.submissionCard) {
      el.submissionCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (window.Sound && window.Sound.startClockTick) {
      window.Sound.startClockTick();
    }

    if (shutdownTimerId) clearInterval(shutdownTimerId);

    function tickShutdown() {
      if (el.shutdownCountdown) {
        var m = Math.floor(shutdownSecondsLeft / 60);
        var s = shutdownSecondsLeft % 60;
        el.shutdownCountdown.textContent = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
      }

      if (shutdownSecondsLeft <= 0) {
        clearInterval(shutdownTimerId);
        shutdownTimerId = null;
        if (window.OtherSideCutscene && typeof window.OtherSideCutscene.playZeroHourCutscene === "function") {
          window.OtherSideCutscene.playZeroHourCutscene();
        } else {
          lockSubmissions();
        }
        return;
      }
      shutdownSecondsLeft--;
    }

    tickShutdown();
    shutdownTimerId = setInterval(tickShutdown, 1000);
  }

  function stopShutdownCountdown() {
    if (shutdownTimerId) {
      clearInterval(shutdownTimerId);
      shutdownTimerId = null;
    }
  }

  function lockSubmissions() {
    stopShutdownCountdown();
    if (window.Sound && window.Sound.stopClockTick) {
      window.Sound.stopClockTick();
    }
    if (window.Sound && window.Sound.cutsceneAlarm) {
      window.Sound.cutsceneAlarm();
    }

    if (el.systemShutdownBanner) {
      el.systemShutdownBanner.hidden = false;
    }
    if (el.shutdownBannerText) {
      el.shutdownBannerText.innerHTML = "🔒 <strong>BUILD WINDOW CLOSED · SUBMISSIONS LOCKED</strong> 🔒";
    }

    // Lock all submission controls
    if (el.subUrl) el.subUrl.disabled = true;
    if (el.subRepo) el.subRepo.disabled = true;
    if (el.subZipFile) el.subZipFile.disabled = true;
    if (el.subZipLink) el.subZipLink.disabled = true;
    if (el.subSubmitBtn) {
      el.subSubmitBtn.disabled = true;
      if (el.subSubmitLabel) el.subSubmitLabel.textContent = "Submissions Locked";
    }

    // Add prominent locked banner if not already present
    var existingBadge = document.getElementById("subClosedLockedNotice");
    if (!existingBadge && el.subForm) {
      var badge = document.createElement("div");
      badge.id = "subClosedLockedNotice";
      badge.className = "sub-locked-badge bad";
      badge.innerHTML = "<strong>BUILD WINDOW CLOSED!</strong><br>Submissions are permanently locked. The judges are reviewing entries.";
      el.subForm.parentNode.insertBefore(badge, el.subForm);
    }

    announce("Build window closed! Submissions locked!");
  }

  window.App = {
    claimEgg: claimEgg,
    hasEgg: function (id) { return !!(session && session.eggs && session.eggs.indexOf(id) >= 0); },
    onCorruptionCutsceneComplete: function () {
      unlockTwist();
      setView("wheel", true);
    },
    onFiveMinCutsceneComplete: function () {
      startShutdownCountdown(300);
    },
    onAllianceCutsceneComplete: function () {
      setView("mission", true);
      setTimeout(function () {
        var apCard = document.getElementById("allianceProtocolCard");
        if (apCard) apCard.scrollIntoView({ behavior: "smooth", block: "start" });
        else if (el.submissionCard) el.submissionCard.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    },
    onZeroHourComplete: function () {
      lockSubmissions();
    },
    startShutdownCountdown: startShutdownCountdown,
    stopShutdownCountdown: stopShutdownCountdown,
    lockSubmissions: lockSubmissions,
    unlockTwist: unlockTwist
  };

  function openModal(m) { m.hidden = false; var f = m.querySelector("button, input"); if (f) setTimeout(function () { f.focus(); }, 30); }
  function closeModal(m) { m.hidden = true; }
  Array.prototype.forEach.call(document.querySelectorAll(".modal"), function (m) {
    m.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) closeModal(m); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") Array.prototype.forEach.call(document.querySelectorAll(".modal"), closeModal);
  });

  // The beginner's hosting guide. Anything with data-guide="<tab>" opens it on that tab
  // (top-bar "?", the Submit page's help links and hosting pills, the guide's own tabs);
  // data-guide-section="<id>" also scrolls to that part of the tab.
  var guide = $("githubModal");
  function showGuideTab(name, sectionId) {
    Array.prototype.forEach.call(guide.querySelectorAll(".gh-tab"), function (t) {
      var on = t.getAttribute("data-guide") === name;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    Array.prototype.forEach.call(guide.querySelectorAll(".gh-panel"), function (p) {
      p.hidden = p.getAttribute("data-panel") !== name;
    });
    guide.querySelector(".gh-body").scrollTop = 0;
    var sec = sectionId && $(sectionId);
    if (sec) setTimeout(function () { sec.scrollIntoView({ block: "start" }); }, 30);
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-guide]");
    if (!b) return;
    e.preventDefault(); // a help link inside a form label shouldn't focus the input
    if (guide.hidden) openModal(guide);
    showGuideTab(b.getAttribute("data-guide"), b.getAttribute("data-guide-section"));
  });

  /* ---------- organisers: back to the sign-in page ---------- */
  // TEMPORARY testing aid. Type  mtchome  anywhere (not in a text box) to forget
  // this phone's team and return to the team-name form. Only this browser
  // forgets: every team stays registered in the ledger, so typing a team name
  // again shows straight away whether it was saved.
  var HOME_WORD = "mtchome", homeTyped = "";
  document.addEventListener("keydown", function (e) {
    var tg = e.target;
    if (tg && (tg.tagName === "INPUT" || tg.tagName === "TEXTAREA" || tg.isContentEditable)) return;
    if (!e.key || e.key.length !== 1) return;
    homeTyped = (homeTyped + e.key.toLowerCase()).slice(-HOME_WORD.length);
    if (homeTyped !== HOME_WORD) return;
    window.Store.clearSession();
    window.Store.unlockDevice();
    try { sessionStorage.setItem("woc.home", "1"); } catch (err) {}
    location.reload();
  });
  var wentHome = false;
  try { wentHome = sessionStorage.getItem("woc.home") === "1"; } catch (err) {}

  /* ---------- sound toggle ---------- */

  function setSound(on) {
    var ok = window.Sound.setEnabled(on);
    el.soundBtn.setAttribute("aria-pressed", ok ? "true" : "false");
    el.soundBtn.setAttribute("aria-label", ok ? "Turn sound off" : "Turn sound on");
    window.Store.setPref("sound", ok);
  }
  el.soundBtn.addEventListener("click", function () { setSound(!window.Sound.enabled); });

  /* ---------- jump-scare toggle ---------- */

  function setScares(on) {
    window.Creatures.setScares(on);
    el.scareBtn.setAttribute("aria-pressed", on ? "true" : "false");
    el.scareBtn.setAttribute("aria-label", on ? "Jump scares on — turn off" : "Jump scares off — turn on");
    window.Store.setPref("scares", on);
  }
  el.scareBtn.addEventListener("click", function () { setScares(!window.Creatures.scaresOn); });

  /* ---------- the entry gate & horror cutscene ---------- */
  // Browsers only allow sound after a user tap; entering The Other Side is that tap.

  var welcome = "none", entered = false;   // welcome: none | playing | done
  function startWelcome() {
    welcome = "playing";
    window.Creatures.welcome(function () {
      welcome = "done";
      if (entered && window.Creatures.opening) window.Creatures.opening();
    });
  }
  function enter(withSound) {
    entered = true;
    setSound(withSound);
    resetIdle();
    if (welcome === "none" && window.Creatures.scaresOn && withSound) {
      welcome = "playing";
      window.Creatures.welcome(function () {
        welcome = "done";
        if (window.OtherSideCutscene && typeof window.OtherSideCutscene.play === "function") {
          window.OtherSideCutscene.play();
        } else {
          if (el.gate) el.gate.classList.add("gone");
          document.documentElement.classList.remove("behind-gate");
          document.documentElement.classList.add("gate-closed");
          if (window.Creatures.opening) window.Creatures.opening();
        }
      });
      return;
    }
    if (el.gate) {
      el.gate.classList.add("gone");
      document.documentElement.classList.remove("behind-gate");
      document.documentElement.classList.add("gate-closed");
    }
    if (window.OtherSideCutscene && typeof window.OtherSideCutscene.play === "function") {
      window.OtherSideCutscene.play();
    } else {
      if (welcome !== "playing" && window.Creatures && window.Creatures.opening) {
        setTimeout(function () { window.Creatures.opening(); }, 250);
      }
    }
  }
  $("gateEnter").addEventListener("click", function () { enter(true); });
  $("gateQuiet").addEventListener("click", function () { enter(false); });

  var touchFrom = null;
  document.addEventListener("touchstart", function (e) {
    var p = e.touches[0]; touchFrom = p ? [p.clientX, p.clientY] : null;
  }, { capture: true, passive: true });
  function firstTouch(e) {
    if (welcome !== "none" || entered || !window.Creatures.scaresOn) return;
    // a swipe isn't a tap, and phones won't start sound on one: wait for a real tap
    if (e.type === "touchend" && touchFrom && e.changedTouches[0] &&
        Math.abs(e.changedTouches[0].clientX - touchFrom[0]) + Math.abs(e.changedTouches[0].clientY - touchFrom[1]) > 12) return;
    // the gate's own buttons do it themselves, with or without sound
    if (e.target && e.target.closest && e.target.closest("#gateEnter, #gateQuiet")) return;
    setSound(true);
    startWelcome();
  }
  // the events every browser (iPhone Safari included) counts as a tap that may start sound
  ["touchend", "mousedown", "keydown"].forEach(function (type) {
    document.addEventListener(type, firstTouch, true);
  });

  /* ---------- the decree modal (storyline) ---------- */

  function openDecree() {
    if (el.prologueModal) {
      el.prologueModal.hidden = false;
      if (window.Sound && window.Sound.farBell) window.Sound.farBell();
    }
  }
  function closeDecree() {
    if (el.prologueModal) {
      el.prologueModal.hidden = true;
      if (window.Sound && window.Sound.whoosh) window.Sound.whoosh();
    }
  }
  if (el.prologueCloseBtn) el.prologueCloseBtn.addEventListener("click", closeDecree);
  if (el.prologuePill) el.prologuePill.addEventListener("click", openDecree);
  if (el.decreeTopBtn) el.decreeTopBtn.addEventListener("click", openDecree);
  window.App = window.App || {};
  window.App.onHexCutsceneComplete = function () {
    // the twist is already awake (a host delay of 0): the mission view would hide
    // its wheel with no tab to get back to it, so show the wheel instead
    if (session && session.stage === "twist") {
      render(false);
      el.stage.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setView("mission");
    setTimeout(function () {
      if (el.viewTabs) el.viewTabs.scrollIntoView({ behavior: "smooth", block: "start" });
      else el.submissionCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  if (el.cutsceneTopBtn) {
    el.cutsceneTopBtn.addEventListener("click", function () {
      if (window.OtherSideCutscene) {
        if (session && (session.hex != null || session.stage === "wait" || session.stage === "twist" || session.stage === "done")) {
          window.OtherSideCutscene.playHexCutscene();
        } else {
          window.OtherSideCutscene.playEntryCutscene();
        }
      }
    });
  }

  /* ---------- host ledger ---------- */

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /** One row per team: its own saved record, filled in from any older claim records. */
  function teamRecords() {
    var L = window.Ledger, byKey = {};
    L.teams().forEach(function (t) { byKey[t.key] = Object.assign({}, t); });
    L.entries().forEach(function (e) {
      var key = e.teamKey || L.teamKey(e.team || "");
      var t = byKey[key] || (byKey[key] = { key: key, name: e.team, at: e.at });
      ["charId", "problem", "hex", "hexAt", "twist", "twistText", "submissionUrl", "repoUrl", "submittedAt", "zipUrl", "zipName", "zipCloudUrl"]
        .forEach(function (k) { if (t[k] == null && e[k] != null) t[k] = e[k]; });
    });
    return Object.keys(byKey).map(function (k) { return byKey[k]; })
      .sort(function (a, b) { return (a.at || 0) - (b.at || 0); });
  }

  function renderHost() {
    var L = window.Ledger;
    var ledger = teamRecords();
    var cloud = L.mode === "cloud";
    var canAct = L.isHost;

    $("hostMode").innerHTML = cloud
      ? "Shared ledger · <b>" + esc(statusText(L.status)) + "</b> — every phone sees the same teams."
      : "Single-device mode — the ledger lives only in this browser. Add a Supabase config to share it across phones.";
    $("hostAuth").hidden = !cloud;
    $("hostSignedOut").hidden = canAct;
    $("hostSignedIn").hidden = !canAct;
    $("hostWho").textContent = L.hostEmail;
    $("hostImportLabel").hidden = cloud;
    $("hostDelay").disabled = !canAct;
    $("hostReset").disabled = !canAct;
    $("hostFree").disabled = !canAct;
    $("hostDelayHint").textContent = cloud ? "Applies to every phone, for teams that spin the hex after the change." : "Applies to this device only.";

    $("hostCount").textContent = "(" + ledger.length + ")";
    if (document.activeElement !== $("hostDelay")) $("hostDelay").value = delayMinutes();

    // how many teams each character has (characters can be shared, so this is just a tally)
    var perChar = {}, most = 1;
    ledger.forEach(function (t) { if (t.charId) { perChar[t.charId] = (perChar[t.charId] || 0) + 1; most = Math.max(most, perChar[t.charId]); } });
    $("hostStats").innerHTML = D.characters.map(function (c) {
      var n = perChar[c.id] || 0;
      return '<div class="stat"><div class="stat-top"><span>' + c.glyph + " " + esc(c.short) + "</span><span>" + n + (n === 1 ? " team" : " teams") + '</span></div><div class="stat-bar"><i style="width:' + (n / most * 100) + '%"></i></div></div>';
    }).join("");

    var rows = ledger.slice().reverse().map(function (e, i) {
      var c = charById(e.charId);
      var p = c && typeof e.problem === "number" ? c.problems[e.problem] : null;
      var h = typeof e.hex === "number" ? D.uiCurses[e.hex] : null;
      var t = typeof e.twist === "number" ? D.twists[e.twist] : null;
      var dash = "<span class='muted'>—</span>";
      return "<tr><td class='muted'>" + (ledger.length - i) + "</td><td>" + esc(e.name) + "</td><td>" + (c ? c.glyph + " " + esc(c.short) : dash) +
        "</td><td>" + (p ? esc(p.t) : dash) + "</td><td>" + (h ? esc(h.t) : dash) +
        "</td><td>" + (t ? esc(t.t) : dash) + "</td><td class='muted'>" + (e.at ? new Date(e.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—") + "</td></tr>";
    }).join("");
    $("hostTable").innerHTML = "<thead><tr><th>#</th><th>Team</th><th>Soul</th><th>Curse</th><th>Hex</th><th>Twist</th><th>Joined</th></tr></thead><tbody>" +
      (rows || "<tr><td colspan='7' class='muted'>No teams yet.</td></tr>") + "</tbody>";
  }

  function openHost() { renderHost(); $("hostNote").textContent = ""; openModal(el.host); }

  function hostNote(msg, bad) {
    var n = $("hostNote");
    n.textContent = msg;
    n.classList.toggle("bad", !!bad);
  }


  $("hostDelay").addEventListener("change", async function () {
    var v = parseFloat(this.value);
    if (isNaN(v) || v < 0) v = D.twistDelayMinutes;
    try {
      await window.Ledger.setDelay(v);
      hostNote(window.Ledger.mode === "cloud" ? "Every phone will now wait " + v + " min for the twist." : "New teams on this device will wait " + v + " min for the twist.");
      $("rulesDelay").textContent = v;
    } catch (err) { hostNote(window.Ledger.friendly(err), true); }
  });

  $("hostLogin").addEventListener("submit", async function (e) {
    e.preventDefault();
    hostNote("Signing in…");
    try {
      await window.Ledger.signInHost($("hostEmail").value.trim(), $("hostPass").value);
      $("hostPass").value = "";
      hostNote("Signed in as host.");
    } catch (err) { hostNote(window.Ledger.friendly(err), true); }
    renderHost();
  });
  $("hostLogout").addEventListener("click", async function () {
    await window.Ledger.signOutHost();
    hostNote("Signed out.");
    renderHost();
  });

  function download(name, text, type) {
    var blob = new Blob([text], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  function stamp() { return new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-"); }

  $("hostExport").addEventListener("click", function () {
    download("wheel-of-curses-ledger-" + stamp() + ".json", JSON.stringify(teamRecords(), null, 2), "application/json");
  });
  $("hostCsv").addEventListener("click", function () {
    var q = function (s) { return '"' + String(s == null ? "" : s).replace(/"/g, '""') + '"'; };
    var lines = [["Team", "Leader Name", "Leader Year", "Leader Branch", "Leader Phone", "Leader Email",
      "Member Name", "Member Year", "Member Branch", "Member Phone", "Member Email",
      "Character", "Problem", "Problem brief", "UI hex", "Twist", "Twist brief", "Live Hosted URL", "GitHub Repo", "Source Code ZIP", "Cloud ZIP Link", "Submitted at", "Joined at"].map(q).join(",")];
    teamRecords().forEach(function (e) {
      var ldr = e.leader || {};
      // one column per detail; if a team ever has more than one member they're joined with "; "
      var mem = function (k) { return (e.members || []).map(function (m) { return m[k] || ""; }).join("; "); };
      var c = charById(e.charId), p = c && c.problems[e.problem];
      var h = typeof e.hex === "number" ? D.uiCurses[e.hex] : null, t = typeof e.twist === "number" ? D.twists[e.twist] : null;
      var subTime = e.submittedAt ? new Date(e.submittedAt).toLocaleString() : "";
      lines.push([
        e.name,
        ldr.name || "",
        ldr.year || "",
        ldr.branch || "",
        ldr.phone || "",
        ldr.email || "",
        mem("name"),
        mem("year"),
        mem("branch"),
        mem("phone"),
        mem("email"),
        c && c.name,
        p && p.t,
        p && p.d,
        h && h.t,
        t && t.t,
        e.twistText,
        e.submissionUrl || "",
        e.repoUrl || "",
        e.zipUrl || (e.zipName ? "Attached: " + e.zipName : ""),
        e.zipCloudUrl || "",
        subTime,
        new Date(e.at).toLocaleString()
      ].map(q).join(","));
    });
    download("wheel-of-curses-" + stamp() + ".csv", "\ufeff" + lines.join("\r\n"), "text/csv");
  });
  $("hostImport").addEventListener("change", function () {
    var f = this.files && this.files[0], input = this;
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var res = window.Ledger.merge(JSON.parse(r.result));
        hostNote("Merged " + res.added + " claim(s)." + (res.clashes.length ? " " + res.clashes.length + " clash(es): the later team must re-spin — " + res.clashes.map(function (c) { return c.dropped.team; }).join(", ") : ""));
      } catch (err) { hostNote("Couldn't read that file: " + err.message, true); }
      input.value = "";
      renderHost();
    };
    r.readAsText(f);
  });
  $("hostReset").addEventListener("click", async function () {
    var where = window.Ledger.mode === "cloud" ? "for EVERY phone" : "on this device";
    var typed = window.prompt("This erases every team and frees every curse " + where + ". Type WIPE to confirm.");
    if (typed !== "WIPE") return;
    hostNote("Wiping…");
    try {
      await window.Ledger.wipe();
      window.Store.clearSession();
      window.Store.unlockDevice();
      session = null;
      render(false);
      hostNote("Ledger wiped.");
    } catch (err) { hostNote(window.Ledger.friendly(err), true); }
    renderHost();
  });

  // Each phone registers once. For a test run (or a broken phone) the host can
  // release THIS phone so a new team can sign in on it.
  $("hostFree").addEventListener("click", function () {
    var d = window.Store.deviceTeam();
    if (!window.confirm("Free this phone? " + (d ? "It is bound to “" + d.team + "”. " : "") + "That team's fate stays in the ledger; this phone can register a new team.")) return;
    window.Store.unlockDevice();
    window.Store.clearSession();
    session = null;
    render(false);
    hostNote(window.Ledger.mode === "cloud" ? "Phone freed. Sign out of the host account before handing it to a team." : "Phone freed.");
  });

  // the host doesn't need the secret name to open the judges' board
  $("hostJudges").addEventListener("click", function () {
    if (window.Ledger.isHost) window.Store.setJudgePass(D.judgeKey);
  });

  if ($("hostTriggerCorruption")) {
    $("hostTriggerCorruption").addEventListener("click", function () {
      closeModal(el.host);
      if (window.OtherSideCutscene && typeof window.OtherSideCutscene.playCorruptionCutscene === "function") {
        window.OtherSideCutscene.playCorruptionCutscene();
      }
    });
  }

  if ($("hostTriggerAlliance")) {
    $("hostTriggerAlliance").addEventListener("click", function () {
      closeModal(el.host);
      if (window.OtherSideCutscene && typeof window.OtherSideCutscene.playAllianceCutscene === "function") {
        window.OtherSideCutscene.playAllianceCutscene();
      }
    });
  }

  if ($("hostTriggerFiveMin")) {
    $("hostTriggerFiveMin").addEventListener("click", function () {
      closeModal(el.host);
      if (window.OtherSideCutscene && typeof window.OtherSideCutscene.playFiveMinCutscene === "function") {
        window.OtherSideCutscene.playFiveMinCutscene();
      }
    });
  }

  if ($("hostTriggerZeroHour")) {
    $("hostTriggerZeroHour").addEventListener("click", function () {
      closeModal(el.host);
      if (window.OtherSideCutscene && typeof window.OtherSideCutscene.playZeroHourCutscene === "function") {
        window.OtherSideCutscene.playZeroHourCutscene();
      }
    });
  }

  if ($("hostTestScare")) {
    $("hostTestScare").addEventListener("click", function () {
      closeModal(el.host);
      var targetChar = (session && session.charId && charById(session.charId)) || pick(D.characters);
      if (window.Creatures && typeof window.Creatures.playVideoScare === "function") {
        window.Creatures.playVideoScare(targetChar);
      }
    });
  }

  /* ---------- live updates ---------- */

  function statusText(s) {
    return { connecting: "Summoning The Other Side…", online: "The Other Side Linked", offline: "Offline — reconnecting", error: "The Other Side Unreachable", local: "Local mode" }[s] || s;
  }

  var liveQueued = false;
  window.Ledger.onChange(function () {
    if (liveQueued) return;
    liveQueued = true;
    requestAnimationFrame(function () {
      liveQueued = false;
      $("rulesDelay").textContent = delayMinutes();
      if (typeof window.Ledger.isUnlocked === "function") {
        var unlocked = window.Ledger.isUnlocked();
        if (typeof unlocked === "boolean" && unlocked !== isRound2Unlocked) {
          isRound2Unlocked = unlocked;
          updateGateUI();
          if (session) render(false);
        }
      }
      // keep this phone's wheel in step with the shared ledger
      if (session && !busy && el.reveal.hidden && (session.stage === "soul" || session.stage === "curse")) render(false);
      if (!el.host.hidden) renderHost();
    });
  });

  // keep several tabs on the same device in sync
  window.addEventListener("storage", function (e) {
    if (e.key === window.Store.sessionKey && !busy && el.reveal.hidden) {
      session = window.Store.session();
      if (el.reveal.hidden) render(false);
    }
  });

  /* ---------- boot ---------- */

  $("year").textContent = new Date().getFullYear();
  $("rulesDelay").textContent = delayMinutes();
  window.Creatures.init({ isBusy: function () { return busy || !el.reveal.hidden || !el.gate.classList.contains("gone"); } });
  setScares(window.Store.prefs().scares !== false);
  render(true);
  // where the browser allows sound straight away, the face doesn't wait for a tap —
  // only for the page to finish drawing, so nobody misses it behind a blank screen
  function autoWelcome() {
    if (document.hidden) { document.addEventListener("visibilitychange", autoWelcome, { once: true }); return; }
    setTimeout(function () {
      if (welcome === "none" && !entered && window.Creatures.scaresOn) { setSound(true); startWelcome(); }
    }, 700);
  }
  if (window.Creatures.scaresOn && window.Sound.canAutoplay()) {
    if (document.readyState === "complete") autoWelcome();
    else window.addEventListener("load", autoWelcome, { once: true });
  }

  /* ---------- FAQ Hub Engine ---------- */
  var faqsInitialized = false;
  var currentFaqCat = "all";
  var currentFaqQuery = "";

  function initFaqsHub() {
    if (!el.faqCard || !window.FAQ_DATA) return;
    if (!faqsInitialized) {
      faqsInitialized = true;
      setupFaqControls();
    }
    renderFaqList();
  }

  function setupFaqControls() {
    if (el.faqCategoryChips) {
      el.faqCategoryChips.addEventListener("click", function (e) {
        var chip = e.target.closest(".faq-chip");
        if (!chip) return;
        var cat = chip.dataset.cat || "all";
        if (cat === currentFaqCat) return;
        currentFaqCat = cat;
        var chips = el.faqCategoryChips.querySelectorAll(".faq-chip");
        chips.forEach(function (c) {
          var isAct = c === chip;
          c.classList.toggle("is-active", isAct);
          c.setAttribute("aria-selected", isAct ? "true" : "false");
        });
        if (window.Sound && window.Sound.tick) window.Sound.tick(0.4);
        renderFaqList();
      });
    }

    if (el.faqSearchInput) {
      var debounceTimer = null;
      el.faqSearchInput.addEventListener("input", function () {
        var q = this.value.trim().toLowerCase();
        if (el.faqSearchClear) el.faqSearchClear.hidden = !q;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
          currentFaqQuery = q;
          renderFaqList();
        }, 120);
      });
    }

    if (el.faqSearchClear) {
      el.faqSearchClear.addEventListener("click", function () {
        if (el.faqSearchInput) {
          el.faqSearchInput.value = "";
          el.faqSearchInput.focus();
        }
        this.hidden = true;
        currentFaqQuery = "";
        renderFaqList();
      });
    }

    if (el.faqResetBtn) {
      el.faqResetBtn.addEventListener("click", function () {
        currentFaqCat = "all";
        currentFaqQuery = "";
        if (el.faqSearchInput) el.faqSearchInput.value = "";
        if (el.faqSearchClear) el.faqSearchClear.hidden = true;
        if (el.faqCategoryChips) {
          var chips = el.faqCategoryChips.querySelectorAll(".faq-chip");
          chips.forEach(function (c) {
            var isAll = c.dataset.cat === "all";
            c.classList.toggle("is-active", isAll);
            c.setAttribute("aria-selected", isAll ? "true" : "false");
          });
        }
        renderFaqList();
      });
    }
  }

  function highlightMatch(text, query) {
    if (!query || !text) return text || "";
    var regex = new RegExp("(" + query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
    return text.replace(regex, "<mark class='faq-highlight'>$1</mark>");
  }

  function renderFaqList() {
    if (!el.faqList || !window.FAQ_DATA) return;
    var categories = window.FAQ_DATA.categories || [];
    var allFaqs = [];

    categories.forEach(function (cat) {
      if (!cat.faqs) return;
      cat.faqs.forEach(function (f) {
        allFaqs.push({
          id: f.id,
          q: f.q,
          a: f.a,
          tags: f.tags || [],
          catId: cat.id,
          catName: cat.name,
          glyph: cat.glyph
        });
      });
    });

    var filtered = allFaqs.filter(function (f) {
      if (currentFaqCat !== "all" && f.catId !== currentFaqCat) return false;
      if (currentFaqQuery) {
        var inQ = f.q.toLowerCase().indexOf(currentFaqQuery) !== -1;
        var inA = f.a.toLowerCase().indexOf(currentFaqQuery) !== -1;
        var inTags = f.tags.some(function (t) { return t.toLowerCase().indexOf(currentFaqQuery) !== -1; });
        if (!inQ && !inA && !inTags) return false;
      }
      return true;
    });

    if (el.faqEmpty) el.faqEmpty.hidden = filtered.length > 0;
    el.faqList.innerHTML = "";

    filtered.forEach(function (f) {
      var item = document.createElement("article");
      item.className = "faq-item";
      item.dataset.id = f.id;
      item.dataset.cat = f.catId;

      var qHtml = currentFaqQuery ? highlightMatch(f.q, currentFaqQuery) : f.q;
      var aHtml = currentFaqQuery ? highlightMatch(f.a, currentFaqQuery) : f.a;

      item.innerHTML = [
        '<button type="button" class="faq-question" aria-expanded="false" id="faq-q-' + f.id + '">',
        '  <span class="faq-cat-tag"><span class="tag-glyph">' + f.glyph + '</span> ' + f.catName + '</span>',
        '  <span class="faq-q-text">' + qHtml + '</span>',
        '  <span class="faq-arrow-icon" aria-hidden="true">',
        '    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>',
        '  </span>',
        '</button>',
        '<div class="faq-answer" role="region" aria-labelledby="faq-q-' + f.id + '">',
        '  <div class="faq-answer-inner">',
        '    <div class="faq-answer-content">' + aHtml + '</div>',
        '  </div>',
        '</div>'
      ].join("");

      var btn = item.querySelector(".faq-question");
      btn.addEventListener("click", function () {
        var wasOpen = item.classList.contains("is-open");
        item.classList.toggle("is-open", !wasOpen);
        btn.setAttribute("aria-expanded", wasOpen ? "false" : "true");
        if (window.Sound && window.Sound.tick) window.Sound.tick(0.35);
      });

      el.faqList.appendChild(item);
    });
  }

  /* ---------- 3D Tilt on Fate Cards (Excludes Submission Form & Banners to prevent input lag/blur) ---------- */
  function init3DTiltFX() {
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return;
    var targets = document.querySelectorAll(".fate");
    targets.forEach(function (card) {
      var rect = null;
      var raf = null;
      card.addEventListener("pointerenter", function () { rect = card.getBoundingClientRect(); });
      card.addEventListener("pointermove", function (e) {
        if (!rect) rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var cx = rect.width / 2;
        var cy = rect.height / 2;
        var rx = -((y - cy) / cy) * 3.5;
        var ry = ((x - cx) / cx) * 3.5;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          card.style.transform = "perspective(900px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) scale3d(1.01, 1.01, 1.01)";
        });
      }, { passive: true });
      card.addEventListener("pointerleave", function () {
        if (raf) cancelAnimationFrame(raf);
        rect = null;
        card.style.transform = "";
      });
    });
  }
  setTimeout(init3DTiltFX, 1000);

  /* ---------- Kapidhwaj Copy Handle Button ---------- */
  if (el.apCopyHandleBtn) {
    el.apCopyHandleBtn.addEventListener("click", function () {
      var handle = "@kapidhwaj.innovations";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(handle).then(function () {
          el.apCopyHandleBtn.innerHTML = "<span>✓</span> Copied!";
          if (window.Sound && window.Sound.tick) window.Sound.tick(0.6);
          setTimeout(function () {
            el.apCopyHandleBtn.innerHTML = "<span>📋</span> Copy Handle";
          }, 2000);
        }).catch(function () {
          window.prompt("Copy Kapidhwaj Instagram Handle:", handle);
        });
      } else {
        window.prompt("Copy Kapidhwaj Instagram Handle:", handle);
      }
    });
  }

  function resumePending() {
    // a result was decided but the page reloaded before it was shown
    if (!session || !session.pending) return;
    var stg = session.pending;
    if (stg === "soul" || stg === "curse" || stg === "hex" || stg === "twist") {
      if (stg === "soul") wheel.show(D.characters.map(function (c) { return c.id; }).indexOf(session.charId));
      if (stg === "curse") wheel.show(session.problem);
      if (stg === "hex") wheel.show(session.hex);
      if (stg === "twist") wheel.show(session.twist);
      busy = true;
      showCard(stg);
    }
  }
  setTimeout(resumePending, 600);

  // One registration per phone: a phone that already has a team is locked to it.
  if (session && !window.Store.deviceTeam()) window.Store.lockDevice(session.team, session.teamKey || window.Ledger.teamKey(session.team), { leader: session.leader, members: session.members });

  // Automatic Handoff from Round 1 (/api/round2/state) + Ledger Recovery
  if (!session && !wentHome) {
    (async function autoRecoverOrHandoff() {
      // 1. Check unified backend session from Round 1 first
      try {
        var r2StateRes = await fetch("/api/round2/state");
        if (r2StateRes.ok) {
          var r2State = await r2StateRes.json();
          if (typeof r2State.round2Unlocked === "boolean") {
            isRound2Unlocked = r2State.round2Unlocked;
            updateGateUI();
          }
          if (r2State && r2State.authenticated && r2State.teamName) {
            await window.Ledger.ready();
            var key = window.Ledger.teamKey(r2State.teamName);
            var existingRow = window.Ledger.teams().filter(function (x) { return x.key === key; })[0];
            var combined = Object.assign({}, existingRow || {}, r2State.r2 || {}, {
              name: r2State.teamName,
              key: key,
              leader: r2State.leader || (existingRow && existingRow.leader) || null,
              members: r2State.members || (existingRow && existingRow.members) || []
            });
            // Ensure team is also registered in r2_teams for live Supabase sync
            await window.Ledger.registerTeam(r2State.teamName, {
              leader: combined.leader,
              members: combined.members
            }).catch(function () {});
            if (!session) {
              applyRestoredTeamRecord(combined, true);
              return;
            }
          }
        }
      } catch (e) {
        // Fallback to localStorage / Ledger recovery below
      }

      // 2. Check if Round 1 saved r2.team in localStorage on this browser
      try {
        var storedR1Team = window.localStorage.getItem("r2.team");
        if (storedR1Team && !session) {
          var resumed = await tryResumeByTeamName(storedR1Team);
          if (resumed && resumed.ok) return;
        }
      } catch (e) {}

      // 3. Standard Ledger / Device Token recovery
      window.Ledger.ready().then(function () {
        if (session) return;
        var lock = window.Store.deviceTeam();
        var t = lock ? window.Ledger.teams().filter(function (x) { return x.key === lock.key; })[0] : null;
        if (!t) t = window.Ledger.myTeam();
        if (!t) {
          if (lock && (window.Ledger.mode === "local" || window.Ledger.status === "online")) window.Store.unlockDevice();
          return;
        }
        applyRestoredTeamRecord(t, false);
      });
    })();
  }

  // Periodic gate poller (2.8s when locked, 10s when unlocked, paused when tab hidden)
  setInterval(function () {
    if (document.hidden) return;
    checkRound2Gate();
  }, 2800);

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) checkRound2Gate();
  });

  checkRound2Gate();
})();
