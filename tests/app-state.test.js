import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  beginCurrentTask, countSystemKeyPress, createInitialAppState, endTestSessionEarly, isValidAppState, leaveDraft,
  openContinuationDraft, openNewDraft, pressDraftKey, recoverAfterReload, registerTap, saveDraft, SCREEN,
  sessionSnapshot, startFreeMode, startTestSession, syncDraftText, tapOneTapButton, toggleImportant,
} from '../js/app-state.js';
import { TASK_RESULT } from '../js/results.js';
import { TEST_TASKS } from '../js/session-plan.js';
import { RECORD_KIND } from '../js/tournament.js';

const START = 1_700_000_000_000;

/** A clock for the test: each call to next() is a later time. */
function createClock(startMs = START, stepMs = 250) {
  let nowMs = startMs;
  return {
    now: () => nowMs,
    next: () => {
      nowMs += stepMs;
      return nowMs;
    },
  };
}

function tap(state, clock, action) {
  const nowMs = clock.next();
  return action(registerTap(state, nowMs), nowMs);
}

function typeKeys(state, clock, keyIds) {
  return keyIds.reduce((current, keyId) => pressDraftKey(current, keyId, null, clock.next()), state);
}

function newSession(clock) {
  return startTestSession({ sessionId: 's1', label: 'Player A practice', nowMs: clock.now() });
}

/** Does the task T08 with one tap on 「弃牌」. */
function doFoldTask(state, clock) {
  const started = beginCurrentTask(state, clock.next());
  return tap(started, clock, (current, nowMs) => tapOneTapButton(current, RECORD_KIND.FOLD, nowMs));
}

/** Does one task T09: 「记一手」, the keys of the example hand, 「保存」. */
function doHandTask(state, clock, keyIds) {
  const started = beginCurrentTask(state, clock.next());
  const opened = tap(started, clock, openNewDraft);
  const typed = typeKeys(opened, clock, keyIds);
  return tap(typed, clock, saveDraft);
}

describe('a full test session', () => {
  const clock = createClock();
  let state = doFoldTask(newSession(clock), clock);
  for (const task of TEST_TASKS.slice(1)) {
    state = doHandTask(state, clock, task.keySequence);
  }
  const rows = state.test.rows;

  test('has one row for each task, in order', () => {
    assert.deepEqual(rows.map((row) => `${row.taskId} ${row.exampleId}`), [
      'T08 fold', 'T09 example-1', 'T09 example-2', 'T09 example-3',
    ]);
  });

  test('T08 has 1 user action, 0 typed fields, and 0 key presses', () => {
    assert.deepEqual(
      [rows[0].userActions, rows[0].typedFields, rows[0].keyPresses, rows[0].timeMs],
      [1, 0, 0, 250],
    );
    assert.equal(rows[0].savedText, '弃牌（底牌未知）');
    assert.equal(rows[0].isWithinLimit, null);
  });

  test('each T09 example hand gives the three numbers of Part 2: 3 actions, 1 typed field, 10/19/43 key presses', () => {
    assert.deepEqual(
      rows.slice(1).map((row) => [row.userActions, row.typedFields, row.keyPresses]),
      [[3, 1, 10], [3, 1, 19], [3, 1, 43]],
    );
  });

  test('each T09 row keeps the reference text and is complete', () => {
    for (const [index, row] of rows.slice(1).entries()) {
      assert.equal(row.savedText, TEST_TASKS[index + 1].reference);
      assert.equal(row.matchesReference, true);
      assert.equal(row.result, TASK_RESULT.COMPLETED);
    }
  });

  test('the T09 time runs from 「记一手」 to 「保存」', () => {
    // 「记一手」, then 10 key presses, then 「保存」: 11 steps of 250 ms.
    assert.equal(rows[1].timeMs, 11 * 250);
    assert.equal(rows[1].isWithinLimit, true);
  });

  test('the session ends on the results page', () => {
    assert.equal(state.screen, SCREEN.RESULTS);
    assert.equal(state.test.measurement, null);
    assert.ok(state.test.finishedAtMs > START);
    assert.equal(sessionSnapshot(state).rows.length, 4);
  });

  test('the position moved one step for each record', () => {
    // CO, then HJ, LJ, UTG+2, and UTG+1 after four records.
    assert.equal(state.tournament.heroPosition, 'UTG+1');
    assert.equal(state.tournament.nextHandNumber, 32);
  });
});

