/**
 * The results of the test sessions: one row for each task, the median time of
 * the task T09, and the text that the Human copies. All functions are pure.
 */
import { isWithinTimeLimit, median, summarizeMeasurement, TIME_LIMIT_SECONDS } from './measurement.js';

export const TASK_RESULT = Object.freeze({
  COMPLETED: 'completed',
  STOPPED: 'stopped',
});

const TIMED_TASK_ID = 'T09';
const NO_VALUE = '-';

/**
 * Makes the result row of a task.
 * @param {object} task - the test task (see session-plan.js)
 * @param {object} measurement - the measurement of the task
 * @param {{ result: string, savedText: string, matchesReference: boolean, endedAtMs: number }} outcome
 *   the end of the task
 * @returns {object} the result row
 */
export function buildTaskRow(task, measurement, outcome) {
  const summary = summarizeMeasurement(measurement, outcome.endedAtMs);
  return {
    taskId: task.taskId,
    exampleId: task.exampleId,
    handName: task.handName,
    handNameInEnglish: task.handNameInEnglish,
    timeMs: summary.timeMs,
    userActions: summary.userActions,
    typedFields: summary.typedFields,
    keyPresses: summary.keyPresses,
    result: outcome.result,
    savedText: outcome.savedText,
    matchesReference: outcome.matchesReference,
    isWithinLimit: isRowWithinLimit(task, outcome.result, summary.timeMs),
  };
}

/**
 * Gives the median time of the completed T09 tasks of a session.
 * @param {object[]} rows - the result rows of the session
 * @returns {number | null} the median in milliseconds, or null if no T09 task is complete
 */
export function medianTimedTaskMs(rows) {
  const times = rows
    .filter((row) => row.taskId === TIMED_TASK_ID && row.result === TASK_RESULT.COMPLETED && row.timeMs !== null)
    .map((row) => row.timeMs);
  return median(times);
}

/**
 * Formats a time in seconds with one decimal.
 * @param {number | null} timeMs - the time in milliseconds
 * @returns {string} for example "8.3", or "-" if the time is not known
 */
export function formatSeconds(timeMs) {
  return Number.isFinite(timeMs) ? (timeMs / 1000).toFixed(1) : NO_VALUE;
}

/**
 * Formats a time stamp as local date and time, for example "2026-11-27 15:04".
 * @param {number} timeMs - the time stamp
 * @returns {string} the date and time
 */
export function formatDateTime(timeMs) {
  const date = new Date(timeMs);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Makes the text of all the results. The Human copies it into a comment on the card POKER-13.
 * @param {object[]} sessions - the sessions, the oldest first
 * @param {number} copiedAtMs - the time of the copy
 * @returns {string} the text
 */
export function formatResultsText(sessions, copiedAtMs) {
  const header = [
    'POKER-13 prototype test results',
    `Copied at: ${formatDateTime(copiedAtMs)}`,
    `Time limit of T09: ${TIME_LIMIT_SECONDS} s. Pass condition: T09 example hand 1 in ${TIME_LIMIT_SECONDS} s or less.`,
    `Sessions: ${sessions.length}`,
  ];
  const blocks = sessions.map((session, index) => formatSessionText(session, index + 1));
  return [header.join('\n'), ...blocks].join('\n\n');
}

function formatSessionText(session, sessionNumber) {
  const columns = [
    'Task', 'Test hand', 'Time (s)', 'User actions', 'Typed fields', 'Key presses',
    'Result', `In ${TIME_LIMIT_SECONDS} s limit`, 'Same as reference', 'Saved text',
  ];
  const lines = [
    `Session ${sessionNumber}: label "${session.label || '(no label)'}"`,
    `Started: ${formatDateTime(session.startedAtMs)}. Status: ${sessionStatus(session)}.`,
    `Median time of T09 (completed tasks): ${formatSeconds(medianTimedTaskMs(session.rows))} s`,
    columns.join(' | '),
    ...session.rows.map(formatRowText),
  ];
  return lines.join('\n');
}

function formatRowText(row) {
  return [
    row.taskId,
    row.handNameInEnglish,
    formatSeconds(row.timeMs),
    row.userActions,
    row.typedFields,
    row.keyPresses,
    row.result,
    formatYesNo(row.isWithinLimit),
    formatYesNo(row.matchesReference),
    toSingleLine(row.savedText) || NO_VALUE,
  ].join(' | ');
}

function sessionStatus(session) {
  if (session.finishedAtMs === null) {
    return 'not complete';
  }
  return session.hasEndedEarly ? 'ended early' : 'complete';
}

function formatYesNo(value) {
  if (value === null) {
    return NO_VALUE;
  }
  return value ? 'yes' : 'no';
}

function toSingleLine(text) {
  return text.replace(/\s*\n\s*/g, ' ↵ ');
}

function isRowWithinLimit(task, result, timeMs) {
  if (task.timeLimitSeconds === null) {
    return null;
  }
  return result === TASK_RESULT.COMPLETED && isWithinTimeLimit(timeMs, task.timeLimitSeconds);
}
