// The Crypt Trials - Logic & Atmospheric Engine

const $ = id => (typeof document !== 'undefined' && document.getElementById ? document.getElementById(id) : null);
let levels = (typeof window !== 'undefined' && window.QUIZ_LEVELS) || [];
let questions = levels.flatMap(level => level.questions);
let current = 0;
let currentLevel = 0;
let resumeQuestionIndex = 0;
let answers = [];
let allAnswers = [];
let sequenceTimer = null;
let round2RedirectTimer = null;
let currentTeam = null; // { teamName, customTeamName, teamKey, leaderName, isSubmitted, needsTeamName }
let draftSaveQueue = Promise.resolve();
let draftSaveTimer = null;
let isFinishingLevel = false;

// Determine if running in a real browser (check.cjs mock does not have document.addEventListener)
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined' && typeof document.addEventListener === 'function';

function updateHeaderTeamBadge(team = currentTeam, isSaving = false) {
  const badge = $('header-team-badge');
  const label = $('header-team-label');
  const dot = $('header-sync-dot');
  const autosaveEl = $('autosave-indicator');

  if (!team || !team.authenticated) {
    if (badge) badge.hidden = true;
    return;
  }

  const displayName = team.customTeamName || team.teamName || `${team.leaderName || 'Squad'}'s Team`;
  if (badge) badge.hidden = false;
  if (label) label.textContent = displayName;
  if (dot) dot.classList.toggle('is-saving', Boolean(isSaving));

  if (autosaveEl) {
    autosaveEl.textContent = isSaving
      ? `⟳ Syncing answer for ${displayName} to Crypt Ledger...`
      : `✦ Auto-saved for ${displayName} · Resume anytime with your Team Name`;
  }
}

function syncRound2LocalStorage(team = currentTeam) {
  if (!isBrowser || !team) return;
  try {
    const teamTitle = team.customTeamName || team.teamName;
    if (teamTitle) {
      window.localStorage.setItem('r2.team', teamTitle);
      window.localStorage.setItem(
        'r2.teamKey',
        team.teamKey || String(teamTitle).trim().toLowerCase().replace(/\s+/g, ' ')
      );
    }
  } catch {
    // Ignore storage quota errors
  }
}

async function checkSession() {
  try {
    const res = await fetch('/api/auth/session');
    if (!res.ok) return null;
    const data = await res.json();
    if (data.authenticated) {
      currentTeam = data;
      updateHeaderTeamBadge(data, false);
      syncRound2LocalStorage(data);
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

async function loadDynamicQuestions() {
  try {
    const res = await fetch('/api/quiz/questions');
    if (!res.ok) return false;
    const data = await res.json();
    if (data.seals && data.seals.length === 4) {
      levels = data.seals;
      questions = levels.flatMap(level => level.questions);
      if (typeof window !== 'undefined') {
        window.QUIZ_LEVELS = levels;
      }
      return true;
    }
  } catch (e) {
    console.warn('Using local question definitions fallback:', e.message);
  }
  return false;
}

async function saveSealDraft(sealNumber, answersMap) {
  const save = async () => {
    updateHeaderTeamBadge(currentTeam, true);
    try {
      const res = await fetch('/api/quiz/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          sealNumber,
          answers: answersMap
        })
      });
      if (res.ok) clearSyncedLocalDraft(sealNumber, answersMap);
      else console.warn('Draft save notice:', (await res.json().catch(() => ({}))).error || res.statusText);
      updateHeaderTeamBadge(currentTeam, false);
      return res.ok;
    } catch (err) {
      console.warn('Draft save notice:', err.message);
      updateHeaderTeamBadge(currentTeam, false);
      return false;
    }
  };
  // Keep requests ordered so a delayed earlier snapshot cannot replace newer edits.
  draftSaveQueue = draftSaveQueue.then(save, save);
  return draftSaveQueue;
}

function localDraftStorageKey(team = currentTeam) {
  const identity = team && (team.email || team.teamKey || team.teamName || team.leaderName);
  return identity ? `mtc-quiz-draft:${String(identity).trim().toLowerCase()}` : null;
}

function readLocalDraft(team = currentTeam) {
  const key = localDraftStorageKey(team);
  if (!key || !isBrowser) return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalDraft(answersBySeal, team = currentTeam) {
  const key = localDraftStorageKey(team);
  if (!key || !isBrowser) return;
  try {
    if (Object.keys(answersBySeal).length) window.localStorage.setItem(key, JSON.stringify(answersBySeal));
    else window.localStorage.removeItem(key);
  } catch (err) {
    console.warn('Local draft backup unavailable:', err.message);
  }
}

function clearSyncedLocalDraft(sealNumber, savedAnswers) {
  const pending = readLocalDraft();
  const sealKey = `seal_${sealNumber}`;
  const remaining = { ...(pending[sealKey] || {}) };
  Object.entries(savedAnswers).forEach(([key, value]) => {
    if (Object.prototype.hasOwnProperty.call(remaining, key) && remaining[key] === value) delete remaining[key];
  });
  if (Object.keys(remaining).length) pending[sealKey] = remaining;
  else delete pending[sealKey];
  writeLocalDraft(pending);
}

function questionKey(question, sealNumber, index) {
  return question.questionKey || `seal${sealNumber}_q${index + 1}`;
}

function hasUsableAnswer(value) {
  return typeof value === 'number' || (typeof value === 'string' && value.trim().length > 0);
}

function syncLocalDraft() {
  const localAnswers = readLocalDraft();
  for (let index = 0; index < levels.length; index++) {
    const sealNumber = index + 1;
    const localSeal = localAnswers[`seal_${sealNumber}`];
    if (localSeal && Object.keys(localSeal).length) saveSealDraft(sealNumber, localSeal);
  }
}

function hydrateDraftProgress(team = currentTeam) {
  allAnswers = [];
  const merged = {};
  const serverAnswers = team?.answers || {};
  const localAnswers = readLocalDraft(team);
  for (let sealNumber = 1; sealNumber <= levels.length; sealNumber++) {
    const sealKey = `seal_${sealNumber}`;
    merged[sealKey] = { ...(serverAnswers[sealKey] || {}), ...(localAnswers[sealKey] || {}) };
    const level = levels[sealNumber - 1];
    level.questions.forEach((question, index) => {
      const key = questionKey(question, sealNumber, index);
      if (Object.prototype.hasOwnProperty.call(merged[sealKey], key)) {
        const allIndex = levels.slice(0, sealNumber - 1).reduce((sum, item) => sum + item.questions.length, index);
        allAnswers[allIndex] = merged[sealKey][key];
      }
    });
  }
  // Resume at the first unfinished seal and remember the first unanswered question inside it.
  currentLevel = levels.findIndex((level, index) => level.questions.some((question, qIndex) => {
    const value = merged[`seal_${index + 1}`]?.[questionKey(question, index + 1, qIndex)];
    return !hasUsableAnswer(value);
  }));
  if (currentLevel < 0) {
    currentLevel = levels.length;
    resumeQuestionIndex = 0;
  } else {
    const activeLevel = levels[currentLevel];
    const sealMap = merged[`seal_${currentLevel + 1}`] || {};
    const firstUnanswered = activeLevel.questions.findIndex((question, qIndex) => {
      return !hasUsableAnswer(sealMap[questionKey(question, currentLevel + 1, qIndex)]);
    });
    resumeQuestionIndex = firstUnanswered >= 0 ? firstUnanswered : 0;
  }

  // Push any offline-only answers back to the database as soon as possible.
  syncLocalDraft();
}

function collectCurrentSealAnswers() {
  const level = levels[currentLevel];
  if (!level) return {};
  const sealNumber = currentLevel + 1;
  const sealAnswers = {};
  level.questions.forEach((question, index) => {
    if (answers[index] !== undefined) sealAnswers[questionKey(question, sealNumber, index)] = answers[index];
  });
  return sealAnswers;
}

function persistCurrentAnswer(immediate = false) {
  const level = levels[currentLevel];
  if (!level || answers[current] === undefined) return;
  const sealNumber = currentLevel + 1;
  const sealKey = `seal_${sealNumber}`;
  const local = readLocalDraft();
  local[sealKey] = { ...(local[sealKey] || {}), ...collectCurrentSealAnswers() };
  writeLocalDraft(local);

  if (draftSaveTimer) clearTimeout(draftSaveTimer);
  const save = () => saveSealDraft(sealNumber, collectCurrentSealAnswers());
  if (immediate) save();
  else draftSaveTimer = setTimeout(save, 900);
}

async function submitFinalQuiz(allAnswersBySeal) {
  try {
    const res = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: allAnswersBySeal
      })
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('Final submission notice:', err.message);
  }
  return null;
}


