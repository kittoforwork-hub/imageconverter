(() => {
  'use strict';


  // ============================================================
  // I18N
  // ============================================================

  /*
   * อ่าน I18n แบบ dynamic
   * ----------------------------------------------------------
   * ไม่จับ window.I18n แค่ครั้งเดียวตอนโหลดไฟล์
   *
   * ข้อดี:
   * - รองรับกรณี i18n.js โหลดทีหลัง
   * - รองรับกรณี window.I18n ถูกสร้างหลังไฟล์นี้เริ่มทำงาน
   */

  function getI18n() {

    return window.I18n || null;
  }


  // ============================================================
  // TRANSLATION
  // ============================================================

  function t(
    key,
    values
  ) {

    const i18n =
      getI18n();


    if (
      i18n &&
      typeof i18n.t === 'function'
    ) {

      return i18n.t(
        key,
        values
      );
    }

    return String(key);
  }


  function currentLanguage() {

    const i18n =
      getI18n();


    if (
      i18n &&
      typeof i18n.getLanguage === 'function'
    ) {

      return i18n.getLanguage();
    }

    return 'en';
  }


  // ============================================================
  // ELEMENTS
  // ============================================================

  /*
   * IMPORTANT
   * ----------------------------------------------------------
   * จับเฉพาะปุ่ม Category ที่มี data-cat
   *
   * Image:
   *   <button class="cat-btn" data-cat="image">
   *
   * PDF:
   *   <button class="cat-btn" data-cat="pdf">
   *
   * Notepad:
   *   <button class="cat-btn" id="open-notepad">
   *
   * Notepad ไม่มี data-cat
   * จึงจะไม่ถูกนำมาจัดการเป็น Category
   */

  const catButtons =
    Array.from(
      document.querySelectorAll(
        '.cat-btn[data-cat]'
      )
    );


  const chipGroups =
    Array.from(
      document.querySelectorAll(
        '.tool-chips'
      )
    );


  const panels =
    Array.from(
      document.querySelectorAll(
        '.tool-panel'
      )
    );


  let currentCat =
    null;


  // ============================================================
  // TOOL META
  // ============================================================

  const TOOL_META = {

    // ----------------------------------------------------------
    // IMAGE
    // ----------------------------------------------------------

    'img-convert': {
      kind: 'image',
      key: 'image.characterConvert'
    },

    'img-crop': {
      kind: 'image',
      key: 'image.characterCrop'
    },

    'img-bgremove': {
      kind: 'image',
      key: 'image.characterBgRemove'
    },

    'img-compress': {
      kind: 'image',
      key: 'image.characterCompress'
    },


    // ----------------------------------------------------------
    // PDF
    // ----------------------------------------------------------

    'pdf-from-images': {
      kind: 'pdf',
      key: 'pdf.characterFromImages'
    },

    'pdf-to-images': {
      kind: 'pdf',
      key: 'pdf.characterToImages'
    },

    'pdf-pages': {
      kind: 'pdf',
      key: 'pdf.characterPages'
    },

    'pdf-merge': {
      kind: 'pdf',
      key: 'pdf.characterMerge'
    },

    'pdf-watermark': {
      kind: 'pdf',
      key: 'pdf.characterWatermark'
    },

    'pdf-pagenumbers': {
      kind: 'pdf',
      key: 'pdf.characterPageNumbers'
    }

  };


  // ============================================================
  // GET TOOL META
  // ============================================================

  function getToolMeta(
    tool
  ) {

    return (
      TOOL_META[tool] ||
      {
        kind: 'image',
        key: 'common.ready'
      }
    );
  }


  // ============================================================
  // CHECK TOOL
  // ============================================================

  function isKnownTool(
    tool
  ) {

    return !!(
      tool &&
      TOOL_META[tool]
    );
  }


  // ============================================================
  // CATEGORY
  // ============================================================

  function showCategory(
    cat
  ) {

    /*
     * ป้องกัน undefined / null
     */

    if (!cat) {
      return;
    }


    /*
     * ต้องมี Category นี้อยู่จริง
     */

    const categoryExists =
      catButtons.some(
        button =>
          button.dataset.cat === cat
      );


    if (!categoryExists) {
      return;
    }


    /*
     * ถ้าเปลี่ยน Category
     * ให้ล้าง cache ของเครื่องมือเดิม
     *
     * แต่จะไม่ clear ถ้ายังมีงานกำลังทำอยู่
     */

    if (
      currentCat &&
      currentCat !== cat
    ) {

      if (
        !hasProcessingWork()
      ) {

        runAutoClearCache();
      }
    }


    currentCat =
      cat;


    /*
     * Active เฉพาะ Category
     *
     * เนื่องจาก catButtons ถูกเลือกด้วย
     * .cat-btn[data-cat]
     *
     * Notepad จะไม่ถูกแตะ
     */

    catButtons.forEach(
      button => {

        button.classList.toggle(
          'is-active',
          button.dataset.cat === cat
        );
      }
    );


    /*
     * แสดง Tool Chips ของ Category ปัจจุบัน
     */

    chipGroups.forEach(
      group => {

        group.classList.toggle(
          'hidden',
          group.dataset.catGroup !== cat
        );
      }
    );


    /*
     * หา Tool Chip ที่ Active
     */

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


    /*
     * เปิด Tool แรก/Tool ที่ Active
     */

    if (
      activeChip
    ) {

      const tool =
        activeChip.dataset.tool;


      if (
        tool
      ) {

        showTool(
          tool,
          {
            fromCategory: true
          }
        );
      }
    }
  }


  // ============================================================
  // TOOL
  // ============================================================

  function showTool(
    tool,
    options
  ) {

    if (!tool) {
      return;
    }


    const meta =
      getToolMeta(
        tool
      );


    /*
     * ถ้าเป็น Tool ที่ไม่รู้จัก
     * ไม่เปิด panel แปลก ๆ
     */

    if (
      !isKnownTool(tool)
    ) {

      return;
    }


    const fromCategory =
      !!(
        options &&
        options.fromCategory
      );


    /*
     * ถ้ามี Category อยู่แล้ว
     * Tool ต้องตรงกับ Category
     *
     * ยกเว้นกรณี showCategory() เรียกเข้ามาโดยตรง
     */

    if (
      currentCat &&
      meta.kind !== currentCat &&
      !fromCategory
    ) {

      showCategory(
        meta.kind
      );

      return;
    }


    /*
     * ถ้ายังไม่มี Category
     * ให้ synchronize ตาม Tool
     */

    if (
      !currentCat
    ) {

      currentCat =
        meta.kind;
    }


    /*
     * Active tool chip
     */

    document
      .querySelectorAll(
        '.tool-chip'
      )
      .forEach(
        button => {

          button.classList.toggle(
            'is-active',
            button.dataset.tool === tool
          );
        }
      );


    /*
     * แสดงเฉพาะ panel ที่ตรงกับ tool
     */

    panels.forEach(
      panel => {

        panel.classList.toggle(
          'hidden',
          panel.id !==
            'panel-' +
            tool
        );
      }
    );


    /*
     * กันกรณี current category ไม่ตรง
     * ในกรณีที่ Tool ถูกเปิดจากภายนอก
     */

    if (
      currentCat !== meta.kind
    ) {

      currentCat =
        meta.kind;


      catButtons.forEach(
        button => {

          button.classList.toggle(
            'is-active',
            button.dataset.cat ===
              currentCat
          );
        }
      );


      chipGroups.forEach(
        group => {

          group.classList.toggle(
            'hidden',
            group.dataset.catGroup !==
              currentCat
          );
        }
      );
    }


    scheduleCuteRefresh();
  }


  // ============================================================
  // CATEGORY EVENTS
  // ============================================================

  catButtons.forEach(
    button => {

      button.addEventListener(
        'click',
        () => {

          const cat =
            button.dataset.cat;


          if (!cat) {
            return;
          }


          showCategory(
            cat
          );
        }
      );
    }
  );


  // ============================================================
  // TOOL CHIP EVENTS
  // ============================================================

  document
    .querySelectorAll(
      '.tool-chip'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            const tool =
              button.dataset.tool;


            if (!tool) {
              return;
            }


            const meta =
              getToolMeta(
                tool
              );


            /*
             * ถ้า Tool อยู่คนละ Category
             * ให้เปลี่ยน Category ก่อน
             */

            if (
              currentCat &&
              meta.kind !== currentCat
            ) {

              showCategory(
                meta.kind
              );

              return;
            }


            showTool(
              tool
            );
          }
        );
      }
    );


  // ============================================================
  // CUTE CHARACTER
  // ============================================================

  function updateCuteCharacterText(
    panel
  ) {

    if (!panel) {
      return;
    }


    const tool =
      panel.dataset.tool;


    if (!tool) {
      return;
    }


    const meta =
      getToolMeta(
        tool
      );


    const copy =
      panel.querySelector(
        '.cute-empty-copy'
      );


    if (!copy) {
      return;
    }


    copy.dataset.i18n =
      meta.key;


    copy.textContent =
      t(
        meta.key
      );
  }


  // ============================================================
  // CUTE PROGRESS
  // ============================================================

  function updateCuteProgressText(
    panel,
    mode,
    itemCount
  ) {

    if (!panel) {
      return;
    }


    const progress =
      panel.querySelector(
        '.cute-progress'
      );


    if (!progress) {
      return;
    }


    const strong =
      progress.querySelector(
        '.cute-progress-title'
      );


    const count =
      progress.querySelector(
        '.cute-progress-count'
      );


    // ----------------------------------------------------------
    // DONE
    // ----------------------------------------------------------

    if (
      mode === 'done'
    ) {

      if (strong) {

        strong.textContent =
          t(
            'cute.ready'
          );
      }


      if (count) {

        count.textContent =
          t(
            'cute.completed'
          );
      }


      progress.classList.add(
        'is-done'
      );

      return;
    }


    // ----------------------------------------------------------
    // PROCESSING
    // ----------------------------------------------------------

    if (
      mode === 'processing'
    ) {

      if (strong) {

        strong.textContent =
          t(
            'cute.processing'
          );
      }


      if (count) {

        if (
          itemCount > 0
        ) {

          count.textContent =
            t(
              'cute.itemCount',
              {
                count:
                  itemCount
              }
            );

        } else {

          count.textContent =
            t(
              'common.processing'
            );
        }
      }


      progress.classList.remove(
        'is-done'
      );

      return;
    }


    // ----------------------------------------------------------
    // IDLE
    // ----------------------------------------------------------

    progress.classList.remove(
      'is-done'
    );
  }


  // ============================================================
  // CREATE CHARACTER
  // ============================================================

  function createCuteCharacter(
    panel
  ) {

    if (
      panel.querySelector(
        '.cute-character'
      )
    ) {

      return;
    }


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


    panel.appendChild(
      dot
    );
  }


  // ============================================================
  // CREATE EMPTY STATE
  // ============================================================

  function createCuteEmptyState(
    dz
  ) {

    if (
      dz.querySelector(
        '.cute-empty-state'
      )
    ) {

      return;
    }


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
    ).appendChild(
      empty
    );
  }


  // ============================================================
  // CREATE PROGRESS
  // ============================================================

  function createCuteProgress(
    dz
  ) {

    if (
      dz.querySelector(
        '.cute-progress'
      )
    ) {

      return;
    }


    const progress =
      document.createElement(
        'div'
      );


    progress.className =
      'cute-progress';


    progress.innerHTML = `
      <div class="cute-progress-head">

        <strong
          class="cute-progress-title"
        ></strong>

        <span
          class="cute-progress-count"
        ></span>

      </div>

      <div class="cute-progress-track">

        <div
          class="cute-progress-bar"
        ></div>

      </div>
    `;


    dz.appendChild(
      progress
    );
  }


  // ============================================================
  // SETUP CUTE UI
  // ============================================================

  function setupCuteToolUI() {

    panels.forEach(
      panel => {

        const tool =
          panel.id.replace(
            /^panel-/,
            ''
          );


        const meta =
          getToolMeta(
            tool
          );


        panel.dataset.tool =
          tool;


        panel.dataset.toolKind =
          meta.kind;


        createCuteCharacter(
          panel
        );


        const dz =
          panel.querySelector(
            '.dropzone'
          );


        if (!dz) {
          return;
        }


        createCuteEmptyState(
          dz
        );


        updateCuteCharacterText(
          panel
        );


        createCuteProgress(
          dz
        );


        // ------------------------------------------------------
        // Drag state
        // ------------------------------------------------------

        const setDrag =
          on => {

            dz.classList.toggle(
              'is-dragover',
              on
            );
          };


        if (
          !dz.dataset.cuteDragBound
        ) {

          dz.dataset.cuteDragBound =
            'true';


          dz.addEventListener(
            'dragenter',
            () => {

              setDrag(
                true
              );
            }
          );


          dz.addEventListener(
            'dragover',
            () => {

              setDrag(
                true
              );
            }
          );


          dz.addEventListener(
            'dragleave',
            event => {

              if (
                !dz.contains(
                  event.relatedTarget
                )
              ) {

                setDrag(
                  false
                );
              }
            }
          );


          dz.addEventListener(
            'drop',
            () => {

              setDrag(
                false
              );
            }
          );
        }
      }
    );


    refreshCuteLanguage();

    refreshCuteStates();
  }


  // ============================================================
  // REFRESH LANGUAGE
  // ============================================================

  function refreshCuteLanguage() {

    panels.forEach(
      panel => {

        updateCuteCharacterText(
          panel
        );


        const progress =
          panel.querySelector(
            '.cute-progress'
          );


        if (!progress) {
          return;
        }


        const processing =
          panel.querySelector(
            '.is-processing'
          );


        const result =
          panel.querySelector(
            '.tool-result, [id^="result-"]'
          );


        const resultVisible =
          result &&
          !result.classList.contains(
            'hidden'
          );


        const cards =
          panel.querySelectorAll(
            '.ticket, .file-row, .page-card'
          );


        if (resultVisible) {

          updateCuteProgressText(
            panel,
            'done',
            cards.length
          );

        } else if (processing) {

          updateCuteProgressText(
            panel,
            'processing',
            cards.length
          );

        } else {

          updateCuteProgressText(
            panel,
            'idle',
            cards.length
          );
        }
      }
    );


    document.documentElement.dataset.language =
      currentLanguage();
  }


  // ============================================================
  // PROCESSING DETECTION
  // ============================================================

  function isCardProcessing(
    card
  ) {

    if (!card) {
      return false;
    }


    /*
     * Explicit state มี priority สูงสุด
     */

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


    if (
      card.classList.contains(
        'is-processing'
      )
    ) {

      return true;
    }


    /*
     * Text detection ใช้เป็น fallback เท่านั้น
     */

    const text =
      (
        card.textContent ||
        ''
      ).toLowerCase();


    // ----------------------------------------------------------
    // THAI
    // ----------------------------------------------------------

    if (
      /กำลัง|ประมวลผล|จัดทำ|กำลังทำงาน/.test(
        text
      )
    ) {

      return true;
    }


    // ----------------------------------------------------------
    // ENGLISH
    // ----------------------------------------------------------

    if (
      /processing|converting|removing|loading|building|merging|exporting|saving|working|creating|compressing|cropping/.test(
        text
      )
    ) {

      return true;
    }


    // ----------------------------------------------------------
    // JAPANESE
    // ----------------------------------------------------------

    if (
      /処理中|変換中|読み込み中|作成中|保存中|圧縮中|切り抜き中/.test(
        text
      )
    ) {

      return true;
    }


    // ----------------------------------------------------------
    // KOREAN
    // ----------------------------------------------------------

    if (
      /처리 중|변환 중|불러오는 중|생성 중|저장 중|압축 중|자르는 중/.test(
        text
      )
    ) {

      return true;
    }


    // ----------------------------------------------------------
    // CHINESE
    // ----------------------------------------------------------

    if (
      /处理中|转换中|加载中|创建中|保存中|压缩中|裁剪中/.test(
        text
      )
    ) {

      return true;
    }


    return false;
  }


  // ============================================================
  // REFRESH CUTE STATES
  // ============================================================

  function refreshCuteStates() {

    panels.forEach(
      panel => {

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
            '.tool-result, [id^="result-"]'
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


        // ------------------------------------------------------
        // Empty state
        // ------------------------------------------------------

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


        // ------------------------------------------------------
        // Processing
        // ------------------------------------------------------

        let processing =
          false;


        cards.forEach(
          card => {

            const busy =
              isCardProcessing(
                card
              );


            /*
             * อย่าเขียน class ซ้ำถ้า state ไม่เปลี่ยน
             */

            if (
              card.classList.contains(
                'is-processing'
              ) !== busy
            ) {

              card.classList.toggle(
                'is-processing',
                busy
              );
            }


            if (busy) {

              processing =
                true;
            }
          }
        );


        // ------------------------------------------------------
        // Form processing
        // ------------------------------------------------------

        if (
          panel.dataset.processing ===
          'true'
        ) {

          processing =
            true;
        }


        // ------------------------------------------------------
        // Result
        // ------------------------------------------------------

        if (
          result &&
          !result.classList.contains(
            'hidden'
          )
        ) {

          processing =
            false;
        }


        // ------------------------------------------------------
        // Progress
        // ------------------------------------------------------

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

            updateCuteProgressText(
              panel,
              'done',
              cards.length
            );

          } else if (
            processing
          ) {

            updateCuteProgressText(
              panel,
              'processing',
              cards.length
            );

          } else {

            updateCuteProgressText(
              panel,
              'idle',
              cards.length
            );
          }
        }


        // ------------------------------------------------------
        // Busy dropzone
        // ------------------------------------------------------

        dz.classList.toggle(
          'is-busy',
          processing
        );
      }
    );
  }


  // ============================================================
  // REFRESH QUEUE
  // ============================================================

  let cuteRefreshQueued =
    false;


  function scheduleCuteRefresh() {

    if (
      cuteRefreshQueued
    ) {

      return;
    }


    cuteRefreshQueued =
      true;


    const run =
      () => {

        cuteRefreshQueued =
          false;


        refreshCuteStates();
      };


    if (
      typeof requestAnimationFrame ===
      'function'
    ) {

      requestAnimationFrame(
        run
      );

    } else {

      setTimeout(
        run,
        0
      );
    }
  }


  // ============================================================
  // LANGUAGE CHANGE
  // ============================================================

  function handleLanguageChange() {

    /*
     * ไม่สร้าง element ใหม่
     * ไม่ลบ state
     * ไม่แตะไฟล์ผู้ใช้
     */

    refreshCuteLanguage();

    scheduleCuteRefresh();
  }


  /*
   * รองรับทั้ง event มาตรฐานและ custom event
   *
   * i18n.js สามารถ dispatch:
   *   new Event('languagechange')
   *
   * หรือ:
   *   new Event('i18nchange')
   */

  document.addEventListener(
    'languagechange',
    handleLanguageChange,
    true
  );


  document.addEventListener(
    'i18nchange',
    handleLanguageChange,
    true
  );


  // ============================================================
  // MUTATION OBSERVER
  // ============================================================

  let cuteObserver =
    null;


  const panelContainer =
    document.querySelector(
      '.panels'
    );


  if (
    panelContainer &&
    typeof MutationObserver !==
      'undefined'
  ) {

    cuteObserver =
      new MutationObserver(
        mutations => {

          let relevant =
            false;


          for (
            const mutation of
            mutations
          ) {

            // --------------------------------------------------
            // CHILD LIST
            // --------------------------------------------------

            if (
              mutation.type ===
                'childList' &&
              (
                mutation.addedNodes.length ||
                mutation.removedNodes.length
              )
            ) {

              relevant =
                true;

              break;
            }


            // --------------------------------------------------
            // ATTRIBUTES
            // --------------------------------------------------

            if (
              mutation.type ===
              'attributes'
            ) {

              const target =
                mutation.target;


              if (!target) {
                continue;
              }


              /*
               * สนใจเฉพาะ element ที่เกี่ยวกับ state
               */

              if (
                target.matches &&
                (
                  target.matches(
                    '.tool-panel, .dropzone, .ticket, .file-row, .page-card, .tool-result'
                  ) ||
                  target.closest?.(
                    '.tool-panel'
                  )
                )
              ) {

                relevant =
                  true;

                break;
              }
            }
          }


          if (
            relevant
          ) {

            scheduleCuteRefresh();
          }
        }
      );


    cuteObserver.observe(
      panelContainer,
      {
        childList:
          true,

        subtree:
          true,

        attributes:
          true,

        attributeFilter: [
          'class',
          'data-processing'
        ]
      }
    );
  }


  // ============================================================
  // CACHE CLEAR
  // ============================================================

  function runAutoClearCache() {

    /*
     * ห้าม clear cache ระหว่าง processing
     */

    if (
      hasProcessingWork()
    ) {

      return;
    }


    if (
      window.Utils &&
      typeof window.Utils.clearCache ===
        'function'
    ) {

      try {

        window.Utils.clearCache();

      } catch (_) {}
    }


    if (
      window.PdfWorkerClient &&
      typeof window.PdfWorkerClient.dispose ===
        'function'
    ) {

      try {

        window.PdfWorkerClient.dispose();

      } catch (_) {}
    }


    scheduleCuteRefresh();
  }


  // ============================================================
  // IDLE MANAGEMENT
  // ============================================================

  const IDLE_LIMIT_MS =
    5 *
    60 *
    1000;


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
  ].forEach(
    eventName => {

      document.addEventListener(
        eventName,
        markActivity,
        {
          passive:
            true,

          capture:
            true
        }
      );
    }
  );


  function hasProcessingWork() {

    const activePanel =
      document.querySelector(
        '.tool-panel:not(.hidden)'
      );


    if (!activePanel) {
      return false;
    }


    return !!(
      activePanel.querySelector(
        '.is-processing'
      ) ||
      activePanel.dataset.processing ===
        'true'
    );
  }


  function hasVisibleResult() {

    return !!document.querySelector(
      [
        '.tool-panel:not(.hidden) .js-download-btn:not(.hidden)',
        '.tool-panel:not(.hidden) .js-download:not(.hidden)',
        '.tool-panel:not(.hidden) .result-strip:not(.hidden)',
        '.tool-panel:not(.hidden) .is-ready',
        '.tool-panel:not(.hidden) .tool-result:not(.hidden)'
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


      if (
        hasProcessingWork()
      ) {

        return;
      }


      if (
        hasVisibleResult()
      ) {

        return;
      }


      if (
        isUserEditing()
      ) {

        return;
      }


      runAutoClearCache();


      lastActivity =
        Date.now();

    },
    60 *
    1000
  );


  // ============================================================
  // PAGE HIDE
  // ============================================================

  window.addEventListener(
    'pagehide',
    () => {

      if (
        window.Utils &&
        typeof window.Utils.clearCache ===
          'function'
      ) {

        try {

          window.Utils.clearCache();

        } catch (_) {}
      }


      if (
        window.PdfWorkerClient &&
        typeof window.PdfWorkerClient.dispose ===
          'function'
      ) {

        try {

          window.PdfWorkerClient.dispose();

        } catch (_) {}
      }


      if (
        cuteObserver
      ) {

        try {

          cuteObserver.disconnect();

        } catch (_) {}
      }
    }
  );


  // ============================================================
  // START
  // ============================================================

  setupCuteToolUI();


  /*
   * เริ่มต้นหน้าเว็บที่ Image
   */

  showCategory(
    'image'
  );


})();
