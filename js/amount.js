/**
 * The conversion bar of the page P07: the amount in chips and in BB.
 *
 * Source: "Poker PRD Part 2", M4-06. A number with "bb" is a BB multiple.
 * A number without "bb" is an amount of chips. "k" multiplies by 1,000.
 * All functions are pure.
 */

export const AMOUNT_UNIT = Object.freeze({ CHIPS: 'chips', BIG_BLINDS: 'bigBlinds' });

export const EMPTY_CONVERSION_TEXT = '金额换算：输入金额后，这里显示筹码额和 BB 倍数';

const UNKNOWN_VALUE = '—';
const THOUSAND = 1000;

/**
 * An action letter, then a number, then an optional unit. The action must not
 * follow a letter, so the "c" of "abc12" is not an action.
 */
const AMOUNT_PATTERN = /(?<![A-Za-z])(r\+|ai|b|r|c)(\d+(?:\.\d+)?|\.\d+)(k|bb)?/g;

/**
 * Finds the last amount in the shorthand text.
 * @param {string} text - the shorthand text
 * @returns {{ token: string, number: number, unit: string } | null}
 *   the token as typed, the number in its unit, and the unit; null if the text has no amount
 */
export function findLatestAmount(text) {
  let latest = null;
  for (const match of text.matchAll(AMOUNT_PATTERN)) {
    const [, action, digits, suffix = ''] = match;
    const isBigBlinds = suffix === 'bb';
    const multiplier = suffix === 'k' ? THOUSAND : 1;
    latest = {
      token: `${action}${digits}${suffix}`,
      number: Number(digits) * multiplier,
      unit: isBigBlinds ? AMOUNT_UNIT.BIG_BLINDS : AMOUNT_UNIT.CHIPS,
    };
  }
  return latest;
}

/**
 * Converts an amount to chips and to BB.
 * @param {{ number: number, unit: string }} amount - the amount
 * @param {number | null} bigBlind - the BB of the hand; null if it is not known
 * @returns {{ chips: number | null, bigBlinds: number | null }} null for a value that is not known
 */
export function convertAmount(amount, bigBlind) {
  const isBigBlindKnown = Number.isFinite(bigBlind) && bigBlind > 0;
  if (amount.unit === AMOUNT_UNIT.BIG_BLINDS) {
    return { chips: isBigBlindKnown ? Math.round(amount.number * bigBlind) : null, bigBlinds: amount.number };
  }
  return { chips: Math.round(amount.number), bigBlinds: isBigBlindKnown ? amount.number / bigBlind : null };
}

/**
 * Gives the text of the conversion bar for the last amount of the shorthand text.
 * Example: "b1200 = 1,200 筹码 = 3BB（当时 BB 400）".
 * @param {string} text - the shorthand text
 * @param {number | null} bigBlind - the BB of the hand; null if it is not known
 * @returns {string} the text of the conversion bar
 */
export function conversionText(text, bigBlind) {
  const amount = findLatestAmount(text);
  if (!amount) {
    return EMPTY_CONVERSION_TEXT;
  }
  const { chips, bigBlinds } = convertAmount(amount, bigBlind);
  const chipsText = `${chips === null ? UNKNOWN_VALUE : formatChips(chips)} 筹码`;
  const bigBlindsText = bigBlinds === null ? `${UNKNOWN_VALUE} BB` : `${formatBigBlinds(bigBlinds)}BB`;
  const values =
    amount.unit === AMOUNT_UNIT.BIG_BLINDS ? `${bigBlindsText} = ${chipsText}` : `${chipsText} = ${bigBlindsText}`;
  const bigBlindNote = Number.isFinite(bigBlind) ? `（当时 BB ${formatChips(bigBlind)}）` : '';
  return `${amount.token} = ${values}${bigBlindNote}`;
}

/**
 * Formats a number of chips with thousands separators, for example 24,000.
 * @param {number} chips - the number of chips
 * @returns {string} the formatted number
 */
export function formatChips(chips) {
  return Math.round(chips).toLocaleString('en-US');
}

/**
 * Formats a BB multiple with a maximum of two decimals, for example 2.5 or 46.25.
 * @param {number} bigBlinds - the BB multiple
 * @returns {string} the formatted number
 */
export function formatBigBlinds(bigBlinds) {
  return String(Number(bigBlinds.toFixed(2)));
}
