/**
 * Shows the pages of the prototype that are not pages of the App: the task
 * card of the test mode and the results page.
 */
import { formatDateTime, formatSeconds, medianTimedTaskMs, TASK_RESULT } from '../results.js';
import { TIME_LIMIT_SECONDS } from '../measurement.js';
import { createElement, getElement, setText, setVisible } from './dom.js';

const RESULT_LABELS = Object.freeze({
  [TASK_RESULT.COMPLETED]: '完成',
  [TASK_RESULT.STOPPED]: '停止',
});

/**
 * Shows the card of a test task: the test hand before the task.
 * @param {object} task - the test task
 * @param {number} taskNumber - the number of the task in the session
 * @param {number} taskCount - the number of tasks in the session
 * @param {object | null} previousRow - the result of the previous task, or null
 */
export function renderTaskCard(task, taskNumber, taskCount, previousRow) {
  setText(getElement('task-progress'), `测试 ${taskNumber}/${taskCount}`);
  setText(getElement('task-title'), `${task.taskId} ${task.taskName} · ${task.handName}`);
  setText(getElement('task-situation'), task.situation);
  setVisible(getElement('task-reference-block'), task.reference !== null);
  setText(getElement('task-reference'), task.reference ?? '');
  setText(getElement('task-timing'), task.timingNote);
  const previous = getElement('task-previous');
  setVisible(previous, previousRow !== null);
  if (previousRow) {
    const result = RESULT_LABELS[previousRow.result];
    setText(previous, `上一个任务：${result}，用时 ${formatSeconds(previousRow.timeMs)} 秒`);
  }
}

/**
 * Shows the results page: one block for each session, one row for each task.
 * @param {object[]} sessions - the sessions, the oldest first
 * @param {string} resultsText - the text that the Human copies
 */
export function renderResults(sessions, resultsText) {
  const blocks = sessions.map((session, index) => createSessionBlock(session, index + 1));
  if (blocks.length === 0) {
    blocks.push(createElement('p', { className: 'page-note', text: '还没有测试结果。' }));
  }
  getElement('results-sessions').replaceChildren(...blocks);
  getElement('results-text').value = resultsText;
  setText(getElement('copy-status'), '');
}

function createSessionBlock(session, sessionNumber) {
  const block = createElement('section', { className: 'result-session' });
  const label = session.label || '（没有标签）';
  block.append(createElement('h2', { className: 'result-session-title', text: `测试 ${sessionNumber}：${label}` }));
  const status = sessionStatusText(session);
  block.append(createElement('p', { className: 'page-note', text: `${formatDateTime(session.startedAtMs)} · ${status}` }));
  const median = formatSeconds(medianTimedTaskMs(session.rows));
  block.append(createElement('p', { className: 'page-note', text: `T09 用时的中位数（完成的任务）：${median} 秒` }));
  block.append(...session.rows.map(createRowBlock));
  return block;
}

function createRowBlock(row) {
  const block = createElement('div', { className: 'result-row' });
  block.append(
    createElement('div', {
      className: 'result-row-head',
      text: `${row.taskId} · ${row.handName} — ${formatSeconds(row.timeMs)} 秒${limitText(row)}`,
    }),
  );
  const numbers = `操作次数 ${row.userActions} · 键入的字段数 ${row.typedFields} · 按键次数 ${row.keyPresses}`;
  block.append(createElement('div', { className: 'result-row-line', text: numbers }));
  const match = row.matchesReference ? '与测试手牌相同' : '与测试手牌不同';
  block.append(createElement('div', { className: 'result-row-line', text: `结果：${RESULT_LABELS[row.result]} · ${match}` }));
  block.append(createElement('div', { className: 'result-row-line', text: `保存的文本：${row.savedText || '—'}` }));
  return block;
}

/** The comparison with the limit. A stopped task has no comparison, because it has no save. */
function limitText(row) {
  if (row.isWithinLimit === null) {
    return '';
  }
  if (row.result === TASK_RESULT.STOPPED) {
    return ' · 未完成';
  }
  return ` · ${row.isWithinLimit ? '在' : '不在'} ${TIME_LIMIT_SECONDS} 秒内`;
}

function sessionStatusText(session) {
  if (session.finishedAtMs === null) {
    return '没有完成';
  }
  return session.hasEndedEarly ? '提前结束' : '完成';
}
