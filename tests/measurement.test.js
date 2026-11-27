import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  addKeyPress, addTap, countUserActions, isWithinTimeLimit, median, startMeasurement,
  summarizeMeasurement, TIMER_START,
} from '../js/measurement.js';

const SHOWN_AT = 1_000_000;

describe('start of the timer', () => {
  test('T08: the time starts when P06 shows', () => {
    const measurement = startMeasurement(TIMER_START.WHEN_SHOWN, SHOWN_AT);
    const tapped = addTap(measurement, SHOWN_AT + 1500);
    assert.equal(summarizeMeasurement(tapped, SHOWN_AT + 1500).timeMs, 1500);
  });

  test('T09: the time starts at the first user action', () => {
    const measurement = startMeasurement(TIMER_START.FIRST_ACTION, SHOWN_AT);
    assert.equal(measurement.startedAtMs, null);
    const tapped = addTap(measurement, SHOWN_AT + 4000);
    assert.equal(tapped.startedAtMs, SHOWN_AT + 4000);
    assert.equal(summarizeMeasurement(tapped, SHOWN_AT + 12000).timeMs, 8000);
  });

  test('T09: a key press can also be the first user action', () => {
    const measurement = addKeyPress(startMeasurement(TIMER_START.FIRST_ACTION, SHOWN_AT), 'shorthand', SHOWN_AT + 300);
    assert.equal(measurement.startedAtMs, SHOWN_AT + 300);
  });

  test('the time is not known if the timer did not start', () => {
    const measurement = startMeasurement(TIMER_START.FIRST_ACTION, SHOWN_AT);
    assert.equal(summarizeMeasurement(measurement, SHOWN_AT + 5000).timeMs, null);
  });

  test('rejects a timer start or a time that is not valid', () => {
    assert.throws(() => startMeasurement('later', SHOWN_AT), RangeError);
    assert.throws(() => startMeasurement(TIMER_START.WHEN_SHOWN, Number.NaN), RangeError);
    assert.throws(() => addTap(startMeasurement(TIMER_START.WHEN_SHOWN, SHOWN_AT), undefined), RangeError);
  });
});

describe('the three numbers', () => {
  test('T08: one tap is 1 user action, 0 typed fields, and 0 key presses (M4-04-A1)', () => {
    const measurement = addTap(startMeasurement(TIMER_START.WHEN_SHOWN, SHOWN_AT), SHOWN_AT + 900);
    const summary = summarizeMeasurement(measurement, SHOWN_AT + 900);
    assert.deepEqual(
      { userActions: summary.userActions, typedFields: summary.typedFields, keyPresses: summary.keyPresses },
      { userActions: 1, typedFields: 0, keyPresses: 0 },
    );
  });

  test('T09: two taps and one typed field are 3 user actions', () => {
    let measurement = startMeasurement(TIMER_START.FIRST_ACTION, SHOWN_AT);
    measurement = addTap(measurement, SHOWN_AT + 1000);
    for (let press = 1; press <= 10; press += 1) {
      measurement = addKeyPress(measurement, 'shorthand', SHOWN_AT + 1000 + press * 400);
    }
    measurement = addTap(measurement, SHOWN_AT + 6000);
    const summary = summarizeMeasurement(measurement, SHOWN_AT + 6000);
    assert.deepEqual(summary, { timeMs: 5000, userActions: 3, typedFields: 1, keyPresses: 10 });
  });

  test('each typed field counts one time', () => {
    let measurement = startMeasurement(TIMER_START.FIRST_ACTION, SHOWN_AT);
    measurement = addKeyPress(measurement, 'shorthand', SHOWN_AT + 1);
    measurement = addKeyPress(measurement, 'shorthand', SHOWN_AT + 2);
    measurement = addKeyPress(measurement, 'note', SHOWN_AT + 3);
    assert.equal(countUserActions(measurement), 2);
    assert.deepEqual(measurement.typedFieldIds, ['shorthand', 'note']);
  });

  test('keeps the time of the last user action', () => {
    const measurement = addTap(startMeasurement(TIMER_START.FIRST_ACTION, SHOWN_AT), SHOWN_AT + 7000);
    assert.equal(measurement.lastActivityAtMs, SHOWN_AT + 7000);
  });
});

describe('time limit of 30 seconds (decision D8)', () => {
  test('30.0 seconds is in the limit', () => {
    assert.equal(isWithinTimeLimit(30000), true);
  });

  test('30.001 seconds is not in the limit', () => {
    assert.equal(isWithinTimeLimit(30001), false);
  });

  test('a time that is not known is not in the limit', () => {
    assert.equal(isWithinTimeLimit(null), false);
  });
});

describe('median', () => {
  test('gives the middle value of an odd count', () => {
    assert.equal(median([9000, 3000, 6000]), 6000);
  });

  test('gives the mean of the two middle values of an even count', () => {
    assert.equal(median([4000, 1000, 3000, 2000]), 2500);
  });

  test('gives null for no value', () => {
    assert.equal(median([]), null);
  });
});
