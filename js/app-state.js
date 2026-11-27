/**
 * The state of the prototype and its transitions. All functions are pure:
 * each takes a state and returns a new state. The page code (app.js) keeps
 * the state, saves it in the browser, and shows it.
 *
 * Sources: "Poker PRD Part 2", M4-04, M4-09, and section 4.3 (the
 * interruption rules), and the measurement rules of the card POKER-13.
 */
import { clockTimeText, oneTapSavedText } from './labels.js';
import {
  createEntry, findKey, isBlankText, pressKey, removeSelection, replaceEntryText, textForSave,
} from './keyboard.js';
import { addKeyPress, addTap, startMeasurement } from './measurement.js';
import { buildTaskRow, TASK_RESULT } from './results.js';
import { matchesTestHand, TEST_TASKS } from './session-plan.js';
import {
  buildHandContext, clearContinuation, createSampleTournament, findRecord, RECORD_KIND,
  recordOneTap, saveNewHand, undoLastOneTap, updateHand,
} from './tournament.js';

export const STATE_VERSION = 1;

export const SCREEN = Object.freeze({
  HOME: 'home',
  TASK: 'task',
  LIVE: 'live',
  INPUT: 'input',
  RESULTS: 'results',
});

export const MODE = Object.freeze({ FREE: 'free', TEST: 'test' });

/** The ID of the only typed field of P07: the shorthand box. */
export const SHORTHAND_FIELD_ID = 'shorthand';

/**
 * Makes the state at the first start: the home page of the prototype.
 * @returns {object} the state
 */
export function createInitialAppState() {
  return { version: STATE_VERSION, mode: null, screen: SCREEN.HOME, tournament: null, draft: null, test: null };
}

/**
 * Shows the results page outside a test session.
 * @returns {object} the state
 */
export function openResultsPage() {
  return { ...createInitialAppState(), screen: SCREEN.RESULTS };
}

/**
 * Starts the free mode: P06 with the sample tournament and no measurement.
 * @returns {object} the state
 */
export function startFreeMode() {
  return { ...createInitialAppState(), mode: MODE.FREE, screen: SCREEN.LIVE, tournament: createSampleTournament() };
}

/**
 * Starts a test session. Each session starts with the same sample tournament.
 * @param {{ sessionId: string, label: string, nowMs: number }} session - the new session
 * @returns {object} the state, with the card of the first task
 */
export function startTestSession({ sessionId, label, nowMs }) {
  return {
    ...createInitialAppState(),
    mode: MODE.TEST,
    screen: SCREEN.TASK,
    tournament: createSampleTournament(),
    test: {
      sessionId,
      label,
      startedAtMs: nowMs,
      finishedAtMs: null,
      hasEndedEarly: false,
      taskIndex: 0,
      measurement: null,
      rows: [],
    },
  };
}

/**
 * Gives the current task of the test session.
 * @param {object} state - the state
 * @returns {object | null} the task, or null if no test task is current
 */
export function currentTask(state) {
  return state.test ? TEST_TASKS[state.test.taskIndex] ?? null : null;
}

/**
 * Tells if the prototype measures a task now.
 * @param {object} state - the state
 * @returns {boolean} true during a test task
 */
export function isMeasuring(state) {
  return Boolean(state.test && state.test.measurement);
}

/**
 * Starts the current task: shows P06 and starts the measurement.
 * @param {object} state - the state
 * @param {number} nowMs - the time when P06 shows
 * @returns {object} the new state
 */
export function beginCurrentTask(state, nowMs) {
  const task = currentTask(state);
  if (!task || state.screen !== SCREEN.TASK) {
    return state;
  }
  const measurement = startMeasurement(task.timerStart, nowMs);
  return { ...state, screen: SCREEN.LIVE, test: { ...state.test, measurement } };
}

/**
 * Ends the test session before the last task. The finished tasks stay in the results.
 * @param {object} state - the state
 * @param {number} nowMs - the time of the end
 * @returns {object} the new state, with the results page
 */
