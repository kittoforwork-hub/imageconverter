/*
 * Shared page shell interactions.
 * Contains only navigation and language-selector wiring; tool logic stays in its own modules.
 */
(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);

  const languageSelect = byId('language-select');
  if (languageSelect) {
    const syncLanguage = () => {
      const language = window.I18n?.getLanguage?.();
      if (language && languageSelect.value !== language) {
        languageSelect.value = language;
      }
    };

    syncLanguage();
    languageSelect.addEventListener('change', () => {
      window.I18n?.setLanguage?.(languageSelect.value);
    });
    document.addEventListener('languagechange', syncLanguage);
  }

  const routes = [
    ['open-notepad', 'notepad.html'],
    ['open-file-converter', 'file-converter.html'],
    ['btn-back-home', 'index.html']
  ];

  for (const [id, destination] of routes) {
    const control = byId(id);
    if (!control) continue;

    control.addEventListener('click', () => {
      window.location.href = destination;
    });
  }
})();
