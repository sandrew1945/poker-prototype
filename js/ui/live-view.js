/**
 * Shows the status bar, the test banner, and the page P06 (现场主屏).
 * Layout: page drafts P06-A and P06-B of "Poker PRD Part 2", section 4.4.
 */
import { formatChips } from '../amount.js';
import {
  bigBlindDepthText, blindsText, continuationTitleText, countsText, handsButtonText, nextHandContextText,
  recentRecordText, resultBarText,
} from '../labels.js';
import { findRecord, recentRecords } from '../tournament.js';
import { createElement, getElement, setText, setVisible } from './dom.js';

/**
 * Shows the status bar (P06-C1 to P06-C3). The clock does not run in the prototype.
 * @param {object} tournament - the tournament
 */
export function renderStatusBar(tournament) {
  setText(getElement('status-level'), tournament.level);
  setText(getElement('status-countdown'), tournament.countdown);
  setText(getElement('status-blinds'), blindsText(tournament.blinds));
  setText(getElement('status-position'), tournament.heroPosition);
  setText(getElement('status-chips'), formatChips(tournament.chips));
  setText(getElement('status-depth'), bigBlindDepthText(tournament.chips, tournament.blinds.bigBlind));
}

/**
 * Shows the test hand during a test task. The player does not have to remember it.
 * @param {object | null} task - the current test task, or null to hide the banner
 * @param {number} taskNumber - the number of the task in the session
 * @param {number} taskCount - the number of tasks in the session
 */
export function renderTestBanner(task, taskNumber, taskCount) {
  const banner = getElement('test-banner');
  setVisible(banner, task !== null);
  if (!task) {
    return;
  }
  setText(getElement('test-banner-title'), `测试 ${taskNumber}/${taskCount} · ${task.taskId} ${task.handName}`);
  setText(getElement('test-banner-hand'), task.reference ?? task.situation);
}

/**
 * Shows the page P06.
 * @param {object} tournament - the tournament
 */
export function renderLiveScreen(tournament) {
  setText(getElement('live-title'), tournament.name);
  renderContinuationBar(tournament);
  setText(getElement('next-hand-title'), `下一手：第 ${tournament.nextHandNumber} 手`);
  setText(getElement('next-hand-context'), nextHandContextText(tournament));
  setText(getElement('session-counts'), countsText(tournament.counts));
  renderRecentRecords(tournament);
  renderResultBar(tournament.lastResult);
  setText(getElement('hands-button'), handsButtonText(tournament.counts.pending));
}

function renderContinuationBar(tournament) {
  const record =
    tournament.continuationHandNumber === null ? null : findRecord(tournament, tournament.continuationHandNumber);
  setVisible(getElement('continuation-bar'), record !== null);
  if (!record) {
    return;
  }
  setText(getElement('continuation-title'), continuationTitleText(record.handNumber));
  setText(getElement('continuation-raw'), record.text);
}

function renderRecentRecords(tournament) {
  const items = recentRecords(tournament).map((record) => {
    const { main, tag } = recentRecordText(record);
    const item = createElement('li', { className: 'recent-record' });
    item.append(createElement('span', { className: 'recent-record-main', text: main }));
    item.append(createElement('span', { className: 'recent-record-tag', text: tag }));
    return item;
  });
  getElement('recent-records').replaceChildren(...items);
}

function renderResultBar(lastResult) {
  setVisible(getElement('record-result-bar'), lastResult !== null);
  if (!lastResult) {
    return;
  }
  setText(getElement('record-result-text'), resultBarText(lastResult));
  setVisible(getElement('undo-button'), lastResult.canUndo);
}
