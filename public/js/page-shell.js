/*
 * Shared application shell.
 * Keeps navigation and language selection consistent across every page.
 * Tool-specific behavior remains in each page's own module.
 */
(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);

  const getCurrentPage = () => {
    const path = window.location.pathname.toLowerCase();
    if (path.endsWith('/file-converter.html')) return 'converter';
    if (path.endsWith('/notepad.html')) return 'notepad';
    return 'workspace';
  };

  const createLanguageSwitcher = () => {
    const existing = byId('language-select');
    if (existing) return existing.closest('.language-switcher') || existing;

    const wrapper = document.createElement('div');
    wrapper.className = 'language-switcher app-nav-language';

    const label = document.createElement('label');
    label.className = 'language-label';
    label.htmlFor = 'language-select';
    label.setAttribute('data-i18n-aria-label', 'common.language');
    label.innerHTML = '<span aria-hidden="true">🌐</span>';

    const select = document.createElement('select');
    select.id = 'language-select';
    select.className = 'mono-select';
    select.setAttribute('aria-label', 'Language');
    select.setAttribute('data-i18n-aria-label', 'common.language');

    const languages = [
      ['th', 'language.th', 'ไทย'],
      ['en', 'language.en', 'English'],
      ['de', 'language.de', 'Deutsch'],
      ['ja', 'language.ja', '日本語'],
      ['ko', 'language.ko', '한국어'],
      ['zh-CN', 'language.zhCN', '简体中文'],
      ['zh-TW', 'language.zhTW', '繁體中文']
    ];

    for (const [value, key, fallback] of languages) {
      const option = document.createElement('option');
      option.value = value;
      option.setAttribute('data-i18n', key);
      option.textContent = fallback;
      select.appendChild(option);
    }

    wrapper.append(label, select);
    return wrapper;
  };

  const buildApplicationNavigation = () => {
    if (document.querySelector('.app-nav')) return;

    const currentPage = getCurrentPage();
    const root = document.querySelector('.sheet, .fc-sheet, .notepad-page') || document.body.firstElementChild;
    if (!root) return;

    const nav = document.createElement('header');
    nav.className = 'app-nav';
    nav.setAttribute('aria-label', 'Main navigation');

    const brand = document.createElement('a');
    brand.className = 'app-nav-brand';
    brand.href = './index.html';
    brand.setAttribute('aria-label', 'KITTO Workshop Utility home');
    brand.innerHTML = '<span class="app-nav-mascot" aria-hidden="true">🐱</span><span class="app-nav-brand-copy"><strong>KITTO</strong><small>WORKSHOP UTILITY</small></span>';

    const links = document.createElement('nav');
    links.className = 'app-nav-links';
    links.setAttribute('aria-label', 'Application pages');

    const pages = [
      ['workspace', './index.html', 'common.home', 'Workspace'],
      ['converter', './file-converter.html', 'page.fileConverter', 'File Converter'],
      ['notepad', './notepad.html', 'common.notepad', 'Notepad']
    ];

    for (const [id, href, key, fallback] of pages) {
      const link = document.createElement('a');
      link.className = 'app-nav-link';
      link.href = href;
      link.setAttribute('data-i18n', key);
      link.textContent = fallback;
      if (id === currentPage) {
        link.classList.add('is-current');
        link.setAttribute('aria-current', 'page');
      }
      links.appendChild(link);
    }

    const tools = document.createElement('div');
    tools.className = 'app-nav-tools';
    const languageSwitcher = createLanguageSwitcher();
    languageSwitcher.classList.add('app-nav-language');
    tools.appendChild(languageSwitcher);

    nav.append(brand, links, tools);
    document.body.insertBefore(nav, root);
  };

  buildApplicationNavigation();

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
