/**
 * Copies text to the clipboard of the phone.
 *
 * A page that the phone opens from a local web server (http://192.168...) is
 * not a secure context, so the Clipboard API is not available there. Then the
 * function uses a selection and the copy command of the browser.
 */

/**
 * Copies a text.
 * @param {string} text - the text
 * @returns {Promise<boolean>} true if the browser copied the text
 */
export async function copyText(text) {
  if (window.isSecureContext && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.warn('The Clipboard API did not copy the text. The selection copy is used.', error);
    }
  }
  return copyWithSelection(text);
}

function copyWithSelection(text) {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('inputmode', 'none');
  area.style.position = 'fixed';
  area.style.top = '0';
  area.style.left = '0';
  area.style.opacity = '0';
  area.style.fontSize = '16px';
  document.body.append(area);
  area.focus();
  area.select();
  area.setSelectionRange(0, text.length);
  let isCopied = false;
  try {
    isCopied = document.execCommand('copy');
  } catch (error) {
    console.warn('The browser did not copy the text.', error);
  }
  area.remove();
  return isCopied;
}
