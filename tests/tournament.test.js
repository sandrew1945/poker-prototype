import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { positionAfterButtonMove, positionsFor } from '../js/positions.js';
import {
  clearContinuation, createSampleTournament, recentRecords, RECORD_KIND, recordOneTap, saveNewHand,
  undoLastOneTap, updateHand,
} from '../js/tournament.js';

const HAND_CONTEXT = { time: '14:41', level: 'L5', blinds: {}, heroPosition: 'CO', chips: 24000 };

describe('sample tournament (page draft P06-A)', () => {
  test('starts at hand 28 with Hero in CO and the counts 23, 4, and 3', () => {
    const tournament = createSampleTournament();
    assert.equal(tournament.nextHandNumber, 28);
    assert.equal(tournament.heroPosition, 'CO');
    assert.deepEqual(tournament.counts, { recorded: 23, skipped: 4, pending: 3 });
    assert.equal(tournament.lastResult, null);
  });

  test('has the three recent records #27, #26, and #25', () => {
    const records = recentRecords(createSampleTournament());
    assert.deepEqual(
      records.map((record) => [record.handNumber, record.kind, record.context.time]),
      [[27, RECORD_KIND.FOLD, '14:40'], [26, RECORD_KIND.PLAYED, '14:38'], [25, RECORD_KIND.SKIP, '14:36']],
    );
  });
});

describe('positions (M3-03, M4-04-A2)', () => {
  test('CO becomes HJ after one hand at a table of nine players', () => {
    assert.equal(positionAfterButtonMove('CO', 9), 'HJ');
  });

  test('BB becomes SB and then BTN', () => {
    assert.equal(positionAfterButtonMove('BB', 9), 'SB');
    assert.equal(positionAfterButtonMove('SB', 9), 'BTN');
  });

  test('nine hands bring Hero back to the start position', () => {
    let position = 'CO';
    for (let hand = 0; hand < 9; hand += 1) {
      position = positionAfterButtonMove(position, 9);
    }
    assert.equal(position, 'CO');
  });

  test('rejects an unknown number of players or position', () => {
    assert.throws(() => positionsFor(11), RangeError);
    assert.throws(() => positionAfterButtonMove('MP', 9), RangeError);
  });
});

describe('one-tap records (M4-04)', () => {
  test('a fold adds a record, moves the position, and shows the result bar', () => {
    const tournament = recordOneTap(createSampleTournament(), RECORD_KIND.FOLD, '14:41');
    assert.equal(tournament.heroPosition, 'HJ');
    assert.equal(tournament.nextHandNumber, 29);
    assert.deepEqual(tournament.counts, { recorded: 24, skipped: 4, pending: 3 });
    assert.deepEqual(tournament.lastResult, {
      handNumber: 28, kind: RECORD_KIND.FOLD, text: '', canUndo: true, isUpdate: false,
    });
    assert.equal(tournament.records.at(-1).context.heroPosition, 'CO');
  });

  test('a skip adds 1 to the skipped hands (M4-04-A3)', () => {
    const tournament = recordOneTap(createSampleTournament(), RECORD_KIND.SKIP, '14:41');
    assert.deepEqual(tournament.counts, { recorded: 23, skipped: 5, pending: 3 });
    assert.equal(tournament.heroPosition, 'HJ');
  });

  test('a mark "played" adds 1 to the pending hands (M4-04-A4)', () => {
    const tournament = recordOneTap(createSampleTournament(), RECORD_KIND.PLAYED, '14:41');
    assert.deepEqual(tournament.counts, { recorded: 24, skipped: 4, pending: 4 });
  });

  test('the undo deletes the record and moves the position back to CO (M4-04-A5)', () => {
    const sample = createSampleTournament();
    const undone = undoLastOneTap(recordOneTap(sample, RECORD_KIND.FOLD, '14:41'));
    assert.equal(undone.heroPosition, 'CO');
    assert.equal(undone.nextHandNumber, 28);
    assert.deepEqual(undone.counts, sample.counts);
    assert.equal(undone.records.length, sample.records.length);
    assert.equal(undone.lastResult, null);
  });

  test('the undo is not available after a saved hand', () => {
    const folded = recordOneTap(createSampleTournament(), RECORD_KIND.FOLD, '14:41');
    const saved = saveNewHand(folded, { text: 'AKo', isImportant: false, context: HAND_CONTEXT, isAutoSaved: false });
    assert.equal(undoLastOneTap(saved), saved);
  });

  test('rejects a kind that is not a one-tap record', () => {
    assert.throws(() => recordOneTap(createSampleTournament(), RECORD_KIND.HAND, '14:41'), RangeError);
  });
});

describe('saved hands (M4-09)', () => {
  test('a save adds a record and moves the position (M4-09-R4)', () => {
    const tournament = saveNewHand(createSampleTournament(), {
      text: 'AKo r2.5bb BB c', isImportant: true, context: HAND_CONTEXT, isAutoSaved: false,
    });
    assert.equal(tournament.heroPosition, 'HJ');
    assert.deepEqual(tournament.counts, { recorded: 24, skipped: 4, pending: 3 });
    assert.equal(tournament.records.at(-1).text, 'AKo r2.5bb BB c');
    assert.equal(tournament.records.at(-1).isImportant, true);
    assert.equal(tournament.lastResult.text, 'AKo r2.5bb BB c');
    assert.equal(tournament.continuationHandNumber, null);
  });

  test('an auto-save adds a pending hand and shows the continuation bar (M4-09-R8)', () => {
    const tournament = saveNewHand(createSampleTournament(), {
      text: 'AKo r2.5bb', isImportant: false, context: HAND_CONTEXT, isAutoSaved: true,
    });
    assert.deepEqual(tournament.counts, { recorded: 24, skipped: 4, pending: 4 });
    assert.equal(tournament.continuationHandNumber, 28);
    assert.equal(tournament.lastResult, null);
  });

  test('a change of a saved hand does not move the position', () => {
    const autoSaved = saveNewHand(createSampleTournament(), {
      text: 'AKo r2.5bb', isImportant: false, context: HAND_CONTEXT, isAutoSaved: true,
    });
    const updated = updateHand(clearContinuation(autoSaved), 28, {
      text: 'AKo r2.5bb BB c', isImportant: false, showsResult: true,
    });
    assert.equal(updated.heroPosition, autoSaved.heroPosition);
    assert.equal(updated.records.at(-1).text, 'AKo r2.5bb BB c');
    assert.equal(updated.continuationHandNumber, null);
    assert.equal(updated.lastResult.isUpdate, true);
  });

  test('rejects a change of a hand that does not exist', () => {
    assert.throws(
      () => updateHand(createSampleTournament(), 99, { text: 'x', isImportant: false, showsResult: true }),
      RangeError,
    );
  });
});
