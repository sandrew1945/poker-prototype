/**
 * The sample tournament of the prototype and its records.
 *
 * Source: "Poker PRD Part 2", M4-04 (one-tap records and undo), M4-08 (the
 * context of a hand), M4-09 (save and auto-save), and section 4.3 (the
 * continuation bar). All functions are pure: each returns a new tournament.
 */
import { positionAfterButtonMove, positionBeforeButtonMove } from './positions.js';

export const RECORD_KIND = Object.freeze({
  FOLD: 'fold',
  SKIP: 'skip',
  PLAYED: 'played',
  HAND: 'hand',
});

/** The change of the counts on P06 for each one-tap record (M5-04-R2). */
const ONE_TAP_COUNT_CHANGES = Object.freeze({
  [RECORD_KIND.FOLD]: Object.freeze({ recorded: 1, skipped: 0, pending: 0 }),
  [RECORD_KIND.SKIP]: Object.freeze({ recorded: 0, skipped: 1, pending: 0 }),
  [RECORD_KIND.PLAYED]: Object.freeze({ recorded: 1, skipped: 0, pending: 1 }),
});

const SAVED_HAND_COUNT_CHANGE = Object.freeze({ recorded: 1, skipped: 0, pending: 0 });
const AUTO_SAVED_HAND_COUNT_CHANGE = Object.freeze({ recorded: 1, skipped: 0, pending: 1 });

/**
 * Makes the sample tournament. The values come from the page drafts of P06 and P07.
 * @returns {object} the tournament
 */
export function createSampleTournament() {
  const tournament = {
    name: '11-24 赛事',
    level: 'L5',
    countdown: '12:34',
    blinds: { smallBlind: 200, bigBlind: 400, ante: 400 },
    playerCount: 9,
    heroPosition: 'BB',
    chips: 24000,
    nextHandNumber: 25,
    counts: { recorded: 21, skipped: 3, pending: 2 },
    records: [],
    lastResult: null,
    continuationHandNumber: null,
  };
  // The three sample records #25 to #27 of the page draft P06-A. After them,
  // the next hand is #28, Hero is in CO, and the counts are 23, 4, and 3.
  const withSkip = recordOneTap(tournament, RECORD_KIND.SKIP, '14:36');
  const withPlayed = recordOneTap(withSkip, RECORD_KIND.PLAYED, '14:38');
  const withFold = recordOneTap(withPlayed, RECORD_KIND.FOLD, '14:40');
  return { ...withFold, lastResult: null };
}

/**
 * Gives the context that the App adds to a hand (M4-08-R1).
 * @param {object} tournament - the tournament
 * @param {string} time - the time of the record, for example "14:41"
 * @returns {object} the context
 */
export function buildHandContext(tournament, time) {
  return {
    time,
    level: tournament.level,
    blinds: { ...tournament.blinds },
    heroPosition: tournament.heroPosition,
    chips: tournament.chips,
  };
}

/**
 * Records a fold, a skip, or a mark "played" with one tap (M4-04).
 * @param {object} tournament - the tournament
 * @param {string} kind - RECORD_KIND.FOLD, SKIP, or PLAYED
 * @param {string} time - the time of the record
 * @returns {object} the new tournament
 * @throws {RangeError} if the kind is not a one-tap kind
 */
export function recordOneTap(tournament, kind, time) {
  const countChange = ONE_TAP_COUNT_CHANGES[kind];
  if (!countChange) {
    throw new RangeError(`"${kind}" is not a one-tap record.`);
  }
  const record = createRecord(tournament, { kind, text: '', isImportant: false, isAutoSaved: false, time });
  return {
    ...advanceToNextHand(tournament),
    records: [...tournament.records, record],
    counts: addCounts(tournament.counts, countChange),
    lastResult: { handNumber: record.handNumber, kind, text: '', canUndo: true, isUpdate: false },
    continuationHandNumber: null,
  };
}

/**
 * Deletes the last one-tap record and moves the Button back (M4-04-R7).
 * The undo is available until the next record.
 * @param {object} tournament - the tournament
 * @returns {object} the new tournament, or the same tournament if no undo is available
 */
