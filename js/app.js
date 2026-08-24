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
})();
