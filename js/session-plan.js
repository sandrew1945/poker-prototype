/**
 * The tasks of one test session.
 *
 * Source: "Poker PRD Part 2", section 4.3: the task T08 and the three example
 * hands of the task T09. The order is the test path 2 (T08, then T09 with
 * example hand 1), then the other example hands. The task T09 with example
 * hand 1 is also the task T09 of the test path 1.
 */
import { TIMER_START, TIME_LIMIT_SECONDS } from './measurement.js';
import { RECORD_KIND } from './tournament.js';

export const TEST_TASKS = Object.freeze([
  Object.freeze({
    taskId: 'T08',
    exampleId: 'fold',
    taskName: '记录弃牌或跳过一手',
    handName: '弃牌（底牌未知）',
    handNameInEnglish: 'Fold, hole cards unknown',
    situation: '这一手你在翻前弃牌了，不记得底牌。记录这一手。',
    reference: null,
    keySequence: Object.freeze([]),
    expectedRecordKind: RECORD_KIND.FOLD,
    timerStart: TIMER_START.WHEN_SHOWN,
    timeLimitSeconds: null,
    timingNote: '计时：从显示现场主屏开始，到你点按钮为止。',
  }),
  Object.freeze({
    taskId: 'T09',
    exampleId: 'example-1',
    taskName: '速记一手并保存',
    handName: '例子 1',
    handNameInEnglish: 'Example hand 1',
    situation: '底牌 AKo。Hero 加注到 2.5BB，BB 跟注；后面的内容没有记。',
    reference: 'AKo r2.5bb BB c',
    keySequence: Object.freeze(['A', 'K', 'o', 'r', '2', '.', '5', 'bb', 'BB', 'c']),
    expectedRecordKind: RECORD_KIND.HAND,
    timerStart: TIMER_START.FIRST_ACTION,
    timeLimitSeconds: TIME_LIMIT_SECONDS,
    timingNote: '计时：从你在现场主屏的第一次点击开始，到你点「保存」为止。',
  }),
  Object.freeze({
    taskId: 'T09',
    exampleId: 'example-2',
    taskName: '速记一手并保存',
    handName: '例子 2',
    handNameInEnglish: 'Example hand 2',
    situation: 'Hero 持 AQs 加注（金额没有记），BB 跟注；翻牌 Q72，BB 过牌，Hero 下注 1,200，BB 弃牌。',
    reference: 'AQs r BB c / Q72 BB x b1200 BB f',
    keySequence: Object.freeze([
      'A', 'Q', 's', 'r', 'BB', 'c', '/', 'Q', '7', '2', 'BB', 'x', 'b', '1', '2', '0', '0', 'BB', 'f',
    ]),
    expectedRecordKind: RECORD_KIND.HAND,
    timerStart: TIMER_START.FIRST_ACTION,
    timeLimitSeconds: TIME_LIMIT_SECONDS,
    timingNote: '计时：从你在现场主屏的第一次点击开始，到你点「保存」为止。',
  }),
  Object.freeze({
    taskId: 'T09',
    exampleId: 'example-3',
    taskName: '速记一手并保存',
    handName: '例子 3',
    handNameInEnglish: 'Example hand 3',
    situation:
      'Hero 持 A♠K♦ 加注到 1,000，BTN 跟注；翻牌 K♥7♠2♦，Hero 下注 1,200，BTN 跟注；' +
      '转牌 5♣，Hero 下注 3,000，BTN 跟注；河牌 9♥，两人过牌；BTN 亮出 K♣Q♣。',
    reference: 'A♠K♦ r1k BTN c / K♥7♠2♦ b1200 BTN c / 5♣ b3k BTN c / 9♥ x BTN x / BTN K♣Q♣',
    keySequence: Object.freeze([
      'A', '♠', 'K', '♦', 'r', '1', 'k', 'BTN', 'c',
      '/', 'K', '♥', '7', '♠', '2', '♦', 'b', '1', '2', '0', '0', 'BTN', 'c',
      '/', '5', '♣', 'b', '3', 'k', 'BTN', 'c',
      '/', '9', '♥', 'x', 'BTN', 'x',
      '/', 'BTN', 'K', '♣', 'Q', '♣',
    ]),
    expectedRecordKind: RECORD_KIND.HAND,
    timerStart: TIMER_START.FIRST_ACTION,
    timeLimitSeconds: TIME_LIMIT_SECONDS,
    timingNote: '计时：从你在现场主屏的第一次点击开始，到你点「保存」为止。',
  }),
]);

/**
 * Tells if a record agrees with the test hand of a task.
 * @param {object} task - the test task
 * @param {{ kind: string, text: string }} record - the record that ended the task
 * @returns {boolean} true if the kind agrees, and the text agrees when the task has a reference input
 */
export function matchesTestHand(task, record) {
  if (record.kind !== task.expectedRecordKind) {
    return false;
  }
  return task.reference === null || record.text === task.reference;
}