export function undoLastOneTap(tournament) {
  const result = tournament.lastResult;
  const lastRecord = tournament.records[tournament.records.length - 1];
  if (!result || !result.canUndo || !lastRecord || lastRecord.handNumber !== result.handNumber) {
    return tournament;
  }
  return {
    ...tournament,
    heroPosition: positionBeforeButtonMove(tournament.heroPosition, tournament.playerCount),
    nextHandNumber: tournament.nextHandNumber - 1,
    records: tournament.records.slice(0, -1),
    counts: subtractCounts(tournament.counts, ONE_TAP_COUNT_CHANGES[lastRecord.kind]),
    lastResult: null,
  };
}

/**
 * Saves a new hand from P07 (M4-09-R4) or auto-saves an input that the player left (M4-09-R8).
 * @param {object} tournament - the tournament
 * @param {{ text: string, isImportant: boolean, context: object, isAutoSaved: boolean }} hand - the hand
 * @returns {object} the new tournament
 */
export function saveNewHand(tournament, { text, isImportant, context, isAutoSaved }) {
  const record = { ...createRecord(tournament, { kind: RECORD_KIND.HAND, text, isImportant, isAutoSaved }), context };
  return {
    ...advanceToNextHand(tournament),
    records: [...tournament.records, record],
    counts: addCounts(tournament.counts, isAutoSaved ? AUTO_SAVED_HAND_COUNT_CHANGE : SAVED_HAND_COUNT_CHANGE),
    lastResult: isAutoSaved
      ? null
      : { handNumber: record.handNumber, kind: RECORD_KIND.HAND, text, canUndo: false, isUpdate: false },
    continuationHandNumber: isAutoSaved ? record.handNumber : null,
  };
}

/**
 * Changes the text of a saved hand. The Button does not move (Part 2, section 4.3).
 * @param {object} tournament - the tournament
 * @param {number} handNumber - the number of the hand
 * @param {{ text: string, isImportant: boolean, showsResult: boolean }} change - the change
 * @returns {object} the new tournament
 * @throws {RangeError} if no saved hand has this number
 */
export function updateHand(tournament, handNumber, { text, isImportant, showsResult }) {
  const index = tournament.records.findIndex(
    (record) => record.handNumber === handNumber && record.kind === RECORD_KIND.HAND,
  );
  if (index === -1) {
    throw new RangeError(`No saved hand has the number ${handNumber}.`);
  }
  const records = tournament.records.map((record, position) =>
    position === index ? { ...record, text, isImportant } : record,
  );
  const lastResult = showsResult
    ? { handNumber, kind: RECORD_KIND.HAND, text, canUndo: false, isUpdate: true }
    : tournament.lastResult;
  return { ...tournament, records, lastResult };
}

/**
 * Removes the continuation bar. The bar goes when the player taps 「继续」 (Part 2, section 4.3).
 * @param {object} tournament - the tournament
 * @returns {object} the new tournament
 */
export function clearContinuation(tournament) {
  return { ...tournament, continuationHandNumber: null };
}

/**
 * Finds a record by the number of its hand.
 * @param {object} tournament - the tournament
 * @param {number} handNumber - the number of the hand
 * @returns {object | null} the record, or null
 */
export function findRecord(tournament, handNumber) {
  return tournament.records.find((record) => record.handNumber === handNumber) ?? null;
}

/**
 * Gives the most recent records, the newest first (P06-C9).
 * @param {object} tournament - the tournament
 * @param {number} [count] - the number of records
 * @returns {object[]} the records
 */
export function recentRecords(tournament, count = 3) {
  return tournament.records.slice(-count).reverse();
}

function createRecord(tournament, { kind, text, isImportant, isAutoSaved, time }) {
  return {
    handNumber: tournament.nextHandNumber,
    kind,
    text,
    isImportant,
    isAutoSaved,
    context: buildHandContext(tournament, time),
  };
}

function advanceToNextHand(tournament) {
  return {
    ...tournament,
    heroPosition: positionAfterButtonMove(tournament.heroPosition, tournament.playerCount),
    nextHandNumber: tournament.nextHandNumber + 1,
  };
}

function addCounts(counts, change) {
  return {
    recorded: counts.recorded + change.recorded,
    skipped: counts.skipped + change.skipped,
    pending: counts.pending + change.pending,
  };
}

function subtractCounts(counts, change) {
  return addCounts(counts, {
    recorded: -change.recorded,
    skipped: -change.skipped,
    pending: -change.pending,
  });
}