export function endTestSessionEarly(state, nowMs) {
  if (!state.test) {
    return state;
  }
  const test = { ...state.test, measurement: null, finishedAtMs: nowMs, hasEndedEarly: true };
  return { ...state, screen: SCREEN.RESULTS, draft: null, test };
}

/**
 * Records one tap on a control of P06 or P07 in the measurement.
 * @param {object} state - the state
 * @param {number} nowMs - the time of the tap
 * @returns {object} the new state
 */
export function registerTap(state, nowMs) {
  if (!isMeasuring(state)) {
    return state;
  }
  return withMeasurement(state, addTap(state.test.measurement, nowMs));
}

/**
 * Records a fold, a skip, or a mark "played" (P06). A record ends the current test task.
 * @param {object} state - the state
 * @param {string} kind - RECORD_KIND.FOLD, SKIP, or PLAYED
 * @param {number} nowMs - the time of the tap
 * @returns {object} the new state
 */
export function tapOneTapButton(state, kind, nowMs) {
  const tournament = recordOneTap(state.tournament, kind, clockTimeText(nowMs));
  return finishTaskIfMeasuring(
    { ...state, tournament },
    { result: TASK_RESULT.COMPLETED, record: { kind, text: oneTapSavedText(kind) }, endedAtMs: nowMs },
  );
}

/**
 * Deletes the last one-tap record (「撤销」).
 * @param {object} state - the state
 * @returns {object} the new state
 */
export function undoOneTap(state) {
  return { ...state, tournament: undoLastOneTap(state.tournament) };
}

/**
 * Opens P07 for a new hand (「记一手」). The context is the context at this tap (M4-08-R2).
 * @param {object} state - the state
 * @param {number} nowMs - the time of the tap
 * @returns {object} the new state
 */
export function openNewDraft(state, nowMs) {
  const { tournament } = state;
  const draft = {
    ...createEntry(),
    handNumber: tournament.nextHandNumber,
    context: buildHandContext(tournament, clockTimeText(nowMs)),
    isImportant: false,
    continuesHandNumber: null,
    usesSystemKeyboard: false,
  };
  return { ...state, screen: SCREEN.INPUT, draft };
}

/**
 * Opens P07 for the auto-saved hand of the continuation bar (「继续」). The text is still there.
 * @param {object} state - the state
 * @returns {object} the new state
 */
export function openContinuationDraft(state) {
  const handNumber = state.tournament.continuationHandNumber;
  const record = handNumber === null ? null : findRecord(state.tournament, handNumber);
  if (!record) {
    return state;
  }
  const draft = {
    ...createEntry(record.text),
    handNumber,
    context: record.context,
    isImportant: record.isImportant,
    continuesHandNumber: handNumber,
    usesSystemKeyboard: false,
  };
  return { ...state, screen: SCREEN.INPUT, draft, tournament: clearContinuation(state.tournament) };
}

/**
 * Applies one key of the poker keyboard to the shorthand box.
 * @param {object} state - the state
 * @param {string} keyId - the ID of the key
 * @param {{ start: number, end: number } | null} selection - the selection of the box, or null
 * @param {number} nowMs - the time of the key press
 * @returns {object} the new state
 */
export function pressDraftKey(state, keyId, selection, nowMs) {
  if (!state.draft) {
    return state;
  }
  const key = findKey(keyId, state.tournament.playerCount);
  const entry = pressKey(placeCaret(state.draft, selection), key);
  return countKeyPress({ ...state, draft: { ...state.draft, ...entry } }, nowMs);
}

/**
 * Counts one key press of the system keyboard in the shorthand box.
 * @param {object} state - the state
 * @param {number} nowMs - the time of the key press
 * @returns {object} the new state
 */
export function countSystemKeyPress(state, nowMs) {
  return state.draft ? countKeyPress(state, nowMs) : state;
}

