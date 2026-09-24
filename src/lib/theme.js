// A real toggle, not a system-preference guess — the app defaults to the
// quiet light palette it was designed around, and dark is something a
// visitor chooses for themselves, remembered on their own device.
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
