/**
 * Entry of the prototype. It keeps the state, saves it in the browser after
 * each change, shows the current page, and connects the controls to the
 * state transitions of app-state.js.
 */
import {
  beginCurrentTask, countSystemKeyPress, createInitialAppState, currentTask, endTestSessionEarly, isMeasuring,
  leaveDraft, MODE, openContinuationDraft, openNewDraft, openResultsPage, pressDraftKey, recoverAfterReload,
  registerTap, saveDraft, SCREEN, sessionSnapshot, startFreeMode, startTestSession, syncDraftText, tapOneTapButton,
  toggleImportant, toggleSystemKeyboard, undoOneTap,
} from './app-state.js';
import { formatResultsText } from './results.js';
import { TEST_TASKS } from './session-plan.js';
import { deleteAllSessions, loadAppState, loadSessions, saveAppState, saveSession } from './storage.js';
import { RECORD_KIND } from './tournament.js';
import { copyText } from './ui/clipboard.js';
import { getElement, setText, setVisible, showToast } from './ui/dom.js';
import { focusShorthandBox, getShorthandBox, readSelection, renderInputScreen, showEntry } from './ui/input-view.js';
import { renderLiveScreen, renderStatusBar, renderTestBanner } from './ui/live-view.js';
import { renderResults, renderTaskCard } from './ui/page-views.js';
import { startViewportSync } from './ui/viewport.js';

const SCREEN_ELEMENT_IDS = Object.freeze({
  [SCREEN.HOME]: 'screen-home',
  [SCREEN.TASK]: 'screen-task',
  [SCREEN.LIVE]: 'screen-live',
  [SCREEN.INPUT]: 'screen-input',
  [SCREEN.RESULTS]: 'screen-results',
});

const ONE_TAP_CONTROLS = Object.freeze({
  fold: RECORD_KIND.FOLD,
  skip: RECORD_KIND.SKIP,
  played: RECORD_KIND.PLAYED,
});

const MAX_LABEL_LENGTH = 40;
const KEY_FEEDBACK_MS = 120;
/** A second tap of a fast double tap must not start the next task by accident. */
const TASK_CARD_TAP_DELAY_MS = 600;

const MESSAGES = Object.freeze({
  notInPrototype: '原型不包含这个页面',
  unexpectedError: '出现错误。请返回首页再试一次。',
  copied: '已复制全部结果。',
  copyFailed: '不能自动复制。请手动选择下面的结果文本。',
  confirmEndTest: '结束这次测试？没有做的任务不记录。',
  confirmDelete: '删除这台手机上的全部测试结果？删除后不能恢复。',
});

let appState = createInitialAppState();
let taskCardShownAtMs = 0;

start();

function start() {
  startViewportSync(getElement('app'));
  bindHomeControls();
  bindTaskControls();
  bindAppPageControls();
  bindKeyboard();
  bindResultsControls();
  try {
    commit(recoverAfterReload(loadAppState()));
  } catch (error) {
    console.error('The kept state could not be shown. The prototype starts again.', error);
    commit(createInitialAppState());
  }
}

/** Keeps a new state, saves it in the browser, and shows it. */
function commit(nextState) {
  const previousScreen = appState.screen;
  appState = nextState;
  saveAppState(appState);
  const session = sessionSnapshot(appState);
  if (session) {
    saveSession(session);
  }
  render(previousScreen);
}

function render(previousScreen) {
  const { screen } = appState;
  for (const [name, elementId] of Object.entries(SCREEN_ELEMENT_IDS)) {
    setVisible(getElement(elementId), name === screen);
  }
  const isAppPage = screen === SCREEN.LIVE || screen === SCREEN.INPUT;
  setVisible(getElement('status-bar'), isAppPage);
  renderTestBanner(isAppPage && isMeasuring(appState) ? currentTask(appState) : null, taskNumber(), TEST_TASKS.length);
  if (isAppPage) {
    renderStatusBar(appState.tournament);
  }
  if (previousScreen === SCREEN.INPUT && screen !== SCREEN.INPUT) {
    getShorthandBox().blur();
  }
  renderScreen(screen, previousScreen);
}

function renderScreen(screen, previousScreen) {
  if (screen === SCREEN.LIVE) {
    renderLiveScreen(appState.tournament);
  } else if (screen === SCREEN.INPUT) {
    renderInputScreen(appState.draft, appState.tournament);
    if (previousScreen !== SCREEN.INPUT) {
      showEntry(appState.draft);
    }
  } else if (screen === SCREEN.TASK) {
    renderCurrentTaskCard(previousScreen);
  } else if (screen === SCREEN.RESULTS) {
    renderResultsPage();
  }
}

function renderCurrentTaskCard(previousScreen) {
  const task = currentTask(appState);
  if (!task) {
    return;
  }
  if (previousScreen !== SCREEN.TASK) {
    taskCardShownAtMs = Date.now();
  }
  renderTaskCard(task, taskNumber(), TEST_TASKS.length, appState.test.rows.at(-1) ?? null);
}

function renderResultsPage() {
  const sessions = loadSessions();
  renderResults(sessions, formatResultsText(sessions, Date.now()));
}

function taskNumber() {
  return appState.test ? appState.test.taskIndex + 1 : 0;
}

/** Runs an event handler. An error does not stop the prototype. */
function safely(handler) {
  return (event) => {
    try {
      handler(event);
    } catch (error) {
      console.error(error);
      showToast(MESSAGES.unexpectedError);
    }
  };
}

function onDataAttribute(element, attribute, handler) {
  element.addEventListener(
    'click',
    safely((event) => {
      const target = event.target.closest(`[data-${attribute}]`);
      if (target) {
        handler(target.dataset[attribute]);
      }
    }),
  );
}