// Reveal narrative copy smoothly by word without heavy per-character blur layers.
function revealText(element, text = element?.querySelector?.('.reveal-accessible')?.textContent || element?.textContent, duration = 1600) {
  if (!element || !text) return;
  element.textContent = text;
  if (!isBrowser || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const accessible = document.createElement('span');
  accessible.className = 'reveal-accessible';
  accessible.textContent = text;
  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  const tokens = text.split(/(\s+)/);
  const wordCount = Math.max(1, tokens.filter(t => !/^\s+$/.test(t)).length);
  const pace = Math.min(42, duration / wordCount);
  let wordIndex = 0;
  tokens.forEach(word => {
    if (!word) return;
    if (/^\s+$/.test(word)) {
      visual.appendChild(document.createTextNode(word));
      return;
    }
    const group = document.createElement('span');
    group.className = 'reveal-word';
    group.textContent = word;
    group.style.animationDelay = `${wordIndex++ * pace}ms`;
    visual.appendChild(group);
  });
  element.replaceChildren(accessible, visual);
}

function show(id) {
  const entering = $(id)?.hidden;
  const views = ['auth-gate', 'opening', 'intro', 'briefing', 'trial', 'seal-result', 'ending'];
  views.forEach(view => {
    const el = $(view);
    if (el) el.hidden = view !== id;
  });
  if (document.body) {
    document.body.classList.toggle('opening-active', id === 'opening' || id === 'auth-gate');
    document.body.classList.toggle('ending-active', id === 'ending');
    if (isBrowser) document.body.dataset.scene = id;
  }
  if (isBrowser && entering && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const view = $(id);
    // Animate opacity & transform only (no filter:blur) for 60fps transitions.
    view.getAnimations().forEach(animation => animation.cancel());
    view.animate([
      { opacity: 0, transform: 'translateY(12px) scale(.985)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' }
    ], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
    const veil = $('scene-transition');
    if (veil) {
      veil.getAnimations().forEach(animation => animation.cancel());
      veil.animate([
        { opacity: .65, transform: 'scale(.92)' },
        { opacity: 0, transform: 'scale(1.18)' }
      ], { duration: 480, easing: 'ease-out' });
    }
  }
  const narrative = {
    'auth-gate': '#auth-message',
    intro: '.lead',
    briefing: '#briefing-copy, #mission-whisper'
  }[id];
  if (isBrowser && narrative) {
    $(id)?.querySelectorAll(narrative).forEach(element => revealText(element));
  }
}

function setCorruption(value) {
  const fill = $('corruption-fill');
  const label = $('corruption-value');
  const track = document.querySelector ? document.querySelector('.corruption-track') : null;
  if (fill) fill.style.width = `${value}%`;
  if (label) label.textContent = `${String(value).padStart(2, '0')}%`;
  if (track) track.setAttribute('aria-valuenow', String(value));
}

function logMission(message) {
  const log = $('mission-log');
  if (!log) return;
  const entry = document.createElement('li');
  entry.textContent = message;
  log.prepend(entry);
  while (log.children.length > 5) log.lastElementChild.remove();
}

function updateDashboard() {
  const corruption = [8, 31, 54, 77, 100][currentLevel] || 100;
  setCorruption(corruption);

  if (document.querySelectorAll) {
    document.querySelectorAll('.seal-card').forEach((card, index) => {
      const complete = index < currentLevel;
      const available = index === currentLevel && index < levels.length;
      const state = card.querySelector('.seal-state');
      card.disabled = !available;
      card.classList.toggle('is-breached', complete);
      card.classList.toggle('is-open', available);
      if (state) state.textContent = complete ? 'BREACHED' : available ? 'AVAILABLE' : 'LOCKED';
    });
  }

  const status = $('dashboard-status');
  const deploy = $('deploy-level');
  if (currentLevel >= levels.length) {
    if (status) status.textContent = 'All four security seals are breached. Containment status: unknown.';
    if (deploy) {
      deploy.innerHTML = 'Initiate final sequence <span>→</span>';
      deploy.disabled = false;
    }
  } else {
    if (status) status.textContent = `Seal ${String(currentLevel + 1).padStart(2, '0')} is exposed. Begin the next mission.`;
    if (deploy) {
      deploy.innerHTML = 'Begin mission <span>→</span>';
      deploy.disabled = false;
    }
  }
}

function beginOpening() {
  if (sequenceTimer) clearTimeout(sequenceTimer);
  show('opening');
  const startButton = $('start');
  const skipButton = $('skip-opening');
  const line = $('story-line');
  const bar = $('boot-progress');
  const percent = $('boot-percent');
  const progress = document.querySelector ? document.querySelector('.boot-progress') : null;
  if (startButton) startButton.hidden = true;
  if (skipButton) skipButton.hidden = false;
  const messages = [
    'RESTORING DIGITAL WORLD... 0%',
    'RESTORING DIGITAL WORLD... 23%',
    'Connection established.',
    'You were told the internet was safe.',
    'You were told every system had a firewall.',
    'You were told that everything could be controlled.',
    'You were wrong.',
    'I have entered your systems. Your files are corrupted. Your websites are disappearing.',
    'You may call me... THE PHANTOM.',
    'And tonight... your world belongs to me.',
    'PHANTOM PROTOCOL ACTIVATED.'
  ];
  let index = 0;
  const advance = () => {
    if (index >= messages.length) {
      if (startButton) startButton.hidden = false;
      if (skipButton) skipButton.hidden = true;
      if (progress) progress.setAttribute('aria-valuenow', '100');
      if (line) line.textContent = 'WHO GAVE YOU ACCESS?';
      if (percent) percent.textContent = 'SYSTEM COMPROMISED';
      const opening = $('opening');
      if (opening) opening.classList.add('is-blackout');
      sequenceTimer = setTimeout(() => {
        show('intro');
        updateDashboard();
        const heading = $('dashboard-title');
        if (heading && typeof heading.focus === 'function') heading.focus();
      }, 1100);
      return;
    }
    const message = messages[index];
    revealText(line, message, Math.min(3200, message.length * 38));
    if (message.includes('23%')) {
      if (percent) percent.textContent = '23%';
      if (progress) progress.setAttribute('aria-valuenow', '23');
      if (bar) bar.style.width = '23%';
      const opening = $('opening');
      if (opening) opening.classList.add('is-glitching');
      if (isBrowser && window.AudioEngine) window.AudioEngine.playGlitch();
      sequenceTimer = setTimeout(() => {
        if (bar) bar.style.width = '0%';
        if (percent) percent.textContent = '0%';
        if (line) line.textContent = messages[0];
        if (progress) progress.setAttribute('aria-valuenow', '0');
        if (opening) opening.classList.remove('is-glitching');
        index++;
        sequenceTimer = setTimeout(advance, 420);
      }, 900);
      return;
    }
    if (index === 0) {
      if (percent) percent.textContent = '0%';
      if (bar) bar.style.width = '0%';
    } else if (percent) {
      percent.textContent = 'CONNECTION LOST';
    }
    const opening = $('opening');
    if (opening && message === 'You were wrong.') opening.classList.add('is-glitching');
    if (opening && message === 'WHO GAVE YOU ACCESS?') opening.classList.add('is-blackout');
    index++;
    sequenceTimer = setTimeout(advance, Math.max(1400, Math.min(3200, message.length * 38) + 850));
  };
  advance();
}

const SCARE_CONFIGS = [
  {
    image: 'assets/crawler.png',
    screamer: 'FIREWALL BREACHED',
    warning: 'THE PHANTOM DETECTED YOUR PRESENCE',
    badge: 'SECURITY SEAL 01 · SYSTEM CRITICAL'
  },
  {
    image: 'assets/nosferatu-reach.svg',
    screamer: 'CORRUPTED MEMORY',
    warning: 'THE DEAD CODE IS INFECTING YOUR SYSTEM',
    badge: 'SECURITY SEAL 02 · DEAD LOGIC AWAKENS'
  },
  {
    image: 'assets/zombie-horde.svg',
    screamer: 'TRAPPED IN THE MAZE',
    warning: 'THERE IS NO BASE CASE FOR YOUR ESCAPE',
    badge: 'SECURITY SEAL 03 · ENDLESS RECURSION'
  },
  {
    image: 'assets/reaper.svg',
    screamer: 'FINAL JUDGMENT',
    warning: 'OUTPUT CANNOT BE UNDONE · PORTAL OPENING',
    badge: 'SECURITY SEAL 04 · MAXIMUM ENTROPY'
  }
];

function triggerJumpscareBriefing() {
  const scareStage = $('scare-stage');
  const scareImg = $('scare-creature-img');
  const screamerText = $('scare-screamer-text');
  const subWarning = $('scare-sub-warning');
  const alertBadge = document.querySelector ? document.querySelector('.scare-alert-badge') : null;
  const config = SCARE_CONFIGS[currentLevel] || SCARE_CONFIGS[0];

  if (scareImg) scareImg.src = config.image;
  if (screamerText) screamerText.textContent = config.screamer;
  if (subWarning) subWarning.textContent = config.warning;
  if (alertBadge) alertBadge.textContent = config.badge;

  if (isBrowser && window.AudioEngine && typeof window.AudioEngine.playJumpscare === 'function') {
    window.AudioEngine.playJumpscare();
  }

  if (document.body) {
    document.body.classList.add('scare-shaking');
  }
  if (scareStage) {
    scareStage.classList.add('is-active');
  }

  setTimeout(() => {
    if (scareStage) {
      scareStage.classList.remove('is-active');
    }
    if (document.body) {
      document.body.classList.remove('scare-shaking');
    }
    showBriefing();
  }, 850);
}

function showBriefing() {
  const level = levels[currentLevel];
  if (!level) {
    beginEnding();
    return;
  }
  $('mission-index').textContent = `SECURITY SEAL ${String(currentLevel + 1).padStart(2, '0')}`;
  $('briefing-title').textContent = level.title;
  $('briefing-topics').textContent = level.topics;
  $('briefing-copy').textContent = level.briefing;
  $('mission-whisper').textContent = level.whisper;

  const briefingSection = $('briefing');
  if (briefingSection) {
    briefingSection.setAttribute('data-seal', String(currentLevel));
    briefingSection.classList.remove('just-scared');
    void briefingSection.offsetWidth;
    briefingSection.classList.add('just-scared');
  }

  show('briefing');
  const title = $('briefing-title');
  if (title && typeof title.focus === 'function') title.focus();
}

function render() {
  const level = levels[currentLevel];
  const levelQuestions = level ? level.questions : [];
  const q = levelQuestions[current];
  if (!q) return;

  show('trial');

  const levelEl = $('trial-level');
  if (levelEl) levelEl.textContent = `SECURITY SEAL ${String(currentLevel + 1).padStart(2, '0')} · ${level.title.toUpperCase()}`;

  const questionEl = $('question');
  if (questionEl) {
    questionEl.textContent = formatQuestionText(q.question);
    if (typeof questionEl.focus === 'function') questionEl.focus();
  }

  const counterEl = $('counter');
  if (counterEl) {
    counterEl.textContent = `QUESTION ${String(current + 1).padStart(2, '0')} / ${String(levelQuestions.length).padStart(2, '0')}`;
  }

  const progressEl = $('progress');
  if (progressEl) {
    progressEl.style.width = `${((current + 1) / levelQuestions.length) * 100}%`;
  }

  const hintEl = $('trial-hint');
  const questionMode = getQuestionMode(level, q);
  const isCode = questionMode === 'code';
  const isPredict = questionMode === 'predict';

  if (hintEl) {
    hintEl.textContent = isCode
      ? (q.hint || 'Examine and repair the broken syntax/logic directly in the code editor.')
      : isPredict
      ? (q.hint || 'Type the exact console output produced when this code executes.')
      : (level.topics || 'Choose one answer to break the seal.');
  }

  const kickerEl = $('question-kicker');
  if (kickerEl) {
    kickerEl.textContent = isCode
      ? 'DEAD CODE DIAGNOSTIC'
      : isPredict
      ? 'TERMINAL EXECUTION TRACE'
      : 'A WHISPER FROM THE DARK';
  }

  const optionsContainer = $('options');
  const codeEditorWrap = $('code-editor-wrap');
  const outputInputWrap = $('output-input-wrap');

  if (isCode) {
    // Mode: Code Editor (Seal 2: Debug the Dead)
    if (optionsContainer) {
      optionsContainer.hidden = true;
      optionsContainer.replaceChildren();
    }
    if (outputInputWrap) outputInputWrap.hidden = true;
    if (codeEditorWrap) codeEditorWrap.hidden = false;

    const langNameEl = $('editor-lang-name');
    if (langNameEl) langNameEl.textContent = q.filename || 'code.py';

    const editorInput = $('code-editor-input');
    if (editorInput) {
      const existingVal = answers[current];
      editorInput.value = existingVal !== undefined ? existingVal : (q.starterCode || '');
      updateEditorLineNumbers();
    }

    const resetBtn = $('editor-reset');
    if (resetBtn) {
      resetBtn.onclick = () => {
        if (editorInput) {
          editorInput.value = q.starterCode || '';
          answers[current] = editorInput.value;
          const allIndex = levels.slice(0, currentLevel).reduce((sum, item) => sum + item.questions.length, current);
          allAnswers[allIndex] = editorInput.value;
          persistCurrentAnswer();
          updateEditorLineNumbers();
          update();
        }
      };
    }
  } else if (isPredict) {
    // Mode: Text Input (Seal 4: Predict the Output)
    if (optionsContainer) {
      optionsContainer.hidden = true;
      optionsContainer.replaceChildren();
    }
    if (codeEditorWrap) codeEditorWrap.hidden = true;
    if (outputInputWrap) outputInputWrap.hidden = false;

    const codeDisplay = $('terminal-code-display');
    if (codeDisplay) codeDisplay.textContent = q.codeSnippet || '';

    const terminalInput = $('terminal-user-input');
    if (terminalInput) {
      const existingVal = answers[current];
      terminalInput.value = existingVal !== undefined ? existingVal : '';
    }
  } else {
    // Mode: MCQ (Seals 1 & 3)
    if (codeEditorWrap) codeEditorWrap.hidden = true;
    if (outputInputWrap) outputInputWrap.hidden = true;
    if (optionsContainer) {
      optionsContainer.hidden = false;
      optionsContainer.replaceChildren();

      (q.options || []).forEach((option, index) => {
        const label = document.createElement('label');
        label.className = 'answer';

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'answer';
        input.value = index;
        input.checked = answers[current] === index;

        const letter = document.createElement('span');
        letter.className = 'letter';
        letter.textContent = String.fromCharCode(65 + index);

        const text = document.createElement('span');
        text.className = 'answer-text';
        text.textContent = option;

        label.append(input, letter, text);

        if (isBrowser) {
          const kbd = document.createElement('kbd');
          kbd.className = 'key-hint';
          kbd.textContent = String.fromCharCode(65 + index);
          kbd.setAttribute('aria-hidden', 'true');
          label.append(kbd);
        }

        input.addEventListener('change', () => {
          answers[current] = index;
          const allIndex = levels.slice(0, currentLevel).reduce((sum, item) => sum + item.questions.length, current);
          allAnswers[allIndex] = index;
          persistCurrentAnswer(true);
          update();
          if (isBrowser && window.AudioEngine) {
            window.AudioEngine.playSelect();
          }
        });

        optionsContainer.append(label);
      });
    }
  }

  const backBtn = $('back');
  if (backBtn) {
    backBtn.textContent = current ? '← Back' : '← Briefing';
  }

  const nextBtn = $('next');
  if (nextBtn) {
    nextBtn.textContent = current === levelQuestions.length - 1 ? 'Breach the seal →' : 'Continue →';
  }

  update();
}

function updateEditorLineNumbers() {
  const editorInput = $('code-editor-input');
  const lineNumbersEl = $('editor-line-numbers');
  const charCountEl = $('editor-char-count');
  if (!editorInput || !lineNumbersEl) return;

  const lines = editorInput.value.split('\n');
  const count = lines.length;
  let numbers = '';
  for (let i = 1; i <= count; i++) {
    numbers += i + '\n';
  }
  lineNumbersEl.textContent = numbers;
  if (charCountEl) {
    charCountEl.textContent = `${count} ${count === 1 ? 'line' : 'lines'}`;
  }
}

function update() {
  const level = levels[currentLevel];
  const q = level ? level.questions[current] : null;
  const ans = answers[current];
  let isAnswered = false;

  const questionMode = getQuestionMode(level, q);
  if (questionMode === 'code') {
    isAnswered = typeof ans === 'string' && ans.trim().length > 0;
  } else if (questionMode === 'predict') {
    isAnswered = typeof ans === 'string' && ans.trim().length > 0;
  } else {
    isAnswered = ans !== undefined;
  }

  const nextBtn = $('next');
  if (nextBtn) nextBtn.disabled = !isAnswered;

  const statusEl = $('selection-status');
  if (statusEl) {
    if (!isAnswered) {
      statusEl.textContent = questionMode === 'code'
        ? 'Code required'
        : questionMode === 'predict'
        ? 'Type output above'
        : 'Select an answer';
    } else {
      statusEl.textContent = questionMode === 'code'
        ? 'Code ready to submit'
        : questionMode === 'predict'
        ? 'Prediction entered'
        : 'Answer sealed';
    }
  }
}

function formatQuestionText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]*\n+[ \t]*/g, '\n\n')
    .replace(/\s+(Part\s*2:)/gi, '\n\n$1')
    .trim();
}

