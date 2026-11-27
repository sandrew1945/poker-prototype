/**
 * The browser storage of the prototype. The data stays in the browser of the
 * phone. The prototype sends no data to a server.
 *
 * The storage is not trusted: each read examines the shape of the data, and a
 * read or a write that fails does not stop the prototype.
 */
import { createInitialAppState, isValidAppState } from './app-state.js';

const APP_STATE_KEY = 'pokerPrototype.appState.v1';
const RESULTS_KEY = 'pokerPrototype.results.v1';

/**
 * Reads the state of the prototype.
 * @returns {object} the kept state, or the initial state if none is kept or it is not valid
 */
export function loadAppState() {
  const value = readJson(APP_STATE_KEY);
  return isValidAppState(value) ? value : createInitialAppState();
}

/**
 * Keeps the state of the prototype. The prototype calls it after each change,
 * so each key press is kept (M4-01-R8).
 * @param {object} state - the state
 * @returns {boolean} true if the browser kept the state
 */
export function saveAppState(state) {
  return writeJson(APP_STATE_KEY, state);
}

/**
 * Reads the test sessions.
 * @returns {object[]} the sessions, the oldest first
 */
export function loadSessions() {
  const value = readJson(RESULTS_KEY);
  return Array.isArray(value) ? value.filter(isValidSession) : [];
}

/**
 * Adds a test session, or replaces the session that has the same ID.
 * @param {object} session - the session
 * @returns {boolean} true if the browser kept the session
 */
export function saveSession(session) {
  const sessions = loadSessions();
  const index = sessions.findIndex((candidate) => candidate.id === session.id);
  const nextSessions = index === -1 ? [...sessions, session] : sessions.map((item, position) => (position === index ? session : item));
  return writeJson(RESULTS_KEY, nextSessions);
}

/**
 * Deletes all the test sessions. Only the Human does this, on the results page.
 * @returns {boolean} true if the browser deleted the sessions
 */
export function deleteAllSessions() {
  try {
    window.localStorage.removeItem(RESULTS_KEY);
    return true;
  } catch (error) {
    console.warn('The browser did not delete the results.', error);
    return false;
  }
}

function isValidSession(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    typeof value.label === 'string' &&
    Number.isFinite(value.startedAtMs) &&
    Array.isArray(value.rows)
  );
}

function readJson(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch (error) {
    console.warn(`The browser storage "${key}" could not be read.`, error);
    return null;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`The browser storage "${key}" could not be written.`, error);
    return false;
  }
}
