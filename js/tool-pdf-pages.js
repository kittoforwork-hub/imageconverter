/* global window, document, URL, Blob, IntersectionObserver, pdfjsLib */

(() => {
  'use strict';


  // ============================================================
  // GLOBALS
  // ============================================================

  const U =
    window.Utils;

  const PW =
    window.PdfWorkerClient;

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
      typeof I18n.t === 'function'
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

  const dropzone =
    document.getElementById(
      'dz-pdf-pages'
    );

  const fileInput =
    document.getElementById(
      'input-pdf-pages'
    );

  const bulkbar =
    document.getElementById(
      'bulk-pdf-pages'
    );

  const nameEl =
    bulkbar?.querySelector(
      '.js-pdfname'
    );

  const countEl =
    document.getElementById(
      'count-pdf-pages'
    );

  const selectAllEl =
    document.getElementById(
      'selectAll-pdf-pages'
    );

  const downloadBtn =
    document.getElementById(
      'download-pdf-pages'
    );

  const downloadSelectedBtn =
    document.getElementById(
      'downloadSelected-pdf-pages'
    );

  const noteEl =
    document.getElementById(
      'note-pdf-pages'
    );

  const grid =
    document.getElementById(
      'grid-pdf-pages'
    );

  const cardTemplate =
    document.getElementById(
      'tpl-page-manage'
    );


  // ============================================================
  // GUARD
  // ============================================================

  if (
    !U ||
    !PW ||
    !dropzone ||
    !fileInput ||
    !bulkbar ||
    !grid ||
    !cardTemplate
  ) {

    console.error(
      'PDF Pages: required elements are missing'
    );

    return;
  }


  // ============================================================
  // CONFIG
  // ============================================================

  const THUMB_TARGET_WIDTH =
    420;

  const THUMB_MAX_DIMENSION =
    1800;

  const LARGE_FILE_WARN_MB =
    50;

  const DRAG_START_DISTANCE =
    6;


  // ============================================================
  // STATE
  // ============================================================

  let currentFile =
    null;

  let currentDoc =
    null;

  let loadSeq =
    0;

  let pageItems =
    [];

  let observer =
    null;

  let renderQueue =
    [];

  let queueRunning =
    false;

  let downloadRunning =
    false;

  let dragState =
    null;

  let suppressClickUntil =
    0;


  // ============================================================
  // LOCALIZED HELPERS
  // ============================================================

  /*
   * สำคัญ:
   * i18n ใช้ {page}
   * ดังนั้นต้องส่ง page: number
   */
  function pageLabel(
    number
  ) {

    return t(
      'pdf.pageLabel',
      {
        page:
          number
      }
    );

  }


  /*
   * i18n ใช้ {count}
   */
  function pageCountLabel(
    number
  ) {

    return t(
      'pdf.pagesCount',
      {
        count:
          number
      }
    );

  }


  function fileCountLabel(
    number
  ) {

    return t(
      'pdf.filesCount',
      {
        count:
          number
      }
    );

  }


  function getDeleteButtonLabel(
    deleted
  ) {

    return deleted
      ? t(
          'pdf.restorePage'
        )
      : t(
          'pdf.deletePage'
        );

  }


  function getBuildingPdfText() {

    return t(
      'pdf.creating'
    );

  }


  function getDropPositionText() {

    return t(
      'pdf.dropPosition'
    );

  }


  // ============================================================
  // LANGUAGE UI
  // ============================================================

  function updateLanguageUI() {

    // ----------------------------------------------------------
    // Download buttons
    // ----------------------------------------------------------

    if (
      downloadBtn
    ) {

      if (
        downloadRunning
      ) {

        downloadBtn.textContent =
          getBuildingPdfText();

      } else {

        downloadBtn.textContent =
          t(
            'pdf.downloadPdfOrdered'
          );

      }

    }


    if (
      downloadSelectedBtn
    ) {

      if (
        downloadRunning
      ) {

        downloadSelectedBtn.textContent =
          getBuildingPdfText();

      } else {

        downloadSelectedBtn.textContent =
          t(
            'pdf.downloadSelected'
          );

      }

    }


    // ----------------------------------------------------------
    // File / page count area
    // ----------------------------------------------------------

    if (
      nameEl &&
      currentFile
    ) {

      nameEl.textContent =
        `${currentFile.name} · ${U.formatBytes(
          currentFile.size
        )}`;

    }


    // ----------------------------------------------------------
    // Existing cards
    // ----------------------------------------------------------

    grid
      .querySelectorAll(
        '.page-card-manage'
      )
      .forEach(
        card => {

          const index =
            Number(
              card.dataset.idx
            );


          const item =
            pageItems.find(
              entry =>
                entry.origIndex ===
                index
            );


          if (!item) {
            return;
          }


          const position =
            pageItems.indexOf(
              item
            );


          // ----------------------------------------------------
          // Page label
          // ----------------------------------------------------

          const label =
            card.querySelector(
              '.js-pagelabel'
            );


          if (label) {

            label.textContent =
              pageLabel(
                position + 1
              );

          }


          // ----------------------------------------------------
          // Image alt
          // ----------------------------------------------------

          const img =
            card.querySelector(
              'img'
            );


          if (img) {

            img.alt =
              pageLabel(
                position + 1
              );

          }


          // ----------------------------------------------------
          // Delete button
          // ----------------------------------------------------

          const deleteBtn =
            card.querySelector(
              '.js-delete'
            );


          if (deleteBtn) {

            deleteBtn.title =
              getDeleteButtonLabel(
                item.deleted
              );

          }


          // ----------------------------------------------------
          // Move buttons
          // ----------------------------------------------------

          const upBtn =
            card.querySelector(
              '.js-move-up'
            );


          if (upBtn) {

            upBtn.title =
              t(
                'pdf.moveUp'
              );

          }


          const downBtn =
            card.querySelector(
              '.js-move-down'
            );


          if (downBtn) {

            downBtn.title =
              t(
                'pdf.moveDown'
              );

          }

        }
      );


    // ----------------------------------------------------------
    // Drag placeholder
    // ----------------------------------------------------------

    if (
      dragState &&
      dragState.placeholder
    ) {

      const text =
        dragState.placeholder.querySelector(
          'span'
        );


      if (text) {

        text.textContent =
          getDropPositionText();

      }

    }


    // ----------------------------------------------------------
    // Instruction / empty dynamic text
    // ----------------------------------------------------------

    const dynamicInstruction =
      document.querySelector(
        '#panel-pdf-pages [data-i18n]'
      );


    if (
      dynamicInstruction &&
      I18n &&
      typeof I18n.applyTranslations ===
        'function'
    ) {

      I18n.applyTranslations(
        document.getElementById(
          'panel-pdf-pages'
        )
      );

    }

  }


  // ============================================================
  // TOOL PROCESSING STATE
  // ============================================================

  function setToolProcessing(
    on
  ) {

    const panel =
      document.getElementById(
        'panel-pdf-pages'
      );


    if (!panel) {
      return;
    }


    panel.dataset.processing =
      on
        ? 'true'
        : 'false';

  }


  // ============================================================
  // PAGE HELPERS
  // ============================================================

  function getVisibleItems() {

    return pageItems.filter(
      item =>
        !item.deleted
    );

  }


  function getSelectedItems() {

    return pageItems.filter(
      item =>
        item.selected &&
        !item.deleted
    );

  }


  function updateCounts() {

    const visible =
      getVisibleItems().length;


    const selected =
      getSelectedItems().length;


    if (countEl) {

      countEl.textContent =
        String(
          visible
        );

    }


    if (selectAllEl) {

      selectAllEl.checked =
        visible > 0 &&
        selected === visible;


      selectAllEl.indeterminate =
        selected > 0 &&
        selected < visible;

    }

  }


  // ============================================================
  // THUMBNAIL CLEANUP
  // ============================================================

  function revokeThumbs() {

    pageItems.forEach(
      item => {

        if (!item.thumbUrl) {
          return;
        }


        try {

          URL.revokeObjectURL(
            item.thumbUrl
          );

        } catch (_) {}


        item.thumbUrl =
          null;

      }
    );

  }


  // ============================================================
  // QUEUE
  // ============================================================

  function resetQueue() {

    renderQueue =
      [];

    queueRunning =
      false;

  }


  function queueRender(
    index
  ) {

    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= pageItems.length
    ) {

      return;

    }


    if (
      !renderQueue.includes(
        index
      )
    ) {

      renderQueue.push(
        index
      );

    }


    processQueue();

  }


  async function processQueue() {

    if (
      queueRunning ||
      !currentDoc
    ) {

      return;

    }


    queueRunning =
      true;


    try {

      while (
        renderQueue.length
      ) {

        const index =
          renderQueue.shift();


        if (
          index == null ||
          index < 0 ||
          index >= pageItems.length
        ) {

          continue;

        }


        const item =
          pageItems[index];


        if (
          !item ||
          item.deleted ||
          item.thumbUrl
        ) {

          continue;

        }


        const expectedLoadSeq =
          loadSeq;


        try {

          const page =
            await currentDoc.getPage(
              index + 1
            );


          if (
            expectedLoadSeq !==
            loadSeq
          ) {

            continue;

          }


          const originalViewport =
            page.getViewport({
              scale:
                1
            });


          const baseScale =
            THUMB_TARGET_WIDTH /
            originalViewport.width;


          const viewport =
            page.getViewport({
              scale:
                baseScale
            });


          const width =
            Math.max(
              1,
              Math.round(
                viewport.width
              )
            );


          const height =
            Math.max(
              1,
              Math.round(
                viewport.height
              )
            );


          const scale =
            Math.min(
              1,
              THUMB_MAX_DIMENSION /
                Math.max(
                  width,
                  height
                )
            );


          const renderViewport =
            page.getViewport({
              scale:
                baseScale *
                scale
            });


          const canvas =
            document.createElement(
              'canvas'
            );


          const context =
            canvas.getContext(
              '2d',
              {
                alpha:
                  false
              }
            );


          if (!context) {

            throw new Error(
              t(
                'errors.canvasContext'
              )
            );

          }


          canvas.width =
            Math.max(
              1,
              Math.round(
                renderViewport.width
              )
            );


          canvas.height =
            Math.max(
              1,
              Math.round(
                renderViewport.height
              )
            );


          await page.render({
            canvasContext:
              context,

            viewport:
              renderViewport

          }).promise;


          if (
            expectedLoadSeq !==
            loadSeq
          ) {

            canvas.width = 1;
            canvas.height = 1;

            continue;

          }


          const blob =
            await new Promise(
              resolve =>
                canvas.toBlob(
                  resolve,
                  'image/jpeg',
                  0.82
                )
            );


          canvas.width = 1;
          canvas.height = 1;


          if (!blob) {

            throw new Error(
              t(
                'pdf.thumbnailFailed'
              )
            );

          }


          if (
            expectedLoadSeq !==
            loadSeq
          ) {

            continue;

          }


          if (
            item.thumbUrl
          ) {

            try {

              URL.revokeObjectURL(
                item.thumbUrl
              );

            } catch (_) {}

          }


          item.thumbUrl =
            URL.createObjectURL(
              blob
            );


          item.thumbError =
            false;


          updateCardThumbnail(
            index
          );

        } catch (error) {

          console.warn(
            'PDF thumbnail error:',
            index,
            error
          );


          const currentItem =
            pageItems[index];


          if (
            currentItem &&
            expectedLoadSeq ===
              loadSeq
          ) {

            currentItem.thumbError =
              true;


            updateCardThumbnail(
              index
            );

          }

        }

      }

    } finally {

      queueRunning =
        false;


      if (
        renderQueue.length &&
        currentDoc
      ) {

        processQueue();

      }

    }

  }


  // ============================================================
  // DESTROY PDF DOCUMENT
  // ============================================================

  async function destroyCurrentDoc() {

    const doc =
      currentDoc;


    currentDoc =
      null;


    if (!doc) {
      return;
    }


    try {

      await doc.destroy();

    } catch (error) {

      console.warn(
        'PDF document destroy warning:',
        error
      );

    }

  }


  // ============================================================
  // LOAD FILE
  // ============================================================

  async function loadFile(
    file
  ) {

    if (!file) {
      return;
    }


    const requestId =
      ++loadSeq;


    const validPdf =
      file.type ===
        'application/pdf' ||
      /\.pdf$/i.test(
        file.name
      );


    if (!validPdf) {

      alert(
        t(
          'pdf.invalidPdf'
        )
      );


      return;

    }


    if (
      !U.confirmLargeFile(
        file,
        LARGE_FILE_WARN_MB
      )
    ) {

      return;

    }


    try {

      setToolProcessing(
        true
      );


      if (observer) {

        observer.disconnect();

        observer =
          null;

      }


      resetQueue();

      revokeThumbs();

      pageItems =
        [];


      if (dragState) {

        cleanupDragState();

      }


      clearDropIndicators();


      await destroyCurrentDoc();


      if (
        requestId !==
        loadSeq
      ) {

        return;

      }


      currentFile =
        file;


      if (nameEl) {

        nameEl.textContent =
          `${file.name} · ${U.formatBytes(
            file.size
          )}`;

      }


      grid.innerHTML =
        '';


      bulkbar.classList.remove(
        'hidden'
      );


      if (noteEl) {

        noteEl.classList.remove(
          'hidden'
        );

      }


      if (countEl) {

        countEl.textContent =
          '…';

      }


      const bytes =
        await U.readAsArrayBuffer(
          file
        );


      if (
        requestId !==
        loadSeq
      ) {

        return;

      }


      const loadingTask =
        pdfjsLib.getDocument({
          data:
            bytes,

          canvasFactory:
            window.KittoCanvasFactory

        });


      const doc =
        await loadingTask.promise;


      if (
        requestId !==
        loadSeq
      ) {

        try {

          await doc.destroy();

        } catch (_) {}

        return;

      }


      currentDoc =
        doc;


      for (
        let i = 0;
        i < doc.numPages;
        i++
      ) {

        pageItems.push({

          origIndex:
            i,

          thumbUrl:
            null,

          rendering:
            false,

          deleted:
            false,

          selected:
            false,

          thumbError:
            false

        });

      }


      updateCounts();

      renderGrid();

    } catch (error) {

      if (
        requestId !==
        loadSeq
      ) {

        return;

      }


      console.error(
        'PDF load error:',
        error
      );


      await destroyCurrentDoc();


      currentFile =
        null;


      pageItems =
        [];


      grid.innerHTML =
        '';


      bulkbar.classList.add(
        'hidden'
      );


      if (noteEl) {

        noteEl.classList.add(
          'hidden'
        );

      }


      if (countEl) {

        countEl.textContent =
          '0';

      }


      if (selectAllEl) {

        selectAllEl.checked =
          false;

        selectAllEl.indeterminate =
          false;

      }


      alert(
        t(
          'pdf.loadingFailed'
        ) +
        '\n\n' +
        (
          error?.message ||
          t(
            'errors.somethingWentWrong'
          )
        )
      );

    } finally {

      if (
        requestId ===
        loadSeq
      ) {

        setToolProcessing(
          false
        );

      }

    }

  }


  // ============================================================
  // THUMBNAIL UPDATE
  // ============================================================

  function updateCardThumbnail(
    index
  ) {

    const card =
      grid.querySelector(
        `.page-card-manage[data-idx="${index}"]`
      );


    if (!card) {
      return;
    }


    const item =
      pageItems.find(
        entry =>
          entry.origIndex ===
          index
      );


    if (!item) {
      return;
    }


    const img =
      card.querySelector(
        'img'
      );


    if (
      img &&
      item.thumbUrl
    ) {

      img.src =
        item.thumbUrl;


      img.alt =
        pageLabel(
          getItemPosition(item) + 1
        );


      card.classList.remove(
        'is-pending',
        'is-thumb-error'
      );


      return;

    }


    if (
      item.thumbError
    ) {

      card.classList.remove(
        'is-pending'
      );


      card.classList.add(
        'is-thumb-error'
      );

    }

  }


  function getItemPosition(
    item
  ) {

    return pageItems.indexOf(
      item
    );

  }


  // ============================================================
  // INTERSECTION OBSERVER
  // ============================================================

  function setupObserver() {

    if (observer) {

      observer.disconnect();

    }


    observer =
      new IntersectionObserver(
        entries => {

          entries.forEach(
            entry => {

              if (
                !entry.isIntersecting
              ) {

                return;

              }


              const card =
                entry.target;


              const idx =
                Number(
                  card.dataset.idx
                );


              if (
                !Number.isInteger(
                  idx
                )
              ) {

                return;

              }


              const item =
                pageItems.find(
                  page =>
                    page.origIndex ===
                    idx
                );


              if (
                !item ||
                item.deleted ||
                item.thumbUrl
              ) {

                observer.unobserve(
                  card
                );

                return;

              }


              queueRender(
                idx
              );


              observer.unobserve(
                card
              );

            }
          );


          processQueue();

        },
        {
          root:
            null,

          rootMargin:
            '400px 0px',

          threshold:
            0.01
        }
      );


    grid
      .querySelectorAll(
        '.page-card-manage'
      )
      .forEach(
        card => {

          const idx =
            Number(
              card.dataset.idx
            );


          const item =
            pageItems.find(
              entry =>
                entry.origIndex ===
                idx
            );


          if (
            item &&
            !item.thumbUrl &&
            !item.deleted
          ) {

            observer.observe(
              card
            );

          }

        }
      );

  }


  // ============================================================
  // CARD STATE
  // ============================================================

  function updateCardState(
    card,
    item
  ) {

    if (
      !card ||
      !item
    ) {

      return;

    }


    card.classList.toggle(
      'is-deleted',
      item.deleted
    );


    card.classList.toggle(
      'is-selected',
      item.selected &&
      !item.deleted
    );


    card.classList.toggle(
      'is-pending',
      !item.thumbUrl &&
      !item.deleted
    );


    card.dataset.deleted =
      item.deleted
        ? 'true'
        : 'false';


    card.dataset.selected =
      item.selected
        ? 'true'
        : 'false';

  }


  // ============================================================
  // RENDER GRID
  // ============================================================

  function renderGrid() {

    if (observer) {

      observer.disconnect();

    }


    grid.innerHTML =
      '';


    pageItems.forEach(
      (item, position) => {

        const card =
          cardTemplate.content
            .firstElementChild
            .cloneNode(
              true
            );


        card.dataset.idx =
          String(
            item.origIndex
          );


        updateCardState(
          card,
          item
        );


        // ------------------------------------------------------
        // Thumbnail
        // ------------------------------------------------------

        const img =
          card.querySelector(
            'img'
          );


        if (
          img &&
          item.thumbUrl
        ) {

          img.src =
            item.thumbUrl;


          img.alt =
            pageLabel(
              position + 1
            );

        }


        // ------------------------------------------------------
        // Label
        // ------------------------------------------------------

        const label =
          card.querySelector(
            '.js-pagelabel'
          );


        if (label) {

          label.textContent =
            pageLabel(
              position + 1
            );

        }


        // ------------------------------------------------------
        // Checkbox
        // ------------------------------------------------------

        const checkbox =
          card.querySelector(
            '.js-select'
          );


        if (checkbox) {

          checkbox.checked =
            item.selected &&
            !item.deleted;


          checkbox.disabled =
            item.deleted;


          checkbox.addEventListener(
            'pointerdown',
            event => {

              event.stopPropagation();

            }
          );


          checkbox.addEventListener(
            'click',
            event => {

              event.stopPropagation();

            }
          );


          checkbox.addEventListener(
            'change',
            () => {

              if (
                item.deleted
              ) {

                checkbox.checked =
                  false;

                return;

              }


              item.selected =
                checkbox.checked;


              updateCardState(
                card,
                item
              );


              updateCounts();

            }
          );

        }


        // ------------------------------------------------------
        // Click card = select
        // ------------------------------------------------------

        card.addEventListener(
          'click',
          event => {

            if (
              Date.now() <
              suppressClickUntil
            ) {

              return;

            }


            if (
              event.target.closest(
                'button, input, a, select, textarea'
              )
            ) {

              return;

            }


            if (
              item.deleted
            ) {

              return;

            }


            item.selected =
              !item.selected;


            updateCardState(
              card,
              item
            );


            updateCounts();

          }
        );


        // ------------------------------------------------------
        // Move up
        // ------------------------------------------------------

        const upBtn =
          card.querySelector(
            '.js-move-up'
          );


        if (upBtn) {

          upBtn.disabled =
            position === 0;


          upBtn.title =
            t(
              'pdf.moveUp'
            );


          upBtn.addEventListener(
            'click',
            event => {

              event.stopPropagation();


              moveItem(
                position,
                -1
              );

            }
          );

        }


        // ------------------------------------------------------
        // Move down
        // ------------------------------------------------------

        const downBtn =
          card.querySelector(
            '.js-move-down'
          );


        if (downBtn) {

          downBtn.disabled =
            position ===
            pageItems.length - 1;


          downBtn.title =
            t(
              'pdf.moveDown'
            );


          downBtn.addEventListener(
            'click',
            event => {

              event.stopPropagation();


              moveItem(
                position,
                1
              );

            }
          );

        }


        // ------------------------------------------------------
        // Delete / Restore
        // ------------------------------------------------------

        const deleteBtn =
          card.querySelector(
            '.js-delete'
          );


        if (deleteBtn) {

          deleteBtn.title =
            getDeleteButtonLabel(
              item.deleted
            );


          deleteBtn.textContent =
            item.deleted
              ? '↺'
              : '✕';


          deleteBtn.addEventListener(
            'click',
            event => {

              event.stopPropagation();


              if (
                item.deleted
              ) {

                item.deleted =
                  false;


                item.thumbError =
                  false;


                if (
                  !item.thumbUrl
                ) {

                  queueRender(
                    item.origIndex
                  );

                }

              } else {

                item.deleted =
                  true;


                item.selected =
                  false;

              }


              renderGrid();

              updateCounts();

            }
          );

        }


        // ------------------------------------------------------
        // Drag
        // ------------------------------------------------------

        setupCardDrag(
          card,
          item
        );


        grid.appendChild(
          card
        );

      }
    );


    setupObserver();

  }


  // ============================================================
  // MOVE ITEM
  // ============================================================

  function moveItem(
    position,
    direction
  ) {

    const target =
      position +
      direction;


    if (
      target < 0 ||
      target >= pageItems.length
    ) {

      return;

    }


    const temp =
      pageItems[position];


    pageItems[position] =
      pageItems[target];


    pageItems[target] =
      temp;


    renderGrid();

    updateCounts();

  }


  // ============================================================
  // DRAG SYSTEM
  // ============================================================

  function setupCardDrag(
    card,
    item
  ) {

    if (
      !card ||
      !item
    ) {

      return;

    }


    card.addEventListener(
      'pointerdown',
      event => {

        if (
          event.isPrimary === false
        ) {

          return;

        }


        if (
          item.deleted
        ) {

          return;

        }


        if (
          event.button !== 0
        ) {

          return;

        }


        if (
          event.target.closest(
            'button, input, select, textarea, a'
          )
        ) {

          return;

        }


        const rect =
          card.getBoundingClientRect();


        dragState = {

          card,

          item,

          pointerId:
            event.pointerId,

          startX:
            event.clientX,

          startY:
            event.clientY,

          grabOffsetX:
            event.clientX -
            rect.left,

          grabOffsetY:
            event.clientY -
            rect.top,

          moved:
            false,

          started:
            false,

          placeholder:
            null,

          originalParent:
            card.parentNode,

          originalNextSibling:
            card.nextSibling,

          originalIndex:
            pageItems.indexOf(
              item
            )
        };


        event.preventDefault();

      },
      {
        passive:
          false
      }
    );

  }


  // ============================================================
  // GLOBAL POINTER MOVE
  // ============================================================

  document.addEventListener(
    'pointermove',
    event => {

      if (!dragState) {
        return;
      }


      if (
        event.pointerId !==
        dragState.pointerId
      ) {

        return;

      }


      event.preventDefault();


      const dx =
        event.clientX -
        dragState.startX;


      const dy =
        event.clientY -
        dragState.startY;


      // --------------------------------------------------------
      // Start distance
      // --------------------------------------------------------

      if (
        !dragState.moved &&
        Math.hypot(
          dx,
          dy
        ) <
          DRAG_START_DISTANCE
      ) {

        return;

      }


      // --------------------------------------------------------
      // Start real drag
      // --------------------------------------------------------

      if (
        !dragState.moved
      ) {

        dragState.moved =
          true;


        startRealDrag(
          dragState.card,
          dragState.item
        );

      }


      // --------------------------------------------------------
      // Floating card
      // --------------------------------------------------------

      if (
        !dragState.started
      ) {

        return;

      }


      moveFloatingCard(
        event.clientX,
        event.clientY
      );


      updateDropPosition(
        event.clientX,
        event.clientY
      );

    },
    {
      passive:
        false
    }
  );


  // ============================================================
  // GLOBAL POINTER UP
  // ============================================================

  document.addEventListener(
    'pointerup',
    event => {

      if (!dragState) {
        return;
      }


      if (
        event.pointerId !==
        dragState.pointerId
      ) {

        return;

      }


      event.preventDefault();


      finishDrag();

    },
    {
      passive:
        false
    }
  );


  // ============================================================
  // GLOBAL POINTER CANCEL
  // ============================================================

  document.addEventListener(
    'pointercancel',
    event => {

      if (!dragState) {
        return;
      }


      if (
        event.pointerId !==
        dragState.pointerId
      ) {

        return;

      }


      cancelDrag();

    }
  );


  // ============================================================
  // START REAL DRAG
  // ============================================================

  function startRealDrag(
    card,
    item
  ) {

    if (
      !dragState ||
      dragState.started
    ) {

      return;

    }


    if (
      !card ||
      !card.isConnected
    ) {

      return;

    }


    const rect =
      card.getBoundingClientRect();


    // ----------------------------------------------------------
    // Placeholder
    // ----------------------------------------------------------

    const placeholder =
      document.createElement(
        'div'
      );


    placeholder.className =
      'page-drag-placeholder';


    placeholder.dataset.idx =
      String(
        item.origIndex
      );


    placeholder.style.width =
      `${rect.width}px`;


    placeholder.style.height =
      `${rect.height}px`;


    placeholder.innerHTML = `
      <div class="page-drag-placeholder-inner">
        <span>${getDropPositionText()}</span>
      </div>
    `;


    // ----------------------------------------------------------
    // Insert placeholder
    // ----------------------------------------------------------

    if (
      card.parentNode ===
      grid
    ) {

      grid.insertBefore(
        placeholder,
        card
      );

    } else {

      grid.appendChild(
        placeholder
      );

    }


    // ----------------------------------------------------------
    // Floating card
    // ----------------------------------------------------------

    card.classList.add(
      'is-dragging'
    );


    document.body.appendChild(
      card
    );


    card.style.position =
      'fixed';


    card.style.width =
      `${rect.width}px`;


    card.style.height =
      `${rect.height}px`;


    card.style.left =
      `${rect.left}px`;


    card.style.top =
      `${rect.top}px`;


    card.style.margin =
      '0';


    card.style.zIndex =
      '10000';


    card.style.pointerEvents =
      'none';


    card.style.transform =
      'none';


    card.style.transformOrigin =
      'top left';


    // ----------------------------------------------------------
    // Save state
    // ----------------------------------------------------------

    dragState.placeholder =
      placeholder;


    dragState.started =
      true;


    clearDropIndicators();

  }


  // ============================================================
  // MOVE FLOATING CARD
  // ============================================================

  function moveFloatingCard(
    clientX,
    clientY
  ) {

    if (
      !dragState ||
      !dragState.card ||
      !dragState.started
    ) {

      return;

    }


    const card =
      dragState.card;


    const left =
      clientX -
      dragState.grabOffsetX;


    const top =
      clientY -
      dragState.grabOffsetY;


    card.style.left =
      `${left}px`;


    card.style.top =
      `${top}px`;

  }


  // ============================================================
  // FIND DROP TARGET
  // ============================================================

  function getDropTarget(
    clientX,
    clientY
  ) {

    if (!dragState) {
      return null;
    }


    const draggedCard =
      dragState.card;


    const cards =
      Array.from(
        grid.querySelectorAll(
          '.page-card-manage'
        )
      ).filter(
        card => {

          if (
            card ===
            draggedCard
          ) {

            return false;

          }


          if (
            card.classList.contains(
              'is-deleted'
            )
          ) {

            return false;

          }


          return true;

        }
      );


    // ----------------------------------------------------------
    // Direct hit
    // ----------------------------------------------------------

    for (
      const card of cards
    ) {

      const rect =
        card.getBoundingClientRect();


      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {

        return {
          card,
          rect
        };

      }

    }


    // ----------------------------------------------------------
    // Nearest card
    // ----------------------------------------------------------

    let nearest =
      null;

    let nearestDistance =
      Infinity;


    cards.forEach(
      card => {

        const rect =
          card.getBoundingClientRect();


        const centerX =
          rect.left +
          rect.width / 2;


        const centerY =
          rect.top +
          rect.height / 2;


        const distance =
          Math.hypot(
            clientX -
              centerX,
            clientY -
              centerY
          );


        if (
          distance <
          nearestDistance
        ) {

          nearestDistance =
            distance;


          nearest = {
            card,
            rect
          };

        }

      }
    );


    return nearest;

  }


  // ============================================================
  // UPDATE DROP POSITION
  // ============================================================

  function updateDropPosition(
    clientX,
    clientY
  ) {

    if (
      !dragState ||
      !dragState.placeholder
    ) {

      return;

    }


    const target =
      getDropTarget(
        clientX,
        clientY
      );


    if (!target) {

      clearDropIndicators();

      return;

    }


    const {
      card,
      rect
    } = target;


    const placeholder =
      dragState.placeholder;


    clearDropIndicators();


    const centerX =
      rect.left +
      rect.width / 2;


    const centerY =
      rect.top +
      rect.height / 2;


    const dx =
      Math.abs(
        clientX -
        centerX
      );


    const dy =
      Math.abs(
        clientY -
        centerY
      );


    let insertBefore;


    if (
      dx >
      dy
    ) {

      insertBefore =
        clientX <
        centerX;

    } else {

      insertBefore =
        clientY <
        centerY;

    }


    // ----------------------------------------------------------
    // Placeholder
    // ----------------------------------------------------------

    if (
      insertBefore
    ) {

      grid.insertBefore(
        placeholder,
        card
      );


      card.classList.add(
        'is-drop-before-target'
      );


      placeholder.dataset.position =
        'before';

    } else {

      grid.insertBefore(
        placeholder,
        card.nextSibling
      );


      card.classList.add(
        'is-drop-after-target'
      );


      placeholder.dataset.position =
        'after';

    }

  }


  // ============================================================
  // CLEAR DROP INDICATORS
  // ============================================================

  function clearDropIndicators() {

    grid
      .querySelectorAll(
        '.is-drop-before-target, .is-drop-after-target'
      )
      .forEach(
        card => {

          card.classList.remove(
            'is-drop-before-target',
            'is-drop-after-target'
          );

        }
      );

  }


  // ============================================================
  // CLEANUP DRAG STATE
  // ============================================================

  function cleanupDragState() {

    if (!dragState) {
      return;
    }


    const state =
      dragState;


    const card =
      state.card;


    const placeholder =
      state.placeholder;


    if (
      placeholder &&
      placeholder.isConnected
    ) {

      placeholder.remove();

    }


    if (
      card &&
      card.isConnected &&
      card.parentNode !==
        grid
    ) {

      card.remove();

    }


    resetDragStyles(
      card
    );


    clearDropIndicators();


    dragState =
      null;

  }


  // ============================================================
  // FINISH DRAG
  // ============================================================

  function finishDrag() {

    if (!dragState) {
      return;
    }


    const state =
      dragState;


    const card =
      state.card;


    const placeholder =
      state.placeholder;


    const item =
      state.item;


    // ----------------------------------------------------------
    // Not a real drag
    // ----------------------------------------------------------

    if (
      !state.started ||
      !state.moved
    ) {

      if (
        placeholder &&
        placeholder.isConnected
      ) {

        placeholder.remove();

      }


      resetDragStyles(
        card
      );


      dragState =
        null;


      return;

    }


    // ----------------------------------------------------------
    // Read final order
    // ----------------------------------------------------------

    const children =
      Array.from(
        grid.children
      );


    const finalOrder =
      [];


    children.forEach(
      child => {

        if (
          child ===
          placeholder
        ) {

          finalOrder.push(
            item.origIndex
          );


          return;

        }


        if (
          child.matches(
            '.page-card-manage'
          )
        ) {

          const index =
            Number(
              child.dataset.idx
            );


          if (
            Number.isInteger(
              index
            )
          ) {

            finalOrder.push(
              index
            );

          }

        }

      }
    );


    // ----------------------------------------------------------
    // Safety
    // ----------------------------------------------------------

    if (
      !finalOrder.includes(
        item.origIndex
      )
    ) {

      finalOrder.push(
        item.origIndex
      );

    }


    // ----------------------------------------------------------
    // Apply order
    // ----------------------------------------------------------

    applyFinalOrder(
      finalOrder
    );


    // ----------------------------------------------------------
    // Clean floating UI
    // ----------------------------------------------------------

    if (
      placeholder &&
      placeholder.isConnected
    ) {

      placeholder.remove();

    }


    if (
      card &&
      card.isConnected &&
      card.parentNode !==
        grid
    ) {

      card.remove();

    }


    suppressClickUntil =
      Date.now() +
      300;


    resetDragStyles(
      card
    );


    clearDropIndicators();


    dragState =
      null;


    renderGrid();

    updateCounts();

  }


  // ============================================================
  // CANCEL DRAG
  // ============================================================

  function cancelDrag() {

    if (!dragState) {
      return;
    }


    const state =
      dragState;


    const card =
      state.card;


    const placeholder =
      state.placeholder;


    if (
      placeholder &&
      placeholder.isConnected
    ) {

      placeholder.remove();

    }


    if (
      card &&
      card.isConnected &&
      card.parentNode !==
        grid
    ) {

      card.remove();

    }


    suppressClickUntil =
      Date.now() +
      300;


    resetDragStyles(
      card
    );


    clearDropIndicators();


    dragState =
      null;


    renderGrid();

    updateCounts();

  }


  // ============================================================
  // RESET DRAG STYLES
  // ============================================================

  function resetDragStyles(
    card
  ) {

    if (!card) {
      return;
    }


    card.classList.remove(
      'is-dragging',
      'is-drag-ready',
      'is-drop-before-target',
      'is-drop-after-target'
    );


    card.style.position =
      '';

    card.style.width =
      '';

    card.style.height =
      '';

    card.style.left =
      '';

    card.style.top =
      '';

    card.style.margin =
      '';

    card.style.zIndex =
      '';

    card.style.pointerEvents =
      '';

    card.style.transform =
      '';

    card.style.transformOrigin =
      '';

  }


  // ============================================================
  // APPLY FINAL ORDER
  // ============================================================

  function applyFinalOrder(
    order
  ) {

    if (
      !Array.isArray(order) ||
      !order.length
    ) {

      return;

    }


    const byIndex =
      new Map(
        pageItems.map(
          item => [
            item.origIndex,
            item
          ]
        )
      );


    const used =
      new Set();


    const reordered =
      [];


    order.forEach(
      index => {

        const item =
          byIndex.get(
            index
          );


        if (
          item &&
          !used.has(
            index
          )
        ) {

          used.add(
            index
          );


          reordered.push(
            item
          );

        }

      }
    );


    pageItems.forEach(
      item => {

        if (
          !used.has(
            item.origIndex
          )
        ) {

          reordered.push(
            item
          );

        }

      }
    );


    pageItems =
      reordered;

  }


  // ============================================================
  // SELECT ALL
  // ============================================================

  if (
    selectAllEl
  ) {

    selectAllEl.addEventListener(
      'change',
      () => {

        const checked =
          selectAllEl.checked;


        pageItems.forEach(
          item => {

            if (
              item.deleted
            ) {

              item.selected =
                false;

            } else {

              item.selected =
                checked;

            }

          }
        );


        renderGrid();

        updateCounts();

      }
    );

  }


  // ============================================================
  // BUILD PDF
  // ============================================================

  async function buildPdf(
    indices
  ) {

    if (!currentFile) {

      throw new Error(
        t(
          'pdf.pageNotFound'
        )
      );

    }


    if (
      !indices.length
    ) {

      throw new Error(
        t(
          'pdf.noPages'
        )
      );

    }


    const srcBytes =
      await U.readAsArrayBuffer(
        currentFile
      );


    const response =
      await PW.buildPagesPdf(
        srcBytes,
        indices
      );


    if (
      !response ||
      !response.bytes
    ) {

      throw new Error(
        t(
          'pdf.workerFailed'
        )
      );

    }


    return new Blob(
      [
        response.bytes
      ],
      {
        type:
          'application/pdf'
      }
    );

  }


  // ============================================================
  // DOWNLOAD EDITED PDF
  // ============================================================

  if (
    downloadBtn
  ) {

    downloadBtn.addEventListener(
      'click',
      async () => {

        if (
          downloadRunning ||
          !currentFile
        ) {

          return;

        }


        const indices =
          getVisibleItems()
            .map(
              item =>
                item.origIndex
            );


        if (
          !indices.length
        ) {

          alert(
            t(
              'pdf.pageNotFound'
            )
          );


          return;

        }


        downloadRunning =
          true;


        downloadBtn.disabled =
          true;


        downloadBtn.textContent =
          getBuildingPdfText();


        setToolProcessing(
          true
        );


        try {

          const blob =
            await buildPdf(
              indices
            );


          U.downloadBlob(
            blob,
            `${U.baseName(
              currentFile.name
            )}-edited.pdf`
          );


        } catch (error) {

          console.error(
            'Build PDF error:',
            error
          );


          alert(
            t(
              'pdf.buildFailed',
              {
                message:
                  error?.message ||
                  t(
                    'errors.somethingWentWrong'
                  )
              }
            )
          );


        } finally {

          downloadRunning =
            false;


          downloadBtn.disabled =
            false;


          downloadBtn.textContent =
            t(
              'pdf.downloadPdfOrdered'
            );


          setToolProcessing(
            false
          );

        }

      }
    );

  }


  // ============================================================
  // DOWNLOAD SELECTED
  // ============================================================

  if (
    downloadSelectedBtn
  ) {

    downloadSelectedBtn.addEventListener(
      'click',
      async () => {

        if (
          downloadRunning ||
          !currentFile
        ) {

          return;

        }


        const indices =
          getSelectedItems()
            .map(
              item =>
                item.origIndex
            );


        if (
          !indices.length
        ) {

          alert(
            t(
              'pdf.selectPageRequired'
            )
          );


          return;

        }


        downloadRunning =
          true;


        downloadSelectedBtn.disabled =
          true;


        downloadSelectedBtn.textContent =
          getBuildingPdfText();


        setToolProcessing(
          true
        );


        try {

          const blob =
            await buildPdf(
              indices
            );


          U.downloadBlob(
            blob,
            `${U.baseName(
              currentFile.name
            )}-selected.pdf`
          );


        } catch (error) {

          console.error(
            'Build selected PDF error:',
            error
          );


          alert(
            t(
              'pdf.buildFailed',
              {
                message:
                  error?.message ||
                  t(
                    'errors.somethingWentWrong'
                  )
              }
            )
          );


        } finally {

          downloadRunning =
            false;


          downloadSelectedBtn.disabled =
            false;


          downloadSelectedBtn.textContent =
            t(
              'pdf.downloadSelected'
            );


          setToolProcessing(
            false
          );

        }

      }
    );

  }


  // ============================================================
  // DROPZONE
  // ============================================================

  U.setupDropzone(
    dropzone,
    fileInput,
    files => {

      const file =
        Array.from(
          files || []
        ).find(
          item =>
            item.type ===
              'application/pdf' ||
            /\.pdf$/i.test(
              item.name
            )
        );


      if (file) {

        loadFile(
          file
        );

      }

    }
  );


  // ============================================================
  // LANGUAGE CHANGE
  // ============================================================

  document.addEventListener(
    'languagechange',
    () => {

      updateLanguageUI();

    }
  );


  // ============================================================
  // CLEANUP
  // ============================================================

  U.onClearCache(
    () => {

      ++loadSeq;


      if (observer) {

        observer.disconnect();

        observer =
          null;

      }


      if (dragState) {

        cleanupDragState();

      }


      suppressClickUntil =
        0;


      resetQueue();

      revokeThumbs();

      pageItems =
        [];


      destroyCurrentDoc()
        .catch(
          err => {

            console.warn(
              'PDF cleanup warning:',
              err
            );

          }
        );


      currentFile =
        null;


      downloadRunning =
        false;


      if (downloadBtn) {

        downloadBtn.disabled =
          false;


        downloadBtn.textContent =
          t(
            'pdf.downloadPdfOrdered'
          );

      }


      if (
        downloadSelectedBtn
      ) {

        downloadSelectedBtn.disabled =
          false;


        downloadSelectedBtn.textContent =
          t(
            'pdf.downloadSelected'
          );

      }


      grid.innerHTML =
        '';


      bulkbar.classList.add(
        'hidden'
      );


      if (noteEl) {

        noteEl.classList.add(
          'hidden'
        );

      }


      if (countEl) {

        countEl.textContent =
          '0';

      }


      if (selectAllEl) {

        selectAllEl.checked =
          false;


        selectAllEl.indeterminate =
          false;

      }


      setToolProcessing(
        false
      );

    }
  );


  // ============================================================
  // INITIAL UI
  // ============================================================

  updateLanguageUI();

})();
