import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  AMOUNT_UNIT, conversionText, convertAmount, EMPTY_CONVERSION_TEXT, findLatestAmount, formatBigBlinds,
} from '../js/amount.js';

const BIG_BLIND = 400;

describe('conversion bar (M4-06)', () => {
  test('an amount of chips shows the BB multiple (M4-06-A1)', () => {
    assert.equal(conversionText('b4000', BIG_BLIND), 'b4000 = 4,000 筹码 = 10BB（当时 BB 400）');
  });

  test('a BB multiple shows the chips (M4-06-A2)', () => {
    assert.equal(conversionText('AKo r2.5bb', BIG_BLIND), 'r2.5bb = 2.5BB = 1,000 筹码（当时 BB 400）');
  });

  test('"k" multiplies by 1,000 (M4-06-A3)', () => {
    assert.deepEqual(findLatestAmount('b3k'), { token: 'b3k', number: 3000, unit: AMOUNT_UNIT.CHIPS });
  });

  test('accepts an amount that is not on a fixed step (M4-06-A4)', () => {
    assert.equal(conversionText('r4150', BIG_BLIND), 'r4150 = 4,150 筹码 = 10.38BB（当时 BB 400）');
  });

  test('shows the last amount of the text (page draft P07-B)', () => {
    assert.equal(
      conversionText('AKo r2.5bb BB c / K72 b1200', BIG_BLIND),
      'b1200 = 1,200 筹码 = 3BB（当时 BB 400）',
    );
  });

  test('reads the raise amount "r+" and the all-in "ai"', () => {
    assert.equal(findLatestAmount('BB r+3500').token, 'r+3500');
    assert.equal(findLatestAmount('ai18500').number, 18500);
  });

  test('shows "—" for the other unit if the BB is not known (M4-06-R8)', () => {
    assert.equal(conversionText('b1200', null), 'b1200 = 1,200 筹码 = — BB');
    assert.equal(convertAmount({ number: 2.5, unit: AMOUNT_UNIT.BIG_BLINDS }, null).chips, null);
  });

  test('shows the empty text if the text has no amount', () => {
    assert.equal(conversionText('AKo r BB c / Q72', BIG_BLIND), EMPTY_CONVERSION_TEXT);
  });

  test('does not read a letter inside a word as an action', () => {
    assert.equal(findLatestAmount('abc12'), null);
  });
});

describe('number format', () => {
  test('a BB multiple has a maximum of two decimals', () => {
    assert.equal(formatBigBlinds(46.25), '46.25');
    assert.equal(formatBigBlinds(10), '10');
    assert.equal(formatBigBlinds(10.375), '10.38');
  });
});
