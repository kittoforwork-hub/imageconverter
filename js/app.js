(() => {
  'use strict';

  const catButtons = Array.from(document.querySelectorAll('.cat-btn'));
  const chipGroups = Array.from(document.querySelectorAll('.tool-chips'));
  const panels = Array.from(document.querySelectorAll('.tool-panel'));

  let currentCat = null;

  function showCategory(cat) {
    // Auto-clear cache when actually crossing from one category to the other
    // (image <-> pdf tools share nothing, so whatever the previous category
    // was holding is safe to release). Skipped on the very first call (page
    // load) and when re-clicking the already-active category.
    if (currentCat && currentCat !== cat) {
      runAutoClearCache();
    }
    currentCat = cat;

    catButtons.forEach(b => b.classList.toggle('is-active', b.dataset.cat === cat));
    chipGroups.forEach(g => g.classList.toggle('hidden', g.dataset.catGroup !== cat));
    const activeGroup = chipGroups.find(g => g.dataset.catGroup === cat);
    const activeChip = activeGroup ? activeGroup.querySelector('.tool-chip.is-active') || activeGroup.querySelector('.tool-chip') : null;
    if (activeChip) showTool(activeChip.dataset.tool);
  }

  function showTool(tool) {
    document.querySelectorAll('.tool-chip').forEach(b => b.classList.toggle('is-active', b.dataset.tool === tool));
    panels.forEach(p => p.classList.toggle('hidden', p.id !== 'panel-' + tool));
  }

  catButtons.forEach(b => b.addEventListener('click', () => showCategory(b.dataset.cat)));
  document.querySelectorAll('.tool-chip').forEach(b =>
    b.addEventListener('click', () => showTool(b.dataset.tool))
  );

  showCategory('image');

  // ---- Clear cache / free memory (fully automatic, no button) ---------
  // Every tool holds its files as blob URLs (and pdf.js documents, for the
  // PDF tools) while it's open. Those aren't released on their own, so on a
  // long session — or a tab left open and forgotten — memory keeps climbing.
  //
  // Three automatic triggers, no manual button:
  //   1. Switching category (image <-> pdf) — see showCategory() above.
  //   2. Idle timeout — if there's been no user activity (click, keypress,
  //      file drop, etc.) for IDLE_LIMIT_MS, everything gets swept. Checked
  //      once a minute, so a tab left open gets cleared within roughly
  //      IDLE_LIMIT_MS to IDLE_LIMIT_MS + 1 minute of being forgotten.
  //   3. Leaving/closing the tab (pagehide).
  //
  // Note this DOES clear finished-but-undownloaded results if the tab sits
  // idle long enough — that's the intended tradeoff for "never have to
  // think about it," per how this is meant to be used.
  function runAutoClearCache() {
    window.Utils.clearCache();
    if (window.PdfWorkerClient && typeof window.PdfWorkerClient.dispose === 'function') {
      window.PdfWorkerClient.dispose();
    }
  }

  const IDLE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes of no activity
  let lastActivity = Date.now();

  ['pointerdown', 'keydown', 'input', 'change', 'drop', 'wheel'].forEach(evt =>
    document.addEventListener(evt, () => { lastActivity = Date.now(); }, { passive: true, capture: true })
  );

  setInterval(() => {
    if (Date.now() - lastActivity >= IDLE_LIMIT_MS) {
      runAutoClearCache();
      lastActivity = Date.now(); // don't re-fire every minute while still idle
    }
  }, 60 * 1000);

  // Safety net: release everything when the tab is closed, refreshed, or
  // navigated away from.
  window.addEventListener('pagehide', () => {
    window.Utils.clearCache();
    if (window.PdfWorkerClient && typeof window.PdfWorkerClient.dispose === 'function') {
      window.PdfWorkerClient.dispose();
    }
  });
})();