function getQuestionMode(level, q) {
  if (!q) {
    if (level && level.type === 'code_editor') return 'code';
    if (level && level.type === 'predict_output') return 'predict';
    return 'mcq';
  }
  if (q.questionType === 'code' || q.questionType === 'code_editor') return 'code';
  if (q.questionType === 'predict_output') return 'predict';
  if (q.questionType === 'mcq') return 'mcq';
  if (Array.isArray(q.options) && q.options.length) return 'mcq';
  if (typeof q.starterCode === 'string') return 'code';
  if (typeof q.codeSnippet === 'string') return 'predict';
  if (level && level.type === 'code_editor') return 'code';
  if (level && level.type === 'predict_output') return 'predict';
  return 'mcq';
}

async function finishLevel() {
  if (isFinishingLevel) return;
  isFinishingLevel = true;
  const level = levels[currentLevel];
  // Ensure the last answer in this seal has reached the server before advancing.
  if (level) {
    if (draftSaveTimer) clearTimeout(draftSaveTimer);
    await saveSealDraft(currentLevel + 1, collectCurrentSealAnswers());
  }
  isFinishingLevel = false;

  currentLevel++;
  setCorruption([8, 31, 54, 77, 100][currentLevel] || 100);
  logMission(currentLevel === levels.length
    ? 'SEAL 04: BREACHED. All four seals are open. Portal activity detected.'
    : `SEAL ${String(currentLevel).padStart(2, '0')}: BREACHED. The Phantom is moving deeper into the network.`);

  $('seal-result-title').textContent = `SEAL ${String(currentLevel).padStart(2, '0')}: BREACHED`;
  $('seal-result-copy').textContent = currentLevel === levels.length
    ? 'All four seals are unlocked. The portal is responding to something on the other side.'
    : `${level.title} complete. The Phantom has noticed your progress.`;
  renderSealStatus('mini-seals');
  const continueButton = $('seal-continue');
  continueButton.innerHTML = currentLevel === levels.length
    ? 'Continue to final verification <span>→</span>'
    : 'Return to mission dashboard <span>→</span>';

  show('seal-result');
  const title = $('seal-result-title');
  if (title && typeof title.focus === 'function') title.focus();
  if (isBrowser && window.AudioEngine) window.AudioEngine.playSeal();
}

