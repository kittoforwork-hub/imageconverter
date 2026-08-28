(() => {
  'use strict';

  const U = window.Utils;
  const PW = window.PdfWorkerClient;

  // ============================================================
  // ELEMENTS
  // ============================================================

  const dropzone =
    document.getElementById('dz-pdf-pages');

  const fileInput =
    document.getElementById('input-pdf-pages');

  const bulkbar =
    document.getElementById('bulk-pdf-pages');

  const nameEl =
    bulkbar?.querySelector('.js-pdfname');

  const countEl =
    document.getElementById('count-pdf-pages');

  const selectAllEl =
    document.getElementById('selectAll-pdf-pages');

  const downloadBtn =
    document.getElementById('download-pdf-pages');

  const downloadSelectedBtn =
    document.getElementById(
      'downloadSelected-pdf-pages'
    );

  const noteEl =
    document.getElementById('note-pdf-pages');

  const grid =
    document.getElementById('grid-pdf-pages');

  const cardTemplate =
    document.getElementById('tpl-page-manage');


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

  const THUMB_TARGET_WIDTH = 420;
  const THUMB_MAX_DIMENSION = 1800;
  const LARGE_FILE_WARN_MB = 50;

  // render thumbnail ทีละหน้า
  const MAX_RENDER_QUEUE = 1;

  // ต้องลากเกินระยะนี้ก่อนจึงเริ่ม reorder
  const DRAG_START_DISTANCE = 6;


  // ============================================================
  // STATE
  // ============================================================

  let currentFile = null;
  let currentDoc = null;

  let loadSeq = 0;

  let pageItems = [];

  let observer = null;

  let renderQueue = [];
  let queueRunning = false;

  let downloadRunning = false;

  let dragState = null;


  // ============================================================
  // PANEL STATE
  // ============================================================

  function setToolProcessing(on) {
    const panel =
      document.getElementById(
        'panel-pdf-pages'
      );

    if (!panel) {
      return;
    }

    panel.dataset.processing =
      on ? 'true' : 'false';
  }


  // ============================================================
  // PAGE HELPERS
  // ============================================================

  function getVisibleItems() {
    return pageItems.filter(
      item => !item.deleted
    );
  }


  function getSelectedItems() {
    return pageItems.filter(
      item =>
        item.selected &&
        !item.deleted
    );
  }


  function getPagePosition(item) {
    return pageItems.indexOf(item);
  }


  function updateCounts() {
    const visible =
      getVisibleItems().length;

    const selected =
      getSelectedItems().length;

    if (countEl) {
      countEl.textContent =
        String(visible);
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
    pageItems.forEach(item => {
      if (!item.thumbUrl) {
        return;
      }

      try {
        URL.revokeObjectURL(
          item.thumbUrl
        );
      } catch (_) {}

      item.thumbUrl = null;
    });
  }


  // ============================================================
  // QUEUE CLEANUP
  // ============================================================

  function resetQueue() {
    renderQueue.length = 0;
    queueRunning = false;

    pageItems.forEach(item => {
      item.rendering = false;
    });
  }


  // ============================================================
  // PDF CLEANUP
  // ============================================================

  async function destroyCurrentDoc() {
    if (!currentDoc) {
      return;
    }

    const doc = currentDoc;
    currentDoc = null;

    try {
      await doc.destroy();
    } catch (err) {
      console.warn(
        'PDF destroy warning:',
        err
      );
    }
  }


  // ============================================================
  // LOAD PDF
  // ============================================================

  async function loadFile(file) {
    if (!file) {
      return;
    }

    const requestId =
      ++loadSeq;


    const validPdf =
      file.type === 'application/pdf' ||
      /\.pdf$/i.test(file.name);


    if (!validPdf) {
      alert(
        'กรุณาเลือกไฟล์ PDF เท่านั้น'
      );
      return;
    }


    if (
      !U.confirmLargeFile(
        file,
        LARGE_FILE_WARN_MB,
        'ไฟล์ PDF นี้มีขนาดใหญ่ ทุกอย่างประมวลผลอยู่ในเบราว์เซอร์ (ไม่มีการอัปโหลดขึ้นเซิร์ฟเวอร์) จึงอาจใช้เวลาสักครู่และใช้แรมมากกว่าไฟล์เล็ก'
      )
    ) {
      return;
    }


    try {
      setToolProcessing(true);


      // --------------------------------------------------------
      // cleanup ของเก่า
      // --------------------------------------------------------

      if (observer) {
        observer.disconnect();
        observer = null;
      }

      resetQueue();
      revokeThumbs();

      pageItems = [];

      await destroyCurrentDoc();


      if (requestId !== loadSeq) {
        return;
      }


      // --------------------------------------------------------
      // state
      // --------------------------------------------------------

      currentFile = file;


      if (nameEl) {
        nameEl.textContent =
          `${file.name} · ${U.formatBytes(
            file.size
          )}`;
      }


      grid.innerHTML = '';


      bulkbar.classList.remove(
        'hidden'
      );


      if (noteEl) {
        noteEl.classList.remove(
          'hidden'
        );
      }


      if (countEl) {
        countEl.textContent = '…';
      }


      // --------------------------------------------------------
      // read PDF
      // --------------------------------------------------------

      const bytes =
        await U.readAsArrayBuffer(
          file
        );


      if (requestId !== loadSeq) {
        return;
      }


      // --------------------------------------------------------
      // open with PDF.js
      // --------------------------------------------------------

      const loadingTask =
        pdfjsLib.getDocument({
          data: bytes,
          canvasFactory:
            window.KittoCanvasFactory
        });


      const doc =
        await loadingTask.promise;


      if (requestId !== loadSeq) {
        try {
          await doc.destroy();
        } catch (_) {}

        return;
      }


      currentDoc = doc;


      // --------------------------------------------------------
      // build page state
      // --------------------------------------------------------

      for (
        let i = 0;
        i < doc.numPages;
        i++
      ) {
        pageItems.push({
          origIndex: i,
          thumbUrl: null,
          rendering: false,
          deleted: false,
          selected: false
        });
      }


      updateCounts();
      renderGrid();

    } catch (error) {

      if (requestId !== loadSeq) {
        return;
      }


      console.error(
        'PDF load error:',
        error
      );


      await destroyCurrentDoc();


      currentFile = null;
      pageItems = [];


      grid.innerHTML = '';


      bulkbar.classList.add(
        'hidden'
      );


      if (noteEl) {
        noteEl.classList.add(
          'hidden'
        );
      }


      alert(
        'ไม่สามารถเปิดไฟล์ PDF ได้\n\n' +
        (
          error?.message ||
          'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
        )
      );

    } finally {

      if (requestId === loadSeq) {
        setToolProcessing(false);
      }
    }
  }


  // ============================================================
  // RENDER THUMBNAIL
  // ============================================================

  async function renderThumbnail(origIndex) {
    if (!currentDoc) {
      return;
    }


    const item =
      pageItems.find(
        entry =>
          entry.origIndex ===
          origIndex
      );


    if (!item) {
      return;
    }


    if (
      item.deleted ||
      item.thumbUrl ||
      item.rendering
    ) {
      return;
    }


    item.rendering = true;


    let page = null;
    let canvas = null;
    let context = null;
    let renderTask = null;


    try {
      page =
        await currentDoc.getPage(
          origIndex + 1
        );


      const baseViewport =
        page.getViewport({
          scale: 1
        });


      if (
        !baseViewport.width ||
        !baseViewport.height
      ) {
        throw new Error(
          'Invalid PDF page dimensions'
        );
      }


      // --------------------------------------------------------
      // scale
      // --------------------------------------------------------

      let scale =
        THUMB_TARGET_WIDTH /
        baseViewport.width;


      let width =
        baseViewport.width *
        scale;

      let height =
        baseViewport.height *
        scale;


      const maxDimension =
        Math.max(
          width,
          height
        );


      if (
        maxDimension >
        THUMB_MAX_DIMENSION
      ) {
        scale *=
          THUMB_MAX_DIMENSION /
          maxDimension;
      }


      const viewport =
        page.getViewport({
          scale
        });


      // --------------------------------------------------------
      // canvas
      // --------------------------------------------------------

      const factory =
        window.KittoCanvasFactory;


      const canvasInfo =
        factory
          ? factory.create(
              viewport.width,
              viewport.height
            )
          : (() => {

              const fallbackCanvas =
                document.createElement(
                  'canvas'
                );


              fallbackCanvas.width =
                Math.ceil(
                  viewport.width
                );

              fallbackCanvas.height =
                Math.ceil(
                  viewport.height
                );


              const fallbackContext =
                fallbackCanvas.getContext(
                  '2d'
                );


              if (!fallbackContext) {
                throw new Error(
                  'ไม่สามารถสร้าง canvas ได้'
                );
              }


              return {
                canvas:
                  fallbackCanvas,
                context:
                  fallbackContext
              };

            })();


      canvas =
        canvasInfo.canvas;

      context =
        canvasInfo.context;


      // --------------------------------------------------------
      // white background
      // --------------------------------------------------------

      context.save();

      context.fillStyle =
        '#FFFFFF';

      context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      context.restore();


      // --------------------------------------------------------
      // render
      // --------------------------------------------------------

      renderTask =
        page.render({
          canvasContext:
            context,
          viewport,
          canvasFactory:
            window.KittoCanvasFactory,
          intent:
            'display'
        });


      await renderTask.promise;


      // --------------------------------------------------------
      // JPEG thumbnail
      // --------------------------------------------------------

      const blob =
        await new Promise(
          (resolve, reject) => {

            canvas.toBlob(
              result => {

                if (result) {
                  resolve(
                    result
                  );
                } else {
                  reject(
                    new Error(
                      'ไม่สามารถสร้าง thumbnail ได้'
                    )
                  );
                }

              },
              'image/jpeg',
              0.78
            );

          }
        );


      // --------------------------------------------------------
      // stale / deleted check
      // --------------------------------------------------------

      if (
        !currentDoc ||
        item.deleted
      ) {
        return;
      }


      item.thumbUrl =
        URL.createObjectURL(
          blob
        );


      updateCardThumbnail(
        item
      );

    } catch (error) {

      console.error(
        `Thumbnail render failed: page ${origIndex + 1}`,
        error
      );


      const card =
        grid.querySelector(
          `.page-card-manage[data-idx="${origIndex}"]`
        );


      if (card) {
        card.classList.add(
          'is-thumb-error'
        );
      }

    } finally {

      item.rendering =
        false;


      if (page) {
        try {
          page.cleanup();
        } catch (_) {}
      }


      if (canvas) {
        try {
          canvas.width = 1;
          canvas.height = 1;
        } catch (_) {}
      }


      canvas = null;
      context = null;
      renderTask = null;
    }
  }


  // ============================================================
  // UPDATE THUMBNAIL IN CARD
  // ============================================================

  function updateCardThumbnail(item) {
    const card =
      grid.querySelector(
        `.page-card-manage[data-idx="${item.origIndex}"]`
      );


    if (!card) {
      return;
    }


    card.classList.remove(
      'is-pending',
      'is-thumb-error'
    );


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
        `หน้า ${getPagePosition(item) + 1}`;
    }
  }


  // ============================================================
  // QUEUE
  // ============================================================

  function queueRender(origIndex) {
    if (!currentDoc) {
      return;
    }


    const item =
      pageItems.find(
        entry =>
          entry.origIndex ===
          origIndex
      );


    if (!item) {
      return;
    }


    if (
      item.deleted ||
      item.thumbUrl ||
      item.rendering
    ) {
      return;
    }


    if (
      renderQueue.includes(
        origIndex
      )
    ) {
      return;
    }


    if (
      renderQueue.length >
      100
    ) {
      return;
    }


    renderQueue.push(
      origIndex
    );


    processQueue();
  }


  async function processQueue() {
    if (queueRunning) {
      return;
    }


    queueRunning =
      true;


    try {

      while (
        renderQueue.length > 0
      ) {

        const origIndex =
          renderQueue.shift();


        if (
          origIndex == null
        ) {
          continue;
        }


        await renderThumbnail(
          origIndex
        );


        await U.yieldToUI();
      }

    } finally {

      queueRunning =
        false;


      if (
        renderQueue.length > 0
      ) {
        processQueue();
      }
    }
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


              const idx =
                Number(
                  entry.target.dataset.idx
                );


              queueRender(
                idx
              );
            }
          );


          processQueue();

        },
        {
          root: null,

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
      !item.thumbUrl
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


    grid.innerHTML = '';


    pageItems.forEach(
      (item, position) => {

        const card =
          cardTemplate.content
            .firstElementChild
            .cloneNode(true);


        card.dataset.idx =
          String(
            item.origIndex
          );


        updateCardState(
          card,
          item
        );


        // ------------------------------------------------------
        // thumbnail
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
            `หน้า ${position + 1}`;
        }


        // ------------------------------------------------------
        // page label
        // ------------------------------------------------------

        const label =
          card.querySelector(
            '.js-pagelabel'
          );


        if (label) {
          label.textContent =
            `หน้า ${position + 1}`;
        }


        // ------------------------------------------------------
        // checkbox
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
        // card click = select
        // ------------------------------------------------------

        card.addEventListener(
          'click',
          event => {

            if (
              dragState &&
              dragState.moved
            ) {
              return;
            }


            if (
              event.target.closest(
                'button, input, a'
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


            if (checkbox) {
              checkbox.checked =
                item.selected;
            }


            updateCounts();
          }
        );


        // ------------------------------------------------------
        // move up
        // ------------------------------------------------------

        const upBtn =
          card.querySelector(
            '.js-move-up'
          );


        if (upBtn) {

          upBtn.disabled =
            position === 0;


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
        // move down
        // ------------------------------------------------------

        const downBtn =
          card.querySelector(
            '.js-move-down'
          );


        if (downBtn) {

          downBtn.disabled =
            position ===
            pageItems.length - 1;


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
        // delete / restore
        // ------------------------------------------------------

        const deleteBtn =
          card.querySelector(
            '.js-delete'
          );


        if (deleteBtn) {

          deleteBtn.title =
            item.deleted
              ? 'กู้คืนหน้านี้'
              : 'ลบหน้านี้';


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
        // drag reorder
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


    updateCounts();


    setupObserver();


    // --------------------------------------------------------
    // preload 2 หน้าแรก
    // --------------------------------------------------------

    let queued =
      0;


    for (
      let i = 0;
      i < pageItems.length &&
      queued < 2;
      i++
    ) {

      const item =
        pageItems[i];


      if (
        !item.deleted &&
        !item.thumbUrl
      ) {

        queueRender(
          item.origIndex
        );

        queued++;
      }
    }


    processQueue();
  }


  // ============================================================
  // DRAG REORDER
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


    let pointerId =
      null;

    let startX =
      0;

    let startY =
      0;

    let moved =
      false;


    card.addEventListener(
      'pointerdown',
      event => {

        if (
          event.button !== 0 ||
          item.deleted
        ) {
          return;
        }


        if (
          event.target.closest(
            'button, input, a'
          )
        ) {
          return;
        }


        pointerId =
          event.pointerId;


        startX =
          event.clientX;

        startY =
          event.clientY;


        moved =
          false;


        dragState = {
          card,
          item,
          moved: false
        };


        card.classList.add(
          'is-drag-ready'
        );


        try {
          card.setPointerCapture(
            pointerId
          );
        } catch (_) {}

      }
    );


    card.addEventListener(
      'pointermove',
      event => {

        if (
          pointerId === null ||
          event.pointerId !==
            pointerId
        ) {
          return;
        }


        const dx =
          event.clientX -
          startX;


        const dy =
          event.clientY -
          startY;


        if (
          !moved &&
          Math.hypot(
            dx,
            dy
          ) <
          DRAG_START_DISTANCE
        ) {
          return;
        }


        if (!moved) {

          moved =
            true;


          if (dragState) {
            dragState.moved =
              true;
          }


          card.classList.remove(
            'is-drag-ready'
          );


          card.classList.add(
            'is-dragging'
          );
        }


        const target =
          findDropTarget(
            event.clientX,
            event.clientY,
            card
          );


        if (!target) {
          return;
        }


        moveItemRelativeToTarget(
          item,
          target,
          event.clientY
        );

      }
    );


    const finishDrag =
      () => {

        if (
          pointerId === null
        ) {
          return;
        }


        try {
          card.releasePointerCapture(
            pointerId
          );
        } catch (_) {}


        pointerId =
          null;


        card.classList.remove(
          'is-drag-ready',
          'is-dragging'
        );


        if (!moved) {
          dragState = null;
          return;
        }


        dragState = null;


        renderGrid();
        updateCounts();
      };


    card.addEventListener(
      'pointerup',
      finishDrag
    );


    card.addEventListener(
      'pointercancel',
      finishDrag
    );
  }


  // ============================================================
  // FIND DROP TARGET
  // ============================================================

  function findDropTarget(
    clientX,
    clientY,
    draggedCard
  ) {
    const cards =
      Array.from(
        grid.querySelectorAll(
          '.page-card-manage'
        )
      );


    let target =
      null;


    let bestDistance =
      Infinity;


    cards.forEach(
      card => {

        if (
          card === draggedCard ||
          card.classList.contains(
            'is-deleted'
          )
        ) {
          return;
        }


        const rect =
          card.getBoundingClientRect();


        /*
         * ใช้ระยะขยายเล็กน้อย
         * ให้ลากง่ายขึ้น
         */
        const padding =
          16;


        const inside =
          clientX >=
            rect.left - padding &&
          clientX <=
            rect.right + padding &&
          clientY >=
            rect.top - padding &&
          clientY <=
            rect.bottom + padding;


        if (!inside) {
          return;
        }


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
          bestDistance
        ) {
          bestDistance =
            distance;

          target =
            card;
        }

      }
    );


    return target;
  }


  // ============================================================
  // MOVE ITEM RELATIVE TO TARGET
  // ============================================================

  function moveItemRelativeToTarget(
    draggedItem,
    targetCard,
    clientY
  ) {
    const targetOrigIndex =
      Number(
        targetCard.dataset.idx
      );


    const fromIndex =
      pageItems.indexOf(
        draggedItem
      );


    const targetIndex =
      pageItems.findIndex(
        item =>
          item.origIndex ===
          targetOrigIndex
      );


    if (
      fromIndex < 0 ||
      targetIndex < 0 ||
      fromIndex === targetIndex
    ) {
      return;
    }


    const targetRect =
      targetCard.getBoundingClientRect();


    const targetCenterY =
      targetRect.top +
      targetRect.height / 2;


    /*
     * ถ้า pointer อยู่ครึ่งบน:
     * วางก่อน target
     *
     * ถ้าอยู่ครึ่งล่าง:
     * วางหลัง target
     */
    let insertIndex =
      clientY <
      targetCenterY
        ? targetIndex
        : targetIndex + 1;


    /*
     * ลบ item ออกจากตำแหน่งเดิมก่อน
     * แล้วค่อยคำนวณตำแหน่งใหม่
     */
    pageItems.splice(
      fromIndex,
      1
    );


    if (
      fromIndex <
      insertIndex
    ) {
      insertIndex--;
    }


    insertIndex =
      Math.max(
        0,
        Math.min(
          pageItems.length,
          insertIndex
        )
      );


    /*
     * ถ้ายังอยู่ตำแหน่งเดิม
     * ไม่ต้องทำอะไร
     */
    if (
      pageItems.indexOf(
        draggedItem
      ) === insertIndex
    ) {
      pageItems.splice(
        fromIndex,
        0,
        draggedItem
      );

      return;
    }


    pageItems.splice(
      insertIndex,
      0,
      draggedItem
    );


    updateDragPreview();
  }


  // ============================================================
  // UPDATE DOM PREVIEW
  // ============================================================

  function updateDragPreview() {
    const cards =
      Array.from(
        grid.querySelectorAll(
          '.page-card-manage'
        )
      );


    const cardByIndex =
      new Map();


    cards.forEach(card => {
      cardByIndex.set(
        Number(
          card.dataset.idx
        ),
        card
      );
    });


    /*
     * เอา card ทั้งหมดออกก่อน
     */
    const fragment =
      document.createDocumentFragment();


    pageItems.forEach(item => {

      const card =
        cardByIndex.get(
          item.origIndex
        );


      if (card) {
        fragment.appendChild(
          card
        );
      }

    });


    grid.appendChild(
      fragment
    );


    /*
     * อัปเดตเลขหน้าตามลำดับใหม่
     */
    pageItems.forEach(
      (item, index) => {

        const card =
          cardByIndex.get(
            item.origIndex
          );


        if (!card) {
          return;
        }


        const label =
          card.querySelector(
            '.js-pagelabel'
          );


        if (label) {
          label.textContent =
            `หน้า ${index + 1}`;
        }


        const img =
          card.querySelector(
            'img'
          );


        if (
          img &&
          item.thumbUrl
        ) {
          img.alt =
            `หน้า ${index + 1}`;
        }

      }
    );
  }


  // ============================================================
  // SIMPLE MOVE BUTTON
  // ============================================================

  function moveItem(
    index,
    direction
  ) {
    const target =
      index + direction;


    if (
      index < 0 ||
      index >= pageItems.length ||
      target < 0 ||
      target >= pageItems.length
    ) {
      return;
    }


    const temp =
      pageItems[index];


    pageItems[index] =
      pageItems[target];

    pageItems[target] =
      temp;


    renderGrid();
    updateCounts();
  }


  // ============================================================
  // SELECT ALL
  // ============================================================

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


  // ============================================================
  // BUILD PDF
  // ============================================================

  async function buildPdf(
    indices
  ) {
    if (!currentFile) {
      throw new Error(
        'ยังไม่ได้เลือกไฟล์ PDF'
      );
    }


    if (
      !indices.length
    ) {
      throw new Error(
        'ไม่พบหน้าสำหรับสร้าง PDF'
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
        'ไม่ได้รับ PDF จาก Worker'
      );
    }


    return new Blob(
      [response.bytes],
      {
        type:
          'application/pdf'
      }
    );
  }


  // ============================================================
  // DOWNLOAD EDITED PDF
  // ============================================================

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


      if (!indices.length) {
        alert(
          'ไม่เหลือหน้าใน PDF'
        );

        return;
      }


      downloadRunning =
        true;


      downloadBtn.disabled =
        true;


      downloadBtn.textContent =
        'กำลังสร้าง PDF…';


      setToolProcessing(true);


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
          'ไม่สามารถสร้าง PDF ได้\n\n' +
          (
            error?.message ||
            'เกิดข้อผิดพลาด'
          )
        );


      } finally {

        downloadRunning =
          false;


        downloadBtn.disabled =
          false;


        downloadBtn.textContent =
          'ดาวน์โหลด PDF (ตามลำดับ/ลบแล้ว)';


        setToolProcessing(
          false
        );
      }
    }
  );


  // ============================================================
  // DOWNLOAD SELECTED
  // ============================================================

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


      if (!indices.length) {
        alert(
          'กรุณาเลือกหน้าอย่างน้อย 1 หน้า'
        );

        return;
      }


      downloadRunning =
        true;


      downloadSelectedBtn.disabled =
        true;


      downloadSelectedBtn.textContent =
        'กำลังสร้าง PDF…';


      setToolProcessing(true);


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
          'ไม่สามารถสร้าง PDF ได้\n\n' +
          (
            error?.message ||
            'เกิดข้อผิดพลาด'
          )
        );


      } finally {

        downloadRunning =
          false;


        downloadSelectedBtn.disabled =
          false;


        downloadSelectedBtn.textContent =
          'ดาวน์โหลดเฉพาะที่เลือก';


        setToolProcessing(
          false
        );
      }
    }
  );


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
        loadFile(file);
      }
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
        observer = null;
      }


      resetQueue();
      revokeThumbs();


      pageItems = [];


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


      dragState =
        null;


      downloadRunning =
        false;


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

})();
