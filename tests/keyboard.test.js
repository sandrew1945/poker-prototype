import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  createEntry, DELETE_KEY_ID, findKey, isBlankText, keyboardRows, pressKey, removeSelection,
  replaceEntryText, SPACE_KEY_ID, textForSave,
} from '../js/keyboard.js';
import { TEST_TASKS } from '../js/session-plan.js';

const PLAYER_COUNT = 9;

/** Presses the keys in order from an empty box and keeps the text after each key. */
function typeKeys(keyIds, start = createEntry()) {
  const steps = [];
  let entry = start;
  for (const keyId of keyIds) {
    entry = pressKey(entry, findKey(keyId, PLAYER_COUNT));
    steps.push(entry.text);
  }
  return { entry, steps };
}

describe('poker keyboard layout (P07-K1 to P07-K5)', () => {
  test('has five rows of nine keys for a table of nine players', () => {
    const rows = keyboardRows(PLAYER_COUNT);
    assert.deepEqual(rows.map((row) => row.rowId), ['K1', 'K2', 'K3', 'K4', 'K5']);
    for (const row of rows) {
      assert.equal(row.keys.length, 9, `row ${row.rowId}`);
    }
  });

  test('gives the keys of Part 2, section 4.2', () => {
    const labels = keyboardRows(PLAYER_COUNT).map((row) => row.keys.map((key) => key.label));
    assert.deepEqual(labels, [
      ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
      ['f', 'x', 'c', 'b', 'r', 'ai', '/', 'win', 'lose'],
      ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6'],
      ['5', '4', '3', '2', '1', '0', '.', 'k', 'bb'],
      ['♠', '♥', '♦', '♣', 's', 'o', '?', '+', '⌫'],
    ]);
  });

  test('shows the positions of the current number of players (M4-02-A3)', () => {
    const positions = keyboardRows(8)[0].keys.map((key) => key.label);
    assert.deepEqual(positions, ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']);
  });

  test('rejects an unknown key', () => {
    assert.throws(() => findKey('Z', PLAYER_COUNT), RangeError);
  });
});

describe('space rules (Part 2, section 4.2)', () => {
  test('gives the texts of the example in Part 2 after each key', () => {
    const { steps } = typeKeys(['A', 'K', 'o', 'r', '2', '.', '5', 'bb', 'BB', 'c']);
    assert.deepEqual(
      [steps[2], steps[3], steps[6], steps[7], steps[8], steps[9]],
      ['AKo', 'AKo r', 'AKo r2.5', 'AKo r2.5bb', 'AKo r2.5bb BB ', 'AKo r2.5bb BB c'],
    );
  });

  test('adds no leading space at the start of the box', () => {
    assert.equal(typeKeys(['BTN', 'r']).entry.text, 'BTN r');
  });

  test('adds no leading space after a space', () => {
    assert.equal(typeKeys(['A', SPACE_KEY_ID, 'x']).entry.text, 'A x');
  });

  test('inserts at the caret', () => {
    const start = createEntry('AKo BB c', 3);
    assert.equal(typeKeys(['r', '3', 'k'], start).entry.text, 'AKo r3k BB c');
  });

  test('removes the spaces at the end before the save (rule 4)', () => {
    assert.equal(textForSave('AKo r2.5bb BB '), 'AKo r2.5bb BB');
  });
});

describe('example hands of the task T09 (Part 2, section 4.3)', () => {
  const expectedKeyPresses = { 'example-1': 10, 'example-2': 19, 'example-3': 43 };

  for (const task of TEST_TASKS.filter((candidate) => candidate.taskId === 'T09')) {
    test(`${task.exampleId} gives the reference text with ${expectedKeyPresses[task.exampleId]} key presses`, () => {
      const { entry } = typeKeys(task.keySequence);
      assert.equal(textForSave(entry.text), task.reference);
      assert.equal(task.keySequence.length, expectedKeyPresses[task.exampleId]);
    });
  }

  test('a fuzzy hole-card category takes 3 key presses (M4-05-A1)', () => {
    assert.equal(typeKeys(['A', 'K', 'o']).entry.text, 'AKo');
  });

  test('a fold with hole cards takes 4 key presses (M4-04-R8)', () => {
    assert.equal(typeKeys(['7', '2', 'o', 'f']).entry.text, '72o f');
  });
});

describe('delete key (M4-02-R5)', () => {
  test('removes a position key and its automatic spaces (M4-02-A4)', () => {
    const { entry } = typeKeys(['A', 'K', 'o', 'UTG+1', DELETE_KEY_ID]);
    assert.equal(entry.text, 'AKo');
  });

  test('removes the text of one key press each time', () => {
    const { entry } = typeKeys(['A', 'K', 'o', 'r', '2', 'bb', DELETE_KEY_ID, DELETE_KEY_ID]);
    assert.equal(entry.text, 'AKo r');
  });

  test('removes one character of text from the system keyboard', () => {
    const typed = replaceEntryText(createEntry('AKo'), 'AKo 对手很紧', 8);
    const entry = pressKey(typed, findKey(DELETE_KEY_ID, PLAYER_COUNT));
    assert.equal(entry.text, 'AKo 对手很');
  });

  test('does nothing at the start of the box', () => {
    const entry = pressKey(createEntry('', 0), findKey(DELETE_KEY_ID, PLAYER_COUNT));
    assert.equal(entry.text, '');
  });
});

describe('selection and blank text', () => {
  test('a key press replaces the selected text', () => {
    const entry = removeSelection(createEntry('AKo r3k'), 4, 7);
    assert.equal(pressKey(entry, findKey('x', PLAYER_COUNT)).text, 'AKo x');
  });

  test('a box with only white space is empty (M4-09-R7)', () => {
    assert.equal(isBlankText('  '), true);
    assert.equal(isBlankText(' A'), false);
  });
});