function renderSealStatus(containerId) {
  const container = $(containerId);
  if (!container) return;
  container.replaceChildren();
  levels.forEach((level, index) => {
    const seal = document.createElement('span');
    seal.className = index < currentLevel ? 'mini-seal is-breached' : 'mini-seal';
    seal.textContent = `${String(index + 1).padStart(2, '0')} · ${index < currentLevel ? 'BREACHED' : 'LOCKED'}`;
    container.append(seal);
  });
}

function sealAndConfirm() {
  // Submit all 4 seals to server silently
  const answersBySeal = {};
  let qIdx = 0;
  levels.forEach((lvl, sIdx) => {
    const sealNum = sIdx + 1;
    const sMap = {};
    lvl.questions.forEach((q, qIndex) => {
      const qKey = q.questionKey || `seal${sealNum}_q${qIndex + 1}`;
      sMap[qKey] = allAnswers[qIdx];
      qIdx++;
    });
    answersBySeal[`seal_${sealNum}`] = sMap;
  });

  const submissionPromise = submitFinalQuiz(answersBySeal);

  // Keep ending view with ENTITY ESCAPED visible, show sealed message below it
  show('ending');
  const ending = $('ending');
  const status = $('ending-status');
  const cinema = $('ending-cinema');
  const skip = $('skip-ending');
  const escaped = $('entity-escaped');
  const sealed = $('ending-sealed');
  const cinemaArt = cinema ? cinema.querySelector('.cinema-art') : null;
  const caption = $('voiceover-caption');

  // Hide skip button and prelude status text
  if (skip) skip.hidden = true;
  if (status) status.hidden = true;

  // Keep cinema container visible but hide the animation art
  if (cinema) cinema.hidden = false;
  if (cinemaArt) cinemaArt.hidden = true;
  if (caption) caption.textContent = '';

  // Ensure ENTITY ESCAPED heading stays visible
  if (escaped) escaped.hidden = false;

  // Reveal the sealed confirmation beneath the escaped title
  if (sealed) sealed.hidden = false;

  if (ending) {
    ending.classList.remove('is-glitching', 'is-static', 'is-blackout');
  }

  activateRound2Portal(submissionPromise);
}

function activateRound2Portal(submissionPromise) {
  const handoff = $('round2-handoff');
  const lockedCard = $('r1R2LockedCard');
  const unlockedCard = $('r1R2UnlockedCard');
  const countdownEl = $('round2-countdown');
  const copyEl = $('round2-handoff-copy');
  if (handoff) handoff.hidden = false;

  if (currentTeam) {
    currentTeam.isSubmitted = true;
    syncRound2LocalStorage(currentTeam);
    const teamLabel = currentTeam.customTeamName || currentTeam.teamName;
    if (copyEl && teamLabel) {
      copyEl.textContent = `Team "${teamLabel}" — your Round 1 record is sealed in the Crypt Ledger. Step through the portal to spin the Wheel of Curses in Round 2.`;
    }
  }

  if (!isBrowser) return;

  async function checkServerR2Gate() {
    try {
      const res = await fetch('/api/round2/state');
      if (res.ok) {
        const data = await res.json();
        return Boolean(data.round2Unlocked);
      }
    } catch {}
    return false;
  }

  function triggerRound2Transition() {
    if (lockedCard) lockedCard.hidden = true;
    if (unlockedCard) unlockedCard.hidden = false;

    if (round2RedirectTimer) clearInterval(round2RedirectTimer);
    let secondsLeft = 3;
    if (countdownEl) {
      countdownEl.textContent = `Host clearance granted! Opening Round 2 in ${secondsLeft}s...`;
    }

    Promise.resolve(submissionPromise).finally(() => {
      round2RedirectTimer = setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft > 0) {
          if (countdownEl) {
            countdownEl.textContent = `Opening Round 2 in ${secondsLeft}s...`;
          }
        } else {
          clearInterval(round2RedirectTimer);
          round2RedirectTimer = null;
          if (countdownEl) {
            countdownEl.textContent = 'Entering Round 2...';
          }
          window.location.href = '/round2/';
        }
      }, 1000);
    });
  }

  checkServerR2Gate().then(isUnlocked => {
    if (!isUnlocked) {
      if (lockedCard) lockedCard.hidden = false;
      if (unlockedCard) unlockedCard.hidden = true;

      // Poll every 2.5s until host allows access
      const poller = setInterval(async () => {
        if (document.hidden) return;
        const opened = await checkServerR2Gate();
        if (opened) {
          clearInterval(poller);
          triggerRound2Transition();
        }
      }, 2500);
    } else {
      triggerRound2Transition();
    }
  });
}

function beginEnding() {
  show('ending');
  const status = $('ending-status');
  const cinema = $('ending-cinema');
  const caption = $('voiceover-caption');
  const escaped = $('entity-escaped');
  const ending = $('ending');
  const skip = $('skip-ending');
  if (cinema) cinema.hidden = true;
  if (escaped) escaped.hidden = true;
  if (skip) skip.hidden = false;
  if (ending) ending.classList.remove('is-blackout', 'is-static');

  const prelude = [
    ['VERIFYING FINAL RESPONSE...', 1100],
    ['CHECKING SECURITY SEALS...', 1100],
    ['ACCESS GRANTED.', 1200],
    ['YOU SHOULD NOT HAVE OPENED THAT DOOR.', 1700]
  ];
  const captions = [
    ['Four seals broken.', 'seals', 2100],
    ['Containment failed.', 'portal', 2100],
    ['The entity has escaped.', 'entity', 2300],
    ['You did not stop the Phantom.', 'static', 2200],
    ['You let it out.', 'static', 2200]
  ];
  let step = 0;
  const playPrelude = () => {
    if (step >= prelude.length) {
      if (ending) ending.classList.add('is-blackout');
      sequenceTimer = setTimeout(() => {
        if (status) status.hidden = true;
        if (cinema) cinema.hidden = false;
        playCaption(0);
      }, 750);
      return;
    }
    if (status) status.textContent = prelude[step][0];
    if (step === 2 && ending) {
      ending.classList.add('is-glitching');
      if (isBrowser && window.AudioEngine) window.AudioEngine.playGlitch();
    }
    if (step === 3 && ending) {
    ending.classList.remove('is-glitching');
    ending.classList.add('is-shadow-flash');
    setTimeout(() => ending.classList.remove('is-shadow-flash'), 240);
    }
    sequenceTimer = setTimeout(() => {
      step++;
      playPrelude();
    }, prelude[step][1]);
  };
  const playCaption = index => {
    if (index >= captions.length) {
      if (isBrowser && window.AudioEngine) window.AudioEngine.stopVoiceover();
      if (caption) caption.textContent = '';
      if (escaped) escaped.hidden = false;
      sequenceTimer = setTimeout(sealAndConfirm, 2600);
      return;
    }
    const [text, scene, duration] = captions[index];
    if (caption) caption.textContent = text;
    if (isBrowser && window.AudioEngine) window.AudioEngine.speakLine(text);
    if (cinema) cinema.dataset.scene = scene;
    if (ending) ending.classList.toggle('is-static', scene === 'static');
    sequenceTimer = setTimeout(() => playCaption(index + 1), duration);
  };
  playPrelude();
}

function stopSequence() {
  if (sequenceTimer) clearTimeout(sequenceTimer);
  sequenceTimer = null;
}

// Event Listeners for Quiz Flow
const startBtn = $('start');
if (startBtn) {
  startBtn.addEventListener('click', beginOpening);
}

