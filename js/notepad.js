/* ============================================================
   ONLINE NOTEPAD
   notepad.js
   ============================================================ */

/* global window, document, localStorage, navigator, Blob, URL */

(() => {
  'use strict';


  // ============================================================
  // I18N
  // ============================================================

  const I18n =
    window.I18n || null;


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


  function getLanguage() {

    if (
      I18n &&
      typeof I18n.getLanguage === 'function'
    ) {

      return I18n.getLanguage();

    }

    return 'en';
  }


  // ============================================================
  // CONFIG
  // ============================================================

  const STORAGE_KEY =
    'online-notepad-content-v1';

  const AUTO_SAVE_DELAY =
    450;

  const MAX_HISTORY =
    100;


  // ============================================================
  // ELEMENTS
  // ============================================================

  const textarea =
    document.getElementById(
      'notepad-textarea'
    );

  const saveStatus =
    document.getElementById(
      'notepad-save-status'
    );

  const saveStatusWrapper =
    document.querySelector(
      '.notepad-status'
    );

  const characterCount =
    document.getElementById(
      'notepad-character-count'
    );

  const wordCount =
    document.getElementById(
      'notepad-word-count'
    );

  const lineCount =
    document.getElementById(
      'notepad-line-count'
    );

  const newNoteBtn =
    document.getElementById(
      'btn-new-note'
    );

  const copyBtn =
    document.getElementById(
      'btn-copy-note'
    );

  const saveTxtBtn =
    document.getElementById(
      'btn-save-txt'
    );

  const clearBtn =
    document.getElementById(
      'btn-clear-note'
    );

  const undoBtn =
    document.getElementById(
      'btn-undo'
    );

  const redoBtn =
    document.getElementById(
      'btn-redo'
    );

  const searchInput =
    document.getElementById(
      'notepad-search'
    );

  const searchClearBtn =
    document.getElementById(
      'btn-search-clear'
    );

  const confirmModal =
    document.getElementById(
      'notepad-confirm-modal'
    );

  const modalCancelBtn =
    document.getElementById(
      'btn-modal-cancel'
    );

  const modalConfirmBtn =
    document.getElementById(
      'btn-modal-confirm'
    );


  // ============================================================
  // VALIDATION
  // ============================================================

  if (!textarea) {

    console.warn(
      '[Online Notepad] textarea not found.'
    );

    return;
  }


  // ============================================================
  // STATE
  // ============================================================

  let saveTimer =
    null;

  let isSaving =
    false;

  let history =
    [];

  let historyIndex =
    -1;

  let historyTimer =
    null;

  let suppressHistory =
    false;


  /*
   * เก็บสถานะล่าสุดของ status
   * เพื่อให้เปลี่ยนภาษาแล้วแปลถูกข้อความ
   */
  let currentStatusKey =
    'notepad.status.saved';

  let currentStatusType =
    'saved';

  let currentStatusValues =
    null;


  /*
   * เก็บ search state
   */
  let currentSearchState =
    'idle';


  /*
   * เก็บ timeout ของ temporary button
   */
  const tempButtonTimers =
    new WeakMap();


  // ============================================================
  // STATUS
  // ============================================================

  function setStatus(
    key,
    type = '',
    values
  ) {

    currentStatusKey =
      key;

    currentStatusType =
      type;

    currentStatusValues =
      values || null;


    if (saveStatus) {

      saveStatus.textContent =
        t(
          key,
          values
        );
    }


    if (!saveStatusWrapper) {
      return;
    }


    saveStatusWrapper.classList.remove(
      'is-saving',
      'is-saved',
      'is-error'
    );


    if (
      type === 'saving'
    ) {

      saveStatusWrapper.classList.add(
        'is-saving'
      );
    }


    if (
      type === 'saved'
    ) {

      saveStatusWrapper.classList.add(
        'is-saved'
      );
    }


    if (
      type === 'error'
    ) {

      saveStatusWrapper.classList.add(
        'is-error'
      );
    }
  }


  function refreshStatusLanguage() {

    setStatus(
      currentStatusKey,
      currentStatusType,
      currentStatusValues
    );
  }


  // ============================================================
  // STORAGE
  // ============================================================

  function loadNote() {

    try {

      const saved =
        localStorage.getItem(
          STORAGE_KEY
        );


      if (
        saved !== null
      ) {

        textarea.value =
          saved;
      }

    } catch (
      error
    ) {

      console.warn(
        '[Online Notepad] localStorage read failed:',
        error
      );


      setStatus(
        'notepad.errors.loadFailed',
        'error'
      );
    }
  }


  function saveNote() {

    try {

      localStorage.setItem(
        STORAGE_KEY,
        textarea.value
      );


      isSaving =
        false;


      setStatus(
        'notepad.status.saved',
        'saved'
      );

    } catch (
      error
    ) {

      console.error(
        '[Online Notepad] Save failed:',
        error
      );


      isSaving =
        false;


      setStatus(
        'notepad.status.saveFailed',
        'error'
      );
    }
  }


  function scheduleSave() {

    clearTimeout(
      saveTimer
    );


    isSaving =
      true;


    setStatus(
      'notepad.status.saving',
      'saving'
    );


    saveTimer =
      setTimeout(
        () => {

          saveNote();

        },
        AUTO_SAVE_DELAY
      );
  }


  // ============================================================
  // DOWNLOAD TXT
  // ============================================================

  function downloadTxt() {

    const text =
      textarea.value;


    if (
      !text ||
      text.trim().length === 0
    ) {

      setStatus(
        'notepad.status.nothingToSave',
        'error'
      );


      showTemporaryButtonText(
        saveTxtBtn,
        'notepad.buttons.nothingToSave'
      );


      focusTextarea();


      return false;
    }


    /*
     * UTF-8 BOM
     * รองรับการเปิดภาษาไทยใน Windows Notepad
     */
    const BOM =
      '\uFEFF';


    const blob =
      new Blob(
        [
          BOM,
          text
        ],
        {
          type:
            'text/plain;charset=utf-8'
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const link =
      document.createElement(
        'a'
      );


    link.href =
      url;


    link.download =
      'notepad.txt';


    link.style.display =
      'none';


    document.body.appendChild(
      link
    );


    link.click();


    link.remove();


    setTimeout(
      () => {

        try {

          URL.revokeObjectURL(
            url
          );

        } catch (_) {}

      },
      1000
    );


    setStatus(
      'notepad.status.txtSaved',
      'saved'
    );


    showTemporaryButtonText(
      saveTxtBtn,
      'notepad.buttons.txtSaved'
    );


    return true;
  }


  // ============================================================
  // COUNTERS
  // ============================================================

  function getCountLocale() {

    const lang =
      getLanguage();


    /*
     * zh-CN / zh-TW ใช้ locale ได้โดยตรง
     * ส่วนภาษาที่เหลือก็ใช้ code เดิม
     */
    return lang || 'en';
  }


  function updateCounters() {

    const text =
      textarea.value;


    // ----------------------------------------------------------
    // Characters
    // ----------------------------------------------------------

    if (
      characterCount
    ) {

      characterCount.textContent =
        text.length.toLocaleString(
          getCountLocale()
        );
    }


    // ----------------------------------------------------------
    // Words
    // ----------------------------------------------------------

    if (
      wordCount
    ) {

      const trimmed =
        text.trim();


      let words =
        0;


      if (
        trimmed
      ) {

        const englishWords =
          trimmed.match(
            /[A-Za-z0-9À-ÿ]+/g
          );


        const whitespaceBlocks =
          trimmed
            .split(/\s+/)
            .filter(
              Boolean
            );


        words =
          englishWords
            ? Math.max(
                englishWords.length,
                whitespaceBlocks.length
              )
            : whitespaceBlocks.length;
      }


      wordCount.textContent =
        words.toLocaleString(
          getCountLocale()
        );
    }


    // ----------------------------------------------------------
    // Lines
    // ----------------------------------------------------------

    if (
      lineCount
    ) {

      const lines =
        text === ''
          ? 0
          : text.split(
              /\r\n|\r|\n/
            ).length;


      lineCount.textContent =
        lines.toLocaleString(
          getCountLocale()
        );
    }
  }


  // ============================================================
  // HISTORY
  // ============================================================

  function resetHistory() {

    history = [
      textarea.value
    ];


    historyIndex =
      0;


    updateHistoryButtons();
  }


  function pushHistory(
    value
  ) {

    if (
      suppressHistory
    ) {
      return;
    }


    if (
      historyIndex >= 0 &&
      history[historyIndex] === value
    ) {

      return;
    }


    if (
      historyIndex <
      history.length - 1
    ) {

      history =
        history.slice(
          0,
          historyIndex + 1
        );
    }


    history.push(
      value
    );


    historyIndex =
      history.length - 1;


    if (
      history.length >
      MAX_HISTORY
    ) {

      const removeCount =
        history.length -
        MAX_HISTORY;


      history.splice(
        0,
        removeCount
      );


      historyIndex -=
        removeCount;


      if (
        historyIndex < 0
      ) {

        historyIndex =
          0;
      }
    }


    updateHistoryButtons();
  }


  function delayedHistoryPush() {

    clearTimeout(
      historyTimer
    );


    historyTimer =
      setTimeout(
        () => {

          pushHistory(
            textarea.value
          );

        },
        350
      );
  }


  function undo() {

    if (
      historyIndex <= 0
    ) {

      return;
    }


    historyIndex--;


    applyHistoryValue(
      history[historyIndex]
    );
  }


  function redo() {

    if (
      historyIndex >=
      history.length - 1
    ) {

      return;
    }


    historyIndex++;


    applyHistoryValue(
      history[historyIndex]
    );
  }


  function applyHistoryValue(
    value
  ) {

    suppressHistory =
      true;


    textarea.value =
      value;


    suppressHistory =
      false;


    updateCounters();

    scheduleSave();

    updateHistoryButtons();

    focusTextarea();
  }


  function updateHistoryButtons() {

    if (
      undoBtn
    ) {

      undoBtn.disabled =
        historyIndex <= 0;
    }


    if (
      redoBtn
    ) {

      redoBtn.disabled =
        historyIndex >=
        history.length - 1;
    }
  }


  // ============================================================
  // FOCUS
  // ============================================================

  function focusTextarea() {

    try {

      textarea.focus();

    } catch (_) {}
  }


  // ============================================================
  // TEMPORARY BUTTON TEXT
  // ============================================================

  function showTemporaryButtonText(
    button,
    key,
    values
  ) {

    if (
      !button
    ) {
      return;
    }


    /*
     * ยกเลิก timeout เดิม
     */
    const oldTimer =
      tempButtonTimers.get(
        button
      );


    if (
      oldTimer
    ) {

      clearTimeout(
        oldTimer
      );
    }


    /*
     * ไม่เก็บ HTML เดิมแบบ string
     * เพราะถ้าเปลี่ยนภาษาระหว่างนี้
     * เราต้องให้ i18n แปลใหม่ได้
     */
    button.dataset.tempI18nKey =
      key;


    button.dataset.tempI18nValues =
      values
        ? JSON.stringify(values)
        : '';


    button.innerHTML =
      `<span>${t(
        key,
        values
      )}</span>`;


    button.disabled =
      true;


    const timer =
      setTimeout(
        () => {

          button.removeAttribute(
            'data-temp-i18n-key'
          );

          button.removeAttribute(
            'data-temp-i18n-values'
          );


          /*
           * คืนปุ่มด้วย I18n
           * แทนการคืน HTML ภาษาเก่า
           */
          if (
            I18n &&
            typeof I18n.applyTranslations ===
              'function'
          ) {

            I18n.applyTranslations(
              button
            );

          }


          button.disabled =
            false;


          tempButtonTimers.delete(
            button
          );

        },
        1200
      );


    tempButtonTimers.set(
      button,
      timer
    );
  }


  function refreshTemporaryButtons() {

    [
      copyBtn,
      saveTxtBtn
    ].forEach(
      button => {

        if (
          !button ||
          !button.dataset.tempI18nKey
        ) {
          return;
        }


        let values = null;


        if (
          button.dataset.tempI18nValues
        ) {

          try {

            values =
              JSON.parse(
                button.dataset.tempI18nValues
              );

          } catch (_) {

            values =
              null;
          }
        }


        button.innerHTML =
          `<span>${t(
            button.dataset.tempI18nKey,
            values
          )}</span>`;
      }
    );
  }


  // ============================================================
  // COPY
  // ============================================================

  async function copyNote() {

    const text =
      textarea.value;


    if (
      !text
    ) {

      showTemporaryButtonText(
        copyBtn,
        'notepad.buttons.noText'
      );


      return;
    }


    try {

      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText ===
          'function'
      ) {

        await navigator.clipboard.writeText(
          text
        );


        showTemporaryButtonText(
          copyBtn,
          'notepad.buttons.copied'
        );


        return;
      }


      fallbackCopy(
        text
      );


      showTemporaryButtonText(
        copyBtn,
        'notepad.buttons.copied'
      );

    } catch (
      error
    ) {

      console.warn(
        '[Online Notepad] Clipboard API failed:',
        error
      );


      try {

        fallbackCopy(
          text
        );


        showTemporaryButtonText(
          copyBtn,
          'notepad.buttons.copied'
        );

      } catch (
        fallbackError
      ) {

        console.error(
          '[Online Notepad] Copy failed:',
          fallbackError
        );


        showTemporaryButtonText(
          copyBtn,
          'notepad.buttons.copyFailed'
        );
      }
    }
  }


  function fallbackCopy(
    text
  ) {

    const temp =
      document.createElement(
        'textarea'
      );


    temp.value =
      text;


    temp.setAttribute(
      'readonly',
      ''
    );


    temp.style.position =
      'fixed';


    temp.style.opacity =
      '0';


    temp.style.pointerEvents =
      'none';


    temp.style.left =
      '-9999px';


    document.body.appendChild(
      temp
    );


    temp.focus();

    temp.select();


    temp.setSelectionRange(
      0,
      temp.value.length
    );


    const successful =
      document.execCommand(
        'copy'
      );


    document.body.removeChild(
      temp
    );


    if (!successful) {

      throw new Error(
        'Copy command failed'
      );
    }
  }


  // ============================================================
  // CLEAR
  // ============================================================

  function clearNote() {

    if (
      !textarea.value
    ) {

      return;
    }


    textarea.value =
      '';


    pushHistory(
      ''
    );


    updateCounters();

    scheduleSave();

    focusTextarea();
  }


  // ============================================================
  // NEW NOTE MODAL
  // ============================================================

  function openConfirmModal() {

    if (
      !confirmModal
    ) {

      clearNote();

      return;
    }


    confirmModal.hidden =
      false;


    document.body.style.overflow =
      'hidden';


    setTimeout(
      () => {

        if (
          modalCancelBtn
        ) {

          modalCancelBtn.focus();
        }

      },
      0
    );
  }


  function closeConfirmModal() {

    if (
      !confirmModal
    ) {

      return;
    }


    confirmModal.hidden =
      true;


    document.body.style.overflow =
      '';
  }


  function createNewNote() {

    textarea.value =
      '';


    resetHistory();

    updateCounters();

    scheduleSave();

    closeConfirmModal();

    focusTextarea();
  }


  // ============================================================
  // SEARCH
  // ============================================================

  function updateSearchUI() {

    if (
      !searchInput
    ) {

      return;
    }


    const searchBox =
      searchInput.closest(
        '.search-box'
      );


    if (
      !searchBox
    ) {

      return;
    }


    const hasValue =
      searchInput.value.length >
      0;


    searchBox.classList.toggle(
      'has-value',
      hasValue
    );
  }


  function searchText() {

    if (
      !searchInput
    ) {

      return;
    }


    const query =
      searchInput.value;


    updateSearchUI();


    if (
      !query
    ) {

      currentSearchState =
        'idle';


      searchInput.removeAttribute(
        'aria-label'
      );


      return;
    }


    const text =
      textarea.value;


    if (
      !text
    ) {

      currentSearchState =
        'notFound';


      searchInput.setAttribute(
        'aria-label',
        t(
          'notepad.search.notFound'
        )
      );


      return;
    }


    const lowerText =
      text.toLocaleLowerCase(
        getCountLocale()
      );


    const lowerQuery =
      query.toLocaleLowerCase(
        getCountLocale()
      );


    const index =
      lowerText.indexOf(
        lowerQuery
      );


    if (
      index === -1
    ) {

      currentSearchState =
        'notFound';


      searchInput.setAttribute(
        'aria-label',
        t(
          'notepad.search.notFound'
        )
      );


      return;
    }


    currentSearchState =
      'found';


    searchInput.setAttribute(
      'aria-label',
      t(
        'notepad.search.found'
      )
    );


    focusTextarea();


    textarea.setSelectionRange(
      index,
      index +
        query.length
    );
  }


  function clearSearch() {

    if (
      !searchInput
    ) {

      return;
    }


    searchInput.value =
      '';


    currentSearchState =
      'idle';


    updateSearchUI();


    searchInput.removeAttribute(
      'aria-label'
    );


    focusTextarea();
  }


  function refreshSearchLanguage() {

    if (
      !searchInput
    ) {

      return;
    }


    if (
      currentSearchState ===
      'found'
    ) {

      searchInput.setAttribute(
        'aria-label',
        t(
          'notepad.search.found'
        )
      );

    } else if (
      currentSearchState ===
      'notFound'
    ) {

      searchInput.setAttribute(
        'aria-label',
        t(
          'notepad.search.notFound'
        )
      );
    }
  }


  // ============================================================
  // TEXT CHANGE
  // ============================================================

  function handleTextInput() {

    updateCounters();

    delayedHistoryPush();

    scheduleSave();
  }


  // ============================================================
  // KEYBOARD
  // ============================================================

  function handleKeyboard(
    event
  ) {

    const key =
      String(
        event.key || ''
      ).toLowerCase();


    // ----------------------------------------------------------
    // Ctrl / Cmd + Z
    // ----------------------------------------------------------

    if (
      (event.ctrlKey ||
        event.metaKey) &&
      key === 'z' &&
      !event.shiftKey
    ) {

      event.preventDefault();

      event.stopPropagation();

      undo();

      return;
    }


    // ----------------------------------------------------------
    // Ctrl + Y
    // ----------------------------------------------------------

    if (
      event.ctrlKey &&
      key === 'y'
    ) {

      event.preventDefault();

      event.stopPropagation();

      redo();

      return;
    }


    // ----------------------------------------------------------
    // Cmd + Shift + Z
    // ----------------------------------------------------------

    if (
      event.metaKey &&
      event.shiftKey &&
      key === 'z'
    ) {

      event.preventDefault();

      event.stopPropagation();

      redo();

      return;
    }


    // ----------------------------------------------------------
    // Escape
    // ----------------------------------------------------------

    if (
      key === 'escape' &&
      confirmModal &&
      !confirmModal.hidden
    ) {

      closeConfirmModal();

      focusTextarea();
    }
  }


  // ============================================================
  // BEFORE UNLOAD
  // ============================================================

  function handleBeforeUnload() {

    if (
      !isSaving
    ) {

      return;
    }


    clearTimeout(
      saveTimer
    );


    saveNote();
  }


  // ============================================================
  // LANGUAGE CHANGE
  // ============================================================

  function refreshLanguage() {

    /*
     * แปล static HTML ใหม่
     */
    if (
      I18n &&
      typeof I18n.applyTranslations ===
        'function'
    ) {

      I18n.applyTranslations();
    }


    /*
     * Counter ต้อง format ตาม locale ใหม่
     */
    updateCounters();


    /*
     * Status ปัจจุบัน
     */
    refreshStatusLanguage();


    /*
     * Search aria-label
     */
    refreshSearchLanguage();


    /*
     * Temporary button
     */
    refreshTemporaryButtons();


    /*
     * เก็บภาษาไว้ที่ html
     */
    document.documentElement.dataset.language =
      getLanguage();
  }


  // ============================================================
  // EVENTS
  // ============================================================

  textarea.addEventListener(
    'input',
    handleTextInput
  );


  textarea.addEventListener(
    'keydown',
    handleKeyboard
  );


  if (
    newNoteBtn
  ) {

    newNoteBtn.addEventListener(
      'click',
      openConfirmModal
    );
  }


  if (
    copyBtn
  ) {

    copyBtn.addEventListener(
      'click',
      copyNote
    );
  }


  if (
    saveTxtBtn
  ) {

    saveTxtBtn.addEventListener(
      'click',
      () => {

        clearTimeout(
          saveTimer
        );


        if (
          textarea.value.trim().length >
          0
        ) {

          saveNote();
        }


        downloadTxt();
      }
    );
  }


  if (
    clearBtn
  ) {

    clearBtn.addEventListener(
      'click',
      clearNote
    );
  }


  if (
    undoBtn
  ) {

    undoBtn.addEventListener(
      'click',
      undo
    );
  }


  if (
    redoBtn
  ) {

    redoBtn.addEventListener(
      'click',
      redo
    );
  }


  if (
    searchInput
  ) {

    searchInput.addEventListener(
      'input',
      searchText
    );


    searchInput.addEventListener(
      'keydown',
      event => {

        if (
          event.key ===
          'Enter'
        ) {

          event.preventDefault();

          searchText();
        }


        if (
          event.key ===
          'Escape'
        ) {

          event.preventDefault();

          clearSearch();
        }
      }
    );
  }


  if (
    searchClearBtn
  ) {

    searchClearBtn.addEventListener(
      'click',
      clearSearch
    );
  }


  if (
    modalCancelBtn
  ) {

    modalCancelBtn.addEventListener(
      'click',
      closeConfirmModal
    );
  }


  if (
    modalConfirmBtn
  ) {

    modalConfirmBtn.addEventListener(
      'click',
      createNewNote
    );
  }


  if (
    confirmModal
  ) {

    const backdrop =
      confirmModal.querySelector(
        '.notepad-modal-backdrop'
      );


    if (
      backdrop
    ) {

      backdrop.addEventListener(
        'click',
        closeConfirmModal
      );
    }
  }


  window.addEventListener(
    'beforeunload',
    handleBeforeUnload
  );


  // ============================================================
  // LANGUAGE EVENT
  // ============================================================

  document.addEventListener(
    'languagechange',
    refreshLanguage
  );


  // ============================================================
  // INITIALIZE
  // ============================================================

  loadNote();

  updateCounters();

  resetHistory();

  updateSearchUI();


  setStatus(
    'notepad.status.saved',
    'saved'
  );


  /*
   * ให้ textarea พร้อมพิมพ์ทันที
   */
  setTimeout(
    () => {

      focusTextarea();

    },
    100
  );


  // ============================================================
  // PUBLIC API
  // ============================================================

  window.OnlineNotepad = {

    getText() {

      return textarea.value;
    },


    setText(
      text = ''
    ) {

      textarea.value =
        String(
          text
        );


      pushHistory(
        textarea.value
      );


      updateCounters();

      scheduleSave();
    },


    clear() {

      clearNote();
    },


    save() {

      clearTimeout(
        saveTimer
      );


      saveNote();
    },


    downloadTxt() {

      return downloadTxt();
    },


    copy() {

      return copyNote();
    },


    undo() {

      undo();
    },


    redo() {

      redo();
    }

  };

})();
