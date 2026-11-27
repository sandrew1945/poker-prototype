import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { addKeyPress, addTap, startMeasurement, TIMER_START } from '../js/measurement.js';
import { buildTaskRow, formatResultsText, formatSeconds, medianTimedTaskMs, TASK_RESULT } from '../js/results.js';
import { TEST_TASKS } from '../js/session-plan.js';

const START = 1_700_000_000_000;

function timedRow(timeMs, result = TASK_RESULT.COMPLETED) {
  const measurement = addTap(startMeasurement(TIMER_START.FIRST_ACTION, START), START);
  return buildTaskRow(TEST_TASKS[1], measurement, {
    result,
    savedText: 'AKo r2.5bb BB c',
    matchesReference: result === TASK_RESULT.COMPLETED,
    endedAtMs: START + timeMs,
  });
}

describe('result rows', () => {
  test('a T09 row has the time, the three numbers, and the comparison with the limit', () => {
    let measurement = addTap(startMeasurement(TIMER_START.FIRST_ACTION, START), START + 1000);
    measurement = addKeyPress(measurement, 'shorthand', START + 2000);
    measurement = addTap(measurement, START + 9000);
    const row = buildTaskRow(TEST_TASKS[1], measurement, {
      result: TASK_RESULT.COMPLETED, savedText: 'AKo', matchesReference: false, endedAtMs: START + 9000,
    });
    assert.deepEqual(row, {
      taskId: 'T09',
      exampleId: 'example-1',
      handName: '例子 1',
      handNameInEnglish: 'Example hand 1',
      timeMs: 8000,
      userActions: 3,
      typedFields: 1,
      keyPresses: 1,
      result: TASK_RESULT.COMPLETED,
      savedText: 'AKo',
      matchesReference: false,
      isWithinLimit: true,
    });
  });

  test('a T08 row has no comparison with the limit', () => {
    const measurement = addTap(startMeasurement(TIMER_START.WHEN_SHOWN, START), START + 800);
    const row = buildTaskRow(TEST_TASKS[0], measurement, {
      result: TASK_RESULT.COMPLETED, savedText: '弃牌（底牌未知）', matchesReference: true, endedAtMs: START + 800,
    });
    assert.equal(row.isWithinLimit, null);
    assert.equal(row.timeMs, 800);
  });

  test('a stopped T09 task is not in the limit', () => {
    assert.equal(timedRow(5000, TASK_RESULT.STOPPED).isWithinLimit, false);
  });
});

describe('median of the T09 tasks', () => {
  test('uses only the completed T09 tasks', () => {
    const rows = [timedRow(9000), timedRow(15000), timedRow(40000), timedRow(1000, TASK_RESULT.STOPPED)];
    assert.equal(medianTimedTaskMs(rows), 15000);
  });

  test('is null if no T09 task is complete', () => {
    assert.equal(medianTimedTaskMs([timedRow(1000, TASK_RESULT.STOPPED)]), null);
  });
});

describe('results text', () => {
  test('formats seconds with one decimal', () => {
    assert.equal(formatSeconds(8340), '8.3');
    assert.equal(formatSeconds(null), '-');
  });

  test('gives one line for each task and the median of each session', () => {
    const session = {
      id: 's1',
      label: 'Player A',
      startedAtMs: START,
      finishedAtMs: START + 60000,
      hasEndedEarly: false,
      rows: [timedRow(9000), timedRow(21000)],
    };
    const text = formatResultsText([session], START + 120000);
    assert.match(text, /^POKER-13 prototype test results/);
    assert.match(text, /Session 1: label "Player A"/);
    assert.match(text, /Status: complete\./);
    assert.match(text, /Median time of T09 \(completed tasks\): 15\.0 s/);
    assert.match(text, /T09 \| Example hand 1 \| 9\.0 \| 1 \| 0 \| 0 \| completed \| yes \| yes \| AKo r2\.5bb BB c/);
  });

  test('puts a saved text with line breaks on one line', () => {
    const row = { ...timedRow(9000), savedText: 'AKo\n对手很紧' };
    const session = { id: 's1', label: '', startedAtMs: START, finishedAtMs: null, hasEndedEarly: false, rows: [row] };
    const text = formatResultsText([session], START);
    assert.match(text, /AKo ↵ 对手很紧/);
    assert.match(text, /label "\(no label\)"/);
    assert.match(text, /Status: not complete\./);
  });
});
