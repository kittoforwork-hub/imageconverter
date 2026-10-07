/* global window, document, URL, Blob, JSZip, pdfjsLib */

(() => {
  'use strict';

  const U =
    window.Utils;

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

    return String(key);
  }


  // ============================================================
  // ELEMENTS
  // ============================================================

  const dropzone =
    document.getElementById(
      'dz-pdf-to-images'
    );

  const fileInput =
    document.getElementById(
      'input-pdf-to-images'
    );

  const bulkbar =
    document.getElementById(
      'bulk-pdf-to-images'
    );

  const nameEl =
    bulkbar?.querySelector(
      '.js-pdfname'
    );

  const formatEl =
    document.getElementById(
      'format-pdf-to-images'
    );

  const scaleEl =
    document.getElementById(
      'scale-pdf-to-images'
    );

  const renderBtn =
    document.getElementById(
      'render-pdf-to-images'
    );

  const downloadZipBtn =
    document.getElementById(
      'downloadZip-pdf-to-images'
    );

  const grid =
    document.getElementById(
      'grid-pdf-to-images'
    );

  const pageTemplate =
    document.getElementById(
      'tpl-page-thumb'
    );

  const progressWrap =
    document.getElementById(
      'progress-pdf-to-images'
    );

  const progressFill =
    progressWrap?.querySelector(
      '.js-progress'
    );

  const progressLabel =
    progressWrap?.querySelector(
      '.js-progress-label'
    );


  // ============================================================
  // GUARD
  // ============================================================

  if (
    !U ||
    !dropzone ||
    !fileInput ||
    !bulkbar ||
    !nameEl ||
    !formatEl ||
    !scaleEl ||
    !renderBtn ||
    !downloadZipBtn ||
    !grid ||
    !pageTemplate ||
    !progressWrap ||
    !progressFill ||
    !progressLabel
  ) {
    console.error(
      'PDF to Images: required elements are missing'
    );

    return;
  }


  // ============================================================
  // CONFIG
  // ============================================================

  const LARGE_FILE_WARN_MB =
    50;

  const HEAVY_WORK_PAGE_THRESHOLD =
    80;


  // ============================================================
  // STATE
  // ============================================================

  // Multiple PDF support:
  // - pdfFiles contains every selected/dropped PDF.
  // - activeDoc/activeFile are only the PDF currently being rendered.
  let pdfFiles =
    [];

  let activeDoc =
    null;

  let activeFile =
    null;

  let rendered =
    [];

  let totalPages =
    0;

  let completedPages =
    0;

  let cancelRequested =
    false;

  let loadSeq =
    0;


  // ============================================================
  // HELPERS
  // ============================================================

  function isPdfFile(
    file
  ) {
    return !!file && (
      file.type === 'application/pdf' ||
      /\.pdf$/i.test(file.name || '')
    );
  }


  function getFileKey(
    file
  ) {
    return [
      file?.name || '',
      file?.size || 0,
      file?.lastModified || 0,
      file?.type || ''
    ].join('|');
  }


  function revokeRenderedUrls() {
    rendered.forEach(
      item => {
        if (
          item?.url
        ) {
          try {
            URL.revokeObjectURL(
              item.url
            );
          } catch (_) {}
        }
      }
    );

    rendered =
      [];
  }


  async function destroyActiveDoc() {
    if (
      !activeDoc
    ) {
      return;
    }

    try {
      await activeDoc.destroy();
    } catch (_) {}

    activeDoc =
      null;
  }


  function resetResults() {
    revokeRenderedUrls();

    grid.innerHTML =
      '';

    downloadZipBtn.classList.add(
      'hidden'
    );

    progressWrap.classList.add(
      'hidden'
    );

    progressFill.style.width =
      '0%';

    completedPages =
      0;

    totalPages =
      0;
  }


  function getSafeFolderName(
    filename,
    usedNames
  ) {
    const raw =
      typeof U.baseName === 'function'
        ? U.baseName(filename)
        : String(filename || '')
            .replace(/\.pdf$/i, '');

    let base =
      String(raw || 'PDF')
        .replace(
          /[<>:"/\\|?*\x00-\x1F]/g,
          '_'
        )
        .replace(
          /\s+/g,
          ' '
        )
        .trim();

    if (!base) {
      base =
        'PDF';
    }

    // ZIP folder names are case-insensitive on many systems.
    const key =
      base.toLowerCase();

    const current =
      usedNames.get(key) || 0;

    if (
      current === 0
    ) {
      usedNames.set(
        key,
        1
      );

      return base;
    }

    const next =
      current + 1;

    usedNames.set(
      key,
      next
    );

    return `${base}-${next}`;
  }


  function updateFileSummary() {
    const count =
      pdfFiles.length;

    if (
      count === 0
    ) {
      nameEl.textContent =
        '';

      bulkbar.classList.add(
        'hidden'
      );

      return;
    }

    bulkbar.classList.remove(
      'hidden'
    );

    if (
      count === 1
    ) {
      nameEl.textContent =
        pdfFiles[0].name;

      return;
    }

    const first =
      pdfFiles[0].name;

    const remaining =
      count - 1;

    const maxPreviewNames =
      3;

    if (
      count <= maxPreviewNames
    ) {
      nameEl.textContent =
        pdfFiles
          .map(
            file => file.name
          )
          .join(', ');

      return;
    }

    nameEl.textContent =
      `${first} + ${remaining} PDF`;
  }


  function buildPdfHeading(
    file,
    index,
    total
  ) {
    const heading =
      document.createElement(
        'div'
      );

    heading.className =
      'pdf-to-images-group-heading';

    heading.textContent =
      `${index + 1}/${total}  ${file.name}`;

    return heading;
  }


  async function readPdfDocument(
    file,
    requestId
  ) {
    const bytes =
      await U.readAsArrayBuffer(
        file
      );

    if (
      requestId !== loadSeq ||
      cancelRequested
    ) {
      return null;
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
      requestId !== loadSeq ||
      cancelRequested
    ) {
      try {
        await doc.destroy();
      } catch (_) {}

      return null;
    }

    return doc;
  }


  // ============================================================
  // LANGUAGE UI
  // ============================================================

  function updateLanguageUI() {
    /*
     * ----------------------------------------------------------
     * Main render button
     * ----------------------------------------------------------
     */

    if (
      renderBtn.classList.contains(
        'is-working'
      )
    ) {
      if (
        cancelRequested
      ) {
        renderBtn.textContent =
          t(
            'pdf.cancelling'
          );
      } else {
        renderBtn.textContent =
          t(
            'pdf.cancel'
          );
      }
    } else {
      renderBtn.textContent =
        t(
          'pdf.renderAllPages'
        );
    }


    /*
     * ----------------------------------------------------------
     * ZIP button
     * ----------------------------------------------------------
     */

    if (
      downloadZipBtn.disabled
    ) {
      downloadZipBtn.textContent =
        t(
          'image.compressingZip'
        );
    } else {
      downloadZipBtn.textContent =
        t(
          'image.downloadZip'
        );
    }


    /*
     * ----------------------------------------------------------
     * Progress text
     * ----------------------------------------------------------
     */

    if (
      cancelRequested &&
      renderBtn.classList.contains(
        'is-working'
      )
    ) {
      progressLabel.textContent =
        t(
          'pdf.cancelling'
        );
    } else if (
      progressWrap &&
      !progressWrap.classList.contains(
        'hidden'
      )
    ) {
      progressLabel.textContent =
        t(
          'pdf.pageProgress',
          {
            current:
              completedPages,

            total:
              totalPages
          }
        );
    }


    /*
     * ----------------------------------------------------------
     * Existing page cards
     * ----------------------------------------------------------
     */

    grid
      .querySelectorAll(
        '.page-card'
      )
      .forEach(
        card => {
          const label =
            card.querySelector(
              '.js-pagelabel'
            );

          if (!label) {
            return;
          }

          const page =
            Number(
              card.dataset.page
            );

          if (
            Number.isInteger(page) &&
            page > 0
          ) {
            label.textContent =
              t(
                'pdf.pageLabel',
                {
                  page:
                    page
                }
              );
          }
        }
      );
  }


  // ============================================================
  // LOAD / SELECT MULTIPLE FILES
  // ============================================================

  async function loadFiles(
    files
  ) {
    // Prevent replacing the working queue while a render is running.
    if (
      renderBtn.classList.contains(
        'is-working'
      )
    ) {
      return;
    }

    const incoming =
      Array.from(
        files || []
      );

    const pdfs =
      incoming.filter(
        isPdfFile
      );

    if (
      pdfs.length === 0
    ) {
      alert(
        t(
          'errors.pdfOnly'
        )
      );

      return;
    }


    // Ignore duplicate file selections.
    const existingKeys =
      new Set(
        pdfFiles.map(
          getFileKey
        )
      );

    const accepted =
      [];

    pdfs.forEach(
      file => {
        const key =
          getFileKey(
            file
          );

        if (
          existingKeys.has(key)
        ) {
          return;
        }

        existingKeys.add(
          key
        );

        accepted.push(
          file
        );
      }
    );


    if (
      accepted.length === 0
    ) {
      return;
    }


    // Warn separately for every large file.
    const safeAccepted =
      [];

    for (
      const file of accepted
    ) {
      if (
        !U.confirmLargeFile(
          file,
          LARGE_FILE_WARN_MB
        )
      ) {
        continue;
      }

      safeAccepted.push(
        file
      );
    }


    if (
      safeAccepted.length === 0
    ) {
      return;
    }


    ++loadSeq;

    cancelRequested =
      false;

    await destroyActiveDoc();

    resetResults();

    // Add instead of replacing, so users can select/drop more PDFs.
    pdfFiles.push(
      ...safeAccepted
    );

    updateFileSummary();

    renderBtn.disabled =
      pdfFiles.length === 0;

    updateLanguageUI();
  }


  // ============================================================
  // PROGRESS
  // ============================================================

  function setProgress(
    done,
    total
  ) {
    const percent =
      total
        ? Math.min(
            100,
            Math.round(
              (
                done /
                total
              ) *
              100
            )
          )
        : 0;

    progressFill.style.width =
      percent +
      '%';

    progressLabel.textContent =
      t(
        'pdf.pageProgress',
        {
          current:
            done,

          total
        }
      );
  }


  function createPageCard(
    file,
    pdfIndex,
    pageNum,
    url,
    name
  ) {
    const card =
      pageTemplate.content
        .firstElementChild
        .cloneNode(
          true
        );

    card.dataset.page =
      String(
        pageNum
      );

    card.dataset.pdfIndex =
      String(
        pdfIndex
      );

    card.dataset.pdfName =
      file.name;

    const img =
      card.querySelector(
        'img'
      );

    if (
      img
    ) {
      img.src =
        url;

      img.alt =
        `${file.name} - ` +
        t(
          'pdf.pageLabel',
          {
            page:
              pageNum
          }
        );
    }


    const pageLabel =
      card.querySelector(
        '.js-pagelabel'
      );

    if (
      pageLabel
    ) {
      pageLabel.textContent =
        t(
          'pdf.pageLabel',
          {
            page:
              pageNum
          }
        );

      // Keep the source PDF visible on hover without changing the
      // existing template structure.
      pageLabel.title =
        file.name;
    }


    const dl =
      card.querySelector(
        '.js-download'
      );

    if (
      dl
    ) {
      dl.href =
        url;

      dl.download =
        name;

      dl.setAttribute(
        'data-pdf-name',
        file.name
      );
    }


    return card;
  }


  // ============================================================
  // PRE-FLIGHT: COUNT PAGES IN ALL PDFS
  // ============================================================

  async function countAllPages(
    requestId
  ) {
    let count =
      0;

    for (
      let index = 0;
      index < pdfFiles.length;
      index++
    ) {
      if (
        cancelRequested ||
        requestId !== loadSeq
      ) {
        return null;
      }

      const file =
        pdfFiles[index];

      let doc =
        null;

      try {
        doc =
          await readPdfDocument(
            file,
            requestId
          );

        if (
          !doc
        ) {
          return null;
        }

        count +=
          doc.numPages;

        await doc.destroy();

        doc =
          null;

        await U.yieldToUI();
      } catch (
        error
      ) {
        if (
          doc
        ) {
          try {
            await doc.destroy();
          } catch (_) {}
        }

        throw new Error(
          `${file.name}: ` +
          (
            error?.message ||
            t(
              'errors.somethingWentWrong'
            )
          )
        );
      }
    }

    return count;
  }


  // ============================================================
  // RENDER ALL PDFS
  // ============================================================

  async function renderAll() {
    if (
      pdfFiles.length === 0
    ) {
      alert(
        t(
          'errors.selectPdfFirst'
        )
      );

      return;
    }


    const scale =
      Number(
        scaleEl.value
      ) ||
      1;

    const requestId =
      ++loadSeq;


    // ----------------------------------------------------------
    // Reset state
    // ----------------------------------------------------------

    cancelRequested =
      false;

    renderBtn.classList.add(
      'is-working'
    );

    renderBtn.textContent =
      t(
        'pdf.cancel'
      );

    renderBtn.disabled =
      false;

    grid.innerHTML =
      '';

    progressWrap.classList.remove(
      'hidden'
    );

    setProgress(
      0,
      0
    );

    revokeRenderedUrls();

    await destroyActiveDoc();


    // ----------------------------------------------------------
    // Pre-flight page count
    // ----------------------------------------------------------

    try {
      totalPages =
        await countAllPages(
          requestId
        );

      if (
        cancelRequested ||
        requestId !== loadSeq
      ) {
        return;
      }

      if (
        !totalPages
      ) {
        throw new Error(
          'No pages found in the selected PDF files.'
        );
      }

      // --------------------------------------------------------
      // Heavy work warning
      // --------------------------------------------------------

      if (
        totalPages *
          scale >=
        HEAVY_WORK_PAGE_THRESHOLD
      ) {
        const proceed =
          window.confirm(
            t(
              'pdf.heavyWorkWarning',
              {
                total:
                  totalPages,

                scale
              }
            )
          );

        if (
          !proceed
        ) {
          return;
        }
      }

      completedPages =
        0;

      setProgress(
        0,
        totalPages
      );


      // --------------------------------------------------------
      // Format
      // --------------------------------------------------------

      const format =
        formatEl.value ===
          'image/png'
          ? 'image/png'
          : 'image/jpeg';

      const ext =
        format ===
          'image/png'
          ? 'png'
          : 'jpg';


      // One folder per source PDF prevents filename collisions.
      const usedFolderNames =
        new Map();


      // --------------------------------------------------------
      // Render each PDF sequentially
      // --------------------------------------------------------

      for (
        let pdfIndex = 0;
        pdfIndex < pdfFiles.length;
        pdfIndex++
      ) {
        if (
          cancelRequested ||
          requestId !== loadSeq
        ) {
          break;
        }

        const file =
          pdfFiles[pdfIndex];

        activeFile =
          file;

        const folderName =
          getSafeFolderName(
            file.name,
            usedFolderNames
          );

        // Visual separator in the result grid.
        grid.appendChild(
          buildPdfHeading(
            file,
            pdfIndex,
            pdfFiles.length
          )
        );


        let doc =
          null;

        try {
          doc =
            await readPdfDocument(
              file,
              requestId
            );

          if (
            !doc
          ) {
            break;
          }

          activeDoc =
            doc;


          for (
            let pageNum = 1;
            pageNum <= doc.numPages;
            pageNum++
          ) {
            if (
              cancelRequested ||
              requestId !== loadSeq
            ) {
              break;
            }


            const page =
              await doc.getPage(
                pageNum
              );

            const viewport =
              page.getViewport({
                scale
              });

            const canvas =
              document.createElement(
                'canvas'
              );

            canvas.width =
              Math.ceil(
                viewport.width
              );

            canvas.height =
              Math.ceil(
                viewport.height
              );

            const ctx =
              canvas.getContext(
                '2d',
                {
                  willReadFrequently:
                    true
                }
              );

            if (!ctx) {
              throw new Error(
                t(
                  'errors.canvasContext'
                )
              );
            }


            /*
             * JPEG has no transparency.
             * Fill the background with white before rendering.
             */

            if (
              format ===
              'image/jpeg'
            ) {
              ctx.save();

              ctx.fillStyle =
                '#FFFFFF';

              ctx.fillRect(
                0,
                0,
                canvas.width,
                canvas.height
              );

              ctx.restore();
            }


            await page.render({
              canvasContext:
                ctx,

              viewport
            }).promise;


            const blob =
              await new Promise(
                (
                  resolve,
                  reject
                ) => {
                  canvas.toBlob(
                    result => {
                      if (
                        result
                      ) {
                        resolve(
                          result
                        );
                      } else {
                        reject(
                          new Error(
                            t(
                              'errors.imageCreateFailed'
                            )
                          )
                        );
                      }
                    },
                    format,
                    format ===
                      'image/jpeg'
                      ? 0.92
                      : undefined
                  );
                }
              );


            const url =
              URL.createObjectURL(
                blob
              );

            const fileBaseName =
              typeof U.baseName === 'function'
                ? U.baseName(
                    file.name
                  )
                : file.name.replace(
                    /\.pdf$/i,
                    ''
                  );

            const imageName =
              `${fileBaseName}-page` +
              `${String(
                pageNum
              ).padStart(
                2,
                '0'
              )}.${ext}`;


            rendered.push({
              pdfIndex,
              pdfName:
                file.name,
              pageNum,
              blob,
              url,
              name:
                imageName,
              zipPath:
                `${folderName}/${imageName}`
            });


            const card =
              createPageCard(
                file,
                pdfIndex,
                pageNum,
                url,
                imageName
              );

            grid.appendChild(
              card
            );


            completedPages +=
              1;

            setProgress(
              completedPages,
              totalPages
            );


            await U.yieldToUI();


            page.cleanup();

            // Release canvas backing memory as early as possible.
            canvas.width =
              1;

            canvas.height =
              1;
          }
        } finally {
          if (
            doc
          ) {
            try {
              await doc.destroy();
            } catch (_) {}
          }

          if (
            activeDoc === doc
          ) {
            activeDoc =
              null;
          }

          activeFile =
            null;

          await U.yieldToUI();
        }
      }


      if (
        cancelRequested
      ) {
        return;
      }

      setProgress(
        completedPages,
        totalPages
      );

    } catch (
      error
    ) {
      console.error(
        'PDF render error:',
        error
      );

      progressLabel.textContent =
        t(
          'errors.pdfRenderFailed',
          {
            message:
              error?.message ||
              t(
                'errors.somethingWentWrong'
              )
          }
        );

      alert(
        t(
          'errors.pdfConvertFailed',
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
      await destroyActiveDoc();

      activeFile =
        null;

      renderBtn.classList.remove(
        'is-working'
      );

      renderBtn.disabled =
        false;

      const completed =
        !cancelRequested &&
        totalPages > 0 &&
        completedPages ===
          totalPages;

      progressWrap.classList.toggle(
        'hidden',
        completed
      );


      if (
        cancelRequested
      ) {
        progressLabel.textContent =
          t(
            'pdf.cancelledProgress',
            {
              done:
                completedPages,

              total:
                totalPages
            }
          );
      }


      downloadZipBtn.classList.toggle(
        'hidden',
        rendered.length === 0
      );

      updateLanguageUI();
    }
  }


  // ============================================================
  // RENDER / CANCEL BUTTON
  // ============================================================

  renderBtn.addEventListener(
    'click',
    () => {
      if (
        renderBtn.classList.contains(
          'is-working'
        )
      ) {
        cancelRequested =
          true;

        renderBtn.textContent =
          t(
            'pdf.cancelling'
          );

        return;
      }

      renderAll();
    }
  );


  // ============================================================
  // ZIP
  // ============================================================

  downloadZipBtn.addEventListener(
    'click',
    async () => {
      if (
        !rendered.length ||
        !pdfFiles.length
      ) {
        return;
      }

      downloadZipBtn.disabled =
        true;

      downloadZipBtn.textContent =
        t(
          'image.compressingZip'
        );


      try {
        const zip =
          new JSZip();


        rendered.forEach(
          item => {
            // Keep every PDF in its own folder.
            // This prevents duplicate names such as page01.jpg.
            zip.file(
              item.zipPath ||
                item.name,
              item.blob
            );
          }
        );


        const content =
          await zip.generateAsync({
            type:
              'blob'
          });


        const zipBaseName =
          pdfFiles.length === 1
            ? U.baseName(
                pdfFiles[0].name
              )
            : `pdf-to-images-${pdfFiles.length}-files`;

        U.downloadBlob(
          content,
          `${zipBaseName}-pages.zip`
        );

      } catch (
        error
      ) {
        console.error(
          'ZIP error:',
          error
        );

        alert(
          t(
            'errors.zipCreateFailed',
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
        downloadZipBtn.disabled =
          false;

        downloadZipBtn.textContent =
          t(
            'image.downloadZip'
          );
      }
    }
  );


  // ============================================================
  // DROPZONE
  // ============================================================

  // Force the native file picker to allow multiple files,
  // even if the HTML forgot to include the "multiple" attribute.
  fileInput.multiple =
    true;

  fileInput.setAttribute(
    'multiple',
    ''
  );

  U.setupDropzone(
    dropzone,
    fileInput,
    files => {
      // IMPORTANT:
      // The old code used .find() here, which kept only the first PDF.
      // We now pass the entire FileList/array into loadFiles().
      loadFiles(
        files
      );
    }
  );


  // ============================================================
  // LANGUAGE CHANGE
  // ============================================================

  document.addEventListener(
    'languagechange',
    () => {
      updateLanguageUI();
      updateFileSummary();
    }
  );


  // ============================================================
  // CLEAR CACHE
  // ============================================================

  U.onClearCache(
    () => {
      ++loadSeq;

      cancelRequested =
        true;

      pdfFiles =
        [];

      revokeRenderedUrls();

      if (
        activeDoc
      ) {
        try {
          activeDoc.destroy();
        } catch (_) {}

        activeDoc =
          null;
      }

      activeFile =
        null;

      grid.innerHTML =
        '';

      bulkbar.classList.add(
        'hidden'
      );

      nameEl.textContent =
        '';

      progressWrap.classList.add(
        'hidden'
      );

      downloadZipBtn.classList.add(
        'hidden'
      );

      renderBtn.classList.remove(
        'is-working'
      );

      renderBtn.disabled =
        false;

      renderBtn.textContent =
        t(
          'pdf.renderAllPages'
        );

      progressFill.style.width =
        '0%';

      progressLabel.textContent =
        t(
          'pdf.pageProgress',
          {
            current:
              0,

            total:
              0
          }
        );

      totalPages =
        0;

      completedPages =
        0;
    }
  );


  // ============================================================
  // INITIAL UI
  // ============================================================

  fileInput.multiple =
    true;

  updateFileSummary();
  updateLanguageUI();

})();
