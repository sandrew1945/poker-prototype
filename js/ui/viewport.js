/**
 * Keeps the app in the visible part of the screen. When the system keyboard
 * opens (「ABC」), the visible part becomes smaller. Then the app becomes
 * smaller too, so 「保存」 stays above the system keyboard.
 */

/**
 * Starts to follow the size of the visible part of the screen.
 * @param {HTMLElement} root - the root element of the app
 */
export function startViewportSync(root) {
  const viewport = window.visualViewport;
  const update = () => {
    const height = viewport ? viewport.height : window.innerHeight;
    root.style.height = `${Math.round(height)}px`;
    root.style.transform = viewport && viewport.offsetTop > 0 ? `translateY(${Math.round(viewport.offsetTop)}px)` : '';
  };
  update();
  window.addEventListener('resize', update);
  if (viewport) {
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
  }
}
