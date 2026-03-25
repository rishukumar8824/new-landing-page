(() => {
  const THEME_KEY = 'bitegit_theme_mode';
  const DARK = 'dark';
  const LIGHT = 'light';

  function normalizeTheme(value) {
    return value === LIGHT ? LIGHT : DARK;
  }

  function getTheme() {
    return normalizeTheme(localStorage.getItem(THEME_KEY) || DARK);
  }

  function setTheme(theme) {
    const resolved = normalizeTheme(theme);
    document.documentElement.setAttribute('data-theme', resolved);
    document.body?.setAttribute('data-theme', resolved);
    localStorage.setItem(THEME_KEY, resolved);
    return resolved;
  }

  function getThemeIcon(theme) {
    return theme === DARK ? '🌙' : '☀️';
  }

  function updateToggleLabel(button, theme) {
    if (!button) {
      return;
    }
    button.textContent = getThemeIcon(theme);
    button.setAttribute('aria-label', theme === DARK ? 'Switch to light theme' : 'Switch to dark theme');
  }

  function initThemeToggle(buttons = []) {
    const list = Array.isArray(buttons) ? buttons : [buttons];
    const initial = setTheme(getTheme());

    list.forEach((button) => {
      if (!button) {
        return;
      }
      updateToggleLabel(button, initial);
      button.addEventListener('click', () => {
        const next = getTheme() === DARK ? LIGHT : DARK;
        const applied = setTheme(next);
        list.forEach((node) => updateToggleLabel(node, applied));
      });
    });
    return initial;
  }

  window.BitegitTheme = {
    getTheme,
    setTheme,
    initThemeToggle
  };
})();
