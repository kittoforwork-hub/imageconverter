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


  // ------------------------------------------------------------
  // Cute tool UX layer: reusable empty/progress micro-UI
  // ------------------------------------------------------------
  const TOOL_META = {
    'img-convert':      ['image', 'พร้อมแปลงรูปให้แล้ว ✨'],
    'img-crop':         ['image', 'จัดเฟรมรูปให้น่ารักพอดี ✂️'],
    'img-bgremove':     ['image', 'ค่อย ๆ ลบพื้นหลังให้เนียนกริบ 🫧'],
    'pdf-from-images':  ['pdf',   'รวมรูปให้กลายเป็น PDF แบบเรียบร้อย 📄'],
    'pdf-to-images':    ['pdf',   'แยกหน้า PDF ออกเป็นรูปให้ทีละหน้า 🧩'],
    'pdf-pages':        ['pdf',   'จัดการหน้ากระดาษแบบคลิกแล้วเข้าใจง่าย 📚'],
    'pdf-merge':        ['pdf',   'เรียงเอกสารแล้วรวมเป็นไฟล์เดียว 💗'],
    'pdf-watermark':    ['pdf',   'เติมลายน้ำแบบนุ่ม ๆ ไม่กวนเอกสาร 💧'],
    'pdf-pagenumbers':  ['pdf',   'ใส่เลขหน้าให้เอกสารดูเป็นระเบียบ 🔖']
  };

  function setupCuteToolUI() {
    panels.forEach(panel => {
      const tool = panel.id.replace(/^panel-/, '');
      const meta = TOOL_META[tool] || ['image', 'พร้อมเริ่มงานแล้ว ✨'];
      panel.dataset.tool = tool;
      panel.dataset.toolKind = meta[0];

      if (!panel.querySelector('.cute-character')) {
        const dot = document.createElement('span');
        dot.className = 'cute-character';
        dot.setAttribute('aria-hidden', 'true');
        panel.appendChild(dot);
      }

      const dz = panel.querySelector('.dropzone');
      if (!dz) return;

      if (!dz.querySelector('.cute-empty-state')) {
        const empty = document.createElement('div');
        empty.className = 'cute-empty-state';
        empty.innerHTML = '<span class="cute-dot"></span><span class="cute-empty-copy"></span>';
        const inner = dz.querySelector('.dz-inner');
        (inner || dz).appendChild(empty);
      }
      const copy = dz.querySelector('.cute-empty-copy');
      if (copy) copy.textContent = meta[1];

      if (!dz.querySelector('.cute-progress')) {
        const progress = document.createElement('div');
        progress.className = 'cute-progress';
        progress.innerHTML = `
          <div class="cute-progress-head">
            <strong>กำลังทำงาน…</strong>
            <span class="cute-progress-count">กำลังประมวลผล</span>
          </div>
          <div class="cute-progress-track"><div class="cute-progress-bar"></div></div>`;
        dz.appendChild(progress);
      }

      const setDrag = (on) => {
        dz.classList.toggle('is-dragover', on);
      };
      dz.addEventListener('dragenter', () => setDrag(true));
      dz.addEventListener('dragover', () => setDrag(true));
      dz.addEventListener('dragleave', (e) => {
        if (!dz.contains(e.relatedTarget)) setDrag(false);
      });
      dz.addEventListener('drop', () => setDrag(false));
    });

    refreshCuteStates();
    setInterval(refreshCuteStates, 350);
  }

  function refreshCuteStates() {
    panels.forEach(panel => {
      const dz = panel.querySelector('.dropzone');
      if (!dz) return;
      const jobs = panel.querySelector('[id^="jobs-"] , [id^="list-"]');
      const result = panel.querySelector('[id^="result-"]');
      const cards = panel.querySelectorAll('.ticket, .file-row, .page-card');
      const hasFiles = cards.length > 0 || !!(jobs && jobs.children.length);
      const empty = dz.querySelector('.cute-empty-state');
      if (empty) empty.classList.toggle('is-hidden', hasFiles);

      let processing = false;
      cards.forEach(card => {
        const t = (card.textContent || '').toLowerCase();
        const busy = /กำลัง|processing|converting|removing|loading|building|merging|exporting|saving|working|จัดทำ|ประมวลผล/.test(t);
        card.classList.toggle('is-processing', busy);
        if (busy) processing = true;
      });

      if (result && !result.classList.contains('hidden')) processing = false;

      const progress = dz.querySelector('.cute-progress');
      if (progress) {
        progress.classList.toggle('is-visible', processing);
        if (!processing && hasFiles) {
          progress.classList.add('is-done');
          progress.querySelector('strong').textContent = 'พร้อมแล้ว ✨';
          progress.querySelector('.cute-progress-count').textContent = 'ทำงานเสร็จ';
        } else if (processing) {
          progress.classList.remove('is-done');
          progress.querySelector('strong').textContent = 'กำลังทำงาน…';
          progress.querySelector('.cute-progress-count').textContent = cards.length ? `${cards.length} รายการ` : 'กำลังประมวลผล';
        } else {
          progress.classList.remove('is-done');
        }
      }

      dz.classList.toggle('is-busy', processing);
    });
  }

  setupCuteToolUI();

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
