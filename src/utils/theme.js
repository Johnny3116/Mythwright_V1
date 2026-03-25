/**
 * theme — Theme utilities and CSS variable helpers
 */

/**
 * Apply a theme from a campaign blueprint's meta.theme field.
 * Overrides CSS custom properties on :root.
 * @param {object} theme - Theme object from blueprint meta
 */
export function applyTheme(theme) {
  if (!theme) return;
  const root = document.documentElement;
  Object.entries(theme).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });
}

/**
 * Reset to the default Mythwright dark fantasy theme.
 */
export function resetTheme() {
  const root = document.documentElement;
  // Remove all inline style overrides — CSS file defaults take over
  root.removeAttribute('style');
}

/**
 * Get the current value of a CSS custom property.
 * @param {string} variable - e.g. '--accent-primary'
 * @returns {string}
 */
export function getCSSVar(variable) {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}
