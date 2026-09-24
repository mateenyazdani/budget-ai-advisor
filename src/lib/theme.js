// Still a real, rememberable toggle — not a system-preference guess — but
// dark is now what a new visitor sees first, matching the look the app has
// been designed toward. Anyone who explicitly picks light gets that back on
// their next visit, same as dark.
const KEY = 'bargainly-theme';

export function getStoredTheme() {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
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
