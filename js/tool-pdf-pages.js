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
  // TOOL STATE
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

        item.thumbUrl = null;
      }
    );
  }


  // ============================================================
  // RENDER QUEUE
  // ============================================================

  function resetQueue() {
    renderQueue.length = 0;
    queueRunning = false;

    pageItems.forEach(
      item => {
        item.rendering = false;
      }
    );
  }


  // ============================================================
  // PDF DOCUMENT CLEANUP
  // ============================================================

  async function destroyCurrentDoc() {
    if (!currentDoc) {
      return;
    }

    const doc =
      currentDoc;

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
  // LOAD FILE
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


      currentFile =
        file;


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
        countEl.textContent =
          '…';
      }


      const bytes =
        await U.readAsArrayBuffer(
          file
        );


      if (requestId !== loadSeq) {
        return;
      }


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


      currentDoc =
        doc;


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

      if (
        requestId === loadSeq
      ) {
        setToolProcessing(false);
      }
    }
  }


  // ============================================================
  // RENDER THUMBNAIL
  // ============================================================

  async function renderThumbnail(
    origIndex
  ) {
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


    item.rendering =
      true;


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


      const blob =
        await new Promise(
          (
            resolve,
            reject
          ) => {

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
  // UPDATE THUMBNAIL
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
    }
  }


  // ============================================================
  // RENDER QUEUE
  // ============================================================

  function queueRender(
    origIndex
  ) {
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
      renderQueue.length > 100
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
        renderQueue.length
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
        renderQueue.length
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
        // label
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
        // click card = select
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


        // ============================================================
// DRAG SYSTEM — FULL CARD
//
// ลากได้จากทุกพื้นที่ของการ์ด
// การ์ดจะลอยตามเมาส์ตรงตำแหน่งที่กด
// และมี placeholder แสดงตำแหน่งที่จะวาง
// ============================================================

function setupCardDrag(card, item) {
  if (!card || !item) {
    return;
  }

  let pointerId = null;

  // จุดที่ผู้ใช้กดบนการ์ด
  let grabOffsetX = 0;
  let grabOffsetY = 0;

  let startX = 0;
  let startY = 0;

  let moved = false;


  // ----------------------------------------------------------
  // POINTER DOWN
  // ----------------------------------------------------------

  card.addEventListener(
    'pointerdown',
    event => {
      // รองรับเฉพาะ primary pointer
      if (
        event.isPrimary === false
      ) {
        return;
      }

      // หน้าที่ถูกลบไม่ให้ลาก
      if (
        item.deleted
      ) {
        return;
      }

      /*
       * ปุ่ม / checkbox ไม่ควรเริ่ม drag
       * เพราะผู้ใช้ต้องการกดควบคุมมันโดยตรง
       */
      if (
        event.target.closest(
          'button, input, select, textarea, a'
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


      // --------------------------------------------------------
      // จำจุดที่กดบนการ์ด
      // --------------------------------------------------------

      const rect =
        card.getBoundingClientRect();

      grabOffsetX =
        event.clientX -
        rect.left;

      grabOffsetY =
        event.clientY -
        rect.top;


      dragState = {
        card,
        item,
        pointerId,
        moved: false,
        started: false,
        placeholder: null,
        grabOffsetX,
        grabOffsetY
      };


      /*
       * สำคัญ:
       * setPointerCapture ทำให้แม้เมาส์ออกนอกการ์ด
       * เราก็ยังได้รับ pointermove / pointerup ต่อ
       */
      try {
        card.setPointerCapture(
          pointerId
        );
      } catch (_) {}

    },
    {
      passive: false
    }
  );


  // ----------------------------------------------------------
  // POINTER MOVE
  // ----------------------------------------------------------

  card.addEventListener(
    'pointermove',
    event => {
      if (
        pointerId === null ||
        event.pointerId !== pointerId
      ) {
        return;
      }

      event.preventDefault();


      const dx =
        event.clientX -
        startX;

      const dy =
        event.clientY -
        startY;


      // --------------------------------------------------------
      // ยังไม่เริ่มลาก
      // --------------------------------------------------------

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


      // --------------------------------------------------------
      // START DRAG
      // --------------------------------------------------------

      if (!moved) {
        moved =
          true;

        if (dragState) {
          dragState.moved =
            true;
        }


        startRealDrag(
          card,
          item
        );
      }


      // --------------------------------------------------------
      // MOVE CARD
      // --------------------------------------------------------

      if (
        dragState &&
        dragState.started
      ) {

        moveFloatingCard(
          event.clientX,
          event.clientY
        );

      }


      // --------------------------------------------------------
      // UPDATE PLACEHOLDER
      // --------------------------------------------------------

      updateDropPosition(
        event.clientX,
        event.clientY
      );

    },
    {
      passive: false
    }
  );


  // ----------------------------------------------------------
  // POINTER UP
  // ----------------------------------------------------------

  card.addEventListener(
    'pointerup',
    event => {
      if (
        pointerId !== null &&
        event.pointerId === pointerId
      ) {
        finishDrag();
      }
    },
    {
      passive: false
    }
  );


  // ----------------------------------------------------------
  // POINTER CANCEL
  // ----------------------------------------------------------

  card.addEventListener(
    'pointercancel',
    event => {
      if (
        pointerId !== null &&
        event.pointerId === pointerId
      ) {
        cancelDrag();
      }
    }
  );


  // ----------------------------------------------------------
  // LOST POINTER CAPTURE
  // ----------------------------------------------------------

  card.addEventListener(
    'lostpointercapture',
    () => {
      /*
       * อย่า finishDrag ตรงนี้ทันที
       * เพราะ browser บางตัวสามารถปล่อย capture
       * ระหว่าง interaction แล้วสร้าง pointerup ตามมาได้
       */
    }
  );
}


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


  const rect =
    card.getBoundingClientRect();


  // ----------------------------------------------------------
  // CREATE PLACEHOLDER
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


  /*
   * Placeholder มีขนาดเท่าการ์ดจริง
   */
  placeholder.style.width =
    rect.width + 'px';


  placeholder.style.height =
    rect.height + 'px';


  placeholder.innerHTML = `
    <div class="page-drag-placeholder-inner">
      <span>วางหน้าที่นี่</span>
    </div>
  `;


  // ----------------------------------------------------------
  // PLACEHOLDER อยู่ตำแหน่งเดิม
  // ----------------------------------------------------------

  grid.insertBefore(
    placeholder,
    card
  );


  // ----------------------------------------------------------
  // CARD -> FLOATING
  // ----------------------------------------------------------

  card.classList.add(
    'is-dragging'
  );


  card.style.position =
    'fixed';


  card.style.width =
    rect.width + 'px';


  card.style.height =
    rect.height + 'px';


  card.style.left =
    rect.left + 'px';


  card.style.top =
    rect.top + 'px';


  card.style.zIndex =
    '1000';


  card.style.pointerEvents =
    'none';


  /*
   * สำคัญ:
   * ไม่กำหนด transform ที่นี่
   * เพราะเราจะควบคุม transform เอง
   */


  dragState.placeholder =
    placeholder;

  dragState.started =
    true;

  dragState.originalIndex =
    pageItems.indexOf(
      item
    );


  // ----------------------------------------------------------
  // เริ่มต้น visual
  // ----------------------------------------------------------

  clearDropIndicators();
}


// ============================================================
// MOVE FLOATING CARD
//
// card จะอยู่ตรงเมาส์โดยรักษาจุดที่ผู้ใช้กดไว้
// ============================================================

function moveFloatingCard(
  clientX,
  clientY
) {
  if (
    !dragState ||
    !dragState.card
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


  /*
   * หา card ที่เมาส์อยู่ข้างในก่อน
   */
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


  /*
   * ถ้าไม่ได้อยู่ตรง card พอดี
   * ให้หา card ที่ใกล้ที่สุด
   *
   * ทำให้ลากไปยังช่องว่างระหว่าง card
   * ได้ง่ายขึ้น
   */

  let nearest = null;
  let nearestDistance = Infinity;


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
    return;
  }


  const {
    card,
    rect
  } = target;


  const placeholder =
    dragState.placeholder;


  clearDropIndicators();


  // ----------------------------------------------------------
  // คำนวณตำแหน่ง
  // ----------------------------------------------------------

  const centerX =
    rect.left +
    rect.width / 2;


  const centerY =
    rect.top +
    rect.height / 2;


  /*
   * ใช้แกนที่ pointer อยู่ใกล้ศูนย์กลางมากกว่า
   *
   * สำหรับ grid หลายคอลัมน์:
   * ถ้าเมาส์อยู่ในครึ่งซ้าย/ขวาชัดเจน
   * ให้ใช้ X
   *
   * ถ้าอยู่ใกล้แนวกลางมาก
   * ใช้ Y ประกอบ
   */

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
    dx > dy
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
  // PLACEHOLDER POSITION
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
// FINISH DRAG
// ============================================================

function finishDrag() {

  if (!dragState) {
    return;
  }


  const {
    card,
    placeholder,
    item
  } = dragState;


  /*
   * ปล่อยตอนยังไม่ถึง threshold
   * ถือเป็น click ปกติ
   */
  if (
    !dragState.started ||
    !dragState.moved
  ) {

    resetDragStyles(
      card
    );


    if (
      placeholder &&
      placeholder.isConnected
    ) {
      placeholder.remove();
    }


    try {
      if (
        pointerIdOf(
          card
        ) !== null
      ) {
        card.releasePointerCapture(
          pointerIdOf(
            card
          )
        );
      }
    } catch (_) {}


    dragState =
      null;


    return;
  }


  // ----------------------------------------------------------
  // อ่านตำแหน่ง placeholder
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


        /*
         * floating card ยังอาจอยู่ใน grid
         * แต่ position:fixed แล้ว
         *
         * จึงไม่ควรนับซ้ำ
         */
        if (
          child === card
        ) {
          return;
        }


        finalOrder.push(
          index
        );
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
  // Release pointer
  // ----------------------------------------------------------

  try {

    if (
      pointerId !== null
    ) {
      card.releasePointerCapture(
        pointerId
      );
    }

  } catch (_) {}


  // ----------------------------------------------------------
  // Remove placeholder
  // ----------------------------------------------------------

  if (
    placeholder &&
    placeholder.isConnected
  ) {
    placeholder.remove();
  }


  // ----------------------------------------------------------
  // Reset card
  // ----------------------------------------------------------

  resetDragStyles(
    card
  );


  clearDropIndicators();


  dragState =
    null;


  // ----------------------------------------------------------
  // Re-render
  // ----------------------------------------------------------

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


  const {
    card,
    placeholder
  } =
    dragState;


  try {

    if (
      pointerId !== null
    ) {
      card.releasePointerCapture(
        pointerId
      );
    }

  } catch (_) {}


  if (
    placeholder &&
    placeholder.isConnected
  ) {
    placeholder.remove();
  }


  resetDragStyles(
    card
  );


  clearDropIndicators();


  dragState =
    null;


  renderGrid();
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
    'is-drag-ready'
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

  card.style.zIndex =
    '';

  card.style.pointerEvents =
    '';

  card.style.transform =
    '';
}


// ============================================================
// POINTER ID HELPER
// ============================================================

function pointerIdOf(
  card
) {
  if (
    dragState &&
    dragState.card === card &&
    dragState.pointerId != null
  ) {
    return dragState.pointerId;
  }

  return null;
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


  /*
   * เติมรายการที่อาจไม่อยู่ใน DOM
   */
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


      if (dragState) {
        try {
          resetDragStyles(
            dragState.card
          );
        } catch (_) {}

        try {
          if (
            dragState.placeholder &&
            dragState.placeholder.isConnected
          ) {
            dragState.placeholder.remove();
          }
        } catch (_) {}

        dragState =
          null;
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
