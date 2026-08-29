(() => {
  'use strict';

  const I18n =
    window.I18n || null;


  // ============================================================
  // TRANSLATION HELPER
  // ============================================================

  function t(
    key,
    values
  ) {

    if (
      I18n &&
      typeof I18n.t ===
        'function'
    ) {

      return I18n.t(
        key,
        values
      );
    }

    return String(
      key
    );
  }


  // ============================================================
  // ELEMENTS
  // ============================================================

  const catButtons =
    Array.from(
      document.querySelectorAll(
        '.cat-btn'
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

  /*
   * ใช้ translation key แทนข้อความภาษาไทยโดยตรง
   */

  const TOOL_META = {

    // ----------------------------------------------------------
    // IMAGE
    // ----------------------------------------------------------

    'img-convert': [
      'image',
      'image.characterConvert'
    ],

    'img-crop': [
      'image',
      'image.characterCrop'
    ],

    'img-bgremove': [
      'image',
      'image.characterBgRemove'
    ],

    'img-compress': [
      'image',
      'image.characterCompress'
    ],


    // ----------------------------------------------------------
    // PDF
    // ----------------------------------------------------------

    'pdf-from-images': [
      'pdf',
      'pdf.characterFromImages'
    ],

    'pdf-to-images': [
      'pdf',
      'pdf.characterToImages'
    ],

    'pdf-pages': [
      'pdf',
      'pdf.characterPages'
    ],

    'pdf-merge': [
      'pdf',
      'pdf.characterMerge'
    ],

    'pdf-watermark': [
      'pdf',
      'pdf.characterWatermark'
    ],

    'pdf-pagenumbers': [
      'pdf',
      'pdf.characterPageNumbers'
    ]

  };


  // ============================================================
  // CATEGORY
  // ============================================================

  function showCategory(
    cat
  ) {

    if (
      currentCat &&
      currentCat !== cat
    ) {

      runAutoClearCache();
    }


    currentCat =
      cat;


    catButtons.forEach(
      button => {

        button.classList.toggle(
          'is-active',
          button.dataset.cat ===
            cat
        );
      }
    );


    chipGroups.forEach(
      group => {

        group.classList.toggle(
          'hidden',
          group.dataset.catGroup !==
            cat
        );
      }
    );


    const activeGroup =
      chipGroups.find(
        group =>
          group.dataset.catGroup ===
          cat
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


    if (
      activeChip
    ) {

      showTool(
        activeChip.dataset.tool
      );
    }
  }


  // ============================================================
  // TOOL
  // ============================================================

  function showTool(
    tool
  ) {

    document
      .querySelectorAll(
        '.tool-chip'
      )
      .forEach(
        button => {

          button.classList.toggle(
            'is-active',
            button.dataset.tool ===
              tool
          );
        }
      );


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


    scheduleCuteRefresh();
  }


  // ============================================================
  // EVENTS
  // ============================================================

  catButtons.forEach(
    button => {

      button.addEventListener(
        'click',
        () => {

          showCategory(
            button.dataset.cat
          );
        }
      );
    }
  );


  document
    .querySelectorAll(
      '.tool-chip'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            showTool(
              button.dataset.tool
            );
          }
        );
      }
    );


  // ============================================================
  // CUTE UI
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
          TOOL_META[tool] ||
          [
            'image',
            'common.ready'
          ];


        panel.dataset.tool =
          tool;


        panel.dataset.toolKind =
          meta[0];


        // ------------------------------------------------------
        // Character
        // ------------------------------------------------------

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


          panel.appendChild(
            dot
          );
        }


        // ------------------------------------------------------
        // Dropzone
        // ------------------------------------------------------

        const dz =
          panel.querySelector(
            '.dropzone'
          );


        if (
          !dz
        ) {
          return;
        }


        // ------------------------------------------------------
        // Empty state
        // ------------------------------------------------------

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
          ).appendChild(
            empty
          );
        }


        const copy =
          dz.querySelector(
            '.cute-empty-copy'
          );


        if (
          copy
        ) {

          copy.dataset.i18n =
            meta[1];


          copy.textContent =
            t(
              meta[1]
            );
        }


        // ------------------------------------------------------
        // Progress
        // ------------------------------------------------------

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
    );


    refreshCuteStates();
  }


  // ============================================================
  // CUTE STATE REFRESH
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
  // PROCESSING DETECTION
  // ============================================================

  function isCardProcessing(
    card
  ) {

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


    /*
     * fallback สำหรับ Tool เดิม
     *
     * รองรับข้อความหลายภาษา
     */
    const text =
      (
        card.textContent ||
        ''
      ).toLowerCase();


    return (
      // Thai
      /กำลัง|ประมวลผล|จัดทำ|กำลังทำงาน/.test(
        text
      ) ||

      // English
      /processing|converting|removing|loading|building|merging|exporting|saving|working|creating|compressing|cropping/.test(
        text
      ) ||

      // Japanese
      /処理中|変換中|読み込み中|作成中|保存中/.test(
        text
      ) ||

      // Korean
      /처리 중|변환 중|불러오는 중|생성 중|저장 중/.test(
        text
      ) ||

      // Chinese
      /处理中|转换中|加载中|创建中|保存中/.test(
        text
      )
    );
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


        if (
          !dz
        ) {
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


        // ------------------------------------------------------
        // Empty state
        // ------------------------------------------------------

        const empty =
          dz.querySelector(
            '.cute-empty-state'
          );


        if (
          empty
        ) {

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


            card.classList.toggle(
              'is-processing',
              busy
            );


            if (
              busy
            ) {

              processing =
                true;
            }
          }
        );


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


        if (
          progress
        ) {

          progress.classList.toggle(
            'is-visible',
            processing
          );


          const strong =
            progress.querySelector(
              '.cute-progress-title'
            );


          const count =
            progress.querySelector(
              '.cute-progress-count'
            );


          // ----------------------------------------------------
          // DONE
          // ----------------------------------------------------

          if (
            !processing &&
            hasFiles
          ) {

            progress.classList.add(
              'is-done'
            );


            if (
              strong
            ) {

              strong.textContent =
                t(
                  'cute.ready'
                );
            }


            if (
              count
            ) {

              count.textContent =
                t(
                  'cute.completed'
                );
            }


          // ----------------------------------------------------
          // PROCESSING
          // ----------------------------------------------------

          } else if (
            processing
          ) {

            progress.classList.remove(
              'is-done'
            );


            if (
              strong
            ) {

              strong.textContent =
                t(
                  'cute.processing'
                );
            }


            if (
              count
            ) {

              if (
                cards.length
              ) {

                count.textContent =
                  t(
                    'cute.itemCount',
                    {
                      count:
                        cards.length
                    }
                  );

              } else {

                count.textContent =
                  t(
                    'common.processing'
                  );
              }
            }


          // ----------------------------------------------------
          // IDLE
          // ----------------------------------------------------

          } else {

            progress.classList.remove(
              'is-done'
            );
          }
        }


        // ------------------------------------------------------
        // Busy state
        // ------------------------------------------------------

        dz.classList.toggle(
          'is-busy',
          processing
        );
      }
    );
  }


  // ============================================================
  // INITIALIZE
  // ============================================================

  setupCuteToolUI();


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
    panelContainer
  ) {

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

              relevant =
                true;


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
  // LANGUAGE CHANGE
  // ============================================================

  document.addEventListener(
    'languagechange',
    () => {

      /*
       * อัปเดตข้อความของ cute empty state
       */
      panels.forEach(
        panel => {

          const tool =
            panel.dataset.tool;


          if (
            !tool
          ) {
            return;
          }


          const meta =
            TOOL_META[tool];


          if (
            !meta
          ) {
            return;
          }


          const copy =
            panel.querySelector(
              '.cute-empty-copy'
            );


          if (
            copy
          ) {

            copy.textContent =
              t(
                meta[1]
              );
          }
        }
      );


      scheduleCuteRefresh();
    }
  );


  // ============================================================
  // CACHE CLEAR
  // ============================================================

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


    if (
      !active
    ) {
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

        window.Utils.clearCache();
      }


      if (
        window.PdfWorkerClient &&
        typeof window.PdfWorkerClient.dispose ===
          'function'
      ) {

        window.PdfWorkerClient.dispose();
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

  showCategory(
    'image'
  );

})();