/**
 * Keeps the text that the system keyboard changed (M4-01-R8: each key press is stored).
 * @param {object} state - the state
 * @param {string} text - the text of the box
 * @param {number} caret - the caret position
 * @returns {object} the new state
 */
export function syncDraftText(state, text, caret) {
  if (!state.draft) {
    return state;
  }
  return { ...state, draft: { ...state.draft, ...replaceEntryText(entryOf(state.draft), text, caret) } };
}

/**
 * Sets or removes the mark 「重要」 of the hand (P07-C3).
 * @param {object} state - the state
 * @returns {object} the new state
 */
export function toggleImportant(state) {
  return state.draft ? { ...state, draft: { ...state.draft, isImportant: !state.draft.isImportant } } : state;
}

/**
 * Changes between the poker keyboard and the system keyboard (「ABC」, M4-02-R6).
 * @param {object} state - the state
 * @returns {object} the new state
 */
export function toggleSystemKeyboard(state) {
  if (!state.draft) {
    return state;
  }
  return { ...state, draft: { ...state.draft, usesSystemKeyboard: !state.draft.usesSystemKeyboard } };
}

/**
 * Saves the hand (「保存」) and shows P06 again (M4-09-R4). A save ends the current test task.
 * @param {object} state - the state
 * @param {number} nowMs - the time of the tap
 * @returns {object} the new state; the same state if the box is empty
 */
export function saveDraft(state, nowMs) {
  const { draft } = state;
  if (!draft || isBlankText(draft.text)) {
    return state;
  }
  const text = textForSave(draft.text);
  const tournament =
    draft.continuesHandNumber === null
      ? saveNewHand(state.tournament, { text, isImportant: draft.isImportant, context: draft.context, isAutoSaved: false })
      : updateHand(state.tournament, draft.continuesHandNumber, { text, isImportant: draft.isImportant, showsResult: true });
  return finishTaskIfMeasuring(
    { ...state, screen: SCREEN.LIVE, draft: null, tournament },
    { result: TASK_RESULT.COMPLETED, record: { kind: RECORD_KIND.HAND, text }, endedAtMs: nowMs },
  );
}

/**
 * Leaves P07 with the back control. If the box is not empty, the App saves the
 * input as a pending hand and shows the continuation bar (M4-09-R8).
 * A current test task ends with the result "stopped".
 * @param {object} state - the state
 * @param {number} nowMs - the time of the tap
 * @returns {object} the new state
 */
export function leaveDraft(state, nowMs) {
  const { state: closed, text } = closeDraftWithAutoSave(state);
  return finishTaskIfMeasuring(closed, {
    result: TASK_RESULT.STOPPED,
    record: { kind: RECORD_KIND.HAND, text },
    endedAtMs: nowMs,
  });
}

/**
 * Applies the interruption rules after the page opens again (Part 2, section 4.3):
 * an input that is not empty becomes a pending hand. A current test task ends
 * with the result "stopped" at the time of its last user action.
 * @param {object} state - the state that the browser kept
 * @returns {object} the new state
 */
export function recoverAfterReload(state) {
  if (state.screen !== SCREEN.LIVE && state.screen !== SCREEN.INPUT) {
    return state;
  }
  const endedAtMs = isMeasuring(state) ? state.test.measurement.lastActivityAtMs : null;
  const { state: closed, text } =
    state.screen === SCREEN.INPUT ? closeDraftWithAutoSave(state) : { state, text: '' };
  if (endedAtMs !== null) {
    return finishTaskIfMeasuring(closed, {
      result: TASK_RESULT.STOPPED,
      record: { kind: RECORD_KIND.HAND, text },
      endedAtMs,
    });
  }
  return { ...closed, screen: closed.mode === MODE.TEST ? screenBetweenTasks(closed) : SCREEN.LIVE };
}