function bindHomeControls() {
  onDataAttribute(getElement('screen-home'), 'home', (action) => {
    if (action === 'start-test') {
      commit(startTestSession({ sessionId: createSessionId(), label: readSessionLabel(), nowMs: Date.now() }));
    } else if (action === 'start-free') {
      commit(startFreeMode());
    } else if (action === 'open-results') {
      commit(openResultsPage());
    }
  });
}

function bindTaskControls() {
  onDataAttribute(getElement('screen-task'), 'task', (action) => {
    if (action === 'begin' && Date.now() - taskCardShownAtMs >= TASK_CARD_TAP_DELAY_MS) {
      commit(beginCurrentTask(appState, Date.now()));
    } else if (action === 'end' && window.confirm(MESSAGES.confirmEndTest)) {
      commit(endTestSessionEarly(appState, Date.now()));
    }
  });
}

/** The controls of the status bar, P06, and P07. Each tap is a user action. */
function bindAppPageControls() {
  const handleControl = (control) => {
    if (appState.screen === SCREEN.LIVE) {
      handleLiveControl(control);
    } else if (appState.screen === SCREEN.INPUT) {
      handleInputControl(control);
    }
  };
  onDataAttribute(getElement('status-bar'), 'control', handleControl);
  onDataAttribute(getElement('screen-live'), 'control', handleControl);
  onDataAttribute(getElement('screen-input'), 'control', handleControl);
}

function handleLiveControl(control) {
  const nowMs = Date.now();
  const state = registerTap(appState, nowMs);
  if (ONE_TAP_CONTROLS[control]) {
    commit(tapOneTapButton(state, ONE_TAP_CONTROLS[control], nowMs));
  } else if (control === 'undo') {
    commit(undoOneTap(state));
  } else if (control === 'record') {
    commit(openNewDraft(state, nowMs));
    focusShorthandBox(false);
  } else if (control === 'continue') {
    commit(openContinuationDraft(state));
    focusShorthandBox(false);
  } else if (control === 'live-back' && appState.mode === MODE.FREE) {
    // In the free mode, the home page of the prototype takes the place of the tournament list (P02).
    commit(createInitialAppState());
  } else {
    commit(state);
    showToast(MESSAGES.notInPrototype);
  }
}

function handleInputControl(control) {
  const nowMs = Date.now();
  const state = registerTap(appState, nowMs);
  if (control === 'save') {
    commit(saveDraft(state, nowMs));
  } else if (control === 'input-back') {
    commit(leaveDraft(state, nowMs));
  } else if (control === 'important') {
    commit(toggleImportant(state));
    focusShorthandBox(appState.draft.usesSystemKeyboard);
  } else if (control === 'abc') {
    commit(toggleSystemKeyboard(state));
    focusShorthandBox(appState.draft.usesSystemKeyboard);
  } else {
    commit(state);
    showToast(MESSAGES.notInPrototype);
  }
}

/**
 * The keys act at the touch start. The default action is stopped, so the
 * shorthand box keeps the input focus and the caret, and the system keyboard
 * does not open. Fast taps with two thumbs are not lost.
 */
function bindKeyboard() {
  const keyboard = getElement('poker-keyboard');
  const onKeyDown = safely((event) => {
    const keyButton = event.target.closest('[data-key]');
    if (!keyButton || appState.screen !== SCREEN.INPUT) {
      return;
    }
    event.preventDefault();
    if (event.type === 'mousedown' && event.button !== 0) {
      return;
    }
    showKeyFeedback(keyButton);
    pressKeyButton(keyButton.dataset.key);
  });
  keyboard.addEventListener('touchstart', onKeyDown, { passive: false });
  keyboard.addEventListener('mousedown', onKeyDown);

  const box = getShorthandBox();
  box.addEventListener('beforeinput', safely(() => commit(countSystemKeyPress(appState, Date.now()))));
  box.addEventListener('input', safely(() => commit(syncDraftText(appState, box.value, box.selectionStart))));
}

function pressKeyButton(keyId) {
  const box = getShorthandBox();
  const selection = document.activeElement === box ? readSelection() : null;
  commit(pressDraftKey(appState, keyId, selection, Date.now()));
  showEntry(appState.draft);
  if (document.activeElement !== box) {
    focusShorthandBox(appState.draft.usesSystemKeyboard);
  }
}

function showKeyFeedback(keyButton) {
  keyButton.classList.add('is-pressed');
  window.setTimeout(() => keyButton.classList.remove('is-pressed'), KEY_FEEDBACK_MS);
}

function bindResultsControls() {
  onDataAttribute(getElement('screen-results'), 'results', (action) => {
    if (action === 'copy') {
      copyAllResults();
    } else if (action === 'home') {
      commit(createInitialAppState());
    } else if (action === 'delete' && window.confirm(MESSAGES.confirmDelete)) {
      // Leave the session first, so the next save does not write it again.
      commit(openResultsPage());
      deleteAllSessions();
      renderResultsPage();
    }
  });
}

function copyAllResults() {
  const text = formatResultsText(loadSessions(), Date.now());
  getElement('results-text').value = text;
  copyText(text)
    .then((isCopied) => setText(getElement('copy-status'), isCopied ? MESSAGES.copied : MESSAGES.copyFailed))
    .catch((error) => {
      console.error(error);
      setText(getElement('copy-status'), MESSAGES.copyFailed);
    });
}

function readSessionLabel() {
  return getElement('session-label').value.trim().slice(0, MAX_LABEL_LENGTH);
}

function createSessionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