describe('measurement details', () => {
  test('a slow T09 is not in the limit of 30 seconds', () => {
    const clock = createClock(START, 4000);
    const afterFold = doFoldTask(newSession(clock), clock);
    const state = doHandTask(afterFold, clock, TEST_TASKS[1].keySequence);
    assert.equal(state.test.rows[1].timeMs, 11 * 4000);
    assert.equal(state.test.rows[1].isWithinLimit, false);
  });

  test('the T09 time does not include the wait before the first tap', () => {
    const clock = createClock();
    const afterFold = doFoldTask(newSession(clock), clock);
    const shownAt = clock.now() + 1000;
    const firstTapAt = shownAt + 60_000;
    const saveAt = firstTapAt + 10_000;
    let state = beginCurrentTask(afterFold, shownAt);
    state = openNewDraft(registerTap(state, firstTapAt), firstTapAt);
    state = pressDraftKey(state, 'A', null, firstTapAt + 1000);
    state = saveDraft(registerTap(state, saveAt), saveAt);
    assert.equal(state.test.rows[1].timeMs, 10_000);
  });

  test('a tap on 「重要」 is a user action; system keyboard input is a key press', () => {
    const clock = createClock();
    const afterFold = doFoldTask(newSession(clock), clock);
    let state = tap(beginCurrentTask(afterFold, clock.next()), clock, openNewDraft);
    state = tap(state, clock, (current) => toggleImportant(current));
    state = typeKeys(state, clock, ['A', 'K', 'o']);
    state = countSystemKeyPress(state, clock.next());
    state = syncDraftText(state, 'AKo 紧', 5);
    state = tap(state, clock, saveDraft);
    const row = state.test.rows[1];
    assert.deepEqual([row.userActions, row.typedFields, row.keyPresses], [4, 1, 4]);
    assert.equal(row.savedText, 'AKo 紧');
    assert.equal(row.matchesReference, false);
    assert.equal(state.tournament.records.at(-1).isImportant, true);
  });

  test('a one-tap record during a T09 task ends the task, but it does not agree with the test hand', () => {
    const clock = createClock();
    const afterFold = doFoldTask(newSession(clock), clock);
    const started = beginCurrentTask(afterFold, clock.next());
    const state = tap(started, clock, (current, nowMs) => tapOneTapButton(current, RECORD_KIND.SKIP, nowMs));
    assert.equal(state.test.rows[1].result, TASK_RESULT.COMPLETED);
    assert.equal(state.test.rows[1].matchesReference, false);
  });

  test('the save is not available while the box is empty (M4-09-R7)', () => {
    const clock = createClock();
    const opened = openNewDraft(startFreeMode(), clock.next());
    assert.equal(saveDraft(opened, clock.next()), opened);
  });
});

