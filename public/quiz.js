// The Crypt Trials - Logic & Atmospheric Engine

const $ = id => (typeof document !== 'undefined' && document.getElementById ? document.getElementById(id) : null);
let levels = (typeof window !== 'undefined' && window.QUIZ_LEVELS) || [];
let questions = levels.flatMap(level => level.questions);
let current = 0;
let currentLevel = 0;
let answers = [];
let allAnswers = [];
let sequenceTimer = null;
let currentTeam = null; // { teamName, leaderName, isSubmitted }
let draftSaveQueue = Promise.resolve();
let draftSaveTimer = null;
let isFinishingLevel = false;

// Determine if running in a real browser (check.cjs mock does not have document.addEventListener)
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined' && typeof document.addEventListener === 'function';

async function checkSession() {
  try {
    const res = await fetch('/api/auth/session');
    if (!res.ok) return null;
    const data = await res.json();
    if (data.authenticated) {
      currentTeam = data;
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
      return res.ok;
    } catch (err) {
      console.warn('Draft save notice:', err.message);
      return false;
    }
  };
  // Keep requests ordered so a delayed earlier snapshot cannot replace newer edits.
  draftSaveQueue = draftSaveQueue.then(save, save);
  return draftSaveQueue;
}

function localDraftStorageKey(team = currentTeam) {
  const identity = team && (team.email || team.teamName || team.leaderName);
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
  // Resume at the first unfinished seal; begin at its first question, retaining
  // any saved answers in that seal so the team can review them.
  currentLevel = levels.findIndex((level, index) => level.questions.some((question, qIndex) => {
    const value = merged[`seal_${index + 1}`]?.[questionKey(question, index + 1, qIndex)];
    return !hasUsableAnswer(value);
  }));
  if (currentLevel < 0) currentLevel = levels.length;

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
  else draftSaveTimer = setTimeout(save, 350);
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


function show(id) {
  const views = ['auth-gate', 'opening', 'intro', 'briefing', 'trial', 'seal-result', 'ending'];
  views.forEach(view => {
    const el = $(view);
    if (el) el.hidden = view !== id;
  });
  if (document.body) {
    document.body.classList.toggle('opening-active', id === 'opening' || id === 'auth-gate');
    document.body.classList.toggle('ending-active', id === 'ending');
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
    if (line) line.textContent = message;
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
    sequenceTimer = setTimeout(advance, 1400);
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

  submitFinalQuiz(answersBySeal);

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
    current = 0;
    const level = levels[currentLevel];
    answers = level ? level.questions.map((question, index) => {
      const allIndex = levels.slice(0, currentLevel).reduce((sum, item) => sum + item.questions.length, index);
      return allAnswers[allIndex];
    }) : [];
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

// Sound Button Logic
const soundBtn = $('sound');
if (soundBtn) {
  soundBtn.addEventListener('click', async () => {
    const audio = $('audio');
    if (!audio) return;

    if (audio.paused) {
      try {
        audio.volume = 0.22;
        await audio.play();
        soundBtn.textContent = 'Sound on ♫';
        soundBtn.setAttribute('aria-pressed', 'true');
        if (isBrowser && window.AudioEngine) {
          window.AudioEngine.setEnabled(true);
        }
      } catch {
        soundBtn.textContent = 'Sound unavailable';
      }
    } else {
      audio.pause();
      soundBtn.textContent = 'Sound off ♫';
      soundBtn.setAttribute('aria-pressed', 'false');
      if (isBrowser && window.AudioEngine) {
        window.AudioEngine.setEnabled(false);
      }
    }
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

  // 3. Floating Motes Canvas
  const motesCanvas = $('motes');
  if (motesCanvas && motesCanvas.getContext) {
    const ctx = motesCanvas.getContext('2d');
    let motes = [];
    let w = (motesCanvas.width = window.innerWidth);
    let h = (motesCanvas.height = window.innerHeight);

    const resizeCanvas = () => {
      w = motesCanvas.width = window.innerWidth;
      h = motesCanvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas, { passive: true });

    const moteCount = Math.min(50, Math.floor(window.innerWidth / 24));
    for (let i = 0; i < moteCount; i++) {
      motes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.8 + 0.6,
        alpha: Math.random() * 0.6 + 0.2,
        speedY: -(Math.random() * 0.45 + 0.2),
        speedX: (Math.random() - 0.5) * 0.3,
        seed: Math.random() * 100
      });
    }

    let animFrame = null;
    let lastTime = 0;

    const renderMotes = time => {
      ctx.clearRect(0, 0, w, h);
      motes.forEach(m => {
        m.y += m.speedY;
        m.x += m.speedX + Math.sin(time * 0.0015 + m.seed) * 0.25;

        if (m.y < -10) {
          m.y = h + 10;
          m.x = Math.random() * w;
        }

        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, ${Math.floor(90 + m.r * 30)}, 40, ${m.alpha})`;
        ctx.fill();
      });

      if (document.visibilityState !== 'hidden') {
        animFrame = requestAnimationFrame(renderMotes);
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        lastTime = performance.now();
        animFrame = requestAnimationFrame(renderMotes);
      } else {
        cancelAnimationFrame(animFrame);
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

  // 9. Team Authentication & Team Details Handling
  const authForm = $('auth-form');
  const authStatus = $('auth-status');
  const authEmail = $('auth-email');
  const authPhone = $('auth-phone');
  const authSubmitBtn = $('auth-submit-btn');

  const teamDetailsPanel = $('team-details-panel');
  const teamDisplayName = $('team-display-name');
  const teamDisplayLeader = $('team-display-leader');
  const teamDisplaySize = $('team-display-size');
  const teamMembersList = $('team-members-list');
  const authSwitchBtn = $('auth-switch-btn');
  const proceedQuizBtn = $('proceed-quiz-btn');

  function renderTeamDetails(team) {
    if (!teamDetailsPanel) return;

    if (teamDisplayName) teamDisplayName.textContent = team.teamName || `${team.leaderName}'s Team`;
    if (teamDisplayLeader) teamDisplayLeader.textContent = team.leaderName || '—';
    if (teamDisplaySize) teamDisplaySize.textContent = String(team.teamSize || (team.members ? team.members.length : 1));

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
    teamDetailsPanel.hidden = false;

    // Reset button and subtitle to default/ready state if not submitted
    const teamPanelSub = $('team-display-sub');
    if (team.isSubmitted) {
      if (teamPanelSub) teamPanelSub.textContent = 'Final answers have been sealed and submitted. No further attempts allowed.';
      if (proceedQuizBtn) {
        proceedQuizBtn.disabled = true;
        proceedQuizBtn.textContent = 'Quiz Already Sealed';
      }
    } else {
      if (teamPanelSub) teamPanelSub.textContent = 'Roster verified in crypt registry';
      if (proceedQuizBtn) {
        proceedQuizBtn.disabled = false;
        proceedQuizBtn.innerHTML = 'Enter Crypt Trials <span>→</span>';
      }
    }
  }

  function resetAuthView() {
    if (teamDetailsPanel) teamDetailsPanel.hidden = true;
    if (authForm) authForm.hidden = false;
    const teamPanelSub = $('team-display-sub');
    if (teamPanelSub) teamPanelSub.textContent = 'Roster verified in crypt registry';
    if (proceedQuizBtn) {
      proceedQuizBtn.disabled = false;
      proceedQuizBtn.innerHTML = 'Enter Crypt Trials <span>→</span>';
    }
    if (authStatus) {
      authStatus.hidden = true;
      authStatus.className = 'auth-status';
      authStatus.textContent = '';
    }
    if (authSubmitBtn) {
      authSubmitBtn.disabled = false;
      authSubmitBtn.innerHTML = 'Verify clearance <span>→</span>';
    }
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
      if (authEmail) authEmail.focus();
    });
  }

  if (proceedQuizBtn) {
    proceedQuizBtn.addEventListener('click', async () => {
      if (!currentTeam) return;

      // Check if already finalized
      if (currentTeam.isSubmitted) {
        const teamPanelSub = $('team-display-sub');
        if (teamPanelSub) teamPanelSub.textContent = 'Final answers have been sealed and submitted. No further attempts allowed.';
        const btn = $('proceed-quiz-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'Quiz Already Sealed'; }
        return;
      }

      proceedQuizBtn.disabled = true;
      proceedQuizBtn.innerHTML = 'Entering... <span>→</span>';

      await loadDynamicQuestions();
      hydrateDraftProgress(currentTeam);
      show('opening');
      const startBtn = $('start');
      if (startBtn) startBtn.hidden = false;
      proceedQuizBtn.disabled = false;
      proceedQuizBtn.innerHTML = 'Enter Crypt Trials <span>→</span>';
    });
  }

  if (authForm) {
    authForm.addEventListener('submit', async e => {
      e.preventDefault();
      if (!authEmail || !authPhone) return;

      const email = authEmail.value.trim();
      const phone = authPhone.value.trim();

      if (!email || !phone) return;

      if (authSubmitBtn) {
        authSubmitBtn.disabled = true;
        authSubmitBtn.innerHTML = 'Verifying...';
      }
      if (authStatus) {
        authStatus.hidden = true;
        authStatus.className = 'auth-status';
      }

      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, phone })
        });

        const data = await res.json();

        if (res.ok && data.authenticated) {
          currentTeam = data;
          if (authStatus) {
            authStatus.hidden = false;
            authStatus.classList.add('is-success');
            authStatus.textContent = `Clearance granted. Welcome, Team ${data.teamName}!`;
          }

          // Preload questions in background
          await loadDynamicQuestions();

          // Display team and member details directly on login page
          renderTeamDetails(data);
        } else {
          // Failure: Ensure team details panel is never displayed
          if (teamDetailsPanel) teamDetailsPanel.hidden = true;
          if (authStatus) {
            authStatus.hidden = false;
            authStatus.classList.add('is-error');
            authStatus.textContent = data.error || 'Verification failed. Credentials do not match.';
          }
        }
      } catch (err) {
        if (teamDetailsPanel) teamDetailsPanel.hidden = true;
        if (authStatus) {
          authStatus.hidden = false;
          authStatus.classList.add('is-error');
          authStatus.textContent = 'Unable to connect to verification server. Please retry.';
        }
      } finally {
        if (authSubmitBtn) {
          authSubmitBtn.disabled = false;
          authSubmitBtn.innerHTML = 'Verify clearance <span>→</span>';
        }
      }
    });
  }

  // 10. Bootstrap Session Check on Load
  checkSession().then(async session => {
    if (session && session.authenticated) {
      await loadDynamicQuestions();
      hydrateDraftProgress(session);
      // If team already finalized, show final status
      if (session.isSubmitted) {
        show('auth-gate');
        renderTeamDetails(session);
        const teamPanelSub = $('team-display-sub');
        if (teamPanelSub) teamPanelSub.textContent = 'Final answers have been sealed and submitted. No further attempts allowed.';
        const proceedBtn = $('proceed-quiz-btn');
        if (proceedBtn) { proceedBtn.disabled = true; proceedBtn.textContent = 'Quiz Already Sealed'; }
      } else {
        // Authenticated session present: display team details on auth-gate
        show('auth-gate');
        renderTeamDetails(session);
      }
    } else {
      // Require verification gate
      show('auth-gate');
      resetAuthView();
    }
  });
}

