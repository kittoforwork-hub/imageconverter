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

  // ---- Clear cache / free memory --------------------------------------
  // Every tool holds its files as blob URLs (and pdf.js documents, for the
  // PDF tools) while it's open. Those aren't released just by switching
  // chips within a category, so on a long session — lots of files processed
  // one after another — memory keeps climbing and the page can start to
  // feel sluggish.
  //
  // This now runs automatically at points where it's safe to assume the
  // user is done with what's currently loaded:
  //   1. Switching category (image <-> pdf) — see showCategory() above.
  //   2. Leaving/closing the tab (pagehide) — the browser would reclaim
  //      this anyway, but we revoke explicitly for tidiness.
  // It is deliberately NOT run when switching between tool chips inside
  // the same category (e.g. Convert -> Crop), because each tool keeps its
  // finished-job list and download links visible/clickable even after you
  // switch away, so a user can come back and grab a result later without
  // redoing the work. Auto-clearing there would silently break those
  // download links.
  //
  // The header button still exists for anyone who wants to free memory
  // manually mid-session (e.g. after a big batch) without waiting for one
  // of the automatic triggers.
  const clearBtn = document.getElementById('clearCacheBtn');
  const clearToast = document.getElementById('clearCacheToast');

  function runAutoClearCache() {
    window.Utils.clearCache();
    showClearToast();
  }

  function showClearToast() {
    if (!clearToast) return;
    clearToast.classList.remove('hidden');
    // restart the animation on repeated triggers
    clearToast.classList.remove('is-showing');
    void clearToast.offsetWidth;
    clearToast.classList.add('is-showing');
    clearTimeout(showClearToast._timer);
    showClearToast._timer = setTimeout(() => clearToast.classList.add('hidden'), 2200);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      window.Utils.clearCache();
      showClearToast();
    });
  }

  // Safety net: release everything when the tab is closed, refreshed, or
  // navigated away from. No toast here — the user isn't looking anymore.
  window.addEventListener('pagehide', () => window.Utils.clearCache());
})();
