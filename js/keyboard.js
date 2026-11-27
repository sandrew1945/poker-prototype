/**
 * The poker keyboard of the page P07: the keys and the text rules.
 *
 * Source: "Poker PRD Part 2", section 4.2 (the text of each key and the space
 * rules) and M4-02 (the delete key). All functions are pure.
 */
import { positionsFor } from './positions.js';

/** The kind of a key gives its space rule (Part 2, section 4.2). */
export const KEY_KIND = Object.freeze({
  WORD_START: 'wordStart',
  CONTINUATION: 'continuation',
  DELETE: 'delete',
});

export const SPACE_KEY_ID = 'space';
export const DELETE_KEY_ID = 'delete';

const TRAILING_WHITESPACE = /\s$/;

function makeKey({ id, label = id, hint = '', text = id, kind, hasTrailingSpace = false }) {
  return Object.freeze({ id, label, hint, text, kind, hasTrailingSpace });
}

function wordStartKey(text, hint = '', hasTrailingSpace = false) {
  return makeKey({ id: text, hint, kind: KEY_KIND.WORD_START, hasTrailingSpace });
}

function continuationKey(text, hint = '') {
  return makeKey({ id: text, hint, kind: KEY_KIND.CONTINUATION });
}

/** Row K2: the action keys. */
const ACTION_KEYS = Object.freeze([
  wordStartKey('f', '弃牌'),
  wordStartKey('x', '过牌'),
  wordStartKey('c', '跟注'),
  wordStartKey('b', '下注'),
  wordStartKey('r', '加注到'),
  wordStartKey('ai', '全下'),
  wordStartKey('/', '下一街', true),
  wordStartKey('win', '赢'),
  wordStartKey('lose', '输'),
]);

/** Row K3: the rank keys. */
const RANK_KEYS = Object.freeze(['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6'].map((rank) => continuationKey(rank)));

/** Row K4: the number and unit keys. */
const NUMBER_KEYS = Object.freeze([
  ...['5', '4', '3', '2', '1', '0', '.'].map((digit) => continuationKey(digit)),
  continuationKey('k', '×1000'),
  continuationKey('bb', 'BB倍数'),
]);

const DELETE_KEY = makeKey({ id: DELETE_KEY_ID, label: '⌫', hint: '删除', text: '', kind: KEY_KIND.DELETE });

/** Row K5: the suit keys, the category keys, and the delete key. */
const SUIT_KEYS = Object.freeze([
  continuationKey('♠'),
  continuationKey('♥'),
  continuationKey('♦'),
  continuationKey('♣'),
  continuationKey('s', '同花'),
  continuationKey('o', '杂色'),
  continuationKey('?', '未知牌'),
  continuationKey('+', '加注额'),
  DELETE_KEY,
]);

/** Row K6: the space key. The other two controls of row K6 are not keys. */
export const SPACE_KEY = makeKey({ id: SPACE_KEY_ID, label: '空格', text: ' ', kind: KEY_KIND.CONTINUATION });

/**
 * Gives the position keys (row K1) for a number of players.
 * @param {number} playerCount - the number of players in the rotation
 * @returns {object[]} one word-start key with a trailing space for each position
 */
export function positionKeys(playerCount) {
  return positionsFor(playerCount).map((position) => wordStartKey(position, '', true));
}

/**
 * Gives the rows K1 to K5 of the poker keyboard.
 * @param {number} playerCount - the number of players in the rotation
 * @returns {{ rowId: string, keys: object[] }[]} the five rows, from top to bottom
 */
export function keyboardRows(playerCount) {
  return [
    { rowId: 'K1', keys: positionKeys(playerCount) },
    { rowId: 'K2', keys: ACTION_KEYS },
    { rowId: 'K3', keys: RANK_KEYS },
    { rowId: 'K4', keys: NUMBER_KEYS },
    { rowId: 'K5', keys: SUIT_KEYS },
  ];
}

/**
 * Finds a key by its ID.
 * @param {string} keyId - the ID of the key
 * @param {number} playerCount - the number of players (for the position keys)
 * @returns {object} the key
 * @throws {RangeError} if no key has this ID
 */
export function findKey(keyId, playerCount) {
  if (keyId === SPACE_KEY_ID) {
    return SPACE_KEY;
  }
  for (const row of keyboardRows(playerCount)) {
    const key = row.keys.find((candidate) => candidate.id === keyId);
    if (key) {
      return key;
    }
  }
  throw new RangeError(`Unknown key "${keyId}".`);
}

