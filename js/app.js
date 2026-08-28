(() => {
  'use strict';

  const catButtons = Array.from(
    document.querySelectorAll('.cat-btn')
  );

  const chipGroups = Array.from(
    document.querySelectorAll('.tool-chips')
  );

  const panels = Array.from(
    document.querySelectorAll('.tool-panel')
  );

  let currentCat = null;


  // ------------------------------------------------------------
  // TOOL META
  // ------------------------------------------------------------

  const TOOL_META = {
    'img-convert': [
      'image',
      'พร้อมแปลงรูปให้แล้ว ✨'
    ],

    'img-crop': [
      'image',
      'จัดเฟรมรูปให้น่ารักพอดี ✂️'
    ],

    'img-bgremove': [
      'image',
      'ค่อย ๆ ลบพื้นหลังให้เนียนกริบ 🫧'
    ],

    'pdf-from-images': [
      'pdf',
      'รวมรูปให้กลายเป็น PDF แบบเรียบร้อย 📄'
    ],

    'pdf-to-images': [
      'pdf',
      'แยกหน้า PDF ออกเป็นรูปให้ทีละหน้า 🧩'
    ],

    'pdf-pages': [
      'pdf',
      'จัดการหน้ากระดาษแบบคลิกแล้วเข้าใจง่าย 📚'
    ],

    'pdf-merge': [
      'pdf',
      'เรียงเอกสารแล้วรวมเป็นไฟล์เดียว 💗'
    ],

    'pdf-watermark': [
      'pdf',
      'เติมลายน้ำแบบนุ่ม ๆ ไม่กวนเอกสาร 💧'
    ],

    'pdf-pagenumbers': [
      'pdf',
      'ใส่เลขหน้าให้เอกสารดูเป็นระเบียบ 🔖'
    ]
  };


  // ------------------------------------------------------------
  // CATEGORY
  // ------------------------------------------------------------

  function showCategory(cat) {

    if (
      currentCat &&
      currentCat !== cat
    ) {
      runAutoClearCache();
    }

    currentCat = cat;


    catButtons.forEach(button => {
      button.classList.toggle(
        'is-active',
        button.dataset.cat === cat
      );
    });


    chipGroups.forEach(group => {
      group.classList.toggle(
        'hidden',
        group.dataset.catGroup !== cat
      );
    });


    const activeGroup =
      chipGroups.find(
        group =>
          group.dataset.catGroup === cat
      );


    const activeChip =
      activeGroup
        ? (
            activeGroup.querySelector(
              '.tool-chip.is-active'
            ) ||
            activeGroup.querySelector(
              '.tool-chip'
            )
          )
        : null;


    if (activeChip) {
      showTool(
        activeChip.dataset.tool
      );
    }
  }


  // ------------------------------------------------------------
  // TOOL
  // ------------------------------------------------------------

  function showTool(tool) {

    document
      .querySelectorAll('.tool-chip')
      .forEach(button => {
        button.classList.toggle(
          'is-active',
          button.dataset.tool === tool
        );
      });


    panels.forEach(panel => {
      panel.classList.toggle(
        'hidden',
        panel.id !==
          'panel-' + tool
      );
    });


    scheduleCuteRefresh();
  }


  // ------------------------------------------------------------
  // EVENTS
  // ------------------------------------------------------------

  catButtons.forEach(button => {
    button.addEventListener(
      'click',
      () => {
        showCategory(
          button.dataset.cat
        );
      }
    );
  });


  document
    .querySelectorAll('.tool-chip')
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          showTool(
            button.dataset.tool
          );
        }
      );
    });


  // ------------------------------------------------------------
  // CUTE UI
  // ------------------------------------------------------------

  function setupCuteToolUI() {

    panels.forEach(panel => {

      const tool =
        panel.id.replace(
          /^panel-/,
          ''
        );


      const meta =
        TOOL_META[tool] ||
        [
          'image',
          'พร้อมเริ่มงานแล้ว ✨'
        ];


      panel.dataset.tool =
        tool;

      panel.dataset.toolKind =
        meta[0];


      // --------------------------------------------------------
      // Character
      // --------------------------------------------------------

      if (
        !panel.querySelector(
          '.cute-character'
        )
      ) {
        const dot =
          document.createElement(
            'span'
          );

        dot.className =
          'cute-character';

        dot.setAttribute(
          'aria-hidden',
          'true'
        );

        panel.appendChild(dot);
      }


      // --------------------------------------------------------
      // Dropzone
      // --------------------------------------------------------

      const dz =
        panel.querySelector(
          '.dropzone'
        );


      if (!dz) {
        return;
      }


      if (
        !dz.querySelector(
          '.cute-empty-state'
        )
      ) {
        const empty =
          document.createElement(
            'div'
          );

        empty.className =
          'cute-empty-state';


        empty.innerHTML =
          '<span class="cute-dot"></span>' +
          '<span class="cute-empty-copy"></span>';


        const inner =
          dz.querySelector(
            '.dz-inner'
          );


        (
          inner ||
          dz
        ).appendChild(empty);
      }


      const copy =
        dz.querySelector(
          '.cute-empty-copy'
        );


      if (copy) {
        copy.textContent =
          meta[1];
      }


      // --------------------------------------------------------
      // Progress
      // --------------------------------------------------------

      if (
        !dz.querySelector(
          '.cute-progress'
        )
      ) {
        const progress =
          document.createElement(
            'div'
          );


        progress.className =
          'cute-progress';


        progress.innerHTML = `
          <div class="cute-progress-head">
            <strong>กำลังทำงาน…</strong>
            <span class="cute-progress-count">
              กำลังประมวลผล
            </span>
          </div>

          <div class="cute-progress-track">
            <div class="cute-progress-bar"></div>
          </div>
        `;


        dz.appendChild(progress);
      }


      // --------------------------------------------------------
      // Drag state
      // --------------------------------------------------------

      const setDrag =
        on => {
          dz.classList.toggle(
            'is-dragover',
            on
          );
        };


      dz.addEventListener(
        'dragenter',
        () => setDrag(true)
      );


      dz.addEventListener(
        'dragover',
        () => setDrag(true)
      );


      dz.addEventListener(
        'dragleave',
        event => {

          if (
            !dz.contains(
              event.relatedTarget
            )
          ) {
            setDrag(false);
          }

        }
      );


      dz.addEventListener(
        'drop',
        () => setDrag(false)
      );

    });


    refreshCuteStates();
  }


  // ------------------------------------------------------------
  // CUTE STATE REFRESH
  // ------------------------------------------------------------

  let cuteRefreshQueued =
    false;


  function scheduleCuteRefresh() {

    if (cuteRefreshQueued) {
      return;
    }


    cuteRefreshQueued =
      true;


    requestAnimationFrame(
      () => {
        cuteRefreshQueued =
          false;

        refreshCuteStates();
      }
    );
  }


  function isCardProcessing(card) {

    if (
      card.dataset.processing ===
      'true'
    ) {
      return true;
    }


    if (
      card.dataset.processing ===
      'false'
    ) {
      return false;
    }


    // fallback สำหรับ tool เดิม
    const text =
      (
        card.textContent ||
        ''
      ).toLowerCase();


    return /กำลัง|processing|converting|removing|loading|building|merging|exporting|saving|working|จัดทำ|ประมวลผล/.test(
      text
    );
  }


  function refreshCuteStates() {

    panels.forEach(panel => {

      const dz =
        panel.querySelector(
          '.dropzone'
        );


      if (!dz) {
        return;
      }


      const jobs =
        panel.querySelector(
          '[id^="jobs-"]'
        );


      const list =
        panel.querySelector(
          '[id^="list-"]'
        );


      const result =
        panel.querySelector(
          '[id^="result-"]'
        );


      const cards =
        panel.querySelectorAll(
          '.ticket, .file-row, .page-card'
        );


      const hasFiles =
        cards.length > 0 ||
        !!(
          jobs &&
          jobs.children.length
        ) ||
        !!(
          list &&
          list.children.length
        );


      const empty =
        dz.querySelector(
          '.cute-empty-state'
        );


      if (empty) {
        empty.classList.toggle(
          'is-hidden',
          hasFiles
        );
      }


      let processing =
        false;


      cards.forEach(card => {

        const busy =
          isCardProcessing(
            card
          );


        card.classList.toggle(
          'is-processing',
          busy
        );


        if (busy) {
          processing = true;
        }

      });


      if (
        result &&
        !result.classList.contains(
          'hidden'
        )
      ) {
        processing = false;
      }


      const progress =
        dz.querySelector(
          '.cute-progress'
        );


      if (progress) {

        progress.classList.toggle(
          'is-visible',
          processing
        );


        if (
          !processing &&
          hasFiles
        ) {

          progress.classList.add(
            'is-done'
          );


          const strong =
            progress.querySelector(
              'strong'
            );


          const count =
            progress.querySelector(
              '.cute-progress-count'
            );


          if (strong) {
            strong.textContent =
              'พร้อมแล้ว ✨';
          }


          if (count) {
            count.textContent =
              'ทำงานเสร็จ';
          }


        } else if (processing) {

          progress.classList.remove(
            'is-done'
          );


          const strong =
            progress.querySelector(
              'strong'
            );


          const count =
            progress.querySelector(
              '.cute-progress-count'
            );


          if (strong) {
            strong.textContent =
              'กำลังทำงาน…';
          }


          if (count) {

            count.textContent =
              cards.length
                ? `${cards.length} รายการ`
                : 'กำลังประมวลผล';

          }


        } else {

          progress.classList.remove(
            'is-done'
          );

        }
      }


      dz.classList.toggle(
        'is-busy',
        processing
      );

    });
  }


  setupCuteToolUI();


  // ------------------------------------------------------------
  // MUTATION OBSERVER
  // ------------------------------------------------------------

  let cuteObserver =
    null;


  const panelContainer =
    document.querySelector(
      '.panels'
    );


  if (panelContainer) {

    cuteObserver =
      new MutationObserver(
        mutations => {

          let relevant =
            false;


          for (
            const mutation
            of mutations
          ) {

            if (
              mutation.type ===
                'childList' &&
              (
                mutation.addedNodes.length ||
                mutation.removedNodes.length
              )
            ) {
              relevant = true;
              break;
            }


            if (
              mutation.type ===
              'attributes'
            ) {

              const target =
                mutation.target;


              if (
                target &&
                (
                  target.classList?.contains(
                    'hidden'
                  ) ||
                  target.classList?.contains(
                    'is-processing'
                  )
                )
              ) {
                relevant = true;
                break;
              }

            }

          }


          if (relevant) {
            scheduleCuteRefresh();
          }

        }
      );


    cuteObserver.observe(
      panelContainer,
      {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          'class',
          'data-processing'
        ]
      }
    );

  }


  // ------------------------------------------------------------
  // CACHE CLEAR
  // ------------------------------------------------------------

  function runAutoClearCache() {

    if (
      window.Utils &&
      typeof window.Utils.clearCache ===
        'function'
    ) {
      window.Utils.clearCache();
    }


    if (
      window.PdfWorkerClient &&
      typeof window.PdfWorkerClient.dispose ===
        'function'
    ) {
      window.PdfWorkerClient.dispose();
    }


    scheduleCuteRefresh();
  }


  // ------------------------------------------------------------
  // IDLE MANAGEMENT
  // ------------------------------------------------------------

  const IDLE_LIMIT_MS =
    5 * 60 * 1000;


  let lastActivity =
    Date.now();


  function markActivity() {
    lastActivity =
      Date.now();
  }


  [
    'pointerdown',
    'keydown',
    'input',
    'change',
    'drop',
    'wheel'
  ].forEach(eventName => {

    document.addEventListener(
      eventName,
      markActivity,
      {
        passive: true,
        capture: true
      }
    );

  });


  function hasProcessingWork() {

    return !!document.querySelector(
      '.tool-panel:not(.hidden) .is-processing'
    );

  }


  function hasVisibleResult() {

    return !!document.querySelector(
      [
        '.tool-panel:not(.hidden) .js-download-btn:not(.hidden)',
        '.tool-panel:not(.hidden) .js-download:not(.hidden)',
        '.tool-panel:not(.hidden) .result-strip:not(.hidden)',
        '.tool-panel:not(.hidden) .is-ready'
      ].join(',')
    );

  }


  function isUserEditing() {

    const active =
      document.activeElement;


    if (!active) {
      return false;
    }


    return !!active.closest(
      '.tool-panel:not(.hidden)'
    ) && (
      active.matches(
        'input, textarea, select, button'
      ) ||
      active.isContentEditable
    );

  }


  setInterval(
    () => {

      const idleFor =
        Date.now() -
        lastActivity;


      if (
        idleFor <
        IDLE_LIMIT_MS
      ) {
        return;
      }


      if (hasProcessingWork()) {
        return;
      }


      if (hasVisibleResult()) {
        return;
      }


      if (isUserEditing()) {
        return;
      }


      runAutoClearCache();


      lastActivity =
        Date.now();

    },
    60 * 1000
  );


  // ------------------------------------------------------------
  // PAGE HIDE
  // ------------------------------------------------------------

  window.addEventListener(
    'pagehide',
    () => {

      if (
        window.Utils &&
        typeof window.Utils.clearCache ===
          'function'
      ) {
        window.Utils.clearCache();
      }


      if (
        window.PdfWorkerClient &&
        typeof window.PdfWorkerClient.dispose ===
          'function'
      ) {
        window.PdfWorkerClient.dispose();
      }


      if (cuteObserver) {
        try {
          cuteObserver.disconnect();
        } catch (_) {}
      }

    }
  );


  // ------------------------------------------------------------
  // START
  // ------------------------------------------------------------

  showCategory('image');

})();
