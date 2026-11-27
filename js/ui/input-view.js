/**
 * Shows the page P07 (手牌录入): the shorthand box, the conversion bar, and
 * the poker keyboard. Layout: page drafts P07-A and P07-B of "Poker PRD
 * Part 2", section 4.4.
 */
import { conversionText } from '../amount.js';
import { isBlankText, keyboardRows } from '../keyboard.js';
import { handContextText, inputTitleText } from '../labels.js';
import { createElement, getElement, setText, setVisible } from './dom.js';

const SMALL_LABEL_LENGTH = 3;
const HERO_HINT = '我';

let builtKeyboardSignature = '';

/**
 * Shows the page P07 for a draft. The text of the box is set by showEntry().
 * @param {object} draft - the draft of the hand
 * @param {object} tournament - the tournament
 */
export function renderInputScreen(draft, tournament) {
  setText(getElement('input-title'), inputTitleText(draft.handNumber));
  renderImportantButton(draft.isImportant);
  setText(getElement('context-bar'), handContextText(draft.context));
  setText(getElement('conversion-bar'), conversionText(draft.text, draft.context.blinds.bigBlind));
  getElement('save-button').disabled = isBlankText(draft.text);
  getElement('abc-button').setAttribute('aria-pressed', String(draft.usesSystemKeyboard));
  buildPokerKeys(tournament.playerCount, draft.context.heroPosition);
  // The system keyboard covers the lower half, so rows K1 to K5 are hidden while it is in use.
  setVisible(getElement('poker-keys'), !draft.usesSystemKeyboard);
}

/**
 * Puts the text and the caret of the draft into the shorthand box.
 * @param {{ text: string, caret: number }} draft - the draft
 */
export function showEntry(draft) {
  const box = getShorthandBox();
  if (box.value !== draft.text) {
    box.value = draft.text;
  }
  box.setSelectionRange(draft.caret, draft.caret);
  if (draft.caret === draft.text.length) {
    box.scrollTop = box.scrollHeight;
  }
}

/**
 * Puts the input focus in the shorthand box (M4-01-R2). With the poker
 * keyboard, the box has the input mode "none": the caret shows, but the system
 * keyboard does not open.
 * @param {boolean} usesSystemKeyboard - true to open the system keyboard
 */
export function focusShorthandBox(usesSystemKeyboard) {
  const box = getShorthandBox();
  const inputMode = usesSystemKeyboard ? 'text' : 'none';
  if (box.getAttribute('inputmode') !== inputMode) {
    // A change of the input mode applies at the next focus.
    box.blur();
    box.setAttribute('inputmode', inputMode);
  }
  box.focus({ preventScroll: true });
}

/**
 * Reads the selection of the shorthand box.
 * @returns {{ start: number, end: number }} the selection
 */
export function readSelection() {
  const box = getShorthandBox();
  return { start: box.selectionStart, end: box.selectionEnd };
}

/**
 * Gives the shorthand box.
 * @returns {HTMLTextAreaElement} the box
 */
export function getShorthandBox() {
  return getElement('shorthand-input');
}

function renderImportantButton(isImportant) {
  const button = getElement('important-button');
  setText(button, isImportant ? '★ 重要' : '☆ 重要');
  button.setAttribute('aria-pressed', String(isImportant));
}

/** Builds rows K1 to K5 again only when the players or Hero's position change. */
function buildPokerKeys(playerCount, heroPosition) {
  const signature = `${playerCount}:${heroPosition}`;
  if (signature === builtKeyboardSignature) {
    return;
  }
  const rows = keyboardRows(playerCount).map(({ rowId, keys }) => {
    const row = createElement('div', { className: 'keyboard-row' });
    row.dataset.row = rowId;
    row.append(...keys.map((key) => createKeyButton(key, rowId === 'K1', key.id === heroPosition)));
    return row;
  });
  getElement('poker-keys').replaceChildren(...rows);
  builtKeyboardSignature = signature;
}

function createKeyButton(key, isPositionKey, isHeroPosition) {
  const button = createElement('button', { className: isHeroPosition ? 'key key-hero' : 'key' });
  button.type = 'button';
  button.dataset.key = key.id;
  button.setAttribute('aria-label', key.hint ? `${key.label} ${key.hint}` : key.label);
  const isSmall = isPositionKey || key.label.length >= SMALL_LABEL_LENGTH;
  button.append(createElement('span', { className: isSmall ? 'key-label key-label-small' : 'key-label', text: key.label }));
  const hint = isHeroPosition ? HERO_HINT : key.hint;
  if (hint) {
    button.append(createElement('span', { className: 'key-hint', text: hint }));
  }
  return button;
}