/**
 * Makes the entry of the shorthand box. The history keeps the text of each
 * key press, so the delete key can remove the text of the last key press.
 * @param {string} [text] - the start text
 * @param {number} [caret] - the caret position
 * @returns {{ text: string, caret: number, history: string[] }} the entry
 */
export function createEntry(text = '', caret = text.length) {
  return { text, caret: clampCaret(caret, text), history: [] };
}

/**
 * Applies one key press to the entry at the caret.
 * @param {{ text: string, caret: number, history: string[] }} entry - the current entry
 * @param {object} key - the pressed key
 * @returns {{ text: string, caret: number, history: string[] }} the new entry
 */
export function pressKey(entry, key) {
  if (key.kind === KEY_KIND.DELETE) {
    return deleteBeforeCaret(entry);
  }
  return insertAtCaret(entry, textToInsert(entry.text.slice(0, entry.caret), key));
}

/**
 * Gives the text that a key adds. Space rules 1 to 3 of Part 2, section 4.2.
 * @param {string} textBeforeCaret - the text before the caret
 * @param {object} key - the pressed key
 * @returns {string} the text to insert
 */
export function textToInsert(textBeforeCaret, key) {
  const needsLeadingSpace =
    key.kind === KEY_KIND.WORD_START && textBeforeCaret.length > 0 && !TRAILING_WHITESPACE.test(textBeforeCaret);
  const leadingSpace = needsLeadingSpace ? ' ' : '';
  const trailingSpace = key.hasTrailingSpace ? ' ' : '';
  return `${leadingSpace}${key.text}${trailingSpace}`;
}

/**
 * Replaces the text of the entry after a change that the poker keyboard did
 * not make, for example the system keyboard. The history stays.
 * @param {{ text: string, caret: number, history: string[] }} entry - the current entry
 * @param {string} text - the new text
 * @param {number} caret - the new caret position
 * @returns {{ text: string, caret: number, history: string[] }} the new entry
 */
export function replaceEntryText(entry, text, caret) {
  return { ...entry, text, caret: clampCaret(caret, text) };
}

/**
 * Removes a selected range before a key press inserts text.
 * @param {{ text: string, caret: number, history: string[] }} entry - the current entry
 * @param {number} start - the start of the selection
 * @param {number} end - the end of the selection
 * @returns {{ text: string, caret: number, history: string[] }} the entry with the caret at the start
 */
export function removeSelection(entry, start, end) {
  const safeStart = clampCaret(Math.min(start, end), entry.text);
  const safeEnd = clampCaret(Math.max(start, end), entry.text);
  const text = entry.text.slice(0, safeStart) + entry.text.slice(safeEnd);
  return { ...entry, text, caret: safeStart };
}

/**
 * Gives the text that the App saves. Space rule 4: remove the spaces at the end.
 * @param {string} text - the text of the shorthand box
 * @returns {string} the text to save
 */
export function textForSave(text) {
  return text.trimEnd();
}

/**
 * Tells if the shorthand box is empty. Then the save is not available (M4-09-R7).
 * @param {string} text - the text of the shorthand box
 * @returns {boolean} true if the text has no character other than white space
 */
export function isBlankText(text) {
  return text.trim().length === 0;
}

function insertAtCaret(entry, inserted) {
  const text = entry.text.slice(0, entry.caret) + inserted + entry.text.slice(entry.caret);
  return { text, caret: entry.caret + inserted.length, history: [...entry.history, inserted] };
}

/**
 * The delete key removes all the text of the last key press, with its spaces.
 * For other text, for example from the system keyboard, it removes one character.
 */
function deleteBeforeCaret(entry) {
  if (entry.caret === 0) {
    return entry;
  }
  const lastInserted = entry.history[entry.history.length - 1];
  const textBeforeCaret = entry.text.slice(0, entry.caret);
  if (lastInserted && textBeforeCaret.endsWith(lastInserted)) {
    return removeBeforeCaret(entry, lastInserted.length, entry.history.slice(0, -1));
  }
  return removeBeforeCaret(entry, lastCharacterLength(textBeforeCaret), entry.history);
}

function removeBeforeCaret(entry, length, history) {
  const start = entry.caret - length;
  const text = entry.text.slice(0, start) + entry.text.slice(entry.caret);
  return { text, caret: start, history };
}

/** A character outside the basic plane (for example an emoji) has two code units. */
function lastCharacterLength(text) {
  const characters = Array.from(text);
  return characters[characters.length - 1].length;
}

function clampCaret(caret, text) {
  if (!Number.isInteger(caret)) {
    return text.length;
  }
  return Math.min(Math.max(caret, 0), text.length);
}
