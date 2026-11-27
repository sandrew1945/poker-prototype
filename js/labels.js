/**
 * The Chinese text of the pages P06 and P07. The text comes from the page
 * drafts of "Poker PRD Part 2", section 4.4. All functions are pure.
 */
import { formatBigBlinds, formatChips } from './amount.js';
import { RECORD_KIND } from './tournament.js';

const RECORD_LIST_LABELS = Object.freeze({
  [RECORD_KIND.FOLD]: '弃牌（底牌未知）',
  [RECORD_KIND.SKIP]: '跳过',
  [RECORD_KIND.PLAYED]: '参与底池（只有标记）',
});

const RESULT_BAR_LABELS = Object.freeze({
  [RECORD_KIND.FOLD]: '弃牌',
  [RECORD_KIND.SKIP]: '跳过',
  [RECORD_KIND.PLAYED]: '参与底池',
});

const PENDING_TAG = '待补录';
const MARK_ONLY_TAG = '仅标记';

/**
 * Formats the blinds, for example "200/400/400".
 * @param {{ smallBlind: number, bigBlind: number, ante: number }} blinds - the blinds
 * @returns {string} the text
 */
export function blindsText(blinds) {
  return `${blinds.smallBlind}/${blinds.bigBlind}/${blinds.ante}`;
}

/**
 * Formats the BB depth of the chips, for example "60BB".
 * @param {number} chips - the chips
 * @param {number} bigBlind - the BB
 * @returns {string} the text
 */
export function bigBlindDepthText(chips, bigBlind) {
  return `${formatBigBlinds(chips / bigBlind)}BB`;
}

/**
 * Formats a clock time, for example "14:41".
 * @param {number} timeMs - the time stamp
 * @returns {string} the local hours and minutes
 */
export function clockTimeText(timeMs) {
  const date = new Date(timeMs);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * The context line of the next hand on P06 (P06-C7).
 * @param {object} tournament - the tournament
 * @returns {string} for example "自动带入：L5 · 200/400/400 · CO · 筹码 24,000"
 */
export function nextHandContextText(tournament) {
  const parts = [tournament.level, blindsText(tournament.blinds), tournament.heroPosition, `筹码 ${formatChips(tournament.chips)}`];
  return `自动带入：${parts.join(' · ')}`;
}

/**
 * The context bar of P07 (P07-C4).
 * @param {object} context - the context of the hand
 * @returns {string} for example "自动带入：14:41 · L5 · 200/400/400 · CO · 筹码 24,000"
 */
export function handContextText(context) {
  const parts = [
    context.time,
    context.level,
    blindsText(context.blinds),
    context.heroPosition,
    `筹码 ${formatChips(context.chips)}`,
  ];
  return `自动带入：${parts.join(' · ')}`;
}

/**
 * The counts of the session on P06 (P06-C8).
 * @param {{ recorded: number, skipped: number, pending: number }} counts - the counts
 * @returns {string} for example "已记录 23 手 · 跳过 4 手 · 待补录 3 手"
 */
export function countsText(counts) {
  return `已记录 ${counts.recorded} 手 · 跳过 ${counts.skipped} 手 · 待补录 ${counts.pending} 手`;
}

/**
 * The text of the control 「手牌」 (P06-C12). It shows the pending count if there are pending hands.
 * @param {number} pendingCount - the number of pending hands
 * @returns {string} the text
 */
export function handsButtonText(pendingCount) {
  return pendingCount > 0 ? `手牌 · 待补录 ${pendingCount}` : '手牌';
}

/**
 * The text of one row of the recent records (P06-C9).
 * @param {object} record - the record
 * @returns {{ main: string, tag: string }} the main text and the tag at the right
 */
export function recentRecordText(record) {
  const description = record.kind === RECORD_KIND.HAND ? record.text : RECORD_LIST_LABELS[record.kind];
  return { main: `#${record.handNumber} ${record.context.time} ${description}`, tag: recordTag(record) };
}

/**
 * The text of the record result bar (P06-C10).
 * @param {object} lastResult - the last result of the tournament
 * @returns {string} for example "已记录第 27 手：弃牌"
 */
export function resultBarText(lastResult) {
  const description = lastResult.kind === RECORD_KIND.HAND ? lastResult.text : RESULT_BAR_LABELS[lastResult.kind];
  const verb = lastResult.isUpdate ? '已保存' : '已记录';
  return `${verb}第 ${lastResult.handNumber} 手：${description}`;
}

/**
 * The saved text of a one-tap record in the results.
 * @param {string} kind - the kind of the record
 * @returns {string} for example "弃牌（底牌未知）"
 */
export function oneTapSavedText(kind) {
  return RECORD_LIST_LABELS[kind] ?? '';
}

/**
 * The title of the continuation bar (P06-C6).
 * @param {number} handNumber - the number of the auto-saved hand
 * @returns {string} the title
 */
export function continuationTitleText(handNumber) {
  return `第 ${handNumber} 手是自动保存的，还没写完`;
}

/**
 * The title of P07.
 * @param {number} handNumber - the number of the hand
 * @returns {string} for example "记一手 · 第 28 手"
 */
export function inputTitleText(handNumber) {
  return `记一手 · 第 ${handNumber} 手`;
}

function recordTag(record) {
  if (record.kind === RECORD_KIND.FOLD) {
    return MARK_ONLY_TAG;
  }
  if (record.kind === RECORD_KIND.PLAYED || (record.kind === RECORD_KIND.HAND && record.isAutoSaved)) {
    return PENDING_TAG;
  }
  return '';
}
