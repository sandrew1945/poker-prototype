/**
 * Small helpers for the page elements. Typed text goes into the page only as
 * text (textContent), never as HTML.
 */

/**
 * Gets an element of the page by its ID.
 * @param {string} id - the ID
 * @returns {HTMLElement} the element
 * @throws {Error} if the page has no element with this ID
 */
export function getElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`The page has no element "#${id}".`);
  }
  return element;
}

/**
 * Sets the text of an element.
 * @param {HTMLElement} element - the element
 * @param {string} text - the text
 */
export function setText(element, text) {
  element.textContent = text;
}

/**
 * Shows or hides an element.
 * @param {HTMLElement} element - the element
 * @param {boolean} isVisible - true to show the element
 */
export function setVisible(element, isVisible) {
  element.hidden = !isVisible;
}

/**
 * Makes an element with a class and a text.
 * @param {string} tagName - the tag name
 * @param {{ className?: string, text?: string }} [options] - the class and the text
 * @returns {HTMLElement} the element
 */
export function createElement(tagName, { className = '', text = '' } = {}) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (text) {
    element.textContent = text;
  }
  return element;
}

let toastTimer = null;
const TOAST_DURATION_MS = 1600;

/**
 * Shows a short message that goes away by itself.
 * @param {string} message - the message
 */
export function showToast(message) {
  const toast = getElement('toast');
  setText(toast, message);
  setVisible(toast, true);
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => setVisible(toast, false), TOAST_DURATION_MS);
}
