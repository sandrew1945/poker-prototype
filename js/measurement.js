/**
 * The measurement of one test task: the time, the user actions, the typed
 * fields, and the key presses.
 *
 * Definitions:
 * - One user action is one tap, or one typed field ("Poker PRD Part 1", section 1.2).
 * - One key press is one press of a key in a typed field. This includes the
 *   shortcut keys and the delete key ("Poker PRD Part 2", section 1.2).
 * - The time of T08 starts when the prototype shows P06 for the task. The time
 *   of T09 starts at the first user action of the task (card POKER-13).
 *
 * All functions are pure: each returns a new measurement.
 */

/** When the timer of a task starts. */
export const TIMER_START = Object.freeze({
  WHEN_SHOWN: 'whenShown',
  FIRST_ACTION: 'firstAction',
});

/** The time limit of the task T09 in seconds (decision D8). */
export const TIME_LIMIT_SECONDS = 30;

const MILLISECONDS_PER_SECOND = 1000;

/**
 * Starts the measurement of a task.
 * @param {string} timerStart - TIMER_START.WHEN_SHOWN or TIMER_START.FIRST_ACTION
 * @param {number} shownAtMs - the time when the prototype shows P06 for the task
 * @returns {object} the measurement
 * @throws {RangeError} if an argument is not valid
 */
export function startMeasurement(timerStart, shownAtMs) {
  if (!Object.values(TIMER_START).includes(timerStart)) {
    throw new RangeError(`Unknown timer start "${timerStart}".`);
  }
  assertTime(shownAtMs);
  return {
    timerStart,
    shownAtMs,
    startedAtMs: timerStart === TIMER_START.WHEN_SHOWN ? shownAtMs : null,
    lastActivityAtMs: shownAtMs,
    taps: 0,
    keyPresses: 0,
    typedFieldIds: [],
  };
}

/**
 * Records one tap on a control.
 * @param {object} measurement - the current measurement
 * @param {number} atMs - the time of the tap
 * @returns {object} the new measurement
 */
export function addTap(measurement, atMs) {
  return { ...markActivity(measurement, atMs), taps: measurement.taps + 1 };
}

/**
 * Records one key press in a typed field. The first key press in a field makes
 * that field a typed field.
 * @param {object} measurement - the current measurement
 * @param {string} fieldId - the ID of the typed field
 * @param {number} atMs - the time of the key press
 * @returns {object} the new measurement
 */
export function addKeyPress(measurement, fieldId, atMs) {
  const typedFieldIds = measurement.typedFieldIds.includes(fieldId)
    ? measurement.typedFieldIds
    : [...measurement.typedFieldIds, fieldId];
  return { ...markActivity(measurement, atMs), keyPresses: measurement.keyPresses + 1, typedFieldIds };
}

/**
 * Counts the user actions: each tap, and each typed field one time.
 * @param {object} measurement - the measurement
 * @returns {number} the number of user actions
 */
export function countUserActions(measurement) {
  return measurement.taps + measurement.typedFieldIds.length;
}

/**
 * Gives the three numbers and the time of a task at its end.
 * @param {object} measurement - the measurement
 * @param {number} endedAtMs - the time of the save or of the stop
 * @returns {{ timeMs: number | null, userActions: number, typedFields: number, keyPresses: number }}
 *   timeMs is null if the timer did not start
 */
export function summarizeMeasurement(measurement, endedAtMs) {
  assertTime(endedAtMs);
  const timeMs = measurement.startedAtMs === null ? null : Math.max(0, endedAtMs - measurement.startedAtMs);
  return {
    timeMs,
    userActions: countUserActions(measurement),
    typedFields: measurement.typedFieldIds.length,
    keyPresses: measurement.keyPresses,
  };
}

/**
 * Compares a time with the time limit.
 * @param {number | null} timeMs - the time of the task
 * @param {number} [limitSeconds] - the time limit
 * @returns {boolean} true if the time is known and is the limit or less
 */
export function isWithinTimeLimit(timeMs, limitSeconds = TIME_LIMIT_SECONDS) {
  return Number.isFinite(timeMs) && timeMs <= limitSeconds * MILLISECONDS_PER_SECOND;
}

/**
 * Gives the median of a list of numbers.
 * @param {number[]} values - the numbers
 * @returns {number | null} the median, or null if the list is empty
 */
export function median(values) {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function markActivity(measurement, atMs) {
  assertTime(atMs);
  return {
    ...measurement,
    startedAtMs: measurement.startedAtMs ?? atMs,
    lastActivityAtMs: Math.max(measurement.lastActivityAtMs, atMs),
  };
}

function assertTime(timeMs) {
  if (!Number.isFinite(timeMs)) {
    throw new RangeError(`A time must be a finite number of milliseconds. Received: ${timeMs}`);
  }
}
