// A real, rememberable toggle — not a system-preference guess. Light is what
// a new visitor sees first: bright, photo-forward, colourful accents per
// category, matching the product's own reference screens. Anyone who
// explicitly picks dark gets that back on their next visit, same as light.
const KEY = 'bargainly-theme';

export function getStoredTheme() {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Private browsing or a full quota — the toggle still works for this
    // visit, it just won't be remembered next time.
  }
}
