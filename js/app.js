(() => {
  'use strict';

  const catButtons = Array.from(document.querySelectorAll('.cat-btn'));
  const chipGroups = Array.from(document.querySelectorAll('.tool-chips'));
  const panels = Array.from(document.querySelectorAll('.tool-panel'));

  function showCategory(cat) {
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
  // tabs, so on a long session — lots of files processed one after another —
  // memory keeps climbing and the page can start to feel sluggish. This
  // button revokes everything every tool is currently holding at once,
  // without needing a full page reload.
  const clearBtn = document.getElementById('clearCacheBtn');
  const clearToast = document.getElementById('clearCacheToast');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      window.Utils.clearCache();
      if (clearToast) {
        clearToast.classList.remove('hidden');
        // restart the animation on repeated clicks
        clearToast.classList.remove('is-showing');
        void clearToast.offsetWidth;
        clearToast.classList.add('is-showing');
        clearTimeout(clearBtn._toastTimer);
        clearBtn._toastTimer = setTimeout(() => clearToast.classList.add('hidden'), 2200);
      }
    });
  }
})();