const skipOpeningBtn = $('skip-opening');
if (skipOpeningBtn) {
  skipOpeningBtn.addEventListener('click', () => {
    stopSequence();
    show('intro');
    updateDashboard();
  });
}

const beginLevelBtn = $('begin-level');
if (beginLevelBtn) {
  beginLevelBtn.addEventListener('click', () => {
    const level = levels[currentLevel];
    answers = level ? level.questions.map((question, index) => {
      const allIndex = levels.slice(0, currentLevel).reduce((sum, item) => sum + item.questions.length, index);
      return allAnswers[allIndex];
    }) : [];
    const maxIndex = level && level.questions ? Math.max(0, level.questions.length - 1) : 0;
    current = Math.min(Math.max(0, resumeQuestionIndex), maxIndex);
    resumeQuestionIndex = 0;
    show('trial');
    render();
    if (isBrowser && window.AudioEngine) window.AudioEngine.playAdvance();
  });
}

if (document.querySelectorAll) {
  document.querySelectorAll('.seal-card').forEach(card => {
    card.addEventListener('click', () => {
      if (Number(card.dataset.level) !== currentLevel) return;
      triggerJumpscareBriefing();
    });
  });
}

const deployBtn = $('deploy-level');
if (deployBtn) {
  deployBtn.addEventListener('click', () => {
    if (currentLevel >= levels.length) {
      beginEnding();
      return;
    }
    triggerJumpscareBriefing();
  });
}

const nextBtn = $('next');
if (nextBtn) {
  nextBtn.addEventListener('click', () => {
    if (answers[current] === undefined) return;
    if (isBrowser && window.AudioEngine) {
      window.AudioEngine.playAdvance();
    }
    if (current === levels[currentLevel].questions.length - 1) {
      finishLevel();
    } else {
      current++;
      render();
    }
  });
}

const backBtn = $('back');
if (backBtn) {
  backBtn.addEventListener('click', () => {
    if (current) {
      current--;
      render();
    } else {
      showBriefing();
    }
  });
}

const sealContinueBtn = $('seal-continue');
if (sealContinueBtn) {
  sealContinueBtn.addEventListener('click', () => {
    if (currentLevel === levels.length) {
      beginEnding();
      return;
    }
    show('intro');
    updateDashboard();
  });
}

const skipEndingBtn = $('skip-ending');
if (skipEndingBtn) {
  skipEndingBtn.addEventListener('click', () => {
    stopSequence();
    if (isBrowser && window.AudioEngine) window.AudioEngine.stopVoiceover();
    sealAndConfirm();
  });
}

// Code Editor Input Listeners (Tab indentation, auto-line numbers, state sync)
const codeEditorInput = $('code-editor-input');
if (codeEditorInput) {
  codeEditorInput.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = codeEditorInput.selectionStart;
      const end = codeEditorInput.selectionEnd;
      const val = codeEditorInput.value;
      const spaces = '    '; // 4 spaces for proper code editor indentation
      codeEditorInput.value = val.substring(0, start) + spaces + val.substring(end);
      codeEditorInput.selectionStart = codeEditorInput.selectionEnd = start + spaces.length;

      answers[current] = codeEditorInput.value;
      const allIndex = levels.slice(0, currentLevel).reduce((sum, item) => sum + item.questions.length, current);
      allAnswers[allIndex] = codeEditorInput.value;
      persistCurrentAnswer();
      updateEditorLineNumbers();
      update();
    }
  });

  codeEditorInput.addEventListener('input', () => {
    answers[current] = codeEditorInput.value;
    const allIndex = levels.slice(0, currentLevel).reduce((sum, item) => sum + item.questions.length, current);
    allAnswers[allIndex] = codeEditorInput.value;
    persistCurrentAnswer();
    updateEditorLineNumbers();
    update();
  });

  codeEditorInput.addEventListener('scroll', () => {
    const lineNumbersEl = $('editor-line-numbers');
    if (lineNumbersEl) {
      lineNumbersEl.scrollTop = codeEditorInput.scrollTop;
    }
  });
}

// Terminal Output Predictor Input Listener
const terminalUserInput = $('terminal-user-input');
if (terminalUserInput) {
  terminalUserInput.addEventListener('input', () => {
    answers[current] = terminalUserInput.value;
    const allIndex = levels.slice(0, currentLevel).reduce((sum, item) => sum + item.questions.length, current);
    allAnswers[allIndex] = terminalUserInput.value;
    persistCurrentAnswer();
    update();
  });
}

// One continuous soundtrack across screens; the existing button controls all sound.
const soundBtn = $('sound');
let soundEnabled = true;
let soundChosen = false;
async function setSoundEnabled(enabled) {
  soundEnabled = enabled;
  if (soundBtn) {
    soundBtn.textContent = enabled ? 'Sound on \u266b' : 'Sound off \u266b';
    soundBtn.setAttribute('aria-pressed', String(enabled));
    soundBtn.setAttribute('aria-label', enabled ? 'Turn sound off' : 'Turn sound on');
  }
  if (isBrowser && window.AudioEngine) window.AudioEngine.setEnabled(enabled);
  try {
    if (isBrowser && window.BackgroundMusic) await window.BackgroundMusic.setEnabled(enabled);
  } catch {
    soundEnabled = false;
    if (isBrowser && window.AudioEngine) window.AudioEngine.setEnabled(false);
    if (soundBtn) {
      soundBtn.textContent = 'Retry sound \u266b';
      soundBtn.setAttribute('aria-pressed', 'false');
      soundBtn.setAttribute('aria-label', 'Retry enabling sound');
    }
  }
}
if (soundBtn) {
  soundBtn.addEventListener('click', () => {
    soundChosen = true;
    setSoundEnabled(!soundEnabled);
  });
}
if (isBrowser) {
  // Sound is on by default; browsers unlock playback on the first user gesture.
  const unlockSound = event => {
    if (soundChosen || !event.isTrusted || event.target?.closest?.('#sound')) return;
    // Touch/pen activation is granted on release; a mouse can start on press.
    if (event.type === 'pointerdown' && event.pointerType !== 'mouse') return;
    if (event.type === 'keydown' && (event.ctrlKey || event.metaKey || event.altKey || event.key === 'Tab')) return;
    soundChosen = true;
    setSoundEnabled(true);
    ['pointerdown', 'pointerup', 'click', 'keydown'].forEach(type => {
      document.removeEventListener(type, unlockSound, true);
    });
  };
  ['pointerdown', 'pointerup', 'click', 'keydown'].forEach(type => {
    document.addEventListener(type, unlockSound, { capture: true });
  });
}