describe('a stop before the save (Part 2, section 4.3)', () => {
  test('the back control with text auto-saves a pending hand and records "stopped"', () => {
    const clock = createClock();
    const afterFold = doFoldTask(newSession(clock), clock);
    let state = tap(beginCurrentTask(afterFold, clock.next()), clock, openNewDraft);
    state = typeKeys(state, clock, ['A', 'K', 'o', 'r', '2', '.', '5', 'bb']);
    state = tap(state, clock, leaveDraft);
    const row = state.test.rows[1];
    assert.equal(row.result, TASK_RESULT.STOPPED);
    assert.equal(row.savedText, 'AKo r2.5bb');
    assert.equal(row.isWithinLimit, false);
    assert.equal(row.matchesReference, false);
    assert.equal(state.tournament.continuationHandNumber, 29);
    assert.equal(state.tournament.counts.pending, 4);
    assert.equal(state.screen, SCREEN.TASK);
  });

  test('the back control with an empty box saves nothing and does not move the position', () => {
    const clock = createClock();
    const free = startFreeMode();
    const state = leaveDraft(openNewDraft(free, clock.next()), clock.next());
    assert.equal(state.screen, SCREEN.LIVE);
    assert.equal(state.tournament.records.length, free.tournament.records.length);
    assert.equal(state.tournament.heroPosition, free.tournament.heroPosition);
  });

  test('「继续」 opens the auto-saved text, and the save does not move the position again', () => {
    const clock = createClock();
    const opened = typeKeys(openNewDraft(startFreeMode(), clock.next()), clock, ['A', 'K', 'o']);
    const left = leaveDraft(opened, clock.next());
    const continued = openContinuationDraft(left);
    assert.equal(continued.draft.text, 'AKo');
    assert.equal(continued.draft.caret, 3);
    assert.equal(continued.tournament.continuationHandNumber, null);
    const saved = saveDraft(typeKeys(continued, clock, ['r', '3', 'k']), clock.next());
    assert.equal(saved.tournament.records.at(-1).text, 'AKo r3k');
    assert.equal(saved.tournament.heroPosition, left.tournament.heroPosition);
    assert.equal(saved.tournament.nextHandNumber, left.tournament.nextHandNumber);
  });

  test('a reload in P07 auto-saves the input and records "stopped" at the last user action', () => {
    const clock = createClock();
    const afterFold = doFoldTask(newSession(clock), clock);
    let state = tap(beginCurrentTask(afterFold, clock.next()), clock, openNewDraft);
    state = typeKeys(state, clock, ['A', 'K', 'o']);
    const lastKeyAt = clock.now();
    const recovered = recoverAfterReload(state);
    const row = recovered.test.rows[1];
    assert.equal(row.result, TASK_RESULT.STOPPED);
    assert.equal(row.savedText, 'AKo');
    assert.equal(row.timeMs, lastKeyAt - state.test.measurement.startedAtMs);
    assert.equal(recovered.tournament.continuationHandNumber, 29);
    assert.equal(recovered.screen, SCREEN.TASK);
  });

  test('a reload in P07 of the free mode shows P06 with the continuation bar', () => {
    const clock = createClock();
    const state = typeKeys(openNewDraft(startFreeMode(), clock.next()), clock, ['Q', 'Q']);
    const recovered = recoverAfterReload(state);
    assert.equal(recovered.screen, SCREEN.LIVE);
    assert.equal(recovered.tournament.records.at(-1).text, 'QQ');
    assert.equal(recovered.tournament.continuationHandNumber, 28);
  });

  test('a reload on the home page changes nothing', () => {
    const state = createInitialAppState();
    assert.equal(recoverAfterReload(state), state);
  });
});

describe('end of a session before the last task', () => {
  test('keeps the finished tasks and marks the session as ended early', () => {
    const clock = createClock();
    const afterFold = doFoldTask(newSession(clock), clock);
    const ended = endTestSessionEarly(afterFold, clock.next());
    assert.equal(ended.screen, SCREEN.RESULTS);
    assert.equal(sessionSnapshot(ended).hasEndedEarly, true);
    assert.equal(sessionSnapshot(ended).rows.length, 1);
  });
});

describe('state from the browser storage', () => {
  test('accepts the states that the prototype makes', () => {
    const clock = createClock();
    assert.equal(isValidAppState(createInitialAppState()), true);
    assert.equal(isValidAppState(startFreeMode()), true);
    assert.equal(isValidAppState(openNewDraft(startFreeMode(), clock.next())), true);
    assert.equal(isValidAppState(newSession(clock)), true);
  });

  test('rejects a state with a different shape', () => {
    assert.equal(isValidAppState(null), false);
    assert.equal(isValidAppState({ version: 99 }), false);
    assert.equal(isValidAppState({ ...createInitialAppState(), screen: 'other' }), false);
    assert.equal(isValidAppState({ ...startFreeMode(), tournament: null }), false);
    assert.equal(isValidAppState({ ...createInitialAppState(), mode: 'test', test: null }), false);
  });
});
