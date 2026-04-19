// Lightweight theme manager for all pages
const THEME_KEY = 'theme';

function applyTheme(theme) {
  const normalized = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', normalized);
  localStorage.setItem(THEME_KEY, normalized);
  updateThemeToggleButton(normalized);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'light' ? 'dark' : 'light');
}

function initThemeToggle(buttonId = 'themeToggleBtn') {
  initTheme();
  const toggle = document.getElementById(buttonId);
  if (toggle) {
    toggle.addEventListener('click', toggleTheme);
    updateThemeToggleButton(document.documentElement.getAttribute('data-theme'));
  }
}

function updateThemeToggleButton(theme) {
  const btn = document.getElementById('themeToggleBtn') || document.getElementById('themeToggle');
  if (btn) {
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.title = typeof t === 'function' ? (theme === 'dark' ? t('Light Theme') : t('Dark Theme')) : (theme === 'dark' ? 'Light Theme' : 'Dark Theme');
    btn.setAttribute('aria-label', btn.title);
  }
}

window.addEventListener('farmaLanguageChanged', () => {
  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  updateThemeToggleButton(theme);
});