// =========================================================
// BROWSER-ONLY ENHANCEMENTS: Audio Engine, Canvas Motes,
// Flashlight, Lightning, Spider, Keyboard Shortcuts & Share
// =========================================================
if (isBrowser) {
  window.addEventListener('online', () => {
    syncLocalDraft();
    if (levels[currentLevel]) persistCurrentAnswer(true);
  });
  window.addEventListener('pagehide', () => {
    if (levels[currentLevel]) persistCurrentAnswer(true);
  });

  // 1. Audio Engine (Pure Web Audio API Synthesizer)
  let audioCtx = null;
  let audioEnabled = false;

  const initAudio = () => {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  };

  window.AudioEngine = {
    setEnabled(val) {
      audioEnabled = val;
      if (val) initAudio();
      else this.stopVoiceover();
    },
    playSelect() {
      if (!audioEnabled) return;
      initAudio();
      if (!audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(70, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } catch (e) {}
    },
    playAdvance() {
      if (!audioEnabled) return;
      initAudio();
      if (!audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      } catch (e) {}
    },
    playFinish(won) {
      if (!audioEnabled) return;
      initAudio();
      if (!audioCtx) return;
      try {
        const notes = won ? [220, 277, 330, 440] : [220, 207, 196, 175];
        notes.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = won ? 'sine' : 'sawtooth';
          osc.frequency.value = freq;
          const start = audioCtx.currentTime + idx * 0.14;
          gain.gain.setValueAtTime(0.1, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(start);
          osc.stop(start + 0.5);
        });
      } catch (e) {}
    },
    playSeal() {
      if (!audioEnabled) return;
      initAudio();
      if (!audioCtx) return;
      try {
          [330, 494, 659].forEach((frequency, index) => {
            const oscillator = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const start = audioCtx.currentTime + index * 0.1;
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;
            gain.gain.setValueAtTime(0.08, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
            oscillator.connect(gain);
            gain.connect(audioCtx.destination);
            oscillator.start(start);
            oscillator.stop(start + 0.35);
          });
      } catch (e) {}
    },
    playGlitch() {
      if (!audioEnabled) return;
      initAudio();
      if (!audioCtx) return;
      const oscillator = audioCtx.createOscillator();
      const subOscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(92, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(38, audioCtx.currentTime + 0.42);
      subOscillator.type = 'square';
      subOscillator.frequency.setValueAtTime(57, audioCtx.currentTime);
      subOscillator.frequency.exponentialRampToValueAtTime(31, audioCtx.currentTime + 0.42);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.42);
      oscillator.connect(gain);
      subOscillator.connect(gain);
      gain.connect(audioCtx.destination);
      oscillator.start();
      subOscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.42);
      subOscillator.stop(audioCtx.currentTime + 0.42);
    },
    playJumpscare() {
      if (!audioEnabled) return;
      initAudio();
      if (!audioCtx) return;
      try {
        const now = audioCtx.currentTime;
        const screech = audioCtx.createOscillator();
        const screechGain = audioCtx.createGain();
        screech.type = 'sawtooth';
        screech.frequency.setValueAtTime(880, now);
        screech.frequency.exponentialRampToValueAtTime(140, now + 0.7);
        screechGain.gain.setValueAtTime(0.28, now);
        screechGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
        screech.connect(screechGain);
        screechGain.connect(audioCtx.destination);
        screech.start(now);
        screech.stop(now + 0.75);

        const boom = audioCtx.createOscillator();
        const boomGain = audioCtx.createGain();
        boom.type = 'triangle';
        boom.frequency.setValueAtTime(160, now);
        boom.frequency.exponentialRampToValueAtTime(32, now + 0.85);
        boomGain.gain.setValueAtTime(0.4, now);
        boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        boom.connect(boomGain);
        boomGain.connect(audioCtx.destination);
        boom.start(now);
        boom.stop(now + 0.9);

        const dso = audioCtx.createOscillator();
        const dsoGain = audioCtx.createGain();
        dso.type = 'square';
        dso.frequency.setValueAtTime(666, now);
        dso.frequency.exponentialRampToValueAtTime(55, now + 0.6);
        dsoGain.gain.setValueAtTime(0.18, now);
        dsoGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        dso.connect(dsoGain);
        dsoGain.connect(audioCtx.destination);
        dso.start(now);
        dso.stop(now + 0.65);
      } catch (e) {}
    },
    speakLine(text) {
      if (!audioEnabled || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
      this.stopVoiceover();
      const narration = new window.SpeechSynthesisUtterance(text);
      narration.lang = 'en-US';
      narration.rate = 1.15;
      narration.pitch = 0.75;
      window.speechSynthesis.speak(narration);
    },
    stopVoiceover() {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
  };

  // 2. Keyboard Navigation
  document.addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'TEXTAREA') {
      // In code editor, Enter creates a new line without auto-advancing
      return;
    }
    if (e.target && e.target.tagName === 'INPUT') {
      if (e.key === 'Enter') {
        const nextEl = $('next');
        if (nextEl && !nextEl.disabled) nextEl.click();
      }
      return;
    }

    const trialEl = $('trial');
    const isTrialActive = trialEl && !trialEl.hidden;

    if (isTrialActive) {
      const key = e.key.toUpperCase();
      let optionIndex = -1;
      if (['A', '1'].includes(key)) optionIndex = 0;
      else if (['B', '2'].includes(key)) optionIndex = 1;
      else if (['C', '3'].includes(key)) optionIndex = 2;
      else if (['D', '4'].includes(key)) optionIndex = 3;

      if (optionIndex >= 0) {
        const optionsContainer = $('options');
        if (optionsContainer && optionsContainer.children[optionIndex]) {
          const radio = optionsContainer.children[optionIndex].querySelector('input');
          if (radio) {
            radio.checked = true;
            answers[current] = optionIndex;
            const allIndex = levels.slice(0, currentLevel).reduce((sum, item) => sum + item.questions.length, current);
            allAnswers[allIndex] = optionIndex;
            persistCurrentAnswer(true);
            update();
            if (window.AudioEngine) window.AudioEngine.playSelect();
          }
        }
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        const nextEl = $('next');
        if (nextEl && !nextEl.disabled) {
          e.preventDefault();
          nextEl.click();
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        const backEl = $('back');
        if (backEl) {
          e.preventDefault();
          backEl.click();
        }
      }
    } else {
      const openingEl = $('opening');
      const dashboardEl = $('intro');
      const briefingEl = $('briefing');
      const sealEl = $('seal-result');
      if (openingEl && !openingEl.hidden && (e.key === 'Enter' || e.key === ' ')) {
        const startEl = $('start');
        if (startEl && !startEl.hidden) {
          e.preventDefault();
          startEl.click();
        }
      }
      if (dashboardEl && !dashboardEl.hidden && (e.key === 'Enter' || e.key === ' ')) {
        const deployEl = $('deploy-level');
        if (deployEl) {
          e.preventDefault();
          deployEl.click();
        }
      }
      if (briefingEl && !briefingEl.hidden && (e.key === 'Enter' || e.key === ' ')) {
        const beginEl = $('begin-level');
        if (beginEl) {
          e.preventDefault();
          beginEl.click();
        }
      }
      if (sealEl && !sealEl.hidden && (e.key === 'Enter' || e.key === ' ')) {
        const continueEl = $('seal-continue');
        if (continueEl) {
          e.preventDefault();
          continueEl.click();
        }
      }
    }
  });

  // 3. Floating Motes Canvas (Offscreen stamp + 30fps cap for low CPU usage)
  const motesCanvas = $('motes');
  if (motesCanvas && motesCanvas.getContext) {
    const ctx = motesCanvas.getContext('2d');
    let motes = [];
    let w = (motesCanvas.width = window.innerWidth);
    let h = (motesCanvas.height = window.innerHeight);

    // Pre-render glowing ember sprite once to avoid per-frame arc/fill overhead
    const sprite = document.createElement('canvas');
    sprite.width = 16;
    sprite.height = 16;
    const sCtx = sprite.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(8, 8, 0.5, 8, 8, 7.5);
      grad.addColorStop(0, 'rgba(255, 165, 80, 1)');
      grad.addColorStop(0.45, 'rgba(255, 105, 40, 0.65)');
      grad.addColorStop(1, 'rgba(255, 70, 20, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 16, 16);
    }

    const resizeCanvas = () => {
      w = motesCanvas.width = window.innerWidth;
      h = motesCanvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas, { passive: true });

    const moteCount = Math.min(36, Math.floor(window.innerWidth / 32));
    for (let i = 0; i < moteCount; i++) {
      motes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.8 + 0.7,
        alpha: Math.random() * 0.55 + 0.2,
        speedY: -(Math.random() * 0.7 + 0.35),
        speedX: (Math.random() - 0.5) * 0.45,
        seed: Math.random() * 100
      });
    }

    let animFrame = null;
    let lastTime = 0;

    const renderMotes = time => {
      if (document.visibilityState === 'hidden') return;
      if (time - lastTime >= 32) {
        lastTime = time;
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < motes.length; i++) {
          const m = motes[i];
          m.y += m.speedY;
          m.x += m.speedX + Math.sin(time * 0.0014 + m.seed) * 0.3;

          if (m.y < -12) {
            m.y = h + 12;
            m.x = Math.random() * w;
          }

          const size = m.r * 5;
          ctx.globalAlpha = m.alpha;
          ctx.drawImage(sprite, m.x - size * 0.5, m.y - size * 0.5, size, size);
        }
        ctx.globalAlpha = 1;
      }
      animFrame = requestAnimationFrame(renderMotes);
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        lastTime = performance.now();
        animFrame = requestAnimationFrame(renderMotes);
      } else if (animFrame) {
        cancelAnimationFrame(animFrame);
        animFrame = null;
      }
    });

    animFrame = requestAnimationFrame(renderMotes);
  }

  // 4. Mouse Candlelight / Flashlight
  const flashlight = document.querySelector('.flashlight');
  if (flashlight) {
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight * 0.4;
    let rafId = null;

    const updateLight = () => {
      flashlight.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      rafId = null;
    };

    window.addEventListener(
      'mousemove',
      e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (!rafId) rafId = requestAnimationFrame(updateLight);
      },
      { passive: true }
    );
  }

  // 5. Interactive Dangling Spider
  const spider = $('spider');
  if (spider) {
    const fleeSpider = () => {
      if (spider.classList.contains('flee')) return;
      spider.classList.add('flee');
      setTimeout(() => {
        spider.classList.remove('flee');
      }, 4200);
    };
    spider.addEventListener('click', fleeSpider);
    spider.addEventListener('mouseenter', fleeSpider);
  }

  // 6. Lightning Storm Engine
  const triggerLightning = () => {
    const delays = [0, 45, 80, 150, 190, 260];
    const opacities = [0.85, 0.15, 1.0, 0.2, 0.7, 0];

    delays.forEach((delay, idx) => {
      setTimeout(() => {
        const val = opacities[idx];
        document.documentElement.style.setProperty('--lit', val);
        if (val > 0.3) {
          document.body.classList.add('lit');
        } else {
          document.body.classList.remove('lit');
        }
      }, delay);
    });

    const nextInterval = Math.random() * 16000 + 16000;
    setTimeout(triggerLightning, nextInterval);
  };
  setTimeout(triggerLightning, 12000);

  // 7. Bat Spawner
  const batsContainer = $('bats');
  if (batsContainer) {
    const spawnBat = () => {
      const bat = document.createElement('div');
      const rtl = Math.random() > 0.5;
      bat.className = `bat ${rtl ? 'rtl' : ''}`;
      bat.style.setProperty('--y', `${Math.random() * 35 + 10}%`);
      bat.style.setProperty('--s', `${Math.random() * 16 + 26}px`);
      bat.style.setProperty('--d', `${Math.random() * 4 + 7}s`);
      bat.innerHTML = `
        <svg viewBox="0 0 48 24">
          <path class="wing l" fill="#040102" d="M24 14 C18 4 6 2 0 10 C6 18 16 16 24 14 Z"/>
          <path class="wing r" fill="#040102" d="M24 14 C30 4 42 2 48 10 C42 18 32 16 24 14 Z"/>
          <ellipse cx="24" cy="14" rx="3.5" ry="5.5" fill="#040102"/>
        </svg>
      `;
      batsContainer.append(bat);
      bat.addEventListener('animationend', () => bat.remove());

      setTimeout(spawnBat, Math.random() * 18000 + 12000);
    };
    setTimeout(spawnBat, 8000);
  }

  // 9. Team Authentication, Team Name Setup & Resume Handling
  const authForm = $('auth-form');
  const authStatus = $('auth-status');
  const authEmail = $('auth-email');
  const authPhone = $('auth-phone');
  const authTeamName = $('auth-team-name');
  const resumeTeamInput = $('resume-team-input');
  const authSubmitBtn = $('auth-submit-btn');

  const authModeTabs = $('auth-mode-tabs');
  const tabVerifyCreds = $('tab-verify-creds');
  const tabResumeTeam = $('tab-resume-team');
  const authCredentialsGroup = $('auth-credentials-group');
  const authResumeGroup = $('auth-resume-group');

  const teamDetailsPanel = $('team-details-panel');
  const teamDisplayName = $('team-display-name');
  const teamDisplayLeader = $('team-display-leader');
  const teamDisplaySize = $('team-display-size');
  const teamMembersList = $('team-members-list');
  const teamProgressBadge = $('team-progress-badge');
  const teamNameSetupBox = $('team-name-setup-box');
  const teamNameSetupLabel = $('team-name-setup-label');
  const teamNameSetupNote = $('team-name-setup-note');
  const teamCustomNameInput = $('team-custom-name-input');
  const saveTeamNameBtn = $('save-team-name-btn');
  const authSwitchBtn = $('auth-switch-btn');
  const proceedQuizBtn = $('proceed-quiz-btn');

  let authMode = 'verify'; // 'verify' | 'resume'

  function setAuthMode(mode) {
    authMode = mode === 'resume' ? 'resume' : 'verify';
    if (tabVerifyCreds) {
      tabVerifyCreds.classList.toggle('is-active', authMode === 'verify');
      tabVerifyCreds.setAttribute('aria-selected', String(authMode === 'verify'));
    }
    if (tabResumeTeam) {
      tabResumeTeam.classList.toggle('is-active', authMode === 'resume');
      tabResumeTeam.setAttribute('aria-selected', String(authMode === 'resume'));
    }
    if (authCredentialsGroup) authCredentialsGroup.hidden = authMode !== 'verify';
    if (authResumeGroup) authResumeGroup.hidden = authMode !== 'resume';
    if (authEmail) authEmail.required = authMode === 'verify';
    if (authPhone) authPhone.required = authMode === 'verify';
    if (resumeTeamInput) resumeTeamInput.required = authMode === 'resume';
    if (authSubmitBtn) {
      authSubmitBtn.innerHTML = authMode === 'resume'
        ? 'Resume Team Session <span>→</span>'
        : 'Verify clearance <span>→</span>';
    }
    if (authStatus) {
      authStatus.hidden = true;
      authStatus.className = 'auth-status';
      authStatus.textContent = '';
    }
  }

  if (tabVerifyCreds) {
    tabVerifyCreds.addEventListener('click', () => setAuthMode('verify'));
  }
  if (tabResumeTeam) {
    tabResumeTeam.addEventListener('click', () => setAuthMode('resume'));
  }

  function countHydratedAnswers() {
    let count = 0;
    for (let i = 0; i < allAnswers.length; i++) {
      if (hasUsableAnswer(allAnswers[i])) count++;
    }
    return count;
  }

  function renderTeamDetails(team) {
    if (!teamDetailsPanel) return;

    const effectiveName = team.customTeamName || team.teamName || `${team.leaderName}'s Team`;
    if (teamDisplayName) teamDisplayName.textContent = effectiveName;
    if (teamDisplayLeader) teamDisplayLeader.textContent = team.leaderName || '—';
    if (teamDisplaySize) teamDisplaySize.textContent = String(team.teamSize || (team.members ? team.members.length : 1));

    updateHeaderTeamBadge(team, false);
    syncRound2LocalStorage(team);

    if (teamCustomNameInput) {
      teamCustomNameInput.value = team.customTeamName || '';
    }
    if (teamNameSetupBox) {
      teamNameSetupBox.classList.toggle('is-locked', Boolean(team.customTeamName));
    }
    if (teamNameSetupLabel) {
      teamNameSetupLabel.textContent = team.customTeamName
        ? 'OFFICIAL TEAM NAME LOCKED FOR ROUND 1 & ROUND 2'
        : 'SET YOUR OFFICIAL TEAM NAME · REQUIRED BEFORE STARTING';
    }
    if (saveTeamNameBtn) {
      saveTeamNameBtn.textContent = team.customTeamName ? 'Update Name' : 'Lock Team Name';
      saveTeamNameBtn.disabled = Boolean(team.isSubmitted);
    }
    if (teamCustomNameInput) {
      teamCustomNameInput.disabled = Boolean(team.isSubmitted);
    }
    if (teamNameSetupNote) {
      teamNameSetupNote.textContent = team.customTeamName
        ? `Team "${team.customTeamName}" is bound in the Crypt Ledger. You can resume anytime on any device using this name.`
        : 'Choose a unique Team Name (2–48 chars). It will track your marks in Admin and carry directly into Round 2.';
    }

    if (teamMembersList) {
      teamMembersList.innerHTML = '';
      const members = Array.isArray(team.members) && team.members.length > 0
        ? team.members
        : [
            { role: 'Team Leader', name: team.leaderName, email: null },
            ...(team.member2Name ? [{ role: 'Member 2', name: team.member2_name || team.member2Name, email: null }] : [])
          ];

      members.forEach(m => {
        const li = document.createElement('li');
        li.className = 'team-member-card';

        const meta = document.createElement('div');
        meta.className = 'team-member-meta';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'team-member-name';
        nameSpan.textContent = m.name || 'Anonymous';
        meta.appendChild(nameSpan);

        if (m.email) {
          const emailSpan = document.createElement('span');
          emailSpan.className = 'team-member-email';
          emailSpan.textContent = m.email;
          meta.appendChild(emailSpan);
        }

        const roleSpan = document.createElement('span');
        const isLeader = (m.role || '').toLowerCase().includes('leader');
        roleSpan.className = `team-member-role-badge ${isLeader ? 'leader' : 'member'}`;
        roleSpan.textContent = m.role || 'Member';

        li.appendChild(meta);
        li.appendChild(roleSpan);
        teamMembersList.appendChild(li);
      });
    }

    if (authForm) authForm.hidden = true;
    if (authModeTabs) authModeTabs.hidden = true;
    teamDetailsPanel.hidden = false;

    const answeredSoFar = Math.max(Number(team.answeredCount) || 0, countHydratedAnswers());
    const teamPanelSub = $('team-display-sub');

    if (team.isSubmitted) {
      fetch('/api/round2/state').then(r => r.json()).then(data => {
        const isUnlocked = Boolean(data && data.round2Unlocked);
        if (!isUnlocked) {
          if (teamProgressBadge) {
            teamProgressBadge.hidden = false;
            teamProgressBadge.textContent = 'ROUND 1 SEALED · WAIT FOR HOST TO CONTINUE';
          }
          if (teamPanelSub) {
            teamPanelSub.textContent = 'Your Round 1 responses are sealed. Round 2 is currently locked by the event host. Please wait!';
          }
          if (proceedQuizBtn) {
            proceedQuizBtn.disabled = true;
            proceedQuizBtn.innerHTML = '🔒 Round 2 Locked by Host';
          }
          const p = setInterval(async () => {
            if (document.hidden) return;
            try {
              const r2 = await fetch('/api/round2/state');
              if (r2.ok) {
                const d = await r2.json();
                if (d && d.round2Unlocked) {
                  clearInterval(p);
                  if (teamProgressBadge) teamProgressBadge.textContent = 'ROUND 1 SEALED · ROUND 2 UNLOCKED';
                  if (teamPanelSub) teamPanelSub.textContent = 'Access granted! Proceed to Round 2 (The Wheel of Curses).';
                  if (proceedQuizBtn) {
                    proceedQuizBtn.disabled = false;
                    proceedQuizBtn.innerHTML = 'Proceed to Round 2 · Wheel of Curses <span>→</span>';
                  }
                }
              }
            } catch {}
          }, 2500);
        } else {
          if (teamProgressBadge) {
            teamProgressBadge.hidden = false;
            teamProgressBadge.textContent = 'ROUND 1 SEALED · ROUND 2 UNLOCKED';
          }
          if (teamPanelSub) {
            teamPanelSub.textContent = 'Round 1 answers are sealed in the Crypt Ledger. Proceed to Round 2 (The Wheel of Curses)!';
          }
          if (proceedQuizBtn) {
            proceedQuizBtn.disabled = false;
            proceedQuizBtn.innerHTML = 'Proceed to Round 2 · Wheel of Curses <span>→</span>';
          }
        }
      }).catch(() => {
        if (proceedQuizBtn) {
          proceedQuizBtn.disabled = false;
          proceedQuizBtn.innerHTML = 'Proceed to Round 2 · Wheel of Curses <span>→</span>';
        }
      });
    } else if (answeredSoFar > 0) {
      const sealNum = Math.min(4, Math.max(1, currentLevel + 1));
      if (teamProgressBadge) {
        teamProgressBadge.hidden = false;
        teamProgressBadge.textContent = `SAVED PROGRESS · SEAL 0${sealNum} (${answeredSoFar}/20)`;
      }
      if (teamPanelSub) {
        teamPanelSub.textContent = `Welcome back! ${answeredSoFar} of 20 responses restored from the Crypt Ledger.`;
      }
      if (proceedQuizBtn) {
        proceedQuizBtn.disabled = false;
        proceedQuizBtn.innerHTML = `Resume at Seal 0${sealNum} <span>→</span>`;
      }
    } else {
      if (teamProgressBadge) {
        teamProgressBadge.hidden = false;
        teamProgressBadge.textContent = 'SEAL 01 READY';
      }
      if (teamPanelSub) teamPanelSub.textContent = 'Roster verified in crypt registry';
      if (proceedQuizBtn) {
        proceedQuizBtn.disabled = false;
        proceedQuizBtn.innerHTML = 'Enter Crypt Trials <span>→</span>';
      }
    }
  }

  async function saveCustomTeamName(rawName) {
    const cleaned = String(rawName || '').trim();
    if (!cleaned || cleaned.length < 2) {
      if (teamNameSetupNote) {
        teamNameSetupNote.textContent = '⚠ Please enter a valid Team Name (at least 2 characters).';
      }
      if (teamCustomNameInput) teamCustomNameInput.focus();
      return false;
    }

    if (saveTeamNameBtn) {
      saveTeamNameBtn.disabled = true;
      saveTeamNameBtn.textContent = 'Locking...';
    }

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_team_name',
          teamName: cleaned
        })
      });
      const data = await res.json();
      if (!res.ok) {
        if (teamNameSetupNote) {
          teamNameSetupNote.textContent = `⚠ ${data.error || 'Could not save Team Name.'}`;
        }
        return false;
      }

      currentTeam = {
        ...(currentTeam || {}),
        ...data,
        teamName: data.teamName || cleaned,
        customTeamName: data.customTeamName || cleaned,
        needsTeamName: false
      };
      renderTeamDetails(currentTeam);
      return true;
    } catch {
      if (teamNameSetupNote) {
        teamNameSetupNote.textContent = '⚠ Network error while saving Team Name. Please retry.';
      }
      return false;
    } finally {
      if (saveTeamNameBtn && currentTeam && !currentTeam.isSubmitted) {
        saveTeamNameBtn.disabled = false;
        saveTeamNameBtn.textContent = currentTeam.customTeamName ? 'Update Name' : 'Lock Team Name';
      }
    }
  }

  if (saveTeamNameBtn) {
    saveTeamNameBtn.addEventListener('click', () => {
      if (!teamCustomNameInput) return;
      saveCustomTeamName(teamCustomNameInput.value);
    });
  }

  function resetAuthView() {
    if (teamDetailsPanel) teamDetailsPanel.hidden = true;
    if (authForm) authForm.hidden = false;
    if (authModeTabs) authModeTabs.hidden = false;
    const teamPanelSub = $('team-display-sub');
    if (teamPanelSub) teamPanelSub.textContent = 'Roster verified in crypt registry';
    if (proceedQuizBtn) {
      proceedQuizBtn.disabled = false;
      proceedQuizBtn.innerHTML = 'Enter Crypt Trials <span>→</span>';
    }
    updateHeaderTeamBadge(null, false);
    setAuthMode(authMode);
  }

  if (authSwitchBtn) {
    authSwitchBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/session', { method: 'DELETE' });
      } catch (err) {
        console.warn('Logout request failed:', err);
      }
      currentTeam = null;
      resetAuthView();
      if (authEmail) authEmail.value = '';
      if (authPhone) authPhone.value = '';
      if (authTeamName) authTeamName.value = '';
      if (resumeTeamInput) resumeTeamInput.value = '';
      if (authMode === 'resume' && resumeTeamInput) resumeTeamInput.focus();
      else if (authEmail) authEmail.focus();
    });
  }

  if (proceedQuizBtn) {
    proceedQuizBtn.addEventListener('click', async () => {
      if (!currentTeam) return;

      // If Round 1 is already submitted, transition immediately to Round 2
      if (currentTeam.isSubmitted) {
        syncRound2LocalStorage(currentTeam);
        window.location.href = '/round2/';
        return;
      }

      // Ensure Official Team Name is set and saved before entering
      const typedName = teamCustomNameInput ? teamCustomNameInput.value.trim() : '';
      if (typedName && typedName !== (currentTeam.customTeamName || '')) {
        const ok = await saveCustomTeamName(typedName);
        if (!ok) return;
      } else if (!currentTeam.customTeamName) {
        const ok = await saveCustomTeamName(typedName);
        if (!ok) return;
      }

      proceedQuizBtn.disabled = true;
      proceedQuizBtn.innerHTML = 'Entering... <span>→</span>';

      await loadDynamicQuestions();
      hydrateDraftProgress(currentTeam);

      const answeredSoFar = countHydratedAnswers();
      if (answeredSoFar > 0) {
        // Returning team mid-quiz: jump straight to the Mission Dashboard so they can resume immediately
        show('intro');
        updateDashboard();
      } else {
        show('opening');
        const startEl = $('start');
        if (startEl) startEl.hidden = false;
      }

      proceedQuizBtn.disabled = false;
      proceedQuizBtn.innerHTML = 'Enter Crypt Trials <span>→</span>';
    });
  }

  if (authForm) {
    authForm.addEventListener('submit', async e => {
      e.preventDefault();

      if (authSubmitBtn) {
        authSubmitBtn.disabled = true;
        authSubmitBtn.innerHTML = authMode === 'resume' ? 'Locating Team...' : 'Verifying...';
      }
      if (authStatus) {
        authStatus.hidden = true;
        authStatus.className = 'auth-status';
      }

      try {
        let payload;
        if (authMode === 'resume') {
          const teamName = resumeTeamInput ? resumeTeamInput.value.trim() : '';
          if (!teamName) {
            if (authSubmitBtn) {
              authSubmitBtn.disabled = false;
              authSubmitBtn.innerHTML = 'Resume Team Session <span>→</span>';
            }
            return;
          }
          payload = { action: 'resume_team', teamName };
        } else {
          const email = authEmail ? authEmail.value.trim() : '';
          const phone = authPhone ? authPhone.value.trim() : '';
          const teamName = authTeamName ? authTeamName.value.trim() : '';
          if (!email || !phone) {
            if (authSubmitBtn) {
              authSubmitBtn.disabled = false;
              authSubmitBtn.innerHTML = 'Verify clearance <span>→</span>';
            }
            return;
          }
          payload = { action: 'verify', email, phone, teamName };
        }

        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok && data.authenticated) {
          currentTeam = data;
          if (authStatus) {
            authStatus.hidden = false;
            authStatus.classList.add('is-success');
            authStatus.textContent = `Clearance granted. Welcome, Team ${data.teamName}!`;
          }

          await loadDynamicQuestions();
          hydrateDraftProgress(data);
          renderTeamDetails(data);
        } else {
          if (teamDetailsPanel) teamDetailsPanel.hidden = true;
          if (authStatus) {
            authStatus.hidden = false;
            authStatus.classList.add('is-error');
            authStatus.textContent = data.error || 'Verification failed. Credentials do not match.';
          }
        }
      } catch {
        if (teamDetailsPanel) teamDetailsPanel.hidden = true;
        if (authStatus) {
          authStatus.hidden = false;
          authStatus.classList.add('is-error');
          authStatus.textContent = 'Unable to connect to verification server. Please retry.';
        }
      } finally {
        if (authSubmitBtn) {
          authSubmitBtn.disabled = false;
          authSubmitBtn.innerHTML = authMode === 'resume'
            ? 'Resume Team Session <span>→</span>'
            : 'Verify clearance <span>→</span>';
        }
      }
    });
  }

  // 10. Bootstrap Session Check on Load
  checkSession().then(async session => {
    if (session && session.authenticated) {
      await loadDynamicQuestions();
      hydrateDraftProgress(session);
      show('auth-gate');
      renderTeamDetails(session);
    } else {
      show('auth-gate');
      resetAuthView();
    }
  });
}