/**
 * Gives the session data that the results page keeps.
 * @param {object} state - the state
 * @returns {object | null} the session, or null outside a test session
 */
export function sessionSnapshot(state) {
  if (!state.test) {
    return null;
  }
  const { sessionId, label, startedAtMs, finishedAtMs, hasEndedEarly, rows } = state.test;
  return { id: sessionId, label, startedAtMs, finishedAtMs, hasEndedEarly, rows };
}

/**
 * Makes sure that a state from the browser storage has the expected shape.
 * The storage is not trusted: a state with a different shape is not used.
 * @param {unknown} value - the value from the storage
 * @returns {boolean} true if the state can be used
 */
export function isValidAppState(value) {
  if (!isObject(value) || value.version !== STATE_VERSION) {
    return false;
  }
  if (!Object.values(SCREEN).includes(value.screen) || ![null, ...Object.values(MODE)].includes(value.mode)) {
    return false;
  }
  const needsTournament = value.screen === SCREEN.LIVE || value.screen === SCREEN.INPUT;
  if (needsTournament && !isObject(value.tournament)) {
    return false;
  }
  if (value.screen === SCREEN.INPUT && !(isObject(value.draft) && typeof value.draft.text === 'string')) {
    return false;
  }
  if (value.mode === MODE.TEST) {
    return isObject(value.test) && Array.isArray(value.test.rows) && Number.isInteger(value.test.taskIndex);
  }
  return true;
}

function closeDraftWithAutoSave(state) {
  const { draft } = state;
  if (!draft) {
    return { state: { ...state, screen: SCREEN.LIVE }, text: '' };
  }
  const text = textForSave(draft.text);
  const tournament = isBlankText(text) ? state.tournament : autoSaveDraft(state.tournament, draft, text);
  return { state: { ...state, screen: SCREEN.LIVE, draft: null, tournament }, text };
}

function autoSaveDraft(tournament, draft, text) {
  if (draft.continuesHandNumber !== null) {
    return updateHand(tournament, draft.continuesHandNumber, { text, isImportant: draft.isImportant, showsResult: false });
  }
  return saveNewHand(tournament, { text, isImportant: draft.isImportant, context: draft.context, isAutoSaved: true });
}

function finishTaskIfMeasuring(state, { result, record, endedAtMs }) {
  if (!isMeasuring(state)) {
    return state;
  }
  const task = currentTask(state);
  const row = buildTaskRow(task, state.test.measurement, {
    result,
    savedText: record.text,
    matchesReference: result === TASK_RESULT.COMPLETED && matchesTestHand(task, record),
    endedAtMs,
  });
  const taskIndex = state.test.taskIndex + 1;
  const isLastTask = taskIndex >= TEST_TASKS.length;
  const test = {
    ...state.test,
    taskIndex,
    measurement: null,
    rows: [...state.test.rows, row],
    finishedAtMs: isLastTask ? endedAtMs : null,
  };
  return { ...state, screen: isLastTask ? SCREEN.RESULTS : SCREEN.TASK, draft: null, test };
}

function screenBetweenTasks(state) {
  return currentTask(state) ? SCREEN.TASK : SCREEN.RESULTS;
}

function countKeyPress(state, nowMs) {
  if (!isMeasuring(state)) {
    return state;
  }
  return withMeasurement(state, addKeyPress(state.test.measurement, SHORTHAND_FIELD_ID, nowMs));
}

function withMeasurement(state, measurement) {
  return { ...state, test: { ...state.test, measurement } };
}

function entryOf(draft) {
  return { text: draft.text, caret: draft.caret, history: draft.history };
}

function placeCaret(draft, selection) {
  const entry = entryOf(draft);
  if (!selection) {
    return entry;
  }
  if (selection.start !== selection.end) {
    return removeSelection(entry, selection.start, selection.end);
  }
  return replaceEntryText(entry, entry.text, selection.start);
}

function isObject(value) {
  return typeof value === 'object' && value !== null;
}
